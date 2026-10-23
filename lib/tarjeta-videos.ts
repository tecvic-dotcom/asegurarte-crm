import "server-only";

/**
 * Videos que subes desde el CRM y salen solos en la tarjeta (/roberto) — SOLO SERVIDOR.
 *  - NUBE: tabla tarjeta_videos + cajón de archivos «tarjeta-videos» de Supabase (ver supabase/migrations/0020_tarjeta_videos.sql).
 *    El navegador sube el .mp4 directo al cajón con un permiso de un solo uso que genera este módulo; aquí solo se guarda el renglón.
 *  - DEMO: memoria; los videos «subidos» apuntan a un video de muestra para practicar la pantalla sin tocar tu Supabase.
 */
import { randomUUID } from "node:crypto";
import { adminDb, cloudReady } from "./supabase-admin";
import { faltaMigracion, MENSAJE_MIGRACION_VIDEOS, MigracionPendienteError } from "./migracion";
import {
  BUCKET_VIDEOS,
  esIdFijo,
  PORTADA_FIJA,
  rutaPortada,
  rutaPortadaFija,
  rutaPortadaNueva,
  rutaVideo,
  tsValido,
  UUID,
  urlPublica,
  VIDEOS_FIJOS,
  type CambiosVideo,
  type DatosNuevoVideo,
  type PermisoPortada,
  type PermisoSubida,
  type VideoFijo,
  type VideoPublico,
  type VideoTarjeta,
} from "./tarjeta-videos-reglas";

const TABLA = "tarjeta_videos";
const MAX_PUBLICOS = 60;

interface Fila {
  id: string;
  creado_en: string;
  titulo: string;
  clave: string;
  video_path: string;
  poster_path: string;
  duracion: number;
  ia: boolean;
  visible: boolean;
}

const baseNube = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function errorDeBase(error: { code?: string; message: string }): Error {
  return faltaMigracion(error) ? new MigracionPendienteError(MENSAJE_MIGRACION_VIDEOS, "0020_tarjeta_videos.sql") : new Error(error.message);
}

// ---- DEMO (memoria) ----

function demoStore(): Fila[] {
  const g = globalThis as typeof globalThis & { __tarjetaVideos?: Fila[] };
  if (!g.__tarjetaVideos) {
    g.__tarjetaVideos = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        creado_en: new Date(Date.now() - 86_400_000).toISOString(),
        titulo: "Video de ejemplo (demo)",
        clave: "EJEMPLO",
        video_path: "/tarjeta/reels/maternidad.mp4",
        poster_path: "/tarjeta/reels/maternidad.jpg",
        duracion: 47,
        ia: true,
        visible: true,
      },
    ];
  }
  return g.__tarjetaVideos;
}

// ---- Conversión fila → lo que ve el CRM / la tarjeta ----

const esDemoRuta = (r: string) => r.startsWith("/");

function aVideo(f: Fila): VideoTarjeta {
  const nube = !esDemoRuta(f.video_path);
  return {
    id: f.id,
    titulo: f.titulo,
    clave: f.clave,
    duracion: f.duracion,
    ia: f.ia,
    visible: f.visible,
    creado_en: f.creado_en,
    src: nube ? urlPublica(baseNube(), f.video_path) : f.video_path,
    poster: nube ? urlPublica(baseNube(), f.poster_path) : f.poster_path,
  };
}

const aPublico = (v: VideoTarjeta): VideoPublico => ({ id: v.id, titulo: v.titulo, clave: v.clave, dur: v.duracion, ia: v.ia, src: v.src, poster: v.poster });

function normalizar(r: Record<string, unknown>): Fila {
  return {
    id: String(r.id),
    creado_en: String(r.creado_en ?? ""),
    titulo: String(r.titulo ?? ""),
    clave: String(r.clave ?? ""),
    video_path: String(r.video_path ?? ""),
    poster_path: String(r.poster_path ?? ""),
    duracion: Number(r.duracion) || 0,
    ia: r.ia !== false,
    visible: r.visible !== false,
  };
}

// ---- Lectura ----

/** Todos tus videos (también los ocultos), el más nuevo primero. */
export async function listarVideos(): Promise<VideoTarjeta[]> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).select("*").order("creado_en", { ascending: false }).limit(500);
    if (error) throw errorDeBase(error);
    return (data ?? []).map((r) => aVideo(normalizar(r)));
  }
  return [...demoStore()].sort((a, b) => b.creado_en.localeCompare(a.creado_en)).map(aVideo);
}

/** Solo los visibles, para la tarjeta pública. Nunca lanza: si algo falla, la tarjeta sigue con sus videos fijos. */
export async function listarVideosPublicos(): Promise<VideoPublico[]> {
  try {
    if (cloudReady && adminDb) {
      const { data, error } = await adminDb.from(TABLA).select("*").eq("visible", true).order("creado_en", { ascending: false }).limit(MAX_PUBLICOS);
      if (error) {
        if (!faltaMigracion(error)) console.error("[tarjeta-videos]", error.message);
        return [];
      }
      return (data ?? []).map((r) => aPublico(aVideo(normalizar(r))));
    }
    return (await listarVideos()).filter((v) => v.visible).slice(0, MAX_PUBLICOS).map(aPublico);
  } catch (e) {
    console.error("[tarjeta-videos]", e);
    return [];
  }
}

// ---- Subida ----

/** Genera el id del video y los permisos de un solo uso para subir el .mp4 y la portada directo a Supabase. */
export async function prepararSubida(): Promise<PermisoSubida> {
  const id = randomUUID();
  if (!(cloudReady && adminDb)) return { id, demo: true };

  // Si falta correr la migración 0020 (tabla o cajón), se avisa ANTES de comprimir y subir.
  const t = await adminDb.from(TABLA).select("id").limit(1);
  if (t.error) throw errorDeBase(t.error);
  const almacen = adminDb.storage.from(BUCKET_VIDEOS);
  const [v, p] = await Promise.all([almacen.createSignedUploadUrl(rutaVideo(id)), almacen.createSignedUploadUrl(rutaPortada(id))]);
  const err = v.error ?? p.error;
  if (err || !v.data || !p.data) {
    if (/not found|bucket/i.test(err?.message ?? "")) throw new MigracionPendienteError(MENSAJE_MIGRACION_VIDEOS, "0020_tarjeta_videos.sql");
    throw new Error(err?.message ?? "No pude preparar la subida.");
  }
  return {
    id,
    demo: false,
    nube: {
      url: baseNube(),
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      bucket: BUCKET_VIDEOS,
      video: { path: v.data.path, token: v.data.token },
      poster: { path: p.data.path, token: p.data.token },
    },
  };
}

/** Comprueba que el archivo ya está en el cajón (así no se registra un video que no llegó a subirse). */
async function existeArchivo(ruta: string, tipo: string): Promise<boolean> {
  try {
    const r = await fetch(urlPublica(baseNube(), ruta), { method: "HEAD", cache: "no-store" });
    return r.ok && (r.headers.get("content-type") ?? "").startsWith(tipo) && Number(r.headers.get("content-length") ?? 0) > 0;
  } catch {
    return false;
  }
}

export type ResultadoCrear = { ok: true; video: VideoTarjeta } | { ok: false; error: string };

/** Registra el video ya subido y lo deja visible, primero en el carrusel de la tarjeta. */
export async function crearVideo(d: DatosNuevoVideo): Promise<ResultadoCrear> {
  if (!(cloudReady && adminDb)) {
    const fila: Fila = {
      id: d.id,
      creado_en: new Date().toISOString(),
      titulo: d.titulo,
      clave: d.clave,
      video_path: "/tarjeta/reels/gastos-medicos.mp4",
      poster_path: "/tarjeta/reels/gastos-medicos.jpg",
      duracion: d.duracion,
      ia: d.ia,
      visible: true,
    };
    const s = demoStore();
    if (!s.some((x) => x.id === d.id)) s.push(fila);
    return { ok: true, video: aVideo(s.find((x) => x.id === d.id) ?? fila) };
  }
  if (!(await existeArchivo(rutaVideo(d.id), "video/"))) return { ok: false, error: "El video no terminó de subirse. Vuelve a intentarlo." };
  const conPortada = d.conPortada && (await existeArchivo(rutaPortada(d.id), "image/"));
  const fila = {
    id: d.id,
    titulo: d.titulo,
    clave: d.clave,
    video_path: rutaVideo(d.id),
    poster_path: conPortada ? rutaPortada(d.id) : "",
    duracion: d.duracion,
    ia: d.ia,
    visible: true,
  };
  const { data, error } = await adminDb.from(TABLA).insert(fila).select("*").single();
  if (error) {
    if (error.code === "23505") {
      // El mismo video registrado dos veces (doble toque): se devuelve el que ya existe.
      const ya = await adminDb.from(TABLA).select("*").eq("id", d.id).single();
      if (ya.data) return { ok: true, video: aVideo(normalizar(ya.data)) };
    }
    throw errorDeBase(error);
  }
  return { ok: true, video: aVideo(normalizar(data)) };
}

// ---- Cambios ----

export async function editarVideo(id: string, c: CambiosVideo): Promise<VideoTarjeta | null> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).update(c).eq("id", id).select("*").maybeSingle();
    if (error) throw errorDeBase(error);
    return data ? aVideo(normalizar(data)) : null;
  }
  const f = demoStore().find((x) => x.id === id);
  if (!f) return null;
  Object.assign(f, c);
  return aVideo(f);
}

/** Borra el renglón y los archivos del cajón. */
export async function eliminarVideo(id: string): Promise<boolean> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).select("video_path,poster_path").eq("id", id).maybeSingle();
    if (error) throw errorDeBase(error);
    if (!data) return false;
    const rutas = [data.video_path, data.poster_path].filter((r): r is string => typeof r === "string" && r.length > 0 && !esDemoRuta(r));
    if (rutas.length) {
      const r = await adminDb.storage.from(BUCKET_VIDEOS).remove(rutas);
      if (r.error) console.error("[tarjeta-videos] no pude borrar los archivos:", r.error.message);
    }
    const del = await adminDb.from(TABLA).delete().eq("id", id);
    if (del.error) throw errorDeBase(del.error);
    return true;
  }
  const s = demoStore();
  const i = s.findIndex((x) => x.id === id);
  if (i < 0) return false;
  s.splice(i, 1);
  return true;
}

// ---- Portadas: las de los videos que subes y las de los videos FIJOS de la tarjeta ----
//
// Los videos fijos (public/tarjeta/reels/<id>.mp4) traen su portada original en la propia tarjeta (<id>.jpg). Si subes una desde el CRM, queda en el cajón
// como p/<id>-<ts>.jpg (SIN tabla nueva: no hay SQL que correr) y la tarjeta la prefiere a la original. La más reciente de cada id es la que se ve.
// Cada portada nueva tiene su propia dirección (lleva el ts en el nombre), así el celular nunca se queda con una vieja en la memoria.

const CARPETA_FIJAS = "p";
const PORTADA_ORIGINAL = (id: string) => `/tarjeta/reels/${id}.jpg`;

function demoPortadas(): Map<string, number> {
  const g = globalThis as typeof globalThis & { __tarjetaPortadas?: Map<string, number> };
  if (!g.__tarjetaPortadas) g.__tarjetaPortadas = new Map();
  return g.__tarjetaPortadas;
}

interface PortadaFija {
  nombre: string;
  ts: number;
}

/** Las portadas subidas de cada video fijo: la más reciente por id (la que se ve) y todos sus archivos (para limpiar las viejas). */
async function leerPortadasFijas(): Promise<{ vigentes: Map<string, PortadaFija>; todas: Map<string, PortadaFija[]> }> {
  const vigentes = new Map<string, PortadaFija>();
  const todas = new Map<string, PortadaFija[]>();
  if (!(cloudReady && adminDb)) return { vigentes, todas };
  const { data, error } = await adminDb.storage.from(BUCKET_VIDEOS).list(CARPETA_FIJAS, { limit: 500 });
  if (error) throw new Error(error.message);
  for (const o of data ?? []) {
    const m = PORTADA_FIJA.exec(o.name);
    if (!m || !esIdFijo(m[1])) continue;
    const item = { nombre: o.name, ts: Number(m[2]) };
    todas.set(m[1], [...(todas.get(m[1]) ?? []), item]);
    const act = vigentes.get(m[1]);
    if (!act || act.ts < item.ts) vigentes.set(m[1], item);
  }
  return { vigentes, todas };
}

const urlFija = (nombre: string) => urlPublica(baseNube(), `${CARPETA_FIJAS}/${nombre}`);

/** Los videos fijos con la portada que se ve hoy (la tuya, si la subiste; si no, la original de la tarjeta). */
export async function listarFijos(): Promise<VideoFijo[]> {
  let vigentes = new Map<string, PortadaFija>();
  try {
    vigentes = (await leerPortadasFijas()).vigentes;
  } catch (e) {
    console.error("[tarjeta-videos] no pude leer las portadas subidas:", e);
  }
  const demo = demoPortadas();
  return VIDEOS_FIJOS.map((v) => {
    const sube = vigentes.get(v.id);
    return {
      id: v.id,
      titulo: v.titulo,
      tema: v.tema,
      poster: sube ? urlFija(sube.nombre) : PORTADA_ORIGINAL(v.id),
      personalizada: Boolean(sube) || (!(cloudReady && adminDb) && demo.has(v.id)),
    };
  });
}

/** Para la tarjeta pública: id → dirección de la portada que subiste. Nunca lanza (si algo falla, la tarjeta usa sus portadas originales). */
export async function portadasPublicas(): Promise<Record<string, string>> {
  try {
    if (!(cloudReady && adminDb)) return {};
    const { vigentes } = await leerPortadasFijas();
    return Object.fromEntries([...vigentes].map(([id, p]) => [id, urlFija(p.nombre)]));
  } catch (e) {
    console.error("[tarjeta-videos] portadas:", e);
    return {};
  }
}

/** Valida a qué video va la portada: un video FIJO o uno de los que subiste (id UUID que exista). */
async function existeObjetivo(objetivo: string): Promise<boolean> {
  if (esIdFijo(objetivo)) return true;
  if (!UUID.test(objetivo)) return false;
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).select("id").eq("id", objetivo).maybeSingle();
    if (error) throw errorDeBase(error);
    return Boolean(data);
  }
  return demoStore().some((x) => x.id === objetivo);
}

/** Permiso de un solo uso para subir una portada nueva directo al cajón. `null` si ese video no existe. */
export async function prepararPortada(objetivo: string): Promise<PermisoPortada | null> {
  if (!(await existeObjetivo(objetivo))) return null;
  const ts = Date.now();
  if (!(cloudReady && adminDb)) return { ts, demo: true };
  const ruta = esIdFijo(objetivo) ? rutaPortadaFija(objetivo, ts) : rutaPortadaNueva(objetivo, ts);
  const { data, error } = await adminDb.storage.from(BUCKET_VIDEOS).createSignedUploadUrl(ruta);
  if (error || !data) {
    if (/not found|bucket/i.test(error?.message ?? "")) throw new MigracionPendienteError(MENSAJE_MIGRACION_VIDEOS, "0020_tarjeta_videos.sql");
    throw new Error(error?.message ?? "No pude preparar la subida de la portada.");
  }
  return { ts, demo: false, nube: { url: baseNube(), anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", bucket: BUCKET_VIDEOS, poster: { path: data.path, token: data.token } } };
}

export type ResultadoPortada = { ok: true; fijo?: VideoFijo; video?: VideoTarjeta } | { ok: false; error: string; estado: number };

/** Confirma una portada ya subida: en un video fijo queda como la vigente (las anteriores se borran); en un video tuyo reemplaza a su portada. */
export async function confirmarPortada(objetivo: string, ts: unknown): Promise<ResultadoPortada> {
  if (!tsValido(ts)) return { ok: false, error: "Ese permiso ya venció. Vuelve a elegir la imagen.", estado: 422 };
  if (!(await existeObjetivo(objetivo))) return { ok: false, error: "Ese video ya no existe.", estado: 404 };
  const fijo = esIdFijo(objetivo);

  if (!(cloudReady && adminDb)) {
    // DEMO: no se subió nada de verdad; solo se practica la pantalla.
    if (fijo) {
      demoPortadas().set(objetivo, ts);
      return { ok: true, fijo: (await listarFijos()).find((v) => v.id === objetivo) };
    }
    const f = demoStore().find((x) => x.id === objetivo);
    return f ? { ok: true, video: aVideo(f) } : { ok: false, error: "Ese video ya no existe.", estado: 404 };
  }

  const ruta = fijo ? rutaPortadaFija(objetivo, ts) : rutaPortadaNueva(objetivo, ts);
  if (!(await existeArchivo(ruta, "image/"))) return { ok: false, error: "La portada no terminó de subirse. Vuelve a intentarlo.", estado: 422 };

  if (fijo) {
    // Las portadas anteriores de ese video ya no se ven: se borran para no acumular archivos
    const { todas } = await leerPortadasFijas();
    const viejas = (todas.get(objetivo) ?? []).filter((p) => p.ts !== ts).map((p) => `${CARPETA_FIJAS}/${p.nombre}`);
    if (viejas.length) {
      const r = await adminDb.storage.from(BUCKET_VIDEOS).remove(viejas);
      if (r.error) console.error("[tarjeta-videos] no pude borrar portadas viejas:", r.error.message);
    }
    return { ok: true, fijo: (await listarFijos()).find((v) => v.id === objetivo) };
  }

  const antes = await adminDb.from(TABLA).select("poster_path").eq("id", objetivo).maybeSingle();
  if (antes.error) throw errorDeBase(antes.error);
  const { data, error } = await adminDb.from(TABLA).update({ poster_path: ruta }).eq("id", objetivo).select("*").maybeSingle();
  if (error) throw errorDeBase(error);
  if (!data) return { ok: false, error: "Ese video ya no existe.", estado: 404 };
  const vieja = antes.data?.poster_path;
  if (typeof vieja === "string" && vieja && vieja !== ruta && !esDemoRuta(vieja)) {
    const r = await adminDb.storage.from(BUCKET_VIDEOS).remove([vieja]);
    if (r.error) console.error("[tarjeta-videos] no pude borrar la portada anterior:", r.error.message);
  }
  return { ok: true, video: aVideo(normalizar(data)) };
}

/** Vuelve a la portada original de un video fijo (borra la que habías subido). */
export async function quitarPortadaFija(id: string): Promise<VideoFijo | null> {
  if (!esIdFijo(id)) return null;
  if (!(cloudReady && adminDb)) {
    demoPortadas().delete(id);
  } else {
    const { todas } = await leerPortadasFijas();
    const rutas = (todas.get(id) ?? []).map((p) => `${CARPETA_FIJAS}/${p.nombre}`);
    if (rutas.length) {
      const r = await adminDb.storage.from(BUCKET_VIDEOS).remove(rutas);
      if (r.error) throw new Error(r.error.message);
    }
  }
  return (await listarFijos()).find((v) => v.id === id) ?? null;
}
