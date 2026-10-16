-- ============================================================================
-- TARJETA WEB — qué se toca en https://www.especialistaenasegurarte.lat/roberto
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada.)
--
-- Qué hace: crea "tarjeta_eventos", una libreta ANÓNIMA de toques: cada renglón
-- es "se vio la página", "se llegó a la sección Seguros", "se tocó WhatsApp en la
-- portada", "se abrió una historia", etc. NO guarda IP, nombre, teléfono ni nada
-- que identifique a una persona, y la página no usa cookies para esto.
-- Con esto la pestaña "Tarjeta web" del CRM te muestra qué funciona.
--
-- 🔒 Mismo candado de siempre: RLS ACTIVADO y SIN políticas públicas (solo tu servidor).
-- ============================================================================

create table if not exists public.tarjeta_eventos (
  id          bigint generated always as identity primary key,
  creado_en   timestamptz not null default now(),
  evento      text not null check (char_length(evento) between 1 and 20),      -- vista, sec, wa, llamar, agendar, guardar, compartir…
  detalle     text not null default '' check (char_length(detalle) <= 60),     -- dónde / cuál (hero, producto:Seguro de Vida, quien…)
  dispositivo text not null default '' check (dispositivo in ('', 'movil', 'escritorio')),
  fuente      text not null default '' check (char_length(fuente) <= 30)       -- de dónde llegó: directo, qr, ig, wa, l.facebook.com…
);
create index if not exists tarjeta_eventos_fecha_idx on public.tarjeta_eventos (creado_en desc);

alter table public.tarjeta_eventos enable row level security;
-- (sin políticas: nadie con la llave pública puede leer ni escribir; el servidor usa la llave secreta)
