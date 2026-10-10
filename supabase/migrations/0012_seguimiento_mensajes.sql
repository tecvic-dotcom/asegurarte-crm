-- ============================================================================
-- MENSAJES DE SOFI — tus propios textos de WhatsApp para dar seguimiento a prospectos
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada.)
--
-- Qué hace: crea "seguimiento_mensajes", donde se guarda el texto que TÚ escribes
-- para cada situación de seguimiento (prospecto nuevo, contactado, con cita,
-- propuesta enviada, último intento). Si una situación no tiene renglón aquí,
-- Sofi usa su texto base.
--
-- 🔒 Mismo candado: RLS ACTIVADO y SIN políticas públicas (solo tu servidor).
-- ============================================================================

create table if not exists public.seguimiento_mensajes (
  motivo         text primary key check (motivo in ('nuevo', 'contactado', 'cita', 'propuesta', 'ultimo_intento')),
  texto          text not null check (char_length(texto) between 10 and 1000),
  actualizado_en timestamptz not null default now()
);

alter table public.seguimiento_mensajes enable row level security;

-- Para que la API vea la tabla nueva sin esperar.
notify pgrst, 'reload schema';
