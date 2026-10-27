-- ============================================================================
-- CONTACTO COMPARTIDO — dos prospectos distintos pueden usar el mismo WhatsApp o correo
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada. Requiere 0001 y 0002.)
--
-- Qué hace:
--  1) Quita la regla que prohibía repetir WhatsApp o correo en "leads". Una pareja, los
--     hijos o la oficina comparten número y son personas distintas.
--  2) Deja índices normales (no únicos) para que las búsquedas sigan siendo rápidas.
--
-- Tus datos NO se pierden. El aviso de "posible duplicado" ahora lo hace la app mirando
-- también el nombre: solo avisa si el WhatsApp o correo coincide Y el nombre se parece.
-- ============================================================================

drop index if exists public.leads_correo_uniq;
drop index if exists public.leads_whatsapp_uniq;
drop index if exists public.leads_telefono_uniq;

create index if not exists leads_correo_idx
  on public.leads (correo) where correo <> '';
create index if not exists leads_whatsapp_idx
  on public.leads (whatsapp) where whatsapp <> '';

-- Para que la API vea el cambio sin esperar.
notify pgrst, 'reload schema';
