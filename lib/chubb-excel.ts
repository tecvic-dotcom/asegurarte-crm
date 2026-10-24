/**
 * Excel del reporte de Chubb Autos de Dana — puro (cliente y servidor), sin IA y sin costo.
 *
 * Analogía: la libreta de Dana impresa. Cuatro hojas, con lo que ves en pantalla (respeta tus filtros):
 *  1. Resumen: producción, prima pagada, renovaciones y recibos, más cortes por frecuencia, por mes y por cliente.
 *  2. Renovaciones: cada póliza con los días que le faltan, de la que vence primero a la última.
 *  3. Recibos pendientes: uno por renglón, del más atrasado al más lejano.
 *  4. Pólizas: todas, con sus primas y lo que Dana calculó, con filtros en el encabezado.
 */
import { fechaLarga } from "./fechas";
import {
  FRECUENCIAS,
  etiquetaMes,
  etiquetaRenovacion,
  etiquetaVencimiento,
  listaRecibos,
  resumenChubb,
  type EstadoRecibo,
  type InfoPoliza,
  type NivelRenovacion,
} from "./chubb-reglas";
import { serieExcel, type Celda, type Estilo, type Hoja } from "./xlsx-simple";

const AZUL = "2A22F5";
const GRIS = "6B7280";

const ENCABEZADO: Estilo = { negrita: true, color: "FFFFFF", relleno: AZUL, alinear: "centro", envolver: true, borde: true };
const TEXTO: Estilo = { borde: true };
const CENTRO: Estilo = { borde: true, alinear: "centro" };
const ENTERO: Estilo = { borde: true, alinear: "centro", formato: "entero" };
const DINERO: Estilo = { borde: true, formato: "moneda" };
const FECHA: Estilo = { borde: true, formato: "fecha", alinear: "centro" };
const SECCION: Estilo = { negrita: true, color: AZUL, tamano: 12 };
const TOTAL: Estilo = { negrita: true, relleno: "EEF0FF", borde: true };

const TONO_NIVEL: Record<NivelRenovacion, { fondo: string; letra: string; nombre: string }> = {
  vencida: { fondo: "FEE2E2", letra: "B91C1C", nombre: "Ya terminó" },
  urgente: { fondo: "FEE2E2", letra: "B91C1C", nombre: "Urgente (15 días o menos)" },
  pronto: { fondo: "FEF3C7", letra: "92400E", nombre: "Pronto (16 a 30 días)" },
  cerca: { fondo: "FEF9C3", letra: "854D0E", nombre: "Cerca (31 a 60 días)" },
  planear: { fondo: "DBEAFE", letra: "1E40AF", nombre: "A planear (61 a 90 días)" },
  lejos: { fondo: "F3F4F6", letra: "4B5563", nombre: "Lejos (más de 90 días)" },
};
const TONO_RECIBO: Record<EstadoRecibo, { fondo: string; letra: string; nombre: string }> = {
  vencido: { fondo: "FEE2E2", letra: "B91C1C", nombre: "Vencido" },
  hoy: { fondo: "FEF3C7", letra: "92400E", nombre: "Vence hoy" },
  proximo: { fondo: "FEF9C3", letra: "854D0E", nombre: "Próximo (30 días)" },
  futuro: { fondo: "F3F4F6", letra: "4B5563", nombre: "Más adelante" },
};

function fechaCelda(f: string | null | undefined): Celda {
  return { v: f ? serieExcel(f) : null, e: FECHA };
}

function vehiculoDe(i: InfoPoliza): string {
  return i.p.vehiculo ?? "(sin descripción)";
}

// ----------------------------------------------------------------------------
// Hoja 4: pólizas
// ----------------------------------------------------------------------------

function hojaPolizas(infos: InfoPoliza[]): Hoja {
  const encabezados = [
    "Año",
    "Mes emitida",
    "Póliza",
    "Asegurado",
    "Vehículo",
    "Inicio de vigencia",
    "Fin de vigencia",
    "Días para renovar",
    "Frecuencia de pago",
    "Prima neta",
    "Prima total",
    "Recibos pagados (est.)",
    "Recibos pendientes",
    "Prima neta pagada (est.)",
    "Prima neta por cobrar (est.)",
    "Por revisar",
  ];
  const ordenadas = [...infos].sort((a, b) => a.dias_renovar - b.dias_renovar || a.p.asegurado.localeCompare(b.p.asegurado, "es"));
  const datos: Celda[][] = ordenadas.map((i) => [
    { v: i.p.anio, e: ENTERO },
    { v: i.p.mes, e: ENTERO },
    { v: i.p.poliza, e: TEXTO },
    { v: i.p.asegurado, e: TEXTO },
    { v: vehiculoDe(i), e: TEXTO },
    fechaCelda(i.p.inicio),
    fechaCelda(i.p.fin),
    { v: i.dias_renovar, e: ENTERO },
    { v: FRECUENCIAS[i.p.frecuencia].nombre, e: CENTRO },
    { v: i.p.prima_neta, e: DINERO },
    { v: i.p.prima_total, e: DINERO },
    { v: `${i.recibos_pagados} de ${i.recibos_total}`, e: CENTRO },
    { v: i.recibos.length, e: ENTERO },
    { v: i.neta_pagada, e: DINERO },
    { v: i.neta_por_cobrar, e: DINERO },
    { v: i.avisos.map((a) => a.texto).join(" "), e: { borde: true, envolver: true } },
  ]);
  const ultima = datos.length + 1;
  const suma = (campo: (i: InfoPoliza) => number) => ordenadas.reduce((s, i) => s + campo(i), 0);
  const total: Celda[] = encabezados.map(() => ({ v: null, e: TOTAL }));
  total[8] = { v: "Total (cambia al filtrar)", e: { ...TOTAL, alinear: "derecha" } };
  const dinero = (col: string, valor: number): Celda => ({ v: valor, f: `SUBTOTAL(109,${col}2:${col}${ultima})`, e: { ...TOTAL, formato: "moneda" } });
  total[9] = dinero("J", suma((i) => i.p.prima_neta ?? 0));
  total[10] = dinero("K", suma((i) => i.p.prima_total ?? 0));
  total[13] = dinero("N", suma((i) => i.neta_pagada));
  total[14] = dinero("O", suma((i) => i.neta_por_cobrar));
  return {
    nombre: "Pólizas",
    anchos: [7, 12, 14, 36, 44, 13, 13, 11, 13, 14, 14, 13, 11, 15, 15, 50],
    filas: [encabezados.map((t) => ({ v: t, e: ENCABEZADO })), ...datos, total],
    altos: { 1: 34 },
    congelar: { filas: 1, columnas: 4 },
    filtro: { fila: 1, desdeColumna: 1, hastaColumna: encabezados.length, hastaFila: Math.max(ultima, 2) },
    colorPestana: "9CA3AF",
  };
}

// ----------------------------------------------------------------------------
// Hoja 2: renovaciones
// ----------------------------------------------------------------------------

function hojaRenovaciones(infos: InfoPoliza[]): Hoja {
  const encabezados = ["Cuándo", "Días", "Fin de vigencia", "Asegurado", "Póliza", "Vehículo", "Frecuencia de pago", "Prima neta", "Prima total", "Recibos pendientes"];
  const ordenadas = [...infos].sort((a, b) => a.dias_renovar - b.dias_renovar || a.p.asegurado.localeCompare(b.p.asegurado, "es"));
  const datos: Celda[][] = ordenadas.map((i) => {
    const t = TONO_NIVEL[i.nivel];
    return [
      { v: `${t.nombre.split(" (")[0]} · ${etiquetaRenovacion(i.dias_renovar)}`, e: { borde: true, negrita: true, color: t.letra, relleno: t.fondo } },
      { v: i.dias_renovar, e: ENTERO },
      fechaCelda(i.p.fin),
      { v: i.p.asegurado, e: TEXTO },
      { v: i.p.poliza, e: TEXTO },
      { v: vehiculoDe(i), e: TEXTO },
      { v: FRECUENCIAS[i.p.frecuencia].nombre, e: CENTRO },
      { v: i.p.prima_neta, e: DINERO },
      { v: i.p.prima_total, e: DINERO },
      { v: i.recibos.length, e: ENTERO },
    ];
  });
  const ultima = datos.length + 1;
  const total: Celda[] = encabezados.map(() => ({ v: null, e: TOTAL }));
  total[6] = { v: "Total (cambia al filtrar)", e: { ...TOTAL, alinear: "derecha" } };
  total[7] = { v: ordenadas.reduce((s, i) => s + (i.p.prima_neta ?? 0), 0), f: `SUBTOTAL(109,H2:H${ultima})`, e: { ...TOTAL, formato: "moneda" } };
  total[8] = { v: ordenadas.reduce((s, i) => s + (i.p.prima_total ?? 0), 0), f: `SUBTOTAL(109,I2:I${ultima})`, e: { ...TOTAL, formato: "moneda" } };
  return {
    nombre: "Renovaciones",
    anchos: [34, 8, 13, 36, 14, 44, 13, 14, 14, 11],
    filas: [encabezados.map((t) => ({ v: t, e: ENCABEZADO })), ...datos, total],
    altos: { 1: 34 },
    congelar: { filas: 1, columnas: 1 },
    filtro: { fila: 1, desdeColumna: 1, hastaColumna: encabezados.length, hastaFila: Math.max(ultima, 2) },
    colorPestana: "F59E0B",
  };
}

// ----------------------------------------------------------------------------
// Hoja 3: recibos pendientes
// ----------------------------------------------------------------------------

function hojaRecibos(infos: InfoPoliza[]): Hoja {
  const encabezados = ["Estado", "Días", "Fecha del recibo", "Asegurado", "Póliza", "Vehículo", "Frecuencia de pago", "Recibo", "Importe aprox.", "Fecha calculada por Dana"];
  const lista = listaRecibos(infos, "todos");
  const datos: Celda[][] = lista.map((r) => {
    const t = TONO_RECIBO[r.estado];
    return [
      { v: `${t.nombre.split(" (")[0]} · ${etiquetaVencimiento(r.dias)}`, e: { borde: true, negrita: true, color: t.letra, relleno: t.fondo } },
      { v: r.dias, e: ENTERO },
      fechaCelda(r.fecha),
      { v: r.info.p.asegurado, e: TEXTO },
      { v: r.info.p.poliza, e: TEXTO },
      { v: vehiculoDe(r.info), e: TEXTO },
      { v: FRECUENCIAS[r.info.p.frecuencia].nombre, e: CENTRO },
      { v: `${r.numero} de ${r.de}`, e: CENTRO },
      { v: r.importe === null ? null : Math.round(r.importe * 100) / 100, e: DINERO },
      { v: r.calculado ? "Sí (el Excel no traía la fecha)" : "", e: CENTRO },
    ];
  });
  const ultima = datos.length + 1;
  const total: Celda[] = encabezados.map(() => ({ v: null, e: TOTAL }));
  total[7] = { v: "Total (cambia al filtrar)", e: { ...TOTAL, alinear: "derecha" } };
  total[8] = { v: lista.reduce((s, r) => s + (r.importe ?? 0), 0), f: `SUBTOTAL(109,I2:I${ultima})`, e: { ...TOTAL, formato: "moneda" } };
  return {
    nombre: "Recibos pendientes",
    anchos: [36, 8, 14, 36, 14, 44, 13, 10, 14, 30],
    filas: [encabezados.map((t) => ({ v: t, e: ENCABEZADO })), ...datos, total],
    altos: { 1: 34 },
    congelar: { filas: 1, columnas: 1 },
    filtro: { fila: 1, desdeColumna: 1, hastaColumna: encabezados.length, hastaFila: Math.max(ultima, 2) },
    colorPestana: "EF4444",
  };
}

// ----------------------------------------------------------------------------
// Hoja 1: resumen
// ----------------------------------------------------------------------------

function hojaResumen(infos: InfoPoliza[], hoy: string, nota: string): Hoja {
  const r = resumenChubb(infos);
  const COLS = 5;
  const filas: (Celda | string | number | null)[][] = [];
  const altos: Record<number, number> = {};
  const combinar: string[] = [];
  const nueva = (f: (Celda | string | number | null)[]): number => {
    filas.push(f);
    return filas.length;
  };
  const unir = (fila: number) => combinar.push(`A${fila}:${String.fromCharCode(64 + COLS)}${fila}`);
  const seccion = (t: string) => {
    nueva([]);
    nueva([{ v: t, e: SECCION }]);
  };
  const encabezado = (...t: string[]) => nueva(t.map((v) => ({ v, e: ENCABEZADO })));
  const dato = (etiqueta: string, v: number | string, e: Estilo = ENTERO, detalle = "") =>
    nueva([{ v: etiqueta, e: TEXTO }, { v, e }, { v: detalle, e: { borde: true, cursiva: true, color: GRIS } }]);

  const titulo = nueva([{ v: "Chubb Autos · reporte de Dana", e: { negrita: true, tamano: 16, color: AZUL } }]);
  unir(titulo);
  altos[titulo] = 24;
  const sub = nueva([{ v: `Al ${fechaLarga(hoy)} · ${r.polizas} pólizas${nota ? ` · ${nota}` : ""}`, e: { color: GRIS } }]);
  unir(sub);

  seccion("Producción");
  dato("Pólizas", r.polizas);
  dato("Vigentes", r.vigentes);
  dato("Ya vencidas (terminó su vigencia)", r.vencidas);
  dato("Prima neta", r.prima_neta, DINERO);
  dato("Prima total (con IVA y gastos)", r.prima_total, DINERO);
  dato("Prima neta pagada (estimada)", r.neta_pagada, DINERO, `${r.pct_pagado}% de la prima neta`);
  dato("Prima neta por cobrar (estimada)", r.neta_por_cobrar, DINERO);
  dato("Prima neta promedio por póliza", r.neta_promedio, DINERO);

  seccion("Renovaciones");
  encabezado("Ventana", "Pólizas", "Prima neta", "Prima total");
  const ren = r.renovaciones;
  for (const [nombre, m] of [
    ["Ya terminaron su vigencia", ren.vencidas],
    ["Próximos 15 días", ren.d15],
    ["Próximos 30 días", ren.d30],
    ["Próximos 60 días", ren.d60],
    ["Próximos 90 días", ren.d90],
  ] as const) {
    nueva([{ v: nombre, e: TEXTO }, { v: m.n, e: ENTERO }, { v: m.neta, e: DINERO }, { v: m.total, e: DINERO }]);
  }

  seccion("Recibos pendientes");
  encabezado("Concepto", "Recibos", "Importe aprox.");
  const rc = r.recibos;
  for (const [nombre, g] of [
    ["Vencidos", rc.vencidos],
    ["Vencen hoy", rc.hoy],
    ["Próximos 7 días", rc.d7],
    ["Próximos 30 días", rc.d30],
  ] as const) {
    nueva([{ v: nombre, e: TEXTO }, { v: g.n, e: ENTERO }, { v: g.importe, e: DINERO }]);
  }
  nueva([{ v: "Todos los pendientes", e: TOTAL }, { v: rc.pendientes, e: { ...TOTAL, alinear: "centro", formato: "entero" } }, { v: rc.importe_pendiente, e: { ...TOTAL, formato: "moneda" } }]);

  seccion("Por frecuencia de pago");
  encabezado("Frecuencia", "Pólizas", "Prima neta", "Prima total", "Con recibos pendientes");
  for (const f of r.por_frecuencia) {
    nueva([{ v: FRECUENCIAS[f.frecuencia].nombre, e: TEXTO }, { v: f.polizas, e: ENTERO }, { v: f.neta, e: DINERO }, { v: f.total, e: DINERO }, { v: f.con_pendientes, e: ENTERO }]);
  }

  seccion("Pólizas emitidas por mes");
  encabezado("Mes", "Pólizas", "Prima neta");
  for (const m of r.por_mes_emision) nueva([{ v: etiquetaMes(m.clave), e: TEXTO }, { v: m.polizas, e: ENTERO }, { v: m.neta, e: DINERO }]);

  seccion("Renovaciones por mes (fin de vigencia)");
  encabezado("Mes", "Pólizas", "Prima neta", "Prima total");
  for (const m of r.por_mes_renovacion) nueva([{ v: etiquetaMes(m.clave), e: TEXTO }, { v: m.polizas, e: ENTERO }, { v: m.neta, e: DINERO }, { v: m.total, e: DINERO }]);

  seccion("Clientes con más prima neta");
  encabezado("Cliente", "Pólizas", "Prima neta");
  for (const c of r.top_clientes) nueva([{ v: c.nombre, e: TEXTO }, { v: c.polizas, e: ENTERO }, { v: c.neta, e: DINERO }]);

  if (r.avisos.length) {
    seccion("Por revisar en tu Excel");
    encabezado("Qué pasa", "Pólizas");
    for (const a of r.avisos) nueva([{ v: a.titulo, e: TEXTO }, { v: a.polizas, e: ENTERO }]);
  }

  nueva([]);
  const aviso = nueva([
    {
      v: "Lo «pagado» y los importes de cada recibo son estimaciones: la prima se reparte parejo entre los recibos y se asume que un recibo ya está pagado cuando su fecha no aparece en la lista de pendientes de tu Excel.",
      e: { cursiva: true, color: GRIS, envolver: true },
    },
  ]);
  unir(aviso);
  altos[aviso] = 44;

  return { nombre: "Resumen", anchos: [40, 14, 16, 16, 22], filas, altos, combinar, sinCuadricula: true, colorPestana: AZUL };
}

/** Las cuatro hojas del Excel de Chubb Autos, listas para `crearXlsx`. `nota` dice qué filtros estaban puestos. */
export function hojasChubb(infos: InfoPoliza[], hoy: string, nota = ""): Hoja[] {
  return [hojaResumen(infos, hoy, nota), hojaRenovaciones(infos), hojaRecibos(infos), hojaPolizas(infos)];
}
