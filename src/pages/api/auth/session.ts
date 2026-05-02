import type { APIRoute } from "astro";

import { SESSION_COOKIE } from "@/utils/navigation";
import { decodeSessionCookie } from "@/utils/sessionCookie";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const rawCookie = cookies.get(SESSION_COOKIE)?.value;
  const session = decodeSessionCookie(rawCookie);

  if (!session) {
    return new Response(JSON.stringify({ data: null, error: null }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const isExpired = new Date(session.expiresAt).getTime() < Date.now();
  if (isExpired) {
    cookies.delete(SESSION_COOKIE, { path: "/" });
    return new Response(JSON.stringify({ data: null, error: null }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ data: session, error: null }), {
    headers: { "Content-Type": "application/json" },
  });
};
