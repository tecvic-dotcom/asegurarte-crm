"use client";

import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { ETAPAS, moneda } from "@/lib/crm-data";
import type { Lead, EtapaId } from "@/lib/types";

const ORDEN_EMBUDO: EtapaId[] = ["nuevo", "contactado", "cita", "propuesta", "ganado"];

/** Embudo de conversión + ventas del mes + leads por origen. */
export function Reportes({ leads }: { leads: Lead[] }) {
  const embudo = useMemo(() => {
    // Conteo "alcanzó al menos esta etapa": un lead en la etapa i pasó por 0..i.
    const indice = new Map(ORDEN_EMBUDO.map((e, i) => [e, i]));
    const activos = leads.filter((l) => l.etapa !== "perdido");
    return ORDEN_EMBUDO.map((etapa, i) => {
      const alcanzaron = activos.filter((l) => (indice.get(l.etapa) ?? -1) >= i).length;
      return { etapa, alcanzaron };
    });
  }, [leads]);

  const porOrigen = useMemo(() => {
    const mapa = new Map<string, { origen: string; total: number; ganados: number }>();
    for (const l of leads) {
      const o = mapa.get(l.origen) ?? { origen: l.origen || "Sin origen", total: 0, ganados: 0 };
      o.total += 1;
      if (l.etapa === "ganado") o.ganados += 1;
      mapa.set(l.origen, o);
    }
    return [...mapa.values()].sort((a, b) => b.total - a.total);
  }, [leads]);

  const ventasDelMes = useMemo(() => {
    const hoy = new Date();
    return leads
      .filter((l) => {
        if (l.etapa !== "ganado") return false;
        // La fecha real de cierre (AI Manager); si aún no existe, la última actualización.
        const f = new Date(l.cerrado_en ?? l.actualizado_en);
        return f.getFullYear() === hoy.getFullYear() && f.getMonth() === hoy.getMonth();
      })
      .reduce((s, l) => s + l.valor, 0);
  }, [leads]);

  const max = Math.max(1, ...embudo.map((e) => e.alcanzaron));

  return (
    <section className="space-y-5">
      <div className="glass flex items-center gap-3 rounded-2xl p-4">
        <Icon icon="flat-color-icons:sales-performance" width={32} />
        <div>
          <p className="text-xl font-bold text-ink">{moneda(ventasDelMes)}</p>
          <p className="text-xs text-ink-mute">Ventas de este mes (pólizas marcadas como ganadas)</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <p className="mb-4 font-semibold text-ink">Embudo de conversión</p>
        <div className="space-y-3">
          {embudo.map(({ etapa, alcanzaron }, i) => {
            const et = ETAPAS.find((e) => e.id === etapa)!;
            const anterior = i > 0 ? embudo[i - 1].alcanzaron : alcanzaron;
            const tasa = anterior ? Math.round((alcanzaron / anterior) * 100) : 100;
            return (
              <div key={etapa} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-sm text-ink-soft">{et.nombre}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-bg-3">
                  <div className="h-full rounded-full" style={{ width: `${(alcanzaron / max) * 100}%`, background: et.color }} />
                </div>
                <span className="w-10 text-right text-sm text-ink-mute">{alcanzaron}</span>
                <span className="w-12 text-right text-xs text-ink-mute">{i > 0 ? `${tasa}%` : ""}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <p className="mb-4 font-semibold text-ink">Leads por origen</p>
        <div className="space-y-3">
          {porOrigen.map((o) => (
            <div key={o.origen} className="flex items-center justify-between text-sm">
              <span className="text-ink-soft">{o.origen}</span>
              <span className="text-ink-mute">
                {o.total} leads · {o.ganados} ganados
              </span>
            </div>
          ))}
          {!porOrigen.length && <p className="text-sm text-ink-mute">Todavía no hay datos.</p>}
        </div>
      </div>
    </section>
  );
}
