"use client";

import { Icon } from "@iconify/react";
import { fechaNumerica } from "@/lib/fechas";
import { FRECUENCIAS, etiquetaRenovacion, etiquetaVencimiento, pesos, porcentaje, resumenChubb, type FrecuenciaChubb, type InfoPoliza } from "@/lib/chubb-reglas";
import { COLOR_NIVEL, COLOR_RECIBO, Dato, Indicador } from "./piezas";

/** El desglose de una frecuencia de pago: sus totales y cada una de sus pólizas con su siguiente recibo. */
export function DesgloseFrecuencia({
  frecuencia,
  infos,
  totalPolizas,
  onVerPolizas,
}: {
  frecuencia: FrecuenciaChubb;
  /** Solo las pólizas de esta frecuencia (ya con los filtros puestos). */
  infos: InfoPoliza[];
  /** Cuántas pólizas hay en total con los filtros puestos (para el porcentaje). */
  totalPolizas: number;
  onVerPolizas: () => void;
}) {
  const cfg = FRECUENCIAS[frecuencia];
  const lista = [...infos].sort((a, b) => a.dias_renovar - b.dias_renovar || a.p.asegurado.localeCompare(b.p.asegurado, "es"));
  const r = resumenChubb(lista);
  const rc = r.recibos;

  return (
    <div className="mb-3 mt-2 rounded-2xl border border-line bg-bg-3/20 p-3 sm:p-4" data-testid={`desglose-${frecuencia}`}>
      <p className="text-sm text-ink-soft">
        <strong className="text-ink">{cfg.nombre}</strong>: {cfg.recibos === 1 ? "un solo pago al año" : `${cfg.recibos} recibos al año, uno cada ${cfg.meses} ${cfg.meses === 1 ? "mes" : "meses"}`}.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Indicador titulo="Pólizas" icono="flat-color-icons:automotive" valor={String(r.polizas)} detalle={`${porcentaje(r.polizas, totalPolizas)}% de tus pólizas`} />
        <Indicador titulo="Prima neta" icono="flat-color-icons:money-transfer" valor={pesos(r.prima_neta)} detalle={`Prima total ${pesos(r.prima_total)}`} />
        <Indicador
          titulo="Prima neta pagada"
          icono="flat-color-icons:ok"
          valor={pesos(r.neta_pagada)}
          detalle={`${r.pct_pagado}% pagado · por cobrar ${pesos(r.neta_por_cobrar)}`}
        />
        <Indicador
          titulo="Recibos pendientes"
          icono="flat-color-icons:overtime"
          valor={String(rc.pendientes)}
          tono={rc.vencidos.n > 0 ? "var(--red)" : undefined}
          detalle={rc.pendientes ? `${rc.vencidos.n} vencidos · ≈ ${pesos(rc.importe_pendiente)}` : "Todos pagados"}
        />
      </div>

      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg-3/30">
        {lista.map((i) => {
          const siguiente = i.recibos[0];
          return (
            <li key={i.p.poliza} className="px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{i.p.asegurado}</p>
                  <p className="text-xs text-ink-soft">{i.p.vehiculo ?? "Sin descripción del vehículo"}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-ink" title="Prima neta">
                    {i.p.prima_neta === null ? "—" : pesos(i.p.prima_neta)}
                  </p>
                  <p className="text-xs text-ink-mute" title="Prima total">
                    Total {i.p.prima_total === null ? "—" : pesos(i.p.prima_total)}
                  </p>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Dato titulo="Número de póliza">{i.p.poliza}</Dato>
                <span className="rounded-lg border px-2 py-0.5 text-xs" style={{ borderColor: COLOR_NIVEL[i.nivel], color: COLOR_NIVEL[i.nivel] }} title="Fin de vigencia">
                  Renueva {fechaNumerica(i.p.fin)} ({etiquetaRenovacion(i.dias_renovar)})
                </span>
                {frecuencia === "anual" ? (
                  <Dato>{i.recibos.length ? "Pendiente de pago" : "Pagada"}</Dato>
                ) : (
                  <Dato>
                    {i.recibos_pagados} de {i.recibos_total} recibos pagados
                  </Dato>
                )}
                {siguiente && (
                  <span
                    className="rounded-lg border px-2 py-0.5 text-xs font-semibold"
                    style={{ borderColor: COLOR_RECIBO[siguiente.estado], color: COLOR_RECIBO[siguiente.estado] }}
                    title={siguiente.calculado ? "El Excel no traía esta fecha: Dana la calculó con el calendario de pagos" : undefined}
                  >
                    Recibo {siguiente.numero}: {fechaNumerica(siguiente.fecha)} · {etiquetaVencimiento(siguiente.dias)}
                    {siguiente.calculado ? " (calculada)" : ""}
                  </span>
                )}
                {i.recibos.length > 1 && <Dato>{i.recibos.length} recibos pendientes</Dato>}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3">
        <button type="button" onClick={onVerPolizas} className="btn-ghost px-3 py-2 text-sm">
          <Icon icon="flat-color-icons:list" width={18} aria-hidden /> Ver estas {lista.length} pólizas en la pestaña Pólizas
        </button>
      </div>
    </div>
  );
}
