/**
 * Normalización de identidad — pura, sin dependencias de cliente/servidor.
 * Se usa en el navegador (validación) y en el servidor (guardado) para que la
 * deduplicación "un solo registro por persona" sea idéntica en ambos lados.
 */

/** Correo en minúsculas, sin espacios. */
export function normCorreo(v: string): string {
  return (v ?? "").trim().toLowerCase();
}

/** WhatsApp a solo dígitos, quedándonos con los últimos 10 (formato MX). */
export function normWhatsapp(v: string): string {
  const digitos = (v ?? "").replace(/\D+/g, "");
  return digitos.length > 10 ? digitos.slice(-10) : digitos;
}

/** Código postal MX: solo dígitos, 5 cifras. */
export function normCodigoPostal(v: string): string {
  return (v ?? "").replace(/\D+/g, "").slice(0, 5);
}
