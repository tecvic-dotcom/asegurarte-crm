import "server-only";

/**
 * Pólizas adjuntas (nuevas y renovaciones) — SOLO SERVIDOR.
 *  - NUBE: tabla polizas_adjuntas (RLS cerrado; solo el servidor la toca).
 *  - DEMO: memoria, con pólizas INVENTADAS para practicar los reportes.
 */
import { adminDb, cloudReady } from "./supabase-admin";
import { faltaMigracion, MENSAJE_MIGRACION_ADJUNTAS, MigracionPendienteError } from "./migracion";
import { esRamo } from "./ramos";
import { hoyLocal } from "./fechas";
import type { DatosAdjunta, PolizaAdjunta } from "./types";

const TABLA = "polizas_adjuntas";

function errorDeBase(error: { code?: string; message: string }): Error {
  return faltaMigracion(error)
    ? new MigracionPendienteError(MENSAJE_MIGRACION_ADJUNTAS, "0006_polizas_adjuntas.sql")
    : new Error(error.message);
}

function normalizar(f: Record<string, unknown>): PolizaAdjunta | null {
  if (!esRamo(f.ramo)) return null;
  return {
    id: String(f.id),
    tipo: f.tipo === "renovacion" ? "renovacion" : "nueva",
    ramo: f.ramo,
    aseguradora: String(f.aseguradora ?? ""),
    numero: String(f.numero ?? ""),
    contratante: String(f.contratante ?? ""),
    inicio: String(f.inicio ?? "").slice(0, 10),
    prima_neta: Number(f.prima_neta) || 0,
    moneda: f.moneda === "DLS" ? "DLS" : "MN",
    asegurados_total: Number(f.asegurados_total) || 1,
    asegurados_nuevos: Number(f.asegurados_nuevos) || 0,
    asegurados_nombres: Array.isArray(f.asegurados_nombres) ? f.asegurados_nombres.map(String) : [],
    notas: String(f.notas ?? ""),
    archivo: String(f.archivo ?? ""),
    creado_en: String(f.creado_en ?? ""),
  };
}

// ---- DEMO (memoria, clientes inventados) ----

interface StoreAdjuntas {
  filas: PolizaAdjunta[];
  seq: number;
}

function semilla(): StoreAdjuntas {
  const anio = hoyLocal().slice(0, 4);
  const filas: PolizaAdjunta[] = [];
  const alta = (
    tipo: DatosAdjunta["tipo"],
    ramo: DatosAdjunta["ramo"],
    mes: string,
    prima: number,
    nombres: string[] = [],
    nuevos = 0,
  ) =>
    filas.push({
      id: `demo-${filas.length + 1}`,
      tipo,
      ramo,
      aseguradora: "Demo",
      numero: `DEMO-${filas.length + 1}`,
      contratante: `Cliente demo ${filas.length + 1}`,
      inicio: `${anio}-${mes}-10`,
      prima_neta: prima,
      moneda: "MN",
      asegurados_total: Math.max(1, nombres.length),
      asegurados_nuevos: nuevos,
      asegurados_nombres: nombres,
      notas: "",
      archivo: "",
      creado_en: new Date().toISOString(),
    });
  alta("nueva", "gmm", "01", 38_000, ["Ana Demo", "Luis Demo"], 2);
  alta("nueva", "gmm", "02", 52_000, ["Eva Demo", "Raúl Demo", "Sol Demo"], 3);
  alta("renovacion", "gmm", "02", 41_000, ["Ana Demo", "Luis Demo", "Bebé Demo"], 1);
  alta("nueva", "vida", "03", 15_000);
  alta("nueva", "autos", "04", 9_500);
  alta("renovacion", "autos", "05", 8_800);
  alta("nueva", "hogar", "05", 4_200);
  alta("nueva", "gmm", "06", 61_000, ["Tere Demo", "Ivo Demo"], 2);
  return { filas, seq: filas.length };
}

const globalConDemo = globalThis as typeof globalThis & { __adjuntasDemo?: StoreAdjuntas };
function demo(): StoreAdjuntas {
  return (globalConDemo.__adjuntasDemo ??= semilla());
}

// ---- API ----

export async function listarAdjuntas(): Promise<PolizaAdjunta[]> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).select("*").order("inicio", { ascending: false }).limit(5000);
    if (error) throw errorDeBase(error);
    return (data ?? []).map((f) => normalizar(f as Record<string, unknown>)).filter((f): f is PolizaAdjunta => f !== null);
  }
  return [...demo().filas].sort((a, b) => b.inicio.localeCompare(a.inicio));
}

export type ResultadoCrear = { ok: true; poliza: PolizaAdjunta } | { ok: false; duplicada: true };

export async function crearAdjunta(d: DatosAdjunta): Promise<ResultadoCrear> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).insert(d).select("*").single();
    if (error) {
      if (error.code === "23505") return { ok: false, duplicada: true };
      throw errorDeBase(error);
    }
    return { ok: true, poliza: normalizar(data as Record<string, unknown>)! };
  }
  const s = demo();
  if (d.numero && s.filas.some((p) => p.numero === d.numero && p.aseguradora === d.aseguradora && p.inicio === d.inicio)) {
    return { ok: false, duplicada: true };
  }
  const poliza: PolizaAdjunta = { ...d, id: `demo-${++s.seq}`, creado_en: new Date().toISOString() };
  s.filas.push(poliza);
  return { ok: true, poliza };
}

export async function eliminarAdjunta(id: string): Promise<void> {
  if (cloudReady && adminDb) {
    const { error } = await adminDb.from(TABLA).delete().eq("id", id);
    if (error) throw errorDeBase(error);
    return;
  }
  const s = demo();
  s.filas = s.filas.filter((p) => p.id !== id);
}
