/**
 * Videos de la tarjeta web (/roberto) que subes desde el CRM. Reglas COMPARTIDAS entre el servidor y la pantalla:
 * tipos, límites y limpieza de textos. Sin acceso a base de datos.
 */

export const BUCKET_VIDEOS = "tarjeta-videos";
/** 50 MB: el máximo por archivo del plan gratuito de Supabase (y el límite del cajón). */
export const MAX_BYTES_VIDEO = 50 * 1024 * 1024;
export const MAX_BYTES_PORTADA = 600 * 1024;
/** Un reel largo: más de 3 minutos ya no es un reel. */
export const MAX_SEGUNDOS_VIDEO = 180;
export const MAX_TITULO = 90;
export const MAX_CLAVE = 30;

/** Un video tal como lo ve el CRM. */
export interface VideoTarjeta {
  id: string;
  titulo: string;
  clave: string;
  duracion: number;
  ia: boolean;
  visible: boolean;
  creado_en: string;
  /** Direcciones públicas ya armadas (el video y su portada). */
  src: string;
  poster: string;
}

/** Lo que la tarjeta pública necesita de cada video (sin datos internos). */
export interface VideoPublico {
  id: string;
  titulo: string;
  clave: string;
  dur: number;
  ia: boolean;
  src: string;
  poster: string;
}

export interface PermisoSubida {
  id: string;
  /** true = modo demo: no se sube nada de verdad. */
  demo: boolean;
  /** Datos para subir directo al cajón (solo en la nube). */
  nube?: {
    url: string;
    anonKey: string;
    bucket: string;
    video: { path: string; token: string };
    poster: { path: string; token: string };
  };
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Rutas dentro del cajón: siempre las arma el servidor a partir del id (nunca se aceptan del navegador). */
export const rutaVideo = (id: string) => `v/${id}.mp4`;
export const rutaPortada = (id: string) => `v/${id}.jpg`;

export function urlPublica(base: string, ruta: string): string {
  return ruta ? `${base.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET_VIDEOS}/${ruta}` : "";
}

/** Texto de una sola línea, sin caracteres de control, recortado. */
export function limpiarTexto(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/** La palabra clave se manda por WhatsApp: mayúsculas, sin saltos, hasta 30 caracteres. */
export function limpiarClave(v: unknown): string {
  return limpiarTexto(v, MAX_CLAVE).toLocaleUpperCase("es-MX");
}

export type CambiosVideo = Partial<Pick<VideoTarjeta, "titulo" | "clave" | "ia" | "visible">>;

export type ResultadoValidacion<T> = { ok: true; datos: T } | { ok: false; error: string };

export interface DatosNuevoVideo {
  id: string;
  titulo: string;
  clave: string;
  duracion: number;
  ia: boolean;
  /** El video comprimido pesa menos que el límite y su portada ya se subió. */
  conPortada: boolean;
}

export function validarNuevo(b: unknown): ResultadoValidacion<DatosNuevoVideo> {
  const o = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
  if (typeof o.id !== "string" || !UUID.test(o.id)) return { ok: false, error: "Falta el identificador del video." };
  const titulo = limpiarTexto(o.titulo, MAX_TITULO);
  if (!titulo) return { ok: false, error: "Escribe el título del video." };
  const duracion = Math.round(Number(o.duracion));
  if (!Number.isFinite(duracion) || duracion < 1 || duracion > MAX_SEGUNDOS_VIDEO + 10) {
    return { ok: false, error: `El video debe durar entre 1 segundo y ${MAX_SEGUNDOS_VIDEO / 60} minutos.` };
  }
  return { ok: true, datos: { id: o.id, titulo, clave: limpiarClave(o.clave), duracion, ia: o.ia !== false, conPortada: o.conPortada !== false } };
}

export function validarCambios(b: unknown): ResultadoValidacion<CambiosVideo> {
  const o = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
  const c: CambiosVideo = {};
  if ("titulo" in o) {
    const t = limpiarTexto(o.titulo, MAX_TITULO);
    if (!t) return { ok: false, error: "El título no puede quedar vacío." };
    c.titulo = t;
  }
  if ("clave" in o) c.clave = limpiarClave(o.clave);
  if ("ia" in o) c.ia = o.ia === true;
  if ("visible" in o) c.visible = o.visible === true;
  if (!Object.keys(c).length) return { ok: false, error: "No hay nada que cambiar." };
  return { ok: true, datos: c };
}

/** «1:05» a partir de segundos. */
export function mmss(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
