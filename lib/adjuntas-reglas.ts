/**
 * Reglas de las pólizas adjuntas (cliente-safe, sin server-only): validación,
 * asegurados nuevos y los totales por mes y trimestre que alimentan los reportes.
 * El mes sale del INICIO DE VIGENCIA de cada póliza.
 */
import { esRamo } from "./ramos";
import { esFechaValida } from "./fechas";
import type { DatosAdjunta, PolizaAdjunta, Ramo } from "./types";

function texto(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function entero(v: unknown, min: number, max: number, defecto: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defecto;
}

export type ResultadoAdjunta = { ok: true; datos: DatosAdjunta } | { ok: false; error: string };

export function validarAdjunta(entrada: unknown): ResultadoAdjunta {
  if (!entrada || typeof entrada !== "object") return { ok: false, error: "Datos inválidos." };
  const e = entrada as Record<string, unknown>;
  if (e.tipo !== "nueva" && e.tipo !== "renovacion") return { ok: false, error: "Elige si es nueva o renovación." };
  if (!esRamo(e.ramo)) return { ok: false, error: "Elige el ramo." };
  const inicio = texto(e.inicio, 10);
  if (!esFechaValida(inicio)) return { ok: false, error: "Escribe la fecha de inicio de vigencia." };
  const prima = Number(e.prima_neta);
  if (!Number.isFinite(prima) || prima < 0 || prima > 100_000_000) return { ok: false, error: "La prima neta no es válida." };
  const nombres = Array.isArray(e.asegurados_nombres)
    ? e.asegurados_nombres.map((n) => texto(n, 120)).filter(Boolean).slice(0, 200)
    : [];
  const total = entero(e.asegurados_total, 1, 5000, Math.max(1, nombres.length));
  return {
    ok: true,
    datos: {
      tipo: e.tipo,
      ramo: e.ramo,
      aseguradora: texto(e.aseguradora, 60),
      numero: texto(e.numero, 40),
      contratante: texto(e.contratante, 120),
      inicio,
      prima_neta: Math.round(prima * 100) / 100,
      moneda: e.moneda === "DLS" ? "DLS" : "MN",
      asegurados_total: total,
      // Solo las pólizas NUEVAS suman asegurados nuevos: en una renovación nunca cuentan.
      asegurados_nuevos: e.tipo === "nueva" ? entero(e.asegurados_nuevos, 0, total, total) : 0,
      asegurados_nombres: nombres,
      notas: texto(e.notas, 500),
      archivo: texto(e.archivo, 200),
    },
  };
}

export interface Periodo {
  /** "ene" o "T1" */
  etiqueta: string;
  nuevas: number;
  primaNueva: number;
  renovaciones: number;
  primaRenovacion: number;
  aseguradosNuevos: number;
}

export type Agrupar = "mes" | "trimestre";

/** Solo pesos: los dólares no se suman a los pesos. */
function enPesos(p: PolizaAdjunta, anio: number, ramo: Ramo | null): boolean {
  return p.moneda === "MN" && Number(p.inicio.slice(0, 4)) === anio && (ramo === null || p.ramo === ramo);
}

const TRIM = ["T1", "T2", "T3", "T4"];
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function porPeriodo(polizas: PolizaAdjunta[], anio: number, ramo: Ramo | null, agrupar: Agrupar): Periodo[] {
  const n = agrupar === "mes" ? 12 : 4;
  const filas: Periodo[] = Array.from({ length: n }, (_, i) => ({
    etiqueta: agrupar === "mes" ? MES[i] : TRIM[i],
    nuevas: 0,
    primaNueva: 0,
    renovaciones: 0,
    primaRenovacion: 0,
    aseguradosNuevos: 0,
  }));
  for (const p of polizas) {
    if (!enPesos(p, anio, ramo)) continue;
    const mes = Number(p.inicio.slice(5, 7)) - 1;
    const f = filas[agrupar === "mes" ? mes : Math.floor(mes / 3)];
    if (p.tipo === "nueva") {
      f.nuevas++;
      f.primaNueva += p.prima_neta;
      f.aseguradosNuevos += p.asegurados_nuevos;
    } else {
      f.renovaciones++;
      f.primaRenovacion += p.prima_neta;
    }
  }
  return filas;
}

export function totalPeriodos(filas: Periodo[]): Periodo {
  return filas.reduce(
    (t, f) => ({
      etiqueta: "Total",
      nuevas: t.nuevas + f.nuevas,
      primaNueva: t.primaNueva + f.primaNueva,
      renovaciones: t.renovaciones + f.renovaciones,
      primaRenovacion: t.primaRenovacion + f.primaRenovacion,
      aseguradosNuevos: t.aseguradosNuevos + f.aseguradosNuevos,
    }),
    { etiqueta: "Total", nuevas: 0, primaNueva: 0, renovaciones: 0, primaRenovacion: 0, aseguradosNuevos: 0 },
  );
}

export function aniosConPolizas(polizas: PolizaAdjunta[], anioActual: number): number[] {
  const s = new Set(polizas.map((p) => Number(p.inicio.slice(0, 4))));
  s.add(anioActual);
  return [...s].sort((a, b) => b - a);
}

export interface ResumenAdjuntas {
  nuevas: number;
  primaNueva: number;
  renovaciones: number;
  primaRenovacion: number;
  aseguradosNuevos: number;
}

/** Totales de las pólizas cuyo inicio cae entre dos fechas (inclusive), en pesos. Para RORO y Clara. */
export function resumenAdjuntas(polizas: PolizaAdjunta[], desde: string, hasta: string, ramo: Ramo | null): ResumenAdjuntas {
  const r: ResumenAdjuntas = { nuevas: 0, primaNueva: 0, renovaciones: 0, primaRenovacion: 0, aseguradosNuevos: 0 };
  for (const p of polizas) {
    if (p.moneda !== "MN" || p.inicio < desde || p.inicio > hasta || (ramo !== null && p.ramo !== ramo)) continue;
    if (p.tipo === "nueva") {
      r.nuevas++;
      r.primaNueva += p.prima_neta;
      r.aseguradosNuevos += p.asegurados_nuevos;
    } else {
      r.renovaciones++;
      r.primaRenovacion += p.prima_neta;
    }
  }
  r.primaNueva = Math.round(r.primaNueva);
  r.primaRenovacion = Math.round(r.primaRenovacion);
  return r;
}

export type QueListar = "nuevas" | "renovaciones" | "asegurados";

/**
 * Las pólizas que hay detrás de una cifra de la tabla: las de un mes o trimestre
 * (indice = posición en la tabla; null = todo el año). Mismos filtros que porPeriodo.
 */
export function polizasDePeriodo(
  polizas: PolizaAdjunta[],
  anio: number,
  ramo: Ramo | null,
  agrupar: Agrupar,
  indice: number | null,
  que: QueListar,
): PolizaAdjunta[] {
  return polizas
    .filter((p) => {
      if (!enPesos(p, anio, ramo)) return false;
      const mes = Number(p.inicio.slice(5, 7)) - 1;
      if (indice !== null && (agrupar === "mes" ? mes : Math.floor(mes / 3)) !== indice) return false;
      if (que === "nuevas") return p.tipo === "nueva";
      if (que === "renovaciones") return p.tipo === "renovacion";
      return p.tipo === "nueva" && p.asegurados_nuevos > 0;
    })
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
}
