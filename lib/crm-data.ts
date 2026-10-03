/**
 * Datos de presentación del CRM (cliente-safe, sin server-only).
 * Las etapas usan TOKENS de color (var(--…)) — cero hex hardcodeado en TS.
 * El re-skin a marca LEGENDAR·IA (azul) vive aquí: nada de dorado/coral.
 */
import type { Etapa, EtapaId } from "./types";

export const ETAPAS: Etapa[] = [
  { id: "nuevo", nombre: "Nuevo", color: "var(--sky)" },
  { id: "contactado", nombre: "Contactado", color: "var(--violet)" },
  { id: "cita", nombre: "Cita agendada", color: "var(--brand-2)" },
  { id: "propuesta", nombre: "Propuesta enviada", color: "var(--amber)" },
  { id: "ganado", nombre: "Cliente ganado", color: "var(--green)" },
  { id: "perdido", nombre: "Perdido", color: "var(--ink-mute)" },
];

/** Etapas que se muestran como columnas del kanban (ganado/perdido son zonas). */
export const ETAPAS_ACTIVAS: Etapa[] = ETAPAS.filter(
  (e) => e.id !== "ganado" && e.id !== "perdido",
);

export function etapa(id: EtapaId): Etapa {
  return ETAPAS.find((e) => e.id === id) ?? ETAPAS[0];
}

export function nombreEtapa(id: EtapaId): string {
  return etapa(id).nombre;
}

export function moneda(n: number): string {
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}

/** Etiqueta legible para el tipo de actividad del timeline. */
export const ICONO_ACTIVIDAD: Record<string, string> = {
  nota: "flat-color-icons:edit-image",
  llamada: "flat-color-icons:phone",
  mensaje: "flat-color-icons:sms",
  correo: "flat-color-icons:feedback",
  cita: "flat-color-icons:calendar",
  etapa: "flat-color-icons:flow-chart",
  pago: "flat-color-icons:money-transfer",
};
