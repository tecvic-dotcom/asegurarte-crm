"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import type { KpiPanel } from "@/lib/types";
import { SEMAFORO, cambio, colorCambio, dinero } from "./formato";

const ICONOS: Record<KpiPanel["id"], string> = {
  polizas: "flat-color-icons:approval",
  entro: "flat-color-icons:bullish",
  salio: "flat-color-icons:bearish",
  quedo: "flat-color-icons:sales-performance",
};

/**
 * Una de las 4 tarjetas grandes del Panel. El número manda; la etiqueta apoya.
 * Tócala para ver qué significa. Si algo necesita tu atención, el borde se
 * pinta y aparece el aviso con ícono + palabra (nunca solo el color).
 */
export function TarjetaKpi({ kpi, etiquetaAnterior }: { kpi: KpiPanel; etiquetaAnterior: string }) {
  const [abierta, setAbierta] = useState(false);
  const s = SEMAFORO[kpi.estado];
  const c = cambio(kpi.valor, kpi.anterior, kpi.formato);
  const valor = kpi.formato === "moneda" ? dinero(kpi.valor, true) : kpi.valor.toLocaleString("es-MX");
  const conSenal = kpi.estado === "atencion" || kpi.estado === "alerta";

  return (
    <button
      type="button"
      onClick={() => setAbierta((v) => !v)}
      aria-expanded={abierta}
      className="glass flex min-h-[150px] w-full flex-col items-start rounded-2xl p-3.5 text-left sm:p-4"
      style={conSenal ? { borderColor: `color-mix(in srgb, ${s.color} 60%, transparent)` } : undefined}
    >
      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft">
        <Icon icon={ICONOS[kpi.id]} width={18} aria-hidden /> {kpi.titulo}
      </span>
      <span className="mt-1.5 text-[28px] font-bold leading-tight text-ink md:text-[30px]">{valor}</span>
      {c && (
        <span className="mt-0.5 text-xs font-semibold" style={{ color: colorCambio(c, kpi.id !== "salio") }}>
          {c.texto} <span className="whitespace-nowrap font-normal text-ink-mute">vs {etiquetaAnterior}</span>
        </span>
      )}
      <span className="mt-0.5 text-xs text-ink-mute">{kpi.subtitulo}</span>
      {kpi.aviso && (
        <span
          className="mt-2 flex items-start gap-1.5 text-xs font-medium"
          style={{ color: kpi.estado === "neutral" ? "var(--ink-soft)" : s.color }}
        >
          <Icon icon={s.icono} width={15} className="mt-px shrink-0" aria-hidden />
          <span>
            {kpi.estado !== "neutral" && <strong>{s.palabra}: </strong>}
            {kpi.aviso}
          </span>
        </span>
      )}
      {abierta && (
        <span className="mt-2 w-full border-t border-line pt-2 text-xs leading-relaxed text-ink-soft">{kpi.explicacion}</span>
      )}
    </button>
  );
}
