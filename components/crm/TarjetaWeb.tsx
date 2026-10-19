"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { crmTarjeta, ErrorCRM } from "@/lib/api";
import { contactosPor100, type Conteo, type ResumenTarjeta } from "@/lib/tarjeta-reglas";
import { fechaCorta } from "@/lib/fechas";
import { AvisoMigracion } from "./panel/AvisoMigracion";

const PERIODOS = [7, 30, 90] as const;
const nf = (n: number) => n.toLocaleString("es-MX");
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

function Tarjeta({ titulo, valor, children }: { titulo: string; valor: string; children?: React.ReactNode }) {
  return (
    <div className="glass flex min-h-[124px] flex-col rounded-2xl p-3.5 sm:p-4">
      <span className="text-[13px] font-semibold text-ink-soft">{titulo}</span>
      <span className="mt-1 text-[26px] font-bold leading-tight text-ink md:text-[28px]">{valor}</span>
      <span className="mt-auto pt-1 text-xs text-ink-mute">{children}</span>
    </div>
  );
}

/** Lista con barra proporcional: sirve para «dónde tocan», «qué productos», «de dónde llegan»… */
function ListaBarras({ titulo, ayuda, filas, vacio, sufijo = "" }: { titulo: string; ayuda?: string; filas: Conteo[]; vacio: string; sufijo?: string }) {
  const max = Math.max(1, ...filas.map((f) => f.n));
  return (
    <section className="glass rounded-2xl p-4">
      <h3 className="font-display text-base text-ink">{titulo}</h3>
      {ayuda && <p className="mt-0.5 text-xs text-ink-mute">{ayuda}</p>}
      {!filas.length ? (
        <p className="mt-3 text-sm text-ink-mute">{vacio}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {filas.map((f) => (
            <li key={f.nombre}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-ink">{f.nombre}</span>
                <span className="shrink-0 font-semibold text-ink">
                  {nf(f.n)}
                  {sufijo}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg-3" aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${Math.max(3, (f.n / max) * 100)}%`, background: "var(--brand-2)" }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Tarjeta web: qué hace la gente en tu tarjeta digital (/roberto). Todo es anónimo: se cuenta qué se toca,
 * nunca quién. Las «visitas» son cargas de la página (la misma persona puede sumar varias).
 */
export function TarjetaWeb() {
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30);
  const [r, setR] = useState<ResumenTarjeta | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const cargar = useCallback(
    () =>
      crmTarjeta(dias).then(
        (d) => {
          setR(d);
          setError(null);
        },
        (e: unknown) => setError(e as Error),
      ),
    [dias],
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (error instanceof ErrorCRM && error.migracion) {
    return (
      <AvisoMigracion
        onListo={() => void cargar()}
        archivo={error.archivo}
        que="la medición de tu tarjeta web"
        detalle="Tu libreta en la nube (Supabase) necesita un cajón nuevo para contar, de forma anónima, qué se toca en tu tarjeta (sin nombres, sin teléfonos, sin IP). Se hace una sola vez."
      />
    );
  }
  if (error) {
    return (
      <div className="glass rounded-2xl p-5 text-center">
        <p className="text-sm text-ink-soft">{error.message}</p>
        <button type="button" onClick={() => void cargar()} className="btn-primary mt-3 px-4 py-2.5 text-sm">
          Reintentar
        </button>
      </div>
    );
  }
  if (!r) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Cargando las estadísticas de tu tarjeta">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[124px] animate-pulse rounded-2xl bg-bg-3/70" />
        ))}
      </div>
    );
  }

  const por100 = contactosPor100(r);
  const contactos = r.toques.wa + r.toques.llamar + r.toques.agendar;
  const totalDisp = r.dispositivos.movil + r.dispositivos.escritorio;
  const pctMovil = totalDisp ? Math.round((r.dispositivos.movil / totalDisp) * 100) : 0;
  const maxDia = Math.max(1, ...r.visitasPorDia.map((d) => d.n));
  const sinDatos = r.visitas === 0 && contactos === 0;

  return (
    <section className="space-y-4">
      <div className="glass-strong rounded-2xl p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-display text-lg text-ink">
          <Icon icon="flat-color-icons:globe" width={22} aria-hidden /> Tarjeta web
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Qué hace la gente en <strong className="text-ink">www.especialistaenasegurarte.lat/roberto</strong>: hasta dónde baja, qué toca y qué te escribe.
          Todo es <strong className="text-ink">anónimo</strong>: se cuenta qué se toca, nunca quién.
        </p>
        <p className="mt-1 text-xs text-ink-mute">
          Del {fechaCorta(r.desde)} al {fechaCorta(r.hasta)} · «Visitas» = veces que se cargó la página (una misma persona puede sumar varias)
          {!r.cloud && " · MODO DEMOSTRACIÓN: números inventados"}
        </p>
        <p className="mt-1 text-xs text-ink-mute">
          Tip: pon <code className="rounded bg-bg-3 px-1 py-0.5 text-ink">?s=ig</code>, <code className="rounded bg-bg-3 px-1 py-0.5 text-ink">?s=wa</code> o{" "}
          <code className="rounded bg-bg-3 px-1 py-0.5 text-ink">?s=tiktok</code> al final del enlace de tu tarjeta en cada red, y aquí verás de cuál llegan.
        </p>
      </div>

      <div className="flex rounded-xl border border-line bg-glass p-1 sm:w-fit" role="group" aria-label="Periodo">
        {PERIODOS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={dias === p}
            onClick={() => setDias(p)}
            className={`min-h-[40px] flex-1 rounded-lg px-4 text-sm sm:flex-none ${dias === p ? "bg-brand/25 font-semibold text-ink" : "text-ink-mute hover:text-ink"}`}
          >
            Últimos {p} días
          </button>
        ))}
      </div>

      {sinDatos && (
        <div className="glass rounded-2xl p-5 text-center">
          <p className="font-semibold text-ink">Todavía no hay datos de estos días.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
            Se llenan solos cuando la gente entra a tu tarjeta, a partir de que se publiquen los cambios nuevos de la página.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tarjeta titulo="Visitas" valor={nf(r.visitas)}>
          {totalDisp ? `${pctMovil}% desde el celular` : "veces que se cargó la tarjeta"}
        </Tarjeta>
        <Tarjeta titulo="Te buscaron (WhatsApp, llamada o cita)" valor={nf(contactos)}>
          {por100 === null ? "—" : `${por100.toLocaleString("es-MX")} por cada 100 visitas`}
        </Tarjeta>
        <Tarjeta titulo="Tocaron WhatsApp" valor={nf(r.toques.wa)}>
          {r.toques.llamar} llamadas · {r.toques.agendar} citas
        </Tarjeta>
        <Tarjeta titulo="Guardaron tu contacto" valor={nf(r.toques.guardar)}>
          {r.toques.compartir} veces compartieron tu tarjeta
        </Tarjeta>
      </div>

      <section className="space-y-3">
        <div className="glass-strong rounded-2xl p-4 sm:p-5">
          <h3 className="flex items-center gap-2 font-display text-base text-ink">
            <Icon icon="flat-color-icons:calendar" width={20} aria-hidden /> Guía «Dinero Bajo Control»
          </h3>
          <p className="mt-1 text-xs text-ink-mute">
            Lo que pasa en <strong className="text-ink">www.especialistaenasegurarte.lat/semana</strong>, también anónimo. Son <em>veces</em>, no personas
            únicas. «Tocaron WhatsApp» cuenta toques al botón, no mensajes enviados: quien llega a mandarlo aparece en tus prospectos si dejó sus datos.
            Con <code className="rounded bg-bg-3 px-1 py-0.5 text-ink">?s=ig</code> o <code className="rounded bg-bg-3 px-1 py-0.5 text-ink">?s=wa</code> al
            final del enlace ves de dónde llegan.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Tarjeta titulo="Abrieron la guía" valor={nf(r.semana.abrieron)}>
            {r.semana.instalaron} la instalaron en su teléfono
          </Tarjeta>
          <Tarjeta titulo="Armaron su plan" valor={nf(r.semana.planes)}>
            {pct(r.semana.planes, r.semana.abrieron)}% de las veces que se abre · {r.semana.ejemplos} vieron el ejemplo
          </Tarjeta>
          <Tarjeta titulo="Tocaron WhatsApp" valor={nf(r.semana.waTotal)}>
            {r.semana.waConDatos} dejando datos · {r.semana.waDirecto} directo
          </Tarjeta>
          <Tarjeta titulo="Prospectos guardados" valor={nf(r.semana.prospectos)}>
            {r.semana.repetidos} ya estaban en tu CRM · {pct(r.semana.prospectos, r.semana.planes)}% de los planes
          </Tarjeta>
          <Tarjeta titulo="Reportes en PDF" valor={nf(r.semana.pdfs + r.semana.pdfsCompartidos)}>
            {r.semana.pdfs} descargados · {r.semana.pdfsCompartidos} compartidos · {r.semana.pdfsMes} del mes · {r.semana.pdfsAnio} del año (cada uno lleva tu marca)
          </Tarjeta>
        </div>
        {r.semana.fuentes.length > 0 && (
          <ListaBarras titulo="De dónde llegan a la guía" ayuda="Según el ?s= del enlace o el sitio que los mandó." filas={r.semana.fuentes} vacio="Sin datos todavía." />
        )}
      </section>

      <section className="glass rounded-2xl p-4">
        <h3 className="font-display text-base text-ink">Visitas por día</h3>
        <div
          className="mt-3 flex h-32 items-end gap-[3px]"
          role="img"
          aria-label={`Visitas por día, del ${fechaCorta(r.desde)} al ${fechaCorta(r.hasta)}. Total: ${r.visitas}.`}
        >
          {r.visitasPorDia.map((d) => (
            <div key={d.dia} className="flex h-full min-w-0 flex-1 items-end" title={`${fechaCorta(d.dia)}: ${d.n} ${d.n === 1 ? "visita" : "visitas"}`}>
              <div className="w-full rounded-t" style={{ height: `${d.n ? Math.max(4, (d.n / maxDia) * 100) : 1}%`, background: d.n ? "var(--brand-2)" : "var(--line)" }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-ink-mute">
          <span>{fechaCorta(r.desde)}</span>
          <span>{fechaCorta(r.hasta)}</span>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="glass rounded-2xl p-4">
          <h3 className="font-display text-base text-ink">Hasta dónde llega la gente</h3>
          <p className="mt-0.5 text-xs text-ink-mute">De cada 100 visitas, cuántas llegan a ver cada sección.</p>
          <ul className="mt-3 space-y-2.5">
            {r.secciones.map((s) => {
              const pct = r.visitas ? Math.min(100, Math.round((s.n / r.visitas) * 100)) : 0;
              return (
                <li key={s.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-ink">{s.nombre}</span>
                    <span className="shrink-0 font-semibold text-ink">{pct}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg-3" aria-hidden>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--brand-2)" }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
        <ListaBarras titulo="Dónde tocan WhatsApp" ayuda="Qué botón los lleva a escribirte." filas={r.waPorLugar} vacio="Aún nadie ha tocado WhatsApp en estos días." />
        <ListaBarras titulo="Productos que más piden" ayuda="Toques anteriores en «Quiero información» de cada seguro (ese botón ya no está en las tarjetas; ahora mira «Qué quieren proteger»)." filas={r.productos} vacio="Sin toques de productos (el botón ya no está en las tarjetas)." />
        <ListaBarras titulo="Qué quieren proteger" ayuda="Lo que marcan en «¿Qué quieres proteger hoy?»." filas={r.intereses} vacio="Aún nadie ha marcado una opción." />
        <ListaBarras titulo="De dónde llegan" ayuda="Según el ?s= del enlace o el sitio que los mandó." filas={r.fuentes} vacio="Sin datos todavía." />
        <ListaBarras titulo="Historias que abren" ayuda="«Leer la historia completa» de cada cliente." filas={r.historias} vacio="Aún nadie abre una historia completa." />
        <ListaBarras titulo="Videos que abren" ayuda="Cuántas veces tocaron cada video para verlo." filas={r.videos} vacio="Aún nadie abre un video." />
        <ListaBarras titulo="Preguntas que abren" ayuda="Las preguntas frecuentes que más leen." filas={r.preguntas} vacio="Aún nadie abre una pregunta." />
        <ListaBarras titulo="Recomendaciones «Para ti» que tocan" ayuda="Lo que eligen de la lista que aparece al marcar «¿Qué quieres proteger hoy?»." filas={r.recomendaciones} vacio="Aún nadie toca una recomendación." />
        <ListaBarras titulo="Fotos que amplían" ayuda="Fotos del evento y de reconocimientos que tocan para ver en grande." filas={r.fotos} vacio="Aún nadie amplía una foto." />
        <ListaBarras
          titulo="Carruseles"
          ayuda="Cuántas veces deslizaron cada uno."
          filas={[
            { nombre: "Seguros", n: r.carruseles.productos },
            { nombre: "Testimonios", n: r.carruseles.testimonios },
            { nombre: "Reconocimientos", n: r.carruseles.reconocimientos },
            { nombre: "Videos", n: r.carruseles.videos },
            { nombre: "Eventos", n: r.carruseles.eventos },
          ].filter((x) => x.n > 0)}
          vacio="Aún nadie desliza los carruseles."
        />
        <ListaBarras titulo="Redes y recursos" ayuda="Lo que tocan de «Sigue mis canales» y «Recursos»." filas={[...r.redes, ...r.recursos].sort((a, b) => b.n - a.n).slice(0, 8)} vacio="Sin toques todavía." />
      </div>
    </section>
  );
}
