-- ============================================================================
-- AI CASH MACHINE — ampliación del esquema (negocio de seguros)
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada. Requiere que
-- 0001_init.sql ya se haya corrido antes.)
--
-- Qué hace:
--  1) Renombra leads.telefono → leads.whatsapp (mismo dato, nombre más claro).
--  2) Agrega género, fecha de nacimiento y código postal (los completa el
--     vendedor durante la asesoría, no van en el formulario público).
--  3) Crea la tabla plantillas_mensaje (primer contacto, seguimiento,
--     reactivación) con RLS deny-by-default igual que las demás tablas.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Renombrar telefono → whatsapp (si la columna vieja todavía existe).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leads' and column_name = 'telefono'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leads' and column_name = 'whatsapp'
  ) then
    alter table public.leads rename column telefono to whatsapp;
  end if;
end $$;

-- Reemplaza el índice único viejo (si quedó con el nombre anterior).
drop index if exists public.leads_telefono_uniq;
create unique index if not exists leads_whatsapp_uniq
  on public.leads (whatsapp) where whatsapp <> '';

-- ---------------------------------------------------------------------------
-- 2) Campos nuevos del lead (nullable: se llenan después, no en el formulario).
-- ---------------------------------------------------------------------------
alter table public.leads
  add column if not exists genero text check (genero in ('mujer', 'hombre', 'prefiero_no_decir')),
  add column if not exists fecha_nacimiento date,
  add column if not exists codigo_postal text;

-- ---------------------------------------------------------------------------
-- plantillas_mensaje — primer contacto / seguimiento / reactivación
-- ---------------------------------------------------------------------------
create table if not exists public.plantillas_mensaje (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  canal      text not null default 'whatsapp' check (canal in ('whatsapp', 'correo')),
  cuerpo     text not null default '',
  creado_en  timestamptz not null default now()
);

alter table public.plantillas_mensaje enable row level security;
-- (Igual que las demás: sin políticas para anon/authenticated. Solo entra el
--  servidor con la service_role, vía app/api/crm/plantillas.)

insert into public.plantillas_mensaje (nombre, canal, cuerpo)
select 'Primer contacto', 'whatsapp',
  'Hola {nombre}, soy Roberto Rodríguez de Asegurarte 👋. Vi que agendaste tu asesoría gratis sobre el seguro para cuando llegue el bebé. ¿Qué día y horario te acomoda esta semana?'
where not exists (select 1 from public.plantillas_mensaje where nombre = 'Primer contacto');

insert into public.plantillas_mensaje (nombre, canal, cuerpo)
select 'Seguimiento sin respuesta', 'whatsapp',
  'Hola {nombre}, te escribo de nuevo por si se te pasó mi mensaje. Sigo con espacio para tu asesoría gratis de 30 minutos, sin compromiso. ¿Te late que veamos horario?'
where not exists (select 1 from public.plantillas_mensaje where nombre = 'Seguimiento sin respuesta');

insert into public.plantillas_mensaje (nombre, canal, cuerpo)
select 'Reactivación de frío', 'whatsapp',
  'Hola {nombre}, ha pasado tiempo desde que platicamos. Si ya están más cerca de buscar el embarazo, este es un buen momento para resolver el tema del seguro antes del periodo de espera. ¿Seguimos la plática?'
where not exists (select 1 from public.plantillas_mensaje where nombre = 'Reactivación de frío');

-- ---------------------------------------------------------------------------
-- 3) Ajustes nuevos: titular y CTA editables desde /admin (vacíos = usa
--    el valor por defecto de lib/landing-content.ts).
-- ---------------------------------------------------------------------------
insert into public.ajustes (clave, valor) values
  ('hero_titulo', ''),
  ('hero_cta', '')
on conflict (clave) do nothing;
