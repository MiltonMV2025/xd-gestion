import { supabase } from "@/services/supabaseClient";
import type { ApiResult } from "@/types/api";
import type { DepartmentItem, RoleItem } from "@/types/domain";

interface RoleRow {
  id: string;
  name: string;
  type: "system" | "business";
}

interface DepartmentRow {
  id: string;
  name: string;
}

export async function getRoles(): Promise<ApiResult<RoleItem[]>> {
  const { data, error } = await supabase.rpc("get_roles");
  if (error) return { data: null, error: error.message };

  const roles =
    ((data as RoleRow[] | null) ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
    })) ?? [];

  return { data: roles, error: null };
}

export async function getDepartments(): Promise<ApiResult<DepartmentItem[]>> {
  const { data, error } = await supabase.rpc("get_departments");
  if (error) return { data: null, error: error.message };

  const departments =
    ((data as DepartmentRow[] | null) ?? []).map((row) => ({
      id: row.id,
      name: row.name,
    })) ?? [];

  return { data: departments, error: null };
}
