import "server-only";
import { COOKIE_SESION, SESION_MAX_AGE } from "./auth";
import { COOKIE_MFA, MFA_VIGENCIA_SEG } from "./mfa";

/** Cookies del login (sesión y verificación a medias). Todas HttpOnly: el JavaScript de la página no las ve. */

function esSeguro(req: Request): boolean {
  return req.headers.get("x-forwarded-proto") === "https" || new URL(req.url).protocol === "https:";
}

function secure(req: Request): string {
  return esSeguro(req) ? " Secure;" : "";
}

/** La sesión de verdad (se entrega solo al terminar el segundo paso). */
export function cookieSesion(token: string, req: Request): string {
  return `${COOKIE_SESION}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESION_MAX_AGE};${secure(req)}`;
}

export function borrarCookieSesion(req: Request): string {
  return `${COOKIE_SESION}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0;${secure(req)}`;
}

/** El gafete de 5 minutos entre contraseña y código. Solo viaja a /api/crm y solo desde este mismo sitio. */
export function cookieMfa(token: string, req: Request): string {
  return `${COOKIE_MFA}=${encodeURIComponent(token)}; Path=/api/crm; HttpOnly; SameSite=Strict; Max-Age=${MFA_VIGENCIA_SEG};${secure(req)}`;
}

export function borrarCookieMfa(req: Request): string {
  return `${COOKIE_MFA}=; Path=/api/crm; HttpOnly; SameSite=Strict; Max-Age=0;${secure(req)}`;
}

/** Respuesta JSON con una o varias cookies. */
export function jsonConCookies(cuerpo: unknown, cookies: string[], status = 200): Response {
  const headers = new Headers({ "content-type": "application/json" });
  for (const c of cookies) headers.append("set-cookie", c);
  return new Response(JSON.stringify(cuerpo), { status, headers });
}
