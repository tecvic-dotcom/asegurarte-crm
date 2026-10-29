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
 * Lo único que se anota después en la foto más reciente es el WhatsApp que capturas en «Recibos pendientes» (el Excel no lo
 * trae); al subir un Excel nuevo pasa a la foto nueva por nombre del asegurado.
 * Son datos de tus clientes: las rutas exigen sesión de administrador y la tabla está cerrada al público (RLS).
 */
import { adminDb, cloudReady } from "./supabase-admin";
import { listarClientes } from "./clientes";
import { listarPolizas } from "./cobranza";
import { listLeads } from "./db";
import { faltaMigracion, MENSAJE_MIGRACION_CHUBB, MigracionPendienteError } from "./migracion";
import { claveAsegurado, validarPolizasChubb, whatsappDe10, type CargaChubb, type ContactoCRM, type PolizaChubb } from "./chubb-reglas";

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
export async function guardarCarga(archivo: string, entrantes: PolizaChubb[]): Promise<CargaChubb> {
  // Los WhatsApp que ya capturaste no vienen en el Excel: pasan de la foto anterior a la nueva, por nombre del asegurado.
  const anterior = await ultimaCarga();
  const guardados = new Map<string, string>();
  for (const p of anterior?.polizas ?? []) if (p.whatsapp) guardados.set(claveAsegurado(p.asegurado), p.whatsapp);
  const polizas = entrantes.map((p) => {
    const whatsapp = p.whatsapp ?? guardados.get(claveAsegurado(p.asegurado));
    return whatsapp ? { ...p, whatsapp } : p;
  });
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

/**
 * Anota el WhatsApp de un asegurado en la carga más reciente (en todas sus pólizas de Chubb). Devuelve el contacto guardado,
 * o null si el número no es de 10 dígitos o ese asegurado ya no está en la carga.
 */
export async function guardarWhatsapp(asegurado: string, numero: unknown): Promise<ContactoCRM | null> {
  const whatsapp = whatsappDe10(numero);
  const carga = await ultimaCarga();
  if (!whatsapp || !carga) return null;
  const clave = claveAsegurado(asegurado);
  const de = carga.polizas.filter((p) => claveAsegurado(p.asegurado) === clave);
  if (!de.length) return null;
  const polizas = carga.polizas.map((p) => (claveAsegurado(p.asegurado) === clave ? { ...p, whatsapp } : p));
  if (cloudReady && adminDb) {
    const { error } = await adminDb.from(TABLA).update({ polizas }).eq("id", carga.id);
    if (error) throw errorDeBase(error);
  } else {
    carga.polizas = polizas;
  }
  return { nombre: de[0].asegurado, whatsapp };
}

/**
 * Nombre y WhatsApp de la gente que ya tienes en el CRM (clientes de Camila, pólizas de Valeri y prospectos) y los que
 * capturaste en Dana, para encontrar a quién mandarle el recordatorio de un recibo. Solo salen esos dos datos y solo los
 * que traen un número de 10 dígitos. Si alguna fuente falla (por ejemplo, una tabla que aún no se crea) se sigue con las demás.
 */
export async function contactosDelCRM(): Promise<ContactoCRM[]> {
  const [clientes, polizas, leads, carga] = await Promise.allSettled([listarClientes(), listarPolizas(), listLeads(), ultimaCarga()]);
  const filas: { nombre: string; whatsapp: string }[] = [
    ...(clientes.status === "fulfilled" ? clientes.value : []),
    ...(polizas.status === "fulfilled" ? polizas.value.map((p) => ({ nombre: p.asegurado, whatsapp: p.whatsapp })) : []),
    ...(leads.status === "fulfilled" ? leads.value : []),
    ...(carga.status === "fulfilled" && carga.value ? carga.value.polizas.flatMap((p) => (p.whatsapp ? [{ nombre: p.asegurado, whatsapp: p.whatsapp }] : [])) : []),
  ];
  const vistos = new Set<string>();
  const salida: ContactoCRM[] = [];
  for (const f of filas) {
    const nombre = (f.nombre ?? "").trim();
    const whatsapp = (f.whatsapp ?? "").replace(/\D+/g, "").slice(-10);
    if (!nombre || whatsapp.length !== 10) continue;
    const clave = `${nombre.toLowerCase()}|${whatsapp}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push({ nombre, whatsapp });
  }
  return salida;
}
