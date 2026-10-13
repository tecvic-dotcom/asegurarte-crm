"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { crmEliminarEvento, crmHistorialPoliza, crmRegistrarEndoso, ErrorCRM } from "@/lib/api";
import { moneda } from "@/lib/crm-data";
import { fechaCorta, hoyLocal } from "@/lib/fechas";
import { TIPOS_ENDOSO } from "@/lib/historial-reglas";
import type { EventoPoliza, Poliza } from "@/lib/types";
import { AvisoMigracion } from "../panel/AvisoMigracion";

const conAnio = (f: string) => `${fechaCorta(f)} ${f.slice(0, 4)}`;

/** «+$320», «−$1,200» o «Sin cambio de prima». */
function ajuste(m: number): string {
  if (m === 0) return "Sin cambio de prima";
  return `${m > 0 ? "+" : "−"}${moneda(Math.abs(m))}`;
}

interface EndososProps {
  poliza: Poliza;
  /** Cambió la cantidad de movimientos (para el globito del botón). */
  onCambio: () => void;
}

/** Endosos de una póliza: altas, bajas y cambios, cada uno con su fecha, número y ajuste de prima. */
export function Endosos({ poliza, onCambio }: EndososProps) {
  const [endosos, setEndosos] = useState<EventoPoliza[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const hoy = hoyLocal();
  const [fecha, setFecha] = useState(hoy);
  const [tipo, setTipo] = useState<string>(TIPOS_ENDOSO[0]);
  const [numero, setNumero] = useState("");
  const [prima, setPrima] = useState("");
  const [nota, setNota] = useState("");

  const cargar = useCallback(
    () =>
      crmHistorialPoliza(poliza.id, "endoso").then(
        (x) => {
          setEndosos(x);
          setError(null);
        },
        (e: unknown) => setError(e as Error),
      ),
    [poliza.id],
  );
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const neto = useMemo(() => (endosos ?? []).reduce((s, e) => s + e.monto, 0), [endosos]);

  async function guardar() {
    setGuardando(true);
    setErrorForm(null);
    try {
      const monto = Number(prima.replace(/[$,\s]/g, "").replace("−", "-")) || 0;
      setEndosos(await crmRegistrarEndoso(poliza.id, { tipo: "endoso", fecha, monto, concepto: tipo, numero, nota, recibo: null }));
      onCambio();
      setAbierto(false);
      setNumero("");
      setPrima("");
      setNota("");
    } catch (e) {
      setErrorForm((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(e: EventoPoliza) {
    if (!window.confirm(`¿Quitar el endoso «${e.concepto}» del ${conAnio(e.fecha)}? No se puede deshacer.`)) return;
    try {
      await crmEliminarEvento(e.id);
      setEndosos((x) => (x ? x.filter((y) => y.id !== e.id) : x));
      onCambio();
    } catch (err) {
      setErrorForm((err as Error).message);
    }
  }

  if (error instanceof ErrorCRM && error.migracion) {
    return (
      <AvisoMigracion
        onListo={() => void cargar()}
        archivo={error.archivo}
        que="el historial de tus pólizas"
        detalle="Tu libreta en la nube (Supabase) necesita un cajón nuevo para guardar los pagos, renovaciones y endosos de cada póliza. Se hace una sola vez."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="rounded-2xl border border-line bg-glass p-4 text-sm text-ink-soft">
        <strong className="text-ink">{poliza.asegurado}</strong>
        {[poliza.aseguradora, poliza.numero].filter(Boolean).length > 0 && ` · ${[poliza.aseguradora, poliza.numero].filter(Boolean).join(" ")}`}
        <span className="mt-1 block text-xs text-ink-mute">
          Aquí llevas la bitácora de los cambios de la póliza. Si un endoso cambia lo que paga el cliente, actualiza también el monto con ✏️ Editar.
        </span>
      </p>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-ink">
            Endosos{endosos ? ` (${endosos.length})` : ""}
            {endosos && endosos.length > 0 && <span className="ml-2 text-xs font-normal text-ink-mute">ajuste neto de prima: {ajuste(neto)}</span>}
          </h3>
          <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} className="btn-ghost px-3 py-2 text-xs">
            <Icon icon="flat-color-icons:plus" width={16} aria-hidden /> Registrar un endoso
          </button>
        </div>

        {abierto && (
          <div className="mb-3 space-y-3 rounded-2xl border border-line bg-glass p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="endoso-tipo">
                  Tipo de endoso
                </label>
                <select id="endoso-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className="field-input">
                  {TIPOS_ENDOSO.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="endoso-fecha">
                  Fecha del endoso
                </label>
                <input id="endoso-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="field-input [color-scheme:dark]" />
              </div>
              <div>
                <label className="field-label" htmlFor="endoso-numero">
                  Número de endoso (opcional)
                </label>
                <input id="endoso-numero" value={numero} maxLength={40} onChange={(e) => setNumero(e.target.value)} placeholder="END-0412" className="field-input" />
              </div>
              <div>
                <label className="field-label" htmlFor="endoso-prima">
                  Ajuste de prima (MXN)
                </label>
                <input id="endoso-prima" inputMode="decimal" value={prima} onChange={(e) => setPrima(e.target.value)} placeholder="320 · si baja: -1200" className="field-input" />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="endoso-nota">
                  Qué cambió (opcional)
                </label>
                <textarea id="endoso-nota" rows={2} maxLength={1000} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Se agrega a su bebé, cambia la camioneta…" className="field-input resize-y" />
              </div>
            </div>
            {errorForm && (
              <p className="text-sm" style={{ color: "var(--red)" }} role="alert">
                {errorForm}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void guardar()} disabled={guardando} className="btn-primary px-4 py-2.5 text-sm">
                {guardando ? "Guardando…" : "Guardar endoso"}
              </button>
              <button type="button" onClick={() => setAbierto(false)} className="btn-ghost px-4 py-2.5 text-sm">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {errorForm && !abierto && (
          <p className="mb-2 text-sm" style={{ color: "var(--red)" }} role="alert">
            {errorForm}
          </p>
        )}

        {error && !(error instanceof ErrorCRM && error.migracion) ? (
          <p className="rounded-xl border border-line p-4 text-center text-sm text-ink-soft">
            {error.message}{" "}
            <button type="button" onClick={() => void cargar()} className="underline">
              Reintentar
            </button>
          </p>
        ) : endosos === null ? (
          <div className="h-24 animate-pulse rounded-2xl bg-bg-3/70" aria-label="Cargando los endosos" />
        ) : endosos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-ink-mute">Esta póliza todavía no tiene endosos anotados.</p>
        ) : (
          <ul className="divide-y divide-line/60 rounded-2xl border border-line">
            {endosos.map((e) => (
              <li key={e.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                <Icon icon="flat-color-icons:survey" width={20} className="mt-0.5 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">
                    {e.concepto}
                    {e.numero && <span className="ml-1 text-ink-mute">· {e.numero}</span>}
                  </p>
                  <p className="text-xs text-ink-mute">
                    {conAnio(e.fecha)}
                    {e.nota ? ` · ${e.nota}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color: e.monto > 0 ? "var(--amber)" : e.monto < 0 ? "var(--green)" : "var(--ink-mute)" }}>
                  {ajuste(e.monto)}
                </span>
                <button type="button" onClick={() => void borrar(e)} className="rounded-lg px-2 py-1 text-ink-mute hover:text-ink" aria-label={`Quitar el endoso ${e.concepto} del ${conAnio(e.fecha)}`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
