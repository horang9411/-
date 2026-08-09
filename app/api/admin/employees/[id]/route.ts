import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import {
  hasValidMutationOrigin,
  invalidOriginResponse,
  requireApiAdmin,
} from "@/lib/auth/admin";
import { SESSION_CACHE_TAG } from "@/lib/auth/session";
import { EMPLOYEES_CACHE_TAG } from "@/lib/employees/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminUpdateEmployeeSchema } from "@/schemas/admin-employees";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();

  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;

  const { id } = await params;
  const input = await request.json().catch(() => null);
  const parsed = adminUpdateEmployeeSchema.safeParse(input);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "직원 정보를 확인해 주세요." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data: before } = await supabase
    .from("employees")
    .select("id, login_id, name, position, department, phone, role, account_status")
    .eq("id", id)
    .maybeSingle();

  if (!before) {
    return NextResponse.json(
      { message: "직원 계정을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (id === auth.employee.id && parsed.data.role !== "admin") {
    return NextResponse.json(
      { message: "현재 로그인한 계정의 관리자 권한은 해제할 수 없습니다." },
      { status: 400 },
    );
  }

  if (
    before.login_id === "pastelcraft" &&
    (parsed.data.role !== "admin" || parsed.data.position !== "representative")
  ) {
    return NextResponse.json(
      { message: "대표 계정의 직급과 관리자 권한은 해제할 수 없습니다." },
      { status: 400 },
    );
  }

  const updates = {
    name: parsed.data.name,
    position: parsed.data.position,
    department: parsed.data.department,
    phone: parsed.data.phone,
    role: parsed.data.role,
  };
  const { error } = await supabase.from("employees").update(updates).eq("id", id);

  if (error) {
    return NextResponse.json(
      { message: "직원 정보를 수정하지 못했습니다." },
      { status: 500 },
    );
  }

  const changedData = Object.fromEntries(
    Object.entries(updates)
      .filter(([key, value]) => before[key as keyof typeof before] !== value)
      .map(([key, value]) => [
        key,
        { before: before[key as keyof typeof before], after: value },
      ]),
  );

  await supabase.from("activity_logs").insert({
    employee_id: auth.employee.id,
    action_type: "admin.employee.update",
    target_type: "employee",
    target_id: id,
    changed_data: changedData,
  });
  revalidateTag(EMPLOYEES_CACHE_TAG, { expire: 0 });
  revalidateTag(SESSION_CACHE_TAG, { expire: 0 });

  return NextResponse.json({ ok: true });
}
