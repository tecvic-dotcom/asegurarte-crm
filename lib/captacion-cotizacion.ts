/**
 * Formulario de captación «Cotiza tu seguro» — reglas puras (sin React, sin servidor).
 * Se usan en el NAVEGADOR (componente FormularioCotizacion) y se reutilizarán IGUAL en el SERVIDOR
 * cuando se conecte: mismo criterio de validación y de antispam en los dos lados.
 *
 * Contrato con el servidor (para cuando se conecte):
 *   POST  → body: SolicitudCotizacion        ← lo que arma el formulario
 *   200   → { ok: true, folio? }             ← «recibida»
 *   422   → { ok: false, errores }           ← errores por campo (mismo formato que validarSolicitud)
 *   429   → { ok: false, mensaje }           ← demasiados envíos
 * El servidor debe volver a correr `validarSolicitud` y `evaluarAntispam` (nunca confiar en el navegador).
 */
import { normCorreo, normWhatsapp } from "./normalize";
import { validarCorreo } from "./validacion";
import type { UTM } from "./types";

/** Tipos de seguro que se ofrecen (los mismos 6 de la tarjeta /roberto + «no estoy seguro»). `ramo` = cómo se archiva en el CRM. */
export const TIPOS_SEGURO = [
  { id: "vida", texto: "Seguro de vida", icono: "heart", ramo: "vida" },
  { id: "gmm", texto: "Gastos médicos mayores", icono: "medical", ramo: "gmm" },
  { id: "autos", texto: "Seguro de auto", icono: "car", ramo: "autos" },
  { id: "hogar", texto: "Protección patrimonial (casa)", icono: "home", ramo: "hogar" },
  { id: "ahorro", texto: "Ahorro y retiro", icono: "coins", ramo: "ahorro" },
  { id: "ppr", texto: "PPR / Planeación fiscal", icono: "trend", ramo: "ahorro" },
  { id: "no-se", texto: "No estoy seguro, oriéntame", icono: "help", ramo: null },
] as const;
export type TipoSeguroId = (typeof TIPOS_SEGURO)[number]["id"];

/** ¿Para quién es la protección? */
export const PARA_QUIEN = [
  { id: "yo", texto: "Para mí", ayuda: "Mi protección personal" },
  { id: "familia", texto: "Para mi familia", ayuda: "Pareja e hijos" },
  { id: "padres", texto: "Para mis padres u otro familiar", ayuda: "Alguien que depende de mí o a quien cuido" },
  { id: "negocio", texto: "Para mi negocio o mis empleados", ayuda: "Mi empresa o mi equipo" },
] as const;
export type ParaQuienId = (typeof PARA_QUIEN)[number]["id"];

/** Campos que pueden marcarse con error. */
export type CampoCotizacion = "nombre" | "whatsapp" | "tipoSeguro" | "paraQuien" | "correo" | "consentimiento";
export type ErroresCotizacion = Partial<Record<CampoCotizacion, string>>;

/** Lo que el formulario manda al servidor (todo ya limpio: ver `prepararSolicitud`). */
export interface SolicitudCotizacion {
  nombre: string;
  /** Solo 10 dígitos (formato MX), sin +52 ni espacios. */
  whatsapp: string;
  tipoSeguro: TipoSeguroId | "";
  paraQuien: ParaQuienId | "";
  /** Opcional: vacío si no lo dio. En minúsculas. */
  correo: string;
  consentimiento: boolean;
  /** Antispam 1 — señuelo: campo invisible que una persona nunca llena. Con valor = es un bot. */
  trampa: string;
  /** Antispam 2 — milisegundos entre que se mostró el formulario y se envió. Un bot envía en un instante. */
  tiempoMs: number;
  /** De dónde llegó (UTMs, si las hay) y desde qué parte del sitio se envió («tarjeta», «landing»…). */
  utm?: Partial<UTM>;
  origen?: string;
}

/** Respuesta que entiende el formulario (la del simulador hoy, la del servidor mañana). */
export type ResultadoEnvio =
  | { ok: true; folio?: string }
  | { ok: false; errores?: ErroresCotizacion; mensaje?: string; reintentarEnSegundos?: number };

/** Función que recibe la solicitud. Hoy se le pasa el simulador; luego, la que llama al servidor. */
export type EnviarCotizacion = (solicitud: SolicitudCotizacion) => Promise<ResultadoEnvio>;

/* ---------------------------------------------------------------------------------------------- */
/* Limpieza de lo que escribe la persona                                                           */
/* ---------------------------------------------------------------------------------------------- */

/** WhatsApp «bonito» mientras se escribe: 81 8280 0234. Acepta pegados con +52 / 521. */
export function formatearWhatsapp(v: string): string {
  let d = (v ?? "").replace(/\D+/g, "");
  if (d.length > 10 && d.startsWith("521")) d = d.slice(3);
  else if (d.length > 10 && d.startsWith("52")) d = d.slice(2);
  d = d.slice(0, 10);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `${d.slice(0, 2)} ${d.slice(2)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`;
}

/** Nombre sin espacios de más (dobles, a los lados). */
export function limpiarNombre(v: string): string {
  return (v ?? "").replace(/\s+/g, " ").trim();
}

/** Deja la solicitud lista para validar y enviar: todo recortado y normalizado. */
export function prepararSolicitud(s: SolicitudCotizacion): SolicitudCotizacion {
  return {
    ...s,
    nombre: limpiarNombre(s.nombre),
    whatsapp: normWhatsapp(s.whatsapp),
    correo: normCorreo(s.correo),
    trampa: (s.trampa ?? "").trim(),
  };
}

/**
 * Arma una solicitud a partir de un JSON que llegó por la red (tipos inciertos). Nunca lanza error: lo que no es
 * texto queda vacío y lo que no sea válido lo marca después `validarSolicitud`. Es la PRIMERA línea del servidor.
 */
export function leerSolicitud(cuerpo: unknown): SolicitudCotizacion {
  const o = (cuerpo && typeof cuerpo === "object" ? cuerpo : {}) as Record<string, unknown>;
  const u = (o.utm && typeof o.utm === "object" ? o.utm : {}) as Record<string, unknown>;
  const txt = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
  return {
    nombre: txt(o.nombre, 200),
    whatsapp: txt(o.whatsapp, 40),
    tipoSeguro: txt(o.tipoSeguro, 20) as TipoSeguroId | "",
    paraQuien: txt(o.paraQuien, 20) as ParaQuienId | "",
    correo: txt(o.correo, 200),
    consentimiento: o.consentimiento === true,
    trampa: txt(o.trampa, 200),
    tiempoMs: typeof o.tiempoMs === "number" ? o.tiempoMs : Number.NaN,
    utm: { source: txt(u.source, 120), medium: txt(u.medium, 120), campaign: txt(u.campaign, 120), term: txt(u.term, 120), content: txt(u.content, 120) },
    origen: txt(o.origen, 30).toLowerCase().replace(/[^a-z0-9._-]/g, ""),
  };
}

/* ---------------------------------------------------------------------------------------------- */
/* Validación (cliente Y servidor)                                                                 */
/* ---------------------------------------------------------------------------------------------- */

// Enlaces, correos o etiquetas dentro del nombre: es la firma típica del spam.
const RE_NOMBRE_SOSPECHOSO = /<|>|https?:|www\.|\.(com|net|org|mx|ru|xyz)\b|@|\{|\}|\[|\]|\\/i;
// Un celular MX de 10 dígitos no empieza con 0 ni con 1, y no es el mismo dígito repetido.
const RE_WHATSAPP_MX = /^[2-9]\d{9}$/;

export interface OpcionesValidacion {
  /** Si es false, no se exige la casilla del aviso de privacidad («según corresponda»). Por defecto, sí. */
  requiereConsentimiento?: boolean;
}

/**
 * Valida una solicitud. Mensajes claros y en español: dicen QUÉ falta y CÓMO arreglarlo.
 * Debe recibir la solicitud ya pasada por `prepararSolicitud` (o la prepara ella misma por seguridad).
 */
export function validarSolicitud(entrada: SolicitudCotizacion, opciones: OpcionesValidacion = {}): { ok: boolean; errores: ErroresCotizacion } {
  const s = prepararSolicitud(entrada);
  const e: ErroresCotizacion = {};

  if (!s.nombre) e.nombre = "Escribe tu nombre para saber cómo dirigirnos a ti.";
  else if (s.nombre.length < 2 || !/\p{L}.*\p{L}/u.test(s.nombre)) e.nombre = "Tu nombre debe tener al menos 2 letras.";
  else if (s.nombre.length > 80) e.nombre = "Tu nombre es muy largo (máximo 80 caracteres).";
  else if (RE_NOMBRE_SOSPECHOSO.test(s.nombre)) e.nombre = "Escribe solo tu nombre, sin enlaces ni símbolos como < o @.";

  if (!s.whatsapp) e.whatsapp = "Escribe tu número de WhatsApp (10 dígitos).";
  else if (s.whatsapp.length !== 10) e.whatsapp = "Tu WhatsApp debe tener 10 dígitos. Puedes incluir +52.";
  else if (!RE_WHATSAPP_MX.test(s.whatsapp) || /^(\d)\1{9}$/.test(s.whatsapp)) e.whatsapp = "Ese número no parece válido. Revisa que lo hayas escrito completo.";

  if (!TIPOS_SEGURO.some((t) => t.id === s.tipoSeguro)) e.tipoSeguro = "Elige el tipo de seguro que te interesa.";
  if (!PARA_QUIEN.some((p) => p.id === s.paraQuien)) e.paraQuien = "Elige para quién sería la protección.";

  // Correo: opcional, pero si lo escribe tiene que estar bien.
  if (s.correo && !validarCorreo(s.correo)) e.correo = "Revisa tu correo (ejemplo: nombre@correo.com). Si prefieres, déjalo vacío.";

  if ((opciones.requiereConsentimiento ?? true) && !s.consentimiento) {
    e.consentimiento = "Marca la casilla para aceptar el aviso de privacidad y poder contactarte.";
  }

  return { ok: Object.keys(e).length === 0, errores: e };
}

/* ---------------------------------------------------------------------------------------------- */
/* Antispam (cliente Y servidor)                                                                   */
/* ---------------------------------------------------------------------------------------------- */

/** Una persona tarda más que esto en llenar y elegir; un bot envía casi al instante. */
export const TIEMPO_MINIMO_MS = 3000;
/** Tope de envíos por visita a la página (después, se invita a escribir por WhatsApp). */
export const MAX_ENVIOS_POR_VISITA = 3;

/**
 * - "bot":    el señuelo trae texto → se finge éxito y NO se guarda nada (así el bot no aprende qué lo delató).
 * - "rapido": se envió demasiado pronto → se pide revisar y reenviar (una persona real pasa al segundo intento
 *             sin perder lo escrito; un falso positivo nunca descarta a un prospecto real en silencio).
 * - "ok":     adelante.
 */
export type VeredictoAntispam = "ok" | "bot" | "rapido";

export function evaluarAntispam(s: Pick<SolicitudCotizacion, "trampa" | "tiempoMs">, tiempoMinimoMs = TIEMPO_MINIMO_MS): VeredictoAntispam {
  if ((s.trampa ?? "").trim().length > 0) return "bot";
  if (!Number.isFinite(s.tiempoMs) || s.tiempoMs < tiempoMinimoMs) return "rapido";
  return "ok";
}

/* ---------------------------------------------------------------------------------------------- */
/* Textos para mostrar                                                                             */
/* ---------------------------------------------------------------------------------------------- */

export const textoTipoSeguro = (id: string): string => TIPOS_SEGURO.find((t) => t.id === id)?.texto ?? "";
export const textoParaQuien = (id: string): string => PARA_QUIEN.find((p) => p.id === id)?.texto ?? "";

/** Primer nombre, para saludar («María González» → «María»). */
export const primerNombre = (nombre: string): string => limpiarNombre(nombre).split(" ")[0] ?? "";
