"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

interface CapturaWhatsappProps {
  nombre: string;
  ocupado?: boolean;
  /** Guarda el WhatsApp; devuelve el motivo si no se pudo. */
  onGuardar: (numero: string) => Promise<string | null>;
}

/** Un campo para escribir el WhatsApp de un cliente ahí mismo (los reportes de AXA no traen teléfonos). */
export function CapturaWhatsapp({ nombre, ocupado = false, onGuardar }: CapturaWhatsappProps) {
  const [wa, setWa] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  return (
    <form
      className="col-span-2 flex w-full flex-wrap items-center gap-2 sm:w-auto"
      data-testid="captura-whatsapp"
      onSubmit={async (e) => {
        e.preventDefault();
        setGuardando(true);
        setError(null);
        const motivo = await onGuardar(wa);
        if (motivo) setError(motivo);
        setGuardando(false);
      }}
    >
      <input
        inputMode="tel"
        value={wa}
        onChange={(e) => {
          setWa(e.target.value);
          setError(null);
        }}
        placeholder="WhatsApp: 81 1234 5678"
        aria-label={`WhatsApp de ${nombre}`}
        className="field-input"
        style={{ width: "auto", flex: "1 1 170px", minWidth: 0 }}
      />
      <button type="submit" disabled={guardando || ocupado} className="btn-primary px-4 py-2 text-sm">
        <Icon icon="logos:whatsapp-icon" width={18} aria-hidden /> {guardando ? "Guardando…" : "Guardar WhatsApp"}
      </button>
      {error && (
        <span className="w-full text-sm" style={{ color: "var(--red)" }} role="alert">
          {error}
        </span>
      )}
    </form>
  );
}
