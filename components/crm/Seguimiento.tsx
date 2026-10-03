"use client";

import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { nombreEtapa } from "@/lib/crm-data";
import type { Lead } from "@/lib/types";

interface SeguimientoProps {
  leads: Lead[];
  onAbrir: (id: string) => void;
}

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function calor(dias: number): { color: string; label: string } {
  if (dias >= 3) return { color: "var(--amber)", label: "Se está enfriando" };
  if (dias >= 1) return { color: "var(--sky)", label: "Dale seguimiento" };
  return { color: "var(--green)", label: "Al día" };
}

/** "Hoy": a quién contactar primero. Los que llevan más tiempo sin tocar, arriba. */
export function Seguimiento({ leads, onAbrir }: SeguimientoProps) {
  const pendientes = useMemo(
    () =>
      leads
        .filter((l) => l.etapa !== "ganado" && l.etapa !== "perdido")
        .map((l) => ({ lead: l, dias: diasDesde(l.actualizado_en) }))
        .sort((a, b) => b.dias - a.dias),
    [leads],
  );
  const urgentes = pendientes.filter((p) => p.dias >= 3).length;

  return (
    <section>
      <div className="mb-4 glass flex items-center gap-3 rounded-2xl p-4">
        <Icon icon="flat-color-icons:alarm-clock" width={32} />
        <div>
          <p className="font-semibold text-ink">
            {pendientes.length} prospecto{pendientes.length === 1 ? "" : "s"} en seguimiento
          </p>
          <p className="text-sm text-ink-mute">
            {urgentes > 0 ? `${urgentes} llevan 3+ días sin contacto — contáctalos primero.` : "Vas al día, nadie se está enfriando."}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {pendientes.map(({ lead, dias }) => {
          const c = calor(dias);
          return (
            <button
              key={lead.id}
              onClick={() => onAbrir(lead.id)}
              className="lift glass flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{lead.nombre}</p>
                <p className="text-xs text-ink-mute">
                  {nombreEtapa(lead.etapa)} · {lead.origen}
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: `color-mix(in srgb, ${c.color} 16%, transparent)`, color: c.color }}
              >
                {dias === 0 ? "Hoy" : `${dias} día${dias === 1 ? "" : "s"}`} · {c.label}
              </span>
            </button>
          );
        })}
        {!pendientes.length && (
          <p className="py-12 text-center text-ink-mute">No tienes prospectos activos pendientes. 🎉</p>
        )}
      </div>
    </section>
  );
}
