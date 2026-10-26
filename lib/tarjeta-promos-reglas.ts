/**
 * Promociones de la tarjeta web (/roberto) que publicas desde el CRM. Reglas COMPARTIDAS entre el servidor y la pantalla:
 * tipos, límites, fechas y limpieza de textos. Sin acceso a base de datos.
 * Los archivos (portada y video) viven en el mismo cajón público que los videos de la tarjeta (carpeta promo/).
 */
import { hoyLocal, sumarDias } from "./fechas";
import { limpiarClave, limpiarTexto, MAX_SEGUNDOS_VIDEO, UUID, type ResultadoValidacion } from "./tarjeta-videos-reglas";

export const MAX_PROMO_TITULO = 60;
export const MAX_PROMO_GANCHO = 140;
export const MAX_PROMO_DETALLE = 300;
export const MAX_PROMO_CONDICIONES = 300;
/** Cuántas promociones vigentes como máximo salen en la tarjeta (las más nuevas primero). */
export const MAX_PROMOS_PUBLICAS = 6;

/** Rutas dentro del cajón: siempre las arma el servidor a partir del id (nunca se aceptan del navegador). */
export const rutaPromoVideo = (id: string) => `promo/${id}.mp4`;
export const rutaPromoPortada = (id: string) => `promo/${id}.jpg`;
/** Portada cambiada después de publicar: lleva la hora en el nombre, así el celular nunca se queda con una vieja en la memoria. */
export const rutaPromoPortadaNueva = (id: string, ts: number) => `promo/${id}-${ts}.jpg`;
/** Video agregado o cambiado después de publicar (mismo motivo: su nombre lleva la hora). */
export const rutaPromoVideoNuevo = (id: string, ts: number) => `promo/${id}-${ts}.mp4`;

/** Un video de promoción dura entre 1 segundo y MAX_SEGUNDOS_VIDEO (con un margen de 10 s por el redondeo de la compresión). */
export const duracionValida = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && Math.round(n) >= 1 && Math.round(n) <= MAX_SEGUNDOS_VIDEO + 10;

/** Permiso de un solo uso para subir un video nuevo a una promoción que ya existe. */
export interface PermisoVideoPromo {
  /** Marca de tiempo que forma parte del nombre del archivo. */
  ts: number;
  demo: boolean;
  nube?: { url: string; anonKey: string; bucket: string; video: { path: string; token: string } };
}

/**
 * vigente = se ve hoy en la tarjeta · programada = empieza otro día · vencida = ya pasó su fecha de fin · oculta = la apagaste a mano.
 * («oculta» gana sobre las demás.)
 */
export type EstadoPromo = "vigente" | "programada" | "vencida" | "oculta";

/** Una promoción tal como la ve el CRM. */
export interface PromoTarjeta {
  id: string;
  titulo: string;
  gancho: string;
  detalle: string;
  clave: string;
  condiciones: string;
  /** AAAA-MM-DD */
  inicio: string;
  /** AAAA-MM-DD, o null = sin fecha de fin (se queda hasta que la ocultes). */
  fin: string | null;
  duracion: number;
  ia: boolean;
  visible: boolean;
  creado_en: string;
  estado: EstadoPromo;
  /** Direcciones públicas ya armadas. Vacías si no hay portada / video. */
  src: string;
  poster: string;
}

/** Lo que la tarjeta pública necesita de cada promoción vigente (sin datos internos). */
export interface PromoPublica {
  id: string;
  titulo: string;
  gancho: string;
  detalle: string;
  clave: string;
  condiciones: string;
  fin: string | null;
  dur: number;
  ia: boolean;
  src: string;
  poster: string;
}

/** Permisos de un solo uso para subir la portada y el video (solo los que se pidieron) directo al cajón de Supabase. */
export interface PermisoPromo {
  id: string;
  /** true = modo demo: no se sube nada de verdad. */
  demo: boolean;
  nube?: {
    url: string;
    anonKey: string;
    bucket: string;
    poster?: { path: string; token: string };
    video?: { path: string; token: string };
  };
}

export const esFecha = (v: unknown): v is string => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

/** Estado de la promoción en el día `hoy` (AAAA-MM-DD, hora de Monterrey). */
export function estadoDe(p: { visible: boolean; inicio: string; fin: string | null }, hoy = hoyLocal()): EstadoPromo {
  if (!p.visible) return "oculta";
  if (p.inicio > hoy) return "programada";
  if (p.fin && p.fin < hoy) return "vencida";
  return "vigente";
}

/** Primer y último día por defecto al abrir el formulario: hoy y el fin de este mes. */
export function fechasPorDefecto(hoy = hoyLocal()): { inicio: string; fin: string } {
  const [a, m] = hoy.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return { inicio: hoy, fin: `${a}-${String(m).padStart(2, "0")}-${String(ultimo).padStart(2, "0")}` };
}

/** Días que le quedan a una promoción con fecha de fin (0 = termina hoy); null si no tiene fecha de fin. */
export function diasRestantes(fin: string | null, hoy = hoyLocal()): number | null {
  if (!fin) return null;
  let n = 0;
  for (let f = hoy; f < fin && n < 400; f = sumarDias(f, 1)) n++;
  return n;
}

export type CambiosPromo = Partial<Pick<PromoTarjeta, "titulo" | "gancho" | "detalle" | "clave" | "condiciones" | "inicio" | "fin" | "ia" | "visible">>;

export interface DatosNuevaPromo {
  id: string;
  titulo: string;
  gancho: string;
  detalle: string;
  clave: string;
  condiciones: string;
  inicio: string;
  fin: string | null;
  duracion: number;
  ia: boolean;
  /** La portada y el video ya se subieron al cajón (el servidor lo comprueba antes de registrar). */
  conPortada: boolean;
  conVideo: boolean;
}

/** `fin` vacío o ausente = sin fecha de fin; una fecha mal escrita es error. */
function leerFin(v: unknown): ResultadoValidacion<string | null> {
  if (v === null || v === undefined || v === "") return { ok: true, datos: null };
  if (!esFecha(v)) return { ok: false, error: "La fecha de fin no es válida." };
  return { ok: true, datos: v };
}

export function validarNuevaPromo(b: unknown): ResultadoValidacion<DatosNuevaPromo> {
  const o = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
  if (typeof o.id !== "string" || !UUID.test(o.id)) return { ok: false, error: "Falta el identificador de la promoción." };
  const titulo = limpiarTexto(o.titulo, MAX_PROMO_TITULO);
  if (!titulo) return { ok: false, error: "Escribe el nombre de la campaña." };
  const gancho = limpiarTexto(o.gancho, MAX_PROMO_GANCHO);
  if (!gancho) return { ok: false, error: "Escribe el texto gancho: lo que se lee primero en la tarjeta." };
  if (!esFecha(o.inicio)) return { ok: false, error: "Elige el primer día de la promoción." };
  const fin = leerFin(o.fin);
  if (!fin.ok) return fin;
  if (fin.datos && fin.datos < o.inicio) return { ok: false, error: "La fecha de fin no puede ser anterior a la de inicio." };
  const conVideo = o.conVideo === true;
  let duracion = 0;
  if (conVideo) {
    duracion = Math.round(Number(o.duracion));
    if (!Number.isFinite(duracion) || duracion < 1 || duracion > MAX_SEGUNDOS_VIDEO + 10) {
      return { ok: false, error: `El video debe durar entre 1 segundo y ${MAX_SEGUNDOS_VIDEO / 60} minutos.` };
    }
  }
  return {
    ok: true,
    datos: {
      id: o.id,
      titulo,
      gancho,
      detalle: limpiarTexto(o.detalle, MAX_PROMO_DETALLE),
      clave: limpiarClave(o.clave),
      condiciones: limpiarTexto(o.condiciones, MAX_PROMO_CONDICIONES),
      inicio: o.inicio,
      fin: fin.datos,
      duracion,
      ia: o.ia !== false,
      conPortada: o.conPortada === true,
      conVideo,
    },
  };
}

export function validarCambiosPromo(b: unknown): ResultadoValidacion<CambiosPromo> {
  const o = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
  const c: CambiosPromo = {};
  if ("titulo" in o) {
    const t = limpiarTexto(o.titulo, MAX_PROMO_TITULO);
    if (!t) return { ok: false, error: "El nombre de la campaña no puede quedar vacío." };
    c.titulo = t;
  }
  if ("gancho" in o) {
    const g = limpiarTexto(o.gancho, MAX_PROMO_GANCHO);
    if (!g) return { ok: false, error: "El texto gancho no puede quedar vacío." };
    c.gancho = g;
  }
  if ("detalle" in o) c.detalle = limpiarTexto(o.detalle, MAX_PROMO_DETALLE);
  if ("clave" in o) c.clave = limpiarClave(o.clave);
  if ("condiciones" in o) c.condiciones = limpiarTexto(o.condiciones, MAX_PROMO_CONDICIONES);
  if ("inicio" in o) {
    if (!esFecha(o.inicio)) return { ok: false, error: "La fecha de inicio no es válida." };
    c.inicio = o.inicio;
  }
  if ("fin" in o) {
    const f = leerFin(o.fin);
    if (!f.ok) return f;
    c.fin = f.datos;
  }
  if (c.inicio && c.fin && c.fin < c.inicio) return { ok: false, error: "La fecha de fin no puede ser anterior a la de inicio." };
  if ("ia" in o) c.ia = o.ia === true;
  if ("visible" in o) c.visible = o.visible === true;
  if (!Object.keys(c).length) return { ok: false, error: "No hay nada que cambiar." };
  return { ok: true, datos: c };
}
