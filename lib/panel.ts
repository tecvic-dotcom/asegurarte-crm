import "server-only";

/**
 * Panel de Mando — SOLO SERVIDOR.
 *
 * Aquí se resumen tus números (totales por periodo, por ramo, por mes y por
 * categoría). Al navegador solo viajan TOTALES: nunca la lista de clientes ni
 * miles de filas. Y es una sola fuente de verdad: el Panel y RORO leen
 * exactamente estos mismos cálculos, así nunca hay dos versiones de un número.
 *
 * Analogía: el tablero del coche. Este archivo es el que lee los sensores
 * (CRM + finanzas) y decide qué aguja mostrar y cuándo prender la luz ámbar.
 */
import { listLeads, isCloud } from "./db";
import { listarMovimientos } from "./finanzas";
import { listarPolizas } from "./cobranza";
import { resumenCobranza } from "./cobranza-reglas";
import { listarProduccion } from "./produccion";
import { listarAdjuntas } from "./polizas-adjuntas";
import { resumenAdjuntas } from "./adjuntas-reglas";
import { acumulado, corteDeDatos, crecimiento as crecPct, porAnio } from "./crecimiento-reglas";
import { getManagerConfig } from "./manager-config";
import { RAMOS, infoRamo } from "./ramos";
import { ETAPAS, moneda } from "./crm-data";
import {
  hoyLocal,
  fechaLocal,
  primeroDeMes,
  ultimoDeMes,
  mesAnterior,
  sumarDias,
  diasIncluidos,
  diasTraslape,
  minFecha,
  maxFecha,
  enRango,
  nombreMes,
  mesCorto,
  fechaCorta,
  capitalizar,
} from "./fechas";
import type {
  EstadoSemaforo,
  GastoCategoria,
  KpiPanel,
  Lead,
  ManagerConfig,
  MesFinanzas,
  Movimiento,
  PanelSnapshot,
  PeriodoPanel,
  RangoFechas,
  TipoMovimiento,
  AvanceRamo,
  Ramo,
} from "./types";

const MESES_GRAFICA = 6;

interface Rango {
  desde: string;
  hasta: string;
}

interface Contexto {
  hoy: string;
  leads: Lead[];
  movimientos: Movimiento[];
  config: ManagerConfig;
  ventanaMeta: Rango;
  diasMeta: number;
}

interface PeriodoCalculado {
  actual: RangoFechas;
  anterior: RangoFechas;
  /** El periodo completo (ej. todo octubre), para prorratear la meta del periodo. */
  extension: Rango;
}

interface Resumen {
  polizas: number;
  entro: number;
  salio: number;
  quedo: number;
}

// ----------------------------------------------------------------------------
// Periodos: comparaciones JUSTAS (no se mezclan meses ni días de más)
// ----------------------------------------------------------------------------

export function calcularPeriodo(periodo: PeriodoPanel, hoy: string, config: ManagerConfig): PeriodoCalculado {
  if (periodo === "mes_pasado") {
    const desde = mesAnterior(hoy);
    const hasta = ultimoDeMes(desde);
    const antDesde = mesAnterior(desde);
    return {
      actual: { desde, hasta, etiqueta: capitalizar(nombreMes(desde)) },
      anterior: { desde: antDesde, hasta: ultimoDeMes(antDesde), etiqueta: nombreMes(antDesde) },
      extension: { desde, hasta },
    };
  }

  if (periodo === "meta") {
    const desde = config.meta_inicio;
    const hasta = maxFecha(desde, minFecha(hoy, config.meta_fin));
    const dias = diasIncluidos(desde, hasta);
    return {
      actual: { desde, hasta, etiqueta: `Meta: ${fechaCorta(desde)} – ${fechaCorta(hasta)}` },
      anterior: {
        desde: sumarDias(desde, -dias),
        hasta: sumarDias(desde, -1),
        etiqueta: `los ${dias} días previos`,
      },
      extension: { desde: config.meta_inicio, hasta: config.meta_fin },
    };
  }

  // "mes": del día 1 a hoy, contra los MISMOS días del mes anterior. Comparar
  // 4 días de octubre contra todo septiembre te haría creer que vas fatal.
  const desde = primeroDeMes(hoy);
  const dia = diasIncluidos(desde, hoy);
  const antDesde = mesAnterior(hoy);
  const antHasta = minFecha(sumarDias(antDesde, dia - 1), ultimoDeMes(antDesde));
  return {
    actual: { desde, hasta: hoy, etiqueta: `${capitalizar(nombreMes(desde))} (1–${dia})` },
    anterior: {
      desde: antDesde,
      hasta: antHasta,
      etiqueta: `${nombreMes(antDesde)} (1–${diasIncluidos(antDesde, antHasta)})`,
    },
    extension: { desde, hasta: ultimoDeMes(hoy) },
  };
}

// ----------------------------------------------------------------------------
// Carga de datos (una sola vez por petición)
// ----------------------------------------------------------------------------

async function cargarContexto(periodos: PeriodoPanel[], configDada?: ManagerConfig): Promise<Contexto> {
  const hoy = hoyLocal();
  const config = configDada ?? (await getManagerConfig()).config;
  const ventanaMeta = { desde: config.meta_inicio, hasta: config.meta_fin };
  const diasMeta = diasIncluidos(config.meta_inicio, config.meta_fin);

  // Desde dónde necesitamos movimientos: la gráfica de 6 meses y los periodos de comparación.
  let desde = primeroDeMes(hoy);
  for (let i = 0; i < MESES_GRAFICA; i++) desde = mesAnterior(desde);
  for (const p of periodos) desde = minFecha(desde, calcularPeriodo(p, hoy, config).anterior.desde);

  const [leads, movimientos] = await Promise.all([listLeads(), listarMovimientos(desde, hoy)]);
  return { hoy, leads, movimientos, config, ventanaMeta, diasMeta };
}

// ----------------------------------------------------------------------------
// Cálculos
// ----------------------------------------------------------------------------

function ganadasEn(leads: Lead[], r: Rango): Lead[] {
  return leads.filter((l) => l.etapa === "ganado" && l.cerrado_en !== null && enRango(fechaLocal(l.cerrado_en), r));
}

function suma(movs: Movimiento[], tipo: TipoMovimiento, r: Rango): number {
  let s = 0;
  for (const m of movs) if (m.tipo === tipo && enRango(m.fecha, r)) s += m.monto;
  return Math.round(s * 100) / 100;
}

function resumen(ctx: Contexto, r: Rango): Resumen {
  const entro = suma(ctx.movimientos, "ingreso", r);
  const salio = suma(ctx.movimientos, "gasto", r);
  return { polizas: ganadasEn(ctx.leads, r).length, entro, salio, quedo: Math.round((entro - salio) * 100) / 100 };
}

/** Cuántas pólizas de UN ramo te tocan en un rango: tu meta repartida por día. */
function prorrateo(ctx: Contexto, r: Rango): number {
  return (ctx.config.meta_por_ramo * diasTraslape(r, ctx.ventanaMeta)) / ctx.diasMeta;
}

function semaforoRitmo(cerradas: number, ritmo: number): EstadoSemaforo {
  if (ritmo < 1) return cerradas > 0 ? "bien" : "neutral"; // muy pronto para juzgar
  if (cerradas >= Math.floor(ritmo)) return "bien";
  if (cerradas >= ritmo * 0.6) return "atencion";
  return "alerta";
}

/** Cambio porcentual contra el periodo anterior (el anterior debe ser distinto de 0). */
function pct(actual: number, anterior: number): number {
  return Math.round(((actual - anterior) / Math.abs(anterior)) * 100);
}

function redondear1(n: number): number {
  return Math.round(n * 10) / 10;
}

function plural(n: number, singular: string, varios: string): string {
  return n === 1 ? singular : varios;
}

function armarKpis(ctx: Contexto, p: PeriodoCalculado, act: Resumen, ant: Resumen, hayFinanzas: boolean): KpiPanel[] {
  const etAnt = p.anterior.etiqueta;

  // 1) Pólizas cerradas vs el ritmo de tu meta
  const ritmoTotal = prorrateo(ctx, p.actual) * RAMOS.length;
  const ritmoRed = Math.round(ritmoTotal);
  const estP = semaforoRitmo(act.polizas, ritmoTotal);
  const enVentana = ritmoTotal >= 0.5;
  const polizas: KpiPanel = {
    id: "polizas",
    titulo: "Pólizas cerradas",
    valor: act.polizas,
    formato: "numero",
    anterior: ant.polizas,
    ritmo: enVentana ? ritmoRed : null,
    estado: estP,
    aviso:
      estP === "bien" && enVentana
        ? "Vas en ritmo con tu meta"
        : estP === "atencion" || estP === "alerta"
          ? `Vas ${Math.max(1, ritmoRed - act.polizas)} abajo del ritmo de tu meta`
          : null,
    subtitulo: enVentana ? `ritmo para tu meta: ${ritmoRed}` : "fuera de las fechas de tu meta",
    explicacion:
      "Prospectos que pasaste a “Cliente ganado” en este periodo. El ritmo es cuántas pólizas deberías llevar a hoy para llegar a tu meta por ramo a tiempo.",
  };

  // 2) Cuánto entró
  let estE: EstadoSemaforo = "neutral";
  let avisoE: string | null = null;
  if (!hayFinanzas) avisoE = "Registra tus comisiones abajo para ver este número";
  else if (ant.entro > 0 && act.entro < ant.entro * 0.8) {
    estE = "atencion";
    avisoE = `Entró ${Math.abs(pct(act.entro, ant.entro))}% menos que en ${etAnt}`;
  } else if (act.entro > 0) estE = "bien";
  else avisoE = "Aún no registras ingresos en este periodo";

  // 3) Cuánto salió (aquí subir es MALO)
  let estS: EstadoSemaforo = "neutral";
  let avisoS: string | null = null;
  if (!hayFinanzas) avisoS = "Registra tus gastos abajo para ver este número";
  else if (act.salio > 0 && act.salio > act.entro) {
    estS = "alerta";
    avisoS = "Gastaste más de lo que entró";
  } else if (ant.salio > 0 && act.salio > ant.salio * 1.2) {
    estS = "atencion";
    avisoS = `Tus gastos subieron ${pct(act.salio, ant.salio)}% vs ${etAnt}`;
  } else if (act.salio > 0) estS = "bien";
  else avisoS = "Aún no registras gastos en este periodo";

  // 4) Lo que te quedó
  let estQ: EstadoSemaforo = "neutral";
  let avisoQ: string | null = null;
  if (hayFinanzas) {
    if (act.quedo < 0) {
      estQ = "alerta";
      avisoQ = "Estás perdiendo dinero en este periodo";
    } else if (ant.quedo > 0 && act.quedo < ant.quedo) {
      estQ = "atencion";
      avisoQ = `Te quedó ${Math.abs(pct(act.quedo, ant.quedo))}% menos que en ${etAnt}`;
    } else if (act.quedo > 0) estQ = "bien";
  }
  const deCada100 = act.entro > 0 ? Math.round((Math.abs(act.quedo) / act.entro) * 100) : 0;

  return [
    polizas,
    {
      id: "entro",
      titulo: "Cuánto entró",
      valor: act.entro,
      formato: "moneda",
      anterior: hayFinanzas ? ant.entro : null,
      ritmo: null,
      estado: estE,
      aviso: avisoE,
      subtitulo: "comisiones y bonos",
      explicacion:
        "Todo el dinero que te entró: comisiones de pólizas nuevas y de renovaciones, bonos y otros ingresos que registres abajo.",
    },
    {
      id: "salio",
      titulo: "Cuánto salió",
      valor: act.salio,
      formato: "moneda",
      anterior: hayFinanzas ? ant.salio : null,
      ritmo: null,
      estado: estS,
      aviso: avisoS,
      subtitulo: "gastos del negocio",
      explicacion: "Lo que gastaste para mover tu negocio: publicidad, gasolina, teléfono, herramientas, comidas con clientes…",
    },
    {
      id: "quedo",
      titulo: "Lo que te quedó",
      valor: act.quedo,
      formato: "moneda",
      anterior: hayFinanzas ? ant.quedo : null,
      ritmo: null,
      estado: estQ,
      aviso: avisoQ,
      subtitulo:
        act.entro > 0
          ? act.quedo >= 0
            ? `te quedan $${deCada100} de cada $100`
            : `pierdes $${deCada100} de cada $100`
          : "lo que entró menos lo que salió",
      explicacion:
        "Lo que te queda limpio: lo que entró menos lo que salió. Es antes de impuestos, salvo que registres tus impuestos como gasto.",
    },
  ];
}

function armarRamos(ctx: Contexto, periodo: PeriodoPanel, p: PeriodoCalculado, ganadas: Lead[]): PanelSnapshot["ramos"] {
  const metaRamo = prorrateo(ctx, p.extension);
  const ritmoRamo = prorrateo(ctx, p.actual);
  const hayMeta = metaRamo >= 0.5;
  const porRamo: AvanceRamo[] = RAMOS.map((r) => {
    const cerradas = ganadas.filter((l) => l.ramo === r.id).length;
    return {
      ramo: r.id,
      cerradas,
      meta: redondear1(metaRamo),
      ritmo: redondear1(ritmoRamo),
      estado: hayMeta ? semaforoRitmo(cerradas, ritmoRamo) : "neutral",
    };
  });
  const titulo =
    periodo === "meta"
      ? `Tu meta: ${ctx.config.meta_por_ramo} pólizas por ramo (${fechaCorta(ctx.config.meta_inicio)} – ${fechaCorta(ctx.config.meta_fin)})`
      : hayMeta
        ? `Meta de ${nombreMes(p.extension.desde)}: ${Math.round(metaRamo)} pólizas por ramo`
        : `Pólizas por ramo en ${nombreMes(p.extension.desde)}`;
  return { titulo, porRamo, sinRamo: ganadas.filter((l) => !l.ramo).length, hayMeta };
}

function armarMeses(ctx: Contexto, hastaPeriodo: string): MesFinanzas[] {
  const inicios: string[] = [];
  let m = primeroDeMes(hastaPeriodo);
  for (let i = 0; i < MESES_GRAFICA; i++) {
    inicios.unshift(m);
    m = mesAnterior(m);
  }
  return inicios.map((inicio) => {
    const r = { desde: inicio, hasta: ultimoDeMes(inicio) };
    return {
      mes: inicio.slice(0, 7),
      etiqueta: mesCorto(inicio),
      entro: suma(ctx.movimientos, "ingreso", r),
      salio: suma(ctx.movimientos, "gasto", r),
    };
  });
}

/** Totales por categoría, de mayor a menor; lo que no cabe se junta en "Todo lo demás". */
function porCategoria(movs: Movimiento[], tipo: TipoMovimiento, r: Rango, maximo = 5): GastoCategoria[] {
  const mapa = new Map<string, number>();
  for (const m of movs) {
    if (m.tipo === tipo && enRango(m.fecha, r)) mapa.set(m.categoria, (mapa.get(m.categoria) ?? 0) + m.monto);
  }
  const lista = [...mapa]
    .map(([categoria, monto]) => ({ categoria, monto: Math.round(monto) }))
    .sort((a, b) => b.monto - a.monto);
  if (lista.length <= maximo + 1) return lista;
  const resto = lista.slice(maximo).reduce((s, x) => s + x.monto, 0);
  return [...lista.slice(0, maximo), { categoria: "Todo lo demás", monto: resto }];
}

/** Avance de la meta de 90 días a hoy (lo usan la frase y RORO). */
function avanceMeta(ctx: Contexto) {
  const { meta_inicio: inicio, meta_fin: fin, meta_por_ramo: porRamo } = ctx.config;
  const total = porRamo * RAMOS.length;
  if (ctx.hoy < inicio) {
    return { estado: "por_empezar" as const, inicio, fin, porRamo, total, dia: 0, cerradas: 0, ritmo: 0, ramos: [], sinRamo: 0 };
  }
  const hasta = minFecha(ctx.hoy, fin);
  const r = { desde: inicio, hasta };
  const ganadas = ganadasEn(ctx.leads, r);
  const ritmoRamo = prorrateo(ctx, r);
  const ramos = RAMOS.map((ramo) => {
    const cerradas = ganadas.filter((l) => l.ramo === ramo.id).length;
    return { ramo: ramo.corto, cerradas, ritmo_a_hoy: redondear1(ritmoRamo), atraso: redondear1(ritmoRamo - cerradas) };
  });
  return {
    estado: ctx.hoy > fin ? ("terminada" as const) : ("en_curso" as const),
    inicio,
    fin,
    porRamo,
    total,
    dia: diasIncluidos(inicio, hasta),
    cerradas: ganadas.length,
    /** Sin redondear: se redondea solo al mostrarlo. */
    ritmo: ritmoRamo * RAMOS.length,
    ramos,
    sinRamo: ganadas.filter((l) => !l.ramo).length,
  };
}

/** "Ahorro" · "Ahorro y Hogar" · "Vida, Ahorro y Hogar" */
function unirNombres(nombres: string[]): string {
  return nombres.length <= 1 ? (nombres[0] ?? "") : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

/**
 * El reporte de una frase: qué entró, qué salió, cómo vas contra el mes pasado
 * y qué revisar HOY. Se lee en 20 segundos, antes del café.
 */
function armarFrase(ctx: Contexto): string {
  const p = calcularPeriodo("mes", ctx.hoy, ctx.config);
  const act = resumen(ctx, p.actual);
  const ant = resumen(ctx, p.anterior);
  const mes = nombreMes(ctx.hoy);
  const hayMovsMes = ctx.movimientos.some((m) => enRango(m.fecha, p.actual));
  const porConfirmar = ctx.movimientos.filter((m) => m.estado === "por_confirmar" && enRango(m.fecha, p.actual)).length;
  const partes: string[] = [];

  if (hayMovsMes) {
    let comparacion = "";
    const diferencia = act.quedo - ant.quedo;
    if (ant.quedo > 0) {
      // Con base positiva, el porcentaje se entiende ("▲ 12%").
      const c = pct(act.quedo, ant.quedo);
      comparacion = ` (${c >= 0 ? "▲" : "▼"} ${Math.abs(c)}% vs ${p.anterior.etiqueta})`;
    } else if (diferencia !== 0) {
      // Si antes ibas en cero o en negativo, un porcentaje confunde: mejor la diferencia en pesos.
      comparacion = ` (${diferencia > 0 ? "▲" : "▼"} ${moneda(Math.abs(diferencia))} ${diferencia > 0 ? "más" : "menos"} que en ${p.anterior.etiqueta})`;
    }
    const quedo = act.quedo >= 0 ? `te quedan ${moneda(act.quedo)}` : `vas ${moneda(-act.quedo)} abajo`;
    partes.push(`Hoy ${fechaCorta(ctx.hoy)}: en ${mes} entraron ${moneda(act.entro)} y salieron ${moneda(act.salio)}; ${quedo}${comparacion}.`);
  } else {
    partes.push(`Hoy ${fechaCorta(ctx.hoy)}: aún no registras comisiones ni gastos de ${mes}; agrégalos en el Panel para ver lo que de verdad te queda.`);
  }

  const meta = avanceMeta(ctx);
  let atrasados: string[] = [];
  if (meta.estado === "por_empezar") {
    partes.push(`Tu meta arranca el ${fechaCorta(meta.inicio)}.`);
  } else if (meta.estado === "terminada") {
    partes.push(`Tu meta ya cerró: lograste ${meta.cerradas} de ${meta.total} pólizas.`);
  } else {
    // Los ramos que más se atrasan (si empatan, se nombran todos).
    const mayorAtraso = Math.max(...meta.ramos.map((r) => r.atraso));
    if (mayorAtraso >= 1) atrasados = meta.ramos.filter((r) => mayorAtraso - r.atraso < 0.05).map((r) => r.ramo);
    const quienes =
      atrasados.length === 0
        ? ""
        : atrasados.length === 1
          ? `; ${atrasados[0]} es el ramo más atrasado`
          : `; ${unirNombres(atrasados)} son los ramos más atrasados`;
    partes.push(
      `Llevas ${meta.cerradas} de ${meta.total} pólizas de tu meta (día ${meta.dia} de ${ctx.diasMeta}; a hoy el ritmo pide ${Math.round(meta.ritmo)})${quienes}.`,
    );
  }

  let accion: string;
  if (porConfirmar > 0) {
    accion = `confirma ${porConfirmar} ${plural(porConfirmar, "movimiento marcado", "movimientos marcados")} “por confirmar”`;
  } else if (meta.sinRamo > 0) {
    accion = `asígnale ramo a ${meta.sinRamo} ${plural(meta.sinRamo, "póliza ganada", "pólizas ganadas")} para que cuenten en tu meta`;
  } else if (hayMovsMes && act.quedo < 0) {
    accion = "tus gastos van arriba de lo que entra: revisa en qué se te está yendo";
  } else if (atrasados.length) {
    accion =
      atrasados.length === 1
        ? `empuja ${atrasados[0]}, es el que más se atrasa`
        : `empuja ${unirNombres(atrasados)}, son los que más se atrasan`;
  } else if (!hayMovsMes) {
    accion = "registra tus comisiones y gastos del mes";
  } else {
    accion = "sigue así, vas en ritmo";
  }
  partes.push(`Revisa hoy: ${accion}.`);
  return partes.join(" ");
}

// ----------------------------------------------------------------------------
// Lo que pide el Panel de Mando
// ----------------------------------------------------------------------------

export async function panelSnapshot(periodo: PeriodoPanel): Promise<PanelSnapshot> {
  const ctx = await cargarContexto(periodo === "mes" ? ["mes"] : [periodo, "mes"]);
  const p = calcularPeriodo(periodo, ctx.hoy, ctx.config);
  const act = resumen(ctx, p.actual);
  const ant = resumen(ctx, p.anterior);
  const hayFinanzas = ctx.movimientos.length > 0;
  const meta = avanceMeta(ctx);

  return {
    periodo,
    actual: p.actual,
    anterior: p.anterior,
    frase: armarFrase(ctx),
    kpis: armarKpis(ctx, p, act, ant, hayFinanzas),
    ramos: armarRamos(ctx, periodo, p, ganadasEn(ctx.leads, p.actual)),
    meta: {
      inicio: meta.inicio,
      fin: meta.fin,
      porRamo: meta.porRamo,
      total: meta.total,
      cerradas: meta.cerradas,
      dia: meta.dia,
      diasTotales: ctx.diasMeta,
    },
    meses: armarMeses(ctx, p.actual.hasta),
    gastosPorCategoria: porCategoria(ctx.movimientos, "gasto", p.actual),
    porConfirmar: ctx.movimientos.filter((m) => m.estado === "por_confirmar" && enRango(m.fecha, p.actual)).length,
    hayFinanzas,
    generado_en: new Date().toISOString(),
    cloud: isCloud(),
  };
}

// ----------------------------------------------------------------------------
// Lo que lee RORO: los mismos cálculos, en un resumen SIN datos personales
// (ni nombres, ni teléfonos, ni correos de tus clientes: solo totales).
// ----------------------------------------------------------------------------

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function ingresosPorRamo(movs: Movimiento[], r: Rango): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of movs) {
    if (m.tipo === "ingreso" && m.ramo && enRango(m.fecha, r)) {
      const k = infoRamo(m.ramo).corto;
      out[k] = Math.round((out[k] ?? 0) + m.monto);
    }
  }
  return out;
}

export async function numerosParaManager(config: ManagerConfig): Promise<Record<string, unknown> & { hoy: string }> {
  const ctx = await cargarContexto(["mes", "mes_pasado"], config);
  const mes = calcularPeriodo("mes", ctx.hoy, config);
  const pasado = calcularPeriodo("mes_pasado", ctx.hoy, config);
  const rMes = resumen(ctx, mes.actual);
  const rMesAnt = resumen(ctx, mes.anterior);
  const rPasado = resumen(ctx, pasado.actual);
  const meta = avanceMeta(ctx);

  const activos = ctx.leads.filter((l) => l.etapa !== "ganado" && l.etapa !== "perdido");
  const ganadosTotal = ctx.leads.filter((l) => l.etapa === "ganado").length;
  const origenes = new Map<string, { prospectos: number; ganados: number }>();
  for (const l of ctx.leads) {
    const o = origenes.get(l.origen || "Sin origen") ?? { prospectos: 0, ganados: 0 };
    o.prospectos += 1;
    if (l.etapa === "ganado") o.ganados += 1;
    origenes.set(l.origen || "Sin origen", o);
  }

  const hayMovsMes = ctx.movimientos.some((m) => enRango(m.fecha, mes.actual));
  const avisos: string[] = [];
  if (!ctx.movimientos.length) {
    avisos.push("Todavía no hay NINGUNA comisión ni gasto registrado en el CRM: los montos en 0 significan 'sin registrar', no 'cero'.");
  } else if (!hayMovsMes) {
    avisos.push("No hay movimientos registrados este mes: los montos de este mes en 0 significan 'sin registrar'.");
  }
  if (meta.sinRamo > 0) avisos.push(`${meta.sinRamo} pólizas ganadas dentro de la meta no tienen ramo asignado (no cuentan por ramo).`);

  // Lo que ve Valeri (cobranza), solo en totales. Si su tabla aún no existe, RORO lo sabe y no se rompe.
  let cobranza: Record<string, unknown>;
  try {
    const r = resumenCobranza(await listarPolizas(), ctx.hoy);
    cobranza = {
      polizas_en_cartera: r.polizas,
      vencidas: r.vencidas,
      monto_vencido: r.montoVencido,
      por_vencer_15_dias: r.porVencer,
      monto_por_vencer: r.montoPorVencer,
      promesas_de_pago: r.promesas,
      renuevan_30_dias: r.renuevan,
      sin_whatsapp: r.sinWhatsapp,
      recordadas_hoy: r.recordadasHoy,
    };
    if (!r.polizas) avisos.push("La cartera de cobranza (Valeri) está vacía: todavía no hay pólizas registradas para cobrar.");
  } catch {
    cobranza = { disponible: false, motivo: "Valeri (cobranza) aún no tiene su tabla en Supabase (falta correr 0004_cobranza.sql)." };
  }

  // Crecimiento (reportes de prima pagada): solo totales por ramo, comparando parejo.
  let crecimiento_produccion: Record<string, unknown>;
  try {
    const prod = await listarProduccion();
    const corte = corteDeDatos(prod);
    if (!corte) {
      crecimiento_produccion = { disponible: false, motivo: "Aún no hay reportes de producción cargados." };
    } else {
      const a = corte.anio;
      const fila = (r: Ramo | null) => {
        const pAct = acumulado(prod, "prima", r, a, corte.mesCorte);
        const pAnt = acumulado(prod, "prima", r, a - 1, corte.mesCorte);
        const cAct = acumulado(prod, "comision", r, a, corte.mesCorte);
        const cAnt = acumulado(prod, "comision", r, a - 1, corte.mesCorte);
        return { prima: pAct, prima_antes: pAnt, crecimiento_prima_pct: crecPct(pAct, pAnt), comision: cAct, comision_antes: cAnt, crecimiento_comision_pct: crecPct(cAct, cAnt) };
      };
      crecimiento_produccion = {
        periodo_comparado: `${a} vs ${a - 1}, de enero a ${nombreMes(`${a}-${String(corte.mesCorte).padStart(2, "0")}-01`)}`,
        datos_hasta: corte.ultimoDia,
        total: fila(null),
        por_ramo: Object.fromEntries(RAMOS.filter((r) => prod.some((f) => f.ramo === r.id)).map((r) => [r.corto, fila(r.id)])),
        anios_completos: porAnio(prod, "prima", null)
          .filter((x) => x.anio < a)
          .map((x) => ({ anio: x.anio, prima: x.total, comision: porAnio(prod, "comision", null).find((y) => y.anio === x.anio)?.total ?? 0 })),
      };
    }
  } catch {
    crecimiento_produccion = { disponible: false, motivo: "La tabla de producción aún no existe (falta 0005_produccion.sql)." };
  }

  // Pólizas nuevas y renovaciones que Roberto adjuntó: prima neta por ramo, solo totales (sin nombres de clientes).
  let polizas_adjuntas: Record<string, unknown>;
  try {
    const todas = await listarAdjuntas();
    if (!todas.length) {
      polizas_adjuntas = { disponible: false, motivo: "Aún no ha adjuntado pólizas nuevas ni renovaciones en la pestaña Pólizas." };
    } else {
      const anio = ctx.hoy.slice(0, 4);
      const m = Number(ctx.hoy.slice(5, 7));
      const t0 = Math.floor((m - 1) / 3) * 3 + 1;
      const mm = (n: number) => String(n).padStart(2, "0");
      const periodos = {
        este_mes: [`${anio}-${mm(m)}-01`, `${anio}-${mm(m)}-31`],
        este_trimestre: [`${anio}-${mm(t0)}-01`, `${anio}-${mm(t0 + 2)}-31`],
        este_anio: [`${anio}-01-01`, `${anio}-12-31`],
      } as const;
      const porPeriodo = (r: Ramo | null) =>
        Object.fromEntries(
          Object.entries(periodos).map(([k, [d, h]]) => {
            const x = resumenAdjuntas(todas, d, h, r);
            return [k, { polizas_nuevas: x.nuevas, prima_neta_nueva: x.primaNueva, renovaciones: x.renovaciones, prima_neta_renovada: x.primaRenovacion }];
          }),
        );
      const gmm = Object.fromEntries(
        Object.entries(periodos).map(([k, [d, h]]) => [k, resumenAdjuntas(todas, d, h, "gmm").aseguradosNuevos]),
      );
      polizas_adjuntas = {
        nota: "Prima neta anual por inicio de vigencia, solo pesos. Los asegurados nuevos de GMM salen solo de pólizas nuevas; las renovaciones no cuentan.",
        total: porPeriodo(null),
        por_ramo: Object.fromEntries(RAMOS.filter((r) => todas.some((p) => p.ramo === r.id)).map((r) => [r.corto, porPeriodo(r.id)])),
        gmm_asegurados_nuevos: gmm,
      };
    }
  } catch {
    polizas_adjuntas = { disponible: false, motivo: "La pestaña Pólizas aún no tiene su tabla en Supabase (falta 0006_polizas_adjuntas.sql)." };
  }

  return {
    crecimiento_produccion,
    polizas_adjuntas,
    cobranza,
    hoy: ctx.hoy,
    meta: {
      estado: meta.estado,
      fechas: `${meta.inicio} a ${meta.fin}`,
      polizas_por_ramo: meta.porRamo,
      total: meta.total,
      dia: meta.dia,
      dias_totales: ctx.diasMeta,
      cerradas_total: meta.cerradas,
      ritmo_total_a_hoy: redondear1(meta.ritmo),
      por_ramo: meta.ramos,
      ganadas_sin_ramo: meta.sinRamo,
    },
    este_mes: {
      periodo: mes.actual.etiqueta,
      polizas_cerradas: rMes.polizas,
      entro: rMes.entro,
      salio: rMes.salio,
      quedo: rMes.quedo,
      comparado_con: mes.anterior.etiqueta,
      antes: rMesAnt,
      gastos_por_categoria: porCategoria(ctx.movimientos, "gasto", mes.actual, 8),
      ingresos_por_categoria: porCategoria(ctx.movimientos, "ingreso", mes.actual, 8),
      ingresos_por_ramo: ingresosPorRamo(ctx.movimientos, mes.actual),
    },
    mes_pasado: {
      periodo: pasado.actual.etiqueta,
      polizas_cerradas: rPasado.polizas,
      entro: rPasado.entro,
      salio: rPasado.salio,
      quedo: rPasado.quedo,
      gastos_por_categoria: porCategoria(ctx.movimientos, "gasto", pasado.actual, 8),
      ingresos_por_ramo: ingresosPorRamo(ctx.movimientos, pasado.actual),
    },
    ultimos_6_meses: armarMeses(ctx, ctx.hoy).map((m) => ({
      mes: m.mes,
      entro: m.entro,
      salio: m.salio,
      quedo: Math.round((m.entro - m.salio) * 100) / 100,
    })),
    embudo: {
      prospectos_total: ctx.leads.length,
      por_etapa: Object.fromEntries(ETAPAS.map((e) => [e.nombre, ctx.leads.filter((l) => l.etapa === e.id).length])),
      valor_estimado_en_propuesta: ctx.leads.filter((l) => l.etapa === "propuesta").reduce((s, l) => s + l.valor, 0),
      activos_sin_contacto_3_dias_o_mas: activos.filter((l) => diasDesde(l.actualizado_en) >= 3).length,
      nuevos_ultimos_7_dias: ctx.leads.filter((l) => fechaLocal(l.creado_en) >= sumarDias(ctx.hoy, -6)).length,
      conversion_historica_pct: ctx.leads.length ? Math.round((ganadosTotal / ctx.leads.length) * 100) : 0,
      origenes: [...origenes]
        .map(([origen, o]) => ({ origen, ...o }))
        .sort((a, b) => b.prospectos - a.prospectos)
        .slice(0, 6),
      activos_por_ramo: Object.fromEntries([
        ...RAMOS.map((r) => [r.corto, activos.filter((l) => l.ramo === r.id).length]),
        ["Sin ramo", activos.filter((l) => !l.ramo).length],
      ]),
    },
    movimientos_por_confirmar: ctx.movimientos.filter((m) => m.estado === "por_confirmar").length,
    avisos_de_datos: avisos,
  };
}
