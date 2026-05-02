export type UserRole = "admin" | "employee";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthSession {
  user: SessionUser;
  token: string;
  expiresAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: AuthSession | null;
}
