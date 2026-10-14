"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { fechaNumerica, hoyLocal, sumarMeses } from "@/lib/fechas";
import { infoRamo } from "@/lib/ramos";
import { ligaWhatsAppCliente, mensajeCruzada, type ClaveMensaje, type Oportunidad } from "@/lib/cruzada-reglas";
import type { Cliente, EstadoOferta } from "@/lib/types";
import { CapturaWhatsapp } from "./CapturaWhatsapp";

const PRIORIDAD = {
  alta: { texto: "Prioridad alta", color: "var(--green)" },
  media: { texto: "Prioridad media", color: "var(--amber)" },
  baja: { texto: "Prioridad normal", color: "var(--ink-mute)" },
} as const;

interface TarjetaOportunidadProps {
  o: Oportunidad;
  cliente: Cliente;
  /** Tus mensajes personalizados (vacío = el texto base de cada situación). */
  mensajes: Partial<Record<ClaveMensaje, string>>;
  ocupado: boolean;
  onAbrir: () => void;
  /** Abrió el WhatsApp: se anota que ya se le ofreció. */
  onEnviado: () => void;
  onEstado: (estado: EstadoOferta, volverAOfrecer?: string | null) => void;
  onCotizar: () => void;
  onCopiar: (texto: string) => void;
  /** Guarda el WhatsApp del cliente desde su tarjeta; devuelve el motivo si no se pudo. */
  onWhatsapp: (numero: string) => Promise<string | null>;
}

/** Una oportunidad de venta cruzada: a quién, qué seguro, por qué, y el WhatsApp listo para mandar. */
export function TarjetaOportunidad({ o, cliente, mensajes, ocupado, onAbrir, onEnviado, onEstado, onCotizar, onCopiar, onWhatsapp }: TarjetaOportunidadProps) {
  const [completo, setCompleto] = useState(false);
  const [descartando, setDescartando] = useState(false);
  const texto = mensajeCruzada(o, mensajes);
  const liga = ligaWhatsAppCliente(cliente.whatsapp, texto);
  const ramo = infoRamo(o.ramo);
  const p = PRIORIDAD[o.prioridad];
  const hoy = hoyLocal();

  const situacion =
    o.situacion === "esperando"
      ? `Se lo ofreciste ${o.diasDesdeOferta === 0 ? "hoy" : `hace ${o.diasDesdeOferta} ${o.diasDesdeOferta === 1 ? "día" : "días"}`}: espera su respuesta`
      : o.situacion === "seguimiento"
        ? `Se lo ofreciste hace ${o.diasDesdeOferta} días y no ha contestado`
        : o.situacion === "cotizada"
          ? "Ya le cotizaste: dale seguimiento"
          : o.situacion === "pausa"
            ? `Se le ofreció otro seguro hace poco: Camila espera hasta el ${o.pausaHasta ? fechaNumerica(o.pausaHasta) : "próximo mes"} para no escribirle dos veces seguidas`
            : null;
  const atenuada = o.situacion === "esperando" || o.situacion === "pausa";
  const aSuFamiliar = o.tipo === "familiar" && o.familiar;

  return (
    <li
      data-testid="oportunidad"
      data-cliente={cliente.id}
      data-ramo={o.ramo}
      data-situacion={o.situacion}
      className={`glass rounded-2xl border p-4 ${atenuada ? "opacity-80" : ""}`}
      style={{ borderColor: `color-mix(in srgb, ${p.color} 40%, transparent)` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide" style={{ color: p.color }}>
          <Icon icon={ramo.icono} width={16} aria-hidden />
          {o.tipo === "reactivar" ? `Reactivar ${ramo.corto}` : aSuFamiliar ? `Familia · ${ramo.corto}` : `Ofrecer ${ramo.corto}`}
        </span>
        <span className="text-xs font-semibold" style={{ color: p.color }}>
          {p.texto}
        </span>
      </div>

      <button type="button" onClick={onAbrir} className="mt-1.5 block text-left">
        <span className="block text-[16px] font-semibold text-ink hover:underline">{cliente.nombre}</span>
        <span className="block text-xs text-ink-mute">
          {aSuFamiliar ? `Para su ${o.familiar!.parentesco} ${o.familiar!.nombre} · ` : ""}
          {o.tiene.length ? `Ya tiene: ${o.tiene.map((r) => infoRamo(r).corto).join(", ")}` : "Sin seguros vigentes registrados"}
        </span>
      </button>

      {situacion && (
        <p className="mt-1.5 text-xs font-semibold" style={{ color: "var(--amber)" }}>
          {situacion}
        </p>
      )}

      {o.razones.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-ink-soft">
          {o.razones.slice(0, 3).map((r) => (
            <li key={r} className="flex gap-1.5">
              <Icon icon="flat-color-icons:idea" width={16} className="mt-0.5 shrink-0" aria-hidden />
              <span>{r}</span>
            </li>
          ))}
        </ul>
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

      {descartando ? (
        <div className="mt-3 rounded-xl border border-line p-3" role="group" aria-label="¿Cuándo volver a ofrecerle?">
          <p className="text-sm text-ink-soft">¿Cuándo quieres que Camila vuelva a sugerírtelo?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { n: 3, t: "En 3 meses" },
              { n: 6, t: "En 6 meses" },
              { n: 12, t: "En 1 año" },
            ].map((x) => (
              <button
                key={x.n}
                type="button"
                disabled={ocupado}
                onClick={() => {
                  setDescartando(false);
                  onEstado("no_interesa", sumarMeses(hoy, x.n));
                }}
                className="btn-ghost px-3 py-2 text-sm"
              >
                {x.t}
              </button>
            ))}
            <button type="button" onClick={() => setDescartando(false)} className="px-3 py-2 text-sm text-ink-mute underline">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {o.situacion === "cotizada" ? (
            <button type="button" disabled={ocupado} onClick={onCotizar} className="btn-primary col-span-2 w-full text-sm sm:w-auto">
              <Icon icon="flat-color-icons:calculator" width={18} aria-hidden /> Abrir cotización
            </button>
          ) : liga ? (
            <a
              href={liga}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => o.situacion !== "esperando" && o.situacion !== "pausa" && onEnviado()}
              className={`${o.situacion === "esperando" || o.situacion === "pausa" ? "btn-ghost" : "btn-primary"} col-span-2 w-full text-sm sm:w-auto`}
            >
              <Icon icon="logos:whatsapp-icon" width={18} aria-hidden /> {o.situacion === "seguimiento" ? "Dar seguimiento" : o.situacion === "esperando" ? "Escribirle de nuevo" : o.situacion === "pausa" ? "Escribirle de todos modos" : "Enviar WhatsApp"}
            </a>
          ) : (
            <CapturaWhatsapp nombre={cliente.nombre} ocupado={ocupado} onGuardar={onWhatsapp} />
          )}
          {o.situacion !== "cotizada" && (
            <button type="button" disabled={ocupado} onClick={onCotizar} className="btn-ghost w-full text-sm sm:w-auto">
              <Icon icon="flat-color-icons:calculator" width={18} aria-hidden /> Cotizar
            </button>
          )}
          {(o.situacion === "para_hoy" || o.situacion === "seguimiento") && !liga && (
            <button type="button" disabled={ocupado} onClick={() => onEstado("ofrecida")} className="btn-ghost w-full text-sm sm:w-auto">
              <Icon icon="flat-color-icons:ok" width={18} aria-hidden /> Ya se lo ofrecí
            </button>
          )}
          {o.situacion !== "para_hoy" && o.situacion !== "pausa" && (
            <button type="button" disabled={ocupado} onClick={() => onEstado("cerrada")} className="btn-ghost w-full text-sm sm:w-auto">
              <Icon icon="flat-color-icons:approval" width={18} aria-hidden /> Lo contrató
            </button>
          )}
          <button type="button" disabled={ocupado} onClick={() => setDescartando(true)} className="btn-ghost w-full text-sm sm:w-auto">
            <Icon icon="flat-color-icons:cancel" width={18} aria-hidden /> No le interesa
          </button>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <button type="button" onClick={() => onCopiar(texto)} className="min-h-[36px] text-ink-mute underline hover:text-ink">
          Copiar mensaje
        </button>
        <button type="button" onClick={onAbrir} className="min-h-[36px] text-ink-mute underline hover:text-ink">
          Abrir expediente
        </button>
        {o.situacion !== "para_hoy" && o.situacion !== "pausa" && (
          <button type="button" disabled={ocupado} onClick={() => onEstado("pendiente")} className="min-h-[36px] text-ink-mute underline hover:text-ink">
            Deshacer (volver a «por ofrecer»)
          </button>
        )}
      </div>
    </li>
  );
}
