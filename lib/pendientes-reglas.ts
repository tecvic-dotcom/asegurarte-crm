/**
 * Mis pendientes — reglas puras (cliente y servidor), sin dependencias del servidor.
 *
 * Un pendiente es algo por hacer en un día (y a veces a una hora), opcionalmente
 * ligado a un prospecto. Al completarlo NO se borra: pasa a "completados" con la
 * fecha y hora en que lo terminaste, y de ahí se puede devolver a pendientes.
 */
import { esFechaValida, fechaCorta, fechaLocal, sumarDias } from "./fechas";

export interface Pendiente {
  id: string;
  texto: string;
  /** AAAA-MM-DD */
  fecha: string;
  /** "HH:MM" en 24 h, o null si no tiene hora. */
  hora: string | null;
  lead_id: string | null;
  hecho: boolean;
  /** Instante (ISO) en que se completó. */
  hecho_en: string | null;
  creado_en: string;
  /** Lugar que le diste arrastrándolo dentro de su día (1 = arriba), o null si nunca lo acomodaste. */
  orden: number | null;
}

export interface DatosPendiente {
  texto: string;
  fecha: string;
  hora: string | null;
  lead_id: string | null;
}

export const MAX_TEXTO_PENDIENTE = 200;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export type ResultadoPendiente = { ok: true; datos: DatosPendiente } | { ok: false; error: string };

/** Valida lo que llega del navegador. La fecha vacía significa "hoy". */
export function validarPendiente(entrada: unknown, hoy: string): ResultadoPendiente {
  if (!entrada || typeof entrada !== "object") return { ok: false, error: "Escribe qué tienes que hacer." };
  const e = entrada as Record<string, unknown>;
  const texto = String(e.texto ?? "").replace(/\s+/g, " ").trim();
  if (!texto) return { ok: false, error: "Escribe qué tienes que hacer." };
  if (texto.length > MAX_TEXTO_PENDIENTE) {
    return { ok: false, error: `Acórtalo un poco: máximo ${MAX_TEXTO_PENDIENTE} letras.` };
  }
  const fecha = String(e.fecha ?? "").trim() || hoy;
  if (!esFechaValida(fecha)) return { ok: false, error: "Esa fecha no es válida." };
  const horaTxt = String(e.hora ?? "").trim();
  if (horaTxt && !HORA.test(horaTxt)) return { ok: false, error: "Esa hora no es válida." };
  const lead = String(e.lead_id ?? "").trim();
  return { ok: true, datos: { texto, fecha, hora: horaTxt || null, lead_id: lead || null } };
}

/**
 * Orden del día: primero por fecha. Dentro del día, lo que acomodaste a mano va arriba, en el orden que le
 * diste; el resto (lo nuevo) sigue por hora (los que no tienen hora, al final) y luego por cuándo se anotaron.
 */
export function compararPendientes(a: Pendiente, b: Pendiente): number {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
  if (a.orden !== b.orden) {
    if (a.orden === null) return 1;
    if (b.orden === null) return -1;
    return a.orden - b.orden;
  }
  if (a.hora !== b.hora) {
    if (!a.hora) return 1;
    if (!b.hora) return -1;
    return a.hora < b.hora ? -1 : 1;
  }
  return a.creado_en < b.creado_en ? -1 : a.creado_en > b.creado_en ? 1 : 0;
}

export interface GrupoPendientes {
  /** Clave estable para la lista (la fecha, o "atrasados"). */
  clave: string;
  titulo: string;
  atrasado: boolean;
  items: Pendiente[];
}

/** "viernes 10 oct" */
function diaConNombre(f: string): string {
  const dia = new Date(`${f}T00:00:00Z`).toLocaleDateString("es-MX", { weekday: "long", timeZone: "UTC" });
  return `${dia} ${fechaCorta(f)}`;
}

/** "Hoy", "Mañana", "Ayer" o "viernes 10 oct". */
export function etiquetaDia(f: string, hoy: string): string {
  if (f === hoy) return "Hoy";
  if (f === sumarDias(hoy, 1)) return "Mañana";
  if (f === sumarDias(hoy, -1)) return "Ayer";
  return diaConNombre(f);
}

/**
 * Pendientes por hacer, agrupados: lo atrasado primero, luego hoy, mañana y los
 * días que siguen. Hoy siempre aparece (aunque esté vacío) para dar ese "día libre".
 */
export function agruparPendientes(activos: Pendiente[], hoy: string): GrupoPendientes[] {
  const ordenados = [...activos].sort(compararPendientes);
  const grupos: GrupoPendientes[] = [];
  const atrasados = ordenados.filter((p) => p.fecha < hoy);
  if (atrasados.length) grupos.push({ clave: "atrasados", titulo: "Atrasados", atrasado: true, items: atrasados });
  grupos.push({ clave: hoy, titulo: "Hoy", atrasado: false, items: ordenados.filter((p) => p.fecha === hoy) });
  const futuros = ordenados.filter((p) => p.fecha > hoy);
  for (const p of futuros) {
    const g = grupos.find((x) => x.clave === p.fecha);
    if (g) g.items.push(p);
    else grupos.push({ clave: p.fecha, titulo: etiquetaDia(p.fecha, hoy), atrasado: false, items: [p] });
  }
  return grupos;
}

/** Cuántos pendientes se pueden acomodar de una vez (un día nunca llega a tanto; es solo un tope). */
export const MAX_ORDENAR = 200;

/** Da a cada pendiente de `ids` su lugar (1, 2, 3…) según su posición; los demás no cambian. */
export function aplicarOrden(activos: Pendiente[], ids: string[]): Pendiente[] {
  const lugar = new Map(ids.map((id, i) => [id, i + 1]));
  return activos.map((p) => (lugar.has(p.id) ? { ...p, orden: lugar.get(p.id)! } : p));
}

/** Día (AAAA-MM-DD, hora de Monterrey) en que se completó un pendiente. */
export function diaCompletado(p: Pendiente): string {
  return p.hecho_en ? fechaLocal(p.hecho_en) : p.fecha;
}

/** Completados, del más reciente al más viejo, agrupados por el día en que se terminaron. */
export function agruparCompletados(hechos: Pendiente[], hoy: string): { clave: string; titulo: string; items: Pendiente[] }[] {
  const ordenados = [...hechos].sort((a, b) => String(b.hecho_en ?? "").localeCompare(String(a.hecho_en ?? "")));
  const grupos: { clave: string; titulo: string; items: Pendiente[] }[] = [];
  for (const p of ordenados) {
    const dia = diaCompletado(p);
    const g = grupos.find((x) => x.clave === dia);
    if (g) g.items.push(p);
    else grupos.push({ clave: dia, titulo: etiquetaDia(dia, hoy), items: [p] });
  }
  return grupos;
}

export interface ResumenPendientes {
  /** Lo que queda por hacer hoy (incluye lo atrasado). */
  porHacer: number;
  /** De ese total, lo que viene de días anteriores. */
  atrasados: number;
  /** Lo que ya terminaste hoy. */
  hechosHoy: number;
  /** Avance del día, 0 a 100. */
  avance: number;
  /** Lo que sigue en días futuros. */
  proximos: number;
  frase: string;
}

export function resumenPendientes(activos: Pendiente[], hechos: Pendiente[], hoy: string): ResumenPendientes {
  const porHacer = activos.filter((p) => p.fecha <= hoy).length;
  const atrasados = activos.filter((p) => p.fecha < hoy).length;
  const proximos = activos.filter((p) => p.fecha > hoy).length;
  const hechosHoy = hechos.filter((p) => diaCompletado(p) === hoy).length;
  const total = porHacer + hechosHoy;
  const avance = total ? Math.round((hechosHoy / total) * 100) : 0;

  let frase: string;
  if (porHacer === 0 && hechosHoy > 0) {
    frase = `¡Día cumplido! Terminaste ${hechosHoy} ${hechosHoy === 1 ? "pendiente" : "pendientes"} hoy.`;
  } else if (porHacer === 0) {
    frase = proximos
      ? `Hoy no tienes pendientes. Lo que sigue está agendado para los próximos días (${proximos}).`
      : "No tienes pendientes. Anota abajo lo que vas a hacer hoy.";
  } else {
    const faltan = porHacer === 1 ? "Te queda 1 pendiente por hacer" : `Te quedan ${porHacer} pendientes por hacer`;
    const viejos = atrasados ? `, ${atrasados} ${atrasados === 1 ? "viene" : "vienen"} de días anteriores` : "";
    const hechas = hechosHoy ? ` · ya llevas ${hechosHoy}` : "";
    frase = `${faltan}${viejos}${hechas}.`;
  }
  return { porHacer, atrasados, hechosHoy, avance, proximos, frase };
}

/** "16:30" → "4:30 pm" */
export function formatearHora(hora: string | null): string {
  if (!hora || !HORA.test(hora)) return "";
  const h = Number(hora.slice(0, 2));
  const m = hora.slice(3, 5);
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? "am" : "pm"}`;
}

/** Hora (de Monterrey) de un instante ISO, para "terminado a las 3:45 pm". */
export function horaDeInstante(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Monterrey",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return formatearHora(partes.replace(/^24:/, "00:"));
}
