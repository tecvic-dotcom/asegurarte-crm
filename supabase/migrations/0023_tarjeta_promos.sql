-- ============================================================================
-- PROMOCIONES DE LA TARJETA WEB — las campañas del mes que salen solas en /roberto
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada.)
--
-- Qué hace:
--   Crea la tabla "tarjeta_promos": un renglón por campaña que publicas desde la
--   pestaña "Promociones de la tarjeta" del CRM (nombre, texto gancho, detalle,
--   palabra clave de WhatsApp, letra chica, fecha de inicio y de fin, portada y,
--   si quieres, un video). La campaña aparece en la sección «Promociones» de la
--   tarjeta el día que empieza y se quita sola al terminar su fecha de fin.
--
--   Los archivos (portada y video) usan el MISMO cajón público "tarjeta-videos"
--   que ya creó la migración 0020 (carpeta promo/), así que no hay cajón nuevo.
--   Si todavía no corriste la 0020, córrela primero.
--
-- 🔒 Mismo candado de siempre: RLS ACTIVADO y SIN políticas públicas en la tabla.
-- ============================================================================

create table if not exists public.tarjeta_promos (
  id          uuid primary key default gen_random_uuid(),
  creado_en   timestamptz not null default now(),
  titulo      text not null check (char_length(titulo) between 1 and 60),         -- nombre de la campaña («Halloween · Seguro de Auto»)
  gancho      text not null check (char_length(gancho) between 1 and 140),        -- texto gancho: lo grande que se lee primero
  detalle     text not null default '' check (char_length(detalle) <= 300),       -- una o dos líneas que explican la promoción
  clave       text not null default '' check (char_length(clave) <= 30),          -- palabra que la gente te escribe por WhatsApp (AUTO, VIDA…)
  condiciones text not null default '' check (char_length(condiciones) <= 300),   -- letra chica: aseguradora, requisitos, vigencia
  inicio      date not null,                                                      -- primer día que se ve en la tarjeta
  fin         date,                                                               -- último día que se ve (vacío = hasta que la ocultes)
  poster_path text not null default '' check (char_length(poster_path) <= 200),   -- portada (JPG) dentro del cajón tarjeta-videos
  video_path  text not null default '' check (char_length(video_path) <= 200),    -- video opcional (mp4) dentro del mismo cajón
  duracion    integer not null default 0 check (duracion between 0 and 3600),     -- segundos del video
  ia          boolean not null default true,                                      -- true = el video muestra «creado con apoyo de inteligencia artificial»
  visible     boolean not null default true,                                      -- false = oculta (sigue guardada)
  constraint tarjeta_promos_fechas check (fin is null or fin >= inicio)           -- el último día no puede ser anterior al primero
);
create index if not exists tarjeta_promos_fecha_idx on public.tarjeta_promos (inicio desc, creado_en desc);

alter table public.tarjeta_promos enable row level security;
-- (sin políticas: nadie con la llave pública puede leer ni escribir la tabla; el servidor usa la llave secreta)

-- PostgREST (la API de Supabase) recarga su lista de tablas.
notify pgrst, 'reload schema';
