-- ============================================================================
-- MIS PENDIENTES — aviso por Telegram 10 minutos antes de la hora
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces sin romper nada. Necesita antes
-- la 0009 porque usa la tabla "pendientes".)
--
-- Qué hace: cada minuto, tu propia base revisa los pendientes SIN completar
-- que tienen hora. Si faltan 10 minutos o menos (o la hora pasó hace menos de
-- 5), te manda un mensaje por Telegram. Solo uno por pendiente; si le cambias
-- la hora o el día, vuelve a avisarte con la nueva.
--
-- Todo corre dentro de Supabase (pg_cron + pg_net): no toca Vercel ni el CRM.
-- La clave del bot y tu chat NO van aquí: se guardan aparte en el Vault
-- (ver el bloque «CONFIGURACIÓN» al final). Sin esas dos claves no manda nada.
-- ============================================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Qué fecha y hora ya se avisó ("2026-11-23 16:00"). Si cambias la hora, ya no coincide y se vuelve a avisar.
alter table public.pendientes add column if not exists avisado_para text;

create or replace function public.avisar_pendientes_telegram()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_chat  text;
  v_ahora timestamp := (now() at time zone 'America/Monterrey');
  v_n     integer := 0;
  r       record;
  v_lead  text;
  v_min   integer;
  v_cuando text;
  v_hora  text;
  v_texto text;
begin
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'telegram_bot_token' limit 1;
  select decrypted_secret into v_chat  from vault.decrypted_secrets where name = 'telegram_chat_id'   limit 1;
  if coalesce(v_token, '') = '' or coalesce(v_chat, '') = '' then
    return 0; -- sin configurar, no hace nada
  end if;

  -- Aparta y marca en un solo paso los que tocan ahora (así nunca sale doble).
  for r in
    update public.pendientes p
       set avisado_para = p.fecha::text || ' ' || p.hora
     where p.hecho = false
       and p.hora is not null
       and p.fecha between v_ahora::date and v_ahora::date + 1
       and (p.fecha + p.hora::time) between v_ahora - interval '5 minutes' and v_ahora + interval '10 minutes'
       and p.avisado_para is distinct from (p.fecha::text || ' ' || p.hora)
    returning p.id, p.texto, p.fecha, p.hora, p.lead_id
  loop
    v_lead := null;
    if r.lead_id is not null then
      select l.nombre into v_lead from public.leads l where l.id = r.lead_id;
    end if;

    v_min := ceil(extract(epoch from ((r.fecha + r.hora::time) - v_ahora)) / 60.0)::integer;
    v_cuando := case
      when v_min <= 0 then 'Ya es la hora'
      when v_min = 1 then 'En 1 minuto'
      else 'En ' || v_min || ' minutos'
    end;
    v_hora := to_char(r.hora::time, 'FMHH12:MI')
              || case when r.hora::time < time '12:00' then ' a. m.' else ' p. m.' end;

    v_texto := '⏰ ' || v_cuando || ' (' || v_hora || ')' || chr(10)
            || r.texto
            || case when v_lead is not null then chr(10) || '👤 ' || v_lead else '' end;

    perform net.http_post(
      url     := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
      body    := jsonb_build_object('chat_id', v_chat, 'text', v_texto),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

-- Nadie de fuera puede llamarla (solo el reloj interno de la base).
revoke all on function public.avisar_pendientes_telegram() from public, anon, authenticated;

-- El reloj: cada minuto. Si ya existe con este nombre, solo se actualiza.
select cron.schedule('avisos-pendientes-telegram', '* * * * *', $cron$select public.avisar_pendientes_telegram()$cron$);

notify pgrst, 'reload schema';

-- ============================================================================
-- CONFIGURACIÓN (una sola vez, en otra consulta; NO la guardes en este archivo)
--
--   select vault.create_secret('CLAVE_DEL_BOT', 'telegram_bot_token');
--   select vault.create_secret('TU_CHAT_ID',   'telegram_chat_id');
--
-- Para cambiar una después:
--   select vault.update_secret(id, 'NUEVA')
--     from vault.secrets where name = 'telegram_bot_token';
--
-- Para apagar los avisos:   select cron.unschedule('avisos-pendientes-telegram');
-- Para ver si Telegram respondió bien (status_code 200):
--   select status_code, content from net._http_response order by created desc limit 5;
-- ============================================================================
