"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { fechaNumerica } from "@/lib/fechas";
import { FRECUENCIAS, etiquetaMes, etiquetaRenovacion, pesos, pesosCortos, type FrecuenciaChubb, type InfoPoliza, type ResumenChubb } from "@/lib/chubb-reglas";
import { DesgloseFrecuencia } from "./DesgloseFrecuencia";
import { BarraFila, Indicador, Nota, Relleno, type VistaDana } from "./piezas";

/** El tablero de indicadores: producción, lo pagado, las renovaciones que vienen y los recibos sin pagar. */
export function VistaResumen({
  r,
  filtradas,
  hoy,
  onIr,
  onVerFrecuencia,
}: {
  r: ResumenChubb;
  filtradas: InfoPoliza[];
  hoy: string;
  onIr: (v: VistaDana) => void;
  /** Filtra por esa frecuencia de pago y abre la pestaña Pólizas. */
  onVerFrecuencia: (f: FrecuenciaChubb) => void;
}) {
  // La frecuencia de pago cuyo desglose está abierto (tocar otra vez la cierra).
  const [abierta, setAbierta] = useState<FrecuenciaChubb | null>(null);
  const ren = r.renovaciones;
  const rc = r.recibos;
  const conAvisos = filtradas.filter((i) => i.avisos.length > 0).length;
  const proxima = ren.proxima;
  const mesActual = hoy.slice(0, 7);
  const venideras = r.por_mes_renovacion.filter((m) => m.clave >= mesActual).slice(0, 12);
  const yaPasadas = r.por_mes_renovacion.filter((m) => m.clave < mesActual).reduce((s, m) => s + m.polizas, 0);
  const maxRen = Math.max(0, ...venideras.map((m) => m.neta));
  const maxEmi = Math.max(0, ...r.por_mes_emision.map((m) => m.neta));
  const maxFrec = Math.max(0, ...r.por_frecuencia.map((f) => f.neta));
  const maxCli = Math.max(0, ...r.top_clientes.map((c) => c.neta));
  const rojo = "var(--red)";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Indicador
          titulo="Pólizas"
          icono="flat-color-icons:automotive"
          valor={String(r.polizas)}
          detalle={`${r.vigentes} vigentes${r.vencidas ? ` · ${r.vencidas} ya terminaron` : ""}`}
          onClick={() => onIr("polizas")}
        />
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
          detalle={`En ${rc.polizas_con_pendientes} pólizas · ≈ ${pesos(rc.importe_pendiente)}`}
          onClick={() => onIr("recibos")}
        />
        <Indicador
          titulo="Próxima renovación"
          icono="flat-color-icons:calendar"
          valor={proxima ? etiquetaRenovacion(proxima.dias).replace(/^en /, "") : "—"}
          detalle={proxima ? `${fechaNumerica(proxima.fecha)} · ${proxima.asegurado}` : "No hay renovaciones por venir"}
          onClick={() => onIr("renovaciones")}
        />
        <Indicador
          titulo="Renovaciones en 30 días"
          icono="flat-color-icons:alarm-clock"
          valor={String(ren.d30.n)}
          tono={ren.d30.n > 0 ? rojo : undefined}
          detalle={`60 días: ${ren.d60.n} · 90 días: ${ren.d90.n}${ren.vencidas.n ? ` · ya terminaron: ${ren.vencidas.n}` : ""}`}
          onClick={() => onIr("renovaciones")}
        />
        <Indicador
          titulo="Recibos vencidos"
          icono="flat-color-icons:high-priority"
          valor={String(rc.vencidos.n)}
          tono={rc.vencidos.n > 0 ? rojo : undefined}
          detalle={`≈ ${pesos(rc.vencidos.importe)} · próximos 7 días: ${rc.d7.n}`}
          onClick={() => onIr("recibos")}
        />
        <Indicador
          titulo="Por revisar en el Excel"
          icono="flat-color-icons:info"
          valor={String(conAvisos)}
          tono={conAvisos > 0 ? "var(--amber)" : undefined}
          detalle={conAvisos ? "pólizas con datos que no cuadran" : "Todo cuadra"}
          onClick={() => onIr("revisar")}
        />
      </div>

      {rc.vencidos.n > 0 && (
        <Nota tono="ojo">
          <strong className="text-ink">{rc.vencidos.n} recibos aparecen vencidos</strong> porque su fecha sigue en la lista de pendientes de tu Excel. Si ya se pagaron, borra esa fecha en el Excel y
          vuelve a cargarlo: Dana los contará como pagados.
        </Nota>
      )}

      <section className="glass rounded-2xl p-4 sm:p-5">
        <h3 className="flex items-center gap-2 font-semibold text-ink">
          <Icon icon="flat-color-icons:bullish" width={20} aria-hidden /> Cómo va la prima neta
        </h3>
        <div className="mt-3 flex h-5 overflow-hidden rounded-full bg-bg-3/80" role="img" aria-label={`${r.pct_pagado}% de la prima neta está pagada`}>
          <Relleno pct={r.pct_pagado} color="var(--green)" alto={20} />
          <Relleno pct={r.neta_por_cobrar > 0 ? 100 - r.pct_pagado : 0} color="var(--amber)" alto={20} />
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
          <span className="text-ink-soft">
            <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: "var(--green)" }} aria-hidden />
            Pagada: <strong className="text-ink">{pesos(r.neta_pagada)}</strong> ({r.pct_pagado}%)
          </span>
          <span className="text-ink-soft">
            <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: "var(--amber)" }} aria-hidden />
            Por cobrar: <strong className="text-ink">{pesos(r.neta_por_cobrar)}</strong>
          </span>
          <span className="text-ink-mute">Prima neta promedio por póliza: {pesos(r.neta_promedio)}</span>
        </div>
        <p className="mt-2 text-xs text-ink-mute">
          Estimado: la prima se reparte parejo entre los recibos y un recibo cuenta como pagado cuando su fecha ya no está en tu lista de pendientes.
        </p>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="glass rounded-2xl p-4 sm:p-5">
          <h3 className="flex items-center gap-2 font-semibold text-ink">
            <Icon icon="flat-color-icons:calendar" width={20} aria-hidden /> Renovaciones por mes
          </h3>
          <p className="mt-0.5 text-xs text-ink-mute">Cuándo termina la vigencia de cada póliza (prima neta que se renueva).</p>
          {venideras.length ? (
            <ul className="mt-3 space-y-2.5">
              {venideras.map((m) => (
                <BarraFila
                  key={m.clave}
                  etiqueta={etiquetaMes(m.clave)}
                  valor={m.neta}
                  maximo={maxRen}
                  color={m.clave === mesActual ? "var(--red)" : "var(--brand-2)"}
                  texto={
                    <>
                      <strong className="text-ink">{m.polizas}</strong> {m.polizas === 1 ? "póliza" : "pólizas"} · {pesosCortos(m.neta)}
                    </>
                  }
                />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-mute">No hay renovaciones por venir con estos filtros.</p>
          )}
          {yaPasadas > 0 && (
            <p className="mt-2 text-xs text-ink-mute">
              Además, {yaPasadas} {yaPasadas === 1 ? "póliza ya terminó" : "pólizas ya terminaron"} su vigencia.
            </p>
          )}
        </section>

        <section className="glass rounded-2xl p-4 sm:p-5">
          <h3 className="flex items-center gap-2 font-semibold text-ink">
            <Icon icon="flat-color-icons:statistics" width={20} aria-hidden /> Pólizas emitidas por mes
          </h3>
          <p className="mt-0.5 text-xs text-ink-mute">Producción de cada mes de emisión (prima neta).</p>
          <ul className="mt-3 space-y-2.5">
            {r.por_mes_emision.map((m) => (
              <BarraFila
                key={m.clave}
                etiqueta={etiquetaMes(m.clave)}
                valor={m.neta}
                maximo={maxEmi}
                color="var(--green)"
                texto={
                  <>
                    <strong className="text-ink">{m.polizas}</strong> {m.polizas === 1 ? "póliza" : "pólizas"} · {pesosCortos(m.neta)}
                  </>
                }
              />
            ))}
          </ul>
        </section>

        <section className={`glass rounded-2xl p-4 sm:p-5 ${abierta && r.por_frecuencia.some((f) => f.frecuencia === abierta && f.polizas > 0) ? "lg:col-span-2" : ""}`}>
          <h3 className="flex items-center gap-2 font-semibold text-ink">
            <Icon icon="flat-color-icons:data-sheet" width={20} aria-hidden /> Por frecuencia de pago
          </h3>
          <p className="mt-0.5 text-xs text-ink-mute">Toca una frecuencia para ver su desglose y sus pólizas.</p>
          <ul className="mt-3 space-y-2.5">
            {r.por_frecuencia.map((f) => (
              <BarraFila
                key={f.frecuencia}
                etiqueta={FRECUENCIAS[f.frecuencia].nombre}
                valor={f.neta}
                maximo={maxFrec}
                color="var(--violet)"
                onClick={f.polizas > 0 ? () => setAbierta(abierta === f.frecuencia ? null : f.frecuencia) : undefined}
                abierta={abierta === f.frecuencia && f.polizas > 0}
                texto={
                  <>
                    <strong className="text-ink">{f.polizas}</strong> {f.polizas === 1 ? "póliza" : "pólizas"} · {pesosCortos(f.neta)}
                    {f.con_pendientes > 0 && <> · {f.con_pendientes} con recibos pendientes</>}
                  </>
                }
              >
                <DesgloseFrecuencia
                  frecuencia={f.frecuencia}
                  infos={filtradas.filter((i) => i.p.frecuencia === f.frecuencia)}
                  totalPolizas={filtradas.length}
                  onVerPolizas={() => onVerFrecuencia(f.frecuencia)}
                />
              </BarraFila>
            ))}
          </ul>
        </section>

        <section className="glass rounded-2xl p-4 sm:p-5">
          <h3 className="flex items-center gap-2 font-semibold text-ink">
            <Icon icon="flat-color-icons:business-contact" width={20} aria-hidden /> Clientes con más prima neta
          </h3>
          <ul className="mt-3 space-y-2.5">
            {r.top_clientes.map((c) => (
              <BarraFila
                key={c.nombre}
                etiqueta={c.nombre}
                anchoEtiqueta="15rem"
                valor={c.neta}
                maximo={maxCli}
                color="var(--sky)"
                texto={
                  <>
                    <strong className="text-ink">{c.polizas}</strong> {c.polizas === 1 ? "póliza" : "pólizas"} · {pesosCortos(c.neta)}
                  </>
                }
              />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
