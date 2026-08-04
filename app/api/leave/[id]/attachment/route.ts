import { NextResponse } from "next/server";

import { requireApiEmployee } from "@/lib/auth/api";
import { canViewLeaveDetails } from "@/lib/leave/permissions";
import { LEAVE_ATTACHMENT_BUCKET } from "@/lib/leave/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiEmployee();
  if (auth.response) return auth.response;
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: leave } = await supabase
    .from("leave_requests")
    .select("id, employee_id, attachment_url")
    .eq("id", id)
    .maybeSingle();
  if (!leave || !leave.attachment_url) {
    return NextResponse.json(
      { message: "첨부파일을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const { data: applicant } = await supabase
    .from("employees")
    .select("id, department")
    .eq("id", leave.employee_id)
    .maybeSingle();
  if (
    !applicant ||
    !canViewLeaveDetails(auth.employee, {
      id: applicant.id,
      departmentCode: applicant.department,
    })
  ) {
    return NextResponse.json(
      { message: "첨부파일을 조회할 권한이 없습니다." },
      { status: 403 },
    );
  }

  const { data, error } = await supabase.storage
    .from(LEAVE_ATTACHMENT_BUCKET)
    .createSignedUrl(leave.attachment_url, 60);
  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { message: "첨부파일 다운로드 주소를 만들지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.redirect(data.signedUrl, 302);
}
