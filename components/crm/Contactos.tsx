"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { crmActualizar } from "@/lib/api";
import { ETAPAS } from "@/lib/crm-data";
import type { Lead, EtapaId } from "@/lib/types";

interface ContactosProps {
  leads: Lead[];
  onAbrir: (id: string) => void;
  onCambio: () => void;
}

function csvCampo(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function exportarCSV(leads: Lead[]) {
  const cab = ["nombre", "correo", "whatsapp", "etapa", "valor", "origen", "creado_en"];
  const filas = leads.map((l) =>
    [l.nombre, l.correo, l.whatsapp, l.etapa, String(l.valor), l.origen, l.creado_en].map(csvCampo).join(","),
  );
  const csv = [cab.join(","), ...filas].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "mis-contactos.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/** Vista tipo hoja de cálculo: edita nombre, etapa y valor sin salir de la tabla. */
export function Contactos({ leads, onAbrir, onCambio }: ContactosProps) {
  const [editando, setEditando] = useState<string | null>(null);

  async function guardarCampo(id: string, patch: { nombre?: string; valor?: number; etapa?: EtapaId }) {
    setEditando(id);
    try {
      await crmActualizar(id, patch);
      onCambio();
    } finally {
      setEditando(null);
    }
  }

  return (
    <section>
      <div className="mb-3 flex justify-end">
        <button onClick={() => exportarCSV(leads)} className="btn-ghost px-3 py-2 text-sm">
          <Icon icon="flat-color-icons:export" width={18} /> Exportar CSV
        </button>
      </div>
      <div className="no-scrollbar overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-ink-mute">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Etapa</th>
              <th className="px-4 py-3">Valor (MXN)</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-b border-line/60">
                <td className="px-2 py-1">
                  <input
                    defaultValue={l.nombre}
                    onBlur={(e) => e.target.value !== l.nombre && guardarCampo(l.id, { nombre: e.target.value })}
                    disabled={editando === l.id}
                    className="w-full rounded-lg bg-transparent px-2 py-2 text-ink outline-none hover:bg-glass focus:bg-glass"
                  />
                </td>
                <td className="px-4 py-3 text-ink-soft">{l.correo}</td>
                <td className="px-4 py-3 text-ink-soft">{l.whatsapp}</td>
                <td className="px-2 py-1">
                  <select
                    value={l.etapa}
                    onChange={(e) => guardarCampo(l.id, { etapa: e.target.value as EtapaId })}
                    disabled={editando === l.id}
                    className="w-full rounded-lg bg-transparent px-2 py-2 text-ink-soft outline-none hover:bg-glass focus:bg-glass"
                  >
                    {ETAPAS.map((et) => (
                      <option key={et.id} value={et.id}>
                        {et.nombre}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    min={0}
                    defaultValue={l.valor}
                    onBlur={(e) => Number(e.target.value) !== l.valor && guardarCampo(l.id, { valor: Number(e.target.value) || 0 })}
                    disabled={editando === l.id}
                    className="w-28 rounded-lg bg-transparent px-2 py-2 text-ink-soft outline-none hover:bg-glass focus:bg-glass"
                  />
                </td>
                <td className="px-4 py-3 text-ink-soft">{l.origen}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => onAbrir(l.id)} className="text-ink-mute hover:text-ink" title="Ver ficha completa">
                    <Icon icon="flat-color-icons:view-details" width={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!leads.length && <p className="py-12 text-center text-ink-mute">Todavía no tienes contactos.</p>}
      </div>
    </section>
  );
}
