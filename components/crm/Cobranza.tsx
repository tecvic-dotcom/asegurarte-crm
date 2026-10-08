"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import {
  crmCrearPoliza,
  crmEditarPoliza,
  crmEliminarPoliza,
  crmPolizaCancelar,
  crmPolizaPagada,
  crmPolizaPromesa,
  crmPolizaRecordada,
  crmMensajesCobro,
  crmPolizas,
  ErrorCRM,
} from "@/lib/api";
import { moneda } from "@/lib/crm-data";
import { infoRamo } from "@/lib/ramos";
import { fechaCorta, fechaLarga, hoyLocal } from "@/lib/fechas";
import {
  COLOR_ESTADO,
  DIAS_AVISO,
  DIAS_RENOVACION,
  ICONO_ESTADO,
  estadoDe,
  etiquetaEstado,
  listaDeHoy,
  listaDeRenovaciones,
  resumenCobranza,
  type MotivoCobro,
} from "@/lib/cobranza-reglas";
import type { DatosPoliza, Poliza } from "@/lib/types";
import { AvatarEmpleado } from "./AvatarEmpleado";
import { AvisoMigracion } from "./panel/AvisoMigracion";
import { TarjetaCobro } from "./cobranza/TarjetaCobro";
import { FormularioPoliza } from "./cobranza/FormularioPoliza";
import { EditorMensajes } from "./cobranza/EditorMensajes";

interface CobranzaProps {
  /** Datos de un cliente ganado para dar de alta su póliza (desde su expediente). */
  prefill: Partial<DatosPoliza> | null;
  onPrefillUsado: () => void;
}

type Formulario = { poliza: Poliza | null; inicial: Partial<DatosPoliza> | null };

type FiltroCobro = "vencidas" | "por_vencer" | "promesas" | "renuevan";

const FILTROS: Record<FiltroCobro, { titulo: string; motivos: MotivoCobro[]; vacio: string }> = {
  vencidas: { titulo: "Vencidas", motivos: ["vencida", "promesa_vencida"], vacio: "Nadie está vencido. 🎉" },
  por_vencer: { titulo: "Por vencer", motivos: ["por_vencer"], vacio: "Nadie vence en los próximos días." },
  promesas: { titulo: "Promesas de pago", motivos: ["promesa"], vacio: "No hay promesas de pago en espera." },
  renuevan: { titulo: "Renuevan", motivos: ["renovacion"], vacio: "Ninguna póliza renueva en los próximos días." },
};

/**
 * Valeri, tu empleado digital de cobranza. Vive junto a RORO.
 * Cada mañana ordena tu cartera: a quién cobrarle primero, cuánto está en
 * riesgo y el mensaje de WhatsApp listo. Tú lo envías; Valeri no manda nada sola.
 * No usa IA: trabaja con reglas fijas, sin costo.
 */
export function Cobranza({ prefill, onPrefillUsado }: CobranzaProps) {
  const [polizas, setPolizas] = useState<Poliza[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [form, setForm] = useState<Formulario | null>(() => (prefill ? { poliza: null, inicial: prefill } : null));
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  // Tus mensajes de WhatsApp personalizados (vacío = textos base de Valeri).
  const [mensajes, setMensajes] = useState<Partial<Record<MotivoCobro, string>>>({});
  const [editorAbierto, setEditorAbierto] = useState(false);
  // Al tocar una de las 4 cifras de arriba, la lista muestra solo esas pólizas.
  const [filtro, setFiltro] = useState<FiltroCobro | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
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

  useEffect(() => {
    void cargar();
    // Si aún no existe la tabla de mensajes, Valeri sigue con sus textos base.
    crmMensajesCobro().then(setMensajes, () => undefined);
  }, [cargar]);

  const pendientes = useMemo(() => (polizas ? listaDeHoy(polizas, hoy) : []), [polizas, hoy]);
  const mostradas = useMemo(() => {
    if (!filtro) return pendientes;
    if (filtro === "renuevan") return polizas ? listaDeRenovaciones(polizas, hoy) : [];
    return pendientes.filter((x) => FILTROS[filtro].motivos.includes(x.motivo));
  }, [filtro, pendientes, polizas, hoy]);

  function elegirFiltro(f: FiltroCobro) {
    const nuevo = filtro === f ? null : f;
    setFiltro(nuevo);
    if (nuevo) window.setTimeout(() => document.getElementById("lista-cobranza")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }
  const resumen = useMemo(() => (polizas ? resumenCobranza(polizas, hoy) : null), [polizas, hoy]);
  const cartera = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (polizas ?? [])
      .filter((p) => !q || [p.asegurado, p.numero, p.aseguradora, p.whatsapp].some((x) => x.toLowerCase().includes(q)))
      .sort((a, b) => a.asegurado.localeCompare(b.asegurado, "es"));
  }, [polizas, busca]);

  function avisar(texto: string) {
    setAviso(texto);
    window.clearTimeout(relojAviso.current);
    relojAviso.current = window.setTimeout(() => setAviso(null), 4500);
  }

  function reemplazar(p: Poliza) {
    setPolizas((lista) => (lista ? lista.map((x) => (x.id === p.id ? p : x)) : lista));
  }

  async function accion(promesa: Promise<Poliza>, texto: (p: Poliza) => string) {
    try {
      const p = await promesa;
      reemplazar(p);
      avisar(texto(p));
    } catch (e) {
      avisar((e as Error).message);
    }
  }

  function abrirFormulario(f: Formulario) {
    setErrorForm(null);
    setForm(f);
    // Lleva la vista hasta el formulario en cuanto aparece en pantalla.
    window.setTimeout(() => document.getElementById("formulario-poliza")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  function cerrarFormulario() {
    setForm(null);
    setErrorForm(null);
    onPrefillUsado();
  }

  async function guardar(datos: DatosPoliza) {
    if (!form) return;
    setGuardando(true);
    setErrorForm(null);
    try {
      if (form.poliza) {
        reemplazar(await crmEditarPoliza(form.poliza.id, datos));
        avisar("Póliza actualizada.");
      } else {
        const nueva = await crmCrearPoliza(datos);
        setPolizas((lista) => [...(lista ?? []), nueva]);
        avisar(`Listo: ${nueva.asegurado} ya está en tu cartera.`);
      }
      cerrarFormulario();
    } catch (e) {
      setErrorForm((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(p: Poliza) {
    if (!window.confirm(`¿Borrar la póliza de ${p.asegurado}? No se puede deshacer.`)) return;
    try {
      await crmEliminarPoliza(p.id);
      setPolizas((lista) => (lista ? lista.filter((x) => x.id !== p.id) : lista));
      cerrarFormulario();
      avisar("Póliza borrada.");
    } catch (e) {
      setErrorForm((e as Error).message);
    }
  }

  if (error instanceof ErrorCRM && error.migracion) {
    return (
      <AvisoMigracion
        onListo={() => void cargar()}
        archivo={error.archivo}
        que="a Valeri"
        detalle="Tu libreta en la nube (Supabase) necesita un cajón nuevo: tu cartera de pólizas para cobrar. Se hace una sola vez, igual que el paso del AI Manager."
      />
    );
  }

  return (
    <section className="space-y-4">
      {/* Cabecera: Valeri con su reporte del día */}
      <div className="glass-strong flex items-start gap-4 rounded-2xl p-4 sm:p-5">
        <AvatarEmpleado variante="valeri" tamano={76} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl text-ink">Valeri</p>
          <p className="text-sm text-ink-soft">
            Tu cobranza digital · <span style={{ color: "var(--green)" }}>en línea</span>
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink">
            {resumen ? resumen.frase : error ? error.message : "Revisando tu cartera…"}
          </p>
          {error && (
            <button type="button" onClick={() => void cargar()} className="btn-ghost mt-2 px-3 py-2 text-xs">
              Reintentar
            </button>
          )}
        </div>
      </div>

      {aviso && (
        <p className="rounded-xl border border-line bg-bg-3/70 px-4 py-3 text-sm text-ink" role="status">
          {aviso}
        </p>
      )}

      {form && (
        <FormularioPoliza
          key={form.poliza?.id ?? "nueva"}
          poliza={form.poliza}
          inicial={form.inicial}
          guardando={guardando}
          error={errorForm}
          onGuardar={guardar}
          onCancelar={cerrarFormulario}
          onCancelarPoliza={
            form.poliza
              ? (cancelada) => {
                  const id = form.poliza!.id;
                  cerrarFormulario();
                  void accion(crmPolizaCancelar(id, cancelada), (p) =>
                    cancelada ? `${p.asegurado}: cancelada, Valeri ya no la cobra.` : `${p.asegurado}: reactivada.`,
                  );
                }
              : undefined
          }
          onBorrar={form.poliza ? () => void borrar(form.poliza!) : undefined}
        />
      )}

      {polizas === null && !error && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Cargando tu cartera">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[110px] animate-pulse rounded-2xl bg-bg-3/70" />
          ))}
        </div>
      )}

      {polizas && polizas.length === 0 && !form && (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="font-semibold text-ink">Valeri ya está en línea; solo falta tu cartera.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
            Agrega tus pólizas con su WhatsApp y la fecha límite del próximo pago. Desde mañana te dice a quién cobrarle primero y te deja el mensaje listo.
          </p>
          <button type="button" onClick={() => abrirFormulario({ poliza: null, inicial: null })} className="btn-primary mt-4 px-6 py-3 text-sm">
            <Icon icon="flat-color-icons:plus" width={18} aria-hidden /> Agregar mi primera póliza
          </button>
          <p className="mx-auto mt-4 max-w-md text-xs text-ink-mute">
            ¿Tienes tu cartera en Excel? Pídele a Claude Code: “carga mi cartera de este Excel en Valeri”. Y cuando cierres una venta, en el expediente del cliente ganado toca “Agregar a cobranza”.
          </p>
        </div>
      )}

      {resumen && polizas && polizas.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Cifra
              titulo="Vencidas"
              valor={resumen.vencidas}
              monto={resumen.montoVencido}
              nota="incluye promesas incumplidas"
              color={resumen.vencidas ? "var(--red)" : "var(--green)"}
              icono={resumen.vencidas ? "flat-color-icons:high-priority" : "flat-color-icons:ok"}
              palabra={resumen.vencidas ? "Cobra primero" : "Nadie atrasado"}
              activa={filtro === "vencidas"}
              onClick={() => elegirFiltro("vencidas")}
            />
            <Cifra
              titulo={`Por vencer (${DIAS_AVISO} días)`}
              valor={resumen.porVencer}
              monto={resumen.montoPorVencer}
              nota="recuérdales antes de la fecha"
              color="var(--amber)"
              icono="flat-color-icons:medium-priority"
              palabra={resumen.porVencer ? "Avísales" : "Sin pendientes"}
              activa={filtro === "por_vencer"}
              onClick={() => elegirFiltro("por_vencer")}
            />
            <Cifra
              titulo="Promesas de pago"
              valor={resumen.promesas}
              nota="Valeri te avisa si no cumplen"
              color="var(--sky)"
              icono="flat-color-icons:clock"
              palabra="En espera"
              activa={filtro === "promesas"}
              onClick={() => elegirFiltro("promesas")}
            />
            <Cifra
              titulo={`Renuevan (${DIAS_RENOVACION} días)`}
              valor={resumen.renuevan}
              nota="llámales para renovar"
              color="var(--sky)"
              icono="flat-color-icons:calendar"
              palabra="Agenda llamada"
              activa={filtro === "renuevan"}
              onClick={() => elegirFiltro("renuevan")}
            />
          </div>

          <section id="lista-cobranza" className="scroll-mt-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold text-ink">
                {filtro ? `${FILTROS[filtro].titulo} (${mostradas.length})` : "A quién cobrarle hoy"}
                {filtro && (
                  <button type="button" onClick={() => setFiltro(null)} className="ml-3 text-xs font-normal text-ink-mute underline hover:text-ink">
                    Ver todos los pendientes ({pendientes.length})
                  </button>
                )}
              </h3>
              <span className="flex flex-wrap items-center gap-3 text-xs text-ink-mute">
                Ordenado por urgencia · {fechaLarga(hoy)}
                <button type="button" onClick={() => setEditorAbierto((v) => !v)} aria-expanded={editorAbierto} className="btn-ghost px-3 py-1.5 text-xs">
                  <Icon icon="flat-color-icons:edit-image" width={16} aria-hidden /> Personalizar mensajes
                </button>
              </span>
            </div>
            {editorAbierto && (
              <div className="mb-3">
                <EditorMensajes
                  personalizadas={mensajes}
                  ejemplos={Object.fromEntries([...pendientes].reverse().map((x) => [x.motivo, x.poliza])) as Partial<Record<MotivoCobro, Poliza>>}
                  onCambio={(motivo, texto) =>
                    setMensajes((m) => {
                      const nuevo = { ...m };
                      if (texto === null) delete nuevo[motivo];
                      else nuevo[motivo] = texto;
                      return nuevo;
                    })
                  }
                  onCerrar={() => setEditorAbierto(false)}
                />
              </div>
            )}
            {mostradas.length === 0 ? (
              <p className="glass rounded-2xl p-5 text-center text-sm text-ink-soft">
                {filtro ? FILTROS[filtro].vacio : "Todo al corriente: hoy nadie te debe. 🎉"}
              </p>
            ) : (
              <ul className="space-y-3">
                {mostradas.map((pend) => (
                  <TarjetaCobro
                    key={`${pend.poliza.id}-${pend.motivo}`}
                    pendiente={pend}
                    plantillas={mensajes}
                    onWhatsApp={() => void accion(crmPolizaRecordada(pend.poliza.id), (p) => `Anotado: le recordaste hoy a ${p.asegurado}.`)}
                    onRecordada={() => void accion(crmPolizaRecordada(pend.poliza.id), (p) => `Anotado: le recordaste hoy a ${p.asegurado}.`)}
                    onPagada={() =>
                      void accion(crmPolizaPagada(pend.poliza.id), (p) =>
                        p.fecha_limite_pago
                          ? `¡Pagó! Siguiente recibo de ${p.asegurado}: ${fechaLarga(p.fecha_limite_pago)}.`
                          : `¡Pagó! ${p.asegurado} queda al corriente.`,
                      )
                    }
                    onCancelada={() =>
                      void accion(crmPolizaCancelar(pend.poliza.id, true), (p) => `${p.asegurado}: cancelada, Valeri ya no la cobra.`)
                    }
                    onPromesa={(fecha) =>
                      void accion(crmPolizaPromesa(pend.poliza.id, fecha), (p) => `Promesa anotada: ${p.asegurado} paga el ${fechaLarga(fecha)}.`)
                    }
                    onEditar={() => abrirFormulario({ poliza: pend.poliza, inicial: null })}
                    onCopiado={() => avisar("Mensaje copiado. Pégalo donde le escribas.")}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="glass rounded-2xl p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-ink">Tu cartera</h3>
                <p className="text-xs text-ink-mute">
                  {resumen.polizas} {resumen.polizas === 1 ? "póliza activa" : "pólizas activas"}
                  {resumen.sinWhatsapp ? ` · ${resumen.sinWhatsapp} sin WhatsApp` : ""}
                </p>
              </div>
              <button type="button" onClick={() => abrirFormulario({ poliza: null, inicial: null })} className="btn-primary px-4 py-2.5 text-sm">
                <Icon icon="flat-color-icons:plus" width={18} aria-hidden /> Agregar póliza
              </button>
            </div>
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-glass px-3 py-2">
              <Icon icon="flat-color-icons:search" width={18} aria-hidden />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nombre, póliza o aseguradora…"
                aria-label="Buscar en tu cartera"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute"
              />
            </div>
            <ul className="divide-y divide-line">
              {cartera.map((p) => {
                const { estado, dias } = estadoDe(p, hoy);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => abrirFormulario({ poliza: p, inicial: null })}
                      className="flex w-full items-start justify-between gap-3 py-3 text-left hover:bg-glass"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{p.asegurado}</span>
                        <span className="block text-xs text-ink-mute">
                          {[p.ramo ? infoRamo(p.ramo).corto : null, p.numero || null, p.fecha_limite_pago ? `próximo pago ${fechaCorta(p.fecha_limite_pago)}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                          {p.whatsapp.length !== 10 && " · sin WhatsApp"}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-0.5">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: COLOR_ESTADO[estado] }}>
                          <Icon icon={ICONO_ESTADO[estado]} width={13} aria-hidden /> {etiquetaEstado(estado, dias, p)}
                        </span>
                        {p.monto_pago > 0 && <span className="text-xs text-ink-soft">{moneda(p.monto_pago)}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
              {!cartera.length && <li className="py-6 text-center text-sm text-ink-mute">Nada coincide con tu búsqueda.</li>}
            </ul>
          </section>
        </>
      )}
    </section>
  );
}

function Cifra({
  titulo,
  valor,
  monto,
  nota,
  color,
  icono,
  palabra,
  activa,
  onClick,
}: {
  titulo: string;
  valor: number;
  monto?: number;
  nota: string;
  color: string;
  icono: string;
  palabra: string;
  /** Esta cifra es el filtro que está viendo la lista. */
  activa: boolean;
  onClick: () => void;
}) {
  const conSenal = valor > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      title="Toca para ver solo estas pólizas"
      className={`glass flex min-h-[124px] w-full flex-col rounded-2xl p-3.5 text-left transition-transform hover:-translate-y-0.5 sm:p-4 ${activa ? "ring-2 ring-brand-2" : ""}`}
      style={conSenal || activa ? { borderColor: `color-mix(in srgb, ${color} 55%, transparent)` } : undefined}
    >
      <span className="text-[13px] font-semibold text-ink-soft">{titulo}</span>
      <span className="mt-1 text-[28px] font-bold leading-tight text-ink">{valor}</span>
      {monto !== undefined && monto > 0 && <span className="text-sm font-semibold text-ink">{moneda(monto)}</span>}
      <span className="mt-auto flex items-center gap-1 pt-1 text-xs font-semibold" style={{ color: conSenal ? color : "var(--ink-mute)" }}>
        <Icon icon={icono} width={14} aria-hidden /> {palabra}
      </span>
      <span className="text-[11px] text-ink-mute">{nota}</span>
    </button>
  );
}
