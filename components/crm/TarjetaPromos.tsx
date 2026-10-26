"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import {
  crmConfirmarPortadaPromo,
  crmConfirmarVideoPromo,
  crmCrearPromo,
  crmEditarPromo,
  crmEliminarPromo,
  crmPrepararPortadaPromo,
  crmPrepararPromo,
  crmPrepararVideoPromo,
  crmPromosTarjeta,
  crmQuitarVideoPromo,
  crmSubirArchivoPromo,
  crmSubirPortada,
  crmSubirVideoPromo,
  ErrorCRM,
} from "@/lib/api";
import { comprimirVideo, ErrorVideo, navegadorComprime, portadaDeImagen, portadaDelVideo } from "@/lib/comprimir-video";
import { fechaLarga } from "@/lib/fechas";
import {
  diasRestantes,
  fechasPorDefecto,
  MAX_PROMO_CONDICIONES,
  MAX_PROMO_DETALLE,
  MAX_PROMO_GANCHO,
  MAX_PROMO_TITULO,
  type EstadoPromo,
  type PromoTarjeta,
} from "@/lib/tarjeta-promos-reglas";
import { MAX_CLAVE, MAX_SEGUNDOS_VIDEO } from "@/lib/tarjeta-videos-reglas";
import { AvisoMigracion } from "./panel/AvisoMigracion";
import { BotonImagen } from "./TarjetaVideos";

type Fase = "reposo" | "preparando" | "comprimiendo" | "subiendo" | "publicando";

const FRASE: Record<Exclude<Fase, "reposo">, string> = {
  preparando: "Preparando…",
  comprimiendo: "Comprimiendo tu video…",
  subiendo: "Subiendo a tu tarjeta…",
  publicando: "Publicando…",
};

/** Botón que abre el selector de videos y entrega el elegido (se puede volver a elegir el mismo). */
function BotonVideo({ texto, disabled, onArchivo }: { texto: string; disabled?: boolean; onArchivo: (f: File) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={entrada}
        type="file"
        accept="video/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onArchivo(f);
        }}
      />
      <button type="button" disabled={disabled} onClick={() => entrada.current?.click()} className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
        <Icon icon="flat-color-icons:film-reel" width={16} aria-hidden /> {texto}
      </button>
    </>
  );
}

const mensajeDe = (e: unknown, defecto: string) => (e instanceof ErrorVideo || e instanceof Error ? e.message : defecto);

const ESTADO: Record<EstadoPromo, { texto: string; color: string }> = {
  vigente: { texto: "En la tarjeta ahora", color: "var(--ok, #6ee7a8)" },
  programada: { texto: "Programada", color: "var(--brand-2)" },
  vencida: { texto: "Vencida", color: "var(--ink-mute, #8a8fae)" },
  oculta: { texto: "Oculta", color: "var(--ink-mute, #8a8fae)" },
};

/** «Del 25 de octubre al 31 de octubre» / «Desde el 25 de octubre, sin fecha de fin». */
function rangoDe(p: Pick<PromoTarjeta, "inicio" | "fin">): string {
  return p.fin ? `Del ${fechaLarga(p.inicio)} al ${fechaLarga(p.fin)}` : `Desde el ${fechaLarga(p.inicio)}, sin fecha de fin`;
}

function ayudaEstado(p: PromoTarjeta): string {
  if (p.estado === "oculta") return "La apagaste: no se ve en la tarjeta aunque esté en fechas.";
  if (p.estado === "programada") return `Aparece sola el ${fechaLarga(p.inicio)}.`;
  if (p.estado === "vencida") return "Ya pasó su fecha de fin: se quitó sola de la tarjeta.";
  const d = diasRestantes(p.fin);
  if (d === null) return "Sin fecha de fin: se queda hasta que la ocultes.";
  return d === 0 ? "Termina hoy." : d === 1 ? "Se quita sola mañana." : `Se quita sola en ${d} días.`;
}

/**
 * Promociones de tu tarjeta: publica la campaña del mes (Halloween, Buen Fin, regreso a clases…) con su portada, su texto gancho y sus fechas.
 * Sale sola en la sección «Promociones» de www.especialistaenasegurarte.lat/roberto el día que empieza y se quita sola al terminar.
 */
export function TarjetaPromos() {
  const [promos, setPromos] = useState<PromoTarjeta[] | null>(null);
  const [cloud, setCloud] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const porDefecto = useMemo(() => fechasPorDefecto(), []);
  const [imagenPortada, setImagenPortada] = useState<File | null>(null);
  const [archivoVideo, setArchivoVideo] = useState<File | null>(null);
  const [gancho, setGancho] = useState("");
  const [titulo, setTitulo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [clave, setClave] = useState("");
  const [condiciones, setCondiciones] = useState("");
  const [inicio, setInicio] = useState(porDefecto.inicio);
  const [fin, setFin] = useState(porDefecto.fin);
  const [sinFin, setSinFin] = useState(false);
  const [ia, setIa] = useState(true);
  const [fase, setFase] = useState<Fase>("reposo");
  const [progreso, setProgreso] = useState(0);
  const [fallo, setFallo] = useState("");
  const [listo, setListo] = useState("");
  const entradaPortada = useRef<HTMLInputElement>(null);
  const entradaVideo = useRef<HTMLInputElement>(null);

  // Vista previa de la portada elegida (la dirección temporal se libera al cambiar de imagen o al salir)
  const [vistaPortada, setVistaPortada] = useState("");
  const urlPrevia = useRef("");
  function elegirPortada(f: File | null) {
    if (urlPrevia.current) URL.revokeObjectURL(urlPrevia.current);
    urlPrevia.current = f ? URL.createObjectURL(f) : "";
    setVistaPortada(urlPrevia.current);
    setImagenPortada(f);
  }
  useEffect(
    () => () => {
      if (urlPrevia.current) URL.revokeObjectURL(urlPrevia.current);
    },
    [],
  );

  const cargar = useCallback(
    () =>
      crmPromosTarjeta().then(
        (d) => {
          setPromos(d.promos);
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
  const comprime = navegadorComprime();

  async function publicar() {
    if (ocupado) return;
    const g = gancho.trim();
    const t = titulo.trim();
    if (!g) return setFallo("Escribe el texto gancho: lo que se lee primero en la tarjeta.");
    if (!t) return setFallo("Escribe el nombre de la campaña.");
    if (!inicio) return setFallo("Elige el primer día de la promoción.");
    if (!sinFin && (!fin || fin < inicio)) return setFallo("La fecha de fin no puede ser anterior a la de inicio.");
    setFallo("");
    setListo("");
    setProgreso(0);
    try {
      setFase("preparando");
      // La portada se revisa ANTES de pedir permisos y de comprimir: si la imagen no sirve, te enteras al instante
      const propia = imagenPortada ? await portadaDeImagen(imagenPortada) : null;
      const permiso = await crmPrepararPromo(Boolean(propia) || Boolean(archivoVideo), Boolean(archivoVideo)); // si falta la migración, avisa aquí
      let v: Awaited<ReturnType<typeof comprimirVideo>> | null = null;
      if (archivoVideo) {
        setFase("comprimiendo");
        v = await comprimirVideo(archivoVideo, setProgreso);
      }
      let portada: Blob | null = propia;
      if (!portada && v) {
        try {
          portada = await portadaDelVideo(v.blob, v.duracion);
        } catch {
          portada = null; // sin portada la promoción se publica igual (solo con texto)
        }
      }
      setFase("subiendo");
      if (v) await crmSubirArchivoPromo(permiso, "video", v.blob);
      if (portada) await crmSubirArchivoPromo(permiso, "poster", portada);
      setFase("publicando");
      const nueva = await crmCrearPromo({
        id: permiso.id,
        titulo: t,
        gancho: g,
        detalle: detalle.trim(),
        clave,
        condiciones: condiciones.trim(),
        inicio,
        fin: sinFin ? null : fin,
        duracion: v?.duracion ?? 0,
        ia,
        conPortada: Boolean(portada),
        conVideo: Boolean(v),
      });
      setPromos((prev) => [nueva, ...(prev ?? [])]);
      elegirPortada(null);
      setArchivoVideo(null);
      setGancho("");
      setTitulo("");
      setDetalle("");
      setClave("");
      setCondiciones("");
      // Las fechas vuelven a «hoy → fin de este mes» para la siguiente campaña
      setInicio(porDefecto.inicio);
      setFin(porDefecto.fin);
      setSinFin(false);
      setIa(true);
      if (entradaPortada.current) entradaPortada.current.value = "";
      if (entradaVideo.current) entradaVideo.current.value = "";
      setListo(
        nueva.estado === "programada"
          ? `«${nueva.titulo}» quedó programada: aparece sola el ${fechaLarga(nueva.inicio)}.`
          : `«${nueva.titulo}» ya está en tu tarjeta (puede tardar hasta 1 minuto en verse).`,
      );
    } catch (e) {
      if (e instanceof ErrorCRM && e.migracion) setError(e);
      else setFallo(mensajeDe(e, "No pude publicar la promoción. Intenta de nuevo."));
    } finally {
      setFase("reposo");
    }
  }

  if (error instanceof ErrorCRM && error.migracion) {
    return (
      <AvisoMigracion
        onListo={() => void cargar()}
        archivo={error.archivo}
        que="las promociones de tu tarjeta"
        detalle="Tu libreta en la nube (Supabase) necesita una repisa nueva para guardar tus campañas. Se hace una sola vez."
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

  const vigentes = promos?.filter((p) => p.estado === "vigente").length ?? 0;

  return (
    <section className="space-y-4">
      <div className="glass-strong rounded-2xl p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-display text-lg text-ink">
          <Icon icon="flat-color-icons:advertising" width={22} aria-hidden /> Promociones de la tarjeta
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Publica la campaña del mes y sale en la sección <strong className="text-ink">«Promociones»</strong> de{" "}
          <strong className="text-ink">www.especialistaenasegurarte.lat/roberto</strong>, justo debajo de «Conóceme». Aparece sola el día que empieza y se quita sola al llegar a su fecha de fin; si no hay ninguna vigente, la sección no se ve.
        </p>
        {!cloud && <p className="mt-1 text-xs font-semibold text-amber">MODO DEMOSTRACIÓN: no se sube nada de verdad.</p>}
      </div>

      <div className="glass rounded-2xl p-4 sm:p-5">
        <h3 className="font-display text-base text-ink">Publicar una promoción</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="pr-portada">
              Portada
            </label>
            <div className="flex items-start gap-3">
              <div className="relative h-28 w-[63px] shrink-0 overflow-hidden rounded-lg border border-line bg-bg-3" aria-hidden>
                {vistaPortada ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={vistaPortada} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Icon icon="flat-color-icons:add-image" width={24} className="absolute inset-0 m-auto" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <input
                  id="pr-portada"
                  ref={entradaPortada}
                  type="file"
                  accept="image/*"
                  disabled={ocupado}
                  onChange={(e) => {
                    elegirPortada(e.target.files?.[0] ?? null);
                    setFallo("");
                  }}
                  className="field-input"
                />
                <p className="mt-1 text-xs text-ink-mute">
                  Una imagen vertical (1080×1920, como tus «Portadas Instagram»; si no es vertical se recorta al centro). Es lo primero que se ve de la promoción. Si subes un video y no eliges portada, se usa un cuadro del video.
                </p>
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="pr-gancho">
              Texto gancho (lo que se lee primero)
            </label>
            <input
              id="pr-gancho"
              className="field-input"
              value={gancho}
              maxLength={MAX_PROMO_GANCHO}
              disabled={ocupado}
              onChange={(e) => setGancho(e.target.value)}
              placeholder="Ej. ¡Truco o trato para tu auto! Hasta 30% de descuento"
            />
            <p className="mt-1 text-xs text-ink-mute">{gancho.length}/{MAX_PROMO_GANCHO} · una frase corta y con la ganancia clara; es el texto grande de la tarjeta.</p>
          </div>

          <div>
            <label className="field-label" htmlFor="pr-titulo">
              Nombre de la campaña
            </label>
            <input id="pr-titulo" className="field-input" value={titulo} maxLength={MAX_PROMO_TITULO} disabled={ocupado} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Halloween · Seguro de Auto" />
            <p className="mt-1 text-xs text-ink-mute">Sale chico arriba del texto gancho y es el nombre que ves en las estadísticas.</p>
          </div>

          <div>
            <label className="field-label" htmlFor="pr-clave">
              Palabra clave de WhatsApp (opcional)
            </label>
            <input
              id="pr-clave"
              className="field-input"
              value={clave}
              maxLength={MAX_CLAVE}
              disabled={ocupado}
              onChange={(e) => setClave(e.target.value.toLocaleUpperCase("es-MX"))}
              placeholder="Ej. AUTO"
            />
            <p className="mt-1 text-xs text-ink-mute">El botón dice «Escríbeme AUTO»; sin palabra, dice «Quiero esta promoción».</p>
          </div>

          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="pr-detalle">
              Detalle (opcional)
            </label>
            <textarea
              id="pr-detalle"
              className="field-input min-h-[72px]"
              value={detalle}
              maxLength={MAX_PROMO_DETALLE}
              disabled={ocupado}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="Una o dos líneas que explican la promoción."
            />
          </div>

          <div>
            <label className="field-label" htmlFor="pr-inicio">
              Primer día
            </label>
            <input id="pr-inicio" type="date" className="field-input" value={inicio} disabled={ocupado} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="pr-fin">
              Último día
            </label>
            <input id="pr-fin" type="date" className="field-input" value={fin} min={inicio} disabled={ocupado || sinFin} onChange={(e) => setFin(e.target.value)} />
            <label className="mt-1.5 flex items-center gap-2 text-xs text-ink-soft">
              <input type="checkbox" checked={sinFin} disabled={ocupado} onChange={(e) => setSinFin(e.target.checked)} className="h-4 w-4 accent-[var(--brand-2)]" /> Sin fecha de fin (se queda hasta que la ocultes)
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="pr-condiciones">
              Letra chica (opcional)
            </label>
            <textarea
              id="pr-condiciones"
              className="field-input min-h-[64px]"
              value={condiciones}
              maxLength={MAX_PROMO_CONDICIONES}
              disabled={ocupado}
              onChange={(e) => setCondiciones(e.target.value)}
              placeholder="Ej. Sujeto a aseguradora, perfil del conductor y vigencia."
            />
            <p className="mt-1 text-xs text-ink-mute">Sale pequeña debajo de la promoción. Pon aquí las condiciones reales de la campaña.</p>
          </div>

          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="pr-video">
              Video (opcional, hasta {MAX_SEGUNDOS_VIDEO / 60} minutos; .mp4 o .mov)
            </label>
            {!comprime && (
              <p className="mb-2 rounded-xl bg-bg-3 p-3 text-sm text-ink-soft">
                Este navegador no puede comprimir videos: la promoción se puede publicar solo con portada y texto. Para subir video abre el CRM en <strong className="text-ink">Chrome</strong> o en <strong className="text-ink">Safari</strong> actualizado.
              </p>
            )}
            <input
              id="pr-video"
              ref={entradaVideo}
              type="file"
              accept="video/*"
              disabled={ocupado || !comprime}
              onChange={(e) => {
                setArchivoVideo(e.target.files?.[0] ?? null);
                setFallo("");
              }}
              className="field-input"
            />
            <p className="mt-1 text-xs text-ink-mute">Si lo subes, <strong className="text-ink">al tocar la portada en la tarjeta se abre el video</strong> (sin salir de la página). Sin video, al tocarla se abre la imagen completa. Se comprime en tu aparato antes de subirse. Después puedes agregarlo, cambiarlo o quitarlo desde la lista de abajo.</p>
          </div>
          {archivoVideo && (
            <label className="flex items-start gap-2.5 text-sm text-ink-soft sm:col-span-2">
              <input type="checkbox" checked={ia} disabled={ocupado} onChange={(e) => setIa(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--brand-2)]" />
              <span>
                Creado con apoyo de <strong className="text-ink">inteligencia artificial</strong>
                <span className="block text-xs text-ink-mute">Muestra el aviso junto al video. Desmárcalo solo si es 100 % real.</span>
              </span>
            </label>
          )}
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
            <a href="/roberto#promociones" target="_blank" rel="noopener" className="text-brand-2 underline">
              Ver mi tarjeta
            </a>
          </p>
        )}
        <button type="button" onClick={() => void publicar()} disabled={ocupado || !gancho.trim() || !titulo.trim()} className="btn-primary mt-4 px-5 py-2.5 text-sm">
          {ocupado ? "Publicando…" : "Publicar promoción"}
        </button>
      </div>

      <div className="glass rounded-2xl p-4 sm:p-5">
        <h3 className="font-display text-base text-ink">
          Tus promociones {promos && `(${promos.length})`}
          {promos && vigentes > 0 && <span className="ml-2 text-xs font-normal text-ink-mute">{vigentes} en la tarjeta ahora</span>}
        </h3>
        {!promos ? (
          <div className="mt-3 h-20 animate-pulse rounded-xl bg-bg-3/70" aria-label="Cargando tus promociones" />
        ) : !promos.length ? (
          <p className="mt-3 text-sm text-ink-mute">Todavía no has publicado promociones. La primera que publiques saldrá en la tarjeta el día que empiece.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {promos.map((p) => (
              <FilaPromo
                key={p.id}
                p={p}
                onCambio={(n) => setPromos((prev) => (prev ?? []).map((x) => (x.id === n.id ? n : x)))}
                onQuitar={() => setPromos((prev) => (prev ?? []).filter((x) => x.id !== p.id))}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function FilaPromo({ p, onCambio, onQuitar }: { p: PromoTarjeta; onCambio: (p: PromoTarjeta) => void; onQuitar: () => void }) {
  const [editando, setEditando] = useState(false);
  const [gancho, setGancho] = useState(p.gancho);
  const [titulo, setTitulo] = useState(p.titulo);
  const [detalle, setDetalle] = useState(p.detalle);
  const [clave, setClave] = useState(p.clave);
  const [condiciones, setCondiciones] = useState(p.condiciones);
  const [inicio, setInicio] = useState(p.inicio);
  const [fin, setFin] = useState(p.fin ?? "");
  const [sinFin, setSinFin] = useState(!p.fin);
  const [ia, setIa] = useState(p.ia);
  const [seguro, setSeguro] = useState(false);
  const [quitando, setQuitando] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [fase, setFase] = useState<Exclude<Fase, "reposo" | "preparando" | "publicando"> | "guardando" | "reposo">("reposo");
  const [progreso, setProgreso] = useState(0);
  const [fallo, setFallo] = useState("");
  const [listo, setListo] = useState("");

  /** Agrega o cambia el video: se comprime aquí, se sube directo a Supabase y la portada de la tarjeta pasa a abrir el video. */
  async function subirVideo(archivo: File) {
    setTrabajando(true);
    setFallo("");
    setListo("");
    setProgreso(0);
    try {
      setFase("comprimiendo");
      const v = await comprimirVideo(archivo, setProgreso);
      // Si la promoción aún no tiene portada, se saca un cuadro del video para que la tarjeta no quede en blanco
      let cuadro: Blob | null = null;
      if (!p.poster) {
        try {
          cuadro = await portadaDelVideo(v.blob, v.duracion);
        } catch {
          cuadro = null;
        }
      }
      setFase("subiendo");
      const permiso = await crmPrepararVideoPromo(p.id);
      await crmSubirVideoPromo(permiso, v.blob);
      setFase("guardando");
      let nueva = await crmConfirmarVideoPromo(p.id, permiso.ts, v.duracion);
      if (cuadro) {
        try {
          const pp = await crmPrepararPortadaPromo(p.id);
          await crmSubirPortada(pp, cuadro);
          nueva = await crmConfirmarPortadaPromo(p.id, pp.ts);
        } catch {
          /* sin portada la promoción sirve igual: se puede subir una después */
        }
      }
      onCambio(nueva);
      setListo("Video guardado: al tocar la portada en la tarjeta se abre el video (puede tardar hasta 1 minuto en verse).");
    } catch (e) {
      setFallo(mensajeDe(e, "No pude subir el video. Intenta de nuevo."));
    } finally {
      setTrabajando(false);
      setFase("reposo");
    }
  }

  async function quitarVideo() {
    setTrabajando(true);
    setFallo("");
    setListo("");
    try {
      onCambio(await crmQuitarVideoPromo(p.id));
      setQuitando(false);
      setListo("Video quitado: al tocar la portada en la tarjeta se abre la imagen completa.");
    } catch (e) {
      setFallo(mensajeDe(e, "No pude quitar el video. Intenta de nuevo."));
    } finally {
      setTrabajando(false);
    }
  }

  async function guardar(cambios: Parameters<typeof crmEditarPromo>[1]) {
    setTrabajando(true);
    setFallo("");
    try {
      onCambio(await crmEditarPromo(p.id, cambios));
      setEditando(false);
    } catch (e) {
      setFallo((e as Error).message);
    } finally {
      setTrabajando(false);
    }
  }

  async function cambiarPortada(imagen: File) {
    setTrabajando(true);
    setFallo("");
    setListo("");
    try {
      const portada = await portadaDeImagen(imagen); // primero se valida y se convierte: si la imagen no sirve, se avisa antes de pedir permisos
      const permiso = await crmPrepararPortadaPromo(p.id);
      await crmSubirPortada(permiso, portada);
      onCambio(await crmConfirmarPortadaPromo(p.id, permiso.ts));
      setListo("Portada guardada. Se ve en la tarjeta en ~1 minuto.");
    } catch (e) {
      setFallo(mensajeDe(e, "No pude subir la portada. Intenta de nuevo."));
    } finally {
      setTrabajando(false);
    }
  }

  async function eliminar() {
    setTrabajando(true);
    setFallo("");
    try {
      await crmEliminarPromo(p.id);
      onQuitar();
    } catch (e) {
      setFallo((e as Error).message);
      setTrabajando(false);
    }
  }

  const est = ESTADO[p.estado];
  const finEdicion = sinFin ? null : fin || null;

  return (
    <li className="rounded-xl border border-line p-3" style={{ opacity: p.estado === "vigente" || p.estado === "programada" ? 1 : 0.72 }}>
      <div className="flex gap-3">
        <div className="relative block h-24 w-[54px] shrink-0 overflow-hidden rounded-lg bg-bg-3">
          {p.poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.poster} alt={`Portada de ${p.titulo}`} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <Icon icon="flat-color-icons:advertising" width={24} className="absolute inset-0 m-auto" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: est.color }}>
            ● {est.texto}
          </p>
          <p className="mt-0.5 font-semibold text-ink">{p.gancho}</p>
          <p className="mt-0.5 text-xs text-ink-mute">
            {p.titulo}
            {p.clave && ` · «${p.clave}»`}
            {p.src && " · con video"}
            {p.src && p.ia && " · con IA"}
          </p>
          <p className="mt-0.5 text-xs text-ink-mute">
            {rangoDe(p)} · {ayudaEstado(p)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <BotonImagen texto={p.poster ? "Cambiar portada" : "Subir portada"} disabled={trabajando} onArchivo={(a) => void cambiarPortada(a)} />
            {navegadorComprime() && <BotonVideo texto={p.src ? "Cambiar video" : "Subir video"} disabled={trabajando} onArchivo={(a) => void subirVideo(a)} />}
            {p.src &&
              (quitando ? (
                <>
                  <button type="button" disabled={trabajando} onClick={() => void quitarVideo()} className="btn-primary px-3 py-1.5 text-xs">
                    Sí, quitar video
                  </button>
                  <button type="button" disabled={trabajando} onClick={() => setQuitando(false)} className="btn-ghost px-3 py-1.5 text-xs">
                    No
                  </button>
                </>
              ) : (
                <button type="button" disabled={trabajando} onClick={() => setQuitando(true)} className="btn-ghost px-3 py-1.5 text-xs">
                  Quitar video
                </button>
              ))}
            <button type="button" disabled={trabajando} onClick={() => void guardar({ visible: !p.visible })} className="btn-ghost px-3 py-1.5 text-xs">
              {p.visible ? "Ocultar" : "Mostrar"}
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
          {trabajando && (
            <p className="mt-2 text-xs font-semibold text-ink" role="status">
              {fase === "comprimiendo" ? `Comprimiendo tu video… ${Math.round(progreso * 100)} %` : fase === "subiendo" ? "Subiendo el video…" : "Guardando…"}
              {fase !== "reposo" && <span className="mt-1 block text-ink-mute">No cierres esta pestaña hasta que termine.</span>}
            </p>
          )}
          {listo && !trabajando && (
            <p className="mt-2 text-xs font-semibold text-ink" role="status">
              ✓ {listo}
            </p>
          )}
        </div>
      </div>
      {editando && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor={`g-${p.id}`}>
              Texto gancho
            </label>
            <input id={`g-${p.id}`} className="field-input" value={gancho} maxLength={MAX_PROMO_GANCHO} onChange={(e) => setGancho(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor={`t-${p.id}`}>
              Nombre de la campaña
            </label>
            <input id={`t-${p.id}`} className="field-input" value={titulo} maxLength={MAX_PROMO_TITULO} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor={`c-${p.id}`}>
              Palabra clave de WhatsApp
            </label>
            <input id={`c-${p.id}`} className="field-input" value={clave} maxLength={MAX_CLAVE} onChange={(e) => setClave(e.target.value.toLocaleUpperCase("es-MX"))} />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor={`d-${p.id}`}>
              Detalle
            </label>
            <textarea id={`d-${p.id}`} className="field-input min-h-[64px]" value={detalle} maxLength={MAX_PROMO_DETALLE} onChange={(e) => setDetalle(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor={`i-${p.id}`}>
              Primer día
            </label>
            <input id={`i-${p.id}`} type="date" className="field-input" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor={`f-${p.id}`}>
              Último día
            </label>
            <input id={`f-${p.id}`} type="date" className="field-input" value={fin} min={inicio} disabled={sinFin} onChange={(e) => setFin(e.target.value)} />
            <label className="mt-1.5 flex items-center gap-2 text-xs text-ink-soft">
              <input type="checkbox" checked={sinFin} onChange={(e) => setSinFin(e.target.checked)} className="h-4 w-4 accent-[var(--brand-2)]" /> Sin fecha de fin
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor={`l-${p.id}`}>
              Letra chica
            </label>
            <textarea id={`l-${p.id}`} className="field-input min-h-[56px]" value={condiciones} maxLength={MAX_PROMO_CONDICIONES} onChange={(e) => setCondiciones(e.target.value)} />
          </div>
          {p.src && (
            <label className="flex items-center gap-2 text-sm text-ink-soft sm:col-span-2">
              <input type="checkbox" checked={ia} onChange={(e) => setIa(e.target.checked)} className="h-4 w-4 accent-[var(--brand-2)]" /> Video creado con apoyo de IA
            </label>
          )}
          <div className="sm:col-span-2">
            <button
              type="button"
              disabled={trabajando || !gancho.trim() || !titulo.trim() || !inicio || (!sinFin && (!fin || fin < inicio))}
              onClick={() => void guardar({ gancho, titulo, detalle, clave, condiciones, inicio, fin: finEdicion, ...(p.src ? { ia } : {}) })}
              className="btn-primary px-4 py-2 text-sm"
            >
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
