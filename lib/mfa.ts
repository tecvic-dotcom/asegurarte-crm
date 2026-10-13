import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { derivarClave } from "./auth";

/**
 * Piezas del doble factor y del captcha — SOLO SERVIDOR.
 *
 * Analogía: el login ahora es un edificio con dos puertas. La primera (contraseña + captcha) te deja en el
 * pasillo con un gafete que dura 5 minutos (la cookie «a medias»); la segunda (el código de tu celular) te da
 * la credencial de verdad (la sesión). El gafete a medias NO abre nada del CRM.
 */

export const COOKIE_MFA = "acm_2fa";
export const MFA_VIGENCIA_SEG = 5 * 60;
export const EMISOR = "Asegurarte CRM";
/** Fallos seguidos que bloquean el segundo paso, y por cuánto tiempo. */
export const MAX_FALLOS = 5;
export const BLOQUEO_MIN = 15;
export const CODIGOS_RESPALDO = 10;

// ----------------------------------------------------------------------------
// Verificación a medias (después de la contraseña, antes del código)
// ----------------------------------------------------------------------------

function firma(clave: Buffer, payload: string): string {
  return createHmac("sha256", clave).update(payload).digest("base64url");
}

/** Gafete firmado `payload.firma` con el id de la persona y su vencimiento. Null si falta APP_SESSION_SECRET. */
export function firmarPreauth(id: string, ahora = Date.now()): string | null {
  const clave = derivarClave("preauth");
  if (!clave) return null;
  const payload = Buffer.from(JSON.stringify({ id, exp: ahora + MFA_VIGENCIA_SEG * 1000 })).toString("base64url");
  return `${payload}.${firma(clave, payload)}`;
}

export function leerPreauth(token: string | null | undefined, ahora = Date.now()): { id: string } | null {
  const clave = derivarClave("preauth");
  if (!clave || !token) return null;
  const [payload, f] = token.split(".");
  if (!payload || !f) return null;
  const a = Buffer.from(f);
  const b = Buffer.from(firma(clave, payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, "base64url").toString()) as { id?: unknown; exp?: unknown };
    if (typeof d.id !== "string" || typeof d.exp !== "number" || d.exp < ahora) return null;
    return { id: d.id };
  } catch {
    return null;
  }
}

export function preauthDesdeRequest(req: Request): { id: string } | null {
  const m = (req.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${COOKIE_MFA}=([^;]+)`));
  return m ? leerPreauth(decodeURIComponent(m[1])) : null;
}

// ----------------------------------------------------------------------------
// El secreto del celular, cifrado en la base (AES-256-GCM)
// ----------------------------------------------------------------------------

/** `v1.iv.etiqueta.cifrado`. Así, aunque alguien viera la tabla de usuarios, no leería los secretos. */
export function cifrarSecreto(texto: string): string | null {
  const clave = derivarClave("totp-secreto");
  if (!clave) return null;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", clave, iv);
  const cifrado = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), cifrado.toString("base64url")].join(".");
}

export function descifrarSecreto(guardado: string): string | null {
  const clave = derivarClave("totp-secreto");
  const [v, iv, tag, cifrado] = guardado.split(".");
  if (!clave || v !== "v1" || !iv || !tag || !cifrado) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", clave, Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(cifrado, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// Códigos de respaldo (por si se pierde el celular): 10, de un solo uso
// ----------------------------------------------------------------------------

// Alfabeto Crockford (sin I, L, O, U): 32 símbolos exactos = 5 bits cada uno, sin sesgo al sortear.
const SIMBOLOS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Mayúsculas, sin guiones/espacios y con las confusiones típicas al copiar a mano (O→0, I y L→1). */
function normalizarRespaldo(texto: string): string {
  return texto
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

function huellaRespaldo(codigo: string): string | null {
  const clave = derivarClave("respaldo");
  return clave ? createHmac("sha256", clave).update(normalizarRespaldo(codigo)).digest("hex") : null;
}

/** `claros` se muestran UNA sola vez; en la base solo se guardan las `huellas`. */
export function generarCodigosRespaldo(): { claros: string[]; huellas: string[] } | null {
  const claros: string[] = [];
  const huellas: string[] = [];
  while (claros.length < CODIGOS_RESPALDO) {
    const bytes = randomBytes(10);
    let c = "";
    for (const b of bytes) c += SIMBOLOS[b & 31];
    const claro = `${c.slice(0, 5)}-${c.slice(5)}`;
    const h = huellaRespaldo(claro);
    if (!h) return null;
    if (huellas.includes(h)) continue;
    claros.push(claro);
    huellas.push(h);
  }
  return { claros, huellas };
}

/** Si el código es uno de los guardados, devuelve la lista SIN ese (se quema); si no, null. */
export function consumirCodigoRespaldo(huellas: string[], entrada: string): string[] | null {
  if (normalizarRespaldo(entrada).length !== 10) return null;
  const h = huellaRespaldo(entrada);
  if (!h) return null;
  const hb = Buffer.from(h);
  let encontrado = -1;
  huellas.forEach((x, i) => {
    const xb = Buffer.from(x);
    if (xb.length === hb.length && timingSafeEqual(xb, hb)) encontrado = i;
  });
  return encontrado < 0 ? null : huellas.filter((_, i) => i !== encontrado);
}

// ----------------------------------------------------------------------------
// Captcha (Cloudflare Turnstile)
// ----------------------------------------------------------------------------

const URL_TURNSTILE = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Se exige solo si están las DOS llaves (la pública del navegador y la secreta del servidor). Así, mientras
 * no las pongas en Vercel, el login sigue funcionando; en cuanto las pongas, el captcha es obligatorio.
 */
export function captchaActivo(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

/** "ok" = lo resolvió una persona · "falla" = token inválido/vencido/repetido · "error" = no pude consultar a Cloudflare. */
export async function verificarCaptcha(token: string, ip: string): Promise<"ok" | "falla" | "error"> {
  const secreto = process.env.TURNSTILE_SECRET_KEY;
  if (!secreto) return "error";
  if (!token || token.length > 2048) return "falla";
  try {
    const cuerpo = new URLSearchParams({ secret: secreto, response: token });
    if (ip && ip !== "anon") cuerpo.set("remoteip", ip);
    const r = await fetch(URL_TURNSTILE, { method: "POST", body: cuerpo, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return "error";
    const d = (await r.json()) as { success?: boolean };
    return d.success === true ? "ok" : "falla";
  } catch {
    return "error";
  }
}
