import { NextResponse } from "next/server";

import { requireApiEmployee } from "@/lib/auth/api";
import { getWorkspaceEmployees } from "@/lib/employees/data";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireApiEmployee();
  if (auth.response) return auth.response;

  const isAdmin = auth.employee.role === "admin";
  const isTeamLead = auth.employee.positionCode === "team_lead";
  if (!isAdmin && !isTeamLead) {
    return NextResponse.json({ message: "휴가 승인 권한이 없습니다." }, { status: 403 });
  }

  const supabase = createAdminClient();
  let query = supabase
    .from("leave_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (!isAdmin) {
    const applicantIds = (await getWorkspaceEmployees())
      .filter(
        (employee) =>
          employee.department === auth.employee.departmentCode &&
          employee.id !== auth.employee.id,
      )
      .map((employee) => employee.id);

    if (applicantIds.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    query = query
      .eq("team_lead_status", "pending")
      .in("employee_id", applicantIds);
  }

  const { count, error } = await query;
  if (error) {
    return NextResponse.json(
      { message: "휴가 신청 건수를 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { count: count ?? 0 },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
