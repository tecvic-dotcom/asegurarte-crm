/**
 * Reportes de Clara — puros (cliente y servidor), sin IA y sin costo.
 *
 * Analogía: la secretaria que cada lunes te deja en el escritorio una hoja con
 * cómo cerró la semana, y cada día 1 el cierre del mes. Lee los mismos datos
 * que el Panel, Valeri y Crecimiento; no inventa nada y compara parejo
 * (una semana contra la anterior; si va en curso, contra los mismos días).
 */
import { moneda } from "./crm-data";
import { RAMOS, infoRamo } from "./ramos";
import { estadoDe, DIAS_RENOVACION } from "./cobranza-reglas";
import { crecimiento } from "./crecimiento-reglas";
import { resumenAdjuntas } from "./adjuntas-reglas";
import {
  capitalizar,
  diasEntre,
  diasIncluidos,
  diasTraslape,
  enRango,
  fechaCorta,
  fechaLocal,
  mesAnterior,
  mesCorto,
  minFecha,
  nombreMes,
  primeroDeMes,
  sumarDias,
  sumarMeses,
  ultimoDeMes,
} from "./fechas";
import type {
  CifraReporte,
  Lead,
  ManagerConfig,
  Movimiento,
  Poliza,
  PolizaAdjunta,
  ProduccionMes,
  Ramo,
  ReporteClara,
  SeccionReporte,
  TipoMovimiento,
  TipoReporte,
} from "./types";

interface Rango {
  desde: string;
  hasta: string;
}

export interface PeriodoReporte extends Rango {
  tipo: TipoReporte;
  antDesde: string;
  antHasta: string;
  /** Último día del periodo completo (domingo o fin de mes). */
  fin: string;
  enCurso: boolean;
  titulo: string;
  comparadoCon: string;
  anterior: string;
  siguiente: string | null;
}

/** Lo que Clara necesita para escribir un reporte. */
export interface DatosReporte {
  hoy: string;
  leads: Lead[];
  /** Al menos desde el inicio del periodo anterior hasta el final del pedido. */
  movimientos: Movimiento[];
  /** null = la tabla de cobranza aún no existe. */
  polizas: Poliza[] | null;
  /** null = la tabla de producción aún no existe. */
  produccion: ProduccionMes[] | null;
  /** null = la tabla de pólizas adjuntas aún no existe. */
  adjuntas: PolizaAdjunta[] | null;
  config: ManagerConfig;
  cloud: boolean;
}

// ----------------------------------------------------------------------------
// Periodos
// ----------------------------------------------------------------------------

/** Primer día del trimestre (ene, abr, jul u oct) de una fecha. */
function inicioTrimestre(f: string): string {
  const m = Number(f.slice(5, 7));
  return `${f.slice(0, 4)}-${String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, "0")}-01`;
}

function finTrimestre(desde: string): string {
  return ultimoDeMes(sumarMeses(desde, 2));
}

/** "T4 2026" */
function etiquetaTrimestre(desde: string): string {
  return `T${Math.floor((Number(desde.slice(5, 7)) - 1) / 3) + 1} ${desde.slice(0, 4)}`;
}

/**
 * El periodo de un reporte. Sin fecha: el último mes (o trimestre) YA CERRADO.
 * Si el periodo va en curso, se compara contra los mismos días del anterior.
 */
export function periodoReporte(tipo: TipoReporte, fecha: string | null, hoy: string): PeriodoReporte {
  if (tipo === "trimestre") {
    const actual = inicioTrimestre(hoy);
    let desde = fecha ? inicioTrimestre(fecha) : sumarMeses(actual, -3);
    if (desde > actual) desde = actual;
    const fin = finTrimestre(desde);
    const enCurso = fin >= hoy;
    const hasta = enCurso ? hoy : fin;
    const antDesde = sumarMeses(desde, -3);
    const finAnt = finTrimestre(antDesde);
    const antHasta = enCurso ? minFecha(sumarDias(antDesde, diasIncluidos(desde, hasta) - 1), finAnt) : finAnt;
    const etAnt = etiquetaTrimestre(antDesde);
    return {
      tipo,
      desde,
      hasta,
      fin,
      antDesde,
      antHasta,
      enCurso,
      titulo: `${etiquetaTrimestre(desde)} · ${mesCorto(desde)}–${mesCorto(fin)}`,
      comparadoCon: hasta < fin ? `${etAnt} (primeros ${diasIncluidos(antDesde, antHasta)} días)` : etAnt,
      anterior: antDesde,
      siguiente: desde < actual ? sumarMeses(desde, 3) : null,
    };
  }

  const actual = primeroDeMes(hoy);
  let desde = fecha ? primeroDeMes(fecha) : mesAnterior(hoy);
  if (desde > actual) desde = actual;
  const fin = ultimoDeMes(desde);
  const enCurso = fin >= hoy;
  const hasta = enCurso ? hoy : fin;
  const antDesde = mesAnterior(desde);
  const antHasta = enCurso
    ? minFecha(sumarDias(antDesde, diasIncluidos(desde, hasta) - 1), ultimoDeMes(antDesde))
    : ultimoDeMes(antDesde);
  return {
    tipo,
    desde,
    hasta,
    fin,
    antDesde,
    antHasta,
    enCurso,
    titulo: `${capitalizar(nombreMes(desde))} ${desde.slice(0, 4)}`,
    comparadoCon: hasta < fin ? `${nombreMes(antDesde)} (1–${diasIncluidos(antDesde, antHasta)})` : nombreMes(antDesde),
    anterior: antDesde,
    siguiente: desde < actual ? sumarMeses(desde, 1) : null,
  };
}

// ----------------------------------------------------------------------------
// Ayudantes
// ----------------------------------------------------------------------------

function plural(n: number, uno: string, varios: string): string {
  return n === 1 ? uno : varios;
}

/** "GMM" · "GMM y Vida" · "GMM, Vida y Autos" */
function unir(nombres: string[]): string {
  return nombres.length <= 1 ? (nombres[0] ?? "") : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

function ganadasEn(leads: Lead[], r: Rango): Lead[] {
  return leads.filter((l) => l.etapa === "ganado" && l.cerrado_en !== null && enRango(fechaLocal(l.cerrado_en), r));
}

function nuevosEn(leads: Lead[], r: Rango): Lead[] {
  return leads.filter((l) => enRango(fechaLocal(l.creado_en), r));
}

function suma(movs: Movimiento[], tipo: TipoMovimiento, r: Rango): number {
  let s = 0;
  for (const m of movs) if (m.tipo === tipo && enRango(m.fecha, r)) s += m.monto;
  return Math.round(s * 100) / 100;
}

/** "GMM 2 · Vida 1 · sin ramo 1" */
function porRamo(ls: { ramo: Ramo | null }[]): string {
  const partes = RAMOS.map((r) => [r.corto, ls.filter((l) => l.ramo === r.id).length] as const)
    .filter(([, n]) => n > 0)
    .map(([nombre, n]) => `${nombre} ${n}`);
  const sinRamo = ls.filter((l) => !l.ramo).length;
  if (sinRamo) partes.push(`sin ramo ${sinRamo}`);
  return partes.join(" · ");
}

/** Lo más grande primero: "Publicidad $3,000 · Gasolina $1,200". */
function topCategorias(movs: Movimiento[], tipo: TipoMovimiento, r: Rango, maximo = 3): { categoria: string; monto: number }[] {
  const mapa = new Map<string, number>();
  for (const m of movs) if (m.tipo === tipo && enRango(m.fecha, r)) mapa.set(m.categoria, (mapa.get(m.categoria) ?? 0) + m.monto);
  return [...mapa]
    .map(([categoria, monto]) => ({ categoria, monto: Math.round(monto) }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, maximo);
}

/** "▲ +2 vs la semana anterior" · "▼ 12% vs agosto" · "= igual que agosto". */
function cambio(act: number, ant: number, formato: "numero" | "moneda", contra: string): string {
  if (act === ant) return `= igual que ${contra}`;
  const flecha = act > ant ? "▲" : "▼";
  // Con base en cero o negativa, un porcentaje confunde: mejor la diferencia.
  if (formato === "numero" || ant <= 0) {
    const diff = Math.abs(act - ant);
    return `${flecha} ${act > ant ? "+" : "−"}${formato === "moneda" ? moneda(diff) : diff} vs ${contra}`;
  }
  return `${flecha} ${Math.round((Math.abs(act - ant) / ant) * 100)}% vs ${contra}`;
}

function tono(act: number, ant: number, subirEsBueno = true): CifraReporte["tono"] {
  if (act === ant) return "neutral";
  return act > ant === subirEsBueno ? "bien" : "mal";
}

function pctTexto(p: number | null): string {
  return p === null ? "sin base para comparar" : `${p >= 0 ? "▲" : "▼"} ${Math.abs(p).toLocaleString("es-MX")}%`;
}

/** Cuántas pólizas (todos los ramos) pide tu meta en un rango. */
function ritmoMeta(config: ManagerConfig, r: Rango): number {
  const meta = { desde: config.meta_inicio, hasta: config.meta_fin };
  return (config.meta_por_ramo * RAMOS.length * diasTraslape(r, meta)) / diasIncluidos(meta.desde, meta.hasta);
}

/** Avance de tu meta de 90 días al cierre del periodo. */
function avanceMeta(d: DatosReporte, corte: string) {
  const { meta_inicio: inicio, meta_fin: fin, meta_por_ramo: porRamoMeta } = d.config;
  if (corte < inicio) return null;
  const hasta = minFecha(corte, fin);
  const ganadas = ganadasEn(d.leads, { desde: inicio, hasta });
  const ritmoRamo = (porRamoMeta * diasIncluidos(inicio, hasta)) / diasIncluidos(inicio, fin);
  const ramos = RAMOS.map((r) => {
    const cerradas = ganadas.filter((l) => l.ramo === r.id).length;
    return { nombre: r.corto, cerradas, atraso: ritmoRamo - cerradas };
  });
  const mayor = Math.max(...ramos.map((r) => r.atraso));
  return {
    hasta,
    terminada: corte > fin,
    cerradas: ganadas.length,
    total: porRamoMeta * RAMOS.length,
    ritmo: ritmoRamo * RAMOS.length,
    dia: diasIncluidos(inicio, hasta),
    dias: diasIncluidos(inicio, fin),
    atrasados: mayor >= 1 ? ramos.filter((r) => mayor - r.atraso < 0.05) : [],
    sinRamo: ganadas.filter((l) => !l.ramo).length,
  };
}

/** Producción (MN) de uno o varios meses ('AAAA-MM'), total o de un ramo. */
function produccionMeses(filas: ProduccionMes[], meses: string[], ramo: Ramo | null) {
  let prima = 0;
  let comision = 0;
  let pagos = 0;
  let ultimoDia: string | null = null;
  for (const f of filas) {
    if (f.moneda !== "MN" || !meses.includes(f.mes) || (ramo && f.ramo !== ramo)) continue;
    prima += f.prima;
    comision += f.comision;
    pagos += f.pagos;
    if (f.ultimo_dia && (!ultimoDia || f.ultimo_dia > ultimoDia)) ultimoDia = f.ultimo_dia;
  }
  return { prima: Math.round(prima), comision: Math.round(comision), pagos, ultimoDia, hay: pagos > 0 || prima !== 0 };
}

/** Prima de enero hasta un mes (MN). */
function primaAcumulada(filas: ProduccionMes[], anio: number, hastaMes: number): number {
  let s = 0;
  for (const f of filas) {
    if (f.moneda === "MN" && Number(f.mes.slice(0, 4)) === anio && Number(f.mes.slice(5, 7)) <= hastaMes) s += f.prima;
  }
  return Math.round(s);
}

/** Un ramo que cae este % o más contra el mismo mes del año pasado se vuelve foco. */
const CAIDA_RELEVANTE = -10;

// ----------------------------------------------------------------------------
// El reporte
// ----------------------------------------------------------------------------

export function armarReporte(tipo: TipoReporte, fecha: string | null, d: DatosReporte): ReporteClara {
  const p = periodoReporte(tipo, fecha, d.hoy);
  const act: Rango = { desde: p.desde, hasta: p.hasta };
  const ant: Rango = { desde: p.antDesde, hasta: p.antHasta };
  const contra = p.comparadoCon;
  const esTrim = tipo === "trimestre";
  const nombrePeriodo = esTrim ? "este trimestre" : "este mes";
  const secciones: SeccionReporte[] = [];
  const avisos: string[] = [];

  // ---------- Ventas y meta ----------
  const ganadas = ganadasEn(d.leads, act);
  const ganadasAnt = ganadasEn(d.leads, ant);
  const ritmo = ritmoMeta(d.config, act);
  const meta = avanceMeta(d, p.hasta);
  const ventas: string[] = [];
  ventas.push(
    ganadas.length
      ? `Cerraste ${ganadas.length} ${plural(ganadas.length, "póliza", "pólizas")}: ${porRamo(ganadas)}.`
      : `No cerraste pólizas en ${nombrePeriodo}.`,
  );
  if (ritmo >= 0.5) {
    const r = Math.round(ritmo);
    ventas.push(`Tu meta pedía ${r > 1 ? `unas ${r} pólizas` : "1 póliza"} en este periodo.`);
  }
  if (meta) {
    if (meta.terminada) {
      ventas.push(`Tu meta ya cerró el ${fechaCorta(d.config.meta_fin)}: lograste ${meta.cerradas} de ${meta.total} pólizas.`);
    } else {
      ventas.push(
        `Meta de ${meta.dias} días: llevas ${meta.cerradas} de ${meta.total} al ${fechaCorta(meta.hasta)} (día ${meta.dia}; el ritmo pedía ${Math.round(meta.ritmo)}).`,
      );
      if (meta.atrasados.length === RAMOS.length) ventas.push("Todos los ramos van abajo del ritmo.");
      else if (meta.atrasados.length) {
        ventas.push(`${plural(meta.atrasados.length, "Ramo más atrasado", "Ramos más atrasados")}: ${unir(meta.atrasados.map((r) => r.nombre))}.`);
      }
    }
    if (meta.sinRamo) ventas.push(`${meta.sinRamo} ${plural(meta.sinRamo, "póliza ganada no tiene", "pólizas ganadas no tienen")} ramo: no cuentan por ramo.`);
  } else {
    ventas.push(`Tu meta arranca el ${fechaCorta(d.config.meta_inicio)}.`);
  }
  secciones.push({ id: "ventas", titulo: "Ventas y meta", icono: "flat-color-icons:approval", lineas: ventas });

  // ---------- Prospectos ----------
  const nuevos = nuevosEn(d.leads, act);
  const nuevosAnt = nuevosEn(d.leads, ant);
  const origenes = new Map<string, number>();
  for (const l of nuevos) origenes.set(l.origen || "Sin origen", (origenes.get(l.origen || "Sin origen") ?? 0) + 1);
  const activos = d.leads.filter((l) => l.etapa !== "ganado" && l.etapa !== "perdido");
  const enPropuesta = activos.filter((l) => l.etapa === "propuesta");
  const sinContacto = activos.filter((l) => diasEntre(fechaLocal(l.actualizado_en), d.hoy) >= 3);
  const prospectos: string[] = [
    nuevos.length
      ? `Entraron ${nuevos.length} ${plural(nuevos.length, "prospecto nuevo", "prospectos nuevos")} (${cambio(nuevos.length, nuevosAnt.length, "numero", contra)}).`
      : `No entraron prospectos nuevos (${contra}: ${nuevosAnt.length}).`,
  ];
  if (origenes.size) {
    prospectos.push(
      `De dónde llegaron: ${[...origenes]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([o, n]) => `${o} ${n}`)
        .join(" · ")}.`,
    );
  }
  prospectos.push(
    `Hoy tienes ${activos.length} ${plural(activos.length, "prospecto activo", "prospectos activos")}` +
      (enPropuesta.length ? `; ${enPropuesta.length} en propuesta (${moneda(enPropuesta.reduce((s, l) => s + l.valor, 0))})` : "") +
      (sinContacto.length ? `; ${sinContacto.length} llevan 3+ días sin seguimiento` : "") +
      ".",
  );
  secciones.push({ id: "prospectos", titulo: "Prospectos", icono: "flat-color-icons:businessman", lineas: prospectos });

  // ---------- Dinero ----------
  const entro = suma(d.movimientos, "ingreso", act);
  const salio = suma(d.movimientos, "gasto", act);
  const quedo = Math.round((entro - salio) * 100) / 100;
  const entroAnt = suma(d.movimientos, "ingreso", ant);
  const salioAnt = suma(d.movimientos, "gasto", ant);
  const quedoAnt = Math.round((entroAnt - salioAnt) * 100) / 100;
  const movsPeriodo = d.movimientos.filter((m) => enRango(m.fecha, act));
  const dinero: string[] = [];
  if (!movsPeriodo.length) {
    dinero.push(`No registraste comisiones ni gastos en este periodo (sin registrar no es cero).`);
  } else {
    dinero.push(`Entró ${moneda(entro)} (${cambio(entro, entroAnt, "moneda", contra)}).`);
    dinero.push(`Salió ${moneda(salio)} (${cambio(salio, salioAnt, "moneda", contra)}).`);
    dinero.push(`${quedo >= 0 ? "Te quedó" : "Perdiste"} ${moneda(Math.abs(quedo))}.`);
    const ingresosRamo = RAMOS.map((r) => [r.corto, suma(d.movimientos.filter((m) => m.ramo === r.id), "ingreso", act)] as const).filter(
      ([, v]) => v > 0,
    );
    if (ingresosRamo.length) dinero.push(`Comisiones por ramo: ${ingresosRamo.map(([n, v]) => `${n} ${moneda(v)}`).join(" · ")}.`);
    const gastos = topCategorias(d.movimientos, "gasto", act);
    if (gastos.length) dinero.push(`En qué se fue: ${gastos.map((g) => `${g.categoria} ${moneda(g.monto)}`).join(" · ")}.`);
    const porConfirmar = movsPeriodo.filter((m) => m.estado === "por_confirmar").length;
    if (porConfirmar) dinero.push(`${porConfirmar} ${plural(porConfirmar, "movimiento sigue", "movimientos siguen")} “por confirmar”.`);
  }
  secciones.push({ id: "dinero", titulo: "Dinero", icono: "flat-color-icons:money-transfer", lineas: dinero });

  // ---------- Cobranza (Valeri) ----------
  let vencidasN = 0;
  let vencidasMonto = 0;
  let porVencerN = 0;
  let porVencerMonto = 0;
  let sinWhatsapp = 0;
  if (d.polizas) {
    const activas = d.polizas.filter((x) => x.estatus_manual !== "cancelada");
    const cobranza: string[] = [];
    if (!activas.length) {
      cobranza.push("Tu cartera está vacía: agrega tus pólizas en Valeri para ver aquí tu cobranza.");
    } else {
      const cobros = d.polizas.filter((x) => x.ultimo_pago && enRango(x.ultimo_pago, act));
      cobranza.push(
        cobros.length
          ? `Cobros registrados: ${cobros.length} (${moneda(cobros.reduce((s, x) => s + x.monto_pago, 0))}), marcados como “Pagó” en Valeri.`
          : "No marcaste cobros como “Pagó” en Valeri en este periodo.",
      );
      const vencidas = activas.filter((x) => {
        const e = estadoDe(x, d.hoy).estado;
        return e === "vencida" || e === "promesa_vencida";
      });
      vencidasN = vencidas.length;
      vencidasMonto = Math.round(vencidas.reduce((s, x) => s + x.monto_pago, 0));
      const promesas = activas.filter((x) => estadoDe(x, d.hoy).estado === "promesa").length;
      cobranza.push(
        `Hoy: ${vencidasN} ${plural(vencidasN, "vencida", "vencidas")}${vencidasMonto ? ` (${moneda(vencidasMonto)} en riesgo)` : ""}` +
          (promesas ? ` · ${promesas} ${plural(promesas, "promesa", "promesas")} de pago` : "") +
          ".",
      );
      const ventana = 30;
      const limite = sumarDias(d.hoy, ventana - 1);
      const vencen = activas
        .filter((x) => x.estatus_manual !== "promesa" && x.fecha_limite_pago && x.fecha_limite_pago >= d.hoy && x.fecha_limite_pago <= limite)
        .sort((a, b) => (a.fecha_limite_pago ?? "").localeCompare(b.fecha_limite_pago ?? ""));
      porVencerN = vencen.length;
      porVencerMonto = Math.round(vencen.reduce((s, x) => s + x.monto_pago, 0));
      cobranza.push(
        porVencerN
          ? `Vencen en los próximos ${ventana} días: ${porVencerN} (${moneda(porVencerMonto)}).`
          : `Nadie vence en los próximos ${ventana} días.`,
      );
      const renuevan = activas.filter((x) => {
        if (!x.renovacion) return false;
        const r = diasEntre(d.hoy, x.renovacion);
        return r >= 0 && r <= DIAS_RENOVACION;
      }).length;
      if (renuevan) cobranza.push(`${renuevan} ${plural(renuevan, "renueva", "renuevan")} en los próximos ${DIAS_RENOVACION} días.`);
      sinWhatsapp = activas.filter((x) => x.whatsapp.length !== 10).length;
      if (sinWhatsapp) cobranza.push(`A ${sinWhatsapp} ${plural(sinWhatsapp, "póliza le falta", "pólizas les falta")} el WhatsApp.`);
    }
    secciones.push({ id: "cobranza", titulo: "Cobranza (Valeri)", icono: "flat-color-icons:debt", lineas: cobranza });
  } else {
    avisos.push("La cobranza de Valeri aún no está encendida: este reporte no la incluye.");
  }

  // ---------- Producción de la aseguradora (solo en el mensual) ----------
  let prod: ReturnType<typeof produccionMeses> | null = null;
  let prodAnt: ReturnType<typeof produccionMeses> | null = null;
  let caidaRamo: { nombre: string; pct: number } | null = null;
  /** El mes cargado va incompleto: compararlo contra un mes completo engaña. */
  let prodParcial = false;
  const anio = Number(p.desde.slice(0, 4));
  const mesNum = Number(p.desde.slice(5, 7));
  const mesesPeriodo = esTrim ? [0, 1, 2].map((k) => sumarMeses(p.desde, k).slice(0, 7)) : [p.desde.slice(0, 7)];
  const mesesAnt = mesesPeriodo.map((m) => `${anio - 1}${m.slice(4)}`);
  const etMesAnt = esTrim ? `${etiquetaTrimestre(p.desde).slice(0, 2)} ${anio - 1}` : `${mesCorto(p.desde)} ${anio - 1}`;
  const nombrePeriodoProd = esTrim ? etiquetaTrimestre(p.desde) : nombreMes(p.desde);
  if (d.produccion) {
    const lineas: string[] = [];
    prod = produccionMeses(d.produccion, mesesPeriodo, null);
    prodAnt = produccionMeses(d.produccion, mesesAnt, null);
    if (!prod.hay) {
      lineas.push(`Aún no está cargado el reporte de prima pagada de ${nombrePeriodoProd}.`);
      prod = null;
    } else {
      prodParcial = p.enCurso || (prod.ultimoDia !== null && prod.ultimoDia < sumarDias(p.fin, -3));
      const contraAnt = (act: number, ant: number) => (prodParcial ? "" : ` (${pctTexto(crecimiento(act, ant))} vs ${etMesAnt})`);
      if (prodParcial) {
        lineas.push(`${esTrim ? "El trimestre va" : "El mes va"} incompleto (cargado al ${fechaCorta(prod.ultimoDia ?? p.hasta)}): se compara contra ${etMesAnt} cuando cierre.`);
      }
      lineas.push(`Prima pagada: ${moneda(prod.prima)}${prodParcial ? "" : ` (${pctTexto(crecimiento(prod.prima, prodAnt.prima))} vs ${etMesAnt}: ${moneda(prodAnt.prima)})`}.`);
      lineas.push(`Comisión: ${moneda(prod.comision)}${contraAnt(prod.comision, prodAnt.comision)}.`);
      lineas.push(`Pagos aplicados: ${prod.pagos.toLocaleString("es-MX")}${prodParcial ? "" : ` (${etMesAnt}: ${prodAnt.pagos.toLocaleString("es-MX")})`}.`);
      for (const r of RAMOS) {
        const x = produccionMeses(d.produccion, mesesPeriodo, r.id);
        const y = produccionMeses(d.produccion, mesesAnt, r.id);
        if (!x.hay && !y.hay) continue;
        const pct = prodParcial ? null : crecimiento(x.prima, y.prima);
        lineas.push(`→ ${infoRamo(r.id).corto}: ${moneda(x.prima)}${prodParcial ? "" : ` (${pctTexto(pct)})`}.`);
        if (pct !== null && pct <= CAIDA_RELEVANTE && (!caidaRamo || pct < caidaRamo.pct)) caidaRamo = { nombre: r.corto, pct };
      }
      // El acumulado del año se compara parejo: si este mes va incompleto, hasta el mes anterior.
      const mesTope = esTrim ? (prod.ultimoDia ? Number(prod.ultimoDia.slice(5, 7)) : Number(p.hasta.slice(5, 7))) : mesNum;
      const hastaMes = prodParcial ? mesTope - 1 : esTrim ? Number(p.fin.slice(5, 7)) : mesNum;
      if (hastaMes >= 1) {
        const acum = primaAcumulada(d.produccion, anio, hastaMes);
        const acumAnt = primaAcumulada(d.produccion, anio - 1, hastaMes);
        const etHasta = mesCorto(`${anio}-${String(hastaMes).padStart(2, "0")}-01`);
        const rango = hastaMes === 1 ? "enero" : `ene–${etHasta}`;
        lineas.push(`En el año (${rango}): ${moneda(acum)} (${pctTexto(crecimiento(acum, acumAnt))} vs ${rango} ${anio - 1}).`);
      }
    }
    secciones.push({ id: "produccion", titulo: "Producción de la aseguradora", icono: "flat-color-icons:line-chart", lineas });
  }

  // ---------- Pólizas nuevas y renovaciones adjuntas (prima neta por inicio de vigencia) ----------
  if (d.adjuntas && d.adjuntas.length) {
    const lineas: string[] = [];
    const tot = resumenAdjuntas(d.adjuntas, act.desde, act.hasta, null);
    const totAnt = resumenAdjuntas(d.adjuntas, ant.desde, ant.hasta, null);
    if (!tot.nuevas && !tot.renovaciones) {
      lineas.push(`No hay pólizas nuevas ni renovaciones adjuntas que empiecen en ${nombrePeriodo}.`);
    } else {
      lineas.push(
        `Prima neta nueva: ${moneda(tot.primaNueva)} en ${tot.nuevas} ${plural(tot.nuevas, "póliza nueva", "pólizas nuevas")} (${cambio(tot.primaNueva, totAnt.primaNueva, "moneda", contra)}).`,
      );
      lineas.push(
        `Prima neta renovada: ${moneda(tot.primaRenovacion)} en ${tot.renovaciones} ${plural(tot.renovaciones, "renovación", "renovaciones")}.`,
      );
      for (const r of RAMOS) {
        const x = resumenAdjuntas(d.adjuntas, act.desde, act.hasta, r.id);
        if (!x.nuevas && !x.renovaciones) continue;
        lineas.push(
          `→ ${r.corto}: ${moneda(x.primaNueva)} nueva (${x.nuevas}) · ${moneda(x.primaRenovacion)} renovada (${x.renovaciones})${r.id === "gmm" && x.aseguradosNuevos ? ` · ${x.aseguradosNuevos} ${plural(x.aseguradosNuevos, "asegurado nuevo", "asegurados nuevos")}` : ""}.`,
        );
      }
    }
    secciones.push({ id: "polizas", titulo: "Pólizas nuevas y renovaciones", icono: "flat-color-icons:file", lineas });
  }

  // ---------- Focos: lo primero que hay que hacer (máximo 3) ----------
  const candidatos: string[] = [];
  if (vencidasN) candidatos.push(`Cobra ${vencidasN} ${plural(vencidasN, "póliza vencida", "pólizas vencidas")}${vencidasMonto ? ` (${moneda(vencidasMonto)})` : ""}: Valeri te deja el WhatsApp listo.`);
  if (meta && !meta.terminada && meta.atrasados.length) {
    candidatos.push(
      meta.atrasados.length === RAMOS.length
        ? `Cierra ventas: tu meta va ${Math.max(1, Math.round(meta.ritmo) - meta.cerradas)} pólizas abajo del ritmo.`
        : `Empuja ${unir(meta.atrasados.map((r) => r.nombre))}: ${plural(meta.atrasados.length, "es el ramo", "son los ramos")} que más se ${plural(meta.atrasados.length, "atrasa", "atrasan")} en tu meta.`,
    );
  }
  if (d.produccion && !prod) candidatos.push(`Carga el reporte de prima pagada de ${nombrePeriodoProd} para ver tu crecimiento.`);
  if (caidaRamo) candidatos.push(`${caidaRamo.nombre} bajó ${Math.abs(caidaRamo.pct).toLocaleString("es-MX")}% vs ${etMesAnt}: revisa sus renovaciones y su cobranza.`);
  if (porVencerN) candidatos.push(`${plural(porVencerN, "Recuérdale", "Recuérdales")} a ${porVencerN} ${plural(porVencerN, "cliente que vence", "clientes que vencen")} ${nombrePeriodo} (${moneda(porVencerMonto)}).`);
  if (sinContacto.length) candidatos.push(`Dale seguimiento a ${sinContacto.length} ${plural(sinContacto.length, "prospecto que lleva", "prospectos que llevan")} 3+ días sin contacto.`);
  if (!nuevos.length) candidatos.push("No entraron prospectos nuevos: activa una campaña o pide referidos a tus clientes.");
  if (meta?.sinRamo) candidatos.push(`Ponle ramo a ${meta.sinRamo} ${plural(meta.sinRamo, "póliza ganada", "pólizas ganadas")} para que cuenten en tu meta.`);
  if (movsPeriodo.length && quedo < 0) candidatos.push("Gastaste más de lo que entró: revisa en qué se te fue en el Panel.");
  if (sinWhatsapp) candidatos.push(`Agrega el WhatsApp de ${sinWhatsapp} ${plural(sinWhatsapp, "póliza", "pólizas")} para que Valeri pueda ${plural(sinWhatsapp, "escribirle", "escribirles")}.`);
  const focos = candidatos.length ? candidatos.slice(0, 3) : ["Sigue así: vas en ritmo y sin pendientes urgentes."];

  // ---------- Cifras grandes ----------
  const cifras: CifraReporte[] = [
    {
      titulo: "Pólizas cerradas",
      valor: String(ganadas.length),
      detalle: ritmo >= 0.5 ? `tu meta pedía ${Math.round(ritmo)}` : "fuera de las fechas de tu meta",
      cambio: cambio(ganadas.length, ganadasAnt.length, "numero", contra),
      tono: ritmo >= 0.5 ? (ganadas.length >= Math.floor(ritmo) ? "bien" : "mal") : tono(ganadas.length, ganadasAnt.length),
    },
    {
      titulo: "Prospectos nuevos",
      valor: String(nuevos.length),
      detalle: "llegaron a tu CRM",
      cambio: cambio(nuevos.length, nuevosAnt.length, "numero", contra),
      tono: tono(nuevos.length, nuevosAnt.length),
    },
    {
      titulo: "Lo que te quedó",
      valor: movsPeriodo.length ? moneda(quedo) : "Sin registrar",
      detalle: movsPeriodo.length ? `entró ${moneda(entro)} · salió ${moneda(salio)}` : "registra comisiones y gastos",
      cambio: movsPeriodo.length ? cambio(quedo, quedoAnt, "moneda", contra) : null,
      tono: movsPeriodo.length ? (quedo < 0 ? "mal" : tono(quedo, quedoAnt)) : "neutral",
    },
  ];
  if (prod && prodAnt) {
    const pct = prodParcial ? null : crecimiento(prod.prima, prodAnt.prima);
    cifras.push({
      titulo: "Prima pagada",
      valor: moneda(prod.prima),
      detalle: prodParcial ? `parcial, al ${fechaCorta(prod.ultimoDia ?? p.hasta)}` : "reporte de tu aseguradora",
      cambio: prodParcial ? null : `${pctTexto(pct)} vs ${etMesAnt}`,
      tono: pct === null ? "neutral" : pct >= 0 ? "bien" : "mal",
    });
  } else {
    cifras.push({
      titulo: "Vencidas hoy",
      valor: d.polizas ? String(vencidasN) : "—",
      detalle: vencidasMonto ? `${moneda(vencidasMonto)} en riesgo` : "cobranza de Valeri",
      cambio: null,
      tono: d.polizas ? (vencidasN ? "mal" : "bien") : "neutral",
    });
  }

  // ---------- La frase ----------
  const partes: string[] = [];
  partes.push(
    `${ganadas.length ? `cerraste ${ganadas.length} ${plural(ganadas.length, "póliza", "pólizas")}` : "no cerraste pólizas"}${ritmo >= 0.5 ? ` (tu meta pedía ${Math.round(ritmo)})` : ""}`,
  );
  partes.push(`${nuevos.length ? `entraron ${nuevos.length}` : "no entraron"} ${plural(nuevos.length, "prospecto nuevo", "prospectos nuevos")}`);
  if (prod && prodAnt && !prodParcial) partes.push(`la prima pagada fue ${moneda(prod.prima)} (${pctTexto(crecimiento(prod.prima, prodAnt.prima))} vs ${etMesAnt})`);
  partes.push(movsPeriodo.length ? `${quedo >= 0 ? "te quedaron" : "perdiste"} ${moneda(Math.abs(quedo))}` : "no registraste comisiones ni gastos");
  const cuando = esTrim ? `En el ${etiquetaTrimestre(p.desde)} (${mesCorto(p.desde)}–${mesCorto(p.fin)})` : `En ${nombreMes(p.desde)}`;
  const frase = `${cuando}${p.enCurso ? ` (va en curso, al ${fechaCorta(p.hasta)})` : ""} ${unir(partes)}. Foco: ${focos[0]}`;

  if (!d.cloud) avisos.push("MODO DEMOSTRACIÓN: números inventados para practicar.");

  return {
    tipo,
    desde: p.desde,
    hasta: p.hasta,
    titulo: p.titulo,
    enCurso: p.enCurso,
    comparadoCon: contra,
    anterior: p.anterior,
    siguiente: p.siguiente,
    frase,
    cifras,
    focos,
    secciones,
    avisos,
    generado_en: new Date().toISOString(),
    cloud: d.cloud,
  };
}

/** Desde qué fecha hacen falta movimientos para un reporte (el periodo anterior). */
export function inicioDatos(tipo: TipoReporte, fecha: string | null, hoy: string): Rango {
  const p = periodoReporte(tipo, fecha, hoy);
  return { desde: p.antDesde, hasta: p.hasta };
}

/** El reporte en texto para pegar en WhatsApp (*negritas* de WhatsApp). */
export function textoReporte(r: ReporteClara): string {
  const t: string[] = [];
  t.push(`*Clara · Reporte ${r.tipo === "trimestre" ? "trimestral" : "mensual"}*`);
  t.push(`${r.titulo}${r.enCurso ? ` (en curso, al ${fechaCorta(r.hasta)})` : ""}`);
  t.push("");
  t.push(r.frase);
  t.push("");
  t.push("*Números*");
  for (const c of r.cifras) t.push(`• ${c.titulo}: ${c.valor}${c.cambio ? ` (${c.cambio})` : ""} — ${c.detalle}`);
  t.push("");
  t.push(`*Focos ${r.tipo === "trimestre" ? "del trimestre" : "del mes"}*`);
  r.focos.forEach((f, i) => t.push(`${i + 1}. ${f}`));
  for (const s of r.secciones) {
    t.push("");
    t.push(`*${s.titulo}*`);
    for (const l of s.lineas) t.push(l.startsWith("→") ? `   ${l}` : `• ${l}`);
  }
  if (r.avisos.length) {
    t.push("");
    for (const a of r.avisos) t.push(`_${a}_`);
  }
  return t.join("\n");
}
