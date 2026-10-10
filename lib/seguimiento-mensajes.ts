import "server-only";

/**
 * Tus mensajes de WhatsApp para Sofi — SOLO SERVIDOR (mismo patrón que lib/cobranza-mensajes.ts).
 *  - NUBE: tabla seguimiento_mensajes (un renglón por situación que personalizaste).
 *  - DEMO: memoria.
 * Sin renglón = Sofi usa su texto base (PLANTILLAS_SEGUIMIENTO).
 */
import { adminDb, cloudReady } from "./supabase-admin";
import { faltaMigracion, MENSAJE_MIGRACION_SEGUIMIENTO, MigracionPendienteError } from "./migracion";
import type { MotivoSeguimiento } from "./seguimiento-reglas";

const MOTIVOS: MotivoSeguimiento[] = ["nuevo", "contactado", "cita", "propuesta", "ultimo_intento"];
export function esMotivoSeguimiento(v: unknown): v is MotivoSeguimiento {
  return typeof v === "string" && (MOTIVOS as string[]).includes(v);
}

const globalConDemo = globalThis as typeof globalThis & { __mensajesSeguimientoDemo?: Partial<Record<MotivoSeguimiento, string>> };
function demo(): Partial<Record<MotivoSeguimiento, string>> {
  return (globalConDemo.__mensajesSeguimientoDemo ??= {});
}

function errorDeBase(error: { code?: string; message: string }): Error {
  return faltaMigracion(error) ? new MigracionPendienteError(MENSAJE_MIGRACION_SEGUIMIENTO, "0012_seguimiento_mensajes.sql") : new Error(error.message);
}

export async function listarMensajesSeguimiento(): Promise<Partial<Record<MotivoSeguimiento, string>>> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from("seguimiento_mensajes").select("motivo, texto");
    if (error) throw errorDeBase(error);
    const salida: Partial<Record<MotivoSeguimiento, string>> = {};
    for (const f of data ?? []) if (esMotivoSeguimiento(f.motivo)) salida[f.motivo] = String(f.texto);
    return salida;
  }
  return { ...demo() };
}

/** Guarda tu texto; con texto null borra tu versión y vuelve al texto base. */
export async function guardarMensajeSeguimiento(motivo: MotivoSeguimiento, texto: string | null): Promise<void> {
  if (cloudReady && adminDb) {
    const { error } =
      texto === null
        ? await adminDb.from("seguimiento_mensajes").delete().eq("motivo", motivo)
        : await adminDb.from("seguimiento_mensajes").upsert({ motivo, texto, actualizado_en: new Date().toISOString() }, { onConflict: "motivo" });
    if (error) throw errorDeBase(error);
    return;
  }
  if (texto === null) delete demo()[motivo];
  else demo()[motivo] = texto;
}
