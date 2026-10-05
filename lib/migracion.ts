import "server-only";

/**
 * Detecta cuándo a tu Supabase le falta la migración 0003 (AI Manager) para
 * mostrar un mensaje humano con el paso a seguir, en vez de un error técnico.
 */
export const MENSAJE_MIGRACION =
  "Falta un paso para activar tu AI Manager: abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0003_ai_manager.sql y dale Run.";

export class MigracionPendienteError extends Error {
  constructor() {
    super(MENSAJE_MIGRACION);
    this.name = "MigracionPendienteError";
  }
}

// Tabla, columna o función que no existe (Postgres) o que PostgREST no encuentra.
const CODIGOS_FALTANTES = new Set(["42P01", "42703", "42883", "PGRST202", "PGRST204", "PGRST205"]);

export function faltaMigracion(error: { code?: string } | null | undefined): boolean {
  return Boolean(error?.code && CODIGOS_FALTANTES.has(error.code));
}
