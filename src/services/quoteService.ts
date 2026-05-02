import { supabase } from "@/services/supabaseClient";
import type { ApiResult } from "@/types/api";
import type { Quote, QuoteFlowItem, QuoteItem } from "@/types/domain";

interface QuoteRow {
  id: string;
  client_id: string;
  description: string | null;
  total: number | null;
  status: "pending" | "approved" | "rejected";
  created_at: string | null;
}

function mapQuote(row: QuoteRow): Quote {
  return {
    id: row.id,
    clientId: row.client_id,
    description: row.description ?? "",
    total: Number(row.total ?? 0),
    status: row.status,
    createdAt: row.created_at ?? "",
  };
}

export async function createQuoteRpc(input: {
  p_client_id: string;
  p_description: string;
  p_total: number;
}): Promise<ApiResult<null>> {
  const { data, error } = await supabase.rpc("create_quote", input);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? null, error: null };
}

export async function createQuoteWithItemsRpc(input: {
  p_client_id: string;
  p_description: string;
  p_items: Array<{ service_id: string; quantity: number; unit_price?: number | null }>;
}): Promise<ApiResult<string>> {
  const { data, error } = await supabase.rpc("create_quote_with_items", input);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: String(data ?? ""), error: null };
}

export async function updateQuoteStatusRpc(input: {
  p_id: string;
  p_status: "pending" | "approved" | "rejected";
}): Promise<ApiResult<boolean>> {
  const { error } = await supabase.rpc("update_quote_status", input);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: true, error: null };
}

export async function approveQuoteAndCreateProductionOrder(
  quoteId: string,
): Promise<ApiResult<string>> {
  const { data, error } = await supabase.rpc("approve_quote_and_create_production_order", {
    p_quote_id: quoteId,
  });

  if (error) return { data: null, error: error.message };
  return { data: String(data ?? ""), error: null };
}

export async function listQuotes(): Promise<ApiResult<Quote[]>> {
  const { data, error } = await supabase.rpc("get_quotes");

  if (error) {
    return { data: null, error: error.message };
  }

  const normalized = (data as QuoteRow[] | null)?.map(mapQuote) ?? [];
  return { data: normalized, error: null };
}

export async function deleteQuote(quoteId: string): Promise<ApiResult<boolean>> {
  const { error } = await supabase.rpc("delete_quote", { p_id: quoteId });
  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

export async function createProductionOrderFromQuote(quoteId: string): Promise<ApiResult<string>> {
  const { data, error } = await supabase.rpc("create_production_order_from_quote", {
    p_quote_id: quoteId,
  });

  if (error) return { data: null, error: error.message };
  return { data: String(data ?? ""), error: null };
}

export async function listQuoteFlow(): Promise<ApiResult<QuoteFlowItem[]>> {
  const { data, error } = await supabase.rpc("get_quote_flow");
  if (error) return { data: null, error: error.message };

  const rows = ((data as Array<Record<string, unknown>> | null) ?? []).map((row) => ({
    quoteId: String(row.quote_id ?? ""),
    productionOrderId: row.production_order_id ? String(row.production_order_id) : null,
    orderId: row.order_id ? String(row.order_id) : null,
  }));

  return { data: rows, error: null };
}

export async function listQuoteItems(quoteId: string): Promise<ApiResult<QuoteItem[]>> {
  const { data, error } = await supabase.rpc("get_quote_items", { p_quote_id: quoteId });

  if (error) return { data: null, error: error.message };

  const rows = ((data as Array<Record<string, unknown>> | null) ?? []).map((row) => {
    const quantity = Number(row.quantity ?? 0);
    const unitPrice = Number(row.unit_price ?? 0);

    return {
      id: String(row.id ?? ""),
      quoteId: String(row.quote_id ?? quoteId),
      serviceId: String(row.service_id ?? ""),
      serviceName: String(row.service_name ?? ""),
      quantity,
      unitPrice,
      subtotal: quantity * unitPrice,
    };
  });

  return { data: rows, error: null };
}
