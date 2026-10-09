"use client";

import { Icon } from "@iconify/react";
import { fechaCorta, fechaLarga, fechaLocal, hoyLocal } from "@/lib/fechas";
import {
  celdaPagos,
  estaVencida,
  ETIQUETA_ESTADO,
  filasComparativa,
  formatoDinero,
  masEconomica,
  type Cotizacion,
  type EstadoCotizacion,
  type GrupoCotizaciones,
} from "@/lib/cotizaciones-reglas";

const COLOR_ESTADO: Record<EstadoCotizacion, string> = {
  guardada: "var(--ink-mute)",
  enviada: "var(--sky)",
  elegida: "var(--green)",
  descartada: "var(--ink-mute)",
};

export function ChipEstado({ estado, titulo }: { estado: EstadoCotizacion; titulo?: string }) {
  const color = COLOR_ESTADO[estado];
  return (
    <span
      title={titulo}
      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
    >
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

interface TablaComparativaProps {
  grupo: GrupoCotizaciones;
  seleccion: Set<string>;
  /** Las que tienen un cambio en curso (para no darle doble clic). */
  ocupadas: Set<string>;
  onAlternar: (id: string, marcada: boolean) => void;
  /** Marca todas las opciones activas del ramo, o las quita si ya estaban todas marcadas. */
  onAlternarTodas: (ids: string[]) => void;
  onNueva: () => void;
  onEditar: (c: Cotizacion) => void;
  onDuplicar: (c: Cotizacion) => void;
  onEstado: (c: Cotizacion, estado: EstadoCotizacion) => void;
}

/** Las opciones de un ramo, lado a lado: precio, coberturas y qué hacer con cada una. */
export function TablaComparativa({ grupo, seleccion, ocupadas, onAlternar, onAlternarTodas, onNueva, onEditar, onDuplicar, onEstado }: TablaComparativaProps) {
  const { ramo, items } = grupo;
  const hoy = hoyLocal();
  const activas = items.filter((c) => c.estado !== "descartada");
  const economica = masEconomica(activas);
  const filas = filasComparativa(items, ramo);
  const hayPagos = items.some((c) => celdaPagos(c));
  const hayVigencia = items.some((c) => c.vigencia_hasta);
  const hayEnvio = items.some((c) => c.enviada_en);
  const hayNotas = items.some((c) => c.notas);
  const todasMarcadas = activas.length > 0 && activas.every((c) => seleccion.has(c.id));

  const fila = (etiqueta: string, celda: (c: Cotizacion) => React.ReactNode) => (
    <tr key={etiqueta} className="border-t border-line">
      <th scope="row" className="sticky left-0 z-10 w-32 min-w-32 bg-bg-2 px-3 py-2 text-left align-top text-xs font-medium text-ink-mute">
        {etiqueta}
      </th>
      {items.map((c) => (
        <td key={c.id} className={`min-w-44 px-3 py-2 align-top text-sm text-ink-soft ${c.estado === "descartada" ? "opacity-60" : ""}`}>
          {celda(c) || <span className="text-ink-mute">—</span>}
        </td>
      ))}
    </tr>
  );

  return (
    <section aria-label={ramo.nombre}>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Icon icon={ramo.icono} width={24} aria-hidden /> {ramo.nombre}
          <span className="rounded-full bg-bg-3 px-2 py-0.5 text-xs font-normal text-ink-mute">{items.length}</span>
        </h2>
        <div className="ml-auto flex flex-wrap gap-2">
          {activas.length > 1 && (
            <button type="button" onClick={() => onAlternarTodas(activas.map((c) => c.id))} className="btn-ghost text-xs" style={{ padding: "0.5rem 0.9rem" }}>
              {todasMarcadas ? "Quitar todas del mensaje" : "Incluir todas en el mensaje"}
            </button>
          )}
          <button type="button" onClick={onNueva} className="btn-ghost text-xs" style={{ padding: "0.5rem 0.9rem" }}>
            <Icon icon="flat-color-icons:plus" width={16} aria-hidden /> Otra opción de {ramo.corto}
          </button>
        </div>
      </div>

      <div className="no-scrollbar overflow-x-auto rounded-2xl border border-line bg-bg-2/40">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-32 min-w-32 bg-bg-2 px-3 py-3 text-left align-top text-xs font-medium text-ink-mute">
                Opción
              </th>
              {items.map((c) => {
                const marcada = seleccion.has(c.id);
                return (
                  <th
                    key={c.id}
                    scope="col"
                    className={`min-w-44 px-3 py-3 text-left align-top font-normal ${c.estado === "descartada" ? "opacity-60" : ""}`}
                    style={c.estado === "elegida" ? { background: "color-mix(in srgb, var(--green) 9%, transparent)" } : undefined}
                  >
                    <label className={`flex items-start gap-2 ${c.estado === "descartada" ? "" : "cursor-pointer"}`}>
                      {c.estado !== "descartada" && (
                        <input
                          type="checkbox"
                          checked={marcada}
                          onChange={(e) => onAlternar(c.id, e.target.checked)}
                          aria-label={`Incluir en el mensaje: ${c.aseguradora}${c.plan ? ` ${c.plan}` : ""}`}
                          className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand-2)]"
                        />
                      )}
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-semibold text-ink">{c.aseguradora}</span>
                        {c.plan && <span className="block break-words text-xs text-ink-mute">{c.plan}</span>}
                      </span>
                    </label>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <ChipEstado estado={c.estado} titulo={c.enviada_en ? `Enviada el ${fechaCorta(fechaLocal(c.enviada_en))}` : undefined} />
                      {estaVencida(c, hoy) && (
                        <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: "color-mix(in srgb, var(--amber) 16%, transparent)", color: "var(--amber)" }}>
                          <Icon icon="flat-color-icons:high-priority" width={14} aria-hidden /> Vencida
                        </span>
                      )}
                      {economica === c.id && (
                        <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: "color-mix(in srgb, var(--green) 16%, transparent)", color: "var(--green)" }}>
                          <Icon icon="flat-color-icons:approval" width={14} aria-hidden /> Más económica
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {fila(ramo.etiquetaPrima, (c) => (
              <span className="text-base font-bold text-ink">{formatoDinero(c.prima, c.moneda)}</span>
            ))}
            {hayPagos && fila("En pagos", (c) => celdaPagos(c))}
            {filas.map((f) => fila(f.campo.etiqueta, (c) => c.datos[f.campo.clave] ?? ""))}
            {hayVigencia &&
              fila("Válida hasta", (c) =>
                c.vigencia_hasta ? (
                  <>
                    {fechaLarga(c.vigencia_hasta)}
                    {estaVencida(c, hoy) && (
                      <span className="font-medium" style={{ color: "var(--amber)" }}>
                        {" "}
                        · vencida
                      </span>
                    )}
                  </>
                ) : (
                  ""
                ),
              )}
            {hayEnvio && fila("Enviada", (c) => (c.enviada_en ? fechaCorta(fechaLocal(c.enviada_en)) : ""))}
            {hayNotas && fila("Notas (solo tú)", (c) => c.notas)}
            <tr className="border-t border-line">
              <th scope="row" className="sticky left-0 z-10 w-32 min-w-32 bg-bg-2 px-3 py-2 text-left align-top text-xs font-medium text-ink-mute">
                Qué hacer
              </th>
              {items.map((c) => {
                const ocupada = ocupadas.has(c.id);
                // El estilo base de los botones es grande: aquí van varios apilados, así que se compactan.
                const boton = "btn-ghost w-full justify-center text-xs";
                const compacto = { padding: "0.5rem 0.75rem" };
                return (
                  <td key={c.id} className="min-w-44 px-3 py-2 align-top">
                    <div className="flex flex-col gap-1.5">
                      {c.estado !== "descartada" && (
                        <button type="button" onClick={() => onEditar(c)} disabled={ocupada} className={boton} style={compacto}>
                          Editar
                        </button>
                      )}
                      <button type="button" onClick={() => onDuplicar(c)} disabled={ocupada} className={boton} style={compacto}>
                        Duplicar
                      </button>
                      {c.estado === "elegida" ? (
                        <button type="button" onClick={() => onEstado(c, "enviada")} disabled={ocupada} className={boton} style={compacto}>
                          Quitar elección
                        </button>
                      ) : (
                        c.estado !== "descartada" && (
                          <button type="button" onClick={() => onEstado(c, "elegida")} disabled={ocupada} className={boton} style={compacto}>
                            <Icon icon="flat-color-icons:approval" width={14} aria-hidden /> La eligió
                          </button>
                        )
                      )}
                      {c.estado === "enviada" && (
                        <button type="button" onClick={() => onEstado(c, "guardada")} disabled={ocupada} className={boton} style={compacto}>
                          Marcar sin enviar
                        </button>
                      )}
                      {c.estado === "descartada" ? (
                        <button type="button" onClick={() => onEstado(c, "guardada")} disabled={ocupada} className={boton} style={compacto}>
                          Recuperar
                        </button>
                      ) : (
                        <button type="button" onClick={() => onEstado(c, "descartada")} disabled={ocupada} className={boton} style={compacto}>
                          Descartar
                        </button>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
