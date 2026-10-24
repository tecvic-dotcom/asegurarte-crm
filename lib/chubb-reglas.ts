/**
 * Dana, tu empleada digital de Chubb Autos — reglas puras (cliente y servidor), sin IA y sin costo.
 *
 * Analogía: el cuaderno de producción de Chubb Autos que tú llevas en Excel, con una asistente que lo lee entero
 * y te dice (1) qué renovaciones vienen, (2) cuánto de la prima ya está pagado y (3) qué recibos siguen sin pagarse.
 *
 * De dónde sale todo: de la hoja «Producción» de tu Excel «Producción Detalle». Cada renglón es una póliza; en las
 * pólizas que NO se pagan de contado, las columnas de «Siguiente recibo pendiente» en adelante traen las FECHAS de los
 * recibos que aún no se pagan (cuando pagas uno, borras su fecha y subes el Excel de nuevo).
 *
 * Qué NO se sabe y por eso se estima (y la pantalla lo dice):
 *  - Cuánto pesa cada recibo: se reparte parejo (prima ÷ número de recibos). El primero suele ser un poco mayor porque lleva
 *    el derecho de póliza, así que el «pagado» es una aproximación muy cercana, no un dato del banco.
 *  - Si un recibo está pagado: se asume que SI no aparece su fecha en la lista de pendientes, ya está pagado.
 */
import { diasEntre, esFechaValida, fechaLarga, fechaNumerica, sumarMeses } from "./fechas";
import { esFechaExcel, serieAFecha, type HojaLeida, type ValorLeido } from "./xlsx-lector";

// ----------------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------------

export type FrecuenciaChubb = "anual" | "semestral" | "trimestral" | "mensual";
export type EstatusChubb = "pagada" | "pendiente";

/** Una póliza tal como viene en tu Excel (ya limpia). */
export interface PolizaChubb {
  /** Número sin espacios y en mayúsculas («AB 12345678» queda «AB12345678»). */
  poliza: string;
  /** Año y mes de emisión (columnas «Año» y «Mes emitida»). */
  anio: number;
  mes: number;
  asegurado: string;
  vehiculo: string | null;
  inicio: string;
  fin: string;
  prima_neta: number | null;
  prima_total: number | null;
  frecuencia: FrecuenciaChubb;
  estatus: EstatusChubb;
  /** Fechas de los recibos que aún no se pagan (AAAA-MM-DD, de la más antigua a la más nueva). */
  recibos_pendientes: string[];
}

/** Una carga del Excel guardada en tu Supabase. */
export interface CargaChubb {
  id: string;
  cargado_en: string;
  archivo: string;
  polizas: PolizaChubb[];
}

export const FRECUENCIAS: Record<FrecuenciaChubb, { nombre: string; recibos: number; meses: number }> = {
  anual: { nombre: "Anual", recibos: 1, meses: 12 },
  semestral: { nombre: "Semestral", recibos: 2, meses: 6 },
  trimestral: { nombre: "Trimestral", recibos: 4, meses: 3 },
  mensual: { nombre: "Mensual", recibos: 12, meses: 1 },
};
export const ORDEN_FRECUENCIAS: FrecuenciaChubb[] = ["anual", "semestral", "trimestral", "mensual"];

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const MAX_POLIZAS = 3000;
const MAX_RECIBOS = 24;

// ----------------------------------------------------------------------------
// Utilidades
// ----------------------------------------------------------------------------

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

function sinAcentos(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function llave(s: string): string {
  return sinAcentos(s).toLowerCase().replace(/\s+/g, " ").trim();
}

export function normalizarPoliza(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, "").toUpperCase();
}

/** $8,520.13 · $4,644 (en dinero de seguros importan los centavos). */
export function pesos(n: number): string {
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** $128 mil · $1.2 M, para espacios chicos. */
export function pesosCortos(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("es-MX", { maximumFractionDigits: 2 })} M`;
  if (abs >= 10_000) return `$${Math.round(n / 1000).toLocaleString("es-MX")} mil`;
  return `$${Math.round(n).toLocaleString("es-MX")}`;
}

export function porcentaje(parte: number, todo: number): number {
  return todo > 0 ? Math.round((parte / todo) * 100) : 0;
}

/** «2026-10» → «octubre 2026». */
export function etiquetaMes(clave: string): string {
  const [a, m] = clave.split("-").map(Number);
  return `${MESES[m - 1] ?? "?"} ${a}`;
}

// ----------------------------------------------------------------------------
// Leer el Excel
// ----------------------------------------------------------------------------

function aFecha(v: ValorLeido | undefined): string | null {
  let f: string | null = null;
  if (esFechaExcel(v)) f = v.fecha;
  else if (typeof v === "number" && v > 30_000 && v < 80_000) f = serieAFecha(v);
  else if (typeof v === "string") {
    const t = v.trim();
    const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const dmy = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
    if (iso) f = `${iso[1]}-${iso[2]}-${iso[3]}`;
    else if (dmy) f = `${dmy[3].length === 2 ? "20" + dmy[3] : dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  return f && esFechaValida(f) ? f : null;
}

function aDinero(v: ValorLeido | undefined): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? redondear(v) : null;
  if (typeof v === "string") {
    const n = Number(v.replace(/[$,\s]/g, ""));
    return v.trim() !== "" && Number.isFinite(n) && n >= 0 ? redondear(n) : null;
  }
  return null;
}

function aTexto(v: ValorLeido | undefined): string {
  if (v === null || v === undefined) return "";
  if (esFechaExcel(v)) return v.fecha;
  return String(v).replace(/\s+/g, " ").trim();
}

function aFrecuencia(v: ValorLeido | undefined): FrecuenciaChubb | null {
  const t = llave(aTexto(v));
  if (t.includes("anual") || t.includes("contado")) return "anual";
  if (t.includes("semest")) return "semestral";
  if (t.includes("trimest")) return "trimestral";
  if (t.includes("mensual")) return "mensual";
  return null;
}

function aMes(v: ValorLeido | undefined): number | null {
  if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 12) return v;
  const t = llave(aTexto(v));
  if (!t) return null;
  const i = MESES.findIndex((m) => m === t || m.slice(0, 3) === t.slice(0, 3));
  return i >= 0 ? i + 1 : null;
}

export interface LecturaExcelChubb {
  polizas: PolizaChubb[];
  avisos: string[];
  hoja: string;
}

type Columnas = Partial<Record<"poliza" | "asegurado" | "vehiculo" | "inicio" | "fin" | "neta" | "total" | "frecuencia" | "estatus" | "anio" | "mes" | "recibos", number>>;

function buscarEncabezado(hoja: HojaLeida): { fila: number; cols: Columnas } | null {
  for (let r = 0; r < Math.min(hoja.filas.length, 15); r++) {
    const cols: Columnas = {};
    hoja.filas[r].forEach((celda, c) => {
      const t = llave(aTexto(celda));
      if (!t) return;
      if (t === "poliza") cols.poliza ??= c;
      else if (t === "asegurado") cols.asegurado ??= c;
      else if (t === "vehiculo" || t === "descripcion vehiculo" || t === "descripcion del vehiculo") cols.vehiculo ??= c;
      else if (t.startsWith("inicio")) cols.inicio ??= c;
      else if (t.startsWith("fin")) cols.fin ??= c;
      else if (t === "prima neta") cols.neta ??= c;
      else if (t === "prima total") cols.total ??= c;
      else if (t.includes("frecuencia")) cols.frecuencia ??= c;
      else if (t.includes("estatus")) cols.estatus ??= c;
      else if (t === "ano" || t === "anio") cols.anio ??= c;
      else if (t.startsWith("mes")) cols.mes ??= c;
      else if (t.includes("siguiente recibo") || t.includes("recibos pendientes")) cols.recibos ??= c;
    });
    if (cols.poliza !== undefined && cols.asegurado !== undefined) return { fila: r, cols };
  }
  return null;
}

/**
 * De las hojas de tu Excel a la lista de pólizas. Busca la hoja «Producción» (o la primera que tenga las columnas
 * «Poliza» y «Asegurado»), lee cada renglón y avisa de lo que no pudo entender (nunca se salta algo en silencio).
 */
export function polizasDesdeHojas(hojas: HojaLeida[]): { ok: true; lectura: LecturaExcelChubb } | { ok: false; error: string } {
  const candidatas = [...hojas].sort((a, b) => Number(/produccion/.test(llave(b.nombre))) - Number(/produccion/.test(llave(a.nombre))));
  let elegida: { hoja: HojaLeida; fila: number; cols: Columnas } | null = null;
  for (const h of candidatas) {
    const e = buscarEncabezado(h);
    if (e) {
      elegida = { hoja: h, ...e };
      break;
    }
  }
  if (!elegida) {
    return { ok: false, error: "No encontré la hoja de producción: busco una hoja con las columnas «Poliza» y «Asegurado» en sus primeros renglones." };
  }
  const { hoja, fila, cols } = elegida;
  const faltan = (
    [
      ["inicio", "Inicio Vigencia"],
      ["fin", "Fin Vigencia"],
      ["frecuencia", "Frecuencia de pago"],
    ] as const
  )
    .filter(([k]) => cols[k] === undefined)
    .map(([, nombre]) => `«${nombre}»`);
  if (faltan.length) return { ok: false, error: `A la hoja «${hoja.nombre}» le falta la columna ${faltan.join(", ")}.` };

  const avisos: string[] = [];
  const polizas = new Map<string, PolizaChubb>();
  for (let r = fila + 1; r < hoja.filas.length; r++) {
    const f = hoja.filas[r];
    const numero = normalizarPoliza(f[cols.poliza!]);
    if (!numero) continue;
    const donde = `Renglón ${r + 1} (${numero})`;
    const inicio = aFecha(f[cols.inicio!]);
    const fin = aFecha(f[cols.fin!]);
    if (!inicio || !fin) {
      avisos.push(`${donde}: no tiene fecha de inicio o de fin válida; la dejé fuera.`);
      continue;
    }
    if (fin <= inicio) {
      avisos.push(`${donde}: su fin de vigencia es igual o anterior al inicio; la dejé fuera.`);
      continue;
    }
    const frecuencia = aFrecuencia(f[cols.frecuencia!]);
    if (!frecuencia) {
      avisos.push(`${donde}: no entendí su frecuencia de pago («${aTexto(f[cols.frecuencia!])}»); la dejé fuera.`);
      continue;
    }
    const asegurado = aTexto(f[cols.asegurado!]);
    if (!asegurado) {
      avisos.push(`${donde}: no tiene asegurado; la dejé fuera.`);
      continue;
    }
    if (polizas.has(numero)) avisos.push(`${donde}: el número aparece más de una vez; me quedé con el último renglón.`);

    // Las fechas de recibos pendientes: todas las celdas de la columna «Siguiente recibo pendiente» hacia la derecha.
    const recibos: string[] = [];
    if (cols.recibos !== undefined) {
      for (let c = cols.recibos; c < f.length; c++) {
        const d = aFecha(f[c]);
        if (d && !recibos.includes(d)) recibos.push(d);
      }
    }
    recibos.sort();

    const textoEstatus = llave(aTexto(f[cols.estatus ?? -1]));
    const estatus: EstatusChubb = textoEstatus.includes("pend") ? "pendiente" : textoEstatus.includes("pag") ? "pagada" : recibos.length ? "pendiente" : "pagada";

    const vehiculoCrudo = aTexto(f[cols.vehiculo ?? -1]);
    const anioCrudo = f[cols.anio ?? -1];
    const anio = typeof anioCrudo === "number" && Number.isInteger(anioCrudo) && anioCrudo >= 2000 && anioCrudo <= 2100 ? anioCrudo : Number(inicio.slice(0, 4));

    polizas.set(numero, {
      poliza: numero,
      anio,
      mes: aMes(f[cols.mes ?? -1]) ?? Number(inicio.slice(5, 7)),
      asegurado,
      vehiculo: vehiculoCrudo && !/^no encontrada/i.test(vehiculoCrudo) ? vehiculoCrudo : null,
      inicio,
      fin,
      prima_neta: aDinero(f[cols.neta ?? -1]),
      prima_total: aDinero(f[cols.total ?? -1]),
      frecuencia,
      estatus,
      recibos_pendientes: recibos.slice(0, MAX_RECIBOS),
    });
    if (recibos.length > MAX_RECIBOS) avisos.push(`${donde}: trae ${recibos.length} fechas de recibos; solo tomé las primeras ${MAX_RECIBOS}.`);
  }
  if (!polizas.size) return { ok: false, error: `La hoja «${hoja.nombre}» no trae ninguna póliza que pueda leer.` };
  return { ok: true, lectura: { polizas: [...polizas.values()], avisos, hoja: hoja.nombre } };
}

// ----------------------------------------------------------------------------
// Validar lo que llega al servidor (nunca confiamos en lo que manda el navegador)
// ----------------------------------------------------------------------------

function numeroOpcional(v: unknown): number | null | undefined {
  if (v === null || v === undefined) return null;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 50_000_000 ? redondear(v) : undefined;
}

export function validarPolizasChubb(entrada: unknown): { ok: true; polizas: PolizaChubb[] } | { ok: false; error: string } {
  if (!Array.isArray(entrada) || entrada.length === 0) return { ok: false, error: "El Excel no trae pólizas." };
  if (entrada.length > MAX_POLIZAS) return { ok: false, error: `Son demasiadas pólizas (máximo ${MAX_POLIZAS}).` };
  const vistas = new Set<string>();
  const salida: PolizaChubb[] = [];
  for (const crudo of entrada) {
    const o = (crudo ?? {}) as Record<string, unknown>;
    const poliza = normalizarPoliza(o.poliza);
    if (poliza.length < 3 || poliza.length > 40) return { ok: false, error: "Hay una póliza sin número válido." };
    if (vistas.has(poliza)) return { ok: false, error: `La póliza ${poliza} viene repetida.` };
    vistas.add(poliza);
    const asegurado = typeof o.asegurado === "string" ? o.asegurado.trim() : "";
    if (!asegurado || asegurado.length > 200) return { ok: false, error: `La póliza ${poliza} no trae un asegurado válido.` };
    if (typeof o.inicio !== "string" || typeof o.fin !== "string" || !esFechaValida(o.inicio) || !esFechaValida(o.fin) || o.fin <= o.inicio) {
      return { ok: false, error: `La póliza ${poliza} no trae fechas de vigencia válidas.` };
    }
    const frecuencia = o.frecuencia as FrecuenciaChubb;
    if (!ORDEN_FRECUENCIAS.includes(frecuencia)) return { ok: false, error: `La póliza ${poliza} no trae una frecuencia de pago válida.` };
    if (o.estatus !== "pagada" && o.estatus !== "pendiente") return { ok: false, error: `La póliza ${poliza} no trae un estatus de pago válido.` };
    const anio = Number(o.anio);
    const mes = Number(o.mes);
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100 || !Number.isInteger(mes) || mes < 1 || mes > 12) {
      return { ok: false, error: `La póliza ${poliza} no trae año y mes de emisión válidos.` };
    }
    const neta = numeroOpcional(o.prima_neta);
    const total = numeroOpcional(o.prima_total);
    if (neta === undefined || total === undefined) return { ok: false, error: `La póliza ${poliza} trae una prima que no es un monto válido.` };
    const vehiculo = typeof o.vehiculo === "string" && o.vehiculo.trim() ? o.vehiculo.trim().slice(0, 300) : null;
    const recibosCrudos = Array.isArray(o.recibos_pendientes) ? o.recibos_pendientes : [];
    if (recibosCrudos.length > MAX_RECIBOS || recibosCrudos.some((x) => typeof x !== "string" || !esFechaValida(x))) {
      return { ok: false, error: `La póliza ${poliza} trae fechas de recibos que no son válidas.` };
    }
    salida.push({
      poliza,
      anio,
      mes,
      asegurado,
      vehiculo,
      inicio: o.inicio,
      fin: o.fin,
      prima_neta: neta,
      prima_total: total,
      frecuencia,
      estatus: o.estatus,
      recibos_pendientes: [...new Set(recibosCrudos as string[])].sort(),
    });
  }
  return { ok: true, polizas: salida };
}

export function limpiarNombreArchivo(v: unknown): string {
  const t = typeof v === "string" ? v.replace(/^.*[\\/]/, "").trim() : "";
  return (t || "Excel de Chubb Autos").slice(0, 150);
}

// ----------------------------------------------------------------------------
// Análisis de cada póliza
// ----------------------------------------------------------------------------

export type EstadoRecibo = "vencido" | "hoy" | "proximo" | "futuro";
export type NivelRenovacion = "vencida" | "urgente" | "pronto" | "cerca" | "planear" | "lejos";
export type VigenciaChubb = "vigente" | "vencida" | "por_iniciar";

export interface ReciboChubb {
  numero: number;
  de: number;
  fecha: string;
  /** Días que faltan (negativo = ya venció). */
  dias: number;
  estado: EstadoRecibo;
  /** Importe aproximado: prima total ÷ número de recibos. */
  importe: number | null;
  /** true cuando el Excel no traía la fecha y Dana la calculó con el calendario de pagos. */
  calculado: boolean;
}

export type CodigoAviso =
  | "sin_vehiculo"
  | "sin_prima"
  | "prima_incoherente"
  | "sin_fechas"
  | "pagada_con_pendientes"
  | "fechas_de_mas"
  | "fecha_fuera_calendario"
  | "vigencia_rara"
  | "anual_con_fechas";

export interface AvisoChubb {
  codigo: CodigoAviso;
  texto: string;
}

export interface InfoPoliza {
  p: PolizaChubb;
  vigencia: VigenciaChubb;
  /** Días para que termine la vigencia (negativo = ya terminó). */
  dias_renovar: number;
  nivel: NivelRenovacion;
  recibos_total: number;
  recibos_pagados: number;
  recibos: ReciboChubb[];
  neta_pagada: number;
  neta_por_cobrar: number;
  total_pagada: number;
  total_por_cobrar: number;
  avisos: AvisoChubb[];
}

export const TITULO_AVISO: Record<CodigoAviso, string> = {
  sin_vehiculo: "Sin vehículo",
  sin_prima: "Sin prima",
  prima_incoherente: "Prima rara",
  sin_fechas: "Recibos sin fechas",
  pagada_con_pendientes: "Pagada con recibos pendientes",
  fechas_de_mas: "Más fechas que recibos",
  fecha_fuera_calendario: "Fecha fuera de calendario",
  vigencia_rara: "Vigencia rara",
  anual_con_fechas: "Anual con fechas",
};

export function nivelRenovacion(dias: number): NivelRenovacion {
  if (dias < 0) return "vencida";
  if (dias <= 15) return "urgente";
  if (dias <= 30) return "pronto";
  if (dias <= 60) return "cerca";
  if (dias <= 90) return "planear";
  return "lejos";
}

/** Fechas en que debe pagarse cada recibo según el inicio de la vigencia. */
export function calendarioDePagos(inicio: string, frecuencia: FrecuenciaChubb): string[] {
  const { recibos, meses } = FRECUENCIAS[frecuencia];
  return Array.from({ length: recibos }, (_, k) => sumarMeses(inicio, k * meses));
}

function estadoDeRecibo(dias: number): EstadoRecibo {
  return dias < 0 ? "vencido" : dias === 0 ? "hoy" : dias <= 30 ? "proximo" : "futuro";
}

export function analizarPoliza(p: PolizaChubb, hoy: string): InfoPoliza {
  const cfg = FRECUENCIAS[p.frecuencia];
  const n = cfg.recibos;
  const avisos: AvisoChubb[] = [];
  const fechas = [...p.recibos_pendientes].sort();

  // Qué recibos siguen sin pagarse.
  let pendientes: string[];
  let calculado = false;
  if (p.frecuencia === "anual") {
    pendientes = p.estatus === "pendiente" || fechas.length ? [fechas[0] ?? p.inicio] : [];
    if (fechas.length) avisos.push({ codigo: "anual_con_fechas", texto: "Es anual pero trae fechas de recibos pendientes." });
  } else if (fechas.length) {
    pendientes = fechas;
  } else if (p.estatus === "pendiente") {
    pendientes = calendarioDePagos(p.inicio, p.frecuencia);
    calculado = true;
    avisos.push({
      codigo: "sin_fechas",
      texto: "Está «pendiente de pago» pero el Excel no trae las fechas de sus recibos. Dana calculó las fechas con el calendario y asumió que ninguno está pagado.",
    });
  } else {
    pendientes = [];
  }

  if (p.estatus === "pagada" && fechas.length && p.frecuencia !== "anual") {
    avisos.push({ codigo: "pagada_con_pendientes", texto: "Dice «pagada» pero trae fechas de recibos pendientes; Dana tomó las fechas como pendientes." });
  }
  if (p.frecuencia !== "anual" && fechas.length > n) {
    avisos.push({ codigo: "fechas_de_mas", texto: `Trae ${fechas.length} fechas pendientes y por su frecuencia solo debe tener ${n} recibos.` });
  }
  if (p.frecuencia !== "anual" && fechas.length) {
    const calendario = calendarioDePagos(p.inicio, p.frecuencia);
    const raras = fechas.filter((f) => !calendario.some((c) => Math.abs(diasEntre(c, f)) <= 7));
    if (raras.length) {
      avisos.push({
        codigo: "fecha_fuera_calendario",
        texto: `${raras.length === 1 ? "La fecha" : "Las fechas"} ${raras.map(fechaNumerica).join(", ")} no ${raras.length === 1 ? "cuadra" : "cuadran"} con su calendario de pagos (¿error de captura?).`,
      });
    }
  }

  const de = Math.max(n, pendientes.length);
  const pagados = Math.max(0, n - pendientes.length);
  const primero = Math.max(0, n - pendientes.length);
  const importe = p.prima_total === null ? null : p.prima_total / n;
  const recibos: ReciboChubb[] = pendientes.map((fecha, j) => {
    const dias = diasEntre(hoy, fecha);
    return { numero: primero + j + 1, de, fecha, dias, estado: estadoDeRecibo(dias), importe, calculado };
  });

  // Cuánto de la prima ya está pagado (reparto parejo entre los recibos).
  const fraccion = pagados / n;
  const neta = p.prima_neta ?? 0;
  const total = p.prima_total ?? 0;
  const neta_pagada = redondear(neta * fraccion);
  const total_pagada = redondear(total * fraccion);

  if (!p.vehiculo) avisos.push({ codigo: "sin_vehiculo", texto: "No trae la descripción del vehículo." });
  if (p.prima_neta === null || p.prima_total === null) {
    avisos.push({ codigo: "sin_prima", texto: `No trae ${p.prima_neta === null && p.prima_total === null ? "ninguna de las dos primas" : p.prima_neta === null ? "la prima neta" : "la prima total"}.` });
  } else if (p.prima_total < p.prima_neta) {
    avisos.push({ codigo: "prima_incoherente", texto: "La prima total es menor que la neta." });
  }
  const duracion = diasEntre(p.inicio, p.fin);
  if (duracion < 364 || duracion > 366) {
    avisos.push({ codigo: "vigencia_rara", texto: `Su vigencia dura ${duracion} días (lo normal es 1 año).` });
  }

  const dias_renovar = diasEntre(hoy, p.fin);
  return {
    p,
    vigencia: p.fin < hoy ? "vencida" : p.inicio > hoy ? "por_iniciar" : "vigente",
    dias_renovar,
    nivel: nivelRenovacion(dias_renovar),
    recibos_total: n,
    recibos_pagados: pagados,
    recibos,
    neta_pagada,
    neta_por_cobrar: redondear(neta - neta_pagada),
    total_pagada,
    total_por_cobrar: redondear(total - total_pagada),
    avisos,
  };
}

export function analizarTodas(polizas: PolizaChubb[], hoy: string): InfoPoliza[] {
  return polizas.map((p) => analizarPoliza(p, hoy));
}

// ----------------------------------------------------------------------------
// Filtros
// ----------------------------------------------------------------------------

export interface FiltrosChubb {
  /** El año y el mes se miran sobre la emisión (como en tu Excel) o sobre el fin de vigencia (la renovación). */
  ver: "emision" | "renovacion";
  anio: number | null;
  mes: number | null;
  frecuencia: FrecuenciaChubb | null;
  /** «con_pendientes» = tiene recibos sin pagar; «al_corriente» = no tiene ninguno. */
  pagos: "con_pendientes" | "al_corriente" | null;
  busca: string;
}

export const SIN_FILTROS: FiltrosChubb = { ver: "emision", anio: null, mes: null, frecuencia: null, pagos: null, busca: "" };

export function hayFiltros(f: FiltrosChubb): boolean {
  return f.anio !== null || f.mes !== null || f.frecuencia !== null || f.pagos !== null || f.busca.trim() !== "";
}

export function filtrarPolizas(infos: InfoPoliza[], f: FiltrosChubb): InfoPoliza[] {
  const q = llave(f.busca);
  return infos.filter((i) => {
    const anio = f.ver === "emision" ? i.p.anio : Number(i.p.fin.slice(0, 4));
    const mes = f.ver === "emision" ? i.p.mes : Number(i.p.fin.slice(5, 7));
    if (f.anio !== null && anio !== f.anio) return false;
    if (f.mes !== null && mes !== f.mes) return false;
    if (f.frecuencia && i.p.frecuencia !== f.frecuencia) return false;
    if (f.pagos === "con_pendientes" && i.recibos.length === 0) return false;
    if (f.pagos === "al_corriente" && i.recibos.length > 0) return false;
    if (q && !llave(`${i.p.asegurado} ${i.p.poliza} ${i.p.vehiculo ?? ""}`).includes(q)) return false;
    return true;
  });
}

/** Años y meses que sí existen en los datos, para ofrecer solo opciones con resultados. */
export function opcionesDeFiltro(infos: InfoPoliza[], ver: FiltrosChubb["ver"]): { anios: number[]; meses: number[] } {
  const anios = new Set<number>();
  const meses = new Set<number>();
  for (const i of infos) {
    anios.add(ver === "emision" ? i.p.anio : Number(i.p.fin.slice(0, 4)));
    meses.add(ver === "emision" ? i.p.mes : Number(i.p.fin.slice(5, 7)));
  }
  return { anios: [...anios].sort(), meses: [...meses].sort((a, b) => a - b) };
}

// ----------------------------------------------------------------------------
// Resumen: los indicadores
// ----------------------------------------------------------------------------

export interface Monto {
  n: number;
  neta: number;
  total: number;
}

export interface ResumenChubb {
  polizas: number;
  vigentes: number;
  vencidas: number;
  por_iniciar: number;
  prima_neta: number;
  prima_total: number;
  neta_pagada: number;
  neta_por_cobrar: number;
  total_pagada: number;
  total_por_cobrar: number;
  /** % de la prima neta que ya está pagada. */
  pct_pagado: number;
  neta_promedio: number;
  sin_prima: number;
  por_frecuencia: { frecuencia: FrecuenciaChubb; polizas: number; neta: number; total: number; con_pendientes: number }[];
  /** Pólizas emitidas por mes (AAAA-MM), de la más antigua a la más nueva. */
  por_mes_emision: { clave: string; polizas: number; neta: number }[];
  /** Renovaciones por mes (AAAA-MM de su fin de vigencia), de la más cercana a la más lejana. */
  por_mes_renovacion: { clave: string; polizas: number; neta: number; total: number }[];
  renovaciones: {
    vencidas: Monto;
    d15: Monto;
    d30: Monto;
    d60: Monto;
    d90: Monto;
    proxima: { asegurado: string; poliza: string; fecha: string; dias: number } | null;
  };
  recibos: {
    pendientes: number;
    polizas_con_pendientes: number;
    vencidos: { n: number; importe: number };
    hoy: { n: number; importe: number };
    d7: { n: number; importe: number };
    d30: { n: number; importe: number };
    importe_pendiente: number;
    calculados: number;
  };
  top_clientes: { nombre: string; polizas: number; neta: number }[];
  avisos: { codigo: CodigoAviso; titulo: string; polizas: number }[];
}

function vacio(): Monto {
  return { n: 0, neta: 0, total: 0 };
}
function sumar(m: Monto, i: InfoPoliza) {
  m.n += 1;
  m.neta = redondear(m.neta + (i.p.prima_neta ?? 0));
  m.total = redondear(m.total + (i.p.prima_total ?? 0));
}

export function resumenChubb(infos: InfoPoliza[]): ResumenChubb {
  const r: ResumenChubb = {
    polizas: infos.length,
    vigentes: 0,
    vencidas: 0,
    por_iniciar: 0,
    prima_neta: 0,
    prima_total: 0,
    neta_pagada: 0,
    neta_por_cobrar: 0,
    total_pagada: 0,
    total_por_cobrar: 0,
    pct_pagado: 0,
    neta_promedio: 0,
    sin_prima: 0,
    por_frecuencia: ORDEN_FRECUENCIAS.map((frecuencia) => ({ frecuencia, polizas: 0, neta: 0, total: 0, con_pendientes: 0 })),
    por_mes_emision: [],
    por_mes_renovacion: [],
    renovaciones: { vencidas: vacio(), d15: vacio(), d30: vacio(), d60: vacio(), d90: vacio(), proxima: null },
    recibos: {
      pendientes: 0,
      polizas_con_pendientes: 0,
      vencidos: { n: 0, importe: 0 },
      hoy: { n: 0, importe: 0 },
      d7: { n: 0, importe: 0 },
      d30: { n: 0, importe: 0 },
      importe_pendiente: 0,
      calculados: 0,
    },
    top_clientes: [],
    avisos: [],
  };
  const emision = new Map<string, { polizas: number; neta: number }>();
  const renovacion = new Map<string, { polizas: number; neta: number; total: number }>();
  const clientes = new Map<string, { nombre: string; polizas: number; neta: number }>();
  const avisos = new Map<CodigoAviso, number>();
  let conNeta = 0;

  for (const i of infos) {
    const neta = i.p.prima_neta ?? 0;
    const total = i.p.prima_total ?? 0;
    if (i.vigencia === "vigente") r.vigentes++;
    else if (i.vigencia === "vencida") r.vencidas++;
    else r.por_iniciar++;
    r.prima_neta = redondear(r.prima_neta + neta);
    r.prima_total = redondear(r.prima_total + total);
    r.neta_pagada = redondear(r.neta_pagada + i.neta_pagada);
    r.neta_por_cobrar = redondear(r.neta_por_cobrar + i.neta_por_cobrar);
    r.total_pagada = redondear(r.total_pagada + i.total_pagada);
    r.total_por_cobrar = redondear(r.total_por_cobrar + i.total_por_cobrar);
    if (i.p.prima_neta === null) r.sin_prima++;
    else conNeta++;

    const f = r.por_frecuencia.find((x) => x.frecuencia === i.p.frecuencia)!;
    f.polizas++;
    f.neta = redondear(f.neta + neta);
    f.total = redondear(f.total + total);
    if (i.recibos.length) f.con_pendientes++;

    const claveEmision = `${i.p.anio}-${String(i.p.mes).padStart(2, "0")}`;
    const e = emision.get(claveEmision) ?? { polizas: 0, neta: 0 };
    e.polizas++;
    e.neta = redondear(e.neta + neta);
    emision.set(claveEmision, e);

    // Renovaciones: solo las que aún no terminan (o terminaron hace poco, para que no se pierdan de vista).
    const claveRen = i.p.fin.slice(0, 7);
    const rn = renovacion.get(claveRen) ?? { polizas: 0, neta: 0, total: 0 };
    rn.polizas++;
    rn.neta = redondear(rn.neta + neta);
    rn.total = redondear(rn.total + total);
    renovacion.set(claveRen, rn);
    if (i.dias_renovar < 0) sumar(r.renovaciones.vencidas, i);
    else {
      if (i.dias_renovar <= 15) sumar(r.renovaciones.d15, i);
      if (i.dias_renovar <= 30) sumar(r.renovaciones.d30, i);
      if (i.dias_renovar <= 60) sumar(r.renovaciones.d60, i);
      if (i.dias_renovar <= 90) sumar(r.renovaciones.d90, i);
      const prox = r.renovaciones.proxima;
      if (!prox || i.dias_renovar < prox.dias) {
        r.renovaciones.proxima = { asegurado: i.p.asegurado, poliza: i.p.poliza, fecha: i.p.fin, dias: i.dias_renovar };
      }
    }

    if (i.recibos.length) r.recibos.polizas_con_pendientes++;
    for (const rc of i.recibos) {
      const imp = rc.importe ?? 0;
      r.recibos.pendientes++;
      r.recibos.importe_pendiente = redondear(r.recibos.importe_pendiente + imp);
      if (rc.calculado) r.recibos.calculados++;
      const suma = (g: { n: number; importe: number }) => {
        g.n++;
        g.importe = redondear(g.importe + imp);
      };
      if (rc.estado === "vencido") suma(r.recibos.vencidos);
      if (rc.estado === "hoy") suma(r.recibos.hoy);
      if (rc.dias >= 0 && rc.dias <= 7) suma(r.recibos.d7);
      if (rc.dias >= 0 && rc.dias <= 30) suma(r.recibos.d30);
    }

    const nombre = llave(i.p.asegurado);
    const c = clientes.get(nombre) ?? { nombre: i.p.asegurado, polizas: 0, neta: 0 };
    c.polizas++;
    c.neta = redondear(c.neta + neta);
    clientes.set(nombre, c);
    for (const a of i.avisos) avisos.set(a.codigo, (avisos.get(a.codigo) ?? 0) + 1);
  }

  r.pct_pagado = porcentaje(r.neta_pagada, r.prima_neta);
  r.neta_promedio = conNeta ? redondear(r.prima_neta / conNeta) : 0;
  r.por_mes_emision = [...emision.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([clave, v]) => ({ clave, ...v }));
  r.por_mes_renovacion = [...renovacion.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([clave, v]) => ({ clave, ...v }));
  r.top_clientes = [...clientes.values()].sort((a, b) => b.neta - a.neta || b.polizas - a.polizas).slice(0, 5);
  r.avisos = (Object.keys(TITULO_AVISO) as CodigoAviso[])
    .filter((codigo) => avisos.has(codigo))
    .map((codigo) => ({ codigo, titulo: TITULO_AVISO[codigo], polizas: avisos.get(codigo)! }));
  return r;
}

// ----------------------------------------------------------------------------
// Listas
// ----------------------------------------------------------------------------

export type VentanaRenovacion = "vencidas" | "30" | "60" | "90" | "todas";

/** Pólizas por renovar, de la que vence primero a la última. «vencidas» = ya terminó su vigencia. */
export function listaRenovaciones(infos: InfoPoliza[], ventana: VentanaRenovacion): InfoPoliza[] {
  const lim = ventana === "todas" ? Infinity : ventana === "vencidas" ? -1 : Number(ventana);
  return infos
    .filter((i) => (ventana === "vencidas" ? i.dias_renovar < 0 : i.dias_renovar >= 0 && i.dias_renovar <= lim))
    .sort((a, b) => a.dias_renovar - b.dias_renovar || a.p.asegurado.localeCompare(b.p.asegurado));
}

export interface ReciboConPoliza extends ReciboChubb {
  info: InfoPoliza;
}

export type VentanaRecibos = "vencidos" | "7" | "30" | "todos";

/** Recibos sin pagar, del más atrasado al más lejano. */
export function listaRecibos(infos: InfoPoliza[], ventana: VentanaRecibos): ReciboConPoliza[] {
  return infos
    .flatMap((info) => info.recibos.map((r) => ({ ...r, info })))
    .filter((r) => (ventana === "vencidos" ? r.dias < 0 : ventana === "todos" ? true : r.dias >= 0 && r.dias <= Number(ventana)))
    .sort((a, b) => a.dias - b.dias || a.info.p.asegurado.localeCompare(b.info.p.asegurado));
}

export function etiquetaVencimiento(dias: number): string {
  if (dias < 0) return `venció hace ${-dias} ${-dias === 1 ? "día" : "días"}`;
  if (dias === 0) return "vence hoy";
  return `vence en ${dias} ${dias === 1 ? "día" : "días"}`;
}

export function etiquetaRenovacion(dias: number): string {
  if (dias < 0) return `terminó hace ${-dias} ${-dias === 1 ? "día" : "días"}`;
  if (dias === 0) return "termina hoy";
  return `en ${dias} ${dias === 1 ? "día" : "días"}`;
}

// ----------------------------------------------------------------------------
// Comparar dos cargas (qué cambió desde la última vez)
// ----------------------------------------------------------------------------

export interface CambiosCarga {
  nuevas: string[];
  quitadas: string[];
  /** Recibos que dejaron de aparecer como pendientes (se asumen pagados). */
  recibos_cobrados: number;
  recibos_nuevos: number;
  primas_cambiadas: number;
}

export function compararCargas(anterior: PolizaChubb[], nueva: PolizaChubb[]): CambiosCarga {
  const antes = new Map(anterior.map((p) => [p.poliza, p]));
  const ahora = new Map(nueva.map((p) => [p.poliza, p]));
  const c: CambiosCarga = {
    nuevas: nueva.filter((p) => !antes.has(p.poliza)).map((p) => p.poliza),
    quitadas: anterior.filter((p) => !ahora.has(p.poliza)).map((p) => p.poliza),
    recibos_cobrados: 0,
    recibos_nuevos: 0,
    primas_cambiadas: 0,
  };
  for (const p of nueva) {
    const a = antes.get(p.poliza);
    if (!a) continue;
    c.recibos_cobrados += a.recibos_pendientes.filter((f) => !p.recibos_pendientes.includes(f)).length;
    c.recibos_nuevos += p.recibos_pendientes.filter((f) => !a.recibos_pendientes.includes(f)).length;
    if (a.prima_neta !== p.prima_neta || a.prima_total !== p.prima_total) c.primas_cambiadas++;
  }
  return c;
}

// ----------------------------------------------------------------------------
// Texto para copiar / WhatsApp
// ----------------------------------------------------------------------------

export function nombreArchivoChubb(hoy: string): string {
  return `chubb-autos-dana-${hoy}.xlsx`;
}

export function textoReporteChubb(infos: InfoPoliza[], hoy: string, nota = ""): string {
  const r = resumenChubb(infos);
  const l: string[] = [];
  l.push(`*Chubb Autos · reporte de Dana*`);
  l.push(`Al ${fechaLarga(hoy)}${nota ? ` · ${nota}` : ""}`);
  l.push("");
  l.push(`*Producción*`);
  l.push(`• ${r.polizas} pólizas (${r.vigentes} vigentes${r.vencidas ? `, ${r.vencidas} ya vencidas` : ""})`);
  l.push(`• Prima neta: ${pesos(r.prima_neta)} · Prima total: ${pesos(r.prima_total)}`);
  l.push(`• Prima neta pagada: ${pesos(r.neta_pagada)} (${r.pct_pagado}%) · Por cobrar: ${pesos(r.neta_por_cobrar)}`);
  l.push("");
  l.push(`*Renovaciones*`);
  const ren = r.renovaciones;
  l.push(`• Próximos 30 días: ${ren.d30.n} (prima neta ${pesos(ren.d30.neta)})`);
  l.push(`• Próximos 60 días: ${ren.d60.n} · Próximos 90 días: ${ren.d90.n}`);
  if (ren.vencidas.n) l.push(`• Ya terminaron su vigencia: ${ren.vencidas.n}`);
  for (const i of listaRenovaciones(infos, "90").slice(0, 8)) {
    l.push(`   - ${fechaNumerica(i.p.fin)} · ${i.p.asegurado}${i.p.vehiculo ? ` · ${i.p.vehiculo}` : ""} (${etiquetaRenovacion(i.dias_renovar)})`);
  }
  l.push("");
  l.push(`*Recibos pendientes*`);
  const rc = r.recibos;
  l.push(`• ${rc.pendientes} recibos en ${rc.polizas_con_pendientes} pólizas · ≈ ${pesos(rc.importe_pendiente)}`);
  l.push(`• Vencidos: ${rc.vencidos.n} (≈ ${pesos(rc.vencidos.importe)}) · Próximos 7 días: ${rc.d7.n}`);
  for (const x of listaRecibos(infos, "vencidos").slice(0, 8)) {
    l.push(`   - ${x.info.p.asegurado} · recibo ${x.numero} de ${x.de} (${etiquetaVencimiento(x.dias)})`);
  }
  if (r.avisos.length) {
    l.push("");
    l.push(`*Por revisar en el Excel:* ${r.avisos.map((a) => `${a.titulo.toLowerCase()} (${a.polizas})`).join(", ")}`);
  }
  return l.join("\n");
}
