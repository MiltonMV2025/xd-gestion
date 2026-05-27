# XD Gestión — Frontend Administrativo

Prototipo funcional construido con **Astro + React + TypeScript** con enfoque en arquitectura modular, separación de responsabilidades y conexión preparada para Supabase.

## Stack

- Astro
- React
- TypeScript
- TailwindCSS
- shadcn/ui
- Supabase (`@supabase/supabase-js`)
- PDF server-side (`pdf-lib`)

## Estructura

```text
src/
  components/
  layouts/
  features/
    auth/
    clients/
    companies/
    dashboard/
    orders/
    production-orders/
    quotes/
    services/
    users/
  pages/
  services/
  hooks/
  types/
  utils/

db/
  migrations/
```

## Variables de entorno

Crear `xd-gestion/.env` basado en `.env.example`:

```env
PUBLIC_SUPABASE_URL=...
PUBLIC_SUPABASE_ANON_KEY=...
```

## Módulos implementados

- Login y sesión por cookie (`/api/auth/login`, `/api/auth/logout`, `/api/auth/session`)
- Dashboard con métricas
- Servicios (catálogo CRUD + precio base)
- Organización unificada (Empresas + Sucursales + Clientes)
- Expedientes (flujo unificado: cotización -> producción -> pedido)
- Cotizaciones con múltiples servicios + PDF (`/api/quotes/pdf/[id]`) dentro del flujo de expedientes
- Usuarios (CRUD + avatar)

## Migración SQL nueva

Ejecuta:

- `db/migrations/20260502_services_quotes_pdf.sql`

Esta migración agrega:

- Tablas: `services`, `quote_items`
- Funciones RPC: `get_services`, `create_service`, `update_service`, `delete_service`, `create_quote_with_items`, `get_quote_items`, `get_quote_pdf_payload`
- Políticas RLS básicas para prototipo

## Comandos

```bash
npm install
npm run dev
```
