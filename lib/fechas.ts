/**
 * Fechas del Panel de Mando — puras, sin dependencias (cliente y servidor).
 *
 * Trabajamos con texto "AAAA-MM-DD" (sin horas) para que un día sea un día,
 * sin brincos por zona horaria. "Hoy" se calcula con la hora de Monterrey:
 * si a las 11 pm cierras una póliza, cuenta para ese día y no para mañana.
 */
export const ZONA_HORARIA = "America/Monterrey";

const FORMATO_LOCAL = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha local (AAAA-MM-DD) de un instante (Date o texto ISO con hora). */
export function fechaLocal(instante: Date | string): string {
  return FORMATO_LOCAL.format(typeof instante === "string" ? new Date(instante) : instante);
}

export function hoyLocal(): string {
  return fechaLocal(new Date());
}

function aUTC(f: string): number {
  const [y, m, d] = f.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function deUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** true si el texto es una fecha real en formato AAAA-MM-DD (no acepta 2026-02-31). */
export function esFechaValida(f: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(f) && deUTC(aUTC(f)) === f;
}

export function sumarDias(f: string, n: number): string {
  return deUTC(aUTC(f) + n * 86_400_000);
}

/** Días entre dos fechas contando ambas (1 de oct → 4 de oct = 4). */
export function diasIncluidos(desde: string, hasta: string): number {
  return Math.round((aUTC(hasta) - aUTC(desde)) / 86_400_000) + 1;
}

export function primeroDeMes(f: string): string {
  return `${f.slice(0, 7)}-01`;
}

export function ultimoDeMes(f: string): string {
  const [y, m] = f.split("-").map(Number);
  return deUTC(Date.UTC(y, m, 0));
}

/** Primer día del mes anterior al de la fecha dada. */
export function mesAnterior(f: string): string {
  return primeroDeMes(sumarDias(primeroDeMes(f), -1));
}

export function minFecha(a: string, b: string): string {
  return a < b ? a : b;
}

export function maxFecha(a: string, b: string): string {
  return a > b ? a : b;
}

export function enRango(f: string, r: { desde: string; hasta: string }): boolean {
  return f >= r.desde && f <= r.hasta;
}

/** Cuántos días comparten dos rangos (0 si no se tocan). */
export function diasTraslape(a: { desde: string; hasta: string }, b: { desde: string; hasta: string }): number {
  const desde = maxFecha(a.desde, b.desde);
  const hasta = minFecha(a.hasta, b.hasta);
  return hasta < desde ? 0 : diasIncluidos(desde, hasta);
}

/** "octubre" */
export function nombreMes(f: string): string {
  return new Date(aUTC(f)).toLocaleDateString("es-MX", { month: "long", timeZone: "UTC" });
}

/** "oct" */
export function mesCorto(f: string): string {
  return new Date(aUTC(f)).toLocaleDateString("es-MX", { month: "short", timeZone: "UTC" }).replace(".", "");
}

/** "4 oct" */
export function fechaCorta(f: string): string {
  return `${Number(f.slice(8, 10))} ${mesCorto(f)}`;
}

export function capitalizar(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
