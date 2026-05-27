import { listClients } from "@/services/clientService";
import {
  createOrderFromProductionOrder,
  listOrders,
  listProductionOrders,
  updateOrderStatus,
  updateProductionOrderStatus,
} from "@/services/operationsService";
import {
  approveQuoteAndCreateProductionOrder,
  createProductionOrderFromQuote,
  listQuoteFlow,
  listQuoteItems,
  listQuotes,
} from "@/services/quoteService";
import type { ApiResult } from "@/types/api";
import type {
  Expediente,
  ExpedienteAction,
  ExpedienteDetail,
  ExpedienteStage,
  ExpedienteTimelineEvent,
  Order,
  ProductionOrder,
  QuoteStatus,
} from "@/types/domain";

function errorResult<T>(message: string): ApiResult<T> {
  return { data: null, error: message };
}

function asTimestamp(date?: string | null): number {
  if (!date) return 0;
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeDateDisplay(value: string): string {
  return value.slice(0, 10);
}

function actorName(...names: Array<string | null | undefined>): string {
  const value = names.find((name) => typeof name === "string" && name.trim().length > 0);
  return value?.trim() ?? "Sin responsable";
}

function deriveStage(
  quoteStatus: QuoteStatus,
  productionStatus: ProductionOrder["status"] | null,
  orderStatus: Order["status"] | null,
): ExpedienteStage {
  if (orderStatus === "delivered") return "order_delivered";
  if (orderStatus === "finished") return "order_finished";
  if (orderStatus === "in_progress") return "order_in_progress";
  if (productionStatus === "completed") return "production_completed";
  if (productionStatus === "in_progress") return "production_in_progress";
  if (productionStatus === "pending") return "production_pending";
  if (quoteStatus === "approved") return "quote_approved";
  return "quote_pending";
}

function getMostRecentDate(dates: Array<string | null | undefined>): string {
  return dates
    .filter((date): date is string => Boolean(date))
    .sort((a, b) => asTimestamp(b) - asTimestamp(a))[0] ?? "";
}

function getCurrentResponsible(params: {
  quoteCreator?: string;
  quoteUpdater?: string;
  productionCreator?: string;
  productionUpdater?: string;
  orderCreator?: string;
  orderUpdater?: string;
  stage: ExpedienteStage;
}): string {
  const { stage } = params;

  if (stage.startsWith("order_")) {
    return actorName(params.orderUpdater, params.orderCreator);
  }

  if (stage.startsWith("production_")) {
    return actorName(params.productionUpdater, params.productionCreator);
  }

  if (stage === "quote_approved") {
    return actorName(params.quoteUpdater, params.quoteCreator);
  }

  return actorName(params.quoteCreator, params.quoteUpdater);
}

function timelineEvent(input: {
  stage: ExpedienteStage;
  title: string;
  detail: string;
  happenedAt: string;
  responsible: string;
}): ExpedienteTimelineEvent {
  return {
    id: `${input.stage}-${input.happenedAt || "no-date"}-${input.title}`,
    stage: input.stage,
    title: input.title,
    detail: input.detail,
    happenedAt: input.happenedAt,
    responsible: input.responsible,
  };
}

export async function listExpedientes(): Promise<ApiResult<Expediente[]>> {
  const [quotesResult, flowResult, clientsResult, productionResult, ordersResult] = await Promise.all([
    listQuotes(),
    listQuoteFlow(),
    listClients(),
    listProductionOrders(),
    listOrders(),
  ]);

  const firstError =
    quotesResult.error ||
    flowResult.error ||
    clientsResult.error ||
    productionResult.error ||
    ordersResult.error;

  if (firstError) return errorResult(firstError);

  const flowByQuoteId = new Map((flowResult.data ?? []).map((item) => [item.quoteId, item]));
  const clientsById = new Map((clientsResult.data ?? []).map((item) => [item.id, item]));
  const productionById = new Map((productionResult.data ?? []).map((item) => [item.id, item]));
  const ordersById = new Map((ordersResult.data ?? []).map((item) => [item.id, item]));

  const expedientes = (quotesResult.data ?? []).map((quote) => {
    const flow = flowByQuoteId.get(quote.id);
    const production = flow?.productionOrderId ? productionById.get(flow.productionOrderId) : undefined;
    const order = flow?.orderId ? ordersById.get(flow.orderId) : undefined;

    const stage = deriveStage(quote.status, production?.status ?? null, order?.status ?? null);
    const updatedAt = getMostRecentDate([
      order?.updatedAt,
      order?.createdAt,
      production?.updatedAt,
      production?.createdAt,
      quote.updatedAt,
      quote.createdAt,
    ]);

    return {
      id: quote.id,
      quoteId: quote.id,
      clientId: quote.clientId,
      clientName: clientsById.get(quote.clientId)?.name ?? "Cliente eliminado",
      total: quote.total,
      stage,
      updatedAt: normalizeDateDisplay(updatedAt),
      responsible: getCurrentResponsible({
        stage,
        quoteCreator: quote.createdByName,
        quoteUpdater: quote.updatedByName,
        productionCreator: production?.createdByName,
        productionUpdater: production?.updatedByName,
        orderCreator: order?.createdByName,
        orderUpdater: order?.updatedByName,
      }),
      productionOrderId: flow?.productionOrderId ?? null,
      orderId: flow?.orderId ?? null,
    } satisfies Expediente;
  });

  expedientes.sort((a, b) => asTimestamp(b.updatedAt) - asTimestamp(a.updatedAt));

  return { data: expedientes, error: null };
}

export async function getExpedienteDetail(expedienteId: string): Promise<ApiResult<ExpedienteDetail>> {
  const [expedientesResult, quotesResult, itemsResult, productionResult, ordersResult] = await Promise.all([
    listExpedientes(),
    listQuotes(),
    listQuoteItems(expedienteId),
    listProductionOrders(),
    listOrders(),
  ]);

  const firstError =
    expedientesResult.error ||
    quotesResult.error ||
    itemsResult.error ||
    productionResult.error ||
    ordersResult.error;

  if (firstError) return errorResult(firstError);

  const expediente = (expedientesResult.data ?? []).find((item) => item.id === expedienteId);
  if (!expediente) return errorResult("Expediente no encontrado");

  const quote = (quotesResult.data ?? []).find((item) => item.id === expediente.quoteId);
  if (!quote) return errorResult("Cotización no encontrada");

  const production = expediente.productionOrderId
    ? (productionResult.data ?? []).find((item) => item.id === expediente.productionOrderId)
    : null;
  const order = expediente.orderId ? (ordersResult.data ?? []).find((item) => item.id === expediente.orderId) : null;

  return {
    data: {
      expediente,
      quoteDescription: quote.description,
      quoteCreatedAt: quote.createdAt.slice(0, 10),
      quoteStatus: quote.status,
      quoteCreatedByName: quote.createdByName,
      quoteUpdatedByName: quote.updatedByName,
      productionStatus: production?.status ?? null,
      productionCreatedByName: production?.createdByName,
      productionUpdatedByName: production?.updatedByName,
      orderStatus: order?.status ?? null,
      orderCreatedByName: order?.createdByName,
      orderUpdatedByName: order?.updatedByName,
      items: itemsResult.data ?? [],
    },
    error: null,
  };
}

export function getAllowedExpedienteActions(detail: ExpedienteDetail): ExpedienteAction[] {
  const { quoteStatus, productionStatus, orderStatus, expediente } = detail;

  if (quoteStatus === "pending") return ["approve_quote"];
  if (quoteStatus === "rejected") return [];

  if (!expediente.productionOrderId || productionStatus === null || productionStatus === "pending") {
    return ["start_production"];
  }

  if (productionStatus === "in_progress") return ["complete_production"];
  if (productionStatus === "completed" && !expediente.orderId) return ["create_order"];
  if (orderStatus === "in_progress") return ["finish_order"];
  if (orderStatus === "finished") return ["deliver_order"];

  return [];
}

export async function advanceExpedienteStage(
  expedienteId: string,
  action: ExpedienteAction,
  actorUserId?: string | null,
): Promise<ApiResult<ExpedienteDetail>> {
  const detailResult = await getExpedienteDetail(expedienteId);
  if (detailResult.error || !detailResult.data) return errorResult(detailResult.error ?? "No se pudo cargar el expediente");

  const detail = detailResult.data;
  const allowed = getAllowedExpedienteActions(detail);
  if (!allowed.includes(action)) {
    return errorResult("Transición inválida para el estado actual del expediente");
  }

  if (action === "approve_quote") {
    const response = await approveQuoteAndCreateProductionOrder(expedienteId, actorUserId);
    if (response.error) return errorResult(response.error);
  }

  if (action === "start_production") {
    let productionOrderId = detail.expediente.productionOrderId;

    if (!productionOrderId) {
      const createResult = await createProductionOrderFromQuote(expedienteId, actorUserId);
      if (createResult.error) return errorResult(createResult.error);
      productionOrderId = createResult.data ?? null;
    }

    if (!productionOrderId) return errorResult("No fue posible crear la orden de producción");

    const response = await updateProductionOrderStatus(productionOrderId, "in_progress", actorUserId);
    if (response.error) return errorResult(response.error);
  }

  if (action === "complete_production") {
    if (!detail.expediente.productionOrderId) return errorResult("No hay orden de producción asociada");
    const response = await updateProductionOrderStatus(
      detail.expediente.productionOrderId,
      "completed",
      actorUserId,
    );
    if (response.error) return errorResult(response.error);
  }

  if (action === "create_order") {
    if (!detail.expediente.productionOrderId) return errorResult("No hay orden de producción asociada");
    const response = await createOrderFromProductionOrder(detail.expediente.productionOrderId, actorUserId);
    if (response.error) return errorResult(response.error);
  }

  if (action === "finish_order") {
    if (!detail.expediente.orderId) return errorResult("No hay pedido asociado");
    const response = await updateOrderStatus(detail.expediente.orderId, "finished", actorUserId);
    if (response.error) return errorResult(response.error);
  }

  if (action === "deliver_order") {
    if (!detail.expediente.orderId) return errorResult("No hay pedido asociado");
    const response = await updateOrderStatus(detail.expediente.orderId, "delivered", actorUserId);
    if (response.error) return errorResult(response.error);
  }

  return getExpedienteDetail(expedienteId);
}

export async function listExpedienteTimeline(expedienteId: string): Promise<ApiResult<ExpedienteTimelineEvent[]>> {
  const detailResult = await getExpedienteDetail(expedienteId);
  if (detailResult.error || !detailResult.data) return errorResult(detailResult.error ?? "No se pudo cargar el expediente");

  const detail = detailResult.data;
  const events: ExpedienteTimelineEvent[] = [];
  const baseDate = detail.quoteCreatedAt;

  events.push(
    timelineEvent({
      stage: "quote_pending",
      title: "Cotización creada",
      detail: "Se registró la cotización inicial.",
      happenedAt: baseDate,
      responsible: actorName(detail.quoteCreatedByName, detail.quoteUpdatedByName),
    }),
  );

  if (detail.quoteStatus === "approved") {
    events.push(
      timelineEvent({
        stage: "quote_approved",
        title: "Cotización aprobada",
        detail: "La cotización fue aprobada y habilitó producción.",
        happenedAt: detail.expediente.updatedAt || baseDate,
        responsible: actorName(detail.quoteUpdatedByName, detail.quoteCreatedByName),
      }),
    );
  }

  if (detail.expediente.productionOrderId) {
    events.push(
      timelineEvent({
        stage: "production_pending",
        title: "Orden de producción creada",
        detail: "La orden quedó pendiente para iniciar producción.",
        happenedAt: detail.expediente.updatedAt || baseDate,
        responsible: actorName(detail.productionCreatedByName, detail.productionUpdatedByName),
      }),
    );
  }

  if (detail.productionStatus === "in_progress" || detail.productionStatus === "completed") {
    events.push(
      timelineEvent({
        stage: "production_in_progress",
        title: "Producción iniciada",
        detail: "La orden entró en ejecución.",
        happenedAt: detail.expediente.updatedAt || baseDate,
        responsible: actorName(detail.productionUpdatedByName, detail.productionCreatedByName),
      }),
    );
  }

  if (detail.productionStatus === "completed") {
    events.push(
      timelineEvent({
        stage: "production_completed",
        title: "Producción completada",
        detail: "La orden de producción fue marcada como completa.",
        happenedAt: detail.expediente.updatedAt || baseDate,
        responsible: actorName(detail.productionUpdatedByName, detail.productionCreatedByName),
      }),
    );
  }

  if (detail.orderStatus) {
    events.push(
      timelineEvent({
        stage: "order_in_progress",
        title: "Pedido generado",
        detail: "Se creó el pedido para seguimiento de entrega.",
        happenedAt: detail.expediente.updatedAt || baseDate,
        responsible: actorName(detail.orderCreatedByName, detail.orderUpdatedByName),
      }),
    );
  }

  if (detail.orderStatus === "finished" || detail.orderStatus === "delivered") {
    events.push(
      timelineEvent({
        stage: "order_finished",
        title: "Pedido finalizado",
        detail: "El pedido se marcó como finalizado.",
        happenedAt: detail.expediente.updatedAt || baseDate,
        responsible: actorName(detail.orderUpdatedByName, detail.orderCreatedByName),
      }),
    );
  }

  if (detail.orderStatus === "delivered") {
    events.push(
      timelineEvent({
        stage: "order_delivered",
        title: "Pedido entregado",
        detail: "Entrega confirmada con el cliente.",
        happenedAt: detail.expediente.updatedAt || baseDate,
        responsible: actorName(detail.orderUpdatedByName, detail.orderCreatedByName),
      }),
    );
  }

  return { data: events, error: null };
}
