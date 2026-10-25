-- ============================================================================
-- INTERESES DE LOS VIDEOS DE LA TARJETA — qué chips de /roberto recomiendan cada video
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada.)
--
-- Qué hace:
--   Agrega a "tarjeta_videos" la columna "intereses": la lista de chips de la
--   tarjeta («Mi salud», «Mi familia», «Mi retiro», «Mi casa», «Mi auto»,
--   «Mis impuestos») a los que responde cada video. Se elige en la pestaña
--   "Videos de la tarjeta" al subir el video o con el botón Editar.
--   Vacía = la tarjeta lo deduce de la palabra clave, como hasta hoy.
--
-- 🔒 No cambia la seguridad: la tabla sigue con RLS activado y sin políticas públicas.
-- ============================================================================

alter table public.tarjeta_videos
  add column if not exists intereses text[] not null default '{}';

-- Solo ids que la tarjeta conoce (si en el futuro hay un chip nuevo, se amplía esta lista).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tarjeta_videos_intereses_validos') then
    alter table public.tarjeta_videos
      add constraint tarjeta_videos_intereses_validos
      check (intereses <@ array['salud', 'familia', 'retiro', 'casa', 'auto', 'impuestos']::text[]);
  end if;
end $$;

-- PostgREST (la API de Supabase) recarga su lista de columnas.
notify pgrst, 'reload schema';
