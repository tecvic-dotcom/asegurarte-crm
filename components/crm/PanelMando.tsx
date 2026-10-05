"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { crmPanel, ErrorCRM } from "@/lib/api";
import { hoyLocal } from "@/lib/fechas";
import type { PanelSnapshot, PeriodoPanel } from "@/lib/types";
import { TarjetaKpi } from "./panel/TarjetaKpi";
import { MetaRamos } from "./panel/MetaRamos";
import { GraficaMeses } from "./panel/GraficaMeses";
import { GastosCategoria } from "./panel/GastosCategoria";
import { Movimientos } from "./panel/Movimientos";
import { AvisoMigracion } from "./panel/AvisoMigracion";

const PERIODOS: [PeriodoPanel, string][] = [
  ["mes", "Este mes"],
  ["mes_pasado", "Mes pasado"],
  ["meta", "Mi meta"],
];

/** Cada cuánto se actualiza solo (y también al regresar a la pestaña). */
const REFRESCO_MS = 60_000;

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Panel de Mando (Módulo 3 · AI Manager). Analogía: el tablero del coche.
 * Arriba el reporte de una frase; luego el periodo (manda en todo lo de abajo),
 * tus 4 números grandes, tu meta por ramo, tus gráficas y tus movimientos.
 */
export function PanelMando({ onVerSinRamo }: { onVerSinRamo: () => void }) {
  const [periodo, setPeriodo] = useState<PeriodoPanel>("mes");
  const [datos, setDatos] = useState<PanelSnapshot | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [cargando, setCargando] = useState(true);
  const ultimoPedido = useRef(0);

  /** Pide tus números al servidor; si llegan dos respuestas, solo cuenta la más reciente. */
  const pedir = useCallback((p: PeriodoPanel) => {
    const pedido = ++ultimoPedido.current;
    return crmPanel(p).then(
      (d) => {
        if (pedido !== ultimoPedido.current) return;
        setDatos(d);
        setError(null);
        setCargando(false);
      },
      (e: unknown) => {
        if (pedido !== ultimoPedido.current) return;
        setError(e as Error);
        setCargando(false);
      },
    );
  }, []);

  const recargar = useCallback(() => {
    setCargando(true);
    void pedir(periodo);
  }, [pedir, periodo]);

  useEffect(() => {
    void pedir(periodo);
  }, [periodo, pedir]);

  // Se actualiza solo: cada minuto mientras lo ves, y al regresar a la pestaña.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === "visible") recargar();
    };
    const t = window.setInterval(alVolver, REFRESCO_MS);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [recargar]);

  function cambiarPeriodo(p: PeriodoPanel) {
    if (p === periodo) return;
    setCargando(true);
    setPeriodo(p);
  }

  if (error instanceof ErrorCRM && error.migracion) {
    return <AvisoMigracion onListo={recargar} />;
  }

  return (
    <section className="space-y-4">
      {/* Reporte de una frase: se lee en 20 segundos, antes del café */}
      <div className="glass-strong rounded-2xl p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg text-ink">
            <Icon icon="flat-color-icons:combo-chart" width={22} aria-hidden /> Panel de Mando
          </h2>
          <button
            type="button"
            onClick={recargar}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-xs text-ink-mute hover:text-ink"
          >
            <Icon icon="flat-color-icons:refresh" width={16} className={cargando ? "animate-pulse" : ""} aria-hidden />
            {datos ? `Actualizado ${hora(datos.generado_en)}` : "Cargando…"}
          </button>
        </div>
        {datos ? (
          <p className="text-[15px] leading-relaxed text-ink">{datos.frase}</p>
        ) : (
          <div className="space-y-2" aria-label="Cargando tu reporte">
            <div className="h-4 animate-pulse rounded bg-bg-3" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-bg-3" />
          </div>
        )}
        {datos && !datos.cloud && (
          <p className="mt-2 text-xs" style={{ color: "var(--amber)" }}>
            Modo demostración: estos números son de muestra (tu Supabase no está conectado aquí).
          </p>
        )}
      </div>

      {/* El filtro de periodo manda en TODO lo que está debajo */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-line bg-glass p-1" role="group" aria-label="Periodo">
          {PERIODOS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => cambiarPeriodo(id)}
              aria-pressed={periodo === id}
              className={`min-h-[40px] rounded-lg px-3 text-sm transition-colors ${
                periodo === id ? "bg-brand/25 font-semibold text-ink" : "text-ink-mute hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {datos && (
          <span className="text-xs text-ink-mute">
            {datos.actual.etiqueta} · comparado con {datos.anterior.etiqueta}
          </span>
        )}
      </div>

      {!datos && error && (
        <div className="glass rounded-2xl p-5 text-center">
          <p className="text-sm text-ink-soft">{error.message}</p>
          <button type="button" onClick={recargar} className="btn-primary mt-3 px-4 py-2.5 text-sm">
            Reintentar
          </button>
        </div>
      )}

      {!datos && !error && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Cargando tus números">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[150px] animate-pulse rounded-2xl bg-bg-3/70" />
          ))}
        </div>
      )}

      {datos && (
        // Al recargar, lo anterior se queda a media luz: nada brinca ni parpadea.
        <div className={`space-y-4 transition-opacity ${cargando ? "opacity-60" : ""}`}>
          {error && (
            <p className="rounded-xl border border-line bg-bg-3/60 p-3 text-xs text-ink-soft">
              No pude actualizar ahorita; te muestro lo último que cargué. {error.message}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {datos.kpis.map((k) => (
              <TarjetaKpi key={k.id} kpi={k} etiquetaAnterior={datos.anterior.etiqueta} />
            ))}
          </div>

          <MetaRamos ramos={datos.ramos} onVerSinRamo={onVerSinRamo} />

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <GraficaMeses meses={datos.meses} mesEnCurso={hoyLocal().slice(0, 7)} />
            </div>
            <div className="lg:col-span-2">
              <GastosCategoria gastos={datos.gastosPorCategoria} etiqueta={datos.actual.etiqueta} />
            </div>
          </div>

          {/* La "key" reinicia la lista al cambiar de periodo (nada de movimientos del periodo anterior). */}
          <Movimientos key={`${datos.actual.desde}_${datos.actual.hasta}`} rango={datos.actual} onCambio={recargar} />
        </div>
      )}
    </section>
  );
}
