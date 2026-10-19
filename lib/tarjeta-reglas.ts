/**
 * Medición de la tarjeta digital (/roberto): reglas puras, sin servidor.
 * Las comparten el endpoint que recibe los toques, el resumen y el panel «Tarjeta web».
 * Nada de lo que se guarda identifica a una persona: solo qué se tocó, en qué tipo de pantalla y de dónde llegó.
 */
import { fechaLocal, sumarDias } from "./fechas";

/** Eventos que la tarjeta puede mandar (lo demás se ignora). */
export const EVENTOS_TARJETA = [
  "vista", // se cargó la página
  "sec", // llegó a ver una sección (una vez por visita)
  "wa", // tocó un botón de WhatsApp
  "llamar",
  "agendar",
  "guardar", // guardar contacto
  "compartir",
  "correo",
  "sitio",
  "copiar",
  "red", // tocó una red social
  "recurso", // tocó un recurso (guía, calculadora…)
  "chip", // marcó «qué quieres proteger»
  "historia", // abrió una historia completa
  "reel", // abrió un video
  "foto", // amplió una foto del evento
  "faq", // abrió una pregunta frecuente
  "rec", // tocó una recomendación de «Para ti»
  "car", // deslizó un carrusel
  // Guía «Dinero Bajo Control» (/semana). La tabla limita el nombre a 20 caracteres.
  "sf_abrir", // abrió la guía
  "sf_plan", // terminó de armar su plan (detalle: plan | ejemplo)
  "sf_instalar", // la instaló en su teléfono
  "sf_wa", // tocó el botón de WhatsApp (detalle: datos | directo)
  "sf_dato", // dejó sus datos y se guardó el prospecto (lo manda el SERVIDOR; detalle: nuevo | repetido)
  "sf_pdf", // descargó o compartió un reporte en PDF (detalle: descarga | compartir; con «-mes» o «-anio» si es el reporte del mes o del año)
] as const;
export type EventoTarjeta = (typeof EVENTOS_TARJETA)[number];

export function esEventoTarjeta(e: unknown): e is EventoTarjeta {
  return typeof e === "string" && (EVENTOS_TARJETA as readonly string[]).includes(e);
}

/** Texto corto y seguro: letras, números, espacios y : _ - . + (nunca HTML ni saltos de línea). */
export function limpiarTexto(t: unknown, max: number): string {
  if (typeof t !== "string") return "";
  return t
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} :_.+\-·]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export interface FilaEvento {
  creado_en: string;
  evento: string;
  detalle: string;
  dispositivo: string;
  fuente: string;
}

export const SECCIONES_TARJETA: ReadonlyArray<{ id: string; nombre: string }> = [
  { id: "regalo", nombre: "Regalo (guía Dinero Bajo Control)" },
  { id: "quien", nombre: "Quién soy" },
  { id: "seguros", nombre: "¿Qué quieres proteger? (chips y seguros)" },
  { id: "asesoria", nombre: "Asesoría (botones «Quiero una asesoría» y «Agendar»)" },
  { id: "opiniones", nombre: "Opiniones" },
  { id: "reconocimientos", nombre: "Reconocimientos" },
  { id: "videos", nombre: "Videos" },
  { id: "eventos", nombre: "Eventos" },
  { id: "faq", nombre: "Preguntas frecuentes" },
  { id: "recursos", nombre: "Recursos" },
  { id: "contacto", nombre: "Contacto" },
];

const LUGAR_WA: Record<string, string> = {
  hero: "Portada",
  barra: "Barra fija de abajo",
  asesoria: "«Quiero una asesoría» (¿qué quieres proteger?)",
  contacto: "Sección Contacto",
  historia: "Historia completa de un cliente",
  producto: "Botón de un producto",
  video: "Dentro de un video",
  faq: "Preguntas frecuentes",
};

export interface Conteo {
  nombre: string;
  n: number;
}

/** «Dinero Bajo Control»: embudo anónimo. Son veces (la misma persona puede sumar varias), no personas únicas. */
export interface ResumenSemana {
  abrieron: number;
  planes: number;
  ejemplos: number;
  instalaron: number;
  /** Toques al botón de WhatsApp (no es lo mismo que mensajes enviados). */
  waTotal: number;
  waConDatos: number;
  waDirecto: number;
  prospectos: number;
  repetidos: number;
  /** Reportes semanales en PDF descargados / compartidos (se arman en el teléfono: solo se cuenta el toque). */
  pdfs: number;
  pdfsCompartidos: number;
  /** De los anteriores, cuántos fueron el reporte MENSUAL y cuántos el ANUAL. */
  pdfsMes: number;
  pdfsAnio: number;
  fuentes: Conteo[];
}

export interface ResumenTarjeta {
  dias: number;
  desde: string;
  hasta: string;
  cloud: boolean;
  /** Veces que se cargó la página (no son personas únicas). */
  visitas: number;
  visitasPorDia: Array<{ dia: string; n: number }>;
  dispositivos: { movil: number; escritorio: number };
  fuentes: Conteo[];
  toques: { wa: number; llamar: number; agendar: number; guardar: number; compartir: number; correo: number };
  waPorLugar: Conteo[];
  secciones: Array<{ id: string; nombre: string; n: number }>;
  productos: Conteo[];
  historias: Conteo[];
  videos: Conteo[];
  fotos: Conteo[];
  preguntas: Conteo[];
  recomendaciones: Conteo[];
  intereses: Conteo[];
  carruseles: { productos: number; testimonios: number; reconocimientos: number; videos: number; eventos: number };
  redes: Conteo[];
  recursos: Conteo[];
  semana: ResumenSemana;
}

function contar(filas: FilaEvento[], evento: string, clave: (f: FilaEvento) => string, max = 8): Conteo[] {
  const m = new Map<string, number>();
  for (const f of filas) {
    if (f.evento !== evento) continue;
    const k = clave(f);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([nombre, n]) => ({ nombre, n }))
    .sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre, "es"))
    .slice(0, max);
}

/** Arma el resumen de los últimos `dias` días (incluye hoy) con las filas que se le den. */
export function resumir(filas: FilaEvento[], dias: number, hoy: string): Omit<ResumenTarjeta, "cloud"> {
  const desde = sumarDias(hoy, -(dias - 1));
  const dentro = filas.filter((f) => {
    const d = fechaLocal(f.creado_en);
    return d >= desde && d <= hoy;
  });
  const vistas = dentro.filter((f) => f.evento === "vista");
  const porDia = new Map<string, number>();
  for (const f of vistas) {
    const d = fechaLocal(f.creado_en);
    porDia.set(d, (porDia.get(d) ?? 0) + 1);
  }
  const visitasPorDia = Array.from({ length: dias }, (_, i) => {
    const dia = sumarDias(desde, i);
    return { dia, n: porDia.get(dia) ?? 0 };
  });
  const total = (e: string) => dentro.filter((f) => f.evento === e).length;
  const sf = (e: string, d: string) => dentro.filter((f) => f.evento === e && f.detalle === d).length;
  const lugar = (f: FilaEvento) => {
    const clave = f.detalle.split(":")[0];
    return LUGAR_WA[clave] ?? (f.detalle ? f.detalle : "Otro");
  };
  return {
    dias,
    desde,
    hasta: hoy,
    visitas: vistas.length,
    visitasPorDia,
    dispositivos: {
      movil: vistas.filter((f) => f.dispositivo === "movil").length,
      escritorio: vistas.filter((f) => f.dispositivo === "escritorio").length,
    },
    fuentes: contar(dentro, "vista", (f) => f.fuente || "directo"),
    toques: {
      wa: total("wa"),
      llamar: total("llamar"),
      agendar: total("agendar"),
      guardar: total("guardar"),
      compartir: total("compartir"),
      correo: total("correo"),
    },
    waPorLugar: contar(dentro, "wa", lugar, 10),
    secciones: SECCIONES_TARJETA.map((s) => ({ ...s, n: dentro.filter((f) => f.evento === "sec" && f.detalle === s.id).length })),
    productos: contar(dentro, "wa", (f) => (f.detalle.startsWith("producto:") ? f.detalle.slice(9) : ""), 8),
    historias: contar(dentro, "historia", (f) => f.detalle, 5),
    videos: contar(dentro, "reel", (f) => f.detalle, 10),
    fotos: contar(dentro, "foto", (f) => f.detalle, 6),
    preguntas: contar(dentro, "faq", (f) => f.detalle, 6),
    recomendaciones: contar(dentro, "rec", (f) => f.detalle, 8),
    intereses: contar(dentro, "chip", (f) => f.detalle, 8),
    carruseles: {
      productos: dentro.filter((f) => f.evento === "car" && f.detalle === "productos").length,
      testimonios: dentro.filter((f) => f.evento === "car" && f.detalle === "testimonios").length,
      reconocimientos: dentro.filter((f) => f.evento === "car" && f.detalle === "reconocimientos").length,
      videos: dentro.filter((f) => f.evento === "car" && f.detalle === "videos").length,
      eventos: dentro.filter((f) => f.evento === "car" && f.detalle === "eventos").length,
    },
    redes: contar(dentro, "red", (f) => f.detalle, 6),
    recursos: contar(dentro, "recurso", (f) => f.detalle, 6),
    semana: {
      abrieron: total("sf_abrir"),
      planes: sf("sf_plan", "plan"),
      ejemplos: sf("sf_plan", "ejemplo"),
      instalaron: total("sf_instalar"),
      waTotal: total("sf_wa"),
      waConDatos: sf("sf_wa", "datos"),
      waDirecto: sf("sf_wa", "directo"),
      prospectos: sf("sf_dato", "nuevo"),
      repetidos: sf("sf_dato", "repetido"),
      pdfs: sf("sf_pdf", "descarga") + sf("sf_pdf", "descarga-mes") + sf("sf_pdf", "descarga-anio"),
      pdfsCompartidos: sf("sf_pdf", "compartir") + sf("sf_pdf", "compartir-mes") + sf("sf_pdf", "compartir-anio"),
      pdfsMes: sf("sf_pdf", "descarga-mes") + sf("sf_pdf", "compartir-mes"),
      pdfsAnio: sf("sf_pdf", "descarga-anio") + sf("sf_pdf", "compartir-anio"),
      fuentes: contar(dentro, "sf_abrir", (f) => f.fuente || "directo", 6),
    },
  };
}

/** Toques de contacto (WhatsApp + llamada + cita) por cada 100 visitas, o null si aún no hay visitas. */
export function contactosPor100(r: Pick<ResumenTarjeta, "visitas" | "toques">): number | null {
  if (!r.visitas) return null;
  const c = r.toques.wa + r.toques.llamar + r.toques.agendar;
  return Math.round((c / r.visitas) * 1000) / 10;
}
