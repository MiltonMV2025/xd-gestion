begin;

-- =========================================================
-- Sucursales por empresa
-- =========================================================

create table if not exists public.company_branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  active boolean not null default true,
  created_at timestamp default now(),
  updated_at timestamp,
  deleted_at timestamp
);

create index if not exists idx_company_branches_company_id
  on public.company_branches(company_id)
  where deleted_at is null;

alter table if exists public.clients
  add column if not exists branch_id uuid references public.company_branches(id);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 't_company_branches' and tgrelid = 'public.company_branches'::regclass
  ) then
    create trigger t_company_branches
    before update on public.company_branches
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- =========================================================
-- RPCs sucursales
-- =========================================================

drop function if exists public.get_company_branches(uuid);
create or replace function public.get_company_branches(
  p_company_id uuid
)
returns table(
  id uuid,
  company_id uuid,
  name text,
  phone text,
  email text,
  address text,
  active boolean,
  created_at timestamp
)
language sql
security definer
set search_path = public
as $$
  select
    b.id,
    b.company_id,
    b.name,
    b.phone,
    b.email,
    b.address,
    b.active,
    b.created_at
  from public.company_branches b
  where b.deleted_at is null
    and b.company_id = p_company_id
  order by b.created_at desc;
$$;

drop function if exists public.create_company_branch(uuid, text, text, text, text, boolean);
create or replace function public.create_company_branch(
  p_company_id uuid,
  p_name text,
  p_phone text default '',
  p_email text default '',
  p_address text default '',
  p_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_id uuid;
begin
  insert into public.company_branches (company_id, name, phone, email, address, active)
  values (p_company_id, p_name, p_phone, p_email, p_address, coalesce(p_active, true))
  returning id into v_branch_id;

  return v_branch_id;
end;
$$;

drop function if exists public.update_company_branch(uuid, text, text, text, text, boolean);
create or replace function public.update_company_branch(
  p_id uuid,
  p_name text,
  p_phone text default '',
  p_email text default '',
  p_address text default '',
  p_active boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.company_branches
  set name = p_name,
      phone = p_phone,
      email = p_email,
      address = p_address,
      active = coalesce(p_active, active)
  where id = p_id
    and deleted_at is null;
end;
$$;

drop function if exists public.delete_company_branch(uuid);
create or replace function public.delete_company_branch(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.company_branches
  set deleted_at = now(),
      active = false
  where id = p_id;

  update public.clients
  set branch_id = null
  where branch_id = p_id;
end;
$$;

-- =========================================================
-- RPCs clientes con branch
-- =========================================================

drop function if exists public.get_clients();
create or replace function public.get_clients()
returns table(
  id uuid,
  name text,
  phone text,
  email text,
  address text,
  company_id uuid,
  branch_id uuid,
  branch_name text,
  position text,
  photo_url text,
  created_at timestamp
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.phone,
    c.email,
    c.address,
    c.company_id,
    c.branch_id,
    b.name as branch_name,
    c.position,
    c.photo_url,
    c.created_at
  from public.clients c
  left join public.company_branches b on b.id = c.branch_id and b.deleted_at is null
  where c.deleted_at is null
  order by c.created_at desc;
$$;

drop function if exists public.create_client(text, text, text, text, uuid, text, text);
drop function if exists public.create_client(text, text, text, text, uuid, uuid, text, text);
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

drop function if exists public.update_client(uuid, text, text, text, text, uuid, text, text);
drop function if exists public.update_client(uuid, text, text, text, text, uuid, uuid, text, text);
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

grant execute on function public.get_company_branches(uuid) to anon, authenticated;
grant execute on function public.create_company_branch(uuid, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.update_company_branch(uuid, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.delete_company_branch(uuid) to anon, authenticated;
grant execute on function public.get_clients() to anon, authenticated;
grant execute on function public.create_client(text, text, text, text, uuid, uuid, text, text) to anon, authenticated;
grant execute on function public.update_client(uuid, text, text, text, text, uuid, uuid, text, text) to anon, authenticated;

alter table public.company_branches enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'company_branches'
      and policyname = 'company_branches allow authenticated'
  ) then
    create policy "company_branches allow authenticated"
    on public.company_branches
    for all
    to authenticated
    using (true)
    with check (true);
  end if;
end $$;

commit;
