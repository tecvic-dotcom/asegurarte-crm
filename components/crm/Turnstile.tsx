"use client";

import { useEffect, useRef } from "react";

/**
 * Captcha del login (Cloudflare Turnstile): casi siempre se resuelve solo y sin molestar; si Cloudflare
 * duda de ti, te muestra una casilla para marcar. El token que entrega se manda al servidor, que lo revisa.
 */

interface ApiTurnstile {
  render: (caja: HTMLElement, opciones: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: ApiTurnstile;
  }
}

/** Llave PÚBLICA del captcha. Vacía = captcha apagado (el servidor tampoco lo exige). */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let cargando: Promise<void> | null = null;

function cargarScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!cargando) {
    cargando = new Promise<void>((ok, mal) => {
      const s = document.createElement("script");
      s.src = SRC;
      s.async = true;
      s.onload = () => ok();
      s.onerror = () => {
        cargando = null; // permite reintentar al recargar la pantalla
        mal(new Error("No cargó el captcha"));
      };
      document.head.appendChild(s);
    });
  }
  return cargando;
}

interface TurnstileProps {
  /** Token listo (o "" cuando venció o falló). */
  onToken: (token: string) => void;
  /** No se pudo cargar el captcha (sin internet, bloqueador de anuncios…). */
  onFallo: () => void;
  /** Súbelo en 1 para pedir un captcha nuevo (los tokens sirven una sola vez). */
  reinicio: number;
}

export function Turnstile({ onToken, onFallo, reinicio }: TurnstileProps) {
  const caja = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  // Siempre los callbacks más recientes, sin volver a dibujar el captcha cada vez que cambian.
  const cb = useRef({ onToken, onFallo });
  useEffect(() => {
    cb.current = { onToken, onFallo };
  });

  useEffect(() => {
    let vivo = true;
    cargarScript().then(
      () => {
        if (!vivo || !caja.current || !window.turnstile) return;
        widget.current = window.turnstile.render(caja.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          language: "es",
          // «interaction-only»: no se ve nada a menos que Cloudflare necesite que marques una casilla.
          appearance: "interaction-only",
          callback: (t: string) => cb.current.onToken(t),
          "expired-callback": () => cb.current.onToken(""),
          "timeout-callback": () => cb.current.onToken(""),
          "error-callback": () => {
            cb.current.onToken("");
            cb.current.onFallo();
          },
        });
      },
      () => {
        if (vivo) cb.current.onFallo();
      },
    );
    return () => {
      vivo = false;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, []);

  useEffect(() => {
    if (reinicio > 0 && widget.current && window.turnstile) {
      cb.current.onToken("");
      window.turnstile.reset(widget.current);
    }
  }, [reinicio]);

  return <div ref={caja} className="flex justify-center" data-testid="turnstile" />;
}
