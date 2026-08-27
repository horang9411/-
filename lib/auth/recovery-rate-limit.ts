import "server-only";

import { createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

const RECOVERY_WINDOW_MINUTES = 15;
const MAX_RECOVERY_FAILURES = 8;
const MAX_RECOVERY_REQUESTS_PER_IP = 30;

export function hashRecoveryRequestIp(request: Request, pepper: string) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  return createHash("sha256").update(ip).update(pepper).digest("hex");
}

export function createRecoveryAttemptIdentifier(
  type: string,
  values: string[],
  pepper: string,
) {
  const digest = createHash("sha256")
    .update(values.join("\u0000"))
    .update(pepper)
    .digest("hex")
    .slice(0, 32);
  return `recovery-${type}-${digest}`;
}

export async function isRecoveryRateLimited(
  supabase: ReturnType<typeof createAdminClient>,
  identifier: string,
  ipHash: string,
) {
  const windowStart = new Date(
    Date.now() - RECOVERY_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();
  const [{ count: failures }, { count: ipRequests }] = await Promise.all([
    supabase
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("succeeded", false)
      .gte("created_at", windowStart)
      .or(`login_id.eq.${identifier},ip_hash.eq.${ipHash}`),
    supabase
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", windowStart),
  ]);

  return (
    (failures ?? 0) >= MAX_RECOVERY_FAILURES ||
    (ipRequests ?? 0) >= MAX_RECOVERY_REQUESTS_PER_IP
  );
}

export async function recordRecoveryAttempt(
  supabase: ReturnType<typeof createAdminClient>,
  identifier: string,
  ipHash: string,
  succeeded: boolean,
) {
  await supabase.from("login_attempts").insert({
    login_id: identifier,
    ip_hash: ipHash,
    succeeded,
  });
}
