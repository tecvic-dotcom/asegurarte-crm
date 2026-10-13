"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { crmConteoHistorial, crmEditarPoliza, crmEliminarPoliza, crmPolizaCancelar, crmPolizas, ErrorCRM } from "@/lib/api";
import {
  armarListado,
  conteoPorRamo,
  csvListado,
  FILTROS_ESTATUS,
  formatoWhatsapp,
  textoListado,
  totalClientes,
  type FiltroEstatus,
  type FilaCliente,
  type OpcionesListado,
} from "@/lib/clientes-reglas";
import { SIN_EVENTOS, type ConteoEventos } from "@/lib/historial-reglas";
import { fechaCorta, fechaLarga, hoyLocal } from "@/lib/fechas";
import { RAMOS } from "@/lib/ramos";
import type { DatosPoliza, Poliza } from "@/lib/types";
import { FormularioPoliza } from "../cobranza/FormularioPoliza";
import { AvisoMigracion } from "../panel/AvisoMigracion";
import { Endosos } from "./Endosos";
import { HistorialPagos } from "./HistorialPagos";
import { Modal } from "./Modal";
import { Renovacion } from "./Renovacion";

type Accion = "editar" | "pagos" | "renovar" | "renovar-pdf" | "endosos";

/** Los 5 botoncitos de cada renglón. `conteo` pone el globito con cuántos movimientos hay. */
const ACCIONES: { id: Accion; titulo: string; corto: string; icono: string; conteo?: "pago" | "endoso" }[] = [
  { id: "editar", titulo: "Editar la póliza", corto: "Editar", icono: "flat-color-icons:edit-image" },
  { id: "pagos", titulo: "Historial de pagos", corto: "Pagos", icono: "flat-color-icons:money-transfer", conteo: "pago" },
  { id: "renovar", titulo: "Renovación manual", corto: "Renovar", icono: "flat-color-icons:synchronize" },
  { id: "renovar-pdf", titulo: "Renovación leyendo el PDF", corto: "Renovar con PDF", icono: "flat-color-icons:upload" },
  { id: "endosos", titulo: "Endosos", corto: "Endosos", icono: "flat-color-icons:survey", conteo: "endoso" },
];

const TITULO_MODAL: Record<Accion, string> = {
  editar: "Editar póliza",
  pagos: "Historial de pagos",
  renovar: "Renovación manual",
  "renovar-pdf": "Renovación con lector de PDF",
  endosos: "Endosos",
};

const TEXTO_REPORTES = {
  contada: "También se sumó a tus reportes de prima renovada.",
  duplicada: "No se sumó a tus reportes: esa póliza con esa fecha de inicio ya estaba cargada.",
  omitida: "",
  error: "No pude sumarla a tus reportes de prima renovada (la renovación sí quedó guardada).",
} as const;

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = texto;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

/**
 * Clara · Clientes por ramo: tu cartera de pólizas agrupada por ramo, con nombre, aseguradora, WhatsApp, vigencia y estatus, y
 * en cada renglón los botones de editar, historial de pagos, renovación manual, renovación con lector de PDF y endosos.
 * Se copia, se manda por WhatsApp, se baja en Excel (CSV) o se imprime en PDF. Lee la misma cartera de Valeri.
 */
export function ListadoClientes() {
  const [polizas, setPolizas] = useState<Poliza[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  // Cuántos pagos y endosos tiene cada póliza; si aún no existe la tabla del historial, simplemente no se muestran los globitos.
  const [conteo, setConteo] = useState<Record<string, ConteoEventos>>({});
  const [ramo, setRamo] = useState<OpcionesListado["ramo"]>(null);
  const [busca, setBusca] = useState("");
  const [estatus, setEstatus] = useState<FiltroEstatus>("todos");
  const [conCanceladas, setConCanceladas] = useState(false);
  const [modal, setModal] = useState<{ accion: Accion; id: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const relojAviso = useRef<number | undefined>(undefined);
  const hoy = hoyLocal();

  const cargar = useCallback(
    () =>
      crmPolizas().then(
        (p) => {
          setPolizas(p);
          setError(null);
        },
        (e: unknown) => setError(e as Error),
      ),
    [],
  );
  const recargarConteo = useCallback(() => {
    crmConteoHistorial().then(setConteo, () => undefined);
  }, []);

  useEffect(() => {
    void cargar();
    recargarConteo();
  }, [cargar, recargarConteo]);

  const grupos = useMemo(() => armarListado(polizas ?? [], hoy, { ramo, busca, estatus, conCanceladas }), [polizas, hoy, ramo, busca, estatus, conCanceladas]);
  const total = totalClientes(grupos);
  const porRamo = useMemo(() => conteoPorRamo(polizas ?? [], hoy, { busca, estatus, conCanceladas }), [polizas, hoy, busca, estatus, conCanceladas]);
  const hayFiltros = ramo !== null || busca.trim() !== "" || estatus !== "todos";
  const poliza = modal ? (polizas ?? []).find((p) => p.id === modal.id) ?? null : null;

  function avisar(texto: string) {
    setAviso(texto);
    window.clearTimeout(relojAviso.current);
    relojAviso.current = window.setTimeout(() => setAviso(null), 6000);
  }

  function reemplazar(p: Poliza) {
    setPolizas((lista) => (lista ? lista.map((x) => (x.id === p.id ? p : x)) : lista));
  }

  function abrir(accion: Accion, p: Poliza) {
    setErrorForm(null);
    setModal({ accion, id: p.id });
  }

  function cerrar() {
    setModal(null);
    setErrorForm(null);
  }

  async function guardarEdicion(datos: DatosPoliza) {
    if (!modal) return;
    setGuardando(true);
    setErrorForm(null);
    try {
      reemplazar(await crmEditarPoliza(modal.id, datos));
      avisar("Póliza actualizada.");
      cerrar();
    } catch (e) {
      setErrorForm((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function copiarListado() {
    if (await copiar(textoListado(grupos, fechaLarga(hoy) + " " + hoy.slice(0, 4)))) {
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    }
  }

  function bajarCsv() {
    const url = URL.createObjectURL(new Blob([csvListado(grupos)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-por-ramo-${hoy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error instanceof ErrorCRM && error.migracion) {
    return (
      <AvisoMigracion
        onListo={() => void cargar()}
        archivo={error.archivo}
        que="a Valeri y a este listado"
        detalle="Este reporte lee tu cartera de pólizas (la de Valeri). Falta crearla una sola vez."
      />
    );
  }
  if (error) {
    return (
      <div className="glass rounded-2xl p-5 text-center">
        <p className="text-sm text-ink-soft">{error.message}</p>
        <button type="button" onClick={() => void cargar()} className="btn-primary mt-3 px-4 py-2.5 text-sm">
          Reintentar
        </button>
      </div>
    );
  }
  if (!polizas) {
    return (
      <div className="space-y-3" aria-label="Armando el listado de clientes">
        <div className="h-28 animate-pulse rounded-2xl bg-bg-3/70" />
        <div className="h-64 animate-pulse rounded-2xl bg-bg-3/70" />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {aviso && (
        <p className="rounded-xl border border-line bg-bg-3/70 px-4 py-3 text-sm text-ink" role="status">
          {aviso}
        </p>
      )}

      {/* Qué ramo, qué buscar y qué hacer con el listado */}
      <div className="glass space-y-3 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Ramo">
          <Chip activo={ramo === null} onClick={() => setRamo(null)}>
            Todos <Cuenta n={porRamo.todos} />
          </Chip>
          {RAMOS.map((r) => (
            <Chip key={r.id} activo={ramo === r.id} onClick={() => setRamo(ramo === r.id ? null : r.id)}>
              <Icon icon={r.icono} width={16} aria-hidden /> {r.corto} <Cuenta n={porRamo.porRamo.get(r.id) ?? 0} />
            </Chip>
          ))}
          {(porRamo.porRamo.get("sin_ramo") ?? 0) > 0 && (
            <Chip activo={ramo === "sin_ramo"} onClick={() => setRamo(ramo === "sin_ramo" ? null : "sin_ramo")}>
              Sin ramo <Cuenta n={porRamo.porRamo.get("sin_ramo") ?? 0} />
            </Chip>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-line bg-glass px-3 py-2">
            <Icon icon="flat-color-icons:search" width={18} aria-hidden />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nombre, póliza, aseguradora o WhatsApp…"
              aria-label="Buscar en el listado"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute"
            />
          </div>
          <select value={estatus} onChange={(e) => setEstatus(e.target.value as FiltroEstatus)} aria-label="Estatus" style={{ width: "auto" }} className="field-input min-h-[40px] py-1.5 text-sm">
            {FILTROS_ESTATUS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </select>
          <label className="flex min-h-[40px] items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={conCanceladas} onChange={(e) => setConCanceladas(e.target.checked)} /> Con canceladas
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <p className="mr-auto text-sm text-ink-soft">
            <strong className="text-ink">{total}</strong> {total === 1 ? "póliza" : "pólizas"}
            {hayFiltros ? " con estos filtros" : ""} · {grupos.length} {grupos.length === 1 ? "ramo" : "ramos"}
          </p>
          <button type="button" onClick={() => void copiarListado()} disabled={!total} className="btn-ghost px-3 py-2 text-sm">
            <Icon icon={copiado ? "flat-color-icons:ok" : "flat-color-icons:document"} width={18} aria-hidden /> {copiado ? "¡Copiado!" : "Copiar"}
          </button>
          <a
            href={total ? `https://wa.me/?text=${encodeURIComponent(textoListado(grupos, fechaLarga(hoy) + " " + hoy.slice(0, 4)))}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!total}
            className="btn-ghost px-3 py-2 text-sm"
          >
            <Icon icon="logos:whatsapp-icon" width={18} aria-hidden /> WhatsApp
          </a>
          <button type="button" onClick={bajarCsv} disabled={!total} className="btn-ghost px-3 py-2 text-sm">
            <Icon icon="flat-color-icons:export" width={18} aria-hidden /> Excel (CSV)
          </button>
          <button type="button" onClick={() => window.print()} disabled={!total} className="btn-ghost px-3 py-2 text-sm">
            <Icon icon="flat-color-icons:print" width={18} aria-hidden /> PDF
          </button>
        </div>
      </div>

      {polizas.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="font-semibold text-ink">Tu cartera está vacía.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">Agrega tus pólizas en Valeri (menú «Tu equipo digital») y aquí aparecerán por ramo.</p>
        </div>
      ) : total === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-ink-soft">
          Ninguna póliza coincide con esos filtros.{" "}
          <button
            type="button"
            onClick={() => {
              setRamo(null);
              setBusca("");
              setEstatus("todos");
            }}
            className="underline hover:text-ink"
          >
            Quitar filtros
          </button>
        </div>
      ) : (
        <article className="clara-imprimible space-y-4">
          <header className="glass rounded-2xl p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Reporte de clientes · Clara</p>
            <h3 className="mt-0.5 font-display text-xl text-ink">Clientes por ramo</h3>
            <p className="mt-1 text-sm text-ink-soft">
              {total} {total === 1 ? "póliza" : "pólizas"} al {fechaLarga(hoy)} de {hoy.slice(0, 4)}
              {ramo === null ? "" : ` · solo ${ramo === "sin_ramo" ? "sin ramo" : RAMOS.find((r) => r.id === ramo)?.nombre}`}
              {estatus === "todos" ? "" : ` · ${FILTROS_ESTATUS.find((f) => f.id === estatus)?.nombre.toLowerCase()}`}
            </p>
          </header>

          {grupos.map((g) => (
            <section key={g.ramo ?? "sin_ramo"} className="glass rounded-2xl p-3 sm:p-4">
              <h4 className="mb-2 flex items-center gap-2 px-1 font-semibold text-ink">
                <Icon icon={g.icono} width={22} aria-hidden /> {g.nombre}
                <span className="rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-ink-soft">{g.filas.length}</span>
              </h4>
              <div className="hidden grid-cols-[minmax(0,1.8fr)_minmax(112px,1.1fr)_132px_minmax(0,1.6fr)_minmax(0,1.6fr)_212px] gap-3 border-b border-line px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-mute md:grid">
                <span>Nombre</span>
                <span>Aseguradora</span>
                <span>WhatsApp</span>
                <span>Vigencia</span>
                <span>Estatus</span>
                <span className="text-center print:hidden">Acciones</span>
              </div>
              <ul className="divide-y divide-line/60">
                {g.filas.map((f) => (
                  <Fila key={f.poliza.id} f={f} conteo={conteo[f.poliza.id] ?? SIN_EVENTOS} onAccion={(a) => abrir(a, f.poliza)} />
                ))}
              </ul>
            </section>
          ))}
          <p className="text-xs text-ink-mute">
            Hecho por Clara el {new Date().toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })} · Lee la cartera de Valeri
          </p>
        </article>
      )}

      {modal && poliza && (
        <Modal
          titulo={TITULO_MODAL[modal.accion]}
          subtitulo={modal.accion === "editar" ? undefined : poliza.asegurado}
          sinCabecera={modal.accion === "editar"}
          ancho={modal.accion === "pagos" || modal.accion === "endosos" ? "lg" : "md"}
          onCerrar={cerrar}
        >
          {modal.accion === "editar" && (
            <FormularioPoliza
              key={poliza.id}
              poliza={poliza}
              inicial={null}
              guardando={guardando}
              error={errorForm}
              onGuardar={guardarEdicion}
              onCancelar={cerrar}
              onCancelarPoliza={(cancelada) => {
                const id = poliza.id;
                cerrar();
                crmPolizaCancelar(id, cancelada).then(
                  (p) => {
                    reemplazar(p);
                    avisar(cancelada ? `${p.asegurado}: cancelada, Valeri ya no la cobra.` : `${p.asegurado}: reactivada.`);
                  },
                  (e: unknown) => avisar((e as Error).message),
                );
              }}
              onBorrar={() => {
                if (!window.confirm(`¿Borrar la póliza de ${poliza.asegurado}? También se borra su historial. No se puede deshacer.`)) return;
                crmEliminarPoliza(poliza.id).then(
                  () => {
                    setPolizas((lista) => (lista ? lista.filter((x) => x.id !== poliza.id) : lista));
                    cerrar();
                    avisar("Póliza borrada.");
                  },
                  (e: unknown) => setErrorForm((e as Error).message),
                );
              }}
            />
          )}
          {modal.accion === "pagos" && <HistorialPagos key={poliza.id} poliza={poliza} onPoliza={reemplazar} onCambio={recargarConteo} />}
          {modal.accion === "endosos" && <Endosos key={poliza.id} poliza={poliza} onCambio={recargarConteo} />}
          {(modal.accion === "renovar" || modal.accion === "renovar-pdf") && (
            <Renovacion
              key={`${poliza.id}-${modal.accion}`}
              poliza={poliza}
              modo={modal.accion === "renovar" ? "manual" : "pdf"}
              onHecha={(p, reportes) => {
                reemplazar(p);
                recargarConteo();
                cerrar();
                avisar(
                  `Renovada: ${p.asegurado} queda vigente hasta el ${p.renovacion ? `${fechaLarga(p.renovacion)} de ${p.renovacion.slice(0, 4)}` : "—"}. ` +
                    `Se anotó en su historial.${TEXTO_REPORTES[reportes] ? ` ${TEXTO_REPORTES[reportes]}` : ""}`,
                );
              }}
            />
          )}
        </Modal>
      )}
    </section>
  );
}

function Fila({ f, conteo, onAccion }: { f: FilaCliente; conteo: ConteoEventos; onAccion: (a: Accion) => void }) {
  const p = f.poliza;
  return (
    <li className="grid gap-x-3 gap-y-1.5 px-2 py-3 text-sm md:grid-cols-[minmax(0,1.8fr)_minmax(112px,1.1fr)_132px_minmax(0,1.6fr)_minmax(0,1.6fr)_212px] md:items-center">
      <div className="min-w-0">
        <p className="break-words font-medium leading-snug text-ink">{p.asegurado}</p>
        {p.numero && <p className="truncate text-xs text-ink-mute">Póliza {p.numero}</p>}
      </div>
      <p className="truncate text-ink-soft">
        <span className="text-xs text-ink-mute md:hidden">Aseguradora: </span>
        {p.aseguradora || <span className="text-ink-mute">—</span>}
      </p>
      <p className="whitespace-nowrap text-ink-soft">
        <span className="text-xs text-ink-mute md:hidden">WhatsApp: </span>
        {p.whatsapp.length === 10 ? (
          <a href={`https://wa.me/52${p.whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-ink hover:underline" title="Abrir en WhatsApp">
            <Icon icon="logos:whatsapp-icon" width={14} className="print:hidden" aria-hidden /> {formatoWhatsapp(p.whatsapp)}
          </a>
        ) : (
          <span style={{ color: "var(--amber)" }}>{p.whatsapp ? p.whatsapp : "Sin WhatsApp"}</span>
        )}
      </p>
      <div className="text-ink-soft">
        <p>
          <span className="text-xs text-ink-mute md:hidden">Vigencia: </span>
          {f.vigencia}
        </p>
        {f.aviso && (
          <p className="text-xs font-semibold" style={{ color: f.aviso.tono === "vencida" ? "var(--red)" : "var(--sky)" }}>
            {f.aviso.texto}
          </p>
        )}
      </div>
      <div>
        <p className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: f.color }}>
          <Icon icon={f.icono} width={14} aria-hidden /> {f.etiqueta}
        </p>
        {f.cobro && (
          <p className="text-xs text-ink-mute">
            {f.cobro}
            {p.fecha_limite_pago && f.estado !== "cancelada" ? ` · próximo pago ${fechaCorta(p.fecha_limite_pago)}` : ""}
          </p>
        )}
      </div>
      <div className="flex w-full flex-wrap justify-start gap-1.5 md:w-[212px] md:justify-center print:hidden" role="group" aria-label={`Acciones de ${p.asegurado}`}>
        {ACCIONES.map((a) => {
          const n = a.conteo ? conteo[a.conteo] : 0;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onAccion(a.id)}
              title={a.titulo}
              aria-label={`${a.titulo} de ${p.asegurado}`}
              className="relative inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-glass px-2.5 transition-colors hover:border-brand-2 hover:bg-glass-2 md:w-9 md:px-0"
            >
              <Icon icon={a.icono} width={18} aria-hidden />
              <span className="text-xs font-medium text-ink-soft md:hidden">{a.corto}</span>
              {n > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-white" aria-hidden>
                  {n > 99 ? "99+" : n}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </li>
  );
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3 text-sm ${
        activo ? "border-brand-2 bg-brand/15 font-semibold text-ink" : "border-line bg-glass text-ink-mute hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Cuenta({ n }: { n: number }) {
  return <span className="rounded-full bg-bg-3 px-1.5 text-[11px] font-semibold text-ink-soft">{n}</span>;
}
