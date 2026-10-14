-- ============================================================================
-- VENTA CRUZADA, SEGUNDA PARTE — familias, momentos de confianza y ventas cruzadas en tu meta
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada. Requiere haber corrido 0016.)
--
-- ⚠️ ORDEN: corre este SQL ANTES de publicar la versión con familias y momentos. Si se publica
-- primero, Camila avisa que falta este paso (el resto del CRM sigue igual).
--
-- Qué agrega:
--   clientes.titular_id / parentesco   familia: un cliente puede ser cónyuge, hijo… de otro (el titular).
--   clientes.referidos_pedidos_en      cuándo se le pidieron referidos (no se repite antes de 90 días).
--   cruzada_estado.lead_id             el prospecto de Cotizaciones que lleva esa venta cruzada
--                                      (al cerrarla se registra como cliente ganado y suma a tu meta).
--   cruzada_momentos                   los momentos de confianza que ya atendiste (cumpleaños,
--                                      revisión de renovación, pago…) para que no se repitan.
--   cruzada_mensajes                   acepta los textos nuevos (familiar, referidos, revisión, cumpleaños, pago).
--
-- 🔒 Mismo candado: RLS ACTIVADO y SIN políticas públicas (solo tu servidor, con la secret key).
-- ============================================================================

alter table public.clientes add column if not exists titular_id uuid references public.clientes(id) on delete set null;
alter table public.clientes add column if not exists parentesco text;
alter table public.clientes drop constraint if exists clientes_parentesco_check;
alter table public.clientes add constraint clientes_parentesco_check
  check (parentesco is null or parentesco in ('conyuge', 'hijo', 'padre_madre', 'otro'));
alter table public.clientes add column if not exists referidos_pedidos_en timestamptz;
create index if not exists clientes_titular_idx on public.clientes (titular_id);

alter table public.cruzada_estado add column if not exists lead_id uuid references public.leads(id) on delete set null;

create table if not exists public.cruzada_momentos (
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  clave       text not null check (char_length(clave) between 3 and 120),
  hecho_en    timestamptz not null default now(),
  primary key (cliente_id, clave)
);
alter table public.cruzada_momentos enable row level security;

-- Los textos de WhatsApp de Camila: ahora son 11 (5 seguros, reactivar, familiar, referidos y 3 momentos).
alter table public.cruzada_mensajes drop constraint if exists cruzada_mensajes_clave_check;
alter table public.cruzada_mensajes add constraint cruzada_mensajes_clave_check
  check (clave in ('vida', 'gmm', 'ahorro', 'autos', 'hogar', 'reactivar', 'familiar', 'referidos', 'revision', 'cumple', 'pago'));

-- Que la API vea las columnas y la tabla nuevas de inmediato.
notify pgrst, 'reload schema';
