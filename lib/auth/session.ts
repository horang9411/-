import "server-only";

import { createHash } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getServerEnv } from "@/lib/env";
import { departmentLabel, positionLabel } from "@/lib/employees/constants";
import { createProfileImageSignedUrl } from "@/lib/storage/profile-image";
import { createAdminClient } from "@/lib/supabase/admin";

export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME || "pc_session";

export type CurrentEmployee = {
  id: string;
  name: string;
  position: string;
  positionCode: string;
  department: string;
  departmentCode: string;
  imageUrl: string | null;
  role: "employee" | "admin";
  sessionExpiresAt: string;
};

export type SessionFailureReason =
  | "missing"
  | "invalid"
  | "expired"
  | "account-disabled";

export type CurrentSessionResult =
  | { employee: CurrentEmployee; reason: null }
  | { employee: null; reason: SessionFailureReason };

export function hashSessionToken(token: string, pepper: string) {
  return createHash("sha256").update(token).update(pepper).digest("hex");
}

export async function getCurrentSession({
  includeProfileImage = true,
}: {
  includeProfileImage?: boolean;
} = {}): Promise<CurrentSessionResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return { employee: null, reason: "missing" };

  try {
    const env = getServerEnv();
    const supabase = createAdminClient();
    const tokenHash = hashSessionToken(token, env.SESSION_TOKEN_PEPPER);

    const { data: session } = await supabase
      .from("sessions")
      .select("id, employee_id, expires_at")
      .eq("session_token_hash", tokenHash)
      .maybeSingle();

    if (!session) return { employee: null, reason: "invalid" };

    if (new Date(session.expires_at).getTime() <= Date.now()) {
      await supabase.from("sessions").delete().eq("id", session.id);
      return { employee: null, reason: "expired" };
    }

    const { data: employee } = await supabase
      .from("employees")
      .select("id, name, position, department, profile_image_url, role, account_status")
      .eq("id", session.employee_id)
      .maybeSingle();

    if (!employee) {
      await supabase.from("sessions").delete().eq("id", session.id);
      return { employee: null, reason: "invalid" };
    }

    if (employee.account_status !== "active") {
      await supabase.from("sessions").delete().eq("employee_id", employee.id);
      return { employee: null, reason: "account-disabled" };
    }

    const imageUrl = includeProfileImage
      ? await createProfileImageSignedUrl(supabase, employee.profile_image_url)
      : null;

    return {
      employee: {
        id: employee.id,
        name: employee.name,
        position: positionLabel(employee.position),
        positionCode: employee.position,
        department: departmentLabel(employee.department),
        departmentCode: employee.department,
        imageUrl,
        role: employee.role,
        sessionExpiresAt: session.expires_at,
      },
      reason: null,
    };
  } catch {
    return { employee: null, reason: "invalid" };
  }
}

export async function getCurrentEmployee(): Promise<CurrentEmployee | null> {
  const session = await getCurrentSession();
  return session.employee;
}

export async function requireCurrentEmployee() {
  const session = await getCurrentSession();
  if (!session.employee) {
    const reason =
      session.reason === "expired"
        ? "session-expired"
        : session.reason === "account-disabled"
          ? "account-disabled"
          : session.reason === "invalid"
            ? "invalid-session"
            : null;
    redirect(reason ? `/login?reason=${reason}` : "/login");
  }
  return session.employee;
}
