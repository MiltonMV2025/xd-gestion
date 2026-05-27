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
  branchId: string | null;
  position: string;
  photoUrl: string;
  companyName?: string;
  branchName?: string;
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
  updatedAt?: string;
  createdByName?: string;
  updatedByName?: string;
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
  createdAt?: string;
  updatedAt?: string;
  createdByName?: string;
  updatedByName?: string;
}

export type OrderStatus = "in_progress" | "finished" | "delivered";

export interface Order {
  id: string;
  clientName: string;
  status: OrderStatus;
  updatedAt: string;
  createdAt?: string;
  createdByName?: string;
  updatedByName?: string;
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

export interface CompanyBranchItem {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  active: boolean;
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

export type ExpedienteStage =
  | "quote_pending"
  | "quote_approved"
  | "production_pending"
  | "production_in_progress"
  | "production_completed"
  | "order_in_progress"
  | "order_finished"
  | "order_delivered";

export type ExpedienteAction =
  | "approve_quote"
  | "start_production"
  | "complete_production"
  | "create_order"
  | "finish_order"
  | "deliver_order";

export interface Expediente {
  id: string;
  quoteId: string;
  clientId: string;
  clientName: string;
  total: number;
  stage: ExpedienteStage;
  updatedAt: string;
  responsible: string;
  productionOrderId: string | null;
  orderId: string | null;
}

export interface ExpedienteDetail {
  expediente: Expediente;
  quoteDescription: string;
  quoteCreatedAt: string;
  quoteStatus: QuoteStatus;
  quoteCreatedByName?: string;
  quoteUpdatedByName?: string;
  productionStatus: ProductionOrderStatus | null;
  productionCreatedByName?: string;
  productionUpdatedByName?: string;
  orderStatus: OrderStatus | null;
  orderCreatedByName?: string;
  orderUpdatedByName?: string;
  items: QuoteItem[];
}

export interface ExpedienteTimelineEvent {
  id: string;
  stage: ExpedienteStage;
  title: string;
  detail: string;
  happenedAt: string;
  responsible: string;
}
