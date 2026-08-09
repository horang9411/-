import { NextResponse } from "next/server";

import {
  hasValidMutationOrigin,
  invalidOriginResponse,
  requireApiEmployee,
} from "@/lib/auth/api";
import {
  canDeleteAnnouncement,
  canPublishAnnouncement,
} from "@/lib/announcements/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();

  const auth = await requireApiEmployee();
  if (auth.response) return auth.response;
  if (!canPublishAnnouncement(auth.employee)) {
    return NextResponse.json(
      { message: "공지사항 삭제 권한이 없습니다." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const { data: announcement } = await supabase
    .from("announcements")
    .select("id, title, content, created_by, meeting_id, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!announcement) {
    return NextResponse.json(
      { message: "공지사항을 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  if (!canDeleteAnnouncement(auth.employee, announcement.created_by)) {
    return NextResponse.json(
      { message: "본인이 작성한 공지사항만 삭제할 수 있습니다." },
      { status: 403 },
    );
  }
  if (announcement.meeting_id) {
    return NextResponse.json(
      { message: "회의 공지는 회의실에서 해당 회의를 삭제해 주세요." },
      { status: 409 },
    );
  }

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { message: "공지사항을 삭제하지 못했습니다." },
      { status: 500 },
    );
  }

  await supabase.from("activity_logs").insert({
    employee_id: auth.employee.id,
    action_type: "announcement.delete",
    target_type: "announcement",
    target_id: id,
    changed_data: announcement,
  });

  return NextResponse.json({ ok: true });
}
