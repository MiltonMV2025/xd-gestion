begin;

-- =========================================================
-- Auditoría por actor (usuario de la app)
-- =========================================================

alter table if exists public.quotes
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid;

alter table if exists public.production_orders
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid;

alter table if exists public.orders
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid;

-- =========================================================
-- RPCs de lectura con actor names
-- =========================================================

drop function if exists public.get_quotes();
create or replace function public.get_quotes()
returns table (
  id uuid,
  client_id uuid,
  description text,
  total numeric,
  status text,
  created_at timestamp,
  updated_at timestamp,
  created_by_name text,
  updated_by_name text
)
language sql
security definer
set search_path = public
as $$
  select
    q.id,
    q.client_id,
    q.description,
    q.total,
    q.status::text,
    q.created_at,
    q.updated_at,
    coalesce(uc.name, uc.email, 'Sin responsable') as created_by_name,
    coalesce(uu.name, uu.email, 'Sin responsable') as updated_by_name
  from public.quotes q
  left join public.users uc on uc.id = q.created_by
  left join public.users uu on uu.id = q.updated_by
  where q.deleted_at is null
  order by q.created_at desc;
$$;

drop function if exists public.get_production_orders();
create or replace function public.get_production_orders()
returns table (
  id uuid,
  quote_id uuid,
  status text,
  created_at timestamp,
  updated_at timestamp,
  created_by_name text,
  updated_by_name text
)
language sql
security definer
set search_path = public
as $$
  select
    po.id,
    po.quote_id,
    po.status::text,
    po.created_at,
    po.updated_at,
    coalesce(uc.name, uc.email, 'Sin responsable') as created_by_name,
    coalesce(uu.name, uu.email, 'Sin responsable') as updated_by_name
  from public.production_orders po
  left join public.users uc on uc.id = po.created_by
  left join public.users uu on uu.id = po.updated_by
  where po.deleted_at is null
  order by po.created_at desc;
$$;

drop function if exists public.get_orders();
create or replace function public.get_orders()
returns table (
  id uuid,
  production_order_id uuid,
  status text,
  created_at timestamp,
  updated_at timestamp,
  created_by_name text,
  updated_by_name text
)
language sql
security definer
set search_path = public
as $$
  select
    o.id,
    o.production_order_id,
    o.status::text,
    o.created_at,
    o.updated_at,
    coalesce(uc.name, uc.email, 'Sin responsable') as created_by_name,
    coalesce(uu.name, uu.email, 'Sin responsable') as updated_by_name
  from public.orders o
  left join public.users uc on uc.id = o.created_by
  left join public.users uu on uu.id = o.updated_by
  where o.deleted_at is null
  order by o.created_at desc;
$$;

-- =========================================================
-- RPCs de mutación con p_actor_user_id explícito
-- =========================================================

drop function if exists public.create_quote_with_items(uuid, text, jsonb);
drop function if exists public.create_quote_with_items(uuid, text, jsonb, uuid);
create or replace function public.create_quote_with_items(
  p_client_id uuid,
  p_description text,
  p_items jsonb,
  p_actor_user_id uuid default null
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

  insert into public.quotes (client_id, description, total, status, created_by, updated_by, updated_at)
  values (p_client_id, p_description, 0, 'pending', p_actor_user_id, p_actor_user_id, now())
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
  set total = v_total,
      updated_by = coalesce(p_actor_user_id, updated_by),
      updated_at = now()
  where id = v_quote_id;

  return v_quote_id;
end;
$$;

drop function if exists public.approve_quote_and_create_production_order(uuid);
drop function if exists public.approve_quote_and_create_production_order(uuid, uuid);
create or replace function public.approve_quote_and_create_production_order(
  p_quote_id uuid,
  p_actor_user_id uuid default null
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
  set status = 'approved',
      updated_by = coalesce(p_actor_user_id, updated_by),
      updated_at = now()
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
    insert into public.production_orders (quote_id, status, created_by, updated_by, updated_at)
    values (p_quote_id, 'pending', p_actor_user_id, p_actor_user_id, now())
    returning id into v_order_id;
  else
    update public.production_orders
    set updated_by = coalesce(p_actor_user_id, updated_by),
        updated_at = now()
    where id = v_order_id;
  end if;

  return v_order_id;
end;
$$;

drop function if exists public.create_production_order_from_quote(uuid);
drop function if exists public.create_production_order_from_quote(uuid, uuid);
create or replace function public.create_production_order_from_quote(
  p_quote_id uuid,
  p_actor_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  select po.id
  into v_order_id
  from public.production_orders po
  where po.quote_id = p_quote_id
    and po.deleted_at is null
  order by po.created_at asc
  limit 1;

  if v_order_id is null then
    insert into public.production_orders (quote_id, status, created_by, updated_by, updated_at)
    values (p_quote_id, 'pending', p_actor_user_id, p_actor_user_id, now())
    returning id into v_order_id;
  else
    update public.production_orders
    set updated_by = coalesce(p_actor_user_id, updated_by),
        updated_at = now()
    where id = v_order_id;
  end if;

  return v_order_id;
end;
$$;

drop function if exists public.create_order_from_production_order(uuid);
drop function if exists public.create_order_from_production_order(uuid, uuid);
create or replace function public.create_order_from_production_order(
  p_production_order_id uuid,
  p_actor_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  select o.id
  into v_order_id
  from public.orders o
  where o.production_order_id = p_production_order_id
    and o.deleted_at is null
  order by o.created_at asc
  limit 1;

  if v_order_id is null then
    insert into public.orders (production_order_id, status, created_by, updated_by, updated_at)
    values (p_production_order_id, 'in_progress', p_actor_user_id, p_actor_user_id, now())
    returning id into v_order_id;
  else
    update public.orders
    set updated_by = coalesce(p_actor_user_id, updated_by),
        updated_at = now()
    where id = v_order_id;
  end if;

  return v_order_id;
end;
$$;

drop function if exists public.update_quote_status(uuid, text);
drop function if exists public.update_quote_status(uuid, text, uuid);
create or replace function public.update_quote_status(
  p_id uuid,
  p_status text,
  p_actor_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.quotes
  set status = p_status,
      updated_by = coalesce(p_actor_user_id, updated_by),
      updated_at = now()
  where id = p_id;
end;
$$;

drop function if exists public.update_production_order_status(uuid, text);
drop function if exists public.update_production_order_status(uuid, text, uuid);
create or replace function public.update_production_order_status(
  p_id uuid,
  p_status text,
  p_actor_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.production_orders
  set status = p_status,
      updated_by = coalesce(p_actor_user_id, updated_by),
      updated_at = now()
  where id = p_id;
end;
$$;

drop function if exists public.update_order_status(uuid, text);
drop function if exists public.update_order_status(uuid, text, uuid);
create or replace function public.update_order_status(
  p_id uuid,
  p_status text,
  p_actor_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set status = p_status,
      updated_by = coalesce(p_actor_user_id, updated_by),
      updated_at = now()
  where id = p_id;
end;
$$;

grant execute on function public.get_quotes() to anon, authenticated;
grant execute on function public.get_production_orders() to anon, authenticated;
grant execute on function public.get_orders() to anon, authenticated;
grant execute on function public.create_quote_with_items(uuid, text, jsonb, uuid) to anon, authenticated;
grant execute on function public.approve_quote_and_create_production_order(uuid, uuid) to anon, authenticated;
grant execute on function public.create_production_order_from_quote(uuid, uuid) to anon, authenticated;
grant execute on function public.create_order_from_production_order(uuid, uuid) to anon, authenticated;
grant execute on function public.update_quote_status(uuid, text, uuid) to anon, authenticated;
grant execute on function public.update_production_order_status(uuid, text, uuid) to anon, authenticated;
grant execute on function public.update_order_status(uuid, text, uuid) to anon, authenticated;

commit;
