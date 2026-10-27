"use client";

import { useState } from "react";
import { fechaCorta } from "@/lib/fechas";
import { contactosPor100, type ResumenTarjeta } from "@/lib/tarjeta-reglas";
import { Delta, GraficaLinea, ListaBarras, Tarjeta, nf } from "./comunes";

type Serie = "visitas" | "contactos";

/** Rendimiento: cómo va la tarjeta en el tiempo y qué hace la gente (visitas, actividad, hasta dónde bajan). */
export function Rendimiento({ r }: { r: ResumenTarjeta }) {
  const [serie, setSerie] = useState<Serie>("visitas");
  const contactos = r.toques.wa + r.toques.llamar + r.toques.agendar;
  const por100 = contactosPor100(r);
  const datos = serie === "visitas" ? r.visitasPorDia : r.contactosPorDia;
  const actividad: Array<[string, number]> = [
    ["Tocaron WhatsApp", r.toques.wa],
    ["Llamadas", r.toques.llamar],
    ["Citas para agendar", r.toques.agendar],
    ["Guardaron tu contacto", r.toques.guardar],
    ["Compartieron tu tarjeta", r.toques.compartir],
    ["Correos", r.toques.correo],
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Tarjeta titulo="Visitas" valor={nf(r.visitas)}>
          <Delta actual={r.visitas} antes={r.anterior.visitas} anterior={r.anterior} />
        </Tarjeta>
        <Tarjeta titulo="Te buscaron" valor={nf(contactos)}>
          <Delta actual={contactos} antes={r.anterior.contactos} anterior={r.anterior} />
        </Tarjeta>
        <Tarjeta titulo="Contactos por cada 100 visitas" valor={por100 === null ? "—" : por100.toLocaleString("es-MX")} className="col-span-2 md:col-span-1">
          WhatsApp, llamada o cita entre las visitas
        </Tarjeta>
      </div>

      <section className="glass rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base text-ink">{serie === "visitas" ? "Visitas por día" : "Contactos por día"}</h3>
          <div className="flex rounded-xl border border-line bg-glass p-1" role="group" aria-label="Qué mostrar en la gráfica">
            {(
              [
                ["visitas", "Visitas"],
                ["contactos", "Te buscaron"],
              ] as const
            ).map(([id, texto]) => (
              <button
                key={id}
                type="button"
                aria-pressed={serie === id}
                onClick={() => setSerie(id)}
                className={`min-h-[36px] rounded-lg px-3 text-xs ${serie === id ? "bg-brand/25 font-semibold text-ink" : "text-ink-mute hover:text-ink"}`}
              >
                {texto}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <GraficaLinea
            serie={datos}
            unidad={serie === "visitas" ? ["visita", "visitas"] : ["contacto", "contactos"]}
            etiqueta={`${serie === "visitas" ? "Visitas" : "Contactos"} por día, del ${fechaCorta(r.desde)} al ${fechaCorta(r.hasta)}. Total: ${nf(serie === "visitas" ? r.visitas : contactos)}.`}
          />
        </div>
      </section>

      <section className="glass rounded-2xl p-4">
        <h3 className="font-display text-base text-ink">Actividad de la tarjeta</h3>
        <p className="mt-0.5 text-xs text-ink-mute">Lo que tocan para ponerse en contacto contigo o llevarse tu tarjeta.</p>
        <ul className="mt-3 divide-y divide-line">
          {actividad.map(([nombre, n]) => (
            <li key={nombre} className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <span className="text-ink">{nombre}</span>
              <span className="font-semibold text-ink">{nf(n)}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <section className="glass rounded-2xl p-4">
          <h3 className="font-display text-base text-ink">Hasta dónde llega la gente</h3>
          <p className="mt-0.5 text-xs text-ink-mute">De cada 100 visitas, cuántas llegan a ver cada sección.</p>
          <ul className="mt-3 space-y-2.5">
            {r.secciones.map((s) => {
              const p = r.visitas ? Math.min(100, Math.round((s.n / r.visitas) * 100)) : 0;
              return (
                <li key={s.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-ink">{s.nombre}</span>
                    <span className="shrink-0 font-semibold text-ink">{p}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg-3" aria-hidden>
                    <div className="h-full rounded-full" style={{ width: `${p}%`, background: "var(--brand-2)" }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
        <ListaBarras titulo="Dónde tocan WhatsApp" ayuda="Qué botón los lleva a escribirte." filas={r.waPorLugar} vacio="Aún nadie ha tocado WhatsApp en estos días." />
      </div>
    </div>
  );
}
