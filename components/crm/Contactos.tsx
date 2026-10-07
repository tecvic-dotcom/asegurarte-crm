"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { crmActualizar, crmCrearLead } from "@/lib/api";
import { RAMOS } from "@/lib/ramos";
import { ETAPAS } from "@/lib/crm-data";
import { ORIGENES_MANUAL, type Lead, type EtapaId, type NuevoLeadManual, type Ramo } from "@/lib/types";

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

const VACIO: NuevoLeadManual = { nombre: "", whatsapp: "", correo: "", etapa: "nuevo", ramo: null, valor: 0, origen: "Manual", notas: "" };

/** Formulario para capturar un prospecto a mano, con su etapa desde el inicio. */
function FormularioProspecto({ onGuardado, onCancelar, onAbrir }: { onGuardado: () => void; onCancelar: () => void; onAbrir: (id: string) => void }) {
  const [f, setF] = useState<NuevoLeadManual>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicado, setDuplicado] = useState<string | null>(null);
  const set = (p: Partial<NuevoLeadManual>) => setF((x) => ({ ...x, ...p }));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    setDuplicado(null);
    try {
      const r = await crmCrearLead(f);
      if (r.duplicado && r.id) {
        setDuplicado(r.id);
      } else {
        onGuardado();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="glass-strong mb-4 space-y-3 rounded-2xl p-4 sm:p-5">
      <p className="font-semibold text-ink">Nuevo prospecto</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-xs text-ink-mute">
          Nombre *
          <input className="field-input mt-1" value={f.nombre} onChange={(e) => set({ nombre: e.target.value })} autoFocus required />
        </label>
        <label className="block text-xs text-ink-mute">
          WhatsApp (10 dígitos)
          <input className="field-input mt-1" inputMode="tel" value={f.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="81 1234 5678" />
        </label>
        <label className="block text-xs text-ink-mute">
          Correo (opcional)
          <input className="field-input mt-1" type="email" value={f.correo} onChange={(e) => set({ correo: e.target.value })} />
        </label>
        <label className="block text-xs text-ink-mute">
          Estatus (etapa)
          <select className="field-input mt-1" value={f.etapa} onChange={(e) => set({ etapa: e.target.value as EtapaId })}>
            {ETAPAS.map((et) => (
              <option key={et.id} value={et.id}>
                {et.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-ink-mute">
          Ramo
          <select className="field-input mt-1" value={f.ramo ?? ""} onChange={(e) => set({ ramo: (e.target.value || null) as Ramo | null })}>
            <option value="">Sin definir</option>
            {RAMOS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-ink-mute">
          Valor estimado (MXN)
          <input className="field-input mt-1" type="number" min={0} inputMode="numeric" value={f.valor || ""} onChange={(e) => set({ valor: Number(e.target.value) || 0 })} placeholder="0" />
        </label>
        <label className="block text-xs text-ink-mute">
          ¿De dónde viene?
          <select className="field-input mt-1" value={f.origen} onChange={(e) => set({ origen: e.target.value })}>
            {ORIGENES_MANUAL.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-ink-mute sm:col-span-2">
          Notas
          <input className="field-input mt-1" value={f.notas} onChange={(e) => set({ notas: e.target.value })} placeholder="Qué platicaron, qué busca, cuándo llamarle…" />
        </label>
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--red)" }} role="alert">
          {error}
        </p>
      )}
      {duplicado && (
        <p className="text-sm text-ink-soft" role="status">
          Ya tienes un prospecto con ese WhatsApp o correo.{" "}
          <button type="button" onClick={() => onAbrir(duplicado)} className="font-semibold text-ink underline">
            Abrir su expediente
          </button>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={guardando} className="btn-primary px-4 py-2.5 text-sm">
          {guardando ? "Guardando…" : "Guardar prospecto"}
        </button>
        <button type="button" onClick={onCancelar} className="btn-ghost px-4 py-2.5 text-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Vista tipo hoja de cálculo: edita nombre, etapa y valor sin salir de la tabla. */
export function Contactos({ leads, onAbrir, onCambio }: ContactosProps) {
  const [editando, setEditando] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);

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
      {agregando && (
        <FormularioProspecto
          onGuardado={() => {
            setAgregando(false);
            onCambio();
          }}
          onCancelar={() => setAgregando(false)}
          onAbrir={onAbrir}
        />
      )}
      <div className="mb-3 flex flex-wrap justify-end gap-2">
        <button onClick={() => setAgregando((v) => !v)} className="btn-primary px-3 py-2 text-sm">
          <Icon icon="flat-color-icons:plus" width={18} /> Agregar prospecto
        </button>
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
        {!leads.length && <p className="py-12 text-center text-ink-mute">Todavía no tienes contactos. Usa “Agregar prospecto” para capturar el primero.</p>}
      </div>
    </section>
  );
}
