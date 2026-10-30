-- ============================================================================
-- COBRANZA DE AUTOS — ¿la póliza va con AXA (Valeri) o con Chubb (Dana)?
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada. Requiere 0001.)
--
-- Qué hace:
--  Agrega a "leads" la columna cobranza_aseguradora, donde el CRM anota con qué aseguradora
--  llevas la cobranza de un cliente de Autos: 'axa' (la lleva Valeri) o 'chubb' (la lleva Dana).
--  Al marcar GANADO a un cliente de Autos, el CRM te pregunta cuál y guarda tu respuesta aquí.
--
-- Tus datos NO se pierden: solo se agrega una columna vacía (null = todavía no lo decides).
-- ============================================================================

alter table public.leads
  add column if not exists cobranza_aseguradora text
  check (cobranza_aseguradora in ('axa', 'chubb'));

-- Para que la API vea el cambio sin esperar.
notify pgrst, 'reload schema';
