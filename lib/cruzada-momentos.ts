/**
 * Momentos de confianza y embudo de venta cruzada de Camila — puro (cliente y servidor), sin IA y sin costo.
 *
 * Un «momento» no es una venta: es la ocasión en que escribirle a un cliente cae bien (cumpleaños, 30 a 60 días antes de que renueve,
 * acaba de pagar). De ahí salen la revisión de coberturas, la felicitación, el agradecimiento y el pedir referidos.
 */
import { diasEntre, fechaLarga, fechaLocal } from "./fechas";
import {
  DIAS_ENTRE_REFERIDOS,
  PLANTILLAS_CRUZADA,
  esActivo,
  ramosVigentes,
  rellenarCruzada,
  seguroDe,
  type ClaveMensaje,
  type EntradaCliente,
  type ResultadoOportunidades,
} from "./cruzada-reglas";
import { RAMOS } from "./ramos";
import type { EstadoCruzada, MomentoHecho, Ramo } from "./types";

/** Una póliza que renueva dentro de esta ventana es ocasión de revisar sus coberturas. */
export const REVISION_DESDE = 30;
export const REVISION_HASTA = 60;
/** Cuántos días antes se avisa de un cumpleaños, y cuántos días después de un pago sigue siendo buen momento. */
export const DIAS_CUMPLE = 7;
export const DIAS_PAGO = 7;
/** Una venta cerrada hace menos de estos días también es buen momento para pedir referidos. */
export const DIAS_VENTA_RECIENTE = 30;

export type TipoMomento = "cumple" | "revision" | "pago" | "referidos";

export interface Momento {
  /** Identifica este momento para no repetirlo una vez atendido (cumple:2026, revision:NUMERO:FECHA…). */
  clave: string;
  cliente_id: string;
  nombre: string;
  tipo: TipoMomento;
  /** El texto de WhatsApp que le toca (coincide con el tipo). */
  mensaje: ClaveMensaje;
  titulo: string;
  detalle: string;
  /** La fecha que importa: cumpleaños o renovación (AAAA-MM-DD). */
  fecha: string | null;
  /** Días hasta (o desde) esa fecha, para ordenar. */
  dias: number;
  polizaRamo: Ramo | null;
  tiene: Ramo[];
}

function esBisiesto(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** El próximo cumpleaños (hoy cuenta) y en cuántos días. Quien nació un 29 de febrero cumple el 28 en años que no son bisiestos. */
export function proximoCumple(nacimiento: string, hoy: string): { fecha: string; dias: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nacimiento)) return null;
  const md = nacimiento.slice(5);
  const enAnio = (y: number) => `${y}-${md === "02-29" && !esBisiesto(y) ? "02-28" : md}`;
  let fecha = enAnio(Number(hoy.slice(0, 4)));
  if (fecha < hoy) fecha = enAnio(Number(hoy.slice(0, 4)) + 1);
  return { fecha, dias: diasEntre(hoy, fecha) };
}

const ORDEN: Record<TipoMomento, number> = { cumple: 0, revision: 1, pago: 2, referidos: 3 };

/** Los momentos de hoy, ordenados: primero cumpleaños, luego renovaciones por venir, pagos recientes y a quién pedirle referidos. */
export function calcularMomentos(entradas: EntradaCliente[], hoy: string, hechos: MomentoHecho[]): Momento[] {
  const atendidos = new Set(hechos.map((h) => `${h.cliente_id}|${h.clave}`));
  const salida: Momento[] = [];

  for (const e of entradas) {
    const c = e.cliente;
    if (c.no_ofrecer || !esActivo(e.polizas)) continue;
    const tiene = ramosVigentes(e.polizas);
    const base = { cliente_id: c.id, nombre: c.nombre, tiene };
    const nuevo = (m: Omit<Momento, "cliente_id" | "nombre" | "tiene">) => {
      if (!atendidos.has(`${c.id}|${m.clave}`)) salida.push({ ...base, ...m });
    };

    // Un cumpleaños se felicita aunque deba un pago: no vende nada.
    if (c.tipo === "persona" && c.fecha_nacimiento) {
      const pc = proximoCumple(c.fecha_nacimiento, hoy);
      if (pc && pc.dias <= DIAS_CUMPLE) {
        nuevo({
          clave: `cumple:${pc.fecha.slice(0, 4)}`,
          tipo: "cumple",
          mensaje: "cumple",
          titulo: pc.dias === 0 ? "Cumple años hoy" : pc.dias === 1 ? "Cumple años mañana" : `Cumple años en ${pc.dias} días`,
          detalle: `Su cumpleaños es el ${fechaLarga(pc.fecha)}.`,
          fecha: pc.fecha,
          dias: pc.dias,
          polizaRamo: null,
        });
      }
    }
    // Lo demás es comercial: primero lo que debe.
    if (e.conAdeudo) continue;

    let pagoReciente = false;
    for (const p of e.polizas) {
      if (!p.vigente) continue;
      if (p.renovacion) {
        const d = diasEntre(hoy, p.renovacion);
        if (d >= REVISION_DESDE && d <= REVISION_HASTA) {
          const que = p.ramo ? seguroDe(p.ramo).replace(/^tu /, "su ") : "una de sus pólizas";
          nuevo({
            clave: `revision:${p.numero}:${p.renovacion}`,
            tipo: "revision",
            mensaje: "revision",
            titulo: `${que.charAt(0).toUpperCase()}${que.slice(1)} renueva en ${d} días`,
            detalle: `Renueva el ${fechaLarga(p.renovacion)}: buen momento para revisar sus coberturas.`,
            fecha: p.renovacion,
            dias: d,
            polizaRamo: p.ramo,
          });
        }
      }
      if (p.ultimo_pago) {
        const d = diasEntre(p.ultimo_pago, hoy);
        if (d >= 0 && d <= DIAS_PAGO) {
          pagoReciente = true;
          nuevo({
            clave: `pago:${p.numero}:${p.ultimo_pago}`,
            tipo: "pago",
            mensaje: "pago",
            titulo: d === 0 ? "Pagó hoy" : `Pagó hace ${d} ${d === 1 ? "día" : "días"}`,
            detalle: "Un buen momento para agradecerle.",
            fecha: p.renovacion,
            dias: d,
            polizaRamo: p.ramo,
          });
        }
      }
    }

    // Referidos: cuando acaba de pagar o de contratar, y no se los hemos pedido en los últimos 90 días.
    const ventaReciente = e.estados.some((x) => x.estado === "cerrada" && diasEntre(fechaLocal(x.actualizado_en), hoy) <= DIAS_VENTA_RECIENTE);
    const pedidos = c.referidos_pedidos_en ? diasEntre(fechaLocal(c.referidos_pedidos_en), hoy) : null;
    if ((pagoReciente || ventaReciente) && (pedidos === null || pedidos >= DIAS_ENTRE_REFERIDOS)) {
      nuevo({
        clave: `referidos:${hoy.slice(0, 7)}`,
        tipo: "referidos",
        mensaje: "referidos",
        titulo: "Buen momento para pedirle referidos",
        detalle: ventaReciente ? "Acaba de contratar contigo." : "Acaba de pagar su póliza.",
        fecha: null,
        dias: 0,
        polizaRamo: null,
      });
    }
  }
  return salida.sort((a, b) => ORDEN[a.tipo] - ORDEN[b.tipo] || a.dias - b.dias || a.nombre.localeCompare(b.nombre, "es"));
}

/** El WhatsApp de un momento: tu texto si lo personalizaste; si no, el base. */
export function mensajeMomento(m: Momento, personalizadas: Partial<Record<ClaveMensaje, string>> = {}): string {
  return rellenarCruzada(personalizadas[m.mensaje] || PLANTILLAS_CRUZADA[m.mensaje], {
    nombre: m.nombre,
    ramo: m.polizaRamo ?? "vida",
    tipo: "nueva",
    tiene: m.tiene,
    polizaRamo: m.polizaRamo,
    fecha: m.fecha,
  });
}

// ----------------------------------------------------------------------------
// Embudo de venta cruzada
// ----------------------------------------------------------------------------

export type EtapaEmbudo = "identificada" | "contactada" | "cotizada" | "cerrada" | "no_interesa";

export interface ItemEmbudo {
  cliente_id: string;
  nombre: string;
  ramo: Ramo;
  /** Días desde que se le ofreció (o desde que cerró), si aplica. */
  dias: number | null;
}

export interface ColumnaEmbudo {
  id: EtapaEmbudo;
  nombre: string;
  ayuda: string;
  total: number;
  items: ItemEmbudo[];
}

export interface MetricasEmbudo {
  /** Pólizas vigentes por cada cliente activo. */
  polizasPorCliente: number;
  /** % de clientes activos con 2 o más tipos de seguro. */
  clientesMultiramo: number;
  /** Prima anual promedio por cliente, solo con las pólizas de Valeri que traen prima (null si ninguna). */
  primaPorCliente: number | null;
  /** Ofertas hechas y ventas cerradas en los últimos 90 días. */
  ofertas90: number;
  cerradas90: number;
  /** % de ofertas que se cerraron (null si no hay ofertas). */
  conversion90: number | null;
  cerradasPorRamo: Record<Ramo, number>;
}

export interface Embudo {
  columnas: ColumnaEmbudo[];
  metricas: MetricasEmbudo;
}

const VENTANA = 90;
/** Cuántas tarjetas se muestran por columna. */
export const ITEMS_POR_COLUMNA = 12;

export function calcularEmbudo(entradas: EntradaCliente[], r: ResultadoOportunidades, estados: EstadoCruzada[], hoy: string): Embudo {
  const nombreDe = new Map(entradas.map((e) => [e.cliente.id, e.cliente.nombre]));
  const item = (o: { cliente_id: string; nombre: string; ramo: Ramo }, dias: number | null): ItemEmbudo => ({
    cliente_id: o.cliente_id,
    nombre: o.nombre,
    ramo: o.ramo,
    dias,
  });
  const hace = (iso: string) => diasEntre(fechaLocal(iso), hoy);

  const identificadas = r.lista.filter((o) => o.situacion === "para_hoy");
  const contactadas = r.lista.filter((o) => o.situacion === "esperando" || o.situacion === "seguimiento");
  const cotizadas = r.lista.filter((o) => o.situacion === "cotizada");
  const cerradas = estados.filter((x) => x.estado === "cerrada" && hace(x.actualizado_en) <= VENTANA).sort((a, b) => b.actualizado_en.localeCompare(a.actualizado_en));
  const descartadas = estados.filter((x) => x.estado === "no_interesa").sort((a, b) => b.actualizado_en.localeCompare(a.actualizado_en));
  const deEstado = (x: EstadoCruzada) => item({ cliente_id: x.cliente_id, nombre: nombreDe.get(x.cliente_id) ?? "Cliente", ramo: x.ramo }, hace(x.actualizado_en));

  const columnas: ColumnaEmbudo[] = [
    { id: "identificada", nombre: "Identificadas", ayuda: "Oportunidades que Camila ve y aún no ofreces", total: identificadas.length, items: identificadas.slice(0, ITEMS_POR_COLUMNA).map((o) => item(o, null)) },
    { id: "contactada", nombre: "Contactadas", ayuda: "Ya se lo ofreciste; esperando respuesta", total: contactadas.length, items: contactadas.slice(0, ITEMS_POR_COLUMNA).map((o) => item(o, o.diasDesdeOferta)) },
    { id: "cotizada", nombre: "Cotizadas", ayuda: "Ya tienen una cotización tuya", total: cotizadas.length, items: cotizadas.slice(0, ITEMS_POR_COLUMNA).map((o) => item(o, o.diasDesdeOferta)) },
    { id: "cerrada", nombre: "Cerradas (90 días)", ayuda: "Lo contrataron", total: cerradas.length, items: cerradas.slice(0, ITEMS_POR_COLUMNA).map(deEstado) },
    { id: "no_interesa", nombre: "No les interesa", ayuda: "Camila no se los vuelve a sugerir por un tiempo", total: descartadas.length, items: descartadas.slice(0, ITEMS_POR_COLUMNA).map(deEstado) },
  ];

  const activos = entradas.filter((e) => esActivo(e.polizas));
  const vigentes = activos.reduce((s, e) => s + e.polizas.filter((p) => p.vigente).length, 0);
  const multi = activos.filter((e) => ramosVigentes(e.polizas).length >= 2).length;
  const primas = activos
    .map((e) => e.polizas.filter((p) => p.vigente && p.fuente === "cobranza").reduce((s, p) => s + p.prima, 0))
    .filter((x) => x > 0);
  const ofertas90 = estados.filter((x) => x.ofrecida_en && hace(x.ofrecida_en) <= VENTANA).length;
  const cerradasPorRamo = Object.fromEntries(RAMOS.map((x) => [x.id, 0])) as Record<Ramo, number>;
  for (const x of cerradas) cerradasPorRamo[x.ramo]++;

  return {
    columnas,
    metricas: {
      polizasPorCliente: activos.length ? Math.round((vigentes / activos.length) * 100) / 100 : 0,
      clientesMultiramo: activos.length ? Math.round((multi / activos.length) * 100) : 0,
      primaPorCliente: primas.length ? Math.round(primas.reduce((s, x) => s + x, 0) / primas.length) : null,
      ofertas90,
      cerradas90: cerradas.length,
      conversion90: Math.max(ofertas90, cerradas.length) > 0 ? Math.round((cerradas.length / Math.max(ofertas90, cerradas.length)) * 100) : null,
      cerradasPorRamo,
    },
  };
}
