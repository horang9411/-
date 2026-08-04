import { NextResponse } from "next/server";

import {
  hasValidMutationOrigin,
  invalidOriginResponse,
  requireApiEmployee,
} from "@/lib/auth/api";
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
    .select("id, employee_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!leave) {
    return NextResponse.json(
      { message: "휴가 신청을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const canCancel =
    (leave.employee_id === auth.employee.id && leave.status === "pending") ||
    (auth.employee.role === "admin" && leave.status !== "cancelled");
  if (!canCancel) {
    return NextResponse.json(
      { message: "이 휴가 신청을 취소할 권한이 없습니다." },
      { status: 403 },
    );
  }

  const { error } = await supabase
    .from("leave_requests")
    .update({ status: "cancelled" })
    .eq("id", id);
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
      previous_status: leave.status,
      cancelled_by_admin: auth.employee.role === "admin",
    },
  });

  return NextResponse.json({ ok: true });
}
