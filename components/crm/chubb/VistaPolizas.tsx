"use client";

import { Icon } from "@iconify/react";
import { fechaNumerica } from "@/lib/fechas";
import { FRECUENCIAS, etiquetaRenovacion, pesos, type InfoPoliza } from "@/lib/chubb-reglas";
import { COLOR_NIVEL, Dato, Relleno } from "./piezas";

/** Todas las pólizas del filtro, con su vigencia, sus primas y cuántos recibos van pagados. */
export function VistaPolizas({ infos }: { infos: InfoPoliza[] }) {
  const lista = [...infos].sort((a, b) => a.dias_renovar - b.dias_renovar || a.p.asegurado.localeCompare(b.p.asegurado, "es"));
  if (!lista.length) {
    return <div className="glass rounded-2xl p-6 text-center text-sm text-ink-soft">Ninguna póliza coincide con estos filtros.</div>;
  }
  return (
    <ul className="space-y-2.5">
      {lista.map((i) => {
        const pct = Math.round((i.recibos_pagados / i.recibos_total) * 100);
        return (
          <li key={i.p.poliza} className="glass rounded-2xl p-3.5 sm:p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">
                  {i.p.asegurado}
                  {i.avisos.length > 0 && (
                    <span title={i.avisos.map((a) => a.texto).join("\n")} className="ml-2 inline-flex align-middle">
                      <Icon icon="flat-color-icons:medium-priority" width={16} aria-label="Tiene datos por revisar" />
                    </span>
                  )}
                </p>
                <p className="text-sm text-ink-soft">{i.p.vehiculo ?? "Sin descripción del vehículo"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Dato titulo="Número de póliza">{i.p.poliza}</Dato>
                  <Dato>{FRECUENCIAS[i.p.frecuencia].nombre}</Dato>
                  <Dato titulo="Vigencia">
                    {fechaNumerica(i.p.inicio)} → {fechaNumerica(i.p.fin)}
                  </Dato>
                  <span className="rounded-lg border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: COLOR_NIVEL[i.nivel], color: COLOR_NIVEL[i.nivel] }}>
                    Renueva {etiquetaRenovacion(i.dias_renovar)}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center gap-2.5 text-xs text-ink-mute">
                  <span className="h-2 w-28 shrink-0 overflow-hidden rounded-full bg-bg-3/80" aria-hidden>
                    <Relleno pct={pct} color="var(--green)" alto={8} />
                  </span>
                  <span>
                    {i.recibos_pagados} de {i.recibos_total} {i.recibos_total === 1 ? "recibo pagado" : "recibos pagados"}
                    {i.recibos.length > 0 && <> · {i.recibos.length} pendiente{i.recibos.length === 1 ? "" : "s"}</>}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-ink-mute">Prima neta</p>
                <p className="font-semibold text-ink">{i.p.prima_neta === null ? "—" : pesos(i.p.prima_neta)}</p>
                <p className="mt-1 text-xs text-ink-mute">Total {i.p.prima_total === null ? "—" : pesos(i.p.prima_total)}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
