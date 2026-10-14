-- ============================================================================
-- STAND BY — nueva etapa del embudo y fuera la etapa «Contactado»
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada. Requiere 0001.)
--
-- Qué hace:
--  1) Los prospectos que siguieran en «Contactado» pasan a «Nuevo» (hoy no hay ninguno).
--  2) La regla de etapas de "leads" ahora acepta «Stand by» (ya decidió, falta
--     información para cerrar) y deja de aceptar «Contactado».
--  3) Si ya habías corrido 0012 (mensajes de Sofi), pone al día sus situaciones:
--     «Stand by» entra y «Contactado» sale (si habías personalizado ese mensaje, se quita).
--
-- Tus datos NO se pierden: solo se cambia la regla que dice qué etapas existen.
-- ============================================================================

update public.leads set etapa = 'nuevo' where etapa = 'contactado';

alter table public.leads drop constraint if exists leads_etapa_check;
alter table public.leads
  add constraint leads_etapa_check
  check (etapa in ('nuevo', 'cita', 'propuesta', 'stand_by', 'ganado', 'perdido'));

do $$
begin
  if to_regclass('public.seguimiento_mensajes') is not null then
    delete from public.seguimiento_mensajes where motivo = 'contactado';
    alter table public.seguimiento_mensajes drop constraint if exists seguimiento_mensajes_motivo_check;
    alter table public.seguimiento_mensajes
      add constraint seguimiento_mensajes_motivo_check
      check (motivo in ('nuevo', 'cita', 'propuesta', 'stand_by', 'ultimo_intento'));
  end if;
end $$;

-- Para que la API vea el cambio sin esperar.
notify pgrst, 'reload schema';
