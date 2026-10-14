import { moneda } from "./crm-data";
import { montoPorPago, pagosPorAnio } from "./cobranza-reglas";
import { celdaPagos, resumenCotizacion, type Cotizacion } from "./cotizaciones-reglas";
import { esRamo } from "./ramos";
import type { DatosPoliza, FormaPago, Lead } from "./types";

/**
 * De la venta a la cobranza: lo que se le pasa a Valeri cuando cierras a un cliente.
 * Si el prospecto tiene una cotización ELEGIDA, sus cantidades reales (prima, primer pago con derecho de póliza y pagos
 * subsecuentes) mandan; si no, se estima con el valor del prospecto, repartido en los pagos del año.
 */

/** La cotización que marcaste como elegida para ese prospecto (la más reciente si hay varias). Null si no hay. */
export function cotizacionElegida(lista: Cotizacion[]): Cotizacion | null {
  const elegidas = lista.filter((c) => c.estado === "elegida").sort((a, b) => b.creado_en.localeCompare(a.creado_en));
  return elegidas[0] ?? null;
}

/** Los montos de una cotización en dólares no sirven para una póliza en pesos: solo cuentan las de pesos. */
function enPesos(cot: Cotizacion | null): Cotizacion | null {
  return cot && cot.moneda === "MN" ? cot : null;
}

const PAGOS_DE: Record<FormaPago, string> = { mensual: "mensuales", trimestral: "trimestrales", semestral: "semestrales", anual: "anuales" };

/** ¿La cotización trae pagos en justo esa frecuencia? */
function traePagosEn(cot: Cotizacion, forma: FormaPago): boolean {
  return forma !== "anual" && cot.forma_pago === forma && Boolean(cot.monto_pago);
}

/** Lo que se prellena en el formulario de la póliza de Valeri. */
export function polizaDesdeVenta(lead: Lead, forma: FormaPago, cotizacion: Cotizacion | null): Partial<DatosPoliza> {
  const cot = enPesos(cotizacion);
  // La prima de contado de la cotización es la prima de todo el año; sin cotización se usa la prima total capturada en el prospecto.
  const prima = cot ? cot.prima : lead.valor;
  const ramoCot = cot && esRamo(cot.ramo) ? cot.ramo : null;

  const datos: Partial<DatosPoliza> = {
    asegurado: lead.nombre,
    whatsapp: lead.whatsapp,
    correo: lead.correo,
    ramo: lead.ramo ?? ramoCot,
    ...(cotizacion ? { aseguradora: cotizacion.aseguradora } : {}),
    prima_anual: prima,
    forma_pago: forma,
    lead_id: lead.id,
  };

  if (forma === "anual") {
    if (prima > 0) datos.monto_pago = prima;
    if (cot) datos.notas = `Prima de contado tomada de la cotización elegida (${resumenCotizacion(cot)}).`;
    return datos;
  }

  // Pagando por partes el primer recibo (con derecho de póliza) puede costar distinto.
  datos.primer_pago_pendiente = true;
  if (cot && traePagosEn(cot, forma)) {
    datos.monto_pago = cot.monto_pago ?? 0;
    if (cot.primer_pago) datos.primer_pago = cot.primer_pago;
    datos.notas = `Montos tomados de la cotización elegida (${cot.aseguradora}${cot.plan ? ` · ${cot.plan}` : ""}): ${celdaPagos(cot)}.`;
  } else if (prima > 0) {
    datos.monto_pago = montoPorPago(prima, forma);
    datos.notas =
      `Pagos subsecuentes estimados (${moneda(prima)} ÷ ${pagosPorAnio(forma)}${cot ? `, con la prima de la cotización elegida` : ""}), ` +
      `sin recargo por pago fraccionado: confírmalos con la aseguradora. Captura el primer pago, que lleva el derecho de póliza.`;
  }
  return datos;
}

/** El aviso que sale debajo de «Frecuencia de pago»: de dónde vienen las cantidades que se pasan a Valeri. "" = nada que decir. */
export function avisoDeMontos(lead: Lead, forma: FormaPago, cotizacion: Cotizacion | null): string {
  const cot = enPesos(cotizacion);
  if (cot && traePagosEn(cot, forma)) return `Con la cotización elegida (${cot.aseguradora}): ${celdaPagos(cot)}.`;

  if (forma === "anual") {
    if (!cot) return "";
    const tambien = cot.forma_pago && cot.monto_pago ? ` También trae pagos ${PAGOS_DE[cot.forma_pago]}: elige esa frecuencia para usar esos montos.` : "";
    return `Cotización elegida (${resumenCotizacion(cot)}): se pasa la prima de contado.${tambien}`;
  }

  const prima = cot ? cot.prima : lead.valor;
  if (!(prima > 0)) return "";
  const estimado = `Cada pago estimado: ${moneda(montoPorPago(prima, forma))} (${moneda(prima)} ÷ ${pagosPorAnio(forma)}). El primer pago suele ser mayor (derecho de póliza): lo capturas en Valeri.`;
  return cot ? `La cotización elegida (${cot.aseguradora}) no trae pagos ${PAGOS_DE[forma]}. ${estimado}` : estimado;
}
