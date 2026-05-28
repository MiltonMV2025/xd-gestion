import { Building2, ClipboardList, GitBranch, LayoutDashboard, PackageCheck, Wrench } from "lucide-react";

export const APP_NAME = "XD Gestión";
export const SESSION_COOKIE = "xd_gestion_session";

export const appNavigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/services", label: "Servicios", icon: Wrench },
  { href: "/companies", label: "Empresas", icon: Building2 },
  { href: "/branches", label: "Sucursales", icon: GitBranch },
  { href: "/expedientes", label: "Expedientes", icon: ClipboardList },
  { href: "/users", label: "Usuarios", icon: PackageCheck },
] as const;

export const routeTitleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/services": "Servicios",
  "/companies": "Empresas",
  "/branches": "Sucursales",
  "/expedientes": "Expedientes",
  "/users": "Usuarios",
};

export const protectedPrefixes = ["/dashboard", "/services", "/companies", "/branches", "/expedientes", "/users"];
