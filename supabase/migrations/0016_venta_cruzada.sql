-- ============================================================================
-- VENTA CRUZADA — Camila, tu empleada digital de venta cruzada, y el expediente único del cliente
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada. Requiere 0001 y 0004.)
--
-- ⚠️ ORDEN: corre este SQL ANTES de publicar la versión con Camila. Si se publica
-- primero, la pestaña de Camila avisa que falta este paso (el resto del CRM sigue igual).
--
-- Qué crea:
--   clientes         una ficha por persona o empresa (datos de contacto, fecha de nacimiento…)
--                    a la que se ligan todas sus pólizas: el «expediente único».
--   polizas.cliente_id  a qué cliente pertenece cada póliza de Valeri.
--   libro_axa        las pólizas que se leen de tus reportes AXA (2022-2026): sirven para saber
--                    qué seguros ya tiene cada cliente, sin meterlas a la cobranza de Valeri.
--   cruzada_estado   qué se le ofreció a cada cliente y cómo va (ofrecida, cotizada, no le interesa…).
--   cruzada_mensajes los textos de WhatsApp de Camila que TÚ personalizas (uno por ramo y uno para reactivar).
--
-- 🔒 Mismo candado: RLS ACTIVADO y SIN políticas públicas (solo tu servidor, con la secret key).
-- ============================================================================

create table if not exists public.clientes (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null check (char_length(nombre) between 2 and 160),
  tipo             text not null default 'persona' check (tipo in ('persona', 'empresa')),
  whatsapp         text not null default '',
  correo           text not null default '',
  fecha_nacimiento date,
  genero           text check (genero in ('mujer', 'hombre', 'prefiero_no_decir')),
  codigo_postal    text,
  -- El prospecto con el que se le vendió o cotizó (para cotizarle otro seguro).
  lead_id          uuid references public.leads(id) on delete set null,
  -- true = no ofrecerle venta cruzada (se lo pidió, ya es familia, etc.).
  no_ofrecer       boolean not null default false,
  notas            text not null default '' check (char_length(notas) <= 1000),
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);
create index if not exists clientes_nombre_idx on public.clientes (lower(nombre));
create index if not exists clientes_lead_idx on public.clientes (lead_id);

-- A qué cliente pertenece cada póliza de tu cartera de Valeri.
alter table public.polizas add column if not exists cliente_id uuid references public.clientes(id) on delete set null;
create index if not exists polizas_cliente_idx on public.polizas (cliente_id);

-- Pólizas conocidas por tus reportes de AXA (no son cobranza: solo para saber qué tiene cada cliente).
create table if not exists public.libro_axa (
  numero               text primary key,
  cliente_id           uuid references public.clientes(id) on delete set null,
  asegurado            text not null,
  ramo                 text not null check (ramo in ('vida', 'gmm', 'ahorro', 'autos', 'hogar')),
  subramo              text not null default '',
  aseguradora          text not null default 'AXA',
  -- Inicio de la vigencia más reciente que aparece en el reporte.
  inicio_vigencia      date,
  ultimo_pago          date,
  -- Próxima renovación estimada; solo se llena cuando se puede saber con confianza.
  renovacion           date,
  pagos_12m            integer not null default 0,
  prima_ultima         numeric(14, 2) not null default 0,
  vigente              boolean not null default true,
  fuente               text not null default '',
  actualizado_en       timestamptz not null default now()
);
create index if not exists libro_axa_cliente_idx on public.libro_axa (cliente_id);

-- Qué se le ofreció a cada cliente (un renglón por cliente y ramo ofrecido).
create table if not exists public.cruzada_estado (
  cliente_id        uuid not null references public.clientes(id) on delete cascade,
  ramo              text not null check (ramo in ('vida', 'gmm', 'ahorro', 'autos', 'hogar')),
  estado            text not null default 'pendiente' check (estado in ('pendiente', 'ofrecida', 'cotizada', 'cerrada', 'no_interesa')),
  ofrecida_en       timestamptz,
  volver_a_ofrecer  date,
  nota              text not null default '' check (char_length(nota) <= 500),
  actualizado_en    timestamptz not null default now(),
  primary key (cliente_id, ramo)
);

-- Tus textos de WhatsApp para cada ramo que Camila ofrece, y uno más para reactivar un seguro que ya no está vigente
-- (si no hay renglón, usa su texto base).
create table if not exists public.cruzada_mensajes (
  clave           text primary key check (clave in ('vida', 'gmm', 'ahorro', 'autos', 'hogar', 'reactivar')),
  texto           text not null check (char_length(texto) between 10 and 1000),
  actualizado_en  timestamptz not null default now()
);

-- RLS: activado, SIN políticas → solo el servidor (secret key) entra.
alter table public.clientes enable row level security;
alter table public.libro_axa enable row level security;
alter table public.cruzada_estado enable row level security;
alter table public.cruzada_mensajes enable row level security;

-- Que la API vea las tablas y columnas nuevas de inmediato.
notify pgrst, 'reload schema';
