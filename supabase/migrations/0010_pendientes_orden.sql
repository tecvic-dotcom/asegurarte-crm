-- ============================================================================
-- MIS PENDIENTES — orden a mano (arrastrar para poner arriba lo más importante)
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada. Necesita antes
-- la migración 0009 porque modifica la tabla "pendientes".)
--
-- Qué hace: agrega la columna "orden" a "pendientes". Cuando arrastras un
-- pendiente dentro de su día, se guarda su lugar aquí. Si está vacía, el
-- pendiente sale por hora y por cuándo lo anotaste, como siempre.
-- ============================================================================

alter table public.pendientes add column if not exists orden integer;

-- Para que la API vea la columna nueva sin esperar.
notify pgrst, 'reload schema';
