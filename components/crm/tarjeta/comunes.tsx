"use client";

import { fechaCorta } from "@/lib/fechas";
import type { Conteo, PeriodoAnterior } from "@/lib/tarjeta-reglas";

export const nf = (n: number) => n.toLocaleString("es-MX");
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** Tarjeta de número, como las de «Resumen» de Instagram: título, cifra grande y una línea de apoyo abajo. */
export function Tarjeta({ titulo, valor, children, className = "" }: { titulo: string; valor: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={`glass flex min-h-[124px] flex-col rounded-2xl p-3.5 sm:p-4 ${className}`}>
      <span className="text-[13px] font-semibold text-ink-soft">{titulo}</span>
      <span className="mt-1 text-[26px] font-bold leading-tight text-ink md:text-[28px]">{valor}</span>
      <span className="mt-auto pt-1 text-xs text-ink-mute">{children}</span>
    </div>
  );
}

/** «+15.7% vs. 25 sep»: cuánto cambió contra el periodo anterior de igual largo (verde sube, rojo baja; el signo siempre se escribe). */
export function Delta({ actual, antes, anterior }: { actual: number; antes: number; anterior: PeriodoAnterior }) {
  if (!anterior.comparable) return <span>aún sin periodo anterior</span>;
  const desde = fechaCorta(anterior.desde);
  if (!antes) return <span>{actual ? `nuevo vs. ${desde}` : `sin cambio vs. ${desde}`}</span>;
  const v = Math.round(((actual - antes) / antes) * 1000) / 10;
  const color = v > 0 ? "var(--green)" : v < 0 ? "var(--red)" : undefined;
  return (
    <span>
      <span className="font-semibold" style={color ? { color } : undefined}>
        {v > 0 ? "+" : ""}
        {v.toLocaleString("es-MX")}%
      </span>{" "}
      vs. {desde}
    </span>
  );
}

/** Lista con barra proporcional: sirve para «dónde tocan», «qué productos», «de dónde llegan»… */
export function ListaBarras({ titulo, ayuda, filas, vacio, sufijo = "" }: { titulo: string; ayuda?: string; filas: Conteo[]; vacio: string; sufijo?: string }) {
  const max = Math.max(1, ...filas.map((f) => f.n));
  return (
    <section className="glass rounded-2xl p-4">
      <h3 className="font-display text-base text-ink">{titulo}</h3>
      {ayuda && <p className="mt-0.5 text-xs text-ink-mute">{ayuda}</p>}
      {!filas.length ? (
        <p className="mt-3 text-sm text-ink-mute">{vacio}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {filas.map((f) => (
            <li key={f.nombre}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-ink">{f.nombre}</span>
                <span className="shrink-0 font-semibold text-ink">
                  {nf(f.n)}
                  {sufijo}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg-3" aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${Math.max(3, (f.n / max) * 100)}%`, background: "var(--brand-2)" }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Línea chiquita sin ejes, para dentro de una tarjeta. */
export function Spark({ datos, etiqueta }: { datos: number[]; etiqueta: string }) {
  const max = Math.max(1, ...datos);
  const n = datos.length;
  const puntos = datos.map((v, i) => `${n > 1 ? (i / (n - 1)) * 100 : 0},${37 - (v / max) * 34}`).join(" ");
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-14 w-full" role="img" aria-label={etiqueta}>
      <polyline points={puntos} fill="none" stroke="var(--brand-2)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Gráfica de línea con eje (0, mitad, tope) y fechas de los extremos; cada día lleva su dato al pasar el cursor. */
export function GraficaLinea({ serie, unidad, etiqueta }: { serie: Array<{ dia: string; n: number }>; unidad: [string, string]; etiqueta: string }) {
  const max = Math.max(1, ...serie.map((d) => d.n));
  const tope = max <= 4 ? max : Math.ceil(max / 4) * 4; // eje con cifras redondas
  const n = serie.length;
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * 300 : 150);
  const y = (v: number) => 124 - (v / tope) * 118;
  const linea = serie.map((d, i) => `${x(i)},${y(d.n)}`).join(" ");
  return (
    <div>
      <div className="flex gap-2">
        <div className="flex h-32 w-8 shrink-0 flex-col justify-between text-right text-[11px] leading-none text-ink-mute" aria-hidden>
          <span>{nf(tope)}</span>
          <span>{nf(Math.round(tope / 2))}</span>
          <span>0</span>
        </div>
        <div className="relative h-32 min-w-0 flex-1">
          <svg viewBox="0 0 300 128" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label={etiqueta}>
            {[6, 65, 124].map((gy) => (
              <line key={gy} x1="0" x2="300" y1={gy} y2={gy} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            <polygon points={`0,124 ${linea} 300,124`} fill="var(--brand-2)" opacity="0.14" />
            <polyline points={linea} fill="none" stroke="var(--brand-2)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="absolute inset-0 flex" aria-hidden>
            {serie.map((d) => (
              <div key={d.dia} className="h-full min-w-0 flex-1" title={`${fechaCorta(d.dia)}: ${d.n} ${d.n === 1 ? unidad[0] : unidad[1]}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-1 flex justify-between pl-10 text-[11px] text-ink-mute">
        <span>{serie.length ? fechaCorta(serie[0].dia) : ""}</span>
        <span>{serie.length ? fechaCorta(serie[serie.length - 1].dia) : ""}</span>
      </div>
    </div>
  );
}

/** Columnas verticales (horas del día, días de la semana). La más alta va resaltada. */
export function Columnas({
  valores,
  nombres,
  titulos = nombres,
  cada = 1,
  unidad,
  etiqueta,
}: {
  valores: number[];
  /** Lo que se escribe debajo de cada columna (corto). */
  nombres: string[];
  /** Lo que dice al pasar el cursor (completo). */
  titulos?: string[];
  cada?: number;
  unidad: [string, string];
  etiqueta: string;
}) {
  const max = Math.max(1, ...valores);
  const mejor = valores.indexOf(Math.max(...valores));
  return (
    <div role="img" aria-label={etiqueta}>
      <div className="flex h-28 items-end gap-[3px]">
        {valores.map((v, i) => (
          <div key={titulos[i]} className="flex h-full min-w-0 flex-1 items-end" title={`${titulos[i]}: ${v} ${v === 1 ? unidad[0] : unidad[1]}`}>
            <div
              className="w-full rounded-t"
              style={{ height: `${v ? Math.max(4, (v / max) * 100) : 1}%`, background: v && i === mejor ? "var(--brand-2)" : v ? "color-mix(in srgb, var(--brand-2) 45%, transparent)" : "var(--line)" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[3px] text-[11px] text-ink-mute" aria-hidden>
        {valores.map((_, i) => (
          <span key={titulos[i]} className="min-w-0 flex-1 text-center">
            {i % cada === 0 ? nombres[i] : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
