import { supabase } from "@/services/supabaseClient";
import type { ApiResult } from "@/types/api";
import type {
  BulkBranchRow,
  BulkClientRow,
  BulkCompanyRow,
  BulkEntity,
  BulkOperationOutcome,
  BulkRowResult,
  BulkUploadJob,
  BulkUploadJobDetail,
  BulkUserRow,
} from "@/types/domain";

interface RawRowResult {
  row_index: number;
  status: "ok" | "error";
  id: string | null;
  error: string | null;
}

interface RawOutcome {
  job_id: string;
  total_rows: number;
  success_count: number;
  failure_count: number;
  results: RawRowResult[] | null;
}

interface RawJobRow {
  id: string;
  user_id: string | null;
  user_name: string;
  entity: BulkEntity;
  file_name: string;
  total_rows: number;
  success_count: number;
  failure_count: number;
  created_at: string;
}

interface RawJobDetailRow extends RawJobRow {
  results: RawRowResult[] | null;
}

function mapRowResult(raw: RawRowResult): BulkRowResult {
  return {
    rowIndex: raw.row_index,
    status: raw.status,
    id: raw.id,
    error: raw.error,
  };
}

function mapOutcome(raw: RawOutcome): BulkOperationOutcome {
  return {
    jobId: raw.job_id,
    totalRows: raw.total_rows,
    successCount: raw.success_count,
    failureCount: raw.failure_count,
    results: (raw.results ?? []).map(mapRowResult),
  };
}

function mapJob(row: RawJobRow): BulkUploadJob {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    entity: row.entity,
    fileName: row.file_name,
    totalRows: row.total_rows,
    successCount: row.success_count,
    failureCount: row.failure_count,
    createdAt: row.created_at,
  };
}

export async function bulkCreateCompanies(input: {
  rows: BulkCompanyRow[];
  actorId: string;
  fileName: string;
}): Promise<ApiResult<BulkOperationOutcome>> {
  const { data, error } = await supabase.rpc("bulk_create_companies", {
    p_rows: input.rows,
    p_actor_id: input.actorId,
    p_file_name: input.fileName,
  });
  if (error) return { data: null, error: error.message };
  return { data: mapOutcome(data as RawOutcome), error: null };
}

export async function bulkCreateBranches(input: {
  rows: BulkBranchRow[];
  actorId: string;
  fileName: string;
}): Promise<ApiResult<BulkOperationOutcome>> {
  const { data, error } = await supabase.rpc("bulk_create_branches", {
    p_rows: input.rows,
    p_actor_id: input.actorId,
    p_file_name: input.fileName,
  });
  if (error) return { data: null, error: error.message };
  return { data: mapOutcome(data as RawOutcome), error: null };
}

export async function bulkCreateClients(input: {
  rows: BulkClientRow[];
  actorId: string;
  fileName: string;
}): Promise<ApiResult<BulkOperationOutcome>> {
  const { data, error } = await supabase.rpc("bulk_create_clients", {
    p_rows: input.rows,
    p_actor_id: input.actorId,
    p_file_name: input.fileName,
  });
  if (error) return { data: null, error: error.message };
  return { data: mapOutcome(data as RawOutcome), error: null };
}

export async function bulkCreateUsers(input: {
  rows: BulkUserRow[];
  actorId: string;
  fileName: string;
}): Promise<ApiResult<BulkOperationOutcome>> {
  const { data, error } = await supabase.rpc("bulk_create_users", {
    p_rows: input.rows,
    p_actor_id: input.actorId,
    p_file_name: input.fileName,
  });
  if (error) return { data: null, error: error.message };
  return { data: mapOutcome(data as RawOutcome), error: null };
}

export async function getBulkUploadJobs(): Promise<ApiResult<BulkUploadJob[]>> {
  const { data, error } = await supabase.rpc("get_bulk_upload_jobs");
  if (error) return { data: null, error: error.message };
  return {
    data: ((data as RawJobRow[] | null) ?? []).map(mapJob),
    error: null,
  };
}

export async function getBulkUploadJob(
  id: string,
): Promise<ApiResult<BulkUploadJobDetail | null>> {
  const { data, error } = await supabase.rpc("get_bulk_upload_job", { p_id: id });
  if (error) return { data: null, error: error.message };

  const rows = (data as RawJobDetailRow[] | null) ?? [];
  if (rows.length === 0) return { data: null, error: null };

  const row = rows[0];
  return {
    data: {
      ...mapJob(row),
      results: (row.results ?? []).map(mapRowResult),
    },
    error: null,
  };
}
