"use client";

import { useEffect, useState } from "react";
import { PRECIO, PRECIO_NOTA, VENTA_ABIERTA } from "@/lib/libro";
import { BotonComprar } from "./BotonComprar";

/**
 * Barra de compra fija abajo, SOLO en celular y SOLO con la venta abierta.
 * Aparece cuando ya pasó la portada y se esconde cuando se ve la oferta final (para no tener dos botones a la vez).
 */
export function StickyBuyButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!VENTA_ABIERTA) return;
    const portada = document.getElementById("portada");
    const oferta = document.getElementById("comprar");
    if (!portada || !oferta || !("IntersectionObserver" in window)) return;
    const vistos = new Map<Element, boolean>();
    const obs = new IntersectionObserver((entradas) => {
      for (const e of entradas) vistos.set(e.target, e.isIntersecting);
      setVisible(!vistos.get(portada) && !vistos.get(oferta));
    });
    obs.observe(portada);
    obs.observe(oferta);
    return () => obs.disconnect();
  }, []);

  if (!VENTA_ABIERTA) return null;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl transition-transform duration-300 md:hidden ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-3">
        <p className="flex-none leading-tight">
          <span className="block font-display text-lg text-ink">{PRECIO}</span>
          <span className="block text-xs text-ink-mute">{PRECIO_NOTA}</span>
        </p>
        <BotonComprar ancho corto className="flex-1 px-3! py-3! text-base" />
      </div>
    </div>
  );
}
