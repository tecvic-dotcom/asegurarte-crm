-- ============================================================================
-- HISTORIAL DE PÓLIZAS — pagos, renovaciones y endosos de cada cliente
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada. Requiere que
-- 0004_cobranza.sql ya se haya corrido antes.)
--
-- Qué hace: crea "polizas_historial", la bitácora de cada póliza de tu cartera.
-- Con ella, en Clara → "Clientes por ramo", cada renglón tiene sus botones de
--   · Historial de pagos  (cada vez que Valeri marca "Pagó" se anota solo;
--                          también puedes registrar pagos viejos a mano)
--   · Renovación          (manual o leyendo el PDF; se anota la vigencia nueva)
--   · Endosos             (altas, bajas y cambios de la póliza, con su ajuste de prima)
--
-- 🔒 Mismo candado que el resto de tu base: RLS ACTIVADO y SIN políticas
-- públicas. Solo tu servidor entra, y solo con sesión de ADMIN.
-- ============================================================================

create table if not exists public.polizas_historial (
  id          uuid primary key default gen_random_uuid(),
  poliza_id   uuid not null references public.polizas(id) on delete cascade,
  tipo        text not null check (tipo in ('pago', 'endoso', 'renovacion')),
  -- Cuándo ocurrió: el día del pago, de la renovación o de la vigencia del endoso.
  fecha       date not null,
  -- pago = lo que se pagó · endoso = ajuste de prima (puede ser negativo) · renovación = prima anual de la vigencia nueva.
  monto       numeric(14, 2) not null default 0,
  -- pago: "Pagó (Valeri)" o "Registrado a mano" · endoso: su tipo (alta de asegurado, cambio de vehículo…)
  -- · renovación: "Manual" o "Lector de PDF".
  concepto    text not null default '' check (char_length(concepto) <= 80),
  numero      text not null default '' check (char_length(numero) <= 40),   -- número de endoso
  nota        text not null default '' check (char_length(nota) <= 1000),
  -- pago: fecha límite del recibo que cubrió.
  recibo      date,
  -- renovación: la vigencia nueva.
  desde       date,
  hasta       date,
  creado_en   timestamptz not null default now()
);

create index if not exists polizas_historial_poliza_idx on public.polizas_historial (poliza_id, fecha desc);
create index if not exists polizas_historial_tipo_idx on public.polizas_historial (tipo, fecha desc);

-- RLS: activado, SIN políticas → solo el servidor (secret key) entra.
alter table public.polizas_historial enable row level security;
