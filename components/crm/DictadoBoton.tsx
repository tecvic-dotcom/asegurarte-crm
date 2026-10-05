"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";

/**
 * Dictado por voz es-MX (Web Speech API) — mismo patrón que la consola Jarvis de
 * la plataforma LEGENDAR·IA. Si el navegador no lo soporta, se oculta solo (no
 * estorba). Llama a onTexto con lo que vas dictando.
 */
interface DictadoBotonProps {
  onTexto: (texto: string) => void;
}

// Tipos mínimos de la Web Speech API (no vienen en lib.dom estándar).
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function DictadoBoton({ onTexto }: DictadoBotonProps) {
  const [soportado] = useState(() => getRecognition() !== null);
  const [escuchando, setEscuchando] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => recRef.current?.stop(), []);

  function alternar() {
    if (escuchando) {
      recRef.current?.stop();
      return;
    }
    const rec = getRecognition();
    if (!rec) return;
    rec.lang = "es-MX";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const texto = Array.from({ length: e.results.length })
        .map((_, i) => e.results[i][0].transcript)
        .join(" ")
        .trim();
      if (texto) onTexto(texto);
    };
    rec.onend = () => setEscuchando(false);
    rec.onerror = () => setEscuchando(false);
    recRef.current = rec;
    setEscuchando(true);
    rec.start();
  }

  if (!soportado) return null;

  return (
    <button
      type="button"
      onClick={alternar}
      title={escuchando ? "Detener dictado" : "Dictar por voz"}
      className={`grid h-9 w-9 place-items-center rounded-lg border border-line transition-colors ${
        escuchando ? "bg-brand/20 text-brand-2" : "bg-glass text-ink-mute hover:text-ink"
      }`}
    >
      <Icon icon={escuchando ? "flat-color-icons:multiple-inputs" : "flat-color-icons:voice-presentation"} width={20} />
    </button>
  );
}
