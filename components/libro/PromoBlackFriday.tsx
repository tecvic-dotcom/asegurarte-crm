"use client";

import { useState, useSyncExternalStore } from "react";
import { CHECKOUT_URL } from "@/lib/libro";
import { ImagenAmpliable } from "./ImagenAmpliable";

/**
 * Black Friday 2026 del libro: 50% con el código ALGORITMO50 (cupón en Hotmart y en Whop).
 * Se enciende y se apaga sola en el navegador de cada visitante, sin volver a publicar:
 *   del jueves 26 nov 2026 00:00 al lunes 30 nov 2026 00:00, hora de Monterrey (UTC−6, sin horario de verano).
 * Para verla antes de la fecha: /libro?vistaPromo=1
 * Pasada la promoción se puede borrar este archivo y su línea en app/libro/page.tsx.
 */
const INICIO = Date.UTC(2026, 10, 26, 6, 0, 0); // 26 nov 00:00 en Monterrey
const FIN = Date.UTC(2026, 10, 30, 6, 0, 0); // 30 nov 00:00 en Monterrey = termina el domingo 29 a la medianoche
const CODIGO = "ALGORITMO50";

function promoActiva() {
  const ahora = Date.now();
  if (ahora >= INICIO && ahora < FIN) return true;
  try {
    return new URLSearchParams(window.location.search).get("vistaPromo") === "1";
  } catch {
    return false;
  }
}

// Si alguien deja la página abierta, se apaga (o se enciende) sola: se vuelve a revisar cada minuto
function suscribir(avisar: () => void) {
  const t = window.setInterval(avisar, 60_000);
  return () => window.clearInterval(t);
}

export function PromoBlackFriday() {
  // En el servidor (página estática) siempre «apagada»; en el navegador decide la hora del visitante
  const visible = useSyncExternalStore(suscribir, promoActiva, () => false);
  const [copiado, setCopiado] = useState(false);

  if (!visible || !CHECKOUT_URL) return null;

  // Hotmart aplica el cupón solo con ?offDiscount=; si no lo tomara, el comprador puede escribirlo en el checkout
  const liga = `${CHECKOUT_URL}${CHECKOUT_URL.includes("?") ? "&" : "?"}offDiscount=${CODIGO}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(CODIGO);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      /* sin portapapeles: el código queda visible para escribirlo */
    }
  };

  return (
    <section
      aria-label="Promoción Black Friday"
      className="glass mt-6 grid items-center gap-6 rounded-[26px] border border-[#ff7a12]/40 p-5 sm:p-7 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-10"
    >
      <ImagenAmpliable
        src="/img/libro/black-friday-2026.webp"
        srcGrande="/img/libro/black-friday-2026-grande.webp"
        width={720}
        height={900}
        prioridad
        alt="Black Friday del 26 al 29 de noviembre: libro «De la agenda al algoritmo» con 2 bonos al 50% de descuento con el código ALGORITMO50, antes USD $29.99, hoy USD $14.99"
        className="mx-auto w-full max-w-[20rem] rounded-2xl shadow-2xl sm:max-w-sm md:max-w-none"
      />
      <div>
        <p className="text-sm font-extrabold tracking-[0.18em] text-[#ffa23a] uppercase">Black Friday · del 26 al 29 de noviembre</p>
        <h2 className="mt-3 font-display text-[1.9rem] leading-[1.1] text-ink sm:text-[2.5rem]">
          El libro y sus 2 bonos al <span className="text-[#ff8a1e]">50% de descuento</span>
        </h2>
        <p className="mt-4 text-lg text-ink-soft">
          De <s className="text-ink-mute">USD $29.99</s> a <strong className="text-ink">USD $14.99</strong> más impuestos. Pago único, acceso inmediato y garantía de 7
          días.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-sm text-ink-mute">Tu código:</span>
          <code className="rounded-xl border-2 border-dashed border-[#ff7a12] bg-[#ff7a12]/10 px-4 py-2 font-display text-2xl tracking-wider text-[#ffa23a]">
            {CODIGO}
          </code>
          <button type="button" onClick={copiar} className="btn-ghost text-sm">
            {copiado ? "¡Copiado!" : "Copiar código"}
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href={liga}
            rel="noopener"
            className="btn-primary px-7 py-4 text-lg"
            onClick={() => {
              window.fbq?.("track", "InitiateCheckout");
              window.ttq?.track("InitiateCheckout");
            }}
          >
            Lo quiero con 50% de descuento
          </a>
        </div>
        <p className="mt-4 text-sm text-ink-mute">
          Si el descuento no aparece solo, escribe el código <strong className="text-ink-soft">{CODIGO}</strong> en el campo de cupón al pagar. Válido hasta el domingo 29 de
          noviembre a la medianoche (hora del centro de México).
        </p>
      </div>
    </section>
  );
}
