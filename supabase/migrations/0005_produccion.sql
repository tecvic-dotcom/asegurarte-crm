-- ============================================================================
-- CRECIMIENTO — tu producción por mes y ramo (prima pagada y comisión)
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente. Requiere 0001 a 0004.)
--
-- Qué hace: crea "produccion_mensual", los TOTALES de cada mes por ramo que
-- salen de tus reportes de prima pagada de la aseguradora. No guarda nombres
-- de clientes: solo cuántos pagos, cuánta prima y cuánta comisión hubo.
-- Con esto la pestaña "Crecimiento" compara mes contra mes y año contra año.
--
-- 🔒 Mismo candado: RLS ACTIVADO y SIN políticas públicas (solo tu servidor).
-- ============================================================================

create table if not exists public.produccion_mensual (
  mes            text not null check (mes ~ '^\d{4}-\d{2}$'),      -- 'AAAA-MM' (fecha en que se aplicó el pago)
  aseguradora    text not null default 'AXA',
  ramo           text not null check (ramo in ('vida', 'gmm', 'ahorro', 'autos', 'hogar')),
  subramo        text not null default '',                           -- como lo nombra la aseguradora
  moneda         text not null default 'MN' check (moneda in ('MN', 'DLS')),
  pagos          int not null default 0,
  prima          numeric(16, 2) not null default 0,                  -- prima neta pagada (las devoluciones restan)
  comision       numeric(16, 2) not null default 0,                  -- tu comisión total de esos pagos
  ultimo_dia     date,                                               -- último pago aplicado en ese mes
  actualizado_en timestamptz not null default now(),
  primary key (mes, aseguradora, ramo, subramo, moneda)
);
create index if not exists produccion_mes_idx on public.produccion_mensual (mes);

alter table public.produccion_mensual enable row level security;
