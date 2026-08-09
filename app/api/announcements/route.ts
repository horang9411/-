import { NextResponse } from "next/server";

import {
  hasValidMutationOrigin,
  invalidOriginResponse,
  requireApiEmployee,
} from "@/lib/auth/api";
import { canPublishAnnouncement } from "@/lib/announcements/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { announcementSchema } from "@/schemas/announcements";

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();

  const auth = await requireApiEmployee();
  if (auth.response) return auth.response;
  if (!canPublishAnnouncement(auth.employee)) {
    return NextResponse.json(
      { message: "관리자, 팀장 또는 대표만 공지사항을 등록할 수 있습니다." },
      { status: 403 },
    );
  }

  const parsed = announcementSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          parsed.error.issues[0]?.message ?? "공지사항 내용을 확인해 주세요.",
      },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title: parsed.data.title,
      content: parsed.data.content,
      created_by: auth.employee.id,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      {
        message:
          error.code === "PGRST205" || error.code === "42P01"
            ? "공지사항 데이터베이스 설정이 필요합니다. 관리자에게 문의해 주세요."
            : "공지사항을 등록하지 못했습니다.",
      },
      { status: 500 },
    );
  }

  await supabase.from("activity_logs").insert({
    employee_id: auth.employee.id,
    action_type: "announcement.create",
    target_type: "announcement",
    target_id: data.id,
    changed_data: parsed.data,
  });

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
