"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { moneda } from "@/lib/crm-data";
import { infoRamo } from "@/lib/ramos";
import { hoyLocal, sumarDias } from "@/lib/fechas";
import {
  COLOR_ESTADO,
  FORMAS_PAGO,
  ICONO_ESTADO,
  etiquetaEstado,
  ligaWhatsApp,
  mensajeCobro,
  type PendienteCobro,
} from "@/lib/cobranza-reglas";

interface TarjetaCobroProps {
  pendiente: PendienteCobro;
  onWhatsApp: () => void;
  onPagada: () => void;
  onPromesa: (fecha: string) => void;
  onCancelada: () => void;
  onRecordada: () => void;
  onEditar: () => void;
  onCopiado: () => void;
}

const TITULO_MOTIVO = {
  vencida: null,
  promesa_vencida: null,
  promesa: null,
  por_vencer: null,
  renovacion: "Renueva pronto",
} as const;

/** Un cobro pendiente: quién, cuánto, por qué y el mensaje listo para mandar. */
export function TarjetaCobro({ pendiente, onWhatsApp, onPagada, onPromesa, onCancelada, onRecordada, onEditar, onCopiado }: TarjetaCobroProps) {
  const { poliza: p, estado, dias, motivo, recordadaHoy } = pendiente;
  const [promesaAbierta, setPromesaAbierta] = useState(false);
  const [mensajeCompleto, setMensajeCompleto] = useState(false);
  const [fechaPromesa, setFechaPromesa] = useState(() => sumarDias(hoyLocal(), 3));
  const texto = mensajeCobro(p, motivo);
  const liga = ligaWhatsApp(p, texto);
  const color = motivo === "renovacion" ? "var(--sky)" : COLOR_ESTADO[estado];
  const icono = motivo === "renovacion" ? "flat-color-icons:calendar" : ICONO_ESTADO[estado];
  const etiqueta = TITULO_MOTIVO[motivo] ?? etiquetaEstado(estado, dias, p);
  const forma = FORMAS_PAGO.find((f) => f.id === p.forma_pago)?.nombre ?? "";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      onCopiado();
    } catch {
      /* sin portapapeles: el mensaje sigue visible para copiarlo a mano */
    }
  }

  return (
    <li
      className={`glass rounded-2xl border p-4 ${recordadaHoy ? "opacity-70" : ""}`}
      style={{ borderColor: `color-mix(in srgb, ${color} 45%, transparent)` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide" style={{ color }}>
          <Icon icon={icono} width={15} aria-hidden /> {etiqueta}
        </span>
        <span className="text-lg font-bold text-ink">{p.monto_pago > 0 ? moneda(p.monto_pago) : "Monto sin capturar"}</span>
      </div>

      <p className="mt-1.5 text-[16px] font-semibold text-ink">{p.asegurado}</p>
      <p className="text-xs text-ink-mute">
        {[p.ramo ? infoRamo(p.ramo).corto : null, p.numero || null, forma, p.aseguradora || null].filter(Boolean).join(" · ")}
      </p>

      {recordadaHoy && (
        <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--green)" }}>
          <Icon icon="flat-color-icons:ok" width={14} aria-hidden /> Ya le recordaste hoy
        </p>
      )}

      {/* El mensaje tal como se enviará: tócalo para leerlo completo */}
      <button
        type="button"
        onClick={() => setMensajeCompleto((v) => !v)}
        aria-expanded={mensajeCompleto}
        className="mt-2 block w-full rounded-xl border border-line bg-bg-2/60 p-3 text-left text-sm leading-relaxed text-ink-soft"
      >
        <span className={mensajeCompleto ? "block" : "line-clamp-3"}>“{texto}”</span>
        {!mensajeCompleto && <span className="mt-1 block text-xs text-ink-mute underline">Ver mensaje completo</span>}
      </button>

      {/* Celular: WhatsApp a lo ancho y abajo Pagó / Promesa. Compu: todo en una fila. */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {liga ? (
          <a
            href={liga}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onWhatsApp}
            className="btn-primary col-span-2 w-full text-sm sm:w-auto"
          >
            <Icon icon="logos:whatsapp-icon" width={18} aria-hidden /> Enviar WhatsApp
          </a>
        ) : (
          <button type="button" onClick={onEditar} className="btn-ghost col-span-2 w-full text-sm sm:w-auto">
            <Icon icon="logos:whatsapp-icon" width={18} aria-hidden /> Agregar WhatsApp
          </button>
        )}
        {motivo !== "renovacion" && (
          <>
            <button type="button" onClick={onPagada} className="btn-ghost w-full text-sm sm:w-auto">
              <Icon icon="flat-color-icons:ok" width={18} aria-hidden /> Pagó
            </button>
            <button
              type="button"
              onClick={() => setPromesaAbierta((v) => !v)}
              className="btn-ghost w-full text-sm sm:w-auto"
              aria-expanded={promesaAbierta}
            >
              <Icon icon="flat-color-icons:clock" width={18} aria-hidden /> Promesa
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`¿Marcar la póliza de ${p.asegurado} como cancelada? Valeri dejará de cobrarla (puedes reactivarla desde "Editar póliza").`)) onCancelada();
              }}
              className="btn-ghost col-span-2 w-full text-sm sm:col-span-1 sm:w-auto"
            >
              <Icon icon="flat-color-icons:cancel" width={18} aria-hidden /> Cancelada
            </button>
          </>
        )}
      </div>

      {promesaAbierta && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-line p-3">
          <div>
            <label className="field-label" htmlFor={`promesa-${p.id}`}>¿Qué día prometió pagar?</label>
            <input
              id={`promesa-${p.id}`}
              type="date"
              min={hoyLocal()}
              value={fechaPromesa}
              onChange={(e) => setFechaPromesa(e.target.value)}
              className="field-input [color-scheme:dark]"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              onPromesa(fechaPromesa);
              setPromesaAbierta(false);
            }}
            className="btn-primary px-4 py-3 text-sm"
          >
            Guardar promesa
          </button>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <button type="button" onClick={copiar} className="min-h-[36px] text-ink-mute underline hover:text-ink">
          Copiar mensaje
        </button>
        {!recordadaHoy && (
          <button type="button" onClick={onRecordada} className="min-h-[36px] text-ink-mute underline hover:text-ink">
            Ya le recordé
          </button>
        )}
        <button type="button" onClick={onEditar} className="min-h-[36px] text-ink-mute underline hover:text-ink">
          Editar póliza
        </button>
      </div>
    </li>
  );
}
