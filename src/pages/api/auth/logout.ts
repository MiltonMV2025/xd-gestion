import type { APIRoute } from "astro";

import { SESSION_COOKIE } from "@/utils/navigation";

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete(SESSION_COOKIE, { path: "/" });

  return new Response(JSON.stringify({ data: true, error: null }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const GET: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete(SESSION_COOKIE, { path: "/" });
  return redirect("/login");
};
