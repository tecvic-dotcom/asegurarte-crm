/**
 * Cotizaciones — reglas puras (cliente y servidor), sin dependencias del servidor.
 *
 * Una cotización es UNA opción que cotizaste a un prospecto: de qué ramo, con qué
 * aseguradora y plan, cuánto cuesta y qué coberturas trae. Se cotiza en el portal de
 * cada aseguradora; aquí se guarda, se compara con las demás opciones y se arma el
 * mensaje de WhatsApp para el cliente.
 */
import { esFechaValida, fechaLarga, sumarDias } from "./fechas";

export type RamoCotizacion = "gmm" | "autos" | "hogar" | "viaje" | "vida" | "ahorro";
export type MonedaCotizacion = "MN" | "DLS";
export type FormaPago = "mensual" | "trimestral" | "semestral";
export type EstadoCotizacion = "guardada" | "enviada" | "elegida" | "descartada";

export interface CampoCotizacion {
  clave: string;
  etiqueta: string;
  /** Ejemplo que se ve dentro del campo vacío. */
  ejemplo: string;
  /**
   * Dato de "qué se asegura" (asegurados, vehículo, viaje…): es el mismo en todas las opciones de un
   * cliente. Al "guardar y agregar otra" se conserva, y en el mensaje sale una sola vez si no cambia.
   */
  compartido?: boolean;
  /** Ocupa el renglón completo del formulario. */
  ancho?: boolean;
  /** Dato solo para ti (por ejemplo, el folio): se ve en la tabla pero NO sale en el mensaje al cliente. */
  interno?: boolean;
}

export interface InfoRamoCotizacion {
  id: RamoCotizacion;
  nombre: string;
  /** Nombre corto para botones y recordatorios. */
  corto: string;
  icono: string;
  /** Para el mensaje de WhatsApp. */
  emoji: string;
  /** Cómo se llama el precio en este ramo (lo que paga el cliente de contado). */
  etiquetaPrima: string;
  /** Si tiene sentido ofrecerlo en pagos (el viaje se paga completo). */
  enPagos: boolean;
  /** Ejemplo de plan para el formulario. */
  ejemploPlan: string;
  campos: CampoCotizacion[];
}

/** El número o folio que la aseguradora le da a la cotización (sirve para emitirla o reclamarla). */
const FOLIO: CampoCotizacion = { clave: "folio", etiqueta: "Número de cotización", ejemplo: "Ej. el folio que da el portal", interno: true };

/** En el orden en que aparecen: primero lo que más cotizas. */
export const RAMOS_COTIZACION: InfoRamoCotizacion[] = [
  {
    id: "gmm",
    nombre: "Gastos médicos mayores",
    corto: "GMM",
    icono: "flat-color-icons:plus",
    emoji: "🏥",
    etiquetaPrima: "Prima anual",
    enPagos: true,
    ejemploPlan: "Ej. Plan Flex",
    campos: [
      { clave: "asegurados", etiqueta: "Asegurados", ejemplo: "Titular 38 años, esposa 36, hijo 5", compartido: true, ancho: true },
      { clave: "suma_asegurada", etiqueta: "Suma asegurada", ejemplo: "Ej. 50 millones" },
      { clave: "deducible", etiqueta: "Deducible", ejemplo: "Ej. $30,000" },
      { clave: "coaseguro", etiqueta: "Coaseguro", ejemplo: "Ej. 10%" },
      { clave: "tope_coaseguro", etiqueta: "Tope de coaseguro", ejemplo: "Ej. $50,000" },
      { clave: "nivel_hospitalario", etiqueta: "Nivel o gama hospitalaria", ejemplo: "Ej. Esmeralda" },
      { clave: "extras", etiqueta: "Otros beneficios", ejemplo: "Ej. Cobertura nacional, medicamentos fuera del hospital", ancho: true },
      FOLIO,
    ],
  },
  {
    id: "autos",
    nombre: "Seguro de auto",
    corto: "Auto",
    icono: "flat-color-icons:automotive",
    emoji: "🚗",
    etiquetaPrima: "Prima anual",
    enPagos: true,
    ejemploPlan: "Ej. Cobertura amplia",
    campos: [
      { clave: "vehiculo", etiqueta: "Vehículo", ejemplo: "Ej. Mazda 3 Sedán 2022", compartido: true, ancho: true },
      { clave: "cobertura", etiqueta: "Tipo de cobertura", ejemplo: "Ej. Amplia" },
      { clave: "suma_asegurada", etiqueta: "Suma asegurada", ejemplo: "Ej. Valor comercial" },
      { clave: "deducible_danos", etiqueta: "Deducible daños materiales", ejemplo: "Ej. 5%" },
      { clave: "deducible_robo", etiqueta: "Deducible robo total", ejemplo: "Ej. 10%" },
      { clave: "rc", etiqueta: "Responsabilidad civil", ejemplo: "Ej. $3,000,000" },
      { clave: "gastos_medicos", etiqueta: "Gastos médicos ocupantes", ejemplo: "Ej. $200,000" },
      { clave: "extras", etiqueta: "Otros beneficios", ejemplo: "Ej. Asistencia vial, auto relevo, defensa legal", ancho: true },
      FOLIO,
    ],
  },
  {
    id: "hogar",
    nombre: "Seguro de hogar",
    corto: "Hogar",
    icono: "flat-color-icons:home",
    emoji: "🏠",
    etiquetaPrima: "Prima anual",
    enPagos: true,
    ejemploPlan: "Ej. Hogar integral",
    campos: [
      { clave: "inmueble", etiqueta: "Inmueble", ejemplo: "Ej. Casa, 180 m², CP 44100", compartido: true, ancho: true },
      { clave: "suma_construccion", etiqueta: "Suma de la construcción", ejemplo: "Ej. $2,500,000" },
      { clave: "suma_contenidos", etiqueta: "Suma de contenidos", ejemplo: "Ej. $500,000" },
      { clave: "rc", etiqueta: "Responsabilidad civil", ejemplo: "Ej. $1,000,000" },
      { clave: "deducible", etiqueta: "Deducible", ejemplo: "Ej. 2%" },
      { clave: "coberturas", etiqueta: "Coberturas incluidas", ejemplo: "Ej. Sismo, huracán, inundación, robo", ancho: true },
      FOLIO,
    ],
  },
  {
    id: "viaje",
    nombre: "Seguro de viaje",
    corto: "Viaje",
    icono: "flat-color-icons:globe",
    emoji: "✈️",
    etiquetaPrima: "Costo del seguro",
    enPagos: false,
    ejemploPlan: "Ej. Plan internacional",
    campos: [
      { clave: "viaje", etiqueta: "Destino y fechas", ejemplo: "Ej. Cancún, del 12 al 19 de diciembre", compartido: true, ancho: true },
      { clave: "viajeros", etiqueta: "Viajeros", ejemplo: "Ej. 2 adultos y 1 menor de 8 años", compartido: true, ancho: true },
      { clave: "gastos_medicos", etiqueta: "Gastos médicos", ejemplo: "Ej. USD 100,000" },
      { clave: "cancelacion", etiqueta: "Cancelación o interrupción", ejemplo: "Ej. Hasta USD 5,000" },
      { clave: "equipaje", etiqueta: "Equipaje", ejemplo: "Ej. USD 1,500" },
      { clave: "extras", etiqueta: "Otros beneficios", ejemplo: "Ej. Asistencia 24 h, deportes recreativos", ancho: true },
      FOLIO,
    ],
  },
  {
    id: "vida",
    nombre: "Seguro de vida",
    corto: "Vida",
    icono: "flat-color-icons:like",
    emoji: "❤️",
    etiquetaPrima: "Prima anual",
    enPagos: true,
    ejemploPlan: "Ej. Vida temporal",
    campos: [
      { clave: "asegurado", etiqueta: "Asegurado", ejemplo: "Ej. Hombre 35 años, no fumador", compartido: true, ancho: true },
      { clave: "suma_asegurada", etiqueta: "Suma asegurada", ejemplo: "Ej. $3,000,000" },
      { clave: "plazo", etiqueta: "Plazo", ejemplo: "Ej. 20 años" },
      { clave: "coberturas", etiqueta: "Coberturas adicionales", ejemplo: "Ej. Invalidez, enfermedades graves", ancho: true },
      FOLIO,
    ],
  },
  {
    id: "ahorro",
    nombre: "Plan de ahorro",
    corto: "Ahorro",
    icono: "flat-color-icons:safe",
    emoji: "💰",
    etiquetaPrima: "Prima anual",
    enPagos: true,
    ejemploPlan: "Ej. Ahorro educación",
    campos: [
      { clave: "asegurado", etiqueta: "Contratante", ejemplo: "Ej. Mujer 30 años", compartido: true, ancho: true },
      { clave: "objetivo", etiqueta: "Objetivo", ejemplo: "Ej. Educación de los hijos", compartido: true },
      { clave: "aportacion", etiqueta: "Aportación", ejemplo: "Ej. $3,000 al mes" },
      { clave: "plazo", etiqueta: "Plazo", ejemplo: "Ej. 15 años" },
      { clave: "suma_asegurada", etiqueta: "Suma asegurada de vida", ejemplo: "Ej. $500,000" },
      { clave: "extras", etiqueta: "Otros beneficios", ejemplo: "Ej. Exención de pago por invalidez", ancho: true },
      FOLIO,
    ],
  },
];

export function esRamoCotizacion(v: unknown): v is RamoCotizacion {
  return typeof v === "string" && RAMOS_COTIZACION.some((r) => r.id === v);
}

export function infoRamoCotizacion(id: RamoCotizacion): InfoRamoCotizacion {
  return RAMOS_COTIZACION.find((r) => r.id === id) ?? RAMOS_COTIZACION[0];
}

/** Las que más cotizas: salen como botones. */
export const ASEGURADORAS_RAPIDAS = ["AXA", "Chubb", "Chubb Travel"];
/** Sugerencias al escribir (se puede escribir cualquier otra). */
export const ASEGURADORAS_SUGERIDAS = [
  ...ASEGURADORAS_RAPIDAS,
  "GNP",
  "Qualitas",
  "HDI",
  "Mapfre",
  "Zurich",
  "Allianz",
  "Banorte",
  "Atlas",
  "Inbursa",
  "MetLife",
];

export const FORMAS_PAGO: { id: FormaPago; etiqueta: string; plural: string }[] = [
  { id: "mensual", etiqueta: "Mensual", plural: "mensuales" },
  { id: "trimestral", etiqueta: "Trimestral", plural: "trimestrales" },
  { id: "semestral", etiqueta: "Semestral", plural: "semestrales" },
];

export const ETIQUETA_ESTADO: Record<EstadoCotizacion, string> = {
  guardada: "Guardada",
  enviada: "Enviada",
  elegida: "Elegida",
  descartada: "Descartada",
};

export interface Cotizacion {
  id: string;
  lead_id: string;
  ramo: RamoCotizacion;
  aseguradora: string;
  plan: string;
  /** Lo que paga el cliente de contado (en viaje, el costo del viaje). */
  prima: number;
  moneda: MonedaCotizacion;
  forma_pago: FormaPago | null;
  /** Cada pago (los que siguen al primero), si la ofreces en parcialidades. */
  monto_pago: number | null;
  /** El primer pago, cuando es distinto de los demás (casi siempre trae los derechos de póliza). */
  primer_pago: number | null;
  /** AAAA-MM-DD */
  vigencia_hasta: string | null;
  /** Coberturas y datos del ramo, por la clave de cada campo. */
  datos: Record<string, string>;
  notas: string;
  estado: EstadoCotizacion;
  enviada_en: string | null;
  creado_en: string;
}

export interface DatosCotizacion {
  lead_id: string;
  ramo: RamoCotizacion;
  aseguradora: string;
  plan: string;
  prima: number;
  moneda: MonedaCotizacion;
  forma_pago: FormaPago | null;
  monto_pago: number | null;
  primer_pago: number | null;
  vigencia_hasta: string | null;
  datos: Record<string, string>;
  notas: string;
}

export const MAX_ASEGURADORA = 60;
export const MAX_PLAN = 80;
export const MAX_DATO = 200;
export const MAX_NOTAS = 500;
const MAX_DINERO = 99_999_999.99;

export type ResultadoCotizacion = { ok: true; datos: DatosCotizacion } | { ok: false; error: string };

function limpio(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

/** "$18,450.50" o 18450.5 → 18450.5. NaN si no es un número. */
function numeroDe(v: unknown): number {
  if (typeof v === "number") return v;
  const t = String(v ?? "").replace(/[$\s,]/g, "");
  return /^(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : NaN;
}

const redondear = (n: number) => Math.round(n * 100) / 100;

/** Valida lo que llega del navegador. */
export function validarCotizacion(entrada: unknown): ResultadoCotizacion {
  if (!entrada || typeof entrada !== "object") return { ok: false, error: "Faltan los datos de la cotización." };
  const e = entrada as Record<string, unknown>;

  const lead_id = limpio(e.lead_id);
  if (!lead_id) return { ok: false, error: "Elige para qué prospecto es." };
  if (!esRamoCotizacion(e.ramo)) return { ok: false, error: "Elige el ramo." };
  const ramo = infoRamoCotizacion(e.ramo);

  const aseguradora = limpio(e.aseguradora);
  if (!aseguradora) return { ok: false, error: "Escribe la aseguradora." };
  if (aseguradora.length > MAX_ASEGURADORA) return { ok: false, error: `Acorta la aseguradora: máximo ${MAX_ASEGURADORA} letras.` };
  const plan = limpio(e.plan);
  if (plan.length > MAX_PLAN) return { ok: false, error: `Acorta el plan: máximo ${MAX_PLAN} letras.` };

  const prima = numeroDe(e.prima);
  if (!Number.isFinite(prima) || prima <= 0 || prima > MAX_DINERO) {
    return { ok: false, error: `Escribe ${ramo.id === "viaje" ? "el costo" : "la prima"} como un número mayor que 0.` };
  }
  const moneda: MonedaCotizacion = e.moneda === "DLS" ? "DLS" : "MN";

  // Parcialidades: opcionales, y solo en los ramos que se pagan por partes.
  let forma_pago: FormaPago | null = null;
  let monto_pago: number | null = null;
  let primer_pago: number | null = null;
  const forma = limpio(e.forma_pago);
  if (ramo.enPagos && forma) {
    if (!FORMAS_PAGO.some((f) => f.id === forma)) return { ok: false, error: "Esa forma de pago no es válida." };
    forma_pago = forma as FormaPago;
    const monto = numeroDe(e.monto_pago);
    if (!Number.isFinite(monto) || monto <= 0 || monto > MAX_DINERO) {
      return { ok: false, error: "Si la ofreces en pagos, escribe cuánto es cada pago." };
    }
    monto_pago = redondear(monto);
    // El primer pago es opcional: vacío (o igual a los demás) significa que todos los pagos son iguales.
    if (limpio(e.primer_pago)) {
      const primero = numeroDe(e.primer_pago);
      if (!Number.isFinite(primero) || primero <= 0 || primero > MAX_DINERO) {
        return { ok: false, error: "Escribe el primer pago como un número mayor que 0, o déjalo vacío si todos los pagos son iguales." };
      }
      primer_pago = redondear(primero) === monto_pago ? null : redondear(primero);
    }
  }

  const vigencia = limpio(e.vigencia_hasta);
  if (vigencia && !esFechaValida(vigencia)) return { ok: false, error: "Esa fecha de vigencia no es válida." };

  // Solo se guardan los campos de este ramo (lo demás se ignora), y los vacíos no se guardan.
  const crudos = e.datos && typeof e.datos === "object" ? (e.datos as Record<string, unknown>) : {};
  const datos: Record<string, string> = {};
  for (const c of ramo.campos) {
    const v = limpio(crudos[c.clave]);
    if (!v) continue;
    if (v.length > MAX_DATO) return { ok: false, error: `Acorta «${c.etiqueta}»: máximo ${MAX_DATO} letras.` };
    datos[c.clave] = v;
  }

  const notas = String(e.notas ?? "").trim();
  if (notas.length > MAX_NOTAS) return { ok: false, error: `Acorta las notas: máximo ${MAX_NOTAS} letras.` };

  return {
    ok: true,
    datos: {
      lead_id,
      ramo: ramo.id,
      aseguradora,
      plan,
      prima: redondear(prima),
      moneda,
      forma_pago,
      monto_pago,
      primer_pago,
      vigencia_hasta: vigencia || null,
      datos,
      notas,
    },
  };
}

export function esEstadoCotizacion(v: unknown): v is EstadoCotizacion {
  return v === "guardada" || v === "enviada" || v === "elegida" || v === "descartada";
}

// ----------------------------------------------------------------------------
// Orden y comparación
// ----------------------------------------------------------------------------

/** "$18,450 MXN", "$1,299.50 MXN" o "$1,200 USD". */
export function formatoDinero(n: number, moneda: MonedaCotizacion): string {
  const texto = n.toLocaleString("es-MX", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `$${texto} ${moneda === "DLS" ? "USD" : "MXN"}`;
}

/** Cuántos pagos siguen después del primero en cada forma de pago. */
const PAGOS_DESPUES: Record<FormaPago, number> = { mensual: 11, trimestral: 3, semestral: 1 };

type DatosDePagos = Pick<Cotizacion, "forma_pago" | "monto_pago" | "primer_pago" | "moneda">;

/** Para la tabla: "Mensual: $1,620 MXN" o "Semestral: 1er pago de $9,148.61 MXN y 1 pago de $8,336.61 MXN". Vacío si no hay pagos. */
export function celdaPagos(c: DatosDePagos): string {
  const forma = FORMAS_PAGO.find((f) => f.id === c.forma_pago);
  if (!forma || !c.monto_pago) return "";
  if (!c.primer_pago) return `${forma.etiqueta}: ${formatoDinero(c.monto_pago, c.moneda)}`;
  const n = PAGOS_DESPUES[forma.id];
  return `${forma.etiqueta}: 1er pago de ${formatoDinero(c.primer_pago, c.moneda)} y ${n === 1 ? "1 pago" : `${n} pagos`} de ${formatoDinero(c.monto_pago, c.moneda)}`;
}

/** Para el mensaje: "pagos mensuales de $1,620 MXN" o "pagos semestrales: 1er pago de $9,148.61 MXN y 1 pago de $8,336.61 MXN". */
export function frasePagos(c: DatosDePagos): string {
  const forma = FORMAS_PAGO.find((f) => f.id === c.forma_pago);
  if (!forma || !c.monto_pago) return "";
  if (!c.primer_pago) return `pagos ${forma.plural} de ${formatoDinero(c.monto_pago, c.moneda)}`;
  const n = PAGOS_DESPUES[forma.id];
  return `pagos ${forma.plural}: 1er pago de ${formatoDinero(c.primer_pago, c.moneda)} y ${n === 1 ? "1 pago" : `${n} pagos`} de ${formatoDinero(c.monto_pago, c.moneda)}`;
}

/** Ya pasó la fecha hasta la que era válida. Una elegida o descartada ya no corre prisa. */
export function estaVencida(c: Pick<Cotizacion, "vigencia_hasta" | "estado">, hoy: string): boolean {
  return c.vigencia_hasta !== null && c.vigencia_hasta < hoy && c.estado !== "elegida" && c.estado !== "descartada";
}

/** Por ramo (en el orden de arriba); en cada ramo, la elegida primero y luego la más barata. */
export function ordenarCotizaciones(lista: Cotizacion[]): Cotizacion[] {
  const posicion = (c: Cotizacion) => RAMOS_COTIZACION.findIndex((r) => r.id === c.ramo);
  return [...lista].sort(
    (a, b) =>
      posicion(a) - posicion(b) ||
      Number(b.estado === "elegida") - Number(a.estado === "elegida") ||
      a.prima - b.prima ||
      a.creado_en.localeCompare(b.creado_en),
  );
}

export interface GrupoCotizaciones {
  ramo: InfoRamoCotizacion;
  items: Cotizacion[];
}

/** Las cotizaciones por ramo, ya ordenadas. Solo salen los ramos que tienen alguna. */
export function agruparPorRamo(lista: Cotizacion[]): GrupoCotizaciones[] {
  const grupos: GrupoCotizaciones[] = [];
  for (const c of ordenarCotizaciones(lista)) {
    const g = grupos.find((x) => x.ramo.id === c.ramo);
    if (g) g.items.push(c);
    else grupos.push({ ramo: infoRamoCotizacion(c.ramo), items: [c] });
  }
  return grupos;
}

/** El id de la opción más barata, si hay 2 o más en la misma moneda y solo una gana. */
export function masEconomica(items: Cotizacion[]): string | null {
  if (items.length < 2) return null;
  if (new Set(items.map((c) => c.moneda)).size > 1) return null;
  const minima = Math.min(...items.map((c) => c.prima));
  const ganadoras = items.filter((c) => c.prima === minima);
  return ganadoras.length === 1 ? ganadoras[0].id : null;
}

export interface FilaComparativa {
  campo: CampoCotizacion;
  /** Un valor por cotización, en el mismo orden que `items` ("" si no lo capturaste). */
  valores: string[];
}

/** Los datos de las opciones lado a lado: solo los renglones en los que alguna opción tiene algo. */
export function filasComparativa(items: Cotizacion[], ramo: InfoRamoCotizacion): FilaComparativa[] {
  return ramo.campos
    .map((campo) => ({ campo, valores: items.map((c) => c.datos[campo.clave] ?? "") }))
    .filter((f) => f.valores.some(Boolean));
}

/** "AXA · Plan Flex ($18,450 MXN)" */
export function resumenCotizacion(c: Cotizacion): string {
  return `${c.aseguradora}${c.plan ? ` · ${c.plan}` : ""} (${formatoDinero(c.prima, c.moneda)})`;
}

// ----------------------------------------------------------------------------
// Mensaje de WhatsApp para el cliente
// ----------------------------------------------------------------------------

/** "JUAN PÉREZ LÓPEZ" → "Juan" */
export function primerNombre(nombre: string): string {
  const t = limpio(nombre).split(" ")[0] ?? "";
  return t ? t[0].toUpperCase() + t.slice(1).toLowerCase() : "";
}

const igual = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function bloqueRamo(items: Cotizacion[], ramo: InfoRamoCotizacion, vigenciaPorOpcion: boolean, vigencia: (c: Cotizacion) => string | null): string[] {
  const lineas: string[] = [`${ramo.emoji} *${ramo.nombre}*`];
  const varias = items.length > 1;

  // Lo que se asegura (asegurados, vehículo…) sale una sola vez si es igual en todas las opciones.
  const comunes = new Set<string>();
  if (varias) {
    for (const campo of ramo.campos.filter((c) => c.compartido && !c.interno)) {
      const valores = items.map((c) => c.datos[campo.clave] ?? "");
      if (valores[0] && valores.every((v) => igual(v, valores[0]))) {
        comunes.add(campo.clave);
        lineas.push(`• ${campo.etiqueta}: ${valores[0]}`);
      }
    }
  }
  lineas.push("");

  items.forEach((c, i) => {
    const nombre = `${c.aseguradora}${c.plan ? ` · ${c.plan}` : ""}`;
    lineas.push(varias ? `*Opción ${i + 1} · ${nombre}*` : `*${nombre}*`);
    for (const campo of ramo.campos) {
      // El folio y demás datos "solo para ti" no salen en el mensaje al cliente.
      if (campo.interno || comunes.has(campo.clave)) continue;
      const v = c.datos[campo.clave];
      if (v) lineas.push(`• ${campo.etiqueta}: ${v}`);
    }
    lineas.push(`💰 *${ramo.etiquetaPrima}: ${formatoDinero(c.prima, c.moneda)}*`);
    const pagos = frasePagos(c);
    if (pagos) lineas.push(`O en ${pagos}`);
    const hasta = vigencia(c);
    if (vigenciaPorOpcion && hasta) lineas.push(`📅 Vigente hasta el ${fechaLarga(hasta)}`);
    lineas.push("");
  });
  return lineas;
}

/**
 * El mensaje listo para mandar: saludo, cada ramo con sus opciones, vigencia y despedida.
 * Se puede editar antes de enviarlo. Si se pasa `hoy`, no se escribe la vigencia de una cotización que ya venció.
 */
export function armarMensajeWhatsApp({
  nombre,
  firma,
  cotizaciones,
  hoy,
}: {
  nombre: string;
  firma: string;
  cotizaciones: Cotizacion[];
  hoy?: string;
}): string {
  const grupos = agruparPorRamo(cotizaciones);
  const total = cotizaciones.length;
  if (total === 0) return "";

  const lineas: string[] = [`Hola ${primerNombre(nombre) || ""}`.trim() + " 👋", ""];
  lineas.push(
    total === 1 ? "Te comparto la cotización que preparé para ti:" : grupos.length === 1 ? "Te comparto las opciones que preparé para ti:" : "Te comparto las cotizaciones que preparé para ti:",
    "",
  );
  // La vigencia: una sola línea al final si todas coinciden; si no, cada opción dice la suya.
  const vigencia = (c: Cotizacion) => (c.vigencia_hasta && (!hoy || c.vigencia_hasta >= hoy) ? c.vigencia_hasta : null);
  const vigencias = cotizaciones.map(vigencia).filter((v): v is string => Boolean(v));
  const unificada = vigencias.length === total && vigencias.every((v) => v === vigencias[0]);
  for (const g of grupos) lineas.push(...bloqueRamo(g.items, g.ramo, vigencias.length > 0 && !unificada, vigencia));
  if (unificada) lineas.push(`📅 Cotización vigente hasta el ${fechaLarga(vigencias[0])}.`, "");

  lineas.push("Los precios y condiciones están sujetos a la validación de la aseguradora al emitir la póliza.", "");
  lineas.push("Si quieres, lo revisamos juntos y resuelvo tus dudas 🙌");
  if (limpio(firma)) lineas.push("", `— ${limpio(firma)}`);
  return lineas.join("\n");
}

/** Texto del pendiente que se agenda al mandar una cotización. */
export function textoSeguimiento(cotizaciones: Cotizacion[], nombre: string): string {
  const ramos = [...new Set(agruparPorRamo(cotizaciones).map((g) => g.ramo.corto))];
  const cuales = ramos.length === 1 ? `la cotización de ${ramos[0]}` : `las cotizaciones de ${ramos.join(" y ")}`;
  return `Dar seguimiento a ${cuales} de ${primerNombre(nombre) || nombre}`.slice(0, 200);
}

// ----------------------------------------------------------------------------
// Portales de las aseguradoras (para abrirlos desde el CRM)
// ----------------------------------------------------------------------------

export interface PortalAseguradora {
  id: string;
  nombre: string;
  /** Qué se cotiza ahí. */
  detalle: string;
  url: string;
}

/**
 * Las direcciones CORTAS de cada portal: al abrirlas, la aseguradora pide tu usuario y contraseña
 * (el CRM nunca las ve ni las guarda). No se usan las direcciones largas de inicio de sesión: traen
 * un código de un solo uso y dejan de servir.
 */
export const PORTALES: PortalAseguradora[] = [
  { id: "axa", nombre: "AXA", detalle: "Portal de distribuidores: gastos médicos, autos y hogar", url: "https://cloud.distribuidores.axa.com.mx/" },
  { id: "chubb-autos", nombre: "Chubb autos", detalle: "Chubb Agent Space: autos", url: "https://agentspace.mx.chubb.com/" },
  { id: "chubb-travel", nombre: "Chubb Travel", detalle: "Seguros de viaje", url: "https://travel.chubb.com/default.aspx?iso2=MX&sk=Chubb" },
];

// ----------------------------------------------------------------------------
// Lectura de la cotización con IA: de lo que devuelve el modelo a un borrador revisable
// ----------------------------------------------------------------------------

/** Lo que se puede subir para que la IA lo lea, y cuánto puede pesar (Vercel acepta cuerpos de hasta 4.5 MB). */
export const TIPOS_ARCHIVO_COTIZACION = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
export const MAX_BYTES_ARCHIVO = 4 * 1024 * 1024;

/** Lo que la IA entendió del documento, listo para llenar el formulario. Lo que no vio queda en null o vacío. */
export interface BorradorCotizacion {
  ramo: RamoCotizacion | null;
  aseguradora: string;
  plan: string;
  prima: number | null;
  moneda: MonedaCotizacion;
  forma_pago: FormaPago | null;
  primer_pago: number | null;
  monto_pago: number | null;
  vigencia_hasta: string | null;
  datos: Record<string, string>;
}

export interface LecturaCotizacion {
  borrador: BorradorCotizacion;
  /** Dudas de la lectura: qué no se vio claro y qué revisar antes de guardar. */
  avisos: string[];
}

/** Todas las claves de campos de todos los ramos: son las que la IA puede devolver. */
export const CLAVES_CAMPOS: string[] = [...new Set(RAMOS_COTIZACION.flatMap((r) => r.campos.map((c) => c.clave)))];

/** Un monto válido de la IA (más de 0 y razonable), o null. */
function montoDe(v: unknown): number | null {
  const n = numeroDe(v);
  return Number.isFinite(n) && n > 0 && n <= MAX_DINERO ? redondear(n) : null;
}

/** Recorta sin partir una palabra a la mitad ("…cristales, asistencia…" y no "…crist"). */
function recortarTexto(texto: string, max: number): string {
  if (texto.length <= max) return texto;
  let corte = texto.slice(0, max - 1);
  const espacio = corte.lastIndexOf(" ");
  if (espacio > max * 0.6) corte = corte.slice(0, espacio);
  return `${corte.replace(/[\s,;:.-]+$/, "")}…`;
}

/** Cuántos avisos de la IA se muestran, y de qué largo (para que una lectura rara no inunde la pantalla). */
const MAX_AVISOS = 5;
const MAX_AVISO = 240;

/**
 * Convierte la respuesta cruda de la IA en un borrador para el formulario. No confía en nada: valida el ramo,
 * deja solo las claves de ese ramo, calcula la fecha límite si el documento solo dice "15 días" y descarta
 * pagos que no tienen sentido. La IA propone; el agente revisa y confirma.
 */
export function normalizarLectura(entrada: unknown): LecturaCotizacion {
  const e = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;
  const avisos = (Array.isArray(e.avisos) ? e.avisos.map(limpio).filter(Boolean) : []).slice(0, MAX_AVISOS).map((a) => recortarTexto(a, MAX_AVISO));

  const ramoId = esRamoCotizacion(e.ramo) ? e.ramo : null;
  const ramo = ramoId ? infoRamoCotizacion(ramoId) : null;
  if (!ramo) avisos.push("No pude identificar el ramo: elígelo tú.");

  const aseguradora = recortarTexto(limpio(e.aseguradora), MAX_ASEGURADORA);
  if (!aseguradora) avisos.push("No vi la aseguradora: escríbela tú.");
  const plan = recortarTexto(limpio(e.plan), MAX_PLAN);

  const prima = montoDe(e.prima_contado);
  if (prima === null) avisos.push("No vi la prima de contado: escríbela tú.");
  const moneda: MonedaCotizacion = e.moneda === "DLS" ? "DLS" : "MN";

  // Pagos fraccionados: solo si hay forma válida, un monto, y el ramo se paga por partes.
  let forma_pago: FormaPago | null = null;
  let monto_pago: number | null = null;
  let primer_pago: number | null = null;
  const forma = FORMAS_PAGO.find((f) => f.id === limpio(e.forma_pago))?.id ?? null;
  const siguiente = montoDe(e.pago_siguiente);
  const primero = montoDe(e.primer_pago);
  if (forma && (!ramo || ramo.enPagos) && (siguiente !== null || primero !== null)) {
    forma_pago = forma;
    monto_pago = siguiente ?? primero;
    primer_pago = primero !== null && primero !== monto_pago ? primero : null;
  }

  // Fecha límite de la cotización: la explícita; si no, la fecha de cotización + los días que diga.
  const explicita = limpio(e.vigencia_hasta);
  const fecha = limpio(e.fecha_cotizacion);
  const dias = Math.round(Number(e.dias_vigencia));
  let vigencia_hasta: string | null = null;
  if (explicita && esFechaValida(explicita)) vigencia_hasta = explicita;
  else if (esFechaValida(fecha) && Number.isFinite(dias) && dias > 0 && dias <= 365) vigencia_hasta = sumarDias(fecha, dias);
  if (!vigencia_hasta) avisos.push("No vi hasta cuándo es válida la cotización: ponlo tú si lo sabes.");

  // Los datos del ramo: solo claves de ese ramo, sin repetidas y sin vacíos.
  const datos: Record<string, string> = {};
  if (ramo && Array.isArray(e.campos)) {
    for (const par of e.campos) {
      if (!par || typeof par !== "object") continue;
      const p = par as Record<string, unknown>;
      const clave = limpio(p.clave);
      const valor = recortarTexto(limpio(p.valor), MAX_DATO);
      if (valor && !datos[clave] && ramo.campos.some((c) => c.clave === clave)) datos[clave] = valor;
    }
  }

  return { borrador: { ramo: ramo?.id ?? null, aseguradora, plan, prima, moneda, forma_pago, primer_pago, monto_pago, vigencia_hasta, datos }, avisos };
}
