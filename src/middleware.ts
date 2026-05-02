import { defineMiddleware } from "astro:middleware";

import { protectedPrefixes, SESSION_COOKIE } from "@/utils/navigation";
import { decodeSessionCookie } from "@/utils/sessionCookie";

const publicPaths = ["/login"];

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;

  if (pathname.startsWith("/_astro") || pathname.startsWith("/api/auth")) {
    return next();
  }

  const sessionValue = context.cookies.get(SESSION_COOKIE)?.value;
  const session = decodeSessionCookie(sessionValue);
  const hasSession = Boolean(session);

  if (publicPaths.includes(pathname) && hasSession) {
    return context.redirect("/dashboard");
  }

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !hasSession) {
    return context.redirect("/login");
  }

  return next();
});
