"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { crmAgregarActividad, crmMensajesSeguimiento, crmMover } from "@/lib/api";
import { nombreEtapa } from "@/lib/crm-data";
import { infoRamo } from "@/lib/ramos";
import { hoyLocal } from "@/lib/fechas";
import {
  ligaWhatsAppLead,
  listaDeSeguimiento,
  mensajeSeguimiento,
  motivoDe,
  resumenSeguimiento,
  type MotivoSeguimiento,
  type PendienteSeguimiento,
} from "@/lib/seguimiento-reglas";
import type { Lead } from "@/lib/types";
import { AvatarEmpleado } from "./AvatarEmpleado";
import { EditorMensajesSofi, type EjemploProspecto } from "./seguimiento/EditorMensajesSofi";

interface SofiProps {
  leads: Lead[];
  onAbrir: (id: string) => void;
  /** Recarga los prospectos después de registrar un contacto. */
  onCambio: () => void;
}

type Hecho = "whatsapp" | "llamada" | "perdido";

/**
 * Sofi, tu empleada digital de seguimiento a prospectos. Vive junto a Robert.
 * Cada mañana te dice a quién le toca que le escribas, en orden de urgencia, y deja
 * el WhatsApp listo según la etapa. Tú lo envías; Sofi no manda nada sola.
 * No usa IA: trabaja con reglas fijas, sin costo, y los datos de tus prospectos no salen de tu CRM.
 */
export function SeguimientoSofi({ leads, onAbrir, onCambio }: SofiProps) {
  const hoy = hoyLocal();
  // Lo que ya hiciste en esta visita: se queda a la vista (atenuado) hasta que recargues.
  const [hechos, setHechos] = useState<Record<string, Hecho>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const relojAviso = useRef<number | undefined>(undefined);
  // Tus mensajes de WhatsApp personalizados (vacío = textos base de Sofi).
  const [mensajes, setMensajes] = useState<Partial<Record<MotivoSeguimiento, string>>>({});
  const [editorAbierto, setEditorAbierto] = useState(false);

  useEffect(() => {
    // Si aún no existe la tabla de mensajes, Sofi sigue con sus textos base.
    crmMensajesSeguimiento().then(setMensajes, () => undefined);
  }, []);

  const resumen = useMemo(() => resumenSeguimiento(leads, hoy), [leads, hoy]);
  const lista = useMemo(() => {
    const todos = listaDeSeguimiento(leads, hoy);
    // Los que ya atendiste en esta visita se van al final.
    return [...todos.filter((p) => !hechos[p.lead.id]), ...todos.filter((p) => hechos[p.lead.id])];
  }, [leads, hoy, hechos]);

  function avisar(texto: string) {
    setAviso(texto);
    window.clearTimeout(relojAviso.current);
    relojAviso.current = window.setTimeout(() => setAviso(null), 4500);
  }

  /** Anota el contacto en el expediente (eso reinicia los días sin contacto) y avanza al prospecto nuevo. */
  async function registrar(p: PendienteSeguimiento, que: Hecho) {
    const id = p.lead.id;
    setHechos((h) => ({ ...h, [id]: que }));
    try {
      if (que === "perdido") {
        await crmAgregarActividad(id, "nota", "Sofi: se marcó como no interesado.");
        await crmMover(id, "perdido");
      } else {
        await crmAgregarActividad(
          id,
          que === "whatsapp" ? "mensaje" : "llamada",
          que === "whatsapp" ? "Sofi: WhatsApp de seguimiento enviado." : "Sofi: llamada de seguimiento realizada.",
        );
        // Un prospecto nuevo ya contactado pasa a "Contactado".
        if (p.etapa === "nuevo") await crmMover(id, "contactado");
      }
      onCambio();
    } catch (e) {
      setHechos((h) => Object.fromEntries(Object.entries(h).filter(([k]) => k !== id)));
      avisar((e as Error).message || "No pude anotarlo. Intenta de nuevo.");
    }
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      avisar("Mensaje copiado.");
    } catch {
      /* sin portapapeles: el mensaje sigue visible para copiarlo a mano */
    }
  }

  return (
    <section className="space-y-4">
      <div className="glass-strong flex items-start gap-4 rounded-2xl p-4 sm:p-5">
        <AvatarEmpleado variante="sofi" tamano={76} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl text-ink">Sofi</p>
          <p className="text-sm text-ink-soft">
            Tu seguimiento a prospectos · <span style={{ color: "var(--green)" }}>en línea</span>
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink">{resumen.frase}</p>
        </div>
      </div>

      {aviso && (
        <p className="rounded-xl border border-line bg-bg-3/70 px-4 py-3 text-sm text-ink" role="status">
          {aviso}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cifra titulo="Les toca hoy" valor={resumen.porContactar} nota="seguimiento pendiente" color={resumen.porContactar ? "var(--amber)" : "var(--green)"} />
        <Cifra titulo="Urgentes" valor={resumen.urgentes} nota="llevan días sin respuesta" color={resumen.urgentes ? "var(--red)" : "var(--green)"} />
        <Cifra titulo="Nuevos sin contactar" valor={resumen.nuevosSinContacto} nota="entre más rápido, mejor" color={resumen.nuevosSinContacto ? "var(--sky)" : "var(--green)"} />
        <Cifra titulo="Al corriente" valor={resumen.alCorriente} nota="aún no les toca" color="var(--green)" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-ink">{lista.length > 0 ? "A quién escribirle hoy" : "Tus mensajes"}</h3>
        <button type="button" onClick={() => setEditorAbierto((v) => !v)} aria-expanded={editorAbierto} className="btn-ghost px-3 py-1.5 text-xs">
          <Icon icon="flat-color-icons:edit-image" width={16} aria-hidden /> Personalizar mensajes
        </button>
      </div>
      {editorAbierto && (
        <EditorMensajesSofi
          personalizadas={mensajes}
          // El primero de cada situación en la lista de hoy sirve de ejemplo para la vista previa.
          ejemplos={Object.fromEntries([...lista].reverse().map((x) => [motivoDe(x), x.lead])) as Partial<Record<MotivoSeguimiento, EjemploProspecto>>}
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
      )}

      {lista.length > 0 && (
        <ul className="space-y-3">
          {lista.map((p) => (
            <TarjetaSeguimiento
              key={p.lead.id}
              p={p}
              mensajes={mensajes}
              hecho={hechos[p.lead.id] ?? null}
              onAbrir={() => onAbrir(p.lead.id)}
              onRegistrar={(que) => void registrar(p, que)}
              onCopiar={(t) => void copiar(t)}
            />
          ))}
        </ul>
      )}

      <p className="text-xs text-ink-mute">
        Cuándo le toca a cada quien: nuevos, el mismo día · contactados y con cita, a los 2 días sin contacto · con propuesta, a los 3. Cada vez que
        anotas un contacto, el conteo de días vuelve a cero.
      </p>
    </section>
  );
}

function Cifra({ titulo, valor, nota, color }: { titulo: string; valor: number; nota: string; color: string }) {
  return (
    <div className="glass flex min-h-[110px] flex-col rounded-2xl p-3.5 sm:p-4">
      <span className="text-[13px] font-semibold text-ink-soft">{titulo}</span>
      <span className="mt-1 text-[28px] font-bold leading-tight" style={{ color }}>
        {valor}
      </span>
      <span className="mt-auto pt-1 text-xs text-ink-mute">{nota}</span>
    </div>
  );
}

function TarjetaSeguimiento({
  p,
  mensajes,
  hecho,
  onAbrir,
  onRegistrar,
  onCopiar,
}: {
  p: PendienteSeguimiento;
  /** Tus mensajes personalizados (vacío = el texto base de cada situación). */
  mensajes: Partial<Record<MotivoSeguimiento, string>>;
  hecho: Hecho | null;
  onAbrir: () => void;
  onRegistrar: (que: Hecho) => void;
  onCopiar: (texto: string) => void;
}) {
  const [completo, setCompleto] = useState(false);
  const texto = mensajeSeguimiento(p, mensajes);
  const liga = ligaWhatsAppLead(p.lead, texto);
  const alta = p.urgencia === "alta";
  const color = alta ? "var(--red)" : "var(--amber)";
  const detalle = [p.lead.ramo ? infoRamo(p.lead.ramo).corto : null, nombreEtapa(p.etapa), p.lead.origen || null].filter(Boolean).join(" · ");

  return (
    <li
      className={`glass rounded-2xl border p-4 ${hecho ? "opacity-70" : ""}`}
      style={{ borderColor: `color-mix(in srgb, ${color} 45%, transparent)` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide" style={{ color }}>
          <Icon icon={alta ? "flat-color-icons:high-priority" : "flat-color-icons:medium-priority"} width={15} aria-hidden />
          {alta ? "Urgente" : "Le toca hoy"}
        </span>
        <span className="text-xs text-ink-mute">{p.motivo}</span>
      </div>

      <button type="button" onClick={onAbrir} className="mt-1.5 block text-left">
        <span className="block text-[16px] font-semibold text-ink hover:underline">{p.lead.nombre}</span>
        <span className="block text-xs text-ink-mute">{detalle}</span>
      </button>

      {hecho && (
        <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--green)" }}>
          <Icon icon="flat-color-icons:ok" width={14} aria-hidden />
          {hecho === "whatsapp" ? "WhatsApp anotado" : hecho === "llamada" ? "Llamada anotada" : "Marcado como no interesado"}
        </p>
      )}

      <button
        type="button"
        onClick={() => setCompleto((v) => !v)}
        aria-expanded={completo}
        className="mt-2 block w-full rounded-xl border border-line bg-bg-2/60 p-3 text-left text-sm leading-relaxed text-ink-soft"
      >
        <span className={completo ? "block" : "line-clamp-3"}>“{texto}”</span>
        {!completo && <span className="mt-1 block text-xs text-ink-mute underline">Ver mensaje completo</span>}
      </button>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {liga ? (
          <a
            href={liga}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => !hecho && onRegistrar("whatsapp")}
            className="btn-primary col-span-2 w-full text-sm sm:w-auto"
          >
            <Icon icon="logos:whatsapp-icon" width={18} aria-hidden /> Enviar WhatsApp
          </a>
        ) : (
          <button type="button" onClick={onAbrir} className="btn-ghost col-span-2 w-full text-sm sm:w-auto">
            <Icon icon="logos:whatsapp-icon" width={18} aria-hidden /> Agregar WhatsApp
          </button>
        )}
        <button type="button" disabled={Boolean(hecho)} onClick={() => onRegistrar("llamada")} className="btn-ghost w-full text-sm sm:w-auto">
          <Icon icon="flat-color-icons:phone" width={18} aria-hidden /> Ya lo llamé
        </button>
        <button
          type="button"
          disabled={Boolean(hecho)}
          onClick={() => {
            if (window.confirm(`¿Marcar a ${p.lead.nombre} como perdido (no interesado)?`)) onRegistrar("perdido");
          }}
          className="btn-ghost w-full text-sm sm:w-auto"
        >
          <Icon icon="flat-color-icons:cancel" width={18} aria-hidden /> No le interesa
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <button type="button" onClick={() => onCopiar(texto)} className="min-h-[36px] text-ink-mute underline hover:text-ink">
          Copiar mensaje
        </button>
        <button type="button" onClick={onAbrir} className="min-h-[36px] text-ink-mute underline hover:text-ink">
          Abrir expediente
        </button>
      </div>
    </li>
  );
}
