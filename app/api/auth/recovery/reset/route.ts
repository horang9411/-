import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import {
  hasValidMutationOrigin,
  invalidOriginResponse,
} from "@/lib/auth/api";
import { hashPassword } from "@/lib/auth/password";
import {
  matchesRecoveryPasswordVersion,
  RECOVERY_COOKIE_NAME,
  verifyRecoveryToken,
  verifySecurityAnswer,
} from "@/lib/auth/recovery";
import {
  hashRecoveryRequestIp,
  isRecoveryRateLimited,
  recordRecoveryAttempt,
} from "@/lib/auth/recovery-rate-limit";
import { SESSION_CACHE_TAG } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { resetPasswordSchema } from "@/schemas/auth";

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();

  const input = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." },
      { status: 400 },
    );
  }

  const env = getServerEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(RECOVERY_COOKIE_NAME)?.value;
  const payload = token
    ? verifyRecoveryToken(token, env.SESSION_TOKEN_PEPPER)
    : null;
  if (!payload) return invalidChallengeResponse();

  const supabase = createAdminClient();
  const { data: employee } = await supabase
    .from("employees")
    .select(
      "id, login_id, password_hash, security_answer_hash, account_status",
    )
    .eq("id", payload.employeeId)
    .maybeSingle();
  if (
    !employee ||
    employee.account_status !== "active" ||
    !employee.security_answer_hash ||
    !matchesRecoveryPasswordVersion(
      employee.password_hash,
      payload.passwordVersion,
    )
  ) {
    return invalidChallengeResponse();
  }

  const ipHash = hashRecoveryRequestIp(request, env.SESSION_TOKEN_PEPPER);
  if (await isRecoveryRateLimited(supabase, employee.login_id, ipHash)) {
    return NextResponse.json(
      { message: "답변 확인 요청이 너무 많습니다. 15분 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const answerMatches = await verifySecurityAnswer(
    parsed.data.securityAnswer,
    employee.security_answer_hash,
    env.PASSWORD_PEPPER,
  );
  await recordRecoveryAttempt(
    supabase,
    employee.login_id,
    ipHash,
    answerMatches,
  );
  if (!answerMatches) {
    return NextResponse.json(
      { message: "보안 질문 답변이 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const passwordHash = await hashPassword(
    parsed.data.password,
    env.PASSWORD_PEPPER,
  );
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("employees")
    .update({
      password_hash: passwordHash,
      password_changed_at: now,
      failed_login_count: 0,
      locked_until: null,
    })
    .eq("id", employee.id);
  if (updateError) {
    return NextResponse.json(
      { message: "비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }

  await Promise.all([
    supabase.from("sessions").delete().eq("employee_id", employee.id),
    supabase.from("activity_logs").insert({
      employee_id: employee.id,
      action_type: "auth.password.recover",
      target_type: "employee",
      target_id: employee.id,
      changed_data: { sessions_revoked: true, changed_at: now },
    }),
  ]);
  revalidateTag(SESSION_CACHE_TAG, { expire: 0 });

  const response = NextResponse.json({
    ok: true,
    message: "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.",
  });
  clearRecoveryCookie(response);
  return response;
}

function invalidChallengeResponse() {
  const response = NextResponse.json(
    { message: "재설정 인증 시간이 만료되었습니다. 계정 확인부터 다시 진행해 주세요." },
    { status: 401 },
  );
  clearRecoveryCookie(response);
  return response;
}

function clearRecoveryCookie(response: NextResponse) {
  response.cookies.set({
    name: RECOVERY_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/recovery",
    maxAge: 0,
  });
}
