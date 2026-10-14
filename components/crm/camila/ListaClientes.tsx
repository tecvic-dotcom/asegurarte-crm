"use client";

import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { infoRamo } from "@/lib/ramos";
import { esActivo, faltantesDe, ramosVigentes, type EntradaCliente, type TipoFaltante } from "@/lib/cruzada-reglas";
import { palabraDeParentesco } from "@/lib/cruzada-familia";

const ETIQUETA_FALTANTE: Record<TipoFaltante, string> = {
  whatsapp: "Sin WhatsApp",
  sin_ramo: "Póliza sin ramo",
  nacimiento: "Sin fecha de nacimiento",
  renovacion: "Sin fecha de renovación",
  correo: "Sin correo",
};

interface ListaClientesProps {
  entradas: EntradaCliente[];
  busca: string;
  onAbrir: (clienteId: string) => void;
}

/** Los expedientes de tus clientes, con lo que falta por completar para que Camila te sugiera mejor. */
export function ListaClientes({ entradas, busca, onAbrir }: ListaClientesProps) {
  const [filtro, setFiltro] = useState<TipoFaltante | null>(null);

  const conFaltantes = useMemo(() => entradas.map((e) => ({ e, faltan: faltantesDe(e) })), [entradas]);
  const nombres = useMemo(() => new Map(entradas.map((e) => [e.cliente.id, e.cliente.nombre])), [entradas]);
  const conteo = useMemo(() => {
    const c: Record<TipoFaltante, number> = { whatsapp: 0, sin_ramo: 0, nacimiento: 0, renovacion: 0, correo: 0 };
    for (const { e, faltan } of conFaltantes) if (esActivo(e.polizas)) for (const f of faltan) c[f.tipo]++;
    return c;
  }, [conFaltantes]);

  const filas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return conFaltantes
      .filter(({ e }) => !q || e.cliente.nombre.toLowerCase().includes(q))
      .filter(({ faltan }) => !filtro || faltan.some((f) => f.tipo === filtro))
      .sort((a, b) => Number(esActivo(b.e.polizas)) - Number(esActivo(a.e.polizas)) || a.e.cliente.nombre.localeCompare(b.e.cliente.nombre, "es"));
  }, [conFaltantes, busca, filtro]);

  if (!entradas.length) {
    return <p className="glass rounded-2xl p-5 text-sm text-ink-soft">Todavía no hay expedientes. Pulsa «Armar expedientes» arriba para juntar cada póliza con su cliente.</p>;
  }

  return (
    <section className="space-y-3" data-testid="lista-clientes">
      <div>
        <p className="mb-1.5 text-sm font-semibold text-ink">Datos por completar (clientes con póliza vigente)</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ETIQUETA_FALTANTE) as TipoFaltante[]).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={filtro === t}
              onClick={() => setFiltro(filtro === t ? null : t)}
              className={`rounded-xl border px-3 py-1.5 text-sm ${filtro === t ? "border-brand-2 bg-brand/20 text-ink" : "border-line text-ink-soft hover:border-brand-2"}`}
              style={conteo[t] === 0 ? { color: "var(--green)" } : undefined}
            >
              {ETIQUETA_FALTANTE[t]} · {conteo[t]}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-ink-mute">El WhatsApp y el ramo son indispensables; la fecha de nacimiento ayuda a Camila a decidir qué seguro ofrecer primero.</p>
      </div>

      <ul className="space-y-2">
        {filas.map(({ e, faltan }) => {
          const activo = esActivo(e.polizas);
          const ramos = ramosVigentes(e.polizas);
          return (
            <li key={e.cliente.id} data-testid="cliente-fila" className="glass rounded-2xl p-3 sm:p-4">
              <button type="button" onClick={() => onAbrir(e.cliente.id)} className="flex w-full flex-wrap items-center justify-between gap-2 text-left">
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-ink hover:underline">{e.cliente.nombre}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-mute">
                    {e.cliente.tipo === "empresa" && <span className="rounded-md border border-line px-1.5 py-0.5">Empresa</span>}
                    {e.cliente.titular_id && nombres.has(e.cliente.titular_id) && (
                      <span className="rounded-md border border-line px-1.5 py-0.5">
                        {palabraDeParentesco(e.cliente.parentesco ?? "otro", e.cliente.genero)} de {nombres.get(e.cliente.titular_id)}
                      </span>
                    )}
                    {e.cliente.no_ofrecer && <span className="rounded-md border border-line px-1.5 py-0.5">No ofrecer</span>}
                    {!activo && <span style={{ color: "var(--amber)" }}>Sin póliza vigente</span>}
                    {ramos.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1">
                        <Icon icon={infoRamo(r).icono} width={15} aria-hidden /> {infoRamo(r).corto}
                      </span>
                    ))}
                  </span>
                </span>
                <span className="flex flex-wrap justify-end gap-1.5">
                  {faltan.map((f) => (
                    <span
                      key={f.tipo}
                      className="rounded-lg border px-2 py-0.5 text-xs"
                      style={{ borderColor: f.importancia === "alta" ? "var(--amber)" : "var(--line-strong)", color: f.importancia === "alta" ? "var(--amber)" : "var(--ink-mute)" }}
                    >
                      {f.texto}
                    </span>
                  ))}
                  {faltan.length === 0 && (
                    <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--green)" }}>
                      <Icon icon="flat-color-icons:ok" width={14} aria-hidden /> Completo
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
        {filas.length === 0 && <li className="rounded-2xl border border-line p-4 text-center text-sm text-ink-mute">Nadie coincide con ese filtro.</li>}
      </ul>
    </section>
  );
}
