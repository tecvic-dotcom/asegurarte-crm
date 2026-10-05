"use client";

import { Icon } from "@iconify/react";

/** Cuando a tu Supabase le falta la migración 0003: el paso exacto, en cristiano. */
export function AvisoMigracion({ onListo }: { onListo: () => void }) {
  return (
    <section
      className="glass rounded-2xl border p-5"
      style={{ borderColor: "color-mix(in srgb, var(--amber) 50%, transparent)" }}
    >
      <p className="flex items-center gap-2 font-semibold text-ink">
        <Icon icon="flat-color-icons:key" width={22} aria-hidden /> Falta 1 paso para encender tu AI Manager
      </p>
      <p className="mt-2 text-sm text-ink-soft">
        Tu libreta en la nube (Supabase) necesita 3 cajones nuevos: tus finanzas, el cerebro de RORO y el contador de
        preguntas. Es como instalar repisas antes de acomodar: se hace una sola vez.
      </p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
        <li>Entra a Supabase → tu proyecto → <strong className="text-ink">SQL Editor</strong> → <strong className="text-ink">New query</strong>.</li>
        <li>
          Abre el archivo <code className="rounded bg-bg-3 px-1.5 py-0.5 text-xs text-ink">supabase/migrations/0003_ai_manager.sql</code>, copia todo y pégalo.
        </li>
        <li>Dale <strong className="text-ink">Run</strong>. Debe decir “Success”.</li>
      </ol>
      <button type="button" onClick={onListo} className="btn-primary mt-4 px-4 py-2.5 text-sm">
        Ya lo corrí, volver a cargar
      </button>
    </section>
  );
}
