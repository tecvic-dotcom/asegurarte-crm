"use client";

/**
 * "← Volver" del aviso de privacidad: regresa a la página del sitio desde donde llegaste
 * (tarjeta /roberto, guías, calculadora o landing). Si entraste directo al aviso, va a la
 * tarjeta de Roberto. Es un <a> normal porque /roberto es un archivo estático (rewrite).
 */
export default function VolverAtras({ className }: { className?: string }) {
  return (
    <a
      href="/roberto"
      className={className}
      onClick={(e) => {
        try {
          const vieneDelSitio = !!document.referrer && new URL(document.referrer).origin === window.location.origin;
          if (vieneDelSitio && window.history.length > 1) {
            e.preventDefault();
            window.history.back();
          }
        } catch {
          // Sin referrer legible: se queda el enlace a /roberto.
        }
      }}
    >
      ← Volver
    </a>
  );
}
