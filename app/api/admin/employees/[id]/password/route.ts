import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import {
  hasValidMutationOrigin,
  invalidOriginResponse,
  requireApiAdmin,
} from "@/lib/auth/admin";
import { hashPassword } from "@/lib/auth/password";
import { SESSION_CACHE_TAG } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminResetPasswordSchema } from "@/schemas/admin-employees";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();

  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;

  const { id } = await params;
  if (id === auth.employee.id) {
    return NextResponse.json(
      { message: "현재 로그인한 관리자 계정은 계정 찾기에서 비밀번호를 변경해 주세요." },
      { status: 400 },
    );
  }

  const input = await request.json().catch(() => null);
  const parsed = adminResetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "새 비밀번호를 확인해 주세요." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("id, login_id, name, account_status")
    .eq("id", id)
    .maybeSingle();
  if (!employee) {
    return NextResponse.json(
      { message: "직원 계정을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const passwordHash = await hashPassword(
    parsed.data.password,
    getServerEnv().PASSWORD_PEPPER,
  );
  const changedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("employees")
    .update({
      password_hash: passwordHash,
      password_changed_at: changedAt,
      failed_login_count: 0,
      locked_until: null,
    })
    .eq("id", employee.id);
  if (updateError) {
    return NextResponse.json(
      { message: "직원 비밀번호를 재설정하지 못했습니다." },
      { status: 500 },
    );
  }

  const { error: sessionError } = await supabase
    .from("sessions")
    .delete()
    .eq("employee_id", employee.id);
  if (sessionError) {
    return NextResponse.json(
      {
        message:
          "비밀번호는 변경했지만 기존 로그인 종료에 실패했습니다. 즉시 다시 시도해 주세요.",
      },
      { status: 500 },
    );
  }

  const { error: logError } = await supabase.from("activity_logs").insert({
    employee_id: auth.employee.id,
    action_type: "admin.employee.password.reset",
    target_type: "employee",
    target_id: employee.id,
    changed_data: {
      login_id: employee.login_id,
      account_status: employee.account_status,
      sessions_revoked: true,
      changed_at: changedAt,
    },
  });
  if (logError) {
    return NextResponse.json(
      {
        message:
          "비밀번호와 로그인 세션은 변경했지만 활동 기록 저장에 실패했습니다.",
      },
      { status: 500 },
    );
  }
  revalidateTag(SESSION_CACHE_TAG, { expire: 0 });

  return NextResponse.json({
    ok: true,
    message: `${employee.name}님의 비밀번호를 재설정했습니다.`,
  });
}
