import { NextResponse } from "next/server";

import { requireApiEmployee } from "@/lib/auth/api";
import { canViewDepartment } from "@/lib/employees/permissions";
import { canViewTaskDetails } from "@/lib/tasks/permissions";
import { TASK_ATTACHMENT_BUCKET } from "@/lib/tasks/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const auth = await requireApiEmployee();
  if (auth.response) return auth.response;

  const { id, attachmentId } = await params;
  const supabase = createAdminClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("id, owner_id")
    .eq("id", id)
    .maybeSingle();

  if (!task) {
    return NextResponse.json(
      { message: "업무를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const { data: owner } = await supabase
    .from("employees")
    .select("department")
    .eq("id", task.owner_id)
    .maybeSingle();
  const { data: participant } = await supabase
    .from("task_participants")
    .select("employee_id")
    .eq("task_id", task.id)
    .eq("employee_id", auth.employee.id)
    .maybeSingle();

  if (
    !owner ||
    !canViewDepartment(auth.employee, owner.department) ||
    !canViewTaskDetails(auth.employee, task.owner_id, Boolean(participant))
  ) {
    return NextResponse.json(
      { message: "첨부파일을 조회할 권한이 없습니다." },
      { status: 403 },
    );
  }

  const { data: attachment } = await supabase
    .from("task_attachments")
    .select("id, file_url")
    .eq("id", attachmentId)
    .eq("task_id", id)
    .maybeSingle();
  if (!attachment) {
    return NextResponse.json(
      { message: "첨부파일을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const { data, error } = await supabase.storage
    .from(TASK_ATTACHMENT_BUCKET)
    .createSignedUrl(attachment.file_url, 60);
  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { message: "첨부파일 다운로드 주소를 만들지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.redirect(data.signedUrl, 302);
}
