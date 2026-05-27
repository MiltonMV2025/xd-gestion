import type { ExpedienteAction, ExpedienteStage, OrderStatus, ProductionOrderStatus, QuoteStatus } from "@/types/domain";

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

export const expedienteStageLabel: Record<ExpedienteStage, string> = {
  quote_pending: "Cotización pendiente",
  quote_approved: "Cotización aprobada",
  production_pending: "Producción pendiente",
  production_in_progress: "Producción en progreso",
  production_completed: "Producción completada",
  order_in_progress: "Pedido en proceso",
  order_finished: "Pedido finalizado",
  order_delivered: "Pedido entregado",
};

export const expedienteActionLabel: Record<ExpedienteAction, string> = {
  approve_quote: "Aprobar cotización",
  start_production: "Iniciar producción",
  complete_production: "Finalizar producción",
  create_order: "Generar pedido",
  finish_order: "Finalizar pedido",
  deliver_order: "Marcar entregado",
};
