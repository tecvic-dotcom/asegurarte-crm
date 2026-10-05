-- ============================================================================
-- AI MANAGER (Módulo 3) — Director Financiero + Panel de Mando + RORO
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada. Requiere que
-- 0001_init.sql y 0002_whatsapp_y_plantillas.sql ya se hayan corrido antes.)
--
-- Qué hace:
--  1) A cada prospecto le agrega su RAMO (vida, GMM, ahorro, autos, hogar) y la
--     fecha en que lo cerraste. Así el Panel mide tu meta de 20 pólizas por ramo.
--  2) Crea finanzas_movimientos: lo que entra (comisiones, bonos) y lo que sale
--     (gastos). Es el "tanque de gasolina" de tu Panel de Mando.
--  3) Crea manager_config: el "cerebro" de RORO (lo que sabe de tu negocio) y tu
--     meta. Y manager_uso: cuántas preguntas le haces al mes (para cuidar el gasto).
--
-- 🔒 Mismo candado que el resto de tu base: RLS ACTIVADO y SIN políticas
-- públicas. La llave pública del navegador no puede leer ni escribir nada; solo
-- tu servidor (con la secret key) entra, y además solo con sesión de ADMIN.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Ramo y fecha de cierre en cada prospecto
-- ---------------------------------------------------------------------------
alter table public.leads
  add column if not exists ramo text check (ramo in ('vida', 'gmm', 'ahorro', 'autos', 'hogar')),
  add column if not exists cerrado_en timestamptz;

-- Los que ya estaban ganados toman como fecha de cierre su última
-- actualización (el mejor dato que tenemos de cuándo se cerraron).
update public.leads
  set cerrado_en = actualizado_en
  where etapa = 'ganado' and cerrado_en is null;

create index if not exists leads_cerrado_idx on public.leads (cerrado_en) where etapa = 'ganado';

-- ---------------------------------------------------------------------------
-- 2) finanzas_movimientos — lo que entra y lo que sale (una fila = un movimiento)
-- ---------------------------------------------------------------------------
create table if not exists public.finanzas_movimientos (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null,
  concepto    text not null check (char_length(concepto) between 1 and 200),
  tipo        text not null check (tipo in ('ingreso', 'gasto')),
  monto       numeric(14, 2) not null check (monto > 0),
  categoria   text not null default 'Otros',
  -- Opcional: a qué ramo pertenece una comisión (para saber qué ramo te deja más).
  ramo        text check (ramo in ('vida', 'gmm', 'ahorro', 'autos', 'hogar')),
  -- "por_confirmar" = algo ambiguo que hay que revisar (no se inventa, se marca).
  estado      text not null default 'confirmado' check (estado in ('confirmado', 'por_confirmar')),
  -- true = ya lo cuadraste contra tu estado de cuenta del banco.
  conciliado  boolean not null default false,
  notas       text not null default '',
  creado_por  text not null default '',
  creado_en   timestamptz not null default now()
);
create index if not exists finanzas_mov_fecha_idx on public.finanzas_movimientos (fecha desc);

-- ---------------------------------------------------------------------------
-- 3) manager_config — el cerebro de RORO + tu meta (una sola fila, id = 1)
-- ---------------------------------------------------------------------------
create table if not exists public.manager_config (
  id             int primary key default 1 check (id = 1),
  nombre         text not null default 'RORO',
  -- Vacío = RORO usa el texto base que viene en el código (lib/manager.ts).
  cerebro        text not null default '',
  meta_por_ramo  int not null default 20 check (meta_por_ramo between 1 and 1000),
  meta_inicio    date not null default '2026-09-30',
  meta_fin       date not null default '2026-12-29',
  actualizado_en timestamptz not null default now()
);
insert into public.manager_config (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- manager_uso — cuántas preguntas le haces a RORO por mes (tope de gasto)
-- ---------------------------------------------------------------------------
create table if not exists public.manager_uso (
  mes            text primary key,          -- 'AAAA-MM'
  preguntas      int not null default 0,
  tokens_entrada bigint not null default 0,
  tokens_salida  bigint not null default 0,
  actualizado_en timestamptz not null default now()
);

-- Suma una pregunta de forma atómica (sin que dos preguntas a la vez se pisen).
-- security invoker: corre con los permisos de quien la llama; como el público
-- no tiene acceso a la tabla, solo tu servidor puede usarla.
create or replace function public.manager_registrar_uso(p_mes text, p_entrada bigint, p_salida bigint)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.manager_uso (mes, preguntas, tokens_entrada, tokens_salida, actualizado_en)
  values (p_mes, 1, p_entrada, p_salida, now())
  on conflict (mes) do update set
    preguntas      = public.manager_uso.preguntas + 1,
    tokens_entrada = public.manager_uso.tokens_entrada + excluded.tokens_entrada,
    tokens_salida  = public.manager_uso.tokens_salida + excluded.tokens_salida,
    actualizado_en = now();
$$;
revoke all on function public.manager_registrar_uso(text, bigint, bigint) from public, anon, authenticated;
grant execute on function public.manager_registrar_uso(text, bigint, bigint) to service_role;

-- ---------------------------------------------------------------------------
-- RLS: activado, SIN políticas → solo el servidor (secret key) entra.
-- ---------------------------------------------------------------------------
alter table public.finanzas_movimientos enable row level security;
alter table public.manager_config       enable row level security;
alter table public.manager_uso          enable row level security;
