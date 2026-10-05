"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { RAMOS } from "@/lib/ramos";
import { FORMAS_PAGO, validarPoliza } from "@/lib/cobranza-reglas";
import type { DatosPoliza, FormaPago, Poliza, Ramo } from "@/lib/types";

/** Lo que se captura en pantalla (todo como texto, igual que lo escribes). */
interface Campos {
  asegurado: string;
  whatsapp: string;
  numero: string;
  ramo: Ramo | "";
  aseguradora: string;
  forma_pago: FormaPago;
  monto_pago: string;
  fecha_limite_pago: string;
  renovacion: string;
  prima_anual: string;
  correo: string;
  notas: string;
  lead_id: string | null;
}

function camposDe(d: Partial<DatosPoliza> | Poliza | null): Campos {
  return {
    asegurado: d?.asegurado ?? "",
    whatsapp: d?.whatsapp ?? "",
    numero: d?.numero ?? "",
    ramo: d?.ramo ?? "",
    aseguradora: d?.aseguradora ?? "",
    forma_pago: d?.forma_pago ?? "anual",
    monto_pago: d?.monto_pago ? String(d.monto_pago) : "",
    fecha_limite_pago: d?.fecha_limite_pago ?? "",
    renovacion: d?.renovacion ?? "",
    prima_anual: d?.prima_anual ? String(d.prima_anual) : "",
    correo: d?.correo ?? "",
    notas: d?.notas ?? "",
    lead_id: d?.lead_id ?? null,
  };
}

interface FormularioPolizaProps {
  /** Si viene, se edita esa póliza; si no, es nueva (puede venir prellenada desde un cliente ganado). */
  poliza: Poliza | null;
  inicial: Partial<DatosPoliza> | null;
  guardando: boolean;
  error: string | null;
  onGuardar: (datos: DatosPoliza) => void;
  onCancelar: () => void;
  onCancelarPoliza?: (cancelada: boolean) => void;
  onBorrar?: () => void;
}

export function FormularioPoliza({
  poliza,
  inicial,
  guardando,
  error,
  onGuardar,
  onCancelar,
  onCancelarPoliza,
  onBorrar,
}: FormularioPolizaProps) {
  const [c, setC] = useState<Campos>(() => camposDe(poliza ?? inicial));
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const set = (cambios: Partial<Campos>) => setC((x) => ({ ...x, ...cambios }));

  function guardar() {
    const r = validarPoliza({ ...c, ramo: c.ramo || null });
    if (!r.ok) {
      setErrorLocal(r.error);
      return;
    }
    setErrorLocal(null);
    onGuardar(r.datos);
  }

  const mensajeError = errorLocal ?? error;

  return (
    <div id="formulario-poliza" className="glass-strong mb-4 scroll-mt-4 rounded-2xl p-4 sm:p-5">
      <p className="mb-1 font-semibold text-ink">{poliza ? "Editar póliza" : "Nueva póliza en tu cartera"}</p>
      <p className="mb-4 text-xs text-ink-mute">
        Con el nombre, el WhatsApp y la fecha límite del próximo pago, Valeri ya puede trabajar. Lo demás es opcional.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo id="pz-asegurado" etiqueta="Asegurado *" className="sm:col-span-2">
          <input id="pz-asegurado" value={c.asegurado} maxLength={160} onChange={(e) => set({ asegurado: e.target.value })} placeholder="Nombre del cliente o empresa" className="field-input" />
        </Campo>
        <Campo id="pz-whatsapp" etiqueta="WhatsApp">
          <input id="pz-whatsapp" inputMode="tel" value={c.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="81 1234 5678" className="field-input" />
        </Campo>
        <Campo id="pz-numero" etiqueta="Número de póliza">
          <input id="pz-numero" value={c.numero} maxLength={40} onChange={(e) => set({ numero: e.target.value })} placeholder="F746002330" className="field-input" />
        </Campo>
        <Campo id="pz-ramo" etiqueta="Ramo">
          <select id="pz-ramo" value={c.ramo} onChange={(e) => set({ ramo: e.target.value as Ramo | "" })} className="field-input">
            <option value="">Sin definir</option>
            {RAMOS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="pz-aseguradora" etiqueta="Aseguradora">
          <input id="pz-aseguradora" value={c.aseguradora} maxLength={60} onChange={(e) => set({ aseguradora: e.target.value })} placeholder="AXA, GNP, Chubb…" className="field-input" />
        </Campo>
        <Campo id="pz-forma" etiqueta="Forma de pago">
          <select id="pz-forma" value={c.forma_pago} onChange={(e) => set({ forma_pago: e.target.value as FormaPago })} className="field-input">
            {FORMAS_PAGO.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="pz-monto" etiqueta="Monto de cada pago (MXN)">
          <input id="pz-monto" inputMode="decimal" value={c.monto_pago} onChange={(e) => set({ monto_pago: e.target.value })} placeholder="1850" className="field-input" />
        </Campo>
        <Campo id="pz-limite" etiqueta="Fecha límite del próximo pago">
          <input id="pz-limite" type="date" value={c.fecha_limite_pago} onChange={(e) => set({ fecha_limite_pago: e.target.value })} className="field-input [color-scheme:dark]" />
        </Campo>
        <Campo id="pz-renovacion" etiqueta="Renovación">
          <input id="pz-renovacion" type="date" value={c.renovacion} onChange={(e) => set({ renovacion: e.target.value })} className="field-input [color-scheme:dark]" />
        </Campo>
        <Campo id="pz-prima" etiqueta="Prima anual (opcional)">
          <input id="pz-prima" inputMode="decimal" value={c.prima_anual} onChange={(e) => set({ prima_anual: e.target.value })} placeholder="22000" className="field-input" />
        </Campo>
        <Campo id="pz-correo" etiqueta="Correo (opcional)">
          <input id="pz-correo" type="email" value={c.correo} onChange={(e) => set({ correo: e.target.value })} placeholder="cliente@correo.com" className="field-input" />
        </Campo>
        <Campo id="pz-notas" etiqueta="Notas" className="sm:col-span-2">
          <textarea id="pz-notas" rows={2} maxLength={1000} value={c.notas} onChange={(e) => set({ notas: e.target.value })} className="field-input resize-y" />
        </Campo>
      </div>

      {mensajeError && (
        <p className="mt-3 flex items-start gap-1.5 text-sm" style={{ color: "var(--red)" }} role="alert">
          <Icon icon="flat-color-icons:high-priority" width={16} className="mt-0.5 shrink-0" aria-hidden /> {mensajeError}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={guardar} disabled={guardando} className="btn-primary flex-1 py-3 text-sm sm:flex-none sm:px-8">
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" onClick={onCancelar} className="btn-ghost px-4 py-3 text-sm">
          Cerrar
        </button>
      </div>

      {poliza && (onCancelarPoliza || onBorrar) && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-3 text-xs">
          {onCancelarPoliza && (
            <button
              type="button"
              onClick={() => onCancelarPoliza(poliza.estatus_manual !== "cancelada")}
              className="min-h-[36px] text-ink-mute underline hover:text-ink"
            >
              {poliza.estatus_manual === "cancelada" ? "Reactivar póliza (volver a cobrarla)" : "Marcar como cancelada (ya no cobrarla)"}
            </button>
          )}
          {onBorrar && (
            <button type="button" onClick={onBorrar} className="min-h-[36px] underline" style={{ color: "var(--red)" }}>
              Borrar póliza
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Campo({ id, etiqueta, className = "", children }: { id: string; etiqueta: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={id}>
        {etiqueta}
      </label>
      {children}
    </div>
  );
}
