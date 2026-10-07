"use client";

import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { ETAPAS_ACTIVAS, nombreEtapa } from "@/lib/crm-data";
import type { EtapaId, Lead } from "@/lib/types";

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

/** "Hoy": tu primera vista. Cuántos prospectos hay en cada etapa y a quién contactar primero (los que llevan más tiempo sin tocar, arriba). */
export function Seguimiento({ leads, onAbrir }: SeguimientoProps) {
  const [etapa, setEtapa] = useState<EtapaId | "todas">("todas");

  const pendientes = useMemo(
    () =>
      leads
        .filter((l) => l.etapa !== "ganado" && l.etapa !== "perdido")
        .map((l) => ({ lead: l, dias: diasDesde(l.actualizado_en) }))
        .sort((a, b) => b.dias - a.dias),
    [leads],
  );
  const porEtapa = useMemo(
    () => Object.fromEntries(ETAPAS_ACTIVAS.map((e) => [e.id, pendientes.filter((p) => p.lead.etapa === e.id).length])) as Record<string, number>,
    [pendientes],
  );
  const urgentes = pendientes.filter((p) => p.dias >= 3).length;
  const visibles = etapa === "todas" ? pendientes : pendientes.filter((p) => p.lead.etapa === etapa);

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

      {/* Cuántos hay en cada etapa; toca una para filtrar la lista */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-label="Filtrar por etapa">
        <button
          type="button"
          aria-pressed={etapa === "todas"}
          onClick={() => setEtapa("todas")}
          className={`rounded-2xl border p-3 text-left ${etapa === "todas" ? "border-brand-2 bg-brand/15" : "border-line bg-glass hover:border-brand-2/60"}`}
        >
          <span className="block text-2xl font-bold text-ink">{pendientes.length}</span>
          <span className="block text-xs text-ink-mute">Todos</span>
        </button>
        {ETAPAS_ACTIVAS.map((e) => (
          <button
            key={e.id}
            type="button"
            aria-pressed={etapa === e.id}
            onClick={() => setEtapa(etapa === e.id ? "todas" : e.id)}
            className={`rounded-2xl border p-3 text-left ${etapa === e.id ? "border-brand-2 bg-brand/15" : "border-line bg-glass hover:border-brand-2/60"}`}
          >
            <span className="block text-2xl font-bold text-ink">{porEtapa[e.id] ?? 0}</span>
            <span className="flex items-center gap-1.5 text-xs text-ink-mute">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: e.color }} aria-hidden />
              {e.nombre}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {visibles.map(({ lead, dias }) => {
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
          <p className="py-12 text-center text-ink-mute">No tienes prospectos activos pendientes. Captura el primero en Contactos → “Agregar prospecto”. 🎉</p>
        )}
        {pendientes.length > 0 && !visibles.length && (
          <p className="py-8 text-center text-ink-mute">No hay prospectos en {etapa === "todas" ? "esta vista" : nombreEtapa(etapa)}.</p>
        )}
      </div>
    </section>
  );
}
