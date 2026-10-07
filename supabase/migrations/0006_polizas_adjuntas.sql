-- ============================================================================
-- PÓLIZAS ADJUNTAS — el control de prima neta nueva y de asegurados nuevos
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente. Requiere 0001 a 0005.)
--
-- Qué hace: crea "polizas_adjuntas", un renglón por cada póliza NUEVA o de
-- RENOVACIÓN que adjuntas en el CRM (la IA lee el PDF y tú confirmas). Con
-- esto la pestaña "Pólizas" arma los reportes de prima neta por mes y por
-- trimestre en cada ramo, y en GMM cuenta los asegurados nuevos.
-- El PDF NO se guarda: solo los datos que confirmaste.
--
-- 🔒 Mismo candado: RLS ACTIVADO y SIN políticas públicas (solo tu servidor).
-- ============================================================================

create table if not exists public.polizas_adjuntas (
  id                 uuid primary key default gen_random_uuid(),
  tipo               text not null check (tipo in ('nueva', 'renovacion')),
  ramo               text not null check (ramo in ('vida', 'gmm', 'ahorro', 'autos', 'hogar')),
  aseguradora        text not null default '',
  numero             text not null default '',                 -- número de póliza
  contratante        text not null default '',
  inicio             date not null,                            -- inicio de vigencia (de aquí sale el mes)
  prima_neta         numeric(14, 2) not null default 0,        -- anual, sin derechos ni IVA
  moneda             text not null default 'MN' check (moneda in ('MN', 'DLS')),
  asegurados_total   int not null default 1,
  asegurados_nuevos  int not null default 0,                   -- GMM: los que se agregaron
  asegurados_nombres text[] not null default '{}',
  notas              text not null default '',
  archivo            text not null default '',
  creado_en          timestamptz not null default now()
);

create index if not exists polizas_adjuntas_inicio_idx on public.polizas_adjuntas (inicio);
-- Evita cargar dos veces la misma vigencia de la misma póliza.
create unique index if not exists polizas_adjuntas_unica_idx
  on public.polizas_adjuntas (aseguradora, numero, inicio) where numero <> '';

alter table public.polizas_adjuntas enable row level security;
