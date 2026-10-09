import "server-only";

/**
 * Configuración de Robert, tu gerente digital — SOLO SERVIDOR.
 *  - Su "cerebro": lo que sabe de tu negocio (se carga una vez y lo reusa siempre).
 *  - Tu meta: pólizas por ramo y la ventana de fechas.
 *  - El contador de preguntas del mes (tope de gasto).
 * NUBE: tablas manager_config / manager_uso. DEMO: memoria.
 */
import { adminDb, cloudReady } from "./supabase-admin";
import { faltaMigracion, MigracionPendienteError } from "./migracion";
import { esFechaValida, hoyLocal } from "./fechas";
import type { ManagerConfig, ManagerUso } from "./types";

/** Lo que Robert sabe de tu negocio si todavía no escribes tu propia versión. */
export const CEREBRO_BASE = `QUIÉN SOY
- Roberto Rodríguez, "especialista en Asegurarte". Agente de seguros independiente en México.
- Trabajo solo, apoyado en IA. Antes de contratar a alguien, primero veo si lo puede hacer la IA o una app de IA.

QUÉ VENDO Y CÓMO GANO
- Seguros de vida, gastos médicos mayores (GMM), ahorro, autos y hogar.
- Gano comisiones de las aseguradoras por cada póliza nueva y por las renovaciones.
- Comisión aproximada por ramo: (por definir — escríbela aquí, ej. "vida: X% de la prima del primer año").

A QUIÉN LE VENDO
- Cualquier persona mayor de edad y económicamente solvente.
- Mi página de captura ofrece una asesoría gratis de 30 minutos para familias que esperan bebé.
- Me llegan prospectos por esa página, WhatsApp, campañas y recomendaciones.

MIS COSTOS FIJOS AL MES
- (por definir — escribe aquí: teléfono, internet, herramientas, publicidad, gasolina…)

CÓMO QUIERO QUE ME AYUDES
- Directo, como socio, sin rodeos.
- Primero exprimir lo que ya funciona (más), luego mejorarlo (mejor) y hasta después probar algo nuevo.`;

export const CONFIG_BASE: ManagerConfig = {
  nombre: "Robert",
  cerebro: "",
  meta_por_ramo: 20,
  meta_inicio: "2026-09-30",
  meta_fin: "2026-12-29",
};

/** El texto que de verdad usa Robert: el tuyo, o el base si aún no escribes uno. */
export function cerebroEfectivo(config: ManagerConfig): string {
  return config.cerebro.trim() || CEREBRO_BASE;
}

interface StoreManager {
  config: ManagerConfig;
  uso: Record<string, { preguntas: number; entrada: number; salida: number }>;
}
const g = globalThis as unknown as { __acmManager?: StoreManager };
function demo(): StoreManager {
  if (!g.__acmManager) g.__acmManager = { config: { ...CONFIG_BASE }, uso: {} };
  return g.__acmManager;
}

function normalizar(fila: Record<string, unknown>): ManagerConfig {
  return {
    nombre: String(fila.nombre ?? CONFIG_BASE.nombre) || CONFIG_BASE.nombre,
    cerebro: String(fila.cerebro ?? ""),
    meta_por_ramo: Number(fila.meta_por_ramo) || CONFIG_BASE.meta_por_ramo,
    meta_inicio: String(fila.meta_inicio ?? CONFIG_BASE.meta_inicio).slice(0, 10),
    meta_fin: String(fila.meta_fin ?? CONFIG_BASE.meta_fin).slice(0, 10),
  };
}

/** Lee la configuración. Si falta la migración 0003, regresa la base y lo avisa. */
export async function getManagerConfig(): Promise<{ config: ManagerConfig; migracionPendiente: boolean }> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb
      .from("manager_config")
      .select("nombre,cerebro,meta_por_ramo,meta_inicio,meta_fin")
      .eq("id", 1)
      .limit(1);
    if (error) {
      if (faltaMigracion(error)) return { config: { ...CONFIG_BASE }, migracionPendiente: true };
      throw new Error(error.message);
    }
    return {
      config: data?.[0] ? normalizar(data[0] as Record<string, unknown>) : { ...CONFIG_BASE },
      migracionPendiente: false,
    };
  }
  return { config: { ...demo().config }, migracionPendiente: false };
}

export type ResultadoConfig = { ok: true; config: ManagerConfig } | { ok: false; error: string };

export function validarConfig(entrada: unknown): ResultadoConfig {
  if (!entrada || typeof entrada !== "object") return { ok: false, error: "Configuración vacía." };
  const c = entrada as Record<string, unknown>;
  const nombre = String(c.nombre ?? "").trim().slice(0, 30);
  if (nombre.length < 2) return { ok: false, error: "Ponle un nombre a tu gerente (mínimo 2 letras)." };
  const cerebro = String(c.cerebro ?? "").trim();
  if (cerebro.length > 6000) return { ok: false, error: "El contexto es muy largo; déjalo en menos de 6,000 caracteres." };
  const meta = Math.round(Number(c.meta_por_ramo));
  if (!Number.isFinite(meta) || meta < 1 || meta > 1000) {
    return { ok: false, error: "La meta por ramo debe ser un número entre 1 y 1000." };
  }
  const inicio = String(c.meta_inicio ?? "");
  const fin = String(c.meta_fin ?? "");
  if (!esFechaValida(inicio) || !esFechaValida(fin) || fin <= inicio) {
    return { ok: false, error: "Revisa las fechas de tu meta: la de fin debe ser después de la de inicio." };
  }
  return { ok: true, config: { nombre, cerebro, meta_por_ramo: meta, meta_inicio: inicio, meta_fin: fin } };
}

export async function guardarManagerConfig(config: ManagerConfig): Promise<void> {
  if (cloudReady && adminDb) {
    const { error } = await adminDb
      .from("manager_config")
      .upsert({ id: 1, ...config, actualizado_en: new Date().toISOString() }, { onConflict: "id" });
    if (error) throw faltaMigracion(error) ? new MigracionPendienteError() : new Error(error.message);
    return;
  }
  demo().config = { ...config };
}

// ----------------------------------------------------------------------------
// Tope de preguntas al mes (para que el gasto de IA nunca se dispare)
// ----------------------------------------------------------------------------

export function topeMensual(): number {
  const n = Number(process.env.RORO_TOPE_MENSUAL);
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), 10_000) : 200;
}

function mesActual(): string {
  return hoyLocal().slice(0, 7);
}

export async function getUso(): Promise<ManagerUso> {
  const mes = mesActual();
  const tope = topeMensual();
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from("manager_uso").select("preguntas").eq("mes", mes).limit(1);
    if (error) {
      if (faltaMigracion(error)) return { mes, usadas: 0, tope };
      throw new Error(error.message);
    }
    return { mes, usadas: Number((data?.[0] as { preguntas?: number } | undefined)?.preguntas ?? 0), tope };
  }
  return { mes, usadas: demo().uso[mes]?.preguntas ?? 0, tope };
}

/** Suma una pregunta (y sus tokens) al mes en curso. */
export async function registrarUso(tokensEntrada: number, tokensSalida: number): Promise<void> {
  const mes = mesActual();
  if (cloudReady && adminDb) {
    const { error } = await adminDb.rpc("manager_registrar_uso", {
      p_mes: mes,
      p_entrada: Math.max(0, Math.round(tokensEntrada)),
      p_salida: Math.max(0, Math.round(tokensSalida)),
    });
    if (error) throw new Error(error.message);
    return;
  }
  const u = (demo().uso[mes] ??= { preguntas: 0, entrada: 0, salida: 0 });
  u.preguntas += 1;
  u.entrada += tokensEntrada;
  u.salida += tokensSalida;
}
