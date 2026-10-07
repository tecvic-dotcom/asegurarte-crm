import "server-only";

/**
 * Tus mensajes de WhatsApp para Valeri — SOLO SERVIDOR.
 *  - NUBE: tabla cobranza_mensajes (un renglón por situación que personalizaste).
 *  - DEMO: memoria.
 * Sin renglón = Valeri usa su texto base (PLANTILLAS_BASE).
 */
import { adminDb, cloudReady } from "./supabase-admin";
import { faltaMigracion, MENSAJE_MIGRACION_MENSAJES, MigracionPendienteError } from "./migracion";
import type { MotivoCobro } from "./cobranza-reglas";

const MOTIVOS: MotivoCobro[] = ["vencida", "promesa_vencida", "promesa", "por_vencer", "renovacion"];
export function esMotivo(v: unknown): v is MotivoCobro {
  return typeof v === "string" && (MOTIVOS as string[]).includes(v);
}

const globalConDemo = globalThis as typeof globalThis & { __mensajesCobroDemo?: Partial<Record<MotivoCobro, string>> };
function demo(): Partial<Record<MotivoCobro, string>> {
  return (globalConDemo.__mensajesCobroDemo ??= {});
}

function errorDeBase(error: { code?: string; message: string }): Error {
  return faltaMigracion(error) ? new MigracionPendienteError(MENSAJE_MIGRACION_MENSAJES, "0008_cobranza_mensajes.sql") : new Error(error.message);
}

export async function listarMensajesCobro(): Promise<Partial<Record<MotivoCobro, string>>> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from("cobranza_mensajes").select("motivo, texto");
    if (error) throw errorDeBase(error);
    const salida: Partial<Record<MotivoCobro, string>> = {};
    for (const f of data ?? []) if (esMotivo(f.motivo)) salida[f.motivo] = String(f.texto);
    return salida;
  }
  return { ...demo() };
}

/** Guarda tu texto; con texto null borra tu versión y vuelve al texto base. */
export async function guardarMensajeCobro(motivo: MotivoCobro, texto: string | null): Promise<void> {
  if (cloudReady && adminDb) {
    const { error } =
      texto === null
        ? await adminDb.from("cobranza_mensajes").delete().eq("motivo", motivo)
        : await adminDb.from("cobranza_mensajes").upsert({ motivo, texto, actualizado_en: new Date().toISOString() }, { onConflict: "motivo" });
    if (error) throw errorDeBase(error);
    return;
  }
  if (texto === null) delete demo()[motivo];
  else demo()[motivo] = texto;
}
