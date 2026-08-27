import { NextResponse } from "next/server";

import {
  hasValidMutationOrigin,
  invalidOriginResponse,
} from "@/lib/auth/api";
import {
  createRecoveryAttemptIdentifier,
  hashRecoveryRequestIp,
  isRecoveryRateLimited,
  recordRecoveryAttempt,
} from "@/lib/auth/recovery-rate-limit";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { findLoginIdSchema } from "@/schemas/auth";

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();

  const input = await request.json().catch(() => null);
  const parsed = findLoginIdSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." },
      { status: 400 },
    );
  }

  const env = getServerEnv();
  const supabase = createAdminClient();
  const ipHash = hashRecoveryRequestIp(request, env.SESSION_TOKEN_PEPPER);
  const identifier = createRecoveryAttemptIdentifier(
    "find-id",
    [parsed.data.name, parsed.data.phone],
    env.SESSION_TOKEN_PEPPER,
  );
  if (await isRecoveryRateLimited(supabase, identifier, ipHash)) {
    return NextResponse.json(
      { message: "확인 요청이 너무 많습니다. 15분 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const { data, error } = await supabase
    .from("employees")
    .select("login_id")
    .eq("name", parsed.data.name)
    .eq("phone", parsed.data.phone)
    .in("account_status", ["active", "pending", "suspended"])
    .order("created_at", { ascending: true });
  const loginIds = (data ?? []).map((employee) => employee.login_id);
  await recordRecoveryAttempt(
    supabase,
    identifier,
    ipHash,
    !error && loginIds.length > 0,
  );

  if (error || loginIds.length === 0) {
    return NextResponse.json(
      { message: "입력한 정보와 일치하는 계정을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { loginIds },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
