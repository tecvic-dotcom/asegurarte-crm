"use client";

import type { CSSProperties, ReactNode } from "react";
import { Icon } from "@iconify/react";
import type { EstadoRecibo, NivelRenovacion } from "@/lib/chubb-reglas";

/** Color de cada nivel de urgencia (siempre con palabra al lado, nunca solo color). */
export const COLOR_NIVEL: Record<NivelRenovacion, string> = {
  vencida: "var(--red)",
  urgente: "var(--red)",
  pronto: "var(--amber)",
  cerca: "var(--amber)",
  planear: "var(--sky)",
  lejos: "var(--ink-mute)",
};

export const PALABRA_NIVEL: Record<NivelRenovacion, string> = {
  vencida: "Ya terminó",
  urgente: "Urgente",
  pronto: "Pronto",
  cerca: "Cerca",
  planear: "A planear",
  lejos: "Lejos",
};

export const COLOR_RECIBO: Record<EstadoRecibo, string> = {
  vencido: "var(--red)",
  hoy: "var(--amber)",
  proximo: "var(--sky)",
  futuro: "var(--ink-mute)",
};

export const PALABRA_RECIBO: Record<EstadoRecibo, string> = {
  vencido: "Vencido",
  hoy: "Vence hoy",
  proximo: "Próximo",
  futuro: "Más adelante",
};

/** Tarjeta de un indicador: el número grande, qué es, y una línea de contexto. */
export function Indicador({
  titulo,
  valor,
  detalle,
  icono,
  tono,
  onClick,
}: {
  titulo: string;
  valor: string;
  detalle?: ReactNode;
  icono: string;
  /** Color del número cuando algo pide atención. */
  tono?: string;
  onClick?: () => void;
}) {
  const cuerpo = (
    <>
      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft">
        <Icon icon={icono} width={18} aria-hidden /> {titulo}
      </span>
      <span className="mt-1 text-[24px] font-bold leading-tight text-ink md:text-[26px]" style={tono ? { color: tono } : undefined}>
        {valor}
      </span>
      {detalle && <span className="mt-auto pt-1 text-xs text-ink-mute">{detalle}</span>}
    </>
  );
  const clases = "glass flex min-h-[116px] flex-col rounded-2xl p-3.5 text-left sm:p-4";
  return onClick ? (
    <button type="button" onClick={onClick} className={`${clases} transition-colors hover:border-brand-2`}>
      {cuerpo}
    </button>
  ) : (
    <div className={clases}>{cuerpo}</div>
  );
}

/** Botones tipo pastilla para elegir una opción (ventanas de tiempo, vistas). */
export function Pastillas<T extends string>({
  valor,
  opciones,
  onCambio,
  etiqueta,
}: {
  valor: T;
  opciones: { id: T; nombre: string; cuenta?: number; tono?: string }[];
  onCambio: (id: T) => void;
  etiqueta: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={valor === o.id}
          onClick={() => onCambio(o.id)}
          className={`min-h-[40px] rounded-xl border px-3.5 text-sm transition-colors ${
            valor === o.id ? "border-brand-2/70 bg-brand/25 font-semibold text-ink" : "border-line bg-glass text-ink-soft hover:text-ink"
          }`}
        >
          {o.nombre}
          {o.cuenta !== undefined && (
            <span
              className="ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold"
              style={{ background: "color-mix(in srgb, var(--ink) 12%, transparent)", color: o.tono && o.cuenta > 0 ? o.tono : undefined }}
            >
              {o.cuenta}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Relleno de una barra. Usa un borde (no un fondo) para que también salga al imprimir o guardar en PDF. */
export function Relleno({ pct, color, alto = 12 }: { pct: number; color: string; alto?: number }) {
  return <span aria-hidden className="block rounded-full" style={{ width: `${pct}%`, height: 0, borderTop: `${alto}px solid ${color}` }} />;
}

/**
 * Barra horizontal con su etiqueta: sirve para meses, frecuencias y clientes.
 * Con `onClick` toda la fila es un botón que abre su desglose (`children`) debajo de ella.
 */
export function BarraFila({
  etiqueta,
  valor,
  maximo,
  texto,
  color = "var(--brand-2)",
  anchoEtiqueta = "8.5rem",
  onClick,
  abierta = false,
  children,
}: {
  etiqueta: string;
  valor: number;
  maximo: number;
  texto: ReactNode;
  color?: string;
  /** Ancho de la columna de la etiqueta (más ancho para nombres de personas). */
  anchoEtiqueta?: string;
  onClick?: () => void;
  abierta?: boolean;
  children?: ReactNode;
}) {
  const ancho = maximo > 0 ? Math.max(valor > 0 ? 3 : 0, Math.round((valor / maximo) * 100)) : 0;
  const rejilla = "grid grid-cols-[min(var(--ancho-etiqueta),9.5rem)_1fr] items-center gap-x-3 gap-y-0.5 text-sm sm:grid-cols-[var(--ancho-etiqueta)_1fr_auto]";
  const estilo = { "--ancho-etiqueta": anchoEtiqueta } as CSSProperties;
  const contenido = (
    <>
      <span className="flex min-w-0 items-center gap-1.5 text-ink-soft">
        {onClick && (
          <span aria-hidden className={`shrink-0 text-[10px] text-ink-mute transition-transform ${abierta ? "rotate-90" : ""}`}>
            ▶
          </span>
        )}
        <span className="truncate" title={etiqueta}>
          {etiqueta}
        </span>
      </span>
      <span className="h-3 rounded-full bg-bg-3/80" aria-hidden>
        <Relleno pct={ancho} color={color} />
      </span>
      <span className="col-span-2 text-xs text-ink-mute sm:col-span-1 sm:text-right sm:text-sm">{texto}</span>
    </>
  );
  return (
    <li>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-expanded={abierta}
          className={`${rejilla} -mx-2 w-[calc(100%+1rem)] rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-bg-3/50 ${abierta ? "bg-bg-3/40" : ""}`}
          style={estilo}
        >
          {contenido}
        </button>
      ) : (
        <div className={rejilla} style={estilo}>
          {contenido}
        </div>
      )}
      {abierta && children}
    </li>
  );
}

/** Aviso corto con ícono (información, ojo o alerta). */
export function Nota({ children, tono = "info" }: { children: ReactNode; tono?: "info" | "ojo" }) {
  return (
    <p
      className="flex items-start gap-2 rounded-xl border px-3 py-2 text-xs text-ink-soft sm:text-[13px]"
      style={{ borderColor: tono === "ojo" ? "color-mix(in srgb, var(--amber) 50%, transparent)" : "var(--line)", background: tono === "ojo" ? "color-mix(in srgb, var(--amber) 10%, transparent)" : undefined }}
    >
      <Icon icon={tono === "ojo" ? "flat-color-icons:medium-priority" : "flat-color-icons:info"} width={16} className="mt-px shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Copia al portapapeles (con plan B para navegadores viejos). */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = texto;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

/** Las pantallas de Dana. */
export type VistaDana = "resumen" | "renovaciones" | "recibos" | "polizas" | "revisar";

/** Pastillita de dato dentro de una fila (póliza, frecuencia, fecha…). */
export function Dato({ children, titulo }: { children: ReactNode; titulo?: string }) {
  return (
    <span title={titulo} className="rounded-lg border border-line bg-bg-3/50 px-2 py-0.5 text-xs text-ink-soft">
      {children}
    </span>
  );
}
