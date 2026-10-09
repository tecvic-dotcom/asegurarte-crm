"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import {
  crmCrearPendiente,
  crmEditarPendiente,
  crmMoverPendiente,
  crmPendienteHecho,
  crmPendientes,
  ErrorCRM,
} from "@/lib/api";
import { hoyLocal, sumarDias } from "@/lib/fechas";
import {
  agruparCompletados,
  agruparPendientes,
  formatearHora,
  horaDeInstante,
  MAX_TEXTO_PENDIENTE,
  resumenPendientes,
  type DatosPendiente,
  type Pendiente,
} from "@/lib/pendientes-reglas";
import type { Lead } from "@/lib/types";
import { DictadoBoton } from "./DictadoBoton";
import { AvisoMigracion } from "./panel/AvisoMigracion";

interface PendientesDiaProps {
  leads: Lead[];
  /** Abre el expediente del prospecto ligado al pendiente. */
  onAbrir: (id: string) => void;
}

type Dia = "hoy" | "manana" | "otro";

interface Aviso {
  texto: string;
  /** Si viene, el aviso ofrece "Deshacer". */
  deshacer?: () => void;
}

const pausa = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function recortar(t: string, max = 40): string {
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * Mis pendientes: tu lista del día. Anotas lo que vas a hacer (hoy, mañana u otro día,
 * con hora si quieres), lo tachas al terminar y se va de la lista. No se pierde:
 * queda guardado en "Completados" con el día y la hora en que lo hiciste.
 */
export function PendientesDia({ leads, onAbrir }: PendientesDiaProps) {
  const hoy = hoyLocal();
  const [activos, setActivos] = useState<Pendiente[]>([]);
  const [hechos, setHechos] = useState<Pendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [recargando, setRecargando] = useState(false);
  const [error, setError] = useState<ErrorCRM | Error | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [verHechos, setVerHechos] = useState(false);
  // Los que acabas de tachar: se ven tachados un instante antes de irse a Completados.
  const [saliendo, setSaliendo] = useState<Set<string>>(new Set());
  // El pendiente que estás corrigiendo ahora (uno a la vez).
  const [editando, setEditando] = useState<string | null>(null);

  // Formulario
  const [texto, setTexto] = useState("");
  const [dia, setDia] = useState<Dia>("hoy");
  const [fechaOtra, setFechaOtra] = useState("");
  const [hora, setHora] = useState("");
  const [leadId, setLeadId] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [falla, setFalla] = useState<string | null>(null);

  const entrada = useRef<HTMLInputElement>(null);
  const relojAviso = useRef<number | undefined>(undefined);

  /**
   * Trae la lista otra vez (por ejemplo, lo que agendaste en el celular) sin recargar toda la página:
   * la lista no desaparece y lo que estés escribiendo se queda como está.
   */
  async function recargar() {
    if (recargando || cargando) return;
    setRecargando(true);
    try {
      const d = await crmPendientes();
      setActivos(d.activos);
      setHechos(d.hechos);
      setError(null);
      avisar("Lista actualizada.");
    } catch (err) {
      avisar((err as Error).message || "No pude actualizar tu lista. Intenta de nuevo.");
    } finally {
      setRecargando(false);
    }
  }

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const d = await crmPendientes();
      setActivos(d.activos);
      setHechos(d.hechos);
    } catch (e) {
      setError(e as Error);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let vivo = true;
    crmPendientes()
      .then((d) => {
        if (!vivo) return;
        setActivos(d.activos);
        setHechos(d.hechos);
      })
      .catch((e) => vivo && setError(e as Error))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
      window.clearTimeout(relojAviso.current);
    };
  }, []);

  const grupos = useMemo(() => agruparPendientes(activos, hoy), [activos, hoy]);
  const completados = useMemo(() => agruparCompletados(hechos, hoy), [hechos, hoy]);
  const resumen = useMemo(() => resumenPendientes(activos, hechos, hoy), [activos, hechos, hoy]);
  const prospectos = useMemo(
    () => leads.filter((l) => l.etapa !== "perdido").sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [leads],
  );
  const nombreDe = (id: string | null) => (id ? leads.find((l) => l.id === id)?.nombre ?? null : null);

  function avisar(texto: string, deshacer?: () => void) {
    setAviso({ texto, deshacer });
    window.clearTimeout(relojAviso.current);
    relojAviso.current = window.setTimeout(() => setAviso(null), deshacer ? 7000 : 4500);
  }

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (guardando || !texto.trim()) return;
    if (dia === "otro" && !fechaOtra) {
      setFalla("Elige el día para este pendiente.");
      return;
    }
    const fecha = dia === "hoy" ? hoy : dia === "manana" ? sumarDias(hoy, 1) : fechaOtra;
    setGuardando(true);
    setFalla(null);
    try {
      const nuevo = await crmCrearPendiente({ texto, fecha, hora: hora || null, lead_id: leadId || null });
      setActivos((a) => [...a, nuevo]);
      setTexto("");
      setHora("");
      setLeadId("");
      entrada.current?.focus();
    } catch (err) {
      setFalla((err as Error).message || "No pude guardarlo. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  async function completar(p: Pendiente) {
    if (saliendo.has(p.id)) return;
    setSaliendo((s) => new Set(s).add(p.id));
    try {
      const [hecho] = await Promise.all([crmPendienteHecho(p.id, true), pausa(450)]);
      setActivos((a) => a.filter((x) => x.id !== p.id));
      setHechos((h) => [hecho, ...h]);
      avisar(`Listo ✓ «${recortar(p.texto)}» quedó en Completados.`, () => void devolver(hecho, false));
    } catch (err) {
      avisar((err as Error).message || "No pude marcarlo. Intenta de nuevo.");
    } finally {
      setSaliendo((s) => {
        const n = new Set(s);
        n.delete(p.id);
        return n;
      });
    }
  }

  /** Lo regresa de Completados a la lista de pendientes. */
  async function devolver(p: Pendiente, conAviso = true) {
    try {
      const vuelto = await crmPendienteHecho(p.id, false);
      setHechos((h) => h.filter((x) => x.id !== p.id));
      setActivos((a) => [...a.filter((x) => x.id !== p.id), vuelto]);
      setAviso(null);
      if (conAviso) avisar(`«${recortar(p.texto)}» volvió a tus pendientes.`);
    } catch (err) {
      avisar((err as Error).message || "No pude devolverlo. Intenta de nuevo.");
    }
  }

  /** Guarda lo corregido. Si falla, lanza el error para que el formulario de edición lo muestre y siga abierto. */
  async function guardarEdicion(p: Pendiente, datos: DatosPendiente) {
    const editado = await crmEditarPendiente(p.id, datos);
    setActivos((a) => a.map((x) => (x.id === p.id ? editado : x)));
    setEditando(null);
    avisar("Cambios guardados.");
  }

  async function pasarA(p: Pendiente, fecha: string) {
    try {
      const movido = await crmMoverPendiente(p.id, fecha);
      setActivos((a) => a.map((x) => (x.id === p.id ? movido : x)));
    } catch (err) {
      avisar((err as Error).message || "No pude cambiarlo de día. Intenta de nuevo.");
    }
  }

  if (error instanceof ErrorCRM && error.migracion) {
    return (
      <AvisoMigracion
        onListo={() => void cargar()}
        archivo={error.archivo}
        que="tus pendientes"
        detalle="Tu libreta en la nube (Supabase) necesita 1 cajón nuevo para guardar tus pendientes y que no se pierdan nunca. Se hace una sola vez."
      />
    );
  }

  return (
    <section className="space-y-4">
      {/* Cómo vas hoy */}
      <div className="glass-strong rounded-2xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Icon icon="flat-color-icons:todo-list" width={40} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl text-ink">Tu día</p>
            <p className="mt-0.5 text-[15px] leading-relaxed text-ink-soft" aria-live="polite">
              {cargando ? "Cargando tus pendientes…" : resumen.frase}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void recargar()}
            disabled={cargando || recargando}
            aria-label="Recargar pendientes"
            title="Ver lo último que agendaste (por ejemplo, desde tu celular)"
            className="btn-ghost shrink-0 gap-1.5 px-2.5 py-2 text-xs"
          >
            <Icon icon="flat-color-icons:synchronize" width={18} className={recargando ? "animate-spin" : undefined} aria-hidden />
            <span className="hidden sm:inline">Recargar</span>
          </button>
        </div>
        {!cargando && resumen.porHacer + resumen.hechosHoy > 0 && (
          <div className="mt-3">
            <div className="h-2.5 overflow-hidden rounded-full bg-bg-3" role="progressbar" aria-valuenow={resumen.avance} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del día">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${resumen.avance}%`, background: "var(--green)" }} />
            </div>
            <p className="mt-1 text-xs text-ink-mute">
              {resumen.hechosHoy} de {resumen.porHacer + resumen.hechosHoy} listos hoy
            </p>
          </div>
        )}
      </div>

      {/* Anotar un pendiente */}
      <form onSubmit={(e) => void agregar(e)} className="glass space-y-3 rounded-2xl p-4">
        <label htmlFor="pendiente-texto" className="field-label">
          ¿Qué tienes que hacer?
        </label>
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input
            id="pendiente-texto"
            ref={entrada}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={MAX_TEXTO_PENDIENTE}
            placeholder="Ej. Llamar a Laura para darle su cotización"
            autoComplete="off"
            className="field-input min-w-0"
          />
          <DictadoBoton onTexto={(t) => setTexto((x) => (x ? `${x} ${t}` : t).slice(0, MAX_TEXTO_PENDIENTE))} />
          <button type="submit" disabled={guardando || !texto.trim()} className="btn-primary col-span-2 px-4 py-2.5 text-sm sm:col-span-1">
            <Icon icon="flat-color-icons:plus" width={18} aria-hidden /> Agregar
          </button>
        </div>

        <CamposAgenda
          dia={dia}
          onDia={setDia}
          fechaOtra={fechaOtra}
          onFechaOtra={setFechaOtra}
          hora={hora}
          onHora={setHora}
          leadId={leadId}
          onLead={setLeadId}
          prospectos={prospectos}
          minFecha={hoy}
        />

        {falla && (
          <p className="text-sm" style={{ color: "var(--red)" }} role="alert">
            {falla}
          </p>
        )}
      </form>

      {aviso && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-bg-3/70 px-4 py-3 text-sm text-ink" role="status">
          <span className="min-w-0 flex-1">{aviso.texto}</span>
          {aviso.deshacer && (
            <button type="button" onClick={aviso.deshacer} className="font-semibold underline underline-offset-2" style={{ color: "var(--sky)" }}>
              Deshacer
            </button>
          )}
        </p>
      )}

      {error && !cargando && (
        <p className="rounded-xl border border-line bg-bg-3/70 px-4 py-3 text-sm text-ink" role="alert">
          {error.message || "No pude cargar tus pendientes."}{" "}
          <button type="button" onClick={() => void cargar()} className="font-semibold underline underline-offset-2">
            Reintentar
          </button>
        </p>
      )}

      {/* Lo que falta por hacer */}
      {!cargando && !error && (
        <div className="space-y-5">
          {grupos.map((g) => (
            <div key={g.clave}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold capitalize" style={{ color: g.atrasado ? "var(--amber)" : "var(--ink-soft)" }}>
                {g.atrasado && <Icon icon="flat-color-icons:high-priority" width={18} aria-hidden />}
                {g.titulo}
                <span className="rounded-full bg-bg-3 px-2 py-0.5 text-xs font-normal text-ink-mute">{g.items.length}</span>
              </h2>
              {g.items.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line px-4 py-4 text-sm text-ink-mute">
                  {resumen.hechosHoy > 0 ? "Nada pendiente para hoy. ¡Buen trabajo!" : "Nada anotado para hoy todavía."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {g.items.map((p) =>
                    editando === p.id ? (
                      <EdicionPendiente
                        key={p.id}
                        p={p}
                        hoy={hoy}
                        leads={leads}
                        onGuardar={(datos) => guardarEdicion(p, datos)}
                        onCancelar={() => setEditando(null)}
                      />
                    ) : (
                      <FilaPendiente
                        key={p.id}
                        p={p}
                        prospecto={nombreDe(p.lead_id)}
                        saliendo={saliendo.has(p.id)}
                        onCompletar={() => void completar(p)}
                        onEditar={() => setEditando(p.id)}
                        onAbrirProspecto={() => p.lead_id && onAbrir(p.lead_id)}
                        onPasar={
                          p.fecha < hoy
                            ? { etiqueta: "Pasar a hoy", accion: () => void pasarA(p, hoy) }
                            : p.fecha === hoy
                              ? { etiqueta: "Mañana", accion: () => void pasarA(p, sumarDias(hoy, 1)) }
                              : undefined
                        }
                      />
                    ),
                  )}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completados: ya no estorban, pero siguen guardados */}
      {!cargando && !error && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setVerHechos((v) => !v)}
            aria-expanded={verHechos}
            className="btn-ghost w-full justify-between px-4 py-3 text-sm"
          >
            <span className="flex items-center gap-2">
              <Icon icon="flat-color-icons:checkmark" width={20} aria-hidden /> Completados ({hechos.length})
            </span>
            <span aria-hidden>{verHechos ? "▴" : "▾"}</span>
          </button>
          {verHechos && (
            <div className="mt-3 space-y-4">
              <p className="text-xs text-ink-mute">
                Aquí se quedan todos los que ya terminaste: salen de tu lista, pero no se pierden. Si te equivocaste, devuélvelos a pendientes.
              </p>
              {completados.length === 0 && <p className="text-sm text-ink-mute">Todavía no has completado ninguno.</p>}
              {completados.map((g) => (
                <div key={g.clave}>
                  <h3 className="mb-2 text-sm font-semibold capitalize text-ink-soft">{g.titulo}</h3>
                  <ul className="space-y-2">
                    {g.items.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-bg-2/40 px-3 py-2.5">
                        <Icon icon="flat-color-icons:checkmark" width={22} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] text-ink-mute line-through">{p.texto}</p>
                          <p className="mt-0.5 text-xs text-ink-mute">
                            {horaDeInstante(p.hecho_en) && <>Terminado a las {horaDeInstante(p.hecho_en)}</>}
                            {nombreDe(p.lead_id) && <> · {nombreDe(p.lead_id)}</>}
                          </p>
                        </div>
                        <button type="button" onClick={() => void devolver(p)} className="btn-ghost shrink-0 px-3 py-1.5 text-xs">
                          <Icon icon="flat-color-icons:undo" width={16} aria-hidden /> Devolver
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        activo ? "border-brand-2 bg-brand/25 text-ink" : "border-line bg-glass text-ink-mute hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** Día, hora y prospecto de un pendiente: los mismos campos al anotar uno nuevo y al corregir uno. */
function CamposAgenda({
  dia,
  onDia,
  fechaOtra,
  onFechaOtra,
  hora,
  onHora,
  leadId,
  onLead,
  prospectos,
  minFecha,
}: {
  dia: Dia;
  onDia: (d: Dia) => void;
  fechaOtra: string;
  onFechaOtra: (f: string) => void;
  hora: string;
  onHora: (h: string) => void;
  leadId: string;
  onLead: (id: string) => void;
  prospectos: Lead[];
  /** Fecha más temprana que deja elegir el calendario (al corregir uno atrasado no se limita). */
  minFecha?: string;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-mute">Para:</span>
        <Chip activo={dia === "hoy"} onClick={() => onDia("hoy")}>Hoy</Chip>
        <Chip activo={dia === "manana"} onClick={() => onDia("manana")}>Mañana</Chip>
        <Chip activo={dia === "otro"} onClick={() => onDia("otro")}>Otro día</Chip>
        {dia === "otro" && (
          <div className="w-40">
            <input
              type="date"
              min={minFecha}
              value={fechaOtra}
              onChange={(e) => onFechaOtra(e.target.value)}
              aria-label="Día del pendiente"
              className="field-input py-2 text-sm"
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-sm text-ink-mute">
          Hora <span className="text-xs">(opcional)</span>
          <span className="block w-32">
            <input type="time" value={hora} onChange={(e) => onHora(e.target.value)} className="field-input py-2 text-sm" />
          </span>
        </label>
        {prospectos.length > 0 && (
          <label className="flex w-full min-w-0 flex-col gap-1 text-sm text-ink-mute sm:max-w-sm sm:flex-1 sm:flex-row sm:items-center sm:gap-2">
            <span>
              Prospecto <span className="text-xs">(opcional)</span>
            </span>
            <select value={leadId} onChange={(e) => onLead(e.target.value)} className="field-input min-w-0 flex-1 py-2 text-sm">
              <option value="">Ninguno</option>
              {prospectos.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </>
  );
}

/** Corregir un pendiente en su mismo lugar: texto, día, hora y prospecto. */
function EdicionPendiente({
  p,
  hoy,
  leads,
  onGuardar,
  onCancelar,
}: {
  p: Pendiente;
  hoy: string;
  leads: Lead[];
  /** Guarda los cambios; lanza el error si no se pudo. */
  onGuardar: (datos: DatosPendiente) => Promise<void>;
  onCancelar: () => void;
}) {
  const [texto, setTexto] = useState(p.texto);
  const [dia, setDia] = useState<Dia>(p.fecha === hoy ? "hoy" : p.fecha === sumarDias(hoy, 1) ? "manana" : "otro");
  const [fechaOtra, setFechaOtra] = useState(p.fecha === hoy || p.fecha === sumarDias(hoy, 1) ? "" : p.fecha);
  const [hora, setHora] = useState(p.hora ?? "");
  // Si el prospecto ligado ya no está en tu lista, se suelta en vez de mandar un dato que ya no existe.
  const [leadId, setLeadId] = useState(p.lead_id && leads.some((l) => l.id === p.lead_id) ? p.lead_id : "");
  const [guardando, setGuardando] = useState(false);
  const [falla, setFalla] = useState<string | null>(null);

  // Los prospectos perdidos no se ofrecen, salvo el que ya tiene este pendiente.
  const prospectos = leads
    .filter((l) => l.etapa !== "perdido" || l.id === p.lead_id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (guardando || !texto.trim()) return;
    if (dia === "otro" && !fechaOtra) {
      setFalla("Elige el día para este pendiente.");
      return;
    }
    const fecha = dia === "hoy" ? hoy : dia === "manana" ? sumarDias(hoy, 1) : fechaOtra;
    setGuardando(true);
    setFalla(null);
    try {
      await onGuardar({ texto, fecha, hora: hora || null, lead_id: leadId || null });
    } catch (err) {
      setFalla((err as Error).message || "No pude guardar los cambios. Intenta de nuevo.");
      setGuardando(false);
    }
  }

  return (
    <li className="list-none">
      <form
        onSubmit={(e) => void guardar(e)}
        onKeyDown={(e) => e.key === "Escape" && onCancelar()}
        className="glass space-y-3 rounded-2xl border border-brand-2 p-3"
        aria-label="Editar pendiente"
      >
        <label htmlFor={`editar-${p.id}`} className="field-label">
          Editar pendiente
        </label>
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <input
            id={`editar-${p.id}`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={MAX_TEXTO_PENDIENTE}
            autoComplete="off"
            autoFocus
            className="field-input min-w-0"
          />
          <DictadoBoton onTexto={(t) => setTexto((x) => (x ? `${x} ${t}` : t).slice(0, MAX_TEXTO_PENDIENTE))} />
        </div>
        <CamposAgenda
          dia={dia}
          onDia={setDia}
          fechaOtra={fechaOtra}
          onFechaOtra={setFechaOtra}
          hora={hora}
          onHora={setHora}
          leadId={leadId}
          onLead={setLeadId}
          prospectos={prospectos}
        />
        {falla && (
          <p className="text-sm" style={{ color: "var(--red)" }} role="alert">
            {falla}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={guardando || !texto.trim()} className="btn-primary px-4 py-2 text-sm">
            Guardar cambios
          </button>
          <button type="button" onClick={onCancelar} disabled={guardando} className="btn-ghost px-4 py-2 text-sm">
            Cancelar
          </button>
        </div>
      </form>
    </li>
  );
}

function FilaPendiente({
  p,
  prospecto,
  saliendo,
  onCompletar,
  onEditar,
  onAbrirProspecto,
  onPasar,
}: {
  p: Pendiente;
  prospecto: string | null;
  saliendo: boolean;
  onCompletar: () => void;
  onEditar: () => void;
  onAbrirProspecto: () => void;
  onPasar?: { etiqueta: string; accion: () => void };
}) {
  return (
    <li className={`glass flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-300 ${saliendo ? "scale-[0.98] opacity-50" : ""}`}>
      <button
        type="button"
        onClick={onCompletar}
        disabled={saliendo}
        aria-label={`Marcar como hecho: ${p.texto}`}
        title="Marcar como hecho"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 transition-colors hover:bg-bg-3"
        style={{ borderColor: saliendo ? "var(--green)" : "var(--ink-mute)", background: saliendo ? "var(--green)" : undefined }}
      >
        {saliendo && <Icon icon="flat-color-icons:checkmark" width={22} aria-hidden />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`break-words text-[15px] font-medium text-ink ${saliendo ? "line-through" : ""}`}>{p.texto}</p>
        {(p.hora || prospecto) && (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-mute">
            {p.hora && (
              <span className="flex items-center gap-1">
                <Icon icon="flat-color-icons:clock" width={14} aria-hidden /> {formatearHora(p.hora)}
              </span>
            )}
            {prospecto && (
              <button type="button" onClick={onAbrirProspecto} className="flex items-center gap-1 underline-offset-2 hover:text-ink hover:underline">
                <Icon icon="flat-color-icons:businessman" width={14} aria-hidden /> {prospecto}
              </button>
            )}
          </p>
        )}
      </div>
      {!saliendo && (
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          <button type="button" onClick={onEditar} className="btn-ghost px-3 py-1.5 text-xs" aria-label={`Editar: ${p.texto}`}>
            Editar
          </button>
          {onPasar && (
            <button type="button" onClick={onPasar.accion} className="btn-ghost px-3 py-1.5 text-xs">
              {onPasar.etiqueta}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
