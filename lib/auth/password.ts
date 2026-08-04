import "server-only";

import { createHash } from "node:crypto";

import bcrypt from "bcryptjs";

export function preparePassword(password: string, pepper: string) {
  return createHash("sha256").update(password).update(pepper).digest("hex");
}

export async function hashPassword(password: string, pepper: string) {
  return bcrypt.hash(preparePassword(password, pepper), 12);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
  pepper: string,
) {
  const currentMatch = await bcrypt.compare(
    preparePassword(password, pepper),
    passwordHash,
  );

  if (currentMatch) {
    return { matches: true, needsRehash: false };
  }

  // 1단계 관리자 스크립트로 만든 기존 해시를 한 번만 호환하고,
  // 로그인 성공 시 최신 방식으로 교체합니다.
  const legacyMatch = await bcrypt.compare(`${password}${pepper}`, passwordHash);
  return { matches: legacyMatch, needsRehash: legacyMatch };
}
