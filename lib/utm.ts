"use client";

/**
 * UTMs — "la etiqueta que dice de dónde llegó el cliente".
 * Capturamos las 5 al PRIMER arribo y las guardamos en sessionStorage para que
 * sobrevivan a la navegación interna; luego se inyectan como campos ocultos del
 * formulario y se guardan en el MISMO insert del lead.
 */
import type { UTM } from "./types";

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

const STORE = "acm.utm";

const VACIO: UTM = { source: "", medium: "", campaign: "", term: "", content: "" };

function desdeParams(params: URLSearchParams): UTM {
  return {
    source: params.get("utm_source") ?? "",
    medium: params.get("utm_medium") ?? "",
    campaign: params.get("utm_campaign") ?? "",
    term: params.get("utm_term") ?? "",
    content: params.get("utm_content") ?? "",
  };
}

function tieneAlgo(u: UTM): boolean {
  return Object.values(u).some((v) => v.trim().length > 0);
}

/**
 * Lee las UTMs ya guardadas. Si la URL actual trae UTMs nuevas y aún no hay
 * nada guardado, las persiste (primer toque gana). Devuelve siempre un UTM
 * completo (campos vacíos si no hubo).
 */
export function capturarUTMs(): UTM {
  if (typeof window === "undefined") return { ...VACIO };
  try {
    const guardado = window.sessionStorage.getItem(STORE);
    if (guardado) return { ...VACIO, ...(JSON.parse(guardado) as Partial<UTM>) };

    const dela = desdeParams(new URLSearchParams(window.location.search));
    if (tieneAlgo(dela)) {
      window.sessionStorage.setItem(STORE, JSON.stringify(dela));
      return dela;
    }
  } catch {
    /* almacenamiento bloqueado: seguimos con vacío */
  }
  return { ...VACIO };
}

export function leerUTMs(): UTM {
  if (typeof window === "undefined") return { ...VACIO };
  try {
    const guardado = window.sessionStorage.getItem(STORE);
    return guardado ? { ...VACIO, ...(JSON.parse(guardado) as Partial<UTM>) } : { ...VACIO };
  } catch {
    return { ...VACIO };
  }
}
