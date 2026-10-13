"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { ETAPAS, ETAPAS_ACTIVAS, moneda } from "@/lib/crm-data";
import { formatoWhatsapp } from "@/lib/clientes-reglas";
import { infoRamo } from "@/lib/ramos";
import type { Lead, EtapaId } from "@/lib/types";

/**
 * Kanban arrastrable (portado del CRM del Lunes Sinergético, re-skineado a la
 * marca LEGENDAR·IA: azul #2a22f5, Iconify, sin dorado). El estado vive en el
 * componente padre (CRMApp); aquí solo movemos y avisamos.
 *
 * Dos modos: "tablero" (Mi día → Tablero: etapas activas y dos zonas para ganado/perdido) y
 * "embudo" (menú «Embudo de ventas»: TODAS las etapas como columnas, con nombre, WhatsApp y ramo en cada tarjeta).
 */
interface PipelineProps {
  leads: Lead[];
  onMover: (id: string, etapa: EtapaId) => void;
  onAbrir: (id: string) => void;
  modo?: "tablero" | "embudo";
}

export function Pipeline({ leads, onMover, onAbrir, modo = "tablero" }: PipelineProps) {
  const embudo = modo === "embudo";
  const columnas = embudo ? ETAPAS : ETAPAS_ACTIVAS;
  const [activo, setActivo] = useState<Lead | null>(null);
  const [celebrar, setCelebrar] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragStart(e: DragStartEvent) {
    setActivo(leads.find((l) => l.id === String(e.active.id)) ?? null);
  }
  function onDragEnd(e: DragEndEvent) {
    setActivo(null);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    const lead = leads.find((l) => l.id === String(e.active.id));
    if (!lead) return;
    const destino: EtapaId | null =
      overId === "zona-ganado" ? "ganado" : overId === "zona-perdido" ? "perdido" : columnas.some((et) => et.id === overId) ? (overId as EtapaId) : null;
    if (!destino || lead.etapa === destino) return;
    onMover(lead.id, destino);
    if (destino === "ganado") {
      setCelebrar(lead.nombre);
      setTimeout(() => setCelebrar(null), 2600);
    }
  }

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className={`no-scrollbar flex overflow-x-auto pb-2 ${embudo ? "gap-2" : "gap-3"}`}>
          {columnas.map((et) => {
            // Los que llevan más tiempo sin tocar, arriba de cada columna.
            const items = leads.filter((l) => l.etapa === et.id).sort((a, b) => a.actualizado_en.localeCompare(b.actualizado_en));
            const total = items.reduce((s, l) => s + l.valor, 0);
            return (
              <Columna key={et.id} id={et.id} nombre={et.nombre} color={et.color} count={items.length} total={total} embudo={embudo}>
                {items.map((l) => (
                  <CardArrastrable key={l.id} lead={l} onAbrir={onAbrir} embudo={embudo} />
                ))}
              </Columna>
            );
          })}
        </div>

        {!embudo && (
          <div className="grid gap-3 sm:grid-cols-2">
            <ZonaSalida id="zona-ganado" tono="ganado" label="Suelta aquí para marcar GANADO 🎉" />
            <ZonaSalida id="zona-perdido" tono="perdido" label="Suelta aquí para marcar Perdido" />
          </div>
        )}

        <DragOverlay>{activo ? <CardVisual lead={activo} dragging embudo={embudo} /> : null}</DragOverlay>
      </DndContext>

      <AnimatePresence>
        {celebrar && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/50"
            onClick={() => setCelebrar(null)}
          >
            <div className="glass-strong rounded-3xl px-10 py-8 text-center">
              <Icon icon="flat-color-icons:approval" width={72} className="mx-auto" />
              <p className="mt-3 font-display text-2xl text-ink">¡{celebrar} es cliente!</p>
              <p className="text-ink-mute">Felicidades, cerraste una venta 🎉</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Columna({
  id,
  nombre,
  color,
  count,
  total,
  embudo,
  children,
}: {
  id: string;
  nombre: string;
  color: string;
  count: number;
  total: number;
  embudo: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className={`flex flex-col ${embudo ? "min-w-[158px] flex-1 basis-0" : "w-[260px] shrink-0"}`}>
      <div className={`mb-2 px-1 ${embudo ? "" : "flex items-center justify-between"}`}>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
          <span className={`font-semibold leading-tight text-ink ${embudo ? "text-[13px]" : "text-sm"}`}>{nombre}</span>
          {!embudo && <span className="text-xs text-ink-mute">{count}</span>}
        </div>
        <span className={`text-[11px] text-ink-mute ${embudo ? "mt-0.5 block pl-[18px]" : ""}`}>
          {embudo ? (
            <>
              <b className="font-semibold text-ink-soft">{count}</b> · {moneda(total)}
            </>
          ) : (
            moneda(total)
          )}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-2xl border p-2 transition-colors ${
          isOver ? "border-brand-2 bg-brand/10" : "border-line bg-bg-2/30"
        } ${embudo ? "no-scrollbar max-h-[68vh] overflow-y-auto" : ""}`}
        style={{ minHeight: embudo ? 220 : 140 }}
      >
        {children}
        {count === 0 && (
          <p className="px-2 py-6 text-center text-xs text-ink-mute">{embudo ? "Sin prospectos en esta etapa. Arrastra uno aquí." : "Arrastra prospectos aquí"}</p>
        )}
      </div>
    </div>
  );
}

function ZonaSalida({ id, tono, label }: { id: string; tono: "ganado" | "perdido"; label: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const color = tono === "ganado" ? "var(--green)" : "var(--ink-mute)";
  return (
    <div
      ref={setNodeRef}
      className="flex items-center justify-center gap-2 rounded-2xl border border-dashed py-4 text-sm font-medium transition-all"
      style={{
        borderColor: isOver ? color : "var(--line)",
        background: isOver ? `color-mix(in srgb, ${color} 12%, transparent)` : "transparent",
        color: isOver ? color : "var(--ink-mute)",
      }}
    >
      {tono === "ganado" && <Icon icon="flat-color-icons:money-transfer" width={18} />}
      {label}
    </div>
  );
}

function CardArrastrable({ lead, onAbrir, embudo }: { lead: Lead; onAbrir: (id: string) => void; embudo: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div ref={setNodeRef} className={isDragging ? "opacity-40" : ""}>
      <CardVisual lead={lead} handleProps={{ ...attributes, ...listeners }} onAbrir={onAbrir} embudo={embudo} />
    </div>
  );
}

function CardVisual({
  lead,
  handleProps,
  dragging,
  onAbrir,
  embudo = false,
}: {
  lead: Lead;
  handleProps?: Record<string, unknown>;
  dragging?: boolean;
  onAbrir?: (id: string) => void;
  embudo?: boolean;
}) {
  if (embudo) return <CardEmbudo lead={lead} handleProps={handleProps} dragging={dragging} onAbrir={onAbrir} />;
  return (
    <div className={`group rounded-xl border border-line bg-glass p-3 ${dragging ? "shadow-2xl" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div {...handleProps} className="min-w-0 flex-1 cursor-grab touch-none active:cursor-grabbing">
          <p className="truncate text-sm font-semibold text-ink">{lead.nombre}</p>
          {lead.valor > 0 && <p className="text-xs text-ink-soft">{moneda(lead.valor)}</p>}
        </div>
        {onAbrir && (
          <button
            onClick={() => onAbrir(lead.id)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-mute opacity-0 transition-opacity hover:bg-white/10 hover:text-ink group-hover:opacity-100"
            title="Ver expediente"
          >
            <Icon icon="flat-color-icons:expand" width={18} />
          </button>
        )}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-ink-mute">{lead.origen}</span>
          {lead.ramo && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-ink-soft">
              <Icon icon={infoRamo(lead.ramo).icono} width={11} aria-hidden /> {infoRamo(lead.ramo).corto}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {lead.utm_source && <span className="text-[10px] text-ink-mute">via {lead.utm_source}</span>}
          <DiasSinContacto lead={lead} />
        </span>
      </div>
    </div>
  );
}

/**
 * Tarjeta del «Embudo de ventas»: lo que necesitas a la vista para actuar: nombre, WhatsApp (toca para escribirle) y ramo.
 * Se arrastra desde el nombre; el botón ⤢ abre su expediente.
 */
function CardEmbudo({
  lead,
  handleProps,
  dragging,
  onAbrir,
}: {
  lead: Lead;
  handleProps?: Record<string, unknown>;
  dragging?: boolean;
  onAbrir?: (id: string) => void;
}) {
  const conWhatsapp = lead.whatsapp.length === 10;
  const sinRamoGanado = lead.etapa === "ganado" && !lead.ramo;
  return (
    <div className={`group rounded-xl border p-3 ${dragging ? "border-brand-2 bg-bg-2 shadow-2xl" : "border-line bg-glass"}`}>
      <div className="flex items-start justify-between gap-2">
        <div {...handleProps} className="min-w-0 flex-1 cursor-grab touch-none active:cursor-grabbing">
          <p className="break-words text-sm font-semibold leading-snug text-ink">{lead.nombre}</p>
        </div>
        {onAbrir && (
          <button
            type="button"
            onClick={() => onAbrir(lead.id)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-mute transition-colors hover:bg-white/10 hover:text-ink"
            title="Ver expediente"
            aria-label={`Ver expediente de ${lead.nombre}`}
          >
            <Icon icon="flat-color-icons:expand" width={18} />
          </button>
        )}
      </div>
      <p className="mt-1.5 text-xs">
        {conWhatsapp ? (
          <a
            href={`https://wa.me/52${lead.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-ink-soft hover:text-ink hover:underline"
            title="Escribirle por WhatsApp"
          >
            <Icon icon="logos:whatsapp-icon" width={14} aria-hidden /> {formatoWhatsapp(lead.whatsapp)}
          </a>
        ) : (
          <span style={{ color: "var(--amber)" }}>{lead.whatsapp || "Sin WhatsApp"}</span>
        )}
      </p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        {lead.ramo ? (
          <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-ink-soft">
            <Icon icon={infoRamo(lead.ramo).icono} width={12} aria-hidden /> <span className="truncate">{infoRamo(lead.ramo).corto}</span>
          </span>
        ) : (
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px]" style={{ color: sinRamoGanado ? "var(--amber)" : "var(--ink-mute)" }}>
            {sinRamoGanado ? "⚠ Sin ramo" : "Sin ramo"}
          </span>
        )}
        <DiasSinContacto lead={lead} />
      </div>
    </div>
  );
}

/** Cuántos días lleva el prospecto sin movimiento (solo en etapas activas): verde al día, azul 1-2 días, ámbar 3 o más. */
function DiasSinContacto({ lead }: { lead: Lead }) {
  const [ahora] = useState(() => Date.now());
  if (lead.etapa === "ganado" || lead.etapa === "perdido") return null;
  const dias = Math.max(0, Math.floor((ahora - new Date(lead.actualizado_en).getTime()) / 86_400_000));
  const color = dias >= 3 ? "var(--amber)" : dias >= 1 ? "var(--sky)" : "var(--green)";
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
      title="Días sin movimiento"
    >
      {dias === 0 ? "Hoy" : `${dias} d`}
    </span>
  );
}
