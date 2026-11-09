"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import {
  crmConfirmarPortada,
  crmCrearVideo,
  crmDestacados,
  crmEditarVideo,
  crmEliminarVideo,
  crmGuardarDestacados,
  crmPrepararPortada,
  crmPrepararVideo,
  crmQuitarPortada,
  crmSubirArchivoVideo,
  crmSubirPortada,
  crmVideosTarjeta,
  ErrorCRM,
} from "@/lib/api";
import { comprimirVideo, ErrorVideo, navegadorComprime, portadaDeImagen, portadaDelVideo } from "@/lib/comprimir-video";
import { INTERESES_TARJETA, MAX_CLAVE, MAX_SEGUNDOS_VIDEO, MAX_TITULO, mmss, type VideoFijo, type VideoTarjeta } from "@/lib/tarjeta-videos-reglas";
import { BOTONES_DESTACADO, MAX_BENEFICIO, MAX_DESTACADOS, type DestacadoCRM } from "@/lib/tarjeta-destacados-reglas";
import { fechaCorta } from "@/lib/fechas";
import { AvisoMigracion } from "./panel/AvisoMigracion";

type Fase = "reposo" | "preparando" | "comprimiendo" | "subiendo" | "publicando";

const FRASE: Record<Exclude<Fase, "reposo">, string> = {
  preparando: "Preparando…",
  comprimiendo: "Comprimiendo tu video…",
  subiendo: "Subiendo a tu tarjeta…",
  publicando: "Publicando…",
};

/** Sube una portada nueva (imagen que eliges) a un video: uno que subiste (id UUID) o uno fijo de la tarjeta (id como «maternidad»). */
async function subirPortadaDe(objetivo: string, imagen: File) {
  const portada = await portadaDeImagen(imagen); // primero se valida y se convierte: si la imagen no sirve, se avisa antes de pedir permisos
  const permiso = await crmPrepararPortada(objetivo);
  await crmSubirPortada(permiso, portada);
  return crmConfirmarPortada(objetivo, permiso.ts);
}

const mensajeDe = (e: unknown, defecto: string) => (e instanceof ErrorVideo || e instanceof Error ? e.message : defecto);

/** Botón que abre el selector de imágenes y entrega la elegida (se puede volver a elegir la misma). */
export function BotonImagen({ texto, disabled, onArchivo }: { texto: string; disabled?: boolean; onArchivo: (f: File) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={entrada}
        type="file"
        accept="image/*"
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
        <Icon icon="flat-color-icons:add-image" width={16} aria-hidden /> {texto}
      </button>
    </>
  );
}

const mismosIntereses = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Los chips de la tarjeta («Mi familia», «Mi auto»…): marcas a quién le sirve el video y le sale en «Te puede servir». */
function SelectorIntereses({ valor, onCambio, disabled, nombre }: { valor: string[]; onCambio: (cambiar: (antes: string[]) => string[]) => void; disabled?: boolean; nombre: string }) {
  return (
    <div className="sm:col-span-2">
      <p className="field-label" id={`${nombre}-t`}>
        ¿A quién le sirve este video? (chips de la tarjeta)
      </p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby={`${nombre}-t`}>
        {INTERESES_TARJETA.map((i) => {
          const activo = valor.includes(i.id);
          return (
            <button
              key={i.id}
              type="button"
              disabled={disabled}
              aria-pressed={activo}
              onClick={() => onCambio((antes) => (antes.includes(i.id) ? antes.filter((x) => x !== i.id) : [...antes, i.id]))}
              className={`rounded-xl border px-3 py-1.5 text-sm ${activo ? "border-brand-2 bg-brand/20 text-ink" : "border-line text-ink-soft hover:border-brand-2"}`}
            >
              {activo ? "✓ " : ""}
              {i.texto}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-ink-mute">
        Si alguien marca «Mi auto» en tu tarjeta, este video sale como recomendado. Si no marcas ninguno, la tarjeta intenta deducirlo de la palabra clave (AUTO, HOGAR, FAMILIA, RETIRO…); si es una palabra distinta, el video no saldrá en las recomendaciones.
      </p>
    </div>
  );
}

/** La casilla «Destacado en la tarjeta» de cada video: marca/desmarca; el beneficio y el botón se completan en el panel de arriba. */
function CasillaDestacado({ id, marcado, guardado, lleno, onCambio }: { id: string; marcado: boolean; guardado: boolean; lleno: boolean; onCambio: () => void }) {
  const bloqueado = !marcado && lleno;
  return (
    <label className={`mt-2 flex items-start gap-2 text-sm ${bloqueado ? "text-ink-mute" : "text-ink-soft"}`}>
      <input
        id={`dest-${id}`}
        type="checkbox"
        checked={marcado}
        disabled={bloqueado}
        onChange={onCambio}
        className="mt-0.5 h-4 w-4 accent-[var(--brand-2)]"
      />
      <span>
        <strong className="text-ink">Destacado en la tarjeta</strong>
        <span className="block text-xs text-ink-mute">
          {bloqueado
            ? `Ya hay ${MAX_DESTACADOS} destacados. Quita uno para poner este.`
            : marcado && !guardado
              ? "Completa su beneficio en «Videos destacados» (arriba) y pulsa «Guardar destacados»."
              : marcado
                ? "Se ve en tu tarjeta."
                : "Solo los destacados se ven en la tarjeta."}
        </span>
      </span>
    </label>
  );
}

interface InfoVideo {
  titulo: string;
  poster: string;
  oculto: boolean;
}

/**
 * Videos destacados: los únicos que se ven en tu tarjeta (hasta 3). Aquí escribes la línea de beneficio de cada uno, eliges a dónde lleva su botón
 * y su orden. La casilla «Destacado» de cada video de abajo agrega o quita un video de esta lista.
 */
function PanelDestacados({
  borrador,
  guardados,
  onCambio,
  infoDe,
  guardando,
  onGuardar,
  fallo,
  listo,
  migracion,
  onRecargar,
}: {
  borrador: DestacadoCRM[];
  guardados: DestacadoCRM[];
  onCambio: (n: DestacadoCRM[]) => void;
  infoDe: (id: string) => InfoVideo;
  guardando: boolean;
  onGuardar: () => void;
  fallo: string;
  listo: string;
  migracion: ErrorCRM | null;
  onRecargar: () => void;
}) {
  const hayCambios = JSON.stringify(borrador) !== JSON.stringify(guardados);
  const faltaBeneficio = borrador.some((d) => !d.beneficio.trim());
  const cambiar = (i: number, c: Partial<DestacadoCRM>) => onCambio(borrador.map((d, k) => (k === i ? { ...d, ...c } : d)));
  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= borrador.length) return;
    const n = [...borrador];
    [n[i], n[j]] = [n[j], n[i]];
    onCambio(n);
  };

  if (migracion) {
    return (
      <AvisoMigracion
        onListo={onRecargar}
        archivo={migracion.archivo}
        que="los videos destacados de tu tarjeta"
        detalle="Tu libreta en la nube (Supabase) necesita una repisa nueva para guardar cuáles son tus videos destacados. Se hace una sola vez, y mientras tanto tu tarjeta sigue mostrando los 3 de siempre."
      />
    );
  }

  return (
    <div className="glass-strong rounded-2xl p-4 sm:p-5">
      <h3 className="flex items-center gap-2 font-display text-base text-ink">
        <Icon icon="flat-color-icons:like" width={20} aria-hidden /> Videos destacados {`(${borrador.length} de ${MAX_DESTACADOS})`}
      </h3>
      <p className="mt-1 text-sm text-ink-soft">
        Son los <strong className="text-ink">únicos videos que se ven</strong> en tu tarjeta, en «Ideas claras sobre seguros y dinero». Cada uno lleva debajo una línea de beneficio y un botón. Los demás
        quedan para tus redes. Para destacar un video, marca su casilla <strong className="text-ink">«Destacado en la tarjeta»</strong> en las listas de abajo.
      </p>
      {!borrador.length ? (
        <p className="mt-3 rounded-xl bg-bg-3 p-3 text-sm text-ink-soft">
          Todavía no hay destacados guardados: mientras tanto tu tarjeta muestra los 3 que trae de fábrica (el testimonio, «¿Y si mañana no pudieras trabajar?» y «¿Los seguros son un lujo o una herramienta?»).
        </p>
      ) : (
        <ol className="mt-3 space-y-3">
          {borrador.map((d, i) => {
            const info = infoDe(d.video_id);
            return (
              <li key={d.video_id} className="rounded-xl border border-line p-3">
                <div className="flex gap-3">
                  <div className="relative block h-24 w-[54px] shrink-0 overflow-hidden rounded-lg bg-bg-3">
                    {info.poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={info.poster} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <Icon icon="flat-color-icons:film-reel" width={24} className="absolute inset-0 m-auto" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <p className="font-semibold text-ink">
                      {i + 1}. {info.titulo}
                    </p>
                    {info.oculto && <p className="text-xs font-semibold text-amber">Este video está OCULTO: no se verá en la tarjeta hasta que lo muestres.</p>}
                    <div>
                      <label className="field-label" htmlFor={`dest-b-${d.video_id}`}>
                        Beneficio (qué gana quien lo ve)
                      </label>
                      <input
                        id={`dest-b-${d.video_id}`}
                        className="field-input"
                        value={d.beneficio}
                        maxLength={MAX_BENEFICIO}
                        disabled={guardando}
                        onChange={(e) => cambiar(i, { beneficio: e.target.value })}
                        placeholder="Ej. Qué pasa con el ingreso de tu familia si un día no puedes trabajar."
                      />
                      <p className="mt-1 text-xs text-ink-mute">
                        {d.beneficio.length}/{MAX_BENEFICIO} · Una línea, en lenguaje sencillo.
                      </p>
                    </div>
                    <div>
                      <label className="field-label" htmlFor={`dest-r-${d.video_id}`}>
                        Botón debajo del video
                      </label>
                      <select id={`dest-r-${d.video_id}`} className="field-input" value={d.ramo} disabled={guardando} onChange={(e) => cambiar(i, { ramo: e.target.value })}>
                        {BOTONES_DESTACADO.map((b) => (
                          <option key={b.ramo || "asesoria"} value={b.ramo}>
                            {b.texto}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-ink-mute">
                        {d.ramo ? "Abre el mosaico de ese seguro en tu tarjeta, con lo que cubre y su formulario." : "Baja al formulario «Solicita tu asesoría sin costo»."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={guardando || i === 0} onClick={() => mover(i, -1)} className="btn-ghost px-3 py-1.5 text-xs" aria-label={`Subir ${info.titulo}`}>
                        ↑ Subir
                      </button>
                      <button
                        type="button"
                        disabled={guardando || i === borrador.length - 1}
                        onClick={() => mover(i, 1)}
                        className="btn-ghost px-3 py-1.5 text-xs"
                        aria-label={`Bajar ${info.titulo}`}
                      >
                        ↓ Bajar
                      </button>
                      <button
                        type="button"
                        disabled={guardando}
                        onClick={() => onCambio(borrador.filter((x) => x.video_id !== d.video_id))}
                        className="btn-ghost px-3 py-1.5 text-xs"
                      >
                        Quitar de destacados
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {fallo && (
        <p className="mt-3 text-sm font-semibold" style={{ color: "var(--err, #ff8f8f)" }} role="alert">
          {fallo}
        </p>
      )}
      {listo && !fallo && (
        <p className="mt-3 text-sm font-semibold text-ink" role="status">
          ✓ {listo}{" "}
          <a href="/roberto#videos" target="_blank" rel="noopener" className="text-brand-2 underline">
            Ver mi tarjeta
          </a>
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onGuardar} disabled={guardando || !hayCambios || faltaBeneficio} className="btn-primary px-5 py-2.5 text-sm">
          {guardando ? "Guardando…" : "Guardar destacados"}
        </button>
        {hayCambios && faltaBeneficio && <span className="text-xs text-ink-mute">Escribe la línea de beneficio de cada video para poder guardar.</span>}
        {!hayCambios && !listo && <span className="text-xs text-ink-mute">Sin cambios por guardar.</span>}
      </div>
    </div>
  );
}

/**
 * Videos de tu tarjeta: eliges los 3 DESTACADOS que se ven en www.especialistaenasegurarte.lat/roberto (cada uno con su beneficio y su botón), subes videos
 * nuevos desde el celular o la computadora (se comprimen en tu propio aparato antes de subirse) y les cambias la PORTADA.
 */
export function TarjetaVideos() {
  const [videos, setVideos] = useState<VideoTarjeta[] | null>(null);
  const [fijos, setFijos] = useState<VideoFijo[] | null>(null);
  const [cloud, setCloud] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Videos destacados: `destacados` = lo guardado; `borrador` = lo que estás editando (se guarda con el botón)
  const [destacados, setDestacados] = useState<DestacadoCRM[]>([]);
  const [borrador, setBorrador] = useState<DestacadoCRM[]>([]);
  const [migDest, setMigDest] = useState<ErrorCRM | null>(null);
  const [guardandoDest, setGuardandoDest] = useState(false);
  const [falloDest, setFalloDest] = useState("");
  const [listoDest, setListoDest] = useState("");

  const [archivo, setArchivo] = useState<File | null>(null);
  const [imagenPortada, setImagenPortada] = useState<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [clave, setClave] = useState("");
  const [intereses, setIntereses] = useState<string[]>([]);
  const [ia, setIa] = useState(true);
  const [fase, setFase] = useState<Fase>("reposo");
  const [progreso, setProgreso] = useState(0);
  const [fallo, setFallo] = useState("");
  const [listo, setListo] = useState("");
  const entrada = useRef<HTMLInputElement>(null);
  const entradaPortada = useRef<HTMLInputElement>(null);

  const cargar = useCallback(
    () =>
      crmVideosTarjeta().then(
        (d) => {
          setVideos(d.videos);
          setFijos(d.fijos ?? []);
          setCloud(d.cloud);
          setError(null);
        },
        (e: unknown) => setError(e as Error),
      ),
    [],
  );

  const cargarDestacados = useCallback(
    () =>
      crmDestacados().then(
        (d) => {
          setDestacados(d);
          setBorrador(d);
          setMigDest(null);
        },
        (e: unknown) => {
          if (e instanceof ErrorCRM && e.migracion) setMigDest(e);
          else setFalloDest(e instanceof Error ? e.message : "No pude leer tus videos destacados.");
        },
      ),
    [],
  );

  useEffect(() => {
    void cargar();
    void cargarDestacados();
  }, [cargar, cargarDestacados]);

  const ocupado = fase !== "reposo";

  /** Nombre, portada y si está oculto, de un video destacado (uno tuyo o uno fijo). */
  const infoDe = (id: string): InfoVideo => {
    const v = videos?.find((x) => x.id === id);
    if (v) return { titulo: v.titulo, poster: v.poster, oculto: !v.visible };
    const f = fijos?.find((x) => x.id === id);
    if (f) return { titulo: f.titulo, poster: f.poster, oculto: false };
    return { titulo: videos && fijos ? "(video que ya no existe)" : "Cargando…", poster: "", oculto: false };
  };

  /** Marca o desmarca «Destacado» en un video: lo agrega al borrador (sin beneficio todavía) o lo quita. */
  function alternarDestacado(id: string) {
    setListoDest("");
    setFalloDest("");
    if (borrador.some((d) => d.video_id === id)) {
      setBorrador(borrador.filter((d) => d.video_id !== id));
    } else if (borrador.length < MAX_DESTACADOS) {
      setBorrador([...borrador, { video_id: id, beneficio: "", ramo: "" }]);
    }
  }

  async function guardarDestacados() {
    if (guardandoDest) return;
    setGuardandoDest(true);
    setFalloDest("");
    setListoDest("");
    try {
      const g = await crmGuardarDestacados(borrador);
      setDestacados(g);
      setBorrador(g);
      setListoDest("Destacados guardados. Se ven en tu tarjeta en ~1 minuto.");
    } catch (e) {
      if (e instanceof ErrorCRM && e.migracion) setMigDest(e);
      else setFalloDest(e instanceof Error ? e.message : "No pude guardar tus destacados. Intenta de nuevo.");
    } finally {
      setGuardandoDest(false);
    }
  }

  const estaMarcado = (id: string) => borrador.some((d) => d.video_id === id);
  const estaGuardado = (id: string) => destacados.some((d) => d.video_id === id);
  const lleno = borrador.length >= MAX_DESTACADOS;

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
      // Si elegiste una portada, se revisa ANTES de comprimir (así no esperas para enterarte de que la imagen no sirve)
      const propia = imagenPortada ? await portadaDeImagen(imagenPortada) : null;
      const permiso = await crmPrepararVideo(); // si falta la migración, avisa ANTES de comprimir
      setFase("comprimiendo");
      const v = await comprimirVideo(archivo, setProgreso);
      let portada: Blob | null = propia;
      if (!portada) {
        try {
          portada = await portadaDelVideo(v.blob, v.duracion);
        } catch {
          portada = null; // sin portada el video se publica igual (con el primer cuadro)
        }
      }
      setFase("subiendo");
      await crmSubirArchivoVideo(permiso, "video", v.blob);
      if (portada) await crmSubirArchivoVideo(permiso, "poster", portada);
      setFase("publicando");
      const { video: nuevo, sinIntereses } = await crmCrearVideo({ id: permiso.id, titulo: t, clave, duracion: v.duracion, ia, intereses, conPortada: Boolean(portada) });
      setVideos((prev) => [nuevo, ...(prev ?? [])]);
      setArchivo(null);
      setImagenPortada(null);
      setTitulo("");
      setClave("");
      setIntereses([]);
      if (entrada.current) entrada.current.value = "";
      if (entradaPortada.current) entradaPortada.current.value = "";
      setListo(`«${nuevo.titulo}» ya se subió. Para que se vea en tu tarjeta, márcalo como «Destacado» en la lista de abajo.`);
      if (sinIntereses) {
        setFallo("El video quedó publicado, pero los chips que marcaste no se guardaron: falta un paso en Supabase (SQL Editor → pega supabase/migrations/0022_tarjeta_videos_intereses.sql → Run). Luego márcalos con «Editar». Mientras tanto la tarjeta usa la palabra clave.");
      }
    } catch (e) {
      if (e instanceof ErrorCRM && e.migracion) setError(e);
      else setFallo(mensajeDe(e, "No pude subir el video. Intenta de nuevo."));
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
          Tu tarjeta (<strong className="text-ink">www.especialistaenasegurarte.lat/roberto</strong>) muestra solo <strong className="text-ink">3 videos destacados</strong>: los eliges aquí abajo en
          «Videos destacados». Puedes subir videos nuevos (se comprimen en tu aparato antes de subirse) y darles una portada con el botón{" "}
          <strong className="text-ink">«Subir portada»</strong>: elige la imagen vertical (las de «Portadas Instagram» sirven). Un video nuevo no se ve en la tarjeta hasta que lo marques como
          «Destacado».
        </p>
        {!cloud && <p className="mt-1 text-xs font-semibold text-amber">MODO DEMOSTRACIÓN: no se sube nada de verdad.</p>}
      </div>

      <PanelDestacados
        borrador={borrador}
        guardados={destacados}
        onCambio={(n) => {
          setBorrador(n);
          setListoDest("");
          setFalloDest("");
        }}
        infoDe={infoDe}
        guardando={guardandoDest}
        onGuardar={() => void guardarDestacados()}
        fallo={falloDest}
        listo={listoDest}
        migracion={migDest}
        onRecargar={() => void cargarDestacados()}
      />

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
            <label className="field-label" htmlFor="vt-portada">
              Portada (opcional)
            </label>
            <input
              id="vt-portada"
              ref={entradaPortada}
              type="file"
              accept="image/*"
              disabled={ocupado}
              onChange={(e) => {
                setImagenPortada(e.target.files?.[0] ?? null);
                setFallo("");
              }}
              className="field-input"
            />
            <p className="mt-1 text-xs text-ink-mute">
              Una imagen vertical (1080×1920, como tus «Portadas Instagram»). Si no eliges ninguna, se usa un cuadro del video. Después puedes cambiarla con «Cambiar portada».
            </p>
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
          <SelectorIntereses nombre="vt-int" valor={intereses} onCambio={setIntereses} disabled={ocupado} />
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
          <p className="mt-3 text-sm text-ink-mute">Todavía no has subido videos desde aquí. Cuando subas uno, márcalo como «Destacado» para que se vea en tu tarjeta.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {videos.map((v) => (
              <FilaVideo
                key={v.id}
                v={v}
                destacado={migDest ? undefined : { marcado: estaMarcado(v.id), guardado: estaGuardado(v.id), lleno, onCambio: () => alternarDestacado(v.id) }}
                onCambio={(n) => setVideos((prev) => (prev ?? []).map((x) => (x.id === n.id ? n : x)))}
                onQuitar={() => setVideos((prev) => (prev ?? []).filter((x) => x.id !== v.id))}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="glass rounded-2xl p-4 sm:p-5">
        <h3 className="font-display text-base text-ink">Videos fijos de la tarjeta {fijos && `(${fijos.length})`}</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Los de siempre (Gastos médicos, Maternidad, Ahorro…). Ya no se ven en la tarjeta salvo que los marques como «Destacado». Aquí también puedes subirle a cada uno su portada; si te arrepientes,
          «Volver a la original».
        </p>
        {!fijos ? (
          <div className="mt-3 h-20 animate-pulse rounded-xl bg-bg-3/70" aria-label="Cargando los videos fijos" />
        ) : (
          <ul className="mt-3 space-y-3">
            {fijos.map((f) => (
              <FilaFijo
                key={f.id}
                f={f}
                destacado={migDest ? undefined : { marcado: estaMarcado(f.id), guardado: estaGuardado(f.id), lleno, onCambio: () => alternarDestacado(f.id) }}
                onCambio={(n) => setFijos((prev) => (prev ?? []).map((x) => (x.id === n.id ? n : x)))}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Una fila de video FIJO: su portada actual y el botón para subirle otra. */
type PropsDestacado = { marcado: boolean; guardado: boolean; lleno: boolean; onCambio: () => void };

function FilaFijo({ f, onCambio, destacado }: { f: VideoFijo; onCambio: (f: VideoFijo) => void; destacado?: PropsDestacado }) {
  const [trabajando, setTrabajando] = useState(false);
  const [fallo, setFallo] = useState("");
  const [listo, setListo] = useState("");

  async function subir(imagen: File) {
    setTrabajando(true);
    setFallo("");
    setListo("");
    try {
      const r = await subirPortadaDe(f.id, imagen);
      if (r.fijo) onCambio(r.fijo);
      setListo("Portada guardada. Se ve en la tarjeta en ~1 minuto.");
    } catch (e) {
      setFallo(mensajeDe(e, "No pude subir la portada. Intenta de nuevo."));
    } finally {
      setTrabajando(false);
    }
  }

  async function volver() {
    setTrabajando(true);
    setFallo("");
    setListo("");
    try {
      onCambio(await crmQuitarPortada(f.id));
      setListo("Volvió la portada original.");
    } catch (e) {
      setFallo(mensajeDe(e, "No pude quitar la portada."));
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <li className="rounded-xl border border-line p-3">
      <div className="flex gap-3">
        <div className="relative block h-24 w-[54px] shrink-0 overflow-hidden rounded-lg bg-bg-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={f.poster} alt={`Portada de ${f.titulo}`} className="h-full w-full object-cover" loading="lazy" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{f.titulo}</p>
          <p className="mt-0.5 text-xs text-ink-mute">
            {f.tema} · {f.personalizada ? "portada que subiste tú" : "portada original"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <BotonImagen texto={f.personalizada ? "Cambiar portada" : "Subir portada"} disabled={trabajando} onArchivo={(a) => void subir(a)} />
            {f.personalizada && (
              <button type="button" disabled={trabajando} onClick={() => void volver()} className="btn-ghost px-3 py-1.5 text-xs">
                Volver a la original
              </button>
            )}
          </div>
          {destacado && <CasillaDestacado id={f.id} marcado={destacado.marcado} guardado={destacado.guardado} lleno={destacado.lleno} onCambio={destacado.onCambio} />}
          {trabajando && (
            <p className="mt-2 text-xs font-semibold text-ink" role="status">
              Subiendo la portada…
            </p>
          )}
          {listo && !trabajando && (
            <p className="mt-2 text-xs font-semibold text-ink" role="status">
              ✓ {listo}
            </p>
          )}
          {fallo && (
            <p className="mt-2 text-sm font-semibold" style={{ color: "var(--err, #ff8f8f)" }} role="alert">
              {fallo}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function FilaVideo({ v, onCambio, onQuitar, destacado }: { v: VideoTarjeta; onCambio: (v: VideoTarjeta) => void; onQuitar: () => void; destacado?: PropsDestacado }) {
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(v.titulo);
  const [clave, setClave] = useState(v.clave);
  const [ia, setIa] = useState(v.ia);
  const [intereses, setIntereses] = useState<string[]>(v.intereses ?? []);
  const [seguro, setSeguro] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [fallo, setFallo] = useState("");
  const [listo, setListo] = useState("");

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

  async function cambiarPortada(imagen: File) {
    setTrabajando(true);
    setFallo("");
    setListo("");
    try {
      const r = await subirPortadaDe(v.id, imagen);
      if (r.video) onCambio(r.video);
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
          {v.intereses?.length > 0 && (
            <p className="mt-0.5 text-xs text-ink-mute">Recomendado en: {v.intereses.map((id) => INTERESES_TARJETA.find((i) => i.id === id)?.texto ?? id).join(", ")}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <BotonImagen texto={v.poster ? "Cambiar portada" : "Subir portada"} disabled={trabajando} onArchivo={(a) => void cambiarPortada(a)} />
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
          {destacado && <CasillaDestacado id={v.id} marcado={destacado.marcado} guardado={destacado.guardado} lleno={destacado.lleno} onCambio={destacado.onCambio} />}
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
          <SelectorIntereses nombre={`i-${v.id}`} valor={intereses} onCambio={setIntereses} disabled={trabajando} />
          <div className="sm:col-span-2">
            <button type="button" disabled={trabajando || !titulo.trim()} onClick={() => void guardar({ titulo, clave, ia, ...(mismosIntereses(intereses, v.intereses ?? []) ? {} : { intereses }) })} className="btn-primary px-4 py-2 text-sm">
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
