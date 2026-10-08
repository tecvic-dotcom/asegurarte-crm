"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { crmFraseClara, crmPanel, crmResumenCobranza, ErrorCRM } from "@/lib/api";
import { AvatarEmpleado, type VarianteAvatar } from "./AvatarEmpleado";

interface SlotRoroProps {
  onPanel: () => void;
  onRoro: () => void;
  onValeri: () => void;
  onClara: () => void;
}

/**
 * Arriba de tu CRM: tu equipo digital con su reporte de hoy.
 * RORO te dice cómo va tu dinero y tu meta; Valeri, a quién cobrarle; Clara, cómo cerró el mes (o el trimestre).
 * Es el gancho diario: entras al CRM y en 20 segundos ya sabes qué hacer.
 */
export function SlotRoro({ onPanel, onRoro, onValeri, onClara }: SlotRoroProps) {
  const [frase, setFrase] = useState<string | null>(null);
  const [cobranza, setCobranza] = useState<string | null>(null);
  const [reporte, setReporte] = useState<{ frase: string; tipo: "mes" | "trimestre" } | null>(null);

  useEffect(() => {
    let vivo = true;
    crmPanel("mes")
      .then((d) => vivo && setFrase(d.frase))
      .catch((e) => {
        if (!vivo) return;
        setFrase(
          e instanceof ErrorCRM && e.migracion
            ? "Falta 1 paso para encender tu AI Manager. Ábrelo en el Panel y te digo cuál."
            : "No pude leer tus números ahorita. Ábrelos en el Panel.",
        );
      });
    crmResumenCobranza()
      .then((r) => vivo && setCobranza(r.frase))
      .catch((e) => {
        if (!vivo) return;
        setCobranza(
          e instanceof ErrorCRM && e.migracion
            ? "Falta 1 paso para encenderme: ábreme y te digo cuál."
            : "No pude revisar tu cartera ahorita. Ábreme para reintentar.",
        );
      });
    crmFraseClara()
      .then((r) => vivo && setReporte(r))
      .catch(() => vivo && setReporte({ frase: "No pude armar tu reporte ahorita. Ábreme para reintentar.", tipo: "mes" }));
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div className="mb-5 space-y-4 rounded-2xl border border-line bg-glass p-4">
      <Fila variante="roro" nombre="RORO, tu gerente digital" etiqueta="reporte de hoy" texto={frase}>
        <button type="button" onClick={onPanel} className="btn-ghost flex-1 px-3 py-2.5 text-sm sm:flex-none">
          <Icon icon="flat-color-icons:combo-chart" width={18} aria-hidden /> Panel
        </button>
        <button type="button" onClick={onRoro} className="btn-primary flex-1 px-3 py-2.5 text-sm sm:flex-none">
          <Icon icon="flat-color-icons:assistant" width={18} aria-hidden /> Preguntar
        </button>
      </Fila>
      <div className="border-t border-line" />
      <Fila variante="valeri" nombre="Valeri, tu cobranza digital" etiqueta="cobranza de hoy" texto={cobranza}>
        <button type="button" onClick={onValeri} className="btn-ghost flex-1 px-3 py-2.5 text-sm sm:flex-none">
          <Icon icon="flat-color-icons:debt" width={18} aria-hidden /> Cobrar
        </button>
      </Fila>
      <div className="border-t border-line" />
      <Fila
        variante="clara"
        nombre="Clara, tus reportes"
        etiqueta={reporte?.tipo === "trimestre" ? "cierre del trimestre" : "cierre del mes"}
        texto={reporte?.frase ?? null}
      >
        <button type="button" onClick={onClara} className="btn-ghost flex-1 px-3 py-2.5 text-sm sm:flex-none">
          <Icon icon="flat-color-icons:document" width={18} aria-hidden /> Ver reporte
        </button>
      </Fila>
    </div>
  );
}

function Fila({
  variante,
  nombre,
  etiqueta,
  texto,
  children,
}: {
  variante: VarianteAvatar;
  nombre: string;
  etiqueta: string;
  texto: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <AvatarEmpleado variante={variante} tamano={52} />
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-ink">
            {nombre} <span className="text-xs font-normal text-ink-mute">· {etiqueta}</span>
          </p>
          {texto ? (
            <p className="mt-0.5 leading-relaxed text-ink-soft">{texto}</p>
          ) : (
            <div className="mt-1.5 h-4 w-3/4 animate-pulse rounded bg-bg-3" aria-label="Revisando" />
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">{children}</div>
    </div>
  );
}
