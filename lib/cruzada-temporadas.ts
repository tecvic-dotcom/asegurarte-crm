/**
 * Temporadas del año en que ciertos seguros se venden solos — puro, sin dependencias.
 *
 * Camila las usa de dos formas: sube un poco el puntaje del seguro de la temporada y avisa arriba «Ahora es temporada de…».
 */
import type { Ramo } from "./types";

export interface Temporada {
  id: "aguinaldo" | "declaracion" | "lluvias";
  nombre: string;
  /** Mes-día (MM-DD) de inicio y de fin, ambos incluidos. */
  desde: string;
  hasta: string;
  ramos: Ramo[];
  /** La razón que se le muestra a Roberto en la oferta. */
  razon: string;
  /** El aviso de arriba. */
  aviso: string;
}

export const TEMPORADAS: Temporada[] = [
  {
    id: "declaracion",
    nombre: "Declaración anual",
    desde: "01-01",
    hasta: "04-30",
    ramos: ["ahorro"],
    razon: "Es temporada de declaración anual: el ahorro para el retiro puede ser deducible",
    aviso: "Declaración anual (enero a abril): buen momento para ofrecer ahorro para el retiro, que puede ser deducible.",
  },
  {
    id: "lluvias",
    nombre: "Lluvias y huracanes",
    desde: "06-01",
    hasta: "11-30",
    ramos: ["hogar", "autos"],
    razon: "Es temporada de lluvias y huracanes: buen momento para asegurar su casa y su auto",
    aviso: "Temporada de lluvias y huracanes (junio a noviembre): buen momento para ofrecer hogar y auto.",
  },
  {
    id: "aguinaldo",
    nombre: "Aguinaldo",
    desde: "12-01",
    hasta: "12-31",
    ramos: ["ahorro", "vida"],
    razon: "Es temporada de aguinaldo: buen momento para destinar una parte a su ahorro o a su protección",
    aviso: "Aguinaldo (diciembre): buen momento para ofrecer ahorro y seguro de vida.",
  },
];

/** Las temporadas que están corriendo hoy (AAAA-MM-DD). Pueden ser varias a la vez. */
export function temporadasActivas(hoy: string): Temporada[] {
  const md = hoy.slice(5);
  return TEMPORADAS.filter((t) => md >= t.desde && md <= t.hasta);
}

/** La temporada activa que favorece a este seguro, si hay. */
export function temporadaDe(ramo: Ramo, hoy: string): Temporada | null {
  return temporadasActivas(hoy).find((t) => t.ramos.includes(ramo)) ?? null;
}
