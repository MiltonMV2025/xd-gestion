import type { AuthSession } from "@/types/auth";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export function encodeSessionCookie(session: AuthSession): string {
  const raw = JSON.stringify(session);
  return Buffer.from(raw, "utf-8").toString("base64url");
}

export function decodeSessionCookie(value?: string): AuthSession | null {
  if (!value) return null;

  try {
    const raw = Buffer.from(value, "base64url").toString("utf-8");
    const parsed = JSON.parse(raw) as AuthSession;
    return parsed;
  } catch {
    return null;
  }
}
