import "server-only";

/**
 * Historial de cada póliza (pagos, renovaciones y endosos) — SOLO SERVIDOR.
 *
 * Mismo patrón que lib/cobranza.ts:
 *  - NUBE (Supabase, tabla polizas_historial) si hay secret key.
 *  - DEMO (memoria) con algunos movimientos de muestra INVENTADOS para practicar.
 *
 * Aquí viven datos de tus clientes: solo el servidor toca la tabla (RLS cerrado) y las rutas exigen sesión de ADMIN.
 */
import { adminDb, cloudReady } from "./supabase-admin";
import { faltaMigracion, MENSAJE_MIGRACION_HISTORIAL, MigracionPendienteError } from "./migracion";
import { esFechaValida, hoyLocal, sumarDias } from "./fechas";
import { contarEventos, type ConteoEventos } from "./historial-reglas";
import type { EventoPoliza, TipoEvento } from "./types";

const TABLA = "polizas_historial";

function errorDeBase(error: { code?: string; message: string }): Error {
  return faltaMigracion(error)
    ? new MigracionPendienteError(MENSAJE_MIGRACION_HISTORIAL, "0013_polizas_historial.sql")
    : new Error(error.message);
}

function fecha(v: unknown): string | null {
  const f = String(v ?? "").slice(0, 10);
  return esFechaValida(f) ? f : null;
}

function normalizar(f: Record<string, unknown>): EventoPoliza | null {
  const tipo = f.tipo === "pago" || f.tipo === "endoso" || f.tipo === "renovacion" ? f.tipo : null;
  const dia = fecha(f.fecha);
  if (!tipo || !dia) return null;
  return {
    id: String(f.id),
    poliza_id: String(f.poliza_id),
    tipo,
    fecha: dia,
    monto: Number(f.monto) || 0,
    concepto: String(f.concepto ?? ""),
    numero: String(f.numero ?? ""),
    nota: String(f.nota ?? ""),
    recibo: fecha(f.recibo),
    desde: fecha(f.desde),
    hasta: fecha(f.hasta),
    creado_en: String(f.creado_en ?? ""),
  };
}

// ----------------------------------------------------------------------------
// Almacén DEMO — movimientos INVENTADOS de las pólizas de muestra de lib/cobranza.ts.
// ----------------------------------------------------------------------------

interface StoreHistorial {
  filas: EventoPoliza[];
  seq: number;
}

function semilla(): StoreHistorial {
  const hoy = hoyLocal();
  const filas: EventoPoliza[] = [];
  const alta = (poliza: number, tipo: TipoEvento, dias: number, m: number, concepto: string, extra: Partial<EventoPoliza> = {}) =>
    filas.push({
      id: `ev_demo_${filas.length + 1}`,
      poliza_id: `pz_demo_${poliza}`,
      tipo,
      fecha: sumarDias(hoy, dias),
      monto: m,
      concepto,
      numero: "",
      nota: "",
      recibo: null,
      desde: null,
      hasta: null,
      creado_en: new Date().toISOString(),
      ...extra,
    });
  // Laura (GMM mensual): tres pagos al corriente y un endoso.
  alta(1, "pago", -102, 1850, "Pagó (Valeri)", { recibo: sumarDias(hoy, -102) });
  alta(1, "pago", -72, 1850, "Pagó (Valeri)", { recibo: sumarDias(hoy, -72) });
  alta(1, "pago", -43, 1850, "Registrado a mano", { recibo: sumarDias(hoy, -42), nota: "Transferencia" });
  alta(1, "endoso", -60, 320, "Alta de asegurado", { numero: "END-0412", nota: "Se agrega a su bebé" });
  // Transportes (autos trimestral): un pago y un endoso a la baja.
  alta(2, "pago", -95, 9400, "Pagó (Valeri)", { recibo: sumarDias(hoy, -93) });
  alta(2, "endoso", -30, -1200, "Cambio de vehículo", { numero: "END-0377", nota: "Sale la camioneta blanca, entra la nueva" });
  // Jorge (vida anual): su renovación del año pasado.
  alta(3, "renovacion", -363, 12600, "Renovación manual", { desde: sumarDias(hoy, -363), hasta: sumarDias(hoy, 2) });
  return { filas, seq: filas.length };
}

const g = globalThis as unknown as { __acmHistorial?: StoreHistorial };
function store(): StoreHistorial {
  if (!g.__acmHistorial) g.__acmHistorial = semilla();
  return g.__acmHistorial;
}

const orden = (a: EventoPoliza, b: EventoPoliza) => b.fecha.localeCompare(a.fecha) || b.creado_en.localeCompare(a.creado_en);

// ----------------------------------------------------------------------------
// CRUD
// ----------------------------------------------------------------------------

/** Los movimientos de una póliza (lo más nuevo primero). Lanza MigracionPendienteError si falta el SQL 0013. */
export async function listarHistorial(polizaId: string, tipo?: TipoEvento): Promise<EventoPoliza[]> {
  if (cloudReady && adminDb) {
    let q = adminDb.from(TABLA).select("*").eq("poliza_id", polizaId);
    if (tipo) q = q.eq("tipo", tipo);
    const { data, error } = await q.order("fecha", { ascending: false }).order("creado_en", { ascending: false }).limit(1000);
    if (error) throw errorDeBase(error);
    return (data ?? []).map((f) => normalizar(f as Record<string, unknown>)).filter((x): x is EventoPoliza => x !== null);
  }
  return store()
    .filas.filter((f) => f.poliza_id === polizaId && (!tipo || f.tipo === tipo))
    .sort(orden);
}

/** Cuántos pagos, renovaciones y endosos tiene cada póliza (solo cifras: es lo que muestran los botones del listado). */
export async function conteoHistorial(): Promise<Record<string, ConteoEventos>> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).select("poliza_id, tipo").limit(20000);
    if (error) throw errorDeBase(error);
    return contarEventos((data ?? []) as { poliza_id: string; tipo: TipoEvento }[]);
  }
  return contarEventos(store().filas);
}

export type NuevoEvento = Omit<EventoPoliza, "id" | "creado_en">;

export async function crearEvento(e: NuevoEvento): Promise<EventoPoliza> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).insert(e).select("*").limit(1);
    if (error) throw errorDeBase(error);
    const r = data?.[0] ? normalizar(data[0] as Record<string, unknown>) : null;
    if (!r) throw new Error("No pude guardar el movimiento.");
    return r;
  }
  const s = store();
  const nuevo: EventoPoliza = { ...e, id: `ev_${(s.seq++).toString(36)}`, creado_en: new Date(Date.now() + s.seq).toISOString() };
  s.filas.push(nuevo);
  return nuevo;
}

export async function eliminarEvento(id: string): Promise<void> {
  if (cloudReady && adminDb) {
    const { error } = await adminDb.from(TABLA).delete().eq("id", id);
    if (error) throw errorDeBase(error);
    return;
  }
  const s = store();
  s.filas = s.filas.filter((f) => f.id !== id);
}
