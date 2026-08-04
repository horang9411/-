import { NextResponse } from "next/server";

import { hasValidMutationOrigin, invalidOriginResponse, requireApiAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { holidaySchema } from "@/schemas/admin-settings";

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const parsed = holidaySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "휴무일 정보를 확인해 주세요." }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("company_holidays").insert({
    title: parsed.data.title,
    holiday_date: parsed.data.holidayDate,
    description: parsed.data.description || null,
    created_by: auth.employee.id,
  }).select("id").single();
  if (error) return NextResponse.json({ message: error.code === "23505" ? "해당 날짜에는 이미 회사 휴무일이 등록되어 있습니다." : "휴무일을 등록하지 못했습니다." }, { status: error.code === "23505" ? 409 : 500 });

  await supabase.from("activity_logs").insert({ employee_id: auth.employee.id, action_type: "admin.holiday.create", target_type: "company_holiday", target_id: data.id, changed_data: parsed.data });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
