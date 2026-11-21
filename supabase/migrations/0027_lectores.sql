-- ============================================================================
-- LECTORES DEL LIBRO — la lista APARTE de quienes piden la guía gratuita
-- «10 actividades de tu negocio que puedes delegar a la inteligencia artificial»
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada.)
--
-- Qué hace:
--   Crea la tabla "lectores". NO es la tabla de prospectos de seguros (leads): aquí van
--   agentes de seguros interesados en el libro «De la Agenda al Algoritmo», para que
--   Robert, Camila y Sofi no les ofrezcan pólizas.
--   Cada renglón guarda: nombre, correo (uno por persona), de dónde llegó (utm),
--   cuándo aceptó el aviso, en qué paso de la secuencia de correos va, si se dio
--   de baja o si ya compró, y un código secreto para su liga de baja.
--
-- 🔒 Mismo candado de siempre: RLS ACTIVADO y SIN políticas públicas en la tabla.
-- ============================================================================

create table if not exists public.lectores (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null check (char_length(nombre) between 1 and 80),
  correo           text not null unique check (char_length(correo) between 3 and 254),
  estado           text not null default 'activo' check (estado in ('activo', 'baja', 'compro')),
  paso             smallint not null default 0 check (paso between 0 and 20),   -- último correo de la secuencia que se le mandó (0 = solo la bienvenida)
  proximo_envio    timestamptz,                                                 -- cuándo le toca el siguiente correo (null = ninguno)
  token_baja       uuid not null unique default gen_random_uuid(),              -- va en su liga «darme de baja»
  utm_source       text not null default '' check (char_length(utm_source) <= 120),
  utm_medium       text not null default '' check (char_length(utm_medium) <= 120),
  utm_campaign     text not null default '' check (char_length(utm_campaign) <= 120),
  utm_content      text not null default '' check (char_length(utm_content) <= 120),
  pais             text,
  ciudad           text,
  dispositivo      text,
  veces            smallint not null default 1,                                 -- cuántas veces pidió la guía
  aviso_aceptado   timestamptz not null default now(),
  baja_en          timestamptz,
  compro_en        timestamptz,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

create index if not exists lectores_proximo_envio_idx on public.lectores (proximo_envio) where estado = 'activo';

alter table public.lectores enable row level security;
-- (sin políticas: nadie con la llave pública puede leer ni escribir la tabla; el servidor usa la llave secreta)

-- PostgREST (la API de Supabase) recarga su lista de tablas.
notify pgrst, 'reload schema';
