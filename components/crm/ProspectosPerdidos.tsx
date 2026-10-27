"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { moneda, monedaConCentavos } from "@/lib/crm-data";
import { diasEntre, fechaLocal, hoyLocal } from "@/lib/fechas";
import { infoRamo, RAMOS } from "@/lib/ramos";
import { whatsappDe } from "@/lib/seguimiento-reglas";
import type { Lead, Ramo } from "@/lib/types";

const sinAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type FiltroRamo = "todos" | "sin_ramo" | Ramo;

interface ProspectosPerdidosProps {
  /** Todos tus prospectos: aquí solo se usan los que están en «Perdido». */
  leads: Lead[];
  onAbrir: (id: string) => void;
  /** Ofrecerle otro seguro (venta cruzada): abre Cotizaciones con este prospecto ya elegido. */
  onCotizar: (lead: Lead) => void;
  /** Lo regresa a Prospectos (etapa «Nuevo»). */
  onReactivar: (lead: Lead) => void;
}

function hace(iso: string, hoy: string): string {
  const n = diasEntre(fechaLocal(iso), hoy);
  return n <= 0 ? "hoy" : n === 1 ? "ayer" : `hace ${n} días`;
}

/**
 * Los prospectos que se perdieron. Salen de «Prospectos» para que esa lista muestre solo a quien sigues atendiendo, pero NO
 * se borran: aquí los encuentras para ofrecerles otro seguro (venta cruzada) o regresarlos a Prospectos si vuelven a interesarse.
 */
export function ProspectosPerdidos({ leads, onAbrir, onCotizar, onReactivar }: ProspectosPerdidosProps) {
  const hoy = hoyLocal();
  const [busca, setBusca] = useState("");
  const [ramo, setRamo] = useState<FiltroRamo>("todos");
  const [aviso, setAviso] = useState<string | null>(null);
  const reloj = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(reloj.current), []);

  const perdidos = leads.filter((l) => l.etapa === "perdido").sort((a, b) => b.actualizado_en.localeCompare(a.actualizado_en));
  const total = perdidos.reduce((s, l) => s + l.valor, 0);

  const texto = sinAcentos(busca.trim());
  const visibles = perdidos.filter((l) => {
    if (ramo === "sin_ramo" && l.ramo) return false;
    if (ramo !== "todos" && ramo !== "sin_ramo" && l.ramo !== ramo) return false;
    if (!texto) return true;
    return sinAcentos(l.nombre).includes(texto) || sinAcentos(l.correo).includes(texto) || l.whatsapp.includes(texto);
  });

  function reactivar(l: Lead) {
    onReactivar(l);
    setAviso(`${l.nombre} volvió a Prospectos, en la etapa «Nuevo».`);
    window.clearTimeout(reloj.current);
    reloj.current = window.setTimeout(() => setAviso(null), 5000);
  }

  if (!perdidos.length) {
    return (
      <section className="glass rounded-2xl p-8 text-center" aria-label="Prospectos perdidos">
        {aviso && (
          <p className="mb-4 rounded-xl border border-line bg-bg-3/70 px-4 py-3 text-sm text-ink" role="status">
            {aviso}
          </p>
        )}
        <Icon icon="flat-color-icons:undo" width={44} className="mx-auto" aria-hidden />
        <p className="mt-3 font-semibold text-ink">No tienes prospectos perdidos</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-mute">
          Cuando muevas un prospecto a «Perdido», sale de Prospectos pero no se borra: aparece aquí para que luego le ofrezcas otro seguro.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Prospectos perdidos">
      <div className="glass flex items-start gap-3 rounded-2xl p-4">
        <Icon icon="flat-color-icons:info" width={28} className="shrink-0" aria-hidden />
        <p className="text-sm text-ink-soft">
          <strong className="text-ink">Aquí no se pierde nada.</strong> Estos prospectos ya no estorban en Prospectos, pero siguen guardados con su historial para
          ofrecerles <strong className="text-ink">otro seguro</strong> o reactivarlos cuando vuelvan a interesarse.
        </p>
      </div>

      {aviso && (
        <p className="rounded-xl border border-line bg-bg-3/70 px-4 py-3 text-sm text-ink" role="status">
          {aviso}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="glass flex items-center gap-3 rounded-2xl p-3">
          <Icon icon="flat-color-icons:undo" width={30} aria-hidden />
          <div>
            <p className="text-lg font-bold text-ink">{perdidos.length}</p>
            <p className="text-xs text-ink-mute">{perdidos.length === 1 ? "Prospecto perdido" : "Prospectos perdidos"}</p>
          </div>
        </div>
        <div className="glass flex items-center gap-3 rounded-2xl p-3">
          <Icon icon="flat-color-icons:money-transfer" width={30} aria-hidden />
          <div>
            <p className="text-lg font-bold text-ink">{moneda(total)}</p>
            <p className="text-xs text-ink-mute">Prima total no cerrada</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-glass px-3 py-2">
          <Icon icon="flat-color-icons:search" width={18} aria-hidden />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nombre, correo o WhatsApp…"
            aria-label="Buscar entre tus prospectos perdidos"
            className="w-64 bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute"
          />
          {busca && (
            <button type="button" onClick={() => setBusca("")} className="-mr-1 rounded-lg px-1.5 text-lg leading-none text-ink-mute hover:text-ink" aria-label="Borrar la búsqueda">
              ×
            </button>
          )}
        </div>
        <select
          value={ramo}
          onChange={(e) => setRamo(e.target.value as FiltroRamo)}
          aria-label="Filtrar por ramo"
          className="rounded-xl border border-line bg-glass px-3 py-2 text-sm text-ink"
        >
          <option value="todos">Todos los ramos</option>
          {RAMOS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
          <option value="sin_ramo">Sin ramo asignado</option>
        </select>
        <p className="ml-auto text-xs text-ink-mute">
          {visibles.length === perdidos.length
            ? `${perdidos.length} ${perdidos.length === 1 ? "perdido" : "perdidos"}`
            : `${visibles.length} de ${perdidos.length} perdidos`}
        </p>
      </div>

      {visibles.length === 0 ? (
        <p className="glass rounded-2xl p-6 text-center text-sm text-ink-mute">Ninguno coincide con eso.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibles.map((l) => {
            const wa = whatsappDe(l);
            return (
              <li key={l.id} className="glass flex flex-col rounded-2xl p-4" data-testid="prospecto-perdido">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => onAbrir(l.id)} className="min-w-0 flex-1 text-left" title="Abrir su ficha">
                    <span className="block truncate text-[16px] font-semibold text-ink hover:underline">{l.nombre}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-mute">
                      {l.ramo ? (
                        <span className="inline-flex items-center gap-1 text-ink-soft">
                          <Icon icon={infoRamo(l.ramo).icono} width={14} aria-hidden /> Se le ofreció {infoRamo(l.ramo).corto}
                        </span>
                      ) : (
                        <span>Sin ramo asignado</span>
                      )}
                      <span>· Última actividad {hace(l.actualizado_en, hoy)}</span>
                    </span>
                  </button>
                  {wa && (
                    <a
                      href={`https://wa.me/52${wa}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-glass hover:border-brand-2"
                      aria-label={`Escribirle por WhatsApp a ${l.nombre}`}
                      title="Abrir su WhatsApp"
                    >
                      <Icon icon="logos:whatsapp-icon" width={18} aria-hidden />
                    </a>
                  )}
                </div>

                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-wide text-ink-mute">Prima total</p>
                  <p className="text-lg font-bold text-ink">{l.valor > 0 ? monedaConCentavos(l.valor) : "Sin capturar"}</p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => onCotizar(l)} className="btn-ghost w-full justify-center text-xs" style={{ padding: "0.6rem 0.5rem" }} title="Ofrecerle otro seguro">
                    <Icon icon="flat-color-icons:calculator" width={16} aria-hidden /> Ofrecer otro seguro
                  </button>
                  <button type="button" onClick={() => reactivar(l)} className="btn-ghost w-full justify-center text-xs" style={{ padding: "0.6rem 0.5rem" }} title="Regresarlo a Prospectos">
                    <Icon icon="flat-color-icons:undo" width={16} aria-hidden /> Reactivar
                  </button>
                </div>
                <button type="button" onClick={() => onAbrir(l.id)} className="mt-2 text-left text-xs text-ink-soft underline underline-offset-2 hover:text-ink">
                  Ver su ficha e historial
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
