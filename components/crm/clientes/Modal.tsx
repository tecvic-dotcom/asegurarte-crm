"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  titulo: string;
  subtitulo?: string;
  /** Sin cabecera: el contenido trae su propio título (por ejemplo el formulario de la póliza). */
  sinCabecera?: boolean;
  ancho?: "md" | "lg";
  onCerrar: () => void;
  children: React.ReactNode;
}

/** Cuadro de diálogo del listado de clientes: Escape o clic afuera lo cierra, el fondo no se desliza y el foco vuelve al botón que lo abrió. */
export function Modal({ titulo, subtitulo, sinCabecera = false, ancho = "md", onCerrar, children }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  // Siempre el onCerrar más reciente, sin volver a abrir el diálogo (ni mover el foco) cada vez que cambia.
  const alCerrar = useRef(onCerrar);
  useEffect(() => {
    alCerrar.current = onCerrar;
  });

  useEffect(() => {
    const abrio = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && alCerrar.current();
    window.addEventListener("keydown", alTeclear);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflow;
      abrio?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center print:hidden" role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" className="absolute inset-0 cursor-default bg-black/60" aria-label="Cerrar" tabIndex={-1} onClick={onCerrar} />
      <div
        ref={panel}
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full flex-col rounded-t-3xl border border-line bg-bg-2 shadow-2xl outline-none sm:rounded-3xl ${ancho === "lg" ? "max-w-3xl" : "max-w-xl"}`}
      >
        {sinCabecera ? (
          <button
            type="button"
            onClick={onCerrar}
            className="absolute right-3 top-3 z-10 rounded-lg px-2 py-1 text-xl leading-none text-ink-mute hover:text-ink"
            aria-label="Cerrar"
          >
            ×
          </button>
        ) : (
          <div className="flex items-start justify-between gap-3 px-5 pt-5">
            <div className="min-w-0">
              <p className="font-display text-xl text-ink">{titulo}</p>
              {subtitulo && <p className="mt-0.5 text-sm text-ink-soft">{subtitulo}</p>}
            </div>
            <button type="button" onClick={onCerrar} className="-mr-1 rounded-lg px-2 py-1 text-xl leading-none text-ink-mute hover:text-ink" aria-label="Cerrar">
              ×
            </button>
          </div>
        )}
        <div className={`min-h-0 flex-1 overflow-y-auto px-5 pb-5 ${sinCabecera ? "pt-5" : "pt-3"}`}>{children}</div>
      </div>
    </div>
  );
}
