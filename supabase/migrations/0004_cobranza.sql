-- ============================================================================
-- COBRANZA — Valeri, tu empleado digital de cobranza (vive junto a RORO)
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada. Requiere que
-- 0001, 0002 y 0003 ya se hayan corrido antes.)
--
-- Qué hace: crea "polizas", tu cartera para cobrar. Con ella Valeri te dice a
-- quién cobrarle hoy, cuánto dinero está en riesgo y te deja el WhatsApp listo.
--
-- 🔒 Mismo candado que el resto de tu base: RLS ACTIVADO y SIN políticas
-- públicas. Solo tu servidor entra, y solo con sesión de ADMIN.
-- ============================================================================

create table if not exists public.polizas (
  id                  uuid primary key default gen_random_uuid(),
  numero              text not null default '',
  asegurado           text not null check (char_length(asegurado) between 2 and 160),
  whatsapp            text not null default '',
  correo              text not null default '',
  ramo                text check (ramo in ('vida', 'gmm', 'ahorro', 'autos', 'hogar')),
  aseguradora         text not null default '',
  -- Lo que paga el cliente en CADA recibo (0 = no lo sé todavía).
  monto_pago          numeric(14, 2) not null default 0 check (monto_pago >= 0),
  -- Prima total del año (opcional, para saber cuánto vale tu cartera).
  prima_anual         numeric(14, 2) not null default 0 check (prima_anual >= 0),
  forma_pago          text not null default 'anual'
                      check (forma_pago in ('anual', 'semestral', 'trimestral', 'mensual')),
  inicio              date,
  renovacion          date,
  -- Fecha límite del recibo que toca pagar. Al marcar "Pagó" avanza sola al siguiente.
  fecha_limite_pago   date,
  -- null = normal; 'promesa' = prometió pagar en promesa_fecha; 'cancelada' = ya no se cobra.
  estatus_manual      text check (estatus_manual in ('promesa', 'cancelada')),
  promesa_fecha       date,
  ultimo_pago         date,
  -- Última vez que le mandaste recordatorio (para no insistir dos veces el mismo día).
  ultimo_recordatorio timestamptz,
  lead_id             uuid references public.leads(id) on delete set null,
  notas               text not null default '',
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now()
);
create index if not exists polizas_limite_idx on public.polizas (fecha_limite_pago);
create index if not exists polizas_renovacion_idx on public.polizas (renovacion);

-- RLS: activado, SIN políticas → solo el servidor (secret key) entra.
alter table public.polizas enable row level security;
