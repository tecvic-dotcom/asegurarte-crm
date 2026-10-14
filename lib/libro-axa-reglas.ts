/**
 * De los pagos que aparecen en tus reportes de AXA (comisiones 2022-2026) a «qué póliza es, si sigue vigente y cuándo renueva».
 * Puro y sin dependencias: lo usa el importador y se prueba solo.
 *
 * Cada renglón del reporte es UN pago aplicado de una póliza (Vigor = inicio del periodo que pagó, Día = cuándo se aplicó).
 * De la cadencia de esos pagos se deduce cómo paga el cliente y si dejó de pagar (póliza que ya no está vigente).
 */

export interface PagoAxa {
  /** Inicio del periodo que se pagó (AAAA-MM-DD). */
  vigor: string;
  /** Fecha en que se aplicó el pago (AAAA-MM-DD). */
  dia: string;
  prima: number;
}

export type Cadencia = "mensual" | "trimestral" | "semestral" | "anual";

export interface InferenciaPoliza {
  inicio_vigencia: string | null;
  ultimo_pago: string | null;
  /** Cuántos periodos distintos pagó en el último año. */
  pagos_12m: number;
  cadencia: Cadencia | null;
  vigente: boolean;
  /** Próxima renovación; solo cuando se puede saber con confianza (pagos anuales). */
  renovacion: string | null;
  prima_ultima: number;
}

/** AAAA/MM/DD o AAAA-MM-DD → AAAA-MM-DD (cadena vacía si no es una fecha). */
export function aISO(f: string): string {
  const m = f.trim().match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

function dias(a: string, b: string): number {
  return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86_400_000);
}

function sumarAnios(f: string, n: number): string {
  const [y, m, d] = f.split("-").map(Number);
  const t = new Date(Date.UTC(y + n, m - 1, 1));
  const ultimo = new Date(Date.UTC(y + n, m, 0)).getUTCDate();
  return `${t.getUTCFullYear()}-${String(m).padStart(2, "0")}-${String(Math.min(d, ultimo)).padStart(2, "0")}`;
}

/** Cuántos días sin pagar se toleran antes de dar la póliza por no vigente, según cómo paga. */
const PLAZO: Record<Cadencia, number> = { mensual: 100, trimestral: 220, semestral: 220, anual: 400 };

export function inferirPoliza(pagosCrudos: PagoAxa[], hoy: string): InferenciaPoliza {
  // Las devoluciones (prima negativa) no cuentan como pago.
  const pagos = pagosCrudos.filter((p) => p.prima > 0 && p.dia && p.vigor);
  if (!pagos.length) {
    return { inicio_vigencia: null, ultimo_pago: null, pagos_12m: 0, cadencia: null, vigente: false, renovacion: null, prima_ultima: 0 };
  }
  const ordenados = [...pagos].sort((a, b) => a.dia.localeCompare(b.dia) || a.vigor.localeCompare(b.vigor));
  const ultimo = ordenados[ordenados.length - 1];
  const ultimo_pago = ultimo.dia;
  const inicio_vigencia = pagos.map((p) => p.vigor).sort().at(-1) ?? null;

  // Periodos distintos (por Vigor) en los últimos 11 meses: dos pagos anuales quedan a ~12 meses y no se confunden con dos semestrales.
  // Un pago con endosos repite el mismo Vigor y cuenta una sola vez.
  const periodos = new Set(pagos.filter((p) => dias(p.vigor, inicio_vigencia!) < 330).map((p) => p.vigor.slice(0, 7)));
  const n = periodos.size;
  const cadencia: Cadencia = n >= 9 ? "mensual" : n >= 3 ? "trimestral" : n === 2 ? "semestral" : "anual";
  const vigente = dias(ultimo_pago, hoy) <= PLAZO[cadencia];

  let renovacion: string | null = null;
  if (cadencia === "anual" && inicio_vigencia) {
    const siguiente = sumarAnios(inicio_vigencia, 1);
    // Si ese aniversario ya pasó sin que aparezca el pago, es una renovación atrasada o perdida: no se adivina.
    if (siguiente >= hoy) renovacion = siguiente;
  }
  return { inicio_vigencia, ultimo_pago, pagos_12m: n, cadencia, vigente, renovacion, prima_ultima: ultimo.prima };
}
