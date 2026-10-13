-- ============================================================================
-- PRIMER PAGO — en pólizas que no se pagan de contado, el primer recibo suele
-- costar distinto a los siguientes porque lleva el derecho de póliza.
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada. Requiere 0004.)
--
-- ⚠️ ORDEN: corre este SQL ANTES de publicar la versión con «Primer pago». Si se
-- publica primero, guardar o editar una póliza en Valeri avisará que falta este
-- paso hasta que lo corras (leer tu cartera y marcar «Pagó» sí seguirían bien).
--
-- Qué hace: agrega a "polizas" dos columnas.
--   primer_pago            lo que cuesta el PRIMER recibo de la vigencia (con derecho
--                          de póliza). 0 = no aplica: todos los pagos son iguales.
--   primer_pago_pendiente  true = el próximo pago que toca cobrar ES ese primer
--                          pago. Al marcar «Pagó» en Valeri pasa a false y Valeri
--                          cobra los subsecuentes; al renovar vuelve a true.
-- "monto_pago" (que ya existía) pasa a ser el monto de los pagos SUBSECUENTES
-- (en pólizas anuales sigue siendo el único pago).
--
-- Tus pólizas actuales quedan igual: primer_pago = 0 y pendiente = false.
--
-- 🔒 Mismo candado que el resto: RLS ya está ACTIVADO en "polizas" y SIN
-- políticas públicas. Solo tu servidor entra, con la secret key.
-- ============================================================================

alter table public.polizas
  add column if not exists primer_pago           numeric(14, 2) not null default 0 check (primer_pago >= 0),
  add column if not exists primer_pago_pendiente boolean        not null default false;

-- Que la API vea las columnas nuevas de inmediato.
notify pgrst, 'reload schema';
