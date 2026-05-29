import {
  Building2,
  ClipboardList,
  GitBranch,
  LayoutDashboard,
  PackageCheck,
  Upload,
  Wrench,
} from "lucide-react";
import type { UserRole } from "@/types/auth";

export const APP_NAME = "XD Gestión";
export const SESSION_COOKIE = "xd_gestion_session";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  requiredRole?: UserRole;
}

export const appNavigation: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/services", label: "Servicios", icon: Wrench },
  { href: "/companies", label: "Empresas", icon: Building2 },
  { href: "/branches", label: "Sucursales", icon: GitBranch },
  { href: "/expedientes", label: "Expedientes", icon: ClipboardList },
  { href: "/users", label: "Usuarios", icon: PackageCheck },
  { href: "/bulk-operations", label: "Operaciones en bloque", icon: Upload, requiredRole: "admin" },
];

export const routeTitleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/services": "Servicios",
  "/companies": "Empresas",
  "/branches": "Sucursales",
  "/expedientes": "Expedientes",
  "/users": "Usuarios",
  "/bulk-operations": "Operaciones en bloque",
  "/bulk-operations/empresas": "Carga masiva: Empresas",
  "/bulk-operations/sucursales": "Carga masiva: Sucursales",
  "/bulk-operations/clientes": "Carga masiva: Clientes",
  "/bulk-operations/historial": "Historial de cargas",
};

// Picks the most specific configured prefix so dynamic routes like
// /bulk-operations/historial/abc-123 still show a meaningful header.
export function resolveRouteTitle(pathname: string): string {
  const exact = routeTitleMap[pathname];
  if (exact) return exact;

  const prefixes = Object.keys(routeTitleMap).sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return routeTitleMap[prefix];
    }
  }
  return APP_NAME;
}

export function filterNavByRole(role: UserRole | undefined): NavItem[] {
  return appNavigation.filter((item) => !item.requiredRole || item.requiredRole === role);
}

export const protectedPrefixes = [
  "/dashboard",
  "/services",
  "/companies",
  "/branches",
  "/expedientes",
  "/users",
  "/bulk-operations",
];

export const adminOnlyPrefixes = ["/bulk-operations"];
