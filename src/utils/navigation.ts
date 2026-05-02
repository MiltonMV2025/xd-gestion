import {
  Building2,
  ClipboardList,
  Factory,
  FileText,
  LayoutDashboard,
  PackageCheck,
  Users,
  Wrench,
} from "lucide-react";

export const APP_NAME = "XD Gestión";
export const SESSION_COOKIE = "xd_gestion_session";

export const appNavigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/services", label: "Servicios", icon: Wrench },
  { href: "/companies", label: "Empresas", icon: Building2 },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/quotes", label: "Cotizaciones", icon: FileText },
  { href: "/production-orders", label: "Órdenes", icon: Factory },
  { href: "/orders", label: "Pedidos", icon: ClipboardList },
  { href: "/users", label: "Usuarios", icon: PackageCheck },
] as const;

export const routeTitleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/services": "Servicios",
  "/companies": "Empresas",
  "/clients": "Clientes",
  "/quotes": "Cotizaciones",
  "/production-orders": "Órdenes de Producción",
  "/orders": "Pedidos",
  "/users": "Usuarios",
};

export const protectedPrefixes = [
  "/dashboard",
  "/services",
  "/companies",
  "/clients",
  "/quotes",
  "/production-orders",
  "/orders",
  "/users",
];
