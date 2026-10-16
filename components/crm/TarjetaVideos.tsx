"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import {
  crmCrearVideo,
  crmEditarVideo,
  crmEliminarVideo,
  crmPrepararVideo,
  crmSubirArchivoVideo,
  crmVideosTarjeta,
  ErrorCRM,
} from "@/lib/api";
import { comprimirVideo, ErrorVideo, navegadorComprime, portadaDelVideo } from "@/lib/comprimir-video";
import { MAX_CLAVE, MAX_SEGUNDOS_VIDEO, MAX_TITULO, mmss, type VideoTarjeta } from "@/lib/tarjeta-videos-reglas";
import { fechaCorta } from "@/lib/fechas";
import { AvisoMigracion } from "./panel/AvisoMigracion";

type Fase = "reposo" | "preparando" | "comprimiendo" | "subiendo" | "publicando";

const FRASE: Record<Exclude<Fase, "reposo">, string> = {
  preparando: "Preparando…",
  comprimiendo: "Comprimiendo tu video…",
  subiendo: "Subiendo a tu tarjeta…",
  publicando: "Publicando…",
};

/**
 * Videos de tu tarjeta: sube un video desde el celular o la computadora y sale solo, primero, en el carrusel «Videos» de
 * www.especialistaenasegurarte.lat/roberto. El video se comprime en tu propio aparato antes de subirse (no gasta tus datos de más).
 */
export function TarjetaVideos() {
  const [videos, setVideos] = useState<VideoTarjeta[] | null>(null);
  const [cloud, setCloud] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [clave, setClave] = useState("");
  const [ia, setIa] = useState(true);
  const [fase, setFase] = useState<Fase>("reposo");
  const [progreso, setProgreso] = useState(0);
  const [fallo, setFallo] = useState("");
  const [listo, setListo] = useState("");
  const entrada = useRef<HTMLInputElement>(null);

  const cargar = useCallback(
    () =>
      crmVideosTarjeta().then(
        (d) => {
          setVideos(d.videos);
          setCloud(d.cloud);
          setError(null);
        },
        (e: unknown) => setError(e as Error),
      ),
    [],
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const ocupado = fase !== "reposo";

  async function publicar() {
    if (!archivo || ocupado) return;
    const t = titulo.trim();
    if (!t) {
      setFallo("Escribe el título del video.");
      return;
    }
    setFallo("");
    setListo("");
    setProgreso(0);
    try {
      setFase("preparando");
      const permiso = await crmPrepararVideo(); // si falta la migración, avisa ANTES de comprimir
      setFase("comprimiendo");
      const v = await comprimirVideo(archivo, setProgreso);
      let portada: Blob | null = null;
      try {
        portada = await portadaDelVideo(v.blob, v.duracion);
      } catch {
        portada = null; // sin portada el video se publica igual (con el primer cuadro)
      }
      setFase("subiendo");
      await crmSubirArchivoVideo(permiso, "video", v.blob);
      if (portada) await crmSubirArchivoVideo(permiso, "poster", portada);
      setFase("publicando");
      const nuevo = await crmCrearVideo({ id: permiso.id, titulo: t, clave, duracion: v.duracion, ia, conPortada: Boolean(portada) });
      setVideos((prev) => [nuevo, ...(prev ?? [])]);
      setArchivo(null);
      setTitulo("");
      setClave("");
      if (entrada.current) entrada.current.value = "";
      setListo(`«${nuevo.titulo}» ya está en tu tarjeta (puede tardar hasta 1 minuto en verse).`);
    } catch (e) {
      if (e instanceof ErrorCRM && e.migracion) setError(e);
      else setFallo(e instanceof ErrorVideo || e instanceof Error ? e.message : "No pude subir el video. Intenta de nuevo.");
    } finally {
      setFase("reposo");
    }
  }

  if (error instanceof ErrorCRM && error.migracion) {
    return (
      <AvisoMigracion
        onListo={() => void cargar()}
        archivo={error.archivo}
        que="los videos de tu tarjeta"
        detalle="Tu libreta en la nube (Supabase) necesita una repisa nueva para guardar tus videos y un cajón para los archivos. Se hace una sola vez."
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

  const comprime = navegadorComprime();

  return (
    <section className="space-y-4">
      <div className="glass-strong rounded-2xl p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-display text-lg text-ink">
          <Icon icon="flat-color-icons:film-reel" width={22} aria-hidden /> Videos de la tarjeta
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Sube un video y sale solo, <strong className="text-ink">primero</strong> en el carrusel «Videos» de{" "}
          <strong className="text-ink">www.especialistaenasegurarte.lat/roberto</strong>. Se comprime en tu aparato antes de subirse.
          Tus videos fijos de siempre (Maternidad, Gastos médicos, Ahorro…) se quedan después de los nuevos.
        </p>
        {!cloud && <p className="mt-1 text-xs font-semibold text-amber">MODO DEMOSTRACIÓN: no se sube nada de verdad.</p>}
      </div>

      <div className="glass rounded-2xl p-4 sm:p-5">
        <h3 className="font-display text-base text-ink">Subir un video nuevo</h3>
        {!comprime && (
          <p className="mt-2 rounded-xl bg-bg-3 p-3 text-sm text-ink-soft">
            Este navegador no puede comprimir videos. Abre el CRM en <strong className="text-ink">Chrome</strong> (Android o computadora) o en{" "}
            <strong className="text-ink">Safari</strong> actualizado (iPhone).
          </p>
        )}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="vt-archivo">
              Video (hasta {MAX_SEGUNDOS_VIDEO / 60} minutos; se aceptan .mp4 y .mov)
            </label>
            <input
              id="vt-archivo"
              ref={entrada}
              type="file"
              accept="video/*"
              disabled={ocupado || !comprime}
              onChange={(e) => {
                setArchivo(e.target.files?.[0] ?? null);
                setFallo("");
                setListo("");
              }}
              className="field-input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="vt-titulo">
              Título (lo que se ve en la tarjeta)
            </label>
            <input
              id="vt-titulo"
              className="field-input"
              value={titulo}
              maxLength={MAX_TITULO}
              disabled={ocupado}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. ¿Cuánto debería asegurar?"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="vt-clave">
              Palabra clave de WhatsApp (opcional)
            </label>
            <input
              id="vt-clave"
              className="field-input"
              value={clave}
              maxLength={MAX_CLAVE}
              disabled={ocupado}
              onChange={(e) => setClave(e.target.value.toLocaleUpperCase("es-MX"))}
              placeholder="Ej. ESCUDO"
            />
            <p className="mt-1 text-xs text-ink-mute">Sale un botón «Escríbeme ESCUDO» debajo del video; sin palabra, sale «Quiero asesoría».</p>
          </div>
          <label className="flex items-start gap-2.5 self-center text-sm text-ink-soft">
            <input type="checkbox" checked={ia} disabled={ocupado} onChange={(e) => setIa(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--brand-2)]" />
            <span>
              Creado con apoyo de <strong className="text-ink">inteligencia artificial</strong>
              <span className="block text-xs text-ink-mute">Muestra el aviso junto al video. Desmárcalo solo si es 100 % real.</span>
            </span>
          </label>
        </div>

        {ocupado && (
          <div className="mt-4" role="status" aria-live="polite">
            <p className="text-sm font-semibold text-ink">
              {FRASE[fase as Exclude<Fase, "reposo">]}
              {fase === "comprimiendo" && ` ${Math.round(progreso * 100)} %`}
            </p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bg-3" aria-hidden>
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{ width: `${fase === "comprimiendo" ? Math.max(4, progreso * 100) : fase === "preparando" ? 3 : 100}%`, background: "var(--brand-2)" }}
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-mute">No cierres esta pestaña hasta que termine.</p>
          </div>
        )}
        {fallo && (
          <p className="mt-3 text-sm font-semibold" style={{ color: "var(--err, #ff8f8f)" }} role="alert">
            {fallo}
          </p>
        )}
        {listo && (
          <p className="mt-3 text-sm font-semibold text-ink" role="status">
            ✓ {listo}{" "}
            <a href="/roberto#videos" target="_blank" rel="noopener" className="text-brand-2 underline">
              Ver mi tarjeta
            </a>
          </p>
        )}
        <button type="button" onClick={() => void publicar()} disabled={!archivo || !titulo.trim() || ocupado || !comprime} className="btn-primary mt-4 px-5 py-2.5 text-sm">
          {ocupado ? "Subiendo…" : "Subir y publicar"}
        </button>
      </div>

      <div className="glass rounded-2xl p-4 sm:p-5">
        <h3 className="font-display text-base text-ink">Tus videos subidos {videos && `(${videos.length})`}</h3>
        {!videos ? (
          <div className="mt-3 h-20 animate-pulse rounded-xl bg-bg-3/70" aria-label="Cargando tus videos" />
        ) : !videos.length ? (
          <p className="mt-3 text-sm text-ink-mute">Todavía no has subido videos desde aquí. El primero que subas saldrá al inicio del carrusel.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {videos.map((v) => (
              <FilaVideo
                key={v.id}
                v={v}
                onCambio={(n) => setVideos((prev) => (prev ?? []).map((x) => (x.id === n.id ? n : x)))}
                onQuitar={() => setVideos((prev) => (prev ?? []).filter((x) => x.id !== v.id))}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function FilaVideo({ v, onCambio, onQuitar }: { v: VideoTarjeta; onCambio: (v: VideoTarjeta) => void; onQuitar: () => void }) {
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(v.titulo);
  const [clave, setClave] = useState(v.clave);
  const [ia, setIa] = useState(v.ia);
  const [seguro, setSeguro] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [fallo, setFallo] = useState("");

  async function guardar(cambios: Parameters<typeof crmEditarVideo>[1]) {
    setTrabajando(true);
    setFallo("");
    try {
      onCambio(await crmEditarVideo(v.id, cambios));
      setEditando(false);
    } catch (e) {
      setFallo((e as Error).message);
    } finally {
      setTrabajando(false);
    }
  }

  async function eliminar() {
    setTrabajando(true);
    setFallo("");
    try {
      await crmEliminarVideo(v.id);
      onQuitar();
    } catch (e) {
      setFallo((e as Error).message);
      setTrabajando(false);
    }
  }

  return (
    <li className="rounded-xl border border-line p-3" style={{ opacity: v.visible ? 1 : 0.7 }}>
      <div className="flex gap-3">
        <a href={v.src} target="_blank" rel="noopener" className="relative block h-24 w-[54px] shrink-0 overflow-hidden rounded-lg bg-bg-3" aria-label={`Ver el video ${v.titulo}`}>
          {v.poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.poster} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <Icon icon="flat-color-icons:film-reel" width={24} className="absolute inset-0 m-auto" aria-hidden />
          )}
        </a>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{v.titulo}</p>
          <p className="mt-0.5 text-xs text-ink-mute">
            {mmss(v.duracion)} · {fechaCorta(v.creado_en.slice(0, 10))}
            {v.clave && ` · «${v.clave}»`}
            {v.ia && " · con IA"}
            {!v.visible && " · OCULTO en la tarjeta"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={trabajando} onClick={() => void guardar({ visible: !v.visible })} className="btn-ghost px-3 py-1.5 text-xs">
              {v.visible ? "Ocultar" : "Mostrar"}
            </button>
            <button type="button" disabled={trabajando} onClick={() => setEditando((x) => !x)} className="btn-ghost px-3 py-1.5 text-xs">
              {editando ? "Cancelar" : "Editar"}
            </button>
            {seguro ? (
              <>
                <button type="button" disabled={trabajando} onClick={() => void eliminar()} className="btn-primary px-3 py-1.5 text-xs">
                  Sí, eliminar
                </button>
                <button type="button" disabled={trabajando} onClick={() => setSeguro(false)} className="btn-ghost px-3 py-1.5 text-xs">
                  No
                </button>
              </>
            ) : (
              <button type="button" disabled={trabajando} onClick={() => setSeguro(true)} className="btn-ghost px-3 py-1.5 text-xs">
                Eliminar
              </button>
            )}
          </div>
        </div>
      </div>
      {editando && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor={`t-${v.id}`}>
              Título
            </label>
            <input id={`t-${v.id}`} className="field-input" value={titulo} maxLength={MAX_TITULO} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor={`c-${v.id}`}>
              Palabra clave de WhatsApp
            </label>
            <input id={`c-${v.id}`} className="field-input" value={clave} maxLength={MAX_CLAVE} onChange={(e) => setClave(e.target.value.toLocaleUpperCase("es-MX"))} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={ia} onChange={(e) => setIa(e.target.checked)} className="h-4 w-4 accent-[var(--brand-2)]" /> Creado con apoyo de IA
          </label>
          <div className="sm:col-span-2">
            <button type="button" disabled={trabajando || !titulo.trim()} onClick={() => void guardar({ titulo, clave, ia })} className="btn-primary px-4 py-2 text-sm">
              Guardar cambios
            </button>
          </div>
        </div>
      )}
      {fallo && (
        <p className="mt-2 text-sm font-semibold" style={{ color: "var(--err, #ff8f8f)" }} role="alert">
          {fallo}
        </p>
      )}
    </li>
  );
}
