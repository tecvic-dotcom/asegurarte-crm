-- ============================================================================
-- CÓDIGOS POSTALES — para rellenar ciudad, estado y país de cada prospecto
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente. Requiere 0001 a 0006.)
--
-- Qué hace: crea "codigos_postales" (un renglón por código postal de México:
-- ciudad, municipio y estado). Se llena UNA vez con el catálogo oficial de
-- Correos de México (lo carga Claude Code). Cuando capturas el código postal de
-- un prospecto, el CRM rellena solo su ciudad, estado y país.
--
-- Nota: el catálogo de Correos es de uso particular y no se distribuye a
-- terceros, por eso vive aquí, en tu base privada, y NO en el repositorio.
--
-- 🔒 Mismo candado: RLS ACTIVADO y SIN políticas públicas (solo tu servidor).
-- ============================================================================

create table if not exists public.codigos_postales (
  cp         text primary key check (cp ~ '^\d{5}$'),
  ciudad     text not null default '',   -- la ciudad (o el municipio si no hay ciudad)
  municipio  text not null default '',
  estado     text not null default ''
);

alter table public.codigos_postales enable row level security;
