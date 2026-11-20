"use client";

import { useState } from "react";

/**
 * Reel vertical de promoción del libro (archivos fijos en public/libro/videos/<id>.mp4 + <id>.webp).
 * No descarga nada del video hasta que la persona presiona play: antes solo se ve la portada (webp de ~40 KB).
 * Al dar play avisa a los píxeles (si el visitante aceptó cookies) qué video vio.
 * Para cambiar un video: reemplazar el .mp4 (720x1280, H.264, faststart) y su portada .webp con el mismo nombre.
 */
export function VideoPromo({
  id,
  titulo,
  duracion,
  nota,
  className = "",
}: {
  id: string;
  titulo: string;
  duracion: string;
  nota?: string;
  className?: string;
}) {
  const [activo, setActivo] = useState(false);
  const src = `/libro/videos/${id}.mp4`;
  const portada = `/libro/videos/${id}.webp`;

  function reproducir() {
    setActivo(true);
    window.fbq?.("trackCustom", "VideoLibro", { video: id });
    window.ttq?.track("ViewContent", {
      content_id: `video-${id}`,
      content_name: titulo,
    });
  }

  return (
    <figure className={`mx-auto w-full max-w-[20rem] ${className}`}>
      <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] border border-white/10 bg-bg-3 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.9)]">
        {activo ? (
          <video src={src} poster={portada} controls autoPlay playsInline preload="auto" className="h-full w-full bg-black object-contain">
            Tu navegador no puede reproducir este video.
          </video>
        ) : (
          <button
            type="button"
            onClick={reproducir}
            className="group absolute inset-0 block h-full w-full cursor-pointer"
            aria-label={`Ver el video: ${titulo} (${duracion})`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portada} alt="" width={540} height={960} loading="lazy" decoding="async" className="h-full w-full object-cover" />
            {/* El botón va abajo para no tapar el titular de la portada */}
            <span className="absolute inset-x-0 bottom-0 h-1/5 bg-gradient-to-t from-black/90 to-transparent" aria-hidden="true" />
            <span
              aria-hidden="true"
              className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-brand py-1.5 pr-4 pl-1.5 text-sm font-bold text-white shadow-[0_0_0_6px_rgba(42,34,245,0.3)] transition-transform duration-200 group-hover:scale-105"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor">
                  <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.6-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
                </svg>
              </span>
              Ver video
            </span>
            <span aria-hidden="true" className="absolute right-3 bottom-4 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
              {duracion}
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-3 text-center">
        <span className="block text-base font-semibold text-ink">{titulo}</span>
        {nota && <span className="mt-1 block text-xs text-ink-mute">{nota}</span>}
      </figcaption>
    </figure>
  );
}
