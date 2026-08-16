import { NextResponse } from "next/server";

import {
  hasValidMutationOrigin,
  invalidOriginResponse,
  requireApiEmployee,
} from "@/lib/auth/api";
import { canCancelLeave } from "@/lib/leave/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();

  const auth = await requireApiEmployee();
  if (auth.response) return auth.response;
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: leave } = await supabase
    .from("leave_requests")
    .select("id, employee_id, leave_type, start_date, end_date, day_type, status")
    .eq("id", id)
    .maybeSingle();

  if (!leave) {
    return NextResponse.json(
      { message: "휴가 신청을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (
    !canCancelLeave(auth.employee, {
      employeeId: leave.employee_id,
      status: leave.status,
    })
  ) {
    return NextResponse.json(
      { message: "이 휴가 신청을 취소할 권한이 없습니다." },
      { status: 403 },
    );
  }

  const { data: applicant } = await supabase
    .from("employees")
    .select("id, name, department, position")
    .eq("id", leave.employee_id)
    .maybeSingle();
  if (!applicant) {
    return NextResponse.json(
      { message: "신청 직원 정보를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const { error } = await supabase
    .from("leave_requests")
    .update({
      status: "cancelled",
      approved_by: null,
      approved_at: null,
    })
    .eq("id", id)
    .neq("status", "cancelled");
  if (error) {
    return NextResponse.json(
      { message: "휴가 신청을 취소하지 못했습니다." },
      { status: 500 },
    );
  }

  await supabase.from("activity_logs").insert({
    employee_id: auth.employee.id,
    action_type: "leave.cancel",
    target_type: "leave_request",
    target_id: id,
    changed_data: {
      employee_id: applicant.id,
      employee_name: applicant.name,
      employee_department: applicant.department,
      employee_position: applicant.position,
      leave_type: leave.leave_type,
      start_date: leave.start_date,
      end_date: leave.end_date,
      day_type: leave.day_type,
      previous_status: leave.status,
      team_lead_approval_skipped: applicant.position === "team_lead",
      cancelled_by_admin: auth.employee.role === "admin",
    },
  });

  return NextResponse.json({ ok: true });
}
