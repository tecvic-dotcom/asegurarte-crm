import "server-only";

/**
 * Cartera de Valeri (cobranza) — SOLO SERVIDOR.
 *
 * Mismo patrón que lib/db.ts:
 *  - NUBE (Supabase, tabla polizas) si hay secret key.
 *  - DEMO (memoria) con pólizas de muestra INVENTADAS para practicar.
 *
 * Aquí viven datos de tus clientes (nombre, WhatsApp): solo el servidor toca la
 * tabla (RLS cerrado) y las rutas exigen sesión de ADMIN.
 */
import { adminDb, cloudReady } from "./supabase-admin";
import { faltaMigracion, MENSAJE_MIGRACION_COBRANZA, MigracionPendienteError } from "./migracion";
import { esRamo } from "./ramos";
import { esFechaValida, hoyLocal, sumarDias } from "./fechas";
import { FORMAS_PAGO, siguienteFechaPago } from "./cobranza-reglas";
import type { DatosPoliza, FormaPago, Poliza, Ramo } from "./types";

const TABLA = "polizas";

function errorDeBase(error: { code?: string; message: string }): Error {
  return faltaMigracion(error)
    ? new MigracionPendienteError(MENSAJE_MIGRACION_COBRANZA, "0004_cobranza.sql")
    : new Error(error.message);
}

function fecha(v: unknown): string | null {
  const f = String(v ?? "").slice(0, 10);
  return esFechaValida(f) ? f : null;
}

function normalizar(f: Record<string, unknown>): Poliza {
  const forma = FORMAS_PAGO.some((x) => x.id === f.forma_pago) ? (f.forma_pago as FormaPago) : "anual";
  return {
    id: String(f.id),
    numero: String(f.numero ?? ""),
    asegurado: String(f.asegurado ?? ""),
    whatsapp: String(f.whatsapp ?? ""),
    correo: String(f.correo ?? ""),
    ramo: esRamo(f.ramo) ? f.ramo : null,
    aseguradora: String(f.aseguradora ?? ""),
    monto_pago: Number(f.monto_pago) || 0,
    prima_anual: Number(f.prima_anual) || 0,
    forma_pago: forma,
    inicio: fecha(f.inicio),
    renovacion: fecha(f.renovacion),
    fecha_limite_pago: fecha(f.fecha_limite_pago),
    estatus_manual: f.estatus_manual === "promesa" || f.estatus_manual === "cancelada" ? f.estatus_manual : null,
    promesa_fecha: fecha(f.promesa_fecha),
    ultimo_pago: fecha(f.ultimo_pago),
    ultimo_recordatorio: f.ultimo_recordatorio ? String(f.ultimo_recordatorio) : null,
    lead_id: f.lead_id ? String(f.lead_id) : null,
    notas: String(f.notas ?? ""),
    creado_en: String(f.creado_en ?? ""),
    actualizado_en: String(f.actualizado_en ?? ""),
  };
}

// ----------------------------------------------------------------------------
// Almacén DEMO — clientes INVENTADOS, fechas relativas a hoy.
// ----------------------------------------------------------------------------

interface StoreCobranza {
  polizas: Poliza[];
  seq: number;
}

function semilla(): StoreCobranza {
  const hoy = hoyLocal();
  let n = 0;
  const p = (
    asegurado: string,
    ramo: Ramo,
    forma: FormaPago,
    monto: number,
    diasLimite: number | null,
    whatsapp: string,
    extra: Partial<Poliza> = {},
  ): Poliza => ({
    id: `pz_demo_${++n}`,
    numero: `DEMO-${1000 + n}`,
    asegurado,
    whatsapp,
    correo: "",
    ramo,
    aseguradora: "Aseguradora demo",
    monto_pago: monto,
    prima_anual: forma === "anual" ? monto : forma === "semestral" ? monto * 2 : forma === "trimestral" ? monto * 4 : monto * 12,
    forma_pago: forma,
    inicio: null,
    renovacion: null,
    fecha_limite_pago: diasLimite === null ? null : sumarDias(hoy, diasLimite),
    estatus_manual: null,
    promesa_fecha: null,
    ultimo_pago: null,
    ultimo_recordatorio: null,
    lead_id: null,
    notas: "",
    creado_en: new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
    ...extra,
  });
  return {
    seq: 100,
    polizas: [
      p("LAURA MENDEZ RUIZ", "gmm", "mensual", 1850, -12, "8110000001"),
      p("TRANSPORTES DEL NORTE SA DE CV", "autos", "trimestral", 9400, -3, "8110000002"),
      p("Jorge Salinas Treviño", "vida", "anual", 12600, 2, "", { renovacion: sumarDias(hoy, 2) }),
      p("Patricia Ochoa Leal", "hogar", "semestral", 3200, -5, "8110000004", {
        estatus_manual: "promesa",
        promesa_fecha: sumarDias(hoy, 1),
      }),
      p("Ricardo Garza Elizondo", "ahorro", "mensual", 2500, 9, "8110000005"),
      p("Sofía Cantú Villarreal", "vida", "anual", 8900, 25, "8110000006", { renovacion: sumarDias(hoy, 25) }),
      p("Miguel Ángel Rocha", "autos", "mensual", 1450, 20, "8110000007"),
    ],
  };
}

const g = globalThis as unknown as { __acmCobranza?: StoreCobranza };
function store(): StoreCobranza {
  if (!g.__acmCobranza) g.__acmCobranza = semilla();
  return g.__acmCobranza;
}

// ----------------------------------------------------------------------------
// CRUD
// ----------------------------------------------------------------------------

export async function listarPolizas(): Promise<Poliza[]> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb
      .from(TABLA)
      .select("*")
      .order("fecha_limite_pago", { ascending: true, nullsFirst: false })
      .limit(5000);
    if (error) throw errorDeBase(error);
    return (data ?? []).map((f) => normalizar(f as Record<string, unknown>));
  }
  return [...store().polizas];
}

export async function obtenerPoliza(id: string): Promise<Poliza | null> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).select("*").eq("id", id).limit(1);
    if (error) throw errorDeBase(error);
    return data?.[0] ? normalizar(data[0] as Record<string, unknown>) : null;
  }
  return store().polizas.find((p) => p.id === id) ?? null;
}

export async function crearPoliza(datos: DatosPoliza): Promise<Poliza> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).insert(datos).select("*").limit(1);
    if (error) throw errorDeBase(error);
    return normalizar(data?.[0] as Record<string, unknown>);
  }
  const s = store();
  const ahora = new Date().toISOString();
  const nueva: Poliza = {
    ...datos,
    id: `pz_${(s.seq++).toString(36)}`,
    estatus_manual: null,
    promesa_fecha: null,
    ultimo_pago: null,
    ultimo_recordatorio: null,
    creado_en: ahora,
    actualizado_en: ahora,
  };
  s.polizas.push(nueva);
  return nueva;
}

/** Cambia campos de una póliza (ya validados). Null si no existe. */
async function actualizar(id: string, cambios: Partial<Poliza>): Promise<Poliza | null> {
  const limpio = { ...cambios, actualizado_en: new Date().toISOString() };
  delete (limpio as Partial<Poliza>).id;
  delete (limpio as Partial<Poliza>).creado_en;
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).update(limpio).eq("id", id).select("*").limit(1);
    if (error) throw errorDeBase(error);
    return data?.[0] ? normalizar(data[0] as Record<string, unknown>) : null;
  }
  const p = store().polizas.find((x) => x.id === id);
  if (!p) return null;
  Object.assign(p, limpio);
  return p;
}

export function editarPoliza(id: string, datos: DatosPoliza): Promise<Poliza | null> {
  return actualizar(id, datos);
}

export async function eliminarPoliza(id: string): Promise<void> {
  if (cloudReady && adminDb) {
    const { error } = await adminDb.from(TABLA).delete().eq("id", id);
    if (error) throw errorDeBase(error);
    return;
  }
  const s = store();
  s.polizas = s.polizas.filter((p) => p.id !== id);
}

// ----------------------------------------------------------------------------
// Acciones rápidas de Valeri
// ----------------------------------------------------------------------------

/** "Pagó": el recibo queda saldado y la fecha límite avanza al siguiente periodo. */
export async function marcarPagada(id: string): Promise<Poliza | null> {
  const p = await obtenerPoliza(id);
  if (!p) return null;
  return actualizar(id, {
    fecha_limite_pago: p.fecha_limite_pago ? siguienteFechaPago(p.fecha_limite_pago, p.forma_pago) : null,
    estatus_manual: null,
    promesa_fecha: null,
    ultimo_pago: hoyLocal(),
  });
}

/** "Prometió pagar el…": mientras la promesa esté vigente, Valeri no lo marca como vencido. */
export function registrarPromesa(id: string, fechaPromesa: string): Promise<Poliza | null> {
  return actualizar(id, { estatus_manual: "promesa", promesa_fecha: fechaPromesa });
}

/** "Ya le recordé": para no insistir dos veces el mismo día. */
export function marcarRecordada(id: string): Promise<Poliza | null> {
  return actualizar(id, { ultimo_recordatorio: new Date().toISOString() });
}

/** Cancelada = Valeri deja de cobrarla (se puede reactivar). */
export function cancelarPoliza(id: string, cancelada: boolean): Promise<Poliza | null> {
  return actualizar(id, { estatus_manual: cancelada ? "cancelada" : null, promesa_fecha: null });
}
