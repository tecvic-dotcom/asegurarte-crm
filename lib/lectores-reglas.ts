/**
 * Guía gratuita del libro «10 actividades de tu negocio que puedes delegar a la inteligencia artificial»:
 * reglas COMPARTIDAS entre el formulario de /guia-ia y el servidor. Sin acceso a base de datos.
 * Quien la pide entra a la lista APARTE de «lectores» (tabla lectores), no a los prospectos de seguros del CRM.
 */
import { normCorreo } from "./normalize";
import { validarCorreo, validarNombre } from "./validacion";

/**
 * Dirección del PDF. La carpeta lleva un código para que no sea una dirección que cualquiera adivine;
 * está fuera de los buscadores (robots.ts y cabecera X-Robots-Tag de /descargas).
 * Fuente: proyectos/guia-ia-lectores/guia.html → node construir.cjs public/descargas/b62e09d4/10-actividades-IA.pdf
 */
export const URL_GUIA_IA = "/descargas/b62e09d4/10-actividades-IA.pdf";
export const NOMBRE_ARCHIVO_GUIA_IA = "10-actividades-IA.pdf";
export const TITULO_GUIA_IA = "10 actividades de tu negocio que puedes delegar a la inteligencia artificial";

export interface EntradaLector {
  nombre: unknown;
  correo: unknown;
  consentimiento: unknown;
}

export interface LectorValido {
  ok: boolean;
  errores: Partial<Record<"nombre" | "correo" | "consentimiento", string>>;
  nombre: string;
  correo: string;
}

/** Un solo renglón, sin caracteres de control, como mucho 80 letras. */
function limpiarNombre(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

/** Solo nombre y correo (menos fricción que la guía de papás) y el aviso de privacidad aceptado. */
export function validarLector(e: EntradaLector): LectorValido {
  const errores: LectorValido["errores"] = {};
  const nombre = limpiarNombre(e.nombre);
  const correo = normCorreo(typeof e.correo === "string" ? e.correo : "").slice(0, 254);
  if (!validarNombre(nombre)) errores.nombre = "Escribe tu nombre (al menos 2 letras).";
  if (!validarCorreo(correo)) errores.correo = "Revisa tu correo (ejemplo: nombre@correo.com).";
  if (e.consentimiento !== true) errores.consentimiento = "Acepta el aviso de privacidad para recibir tu guía.";
  return { ok: Object.keys(errores).length === 0, errores, nombre, correo };
}

/** El código de la liga de baja es un uuid. */
export function esTokenBaja(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
