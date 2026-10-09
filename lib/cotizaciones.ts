import "server-only";

/**
 * Cotizaciones — SOLO SERVIDOR.
 *
 * Mismo patrón que lib/pendientes.ts:
 *  - NUBE (Supabase, tabla cotizaciones) si hay secret key.
 *  - DEMO (memoria, vacío) para practicar sin tocar tu base.
 *
 * Cada usuario solo toca las suyas: todas las consultas filtran por usuario_id.
 * Nada se borra: una cotización que ya no sirve se descarta y queda guardada.
 */
import { adminDb, cloudReady } from "./supabase-admin";
import { faltaMigracion, MENSAJE_MIGRACION_COTIZACIONES, MigracionPendienteError } from "./migracion";
import { esFechaValida } from "./fechas";
import {
  esEstadoCotizacion,
  esRamoCotizacion,
  FORMAS_PAGO,
  type Cotizacion,
  type DatosCotizacion,
  type EstadoCotizacion,
} from "./cotizaciones-reglas";

const TABLA = "cotizaciones";
/** Cuántas se devuelven de un prospecto, y cuántas en la lista de recientes. */
const MAX_POR_PROSPECTO = 200;
const MAX_RECIENTES = 60;

function errorDeBase(error: { code?: string; message: string }): Error {
  return faltaMigracion(error)
    ? new MigracionPendienteError(MENSAJE_MIGRACION_COTIZACIONES, "0011_cotizaciones.sql")
    : new Error(error.message);
}

function normalizar(f: Record<string, unknown>): Cotizacion {
  const crudos = f.datos && typeof f.datos === "object" && !Array.isArray(f.datos) ? (f.datos as Record<string, unknown>) : {};
  const datos: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(crudos)) if (typeof valor === "string" && valor) datos[clave] = valor;
  const vigencia = String(f.vigencia_hasta ?? "").slice(0, 10);
  const forma = FORMAS_PAGO.find((x) => x.id === f.forma_pago)?.id ?? null;
  return {
    id: String(f.id),
    lead_id: String(f.lead_id),
    ramo: esRamoCotizacion(f.ramo) ? f.ramo : "gmm",
    aseguradora: String(f.aseguradora ?? ""),
    plan: String(f.plan ?? ""),
    prima: Number(f.prima) || 0,
    moneda: f.moneda === "DLS" ? "DLS" : "MN",
    forma_pago: forma,
    monto_pago: f.monto_pago === null || f.monto_pago === undefined ? null : Number(f.monto_pago) || null,
    primer_pago: f.primer_pago === null || f.primer_pago === undefined ? null : Number(f.primer_pago) || null,
    vigencia_hasta: esFechaValida(vigencia) ? vigencia : null,
    datos,
    notas: String(f.notas ?? ""),
    estado: esEstadoCotizacion(f.estado) ? f.estado : "guardada",
    enviada_en: f.enviada_en ? String(f.enviada_en) : null,
    creado_en: String(f.creado_en ?? ""),
  };
}

// ----------------------------------------------------------------------------
// Almacén DEMO — en memoria, uno por usuario.
// ----------------------------------------------------------------------------

interface FilaDemo extends Cotizacion {
  usuario_id: string;
}
interface StoreCotizaciones {
  filas: FilaDemo[];
  seq: number;
}
const g = globalThis as unknown as { __acmCotizaciones?: StoreCotizaciones };
function store(): StoreCotizaciones {
  if (!g.__acmCotizaciones) g.__acmCotizaciones = { filas: [], seq: 1 };
  return g.__acmCotizaciones;
}
function sinDueno({ usuario_id: _ignorado, ...c }: FilaDemo): Cotizacion {
  void _ignorado;
  return { ...c, datos: { ...c.datos } };
}

// ----------------------------------------------------------------------------
// CRUD
// ----------------------------------------------------------------------------

/** Las de un prospecto, o (sin prospecto) las más recientes de todos. Lo más nuevo primero. */
export async function listarCotizaciones(usuarioId: string, leadId?: string): Promise<Cotizacion[]> {
  const limite = leadId ? MAX_POR_PROSPECTO : MAX_RECIENTES;
  if (cloudReady && adminDb) {
    let q = adminDb.from(TABLA).select("*").eq("usuario_id", usuarioId);
    if (leadId) q = q.eq("lead_id", leadId);
    const { data, error } = await q.order("creado_en", { ascending: false }).limit(limite);
    if (error) throw errorDeBase(error);
    return (data ?? []).map((f) => normalizar(f as Record<string, unknown>));
  }
  return store()
    .filas.filter((f) => f.usuario_id === usuarioId && (!leadId || f.lead_id === leadId))
    .map(sinDueno)
    .sort((a, b) => b.creado_en.localeCompare(a.creado_en))
    .slice(0, limite);
}

export async function crearCotizacion(usuarioId: string, datos: DatosCotizacion): Promise<Cotizacion> {
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
  const nueva: FilaDemo = {
    ...datos,
    datos: { ...datos.datos },
    id: `co_${(s.seq++).toString(36)}`,
    usuario_id: usuarioId,
    estado: "guardada",
    enviada_en: null,
    // Un instante distinto por cotización: así el orden de "recientes" es estable aunque lleguen juntas.
    creado_en: new Date(Date.now() + s.seq).toISOString(),
  };
  s.filas.push(nueva);
  return sinDueno(nueva);
}

/** Una cotización del usuario. Null si no existe (o es de otro usuario). */
async function obtener(usuarioId: string, id: string): Promise<Cotizacion | null> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).select("*").eq("id", id).eq("usuario_id", usuarioId).limit(1);
    if (error) throw errorDeBase(error);
    return data?.[0] ? normalizar(data[0] as Record<string, unknown>) : null;
  }
  const fila = store().filas.find((f) => f.id === id && f.usuario_id === usuarioId);
  return fila ? sinDueno(fila) : null;
}

type Cambios = Partial<Omit<Cotizacion, "id" | "lead_id" | "creado_en">>;

/** Cambia campos de una cotización del usuario. Null si no existe (o es de otro usuario). */
async function actualizar(usuarioId: string, id: string, cambios: Cambios): Promise<Cotizacion | null> {
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

/** Corrige una cotización. Su prospecto y su estado no cambian. */
export function editarCotizacion(usuarioId: string, id: string, datos: DatosCotizacion): Promise<Cotizacion | null> {
  const { lead_id: _prospecto, ...cambios } = datos;
  void _prospecto;
  return actualizar(usuarioId, id, cambios);
}

/**
 * Cambia el estado. Solo una opción por ramo puede estar elegida: si eliges otra, la que estaba
 * elegida regresa a "enviada". Al marcarla enviada a mano se anota cuándo.
 */
export async function cambiarEstado(usuarioId: string, id: string, estado: EstadoCotizacion): Promise<Cotizacion | null> {
  const actual = await obtener(usuarioId, id);
  if (!actual) return null;
  if (estado === "elegida") {
    const otras = (await listarCotizaciones(usuarioId, actual.lead_id)).filter(
      (c) => c.id !== id && c.ramo === actual.ramo && c.estado === "elegida",
    );
    for (const o of otras) await actualizar(usuarioId, o.id, { estado: "enviada" });
  }
  return actualizar(usuarioId, id, {
    estado,
    ...(estado === "enviada" && !actual.enviada_en ? { enviada_en: new Date().toISOString() } : {}),
  });
}

/** Las marca como enviadas (con su hora). La que ya está elegida se queda elegida. */
export async function marcarEnviadas(usuarioId: string, ids: string[]): Promise<Cotizacion[]> {
  const ahora = new Date().toISOString();
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb
      .from(TABLA)
      .update({ estado: "enviada", enviada_en: ahora })
      .in("id", ids)
      .eq("usuario_id", usuarioId)
      .neq("estado", "elegida")
      .select("*");
    if (error) throw errorDeBase(error);
    return (data ?? []).map((f) => normalizar(f as Record<string, unknown>));
  }
  const cambiadas: Cotizacion[] = [];
  for (const f of store().filas) {
    if (f.usuario_id !== usuarioId || !ids.includes(f.id) || f.estado === "elegida") continue;
    f.estado = "enviada";
    f.enviada_en = ahora;
    cambiadas.push(sinDueno(f));
  }
  return cambiadas;
}
