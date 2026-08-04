import { NextResponse } from "next/server";

import { hasValidMutationOrigin, invalidOriginResponse, requireApiAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { maintenanceActionSchema } from "@/schemas/admin-settings";

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const parsed = maintenanceActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "관리 작업을 확인해 주세요." }, { status: 400 });
  const supabase = createAdminClient();

  if (parsed.data.action === "cleanup_expired_sessions") {
    const { data, error } = await supabase.from("sessions").delete().lt("expires_at", new Date().toISOString()).select("id");
    if (error) return NextResponse.json({ message: "만료 세션을 정리하지 못했습니다." }, { status: 500 });
    const count = data?.length ?? 0;
    await supabase.from("activity_logs").insert({ employee_id: auth.employee.id, action_type: "admin.sessions.cleanup", target_type: "session", target_id: null, changed_data: { deleted_count: count } });
    return NextResponse.json({ ok: true, count });
  }

  const { data: employee } = await supabase.from("employees").select("id, login_id, name, failed_login_count, locked_until").eq("id", parsed.data.employeeId).maybeSingle();
  if (!employee) return NextResponse.json({ message: "직원 계정을 찾을 수 없습니다." }, { status: 404 });
  const { error } = await supabase.from("employees").update({ failed_login_count: 0, locked_until: null }).eq("id", employee.id);
  if (error) return NextResponse.json({ message: "로그인 잠금을 해제하지 못했습니다." }, { status: 500 });
  await supabase.from("login_attempts").delete().eq("login_id", employee.login_id).eq("succeeded", false);
  await supabase.from("activity_logs").insert({ employee_id: auth.employee.id, action_type: "admin.login.unlock", target_type: "employee", target_id: employee.id, changed_data: { failed_login_count: { before: employee.failed_login_count, after: 0 }, locked_until: { before: employee.locked_until, after: null } } });
  return NextResponse.json({ ok: true });
}
