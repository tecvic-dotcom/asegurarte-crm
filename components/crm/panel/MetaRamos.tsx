"use client";

import { Icon } from "@iconify/react";
import { infoRamo } from "@/lib/ramos";
import type { EstadoSemaforo, PanelSnapshot } from "@/lib/types";
import { SEMAFORO } from "./formato";

const PALABRA_RAMO: Record<EstadoSemaforo, string> = {
  bien: "En ritmo",
  atencion: "Un poco atrás",
  alerta: "Atrasado",
  neutral: "",
};

const RELLENO: Record<EstadoSemaforo, string> = {
  bien: "var(--brand-2)",
  atencion: "var(--amber)",
  alerta: "var(--red)",
  neutral: "var(--brand-2)",
};

/**
 * Avance de tu meta por ramo: una barra por ramo (cerradas vs meta del
 * periodo) con una rayita que marca el ritmo a hoy. Si la barra no llega a la
 * rayita, vas atrasado en ese ramo.
 */
export function MetaRamos({ ramos, onVerSinRamo }: { ramos: PanelSnapshot["ramos"]; onVerSinRamo?: () => void }) {
  // Una sola escala para todos los ramos: así las barras se pueden comparar entre sí.
  const escala = Math.max(1, ...ramos.porRamo.map((r) => Math.max(ramos.hayMeta ? r.meta : 0, r.cerradas)));

  return (
    <section className="glass rounded-2xl p-4 sm:p-5">
      <h3 className="font-semibold text-ink">{ramos.titulo}</h3>
      {ramos.hayMeta ? (
        <p className="mb-4 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-mute">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: "var(--brand-2)" }} /> pólizas cerradas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-0.5" style={{ background: "var(--ink-soft)" }} /> dónde deberías ir hoy
          </span>
        </p>
      ) : (
        <p className="mb-4 mt-1 text-xs text-ink-mute">
          Este periodo casi no entra en las fechas de tu meta; aquí solo ves cuántas cerraste por ramo.
        </p>
      )}

      <ul className="space-y-3.5">
        {ramos.porRamo.map((r) => {
          const info = infoRamo(r.ramo);
          const s = SEMAFORO[r.estado];
          const lograda = ramos.hayMeta && r.meta > 0 && r.cerradas >= Math.round(r.meta);
          const palabra = lograda ? "¡Meta lograda!" : PALABRA_RAMO[r.estado];
          const relleno = lograda ? "var(--green)" : RELLENO[r.estado];
          const etiqueta = ramos.hayMeta ? `${r.cerradas} de ${Math.round(r.meta)}` : `${r.cerradas}`;
          return (
            <li
              key={r.ramo}
              aria-label={`${info.nombre}: ${r.cerradas} cerradas${ramos.hayMeta ? ` de ${Math.round(r.meta)}; a hoy deberías llevar ${r.ritmo}` : ""}${palabra ? `. ${palabra}` : ""}`}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-ink">
                  <Icon icon={info.icono} width={18} className="shrink-0" aria-hidden />
                  <span className="truncate">{info.corto}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold text-ink">{etiqueta}</span>
                  {palabra && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        color: lograda ? "var(--green)" : s.color,
                        background: `color-mix(in srgb, ${lograda ? "var(--green)" : s.color} 14%, transparent)`,
                      }}
                    >
                      <Icon icon={lograda ? SEMAFORO.bien.icono : s.icono} width={13} aria-hidden /> {palabra}
                    </span>
                  )}
                </span>
              </div>
              <div
                className="relative h-3 rounded-sm"
                style={{ background: `color-mix(in srgb, ${relleno} 16%, transparent)` }}
                aria-hidden
              >
                <div
                  className="h-full rounded-r-[4px]"
                  style={{ width: `${Math.min(100, (r.cerradas / escala) * 100)}%`, background: relleno }}
                />
                {ramos.hayMeta && r.ritmo > 0 && (
                  <span
                    className="absolute -top-1 h-5 w-0.5"
                    style={{ left: `calc(${Math.min(100, (r.ritmo / escala) * 100)}% - 1px)`, background: "var(--ink-soft)" }}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {ramos.sinRamo > 0 && (
        <div
          className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 text-xs text-ink-soft"
          style={{ borderColor: "color-mix(in srgb, var(--amber) 45%, transparent)" }}
        >
          <Icon icon={SEMAFORO.atencion.icono} width={16} aria-hidden />
          <span className="flex-1">
            <strong style={{ color: "var(--amber)" }}>Atención:</strong> {ramos.sinRamo}{" "}
            {ramos.sinRamo === 1 ? "póliza ganada no tiene ramo" : "pólizas ganadas no tienen ramo"} y no cuentan en tu meta.
          </span>
          {onVerSinRamo && (
            <button type="button" onClick={onVerSinRamo} className="btn-ghost px-3 py-1.5 text-xs">
              Asignar ramo
            </button>
          )}
        </div>
      )}
    </section>
  );
}
