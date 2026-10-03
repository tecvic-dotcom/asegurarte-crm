"use client";

import { Icon } from "@iconify/react";
import { etapa as etapaPorId, moneda } from "@/lib/crm-data";
import type { Lead } from "@/lib/types";

/**
 * Vista TABLA estilo Excel del CRM. Misma data que el kanban, otra mirada:
 * ideal para escanear muchos prospectos rápido. Clic en la fila → expediente.
 */
interface TablaLeadsProps {
  leads: Lead[];
  onAbrir: (id: string) => void;
}

function fecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

export function TablaLeads({ leads, onAbrir }: TablaLeadsProps) {
  if (!leads.length) {
    return <p className="py-12 text-center text-ink-mute">No hay prospectos con este filtro.</p>;
  }
  return (
    <div className="no-scrollbar overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[680px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-mute">
            <th className="px-4 py-3 font-semibold">Nombre</th>
            <th className="px-4 py-3 font-semibold">Contacto</th>
            <th className="px-4 py-3 font-semibold">Etapa</th>
            <th className="px-4 py-3 font-semibold">Origen</th>
            <th className="px-4 py-3 text-right font-semibold">Valor</th>
            <th className="px-4 py-3 font-semibold">Llegó</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => {
            const e = etapaPorId(l.etapa);
            return (
              <tr
                key={l.id}
                onClick={() => onAbrir(l.id)}
                className="cursor-pointer border-b border-line/60 transition-colors hover:bg-glass"
              >
                <td className="px-4 py-3 font-medium text-ink">{l.nombre}</td>
                <td className="px-4 py-3 text-ink-soft">
                  <div className="truncate">{l.correo}</div>
                  <div className="text-xs text-ink-mute">{l.whatsapp}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ background: `color-mix(in srgb, ${e.color} 16%, transparent)`, color: e.color }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: e.color }} />
                    {e.nombre}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {l.origen}
                  {l.utm_source && <span className="block text-xs text-ink-mute">via {l.utm_source}</span>}
                </td>
                <td className="px-4 py-3 text-right text-ink">{l.valor > 0 ? moneda(l.valor) : "—"}</td>
                <td className="px-4 py-3 text-ink-mute">{fecha(l.creado_en)}</td>
                <td className="px-4 py-3 text-right">
                  <Icon icon="flat-color-icons:expand" width={18} className="opacity-60" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
