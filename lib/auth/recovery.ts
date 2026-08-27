import "server-only";

import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import bcrypt from "bcryptjs";

export const RECOVERY_COOKIE_NAME = "pc_password_recovery";
export const RECOVERY_TOKEN_TTL_SECONDS = 10 * 60;

type RecoveryTokenPayload = {
  employeeId: string;
  expiresAt: number;
  passwordVersion: string;
};

export function normalizeSecurityAnswer(answer: string) {
  return answer.normalize("NFKC").trim().toLocaleLowerCase("ko-KR").replace(/\s+/gu, "");
}

function prepareSecurityAnswer(answer: string, pepper: string) {
  return createHash("sha256")
    .update("pastelcraft-security-answer:")
    .update(normalizeSecurityAnswer(answer))
    .update(pepper)
    .digest("hex");
}

export async function hashSecurityAnswer(answer: string, pepper: string) {
  return bcrypt.hash(prepareSecurityAnswer(answer, pepper), 12);
}

export async function verifySecurityAnswer(
  answer: string,
  answerHash: string,
  pepper: string,
) {
  return bcrypt.compare(prepareSecurityAnswer(answer, pepper), answerHash);
}

export function createRecoveryToken({
  employeeId,
  passwordHash,
  pepper,
}: {
  employeeId: string;
  passwordHash: string;
  pepper: string;
}) {
  const payload: RecoveryTokenPayload = {
    employeeId,
    expiresAt: Date.now() + RECOVERY_TOKEN_TTL_SECONDS * 1000,
    passwordVersion: getPasswordVersion(passwordHash),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signRecoveryPayload(encodedPayload, pepper);
  return `${encodedPayload}.${signature}`;
}

export function verifyRecoveryToken(token: string, pepper: string) {
  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) return null;

  const expectedSignature = signRecoveryPayload(encodedPayload, pepper);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<RecoveryTokenPayload>;
    if (
      typeof payload.employeeId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(payload.employeeId) ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now() ||
      typeof payload.passwordVersion !== "string"
    ) {
      return null;
    }
    return payload as RecoveryTokenPayload;
  } catch {
    return null;
  }
}

export function matchesRecoveryPasswordVersion(
  passwordHash: string,
  passwordVersion: string,
) {
  return getPasswordVersion(passwordHash) === passwordVersion;
}

function getPasswordVersion(passwordHash: string) {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 32);
}

function signRecoveryPayload(payload: string, pepper: string) {
  return createHmac("sha256", pepper).update(payload).digest("base64url");
}
