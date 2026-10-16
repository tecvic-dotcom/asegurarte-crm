-- ============================================================================
-- VIDEOS DE LA TARJETA WEB — sube un video desde el CRM y sale solo en /roberto
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada.)
--
-- Qué hace:
--   1) Crea la tabla "tarjeta_videos": un renglón por video que subes desde la
--      pestaña "Videos de la tarjeta" (título, palabra clave de WhatsApp, si se
--      hizo con IA, si está visible).
--   2) Crea el cajón de archivos "tarjeta-videos" (los .mp4 y sus portadas).
--      Es PÚBLICO para leer (la tarjeta los muestra a cualquier visitante) pero
--      NADIE puede subir ni borrar con la llave pública: solo tu CRM, con
--      permisos de un solo uso que genera tu servidor.
--
-- 🔒 Mismo candado de siempre: RLS ACTIVADO y SIN políticas públicas en la tabla.
-- ============================================================================

create table if not exists public.tarjeta_videos (
  id          uuid primary key default gen_random_uuid(),
  creado_en   timestamptz not null default now(),
  titulo      text not null check (char_length(titulo) between 1 and 90),
  clave       text not null default '' check (char_length(clave) <= 30),          -- palabra que la gente te escribe por WhatsApp (ESCUDO, AHORRO…)
  video_path  text not null check (char_length(video_path) between 1 and 200),    -- ruta dentro del cajón tarjeta-videos
  poster_path text not null default '' check (char_length(poster_path) <= 200),   -- portada (JPG)
  duracion    integer not null default 0 check (duracion between 0 and 3600),     -- segundos
  ia          boolean not null default true,                                      -- true = muestra «creado con apoyo de inteligencia artificial»
  visible     boolean not null default true                                       -- false = oculto en la tarjeta (sigue guardado)
);
create index if not exists tarjeta_videos_fecha_idx on public.tarjeta_videos (creado_en desc);

alter table public.tarjeta_videos enable row level security;
-- (sin políticas: nadie con la llave pública puede leer ni escribir la tabla; el servidor usa la llave secreta)

-- Cajón de archivos: público para VER, sin permisos de subida para el público (solo URLs firmadas del servidor).
-- Límite 50 MB por archivo (el máximo del plan gratuito de Supabase); solo mp4 y jpg.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tarjeta-videos', 'tarjeta-videos', true, 52428800, array['video/mp4', 'image/jpeg'])
on conflict (id) do update
  set public = true,
      file_size_limit = 52428800,
      allowed_mime_types = array['video/mp4', 'image/jpeg'];
