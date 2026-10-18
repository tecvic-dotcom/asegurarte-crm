/**
 * Guía «Dinero Bajo Control» (/semana): reglas puras, sin servidor.
 * Las comparten el endpoint que guarda al prospecto y su validación. De la guía NUNCA llegan montos de ingresos,
 * gastos ni deudas: solo el semáforo (4 colores + puntaje), lo que falta proteger y los meses de fondo.
 */
import { normCorreo, normWhatsapp } from "./normalize";
import { validarNombre, validarWhatsappMX } from "./validacion";

/** Correo conservador (sin <, >, comillas ni &): luego se imprime dentro del HTML del correo de aviso. */
const RE_CORREO_SEGURO = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

/** Versión del aviso de privacidad de la guía (app/privacidad/semana). Se anota en cada prospecto como prueba del consentimiento. */
export const AVISO_SEMANA_VERSION = "2026-10-18.3";

export const SEMAFORO = ["verde", "amarillo", "rojo"] as const;
export type Semaforo = (typeof SEMAFORO)[number];

export const HUECOS = {
  gmm: "Gastos médicos mayores",
  vida: "Seguro de vida",
  auto: "Seguro de auto",
  hogar: "Seguro de hogar",
} as const;
export type Hueco = keyof typeof HUECOS;

export interface PlanSemana {
  puntaje: number;
  pilares: { flujo: Semaforo; fondo: Semaforo; deuda: Semaforo; proteccion: Semaforo };
  huecos: Hueco[];
  mesesFondo: number;
  metaMeses: 3 | 6;
}

const esSemaforo = (x: unknown): x is Semaforo => typeof x === "string" && (SEMAFORO as readonly string[]).includes(x);
const esHueco = (x: unknown): x is Hueco => typeof x === "string" && Object.prototype.hasOwnProperty.call(HUECOS, x);

/** Valida el plan que manda la guía. Cualquier cosa fuera de lo esperado → null (no se guarda nada). */
export function limpiarPlan(x: unknown): PlanSemana | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const p = o.pilares as Record<string, unknown> | undefined;
  if (!p || typeof p !== "object") return null;
  if (!esSemaforo(p.flujo) || !esSemaforo(p.fondo) || !esSemaforo(p.deuda) || !esSemaforo(p.proteccion)) return null;
  const puntaje = Number(o.puntaje);
  const meses = Number(o.mesesFondo);
  if (!Number.isFinite(puntaje) || puntaje < 0 || puntaje > 100) return null;
  if (!Number.isFinite(meses) || meses < 0 || meses > 600) return null;
  if (o.metaMeses !== 3 && o.metaMeses !== 6) return null;
  if (!Array.isArray(o.huecos) || o.huecos.length > 4) return null;
  const huecos: Hueco[] = [];
  for (const h of o.huecos) {
    if (!esHueco(h)) return null;
    if (!huecos.includes(h)) huecos.push(h);
  }
  return {
    puntaje: Math.round(puntaje),
    pilares: { flujo: p.flujo, fondo: p.fondo, deuda: p.deuda, proteccion: p.proteccion },
    huecos,
    mesesFondo: Math.round(meses * 10) / 10,
    metaMeses: o.metaMeses,
  };
}

/** Nombre seguro: letras, espacios y ' . - (nada de HTML, que luego viaja en el correo de aviso y en pantallas del CRM). */
export function limpiarNombre(t: unknown): string {
  if (typeof t !== "string") return "";
  return t
    .normalize("NFC")
    .replace(/<[^>]*>/g, " ")
    .replace(/[^\p{L} '.\-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/** Texto que ve Roberto en el prospecto: el semáforo en palabras, sin cifras de dinero. */
export function resumenPlan(p: PlanSemana): string {
  const partes = [
    `Flujo mensual: ${p.pilares.flujo}`,
    `Fondo de emergencia: ${p.pilares.fondo} (${p.mesesFondo.toLocaleString("es-MX")} de ${p.metaMeses} meses)`,
    `Deudas: ${p.pilares.deuda}`,
    `Protección: ${p.pilares.proteccion}`,
  ];
  const falta = p.huecos.length ? `Le falta: ${p.huecos.map((h) => HUECOS[h]).join(", ")}.` : "Dijo tener cubierta su protección.";
  return `Plan semanal ${p.puntaje}/100. ${partes.join(" · ")}. ${falta}`;
}

export interface EntradaProspectoSemana {
  nombre: unknown;
  whatsapp: unknown;
  correo: unknown;
  consentimiento: unknown;
}

export interface ProspectoSemanaValido {
  ok: boolean;
  errores: Record<string, string>;
  nombre: string;
  whatsapp: string;
  correo: string;
}

/** Aquí el WhatsApp es obligatorio (es para lo que se piden los datos) y el correo es opcional. */
export function validarProspectoSemana(e: EntradaProspectoSemana): ProspectoSemanaValido {
  const errores: Record<string, string> = {};
  const nombre = limpiarNombre(e.nombre);
  const whatsapp = normWhatsapp(typeof e.whatsapp === "string" ? e.whatsapp : "");
  const correo = normCorreo(typeof e.correo === "string" ? e.correo : "");
  if (e.consentimiento !== true) errores.consentimiento = "Debes autorizar el aviso de privacidad para que Roberto te contacte.";
  if (!validarNombre(nombre)) errores.nombre = "Escribe tu nombre (al menos 2 letras).";
  if (!validarWhatsappMX(whatsapp)) errores.whatsapp = "Tu WhatsApp debe tener 10 dígitos (puedes incluir +52).";
  if (correo && !RE_CORREO_SEGURO.test(correo)) errores.correo = "Revisa tu correo (ejemplo: nombre@correo.com) o déjalo vacío.";
  return { ok: Object.keys(errores).length === 0, errores, nombre, whatsapp, correo };
}
