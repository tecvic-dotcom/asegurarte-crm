import "server-only";

/**
 * Clara (reportes) — SOLO SERVIDOR. Junta lo que ya existe en tu CRM
 * (prospectos, finanzas, cobranza y producción) y se lo pasa a las reglas
 * de lib/reportes-reglas.ts. No usa IA: cuesta $0.
 */
import { listLeads, isCloud } from "./db";
import { listarMovimientos } from "./finanzas";
import { listarPolizas } from "./cobranza";
import { listarProduccion } from "./produccion";
import { listarAdjuntas } from "./polizas-adjuntas";
import { getManagerConfig } from "./manager-config";
import { MigracionPendienteError } from "./migracion";
import { armarReporte, inicioDatos } from "./reportes-reglas";
import { hoyLocal } from "./fechas";
import type { ReporteClara, TipoReporte } from "./types";

/** Lo que falla porque aún no existe su tabla se omite (Clara lo avisa); lo demás sí truena. */
async function opcional<T>(promesa: Promise<T>): Promise<T | null> {
  try {
    return await promesa;
  } catch (e) {
    if (e instanceof MigracionPendienteError) return null;
    throw e;
  }
}

export async function reporteClara(tipo: TipoReporte, fecha: string | null): Promise<ReporteClara> {
  const hoy = hoyLocal();
  const rango = inicioDatos(tipo, fecha, hoy);
  const [{ config }, leads, movimientos, polizas, produccion, adjuntas] = await Promise.all([
    getManagerConfig(),
    listLeads(),
    listarMovimientos(rango.desde, rango.hasta),
    opcional(listarPolizas()),
    opcional(listarProduccion()),
    opcional(listarAdjuntas()),
  ]);
  return armarReporte(tipo, fecha, { hoy, leads, movimientos, polizas, produccion, adjuntas, config, cloud: isCloud() });
}

/**
 * La línea de Clara: la primera semana de cada trimestre presume el cierre del
 * trimestre pasado; el resto del tiempo, el del último mes cerrado.
 */
export async function fraseClara(): Promise<{ frase: string; tipo: TipoReporte }> {
  const hoy = hoyLocal();
  const primerSemanaDeTrimestre = Number(hoy.slice(8, 10)) <= 7 && [1, 4, 7, 10].includes(Number(hoy.slice(5, 7)));
  const tipo: TipoReporte = primerSemanaDeTrimestre ? "trimestre" : "mes";
  const r = await reporteClara(tipo, null);
  return { frase: r.frase, tipo };
}
