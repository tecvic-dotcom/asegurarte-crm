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
import { ETAPAS_ACTIVAS, moneda } from "@/lib/crm-data";
import { infoRamo } from "@/lib/ramos";
import type { Lead, EtapaId } from "@/lib/types";

/**
 * Kanban arrastrable (portado del CRM del Lunes Sinergético, re-skineado a la
 * marca LEGENDAR·IA: azul #2a22f5, Iconify, sin dorado). El estado vive en el
 * componente padre (CRMApp); aquí solo movemos y avisamos.
 */
interface PipelineProps {
  leads: Lead[];
  onMover: (id: string, etapa: EtapaId) => void;
  onAbrir: (id: string) => void;
}

export function Pipeline({ leads, onMover, onAbrir }: PipelineProps) {
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
    if (overId === "zona-ganado") {
      onMover(lead.id, "ganado");
      setCelebrar(lead.nombre);
      setTimeout(() => setCelebrar(null), 2600);
    } else if (overId === "zona-perdido") {
      onMover(lead.id, "perdido");
    } else if (ETAPAS_ACTIVAS.some((et) => et.id === overId) && lead.etapa !== overId) {
      onMover(lead.id, overId as EtapaId);
    }
  }

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
          {ETAPAS_ACTIVAS.map((et) => {
            const items = leads.filter((l) => l.etapa === et.id);
            const total = items.reduce((s, l) => s + l.valor, 0);
            return (
              <Columna key={et.id} id={et.id} nombre={et.nombre} color={et.color} count={items.length} total={total}>
                {items.map((l) => (
                  <CardArrastrable key={l.id} lead={l} onAbrir={onAbrir} />
                ))}
              </Columna>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ZonaSalida id="zona-ganado" tono="ganado" label="Suelta aquí para marcar GANADO 🎉" />
          <ZonaSalida id="zona-perdido" tono="perdido" label="Suelta aquí para marcar Perdido" />
        </div>

        <DragOverlay>{activo ? <CardVisual lead={activo} dragging /> : null}</DragOverlay>
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
  children,
}: {
  id: string;
  nombre: string;
  color: string;
  count: number;
  total: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="flex w-[260px] shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
          <span className="text-sm font-semibold text-ink">{nombre}</span>
          <span className="text-xs text-ink-mute">{count}</span>
        </div>
        <span className="text-[11px] text-ink-mute">{moneda(total)}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-2xl border p-2 transition-colors ${
          isOver ? "border-brand-2 bg-brand/10" : "border-line bg-bg-2/30"
        }`}
        style={{ minHeight: 140 }}
      >
        {children}
        {count === 0 && <p className="px-2 py-6 text-center text-xs text-ink-mute">Arrastra prospectos aquí</p>}
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

function CardArrastrable({ lead, onAbrir }: { lead: Lead; onAbrir: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div ref={setNodeRef} className={isDragging ? "opacity-40" : ""}>
      <CardVisual lead={lead} handleProps={{ ...attributes, ...listeners }} onAbrir={onAbrir} />
    </div>
  );
}

function CardVisual({
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
        {lead.utm_source && (
          <span className="shrink-0 text-[10px] text-ink-mute">via {lead.utm_source}</span>
        )}
      </div>
    </div>
  );
}
