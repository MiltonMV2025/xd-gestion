import { supabase } from "@/services/supabaseClient";
import type { ApiResult } from "@/types/api";
import type { Order, OrderStatus, ProductionOrder, ProductionOrderStatus } from "@/types/domain";

interface ProductionOrderRow {
  id: string;
  quote_id: string | null;
  status: ProductionOrderStatus;
  created_at: string | null;
}

interface OrderRow {
  id: string;
  production_order_id: string | null;
  status: OrderStatus;
  updated_at: string | null;
}

export async function listProductionOrders(): Promise<ApiResult<ProductionOrder[]>> {
  const { data, error } = await supabase.rpc("get_production_orders");
  if (error) return { data: null, error: error.message };

  const rows = ((data as ProductionOrderRow[] | null) ?? []).map((row) => ({
    id: row.id,
    quoteId: row.quote_id ?? "",
    clientName: "—",
    status: row.status,
    estimatedDelivery: row.created_at?.slice(0, 10) ?? "",
  }));

  return { data: rows, error: null };
}

export async function updateProductionOrderStatus(
  id: string,
  status: ProductionOrderStatus,
): Promise<ApiResult<boolean>> {
  const { error } = await supabase.rpc("update_production_order_status", {
    p_id: id,
    p_status: status,
  });
  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

export async function listOrders(): Promise<ApiResult<Order[]>> {
  const { data, error } = await supabase.rpc("get_orders");
  if (error) return { data: null, error: error.message };

  const rows = ((data as OrderRow[] | null) ?? []).map((row) => ({
    id: row.id,
    clientName: row.production_order_id ?? "—",
    status: row.status,
    updatedAt: row.updated_at?.slice(0, 10) ?? "",
  }));

  return { data: rows, error: null };
}

export async function createOrderFromProductionOrder(
  productionOrderId: string,
): Promise<ApiResult<string>> {
  const { data, error } = await supabase.rpc("create_order_from_production_order", {
    p_production_order_id: productionOrderId,
  });
  if (error) return { data: null, error: error.message };
  return { data: String(data ?? ""), error: null };
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<ApiResult<boolean>> {
  const { error } = await supabase.rpc("update_order_status", {
    p_id: id,
    p_status: status,
  });
  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}
