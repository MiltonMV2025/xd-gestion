import { supabase } from "@/services/supabaseClient";
import type { ApiResult } from "@/types/api";
import type { CompanyItem } from "@/types/domain";

interface CompanyRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  created_at: string | null;
}

function mapCompany(row: CompanyRow): CompanyItem {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    address: row.address ?? "",
    logoUrl: row.logo_url ?? "",
    createdAt: row.created_at ?? "",
  };
}

export async function getCompanies(): Promise<ApiResult<CompanyItem[]>> {
  const { data, error } = await supabase.rpc("get_companies");
  if (error) return { data: null, error: error.message };

  const companies = ((data as CompanyRow[] | null) ?? []).map(mapCompany);
  return { data: companies, error: null };
}

export async function createCompany(input: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
}): Promise<ApiResult<string>> {
  const { data, error } = await supabase.rpc("create_company", {
    p_name: input.name,
    p_phone: input.phone ?? "",
    p_email: input.email ?? "",
    p_address: input.address ?? "",
    p_logo_url: input.logoUrl ?? "",
  });

  if (error) return { data: null, error: error.message };
  return { data: String(data ?? ""), error: null };
}

export async function updateCompany(input: {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
}): Promise<ApiResult<boolean>> {
  const { error } = await supabase.rpc("update_company", {
    p_id: input.id,
    p_name: input.name,
    p_phone: input.phone ?? "",
    p_email: input.email ?? "",
    p_address: input.address ?? "",
    p_logo_url: input.logoUrl ?? "",
  });

  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

export async function deleteCompany(companyId: string): Promise<ApiResult<boolean>> {
  const { error } = await supabase.rpc("delete_company", { p_id: companyId });
  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

export async function uploadCompanyPhoto(companyId: string, file: File): Promise<ApiResult<string>> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "");
  const path = `companies/${companyId}/${Date.now()}.${safeExt || "jpg"}`;

  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (error) return { data: null, error: error.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { data: data.publicUrl, error: null };
}

export async function updateCompanyPhoto(companyId: string, logoUrl: string): Promise<ApiResult<boolean>> {
  const { error } = await supabase.rpc("update_company_logo", {
    p_id: companyId,
    p_logo_url: logoUrl,
  });

  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}
