"use client";

import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { moneda } from "@/lib/crm-data";
import type { Lead } from "@/lib/types";

interface FilaCampana {
  fuente: string;
  medio: string;
  campana: string;
  total: number;
  ganados: number;
  valor: number;
}

/** Rendimiento por canal (UTM): cuántos leads trae cada uno y cuántos cierran. */
export function Campanas({ leads }: { leads: Lead[] }) {
  const filas = useMemo<FilaCampana[]>(() => {
    const mapa = new Map<string, FilaCampana>();
    for (const l of leads) {
      const fuente = l.utm_source || "Directo / orgánico";
      const medio = l.utm_medium || "—";
      const campana = l.utm_campaign || "—";
      const key = `${fuente}|${medio}|${campana}`;
      const fila = mapa.get(key) ?? { fuente, medio, campana, total: 0, ganados: 0, valor: 0 };
      fila.total += 1;
      if (l.etapa === "ganado") {
        fila.ganados += 1;
        fila.valor += l.valor;
      }
      mapa.set(key, fila);
    }
    return [...mapa.values()].sort((a, b) => b.total - a.total);
  }, [leads]);

  return (
    <section>
      {!filas.length && <p className="py-12 text-center text-ink-mute">Todavía no hay leads para medir campañas.</p>}
      {!!filas.length && (
        <div className="no-scrollbar overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-ink-mute">
                <th className="px-4 py-3">Fuente</th>
                <th className="px-4 py-3">Medio</th>
                <th className="px-4 py-3">Campaña</th>
                <th className="px-4 py-3">Leads</th>
                <th className="px-4 py-3">Ganados</th>
                <th className="px-4 py-3">Conversión</th>
                <th className="px-4 py-3">Valor ganado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={`${f.fuente}|${f.medio}|${f.campana}`} className="border-b border-line/60">
                  <td className="px-4 py-3 text-ink">
                    <span className="flex items-center gap-2">
                      <Icon icon="flat-color-icons:advertising" width={18} /> {f.fuente}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{f.medio}</td>
                  <td className="px-4 py-3 text-ink-soft">{f.campana}</td>
                  <td className="px-4 py-3 text-ink-soft">{f.total}</td>
                  <td className="px-4 py-3 text-ink-soft">{f.ganados}</td>
                  <td className="px-4 py-3 text-ink-soft">{f.total ? Math.round((f.ganados / f.total) * 100) : 0}%</td>
                  <td className="px-4 py-3 text-ink-soft">{moneda(f.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
