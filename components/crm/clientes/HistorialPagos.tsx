"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { crmEliminarEvento, crmHistorialPoliza, crmRegistrarPago, ErrorCRM } from "@/lib/api";
import { moneda } from "@/lib/crm-data";
import { etiquetaEstado, estadoDe, montoDelProximoPago, COLOR_ESTADO, FORMAS_PAGO } from "@/lib/cobranza-reglas";
import { fechaCorta, hoyLocal } from "@/lib/fechas";
import { formatoWhatsapp } from "@/lib/clientes-reglas";
import type { EventoPoliza, Poliza } from "@/lib/types";
import { AvisoMigracion } from "../panel/AvisoMigracion";

const conAnio = (f: string) => `${fechaCorta(f)} ${f.slice(0, 4)}`;

interface HistorialPagosProps {
  poliza: Poliza;
  /** Cuando el pago también salda el recibo que toca, la póliza cambia: se avisa al listado. */
  onPoliza: (p: Poliza) => void;
  /** Cambió la cantidad de movimientos (para el globito del botón). */
  onCambio: () => void;
}

/** Historial de pagos de una póliza: lo que Valeri anotó con «Pagó» y lo que registres a mano. */
export function HistorialPagos({ poliza, onPoliza, onCambio }: HistorialPagosProps) {
  const [pagos, setPagos] = useState<EventoPoliza[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const hoy = hoyLocal();
  const [fecha, setFecha] = useState(hoy);
  const [importe, setImporte] = useState(montoDelProximoPago(poliza) ? String(montoDelProximoPago(poliza)) : "");
  const [nota, setNota] = useState("");
  const [saldar, setSaldar] = useState(false);

  const cargar = useCallback(
    () =>
      crmHistorialPoliza(poliza.id, "pago").then(
        (x) => {
          setPagos(x);
          setError(null);
        },
        (e: unknown) => setError(e as Error),
      ),
    [poliza.id],
  );
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const { estado, dias } = estadoDe(poliza, hoy);
  const forma = FORMAS_PAGO.find((f) => f.id === poliza.forma_pago)?.nombre ?? "";
  const total = useMemo(() => (pagos ?? []).reduce((s, p) => s + p.monto, 0), [pagos]);

  async function registrar() {
    setGuardando(true);
    setErrorForm(null);
    try {
      const r = await crmRegistrarPago(
        poliza.id,
        { tipo: "pago", fecha, monto: Number(importe.replace(/[$,\s]/g, "")) || 0, concepto: "", numero: "", nota, recibo: null },
        saldar,
      );
      setPagos(r.eventos);
      if (r.poliza) onPoliza(r.poliza);
      onCambio();
      setAbierto(false);
      setNota("");
      setSaldar(false);
    } catch (e) {
      setErrorForm((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(p: EventoPoliza) {
    if (!window.confirm(`¿Quitar el pago de ${moneda(p.monto)} del ${conAnio(p.fecha)} del historial? La fecha del próximo pago no cambia.`)) return;
    try {
      await crmEliminarEvento(p.id);
      setPagos((x) => (x ? x.filter((y) => y.id !== p.id) : x));
      onCambio();
    } catch (e) {
      setErrorForm((e as Error).message);
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
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl border border-line bg-glass p-4 text-sm sm:grid-cols-3">
        <Dato titulo="Cliente" valor={poliza.asegurado} ancho />
        <Dato titulo="Póliza" valor={[poliza.aseguradora, poliza.numero].filter(Boolean).join(" ") || "—"} />
        <Dato titulo="Forma de pago" valor={forma || "—"} />
        {poliza.forma_pago !== "anual" && poliza.primer_pago > 0 ? (
          <>
            <Dato titulo="Primer pago" valor={`${moneda(poliza.primer_pago)} · ${poliza.primer_pago_pendiente ? "pendiente" : "ya cubierto"}`} />
            <Dato titulo="Pagos subsecuentes" valor={poliza.monto_pago > 0 ? moneda(poliza.monto_pago) : "Sin dato"} />
          </>
        ) : (
          <Dato titulo="Monto de cada pago" valor={poliza.monto_pago > 0 ? moneda(poliza.monto_pago) : "Sin dato"} />
        )}
        <Dato titulo="Último pago" valor={poliza.ultimo_pago ? conAnio(poliza.ultimo_pago) : "—"} />
        <div className="col-span-2 sm:col-span-3">
          <dt className="text-xs text-ink-mute">Próximo pago</dt>
          <dd className="font-semibold" style={{ color: COLOR_ESTADO[estado] }}>
            {poliza.fecha_limite_pago ? `${conAnio(poliza.fecha_limite_pago)} · ` : ""}
            {etiquetaEstado(estado, dias, poliza)}
          </dd>
        </div>
        {poliza.whatsapp && <Dato titulo="WhatsApp" valor={formatoWhatsapp(poliza.whatsapp)} />}
      </dl>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-ink">
            Pagos registrados{pagos ? ` (${pagos.length})` : ""}
            {pagos && pagos.length > 0 && <span className="ml-2 text-xs font-normal text-ink-mute">suman {moneda(total)}</span>}
          </h3>
          <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} className="btn-ghost px-3 py-2 text-xs">
            <Icon icon="flat-color-icons:plus" width={16} aria-hidden /> Registrar un pago
          </button>
        </div>

        {abierto && (
          <div className="mb-3 space-y-3 rounded-2xl border border-line bg-glass p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="pago-fecha">
                  Fecha en que pagó
                </label>
                <input id="pago-fecha" type="date" max={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} className="field-input [color-scheme:dark]" />
              </div>
              <div>
                <label className="field-label" htmlFor="pago-monto">
                  Monto pagado (MXN)
                </label>
                <input id="pago-monto" inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="1850" className="field-input" />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="pago-nota">
                  Nota (opcional)
                </label>
                <input id="pago-nota" value={nota} maxLength={200} onChange={(e) => setNota(e.target.value)} placeholder="Transferencia, efectivo, referencia…" className="field-input" />
              </div>
            </div>
            {poliza.fecha_limite_pago && (
              <label className="flex items-start gap-2 text-sm text-ink-soft">
                <input type="checkbox" checked={saldar} onChange={(e) => setSaldar(e.target.checked)} className="mt-1" />
                <span>
                  También saldar el recibo que toca (el próximo pago pasa al siguiente periodo, como con «Pagó» de Valeri). Déjalo apagado si solo estás
                  anotando un pago viejo.
                </span>
              </label>
            )}
            {errorForm && (
              <p className="text-sm" style={{ color: "var(--red)" }} role="alert">
                {errorForm}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void registrar()} disabled={guardando} className="btn-primary px-4 py-2.5 text-sm">
                {guardando ? "Guardando…" : "Guardar pago"}
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
        ) : pagos === null ? (
          <div className="h-24 animate-pulse rounded-2xl bg-bg-3/70" aria-label="Cargando los pagos" />
        ) : pagos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-ink-mute">
            Todavía no hay pagos anotados. Desde ahora, cada vez que marques «Pagó» en Valeri se anota solo aquí; los anteriores los puedes registrar a mano.
          </p>
        ) : (
          <ul className="divide-y divide-line/60 rounded-2xl border border-line">
            {pagos.map((p) => (
              <li key={p.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                <Icon icon="flat-color-icons:money-transfer" width={20} className="mt-0.5 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">
                    {conAnio(p.fecha)} <span className="ml-1 tabular-nums">{moneda(p.monto)}</span>
                  </p>
                  <p className="text-xs text-ink-mute">
                    {[p.concepto, p.recibo ? `cubrió el recibo del ${conAnio(p.recibo)}` : null, p.nota || null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button type="button" onClick={() => void borrar(p)} className="rounded-lg px-2 py-1 text-ink-mute hover:text-ink" aria-label={`Quitar el pago del ${conAnio(p.fecha)}`}>
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

function Dato({ titulo, valor, ancho = false }: { titulo: string; valor: string; ancho?: boolean }) {
  return (
    <div className={ancho ? "col-span-2" : ""}>
      <dt className="text-xs text-ink-mute">{titulo}</dt>
      <dd className="font-medium text-ink">{valor}</dd>
    </div>
  );
}
