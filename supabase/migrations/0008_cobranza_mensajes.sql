-- ============================================================================
-- MENSAJES DE VALERI — tus propios textos de WhatsApp para cobranza
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente. Requiere 0001 a 0007.)
--
-- Qué hace: crea "cobranza_mensajes", donde se guarda el texto que TÚ escribes
-- para cada situación de cobro (vencida, por vencer, promesa, renovación…).
-- Si una situación no tiene renglón aquí, Valeri usa su texto base.
--
-- 🔒 Mismo candado: RLS ACTIVADO y SIN políticas públicas (solo tu servidor).
-- ============================================================================

create table if not exists public.cobranza_mensajes (
  motivo         text primary key check (motivo in ('vencida', 'promesa_vencida', 'promesa', 'por_vencer', 'renovacion')),
  texto          text not null check (char_length(texto) between 10 and 1000),
  actualizado_en timestamptz not null default now()
);

alter table public.cobranza_mensajes enable row level security;
