"use client";

import { useCallback, useEffect, useState } from "react";
import { crmTarjeta, ErrorCRM } from "@/lib/api";
import type { ResumenTarjeta } from "@/lib/tarjeta-reglas";
import { fechaCorta } from "@/lib/fechas";
import { AvisoMigracion } from "./panel/AvisoMigracion";
import { Inicio } from "./tarjeta/Inicio";
import { Rendimiento } from "./tarjeta/Rendimiento";
import { Contenido } from "./tarjeta/Contenido";
import { Publico } from "./tarjeta/Publico";

const PERIODOS = [7, 30, 90] as const;
const PESTANAS = [
  ["inicio", "Inicio"],
  ["rendimiento", "Rendimiento"],
  ["contenido", "Contenido"],
  ["publico", "Público"],
] as const;
type Pestana = (typeof PESTANAS)[number][0];

/**
 * Tarjeta web: qué hace la gente en tu tarjeta digital (/roberto), ordenado como «Tu panel» de Instagram
 * (Inicio, Rendimiento, Contenido y Público). Todo es anónimo: se cuenta qué se toca, nunca quién.
 * Las «visitas» son cargas de la página (la misma persona puede sumar varias).
 */
export function TarjetaWeb() {
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30);
  const [pestana, setPestana] = useState<Pestana>("inicio");
  const [r, setR] = useState<ResumenTarjeta | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const cargar = useCallback(
    () =>
      crmTarjeta(dias).then(
        (d) => {
          setR(d);
          setError(null);
        },
        (e: unknown) => setError(e as Error),
      ),
    [dias],
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (error instanceof ErrorCRM && error.migracion) {
    return (
      <AvisoMigracion
        onListo={() => void cargar()}
        archivo={error.archivo}
        que="la medición de tu tarjeta web"
        detalle="Tu libreta en la nube (Supabase) necesita un cajón nuevo para contar, de forma anónima, qué se toca en tu tarjeta (sin nombres, sin teléfonos, sin IP). Se hace una sola vez."
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
  if (!r) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Cargando las estadísticas de tu tarjeta">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[124px] animate-pulse rounded-2xl bg-bg-3/70" />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="glass-strong rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <p className="min-w-0 text-sm text-ink-soft [overflow-wrap:anywhere] sm:order-1">
            Qué hace la gente en <strong className="text-ink">www.especialistaenasegurarte.lat/roberto</strong>: hasta dónde baja, qué toca y qué te escribe. Todo es{" "}
            <strong className="text-ink">anónimo</strong>: se cuenta qué se toca, nunca quién.
          </p>
          <label className="flex shrink-0 items-center gap-2 self-end text-xs text-ink-mute sm:order-2 sm:self-auto">
            <span className="sr-only sm:not-sr-only">Periodo</span>
            <select
              value={dias}
              onChange={(e) => setDias(Number(e.target.value) as (typeof PERIODOS)[number])}
              className="min-h-[40px] rounded-xl border border-line bg-glass px-3 text-sm font-semibold text-ink"
            >
              {PERIODOS.map((p) => (
                <option key={p} value={p}>
                  {p} días
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-1.5 text-xs text-ink-mute">
          Del {fechaCorta(r.desde)} al {fechaCorta(r.hasta)}
          {!r.cloud && " · MODO DEMOSTRACIÓN: números inventados"}
        </p>
      </div>

      <div className="flex overflow-x-auto overflow-y-hidden border-b border-line" role="tablist" aria-label="Secciones del panel">
        {PESTANAS.map(([id, texto]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-tarjeta-${id}`}
            aria-selected={pestana === id}
            aria-controls="panel-tarjeta"
            onClick={() => setPestana(id)}
            className={`min-h-[44px] shrink-0 whitespace-nowrap border-b-2 px-3.5 text-sm sm:px-5 ${pestana === id ? "border-brand-2 font-semibold text-ink" : "border-transparent text-ink-mute hover:text-ink"}`}
          >
            {texto}
          </button>
        ))}
      </div>

      <div id="panel-tarjeta" role="tabpanel" aria-labelledby={`tab-tarjeta-${pestana}`} className={r.dias === dias ? "" : "opacity-60 transition-opacity"}>
        {pestana === "inicio" && <Inicio r={r} />}
        {pestana === "rendimiento" && <Rendimiento r={r} />}
        {pestana === "contenido" && <Contenido r={r} />}
        {pestana === "publico" && <Publico r={r} />}
      </div>
    </section>
  );
}
