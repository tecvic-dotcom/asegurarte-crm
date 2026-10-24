"use client";

import { Icon } from "@iconify/react";
import { FRECUENCIAS, MESES, ORDEN_FRECUENCIAS, SIN_FILTROS, hayFiltros, type FiltrosChubb, type FrecuenciaChubb } from "@/lib/chubb-reglas";

const CAMPO = "min-h-[40px] rounded-xl border border-line bg-glass px-3 text-sm text-ink";

/** Los filtros de Dana: por año y mes (de la emisión o de la renovación), frecuencia de pago, recibos y búsqueda. */
export function Filtros({
  filtros,
  onCambio,
  anios,
  meses,
  mostradas,
  total,
}: {
  filtros: FiltrosChubb;
  onCambio: (f: FiltrosChubb) => void;
  anios: number[];
  meses: number[];
  mostradas: number;
  total: number;
}) {
  const poner = (cambio: Partial<FiltrosChubb>) => onCambio({ ...filtros, ...cambio });
  return (
    <div className="glass space-y-2.5 rounded-2xl p-3 sm:p-4" role="group" aria-label="Filtros de Chubb Autos">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-line bg-glass p-1" role="group" aria-label="Qué fecha mirar">
          {(
            [
              ["emision", "Por emisión"],
              ["renovacion", "Por renovación"],
            ] as const
          ).map(([id, nombre]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filtros.ver === id}
              // Al cambiar de fecha, el año y el mes elegidos ya no significan lo mismo: se limpian.
              onClick={() => poner({ ver: id, anio: null, mes: null })}
              className={`min-h-[36px] rounded-lg px-3 text-sm ${filtros.ver === id ? "bg-brand/25 font-semibold text-ink" : "text-ink-mute hover:text-ink"}`}
              title={id === "emision" ? "El año y el mes en que se emitió la póliza (columnas Año y Mes emitida de tu Excel)" : "El año y el mes en que termina su vigencia"}
            >
              {nombre}
            </button>
          ))}
        </div>

        <select aria-label="Año" value={filtros.anio ?? ""} onChange={(e) => poner({ anio: e.target.value ? Number(e.target.value) : null })} className={CAMPO}>
          <option value="">Todos los años</option>
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select aria-label="Mes" value={filtros.mes ?? ""} onChange={(e) => poner({ mes: e.target.value ? Number(e.target.value) : null })} className={CAMPO}>
          <option value="">Todos los meses</option>
          {meses.map((m) => (
            <option key={m} value={m}>
              {MESES[m - 1][0].toUpperCase() + MESES[m - 1].slice(1)}
            </option>
          ))}
        </select>
        <select aria-label="Frecuencia de pago" value={filtros.frecuencia ?? ""} onChange={(e) => poner({ frecuencia: (e.target.value || null) as FrecuenciaChubb | null })} className={CAMPO}>
          <option value="">Todas las frecuencias</option>
          {ORDEN_FRECUENCIAS.map((f) => (
            <option key={f} value={f}>
              {FRECUENCIAS[f].nombre}
            </option>
          ))}
        </select>
        <select aria-label="Estado de los recibos" value={filtros.pagos ?? ""} onChange={(e) => poner({ pagos: (e.target.value || null) as FiltrosChubb["pagos"] })} className={CAMPO}>
          <option value="">Con o sin recibos pendientes</option>
          <option value="con_pendientes">Con recibos pendientes</option>
          <option value="al_corriente">Sin recibos pendientes</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-h-[40px] min-w-[14rem] flex-1 items-center gap-2 rounded-xl border border-line bg-glass px-3">
          <Icon icon="flat-color-icons:search" width={18} aria-hidden />
          <input
            value={filtros.busca}
            onChange={(e) => poner({ busca: e.target.value })}
            placeholder="Buscar por asegurado, póliza o vehículo…"
            aria-label="Buscar"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute"
          />
        </div>
        <p className="text-sm text-ink-soft" aria-live="polite">
          Mostrando <strong className="text-ink">{mostradas}</strong> de {total} pólizas
        </p>
        {hayFiltros(filtros) && (
          <button type="button" onClick={() => onCambio({ ...SIN_FILTROS, ver: filtros.ver })} className="min-h-[40px] px-2 text-sm text-ink-mute underline hover:text-ink">
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
