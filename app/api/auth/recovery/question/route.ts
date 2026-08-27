import { NextResponse } from "next/server";

import {
  hasValidMutationOrigin,
  invalidOriginResponse,
} from "@/lib/auth/api";
import {
  createRecoveryToken,
  RECOVERY_COOKIE_NAME,
  RECOVERY_TOKEN_TTL_SECONDS,
} from "@/lib/auth/recovery";
import {
  hashRecoveryRequestIp,
  isRecoveryRateLimited,
  recordRecoveryAttempt,
} from "@/lib/auth/recovery-rate-limit";
import { securityQuestionLabel } from "@/lib/auth/security-questions";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { recoveryIdentitySchema } from "@/schemas/auth";

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();

  const input = await request.json().catch(() => null);
  const parsed = recoveryIdentitySchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." },
      { status: 400 },
    );
  }

  const env = getServerEnv();
  const supabase = createAdminClient();
  const loginId = parsed.data.loginId.toLowerCase();
  const ipHash = hashRecoveryRequestIp(request, env.SESSION_TOKEN_PEPPER);
  if (await isRecoveryRateLimited(supabase, loginId, ipHash)) {
    return NextResponse.json(
      { message: "확인 요청이 너무 많습니다. 15분 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const { data: employee, error } = await supabase
    .from("employees")
    .select(
      "id, login_id, password_hash, account_status, security_question, security_answer_hash",
    )
    .eq("login_id", loginId)
    .eq("name", parsed.data.name)
    .eq("phone", parsed.data.phone)
    .maybeSingle();
  const matched = Boolean(employee && !error);
  await recordRecoveryAttempt(supabase, loginId, ipHash, matched);

  if (!employee || error) {
    return NextResponse.json(
      { message: "입력한 계정 정보가 올바르지 않습니다." },
      { status: 404 },
    );
  }
  if (employee.account_status !== "active") {
    return NextResponse.json(
      { message: "사용 중인 계정만 비밀번호를 재설정할 수 있습니다." },
      { status: 403 },
    );
  }
  if (!employee.security_question || !employee.security_answer_hash) {
    return NextResponse.json(
      {
        message:
          "등록된 보안 질문이 없습니다. 로그인 가능한 경우 내 정보에서 등록하거나 관리자에게 문의해 주세요.",
      },
      { status: 409 },
    );
  }

  const token = createRecoveryToken({
    employeeId: employee.id,
    passwordHash: employee.password_hash,
    pepper: env.SESSION_TOKEN_PEPPER,
  });
  const response = NextResponse.json({
    question: securityQuestionLabel(employee.security_question),
  });
  response.cookies.set({
    name: RECOVERY_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/recovery",
    maxAge: RECOVERY_TOKEN_TTL_SECONDS,
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
