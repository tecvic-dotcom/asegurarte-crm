"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import type { MesFinanzas } from "@/lib/types";
import { dinero, dineroEje, maximoBonito } from "./formato";

const ALTO_PLOT = 170;
const AIRE_ARRIBA = 10; // para que la cifra más alta del eje no se corte
const ALTO_EJE_X = 28;
const ANCHO_EJE_Y = 54;
const SEPARACION = 2; // aire entre "Entró" y "Salió" del mismo mes

/** Columna con las puntas de arriba redondeadas (4px) y la base recta. */
function columna(x: number, yTope: number, ancho: number, base: number): string {
  const alto = base - yTope;
  if (alto <= 0.5) return "";
  const r = Math.min(4, ancho / 2, alto);
  return `M${x},${base} L${x},${yTope + r} Q${x},${yTope} ${x + r},${yTope} L${x + ancho - r},${yTope} Q${x + ancho},${yTope} ${x + ancho},${yTope + r} L${x + ancho},${base} Z`;
}

/**
 * Entró vs Salió de los últimos 6 meses. Pasa el dedo (o el mouse) por un mes
 * para ver sus números; o toca "Ver tabla" para verlos todos sin gráfica.
 */
export function GraficaMeses({ meses, mesEnCurso }: { meses: MesFinanzas[]; mesEnCurso: string }) {
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

  const vacio = meses.every((m) => m.entro === 0 && m.salio === 0);
  const max = maximoBonito(Math.max(0, ...meses.flatMap((m) => [m.entro, m.salio])));
  const anchoPlot = ancho - ANCHO_EJE_Y;
  const banda = anchoPlot / meses.length;
  const barra = Math.min(24, Math.max(6, (banda * 0.62 - SEPARACION) / 2));
  const base = AIRE_ARRIBA + ALTO_PLOT;
  const y = (v: number) => base - (v / max) * ALTO_PLOT;
  const marcas = [0, max / 2, max];
  const mesActivo = activo !== null ? meses[activo] : null;

  return (
    <section className="glass h-full rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-ink">Entró vs salió, por mes</h3>
          <p className="text-xs text-ink-mute">Últimos 6 meses · el mes en curso todavía no termina</p>
        </div>
        <button
          type="button"
          onClick={() => setTabla((v) => !v)}
          className="btn-ghost px-3 py-1.5 text-xs"
          aria-pressed={tabla}
        >
          <Icon icon={tabla ? "flat-color-icons:bar-chart" : "flat-color-icons:data-sheet"} width={16} aria-hidden />
          {tabla ? "Ver gráfica" : "Ver tabla"}
        </button>
      </div>

      {/* Leyenda: el nombre de cada color (nunca solo el color) */}
      <div className="mb-2 flex gap-4 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: "var(--serie-entro)" }} /> Entró
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: "var(--serie-salio)" }} /> Salió
        </span>
      </div>

      <div ref={caja} className="relative w-full">
        {tabla ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-mute">
                <th className="py-2 font-semibold">Mes</th>
                <th className="py-2 text-right font-semibold">Entró</th>
                <th className="py-2 text-right font-semibold">Salió</th>
                <th className="py-2 text-right font-semibold">Te quedó</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {meses.map((m) => (
                <tr key={m.mes} className="border-b border-line/60">
                  <td className="py-2 text-ink-soft">
                    {m.etiqueta}
                    {m.mes === mesEnCurso && <span className="text-xs text-ink-mute"> (en curso)</span>}
                  </td>
                  <td className="py-2 text-right text-ink">{dinero(m.entro)}</td>
                  <td className="py-2 text-right text-ink">{dinero(m.salio)}</td>
                  <td className="py-2 text-right font-semibold text-ink">{dinero(m.entro - m.salio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : vacio ? (
          <p className="py-10 text-center text-sm text-ink-mute">
            Aún no hay movimientos en estos 6 meses. Registra tu primera comisión abajo y aquí aparece.
          </p>
        ) : (
          <>
            <svg width={ancho} height={base + ALTO_EJE_X} role="img" aria-label="Gráfica de lo que entró y salió por mes">
              {/* Rejilla: líneas finas y discretas */}
              {marcas.map((v) => (
                <g key={v}>
                  <line
                    x1={ANCHO_EJE_Y}
                    x2={ancho}
                    y1={y(v)}
                    y2={y(v)}
                    stroke={v === 0 ? "var(--line-strong)" : "var(--line)"}
                    strokeWidth={1}
                  />
                  <text
                    x={ANCHO_EJE_Y - 8}
                    y={y(v)}
                    dy="0.32em"
                    textAnchor="end"
                    fontSize={11}
                    style={{ fill: "var(--ink-mute)", fontVariantNumeric: "tabular-nums" }}
                  >
                    {dineroEje(v)}
                  </text>
                </g>
              ))}

              {meses.map((m, i) => {
                const x0 = ANCHO_EJE_Y + banda * i + (banda - (barra * 2 + SEPARACION)) / 2;
                const apagado = activo !== null && activo !== i;
                return (
                  <g key={m.mes} style={{ opacity: apagado ? 0.45 : 1, transition: "opacity 0.15s" }}>
                    <path d={columna(x0, y(m.entro), barra, base)} style={{ fill: "var(--serie-entro)" }} />
                    <path d={columna(x0 + barra + SEPARACION, y(m.salio), barra, base)} style={{ fill: "var(--serie-salio)" }} />
                    <text
                      x={ANCHO_EJE_Y + banda * i + banda / 2}
                      y={base + 18}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={m.mes === mesEnCurso ? 700 : 400}
                      style={{ fill: m.mes === mesEnCurso ? "var(--ink-soft)" : "var(--ink-mute)" }}
                    >
                      {m.etiqueta}
                    </text>
                    {/* Zona de toque: todo el mes, más grande que las barras */}
                    <rect
                      x={ANCHO_EJE_Y + banda * i}
                      y={0}
                      width={banda}
                      height={base + ALTO_EJE_X}
                      fill="transparent"
                      tabIndex={0}
                      aria-label={`${m.etiqueta}: entró ${dinero(m.entro)}, salió ${dinero(m.salio)}`}
                      onPointerEnter={() => setActivo(i)}
                      onPointerMove={() => setActivo(i)}
                      onPointerLeave={() => setActivo(null)}
                      onFocus={() => setActivo(i)}
                      onBlur={() => setActivo(null)}
                      style={{ outline: "none", cursor: "default" }}
                    />
                  </g>
                );
              })}
            </svg>

            {mesActivo && activo !== null && (
              <div
                className="glass-strong pointer-events-none absolute top-0 z-10 w-44 rounded-xl p-3 text-xs"
                style={{
                  left: Math.min(
                    Math.max(0, ANCHO_EJE_Y + banda * activo + banda / 2 - 88),
                    Math.max(0, ancho - 176),
                  ),
                }}
              >
                <p className="mb-1.5 font-semibold capitalize text-ink">
                  {mesActivo.etiqueta}
                  {mesActivo.mes === mesEnCurso && <span className="font-normal normal-case text-ink-mute"> (en curso)</span>}
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-ink-soft">
                    <span className="inline-block h-0.5 w-3" style={{ background: "var(--serie-entro)" }} /> Entró
                  </span>
                  <strong className="text-ink">{dinero(mesActivo.entro)}</strong>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-ink-soft">
                    <span className="inline-block h-0.5 w-3" style={{ background: "var(--serie-salio)" }} /> Salió
                  </span>
                  <strong className="text-ink">{dinero(mesActivo.salio)}</strong>
                </p>
                <p className="mt-1 flex items-center justify-between gap-2 border-t border-line pt-1">
                  <span className="text-ink-soft">Te quedó</span>
                  <strong className="text-ink">{dinero(mesActivo.entro - mesActivo.salio)}</strong>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
