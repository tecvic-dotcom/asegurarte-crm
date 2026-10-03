"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { leerConsentimiento, guardarConsentimiento } from "@/lib/consent";

/** Banner de cookies (GDPR / LFPDPPP). Bloquea píxeles hasta que decidas. */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const comprobar = () => setVisible(leerConsentimiento() === "pendiente");
    comprobar();
  }, []);

  function decidir(v: "aceptado" | "rechazado") {
    guardarConsentimiento(v);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6" role="dialog" aria-label="Aviso de cookies">
      <div className="glass-strong mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center">
        <Icon icon="flat-color-icons:privacy" width={32} className="shrink-0" />
        <p className="flex-1 text-sm text-ink-soft">
          Usamos cookies para mejorar tu experiencia y medir nuestras campañas. Lee más en nuestro{" "}
          <a href="/privacidad" className="text-brand-2 underline">
            aviso de privacidad
          </a>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => decidir("rechazado")} className="btn-ghost px-3 py-2 text-sm">
            Rechazar
          </button>
          <button onClick={() => decidir("aceptado")} className="btn-primary px-4 py-2 text-sm">
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
