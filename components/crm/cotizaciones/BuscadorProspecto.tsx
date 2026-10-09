"use client";

import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { etapa as etapaPorId } from "@/lib/crm-data";
import type { Lead } from "@/lib/types";

const sinAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface BuscadorProspectoProps {
  leads: Lead[];
  onElegir: (id: string) => void;
  /** Lleva a Prospectos para dar de alta a alguien nuevo. */
  onNuevo: () => void;
}

/** Elegir a quién le cotizas: tus prospectos más recientes, o escribe para buscar. */
export function BuscadorProspecto({ leads, onElegir, onNuevo }: BuscadorProspectoProps) {
  const [q, setQ] = useState("");
  const candidatos = useMemo(() => leads.filter((l) => l.etapa !== "perdido"), [leads]);
  const busqueda = q.trim();
  const resultados = useMemo(() => {
    const t = sinAcentos(busqueda);
    if (!t) return [...candidatos].sort((a, b) => b.actualizado_en.localeCompare(a.actualizado_en)).slice(0, 6);
    return candidatos
      .filter((l) => sinAcentos(l.nombre).includes(t) || l.whatsapp.includes(t) || sinAcentos(l.correo).includes(t))
      .slice(0, 8);
  }, [candidatos, busqueda]);

  return (
    <div className="glass space-y-3 rounded-2xl p-4">
      <label htmlFor="cotizar-buscar" className="field-label">
        ¿A quién le cotizas?
      </label>
      <input
        id="cotizar-buscar"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Escribe su nombre o su WhatsApp…"
        autoComplete="off"
        className="field-input"
      />
      <p className="text-xs text-ink-mute">{busqueda ? "Resultados:" : "Tus prospectos más recientes:"}</p>
      {resultados.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {resultados.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => onElegir(l.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-line bg-bg-2/40 px-3 py-2.5 text-left transition-colors hover:border-brand-2"
              >
                <Icon icon="flat-color-icons:businessman" width={24} className="shrink-0" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{l.nombre}</span>
                  <span className="block truncate text-xs text-ink-mute">
                    {etapaPorId(l.etapa).nombre}
                    {l.whatsapp && ` · ${l.whatsapp}`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {busqueda && resultados.length === 0 && <p className="text-sm text-ink-mute">No encontré a nadie con eso.</p>}
      <button type="button" onClick={onNuevo} className="text-sm text-ink-soft underline underline-offset-2 hover:text-ink">
        ¿No está en la lista? Agrégalo en Prospectos
      </button>
    </div>
  );
}
