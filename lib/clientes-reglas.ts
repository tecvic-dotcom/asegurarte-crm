/**
 * Reglas del reporte «Clientes por ramo» de Clara (cliente y servidor, sin IA y sin costo): agrupa la cartera de pólizas por
 * ramo y arma, para cada renglón, su vigencia y su estatus. También produce el texto para copiar y el CSV.
 */
import { COLOR_ESTADO, DIAS_RENOVACION, FORMAS_PAGO, ICONO_ESTADO, estadoDe, etiquetaEstado, pesosExactos } from "./cobranza-reglas";
import { diasEntre, fechaCorta } from "./fechas";
import { RAMOS } from "./ramos";
import type { EstadoCobro, Poliza, Ramo } from "./types";

/** "8110000001" → "81 1000 0001"; si no son 10 dígitos devuelve el texto tal cual. */
export function formatoWhatsapp(w: string): string {
  return w.length === 10 ? `${w.slice(0, 2)} ${w.slice(2, 6)} ${w.slice(6)}` : w;
}

function conAnio(f: string): string {
  return `${fechaCorta(f)} ${f.slice(0, 4)}`;
}

/** «4 nov 2025 – 4 nov 2026», «hasta 4 nov 2026» o «Sin vigencia». */
export function textoVigencia(p: Pick<Poliza, "inicio" | "renovacion">): string {
  if (p.inicio && p.renovacion) return `${conAnio(p.inicio)} – ${conAnio(p.renovacion)}`;
  if (p.renovacion) return `hasta ${conAnio(p.renovacion)}`;
  if (p.inicio) return `desde ${conAnio(p.inicio)}`;
  return "Sin vigencia";
}

export type TonoVigencia = "vencida" | "pronto";

/** Aviso bajo la vigencia: ya venció sin renovar, o renueva en los próximos DIAS_RENOVACION días. */
export function notaVigencia(p: Poliza, hoy: string): { texto: string; tono: TonoVigencia } | null {
  if (p.estatus_manual === "cancelada" || !p.renovacion) return null;
  const d = diasEntre(hoy, p.renovacion);
  if (d < 0) return { texto: `Vigencia vencida hace ${-d} ${-d === 1 ? "día" : "días"}`, tono: "vencida" };
  if (d <= DIAS_RENOVACION) return { texto: d === 0 ? "Renueva hoy" : `Renueva en ${d} ${d === 1 ? "día" : "días"}`, tono: "pronto" };
  return null;
}

export interface FilaCliente {
  poliza: Poliza;
  estado: EstadoCobro;
  /** «Vencida hace 12 días», «Al corriente»… */
  etiqueta: string;
  color: string;
  icono: string;
  vigencia: string;
  aviso: { texto: string; tono: TonoVigencia } | null;
  /** «Mensual · $1,850» */
  cobro: string;
}

export interface GrupoRamo {
  /** null = pólizas sin ramo definido. */
  ramo: Ramo | null;
  nombre: string;
  icono: string;
  filas: FilaCliente[];
}

/** "$1,850" · o, si el primer pago es distinto: "1er pago $2,150 · luego $1,850". Null si no hay monto. */
function textoDeMontos(p: Poliza): string | null {
  // Con centavos cuando los hay: en un cobro importan ($4,930.29, no $4,930).
  if (p.forma_pago !== "anual" && p.primer_pago > 0) {
    return `1er pago ${pesosExactos(p.primer_pago)}${p.monto_pago > 0 ? ` · luego ${pesosExactos(p.monto_pago)}` : ""}`;
  }
  return p.monto_pago > 0 ? pesosExactos(p.monto_pago) : null;
}

/** Cómo se paga una póliza: "Trimestral · 1er pago $4,930.29 · luego $3,612.97" (o "Anual · $22,000"). */
export function textoDeCobro(p: Poliza): string {
  const forma = FORMAS_PAGO.find((f) => f.id === p.forma_pago)?.nombre ?? "";
  return [forma, textoDeMontos(p)].filter(Boolean).join(" · ");
}

export function filaDe(p: Poliza, hoy: string): FilaCliente {
  const { estado, dias } = estadoDe(p, hoy);
  return {
    poliza: p,
    estado,
    etiqueta: etiquetaEstado(estado, dias, p),
    color: COLOR_ESTADO[estado],
    icono: ICONO_ESTADO[estado],
    vigencia: textoVigencia(p),
    aviso: notaVigencia(p, hoy),
    cobro: textoDeCobro(p),
  };
}

export type FiltroEstatus = "todos" | "vencidas" | "por_vencer" | "renuevan" | "al_corriente";

export const FILTROS_ESTATUS: { id: FiltroEstatus; nombre: string }[] = [
  { id: "todos", nombre: "Todos los estatus" },
  { id: "vencidas", nombre: "Pago vencido" },
  { id: "por_vencer", nombre: "Pago por vencer" },
  { id: "renuevan", nombre: "Por renovar o vigencia vencida" },
  { id: "al_corriente", nombre: "Al corriente" },
];

function cumple(f: FilaCliente, filtro: FiltroEstatus): boolean {
  switch (filtro) {
    case "todos":
      return true;
    case "vencidas":
      return f.estado === "vencida" || f.estado === "promesa_vencida";
    case "por_vencer":
      return f.estado === "por_vencer";
    case "renuevan":
      return f.aviso !== null;
    case "al_corriente":
      return f.estado === "al_corriente" && f.aviso === null;
  }
}

export interface OpcionesListado {
  /** null = todos los ramos. */
  ramo: Ramo | "sin_ramo" | null;
  busca: string;
  estatus: FiltroEstatus;
  conCanceladas: boolean;
}

/** La cartera agrupada por ramo (en el orden de siempre y, al final, las que no tienen ramo), cada grupo por nombre. */
export function armarListado(polizas: Poliza[], hoy: string, o: OpcionesListado): GrupoRamo[] {
  const q = o.busca.trim().toLowerCase();
  const filas = polizas
    .filter((p) => o.conCanceladas || p.estatus_manual !== "cancelada")
    .filter((p) => !q || [p.asegurado, p.numero, p.aseguradora, p.whatsapp, formatoWhatsapp(p.whatsapp)].some((x) => x.toLowerCase().includes(q)))
    .map((p) => filaDe(p, hoy))
    .filter((f) => cumple(f, o.estatus));

  const orden = (a: FilaCliente, b: FilaCliente) => a.poliza.asegurado.localeCompare(b.poliza.asegurado, "es");
  const grupos: GrupoRamo[] = RAMOS.map((r) => ({
    ramo: r.id as Ramo | null,
    nombre: r.nombre,
    icono: r.icono,
    filas: filas.filter((f) => f.poliza.ramo === r.id).sort(orden),
  }));
  grupos.push({ ramo: null, nombre: "Sin ramo definido", icono: "flat-color-icons:faq", filas: filas.filter((f) => f.poliza.ramo === null).sort(orden) });

  return grupos.filter((g) => g.filas.length > 0 && (o.ramo === null || (o.ramo === "sin_ramo" ? g.ramo === null : g.ramo === o.ramo)));
}

export function totalClientes(grupos: GrupoRamo[]): number {
  return grupos.reduce((n, g) => n + g.filas.length, 0);
}

/** Cuántas pólizas tiene cada ramo con los mismos filtros de búsqueda y estatus (para los números de los botones de ramo). */
export function conteoPorRamo(polizas: Poliza[], hoy: string, o: Omit<OpcionesListado, "ramo">): { todos: number; porRamo: Map<Ramo | "sin_ramo", number> } {
  const grupos = armarListado(polizas, hoy, { ...o, ramo: null });
  const porRamo = new Map<Ramo | "sin_ramo", number>();
  for (const g of grupos) porRamo.set(g.ramo ?? "sin_ramo", g.filas.length);
  return { todos: totalClientes(grupos), porRamo };
}

/** El listado como texto para copiar o mandar por WhatsApp. */
export function textoListado(grupos: GrupoRamo[], hoyTexto: string): string {
  const total = totalClientes(grupos);
  const lineas = [`CLIENTES POR RAMO · ${hoyTexto}`, `${total} ${total === 1 ? "póliza" : "pólizas"}`];
  for (const g of grupos) {
    lineas.push("", `${g.nombre.toUpperCase()} (${g.filas.length})`);
    g.filas.forEach((f, i) => {
      const p = f.poliza;
      const partes = [
        p.asegurado,
        p.aseguradora || null,
        p.whatsapp ? formatoWhatsapp(p.whatsapp) : "sin WhatsApp",
        f.vigencia,
        f.etiqueta + (f.aviso ? ` · ${f.aviso.texto}` : ""),
      ].filter(Boolean);
      lineas.push(`${i + 1}. ${partes.join(" · ")}`);
    });
  }
  return lineas.join("\n");
}

function celdaCsv(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** El listado como CSV (con marca BOM para que Excel respete los acentos). */
export function csvListado(grupos: GrupoRamo[]): string {
  const cab = ["Ramo", "Cliente", "Aseguradora", "Póliza", "WhatsApp", "Vigencia desde", "Vigencia hasta", "Estatus de pago", "Aviso de vigencia", "Forma de pago", "Primer pago", "Monto de cada pago (subsecuentes)"];
  const filas = grupos.flatMap((g) =>
    g.filas.map((f) => {
      const p = f.poliza;
      return [
        g.nombre,
        p.asegurado,
        p.aseguradora,
        p.numero,
        p.whatsapp,
        p.inicio ?? "",
        p.renovacion ?? "",
        f.etiqueta,
        f.aviso?.texto ?? "",
        FORMAS_PAGO.find((x) => x.id === p.forma_pago)?.nombre ?? "",
        p.forma_pago !== "anual" && p.primer_pago > 0 ? String(p.primer_pago) : "",
        p.monto_pago > 0 ? String(p.monto_pago) : "",
      ]
        .map(celdaCsv)
        .join(",");
    }),
  );
  return "﻿" + [cab.join(","), ...filas].join("\n");
}
