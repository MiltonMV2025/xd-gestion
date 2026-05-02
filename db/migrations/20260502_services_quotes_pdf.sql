begin;

create extension if not exists pgcrypto;

-- =========================
-- TABLAS NUEVAS
-- =========================

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  unit_price numeric not null check (unit_price >= 0),
  active boolean not null default true,
  created_at timestamp default now(),
  updated_at timestamp,
  deleted_at timestamp
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  service_id uuid not null references public.services(id),
  quantity numeric not null check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  created_at timestamp default now(),
  updated_at timestamp,
  deleted_at timestamp
);

-- =========================
-- TRIGGERS updated_at
-- =========================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 't_services' and tgrelid = 'public.services'::regclass
  ) then
    create trigger t_services
    before update on public.services
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 't_quote_items' and tgrelid = 'public.quote_items'::regclass
  ) then
    create trigger t_quote_items
    before update on public.quote_items
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- =========================
-- FUNCTIONS: SERVICIOS
-- =========================

create or replace function public.get_services()
returns setof public.services
language sql
security definer
set search_path = public
as $$
  select *
  from public.services
  where deleted_at is null
  order by created_at desc;
$$;

create or replace function public.create_service(
  p_name text,
  p_description text,
  p_unit_price numeric,
  p_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_id uuid;
begin
  insert into public.services (name, description, unit_price, active)
  values (p_name, p_description, p_unit_price, coalesce(p_active, true))
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.update_service(
  p_id uuid,
  p_name text,
  p_description text,
  p_unit_price numeric,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.services
  set name = p_name,
      description = p_description,
      unit_price = p_unit_price,
      active = p_active
  where id = p_id;
end;
$$;

create or replace function public.delete_service(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.services
  set deleted_at = now(),
      active = false
  where id = p_id;
end;
$$;

-- =========================
-- FUNCTIONS: COTIZACIONES CON ÍTEMS
-- =========================

create or replace function public.create_quote_with_items(
  p_client_id uuid,
  p_description text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_id uuid;
  v_item jsonb;
  v_service_id uuid;
  v_quantity numeric;
  v_unit_price numeric;
  v_total numeric := 0;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Debes enviar al menos un servicio en la cotización';
  end if;

  insert into public.quotes (client_id, description, total, status)
  values (p_client_id, p_description, 0, 'pending')
  returning id into v_quote_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_service_id := (v_item ->> 'service_id')::uuid;
    v_quantity := coalesce((v_item ->> 'quantity')::numeric, 0);

    if v_quantity <= 0 then
      raise exception 'La cantidad debe ser mayor a cero';
    end if;

    if (v_item ? 'unit_price') and (v_item ->> 'unit_price') is not null then
      v_unit_price := (v_item ->> 'unit_price')::numeric;
    else
      select s.unit_price
      into v_unit_price
      from public.services s
      where s.id = v_service_id
        and s.deleted_at is null
      limit 1;
    end if;

    if v_unit_price is null then
      raise exception 'No se encontró precio para el servicio %', v_service_id;
    end if;

    insert into public.quote_items (quote_id, service_id, quantity, unit_price)
    values (v_quote_id, v_service_id, v_quantity, v_unit_price);

    v_total := v_total + (v_quantity * v_unit_price);
  end loop;

  update public.quotes
  set total = v_total
  where id = v_quote_id;

  return v_quote_id;
end;
$$;

create or replace function public.get_quote_items(
  p_quote_id uuid
)
returns table(
  id uuid,
  quote_id uuid,
  service_id uuid,
  service_name text,
  quantity numeric,
  unit_price numeric
)
language sql
security definer
set search_path = public
as $$
  select qi.id,
         qi.quote_id,
         qi.service_id,
         s.name as service_name,
         qi.quantity,
         qi.unit_price
  from public.quote_items qi
  join public.services s on s.id = qi.service_id
  where qi.quote_id = p_quote_id
    and qi.deleted_at is null
  order by qi.created_at asc;
$$;

create or replace function public.approve_quote_and_create_production_order(
  p_quote_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  update public.quotes
  set status = 'approved'
  where id = p_quote_id
    and deleted_at is null;

  select po.id
  into v_order_id
  from public.production_orders po
  where po.quote_id = p_quote_id
    and po.deleted_at is null
  order by po.created_at asc
  limit 1;

  if v_order_id is null then
    insert into public.production_orders (quote_id, status)
    values (p_quote_id, 'pending')
    returning id into v_order_id;
  end if;

  return v_order_id;
end;
$$;

create or replace function public.get_quote_pdf_payload(
  p_quote_id uuid
)
returns table(
  quote_id uuid,
  quote_created_at timestamp,
  quote_status text,
  quote_description text,
  quote_total numeric,
  client_name text,
  client_email text,
  client_phone text,
  client_address text,
  service_name text,
  quantity numeric,
  unit_price numeric
)
language sql
security definer
set search_path = public
as $$
  select q.id as quote_id,
         q.created_at as quote_created_at,
         q.status as quote_status,
         q.description as quote_description,
         q.total as quote_total,
         c.name as client_name,
         c.email as client_email,
         c.phone as client_phone,
         c.address as client_address,
         s.name as service_name,
         qi.quantity,
         qi.unit_price
  from public.quotes q
  join public.clients c on c.id = q.client_id
  left join public.quote_items qi on qi.quote_id = q.id and qi.deleted_at is null
  left join public.services s on s.id = qi.service_id
  where q.id = p_quote_id
    and q.deleted_at is null;
$$;

-- =========================
-- PERMISOS
-- =========================

grant execute on function public.get_services() to anon, authenticated;
grant execute on function public.create_service(text, text, numeric, boolean) to anon, authenticated;
grant execute on function public.update_service(uuid, text, text, numeric, boolean) to anon, authenticated;
grant execute on function public.delete_service(uuid) to anon, authenticated;

grant execute on function public.create_quote_with_items(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.get_quote_items(uuid) to anon, authenticated;
grant execute on function public.get_quote_pdf_payload(uuid) to anon, authenticated;
grant execute on function public.approve_quote_and_create_production_order(uuid) to anon, authenticated;

-- =========================
-- RLS
-- =========================

alter table public.services enable row level security;
alter table public.quote_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'services' and policyname = 'services allow authenticated'
  ) then
    create policy "services allow authenticated"
    on public.services
    for all
    to authenticated
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'quote_items' and policyname = 'quote_items allow authenticated'
  ) then
    create policy "quote_items allow authenticated"
    on public.quote_items
    for all
    to authenticated
    using (true)
    with check (true);
  end if;
end $$;

commit;
