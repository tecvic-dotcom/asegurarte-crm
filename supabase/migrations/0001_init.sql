-- ============================================================================
-- AI CASH MACHINE — esquema inicial (tu base de datos de clientes)
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada.)
--
-- 🔒 Seguridad (lo más importante): RLS (Row Level Security) ACTIVADO en todas
-- las tablas SIN políticas públicas. Eso BLOQUEA a la llave pública del
-- navegador. Tu app entra SOLO por el servidor con la "secret key", que salta
-- RLS. Así tu lista de clientes (datos personales) NUNCA queda expuesta.
-- Analogía: la bodega tiene la puerta con llave (RLS) y solo el dueño
-- (el servidor) tiene la copia de la llave maestra.
-- ============================================================================

-- Para generar IDs únicos automáticamente.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- usuarios — tu equipo que entra al CRM (multiusuario con contraseña real)
-- La contraseña se guarda HASHEADA (PBKDF2), nunca en texto plano.
-- ---------------------------------------------------------------------------
create table if not exists public.usuarios (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  correo        text not null,
  rol           text not null default 'vendedor' check (rol in ('admin', 'vendedor')),
  password_hash text not null default '',
  password_salt text not null default '',
  activo        boolean not null default true,
  creado_en     timestamptz not null default now()
);
create unique index if not exists usuarios_correo_uniq on public.usuarios (correo);

-- ---------------------------------------------------------------------------
-- leads — los datos que captura tu página (una persona = un registro)
-- Dedupe por correo y por teléfono (no entra dos veces el mismo).
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  correo        text not null default '',
  telefono      text not null default '',
  mensaje       text not null default '',
  etapa         text not null default 'nuevo'
                check (etapa in ('nuevo','contactado','cita','propuesta','ganado','perdido')),
  valor         numeric not null default 0,
  origen        text not null default 'landing',
  -- De dónde llegó (las 5 etiquetas UTM de las campañas).
  utm_source    text not null default '',
  utm_medium    text not null default '',
  utm_campaign  text not null default '',
  utm_term      text not null default '',
  utm_content   text not null default '',
  -- Contexto técnico (de los headers de Vercel). Si no se sabe, queda null.
  pais          text,
  ciudad        text,
  region        text,
  dispositivo   text,
  asignado_a    uuid references public.usuarios(id) on delete set null,
  notas         text not null default '',
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
-- correo único cuando existe (ya viene normalizado en minúsculas por la app)
create unique index if not exists leads_correo_uniq
  on public.leads (correo) where correo <> '';
-- teléfono único cuando existe
create unique index if not exists leads_telefono_uniq
  on public.leads (telefono) where telefono <> '';
create index if not exists leads_etapa_idx on public.leads (etapa, creado_en desc);

-- ---------------------------------------------------------------------------
-- actividad — la línea de tiempo de cada lead (notas, llamadas, cambios)
-- ---------------------------------------------------------------------------
create table if not exists public.actividad (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  tipo       text not null default 'nota'
             check (tipo in ('nota','llamada','mensaje','correo','cita','etapa','pago')),
  texto      text not null default '',
  autor      text not null default '',
  creado_en  timestamptz not null default now()
);
create index if not exists actividad_lead_idx on public.actividad (lead_id, creado_en desc);

-- ---------------------------------------------------------------------------
-- ajustes — configuración editable desde el panel admin (clave → valor)
-- Aquí vive el link de WhatsApp y del grupo (NO hardcodeado en el código).
-- ---------------------------------------------------------------------------
create table if not exists public.ajustes (
  clave         text primary key,
  valor         text not null default '',
  actualizado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS: activado, SIN políticas → solo el servidor (secret key) entra.
-- ---------------------------------------------------------------------------
alter table public.usuarios  enable row level security;
alter table public.leads     enable row level security;
alter table public.actividad enable row level security;
alter table public.ajustes   enable row level security;

-- (Intencionalmente NO creamos políticas para anon/authenticated. La llave
--  pública no puede leer ni escribir nada. Todo pasa por app/api/* server-only.)

-- ---------------------------------------------------------------------------
-- Semilla: ajustes por defecto (idempotente). Edítalos luego desde /admin.
-- ---------------------------------------------------------------------------
insert into public.ajustes (clave, valor) values
  ('whatsapp_url', 'https://wa.me/528182800234'),
  ('group_url', ''),
  ('popup_activo', 'false'),
  ('negocio_nombre', 'Roberto Rodríguez · Asegurarte')
on conflict (clave) do nothing;

-- NOTA: la primera cuenta de tu equipo (con contraseña) se crea desde el panel
-- /admin (acción "crear usuario"). No sembramos contraseñas aquí por seguridad.
