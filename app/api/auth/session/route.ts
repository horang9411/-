import { NextResponse } from "next/server";

import {
  getCurrentSession,
  SESSION_COOKIE_NAME,
  type SessionFailureReason,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession({ includeProfileImage: false });

  if (session.employee) {
    return NextResponse.json(
      {
        ok: true,
        expiresAt: session.employee.sessionExpiresAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const reason = publicReason(session.reason);
  const response = NextResponse.json(
    {
      ok: false,
      reason,
      message:
        reason === "account-disabled"
          ? "사용할 수 없는 계정입니다. 관리자에게 문의해 주세요."
          : "로그인 세션이 만료되었습니다. 다시 로그인해 주세요.",
    },
    {
      status: reason === "account-disabled" ? 403 : 401,
      headers: { "Cache-Control": "no-store" },
    },
  );

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  return response;
}

function publicReason(reason: SessionFailureReason) {
  if (reason === "account-disabled") return "account-disabled";
  if (reason === "expired") return "session-expired";
  return "invalid-session";
}
