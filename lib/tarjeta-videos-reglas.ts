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

/**
 * Los intereses de la tarjeta («Para ti»): cada video se muestra a quien marque ese chip. DEBE coincidir con CONFIG.intereses de public/tarjeta/index.html
 * (mismos ids y mismo texto).
 */
export const INTERESES_TARJETA: ReadonlyArray<{ id: string; texto: string }> = [
  { id: "salud", texto: "Mi salud" },
  { id: "familia", texto: "Mi familia" },
  { id: "retiro", texto: "Mi retiro" },
  { id: "casa", texto: "Mi casa" },
  { id: "auto", texto: "Mi auto" },
  { id: "impuestos", texto: "Mis impuestos" },
];

/** Solo ids conocidos, sin repetir y en el orden de los chips de la tarjeta. */
export function limpiarIntereses(v: unknown): string[] {
  const pedidos = new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return INTERESES_TARJETA.filter((i) => pedidos.has(i.id)).map((i) => i.id);
}

/** Un video tal como lo ve el CRM. */
export interface VideoTarjeta {
  id: string;
  titulo: string;
  clave: string;
  duracion: number;
  ia: boolean;
  visible: boolean;
  /** Chips de la tarjeta («Mi familia», «Mi auto»…) a los que responde este video. Vacío = la tarjeta lo deduce de la palabra clave. */
  intereses: string[];
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
  intereses: string[];
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

/** Los videos FIJOS de la tarjeta: los que viven en public/tarjeta/reels/<id>.mp4 (los que subes desde el CRM NO van aquí: tienen su propio renglón). DEBE coincidir con CONFIG.videos.lista y CONFIG.eventos.video de public/tarjeta/index.html. */
export const VIDEOS_FIJOS: ReadonlyArray<{ id: string; titulo: string; tema: string }> = [
  { id: "gastos-medicos", titulo: "Todo estaba bien… hasta que sonó el teléfono", tema: "Gastos médicos" },
  { id: "maternidad", titulo: "¿Planean tener un bebé? Esto casi nadie lo dice", tema: "Maternidad" },
  { id: "enfermo", titulo: "¿Se puede contratar un seguro si ya tienes una enfermedad?", tema: "Enfermedad previa" },
  { id: "ahorro", titulo: "Presumir que mantienes a tu familia no es suficiente", tema: "Ahorro y salud" },
  { id: "seguro-o-lujo", titulo: "¿Los seguros son un lujo o una herramienta?", tema: "Prioridades" },
  { id: "amar-familia", titulo: "¿Y si mañana no pudieras trabajar?", tema: "Protección familiar" },
  { id: "hijos", titulo: "Tus hijos podrían terminar manteniéndote", tema: "Retiro" },
  { id: "ganar-mas", titulo: "Ganar más NO te salva de la pobreza", tema: "Finanzas personales" },
  { id: "casados-o-socios", titulo: "¿Casados… o socios financieros?", tema: "Pareja y dinero" },
  { id: "quien-gana-mas", titulo: "¿Quién gana más… manda más?", tema: "Pareja y dinero" },
  { id: "inauguracion", titulo: "Inauguración de una nueva clínica en Cumbres", tema: "Evento" },
];

export const esIdFijo = (id: unknown): id is string => typeof id === "string" && VIDEOS_FIJOS.some((v) => v.id === id);

/** Un video fijo tal como lo ve el CRM, con la portada que se muestra hoy. */
export interface VideoFijo {
  id: string;
  titulo: string;
  tema: string;
  /** Dirección de la portada que ve la gente (la subida desde el CRM o la original de la tarjeta). */
  poster: string;
  /** true = subiste una portada desde el CRM; false = sale la original que viene con la tarjeta. */
  personalizada: boolean;
}

/** Permiso de un solo uso para subir una portada nueva. */
export interface PermisoPortada {
  /** Marca de tiempo que forma parte del nombre del archivo (así cada portada tiene su propia dirección y nunca se queda una vieja en la memoria del navegador). */
  ts: number;
  demo: boolean;
  nube?: { url: string; anonKey: string; bucket: string; poster: { path: string; token: string } };
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Rutas dentro del cajón: siempre las arma el servidor a partir del id (nunca se aceptan del navegador). */
export const rutaVideo = (id: string) => `v/${id}.mp4`;
export const rutaPortada = (id: string) => `v/${id}.jpg`;

/** Portada de un video FIJO subida desde el CRM: p/<id>-<ts>.jpg (la más reciente de cada id es la que se ve). */
export const rutaPortadaFija = (id: string, ts: number) => `p/${id}-${ts}.jpg`;
export const PORTADA_FIJA = /^([a-z0-9-]+)-(\d{12,15})\.jpg$/;
/** Portada nueva de un video subido desde el CRM: v/<uuid>-<ts>.jpg (reemplaza a la que tenía). */
export const rutaPortadaNueva = (id: string, ts: number) => `v/${id}-${ts}.jpg`;
/** El ts del permiso solo vale unos minutos: así nadie puede pedir rutas viejas ni lejanas. */
export const tsValido = (ts: unknown): ts is number => typeof ts === "number" && Number.isInteger(ts) && ts > Date.now() - 20 * 60_000 && ts < Date.now() + 60_000;

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

export type CambiosVideo = Partial<Pick<VideoTarjeta, "titulo" | "clave" | "ia" | "visible" | "intereses">>;

export type ResultadoValidacion<T> = { ok: true; datos: T } | { ok: false; error: string };

export interface DatosNuevoVideo {
  id: string;
  titulo: string;
  clave: string;
  duracion: number;
  ia: boolean;
  intereses: string[];
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
  return { ok: true, datos: { id: o.id, titulo, clave: limpiarClave(o.clave), duracion, ia: o.ia !== false, intereses: limpiarIntereses(o.intereses), conPortada: o.conPortada !== false } };
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
  if ("intereses" in o) c.intereses = limpiarIntereses(o.intereses);
  if (!Object.keys(c).length) return { ok: false, error: "No hay nada que cambiar." };
  return { ok: true, datos: c };
}

/** «1:05» a partir de segundos. */
export function mmss(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
