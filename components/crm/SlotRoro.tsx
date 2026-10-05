"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { crmPanel, ErrorCRM } from "@/lib/api";
import { AvatarRoro } from "./AvatarRoro";

/**
 * Arriba de tu CRM: RORO con el reporte de una frase de hoy y dos botones
 * (Panel / Preguntar). Es el gancho diario: entras al CRM y ya sabes cómo vas.
 */
export function SlotRoro({ onPanel, onRoro }: { onPanel: () => void; onRoro: () => void }) {
  const [frase, setFrase] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    crmPanel("mes")
      .then((d) => vivo && setFrase(d.frase))
      .catch((e) => {
        if (!vivo) return;
        setAviso(
          e instanceof ErrorCRM && e.migracion
            ? "Falta 1 paso para encender tu AI Manager. Ábrelo en el Panel y te digo cuál."
            : "No pude leer tus números ahorita. Ábrelos en el Panel.",
        );
      });
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-line bg-glass p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <AvatarRoro tamano={52} />
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-ink">
            RORO, tu gerente digital <span className="text-xs font-normal text-ink-mute">· reporte de hoy</span>
          </p>
          {frase || aviso ? (
            <p className="mt-0.5 leading-relaxed text-ink-soft">{frase ?? aviso}</p>
          ) : (
            <div className="mt-1.5 h-4 w-3/4 animate-pulse rounded bg-bg-3" aria-label="Leyendo tus números" />
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={onPanel} className="btn-ghost flex-1 px-3 py-2.5 text-sm sm:flex-none">
          <Icon icon="flat-color-icons:combo-chart" width={18} aria-hidden /> Panel
        </button>
        <button type="button" onClick={onRoro} className="btn-primary flex-1 px-3 py-2.5 text-sm sm:flex-none">
          <Icon icon="flat-color-icons:assistant" width={18} aria-hidden /> Preguntar
        </button>
      </div>
    </div>
  );
}
