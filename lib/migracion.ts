import "server-only";

/**
 * Detecta cuándo a tu Supabase le falta la migración 0003 (AI Manager) para
 * mostrar un mensaje humano con el paso a seguir, en vez de un error técnico.
 */
export const MENSAJE_MIGRACION =
  "Falta un paso para activar tu AI Manager: abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0003_ai_manager.sql y dale Run.";

export const MENSAJE_MIGRACION_COBRANZA =
  "Falta un paso para encender a Valeri: abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0004_cobranza.sql y dale Run.";

export const MENSAJE_MIGRACION_PRODUCCION =
  "Falta un paso para encender tu pestaña de Crecimiento: abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0005_produccion.sql y dale Run.";

export class MigracionPendienteError extends Error {
  constructor(
    message = MENSAJE_MIGRACION,
    /** El archivo de supabase/migrations que falta correr. */
    public archivo = "0003_ai_manager.sql",
  ) {
    super(message);
    this.name = "MigracionPendienteError";
  }
}

// Tabla, columna o función que no existe (Postgres) o que PostgREST no encuentra.
const CODIGOS_FALTANTES = new Set(["42P01", "42703", "42883", "PGRST202", "PGRST204", "PGRST205"]);

export function faltaMigracion(error: { code?: string } | null | undefined): boolean {
  return Boolean(error?.code && CODIGOS_FALTANTES.has(error.code));
}

export const MENSAJE_MIGRACION_ADJUNTAS =
  "Falta un paso para encender tu pestaña de Pólizas: abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0006_polizas_adjuntas.sql y dale Run.";

export const MENSAJE_MIGRACION_MENSAJES =
  "Falta un paso para guardar tus mensajes de Valeri: abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0008_cobranza_mensajes.sql y dale Run.";
