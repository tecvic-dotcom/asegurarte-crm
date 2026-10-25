"use client";

import { useEffect } from "react";

/**
 * Fondo de Halloween de octubre (public/halloween/halloween.js).
 * El script decide solo si toca encenderse (1 oct – 1 nov) y, al salir de la página,
 * se apaga para no teñir el CRM ni otras pantallas que comparten el layout raíz.
 * Para quitarlo: borrar <Halloween /> de Landing.tsx.
 */
export function Halloween() {
  useEffect(() => {
    const s = document.createElement("script");
    s.src = "/halloween/halloween.js";
    s.async = true;
    document.body.appendChild(s);
    return () => {
      s.remove();
      (window as unknown as { __hw?: { off: () => void } | null }).__hw?.off();
    };
  }, []);
  return null;
}
