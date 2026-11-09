/**
 * Guía gratuita «Guía para futuros papás»: reglas COMPARTIDAS entre el formulario (tarjeta /roberto y landing) y el servidor.
 * Sin acceso a base de datos. La guía es un PDF en public/descargas/: se entrega al instante al enviar el formulario.
 */
import { normCorreo, normWhatsapp } from "./normalize";
import { validarCorreo, validarNombre, validarWhatsappMX } from "./validacion";

/**
 * Dirección del PDF. La carpeta lleva un código para que no sea una dirección que cualquiera adivine (la guía se entrega a quien deja sus datos);
 * no se enlaza en ningún otro lado y está fuera de los buscadores (robots.ts y cabecera X-Robots-Tag).
 */
export const URL_GUIA_FUTUROS_PAPAS = "/descargas/f7c41e9a/Guia-para-futuros-papas.pdf";
export const NOMBRE_ARCHIVO_GUIA = "Guia-para-futuros-papas.pdf";

/** Origen con el que llega el prospecto al CRM (cuenta en «Leads por origen»). */
export const ORIGEN_GUIA_FUTUROS_PAPAS = "Guía para futuros papás";

export interface EntradaGuia {
  nombre: unknown;
  whatsapp: unknown;
  correo: unknown;
  consentimiento: unknown;
}

export interface ProspectoGuiaValido {
  ok: boolean;
  errores: Record<string, string>;
  nombre: string;
  whatsapp: string;
  correo: string;
}

/** Un solo renglón, sin caracteres de control, como mucho 80 letras. */
function limpiarNombreGuia(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

/** Nombre, WhatsApp y correo son obligatorios (el WhatsApp para darle seguimiento, el correo por si pierde la descarga) y el aviso de privacidad debe estar aceptado. */
export function validarProspectoGuia(e: EntradaGuia): ProspectoGuiaValido {
  const errores: Record<string, string> = {};
  const nombre = limpiarNombreGuia(e.nombre);
  const whatsapp = normWhatsapp(typeof e.whatsapp === "string" ? e.whatsapp : "");
  const correo = normCorreo(typeof e.correo === "string" ? e.correo : "");
  if (!validarNombre(nombre)) errores.nombre = "Escribe tu nombre (al menos 2 letras).";
  if (!validarWhatsappMX(whatsapp)) errores.whatsapp = "Tu WhatsApp debe tener 10 dígitos (puedes incluir +52).";
  if (!validarCorreo(correo)) errores.correo = "Revisa tu correo (ejemplo: nombre@correo.com).";
  if (e.consentimiento !== true) errores.consentimiento = "Acepta el aviso de privacidad para recibir tu guía.";
  return { ok: Object.keys(errores).length === 0, errores, nombre, whatsapp, correo };
}
