"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { armarMensajeWhatsApp, estaVencida, resumenCotizacion, type Cotizacion } from "@/lib/cotizaciones-reglas";
import { fechaLarga, hoyLocal } from "@/lib/fechas";
import type { Lead } from "@/lib/types";

export interface OpcionesEnvio {
  /** Pasar al prospecto a "Propuesta enviada". */
  moverEtapa: boolean;
  /** Agendar un pendiente para dentro de tantos días; null si no quiere recordatorio. */
  dias: number | null;
}

interface PanelEnvioProps {
  lead: Lead;
  cotizaciones: Cotizacion[];
  firma: string;
  /** Ya se abrió WhatsApp: aquí se anota todo lo demás. No debe lanzar error. */
  onEnviar: (opciones: OpcionesEnvio) => Promise<void>;
  onCerrar: () => void;
}

const DIAS_SEGUIMIENTO = [1, 2, 3, 5, 7];
/** Etapas en las que tiene sentido pasar a "Propuesta enviada" (no se retrocede a un cliente ganado). */
const ETAPAS_PREVIAS = ["nuevo", "contactado", "cita"];

/** El mensaje de WhatsApp listo para revisar, editar y mandar. */
export function PanelEnvio({ lead, cotizaciones, firma, onEnviar, onCerrar }: PanelEnvioProps) {
  const hoy = hoyLocal();
  // Una cotización vencida no se manda sin avisar: el precio puede haber cambiado.
  const vencidas = cotizaciones.filter((c) => estaVencida(c, hoy));
  const [texto, setTexto] = useState(() => armarMensajeWhatsApp({ nombre: lead.nombre, firma, cotizaciones, hoy }));
  const puedeMover = ETAPAS_PREVIAS.includes(lead.etapa);
  const [mover, setMover] = useState(puedeMover);
  const [recordar, setRecordar] = useState(true);
  const [dias, setDias] = useState(2);
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState<"si" | "no" | null>(null);

  const whatsapp = lead.whatsapp.replace(/\D+/g, "");
  const valido = whatsapp.length === 10;

  // Siempre se llama al "cerrar" más reciente, sin tener que volver a escuchar el teclado en cada cambio.
  const cerrar = useRef(onCerrar);
  useEffect(() => {
    cerrar.current = onCerrar;
  });

  // Escape cierra, y la pantalla de atrás no se desliza mientras esto está abierto.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && cerrar.current();
    window.addEventListener("keydown", alTeclear);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = "";
    };
  }, []);

  async function abrirWhatsApp() {
    if (!valido || enviando || !texto.trim()) return;
    // Primero se abre (el navegador solo lo permite justo al hacer clic); lo demás se anota después.
    window.open(`https://wa.me/52${whatsapp}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
    setEnviando(true);
    await onEnviar({ moverEtapa: puedeMover && mover, dias: recordar ? dias : null });
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado("si");
    } catch {
      setCopiado("no");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Mensaje de WhatsApp">
      <button type="button" className="absolute inset-0 bg-black/60" aria-label="Cerrar" onClick={onCerrar} />
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-3xl border border-line bg-bg-2 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            <p className="flex items-center gap-2 font-display text-xl text-ink">
              <Icon icon="logos:whatsapp-icon" width={24} aria-hidden /> Mensaje para {lead.nombre.split(" ")[0]}
            </p>
            <p className="mt-0.5 text-sm text-ink-soft">
              {cotizaciones.length === 1 ? "1 cotización" : `${cotizaciones.length} cotizaciones`} · revísalo y cámbialo si quieres antes de mandarlo.
            </p>
          </div>
          <button type="button" onClick={onCerrar} className="-mr-1 rounded-lg px-2 py-1 text-xl leading-none text-ink-mute hover:text-ink" aria-label="Cerrar">
            ×
          </button>
        </div>

        {/* Lo que se desliza: el mensaje y las opciones. Los botones de abajo siempre quedan a la vista. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          {vencidas.length > 0 && (
            <div
              role="alert"
              className="mt-3 rounded-xl border px-3.5 py-3 text-sm"
              style={{ borderColor: "color-mix(in srgb, var(--amber) 50%, transparent)", background: "color-mix(in srgb, var(--amber) 8%, transparent)" }}
            >
              <p className="flex items-center gap-1.5 font-semibold text-ink">
                <Icon icon="flat-color-icons:high-priority" width={18} aria-hidden />
                {vencidas.length === 1 ? "Esta cotización ya venció" : "Estas cotizaciones ya vencieron"}
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-soft">
                {vencidas.map((c) => (
                  <li key={c.id}>
                    {resumenCotizacion(c)}: era válida hasta el {fechaLarga(c.vigencia_hasta ?? hoy)}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-ink-soft">El precio puede haber cambiado. Vuelve a cotizar en el portal antes de mandarla; en el mensaje no puse su fecha de vigencia.</p>
            </div>
          )}
          <label htmlFor="cot-mensaje" className="sr-only">
            Mensaje de WhatsApp
          </label>
          <textarea
            id="cot-mensaje"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setCopiado(null);
            }}
            rows={14}
            className="field-input mt-3 resize-y text-sm leading-relaxed"
          />

          <div className="mt-3 space-y-2.5 rounded-2xl border border-line bg-glass p-3 text-sm text-ink-soft">
            {puedeMover && (
              <label className="flex cursor-pointer items-center gap-2.5">
                <input type="checkbox" checked={mover} onChange={(e) => setMover(e.target.checked)} className="h-4 w-4 accent-[var(--brand-2)]" />
                Pasarlo a «Propuesta enviada» en tu embudo
              </label>
            )}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} className="h-4 w-4 accent-[var(--brand-2)]" />
                Recordarme darle seguimiento en
              </label>
              <select
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
                disabled={!recordar}
                aria-label="Días para el seguimiento"
                className="field-input w-auto py-1.5 text-sm"
              >
                {DIAS_SEGUIMIENTO.map((d) => (
                  <option key={d} value={d}>
                    {d === 1 ? "1 día (mañana)" : `${d} días`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!valido && (
            <p className="mt-3 text-sm" style={{ color: "var(--red)" }} role="alert">
              Este prospecto no tiene un WhatsApp de 10 dígitos. Corrígelo en su expediente para poder mandarle el mensaje.
            </p>
          )}
          <p className="mt-3 text-xs text-ink-mute">
            WhatsApp no permite adjuntar archivos desde un enlace: cuando se abra el chat, adjunta ahí el PDF de la cotización.
          </p>
        </div>

        <div className="border-t border-line px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void abrirWhatsApp()} disabled={!valido || enviando || !texto.trim()} className="btn-primary px-4 py-2.5 text-sm">
              <Icon icon="logos:whatsapp-icon" width={18} aria-hidden /> {enviando ? "Abriendo…" : "Abrir WhatsApp y enviar"}
            </button>
            <button type="button" onClick={() => void copiar()} disabled={enviando} className="btn-ghost px-4 py-2.5 text-sm">
              <Icon icon="flat-color-icons:file" width={18} aria-hidden /> Copiar mensaje
            </button>
          </div>
          {copiado && (
            <p className="mt-2 text-sm text-ink-soft" role="status">
              {copiado === "si" ? "Mensaje copiado." : "No pude copiarlo solo: selecciona el texto y cópialo a mano."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
