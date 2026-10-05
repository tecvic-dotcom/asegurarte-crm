/**
 * Reglas de tus finanzas (cliente-safe): categorías y validación de un
 * movimiento. El MISMO criterio se usa en el formulario (navegador) y en el
 * servidor antes de guardar — así nada raro llega a tu Supabase.
 */
import { esFechaValida } from "./fechas";
import { esRamo } from "./ramos";
import type { NuevoMovimiento, TipoMovimiento } from "./types";

export const CATEGORIAS_INGRESO = [
  "Comisiones de pólizas nuevas",
  "Comisiones de renovaciones",
  "Bonos y premios",
  "Otros ingresos",
];

export const CATEGORIAS_GASTO = [
  "Publicidad",
  "Herramientas y software",
  "Teléfono e internet",
  "Transporte y gasolina",
  "Comidas con clientes",
  "Oficina y papelería",
  "Capacitación",
  "Impuestos",
  "Comisiones bancarias",
  "Otros gastos",
];

export function categoriasDe(tipo: TipoMovimiento): string[] {
  return tipo === "ingreso" ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO;
}

/** Tope de sentido común: un movimiento de más de 50 millones casi seguro es un error de dedo. */
export const MONTO_MAXIMO = 50_000_000;

export type ResultadoMovimiento = { ok: true; movimiento: NuevoMovimiento } | { ok: false; error: string };

/** Revisa y limpia un movimiento. Nunca inventa: si algo no cuadra, lo rechaza con un mensaje claro. */
export function validarMovimiento(entrada: unknown): ResultadoMovimiento {
  if (!entrada || typeof entrada !== "object") return { ok: false, error: "El movimiento viene vacío." };
  const m = entrada as Record<string, unknown>;

  const fecha = String(m.fecha ?? "").trim();
  if (!esFechaValida(fecha) || fecha < "2000-01-01" || fecha > "2100-12-31") {
    return { ok: false, error: "La fecha no es válida (ejemplo: 2026-10-04)." };
  }

  const tipo = m.tipo;
  if (tipo !== "ingreso" && tipo !== "gasto") {
    return { ok: false, error: "Indica si el dinero entró o salió." };
  }

  const monto =
    typeof m.monto === "number" ? m.monto : Number(String(m.monto ?? "").replace(/[$,\s]/g, ""));
  if (!Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: "El monto debe ser un número mayor a 0 (ejemplo: 8400)." };
  }
  if (monto > MONTO_MAXIMO) {
    return { ok: false, error: "El monto se ve demasiado grande; revisa que no sobre un cero." };
  }

  const concepto = String(m.concepto ?? "").trim().slice(0, 200);
  if (!concepto) {
    return { ok: false, error: "Escribe un concepto corto (ejemplo: Comisión vida octubre)." };
  }

  const categoria =
    String(m.categoria ?? "").trim().slice(0, 60) || (tipo === "ingreso" ? "Otros ingresos" : "Otros gastos");

  const ramo = m.ramo === undefined || m.ramo === null || m.ramo === "" ? null : m.ramo;
  if (ramo !== null && !esRamo(ramo)) {
    return { ok: false, error: "El ramo no es válido." };
  }

  return {
    ok: true,
    movimiento: {
      fecha,
      concepto,
      tipo,
      monto: Math.round(monto * 100) / 100,
      categoria,
      ramo,
      estado: m.estado === "por_confirmar" ? "por_confirmar" : "confirmado",
      conciliado: m.conciliado === true,
      notas: String(m.notas ?? "").trim().slice(0, 500),
    },
  };
}
