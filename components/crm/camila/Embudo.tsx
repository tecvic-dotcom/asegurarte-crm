"use client";

import { Icon } from "@iconify/react";
import { moneda } from "@/lib/crm-data";
import { infoRamo, RAMOS } from "@/lib/ramos";
import type { Embudo as DatosEmbudo, EtapaEmbudo } from "@/lib/cruzada-momentos";

const COLOR: Record<EtapaEmbudo, string> = {
  identificada: "var(--sky)",
  contactada: "var(--violet)",
  cotizada: "var(--amber)",
  cerrada: "var(--green)",
  no_interesa: "var(--ink-mute)",
};

interface EmbudoProps {
  embudo: DatosEmbudo;
  onAbrir: (clienteId: string) => void;
}

/** El embudo de la venta cruzada: aparte del de prospectos, con sus propias cifras (pólizas por cliente, prima por cliente, conversión). */
export function Embudo({ embudo, onAbrir }: EmbudoProps) {
  const m = embudo.metricas;
  return (
    <section className="space-y-4" data-testid="embudo">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Medida id="polizas-cliente" titulo="Pólizas por cliente" valor={String(m.polizasPorCliente)} nota="pólizas vigentes entre clientes activos" />
        <Medida id="multiramo" titulo="Con 2 o más seguros" valor={`${m.clientesMultiramo}%`} nota="de tus clientes activos" />
        <Medida id="prima-cliente" titulo="Prima por cliente" valor={m.primaPorCliente === null ? "—" : moneda(m.primaPorCliente)} nota="al año, solo pólizas de Valeri con prima" />
        <Medida
          id="conversion"
          titulo="Conversión (90 días)"
          valor={m.conversion90 === null ? "—" : `${m.conversion90}%`}
          nota={`${m.cerradas90} ${m.cerradas90 === 1 ? "venta" : "ventas"} de ${Math.max(m.ofertas90, m.cerradas90)} ${Math.max(m.ofertas90, m.cerradas90) === 1 ? "oferta" : "ofertas"}`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {embudo.columnas.map((c) => (
          <div key={c.id} data-testid={`embudo-${c.id}`} className="glass flex min-w-0 flex-col rounded-2xl p-3 sm:p-4" style={{ borderColor: `color-mix(in srgb, ${COLOR[c.id]} 35%, transparent)` }}>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">{c.nombre}</h3>
              <span className="text-xl font-bold" style={{ color: c.total ? COLOR[c.id] : "var(--ink-mute)" }} data-testid={`embudo-total-${c.id}`}>
                {c.total}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-ink-mute">{c.ayuda}</p>
            <ul className="mt-2 space-y-1.5">
              {c.items.map((it) => (
                <li key={`${it.cliente_id}-${it.ramo}`}>
                  <button type="button" onClick={() => onAbrir(it.cliente_id)} className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-line px-2 py-1.5 text-left hover:border-brand-2">
                    <Icon icon={infoRamo(it.ramo).icono} width={16} className="shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-xs text-ink">{it.nombre}</span>
                    {it.dias !== null && <span className="shrink-0 text-[11px] text-ink-mute">{it.dias === 0 ? "hoy" : `${it.dias} d`}</span>}
                  </button>
                </li>
              ))}
              {c.items.length === 0 && <li className="py-2 text-center text-xs text-ink-mute">Nada por aquí.</li>}
            </ul>
            {c.total > c.items.length && <p className="mt-2 text-[11px] text-ink-mute">y {c.total - c.items.length} más</p>}
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-4 text-sm text-ink-soft">
        <p className="font-semibold text-ink">Ventas cruzadas cerradas en los últimos 90 días</p>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {RAMOS.map((r) => (
            <span key={r.id} className="inline-flex items-center gap-1">
              <Icon icon={r.icono} width={16} aria-hidden /> {r.corto}: <strong className="text-ink">{m.cerradasPorRamo[r.id]}</strong>
            </span>
          ))}
        </p>
        <p className="mt-2 text-xs text-ink-mute">
          Cada «Lo contrató» suma a tu meta de 20 pólizas por ramo: si la cotización dejó un prospecto abierto, pasa a Cliente ganado; si el cliente ya tenía un prospecto ganado, la venta se
          suma al Panel desde este registro, sin contarse dos veces.
        </p>
      </div>
    </section>
  );
}

function Medida({ id, titulo, valor, nota }: { id: string; titulo: string; valor: string; nota: string }) {
  return (
    <div className="glass flex min-h-[104px] min-w-0 flex-col rounded-2xl p-3.5 sm:p-4" data-testid={`medida-${id}`}>
      <span className="text-[13px] font-semibold text-ink-soft">{titulo}</span>
      <span className="mt-1 text-[26px] font-bold leading-tight text-ink">{valor}</span>
      <span className="mt-auto pt-1 text-xs text-ink-mute">{nota}</span>
    </div>
  );
}
