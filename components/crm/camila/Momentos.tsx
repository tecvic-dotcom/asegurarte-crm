"use client";

import { Icon } from "@iconify/react";
import { ligaWhatsAppCliente, type ClaveMensaje } from "@/lib/cruzada-reglas";
import { mensajeMomento, type Momento, type TipoMomento } from "@/lib/cruzada-momentos";
import type { Cliente } from "@/lib/types";
import { CapturaWhatsapp } from "./CapturaWhatsapp";

const TIPOS: Record<TipoMomento, { emoji: string; etiqueta: string; color: string; ayuda: string }> = {
  cumple: { emoji: "🎂", etiqueta: "Cumpleaños", color: "var(--violet)", ayuda: "Una felicitación; no se vende nada." },
  revision: { emoji: "🔎", etiqueta: "Revisión de coberturas", color: "var(--sky)", ayuda: "Se acerca su renovación: ya van a hablar." },
  pago: { emoji: "🙌", etiqueta: "Agradecer su pago", color: "var(--green)", ayuda: "Acaba de pagar: un detalle que se agradece." },
  referidos: { emoji: "🤝", etiqueta: "Pedir referidos", color: "var(--amber)", ayuda: "Buen momento para pedirle que te recomiende." },
};

interface MomentosProps {
  momentos: Momento[];
  clientes: Map<string, Cliente>;
  mensajes: Partial<Record<ClaveMensaje, string>>;
  ocupados: string[];
  onAbrir: (clienteId: string) => void;
  /** Lo atendiste (mandaste el mensaje o lo diste por hecho): el momento deja de aparecer. */
  onHecho: (m: Momento) => void;
  onCopiar: (texto: string) => void;
  onWhatsapp: (clienteId: string, numero: string) => Promise<string | null>;
}

/** Las ocasiones en que escribirle a un cliente cae bien: cumpleaños, antes de renovar, un pago reciente. Ninguna es una venta. */
export function Momentos({ momentos, clientes, mensajes, ocupados, onAbrir, onHecho, onCopiar, onWhatsapp }: MomentosProps) {
  if (!momentos.length) {
    return (
      <p className="rounded-2xl border border-line p-5 text-sm" style={{ color: "var(--green)" }} data-testid="momentos-vacio">
        Hoy no hay momentos de confianza pendientes. Aquí aparecen los cumpleaños de la semana, las pólizas que renuevan en 30 a 60 días y los pagos recientes.
      </p>
    );
  }
  return (
    <section className="space-y-3" data-testid="momentos">
      <p className="text-sm text-ink-soft">
        Son ocasiones en que escribirle cae bien, no ventas: felicitar, revisar sus coberturas antes de renovar, agradecer un pago y pedir referidos. Cada uno desaparece cuando lo
        atiendes.
      </p>
      <ul className="space-y-3">
        {momentos.map((m) => {
          const cliente = clientes.get(m.cliente_id);
          if (!cliente) return null;
          const t = TIPOS[m.tipo];
          const texto = mensajeMomento(m, mensajes);
          const liga = ligaWhatsAppCliente(cliente.whatsapp, texto);
          const ocupado = ocupados.includes(`${m.cliente_id}|${m.clave}`);
          return (
            <li key={`${m.cliente_id}|${m.clave}`} data-testid="momento" data-tipo={m.tipo} data-cliente={m.cliente_id} className="glass rounded-2xl border p-4" style={{ borderColor: `color-mix(in srgb, ${t.color} 40%, transparent)` }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide" style={{ color: t.color }}>
                  <span aria-hidden>{t.emoji}</span> {t.etiqueta}
                </span>
                <span className="text-xs text-ink-mute">{t.ayuda}</span>
              </div>
              <button type="button" onClick={() => onAbrir(m.cliente_id)} className="mt-1.5 block text-left">
                <span className="block text-[16px] font-semibold text-ink hover:underline">{cliente.nombre}</span>
                <span className="block text-sm text-ink-soft">{m.titulo}</span>
                <span className="block text-xs text-ink-mute">{m.detalle}</span>
              </button>
              <p className="mt-2 rounded-xl border border-line bg-bg-2/60 p-3 text-sm leading-relaxed text-ink-soft">“{texto}”</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {liga ? (
                  <a
                    href={liga}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => !ocupado && onHecho(m)}
                    className="btn-primary col-span-2 w-full text-sm sm:w-auto"
                  >
                    <Icon icon="logos:whatsapp-icon" width={18} aria-hidden /> Enviar WhatsApp
                  </a>
                ) : (
                  <CapturaWhatsapp nombre={cliente.nombre} ocupado={ocupado} onGuardar={(n) => onWhatsapp(m.cliente_id, n)} />
                )}
                <button type="button" disabled={ocupado} onClick={() => onHecho(m)} className="btn-ghost w-full text-sm sm:w-auto">
                  <Icon icon="flat-color-icons:ok" width={18} aria-hidden /> Ya lo hice
                </button>
                <button type="button" onClick={() => onCopiar(texto)} className="btn-ghost w-full text-sm sm:w-auto">
                  Copiar mensaje
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
