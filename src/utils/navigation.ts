import { Building2, ClipboardList, LayoutDashboard, PackageCheck, Wrench } from "lucide-react";

export const APP_NAME = "XD Gestión";
export const SESSION_COOKIE = "xd_gestion_session";

export const appNavigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/services", label: "Servicios", icon: Wrench },
  { href: "/organization", label: "Organización", icon: Building2 },
  { href: "/expedientes", label: "Expedientes", icon: ClipboardList },
  { href: "/users", label: "Usuarios", icon: PackageCheck },
] as const;

export const routeTitleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/services": "Servicios",
  "/organization": "Organización",
  "/expedientes": "Expedientes",
  "/users": "Usuarios",
};

export const protectedPrefixes = ["/dashboard", "/services", "/organization", "/expedientes", "/users"];
