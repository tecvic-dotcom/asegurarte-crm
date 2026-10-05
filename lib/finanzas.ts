import "server-only";

/**
 * Tus finanzas (Director Financiero IA) — SOLO SERVIDOR.
 *
 * Mismo patrón que lib/db.ts:
 *  - NUBE (Supabase, tabla finanzas_movimientos) si hay secret key.
 *  - DEMO (memoria) para practicar antes de conectar tu base.
 *
 * Solo el servidor toca esta tabla (RLS cerrado) y las rutas exigen sesión de
 * ADMIN: tus números nunca viajan con la llave pública del navegador.
 */
import { adminDb, cloudReady } from "./supabase-admin";
import { faltaMigracion, MigracionPendienteError } from "./migracion";
import { esRamo } from "./ramos";
import { hoyLocal, sumarDias } from "./fechas";
import type { Movimiento, NuevoMovimiento, TipoMovimiento, Ramo } from "./types";

const TABLA = "finanzas_movimientos";

function errorDeBase(error: { code?: string; message: string }): Error {
  return faltaMigracion(error) ? new MigracionPendienteError() : new Error(error.message);
}

/** Convierte una fila de Supabase al formato de la app (los montos llegan como número o texto). */
function normalizar(fila: Record<string, unknown>): Movimiento {
  return {
    id: String(fila.id),
    fecha: String(fila.fecha ?? "").slice(0, 10),
    concepto: String(fila.concepto ?? ""),
    tipo: fila.tipo === "gasto" ? "gasto" : "ingreso",
    monto: Number(fila.monto) || 0,
    categoria: String(fila.categoria ?? "Otros"),
    ramo: esRamo(fila.ramo) ? fila.ramo : null,
    estado: fila.estado === "por_confirmar" ? "por_confirmar" : "confirmado",
    conciliado: fila.conciliado === true,
    notas: String(fila.notas ?? ""),
    creado_en: String(fila.creado_en ?? ""),
  };
}

// ----------------------------------------------------------------------------
// Almacén DEMO (memoria) — movimientos de muestra relativos a hoy.
// ----------------------------------------------------------------------------

interface StoreFinanzas {
  movimientos: Movimiento[];
  seq: number;
}

function semilla(): StoreFinanzas {
  const hoy = hoyLocal();
  let n = 0;
  const mov = (
    diasAtras: number,
    concepto: string,
    tipo: TipoMovimiento,
    monto: number,
    categoria: string,
    ramo: Ramo | null = null,
    porConfirmar = false,
  ): Movimiento => ({
    id: `mv_demo_${++n}`,
    fecha: sumarDias(hoy, -diasAtras),
    concepto,
    tipo,
    monto,
    categoria,
    ramo,
    estado: porConfirmar ? "por_confirmar" : "confirmado",
    conciliado: diasAtras > 20,
    notas: "",
    creado_en: new Date().toISOString(),
  });
  return {
    seq: 100,
    movimientos: [
      mov(1, "Comisión póliza vida", "ingreso", 8400, "Comisiones de pólizas nuevas", "vida"),
      mov(2, "Publicidad Facebook", "gasto", 1500, "Publicidad"),
      mov(3, "Gasolina", "gasto", 900, "Transporte y gasolina"),
      mov(4, "Comida con prospecto", "gasto", 450, "Comidas con clientes", null, true),
      mov(18, "Comisión GMM", "ingreso", 12300, "Comisiones de pólizas nuevas", "gmm"),
      mov(22, "Bono trimestral", "ingreso", 3000, "Bonos y premios"),
      mov(25, "Publicidad Facebook", "gasto", 2500, "Publicidad"),
      mov(27, "Herramientas de IA", "gasto", 400, "Herramientas y software"),
      mov(30, "Plan de celular", "gasto", 600, "Teléfono e internet"),
      mov(48, "Comisión renovación autos", "ingreso", 9800, "Comisiones de renovaciones", "autos"),
      mov(55, "Publicidad Facebook", "gasto", 2100, "Publicidad"),
      mov(60, "Gasolina", "gasto", 1000, "Transporte y gasolina"),
    ],
  };
}

const g = globalThis as unknown as { __acmFinanzas?: StoreFinanzas };
function store(): StoreFinanzas {
  if (!g.__acmFinanzas) g.__acmFinanzas = semilla();
  return g.__acmFinanzas;
}

function ordenar(a: Movimiento, b: Movimiento): number {
  return b.fecha.localeCompare(a.fecha) || b.creado_en.localeCompare(a.creado_en);
}

// ----------------------------------------------------------------------------
// CRUD
// ----------------------------------------------------------------------------

export async function listarMovimientos(desde: string, hasta: string): Promise<Movimiento[]> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb
      .from(TABLA)
      .select("*")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: false })
      .order("creado_en", { ascending: false })
      .limit(5000);
    if (error) throw errorDeBase(error);
    return (data ?? []).map((f) => normalizar(f as Record<string, unknown>));
  }
  return store()
    .movimientos.filter((m) => m.fecha >= desde && m.fecha <= hasta)
    .sort(ordenar);
}

export async function obtenerMovimiento(id: string): Promise<Movimiento | null> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).select("*").eq("id", id).limit(1);
    if (error) throw errorDeBase(error);
    return data?.[0] ? normalizar(data[0] as Record<string, unknown>) : null;
  }
  return store().movimientos.find((m) => m.id === id) ?? null;
}

/** Guarda uno o varios movimientos ya validados (validarMovimiento). */
export async function crearMovimientos(items: NuevoMovimiento[], autor: string): Promise<Movimiento[]> {
  if (!items.length) return [];
  if (cloudReady && adminDb) {
    const filas = items.map((m) => ({ ...m, creado_por: autor.slice(0, 120) }));
    const { data, error } = await adminDb.from(TABLA).insert(filas).select("*");
    if (error) throw errorDeBase(error);
    return (data ?? []).map((f) => normalizar(f as Record<string, unknown>)).sort(ordenar);
  }
  const s = store();
  const creados = items.map((m) => ({ ...m, id: `mv_${(s.seq++).toString(36)}`, creado_en: new Date().toISOString() }));
  s.movimientos.push(...creados);
  return creados.sort(ordenar);
}

/** Reemplaza un movimiento con su versión ya validada. Null si no existe. */
export async function actualizarMovimiento(id: string, cambios: NuevoMovimiento): Promise<Movimiento | null> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).update(cambios).eq("id", id).select("*").limit(1);
    if (error) throw errorDeBase(error);
    return data?.[0] ? normalizar(data[0] as Record<string, unknown>) : null;
  }
  const m = store().movimientos.find((x) => x.id === id);
  if (!m) return null;
  Object.assign(m, cambios);
  return m;
}

export async function eliminarMovimiento(id: string): Promise<void> {
  if (cloudReady && adminDb) {
    const { error } = await adminDb.from(TABLA).delete().eq("id", id);
    if (error) throw errorDeBase(error);
    return;
  }
  const s = store();
  s.movimientos = s.movimientos.filter((m) => m.id !== id);
}
