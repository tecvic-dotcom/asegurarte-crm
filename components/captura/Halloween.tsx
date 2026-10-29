"use client";

import { useEffect } from "react";

/**
 * Fondo de Halloween de octubre (public/halloween/halloween.js).
 * Solo se carga en octubre (el 1 de noviembre ya no se descarga nada; ?halloween=1 lo fuerza para probar) y, al salir de la página,
 * se apaga para no teñir el CRM ni otras pantallas que comparten el layout raíz.
 * Para quitarlo: borrar <Halloween /> de Landing.tsx.
 */
export function Halloween() {
  useEffect(() => {
    if (new Date().getMonth() !== 9 && !/[?&]halloween=1/.test(window.location.search)) return;
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
