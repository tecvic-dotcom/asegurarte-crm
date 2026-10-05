import "server-only";

/**
 * Tu producción por mes y ramo (pestaña Crecimiento) — SOLO SERVIDOR.
 *  - NUBE: tabla produccion_mensual (solo totales, sin clientes).
 *  - DEMO: números INVENTADOS con tendencia, para practicar.
 * Se llena con los reportes de prima pagada de la aseguradora (Claude Code los carga).
 */
import { adminDb, cloudReady } from "./supabase-admin";
import { faltaMigracion, MENSAJE_MIGRACION_PRODUCCION, MigracionPendienteError } from "./migracion";
import { esRamo } from "./ramos";
import { esFechaValida, hoyLocal } from "./fechas";
import type { ProduccionMes, Ramo } from "./types";

function normalizar(f: Record<string, unknown>): ProduccionMes | null {
  if (!esRamo(f.ramo)) return null;
  const dia = String(f.ultimo_dia ?? "").slice(0, 10);
  return {
    mes: String(f.mes),
    aseguradora: String(f.aseguradora ?? ""),
    ramo: f.ramo,
    subramo: String(f.subramo ?? ""),
    moneda: f.moneda === "DLS" ? "DLS" : "MN",
    pagos: Number(f.pagos) || 0,
    prima: Number(f.prima) || 0,
    comision: Number(f.comision) || 0,
    ultimo_dia: esFechaValida(dia) ? dia : null,
  };
}

/** Datos de muestra: 4 ramos desde 2022 hasta el mes actual, con temporada y tendencia. */
function demo(): ProduccionMes[] {
  const hoy = hoyLocal();
  const fin = Number(hoy.slice(0, 4)) * 12 + Number(hoy.slice(5, 7)) - 1;
  const base: Record<Ramo, [number, number, number]> = {
    // prima mensual base, crecimiento anual, % de comisión
    gmm: [180_000, 0.18, 0.16],
    vida: [130_000, 0.07, 0.12],
    autos: [20_000, -0.02, 0.09],
    hogar: [11_000, -0.08, 0.19],
    ahorro: [0, 0, 0],
  };
  const filas: ProduccionMes[] = [];
  for (let i = 2022 * 12; i <= fin; i++) {
    const anio = Math.floor(i / 12);
    const mes = (i % 12) + 1;
    const mm = `${anio}-${String(mes).padStart(2, "0")}`;
    for (const ramo of ["gmm", "vida", "autos", "hogar"] as Ramo[]) {
      const [b, g, c] = base[ramo];
      const temporada = 1 + 0.18 * Math.sin((mes / 12) * 2 * Math.PI) + ((i * 7 + ramo.length * 13) % 9) / 40;
      const prima = Math.round(b * Math.pow(1 + g, anio - 2022) * temporada);
      filas.push({
        mes: mm,
        aseguradora: "Demo",
        ramo,
        subramo: "",
        moneda: "MN",
        pagos: Math.max(1, Math.round(prima / 8000)),
        prima,
        comision: Math.round(prima * c),
        ultimo_dia: i === fin ? hoy : `${mm}-28`,
      });
    }
  }
  return filas;
}

export async function listarProduccion(): Promise<ProduccionMes[]> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from("produccion_mensual").select("*").order("mes").limit(20000);
    if (error) {
      throw faltaMigracion(error)
        ? new MigracionPendienteError(MENSAJE_MIGRACION_PRODUCCION, "0005_produccion.sql")
        : new Error(error.message);
    }
    return (data ?? []).map((f) => normalizar(f as Record<string, unknown>)).filter((f): f is ProduccionMes => f !== null);
  }
  return demo();
}
