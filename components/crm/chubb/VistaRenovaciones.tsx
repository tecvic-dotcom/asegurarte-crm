"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { fechaNumerica } from "@/lib/fechas";
import { FRECUENCIAS, etiquetaRenovacion, listaRenovaciones, pesos, type InfoPoliza, type VentanaRenovacion } from "@/lib/chubb-reglas";
import { COLOR_NIVEL, Dato, Nota, PALABRA_NIVEL, Pastillas } from "./piezas";

/** Las pólizas que se van a renovar, de la que vence primero a la última, con cuántos días faltan. */
export function VistaRenovaciones({ infos }: { infos: InfoPoliza[] }) {
  const [ventana, setVentana] = useState<VentanaRenovacion>("90");
  const lista = listaRenovaciones(infos, ventana);
  const cuenta = (v: VentanaRenovacion) => listaRenovaciones(infos, v).length;
  const neta = lista.reduce((s, i) => s + (i.p.prima_neta ?? 0), 0);
  const total = lista.reduce((s, i) => s + (i.p.prima_total ?? 0), 0);

  return (
    <div className="space-y-3">
      <Pastillas<VentanaRenovacion>
        etiqueta="Qué renovaciones ver"
        valor={ventana}
        onCambio={setVentana}
        opciones={[
          { id: "vencidas", nombre: "Ya terminaron", cuenta: cuenta("vencidas"), tono: "var(--red)" },
          { id: "30", nombre: "30 días", cuenta: cuenta("30"), tono: "var(--red)" },
          { id: "60", nombre: "60 días", cuenta: cuenta("60") },
          { id: "90", nombre: "90 días", cuenta: cuenta("90") },
          { id: "todas", nombre: "Todas", cuenta: cuenta("todas") },
        ]}
      />

      <p className="text-sm text-ink-soft">
        <strong className="text-ink">{lista.length}</strong> {lista.length === 1 ? "póliza" : "pólizas"} · prima neta <strong className="text-ink">{pesos(neta)}</strong> · prima total que se
        renueva <strong className="text-ink">{pesos(total)}</strong>
      </p>

      {lista.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-ink-soft">
          <Icon icon="flat-color-icons:ok" width={28} className="mx-auto mb-2" aria-hidden />
          {ventana === "vencidas" ? "Ninguna póliza ha terminado su vigencia." : "No hay renovaciones en esta ventana."}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {lista.map((i) => {
            const color = COLOR_NIVEL[i.nivel];
            const dias = Math.abs(i.dias_renovar);
            return (
              <li key={i.p.poliza} className="glass rounded-2xl p-3.5 sm:p-4">
                {/* Celular: los días van como una franja arriba y el texto usa todo el ancho. Escritorio: cuadro a la izquierda. */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                  <div
                    className="flex flex-wrap items-baseline gap-x-2 self-start rounded-xl border px-2.5 py-1 sm:block sm:w-[4.75rem] sm:shrink-0 sm:self-auto sm:px-1.5 sm:py-1.5 sm:text-center"
                    style={{ borderColor: color }}
                  >
                    <p className="text-xl font-bold leading-none" style={{ color }}>
                      {dias}
                    </p>
                    <p className="text-[11px] leading-tight text-ink-mute sm:mt-0.5">{i.dias_renovar < 0 ? (dias === 1 ? "día de atraso" : "días de atraso") : dias === 1 ? "día" : "días"}</p>
                    <p className="text-[11px] font-semibold leading-tight sm:mt-1" style={{ color }}>
                      {PALABRA_NIVEL[i.nivel]}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 font-semibold text-ink">{i.p.asegurado}</p>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold text-ink" title="Prima total de la póliza actual">
                          {i.p.prima_total === null ? "—" : pesos(i.p.prima_total)}
                        </p>
                        <p className="text-xs text-ink-mute" title="Prima neta de la póliza actual">
                          Neta {i.p.prima_neta === null ? "—" : pesos(i.p.prima_neta)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-ink-soft">{i.p.vehiculo ?? "Sin descripción del vehículo"}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Dato titulo="Número de póliza">{i.p.poliza}</Dato>
                      <Dato titulo="Fin de vigencia">
                        Termina {fechaNumerica(i.p.fin)} ({etiquetaRenovacion(i.dias_renovar)})
                      </Dato>
                      <Dato>{FRECUENCIAS[i.p.frecuencia].nombre}</Dato>
                      {i.recibos.length > 0 && (
                        <Dato titulo="Recibos que aún no se pagan">
                          {i.recibos.length} {i.recibos.length === 1 ? "recibo pendiente" : "recibos pendientes"}
                        </Dato>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Nota>La prima de la renovación puede cambiar: la de aquí es la de la póliza actual, como referencia para platicar con tu cliente.</Nota>
    </div>
  );
}
