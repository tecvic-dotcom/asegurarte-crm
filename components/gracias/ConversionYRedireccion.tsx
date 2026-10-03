"use client";

import { useEffect, useState } from "react";
import { dispararConversionLead } from "@/lib/pixels";

const SEGUNDOS_ESPERA = 4;

/** Dispara el evento de conversión y redirige a WhatsApp tras unos segundos. */
export function ConversionYRedireccion({ whatsapp }: { whatsapp: string }) {
  const [segundos, setSegundos] = useState(SEGUNDOS_ESPERA);

  useEffect(() => {
    dispararConversionLead();
  }, []);

  useEffect(() => {
    if (!whatsapp) return;
    if (segundos <= 0) {
      window.location.href = whatsapp;
      return;
    }
    const t = setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [segundos, whatsapp]);

  if (!whatsapp) return null;

  return (
    <p className="mt-3 text-xs text-ink-mute">Te llevamos a WhatsApp en {segundos}…</p>
  );
}
