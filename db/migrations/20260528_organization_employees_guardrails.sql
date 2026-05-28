begin;

-- =========================================================
-- Guardrails: sucursales y empleados
-- =========================================================
-- Objetivo:
-- 1) Evitar empleados de empresa sin sucursal.
-- 2) Evitar borrar una sucursal que aún tiene empleados asignados.

drop function if exists public.create_client(text, text, text, text, uuid, text, text);
drop function if exists public.create_client(text, text, text, text, uuid, uuid, text, text);
drop function if exists public.update_client(uuid, text, text, text, text, uuid, text, text);
drop function if exists public.update_client(uuid, text, text, text, text, uuid, uuid, text, text);

create or replace function public.create_client(
  p_name text,
  p_phone text default '',
  p_email text default '',
  p_address text default '',
  p_company_id uuid default null,
  p_branch_id uuid default null,
  p_position text default '',
  p_photo_url text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
begin
  if p_company_id is not null and p_branch_id is null then
    raise exception 'Cada empleado debe pertenecer a una sucursal';
  end if;

  if p_branch_id is not null then
    if not exists (
      select 1
      from public.company_branches b
      where b.id = p_branch_id
        and b.company_id = p_company_id
        and b.deleted_at is null
    ) then
      raise exception 'La sucursal no pertenece a la empresa seleccionada';
    end if;
  end if;

  insert into public.clients (name, phone, email, address, company_id, branch_id, position, photo_url)
  values (p_name, p_phone, p_email, p_address, p_company_id, p_branch_id, p_position, p_photo_url)
  returning id into v_client_id;

  return v_client_id;
end;
$$;

create or replace function public.update_client(
  p_id uuid,
  p_name text,
  p_phone text default '',
  p_email text default '',
  p_address text default '',
  p_company_id uuid default null,
  p_branch_id uuid default null,
  p_position text default '',
  p_photo_url text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_company_id is not null and p_branch_id is null then
    raise exception 'Cada empleado debe pertenecer a una sucursal';
  end if;

  if p_branch_id is not null then
    if not exists (
      select 1
      from public.company_branches b
      where b.id = p_branch_id
        and b.company_id = p_company_id
        and b.deleted_at is null
    ) then
      raise exception 'La sucursal no pertenece a la empresa seleccionada';
    end if;
  end if;

  update public.clients
  set name = p_name,
      phone = p_phone,
      email = p_email,
      address = p_address,
      company_id = p_company_id,
      branch_id = p_branch_id,
      position = p_position,
      photo_url = p_photo_url
  where id = p_id;
end;
$$;

create or replace function public.delete_company_branch(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.clients c
    where c.branch_id = p_id
      and c.deleted_at is null
  ) then
    raise exception 'No se puede eliminar la sucursal porque tiene empleados asignados';
  end if;

  update public.company_branches
  set deleted_at = now(),
      active = false
  where id = p_id;
end;
$$;

commit;
