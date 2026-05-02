import { supabase } from "@/services/supabaseClient";
import type { ApiResult } from "@/types/api";
import type { DepartmentItem, RoleItem, UserItem } from "@/types/domain";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role_id: string | null;
  department_id: string | null;
  avatar_url: string | null;
}

function inferRole(roleName?: string): "admin" | "employee" {
  return roleName?.toLowerCase() === "admin" ? "admin" : "employee";
}

export async function getUsers(
  roles: RoleItem[],
  departments: DepartmentItem[],
): Promise<ApiResult<UserItem[]>> {
  const { data, error } = await supabase.rpc("get_users");
  if (error) return { data: null, error: error.message };

  const rolesById = new Map(roles.map((item) => [item.id, item]));
  const departmentsById = new Map(departments.map((item) => [item.id, item]));

  const users = ((data as UserRow[] | null) ?? []).map((row) => {
    const roleName = row.role_id ? rolesById.get(row.role_id)?.name : undefined;
    const departmentName = row.department_id
      ? departmentsById.get(row.department_id)?.name
      : undefined;

    return {
      id: row.id,
      name: row.name ?? "",
      email: row.email,
      roleId: row.role_id,
      departmentId: row.department_id,
      avatarUrl: row.avatar_url ?? "",
      roleName,
      departmentName,
      role: inferRole(roleName),
    } satisfies UserItem;
  });

  return { data: users, error: null };
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  roleId: string;
  departmentId: string;
}): Promise<ApiResult<string>> {
  const { data, error } = await supabase.rpc("create_user", {
    p_name: input.name,
    p_email: input.email,
    p_password: input.password,
    p_role_id: input.roleId,
    p_department_id: input.departmentId,
  });

  if (error) return { data: null, error: error.message };
  return { data: String(data ?? ""), error: null };
}

export async function updateUser(input: {
  id: string;
  name: string;
  email: string;
  roleId: string;
  departmentId: string;
}): Promise<ApiResult<boolean>> {
  const { error } = await supabase.rpc("update_user", {
    p_id: input.id,
    p_name: input.name,
    p_email: input.email,
    p_role_id: input.roleId,
    p_department_id: input.departmentId,
  });

  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

export async function suspendUser(userId: string): Promise<ApiResult<boolean>> {
  const { error } = await supabase.rpc("suspend_user", { p_id: userId });
  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

export async function uploadAvatar(userId: string, file: File): Promise<ApiResult<string>> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "");
  const path = `${userId}/${Date.now()}.${safeExt || "jpg"}`;

  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });

  if (error) return { data: null, error: error.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { data: data.publicUrl, error: null };
}

export async function setUserAvatar(userId: string, avatarUrl: string): Promise<ApiResult<boolean>> {
  const { error } = await supabase.rpc("update_user_avatar", {
    p_id: userId,
    p_avatar_url: avatarUrl,
  });

  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}
