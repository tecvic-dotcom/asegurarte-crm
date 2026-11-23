-- ============================================================================
-- MIS PENDIENTES — resumen del día por Telegram cada mañana (8:00 a. m.)
--
-- Cómo aplicar: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- (Idempotente: puedes correrlo varias veces. Necesita antes la 0028, porque
-- usa el mismo bot y las mismas claves guardadas en el Vault.)
--
-- Qué manda: lo de hoy con hora (en orden), lo de hoy sin hora y lo atrasado.
-- Si no tienes nada anotado, te lo dice para que planees tu día.
-- ============================================================================

create or replace function public.resumen_pendientes_telegram()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_chat  text;
  v_hoy   date := (now() at time zone 'America/Monterrey')::date;
  v_dias  text[] := array['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  v_meses text[] := array['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  v_con   text := '';
  v_sin   text := '';
  v_atr   text := '';
  v_n_con integer := 0;
  v_n_sin integer := 0;
  v_n_atr integer := 0;
  v_texto text;
  r       record;
begin
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'telegram_bot_token' limit 1;
  select decrypted_secret into v_chat  from vault.decrypted_secrets where name = 'telegram_chat_id'   limit 1;
  if coalesce(v_token, '') = '' or coalesce(v_chat, '') = '' then
    return 0;
  end if;

  -- Hoy, con hora (en orden de hora).
  for r in
    select p.texto, p.hora, l.nombre
      from public.pendientes p left join public.leads l on l.id = p.lead_id
     where p.hecho = false and p.fecha = v_hoy and p.hora is not null
     order by p.hora, p.creado_en
  loop
    v_n_con := v_n_con + 1;
    if v_n_con <= 25 then
      v_con := v_con || chr(10) || '• ' || to_char(r.hora::time, 'FMHH12:MI')
            || case when r.hora::time < time '12:00' then ' a. m.' else ' p. m.' end
            || ' — ' || r.texto
            || case when r.nombre is not null then ' (👤 ' || r.nombre || ')' else '' end;
    end if;
  end loop;
  if v_n_con > 25 then v_con := v_con || chr(10) || '… y ' || (v_n_con - 25) || ' más'; end if;

  -- Hoy, sin hora (en el orden en que los acomodaste).
  for r in
    select p.texto, l.nombre
      from public.pendientes p left join public.leads l on l.id = p.lead_id
     where p.hecho = false and p.fecha = v_hoy and p.hora is null
     order by p.orden nulls last, p.creado_en
  loop
    v_n_sin := v_n_sin + 1;
    if v_n_sin <= 25 then
      v_sin := v_sin || chr(10) || '• ' || r.texto
            || case when r.nombre is not null then ' (👤 ' || r.nombre || ')' else '' end;
    end if;
  end loop;
  if v_n_sin > 25 then v_sin := v_sin || chr(10) || '… y ' || (v_n_sin - 25) || ' más'; end if;

  -- Atrasados (de días anteriores, sin completar), del más viejo al más nuevo.
  for r in
    select p.texto, p.fecha
      from public.pendientes p
     where p.hecho = false and p.fecha < v_hoy
     order by p.fecha, p.creado_en
  loop
    v_n_atr := v_n_atr + 1;
    if v_n_atr <= 10 then
      v_atr := v_atr || chr(10) || '• ' || r.texto
            || ' (' || extract(day from r.fecha)::int || ' ' || substr(v_meses[extract(month from r.fecha)::int], 1, 3) || ')';
    end if;
  end loop;
  if v_n_atr > 10 then v_atr := v_atr || chr(10) || '… y ' || (v_n_atr - 10) || ' más'; end if;

  v_texto := '☀️ Buenos días, Roberto' || chr(10)
          || 'Tu ' || v_dias[extract(dow from v_hoy)::int + 1] || ' ' || extract(day from v_hoy)::int
          || ' de ' || v_meses[extract(month from v_hoy)::int] || ':';

  if v_n_con + v_n_sin = 0 then
    v_texto := v_texto || chr(10) || chr(10) || 'Hoy no tienes pendientes anotados. Buen momento para planear tu día en el CRM.';
  end if;
  if v_n_con > 0 then
    v_texto := v_texto || chr(10) || chr(10) || '🕐 Con hora (' || v_n_con || '):' || v_con;
  end if;
  if v_n_sin > 0 then
    v_texto := v_texto || chr(10) || chr(10) || '📝 Sin hora (' || v_n_sin || '):' || v_sin;
  end if;
  if v_n_atr > 0 then
    v_texto := v_texto || chr(10) || chr(10) || '⚠️ Atrasados (' || v_n_atr || '):' || v_atr;
  end if;

  perform net.http_post(
    url     := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
    body    := jsonb_build_object('chat_id', v_chat, 'text', left(v_texto, 4000)),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return 1;
end;
$$;

revoke all on function public.resumen_pendientes_telegram() from public, anon, authenticated;

-- 14:00 UTC = 8:00 a. m. en Monterrey (sin horario de verano). Todos los días.
select cron.schedule('resumen-pendientes-telegram', '0 14 * * *', $cron$select public.resumen_pendientes_telegram()$cron$);

-- ============================================================================
-- Probarlo ahora mismo (te llega el resumen de inmediato):
--   select public.resumen_pendientes_telegram();
-- Cambiar la hora (ej. 7:00 a. m. = 13 UTC):
--   select cron.schedule('resumen-pendientes-telegram', '0 13 * * *', $c$select public.resumen_pendientes_telegram()$c$);
-- Apagarlo:   select cron.unschedule('resumen-pendientes-telegram');
-- ============================================================================
