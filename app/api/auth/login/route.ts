import { createHash, randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import {
  hasValidMutationOrigin,
  invalidOriginResponse,
} from "@/lib/auth/api";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { hashSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSystemSettings } from "@/lib/settings/system-settings";
import { loginSchema } from "@/schemas/auth";

const LOGIN_WINDOW_MINUTES = 15;
const MAX_ACCOUNT_FAILURES = 5;
const MAX_WINDOW_FAILURES = 10;

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();

  const input = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." },
      { status: 400 },
    );
  }

  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch {
    return NextResponse.json(
      { message: "로그인 서버 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요." },
      { status: 503 },
    );
  }

  const supabase = createAdminClient();
  const loginId = parsed.data.loginId.toLowerCase();
  const ip = getRequestIp(request);
  const ipHash = createHash("sha256")
    .update(ip)
    .update(env.SESSION_TOKEN_PEPPER)
    .digest("hex");
  const windowStart = new Date(
    Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();

  const { count: recentFailures } = await supabase
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("succeeded", false)
    .gte("created_at", windowStart)
    .or(`login_id.eq.${loginId},ip_hash.eq.${ipHash}`);

  if ((recentFailures ?? 0) >= MAX_WINDOW_FAILURES) {
    return NextResponse.json(
      { message: "로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const { data: employee } = await supabase
    .from("employees")
    .select(
      "id, login_id, password_hash, name, role, account_status, failed_login_count, locked_until",
    )
    .eq("login_id", loginId)
    .maybeSingle();

  if (employee?.locked_until && new Date(employee.locked_until) > new Date()) {
    await recordAttempt(supabase, loginId, ipHash, false);
    return NextResponse.json(
      { message: "계정이 잠시 잠겼습니다. 잠시 후 다시 시도해 주세요." },
      { status: 423 },
    );
  }

  const verification = employee
    ? await verifyPassword(
        parsed.data.password,
        employee.password_hash,
        env.PASSWORD_PEPPER,
      )
    : { matches: false, needsRehash: false };

  if (!employee || !verification.matches) {
    await recordAttempt(supabase, loginId, ipHash, false);

    if (employee) {
      const previousLockExpired =
        employee.locked_until && new Date(employee.locked_until) <= new Date();
      const failedCount = previousLockExpired
        ? 1
        : employee.failed_login_count + 1;
      await supabase
        .from("employees")
        .update({
          failed_login_count: failedCount,
          locked_until:
            failedCount >= MAX_ACCOUNT_FAILURES
              ? new Date(Date.now() + LOGIN_WINDOW_MINUTES * 60 * 1000).toISOString()
              : null,
        })
        .eq("id", employee.id);
    }

    return NextResponse.json(
      { message: "로그인 아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  if (employee.account_status !== "active") {
    await recordAttempt(supabase, loginId, ipHash, false);
    const statusMessage = {
      pending: "관리자 승인 대기 중인 계정입니다.",
      rejected: "가입이 승인되지 않은 계정입니다. 관리자에게 문의해 주세요.",
      suspended: "사용이 중지된 계정입니다. 관리자에게 문의해 주세요.",
    }[employee.account_status as "pending" | "rejected" | "suspended"];

    return NextResponse.json(
      { message: statusMessage ?? "로그인할 수 없는 계정입니다." },
      { status: 403 },
    );
  }

  const sessionToken = randomBytes(32).toString("base64url");
  const sessionTokenHash = hashSessionToken(
    sessionToken,
    env.SESSION_TOKEN_PEPPER,
  );
  const { settings } = await getSystemSettings(supabase);
  const ttlHours = settings.sessionTtlHours;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  const { error: sessionError } = await supabase.from("sessions").insert({
    employee_id: employee.id,
    session_token_hash: sessionTokenHash,
    expires_at: expiresAt.toISOString(),
  });

  if (sessionError) {
    return NextResponse.json(
      { message: "세션을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }

  const employeeUpdate: Record<string, unknown> = {
    failed_login_count: 0,
    locked_until: null,
    last_login_at: new Date().toISOString(),
  };

  if (verification.needsRehash) {
    employeeUpdate.password_hash = await hashPassword(
      parsed.data.password,
      env.PASSWORD_PEPPER,
    );
  }

  await Promise.all([
    supabase.from("employees").update(employeeUpdate).eq("id", employee.id),
    recordAttempt(supabase, loginId, ipHash, true),
    supabase.from("activity_logs").insert({
      employee_id: employee.id,
      action_type: "auth.login",
      target_type: "session",
      target_id: null,
      changed_data: { ip_hash: ipHash },
    }),
    supabase.from("sessions").delete().lt("expires_at", new Date().toISOString()),
  ]);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return response;
}

function getRequestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

async function recordAttempt(
  supabase: ReturnType<typeof createAdminClient>,
  loginId: string,
  ipHash: string,
  succeeded: boolean,
) {
  await supabase.from("login_attempts").insert({
    login_id: loginId,
    ip_hash: ipHash,
    succeeded,
  });
}
