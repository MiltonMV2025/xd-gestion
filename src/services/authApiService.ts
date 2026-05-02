import type { ApiResult } from "@/types/api";
import type { AuthSession, LoginPayload } from "@/types/auth";

async function parseJson<T>(response: Response): Promise<ApiResult<T>> {
  try {
    const payload = (await response.json()) as ApiResult<T>;
    if (!response.ok) {
      return {
        data: payload.data ?? null,
        error: payload.error ?? `Error HTTP ${response.status}`,
      };
    }
    return payload;
  } catch {
    return {
      data: null,
      error: `Respuesta inválida del servidor (HTTP ${response.status})`,
    };
  }
}

export async function loginRequest(payload: LoginPayload): Promise<ApiResult<AuthSession>> {
  const formBody = new URLSearchParams({
    email: payload.email,
    password: payload.password,
  }).toString();

  const response = await fetch("/api/auth/login", {
    method: "POST",
    mode: "same-origin",
    credentials: "same-origin",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: formBody,
  });

  return parseJson<AuthSession>(response);
}

export async function logoutRequest(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function getSessionRequest(): Promise<ApiResult<AuthSession>> {
  const response = await fetch("/api/auth/session");
  return parseJson<AuthSession>(response);
}
