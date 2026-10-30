"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { ASEGURADORAS_COBRANZA } from "@/lib/cobranza-autos";
import type { CobranzaAseguradora, Lead } from "@/lib/types";
import { AvatarEmpleado } from "./AvatarEmpleado";

const QUE_PASA: Record<CobranzaAseguradora, string> = {
  axa: "Abre su ficha para dar de alta la póliza en tu cobranza de Valeri.",
  chubb: "Te lleva a Dana. Su póliza se captura en tu Excel de Chubb y Dana la reconoce por nombre cuando lo subas.",
};

interface DondeRegistrarPolizaProps {
  lead: Lead;
  /** La opción que se está guardando (mientras tanto los botones esperan). */
  guardando: CobranzaAseguradora | null;
  /** Por qué no se pudo guardar (por ejemplo, falta correr el SQL). */
  error: string | null;
  onElegir: (aseguradora: CobranzaAseguradora) => void;
  /** Cerrar sin elegir: se puede decidir después desde su ficha. */
  onDespues: () => void;
}

/**
 * Se abre al marcar GANADO a un cliente de Autos: tus autos se cobran en dos lugares, AXA con Valeri y Chubb con Dana,
 * y aquí decides dónde registrar su póliza.
 */
export function DondeRegistrarPoliza({ lead, guardando, error, onElegir, onDespues }: DondeRegistrarPolizaProps) {
  const primero = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primero.current?.focus();
  }, []);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onDespues();
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onDespues]);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="donde-registrar-titulo" data-testid="donde-registrar">
      <button type="button" className="absolute inset-0 bg-black/60" aria-label="Decidirlo después" onClick={onDespues} tabIndex={-1} />
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-bg-2 p-5 shadow-2xl sm:p-6">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-mute">
          <Icon icon="flat-color-icons:approval" width={18} aria-hidden /> Cliente ganado · Autos
        </p>
        <h2 id="donde-registrar-titulo" className="mt-2 font-display text-xl text-ink">
          ¿Dónde registras la póliza de {lead.nombre}?
        </h2>
        <p className="mt-1 text-sm text-ink-soft">Tus autos se cobran en dos lugares. Elige con qué aseguradora quedó.</p>

        <div className="mt-4 grid gap-3">
          {ASEGURADORAS_COBRANZA.map((a, i) => (
            <button
              key={a.id}
              ref={i === 0 ? primero : undefined}
              type="button"
              onClick={() => onElegir(a.id)}
              disabled={guardando !== null}
              data-testid={`donde-${a.id}`}
              className="glass flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:border-brand-2 disabled:opacity-60"
            >
              <AvatarEmpleado variante={a.empleado === "Dana" ? "dana" : "valeri"} tamano={48} enLinea={false} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">
                  {a.nombre} <span className="font-normal text-ink-mute">· con {a.empleado}</span>
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">{guardando === a.id ? "Guardando…" : QUE_PASA[a.id]}</span>
              </span>
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-3 text-xs" style={{ color: "var(--red)" }} role="alert" data-testid="donde-error">
            {error}
          </p>
        )}

        <button type="button" onClick={onDespues} className="mt-4 text-sm text-ink-soft underline underline-offset-2 hover:text-ink">
          Decidirlo después
        </button>
        <p className="mt-1 text-xs text-ink-mute">Lo puedes cambiar cuando quieras desde su ficha.</p>
      </div>
    </div>
  );
}
