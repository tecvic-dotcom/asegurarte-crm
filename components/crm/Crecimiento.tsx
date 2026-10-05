"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { crmCrecimiento, ErrorCRM } from "@/lib/api";
import { RAMOS, infoRamo } from "@/lib/ramos";
import { fechaCorta, mesCorto } from "@/lib/fechas";
import {
  NOMBRE_METRICA,
  acumulado,
  aniosDisponibles,
  corteDeDatos,
  crecimiento,
  crecimientoPromedio,
  enDolares,
  etiquetaCorte,
  porAnio,
  porMes,
} from "@/lib/crecimiento-reglas";
import type { MetricaCrecimiento, ProduccionMes, Ramo } from "@/lib/types";
import { GraficaColumnas } from "./panel/GraficaColumnas";
import { AvisoMigracion } from "./panel/AvisoMigracion";
import { dinero, dineroEje } from "./panel/formato";

const METRICAS: MetricaCrecimiento[] = ["prima", "comision", "pagos"];
const MESES = Array.from({ length: 12 }, (_, i) => mesCorto(`2026-${String(i + 1).padStart(2, "0")}-01`));

function Crece({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-ink-mute">—</span>;
  const sube = pct >= 0;
  return (
    <span className="inline-flex items-center gap-1 font-semibold" style={{ color: sube ? "var(--green)" : "var(--red)" }}>
      {sube ? "▲" : "▼"} {Math.abs(pct).toLocaleString("es-MX")}%
      <span className="font-normal text-ink-mute">{sube ? "creció" : "bajó"}</span>
    </span>
  );
}

/**
 * Crecimiento: tu producción por ramo, mes y año, comparando parejo
 * (el año en curso contra los mismos meses del año anterior).
 */
export function Crecimiento() {
  const [filas, setFilas] = useState<ProduccionMes[] | null>(null);
  const [cloud, setCloud] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [metrica, setMetrica] = useState<MetricaCrecimiento>("prima");
  const [ramo, setRamo] = useState<Ramo | null>(null);
  const [anioMes, setAnioMes] = useState<number | null>(null);

  const cargar = useCallback(
    () =>
      crmCrecimiento().then(
        (d) => {
          setFilas(d.filas);
          setCloud(d.cloud);
          setError(null);
        },
        (e: unknown) => setError(e as Error),
      ),
    [],
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const datos = useMemo(() => {
    if (!filas || !filas.length) return null;
    const corte = corteDeDatos(filas)!;
    const anios = aniosDisponibles(filas);
    const anual = porAnio(filas, metrica, ramo);
    const a = corte.anio;
    const actual = acumulado(filas, metrica, ramo, a, corte.mesCorte);
    const anterior = acumulado(filas, metrica, ramo, a - 1, corte.mesCorte);
    const totalAnio = (y: number) => anual.find((x) => x.anio === y)?.total ?? 0;
    const completos = anios.filter((y) => y < a || (y === a && corte.mesCorte === 12));
    const primero = completos[0];
    const ultimo = completos.at(-1);
    const promedio =
      primero !== undefined && ultimo !== undefined && ultimo > primero
        ? crecimientoPromedio(totalAnio(primero), totalAnio(ultimo), ultimo - primero)
        : null;
    const ramosConDatos = RAMOS.filter((r) => filas.some((f) => f.ramo === r.id && f.moneda === "MN"));
    const totalTodos = acumulado(filas, metrica, null, a, corte.mesCorte);
    const porRamo = ramosConDatos.map((r) => {
      const act = acumulado(filas, metrica, r.id, a, corte.mesCorte);
      const ant = acumulado(filas, metrica, r.id, a - 1, corte.mesCorte);
      return { ramo: r.id, act, ant, crece: crecimiento(act, ant), parte: totalTodos ? Math.round((act / totalTodos) * 100) : 0 };
    });
    return { corte, anios, anual, actual, anterior, totalAnio, primero, ultimo, promedio, ramosConDatos, porRamo };
  }, [filas, metrica, ramo]);

  if (error instanceof ErrorCRM && error.migracion) {
    return (
      <AvisoMigracion
        onListo={() => void cargar()}
        archivo={error.archivo}
        que="tu pestaña de Crecimiento"
        detalle="Tu libreta en la nube (Supabase) necesita un cajón nuevo para guardar tus totales de producción por mes y ramo (sin nombres de clientes). Se hace una sola vez."
      />
    );
  }
  if (error) {
    return (
      <div className="glass rounded-2xl p-5 text-center">
        <p className="text-sm text-ink-soft">{error.message}</p>
        <button type="button" onClick={() => void cargar()} className="btn-primary mt-3 px-4 py-2.5 text-sm">
          Reintentar
        </button>
      </div>
    );
  }
  if (!filas) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Cargando tu producción">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[130px] animate-pulse rounded-2xl bg-bg-3/70" />
        ))}
      </div>
    );
  }
  if (!datos) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <p className="font-semibold text-ink">Aún no hay producción cargada.</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
          Pásale a Claude Code tus reportes de prima pagada de la aseguradora y pídele: “carga mi producción en Crecimiento”.
        </p>
      </div>
    );
  }

  const { corte, anios, anual, actual, anterior, totalAnio, primero, ultimo, promedio, ramosConDatos, porRamo } = datos;
  const a = corte.anio;
  const esDinero = metrica !== "pagos";
  const fmt = (n: number) => (esDinero ? dinero(n) : n.toLocaleString("es-MX"));
  const fmtEje = (n: number) => (esDinero ? dineroEje(n) : Math.round(n).toLocaleString("es-MX"));
  const fmtGrande = (n: number) => (esDinero ? dinero(n, true) : n.toLocaleString("es-MX"));
  const periodo = etiquetaCorte(corte.mesCorte);
  const anioGrafica = anioMes ?? a;
  const delAnio = porMes(filas, metrica, ramo, anioGrafica);
  const delAnterior = porMes(filas, metrica, ramo, anioGrafica - 1);
  const ultimoMesDatos = corte.ultimoDia ? Number(corte.ultimoDia.slice(5, 7)) : 12;
  const dolares = enDolares(filas);
  const nombreRamo = ramo ? infoRamo(ramo).corto : "todos los ramos";
  const mayor = [...porRamo].sort((x, y) => y.act - x.act)[0];

  return (
    <section className="space-y-4">
      <div className="glass-strong rounded-2xl p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-display text-lg text-ink">
          <Icon icon="flat-color-icons:line-chart" width={22} aria-hidden /> Crecimiento
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Tu producción por ramo, mes y año. El año en curso se compara contra los <strong className="text-ink">mismos meses</strong> del
          año anterior ({periodo}), para que la comparación sea pareja.
        </p>
        <p className="mt-1 text-xs text-ink-mute">
          Prima pagada por fecha de aplicación del pago{corte.ultimoDia ? ` · datos al ${fechaCorta(corte.ultimoDia)} ${corte.ultimoDia.slice(0, 4)}` : ""}
          {dolares.pagos > 0 && ` · aparte: ${dolares.pagos} pago en dólares (US$${dolares.prima.toLocaleString("es-MX")} de prima), no sumado a los pesos`}
          {!cloud && " · MODO DEMOSTRACIÓN: números inventados"}
        </p>
      </div>

      {/* Filtros: mandan en todo lo de abajo */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-line bg-glass p-1" role="group" aria-label="Qué medir">
          {METRICAS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={metrica === m}
              onClick={() => setMetrica(m)}
              className={`min-h-[40px] rounded-lg px-3 text-sm ${metrica === m ? "bg-brand/25 font-semibold text-ink" : "text-ink-mute hover:text-ink"}`}
            >
              {NOMBRE_METRICA[m]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ramo">
          {[null, ...ramosConDatos.map((r) => r.id)].map((r) => (
            <button
              key={r ?? "todos"}
              type="button"
              aria-pressed={ramo === r}
              onClick={() => setRamo(r)}
              className={`min-h-[40px] rounded-xl border px-3 text-sm ${
                ramo === r ? "border-brand-2 bg-brand/15 font-semibold text-ink" : "border-line bg-glass text-ink-mute hover:text-ink"
              }`}
            >
              {r ? infoRamo(r).corto : "Todos"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tarjeta titulo={`${a} (${periodo})`} valor={fmtGrande(actual)}>
          <Crece pct={crecimiento(actual, anterior)} /> <span className="text-ink-mute">vs {a - 1} mismo periodo</span>
        </Tarjeta>
        <Tarjeta titulo={`${a - 1} completo`} valor={fmtGrande(totalAnio(a - 1))}>
          <Crece pct={crecimiento(totalAnio(a - 1), totalAnio(a - 2))} /> <span className="text-ink-mute">vs {a - 2}</span>
        </Tarjeta>
        <Tarjeta titulo="Crecimiento promedio por año" valor={promedio === null ? "—" : `${promedio > 0 ? "+" : ""}${promedio.toLocaleString("es-MX")}%`}>
          <span className="text-ink-mute">{primero !== undefined && ultimo !== undefined ? `de ${primero} a ${ultimo}, años completos` : "faltan años completos"}</span>
        </Tarjeta>
        <Tarjeta titulo={ramo ? `Peso de ${nombreRamo}` : "Tu ramo más grande"} valor={ramo ? `${porRamo.find((x) => x.ramo === ramo)?.parte ?? 0}%` : mayor ? infoRamo(mayor.ramo).corto : "—"}>
          <span className="text-ink-mute">
            {ramo ? `del total en ${a} (${periodo})` : mayor ? `${mayor.parte}% de tu ${NOMBRE_METRICA[metrica].toLowerCase()} en ${a}` : ""}
          </span>
        </Tarjeta>
      </div>

      <GraficaColumnas
        titulo={`${NOMBRE_METRICA[metrica]} por año · ${nombreRamo}`}
        subtitulo="Toca una columna para ver la cifra y cuánto creció"
        categorias={anuales(anual)}
        series={[{ nombre: NOMBRE_METRICA[metrica], color: "var(--serie-entro)", valores: anual.map((x) => x.total) }]}
        formato={fmt}
        formatoEje={fmtEje}
        etiquetasArriba
        notaCategoria={(i) => (anual[i].anio === a && corte.ultimoDia ? `al ${fechaCorta(corte.ultimoDia)}` : null)}
        extra={{
          nombre: "Crecimiento",
          valor: (i) => {
            if (i === 0) return "—";
            const y = anual[i].anio;
            const pct =
              y === a && corte.mesCorte < 12
                ? crecimiento(acumulado(filas, metrica, ramo, y, corte.mesCorte), acumulado(filas, metrica, ramo, y - 1, corte.mesCorte))
                : crecimiento(anual[i].total, anual[i - 1].total);
            if (pct === null) return "—";
            return `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toLocaleString("es-MX")}%${y === a && corte.mesCorte < 12 ? ` (${periodo})` : ""}`;
          },
        }}
      />

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Año a comparar mes a mes">
          <span className="mr-1 text-xs text-ink-mute">Mes a mes:</span>
          {anios.slice(1).map((y) => (
            <button
              key={y}
              type="button"
              aria-pressed={anioGrafica === y}
              onClick={() => setAnioMes(y)}
              className={`min-h-[36px] rounded-lg border px-3 text-xs ${
                anioGrafica === y ? "border-brand-2 bg-brand/15 font-semibold text-ink" : "border-line bg-glass text-ink-mute"
              }`}
            >
              {y} vs {y - 1}
            </button>
          ))}
        </div>
        <GraficaColumnas
          titulo={`Mes a mes: ${anioGrafica} vs ${anioGrafica - 1} · ${nombreRamo}`}
          subtitulo="Azul: el año que estás viendo · gris: el año anterior"
          categorias={MESES}
          series={[
            { nombre: String(anioGrafica), color: "var(--serie-entro)", valores: delAnio },
            { nombre: String(anioGrafica - 1), color: "var(--serie-anterior)", valores: delAnterior },
          ]}
          formato={fmt}
          formatoEje={fmtEje}
          notaCategoria={(i) => (anioGrafica === a && i + 1 === ultimoMesDatos && corte.mesCorte < ultimoMesDatos ? "en curso" : null)}
          extra={{ nombre: "Crecimiento", valor: (i) => textoCrece(crecimiento(delAnio[i], delAnterior[i])) }}
        />
      </div>

      {!ramo && (
        <section className="glass rounded-2xl p-4 sm:p-5">
          <h3 className="font-semibold text-ink">Por ramo · {a} vs {a - 1} ({periodo})</h3>
          <p className="mb-3 text-xs text-ink-mute">{NOMBRE_METRICA[metrica]} de los mismos meses en ambos años</p>
          <div className="no-scrollbar overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-mute">
                  <th className="py-2 font-semibold">Ramo</th>
                  <th className="py-2 text-right font-semibold">{a}</th>
                  <th className="py-2 text-right font-semibold">{a - 1}</th>
                  <th className="py-2 text-right font-semibold">Crecimiento</th>
                  <th className="py-2 text-right font-semibold">Peso</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {[...porRamo].sort((x, y) => y.act - x.act).map((r) => (
                  <tr key={r.ramo} className="border-b border-line/60">
                    <td className="py-2.5">
                      <button type="button" onClick={() => setRamo(r.ramo)} className="inline-flex items-center gap-2 text-ink hover:underline">
                        <Icon icon={infoRamo(r.ramo).icono} width={16} aria-hidden /> {infoRamo(r.ramo).corto}
                      </button>
                    </td>
                    <td className="py-2.5 text-right text-ink">{fmt(r.act)}</td>
                    <td className="py-2.5 text-right text-ink-soft">{fmt(r.ant)}</td>
                    <td className="py-2.5 text-right"><Crece pct={r.crece} /></td>
                    <td className="py-2.5 text-right text-ink-soft">{r.parte}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  );
}

function anuales(anual: { anio: number }[]): string[] {
  return anual.map((x) => String(x.anio));
}

function textoCrece(pct: number | null): string {
  return pct === null ? "—" : `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toLocaleString("es-MX")}%`;
}

function Tarjeta({ titulo, valor, children }: { titulo: string; valor: string; children: React.ReactNode }) {
  return (
    <div className="glass flex min-h-[130px] flex-col rounded-2xl p-3.5 sm:p-4">
      <span className="text-[13px] font-semibold text-ink-soft">{titulo}</span>
      <span className="mt-1 text-[26px] font-bold leading-tight text-ink md:text-[28px]">{valor}</span>
      <span className="mt-auto pt-1 text-xs">{children}</span>
    </div>
  );
}
