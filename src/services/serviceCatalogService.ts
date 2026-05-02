import { supabase } from "@/services/supabaseClient";
import type { ApiResult } from "@/types/api";
import type { ServiceCatalogItem } from "@/types/domain";

interface ServiceRow {
  id: string;
  name: string | null;
  description: string | null;
  unit_price: number | null;
  active: boolean | null;
  created_at: string | null;
}

function mapService(row: ServiceRow): ServiceCatalogItem {
  return {
    id: row.id,
    name: row.name ?? "",
    description: row.description ?? "",
    unitPrice: Number(row.unit_price ?? 0),
    active: Boolean(row.active ?? true),
    createdAt: row.created_at ?? "",
  };
}

export async function getServices(): Promise<ApiResult<ServiceCatalogItem[]>> {
  const { data, error } = await supabase.rpc("get_services");
  if (error) return { data: null, error: error.message };

  const rows = ((data as ServiceRow[] | null) ?? []).map(mapService);
  return { data: rows, error: null };
}

export async function createService(input: {
  name: string;
  description: string;
  unitPrice: number;
  active: boolean;
}): Promise<ApiResult<string>> {
  const { data, error } = await supabase.rpc("create_service", {
    p_name: input.name,
    p_description: input.description,
    p_unit_price: input.unitPrice,
    p_active: input.active,
  });

  if (error) return { data: null, error: error.message };
  return { data: String(data ?? ""), error: null };
}

export async function updateService(input: {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  active: boolean;
}): Promise<ApiResult<boolean>> {
  const { error } = await supabase.rpc("update_service", {
    p_id: input.id,
    p_name: input.name,
    p_description: input.description,
    p_unit_price: input.unitPrice,
    p_active: input.active,
  });

  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

export async function deleteService(serviceId: string): Promise<ApiResult<boolean>> {
  const { error } = await supabase.rpc("delete_service", { p_id: serviceId });
  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}
