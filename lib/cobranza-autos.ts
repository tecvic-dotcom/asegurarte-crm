/**
 * Cobranza de Autos: ¿la póliza de un cliente ganado va con AXA (la lleva Valeri) o con Chubb (la lleva Dana)?
 * Reglas puras (cliente y servidor).
 */
import type { CobranzaAseguradora, Lead } from "./types";

export interface InfoAseguradora {
  id: CobranzaAseguradora;
  nombre: string;
  /** Quién lleva su cobranza en el CRM. */
  empleado: "Valeri" | "Dana";
}

export const ASEGURADORAS_COBRANZA: InfoAseguradora[] = [
  { id: "axa", nombre: "AXA", empleado: "Valeri" },
  { id: "chubb", nombre: "Chubb", empleado: "Dana" },
];

export function esCobranzaAseguradora(v: unknown): v is CobranzaAseguradora {
  return v === "axa" || v === "chubb";
}

export function infoAseguradora(id: CobranzaAseguradora): InfoAseguradora {
  return ASEGURADORAS_COBRANZA.find((a) => a.id === id) ?? ASEGURADORAS_COBRANZA[0];
}

/** Solo un cliente ganado de Autos tiene dos lugares donde llevar su cobranza. */
export function llevaEleccionDeCobranza(l: Pick<Lead, "etapa" | "ramo">): boolean {
  return l.etapa === "ganado" && l.ramo === "autos";
}

/** La etapa que tenía cada prospecto, para notar después quién acaba de pasar a «ganado». */
export function etapasDe(leads: Pick<Lead, "id" | "etapa">[]): Map<string, string> {
  return new Map(leads.map((l) => [l.id, l.etapa]));
}

/**
 * A quién se le pregunta «¿AXA o Chubb?»: al que acaba de pasar a «ganado» (o se capturó ya ganado), es de Autos y todavía
 * no tiene su respuesta. Un prospecto que no se conocía antes cuenta como nuevo. Sin ramo no se pregunta.
 */
export function aQuienPreguntarCobranza(antes: ReadonlyMap<string, string>, ahora: Lead[]): Lead | null {
  return ahora.find((l) => llevaEleccionDeCobranza(l) && !l.cobranza_aseguradora && (antes.get(l.id) ?? "nuevo") !== "ganado") ?? null;
}
