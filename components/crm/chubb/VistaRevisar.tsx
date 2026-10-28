"use client";

import { Icon } from "@iconify/react";
import { TITULO_AVISO, type CodigoAviso, type InfoPoliza } from "@/lib/chubb-reglas";

/** Cómo arreglar cada cosa que no cuadra, en el propio Excel. */
const COMO_ARREGLAR: Record<CodigoAviso, string> = {
  sin_vehiculo: "Escribe la descripción del vehículo en la columna «Vehiculo» de esa póliza.",
  sin_prima: "Llena «Prima neta» y «Prima Total» con los montos de la carátula de la póliza.",
  prima_incoherente: "Revisa que no estén cambiadas la prima neta y la prima total.",
  sin_fechas: "En esa fila, escribe en «Siguiente recibo» (y las columnas de su derecha) la fecha de cada recibo; píntalos de verde si ya se pagaron y de amarillo si faltan.",
  pagada_con_pendientes: "Si ya está pagada, pinta sus recibos de verde; si no, cambia su estatus a «PENDIENTE DE PAGO».",
  fechas_de_mas: "Esa póliza no puede tener más fechas pendientes que recibos: borra las que ya se pagaron.",
  recibos_no_cuadran: "Una póliza mensual lleva 12 recibos, una trimestral 4 y una semestral 2: revisa que no falte ni sobre alguno y que cada uno tenga su color.",
  pendiente_sin_amarillos: "Si todavía falta un pago, pinta de amarillo el recibo que falta; si ya está pagada, cambia su estatus a «PAGADA».",
  fecha_fuera_calendario: "Corrige la fecha: debe caer en el mes y día de pago que le toca según el inicio de su vigencia.",
  vigencia_rara: "Revisa las fechas de «Inicio Vigencia» y «Fin Vigencia»: una póliza dura un año.",
  anual_con_fechas: "Las pólizas anuales no llevan fechas de recibos: bórralas o corrige su frecuencia de pago.",
};

/** Lo que no cuadra en tu Excel (para que los números de Dana sean confiables). */
export function VistaRevisar({ infos }: { infos: InfoPoliza[] }) {
  const grupos = (Object.keys(TITULO_AVISO) as CodigoAviso[])
    .map((codigo) => ({
      codigo,
      items: infos.flatMap((i) => i.avisos.filter((a) => a.codigo === codigo).map((a) => ({ i, texto: a.texto }))),
    }))
    .filter((g) => g.items.length > 0);

  if (!grupos.length) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-sm text-ink-soft">
        <Icon icon="flat-color-icons:ok" width={28} className="mx-auto mb-2" aria-hidden />
        Todo cuadra: no encontré datos raros en tu Excel.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        Dana revisó tu Excel renglón por renglón. Esto es lo que no cuadra; arréglalo en el Excel, vuelve a cargarlo y esta lista se limpia sola.
      </p>
      {grupos.map((g) => (
        <section key={g.codigo} className="glass rounded-2xl p-4 sm:p-5">
          <h3 className="flex items-center gap-2 font-semibold text-ink">
            <Icon icon="flat-color-icons:medium-priority" width={20} aria-hidden /> {TITULO_AVISO[g.codigo]}
            <span className="rounded-full bg-bg-3 px-2 py-0.5 text-xs font-semibold text-ink-soft">{g.items.length}</span>
          </h3>
          <p className="mt-1 text-xs text-ink-mute">{COMO_ARREGLAR[g.codigo]}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {g.items.map(({ i, texto }) => (
              <li key={`${i.p.poliza}-${g.codigo}`} className="rounded-xl border border-line bg-bg-3/40 px-3 py-2">
                <p className="font-medium text-ink">
                  {i.p.asegurado} <span className="font-normal text-ink-mute">· {i.p.poliza}</span>
                </p>
                <p className="text-ink-soft">{texto}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
