import "server-only";
import { pbkdf2Sync, randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import type { Sesion } from "./types";

/**
 * Autenticación REAL del CRM (no la "demo sin contraseña" del repo de origen).
 * Como aquí hay PII de terceros (tus clientes), exigimos contraseña:
 *  - Las contraseñas se guardan HASHEADAS con PBKDF2 + salt único (nunca en claro).
 *  - La sesión es una cookie FIRMADA con HMAC-SHA256 (no se puede falsificar).
 *
 * Falla cerrado en producción: sin APP_SESSION_SECRET no se puede iniciar sesión.
 * En desarrollo/local usa un secreto temporal para que puedas probar el demo.
 */

const ITER = 310_000; // ≥ recomendación NIST-2023 para PBKDF2-HMAC-SHA256
const KEYLEN = 32;
const DIGEST = "sha256";

export const COOKIE_SESION = "acm_sess";
export const SESION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

function secret(): string | null {
  const s = process.env.APP_SESSION_SECRET;
  if (s && s.length >= 16) return s;
  // Permitimos el demo local sin configurar nada; en producción es obligatorio.
  if (process.env.NODE_ENV !== "production") {
    return "dev-only-insecure-secret-cambialo-en-produccion-32c";
  }
  return null;
}

/** Genera hash + salt para guardar una contraseña nueva. */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, ITER, KEYLEN, DIGEST).toString("hex");
  return { hash, salt };
}

/** Verifica una contraseña contra el hash guardado (comparación constante). */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  if (!hash || !salt) return false;
  try {
    const calc = pbkdf2Sync(password, salt, ITER, KEYLEN, DIGEST);
    const stored = Buffer.from(hash, "hex");
    if (stored.length !== calc.length) return false;
    return timingSafeEqual(stored, calc);
  } catch {
    return false;
  }
}

/** Firma la sesión en un token `payload.firma`. Null si no hay secreto. */
export function firmarSesion(sesion: Sesion): string | null {
  const sec = secret();
  if (!sec) return null;
  const payload = Buffer.from(JSON.stringify(sesion)).toString("base64url");
  const firma = createHmac("sha256", sec).update(payload).digest("base64url");
  return `${payload}.${firma}`;
}

/** Lee y verifica un token de sesión. Null si es inválido o fue manipulado. */
export function leerSesion(token: string | null | undefined): Sesion | null {
  const sec = secret();
  if (!sec || !token) return null;
  const [payload, firma] = token.split(".");
  if (!payload || !firma) return null;
  const esperado = createHmac("sha256", sec).update(payload).digest("base64url");
  const a = Buffer.from(firma);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as Sesion;
  } catch {
    return null;
  }
}

/** Extrae la sesión desde la cookie de una Request entrante. */
export function sesionDesdeRequest(req: Request): Sesion | null {
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)acm_sess=([^;]+)/);
  return m ? leerSesion(decodeURIComponent(m[1])) : null;
}
