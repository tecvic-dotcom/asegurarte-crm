import "server-only";

/**
 * Mis pendientes — SOLO SERVIDOR.
 *
 * Mismo patrón que lib/cobranza.ts:
 *  - NUBE (Supabase, tabla pendientes) si hay secret key.
 *  - DEMO (memoria, vacío) para practicar sin tocar tu base.
 *
 * Cada usuario solo toca los suyos: todas las consultas filtran por usuario_id.
 * Completar un pendiente NO lo borra: lo marca como hecho (con fecha y hora) y
 * así queda el historial aunque ya no salga en la lista.
 */
import { adminDb, cloudReady } from "./supabase-admin";
import { faltaMigracion, MENSAJE_MIGRACION_PENDIENTES, MigracionPendienteError } from "./migracion";
import { esFechaValida } from "./fechas";
import { compararPendientes, type DatosPendiente, type Pendiente } from "./pendientes-reglas";

const TABLA = "pendientes";
/** Cuántos completados se devuelven (los más recientes). Todos siguen guardados en la base. */
const MAX_COMPLETADOS = 1000;
const MAX_ACTIVOS = 1000;

function errorDeBase(error: { code?: string; message: string }): Error {
  return faltaMigracion(error)
    ? new MigracionPendienteError(MENSAJE_MIGRACION_PENDIENTES, "0009_pendientes.sql")
    : new Error(error.message);
}

function normalizar(f: Record<string, unknown>): Pendiente {
  const fecha = String(f.fecha ?? "").slice(0, 10);
  return {
    id: String(f.id),
    texto: String(f.texto ?? ""),
    fecha: esFechaValida(fecha) ? fecha : "",
    hora: f.hora ? String(f.hora).slice(0, 5) : null,
    lead_id: f.lead_id ? String(f.lead_id) : null,
    hecho: Boolean(f.hecho),
    hecho_en: f.hecho_en ? String(f.hecho_en) : null,
    creado_en: String(f.creado_en ?? ""),
  };
}

// ----------------------------------------------------------------------------
// Almacén DEMO — en memoria, uno por usuario.
// ----------------------------------------------------------------------------

interface FilaDemo extends Pendiente {
  usuario_id: string;
}
interface StorePendientes {
  filas: FilaDemo[];
  seq: number;
}
const g = globalThis as unknown as { __acmPendientes?: StorePendientes };
function store(): StorePendientes {
  if (!g.__acmPendientes) g.__acmPendientes = { filas: [], seq: 1 };
  return g.__acmPendientes;
}
function sinDueno({ usuario_id: _ignorado, ...p }: FilaDemo): Pendiente {
  void _ignorado;
  return p;
}

// ----------------------------------------------------------------------------
// CRUD
// ----------------------------------------------------------------------------

/** Lo que falta por hacer (en orden) y lo ya completado (lo más reciente primero). */
export async function listarPendientes(usuarioId: string): Promise<{ activos: Pendiente[]; hechos: Pendiente[] }> {
  if (cloudReady && adminDb) {
    const [a, h] = await Promise.all([
      adminDb
        .from(TABLA)
        .select("*")
        .eq("usuario_id", usuarioId)
        .eq("hecho", false)
        .order("fecha", { ascending: true })
        .limit(MAX_ACTIVOS),
      adminDb
        .from(TABLA)
        .select("*")
        .eq("usuario_id", usuarioId)
        .eq("hecho", true)
        .order("hecho_en", { ascending: false })
        .limit(MAX_COMPLETADOS),
    ]);
    if (a.error) throw errorDeBase(a.error);
    if (h.error) throw errorDeBase(h.error);
    return {
      activos: (a.data ?? []).map((f) => normalizar(f as Record<string, unknown>)).sort(compararPendientes),
      hechos: (h.data ?? []).map((f) => normalizar(f as Record<string, unknown>)),
    };
  }
  const mias = store().filas.filter((f) => f.usuario_id === usuarioId).map(sinDueno);
  return {
    activos: mias.filter((p) => !p.hecho).sort(compararPendientes),
    hechos: mias.filter((p) => p.hecho).sort((x, y) => String(y.hecho_en ?? "").localeCompare(String(x.hecho_en ?? ""))),
  };
}

export async function crearPendiente(usuarioId: string, datos: DatosPendiente): Promise<Pendiente> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb
      .from(TABLA)
      .insert({ usuario_id: usuarioId, ...datos })
      .select("*")
      .limit(1);
    if (error) throw errorDeBase(error);
    return normalizar(data?.[0] as Record<string, unknown>);
  }
  const s = store();
  const nuevo: FilaDemo = {
    ...datos,
    id: `pe_${(s.seq++).toString(36)}`,
    usuario_id: usuarioId,
    hecho: false,
    hecho_en: null,
    creado_en: new Date().toISOString(),
  };
  s.filas.push(nuevo);
  return sinDueno(nuevo);
}

/** Cambia campos de un pendiente del usuario. Null si no existe (o es de otro usuario). */
async function actualizar(
  usuarioId: string,
  id: string,
  cambios: Partial<Pick<Pendiente, "hecho" | "hecho_en" | "fecha">>,
): Promise<Pendiente | null> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb
      .from(TABLA)
      .update(cambios)
      .eq("id", id)
      .eq("usuario_id", usuarioId)
      .select("*")
      .limit(1);
    if (error) throw errorDeBase(error);
    return data?.[0] ? normalizar(data[0] as Record<string, unknown>) : null;
  }
  const fila = store().filas.find((f) => f.id === id && f.usuario_id === usuarioId);
  if (!fila) return null;
  Object.assign(fila, cambios);
  return sinDueno(fila);
}

/** Completar (queda guardado con su hora) o devolver a pendientes. */
export function marcarHecho(usuarioId: string, id: string, hecho: boolean): Promise<Pendiente | null> {
  return actualizar(usuarioId, id, { hecho, hecho_en: hecho ? new Date().toISOString() : null });
}

/** Cambia el día de un pendiente (pasarlo a hoy o a mañana). */
export function moverPendiente(usuarioId: string, id: string, fecha: string): Promise<Pendiente | null> {
  return actualizar(usuarioId, id, { fecha });
}
