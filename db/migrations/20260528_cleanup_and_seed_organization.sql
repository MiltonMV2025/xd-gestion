begin;

-- =========================================================
-- Limpieza de data sucia + seed limpio de organización
-- =========================================================
-- Alcance:
-- - Limpia (soft delete) data operativa y organizacional visible en la app.
-- - Crea empresas, sucursales y empleados de ejemplo consistentes.
--
-- Nota:
-- Se usa soft delete para no romper auditoría histórica ni claves foráneas.

-- 1) Limpiar flujo operativo (expedientes/cotizaciones/pedidos)
update public.quote_items
set deleted_at = now()
where deleted_at is null;

update public.orders
set deleted_at = now()
where deleted_at is null;

update public.production_orders
set deleted_at = now()
where deleted_at is null;

update public.quotes
set deleted_at = now()
where deleted_at is null;

-- 2) Limpiar organización actual
update public.clients
set deleted_at = now()
where deleted_at is null;

update public.company_branches
set deleted_at = now(),
    active = false
where deleted_at is null;

update public.companies
set deleted_at = now()
where deleted_at is null;

-- 3) Seed limpio
with inserted_companies as (
  insert into public.companies (name, phone, email, address, logo_url)
  values
    ('Super Selectos SA', '2233-4400', 'contacto@superselectos.com', 'San Salvador, El Salvador', ''),
    ('Distribuidora Nova SA de CV', '2299-1188', 'ventas@novadistribuidora.com', 'Santa Tecla, La Libertad', '')
  returning id, name
),
inserted_branches as (
  insert into public.company_branches (company_id, name, phone, email, address, active)
  select c.id, 'Matriz San Benito', '2233-4410', 'sanbenito@superselectos.com', 'Av. La Revolución, San Salvador', true
  from inserted_companies c
  where c.name = 'Super Selectos SA'
  union all
  select c.id, 'Sucursal Escalón', '2233-4420', 'escalon@superselectos.com', 'Paseo General Escalón, San Salvador', true
  from inserted_companies c
  where c.name = 'Super Selectos SA'
  union all
  select c.id, 'Matriz Santa Tecla', '2299-1190', 'tecla@novadistribuidora.com', 'Centro Empresarial, Santa Tecla', true
  from inserted_companies c
  where c.name = 'Distribuidora Nova SA de CV'
  union all
  select c.id, 'Sucursal Merliot', '2299-1195', 'merliot@novadistribuidora.com', 'Ciudad Merliot, La Libertad', true
  from inserted_companies c
  where c.name = 'Distribuidora Nova SA de CV'
  returning id, company_id, name
)
insert into public.clients (name, phone, email, address, company_id, branch_id, position, photo_url)
select
  e.employee_name,
  e.phone,
  e.email,
  e.address,
  b.company_id,
  b.id,
  e.position,
  ''
from inserted_branches b
join (
  values
    ('Matriz San Benito', 'Manuel Gómez', '2334-3444', 'manuel.gomez@superselectos.com', 'San Salvador', 'Jefe de compras'),
    ('Matriz San Benito', 'Ana Rivas', '2334-3450', 'ana.rivas@superselectos.com', 'San Salvador', 'Asistente administrativa'),
    ('Sucursal Escalón', 'Carlos López', '2334-3490', 'carlos.lopez@superselectos.com', 'San Salvador', 'Encargado de sucursal'),
    ('Sucursal Escalón', 'Laura Méndez', '2334-3495', 'laura.mendez@superselectos.com', 'San Salvador', 'Analista de pedidos'),
    ('Matriz Santa Tecla', 'Jorge Quintanilla', '2299-1200', 'jorge.quintanilla@novadistribuidora.com', 'Santa Tecla', 'Coordinador comercial'),
    ('Matriz Santa Tecla', 'María Herrera', '2299-1201', 'maria.herrera@novadistribuidora.com', 'Santa Tecla', 'Ejecutiva de cuentas'),
    ('Sucursal Merliot', 'Ricardo Flores', '2299-1210', 'ricardo.flores@novadistribuidora.com', 'Merliot', 'Supervisor operativo'),
    ('Sucursal Merliot', 'Patricia Salazar', '2299-1211', 'patricia.salazar@novadistribuidora.com', 'Merliot', 'Atención a clientes')
) as e(branch_name, employee_name, phone, email, address, position)
  on e.branch_name = b.name;

commit;
