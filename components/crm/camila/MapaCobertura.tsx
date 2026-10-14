"use client";

import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { fechaCorta } from "@/lib/fechas";
import { RAMOS } from "@/lib/ramos";
import { coberturaGlobal, esActivo, mapaDeCobertura, type EntradaCliente } from "@/lib/cruzada-reglas";

interface MapaCoberturaProps {
  entradas: EntradaCliente[];
  busca: string;
  onAbrir: (clienteId: string) => void;
}

/** Cada cliente contra los 5 ramos: qué tiene vigente, qué tuvo y qué nunca le has vendido (los huecos son tus oportunidades). */
export function MapaCobertura({ entradas, busca, onAbrir }: MapaCoberturaProps) {
  const [soloHuecos, setSoloHuecos] = useState(false);
  const global = useMemo(() => coberturaGlobal(entradas), [entradas]);
  const activos = entradas.filter((e) => esActivo(e.polizas));

  const filas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return activos
      .filter((e) => !q || e.cliente.nombre.toLowerCase().includes(q))
      .map((e) => ({ e, celdas: mapaDeCobertura(e.polizas) }))
      .filter((f) => !soloHuecos || f.celdas.some((c) => c.estado !== "vigente"))
      .sort((a, b) => a.e.cliente.nombre.localeCompare(b.e.cliente.nombre, "es"));
  }, [activos, busca, soloHuecos]);

  if (!activos.length) {
    return (
      <p className="glass rounded-2xl p-5 text-sm text-ink-soft">
        Aún no hay clientes con una póliza vigente. Cuando armes los expedientes, aquí verás qué tiene cada uno y qué le falta.
      </p>
    );
  }

  return (
    <section className="space-y-3" data-testid="mapa-cobertura">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-soft">
          Cada renglón es un cliente con póliza vigente. <span style={{ color: "var(--green)" }}>✓ lo tiene</span> ·{" "}
          <span style={{ color: "var(--amber)" }}>↺ lo tuvo</span> · <span className="text-ink-mute">— nunca lo ha tenido contigo</span>.
        </p>
        <label className="flex min-h-[40px] items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={soloHuecos} onChange={(e) => setSoloHuecos(e.target.checked)} />
          Solo los que les falta algo
        </label>
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="sticky left-0 z-10 bg-bg-2 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-mute">Cliente</th>
              {RAMOS.map((r) => {
                const gl = global.find((x) => x.ramo === r.id)!;
                return (
                  <th key={r.id} className="px-2 py-2.5 text-center">
                    <span className="flex flex-col items-center gap-0.5">
                      <Icon icon={r.icono} width={22} aria-hidden />
                      <span className="text-xs font-semibold text-ink">{r.corto}</span>
                      <span className="text-[11px] font-normal text-ink-mute">
                        {gl.tienen} de {activos.length}
                      </span>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filas.map(({ e, celdas }) => (
              <tr key={e.cliente.id} className="border-b border-line/60 last:border-0" data-testid="fila-cobertura">
                <th scope="row" className="sticky left-0 z-10 bg-bg-2 px-3 py-2 text-left font-medium">
                  <button type="button" onClick={() => onAbrir(e.cliente.id)} className="text-left text-ink hover:underline">
                    {e.cliente.nombre}
                  </button>
                  {e.cliente.no_ofrecer && <span className="ml-1.5 text-[11px] text-ink-mute">(no ofrecer)</span>}
                </th>
                {celdas.map((c) => (
                  <td key={c.ramo} className="px-2 py-2 text-center" data-ramo={c.ramo} data-estado={c.estado}>
                    {c.estado === "vigente" ? (
                      <span className="inline-flex flex-col items-center leading-tight" style={{ color: "var(--green)" }} title="Lo tiene vigente">
                        <span aria-label="Lo tiene vigente" className="text-base font-bold">
                          ✓
                        </span>
                        {c.renovacion && <span className="text-[11px] text-ink-mute">renueva {fechaCorta(c.renovacion)}</span>}
                      </span>
                    ) : c.estado === "tuvo" ? (
                      <span aria-label="Lo tuvo y ya no está vigente" title="Lo tuvo y ya no está vigente" className="text-base font-bold" style={{ color: "var(--amber)" }}>
                        ↺
                      </span>
                    ) : (
                      <span aria-label="No lo tiene" title="Nunca lo ha tenido contigo" className="text-ink-mute">
                        —
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={RAMOS.length + 1} className="px-3 py-6 text-center text-sm text-ink-mute">
                  Nadie coincide con ese filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-mute">
        Lo que viene de tus reportes de AXA se toma de sus pagos: «vigente» significa que sigue pagando al ritmo que le corresponde. Tus reportes de AXA no distinguen el
        ahorro de Vida, así que en Ahorro revisa antes de ofrecer.
      </p>
    </section>
  );
}
