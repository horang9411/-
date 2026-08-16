import { NextResponse } from "next/server";

import { requireApiEmployee } from "@/lib/auth/api";
import { getLeaveNotifications } from "@/lib/leave/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiEmployee();
  if (auth.response) return auth.response;

  const requestedSince = new URL(request.url).searchParams.get("since");
  const since = normalizeSince(requestedSince);

  try {
    const notifications = await getLeaveNotifications(auth.employee, since);
    return NextResponse.json(
      { ...notifications, checkedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { message: "알림을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

function normalizeSince(value: string | null) {
  const now = Date.now();
  const maximumLookback = now - 30 * 24 * 60 * 60 * 1000;
  if (!value) return new Date(now).toISOString();

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return new Date(now).toISOString();
  return new Date(Math.min(now, Math.max(timestamp, maximumLookback))).toISOString();
}
