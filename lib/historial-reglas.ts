/**
 * Reglas del historial de cada póliza (cliente y servidor, sin IA y sin costo): validación de pagos, endosos y
 * renovaciones, y los valores sugeridos para renovar. La bitácora vive en la tabla polizas_historial.
 */
import { diasEntre, esFechaValida, sumarMeses } from "./fechas";
import { FORMAS_PAGO } from "./cobranza-reglas";
import type { DatosEvento, DatosRenovacion, EventoPoliza, FormaPago, Poliza, TipoEvento } from "./types";

/** Tipos de endoso que ofrece el formulario (el texto elegido es lo que se guarda en «concepto»). */
export const TIPOS_ENDOSO = [
  "Alta de asegurado",
  "Baja de asegurado",
  "Cambio de suma asegurada",
  "Cambio de plan o coberturas",
  "Cambio de vehículo",
  "Cambio de domicilio",
  "Cambio de beneficiarios",
  "Corrección de datos",
  "Cancelación",
  "Otro",
] as const;

export const CONCEPTO_PAGO_VALERI = "Pagó (Valeri)";
export const CONCEPTO_PAGO_MANUAL = "Registrado a mano";

const MONTO_MAXIMO = 50_000_000;

function texto(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

/** Dinero escrito como texto o número. `negativo` permite ajustes a la baja (endosos). */
function monto(v: unknown, negativo: boolean): number | null {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[$,\s]/g, "") || 0);
  if (!Number.isFinite(n) || n > MONTO_MAXIMO || n < (negativo ? -MONTO_MAXIMO : 0)) return null;
  return Math.round(n * 100) / 100;
}

function fechaOpcional(v: unknown): string | null | false {
  const f = String(v ?? "").trim();
  if (!f) return null;
  return esFechaValida(f) ? f : false;
}

export type ResultadoEvento = { ok: true; datos: DatosEvento } | { ok: false; error: string };

/** Un pago o un endoso. */
export function validarEvento(entrada: unknown): ResultadoEvento {
  if (!entrada || typeof entrada !== "object") return { ok: false, error: "Los datos vienen vacíos." };
  const e = entrada as Record<string, unknown>;
  if (e.tipo !== "pago" && e.tipo !== "endoso") return { ok: false, error: "Elige si es un pago o un endoso." };
  const tipo: "pago" | "endoso" = e.tipo;

  const fecha = String(e.fecha ?? "").trim();
  if (!esFechaValida(fecha)) {
    return { ok: false, error: tipo === "pago" ? "Escribe la fecha en que pagó." : "Escribe la fecha del endoso." };
  }
  const importe = monto(e.monto, tipo === "endoso");
  if (importe === null) return { ok: false, error: "Revisa el monto: debe ser un número (ejemplo: 1250)." };
  if (tipo === "pago" && importe <= 0) return { ok: false, error: "Escribe cuánto pagó (mayor a 0)." };

  const concepto = texto(e.concepto, 80) || (tipo === "pago" ? CONCEPTO_PAGO_MANUAL : "");
  if (!concepto) return { ok: false, error: "Elige qué tipo de endoso es." };

  const recibo = fechaOpcional(e.recibo);
  if (recibo === false) return { ok: false, error: "La fecha del recibo no es válida." };

  return {
    ok: true,
    datos: { tipo, fecha, monto: importe, concepto, numero: texto(e.numero, 40), nota: texto(e.nota, 1000), recibo: tipo === "pago" ? recibo : null },
  };
}

export type ResultadoRenovacion = { ok: true; datos: DatosRenovacion } | { ok: false; error: string };

/** La renovación de una póliza: vigencia nueva, lo que se paga y (opcional) la prima neta para tus reportes. */
export function validarRenovacion(entrada: unknown): ResultadoRenovacion {
  if (!entrada || typeof entrada !== "object") return { ok: false, error: "Los datos vienen vacíos." };
  const e = entrada as Record<string, unknown>;

  const inicio = String(e.inicio ?? "").trim();
  const hasta = String(e.hasta ?? "").trim();
  if (!esFechaValida(inicio)) return { ok: false, error: "Escribe cuándo empieza la vigencia nueva." };
  if (!esFechaValida(hasta)) return { ok: false, error: "Escribe cuándo termina la vigencia nueva (la próxima renovación)." };
  const dias = diasEntre(inicio, hasta);
  if (dias < 28 || dias > 800) return { ok: false, error: "Revisa las fechas: la vigencia nueva debe durar entre 1 mes y 2 años." };

  const forma = e.forma_pago ?? "anual";
  if (!FORMAS_PAGO.some((f) => f.id === forma)) return { ok: false, error: "La forma de pago no es válida." };

  const montoPago = monto(e.monto_pago, false);
  const primerPago = monto(e.primer_pago, false);
  const primaAnual = monto(e.prima_anual, false);
  const primaNeta = monto(e.prima_neta, false);
  if (montoPago === null || primerPago === null || primaAnual === null || primaNeta === null) {
    return { ok: false, error: "Revisa los montos: deben ser números (ejemplo: 1250)." };
  }

  const limite = fechaOpcional(e.fecha_limite_pago);
  if (limite === false) return { ok: false, error: "La fecha límite del primer pago no es válida." };

  return {
    ok: true,
    datos: {
      inicio,
      hasta,
      forma_pago: forma as FormaPago,
      monto_pago: montoPago,
      // El primer pago distinto solo existe en pólizas que se pagan por partes.
      primer_pago: forma === "anual" ? 0 : primerPago,
      prima_anual: primaAnual,
      fecha_limite_pago: limite,
      numero: texto(e.numero, 40),
      aseguradora: texto(e.aseguradora, 60),
      origen: e.origen === "pdf" ? "pdf" : "manual",
      prima_neta: primaNeta,
      nota: texto(e.nota, 500),
      archivo: texto(e.archivo, 200),
    },
  };
}

/** Lo que se le sugiere a Roberto al renovar: la vigencia que sigue, con los mismos montos de hoy. */
export function sugerirRenovacion(p: Poliza, hoy: string): DatosRenovacion {
  const inicio = p.renovacion && esFechaValida(p.renovacion) ? p.renovacion : hoy;
  return {
    inicio,
    hasta: sumarMeses(inicio, 12),
    forma_pago: p.forma_pago,
    monto_pago: p.monto_pago,
    // Lo mismo de hoy como punto de partida (el derecho de póliza suele ser parecido de un año a otro).
    primer_pago: p.primer_pago,
    prima_anual: p.prima_anual,
    // Regla de Roberto: la fecha límite de pago es el inicio del recibo.
    fecha_limite_pago: inicio,
    numero: p.numero,
    aseguradora: p.aseguradora,
    origen: "manual",
    prima_neta: 0,
    nota: "",
    archivo: "",
  };
}

/** Cuántos eventos de cada tipo tiene una póliza (para los globitos de los botones). */
export type ConteoEventos = Record<TipoEvento, number>;
export const SIN_EVENTOS: ConteoEventos = { pago: 0, endoso: 0, renovacion: 0 };

export function contarEventos(eventos: Pick<EventoPoliza, "poliza_id" | "tipo">[]): Record<string, ConteoEventos> {
  const r: Record<string, ConteoEventos> = {};
  for (const ev of eventos) {
    (r[ev.poliza_id] ??= { ...SIN_EVENTOS })[ev.tipo] += 1;
  }
  return r;
}
