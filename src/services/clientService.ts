import { supabase } from "@/services/supabaseClient";
import type { ApiResult } from "@/types/api";
import type { Client, CompanyItem } from "@/types/domain";

interface ClientRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  company_id: string | null;
  position: string | null;
  photo_url: string | null;
  created_at: string | null;
}

function mapClient(row: ClientRow, companiesById: Map<string, CompanyItem>): Client {
  const company = row.company_id ? companiesById.get(row.company_id) : undefined;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    address: row.address ?? "",
    companyId: row.company_id,
    position: row.position ?? "",
    photoUrl: row.photo_url ?? "",
    companyName: company?.name,
    createdAt: row.created_at ?? "",
  };
}

export async function listClients(companies?: CompanyItem[]): Promise<ApiResult<Client[]>> {
  const { data, error } = await supabase.rpc("get_clients");
  if (error) return { data: null, error: error.message };

  const companiesById = new Map((companies ?? []).map((item) => [item.id, item]));
  const clients = ((data as ClientRow[] | null) ?? []).map((row) => mapClient(row, companiesById));
  return { data: clients, error: null };
}

export async function createClient(input: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  companyId?: string | null;
  position?: string;
  photoUrl?: string;
}): Promise<ApiResult<string>> {
  const { data, error } = await supabase.rpc("create_client", {
    p_name: input.name,
    p_phone: input.phone ?? "",
    p_email: input.email ?? "",
    p_address: input.address ?? "",
    p_company_id: input.companyId ?? null,
    p_position: input.position ?? "",
    p_photo_url: input.photoUrl ?? "",
  });

  if (error) return { data: null, error: error.message };
  return { data: String(data ?? ""), error: null };
}

export async function updateClient(
  id: string,
  input: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    companyId?: string | null;
    position?: string;
    photoUrl?: string;
  },
): Promise<ApiResult<boolean>> {
  const { error } = await supabase.rpc("update_client", {
    p_id: id,
    p_name: input.name,
    p_phone: input.phone ?? "",
    p_email: input.email ?? "",
    p_address: input.address ?? "",
    p_company_id: input.companyId ?? null,
    p_position: input.position ?? "",
    p_photo_url: input.photoUrl ?? "",
  });

  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

export async function deleteClient(id: string): Promise<ApiResult<boolean>> {
  const { error } = await supabase.rpc("delete_client", { p_id: id });
  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

export async function uploadClientPhoto(clientId: string, file: File): Promise<ApiResult<string>> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "");
  const path = `clients/${clientId}/${Date.now()}.${safeExt || "jpg"}`;

  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (error) return { data: null, error: error.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { data: data.publicUrl, error: null };
}

export async function updateClientPhoto(clientId: string, photoUrl: string): Promise<ApiResult<boolean>> {
  const { error } = await supabase.rpc("update_client_photo", {
    p_id: clientId,
    p_photo_url: photoUrl,
  });
  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}
