"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import {
  crmAgregarActividad,
  crmCotizaciones,
  crmCrearCotizacion,
  crmCrearPendiente,
  crmEditarCotizacion,
  crmEstadoCotizacion,
  crmMarcarEnviadas,
  crmMover,
  ErrorCRM,
} from "@/lib/api";
import {
  agruparPorRamo,
  infoRamoCotizacion,
  ordenarCotizaciones,
  RAMOS_COTIZACION,
  resumenCotizacion,
  textoSeguimiento,
  type Cotizacion,
  type DatosCotizacion,
  type EstadoCotizacion,
  type RamoCotizacion,
} from "@/lib/cotizaciones-reglas";
import { etapa as etapaPorId } from "@/lib/crm-data";
import { hoyLocal, sumarDias } from "@/lib/fechas";
import { etiquetaDia } from "@/lib/pendientes-reglas";
import type { Lead } from "@/lib/types";
import { AvisoMigracion } from "../panel/AvisoMigracion";
import { FormularioCotizacion } from "./FormularioCotizacion";
import { PanelEnvio, type OpcionesEnvio } from "./PanelEnvio";
import { TablaComparativa } from "./TablaComparativa";

interface VistaProspectoProps {
  lead: Lead;
  /** Con qué nombre se despide el mensaje al cliente. */
  firma: string;
  onCambiar: () => void;
  onAbrirExpediente: () => void;
  /** Se movió algo del prospecto (por ejemplo su etapa): que el CRM vuelva a leer los prospectos. */
  onCambio: () => void;
}

interface EstadoFormulario {
  modo: "nueva" | "editar" | "duplicar";
  ramo: RamoCotizacion;
  base?: Cotizacion;
  /** Datos que no cambian entre opciones, ya escritos para la siguiente. */
  arrastre?: Record<string, string>;
}

function edadDe(nacimiento: string | null, hoy: string): number | null {
  if (!nacimiento || !/^\d{4}-\d{2}-\d{2}/.test(nacimiento)) return null;
  const [y, m, d] = nacimiento.slice(0, 10).split("-").map(Number);
  const [hy, hm, hd] = hoy.split("-").map(Number);
  const edad = hy - y - (hm < m || (hm === m && hd < d) ? 1 : 0);
  return edad >= 0 && edad < 120 ? edad : null;
}

const sin = (s: Set<string>, id: string) => {
  const n = new Set(s);
  n.delete(id);
  return n;
};

/**
 * Las cotizaciones de un prospecto: anota cada opción que cotizaste en el portal de la aseguradora,
 * compáralas lado a lado y mándale por WhatsApp el mensaje ya redactado.
 */
export function VistaProspecto({ lead, firma, onCambiar, onAbrirExpediente, onCambio }: VistaProspectoProps) {
  const hoy = hoyLocal();
  const [lista, setLista] = useState<Cotizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<ErrorCRM | Error | null>(null);
  const [formulario, setFormulario] = useState<EstadoFormulario | null>(null);
  // Cada vez que se abre un formulario es uno nuevo (no arrastra lo escrito en el anterior).
  const [vez, setVez] = useState(0);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [ocupadas, setOcupadas] = useState<Set<string>>(new Set());
  const [verDescartadas, setVerDescartadas] = useState(false);
  const [mensajeAbierto, setMensajeAbierto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const relojAviso = useRef<number | undefined>(undefined);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      setLista(await crmCotizaciones(lead.id));
    } catch (e) {
      setError(e as Error);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let vivo = true;
    crmCotizaciones(lead.id)
      .then((d) => vivo && setLista(d))
      .catch((e) => vivo && setError(e as Error))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
      window.clearTimeout(relojAviso.current);
    };
  }, [lead.id]);

  /** Vuelve a leer las de este prospecto (el servidor puede cambiar más de una a la vez, por ejemplo al elegir). */
  async function sincronizar() {
    try {
      setLista(await crmCotizaciones(lead.id));
    } catch {
      /* se queda lo que ya se veía */
    }
  }

  function avisar(texto: string) {
    setAviso(texto);
    window.clearTimeout(relojAviso.current);
    relojAviso.current = window.setTimeout(() => setAviso(null), 9000);
  }

  function abrirFormulario(f: EstadoFormulario) {
    setFormulario(f);
    setVez((v) => v + 1);
  }

  async function guardar(datos: DatosCotizacion, otra: boolean) {
    if (formulario?.modo === "editar" && formulario.base) {
      const c = await crmEditarCotizacion(formulario.base.id, datos);
      setLista((l) => l.map((x) => (x.id === c.id ? c : x)));
      setFormulario(null);
      avisar("Cambios guardados.");
      return;
    }
    const c = await crmCrearCotizacion(datos);
    setLista((l) => [c, ...l]);
    if (otra) {
      // Lo que se asegura (asegurados, vehículo…) no cambia entre opciones: se queda escrito para la siguiente.
      const ramo = infoRamoCotizacion(datos.ramo);
      const arrastre: Record<string, string> = {};
      for (const campo of ramo.campos) if (campo.compartido && datos.datos[campo.clave]) arrastre[campo.clave] = datos.datos[campo.clave];
      abrirFormulario({ modo: "nueva", ramo: datos.ramo, arrastre });
      avisar(`Guardé ${c.aseguradora}. Agrega la siguiente opción de ${ramo.corto}.`);
    } else {
      setFormulario(null);
      avisar("Cotización guardada. Márcala para incluirla en el mensaje de WhatsApp.");
    }
  }

  async function cambiarEstado(c: Cotizacion, estado: EstadoCotizacion) {
    if (ocupadas.has(c.id)) return;
    setOcupadas((o) => new Set(o).add(c.id));
    try {
      await crmEstadoCotizacion(c.id, estado);
      await sincronizar();
      if (estado === "descartada") setSeleccion((s) => sin(s, c.id));
      avisar(
        estado === "elegida"
          ? `Marqué «${resumenCotizacion(c)}» como la elegida.`
          : estado === "descartada"
            ? "Descartada. Sigue guardada: la ves con «Mostrar descartadas»."
            : estado === "guardada" && c.estado === "descartada"
              ? "Recuperada."
              : "Listo.",
      );
    } catch (err) {
      avisar((err as Error).message || "No pude cambiarla. Intenta de nuevo.");
    } finally {
      setOcupadas((o) => sin(o, c.id));
    }
  }

  function alternar(id: string, marcada: boolean) {
    setSeleccion((s) => {
      const n = new Set(s);
      if (marcada) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  function alternarTodas(ids: string[]) {
    setSeleccion((s) => {
      const n = new Set(s);
      const todas = ids.every((id) => n.has(id));
      for (const id of ids) {
        if (todas) n.delete(id);
        else n.add(id);
      }
      return n;
    });
  }

  /** WhatsApp ya se abrió: aquí se anota que se envió, se mueve la etapa y se agenda el seguimiento. */
  async function registrarEnvio(op: OpcionesEnvio) {
    // En el mismo orden en que salieron en el mensaje.
    const enviadas = ordenarCotizaciones(lista.filter((c) => seleccion.has(c.id)));
    const fechaSeguimiento = op.dias ? sumarDias(hoy, op.dias) : null;
    const tareas: { que: string; promesa: Promise<unknown> }[] = [
      { que: "marcar las cotizaciones como enviadas", promesa: crmMarcarEnviadas(enviadas.map((c) => c.id)) },
      {
        que: "anotarlo en su historial",
        promesa: crmAgregarActividad(lead.id, "mensaje", `Cotización enviada por WhatsApp: ${enviadas.map(resumenCotizacion).join(" | ")}`),
      },
    ];
    if (op.moverEtapa) tareas.push({ que: "pasarlo a «Propuesta enviada»", promesa: crmMover(lead.id, "propuesta") });
    if (fechaSeguimiento) {
      tareas.push({
        que: "agendar el seguimiento",
        promesa: crmCrearPendiente({ texto: textoSeguimiento(enviadas, lead.nombre), fecha: fechaSeguimiento, hora: null, lead_id: lead.id }),
      });
    }
    const resultados = await Promise.allSettled(tareas.map((t) => t.promesa));
    const fallas = tareas.filter((_, i) => resultados[i].status === "rejected").map((t) => t.que);
    const listo = (que: string) => !fallas.includes(que);

    await sincronizar();
    if (op.moverEtapa) onCambio();
    setSeleccion(new Set());
    setMensajeAbierto(false);

    const partes = ["Abrí WhatsApp"];
    if (listo("marcar las cotizaciones como enviadas")) partes.push("las marqué como enviadas");
    if (op.moverEtapa && listo("pasarlo a «Propuesta enviada»")) partes.push("lo pasé a «Propuesta enviada»");
    if (fechaSeguimiento && listo("agendar el seguimiento")) partes.push(`te dejé un pendiente en Mis pendientes (${etiquetaDia(fechaSeguimiento, hoy).toLowerCase()})`);
    avisar(`${partes.join(", ")}.${fallas.length ? ` Ojo: no pude ${fallas.join(" ni ")}; hazlo a mano.` : ""}`);
  }

  const visibles = useMemo(() => lista.filter((c) => verDescartadas || c.estado !== "descartada"), [lista, verDescartadas]);
  const grupos = useMemo(() => agruparPorRamo(visibles), [visibles]);
  const descartadas = lista.filter((c) => c.estado === "descartada").length;
  const seleccionadas = useMemo(() => lista.filter((c) => seleccion.has(c.id) && c.estado !== "descartada"), [lista, seleccion]);
  const edad = edadDe(lead.fecha_nacimiento, hoy);
  const primer = lead.nombre.split(" ")[0];

  if (error instanceof ErrorCRM && error.migracion) {
    return (
      <AvisoMigracion
        onListo={() => void cargar()}
        archivo={error.archivo}
        que="tus cotizaciones"
        detalle="Tu libreta en la nube (Supabase) necesita 1 cajón nuevo para guardar tus cotizaciones y que no se pierdan nunca. Se hace una sola vez."
      />
    );
  }

  return (
    <section className="space-y-4">
      {/* A quién le cotizas */}
      <div className="glass-strong rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <Icon icon="flat-color-icons:businessman" width={40} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl text-ink">{lead.nombre}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ink-soft">
              <span>{etapaPorId(lead.etapa).nombre}</span>
              {edad !== null && <span>{edad} años</span>}
              {lead.codigo_postal && <span>CP {lead.codigo_postal}</span>}
              {lead.whatsapp && (
                <span className="flex items-center gap-1">
                  <Icon icon="logos:whatsapp-icon" width={14} aria-hidden /> {lead.whatsapp}
                </span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={onAbrirExpediente} className="btn-ghost px-3 py-2 text-xs">
              Ver expediente
            </button>
            <button type="button" onClick={onCambiar} className="btn-ghost px-3 py-2 text-xs">
              Cambiar prospecto
            </button>
          </div>
        </div>
      </div>

      {/* Qué se le cotiza */}
      <div className="glass rounded-2xl p-4">
        <p className="field-label">¿Qué vas a cotizarle?</p>
        <div className="flex flex-wrap gap-2">
          {RAMOS_COTIZACION.map((r) => (
            <button key={r.id} type="button" onClick={() => abrirFormulario({ modo: "nueva", ramo: r.id })} className="btn-ghost gap-2 px-3.5 py-2 text-sm">
              <Icon icon={r.icono} width={20} aria-hidden /> {r.corto}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-mute">Cotiza en el portal de la aseguradora y guarda aquí cada opción: yo las comparo y armo el mensaje de WhatsApp.</p>
      </div>

      {aviso && (
        <p className="rounded-xl border border-line bg-bg-3/70 px-4 py-3 text-sm text-ink" role="status">
          {aviso}
        </p>
      )}

      {error && !cargando && (
        <p className="rounded-xl border border-line bg-bg-3/70 px-4 py-3 text-sm text-ink" role="alert">
          {error.message || "No pude cargar tus cotizaciones."}{" "}
          <button type="button" onClick={() => void cargar()} className="font-semibold underline underline-offset-2">
            Reintentar
          </button>
        </p>
      )}

      {formulario && (
        <FormularioCotizacion
          key={vez}
          lead={lead}
          modo={formulario.modo}
          ramoInicial={formulario.ramo}
          base={formulario.base}
          arrastre={formulario.arrastre}
          onGuardar={guardar}
          onCancelar={() => setFormulario(null)}
        />
      )}

      {cargando && <p className="px-1 text-sm text-ink-mute">Cargando sus cotizaciones…</p>}

      {!cargando && !error && grupos.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-mute">
          {descartadas > 0
            ? `Todas las cotizaciones de ${primer} están descartadas.`
            : `Todavía no le has guardado cotizaciones a ${primer}. Elige arriba qué le vas a cotizar.`}
        </p>
      )}

      {!cargando && !error && (
        <div className="space-y-6">
          {grupos.map((g) => (
            <TablaComparativa
              key={g.ramo.id}
              grupo={g}
              seleccion={seleccion}
              ocupadas={ocupadas}
              onAlternar={alternar}
              onAlternarTodas={alternarTodas}
              onNueva={() => abrirFormulario({ modo: "nueva", ramo: g.ramo.id })}
              onEditar={(c) => abrirFormulario({ modo: "editar", ramo: c.ramo, base: c })}
              onDuplicar={(c) => abrirFormulario({ modo: "duplicar", ramo: c.ramo, base: c })}
              onEstado={(c, estado) => void cambiarEstado(c, estado)}
            />
          ))}
        </div>
      )}

      {!cargando && !error && descartadas > 0 && (
        <button type="button" onClick={() => setVerDescartadas((v) => !v)} aria-pressed={verDescartadas} className="btn-ghost w-full justify-center px-4 py-2.5 text-sm">
          {verDescartadas ? "Ocultar descartadas" : `Mostrar descartadas (${descartadas})`}
        </button>
      )}

      {seleccionadas.length > 0 && (
        <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-2 bg-bg-2/95 px-4 py-3 shadow-2xl backdrop-blur">
          <p className="min-w-0 flex-1 text-sm text-ink">
            <strong>{seleccionadas.length}</strong> {seleccionadas.length === 1 ? "opción marcada" : "opciones marcadas"} para mandar a {primer}
          </p>
          <button type="button" onClick={() => setSeleccion(new Set())} className="btn-ghost px-3 py-2 text-xs">
            Quitar marcas
          </button>
          <button type="button" onClick={() => setMensajeAbierto(true)} className="btn-primary px-4 py-2 text-sm">
            <Icon icon="logos:whatsapp-icon" width={18} aria-hidden /> Preparar mensaje
          </button>
        </div>
      )}

      {mensajeAbierto && seleccionadas.length > 0 && (
        <PanelEnvio lead={lead} cotizaciones={seleccionadas} firma={firma} onEnviar={registrarEnvio} onCerrar={() => setMensajeAbierto(false)} />
      )}
    </section>
  );
}
