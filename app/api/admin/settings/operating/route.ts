import { NextResponse } from "next/server";

import { hasValidMutationOrigin, invalidOriginResponse, requireApiAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { operatingSettingsSchema } from "@/schemas/admin-settings";

export async function PATCH(request: Request) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const parsed = operatingSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "운영 설정을 확인해 주세요." }, { status: 400 });
  const supabase = createAdminClient();
  const { data: before } = await supabase.from("system_settings").select("company_name, default_calendar_tab, week_starts_on, session_ttl_hours").eq("id", true).maybeSingle();
  const updates = { company_name: parsed.data.companyName, default_calendar_tab: parsed.data.defaultCalendarTab, week_starts_on: parsed.data.weekStartsOn, session_ttl_hours: parsed.data.sessionTtlHours, updated_by: auth.employee.id };
  const { error } = await supabase.from("system_settings").upsert({ id: true, ...updates }, { onConflict: "id" });
  if (error) return NextResponse.json({ message: "운영 설정 테이블을 확인해 주세요. 관리자 설정 SQL 적용이 필요할 수 있습니다." }, { status: 500 });
  await supabase.from("activity_logs").insert({ employee_id: auth.employee.id, action_type: "admin.settings.update", target_type: "system_settings", target_id: null, changed_data: { before, after: updates } });
  return NextResponse.json({ ok: true });
}
