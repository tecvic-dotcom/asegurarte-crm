"use client";

import { Icon } from "@iconify/react";

interface AvisoMigracionProps {
  onListo: () => void;
  /** Archivo de supabase/migrations que falta correr. */
  archivo?: string;
  /** Qué se enciende al correrlo. */
  que?: string;
  detalle?: string;
}

/** Cuando a tu Supabase le falta una migración: el paso exacto, en cristiano. */
export function AvisoMigracion({
  onListo,
  archivo = "0003_ai_manager.sql",
  que = "tu AI Manager",
  detalle = "Tu libreta en la nube (Supabase) necesita 3 cajones nuevos: tus finanzas, el cerebro de Robert y el contador de preguntas. Es como instalar repisas antes de acomodar: se hace una sola vez.",
}: AvisoMigracionProps) {
  return (
    <section
      className="glass rounded-2xl border p-5"
      style={{ borderColor: "color-mix(in srgb, var(--amber) 50%, transparent)" }}
    >
      <p className="flex items-center gap-2 font-semibold text-ink">
        <Icon icon="flat-color-icons:key" width={22} aria-hidden /> Falta 1 paso para encender {que}
      </p>
      <p className="mt-2 text-sm text-ink-soft">{detalle}</p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
        <li>Entra a Supabase → tu proyecto → <strong className="text-ink">SQL Editor</strong> → <strong className="text-ink">New query</strong>.</li>
        <li>
          Abre el archivo <code className="rounded bg-bg-3 px-1.5 py-0.5 text-xs text-ink">supabase/migrations/{archivo}</code>, copia todo y pégalo
          en el editor (donde aparecen los números de renglón, no en el recuadro del asistente).
        </li>
        <li>Dale <strong className="text-ink">Run</strong>. Debe decir “Success”.</li>
      </ol>
      <button type="button" onClick={onListo} className="btn-primary mt-4 px-4 py-2.5 text-sm">
        Ya lo corrí, volver a cargar
      </button>
    </section>
  );
}
