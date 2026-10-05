/**
 * Cuentas de crecimiento — puras (cliente y servidor), sin IA.
 *
 * Regla de oro: comparar parejo. El año en curso va incompleto, así que se
 * compara contra los MISMOS meses del año anterior ("enero a septiembre vs
 * enero a septiembre"), nunca contra el año completo.
 * Solo se suman pesos (MN); los pagos en dólares se reportan aparte.
 */
import { esFechaValida, nombreMes, ultimoDeMes } from "./fechas";
import type { MetricaCrecimiento, ProduccionMes, Ramo } from "./types";

export const NOMBRE_METRICA: Record<MetricaCrecimiento, string> = {
  prima: "Prima pagada",
  comision: "Comisión",
  pagos: "Pagos",
};

function valor(f: ProduccionMes, m: MetricaCrecimiento): number {
  return m === "prima" ? f.prima : m === "comision" ? f.comision : f.pagos;
}

function filtrar(filas: ProduccionMes[], ramo: Ramo | null): ProduccionMes[] {
  return filas.filter((f) => f.moneda === "MN" && (!ramo || f.ramo === ramo));
}

/** Hasta dónde llegan los datos y cuál es el último mes COMPLETO (para comparar parejo). */
export function corteDeDatos(filas: ProduccionMes[]): { ultimoDia: string | null; anio: number; mesCorte: number } | null {
  const conDia = filas.filter((f) => f.ultimo_dia && esFechaValida(f.ultimo_dia));
  if (!filas.length) return null;
  const ultimoDia = conDia.length ? conDia.map((f) => f.ultimo_dia as string).sort().at(-1)! : null;
  const ultimoMes = filas.map((f) => f.mes).sort().at(-1)!;
  let anio = Number(ultimoMes.slice(0, 4));
  let mes = Number(ultimoMes.slice(5, 7));
  // Si el último mes trae pocos días (ej. hasta el 3 de octubre), el corte parejo es el mes anterior.
  const dia = ultimoDia && ultimoDia.slice(0, 7) === ultimoMes ? Number(ultimoDia.slice(8, 10)) : 31;
  const finDeMes = Number(ultimoDeMes(`${ultimoMes}-01`).slice(8, 10));
  if (dia < finDeMes - 3) {
    mes -= 1;
    if (mes === 0) {
      mes = 12;
      anio -= 1;
    }
  }
  return { ultimoDia, anio, mesCorte: mes };
}

export function aniosDisponibles(filas: ProduccionMes[]): number[] {
  return [...new Set(filas.map((f) => Number(f.mes.slice(0, 4))))].sort();
}

/** Total por año (año completo; el último puede ir incompleto). */
export function porAnio(filas: ProduccionMes[], m: MetricaCrecimiento, ramo: Ramo | null): { anio: number; total: number }[] {
  const mapa = new Map<number, number>();
  for (const f of filtrar(filas, ramo)) {
    const a = Number(f.mes.slice(0, 4));
    mapa.set(a, (mapa.get(a) ?? 0) + valor(f, m));
  }
  return aniosDisponibles(filas).map((anio) => ({ anio, total: Math.round(mapa.get(anio) ?? 0) }));
}

/** Total de un año de enero hasta el mes indicado. */
export function acumulado(filas: ProduccionMes[], m: MetricaCrecimiento, ramo: Ramo | null, anio: number, hastaMes: number): number {
  let s = 0;
  for (const f of filtrar(filas, ramo)) {
    if (Number(f.mes.slice(0, 4)) === anio && Number(f.mes.slice(5, 7)) <= hastaMes) s += valor(f, m);
  }
  return Math.round(s);
}

/** Los 12 meses de un año (0 donde no hubo). */
export function porMes(filas: ProduccionMes[], m: MetricaCrecimiento, ramo: Ramo | null, anio: number): number[] {
  const meses = Array<number>(12).fill(0);
  for (const f of filtrar(filas, ramo)) {
    if (Number(f.mes.slice(0, 4)) === anio) meses[Number(f.mes.slice(5, 7)) - 1] += valor(f, m);
  }
  return meses.map((x) => Math.round(x));
}

/** Crecimiento en % (null si la base es 0 o negativa: ahí un % confunde). */
export function crecimiento(actual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return Math.round(((actual - anterior) / anterior) * 1000) / 10;
}

/** Crecimiento anual promedio entre dos años completos (CAGR). */
export function crecimientoPromedio(inicio: number, fin: number, anios: number): number | null {
  if (inicio <= 0 || fin <= 0 || anios <= 0) return null;
  return Math.round((Math.pow(fin / inicio, 1 / anios) - 1) * 1000) / 10;
}

/** "ene–sep" */
export function etiquetaCorte(mesCorte: number): string {
  const mes = (n: number) => nombreMes(`2026-${String(n).padStart(2, "0")}-01`).slice(0, 3);
  return mesCorte === 12 ? "año completo" : mesCorte === 1 ? "enero" : `${mes(1)}–${mes(mesCorte)}`;
}

/** Pagos en dólares (se informan aparte, no se suman a los pesos). */
export function enDolares(filas: ProduccionMes[]): { pagos: number; prima: number; comision: number } {
  const d = filas.filter((f) => f.moneda === "DLS");
  return {
    pagos: d.reduce((s, f) => s + f.pagos, 0),
    prima: Math.round(d.reduce((s, f) => s + f.prima, 0)),
    comision: Math.round(d.reduce((s, f) => s + f.comision, 0)),
  };
}
