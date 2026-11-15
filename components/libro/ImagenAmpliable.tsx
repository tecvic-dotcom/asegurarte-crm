"use client";

import { useEffect, useRef } from "react";

/**
 * Imagen que se amplía al tocarla: abre un <dialog> modal con la imagen en grande.
 * Se cierra con la X, tocando fuera de la imagen o con Esc (eso último lo da el propio <dialog>).
 */
export function ImagenAmpliable({
  src,
  alt,
  width,
  height,
  className = "",
  botonClassName = "",
  prioridad = false,
  fondoBlanco = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  botonClassName?: string;
  prioridad?: boolean;
  fondoBlanco?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    // Mientras está abierto, la página de atrás no se mueve
    const alCerrar = () => document.documentElement.style.removeProperty("overflow");
    d.addEventListener("close", alCerrar);
    return () => {
      d.removeEventListener("close", alCerrar);
      alCerrar();
    };
  }, []);

  function abrir() {
    document.documentElement.style.overflow = "hidden";
    ref.current?.showModal();
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label={`Ampliar imagen: ${alt}`}
        className={`group relative block w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-2 ${botonClassName}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- imágenes estáticas ya optimizadas */}
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={prioridad ? undefined : "lazy"}
          fetchPriority={prioridad ? "high" : undefined}
          className={className}
        />
        <span
          aria-hidden="true"
          className="absolute right-3 bottom-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-bg/80 text-white shadow-lg backdrop-blur transition-transform duration-200 group-hover:scale-110"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5M11 8v6M8 11h6" />
          </svg>
        </span>
      </button>

      <dialog
        ref={ref}
        aria-label={alt}
        onClick={(e) => {
          if (e.target === e.currentTarget) ref.current?.close();
        }}
        className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/85 backdrop:backdrop-blur-sm"
      >
        <div className="relative flex h-dvh w-screen items-center justify-center p-4 sm:p-10" onClick={() => ref.current?.close()}>
          {/* eslint-disable-next-line @next/next/no-img-element -- la misma imagen, ya descargada */}
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            onClick={(e) => e.stopPropagation()}
            className={`max-h-full w-auto max-w-full rounded-2xl object-contain shadow-2xl ${fondoBlanco ? "bg-white p-2 sm:p-4" : ""}`}
          />
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Cerrar imagen"
            autoFocus
            className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-bg/80 text-2xl leading-none text-white backdrop-blur hover:border-brand-2"
          >
            ×
          </button>
        </div>
      </dialog>
    </>
  );
}
