"use client";

import { CHECKOUT_URL, PRECIO } from "@/lib/libro";

/**
 * Botón de compra del libro. Con la venta cerrada es un letrero «Muy pronto a la venta» que no lleva a ningún lado.
 * Con la venta abierta lleva al checkout de Hotmart y avisa a los píxeles (si el visitante aceptó cookies) que se
 * INICIÓ un pago. No es una compra: esa solo la confirma Hotmart.
 */
export function BotonComprar({ grande = false, ancho = false, corto = false, className = "" }: { grande?: boolean; ancho?: boolean; corto?: boolean; className?: string }) {
  const clase = `btn-primary ${grande ? "px-7 py-4 text-lg" : ""} ${ancho ? "w-full" : ""} ${className}`;
  if (!CHECKOUT_URL) {
    return (
      <span className={`${clase} cursor-not-allowed opacity-60`} aria-disabled="true">
        Muy pronto a la venta
      </span>
    );
  }
  return (
    <a
      href={CHECKOUT_URL}
      className={clase}
      rel="noopener"
      onClick={() => {
        window.fbq?.("track", "InitiateCheckout");
        window.ttq?.track("InitiateCheckout");
      }}
    >
      {corto ? "Quiero mi libro" : `Quiero mi libro · ${PRECIO}`}
    </a>
  );
}
