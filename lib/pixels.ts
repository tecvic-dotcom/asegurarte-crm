"use client";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    ttq?: { track: (...args: unknown[]) => void };
  }
}

/** Dispara el evento de conversión (lead capturado) en los píxeles activos. */
export function dispararConversionLead(): void {
  window.fbq?.("track", "Lead");
  window.ttq?.track("CompleteRegistration");
}
