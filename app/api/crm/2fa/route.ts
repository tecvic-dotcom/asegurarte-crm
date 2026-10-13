import QRCode from "qrcode";
import { firmarSesion } from "@/lib/auth";
import { guardarMfa, leerUsuarioMfa } from "@/lib/db";
import { rateLimit, ipDe } from "@/lib/rate-limit";
import { MigracionPendienteError } from "@/lib/migracion";
import { generarSecretoTotp, uriOtpauth, verificarTotp } from "@/lib/totp";
import {
  BLOQUEO_MIN,
  EMISOR,
  MAX_FALLOS,
  cifrarSecreto,
  consumirCodigoRespaldo,
  descifrarSecreto,
  generarCodigosRespaldo,
  preauthDesdeRequest,
} from "@/lib/mfa";
import { borrarCookieMfa, cookieSesion, jsonConCookies } from "@/lib/cookies-auth";
import type { EstadoMfa, Usuario } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SIN_CACHE = { "cache-control": "no-store" };

function json(cuerpo: unknown, status = 200): Response {
  return Response.json(cuerpo, { status, headers: SIN_CACHE });
}

/** "reinicia" le dice a la pantalla que vuelva al primer paso (correo y contraseña). */
function reinicia(error: string, status = 401): Response {
  return json({ error, reinicia: true }, status);
}

/** Termina el login: entrega la sesión de verdad y tira el gafete a medias. */
function entrar(req: Request, u: Usuario, extra: Record<string, unknown> = {}): Response {
  const sesion = { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol };
  const token = firmarSesion(sesion);
  if (!token) {
    return json({ error: "Falta configurar APP_SESSION_SECRET en el servidor (Vercel → Environment Variables)." }, 500);
  }
  return jsonConCookies({ sesion, ...extra }, [cookieSesion(token, req), borrarCookieMfa(req)]);
}

/** Un código mal puesto: cuenta el fallo y, al pasar el límite, bloquea el segundo paso unos minutos. */
async function fallo(u: Usuario, mfa: EstadoMfa): Promise<Response> {
  const fallos = mfa.fallos + 1;
  if (fallos >= MAX_FALLOS) {
    const hasta = new Date(Date.now() + BLOQUEO_MIN * 60_000).toISOString();
    await guardarMfa(u.id, { fallos: 0, bloqueoHasta: hasta });
    return json({ error: `Demasiados códigos incorrectos. Por seguridad, espera ${BLOQUEO_MIN} minutos.` }, 429);
  }
  await guardarMfa(u.id, { fallos });
  const quedan = MAX_FALLOS - fallos;
  return json({ error: `Código incorrecto. Te ${quedan === 1 ? "queda 1 intento" : `quedan ${quedan} intentos`}.` }, 401);
}

/**
 * Login, SEGUNDO paso (necesita la verificación a medias que deja /api/crm/login).
 *  POST { accion: "iniciar" }                 → primera vez: genera el QR para enlazar la app.
 *  POST { accion: "confirmar", codigo }       → primera vez: comprueba el primer código, activa el 2FA,
 *                                               entrega la sesión y los 10 códigos de respaldo.
 *  POST { accion: "verificar", codigo }       → siguientes veces: código de la app (6 dígitos) o de respaldo.
 */
export async function POST(req: Request): Promise<Response> {
  const ip = ipDe(req);
  if (!rateLimit(`2fa:${ip}`, 20, 60_000)) return json({ error: "Demasiados intentos. Espera un minuto." }, 429);

  const pre = preauthDesdeRequest(req);
  if (!pre) return reinicia("Tu verificación venció. Escribe otra vez tu correo y tu contraseña.");

  let accion = "";
  let codigo = "";
  try {
    const b = (await req.json()) as { accion?: string; codigo?: string };
    accion = String(b.accion ?? "");
    codigo = String(b.codigo ?? "").slice(0, 32);
  } catch {
    return json({ error: "Petición inválida" }, 400);
  }

  try {
    const datos = await leerUsuarioMfa(pre.id);
    if (!datos) return reinicia("Tu verificación venció. Escribe otra vez tu correo y tu contraseña.");
    const { usuario, mfa } = datos;

    if (accion !== "iniciar" && accion !== "confirmar" && accion !== "verificar") return json({ error: "Acción no reconocida" }, 400);

    // Bloqueado es bloqueado: ni código, ni QR nuevo, hasta que pase el tiempo.
    if (mfa.bloqueoHasta && Date.parse(mfa.bloqueoHasta) > Date.now()) {
      const min = Math.max(1, Math.ceil((Date.parse(mfa.bloqueoHasta) - Date.now()) / 60_000));
      return json({ error: `Demasiados códigos incorrectos. Espera ${min} ${min === 1 ? "minuto" : "minutos"} e inténtalo de nuevo.` }, 429);
    }

    if (accion === "iniciar") {
      // Solo mientras NO tenga el 2FA activo: si no, quien sepa la contraseña podría cambiar el celular ajeno.
      if (mfa.activo) return reinicia("Tu doble factor ya está activo. Entra con el código de tu app.", 409);
      const secreto = generarSecretoTotp();
      const cifrado = cifrarSecreto(secreto);
      if (!cifrado) return json({ error: "Falta configurar APP_SESSION_SECRET en el servidor." }, 500);
      // Los fallos y el bloqueo NO se tocan aquí: pedir otro QR no sirve para saltarse el límite de intentos.
      await guardarMfa(usuario.id, { activo: false, secreto: cifrado, ultimoPaso: 0, respaldo: [] });
      const uri = uriOtpauth({ secreto, cuenta: usuario.correo, emisor: EMISOR });
      const qr = await QRCode.toDataURL(uri, { margin: 2, width: 240, errorCorrectionLevel: "M" });
      return json({ qr, secreto, uri });
    }

    if (accion === "confirmar") {
      if (mfa.activo) return reinicia("Tu doble factor ya está activo. Entra con el código de tu app.", 409);
      const secreto = mfa.secreto ? descifrarSecreto(mfa.secreto) : null;
      if (!secreto) return json({ error: "Primero genera el código QR (recarga esta pantalla)." }, 400);
      const v = verificarTotp(secreto, codigo, Date.now(), 0);
      if (!v.ok) return fallo(usuario, mfa);
      const resp = generarCodigosRespaldo();
      if (!resp) return json({ error: "Falta configurar APP_SESSION_SECRET en el servidor." }, 500);
      await guardarMfa(usuario.id, { activo: true, ultimoPaso: v.paso, fallos: 0, bloqueoHasta: null, respaldo: resp.huellas });
      return entrar(req, usuario, { codigos: resp.claros });
    }

    // verificar
    if (!mfa.activo) return reinicia("Todavía no enlazas tu app. Vuelve a entrar con tu correo y contraseña.", 409);
    if (/^\d{6}$/.test(codigo.replace(/\s/g, ""))) {
      const secreto = descifrarSecreto(mfa.secreto);
      if (!secreto) {
        return json({ error: "No pude leer tu doble factor. Pide a un administrador que lo restablezca, o usa un código de respaldo." }, 500);
      }
      const v = verificarTotp(secreto, codigo, Date.now(), mfa.ultimoPaso);
      if (!v.ok) return fallo(usuario, mfa);
      await guardarMfa(usuario.id, { ultimoPaso: v.paso, fallos: 0, bloqueoHasta: null });
      return entrar(req, usuario);
    }
    const resto = consumirCodigoRespaldo(mfa.respaldo, codigo);
    if (!resto) return fallo(usuario, mfa);
    await guardarMfa(usuario.id, { respaldo: resto, fallos: 0, bloqueoHasta: null });
    return entrar(req, usuario, { respaldoRestantes: resto.length });
  } catch (e) {
    if (e instanceof MigracionPendienteError) return json({ error: e.message }, 500);
    return json({ error: "Error del servidor. Intenta de nuevo." }, 500);
  }
}
