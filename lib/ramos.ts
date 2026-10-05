/**
 * Los 5 ramos que vendes (cliente-safe, sin server-only). Cada uno tiene su
 * propia meta en el Panel de Mando. Íconos a color de Iconify.
 */
import type { Ramo } from "./types";

export interface InfoRamo {
  id: Ramo;
  nombre: string;
  /** Nombre corto para tarjetas y gráficas. */
  corto: string;
  icono: string;
}

export const RAMOS: InfoRamo[] = [
  { id: "vida", nombre: "Vida", corto: "Vida", icono: "flat-color-icons:like" },
  { id: "gmm", nombre: "Gastos médicos (GMM)", corto: "GMM", icono: "flat-color-icons:plus" },
  { id: "ahorro", nombre: "Ahorro", corto: "Ahorro", icono: "flat-color-icons:safe" },
  { id: "autos", nombre: "Autos", corto: "Autos", icono: "flat-color-icons:automotive" },
  { id: "hogar", nombre: "Hogar", corto: "Hogar", icono: "flat-color-icons:home" },
];

export function esRamo(v: unknown): v is Ramo {
  return typeof v === "string" && RAMOS.some((r) => r.id === v);
}

export function infoRamo(id: Ramo): InfoRamo {
  return RAMOS.find((r) => r.id === id) ?? RAMOS[0];
}
