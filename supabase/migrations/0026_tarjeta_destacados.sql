-- ============================================================================
-- VIDEOS DESTACADOS DE LA TARJETA WEB — tú eliges cuáles 3 videos se ven en /roberto
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada.)
--
-- Qué hace:
--   Crea la tabla "tarjeta_destacados": hasta 3 renglones (posición 1, 2 y 3), uno por video destacado.
--   Cada renglón guarda: el video (uno de los que subiste desde el CRM, o uno de los fijos de la tarjeta),
--   la línea de beneficio que se lee debajo del video y a qué solución lleva su botón
--   («Conoce gastos médicos», «Conoce seguro de vida», «Solicita asesoría»…).
--   Se editan en la pestaña "Videos de la tarjeta" → «Videos destacados».
--
--   Deja ya cargados los 3 destacados que hoy se ven en la tarjeta (el testimonio, «¿Y si mañana no pudieras
--   trabajar?» y «¿Los seguros son un lujo o una herramienta?»), así nada cambia al correrla.
--   Sin esta tabla, la tarjeta sigue mostrando esos mismos 3.
--
-- 🔒 Mismo candado de siempre: RLS ACTIVADO y SIN políticas públicas en la tabla.
-- ============================================================================

create table if not exists public.tarjeta_destacados (
  posicion   smallint primary key check (posicion between 1 and 3),                 -- 1 = el primero que se ve
  video_id   text not null check (char_length(video_id) between 1 and 60),          -- uuid de un video tuyo o id de un video fijo («amar-familia»)
  beneficio  text not null check (char_length(beneficio) between 1 and 160),        -- la línea de beneficio que se lee debajo del video
  ramo       text not null default '' check (ramo in ('', 'salud', 'familia', 'retiro', 'casa', 'auto', 'impuestos')),
                                                                                    -- a qué mosaico lleva el botón; vacío = «Solicita asesoría» (baja al formulario)
  creado_en  timestamptz not null default now()
);

alter table public.tarjeta_destacados enable row level security;
-- (sin políticas: nadie con la llave pública puede leer ni escribir la tabla; el servidor usa la llave secreta)

-- Los 3 que hoy se ven en la tarjeta (si ya existen esas posiciones, no se tocan).
insert into public.tarjeta_destacados (posicion, video_id, beneficio, ramo) values
  (1, 'ce9d0925-4565-40b2-a14c-26167bef38ef', 'Una familia cuenta lo que vivió ante un derrame cerebral y cómo su póliza de gastos médicos mayores hizo posible la atención que necesitaba.', 'salud'),
  (2, 'amar-familia', 'Qué pasa con el ingreso de tu familia si un día no puedes trabajar y cómo armar un escudo familiar.', 'familia'),
  (3, 'seguro-o-lujo', 'Si crees que un seguro es un lujo, mira cómo verlo como una herramienta y qué conviene priorizar.', '')
on conflict (posicion) do nothing;

-- PostgREST (la API de Supabase) recarga su lista de tablas.
notify pgrst, 'reload schema';
