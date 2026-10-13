"use client";

import { Icon } from "@iconify/react";
import type { EtapaId, Lead } from "@/lib/types";
import { Pipeline } from "./Pipeline";
import { Reportes } from "./Reportes";

interface EmbudoVentasProps {
  /** Los prospectos que pasan la búsqueda (el tablero). */
  leads: Lead[];
  /** Todos los prospectos (para las estadísticas de conversión y origen, que no dependen de la búsqueda). */
  todos: Lead[];
  /** La búsqueda que está filtrando el tablero (vacía = se ven todos). */
  busca: string;
  onQuitarBusqueda: () => void;
  onMover: (id: string, etapa: EtapaId) => void;
  onAbrir: (id: string) => void;
}

/**
 * Embudo de ventas: una columna por etapa con tus prospectos (nombre, WhatsApp y ramo) para arrastrarlos de una etapa a
 * otra. Abajo, plegado, queda el análisis de conversión y origen que tenía el menú «Embudo».
 */
export function EmbudoVentas({ leads, todos, busca, onQuitarBusqueda, onMover, onAbrir }: EmbudoVentasProps) {
  const filtrando = busca.trim() !== "";
  return (
    <section className="space-y-5">
      <p className="flex items-start gap-2 text-sm text-ink-soft">
        <Icon icon="flat-color-icons:info" width={18} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          Arrastra cada prospecto, agarrándolo por su nombre, a la etapa en la que va. Toca su número para escribirle por WhatsApp y la flechita azul
          para abrir su expediente.
        </span>
      </p>

      {filtrando && (
        <p
          className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border px-3.5 py-2.5 text-sm text-ink"
          style={{ borderColor: "color-mix(in srgb, var(--amber) 55%, transparent)", background: "color-mix(in srgb, var(--amber) 8%, transparent)" }}
          role="status"
        >
          <Icon icon="flat-color-icons:filled-filter" width={18} aria-hidden />
          <span>
            Estás viendo <strong>{leads.length}</strong> de <strong>{todos.length}</strong> prospectos: solo los que coinciden con «{busca.trim()}».
          </span>
          <button type="button" onClick={onQuitarBusqueda} className="font-semibold underline hover:text-ink">
            Ver todos
          </button>
        </p>
      )}

      <Pipeline modo="embudo" leads={leads} onMover={onMover} onAbrir={onAbrir} />

      <details className="glass group rounded-2xl">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold text-ink">
          <Icon icon="flat-color-icons:bar-chart" width={22} aria-hidden /> Conversión y origen de tus prospectos
          <span className="ml-auto text-xs font-normal text-ink-mute group-open:hidden">Ver</span>
          <span className="ml-auto hidden text-xs font-normal text-ink-mute group-open:inline">Ocultar</span>
        </summary>
        <div className="px-4 pb-4">
          <Reportes leads={todos} />
        </div>
      </details>
    </section>
  );
}
