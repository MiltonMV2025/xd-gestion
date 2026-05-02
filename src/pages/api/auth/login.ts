import type { APIRoute } from "astro";

import { supabase } from "@/services/supabaseClient";
import type { RpcLoginResponse } from "@/types/api";
import type { AuthSession } from "@/types/auth";
import { SESSION_COOKIE } from "@/utils/navigation";
import { SESSION_MAX_AGE_SECONDS, encodeSessionCookie } from "@/utils/sessionCookie";

export const prerender = false;

interface LoginRequestBody {
  email?: string;
  password?: string;
}

function normalizeLoginBody(input: unknown): LoginRequestBody {
  if (typeof input === "string") {
    const raw = input.trim();
    const asParams = new URLSearchParams(raw);
    const emailParam = asParams.get("email");
    const passwordParam = asParams.get("password");
    if (emailParam !== null || passwordParam !== null) {
      return {
        email: emailParam ?? undefined,
        password: passwordParam ?? undefined,
      };
    }

    try {
      const nested = JSON.parse(raw) as unknown;
      return normalizeLoginBody(nested);
    } catch {
      return {};
    }
  }

  if (typeof input === "object" && input !== null) {
    const record = input as Record<string, unknown>;
    const directEmail = typeof record.email === "string" ? record.email : undefined;
    const directPassword = typeof record.password === "string" ? record.password : undefined;

    if (directEmail || directPassword) {
      return { email: directEmail, password: directPassword };
    }

    const nestedCandidates = [record.data, record.body, record.payload, record.value];
    for (const candidate of nestedCandidates) {
      const normalized = normalizeLoginBody(candidate);
      if (normalized.email || normalized.password) {
        return normalized;
      }
    }

    return {};
  }

  return {};
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function readLoginBody(request: Request): Promise<{
  body: LoginRequestBody;
  error: string | null;
}> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    const raw = await request.text();
    if (!raw.trim()) {
      return { body: {}, error: null };
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      return { body: normalizeLoginBody(parsed), error: null };
    } catch {
      const normalized = normalizeLoginBody(raw);
      if (normalized.email || normalized.password) {
        return { body: normalized, error: null };
      }
      return { body: {}, error: "El cuerpo JSON de la solicitud es inválido." };
    }
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    return {
      body: {
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      },
      error: null,
    };
  }

  const raw = await request.text();
  if (!raw.trim()) {
    return { body: {}, error: null };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return { body: normalizeLoginBody(parsed), error: null };
  } catch {
    return { body: normalizeLoginBody(raw), error: null };
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const { body, error: bodyError } = await readLoginBody(request);
  if (bodyError) {
    return json({ data: null, error: bodyError }, 400);
  }

  const url = new URL(request.url);
  const queryEmail = url.searchParams.get("email") ?? "";
  const queryPassword = url.searchParams.get("password") ?? "";
  const headerEmail = request.headers.get("x-login-email") ?? "";
  const headerPassword = request.headers.get("x-login-password") ?? "";

  const email = (body.email ?? queryEmail ?? headerEmail).trim().toLowerCase();
  const password = body.password ?? queryPassword ?? headerPassword ?? "";

  if (!email || !password) {
    return json(
      {
        data: null,
        error: "Email y contraseña son obligatorios.",
        meta: {
          contentType: request.headers.get("content-type") ?? "unknown",
          detectedKeys: Object.keys(body),
        },
      },
      400,
    );
  }

  let session: AuthSession | null = null;
  let rpcError: string | null = null;
  let resolvedRole: "admin" | "employee" = "employee";

  const { data, error } = await supabase.rpc("login_user", {
    p_email: email,
    p_password: password,
  });

  if (error) {
    rpcError = error.message;
  } else if (data && Array.isArray(data) && data.length > 0) {
    const rpcPayload = data[0] as RpcLoginResponse;

    if (rpcPayload.role_id) {
      const rolesResponse = await supabase.rpc("get_roles");
      if (rolesResponse.data && Array.isArray(rolesResponse.data)) {
        const roleRow = (rolesResponse.data as Array<{ id: string; name: string }>).find(
          (role) => role.id === rpcPayload.role_id,
        );
        if (roleRow?.name?.toLowerCase() === "admin") {
          resolvedRole = "admin";
        }
      }
    }

    session = {
      user: {
        id: rpcPayload.id,
        name: email,
        email,
        role: resolvedRole,
      },
      token: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString(),
    };
  }

  if (!session) {
    return json({ data: null, error: rpcError ?? "Credenciales inválidas." }, 401);
  }

  cookies.set(SESSION_COOKIE, encodeSessionCookie(session), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return json({ data: session, error: null }, 200);
};
