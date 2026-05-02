import { createContext, useEffect, useMemo, useState } from "react";

import { getSessionRequest, loginRequest, logoutRequest } from "@/services/authApiService";
import type { AuthSession, LoginPayload } from "@/types/auth";

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const response = await getSessionRequest();
      if (!mounted) return;
      if (response.data) {
        setSession(response.data);
      }
      setIsLoading(false);
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      isAuthenticated: Boolean(session),
      login: async (payload) => {
        const response = await loginRequest(payload);
        if (!response.data) {
          return {
            ok: false,
            error: response.error ?? "No fue posible iniciar sesión.",
          };
        }
        setSession(response.data);
        return { ok: true };
      },
      logout: async () => {
        await logoutRequest();
        setSession(null);
      },
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
