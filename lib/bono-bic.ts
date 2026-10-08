/**
 * Bono AXA (BIC 2026) — la PRIMERA banda de cada ramo, por trimestre (puro: cliente y servidor).
 * Fuente: "Oferta de Valor 2026" de AXA (BIC-2026.pdf): Bono de Vida Individual Primer Año
 * (págs. 7-9) y Bono de Salud Individual Primer Año (pág. 18). Los bonos se evalúan cada trimestre.
 *
 * Aquí se cuenta la prima neta de las pólizas NUEVAS que adjuntas en la pestaña Pólizas, por inicio
 * de vigencia. El bono real de AXA usa la prima neta PAGADA y aplicada en el trimestre: úsalo como
 * meta de venta, no como cálculo del pago.
 */
import type { PolizaAdjunta } from "./types";

export type RamoBono = "gmm" | "vida";

export interface BandaInicial {
  ramo: RamoBono;
  nombre: string;
  /** Prima computable trimestral de primer año que pide la primera banda. */
  primaNoBeta: number;
  primaBeta: number;
  /** Negocios nuevos mínimos por trimestre (solo Vida). */
  negociosNuevos: number;
  /** Prima anual mínima de cada negocio nuevo (solo Vida). */
  primaPorNegocio: number;
  pagina: string;
  reglas: string[];
}

export const BANDA_INICIAL: Record<RamoBono, BandaInicial> = {
  gmm: {
    ramo: "gmm",
    nombre: "Gastos médicos · Salud Individual Primer Año",
    primaNoBeta: 200_000,
    primaBeta: 80_000,
    negociosNuevos: 0,
    primaPorNegocio: 0,
    pagina: "pág. 18 del BIC-2026",
    reglas: [
      "Cuenta la prima neta pagada y aplicada de pólizas cuyos asegurados son nuevos en su totalidad.",
      "Altas de asegurados en pólizas existentes y los Planmed® Keralty o Globalmex no cuentan.",
    ],
  },
  vida: {
    ramo: "vida",
    nombre: "Vida individual · Primer Año",
    primaNoBeta: 115_000,
    primaBeta: 52_000,
    negociosNuevos: 4,
    primaPorNegocio: 16_000,
    pagina: "págs. 7 a 9 del BIC-2026",
    reglas: [
      "Pide 4 negocios nuevos en el trimestre, cada uno con prima anual de $16,000 o más.",
      "Pide persistencia mínima de 67.5% (pólizas vigentes a 13 meses): eso no se puede calcular aquí.",
      "Solo participan productos con plazo de pago de 10 años o más (y las excepciones del BIC).",
    ],
  },
};

export type EstadoTrimestre = "cerrado" | "en_curso" | "futuro";

export interface AvanceTrimestre {
  trimestre: 1 | 2 | 3 | 4;
  etiqueta: string;
  meses: string;
  estado: EstadoTrimestre;
  /** Prima neta nueva del trimestre (pesos). */
  prima: number;
  requisito: number;
  /** Lo que falta de prima para la primera banda (0 si ya se alcanzó). */
  falta: number;
  /** Vida: negocios nuevos del trimestre con prima anual suficiente. */
  negocios: number;
  negociosFaltan: number;
  /** Prima y negocios completos. */
  cumple: boolean;
}

const MESES_TRIM = ["ene–mar", "abr–jun", "jul–sep", "oct–dic"];

export function avanceBono(polizas: PolizaAdjunta[], ramo: RamoBono, anio: number, hoy: string, beta: boolean): AvanceTrimestre[] {
  const banda = BANDA_INICIAL[ramo];
  const requisito = beta ? banda.primaBeta : banda.primaNoBeta;
  return ([1, 2, 3, 4] as const).map((t) => {
    const mesIni = (t - 1) * 3 + 1;
    const desde = `${anio}-${String(mesIni).padStart(2, "0")}-01`;
    const hasta = `${anio}-${String(mesIni + 2).padStart(2, "0")}-31`;
    const delTrim = polizas.filter((p) => p.ramo === ramo && p.tipo === "nueva" && p.moneda === "MN" && p.inicio >= desde && p.inicio <= hasta);
    const prima = Math.round(delTrim.reduce((s, p) => s + p.prima_neta, 0));
    const negocios = banda.negociosNuevos ? delTrim.filter((p) => p.prima_neta >= banda.primaPorNegocio).length : 0;
    const negociosFaltan = Math.max(0, banda.negociosNuevos - negocios);
    const falta = Math.max(0, requisito - prima);
    return {
      trimestre: t,
      etiqueta: `T${t}`,
      meses: MESES_TRIM[t - 1],
      estado: hasta < hoy ? "cerrado" : desde <= hoy ? "en_curso" : "futuro",
      prima,
      requisito,
      falta,
      negocios,
      negociosFaltan,
      cumple: falta === 0 && negociosFaltan === 0,
    };
  });
}

/** El trimestre que va en curso (o el último del año si el año ya pasó). */
export function trimestreEnCurso(avance: AvanceTrimestre[]): AvanceTrimestre {
  return avance.find((a) => a.estado === "en_curso") ?? avance.find((a) => a.estado === "futuro") ?? avance[avance.length - 1];
}
