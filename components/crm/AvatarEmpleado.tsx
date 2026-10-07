"use client";

import { useId } from "react";

export type VarianteAvatar = "roro" | "valeri" | "clara" | "sofi";

const ESTILO: Record<VarianteAvatar, { claro: string; oscuro: string; ojos: string; nombre: string }> = {
  roro: { claro: "var(--brand-2)", oscuro: "var(--brand)", ojos: "var(--sky)", nombre: "RORO, tu gerente digital" },
  valeri: { claro: "var(--violet)", oscuro: "var(--brand)", ojos: "var(--ink)", nombre: "Valeri, tu cobranza digital" },
  clara: { claro: "var(--sky)", oscuro: "var(--brand-deep)", ojos: "var(--ink)", nombre: "Clara, tus reportes" },
  sofi: { claro: "var(--green)", oscuro: "var(--brand)", ojos: "var(--ink)", nombre: "Sofi, tu seguimiento a prospectos" },
};

interface AvatarEmpleadoProps {
  variante?: VarianteAvatar;
  tamano?: number;
  /** Mueve la boca mientras piensa o responde. */
  hablando?: boolean;
  enLinea?: boolean;
}

/**
 * La cara de tus empleados digitales: flotan, parpadean y "hablan".
 * RORO (gerente) lleva corbata; Valeri (cobranza) lleva audífonos para sus llamadas;
 * Clara (reportes) lleva lentes y su portapapeles con la gráfica; Sofi (seguimiento) lleva coleta y su globo de mensaje.
 * Solo SVG + animaciones baratas (transform/opacity): fluido en el celular.
 */
export function AvatarEmpleado({ variante = "roro", tamano = 72, hablando = false, enLinea = true }: AvatarEmpleadoProps) {
  const gradiente = `cara-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const e = ESTILO[variante];
  return (
    <div className="relative shrink-0" style={{ width: tamano, height: tamano }}>
      <svg viewBox="0 0 100 100" width={tamano} height={tamano} className="roro-flota" role="img" aria-label={e.nombre}>
        <defs>
          <linearGradient id={gradiente} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: e.claro }} />
            <stop offset="1" style={{ stopColor: e.oscuro }} />
          </linearGradient>
        </defs>

        {variante === "roro" ? (
          <>
            {/* Antena con foco "en línea" */}
            <line x1="50" y1="16" x2="50" y2="8" strokeWidth="3" strokeLinecap="round" style={{ stroke: e.claro }} />
            <circle cx="50" cy="6.5" r="4.5" className="roro-foco" style={{ fill: "var(--green)" }} />
          </>
        ) : variante === "valeri" ? (
          // Diadema de los audífonos
          <path d="M17 34 Q17 6 50 6 Q83 6 83 34" fill="none" strokeWidth="4" strokeLinecap="round" style={{ stroke: "var(--ink-soft)" }} />
        ) : variante === "sofi" ? (
          // Coleta de lado de Sofi
          <g style={{ fill: e.oscuro }}>
            <circle cx="50" cy="14" r="6" />
            <path d="M54 14 Q82 6 84 30 Q76 18 56 20 Z" />
          </g>
        ) : (
          // Chongo de Clara
          <circle cx="50" cy="13" r="8" style={{ fill: e.oscuro }} />
        )}

        {/* Cabeza y visor */}
        <rect x="14" y="16" width="72" height="62" rx="24" style={{ fill: `url(#${gradiente})` }} />
        <rect x="22" y="29" width="56" height="28" rx="14" style={{ fill: "var(--bg-2)" }} />

        {/* Ojos (parpadean) */}
        <g className="roro-ojos">
          <rect x="33" y="36" width="9" height="13" rx="4.5" style={{ fill: e.ojos }} />
          <rect x="58" y="36" width="9" height="13" rx="4.5" style={{ fill: e.ojos }} />
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

        {variante === "clara" && (
          // Lentes
          <g fill="none" strokeWidth="2.5" style={{ stroke: "var(--ink)" }}>
            <rect x="27" y="33" width="21" height="19" rx="8" />
            <rect x="52" y="33" width="21" height="19" rx="8" />
            <path d="M48 41 H52" />
          </g>
        )}

        {variante === "roro" ? (
          // Corbata de asesor
          <path d="M44 79 H56 L53 85 L57 95 L50 99 L43 95 L47 85 Z" style={{ fill: "var(--brand-deep)" }} />
        ) : variante === "clara" ? (
          // Portapapeles con su gráfica de barras
          <g>
            <rect x="35" y="79" width="30" height="20" rx="3" style={{ fill: "var(--plata)" }} />
            <rect x="44" y="76.5" width="12" height="5" rx="2" style={{ fill: "var(--ink-soft)" }} />
            <rect x="40" y="91" width="4" height="5" rx="1" style={{ fill: "var(--brand)" }} />
            <rect x="48" y="87" width="4" height="9" rx="1" style={{ fill: "var(--brand)" }} />
            <rect x="56" y="84" width="4" height="12" rx="1" className="roro-foco" style={{ fill: "var(--green)" }} />
          </g>
        ) : variante === "sofi" ? (
          // Globo de mensaje con puntos "escribiendo"
          <g>
            <path d="M36 80 H64 Q69 80 69 85 V92 Q69 97 64 97 H52 L45 102 V97 H36 Q31 97 31 92 V85 Q31 80 36 80 Z" style={{ fill: "var(--plata)" }} />
            <circle cx="41" cy="88.5" r="2" style={{ fill: "var(--brand)" }} />
            <circle cx="50" cy="88.5" r="2" className="roro-foco" style={{ fill: "var(--green)" }} />
            <circle cx="59" cy="88.5" r="2" style={{ fill: "var(--brand)" }} />
          </g>
        ) : (
          <>
            {/* Audífonos con micrófono */}
            <rect x="8" y="32" width="10" height="20" rx="5" style={{ fill: "var(--ink-soft)" }} />
            <rect x="82" y="32" width="10" height="20" rx="5" style={{ fill: "var(--ink-soft)" }} />
            <path d="M87 52 Q87 72 66 72" fill="none" strokeWidth="3" strokeLinecap="round" style={{ stroke: "var(--ink-soft)" }} />
            <circle cx="64" cy="72" r="3.5" className="roro-foco" style={{ fill: "var(--green)" }} />
          </>
        )}
      </svg>
      {enLinea && <span className="roro-en-linea bottom-0.5 right-0.5" aria-hidden />}
    </div>
  );
}
