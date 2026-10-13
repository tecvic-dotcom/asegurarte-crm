-- ============================================================================
-- DOBLE FACTOR (2FA) — código de 6 dígitos de tu app autenticadora al entrar al CRM
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada. Requiere que
-- 0001 ya se haya corrido.)
--
-- ⚠️ ORDEN: corre este SQL ANTES de publicar la versión con doble factor. Si se
-- publica primero, el login avisa que falta este paso y nadie puede entrar
-- hasta que lo corras.
--
-- Qué hace: agrega a "usuarios" lo necesario para el segundo paso del login:
--   mfa_activo      ya enlazó su app autenticadora (false = la enlaza en su próximo login)
--   mfa_secreto     el secreto del celular, CIFRADO por el servidor (nunca en claro)
--   mfa_ultimo_paso último código aceptado (un código no sirve dos veces)
--   mfa_fallos      códigos mal puestos seguidos
--   mfa_bloqueo     hasta cuándo está bloqueado el segundo paso tras demasiados fallos
--   mfa_respaldo    huellas (no los códigos) de los 10 códigos de respaldo sin usar
--
-- 🔒 Mismo candado que el resto: RLS ya está ACTIVADO en "usuarios" y SIN políticas
-- públicas. Solo tu servidor entra, con la secret key.
--
-- Si pierdes tu celular y tus códigos de respaldo: otro administrador (o yo, desde
-- el servidor) restablece tu 2FA y en tu próximo login enlazas la app de nuevo.
-- ============================================================================

alter table public.usuarios
  add column if not exists mfa_activo      boolean     not null default false,
  add column if not exists mfa_secreto     text        not null default '',
  add column if not exists mfa_ultimo_paso bigint      not null default 0,
  add column if not exists mfa_fallos      integer     not null default 0,
  add column if not exists mfa_bloqueo     timestamptz,
  add column if not exists mfa_respaldo    jsonb       not null default '[]'::jsonb;

-- Que la API vea las columnas nuevas de inmediato.
notify pgrst, 'reload schema';
