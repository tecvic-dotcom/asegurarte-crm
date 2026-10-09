-- ============================================================================
-- COTIZACIONES — guarda lo que cotizas a cada prospecto, compáralo y mándalo
-- por WhatsApp desde el CRM.
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada. Necesita antes
-- la migración 0001 porque cada cotización pertenece a un prospecto.)
--
-- Qué hace: crea "cotizaciones". Cada renglón es una opción que cotizaste
-- (aseguradora, plan, prima y coberturas) para un prospecto. Nunca se borran
-- solas: si ya no te sirve, la descartas y queda guardada.
--
-- 🔒 Mismo candado que el resto de tu base: RLS ACTIVADO y SIN políticas
-- públicas. Solo tu servidor entra, y cada usuario solo ve las suyas.
-- ============================================================================

create table if not exists public.cotizaciones (
  id             uuid primary key default gen_random_uuid(),
  -- Quién la hizo (el id de su sesión en el CRM).
  usuario_id     text not null,
  -- Prospecto al que se le cotizó. Si borras al prospecto, se van con él.
  lead_id        uuid not null references public.leads(id) on delete cascade,
  ramo           text not null check (ramo in ('gmm','autos','hogar','viaje','vida','ahorro')),
  aseguradora    text not null check (char_length(aseguradora) between 1 and 60),
  plan           text not null default '' check (char_length(plan) <= 80),
  -- Lo que paga el cliente de contado (en viaje, el costo total del viaje).
  prima          numeric(12,2) not null check (prima > 0),
  moneda         text not null default 'MN' check (moneda in ('MN','DLS')),
  -- Opcional: si también la ofreces en pagos. "monto_pago" es cada pago (los que siguen al primero);
  -- "primer_pago" solo se llena cuando el primero es distinto (suele traer los derechos de póliza).
  forma_pago     text check (forma_pago is null or forma_pago in ('mensual','trimestral','semestral')),
  monto_pago     numeric(12,2) check (monto_pago is null or monto_pago > 0),
  primer_pago    numeric(12,2) check (primer_pago is null or primer_pago > 0),
  -- Hasta cuándo es válida la cotización (opcional).
  vigencia_hasta date,
  -- Coberturas y datos propios de cada ramo (deducible, coaseguro, vehículo…).
  datos          jsonb not null default '{}'::jsonb,
  notas          text not null default '' check (char_length(notas) <= 500),
  estado         text not null default 'guardada' check (estado in ('guardada','enviada','elegida','descartada')),
  enviada_en     timestamptz,
  creado_en      timestamptz not null default now()
);
create index if not exists cotizaciones_usuario_lead_idx on public.cotizaciones (usuario_id, lead_id, creado_en desc);

-- RLS: activado, SIN políticas → solo el servidor (secret key) entra.
alter table public.cotizaciones enable row level security;

-- Para que la API vea la tabla nueva sin esperar.
notify pgrst, 'reload schema';
