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
import { faltaMigracion, MENSAJE_MIGRACION_COBRANZA, MENSAJE_MIGRACION_CRUZADA, MENSAJE_MIGRACION_PRIMER_PAGO, MigracionPendienteError } from "./migracion";
import { esRamo } from "./ramos";
import { esFechaValida, hoyLocal, maxFecha, sumarDias } from "./fechas";
import { esPrimerPago, FORMAS_PAGO, montoDelProximoPago, siguienteFechaPago } from "./cobranza-reglas";
import { CONCEPTO_PAGO_VALERI } from "./historial-reglas";
import { crearEvento, listarHistorial } from "./polizas-historial";
import { crearAdjunta } from "./polizas-adjuntas";
import { validarAdjunta } from "./adjuntas-reglas";
import type { DatosPoliza, DatosRenovacion, FormaPago, Poliza, Ramo } from "./types";

const TABLA = "polizas";

function errorDeBase(error: { code?: string; message: string }): Error {
  if (faltaMigracion(error) && /cliente_id/.test(error.message)) {
    return new MigracionPendienteError(MENSAJE_MIGRACION_CRUZADA, "0016_venta_cruzada.sql");
  }
  if (faltaMigracion(error) && /primer_pago/.test(error.message)) {
    return new MigracionPendienteError(MENSAJE_MIGRACION_PRIMER_PAGO, "0015_primer_pago.sql");
  }
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
    primer_pago: Number(f.primer_pago) || 0,
    primer_pago_pendiente: f.primer_pago_pendiente === true,
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
    cliente_id: f.cliente_id ? String(f.cliente_id) : null,
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
    primer_pago: 0,
    primer_pago_pendiente: false,
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
    cliente_id: null,
    notas: "",
    creado_en: new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
    ...extra,
  });
  return {
    seq: 100,
    polizas: [
      p("LAURA MENDEZ RUIZ", "gmm", "mensual", 1850, -12, "8110000001", { aseguradora: "AXA", numero: "F746002330", inicio: sumarDias(hoy, -300), renovacion: sumarDias(hoy, 65) }),
      p("TRANSPORTES DEL NORTE SA DE CV", "autos", "trimestral", 9400, -3, "8110000002", { aseguradora: "Chubb", inicio: sumarDias(hoy, -200), renovacion: sumarDias(hoy, 165) }),
      p("Jorge Salinas Treviño", "vida", "anual", 12600, 2, "", { aseguradora: "GNP", inicio: sumarDias(hoy, -363), renovacion: sumarDias(hoy, 2) }),
      p("Patricia Ochoa Leal", "hogar", "semestral", 3200, -5, "8110000004", {
        aseguradora: "AXA",
        inicio: sumarDias(hoy, -150),
        renovacion: sumarDias(hoy, 215),
        estatus_manual: "promesa",
        promesa_fecha: sumarDias(hoy, 1),
      }),
      p("Ricardo Garza Elizondo", "ahorro", "mensual", 2500, 9, "8110000005", { aseguradora: "GNP", inicio: sumarDias(hoy, -400), renovacion: sumarDias(hoy, -35) }),
      p("Sofía Cantú Villarreal", "vida", "anual", 8900, 25, "8110000006", { aseguradora: "AXA", inicio: sumarDias(hoy, -340), renovacion: sumarDias(hoy, 25) }),
      p("Miguel Ángel Rocha", "autos", "mensual", 1450, 20, "8110000007", { aseguradora: "Qualitas", inicio: sumarDias(hoy, -90), renovacion: sumarDias(hoy, 275) }),
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
    cliente_id: null,
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

/**
 * "Pagó": el recibo queda saldado y la fecha límite avanza al siguiente periodo. Además anota el pago en el historial
 * de la póliza; si todavía no existe esa tabla (SQL 0013), Valeri sigue funcionando igual y solo se salta la nota.
 */
export async function marcarPagada(id: string): Promise<Poliza | null> {
  const p = await obtenerPoliza(id);
  if (!p) return null;
  const hoy = hoyLocal();
  // Lo que se cobró en este recibo: el primer pago (con derecho de póliza) si todavía era ese, o el monto de los subsecuentes.
  const eraElPrimero = esPrimerPago(p);
  const cobrado = montoDelProximoPago(p);
  const nueva = await actualizar(id, {
    fecha_limite_pago: p.fecha_limite_pago ? siguienteFechaPago(p.fecha_limite_pago, p.forma_pago) : null,
    estatus_manual: null,
    promesa_fecha: null,
    ultimo_pago: hoy,
    // Solo se toca esta columna cuando hace falta: así «Pagó» no depende del SQL 0015 en pólizas sin primer pago.
    ...(p.primer_pago_pendiente ? { primer_pago_pendiente: false } : {}),
  });
  try {
    await crearEvento({
      poliza_id: id,
      tipo: "pago",
      fecha: hoy,
      monto: cobrado,
      concepto: CONCEPTO_PAGO_VALERI,
      numero: "",
      nota: eraElPrimero ? "Primer pago de la vigencia (incluye derecho de póliza)." : "",
      recibo: p.fecha_limite_pago,
      desde: null,
      hasta: null,
    });
  } catch (e) {
    console.warn("[cobranza] el pago quedó marcado, pero no pude anotarlo en el historial:", (e as Error).message);
  }
  return nueva;
}

export interface DatosPagoManual {
  fecha: string;
  monto: number;
  concepto: string;
  nota: string;
  recibo: string | null;
}

/**
 * Anota un pago a mano en el historial (por ejemplo uno de hace meses). Con "avanzar" también salda el recibo que toca:
 * la fecha límite pasa al siguiente periodo, igual que con «Pagó» de Valeri. Si falta el SQL 0013, avisa antes de tocar nada.
 */
export async function registrarPago(id: string, d: DatosPagoManual, avanzar: boolean): Promise<Poliza | null> {
  const p = await obtenerPoliza(id);
  if (!p) return null;
  await listarHistorial(id); // lanza MigracionPendienteError si falta la tabla
  let actual: Poliza | null = p;
  const ultimo = p.ultimo_pago ? maxFecha(p.ultimo_pago, d.fecha) : d.fecha;
  if (avanzar) {
    actual = await actualizar(id, {
      fecha_limite_pago: p.fecha_limite_pago ? siguienteFechaPago(p.fecha_limite_pago, p.forma_pago) : null,
      estatus_manual: null,
      promesa_fecha: null,
      ultimo_pago: ultimo,
      // Saldar el recibo que tocaba también salda el primer pago: lo que sigue ya son los subsecuentes.
      ...(p.primer_pago_pendiente ? { primer_pago_pendiente: false } : {}),
    });
  } else if (ultimo !== p.ultimo_pago) {
    actual = await actualizar(id, { ultimo_pago: ultimo });
  }
  await crearEvento({
    poliza_id: id,
    tipo: "pago",
    fecha: d.fecha,
    monto: d.monto,
    concepto: d.concepto,
    numero: "",
    nota: d.nota,
    recibo: d.recibo ?? (avanzar ? p.fecha_limite_pago : null),
    desde: null,
    hasta: null,
  });
  return actual;
}

export interface ResultadoRenovacion {
  poliza: Poliza;
  /** Si se anotó en tus reportes de renovaciones (prima neta). */
  reportes: "contada" | "duplicada" | "omitida" | "error";
}

/**
 * Renueva una póliza (a mano o con los datos leídos del PDF): la vigencia, los montos y la fecha del primer pago pasan
 * a los de la renovación, se reactiva si estaba cancelada o con promesa, queda anotada en su historial y, si trae prima
 * neta, también cuenta en los reportes de renovaciones de Clara. Si falta el SQL 0013, avisa antes de tocar nada.
 */
export async function renovarPoliza(id: string, r: DatosRenovacion): Promise<ResultadoRenovacion | null> {
  const p = await obtenerPoliza(id);
  if (!p) return null;
  await listarHistorial(id); // lanza MigracionPendienteError si falta la tabla
  const poliza = await actualizar(id, {
    inicio: r.inicio,
    renovacion: r.hasta,
    forma_pago: r.forma_pago,
    monto_pago: r.monto_pago,
    // La vigencia nueva arranca con su primer pago (con derecho de póliza) si lo capturaste.
    ...(r.forma_pago !== "anual" && r.primer_pago > 0
      ? { primer_pago: r.primer_pago, primer_pago_pendiente: true }
      : p.primer_pago > 0 || p.primer_pago_pendiente
        ? { primer_pago: 0, primer_pago_pendiente: false }
        : {}),
    prima_anual: r.prima_anual,
    fecha_limite_pago: r.fecha_limite_pago,
    numero: r.numero || p.numero,
    aseguradora: r.aseguradora || p.aseguradora,
    estatus_manual: null,
    promesa_fecha: null,
  });
  if (!poliza) return null;
  await crearEvento({
    poliza_id: id,
    tipo: "renovacion",
    fecha: r.inicio,
    monto: r.prima_anual,
    concepto: r.origen === "pdf" ? "Renovación con lector de PDF" : "Renovación manual",
    numero: poliza.numero,
    nota: r.nota,
    recibo: null,
    desde: r.inicio,
    hasta: r.hasta,
  });

  let reportes: ResultadoRenovacion["reportes"] = "omitida";
  if (r.prima_neta > 0 && poliza.ramo) {
    try {
      const v = validarAdjunta({
        tipo: "renovacion",
        ramo: poliza.ramo,
        aseguradora: poliza.aseguradora,
        numero: poliza.numero,
        contratante: poliza.asegurado,
        inicio: r.inicio,
        prima_neta: r.prima_neta,
        moneda: "MN",
        asegurados_total: 1,
        notas: r.nota,
        archivo: r.archivo,
      });
      if (v.ok) reportes = (await crearAdjunta(v.datos)).ok ? "contada" : "duplicada";
      else reportes = "error";
    } catch (e) {
      console.warn("[cobranza] la renovación quedó guardada, pero no pude anotarla en los reportes:", (e as Error).message);
      reportes = "error";
    }
  }
  return { poliza, reportes };
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

/** Liga pólizas a su cliente (expediente único). Agrupa por cliente para hacer pocas consultas. */
export async function ligarPolizasACliente(asignaciones: { id: string; cliente_id: string }[]): Promise<void> {
  if (!asignaciones.length) return;
  const porCliente = new Map<string, string[]>();
  for (const a of asignaciones) porCliente.set(a.cliente_id, [...(porCliente.get(a.cliente_id) ?? []), a.id]);
  if (cloudReady && adminDb) {
    for (const [cliente_id, ids] of porCliente) {
      for (let i = 0; i < ids.length; i += 200) {
        const { error } = await adminDb.from(TABLA).update({ cliente_id }).in("id", ids.slice(i, i + 200));
        if (error) throw errorDeBase(error);
      }
    }
    return;
  }
  const s = store();
  for (const a of asignaciones) {
    const p = s.polizas.find((x) => x.id === a.id);
    if (p) p.cliente_id = a.cliente_id;
  }
}
