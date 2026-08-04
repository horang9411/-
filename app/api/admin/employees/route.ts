import { NextResponse } from "next/server";

import {
  hasValidMutationOrigin,
  invalidOriginResponse,
  requireApiAdmin,
} from "@/lib/auth/admin";
import { hashPassword } from "@/lib/auth/password";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminCreateEmployeeSchema } from "@/schemas/admin-employees";

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();

  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;

  const input = await request.json().catch(() => null);
  const parsed = adminCreateEmployeeSchema.safeParse(input);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "직원 정보를 확인해 주세요." },
      { status: 400 },
    );
  }

  const env = getServerEnv();
  const supabase = createAdminClient();
  const loginId = parsed.data.loginId.toLowerCase();
  const { data: existing } = await supabase
    .from("employees")
    .select("id")
    .eq("login_id", loginId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { message: "이미 사용 중인 로그인 아이디입니다." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(
    parsed.data.password,
    env.PASSWORD_PEPPER,
  );
  const { data: employee, error } = await supabase
    .from("employees")
    .insert({
      login_id: loginId,
      password_hash: passwordHash,
      name: parsed.data.name,
      position: parsed.data.position,
      department: parsed.data.department,
      phone: parsed.data.phone,
      role: parsed.data.role,
      account_status: "active",
    })
    .select("id")
    .single();

  if (error || !employee) {
    return NextResponse.json(
      {
        message:
          error?.code === "23505"
            ? "이미 사용 중인 로그인 아이디입니다."
            : "직원 계정을 생성하지 못했습니다.",
      },
      { status: error?.code === "23505" ? 409 : 500 },
    );
  }

  await supabase.from("activity_logs").insert({
    employee_id: auth.employee.id,
    action_type: "admin.employee.create",
    target_type: "employee",
    target_id: employee.id,
    changed_data: {
      login_id: loginId,
      name: parsed.data.name,
      position: parsed.data.position,
      department: parsed.data.department,
      role: parsed.data.role,
      account_status: "active",
    },
  });

  return NextResponse.json({ ok: true, id: employee.id }, { status: 201 });
}
