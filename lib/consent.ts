"use client";

/**
 * Consentimiento de cookies (GDPR / LFPDPPP) — guardado en el navegador del
 * visitante (localStorage), nunca en el servidor. Mientras no haya "aceptado"
 * explícito, no se cargan píxeles de terceros (Meta/TikTok).
 */
const KEY = "acm.consentimiento";
export type Consentimiento = "pendiente" | "aceptado" | "rechazado";
export const EVENTO_CONSENTIMIENTO = "acm:consentimiento";

export function leerConsentimiento(): Consentimiento {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "aceptado" || v === "rechazado") return v;
  } catch {
    /* localStorage bloqueado (modo privado): tratamos como pendiente */
  }
  return "pendiente";
}

export function guardarConsentimiento(v: "aceptado" | "rechazado"): void {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENTO_CONSENTIMIENTO, { detail: v }));
}
