-- ============================================================================
-- DANA — tu empleada digital de Chubb Autos
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada. No necesita
-- ninguna otra migración.)
--
-- Qué hace: crea "chubb_cargas", donde Dana guarda cada Excel de "Producción
-- Detalle" que subes desde el CRM. Cada carga es una FOTO completa del Excel
-- (todas sus pólizas en una sola columna jsonb): así Dana siempre trabaja con el
-- Excel más reciente y se conservan las anteriores para comparar qué cambió.
--
-- 🔒 Mismo candado que el resto de tu base: RLS ACTIVADO y SIN políticas
-- públicas. Solo tu servidor entra, y solo con sesión de administrador.
-- Son datos de tus clientes (nombre, póliza, vehículo, primas).
-- ============================================================================

create table if not exists public.chubb_cargas (
  id          uuid primary key default gen_random_uuid(),
  cargado_en  timestamptz not null default now(),
  -- Nombre del archivo que subiste (solo informativo).
  archivo     text not null check (char_length(archivo) between 1 and 150),
  -- Cuántas pólizas traía esa carga.
  total       integer not null check (total >= 0),
  -- La foto completa del Excel: una lista de pólizas.
  polizas     jsonb not null check (jsonb_typeof(polizas) = 'array')
);
create index if not exists chubb_cargas_fecha_idx on public.chubb_cargas (cargado_en desc);

-- RLS: activado, SIN políticas → solo el servidor (secret key) entra.
alter table public.chubb_cargas enable row level security;

-- Para que la API vea la tabla nueva sin esperar.
notify pgrst, 'reload schema';
