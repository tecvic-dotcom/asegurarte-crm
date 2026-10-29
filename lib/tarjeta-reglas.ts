/**
 * Medición de la tarjeta digital (/roberto): reglas puras, sin servidor.
 * Las comparten el endpoint que recibe los toques, el resumen y el panel «Tarjeta web».
 * Nada de lo que se guarda identifica a una persona: solo qué se tocó, en qué tipo de pantalla y de dónde llegó.
 */
import { diaSemana, fechaLocal, horaLocal, sumarDias } from "./fechas";
import type { Lead } from "./types";

/** El origen con el que Roberto marca, en el expediente, al prospecto que le escribió desde la tarjeta. */
export const ORIGEN_TARJETA = "Tarjeta web";

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
  "promo", // abrió el video de una promoción (detalle: nombre de la campaña)
  "car", // deslizó un carrusel
  "bot", // usó el asistente virtual (detalle: abrir | tema:X | p:pregunta | pagina:X; sus salidas a WhatsApp, cita y llamada van como wa/agendar/llamar con «asistente:…»)
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
  { id: "quien", nombre: "Quién soy" },
  { id: "promociones", nombre: "Promociones (solo se ve mientras hay una campaña vigente)" },
  { id: "herramientas", nombre: "Herramientas (guía Dinero Bajo Control y calculadora)" },
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
  promo: "Botón de una promoción",
  video: "Dentro de un video",
  faq: "Preguntas frecuentes",
  asistente: "Asistente virtual",
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

/** El periodo de igual largo justo antes del que se mira: da el «+15.7 % vs. 25 sep» del panel. */
export interface PeriodoAnterior {
  desde: string;
  hasta: string;
  visitas: number;
  /** WhatsApp + llamada + cita. */
  contactos: number;
  guardaron: number;
  /** false si la medición empezó después de que arrancara ese periodo: compararlo engañaría. */
  comparable: boolean;
}

/** Algo que se abre en la tarjeta: cuántas veces lo abrieron y cuántas tocaron su botón de WhatsApp. */
export interface ItemContenido {
  tipo: "video" | "promocion" | "historia" | "pregunta" | "foto";
  nombre: string;
  aperturas: number;
  wa: number;
}

/** Lo que sale del CRM (no de la medición): prospectos que Roberto marcó con origen «Tarjeta web». */
export interface ResumenCrm {
  prospectos: number;
  prospectosAnterior: number;
  /** Ganados de todo el tiempo con ese origen. */
  ganados: number;
}

export interface ResumenTarjeta {
  dias: number;
  desde: string;
  hasta: string;
  cloud: boolean;
  anterior: PeriodoAnterior;
  /** Primer día con visitas en lo que se leyó (null si no hay). */
  datosDesde: string | null;
  /** Instante (ISO) de la última visita que se leyó. */
  ultimaVisita: string | null;
  contactosPorDia: Array<{ dia: string; n: number }>;
  /** Visitas por hora del día (hora de Monterrey): 24 valores. */
  horas: number[];
  /** Visitas por día de la semana: 7 valores, de lunes a domingo. */
  diasSemana: number[];
  contenido: ItemContenido[];
  /** Portada de cada video: `claveVideo(título)` → dirección de la imagen. La arma la ruta del CRM (no la medición); sin ella la lista usa el ícono. */
  miniaturas?: Record<string, string>;
  crm?: ResumenCrm;
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
  /** Por campaña: toques al botón de WhatsApp de la promoción y veces que abrieron su video. */
  promosWa: Conteo[];
  promosVideo: Conteo[];
  fotos: Conteo[];
  preguntas: Conteo[];
  recomendaciones: Conteo[];
  /** Asistente virtual guiado: veces que lo abrieron, temas que eligen, preguntas que abren y páginas a las que los lleva. */
  asistente: { abrieron: number; temas: Conteo[]; preguntas: Conteo[]; paginas: Conteo[] };
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

// Cómo se llama cada origen en el panel: las etiquetas del enlace (?s=) y los sitios que mandan visitas.
const NOMBRE_FUENTE: Record<string, string> = {
  directo: "Directo (sin etiqueta)",
  ig: "Instagram",
  "l.instagram.com": "Instagram",
  "instagram.com": "Instagram",
  wa: "WhatsApp",
  grupos: "Grupos de WhatsApp",
  tiktok: "TikTok",
  fb: "Facebook",
  "l.facebook.com": "Facebook",
  "m.facebook.com": "Facebook",
  "facebook.com": "Facebook",
  linkedin: "LinkedIn",
  "lnkd.in": "LinkedIn",
  yt: "YouTube",
  "youtube.com": "YouTube",
  "m.youtube.com": "YouTube",
  correo: "Firma del correo",
  anuncio: "Anuncios de pago",
  qr: "Código QR de la tarjeta",
  amigo: "Guía compartida por un amigo",
  "google.com": "Google",
  "especialistaenasegurarte.lat": "Mi sitio web",
};

/** Origen en palabras: «ig» y «l.instagram.com» son «Instagram» y se suman; lo que no se conoce queda como llegó. */
export function fuentesLegibles(filas: Conteo[]): Conteo[] {
  const m = new Map<string, number>();
  for (const f of filas) {
    const nombre = NOMBRE_FUENTE[f.nombre] ?? f.nombre;
    m.set(nombre, (m.get(nombre) ?? 0) + f.n);
  }
  return [...m.entries()].map(([nombre, n]) => ({ nombre, n })).sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre, "es"));
}

/** Llave para juntar un contenido con su apertura y con su toque de WhatsApp (que llega más corto): primeras 50 letras, sin mayúsculas ni espacios de más. */
export const claveContenido = (nombre: string): string => nombre.replace(/\s+/g, " ").trim().slice(0, 50).toLowerCase();

/**
 * Llave para ligar un video con su portada. La medición guarda el título SIN signos (sin ¿ ? ¡ ! … % ni emojis, y recortado a 60 letras), así que
 * «¿Quién paga esto?» llega como «Quién paga esto»: se comparan solo letras y números, sin espacios, las primeras 36.
 */
export const claveVideo = (titulo: string): string => titulo.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "").slice(0, 36);

/**
 * Videos, historias, preguntas, fotos y promociones con cuántas veces los abrieron y cuántos toques de WhatsApp llevan.
 * El botón de WhatsApp guarda «tipo:nombre» recortado a 60 letras (con su prefijo), así que el mismo contenido llega con el
 * nombre un poco más corto que el de su apertura: se juntan por las primeras 50 letras y se muestra el nombre más largo.
 */
function contenidoDe(filas: FilaEvento[]): ItemContenido[] {
  const mapa = new Map<string, ItemContenido>();
  const item = (tipo: ItemContenido["tipo"], nombre: string) => {
    const k = `${tipo}|${claveContenido(nombre)}`;
    let x = mapa.get(k);
    if (!x) mapa.set(k, (x = { tipo, nombre, aperturas: 0, wa: 0 }));
    else if (nombre.length > x.nombre.length) x.nombre = nombre;
    return x;
  };
  for (const f of filas) {
    if (!f.detalle) continue;
    switch (f.evento) {
      case "reel":
        item("video", f.detalle).aperturas += 1;
        break;
      case "promo":
        item("promocion", f.detalle).aperturas += 1;
        break;
      case "historia":
        item("historia", f.detalle).aperturas += 1;
        break;
      case "faq":
        item("pregunta", f.detalle).aperturas += 1;
        break;
      case "foto":
        // La imagen de una promoción se amplía con el nombre «Promo: …».
        if (f.detalle.startsWith("Promo: ")) item("promocion", f.detalle.slice(7)).aperturas += 1;
        else item("foto", f.detalle).aperturas += 1;
        break;
      case "wa": {
        const corte = f.detalle.indexOf(":");
        if (corte < 0) break;
        const clase = f.detalle.slice(0, corte);
        const nombre = f.detalle.slice(corte + 1).trim();
        if (!nombre) break;
        if (clase === "video") item("video", nombre).wa += 1;
        else if (clase === "promo") item("promocion", nombre).wa += 1;
        else if (clase === "faq") item("pregunta", nombre).wa += 1;
        break;
      }
    }
  }
  return [...mapa.values()]
    .sort((a, b) => b.aperturas + b.wa - (a.aperturas + a.wa) || a.nombre.localeCompare(b.nombre, "es"))
    .slice(0, 80);
}

/** Prospectos que Roberto marcó con origen «Tarjeta web»: nuevos en el periodo, en el anterior y ganados de siempre. */
export function prospectosDeLaTarjeta(
  leads: ReadonlyArray<Pick<Lead, "origen" | "etapa" | "creado_en">>,
  r: Pick<ResumenTarjeta, "desde" | "hasta" | "anterior">,
): ResumenCrm {
  const suyos = leads.filter((l) => (l.origen ?? "").trim().toLowerCase() === ORIGEN_TARJETA.toLowerCase());
  const entre = (l: Pick<Lead, "creado_en">, d: string, h: string) => {
    const f = fechaLocal(l.creado_en);
    return f >= d && f <= h;
  };
  return {
    prospectos: suyos.filter((l) => entre(l, r.desde, r.hasta)).length,
    prospectosAnterior: suyos.filter((l) => entre(l, r.anterior.desde, r.anterior.hasta)).length,
    ganados: suyos.filter((l) => l.etapa === "ganado").length,
  };
}

/** Arma el resumen de los últimos `dias` días (incluye hoy) con las filas que se le den. */
export function resumir(filas: FilaEvento[], dias: number, hoy: string): Omit<ResumenTarjeta, "cloud" | "crm"> {
  const desde = sumarDias(hoy, -(dias - 1));
  const antesHasta = sumarDias(desde, -1);
  const antesDesde = sumarDias(desde, -dias);
  const dentro: FilaEvento[] = [];
  const antes: FilaEvento[] = [];
  let datosDesde: string | null = null;
  let ultimaVisita: string | null = null;
  for (const f of filas) {
    const d = fechaLocal(f.creado_en);
    if (d >= desde && d <= hoy) dentro.push(f);
    else if (d >= antesDesde && d <= antesHasta) antes.push(f);
    if (f.evento === "vista") {
      if (datosDesde === null || d < datosDesde) datosDesde = d;
      if (ultimaVisita === null || f.creado_en > ultimaVisita) ultimaVisita = f.creado_en;
    }
  }
  const esContacto = (f: FilaEvento) => f.evento === "wa" || f.evento === "llamar" || f.evento === "agendar";
  const vistas = dentro.filter((f) => f.evento === "vista");
  const horas = Array.from({ length: 24 }, () => 0);
  const diasSemana = Array.from({ length: 7 }, () => 0);
  for (const f of vistas) {
    horas[horaLocal(f.creado_en)] += 1;
    diasSemana[diaSemana(fechaLocal(f.creado_en))] += 1;
  }
  const porDiaContactos = new Map<string, number>();
  for (const f of dentro) {
    if (!esContacto(f)) continue;
    const d = fechaLocal(f.creado_en);
    porDiaContactos.set(d, (porDiaContactos.get(d) ?? 0) + 1);
  }
  const contactosPorDia = Array.from({ length: dias }, (_, i) => {
    const dia = sumarDias(desde, i);
    return { dia, n: porDiaContactos.get(dia) ?? 0 };
  });
  const anterior: PeriodoAnterior = {
    desde: antesDesde,
    hasta: antesHasta,
    visitas: antes.filter((f) => f.evento === "vista").length,
    contactos: antes.filter(esContacto).length,
    guardaron: antes.filter((f) => f.evento === "guardar").length,
    comparable: datosDesde !== null && datosDesde <= antesDesde,
  };
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
    anterior,
    datosDesde,
    ultimaVisita,
    contactosPorDia,
    horas,
    diasSemana,
    contenido: contenidoDe(dentro),
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
    promosWa: contar(dentro, "wa", (f) => (f.detalle.startsWith("promo:") ? f.detalle.slice(6) : ""), 8),
    promosVideo: contar(dentro, "promo", (f) => f.detalle, 8),
    fotos: contar(dentro, "foto", (f) => f.detalle, 6),
    preguntas: contar(dentro, "faq", (f) => f.detalle, 6),
    recomendaciones: contar(dentro, "rec", (f) => f.detalle, 8),
    asistente: {
      abrieron: dentro.filter((f) => f.evento === "bot" && f.detalle === "abrir").length,
      temas: contar(dentro, "bot", (f) => (f.detalle.startsWith("tema:") ? f.detalle.slice(5) : ""), 8),
      preguntas: contar(dentro, "bot", (f) => (f.detalle.startsWith("p:") ? f.detalle.slice(2) : ""), 8),
      paginas: contar(dentro, "bot", (f) => (f.detalle.startsWith("pagina:") ? f.detalle.slice(7) : ""), 6),
    },
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

/**
 * Lo que Robert (el gerente digital) ve de la tarjeta: totales cortos y anónimos de los últimos 30 y 7 días.
 * Sin visitas medidas devuelve «disponible: false» para que no confunda «sin datos» con «cero».
 */
export function tarjetaParaManager(r30: ResumenTarjeta, r7: ResumenTarjeta): Record<string, unknown> {
  if (!r30.visitas) {
    return { disponible: false, motivo: "La tarjeta web aún no ha registrado visitas (la medición anónima empezó el 15 de octubre de 2026)." };
  }
  const top = (c: Conteo[], n: number) => c.slice(0, n).map((x) => ({ nombre: x.nombre, veces: x.n }));
  const periodo = (r: ResumenTarjeta) => ({
    visitas: r.visitas,
    toques_whatsapp: r.toques.wa,
    toques_llamar: r.toques.llamar,
    toques_agendar: r.toques.agendar,
    guardaron_contacto: r.toques.guardar,
    contactos_por_100_visitas: contactosPor100(r),
  });
  const s = r30.semana;
  return {
    nota: "Medición anónima de la tarjeta web (/roberto). 'Visitas' = veces que se cargó la página (no personas únicas). 'Toques' = botones tocados: NO son mensajes enviados ni prospectos, y no se pueden ligar a un prospecto concreto. 'Directo (sin etiqueta)' en fuentes = sin etiqueta de origen en el enlace (?s=ig|wa|tiktok|qr).",
    datos_desde: r30.visitasPorDia.find((d) => d.n > 0)?.dia ?? r30.desde,
    ultimos_30_dias: {
      ...periodo(r30),
      desde_celular_pct: Math.round((r30.dispositivos.movil / r30.visitas) * 100),
      fuentes: top(fuentesLegibles(r30.fuentes), 5),
      llegaron_a_la_seccion: Object.fromEntries(r30.secciones.filter((x) => x.n > 0).map((x) => [x.id, x.n])),
      whatsapp_por_lugar: top(r30.waPorLugar, 5),
      productos_que_piden: top(r30.productos, 4),
      videos_mas_vistos: top(r30.videos, 3),
      promociones_toques_whatsapp: top(r30.promosWa, 3),
    },
    ultimos_7_dias: periodo(r7),
    dinero_bajo_control: {
      abrieron: s.abrieron,
      armaron_su_plan: s.planes,
      prospectos_guardados_en_el_crm: s.prospectos,
      toques_whatsapp: s.waTotal,
    },
  };
}
