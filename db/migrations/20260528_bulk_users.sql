begin;

-- =========================================================
-- BULK USERS (MVP, modal-driven)
-- =========================================================
-- Extends the bulk-operations infrastructure to cover user creation.
-- Inputs come from an in-app modal (not Excel), but the contract,
-- audit table, and per-row best-effort semantics are identical so
-- entries appear in the existing historial alongside file uploads.
--
-- Caller responsibilities (frontend):
--   * Picks role_id and department_id from existing catalog dropdowns.
--   * Supplies a single shared password applied to every row in the batch
--     (admin distributes it out-of-band; users change it later via the
--     existing single-user edit flow).
--   * Passes the active session's user.id as p_actor_id.
-- =========================================================

-- Relax the entity check constraint to allow 'usuarios'.
do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name   = 'bulk_upload_jobs'
      and constraint_name = 'bulk_upload_jobs_entity_check'
  ) then
    alter table public.bulk_upload_jobs
      drop constraint bulk_upload_jobs_entity_check;
  end if;

  alter table public.bulk_upload_jobs
    add constraint bulk_upload_jobs_entity_check
    check (entity in ('empresas', 'sucursales', 'clientes', 'usuarios'));
end $$;

-- =========================================================
-- bulk_create_users
-- =========================================================
-- Input row shape:
--   { "name": "Juan Pérez",
--     "email": "juan@empresa.com",
--     "password": "Inicial2026!",
--     "role_id": "uuid",
--     "department_id": "uuid" }
--
-- Email uniqueness is enforced by the underlying public.users unique
-- constraint (if present) — duplicate rows surface as per-row errors,
-- the rest of the batch proceeds.

drop function if exists public.bulk_create_users(jsonb, uuid, text);
create or replace function public.bulk_create_users(
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
  v_email text;
  v_password text;
  v_role_id uuid;
  v_department_id uuid;
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
        raise exception 'El nombre es obligatorio';
      end if;

      v_email := lower(trim(coalesce(v_row->>'email', '')));
      if v_email = '' then
        raise exception 'El email es obligatorio';
      end if;

      v_password := coalesce(v_row->>'password', '');
      if length(v_password) < 4 then
        raise exception 'La contraseña debe tener al menos 4 caracteres';
      end if;

      begin
        v_role_id := (v_row->>'role_id')::uuid;
      exception when others then
        raise exception 'role_id inválido';
      end;
      if v_role_id is null then
        raise exception 'role_id es obligatorio';
      end if;
      if not exists (select 1 from public.roles where id = v_role_id) then
        raise exception 'El rol indicado no existe';
      end if;

      begin
        v_department_id := (v_row->>'department_id')::uuid;
      exception when others then
        raise exception 'department_id inválido';
      end;
      if v_department_id is null then
        raise exception 'department_id es obligatorio';
      end if;
      if not exists (select 1 from public.departments where id = v_department_id) then
        raise exception 'El departamento indicado no existe';
      end if;

      -- Delegates to the existing create_user RPC so the password hashing
      -- logic (whatever it is) stays in a single place. Uses named
      -- parameters to be resilient to any future arg-order changes.
      v_new_id := public.create_user(
        p_name          => v_name,
        p_email         => v_email,
        p_password      => v_password,
        p_role_id       => v_role_id,
        p_department_id => v_department_id
      );

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
    p_actor_id, 'usuarios', p_file_name, v_total, v_success, v_failure, v_results
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

grant execute on function public.bulk_create_users(jsonb, uuid, text)
  to anon, authenticated;

commit;
