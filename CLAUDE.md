### Database Structure. 

- Use this to make sure you do any inserts properly.

```sql
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  company_id uuid,
  position text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone,
  deleted_at timestamp without time zone,
  photo_url text,
  job_position text,
  branch_id uuid,
  CONSTRAINT clients_pkey PRIMARY KEY (id),
  CONSTRAINT clients_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT clients_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.company_branches(id)
);
CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  logo_url text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone,
  deleted_at timestamp without time zone,
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);
CREATE TABLE public.company_branches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone,
  deleted_at timestamp without time zone,
  CONSTRAINT company_branches_pkey PRIMARY KEY (id),
  CONSTRAINT company_branches_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  production_order_id uuid,
  status text DEFAULT 'in_progress'::text CHECK (status = ANY (ARRAY['in_progress'::text, 'finished'::text, 'delivered'::text])),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone,
  deleted_at timestamp without time zone,
  created_by uuid,
  updated_by uuid,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_production_order_id_fkey FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id)
);
CREATE TABLE public.production_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quote_id uuid,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text])),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone,
  deleted_at timestamp without time zone,
  created_by uuid,
  updated_by uuid,
  CONSTRAINT production_orders_pkey PRIMARY KEY (id),
  CONSTRAINT production_orders_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id)
);
CREATE TABLE public.purchase_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  description text,
  total numeric,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text])),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone,
  deleted_at timestamp without time zone,
  CONSTRAINT purchase_orders_pkey PRIMARY KEY (id)
);
CREATE TABLE public.quote_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL,
  service_id uuid NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0::numeric),
  unit_price numeric NOT NULL CHECK (unit_price >= 0::numeric),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone,
  deleted_at timestamp without time zone,
  CONSTRAINT quote_items_pkey PRIMARY KEY (id),
  CONSTRAINT quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id),
  CONSTRAINT quote_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid,
  description text,
  total numeric,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone,
  deleted_at timestamp without time zone,
  created_by uuid,
  updated_by uuid,
  CONSTRAINT quotes_pkey PRIMARY KEY (id),
  CONSTRAINT quotes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type = ANY (ARRAY['system'::text, 'business'::text])),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  unit_price numeric NOT NULL CHECK (unit_price >= 0::numeric),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone,
  deleted_at timestamp without time zone,
  CONSTRAINT services_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  role_id uuid,
  department_id uuid,
  phone text,
  avatar_url text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone,
  deleted_at timestamp without time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id)
);
```