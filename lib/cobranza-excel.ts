/**
 * Excel de «cómo va la cobranza» — puro (cliente y servidor), sin IA y sin costo.
 *
 * Analogía: el cuaderno de Valeri impreso a media mañana. Tres hojas:
 *  1. Resumen: las mismas cifras de la pantalla de Valeri + un desglose por ramo.
 *  2. Por cobrar: a quién cobrarle hoy, en el mismo orden de urgencia que Valeri.
 *  3. Cartera completa: todas las pólizas con su estado, con filtros para cortarla como quieras.
 */
import {
  DIAS_AVISO,
  DIAS_RENOVACION,
  FORMAS_PAGO,
  esPrimerPago,
  estadoDe,
  etiquetaEstado,
  listaDeHoy,
  montoDelProximoPago,
  recordadaHoy,
  resumenCobranza,
  type MotivoCobro,
} from "./cobranza-reglas";
import { diasEntre, fechaLarga, fechaLocal } from "./fechas";
import { infoRamo } from "./ramos";
import type { EstadoCobro, Poliza } from "./types";
import { letraColumna, serieExcel, type Celda, type Estilo, type Hoja } from "./xlsx-simple";

const AZUL = "2A22F5";
const GRIS = "6B7280";

/** Colores y nombre con que se ve cada estado (siempre con palabra, nunca solo color). */
const TONO: Record<EstadoCobro, { fondo: string; letra: string; nombre: string }> = {
  vencida: { fondo: "FEE2E2", letra: "B91C1C", nombre: "Vencida" },
  promesa_vencida: { fondo: "FEE2E2", letra: "B91C1C", nombre: "Promesa incumplida" },
  por_vencer: { fondo: "FEF3C7", letra: "92400E", nombre: "Por vencer" },
  promesa: { fondo: "DBEAFE", letra: "1E40AF", nombre: "Promesa de pago" },
  al_corriente: { fondo: "DCFCE7", letra: "166534", nombre: "Pagada (al corriente)" },
  sin_fecha: { fondo: "F3F4F6", letra: "4B5563", nombre: "Sin fecha de pago" },
  cancelada: { fondo: "F3F4F6", letra: "4B5563", nombre: "Cancelada" },
};
const TONO_RENOVACION = { fondo: "E0F2FE", letra: "075985" };

const ORDEN_ESTADO: EstadoCobro[] = ["vencida", "promesa_vencida", "por_vencer", "promesa", "al_corriente", "sin_fecha", "cancelada"];

const ENCABEZADO: Estilo = { negrita: true, color: "FFFFFF", relleno: AZUL, alinear: "centro", envolver: true, borde: true };
const TEXTO: Estilo = { borde: true };
const CENTRO: Estilo = { borde: true, alinear: "centro" };
const DINERO: Estilo = { borde: true, formato: "moneda" };
const FECHA: Estilo = { borde: true, formato: "fecha", alinear: "centro" };

export function nombreArchivoCobranza(hoy: string): string {
  return `cobranza-valeri-${hoy}.xlsx`;
}

function fechaCelda(f: string | null | undefined): Celda {
  return { v: f ? serieExcel(f) : null, e: FECHA };
}

/** El último recordatorio se guarda como instante con hora: aquí solo interesa el día (hora de Monterrey). */
function diaDe(instante: string | null): string | null {
  return instante ? fechaLocal(instante) : null;
}

function formaDePago(p: Poliza): string {
  return FORMAS_PAGO.find((f) => f.id === p.forma_pago)?.nombre ?? "";
}

function ramoDe(p: Poliza): string {
  return p.ramo ? infoRamo(p.ramo).corto : "Sin ramo";
}

function diasDeAtraso(estado: EstadoCobro, dias: number): number | null {
  return estado === "vencida" || estado === "promesa_vencida" ? dias : null;
}

function celdaEstado(estado: EstadoCobro): Celda {
  const t = TONO[estado];
  return { v: t.nombre, e: { borde: true, negrita: true, color: t.letra, relleno: t.fondo } };
}

// ----------------------------------------------------------------------------
// Hoja 3: cartera completa
// ----------------------------------------------------------------------------

function hojaCartera(polizas: Poliza[], hoy: string): Hoja {
  const encabezados = [
    "Cliente",
    "Póliza",
    "Ramo",
    "Aseguradora",
    "Forma de pago",
    "Estado",
    "Detalle del estado",
    "Días de atraso",
    "Monto del próximo pago",
    "1er pago",
    "Fecha límite de pago",
    "Promesa de pago",
    "Renovación",
    "Último pago",
    "Último recordatorio",
    "WhatsApp",
    "Correo",
    "Prima anual",
    "Notas",
  ];

  const filas = polizas
    .map((p) => ({ p, ...estadoDe(p, hoy) }))
    .sort(
      (a, b) =>
        ORDEN_ESTADO.indexOf(a.estado) - ORDEN_ESTADO.indexOf(b.estado) ||
        (a.p.fecha_limite_pago ?? "9999").localeCompare(b.p.fecha_limite_pago ?? "9999") ||
        a.p.asegurado.localeCompare(b.p.asegurado, "es"),
    );

  const datos: Celda[][] = filas.map(({ p, estado, dias }) => [
    { v: p.asegurado, e: TEXTO },
    { v: p.numero, e: TEXTO },
    { v: ramoDe(p), e: TEXTO },
    { v: p.aseguradora, e: TEXTO },
    { v: formaDePago(p), e: TEXTO },
    celdaEstado(estado),
    { v: etiquetaEstado(estado, dias, p), e: TEXTO },
    { v: diasDeAtraso(estado, dias), e: { borde: true, formato: "entero", alinear: "centro" } },
    { v: estado === "cancelada" ? null : montoDelProximoPago(p) || null, e: DINERO },
    { v: esPrimerPago(p) ? "Sí" : "", e: CENTRO },
    fechaCelda(p.fecha_limite_pago),
    fechaCelda(p.promesa_fecha),
    fechaCelda(p.renovacion),
    fechaCelda(p.ultimo_pago),
    fechaCelda(diaDe(p.ultimo_recordatorio)),
    { v: p.whatsapp, e: TEXTO },
    { v: p.correo, e: TEXTO },
    { v: p.prima_anual || null, e: DINERO },
    { v: p.notas, e: { borde: true, envolver: true } },
  ]);

  // Totales que se recalculan solos al filtrar (SUBTOTAL ignora las filas ocultas por el filtro).
  const ultima = datos.length + 1;
  const sumaMonto = filas.reduce((s, { p, estado }) => s + (estado === "cancelada" ? 0 : montoDelProximoPago(p)), 0);
  const sumaPrima = polizas.reduce((s, p) => s + p.prima_anual, 0);
  const total: Celda[] = encabezados.map(() => ({ v: null, e: { relleno: "EEF0FF", borde: true } }));
  total[6] ={ v: "Total (cambia al filtrar)", e: { negrita: true, relleno: "EEF0FF", borde: true, alinear: "derecha" } };
  total[8] = { v: sumaMonto, f: `SUBTOTAL(109,I2:I${ultima})`, e: { negrita: true, relleno: "EEF0FF", borde: true, formato: "moneda" } };
  total[17] = { v: sumaPrima, f: `SUBTOTAL(109,R2:R${ultima})`, e: { negrita: true, relleno: "EEF0FF", borde: true, formato: "moneda" } };

  return {
    nombre: "Cartera completa",
    anchos: [36, 14, 11, 14, 13, 22, 32, 10, 16, 9, 15, 15, 14, 14, 15, 14, 30, 14, 40],
    filas: [encabezados.map((t) => ({ v: t, e: ENCABEZADO })), ...datos, total],
    altos: { 1: 34 },
    congelar: { filas: 1, columnas: 1 },
    filtro: { fila: 1, desdeColumna: 1, hastaColumna: encabezados.length, hastaFila: Math.max(ultima, 2) },
    colorPestana: "9CA3AF",
  };
}

// ----------------------------------------------------------------------------
// Hoja 2: por cobrar (la lista de hoy de Valeri)
// ----------------------------------------------------------------------------

const MOTIVO_NOMBRE: Record<MotivoCobro, string> = {
  vencida: "Vencida",
  promesa_vencida: "Promesa incumplida",
  por_vencer: "Por vencer",
  promesa: "Promesa de pago",
  renovacion: "Renovación",
};

function hojaPorCobrar(polizas: Poliza[], hoy: string): Hoja {
  const encabezados = [
    "#",
    "Motivo",
    "Detalle",
    "Cliente",
    "Póliza",
    "Ramo",
    "Aseguradora",
    "Forma de pago",
    "Monto a cobrar",
    "1er pago",
    "Fecha límite de pago",
    "Promesa de pago",
    "Renovación",
    "Recordada hoy",
    "WhatsApp",
    "Último recordatorio",
  ];

  const lista = listaDeHoy(polizas, hoy);
  let sumaMonto = 0;
  const datos: Celda[][] = lista.map((x, i) => {
    const p = x.poliza;
    const esRenovacion = x.motivo === "renovacion";
    // Los avisos de renovación no son un pago por cobrar hoy: van sin monto para no mezclarlos en el total.
    const monto = esRenovacion ? null : montoDelProximoPago(p) || null;
    sumaMonto += monto ?? 0;
    const tono = x.motivo === "renovacion" ? TONO_RENOVACION : TONO[x.motivo];
    const detalle = esRenovacion && p.renovacion ? `Renueva el ${fechaLarga(p.renovacion)} (en ${diasEntre(hoy, p.renovacion)} días)` : etiquetaEstado(x.estado, x.dias, p);
    return [
      { v: i + 1, e: { borde: true, alinear: "centro", formato: "entero" } },
      { v: MOTIVO_NOMBRE[x.motivo], e: { borde: true, negrita: true, color: tono.letra, relleno: tono.fondo } },
      { v: detalle, e: TEXTO },
      { v: p.asegurado, e: TEXTO },
      { v: p.numero, e: TEXTO },
      { v: ramoDe(p), e: TEXTO },
      { v: p.aseguradora, e: TEXTO },
      { v: formaDePago(p), e: TEXTO },
      { v: monto, e: DINERO },
      { v: !esRenovacion && esPrimerPago(p) ? "Sí" : "", e: CENTRO },
      fechaCelda(p.fecha_limite_pago),
      fechaCelda(p.promesa_fecha),
      fechaCelda(p.renovacion),
      { v: recordadaHoy(p, hoy) ? "Sí" : "", e: CENTRO },
      { v: p.whatsapp, e: TEXTO },
      fechaCelda(diaDe(p.ultimo_recordatorio)),
    ];
  });

  const ultima = datos.length + 1;
  const total: Celda[] = encabezados.map(() => ({ v: null, e: { relleno: "EEF0FF", borde: true } }));
  total[7] = { v: "Total (cambia al filtrar)", e: { negrita: true, relleno: "EEF0FF", borde: true, alinear: "derecha" } };
  total[8] = { v: sumaMonto, f: `SUBTOTAL(109,I2:I${ultima})`, e: { negrita: true, relleno: "EEF0FF", borde: true, formato: "moneda" } };

  const vacia: Celda[][] = datos.length ? [] : [[{ v: "Nadie tiene cobros pendientes hoy.", e: { cursiva: true, color: GRIS } }]];

  return {
    nombre: "Por cobrar",
    anchos: [5, 21, 38, 36, 14, 11, 14, 13, 16, 9, 15, 15, 14, 10, 14, 15],
    filas: [encabezados.map((t) => ({ v: t, e: ENCABEZADO })), ...datos, ...(datos.length ? [total] : vacia)],
    altos: { 1: 34 },
    congelar: { filas: 1, columnas: 4 },
    filtro: { fila: 1, desdeColumna: 1, hastaColumna: encabezados.length, hastaFila: Math.max(ultima, 2) },
    colorPestana: "DC2626",
  };
}

// ----------------------------------------------------------------------------
// Hoja 1: resumen
// ----------------------------------------------------------------------------

function hojaResumen(polizas: Poliza[], hoy: string): Hoja {
  const r = resumenCobranza(polizas, hoy);
  const filas: (Celda | string | number | null)[][] = [];
  const combinar: string[] = [];
  const altos: Record<number, number> = {};
  const COLS = 9;

  const unir = (fila: number, desde: number, hasta: number) => combinar.push(`${letraColumna(desde)}${fila}:${letraColumna(hasta)}${fila}`);
  const nueva = (celdas: (Celda | string | number | null)[]) => {
    filas.push(celdas);
    return filas.length; // número de fila (desde 1)
  };

  // Encabezado del reporte
  unir(nueva([{ v: "Cobranza · Valeri", e: { negrita: true, tamano: 20, color: AZUL } }]), 1, COLS);
  altos[1] = 34;
  unir(nueva([{ v: `Reporte al ${fechaLarga(hoy)} de ${hoy.slice(0, 4)}`, e: { color: GRIS, tamano: 12 } }]), 1, COLS);
  const filaFrase = nueva([{ v: r.frase, e: { cursiva: true, envolver: true } }]);
  unir(filaFrase, 1, COLS);
  altos[filaFrase] = 36;
  nueva([]);

  // Bloque 1: cómo va
  const tit1 = nueva([{ v: "Cómo va la cobranza", e: { negrita: true, tamano: 13, color: AZUL } }]);
  unir(tit1, 1, COLS);
  const h1 = nueva([
    { v: "Concepto", e: { ...ENCABEZADO, alinear: "izquierda" } },
    { v: "Pólizas", e: ENCABEZADO },
    { v: "Monto", e: ENCABEZADO },
    { v: "Qué sigue", e: { ...ENCABEZADO, alinear: "izquierda" } },
    ...Array.from({ length: COLS - 4 }, () => ({ v: null as null, e: ENCABEZADO })),
  ]);
  unir(h1, 4, COLS);

  const activas = polizas.filter((p) => p.estatus_manual !== "cancelada");
  const canceladas = polizas.length - activas.length;
  let sinFecha = 0;
  let montoPromesas = 0;
  for (const p of activas) {
    const { estado } = estadoDe(p, hoy);
    if (estado === "sin_fecha") sinFecha += 1;
    if (estado === "promesa") montoPromesas += montoDelProximoPago(p);
  }

  const lineas: { estado: EstadoCobro | "renueva" | "total" | "plano"; concepto: string; n: number; monto: number | null; sigue: string }[] = [
    { estado: "vencida", concepto: "Vencidas (incluye promesas incumplidas)", n: r.vencidas, monto: r.montoVencido, sigue: r.vencidas ? "Cobra primero: son las que más pesan." : "Nadie está atrasado." },
    { estado: "por_vencer", concepto: `Por vencer (próximos ${DIAS_AVISO} días)`, n: r.porVencer, monto: r.montoPorVencer, sigue: "Recuérdales antes de la fecha límite." },
    { estado: "promesa", concepto: "Promesas de pago en espera", n: r.promesas, monto: Math.round(montoPromesas), sigue: "Valeri avisa si no cumplen." },
    { estado: "al_corriente", concepto: "Pagadas (al corriente)", n: r.alCorriente, monto: null, sigue: `Su próximo recibo vence en más de ${DIAS_AVISO} días.` },
    { estado: "renueva", concepto: `Renuevan en los próximos ${DIAS_RENOVACION} días`, n: r.renuevan, monto: null, sigue: "Agenda una llamada para renovar." },
    { estado: "sin_fecha", concepto: "Sin fecha de pago", n: sinFecha, monto: null, sigue: "Captura su fecha límite para que Valeri la vigile." },
    { estado: "cancelada", concepto: "Canceladas", n: canceladas, monto: null, sigue: "Valeri ya no las cobra." },
    { estado: "total", concepto: "Pólizas activas (sin canceladas)", n: r.polizas, monto: null, sigue: "" },
    { estado: "plano", concepto: "Sin WhatsApp (activas)", n: r.sinWhatsapp, monto: null, sigue: "Agrega su WhatsApp para dejarles el mensaje listo." },
  ];
  for (const l of lineas) {
    const t = l.estado === "renueva" ? TONO_RENOVACION : l.estado === "total" || l.estado === "plano" ? null : TONO[l.estado];
    const negrita = l.estado === "total";
    const fila = nueva([
      { v: l.concepto, e: t ? { borde: true, negrita: true, color: t.letra, relleno: t.fondo } : { borde: true, negrita } },
      { v: l.n, e: { borde: true, alinear: "centro", formato: "entero", negrita: true } },
      { v: l.monto, e: DINERO },
      { v: l.sigue, e: TEXTO },
      ...Array.from({ length: COLS - 4 }, () => ({ v: null as null, e: TEXTO })),
    ]);
    unir(fila, 4, COLS);
  }
  nueva([]);

  // Bloque 2: por ramo
  const tit2 = nueva([{ v: "Por ramo", e: { negrita: true, tamano: 13, color: AZUL } }]);
  unir(tit2, 1, COLS);
  nueva(["Ramo", "Activas", "Vencidas", "Por vencer", "Promesas", "Pagadas", "Sin fecha", "Monto vencido", "Monto por vencer"].map((t, i) => ({ v: t, e: i === 0 ? { ...ENCABEZADO, alinear: "izquierda" as const } : ENCABEZADO })));
  altos[filas.length] = 30;

  const porRamo = new Map<string, { activas: number; vencidas: number; porVencer: number; promesas: number; pagadas: number; sinFecha: number; montoVencido: number; montoPorVencer: number }>();
  for (const p of activas) {
    const k = ramoDe(p);
    const g = porRamo.get(k) ?? { activas: 0, vencidas: 0, porVencer: 0, promesas: 0, pagadas: 0, sinFecha: 0, montoVencido: 0, montoPorVencer: 0 };
    const { estado } = estadoDe(p, hoy);
    g.activas += 1;
    if (estado === "vencida" || estado === "promesa_vencida") {
      g.vencidas += 1;
      g.montoVencido += montoDelProximoPago(p);
    } else if (estado === "por_vencer") {
      g.porVencer += 1;
      g.montoPorVencer += montoDelProximoPago(p);
    } else if (estado === "promesa") g.promesas += 1;
    else if (estado === "al_corriente") g.pagadas += 1;
    else if (estado === "sin_fecha") g.sinFecha += 1;
    porRamo.set(k, g);
  }
  const ramos = [...porRamo.entries()].sort((a, b) => b[1].activas - a[1].activas || a[0].localeCompare(b[0], "es"));
  const primeraRamo = filas.length + 1;
  const cuenta: Estilo = { borde: true, alinear: "centro", formato: "entero" };
  for (const [nombre, g] of ramos) {
    nueva([
      { v: nombre, e: { borde: true, negrita: true } },
      { v: g.activas, e: cuenta },
      { v: g.vencidas, e: cuenta },
      { v: g.porVencer, e: cuenta },
      { v: g.promesas, e: cuenta },
      { v: g.pagadas, e: cuenta },
      { v: g.sinFecha, e: cuenta },
      { v: g.montoVencido, e: DINERO },
      { v: g.montoPorVencer, e: DINERO },
    ]);
  }
  const ultimaRamo = filas.length;
  if (ramos.length) {
    const sumar = (col: number, clave: keyof (typeof ramos)[number][1], dinero: boolean): Celda => ({
      v: ramos.reduce((s, [, g]) => s + g[clave], 0),
      f: `SUM(${letraColumna(col)}${primeraRamo}:${letraColumna(col)}${ultimaRamo})`,
      e: { borde: true, negrita: true, relleno: "EEF0FF", ...(dinero ? { formato: "moneda" as const } : { alinear: "centro" as const, formato: "entero" as const }) },
    });
    nueva([
      { v: "Total", e: { borde: true, negrita: true, relleno: "EEF0FF" } },
      sumar(2, "activas", false),
      sumar(3, "vencidas", false),
      sumar(4, "porVencer", false),
      sumar(5, "promesas", false),
      sumar(6, "pagadas", false),
      sumar(7, "sinFecha", false),
      sumar(8, "montoVencido", true),
      sumar(9, "montoPorVencer", true),
    ]);
  } else {
    nueva([{ v: "Todavía no hay pólizas activas en tu cartera.", e: { cursiva: true, color: GRIS } }]);
  }
  nueva([]);
  const nota = nueva([
    { v: "Los montos son los del próximo recibo de cada póliza (el primer pago si todavía es ese). Las hojas «Por cobrar» y «Cartera completa» traen filtros en el encabezado.", e: { cursiva: true, color: GRIS, envolver: true } },
  ]);
  unir(nota, 1, COLS);
  altos[nota] = 32;

  return {
    nombre: "Resumen",
    anchos: [40, 10, 16, 12, 12, 12, 12, 16, 16],
    filas,
    altos,
    combinar,
    sinCuadricula: true,
    colorPestana: AZUL,
  };
}

/** Las tres hojas del Excel de cobranza, listas para `crearXlsx`. */
export function hojasCobranza(polizas: Poliza[], hoy: string): Hoja[] {
  return [hojaResumen(polizas, hoy), hojaPorCobrar(polizas, hoy), hojaCartera(polizas, hoy)];
}
