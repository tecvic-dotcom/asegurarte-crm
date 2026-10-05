/**
 * Formatos del Panel de Mando: cifras legibles a un brazo de distancia y el
 * semáforo de cada número (siempre ícono + palabra, nunca solo color: así lo
 * entiende también alguien que no distingue rojo de verde).
 */
import type { EstadoSemaforo } from "@/lib/types";

export const SEMAFORO: Record<EstadoSemaforo, { color: string; icono: string; palabra: string }> = {
  bien: { color: "var(--green)", icono: "flat-color-icons:ok", palabra: "Bien" },
  atencion: { color: "var(--amber)", icono: "flat-color-icons:medium-priority", palabra: "Atención" },
  alerta: { color: "var(--red)", icono: "flat-color-icons:high-priority", palabra: "Alerta" },
  neutral: { color: "var(--ink-mute)", icono: "flat-color-icons:info", palabra: "Info" },
};

/** $8,400 · $128 mil · $1.2 M (el formato compacto es para espacios chicos). */
export function dinero(n: number, compacto = false): string {
  const abs = Math.abs(n);
  const signo = n < 0 ? "-" : "";
  if (compacto && abs >= 1_000_000) {
    return `${signo}$${(abs / 1_000_000).toLocaleString("es-MX", { maximumFractionDigits: 1 })} M`;
  }
  if (compacto && abs >= 100_000) {
    return `${signo}$${Math.round(abs / 1000).toLocaleString("es-MX")} mil`;
  }
  return `${signo}$${Math.round(abs).toLocaleString("es-MX")}`;
}

/** Eje de las gráficas: $0 · $5 mil · $10 mil */
export function dineroEje(n: number): string {
  if (n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("es-MX", { maximumFractionDigits: 1 })} M`;
  if (n >= 1000) return `$${(n / 1000).toLocaleString("es-MX", { maximumFractionDigits: 1 })} mil`;
  return `$${n}`;
}

export interface Cambio {
  texto: string;
  /** 1 = subió, -1 = bajó, 0 = igual */
  direccion: 1 | -1 | 0;
}

/** Comparación contra el periodo anterior: "▲ 12%", "▼ 8%", "▲ +3", "= igual". */
export function cambio(valor: number, anterior: number | null, formato: "numero" | "moneda"): Cambio | null {
  if (anterior === null) return null;
  if (valor === anterior) return { texto: "= igual", direccion: 0 };
  const direccion = valor > anterior ? 1 : -1;
  const flecha = direccion === 1 ? "▲" : "▼";
  // Si antes ibas en cero o en negativo, un porcentaje confunde ("▲ 1100%"): mejor la diferencia.
  if (anterior <= 0 || formato === "numero") {
    const diff = Math.abs(valor - anterior);
    const cifra = formato === "moneda" ? dinero(diff, true) : String(diff);
    return { texto: `${flecha} ${direccion === 1 ? "+" : "−"}${cifra}`, direccion };
  }
  const pct = Math.round((Math.abs(valor - anterior) / Math.abs(anterior)) * 100);
  return { texto: `${flecha} ${pct}%`, direccion };
}

/** Color del cambio: verde si es bueno, rojo si es malo (en gastos, subir es malo). */
export function colorCambio(c: Cambio, subirEsBueno: boolean): string {
  if (c.direccion === 0) return "var(--ink-mute)";
  return (c.direccion === 1) === subirEsBueno ? "var(--green)" : "var(--red)";
}

/** Escala "bonita" para el eje: 0, 5 mil, 10 mil… en vez de 0, 4,317, 8,634. */
export function maximoBonito(n: number): number {
  if (n <= 0) return 1000;
  const potencia = 10 ** Math.floor(Math.log10(n));
  for (const paso of [1, 2, 2.5, 5, 10]) {
    if (n <= paso * potencia) return paso * potencia;
  }
  return 10 * potencia;
}
