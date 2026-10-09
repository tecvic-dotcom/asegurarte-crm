"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { crmCotizaciones, ErrorCRM } from "@/lib/api";
import { RAMOS_COTIZACION, type Cotizacion } from "@/lib/cotizaciones-reglas";
import { diasEntre, fechaLocal, hoyLocal } from "@/lib/fechas";
import type { Lead } from "@/lib/types";
import { BuscadorProspecto } from "./cotizaciones/BuscadorProspecto";
import { VistaProspecto } from "./cotizaciones/VistaProspecto";
import { AvisoMigracion } from "./panel/AvisoMigracion";

interface CotizacionesProps {
  leads: Lead[];
  /** Con qué nombre se despide el mensaje al cliente. */
  firma: string;
  /** El prospecto al que se le cotiza ahora (null = todavía no eliges). */
  leadId: string | null;
  onLead: (id: string | null) => void;
  /** Abre el expediente del prospecto. */
  onAbrir: (id: string) => void;
  /** Lleva a Prospectos para dar de alta a alguien nuevo. */
  onNuevoProspecto: () => void;
  /** Cambió algo de un prospecto (su etapa): que el CRM vuelva a leerlos. */
  onCambio: () => void;
}

/**
 * Cotizaciones: cotizas en el portal de cada aseguradora y aquí guardas cada opción, las comparas y
 * le mandas al cliente el mensaje de WhatsApp ya redactado. Primero eliges a quién; luego, qué cotizarle.
 */
export function Cotizaciones({ leads, firma, leadId, onLead, onAbrir, onNuevoProspecto, onCambio }: CotizacionesProps) {
  const lead = leadId ? leads.find((l) => l.id === leadId) ?? null : null;

  if (lead) {
    return (
      <VistaProspecto
        key={lead.id}
        lead={lead}
        firma={firma}
        onCambiar={() => onLead(null)}
        onAbrirExpediente={() => onAbrir(lead.id)}
        onCambio={onCambio}
      />
    );
  }
  return (
    <div className="space-y-4">
      <BuscadorProspecto leads={leads} onElegir={onLead} onNuevo={onNuevoProspecto} />
      <Recientes leads={leads} onElegir={onLead} />
    </div>
  );
}

/** "hoy", "ayer" o "hace 3 días" */
function hace(iso: string, hoy: string): string {
  const n = diasEntre(fechaLocal(iso), hoy);
  return n <= 0 ? "hoy" : n === 1 ? "ayer" : `hace ${n} días`;
}

/** Los prospectos a los que ya les cotizaste, con lo más reciente arriba y a quién le falta respuesta. */
function Recientes({ leads, onElegir }: { leads: Lead[]; onElegir: (id: string) => void }) {
  const hoy = hoyLocal();
  const [lista, setLista] = useState<Cotizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<ErrorCRM | Error | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      setLista(await crmCotizaciones());
    } catch (e) {
      setError(e as Error);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let vivo = true;
    crmCotizaciones()
      .then((d) => vivo && setLista(d))
      .catch((e) => vivo && setError(e as Error))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, []);

  const filas = useMemo(() => {
    const porProspecto = new Map<string, Cotizacion[]>();
    for (const c of lista) porProspecto.set(c.lead_id, [...(porProspecto.get(c.lead_id) ?? []), c]);
    return [...porProspecto.entries()]
      .flatMap(([id, cs]) => {
        const lead = leads.find((l) => l.id === id);
        const activas = cs.filter((c) => c.estado !== "descartada");
        if (!lead || activas.length === 0) return [];
        const ramos = RAMOS_COTIZACION.filter((r) => activas.some((c) => c.ramo === r.id)).map((r) => r.corto);
        const envios = activas.map((c) => c.enviada_en).filter((e): e is string => Boolean(e));
        const ultimoEnvio = envios.length ? [...envios].sort().at(-1)! : null;
        const elegidas = activas.filter((c) => c.estado === "elegida").length;
        return [
          {
            lead,
            ramos,
            total: activas.length,
            enviadas: activas.filter((c) => c.estado === "enviada").length,
            elegidas,
            ultima: [...cs].map((c) => c.creado_en).sort().at(-1) ?? "",
            ultimoEnvio,
            // Mandó cotización, el cliente no ha elegido y ya pasaron 3 días o más.
            esperando: elegidas === 0 && ultimoEnvio !== null && diasEntre(fechaLocal(ultimoEnvio), hoy) >= 3,
          },
        ];
      })
      .sort((a, b) => b.ultima.localeCompare(a.ultima));
  }, [lista, leads, hoy]);

  if (error instanceof ErrorCRM && error.migracion) {
    return (
      <AvisoMigracion
        onListo={() => void cargar()}
        archivo={error.archivo}
        que="tus cotizaciones"
        detalle="Tu libreta en la nube (Supabase) necesita 1 cajón nuevo para guardar tus cotizaciones y que no se pierdan nunca. Se hace una sola vez."
      />
    );
  }
  if (error) {
    return (
      <p className="rounded-xl border border-line bg-bg-3/70 px-4 py-3 text-sm text-ink" role="alert">
        {error.message || "No pude cargar tus cotizaciones."}{" "}
        <button type="button" onClick={() => void cargar()} className="font-semibold underline underline-offset-2">
          Reintentar
        </button>
      </p>
    );
  }
  if (cargando) return <p className="px-1 text-sm text-ink-mute">Cargando tus cotizaciones…</p>;
  if (filas.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-mute">
        Todavía no has guardado cotizaciones. Elige arriba a quién le cotizas y anota la primera.
      </p>
    );
  }

  return (
    <div>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <Icon icon="flat-color-icons:calculator" width={18} aria-hidden /> Tus cotizaciones recientes
        <span className="rounded-full bg-bg-3 px-2 py-0.5 text-xs font-normal text-ink-mute">{filas.length}</span>
      </h2>
      <ul className="space-y-2">
        {filas.map((f) => (
          <li key={f.lead.id}>
            <button
              type="button"
              onClick={() => onElegir(f.lead.id)}
              className="glass flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:border-brand-2"
            >
              <Icon icon="flat-color-icons:businessman" width={26} className="shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-ink">{f.lead.nombre}</span>
                <span className="block truncate text-xs text-ink-mute">
                  {f.total} {f.total === 1 ? "cotización" : "cotizaciones"}: {f.ramos.join(", ")} · {hace(f.ultima, hoy)}
                </span>
              </span>
              <span className="flex shrink-0 flex-wrap justify-end gap-1.5 text-xs">
                {f.elegidas > 0 && (
                  <span className="rounded-full px-2.5 py-0.5 font-medium" style={{ background: "color-mix(in srgb, var(--green) 16%, transparent)", color: "var(--green)" }}>
                    Ya eligió
                  </span>
                )}
                {f.esperando && f.ultimoEnvio ? (
                  <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium" style={{ background: "color-mix(in srgb, var(--amber) 16%, transparent)", color: "var(--amber)" }}>
                    <Icon icon="flat-color-icons:high-priority" width={13} aria-hidden /> Sin respuesta ({hace(f.ultimoEnvio, hoy)})
                  </span>
                ) : (
                  f.enviadas > 0 &&
                  f.elegidas === 0 && (
                    <span className="rounded-full px-2.5 py-0.5 font-medium" style={{ background: "color-mix(in srgb, var(--sky) 16%, transparent)", color: "var(--sky)" }}>
                      {f.enviadas === 1 ? "1 enviada" : `${f.enviadas} enviadas`}
                    </span>
                  )
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
