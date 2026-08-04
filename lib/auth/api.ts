import "server-only";

import { NextResponse } from "next/server";

import { getCurrentEmployee } from "@/lib/auth/session";

export async function requireApiEmployee() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return {
      employee: null,
      response: NextResponse.json(
        { message: "로그인이 필요합니다." },
        { status: 401 },
      ),
    };
  }
  return { employee, response: null };
}

export function hasValidMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return true;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function invalidOriginResponse() {
  return NextResponse.json(
    { message: "허용되지 않은 요청입니다." },
    { status: 403 },
  );
}
