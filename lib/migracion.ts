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

export const MENSAJE_MIGRACION_PENDIENTES =
  "Falta un paso para encender tus pendientes: abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0009_pendientes.sql y dale Run.";

export const MENSAJE_MIGRACION_PENDIENTES_ORDEN =
  "Falta un paso para guardar el orden de tus pendientes: abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0010_pendientes_orden.sql y dale Run.";

export const MENSAJE_MIGRACION_COTIZACIONES =
  "Falta un paso para encender tus cotizaciones: abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0011_cotizaciones.sql y dale Run.";

export const MENSAJE_MIGRACION_SEGUIMIENTO =
  "Falta un paso para guardar tus mensajes de Sofi: abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0012_seguimiento_mensajes.sql y dale Run.";

export const MENSAJE_MIGRACION_MENSAJES =
  "Falta un paso para guardar tus mensajes de Valeri: abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0008_cobranza_mensajes.sql y dale Run.";

export const MENSAJE_MIGRACION_HISTORIAL =
  "Falta un paso para encender el historial de tus pólizas (pagos, renovaciones y endosos): abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0013_polizas_historial.sql y dale Run.";

export const MENSAJE_MIGRACION_PRIMER_PAGO =
  "Falta un paso para guardar el primer pago de tus pólizas (el que lleva el derecho de póliza): abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0015_primer_pago.sql y dale Run.";

export const MENSAJE_MIGRACION_DOBLE_FACTOR =
  "Falta un paso para encender el doble factor de tu CRM: abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0014_doble_factor.sql y dale Run.";

export const MENSAJE_MIGRACION_CRUZADA =
  "Falta un paso para encender a Camila (venta cruzada) y los expedientes de tus clientes: abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0016_venta_cruzada.sql y dale Run.";

export const MENSAJE_MIGRACION_STAND_BY =
  "Falta un paso para usar la etapa Stand by: abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0018_stand_by.sql y dale Run.";

/** La base rechazó una etapa porque su regla (check) aún no conoce «Stand by»: falta correr la migración 0018. */
export function etapaNoPermitida(error: { code?: string } | null | undefined, etapa: string | undefined): boolean {
  return etapa === "stand_by" && error?.code === "23514";
}

export const MENSAJE_MIGRACION_CRUZADA_2 =
  "Falta un paso para activar las familias, los momentos de confianza y las ventas cruzadas en tu meta: abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0017_venta_cruzada_2.sql y dale Run.";

export const MENSAJE_MIGRACION_TARJETA =
  "Falta un paso para medir tu tarjeta web: abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0019_tarjeta_eventos.sql y dale Run.";

export const MENSAJE_MIGRACION_VIDEOS =
  "Falta un paso para subir videos a tu tarjeta: abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0020_tarjeta_videos.sql y dale Run.";

export const MENSAJE_MIGRACION_CHUBB =
  "Falta un paso para encender a Dana (Chubb Autos): abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0021_chubb_autos.sql y dale Run.";
