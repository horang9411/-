import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import {
  hasValidMutationOrigin,
  invalidOriginResponse,
} from "@/lib/auth/api";
import {
  hashSessionToken,
  SESSION_CACHE_TAG,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();

  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);

  if (token) {
    try {
      const env = getServerEnv();
      const supabase = createAdminClient();
      await supabase
        .from("sessions")
        .delete()
        .eq(
          "session_token_hash",
          hashSessionToken(decodeURIComponent(token), env.SESSION_TOKEN_PEPPER),
        );
      revalidateTag(SESSION_CACHE_TAG, { expire: 0 });
    } catch {
      // DB 오류와 관계없이 브라우저 쿠키는 반드시 제거합니다.
    }
  }

  const response = NextResponse.json({ ok: true });
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
