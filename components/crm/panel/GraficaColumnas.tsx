"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { maximoBonito } from "./formato";

export interface SerieColumnas {
  nombre: string;
  color: string;
  valores: number[];
}

interface GraficaColumnasProps {
  titulo: string;
  subtitulo?: string;
  categorias: string[];
  series: SerieColumnas[];
  /** Formato de cifras (tooltip, tabla, etiquetas). */
  formato: (n: number) => string;
  /** Formato corto para el eje. */
  formatoEje: (n: number) => string;
  /** Con una sola serie, pone la cifra encima de cada columna. */
  etiquetasArriba?: boolean;
  /** Texto extra bajo una categoría (ej. "a sep"). */
  notaCategoria?: (i: number) => string | null;
  /** Renglón extra en el tooltip y la tabla (ej. crecimiento %). */
  extra?: { nombre: string; valor: (i: number) => string };
}

const ALTO_PLOT = 180;
const AIRE_ARRIBA = 22;
const ALTO_EJE_X = 34;
const ANCHO_EJE_Y = 58;
const SEPARACION = 2;

function columna(x: number, yTope: number, ancho: number, base: number): string {
  const alto = base - yTope;
  if (alto <= 0.5) return "";
  const r = Math.min(4, ancho / 2, alto);
  return `M${x},${base} L${x},${yTope + r} Q${x},${yTope} ${x + r},${yTope} L${x + ancho - r},${yTope} Q${x + ancho},${yTope} ${x + ancho},${yTope + r} L${x + ancho},${base} Z`;
}

/**
 * Columnas (una o varias series) con eje de cifras redondas, tooltip por
 * categoría (mouse, dedo o teclado), leyenda y vista de tabla.
 */
export function GraficaColumnas({
  titulo,
  subtitulo,
  categorias,
  series,
  formato,
  formatoEje,
  etiquetasArriba,
  notaCategoria,
  extra,
}: GraficaColumnasProps) {
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(320);
  const [activo, setActivo] = useState<number | null>(null);
  const [tabla, setTabla] = useState(false);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(240, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = series.length;
  const max = maximoBonito(Math.max(0, ...series.flatMap((s) => s.valores)));
  const banda = (ancho - ANCHO_EJE_Y) / Math.max(1, categorias.length);
  const barra = Math.min(n === 1 ? 32 : 24, Math.max(4, (banda * 0.7 - SEPARACION * (n - 1)) / n));
  const base = AIRE_ARRIBA + ALTO_PLOT;
  const y = (v: number) => base - (Math.max(0, v) / max) * ALTO_PLOT;
  const vacio = series.every((s) => s.valores.every((v) => v === 0));

  return (
    <section className="glass rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-ink">{titulo}</h3>
          {subtitulo && <p className="text-xs text-ink-mute">{subtitulo}</p>}
        </div>
        <button type="button" onClick={() => setTabla((v) => !v)} className="btn-ghost px-3 py-1.5 text-xs" aria-pressed={tabla}>
          <Icon icon={tabla ? "flat-color-icons:bar-chart" : "flat-color-icons:data-sheet"} width={16} aria-hidden />
          {tabla ? "Ver gráfica" : "Ver tabla"}
        </button>
      </div>

      {n > 1 && (
        <div className="mb-2 flex flex-wrap gap-4 text-xs text-ink-soft">
          {series.map((s) => (
            <span key={s.nombre} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: s.color }} /> {s.nombre}
            </span>
          ))}
        </div>
      )}

      <div ref={caja} className="relative w-full">
        {tabla ? (
          <div className="no-scrollbar overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-mute">
                  <th className="py-2 pr-3 font-semibold" />
                  {series.map((s) => (
                    <th key={s.nombre} className="py-2 pr-3 text-right font-semibold">{s.nombre}</th>
                  ))}
                  {extra && <th className="py-2 text-right font-semibold">{extra.nombre}</th>}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {categorias.map((c, i) => (
                  <tr key={c} className="border-b border-line/60">
                    <td className="py-2 pr-3 text-ink-soft">
                      {c}
                      {notaCategoria?.(i) && <span className="text-xs text-ink-mute"> ({notaCategoria(i)})</span>}
                    </td>
                    {series.map((s) => (
                      <td key={s.nombre} className="py-2 pr-3 text-right text-ink">{formato(s.valores[i] ?? 0)}</td>
                    ))}
                    {extra && <td className="py-2 text-right text-ink-soft">{extra.valor(i)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : vacio ? (
          <p className="py-10 text-center text-sm text-ink-mute">Sin datos para esta selección.</p>
        ) : (
          <>
            <svg width={ancho} height={base + ALTO_EJE_X} role="img" aria-label={titulo}>
              {[0, max / 2, max].map((v) => (
                <g key={v}>
                  <line x1={ANCHO_EJE_Y} x2={ancho} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--line-strong)" : "var(--line)"} strokeWidth={1} />
                  <text x={ANCHO_EJE_Y - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize={11} style={{ fill: "var(--ink-mute)", fontVariantNumeric: "tabular-nums" }}>
                    {formatoEje(v)}
                  </text>
                </g>
              ))}
              {categorias.map((c, i) => {
                const ancho0 = barra * n + SEPARACION * (n - 1);
                const x0 = ANCHO_EJE_Y + banda * i + (banda - ancho0) / 2;
                const nota = notaCategoria?.(i);
                return (
                  <g key={c} style={{ opacity: activo !== null && activo !== i ? 0.45 : 1, transition: "opacity 0.15s" }}>
                    {series.map((s, k) => (
                      <path key={s.nombre} d={columna(x0 + k * (barra + SEPARACION), y(s.valores[i] ?? 0), barra, base)} style={{ fill: s.color }} />
                    ))}
                    {/* Cifra arriba solo si hay espacio; si no, vive en el tooltip y en la tabla. */}
                    {etiquetasArriba && n === 1 && banda >= 72 && (series[0].valores[i] ?? 0) > 0 && (
                      <text x={x0 + barra / 2} y={y(series[0].valores[i]) - 6} textAnchor="middle" fontSize={11} fontWeight={600} style={{ fill: "var(--ink-soft)" }}>
                        {formatoEje(series[0].valores[i])}
                      </text>
                    )}
                    <text x={ANCHO_EJE_Y + banda * i + banda / 2} y={base + 16} textAnchor="middle" fontSize={12} style={{ fill: "var(--ink-mute)" }}>
                      {c}
                    </text>
                    {nota && (
                      <text x={ANCHO_EJE_Y + banda * i + banda / 2} y={base + 29} textAnchor="middle" fontSize={10} style={{ fill: "var(--ink-mute)" }}>
                        {nota}
                      </text>
                    )}
                    <rect
                      x={ANCHO_EJE_Y + banda * i}
                      y={0}
                      width={banda}
                      height={base + ALTO_EJE_X}
                      fill="transparent"
                      tabIndex={0}
                      aria-label={`${c}: ${series.map((s) => `${s.nombre} ${formato(s.valores[i] ?? 0)}`).join(", ")}`}
                      onPointerEnter={() => setActivo(i)}
                      onPointerMove={() => setActivo(i)}
                      onPointerLeave={() => setActivo(null)}
                      onFocus={() => setActivo(i)}
                      onBlur={() => setActivo(null)}
                      style={{ outline: "none" }}
                    />
                  </g>
                );
              })}
            </svg>
            {activo !== null && (
              <div
                className="glass-strong pointer-events-none absolute top-0 z-10 w-48 rounded-xl p-3 text-xs"
                style={{ left: Math.min(Math.max(0, ANCHO_EJE_Y + banda * activo + banda / 2 - 96), Math.max(0, ancho - 192)) }}
              >
                <p className="mb-1.5 font-semibold text-ink">
                  {categorias[activo]}
                  {notaCategoria?.(activo) && <span className="font-normal text-ink-mute"> ({notaCategoria(activo)})</span>}
                </p>
                {series.map((s) => (
                  <p key={s.nombre} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-ink-soft">
                      <span className="inline-block h-0.5 w-3" style={{ background: s.color }} /> {s.nombre}
                    </span>
                    <strong className="text-ink">{formato(s.valores[activo] ?? 0)}</strong>
                  </p>
                ))}
                {extra && (
                  <p className="mt-1 flex items-center justify-between gap-2 border-t border-line pt-1">
                    <span className="text-ink-soft">{extra.nombre}</span>
                    <strong className="text-ink">{extra.valor(activo)}</strong>
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
