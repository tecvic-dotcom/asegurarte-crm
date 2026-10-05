"use client";

import { useId } from "react";

interface AvatarRoroProps {
  tamano?: number;
  /** Mueve la boca mientras piensa o responde. */
  hablando?: boolean;
  enLinea?: boolean;
}

/**
 * RORO, tu gerente digital: flota, parpadea y "habla" cuando te responde.
 * Solo SVG + animaciones baratas (transform/opacity): fluido en el celular.
 */
export function AvatarRoro({ tamano = 72, hablando = false, enLinea = true }: AvatarRoroProps) {
  const gradiente = `roro-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <div className="relative shrink-0" style={{ width: tamano, height: tamano }}>
      <svg viewBox="0 0 100 100" width={tamano} height={tamano} className="roro-flota" role="img" aria-label="RORO, tu gerente digital">
        <defs>
          <linearGradient id={gradiente} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--brand-2)" }} />
            <stop offset="1" style={{ stopColor: "var(--brand)" }} />
          </linearGradient>
        </defs>
        {/* Antena con foco "en línea" */}
        <line x1="50" y1="16" x2="50" y2="8" strokeWidth="3" strokeLinecap="round" style={{ stroke: "var(--brand-2)" }} />
        <circle cx="50" cy="6.5" r="4.5" className="roro-foco" style={{ fill: "var(--green)" }} />
        {/* Cabeza y visor */}
        <rect x="14" y="16" width="72" height="62" rx="24" style={{ fill: `url(#${gradiente})` }} />
        <rect x="22" y="29" width="56" height="28" rx="14" style={{ fill: "var(--bg-2)" }} />
        {/* Ojos (parpadean) */}
        <g className="roro-ojos">
          <rect x="33" y="36" width="9" height="13" rx="4.5" style={{ fill: "var(--sky)" }} />
          <rect x="58" y="36" width="9" height="13" rx="4.5" style={{ fill: "var(--sky)" }} />
        </g>
        {/* Boca (se mueve cuando habla) */}
        <rect
          x="40"
          y="64"
          width="20"
          height="5"
          rx="2.5"
          className={hablando ? "roro-boca-habla" : undefined}
          style={{ fill: "var(--ink)" }}
        />
        {/* Corbata de asesor */}
        <path d="M44 79 H56 L53 85 L57 95 L50 99 L43 95 L47 85 Z" style={{ fill: "var(--brand-deep)" }} />
      </svg>
      {enLinea && <span className="roro-en-linea bottom-0.5 right-0.5" aria-hidden />}
    </div>
  );
}
