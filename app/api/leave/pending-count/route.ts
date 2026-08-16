import { NextResponse } from "next/server";

import { requireApiEmployee } from "@/lib/auth/api";
import { getLeaveNotifications } from "@/lib/leave/notifications";

export async function GET() {
  const auth = await requireApiEmployee();
  if (auth.response) return auth.response;

  const isRepresentative =
    auth.employee.role === "admin" &&
    auth.employee.positionCode === "representative";
  const isTeamLead = auth.employee.positionCode === "team_lead";
  if (!isRepresentative && !isTeamLead) {
    return NextResponse.json({ message: "휴가 승인 권한이 없습니다." }, { status: 403 });
  }

  try {
    const { pendingCount } = await getLeaveNotifications(
      auth.employee,
      new Date().toISOString(),
    );
    return NextResponse.json(
      { count: pendingCount },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { message: "휴가 신청 건수를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
