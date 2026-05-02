import type { OrderStatus, ProductionOrderStatus, QuoteStatus } from "@/types/domain";

export const quoteStatusLabel: Record<QuoteStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  in_progress: "En proceso",
  finished: "Finalizado",
  delivered: "Entregado",
};

export const productionStatusLabel: Record<ProductionOrderStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completada",
};
