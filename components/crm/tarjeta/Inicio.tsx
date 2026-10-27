"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { fechaCorta } from "@/lib/fechas";
import { contactosPor100, fuentesLegibles, type ResumenTarjeta } from "@/lib/tarjeta-reglas";
import { Delta, ListaBarras, Spark, Tarjeta, nf, pct } from "./comunes";

const SITIO = "https://www.especialistaenasegurarte.lat";
// La etiqueta (?s=…) que va al final del enlace dice de dónde llegó la gente. «qr» y «amigo» ya los usan el QR y la guía.
const ENLACES_TARJETA = [
  ["Biografía de Instagram", "ig"],
  ["Mensajes y estados de WhatsApp", "wa"],
  ["Grupos de WhatsApp", "grupos"],
  ["Biografía de TikTok", "tiktok"],
  ["Facebook (perfil, página y publicaciones)", "fb"],
  ["LinkedIn", "linkedin"],
  ["YouTube", "yt"],
  ["Firma del correo", "correo"],
  ["Anuncios de pago", "anuncio"],
] as const;
const ENLACES_GUIA = [
  ["Instagram", "ig"],
  ["WhatsApp", "wa"],
  ["Grupos de WhatsApp", "grupos"],
  ["TikTok", "tiktok"],
  ["Facebook", "fb"],
] as const;

type Herramienta = "estado" | "enlaces" | "guia" | "promos";

function Mosaico({ titulo, abierto, onClick, children }: { titulo: string; abierto: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={abierto}
      className={`glass flex min-h-[92px] flex-col rounded-2xl p-3.5 text-left transition hover:bg-glass ${abierto ? "ring-1 ring-brand-2" : ""}`}
    >
      <span className="text-[13px] font-semibold leading-snug text-ink">{titulo}</span>
      <span className="mt-auto pt-2">{children}</span>
    </button>
  );
}

/** Hace cuánto pasó algo, en palabras («hace 5 min», «hace 3 h», «hace 2 días»). */
function hace(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
}

function PanelEstado({ r, ahora }: { r: ResumenTarjeta; ahora: number }) {
  const ultima = r.ultimaVisita ? ahora - Date.parse(r.ultimaVisita) : null;
  return (
    <div className="glass-strong space-y-1.5 rounded-2xl p-4 text-sm text-ink-soft">
      <h3 className="font-display text-base text-ink">Estado de la medición</h3>
      <p>
        <strong className="text-ink">Última visita registrada:</strong> {ultima === null ? "todavía ninguna" : hace(ultima)}
      </p>
      <p>
        <strong className="text-ink">Datos desde:</strong> {r.datosDesde ? fechaCorta(r.datosDesde) : "—"}
      </p>
      <p className="text-xs text-ink-mute">
        La medición es anónima y sin cookies: cuenta qué se toca, nunca quién. Los robots y los buscadores no se cuentan. Tus propias visitas sí cuentan.
        {!r.cloud && " MODO DEMOSTRACIÓN: números inventados."}
      </p>
    </div>
  );
}

function PanelEnlaces() {
  const [copiado, setCopiado] = useState<string | null>(null);
  async function copiar(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(url);
      window.setTimeout(() => setCopiado((c) => (c === url ? null : c)), 1800);
    } catch {
      /* sin permiso para copiar: el enlace está a la vista para seleccionarlo a mano */
    }
  }
  const grupo = (titulo: string, ruta: string, filas: ReadonlyArray<readonly [string, string]>) => (
    <div>
      <h4 className="text-sm font-semibold text-ink">{titulo}</h4>
      <ul className="mt-2 space-y-2">
        {filas.map(([lugar, s]) => {
          const url = `${SITIO}/${ruta}?s=${s}`;
          return (
            <li key={s} className="flex items-center gap-2 rounded-xl border border-line bg-glass p-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-ink">{lugar}</p>
                <p className="break-all text-[11px] text-ink-mute">{url}</p>
              </div>
              <button type="button" onClick={() => void copiar(url)} className="btn-ghost shrink-0 px-3 py-2 text-xs" aria-label={`Copiar el enlace de ${lugar}`}>
                {copiado === url ? "¡Copiado!" : "Copiar"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
  return (
    <div className="glass-strong space-y-4 rounded-2xl p-4">
      <div>
        <h3 className="font-display text-base text-ink">Enlaces con etiqueta</h3>
        <p className="mt-0.5 text-xs text-ink-mute">
          Pon cada uno en su lugar (biografía, estado, firma…) y el panel te dirá de dónde llega la gente. Las etiquetas van en minúsculas, sin espacios. Ya están en uso <code className="rounded bg-bg-3 px-1 text-ink">qr</code> (el código QR) y{" "}
          <code className="rounded bg-bg-3 px-1 text-ink">amigo</code> (la guía compartida).
        </p>
      </div>
      {grupo("Mi tarjeta", "roberto", ENLACES_TARJETA)}
      {grupo("Mi regalo, la guía «Dinero Bajo Control»", "semana", ENLACES_GUIA)}
    </div>
  );
}

function PanelGuia({ r }: { r: ResumenTarjeta }) {
  return (
    <div className="glass-strong space-y-3 rounded-2xl p-4">
      <div>
        <h3 className="font-display text-base text-ink">Guía «Dinero Bajo Control»</h3>
        <p className="mt-0.5 text-xs text-ink-mute">
          Lo que pasa en <strong className="text-ink">www.especialistaenasegurarte.lat/semana</strong>, también anónimo. Son <em>veces</em>, no personas únicas. «Tocaron WhatsApp» cuenta toques al botón, no mensajes enviados: quien llega a mandarlo aparece en tus prospectos si dejó sus datos.
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
      <ListaBarras titulo="De dónde llegan a la guía" ayuda="Según el ?s= del enlace o el sitio que los mandó." filas={fuentesLegibles(r.semana.fuentes)} vacio="Sin datos todavía." />
    </div>
  );
}

function PanelPromos({ r }: { r: ResumenTarjeta }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <ListaBarras titulo="Promociones: toques a WhatsApp" ayuda="Cuántas veces tocaron el botón de WhatsApp de cada campaña (la sección «Promociones» solo se ve mientras hay una vigente)." filas={r.promosWa} vacio="Aún nadie toca el WhatsApp de una promoción." />
      <ListaBarras titulo="Promociones: videos que abren" ayuda="Cuántas veces tocaron el video de cada campaña para verlo." filas={r.promosVideo} vacio="Aún nadie abre el video de una promoción." />
    </div>
  );
}

/** Inicio: el resumen de un vistazo (visitas, contactos, prospectos) y las herramientas, como «Tu panel» de Instagram. */
export function Inicio({ r }: { r: ResumenTarjeta }) {
  const [abierta, setAbierta] = useState<Herramienta | null>(null);
  const [ahora] = useState(() => Date.now());
  const alternar = (h: Herramienta) => setAbierta((a) => (a === h ? null : h));
  const contactos = r.toques.wa + r.toques.llamar + r.toques.agendar;
  const por100 = contactosPor100(r);
  const activa = r.ultimaVisita !== null && ahora - Date.parse(r.ultimaVisita) < 48 * 3_600_000;
  const sinDatos = r.visitas === 0 && contactos === 0;

  return (
    <div className="space-y-4">
      {sinDatos && (
        <div className="glass rounded-2xl p-5 text-center">
          <p className="font-semibold text-ink">Todavía no hay datos de estos días.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">Se llenan solos cuando la gente entra a tu tarjeta.</p>
        </div>
      )}

      <section aria-labelledby="t-resumen" className="space-y-3">
        <h2 id="t-resumen" className="font-display text-lg text-ink">
          Resumen
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="glass row-span-2 flex flex-col rounded-2xl p-3.5 sm:p-4 md:col-span-2">
            <span className="text-[13px] font-semibold text-ink-soft">Visitas</span>
            <span className="mt-1 text-[26px] font-bold leading-tight text-ink md:text-[28px]">{nf(r.visitas)}</span>
            <span className="text-xs text-ink-mute">
              <Delta actual={r.visitas} antes={r.anterior.visitas} anterior={r.anterior} />
            </span>
            <div className="mt-auto pt-3">
              <Spark datos={r.visitasPorDia.map((d) => d.n)} etiqueta={`Visitas por día, del ${fechaCorta(r.desde)} al ${fechaCorta(r.hasta)}. Total: ${r.visitas}.`} />
              <div className="flex justify-between text-[11px] text-ink-mute">
                <span>{fechaCorta(r.desde)}</span>
                <span>{fechaCorta(r.hasta)}</span>
              </div>
            </div>
          </div>
          <Tarjeta titulo="Te buscaron" valor={nf(contactos)}>
            <Delta actual={contactos} antes={r.anterior.contactos} anterior={r.anterior} />
          </Tarjeta>
          <Tarjeta titulo="Prospectos de la tarjeta" valor={r.crm ? `${r.crm.prospectos > 0 ? "+" : ""}${nf(r.crm.prospectos)}` : "—"}>
            {!r.crm
              ? "no pude leer tu CRM"
              : r.crm.prospectos + r.crm.ganados === 0
                ? "marca «Tarjeta web» como origen en cada expediente"
                : `${nf(r.crm.ganados)} ${r.crm.ganados === 1 ? "ganado" : "ganados"} en total`}
          </Tarjeta>
          <Tarjeta titulo="Tocaron WhatsApp" valor={nf(r.toques.wa)}>
            {por100 === null ? "—" : `${por100.toLocaleString("es-MX")} contactos por cada 100 visitas`}
          </Tarjeta>
          <Tarjeta titulo="Guardaron tu contacto" valor={nf(r.toques.guardar)}>
            <Delta actual={r.toques.guardar} antes={r.anterior.guardaron} anterior={r.anterior} />
          </Tarjeta>
        </div>
        <p className="text-xs text-ink-mute">
          «Visitas» = veces que se cargó la página (una misma persona puede sumar varias). «Te buscaron» = toques a WhatsApp, llamada o cita. Un toque no es un mensaje enviado ni un prospecto.
        </p>
      </section>

      <section aria-labelledby="t-herramientas" className="space-y-3">
        <h2 id="t-herramientas" className="font-display text-lg text-ink">
          Herramientas
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mosaico titulo="Estado de la medición" abierto={abierta === "estado"} onClick={() => alternar("estado")}>
            <Icon icon={activa ? "flat-color-icons:ok" : "flat-color-icons:medium-priority"} width={20} aria-label={activa ? "Recibiendo visitas" : "Sin visitas recientes"} />
          </Mosaico>
          <Mosaico titulo="Enlaces con etiqueta" abierto={abierta === "enlaces"} onClick={() => alternar("enlaces")}>
            <Icon icon="flat-color-icons:data-sheet" width={20} aria-hidden />
          </Mosaico>
          <Mosaico titulo="Guía Dinero Bajo Control" abierto={abierta === "guia"} onClick={() => alternar("guia")}>
            <Icon icon="flat-color-icons:calendar" width={20} aria-hidden />
          </Mosaico>
          <Mosaico titulo="Promociones" abierto={abierta === "promos"} onClick={() => alternar("promos")}>
            <Icon icon="flat-color-icons:advertising" width={20} aria-hidden />
          </Mosaico>
        </div>
        {abierta === "estado" && <PanelEstado r={r} ahora={ahora} />}
        {abierta === "enlaces" && <PanelEnlaces />}
        {abierta === "guia" && <PanelGuia r={r} />}
        {abierta === "promos" && <PanelPromos r={r} />}
      </section>
    </div>
  );
}
