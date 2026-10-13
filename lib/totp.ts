import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Códigos de un solo uso por tiempo (TOTP, RFC 6238) — lo que muestran Google Authenticator,
 * Microsoft Authenticator, Authy, 1Password… Sin dependencias: solo node:crypto.
 *
 * Analogía: tu celular y el servidor comparten un secreto (la «receta»). Cada 30 segundos los dos
 * cocinan el mismo número de 6 dígitos con esa receta y la hora; si coinciden, de verdad tienes el celular.
 */

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; // base32 (RFC 4648)
export const PASO_SEG = 30;
export const DIGITOS = 6;
/** Tolerancia al reloj del celular: acepta el código anterior y el siguiente (±30 s). */
const VENTANA = 1;

export function base32Codificar(datos: Buffer): string {
  let bits = 0;
  let valor = 0;
  let salida = "";
  for (const byte of datos) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      salida += ALFABETO[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) salida += ALFABETO[(valor << (5 - bits)) & 31];
  return salida;
}

export function base32Decodificar(texto: string): Buffer {
  const limpio = texto.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let valor = 0;
  const bytes: number[] = [];
  for (const c of limpio) {
    const i = ALFABETO.indexOf(c);
    if (i < 0) throw new Error("Secreto base32 inválido.");
    valor = (valor << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Secreto nuevo: 20 bytes aleatorios (160 bits, el tamaño que recomienda el RFC) en base32. */
export function generarSecretoTotp(): string {
  return base32Codificar(randomBytes(20));
}

/** El código de 6 dígitos de un paso de tiempo (RFC 4226 con truncado dinámico). */
export function codigoTotp(secretoBase32: string, paso: number, digitos = DIGITOS): string {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(paso));
  const h = createHmac("sha1", base32Decodificar(secretoBase32)).update(contador).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 10 ** digitos).padStart(digitos, "0");
}

export function pasoDe(ahoraMs: number): number {
  return Math.floor(ahoraMs / 1000 / PASO_SEG);
}

function iguales(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Revisa el código que escribió la persona. Devuelve el paso de tiempo que coincidió.
 * `ultimoPaso` evita reusar un código ya aceptado: aunque alguien lo espíe, no le sirve dos veces.
 */
export function verificarTotp(
  secretoBase32: string,
  entrada: string,
  ahoraMs: number,
  ultimoPaso = 0,
): { ok: true; paso: number } | { ok: false } {
  const codigo = entrada.replace(/\s/g, "");
  if (!/^\d{6}$/.test(codigo)) return { ok: false };
  const actual = pasoDe(ahoraMs);
  let acierto = 0;
  // Se recorren TODAS las ventanas sin cortar al primer acierto (tiempo parejo).
  for (let d = -VENTANA; d <= VENTANA; d++) {
    const paso = actual + d;
    if (paso > ultimoPaso && iguales(codigoTotp(secretoBase32, paso), codigo)) acierto = Math.max(acierto, paso);
  }
  return acierto ? { ok: true, paso: acierto } : { ok: false };
}

/** El enlace que se vuelve QR: la app autenticadora lo lee y guarda la cuenta. */
export function uriOtpauth(o: { secreto: string; cuenta: string; emisor: string }): string {
  const etiqueta = `${encodeURIComponent(o.emisor)}:${encodeURIComponent(o.cuenta)}`;
  const params = new URLSearchParams({
    secret: o.secreto,
    issuer: o.emisor,
    algorithm: "SHA1",
    digits: String(DIGITOS),
    period: String(PASO_SEG),
  });
  return `otpauth://totp/${etiqueta}?${params.toString()}`;
}
