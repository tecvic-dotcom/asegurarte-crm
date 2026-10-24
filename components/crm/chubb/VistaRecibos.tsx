"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { fechaNumerica } from "@/lib/fechas";
import { FRECUENCIAS, etiquetaVencimiento, listaRecibos, pesos, type InfoPoliza, type VentanaRecibos } from "@/lib/chubb-reglas";
import { COLOR_RECIBO, Dato, Nota, PALABRA_RECIBO, Pastillas } from "./piezas";

/** Los recibos que siguen sin pagarse (pólizas que no son anuales), del más atrasado al más lejano. */
export function VistaRecibos({ infos }: { infos: InfoPoliza[] }) {
  const [ventana, setVentana] = useState<VentanaRecibos>(() => (listaRecibos(infos, "vencidos").length ? "vencidos" : "30"));
  const lista = listaRecibos(infos, ventana);
  const cuenta = (v: VentanaRecibos) => listaRecibos(infos, v).length;
  const importe = lista.reduce((s, r) => s + (r.importe ?? 0), 0);
  const polizas = new Set(lista.map((r) => r.info.p.poliza)).size;
  const calculados = lista.filter((r) => r.calculado).length;

  return (
    <div className="space-y-3">
      <Pastillas<VentanaRecibos>
        etiqueta="Qué recibos ver"
        valor={ventana}
        onCambio={setVentana}
        opciones={[
          { id: "vencidos", nombre: "Vencidos", cuenta: cuenta("vencidos"), tono: "var(--red)" },
          { id: "7", nombre: "Próximos 7 días", cuenta: cuenta("7") },
          { id: "30", nombre: "Próximos 30 días", cuenta: cuenta("30") },
          { id: "todos", nombre: "Todos", cuenta: cuenta("todos") },
        ]}
      />

      <p className="text-sm text-ink-soft">
        <strong className="text-ink">{lista.length}</strong> {lista.length === 1 ? "recibo" : "recibos"} en <strong className="text-ink">{polizas}</strong>{" "}
        {polizas === 1 ? "póliza" : "pólizas"} · ≈ <strong className="text-ink">{pesos(importe)}</strong>
      </p>

      {ventana === "vencidos" && lista.length > 0 && (
        <Nota tono="ojo">
          Estos recibos están «vencidos» porque su fecha sigue en la lista de pendientes de tu Excel. Si alguno ya se pagó, borra su fecha en el Excel y vuelve a cargarlo.
        </Nota>
      )}
      {calculados > 0 && (
        <Nota>
          {calculados} {calculados === 1 ? "fecha fue calculada" : "fechas fueron calculadas"} por Dana porque la póliza está «pendiente de pago» pero el Excel no trae las fechas de sus recibos
          (llevan la marca «fecha calculada»).
        </Nota>
      )}

      {lista.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-ink-soft">
          <Icon icon="flat-color-icons:ok" width={28} className="mx-auto mb-2" aria-hidden />
          No hay recibos en esta ventana.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {lista.map((r) => {
            const color = COLOR_RECIBO[r.estado];
            return (
              <li key={`${r.info.p.poliza}-${r.fecha}-${r.numero}`} className="glass rounded-2xl p-3.5 sm:p-4">
                {/* Celular: la fecha va como una franja arriba y el texto usa todo el ancho. Escritorio: cuadro a la izquierda. */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                  <div
                    className="flex flex-wrap items-baseline gap-x-2 self-start rounded-xl border px-2.5 py-1 sm:block sm:w-[5.5rem] sm:shrink-0 sm:self-auto sm:px-1.5 sm:py-1.5 sm:text-center"
                    style={{ borderColor: color }}
                  >
                    <p className="text-[11px] font-semibold leading-tight" style={{ color }}>
                      {PALABRA_RECIBO[r.estado]}
                    </p>
                    <p className="text-sm font-bold leading-tight text-ink sm:mt-1">{fechaNumerica(r.fecha)}</p>
                    <p className="text-[11px] leading-tight text-ink-mute sm:mt-0.5">{etiquetaVencimiento(r.dias)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 font-semibold text-ink">{r.info.p.asegurado}</p>
                      <p className="shrink-0 text-right font-semibold text-ink" title="Importe aproximado de este recibo">
                        {r.importe === null ? "—" : `≈ ${pesos(Math.round(r.importe * 100) / 100)}`}
                      </p>
                    </div>
                    <p className="text-sm text-ink-soft">{r.info.p.vehiculo ?? "Sin descripción del vehículo"}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Dato titulo="Número de recibo">
                        Recibo {r.numero} de {r.de}
                      </Dato>
                      <Dato titulo="Número de póliza">{r.info.p.poliza}</Dato>
                      <Dato>{FRECUENCIAS[r.info.p.frecuencia].nombre}</Dato>
                      {r.calculado && <Dato titulo="El Excel no traía esta fecha: Dana la calculó con el calendario de pagos">fecha calculada</Dato>}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Nota>El importe es aproximado: la prima total se reparte parejo entre los recibos. El primero suele ser un poco mayor porque lleva el derecho de póliza.</Nota>
    </div>
  );
}
