"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

/**
 * Pop-up de "actividad reciente" — SOLO escritorio, OFF por defecto.
 * Muestra mensajes genéricos por ciudad ("Alguien de Guadalajara apartó su
 * lugar"). NUNCA nombres inventados como reales ni PII real. Se desactiva en
 * móvil/tablet por breakpoint (no se renderiza bajo 1024px).
 */

interface PopupActividadProps {
  /** Llega de los ajustes (admin). Si es false, no se muestra. */
  activo: boolean;
  /** Ciudades de muestra (genéricas, configurables). */
  ciudades?: string[];
  /** Cada cuántos ms aparece. */
  intervaloMs?: number;
}

const CIUDADES_DEFAULT = ["Guadalajara", "Monterrey", "CDMX", "Puebla", "Querétaro", "Mérida", "Tijuana"];

export function PopupActividad({ activo, ciudades = CIUDADES_DEFAULT, intervaloMs = 12000 }: PopupActividadProps) {
  const [visible, setVisible] = useState(false);
  const [ciudad, setCiudad] = useState(ciudades[0]);
  const [esEscritorio, setEsEscritorio] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const set = () => setEsEscritorio(mql.matches);
    set();
    mql.addEventListener("change", set);
    return () => mql.removeEventListener("change", set);
  }, []);

  useEffect(() => {
    if (!activo || !esEscritorio) return;
    let i = 0;
    const ciclo = window.setInterval(() => {
      setCiudad(ciudades[i % ciudades.length]);
      i++;
      setVisible(true);
      window.setTimeout(() => setVisible(false), 4500);
    }, intervaloMs);
    return () => window.clearInterval(ciclo);
  }, [activo, esEscritorio, ciudades, intervaloMs]);

  if (!activo || !esEscritorio) return null;

  return (
    <div
      aria-hidden
      className={`fixed bottom-6 left-6 z-40 hidden lg:block transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
        <Icon icon="flat-color-icons:like" width={28} />
        <div className="text-sm">
          <p className="font-semibold text-ink">Alguien de {ciudad}</p>
          <p className="text-ink-mute">acaba de apartar su lugar</p>
        </div>
      </div>
    </div>
  );
}
