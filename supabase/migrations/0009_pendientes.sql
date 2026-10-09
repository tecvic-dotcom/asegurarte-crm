-- ============================================================================
-- MIS PENDIENTES — tu agenda del día dentro del CRM
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada. No necesita
-- ninguna otra migración, salvo 0001 porque se puede ligar a un prospecto.)
--
-- Qué hace: crea "pendientes", la lista de cosas por hacer de cada usuario.
-- Al completar uno NO se borra: queda guardado con la fecha y hora en que lo
-- terminaste, y desaparece de la lista de pendientes (lo ves en "Completados").
--
-- 🔒 Mismo candado que el resto de tu base: RLS ACTIVADO y SIN políticas
-- públicas. Solo tu servidor entra, y cada usuario solo ve los suyos.
-- ============================================================================

create table if not exists public.pendientes (
  id          uuid primary key default gen_random_uuid(),
  -- Dueño del pendiente (el id de su sesión en el CRM).
  usuario_id  text not null,
  texto       text not null check (char_length(texto) between 1 and 200),
  -- Para qué día es (por defecto, hoy). Si no se completa, sigue saliendo como atrasado.
  fecha       date not null default current_date,
  -- Hora opcional, formato 24 h "HH:MM".
  hora        text check (hora is null or hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  -- Prospecto al que se refiere (opcional). Si borras al prospecto, el pendiente se queda.
  lead_id     uuid references public.leads(id) on delete set null,
  hecho       boolean not null default false,
  hecho_en    timestamptz,
  creado_en   timestamptz not null default now()
);
create index if not exists pendientes_usuario_idx on public.pendientes (usuario_id, hecho, fecha);

-- RLS: activado, SIN políticas → solo el servidor (secret key) entra.
alter table public.pendientes enable row level security;

-- Para que la API vea la tabla nueva sin esperar.
notify pgrst, 'reload schema';
