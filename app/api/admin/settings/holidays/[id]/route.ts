import { NextResponse } from "next/server";

import { hasValidMutationOrigin, invalidOriginResponse, requireApiAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { holidaySchema } from "@/schemas/admin-settings";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const parsed = holidaySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "휴무일 정보를 확인해 주세요." }, { status: 400 });

  const supabase = createAdminClient();
  const { data: before } = await supabase.from("company_holidays").select("id, title, holiday_date, description").eq("id", id).maybeSingle();
  if (!before) return NextResponse.json({ message: "휴무일을 찾을 수 없습니다." }, { status: 404 });
  const updates = { title: parsed.data.title, holiday_date: parsed.data.holidayDate, description: parsed.data.description || null };
  const { error } = await supabase.from("company_holidays").update(updates).eq("id", id);
  if (error) return NextResponse.json({ message: error.code === "23505" ? "해당 날짜에는 이미 회사 휴무일이 등록되어 있습니다." : "휴무일을 수정하지 못했습니다." }, { status: error.code === "23505" ? 409 : 500 });
  await supabase.from("activity_logs").insert({ employee_id: auth.employee.id, action_type: "admin.holiday.update", target_type: "company_holiday", target_id: id, changed_data: { before, after: updates } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: before } = await supabase.from("company_holidays").select("id, title, holiday_date, description").eq("id", id).maybeSingle();
  if (!before) return NextResponse.json({ message: "휴무일을 찾을 수 없습니다." }, { status: 404 });
  const { error } = await supabase.from("company_holidays").delete().eq("id", id);
  if (error) return NextResponse.json({ message: "휴무일을 삭제하지 못했습니다." }, { status: 500 });
  await supabase.from("activity_logs").insert({ employee_id: auth.employee.id, action_type: "admin.holiday.delete", target_type: "company_holiday", target_id: id, changed_data: before });
  return NextResponse.json({ ok: true });
}
