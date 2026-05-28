begin;

-- =========================================================
-- BULK OPERATIONS
-- =========================================================
-- One audit table + three bulk-insert RPCs (empresas, sucursales, clientes)
-- + two read RPCs for the historial views.
--
-- Design notes:
--   * Best-effort imports: each row is wrapped in its own BEGIN/EXCEPTION
--     block, so one bad row never aborts the batch.
--   * IDs are server-generated UUIDs; users never bring their own.
--   * Branches and clients accept *names* in the input payload; the RPC
--     resolves those to UUIDs server-side (case-insensitive exact match).
--   * Each bulk RPC writes its own job row to bulk_upload_jobs and returns
--     { job_id, results } so the frontend can show per-row outcomes and
--     hold a stable handle for the audit log.
-- =========================================================

-- =========================================================
-- 1. Table: bulk_upload_jobs
-- =========================================================

create table if not exists public.bulk_upload_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  entity text not null check (entity in ('empresas', 'sucursales', 'clientes')),
  file_name text not null,
  total_rows integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  results jsonb not null default '[]'::jsonb,
  created_at timestamp not null default now()
);

create index if not exists idx_bulk_upload_jobs_created_at
  on public.bulk_upload_jobs(created_at desc);

create index if not exists idx_bulk_upload_jobs_user_id
  on public.bulk_upload_jobs(user_id);

alter table public.bulk_upload_jobs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'bulk_upload_jobs'
      and policyname = 'bulk_upload_jobs allow authenticated'
  ) then
    create policy "bulk_upload_jobs allow authenticated"
    on public.bulk_upload_jobs
    for all
    to authenticated
    using (true)
    with check (true);
  end if;
end $$;

-- =========================================================
-- 2. Internal helper: guard p_actor_id
-- =========================================================
-- Validates the actor exists in public.users. Raises if not.
-- Used at the top of every bulk RPC so a bogus actor never produces an
-- orphan job row.

create or replace function public._assert_bulk_actor(p_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_actor_id is null then
    raise exception 'p_actor_id es obligatorio';
  end if;
  if not exists (select 1 from public.users where id = p_actor_id) then
    raise exception 'Usuario actor no encontrado';
  end if;
end;
$$;

-- =========================================================
-- 3. bulk_create_companies
-- =========================================================

drop function if exists public.bulk_create_companies(jsonb, uuid, text);
create or replace function public.bulk_create_companies(
  p_rows jsonb,
  p_actor_id uuid,
  p_file_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_index integer := 0;
  v_results jsonb := '[]'::jsonb;
  v_new_id uuid;
  v_name text;
  v_phone text;
  v_email text;
  v_address text;
  v_logo_url text;
  v_total integer := 0;
  v_success integer := 0;
  v_failure integer := 0;
  v_job_id uuid;
begin
  perform public._assert_bulk_actor(p_actor_id);

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows debe ser un arreglo JSON';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    v_total := v_total + 1;
    begin
      v_name := trim(coalesce(v_row->>'name', ''));
      if v_name = '' then
        raise exception 'El nombre de la empresa es obligatorio';
      end if;

      v_phone    := coalesce(v_row->>'phone', '');
      v_email    := coalesce(v_row->>'email', '');
      v_address  := coalesce(v_row->>'address', '');
      v_logo_url := coalesce(v_row->>'logo_url', '');

      insert into public.companies (name, phone, email, address, logo_url)
      values (v_name, v_phone, v_email, v_address, v_logo_url)
      returning id into v_new_id;

      v_success := v_success + 1;
      v_results := v_results || jsonb_build_object(
        'row_index', v_index,
        'status', 'ok',
        'id', v_new_id,
        'error', null
      );
    exception when others then
      v_failure := v_failure + 1;
      v_results := v_results || jsonb_build_object(
        'row_index', v_index,
        'status', 'error',
        'id', null,
        'error', SQLERRM
      );
    end;
    v_index := v_index + 1;
  end loop;

  insert into public.bulk_upload_jobs (
    user_id, entity, file_name, total_rows, success_count, failure_count, results
  ) values (
    p_actor_id, 'empresas', p_file_name, v_total, v_success, v_failure, v_results
  )
  returning id into v_job_id;

  return jsonb_build_object(
    'job_id', v_job_id,
    'total_rows', v_total,
    'success_count', v_success,
    'failure_count', v_failure,
    'results', v_results
  );
end;
$$;

-- =========================================================
-- 4. bulk_create_branches
-- =========================================================
-- Input row shape:
--   { "empresa": "ACME S.A.", "name": "Casa Central",
--     "phone": "...", "email": "...", "address": "...", "active": true }
-- "empresa" is the company name (case-insensitive exact match).

drop function if exists public.bulk_create_branches(jsonb, uuid, text);
create or replace function public.bulk_create_branches(
  p_rows jsonb,
  p_actor_id uuid,
  p_file_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_index integer := 0;
  v_results jsonb := '[]'::jsonb;
  v_new_id uuid;
  v_company_id uuid;
  v_company_ids uuid[];
  v_empresa text;
  v_name text;
  v_phone text;
  v_email text;
  v_address text;
  v_active boolean;
  v_total integer := 0;
  v_success integer := 0;
  v_failure integer := 0;
  v_job_id uuid;
begin
  perform public._assert_bulk_actor(p_actor_id);

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows debe ser un arreglo JSON';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    v_total := v_total + 1;
    begin
      v_empresa := trim(coalesce(v_row->>'empresa', ''));
      if v_empresa = '' then
        raise exception 'La columna "empresa" es obligatoria';
      end if;

      v_name := trim(coalesce(v_row->>'name', ''));
      if v_name = '' then
        raise exception 'El nombre de la sucursal es obligatorio';
      end if;

      select array_agg(id) into v_company_ids
      from public.companies
      where lower(trim(name)) = lower(v_empresa)
        and deleted_at is null;

      if v_company_ids is null then
        raise exception 'Empresa "%" no encontrada', v_empresa;
      elsif array_length(v_company_ids, 1) > 1 then
        raise exception 'Múltiples empresas con el nombre "%"', v_empresa;
      end if;
      v_company_id := v_company_ids[1];

      v_phone   := coalesce(v_row->>'phone', '');
      v_email   := coalesce(v_row->>'email', '');
      v_address := coalesce(v_row->>'address', '');
      v_active  := coalesce((v_row->>'active')::boolean, true);

      insert into public.company_branches (company_id, name, phone, email, address, active)
      values (v_company_id, v_name, v_phone, v_email, v_address, v_active)
      returning id into v_new_id;

      v_success := v_success + 1;
      v_results := v_results || jsonb_build_object(
        'row_index', v_index,
        'status', 'ok',
        'id', v_new_id,
        'error', null
      );
    exception when others then
      v_failure := v_failure + 1;
      v_results := v_results || jsonb_build_object(
        'row_index', v_index,
        'status', 'error',
        'id', null,
        'error', SQLERRM
      );
    end;
    v_index := v_index + 1;
  end loop;

  insert into public.bulk_upload_jobs (
    user_id, entity, file_name, total_rows, success_count, failure_count, results
  ) values (
    p_actor_id, 'sucursales', p_file_name, v_total, v_success, v_failure, v_results
  )
  returning id into v_job_id;

  return jsonb_build_object(
    'job_id', v_job_id,
    'total_rows', v_total,
    'success_count', v_success,
    'failure_count', v_failure,
    'results', v_results
  );
end;
$$;

-- =========================================================
-- 5. bulk_create_clients
-- =========================================================
-- Input row shape:
--   { "empresa": "...", "sucursal": "...", "name": "...",
--     "phone": "...", "email": "...", "address": "...",
--     "position": "...", "photo_url": "..." }
-- Both "empresa" and "sucursal" are optional. If "sucursal" is provided,
-- "empresa" must also be provided and the branch must belong to it.

drop function if exists public.bulk_create_clients(jsonb, uuid, text);
create or replace function public.bulk_create_clients(
  p_rows jsonb,
  p_actor_id uuid,
  p_file_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_index integer := 0;
  v_results jsonb := '[]'::jsonb;
  v_new_id uuid;
  v_company_id uuid;
  v_branch_id uuid;
  v_company_ids uuid[];
  v_branch_ids uuid[];
  v_empresa text;
  v_sucursal text;
  v_name text;
  v_phone text;
  v_email text;
  v_address text;
  v_position text;
  v_photo_url text;
  v_total integer := 0;
  v_success integer := 0;
  v_failure integer := 0;
  v_job_id uuid;
begin
  perform public._assert_bulk_actor(p_actor_id);

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows debe ser un arreglo JSON';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    v_total := v_total + 1;
    begin
      v_name := trim(coalesce(v_row->>'name', ''));
      if v_name = '' then
        raise exception 'El nombre del cliente es obligatorio';
      end if;

      v_empresa  := trim(coalesce(v_row->>'empresa', ''));
      v_sucursal := trim(coalesce(v_row->>'sucursal', ''));
      v_company_id := null;
      v_branch_id  := null;

      if v_empresa <> '' then
        select array_agg(id) into v_company_ids
        from public.companies
        where lower(trim(name)) = lower(v_empresa)
          and deleted_at is null;

        if v_company_ids is null then
          raise exception 'Empresa "%" no encontrada', v_empresa;
        elsif array_length(v_company_ids, 1) > 1 then
          raise exception 'Múltiples empresas con el nombre "%"', v_empresa;
        end if;
        v_company_id := v_company_ids[1];
      end if;

      if v_sucursal <> '' then
        if v_company_id is null then
          raise exception 'Para indicar sucursal también debe indicarse empresa';
        end if;

        select array_agg(id) into v_branch_ids
        from public.company_branches
        where lower(trim(name)) = lower(v_sucursal)
          and company_id = v_company_id
          and deleted_at is null;

        if v_branch_ids is null then
          raise exception 'Sucursal "%" no encontrada en empresa "%"', v_sucursal, v_empresa;
        elsif array_length(v_branch_ids, 1) > 1 then
          raise exception 'Múltiples sucursales "%" en empresa "%"', v_sucursal, v_empresa;
        end if;
        v_branch_id := v_branch_ids[1];
      end if;

      v_phone     := coalesce(v_row->>'phone', '');
      v_email     := coalesce(v_row->>'email', '');
      v_address   := coalesce(v_row->>'address', '');
      v_position  := coalesce(v_row->>'position', '');
      v_photo_url := coalesce(v_row->>'photo_url', '');

      insert into public.clients (
        name, phone, email, address, company_id, branch_id, position, photo_url
      ) values (
        v_name, v_phone, v_email, v_address, v_company_id, v_branch_id, v_position, v_photo_url
      )
      returning id into v_new_id;

      v_success := v_success + 1;
      v_results := v_results || jsonb_build_object(
        'row_index', v_index,
        'status', 'ok',
        'id', v_new_id,
        'error', null
      );
    exception when others then
      v_failure := v_failure + 1;
      v_results := v_results || jsonb_build_object(
        'row_index', v_index,
        'status', 'error',
        'id', null,
        'error', SQLERRM
      );
    end;
    v_index := v_index + 1;
  end loop;

  insert into public.bulk_upload_jobs (
    user_id, entity, file_name, total_rows, success_count, failure_count, results
  ) values (
    p_actor_id, 'clientes', p_file_name, v_total, v_success, v_failure, v_results
  )
  returning id into v_job_id;

  return jsonb_build_object(
    'job_id', v_job_id,
    'total_rows', v_total,
    'success_count', v_success,
    'failure_count', v_failure,
    'results', v_results
  );
end;
$$;

-- =========================================================
-- 6. get_bulk_upload_jobs (list)
-- =========================================================
-- Returns the audit log without the heavy `results` jsonb. The detail
-- screen calls get_bulk_upload_job to fetch a single job's results.

drop function if exists public.get_bulk_upload_jobs();
create or replace function public.get_bulk_upload_jobs()
returns table (
  id uuid,
  user_id uuid,
  user_name text,
  entity text,
  file_name text,
  total_rows integer,
  success_count integer,
  failure_count integer,
  created_at timestamp
)
language sql
security definer
set search_path = public
as $$
  select
    j.id,
    j.user_id,
    coalesce(u.name, u.email, 'Usuario desconocido') as user_name,
    j.entity,
    j.file_name,
    j.total_rows,
    j.success_count,
    j.failure_count,
    j.created_at
  from public.bulk_upload_jobs j
  left join public.users u on u.id = j.user_id
  order by j.created_at desc;
$$;

-- =========================================================
-- 7. get_bulk_upload_job (detail)
-- =========================================================

drop function if exists public.get_bulk_upload_job(uuid);
create or replace function public.get_bulk_upload_job(p_id uuid)
returns table (
  id uuid,
  user_id uuid,
  user_name text,
  entity text,
  file_name text,
  total_rows integer,
  success_count integer,
  failure_count integer,
  results jsonb,
  created_at timestamp
)
language sql
security definer
set search_path = public
as $$
  select
    j.id,
    j.user_id,
    coalesce(u.name, u.email, 'Usuario desconocido') as user_name,
    j.entity,
    j.file_name,
    j.total_rows,
    j.success_count,
    j.failure_count,
    j.results,
    j.created_at
  from public.bulk_upload_jobs j
  left join public.users u on u.id = j.user_id
  where j.id = p_id;
$$;

-- =========================================================
-- 8. Grants
-- =========================================================
-- Following the project convention of granting to anon + authenticated.
-- Admin-only enforcement happens at the Astro page layer (the only place
-- where role information lives in this app's architecture).

grant execute on function public.bulk_create_companies(jsonb, uuid, text)
  to anon, authenticated;
grant execute on function public.bulk_create_branches(jsonb, uuid, text)
  to anon, authenticated;
grant execute on function public.bulk_create_clients(jsonb, uuid, text)
  to anon, authenticated;
grant execute on function public.get_bulk_upload_jobs()
  to anon, authenticated;
grant execute on function public.get_bulk_upload_job(uuid)
  to anon, authenticated;

commit;
