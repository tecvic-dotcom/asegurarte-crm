"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { crmAdjuntas, ErrorCRM } from "@/lib/api";
import { hoyLocal } from "@/lib/fechas";
import { porPeriodo } from "@/lib/adjuntas-reglas";
import { BANDA_INICIAL, avanceBono, trimestreEnCurso, type AvanceTrimestre, type RamoBono } from "@/lib/bono-bic";
import type { PolizaAdjunta } from "@/lib/types";
import { AvisoMigracion } from "./panel/AvisoMigracion";
import { dinero } from "./panel/formato";

const RAMOS: RamoBono[] = ["gmm", "vida"];
const NOMBRE_CORTO: Record<RamoBono, string> = { gmm: "Gastos médicos", vida: "Vida individual" };
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function leerBeta(): boolean {
  try {
    return window.localStorage.getItem("bono_beta") === "1";
  } catch {
    return false;
  }
}

function textoBono(avances: Record<RamoBono, AvanceTrimestre[]>, anio: number, beta: boolean): string {
  const t: string[] = [`*Clara · Bono AXA (BIC ${anio}) · primera banda*`, beta ? "Agente Beta" : "Agente No Beta", ""];
  for (const r of RAMOS) {
    const b = BANDA_INICIAL[r];
    t.push(`*${b.nombre}*`);
    for (const a of avances[r]) {
      const estado = a.estado === "cerrado" ? "cerrado" : a.estado === "en_curso" ? "en curso" : "por venir";
      const extra = r === "vida" ? ` · ${a.negocios}/${b.negociosNuevos} negocios nuevos` : "";
      t.push(`• ${a.etiqueta} (${a.meses}, ${estado}): ${dinero(a.prima)} de ${dinero(a.requisito)}${extra} → ${a.cumple ? "banda alcanzada ✅" : `faltan ${dinero(a.falta)}${r === "vida" && a.negociosFaltan ? ` y ${a.negociosFaltan} negocios` : ""}`}`);
    }
    t.push("");
  }
  t.push("_Prima neta de pólizas nuevas adjuntas, por inicio de vigencia. El bono real usa prima neta pagada y aplicada._");
  return t.join("\n");
}

/**
 * Bono AXA (BIC 2026): cuánta prima neta nueva llevas por trimestre en Gastos médicos y Vida
 * individual, y cuánto te falta para la primera banda de bono de cada ramo.
 */
export function BonoBIC() {
  const [polizas, setPolizas] = useState<PolizaAdjunta[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [beta, setBeta] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const hoy = hoyLocal();
  const anio = Number(hoy.slice(0, 4));

  useEffect(() => {
    crmAdjuntas().then(
      (d) => {
        setBeta(leerBeta());
        setPolizas(d.polizas);
      },
      (e: unknown) => setError(e as Error),
    );
  }, []);

  function cambiarBeta(valor: boolean) {
    setBeta(valor);
    try {
      window.localStorage.setItem("bono_beta", valor ? "1" : "0");
    } catch {
      /* sin almacenamiento: queda solo en esta visita */
    }
  }

  const avances = useMemo(
    () => ({ gmm: avanceBono(polizas ?? [], "gmm", anio, hoy, beta), vida: avanceBono(polizas ?? [], "vida", anio, hoy, beta) }),
    [polizas, anio, hoy, beta],
  );
  const mensual = useMemo(
    () => Object.fromEntries(RAMOS.map((r) => [r, porPeriodo(polizas ?? [], anio, r, "mes").map((f) => f.primaNueva)])) as Record<RamoBono, number[]>,
    [polizas, anio],
  );

  if (error instanceof ErrorCRM && error.migracion) {
    return <AvisoMigracion onListo={() => window.location.reload()} archivo={error.archivo} que="tu pestaña de Pólizas" />;
  }
  if (error) return <p className="glass rounded-2xl p-5 text-center text-sm text-ink-soft">{error.message}</p>;
  if (!polizas) return <div className="h-40 animate-pulse rounded-2xl bg-bg-3/70" aria-label="Clara está calculando tu bono" />;

  const actual = trimestreEnCurso(avances.gmm);

  return (
    <article className="clara-imprimible space-y-4">
      <header className="glass rounded-2xl p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Bono AXA · BIC {anio} · primera banda</p>
        <h3 className="font-display text-xl text-ink">
          Lo que te falta por trimestre ({actual.etiqueta} · {actual.meses} va {actual.estado === "en_curso" ? "en curso" : actual.estado === "cerrado" ? "cerrado" : "por venir"})
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-soft">Tu segmento en AXA:</span>
          {[false, true].map((b) => (
            <button
              key={String(b)}
              type="button"
              aria-pressed={beta === b}
              onClick={() => cambiarBeta(b)}
              className={`min-h-[36px] rounded-lg border px-3 text-xs ${beta === b ? "border-brand-2 bg-brand/15 font-semibold text-ink" : "border-line bg-glass text-ink-mute hover:text-ink"}`}
            >
              {b ? "Beta (menos de 36 meses)" : "No Beta (más de 36 meses)"}
            </button>
          ))}
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(textoBono(avances, anio, beta));
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2500);
              } catch {
                /* sin portapapeles */
              }
            }}
            className="btn-ghost ml-auto px-3 py-2 text-xs"
          >
            <Icon icon={copiado ? "flat-color-icons:ok" : "flat-color-icons:document"} width={16} aria-hidden /> {copiado ? "¡Copiado!" : "Copiar"}
          </button>
          <button type="button" onClick={() => window.print()} className="btn-ghost px-3 py-2 text-xs">
            <Icon icon="flat-color-icons:print" width={16} aria-hidden /> PDF
          </button>
        </div>
      </header>

      {/* Lo grande: cuánto falta en el trimestre que va */}
      <div className="grid gap-3 md:grid-cols-2">
        {RAMOS.map((r) => {
          const a = trimestreEnCurso(avances[r]);
          const b = BANDA_INICIAL[r];
          return (
            <section
              key={r}
              className="glass-strong rounded-2xl border-2 p-5 text-center"
              style={{ borderColor: `color-mix(in srgb, ${a.cumple ? "var(--green)" : "var(--amber)"} 70%, transparent)` }}
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
                {NOMBRE_CORTO[r]} · {a.etiqueta} ({a.meses})
              </p>
              {a.cumple ? (
                <p className="mt-2 text-4xl font-extrabold leading-tight sm:text-5xl" style={{ color: "var(--green)" }}>
                  ¡Banda alcanzada!
                </p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-ink-soft">Te faltan de prima neta nueva</p>
                  <p className="text-5xl font-extrabold leading-none tabular-nums sm:text-6xl" style={{ color: "var(--amber)" }}>
                    {dinero(a.falta)}
                  </p>
                  {r === "vida" && a.negociosFaltan > 0 && (
                    <p className="mt-2 text-2xl font-extrabold" style={{ color: "var(--amber)" }}>
                      y {a.negociosFaltan} negocio{a.negociosFaltan === 1 ? "" : "s"} nuevo{a.negociosFaltan === 1 ? "" : "s"} de {dinero(b.primaPorNegocio)}+
                    </p>
                  )}
                </>
              )}
              <p className="mt-3 text-sm text-ink-soft">
                Llevas <strong className="text-ink">{dinero(a.prima)}</strong> de <strong className="text-ink">{dinero(a.requisito)}</strong>
                {r === "vida" ? ` · ${a.negocios} de ${b.negociosNuevos} negocios nuevos` : ""}
              </p>
            </section>
          );
        })}
      </div>

      {/* Por trimestre, ramo por ramo */}
      {RAMOS.map((r) => {
        const b = BANDA_INICIAL[r];
        return (
          <section key={r} className="glass rounded-2xl p-4 sm:p-5">
            <h3 className="font-semibold text-ink">{b.nombre}</h3>
            <p className="text-xs text-ink-mute">
              Primera banda: {dinero(beta ? b.primaBeta : b.primaNoBeta)} de prima neta nueva en el trimestre
              {r === "vida" ? ` y ${b.negociosNuevos} negocios nuevos de ${dinero(b.primaPorNegocio)}+` : ""} · {b.pagina}
            </p>
            <div className="no-scrollbar mt-2 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-mute">
                    <th className="py-2 font-semibold">Trimestre</th>
                    <th className="py-2 text-right font-semibold">Prima neta nueva</th>
                    <th className="py-2 text-right font-semibold">Pide la banda</th>
                    {r === "vida" && <th className="py-2 text-right font-semibold">Negocios nuevos</th>}
                    <th className="py-2 text-right font-semibold">Te falta</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {avances[r].map((a) => (
                    <tr key={a.etiqueta} className="border-b border-line/60">
                      <td className="py-2 text-ink">
                        {a.etiqueta} <span className="text-xs text-ink-mute">{a.meses}{a.estado === "en_curso" ? " · en curso" : a.estado === "cerrado" ? " · cerrado" : ""}</span>
                      </td>
                      <td className="py-2 text-right text-ink">{dinero(a.prima)}</td>
                      <td className="py-2 text-right text-ink-soft">{dinero(a.requisito)}</td>
                      {r === "vida" && (
                        <td className="py-2 text-right text-ink-soft">
                          {a.negocios}/{b.negociosNuevos}
                        </td>
                      )}
                      <td className="py-2 text-right text-base font-bold" style={{ color: a.cumple ? "var(--green)" : "var(--amber)" }}>
                        {a.cumple ? "✓ Alcanzada" : dinero(a.falta)}
                        {!a.cumple && r === "vida" && a.negociosFaltan > 0 && (
                          <span className="block text-xs font-semibold">+ {a.negociosFaltan} negocios</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-ink-mute">
              {b.reglas.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
        );
      })}

      {/* Prima neta nueva por mes (el reporte base) */}
      <section className="glass rounded-2xl p-4 sm:p-5">
        <h3 className="font-semibold text-ink">Prima neta nueva por mes · {anio}</h3>
        <p className="text-xs text-ink-mute">Por inicio de vigencia, solo pólizas nuevas en pesos.</p>
        <div className="no-scrollbar mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-mute">
                <th className="py-2 font-semibold">Ramo</th>
                {MESES.map((m) => (
                  <th key={m} className="py-2 text-right font-semibold capitalize">
                    {m}
                  </th>
                ))}
                <th className="py-2 text-right font-semibold">Año</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {RAMOS.map((r) => (
                <tr key={r} className="border-b border-line/60">
                  <td className="py-2 text-ink">{NOMBRE_CORTO[r]}</td>
                  {mensual[r].map((v, i) => (
                    <td key={i} className="py-2 text-right text-ink-soft">
                      {v ? dinero(v, true) : "—"}
                    </td>
                  ))}
                  <td className="py-2 text-right font-semibold text-ink">{dinero(mensual[r].reduce((s, v) => s + v, 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-ink-mute">
        Clara suma la prima neta anual de las pólizas <strong className="text-ink">nuevas que adjuntaste</strong> en la pestaña Pólizas, por inicio de vigencia. El bono real de
        AXA usa la prima neta <strong className="text-ink">pagada y aplicada</strong> dentro del trimestre (si el cliente paga en parcialidades, solo cuenta lo pagado) y, en Vida,
        exige persistencia mínima de 67.5%. Úsalo como meta de venta; la tabla completa de porcentajes está en el BIC-2026.
      </p>
    </article>
  );
}
