import type { UserRole } from "@/types/auth";

export interface DashboardMetrics {
  pendingQuotes: number;
  ordersInProgress: number;
  finishedJobs: number;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  companyId: string | null;
  position: string;
  photoUrl: string;
  companyName?: string;
  createdAt: string;
}

export type QuoteStatus = "pending" | "approved" | "rejected";

export interface Quote {
  id: string;
  clientId: string;
  description: string;
  total: number;
  status: QuoteStatus;
  createdAt: string;
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export type ProductionOrderStatus = "pending" | "in_progress" | "completed";

export interface ProductionOrder {
  id: string;
  quoteId: string;
  clientName: string;
  status: ProductionOrderStatus;
  estimatedDelivery: string;
}

export type OrderStatus = "in_progress" | "finished" | "delivered";

export interface Order {
  id: string;
  clientName: string;
  status: OrderStatus;
  updatedAt: string;
}

export interface UserItem {
  id: string;
  name: string;
  email: string;
  roleId: string | null;
  departmentId: string | null;
  avatarUrl: string;
  role: UserRole;
  roleName?: string;
  departmentName?: string;
}

export interface RoleItem {
  id: string;
  name: string;
  type: "system" | "business";
}

export interface DepartmentItem {
  id: string;
  name: string;
}

export interface CompanyItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
  createdAt: string;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  active: boolean;
  createdAt: string;
}

export interface QuoteFlowItem {
  quoteId: string;
  productionOrderId: string | null;
  orderId: string | null;
}
