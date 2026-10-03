/**
 * Validación de formularios — pura, se usa en CLIENTE y en SERVIDOR.
 * Zod no está instalado en este kit: validamos a mano (mismo criterio en ambos
 * lados) siguiendo el patrón del repo madre. Mensajes en español amable.
 */
import { normCorreo, normWhatsapp } from "./normalize";
import type { NuevoLead } from "./types";

// Correo: patrón práctico cercano a RFC 5322 (suficiente y sin falsos negativos
// comunes). No intentamos validar TODOS los casos raros del RFC a propósito.
const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validarCorreo(v: string): boolean {
  return RE_CORREO.test(normCorreo(v));
}

/** WhatsApp MX: 10 dígitos tras normalizar (acepta +52 / 521 / espacios). */
export function validarWhatsappMX(v: string): boolean {
  return normWhatsapp(v).length === 10;
}

export function validarNombre(v: string): boolean {
  return (v ?? "").trim().length >= 2;
}

/** Código postal MX: exactamente 5 dígitos. */
export function validarCodigoPostal(v: string): boolean {
  return /^\d{5}$/.test((v ?? "").trim());
}

export interface ResultadoValidacion {
  ok: boolean;
  errores: Record<string, string>;
}

/**
 * Valida el lead de la página de captura. Devuelve errores por campo para
 * pintarlos junto a cada input. Mismo criterio en cliente y servidor.
 */
export function validarLead(input: NuevoLead): ResultadoValidacion {
  const errores: Record<string, string> = {};

  if (!validarNombre(input.nombre)) {
    errores.nombre = "Escribe tu nombre (al menos 2 letras).";
  }
  if (!validarCorreo(input.correo)) {
    errores.correo = "Revisa tu correo, parece que falta algo (ejemplo: nombre@correo.com).";
  }
  if (!validarWhatsappMX(input.whatsapp)) {
    errores.whatsapp = "Tu WhatsApp debe tener 10 dígitos (puedes incluir +52).";
  }

  return { ok: Object.keys(errores).length === 0, errores };
}
