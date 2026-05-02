import { AuthProvider } from "@/features/auth/context/AuthContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
