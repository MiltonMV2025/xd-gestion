import { supabase } from "@/services/supabaseClient";
import type { ApiResult } from "@/types/api";
import type { CompanyBranchItem } from "@/types/domain";

interface BranchRow {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  active: boolean | null;
  created_at: string | null;
}

function mapBranch(row: BranchRow): CompanyBranchItem {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    address: row.address ?? "",
    active: Boolean(row.active ?? true),
    createdAt: row.created_at ?? "",
  };
}

export async function getCompanyBranches(companyId: string): Promise<ApiResult<CompanyBranchItem[]>> {
  const { data, error } = await supabase.rpc("get_company_branches", {
    p_company_id: companyId,
  });
  if (error) return { data: null, error: error.message };
  return { data: ((data as BranchRow[] | null) ?? []).map(mapBranch), error: null };
}

export async function createCompanyBranch(input: {
  companyId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  active?: boolean;
}): Promise<ApiResult<string>> {
  const { data, error } = await supabase.rpc("create_company_branch", {
    p_company_id: input.companyId,
    p_name: input.name,
    p_phone: input.phone ?? "",
    p_email: input.email ?? "",
    p_address: input.address ?? "",
    p_active: input.active ?? true,
  });
  if (error) return { data: null, error: error.message };
  return { data: String(data ?? ""), error: null };
}

export async function updateCompanyBranch(input: {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  active?: boolean;
}): Promise<ApiResult<boolean>> {
  const { error } = await supabase.rpc("update_company_branch", {
    p_id: input.id,
    p_name: input.name,
    p_phone: input.phone ?? "",
    p_email: input.email ?? "",
    p_address: input.address ?? "",
    p_active: input.active ?? true,
  });
  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

export async function deleteCompanyBranch(branchId: string): Promise<ApiResult<boolean>> {
  const { error } = await supabase.rpc("delete_company_branch", {
    p_id: branchId,
  });
  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}
