# Doble factor + captcha en tu CRM

**Analogía:** antes tu CRM tenía una sola cerradura (la contraseña). Ahora tiene tres:
1. **Captcha** (Cloudflare Turnstile): comprueba que quien toca la puerta es una persona y no un robot probando contraseñas.
2. **Tu contraseña**, como siempre.
3. **Un código de 6 dígitos de tu celular** (app autenticadora), que cambia cada 30 segundos. Aunque alguien robe tu contraseña, sin tu celular no entra.

## Cómo se usa
- **Primera vez:** entras con correo y contraseña → el CRM te muestra un **QR** → lo escaneas con *Google Authenticator* o *Microsoft Authenticator* (gratis) → escribes el código de 6 dígitos → guardas tus **10 códigos de respaldo** (se muestran una sola vez).
- **Siguientes veces:** correo y contraseña → código de 6 dígitos (se envía solo al escribir el sexto dígito).
- **Es obligatorio para todos** los usuarios (también los que crees después).
- Al publicar esta versión, **todos tienen que volver a iniciar sesión** (las sesiones anteriores dejan de valer).

## Si pierdes o cambias tu celular
1. En la pantalla del código toca **«No tengo mi celular»** y usa uno de tus **códigos de respaldo** (cada uno sirve una sola vez).
2. Ya dentro: **Panel de admin → Usuarios → ícono de llave** junto a tu nombre («Restablecer doble factor»).
3. En tu próximo ingreso enlazas la app nueva y recibes códigos de respaldo nuevos.

Si eres vendedor y perdiste todo, un administrador te restablece el 2FA desde ese mismo botón.

## Seguridad que trae
- 5 códigos mal puestos seguidos → bloqueo de 15 minutos.
- Un código ya usado no sirve otra vez.
- El secreto de tu celular se guarda **cifrado** en la base; los códigos de respaldo se guardan solo como huellas.
- El panel `/admin` suelto con código fijo (`ADMIN_CODE`) **se eliminó**: se saltaba la contraseña y el doble factor. Ahora `/admin` te lleva al CRM, y el «Panel de admin» del menú exige sesión de administrador con 2FA.

## Cómo poner el captcha (una sola vez, 5 minutos, gratis)
1. Crea una cuenta gratis en https://dash.cloudflare.com y abre **Turnstile → Add widget**.
2. Nombre: `Asegurarte CRM`. En **Hostname** agrega tu dominio (`www.especialistaenasegurarte.lat`) y `asegurarte-crm.vercel.app`. Modo: **Managed**.
3. Copia la **Site Key** (pública) y la **Secret Key** (secreta).
4. En Vercel → tu proyecto → Settings → Environment Variables (Production) agrega:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = la Site Key
   - `TURNSTILE_SECRET_KEY` = la Secret Key
5. **Redeploy**. Mientras no pongas las dos llaves, el login funciona sin captcha; en cuanto las pongas, el captcha es obligatorio.

## Orden para publicar (importante)
1. **Primero** corre `supabase/migrations/0014_doble_factor.sql` en Supabase → SQL Editor → New query → Run.
   (Si se publica antes, el login avisa que falta ese paso y nadie entra hasta correrlo.)
2. (Opcional, recomendado) Pon las llaves del captcha en Vercel.
3. Publica. Entra, enlaza tu celular y **guarda tus códigos de respaldo**.
4. No cambies `APP_SESSION_SECRET` después: con él se cifra el secreto de cada celular; si cambia, habría que restablecer el 2FA de todos.
