import "server-only";

/**
 * Cargas del Excel de Chubb Autos de Dana — SOLO SERVIDOR.
 *
 * Mismo patrón que lib/pendientes.ts:
 *  - NUBE (Supabase, tabla chubb_cargas) si hay secret key.
 *  - DEMO (memoria, vacío) para practicar sin tocar tu base.
 *
 * Cada carga es una FOTO completa del Excel (todas sus pólizas). Nunca se edita ni se borra una póliza suelta:
 * subir un Excel nuevo agrega una foto nueva y Dana trabaja con la más reciente. Las anteriores se conservan.
 * Son datos de tus clientes: las rutas exigen sesión de administrador y la tabla está cerrada al público (RLS).
 */
import { adminDb, cloudReady } from "./supabase-admin";
import { faltaMigracion, MENSAJE_MIGRACION_CHUBB, MigracionPendienteError } from "./migracion";
import { validarPolizasChubb, type CargaChubb, type PolizaChubb } from "./chubb-reglas";

const TABLA = "chubb_cargas";

function errorDeBase(error: { code?: string; message: string }): Error {
  return faltaMigracion(error) ? new MigracionPendienteError(MENSAJE_MIGRACION_CHUBB, "0021_chubb_autos.sql") : new Error(error.message);
}

function normalizar(f: Record<string, unknown>): CargaChubb {
  const v = validarPolizasChubb(f.polizas);
  if (!v.ok) throw new Error(`La última carga de Chubb Autos quedó dañada (${v.error}). Vuelve a subir tu Excel.`);
  return {
    id: String(f.id),
    cargado_en: String(f.cargado_en ?? ""),
    archivo: String(f.archivo ?? ""),
    polizas: v.polizas,
  };
}

// ----------------------------------------------------------------------------
// Almacén DEMO — en memoria; se pierde al reiniciar el servidor.
// ----------------------------------------------------------------------------

const g = globalThis as unknown as { __acmChubb?: { cargas: CargaChubb[]; seq: number } };
function store() {
  if (!g.__acmChubb) g.__acmChubb = { cargas: [], seq: 1 };
  return g.__acmChubb;
}

// ----------------------------------------------------------------------------

/** El Excel más reciente que se subió (o null si todavía no se sube ninguno). */
export async function ultimaCarga(): Promise<CargaChubb | null> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).select("*").order("cargado_en", { ascending: false }).limit(1);
    if (error) throw errorDeBase(error);
    return data?.[0] ? normalizar(data[0] as Record<string, unknown>) : null;
  }
  const cargas = store().cargas;
  return cargas.length ? cargas[cargas.length - 1] : null;
}

/** Guarda un Excel nuevo como la foto más reciente. Ya viene validado (ver `validarPolizasChubb`). */
export async function guardarCarga(archivo: string, polizas: PolizaChubb[]): Promise<CargaChubb> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb
      .from(TABLA)
      .insert({ archivo, total: polizas.length, polizas })
      .select("*")
      .limit(1);
    if (error) throw errorDeBase(error);
    return normalizar(data?.[0] as Record<string, unknown>);
  }
  const s = store();
  const nueva: CargaChubb = { id: `chubb_${(s.seq++).toString(36)}`, cargado_en: new Date().toISOString(), archivo, polizas };
  s.cargas.push(nueva);
  return nueva;
}
