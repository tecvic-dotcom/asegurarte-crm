"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import {
  ASEGURADORAS_RAPIDAS,
  ASEGURADORAS_SUGERIDAS,
  FORMAS_PAGO,
  infoRamoCotizacion,
  MAX_ASEGURADORA,
  MAX_DATO,
  MAX_NOTAS,
  MAX_PLAN,
  RAMOS_COTIZACION,
  validarCotizacion,
  type Cotizacion,
  type DatosCotizacion,
  type FormaPago,
  type MonedaCotizacion,
  type RamoCotizacion,
} from "@/lib/cotizaciones-reglas";
import type { Lead } from "@/lib/types";

interface FormularioCotizacionProps {
  lead: Lead;
  modo: "nueva" | "editar" | "duplicar";
  ramoInicial: RamoCotizacion;
  /** La cotización de la que se parte (al editarla o duplicarla). */
  base?: Cotizacion;
  /** Datos que no cambian entre opciones (asegurados, vehículo…): llegan ya escritos al "agregar otra". */
  arrastre?: Record<string, string>;
  /** Si viene de leer un archivo: su nombre y lo que la IA no vio claro (para que lo revises antes de guardar). */
  archivo?: string;
  avisos?: string[];
  /** Guarda; si falla, lanza el error para que el formulario lo muestre y siga abierto. */
  onGuardar: (datos: DatosCotizacion, otra: boolean) => Promise<void>;
  onCancelar: () => void;
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        activo ? "border-brand-2 bg-brand/25 text-ink" : "border-line bg-glass text-ink-mute hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** Anotar (o corregir) una opción que cotizaste: aseguradora, plan, precio y las coberturas del ramo. */
export function FormularioCotizacion({ lead, modo, ramoInicial, base, arrastre, archivo, avisos, onGuardar, onCancelar }: FormularioCotizacionProps) {
  const [ramoId, setRamoId] = useState<RamoCotizacion>(base?.ramo ?? ramoInicial);
  const [aseguradora, setAseguradora] = useState(base?.aseguradora ?? "");
  const [plan, setPlan] = useState(base?.plan ?? "");
  const [prima, setPrima] = useState(base && base.prima > 0 ? String(base.prima) : "");
  const [moneda, setMoneda] = useState<MonedaCotizacion>(base?.moneda ?? "MN");
  const [forma, setForma] = useState<FormaPago | "">(base?.forma_pago ?? "");
  const [monto, setMonto] = useState(base?.monto_pago ? String(base.monto_pago) : "");
  const [primerPago, setPrimerPago] = useState(base?.primer_pago ? String(base.primer_pago) : "");
  const [vigencia, setVigencia] = useState(base?.vigencia_hasta ?? "");
  const [datos, setDatos] = useState<Record<string, string>>({ ...(arrastre ?? {}), ...(base?.datos ?? {}) });
  const [notas, setNotas] = useState(base?.notas ?? "");
  const [guardando, setGuardando] = useState(false);
  const [falla, setFalla] = useState<string | null>(null);

  const ramo = infoRamoCotizacion(ramoId);

  // Al abrirse se asoma solo: la tabla de abajo puede estar lejos del botón que lo abrió.
  const raiz = useRef<HTMLFormElement>(null);
  useEffect(() => {
    raiz.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function cambiarRamo(id: RamoCotizacion) {
    if (id === ramoId) return;
    setRamoId(id);
    setDatos({});
    if (!infoRamoCotizacion(id).enPagos) {
      setForma("");
      setMonto("");
      setPrimerPago("");
    }
    setFalla(null);
  }

  async function guardar(e: React.SyntheticEvent, otra: boolean) {
    e.preventDefault();
    if (guardando) return;
    const r = validarCotizacion({
      lead_id: lead.id,
      ramo: ramoId,
      aseguradora,
      plan,
      prima,
      moneda,
      forma_pago: forma || null,
      monto_pago: forma ? monto : null,
      primer_pago: forma ? primerPago : null,
      vigencia_hasta: vigencia || null,
      datos,
      notas,
    });
    if (!r.ok) {
      setFalla(r.error);
      return;
    }
    setGuardando(true);
    setFalla(null);
    try {
      await onGuardar(r.datos, otra);
    } catch (err) {
      setFalla((err as Error).message || "No pude guardarla. Intenta de nuevo.");
      setGuardando(false);
    }
  }

  const titulo =
    modo === "editar" ? `Editar cotización de ${ramo.nombre.toLowerCase()}` : modo === "duplicar" ? "Otra opción (parte de una que ya guardaste)" : `Nueva cotización: ${ramo.nombre.toLowerCase()}`;

  return (
    <form
      ref={raiz}
      onSubmit={(e) => void guardar(e, false)}
      onKeyDown={(e) => e.key === "Escape" && onCancelar()}
      className="glass scroll-mt-20 space-y-4 rounded-2xl border border-brand-2 p-4"
      aria-label={titulo}
    >
      <p className="flex items-center gap-2 font-display text-lg text-ink">
        <Icon icon={ramo.icono} width={26} aria-hidden /> {titulo}
      </p>

      {archivo && (
        <div
          role="status"
          className="rounded-xl border px-3.5 py-3 text-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--amber) 50%, transparent)",
            background: "color-mix(in srgb, var(--amber) 8%, transparent)",
          }}
        >
          <p className="flex items-center gap-1.5 font-semibold text-ink">
            <Icon icon="flat-color-icons:high-priority" width={18} aria-hidden /> Leí «{archivo}». Revisa que todo esté bien antes de guardar.
          </p>
          {avisos && avisos.length > 0 ? (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-ink-soft">
              {avisos.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-ink-soft">Todo se veía claro, pero la IA puede equivocarse: compara con el documento.</p>
          )}
        </div>
      )}

      {modo !== "editar" && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Ramo">
          {RAMOS_COTIZACION.map((r) => (
            <Chip key={r.id} activo={r.id === ramoId} onClick={() => cambiarRamo(r.id)}>
              <Icon icon={r.icono} width={16} aria-hidden /> {r.corto}
            </Chip>
          ))}
        </div>
      )}

      {/* Quién y qué plan */}
      <div className="space-y-2">
        <label htmlFor="cot-aseguradora" className="field-label">
          Aseguradora
        </label>
        <div className="flex flex-wrap gap-2">
          {ASEGURADORAS_RAPIDAS.map((a) => (
            <Chip key={a} activo={aseguradora.trim().toLowerCase() === a.toLowerCase()} onClick={() => setAseguradora(a)}>
              {a}
            </Chip>
          ))}
        </div>
        <input
          id="cot-aseguradora"
          value={aseguradora}
          onChange={(e) => setAseguradora(e.target.value)}
          maxLength={MAX_ASEGURADORA}
          list="cot-aseguradoras"
          placeholder="O escribe otra aseguradora"
          autoComplete="off"
          className="field-input"
        />
        <datalist id="cot-aseguradoras">
          {ASEGURADORAS_SUGERIDAS.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </div>

      <div>
        <label htmlFor="cot-plan" className="field-label">
          Plan o producto <span className="text-xs font-normal text-ink-mute">(opcional)</span>
        </label>
        <input
          id="cot-plan"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          maxLength={MAX_PLAN}
          placeholder={ramo.ejemploPlan}
          autoComplete="off"
          className="field-input"
        />
      </div>

      {/* Precio */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor="cot-prima" className="field-label">
            {ramo.etiquetaPrima} (de contado)
          </label>
          <input
            id="cot-prima"
            value={prima}
            onChange={(e) => setPrima(e.target.value)}
            inputMode="decimal"
            placeholder="Ej. 18,450"
            autoComplete="off"
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="cot-moneda" className="field-label">
            Moneda
          </label>
          <select id="cot-moneda" value={moneda} onChange={(e) => setMoneda(e.target.value as MonedaCotizacion)} className="field-input">
            <option value="MN">Pesos (MXN)</option>
            <option value="DLS">Dólares (USD)</option>
          </select>
        </div>
      </div>

      {ramo.enPagos && (
        <div className={`grid gap-3 ${forma ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <div>
            <label htmlFor="cot-forma" className="field-label">
              También en pagos <span className="text-xs font-normal text-ink-mute">(opcional)</span>
            </label>
            <select id="cot-forma" value={forma} onChange={(e) => setForma(e.target.value as FormaPago | "")} className="field-input">
              <option value="">No la ofrezco en pagos</option>
              {FORMAS_PAGO.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.etiqueta}
                </option>
              ))}
            </select>
          </div>
          {forma && (
            <>
              <div>
                <label htmlFor="cot-primer" className="field-label">
                  Primer pago <span className="text-xs font-normal text-ink-mute">(si es distinto)</span>
                </label>
                <input
                  id="cot-primer"
                  value={primerPago}
                  onChange={(e) => setPrimerPago(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ej. 9,148.61"
                  autoComplete="off"
                  className="field-input"
                />
              </div>
              <div>
                <label htmlFor="cot-monto" className="field-label">
                  Monto de cada pago
                </label>
                <input
                  id="cot-monto"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ej. 8,336.61"
                  autoComplete="off"
                  className="field-input"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Lo propio de cada ramo */}
      <div>
        <p className="field-label">Coberturas y datos</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ramo.campos.map((c) => (
            <div key={c.clave} className={c.ancho ? "sm:col-span-2" : undefined}>
              <label htmlFor={`cot-${c.clave}`} className="mb-1 block text-sm text-ink-mute">
                {c.etiqueta}
              </label>
              <input
                id={`cot-${c.clave}`}
                value={datos[c.clave] ?? ""}
                onChange={(e) => setDatos((d) => ({ ...d, [c.clave]: e.target.value }))}
                maxLength={MAX_DATO}
                placeholder={c.ejemplo}
                autoComplete="off"
                className="field-input py-2 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
        <div>
          <label htmlFor="cot-vigencia" className="field-label">
            Cotización válida hasta <span className="text-xs font-normal text-ink-mute">(opcional)</span>
          </label>
          {/* Sin fecha mínima: una cotización ya vencida (o leída de un PDF viejo) se guarda igual; la tabla la marca "Vencida". */}
          <input id="cot-vigencia" type="date" value={vigencia} onChange={(e) => setVigencia(e.target.value)} className="field-input py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="cot-notas" className="field-label">
            Notas <span className="text-xs font-normal text-ink-mute">(solo para ti, no salen en el mensaje)</span>
          </label>
          <input
            id="cot-notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            maxLength={MAX_NOTAS}
            placeholder="Ej. Prefiere pagar mensual"
            autoComplete="off"
            className="field-input py-2 text-sm"
          />
        </div>
      </div>

      {falla && (
        <p className="text-sm" style={{ color: "var(--red)" }} role="alert">
          {falla}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={guardando} className="btn-primary px-4 py-2.5 text-sm">
          {guardando ? "Guardando…" : modo === "editar" ? "Guardar cambios" : "Guardar cotización"}
        </button>
        {modo !== "editar" && (
          <button type="button" disabled={guardando} onClick={(e) => void guardar(e, true)} className="btn-ghost px-4 py-2.5 text-sm">
            Guardar y agregar otra opción
          </button>
        )}
        <button type="button" onClick={onCancelar} disabled={guardando} className="btn-ghost px-4 py-2.5 text-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}
