import "server-only";

/**
 * Promociones que publicas desde el CRM y salen solas en la sección «Promociones» de la tarjeta (/roberto) — SOLO SERVIDOR.
 *  - NUBE: tabla tarjeta_promos (supabase/migrations/0023_tarjeta_promos.sql) + el cajón «tarjeta-videos» que ya existe (carpeta promo/).
 *    El navegador sube la portada y el video directo al cajón con permisos de un solo uso que genera este módulo; aquí solo se guarda el renglón.
 *  - DEMO: memoria; las promociones «subidas» apuntan a una portada y un video de muestra para practicar la pantalla sin tocar tu Supabase.
 * La tarjeta solo ve las promociones VIGENTES hoy (visibles, ya empezadas y con fecha de fin sin vencer, hora de Monterrey).
 */
import { randomUUID } from "node:crypto";
import { adminDb, cloudReady } from "./supabase-admin";
import { hoyLocal } from "./fechas";
import { faltaMigracion, MENSAJE_MIGRACION_PROMOS, MigracionPendienteError } from "./migracion";
import { existeArchivo } from "./tarjeta-videos";
import { BUCKET_VIDEOS, tsValido, urlPublica, type PermisoPortada } from "./tarjeta-videos-reglas";
import {
  estadoDe,
  MAX_PROMOS_PUBLICAS,
  rutaPromoPortada,
  rutaPromoPortadaNueva,
  rutaPromoVideo,
  type CambiosPromo,
  type DatosNuevaPromo,
  type PermisoPromo,
  type PromoPublica,
  type PromoTarjeta,
} from "./tarjeta-promos-reglas";

const TABLA = "tarjeta_promos";

interface Fila {
  id: string;
  creado_en: string;
  titulo: string;
  gancho: string;
  detalle: string;
  clave: string;
  condiciones: string;
  inicio: string;
  fin: string | null;
  poster_path: string;
  video_path: string;
  duracion: number;
  ia: boolean;
  visible: boolean;
}

const baseNube = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function errorDeBase(error: { code?: string; message: string }): Error {
  if (faltaMigracion(error)) return new MigracionPendienteError(MENSAJE_MIGRACION_PROMOS, "0023_tarjeta_promos.sql");
  // 23514 = la regla de la base «fin ≥ inicio» (por ejemplo al mover solo el inicio más allá del fin)
  if (error.code === "23514") return new Error("La fecha de fin no puede ser anterior a la de inicio.");
  return new Error(error.message);
}

// ---- DEMO (memoria) ----

const SUMA_DIAS = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

function demoStore(): Fila[] {
  const g = globalThis as typeof globalThis & { __tarjetaPromos?: Fila[] };
  if (!g.__tarjetaPromos) {
    g.__tarjetaPromos = [
      {
        id: "22222222-2222-4222-8222-222222222222",
        creado_en: new Date(Date.now() - 86_400_000).toISOString(),
        titulo: "Promoción de ejemplo (demo)",
        gancho: "Hasta 30% de descuento en tu seguro de auto",
        detalle: "Cotiza gratis y conoce tu descuento hoy mismo.",
        clave: "AUTO",
        condiciones: "Sujeto a aseguradora, perfil del conductor y vigencia.",
        inicio: SUMA_DIAS(-2),
        fin: SUMA_DIAS(10),
        poster_path: "/tarjeta/reels/gastos-medicos.jpg",
        video_path: "/tarjeta/reels/gastos-medicos.mp4",
        duracion: 47,
        ia: true,
        visible: true,
      },
    ];
  }
  return g.__tarjetaPromos;
}

// ---- Conversión fila → lo que ve el CRM / la tarjeta ----

const esDemoRuta = (r: string) => r.startsWith("/");
const urlDe = (ruta: string) => (!ruta ? "" : esDemoRuta(ruta) ? ruta : urlPublica(baseNube(), ruta));

function aPromo(f: Fila): PromoTarjeta {
  return {
    id: f.id,
    titulo: f.titulo,
    gancho: f.gancho,
    detalle: f.detalle,
    clave: f.clave,
    condiciones: f.condiciones,
    inicio: f.inicio,
    fin: f.fin,
    duracion: f.duracion,
    ia: f.ia,
    visible: f.visible,
    creado_en: f.creado_en,
    estado: estadoDe(f),
    src: urlDe(f.video_path),
    poster: urlDe(f.poster_path),
  };
}

const aPublica = (p: PromoTarjeta): PromoPublica => ({
  id: p.id,
  titulo: p.titulo,
  gancho: p.gancho,
  detalle: p.detalle,
  clave: p.clave,
  condiciones: p.condiciones,
  fin: p.fin,
  dur: p.duracion,
  ia: p.ia,
  src: p.src,
  poster: p.poster,
});

function normalizar(r: Record<string, unknown>): Fila {
  return {
    id: String(r.id),
    creado_en: String(r.creado_en ?? ""),
    titulo: String(r.titulo ?? ""),
    gancho: String(r.gancho ?? ""),
    detalle: String(r.detalle ?? ""),
    clave: String(r.clave ?? ""),
    condiciones: String(r.condiciones ?? ""),
    inicio: String(r.inicio ?? "").slice(0, 10),
    fin: r.fin ? String(r.fin).slice(0, 10) : null,
    poster_path: String(r.poster_path ?? ""),
    video_path: String(r.video_path ?? ""),
    duracion: Number(r.duracion) || 0,
    ia: r.ia !== false,
    visible: r.visible !== false,
  };
}

const masNuevaPrimero = (a: Fila, b: Fila) => b.inicio.localeCompare(a.inicio) || b.creado_en.localeCompare(a.creado_en);

// ---- Lectura ----

/** Todas tus promociones (también las ocultas, programadas y vencidas), la más nueva primero. */
export async function listarPromos(): Promise<PromoTarjeta[]> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).select("*").order("inicio", { ascending: false }).order("creado_en", { ascending: false }).limit(300);
    if (error) throw errorDeBase(error);
    return (data ?? []).map((r) => aPromo(normalizar(r)));
  }
  return [...demoStore()].sort(masNuevaPrimero).map(aPromo);
}

/** Solo las vigentes hoy, para la tarjeta pública. Nunca lanza: si algo falla, la tarjeta simplemente no muestra la sección. */
export async function listarPromosPublicas(): Promise<PromoPublica[]> {
  try {
    const hoy = hoyLocal();
    if (cloudReady && adminDb) {
      const { data, error } = await adminDb
        .from(TABLA)
        .select("*")
        .eq("visible", true)
        .lte("inicio", hoy)
        .or(`fin.is.null,fin.gte.${hoy}`)
        .order("inicio", { ascending: false })
        .order("creado_en", { ascending: false })
        .limit(MAX_PROMOS_PUBLICAS);
      if (error) {
        if (!faltaMigracion(error)) console.error("[tarjeta-promos]", error.message);
        return [];
      }
      return (data ?? []).map((r) => aPublica(aPromo(normalizar(r))));
    }
    return (await listarPromos())
      .filter((p) => p.estado === "vigente")
      .slice(0, MAX_PROMOS_PUBLICAS)
      .map(aPublica);
  } catch (e) {
    console.error("[tarjeta-promos]", e);
    return [];
  }
}

// ---- Subida ----

/** Genera el id de la promoción y los permisos de un solo uso para subir la portada y/o el video directo a Supabase. */
export async function prepararPromo(conPortada: boolean, conVideo: boolean): Promise<PermisoPromo> {
  const id = randomUUID();
  if (!(cloudReady && adminDb)) return { id, demo: true };

  // Si falta correr la migración 0023 (o la 0020 del cajón), se avisa ANTES de comprimir y subir.
  const t = await adminDb.from(TABLA).select("id").limit(1);
  if (t.error) throw errorDeBase(t.error);
  const almacen = adminDb.storage.from(BUCKET_VIDEOS);
  const [p, v] = await Promise.all([conPortada ? almacen.createSignedUploadUrl(rutaPromoPortada(id)) : null, conVideo ? almacen.createSignedUploadUrl(rutaPromoVideo(id)) : null]);
  const err = p?.error ?? v?.error;
  if (err || (conPortada && !p?.data) || (conVideo && !v?.data)) {
    if (/not found|bucket/i.test(err?.message ?? "")) throw new MigracionPendienteError(MENSAJE_MIGRACION_PROMOS, "0023_tarjeta_promos.sql");
    throw new Error(err?.message ?? "No pude preparar la subida.");
  }
  return {
    id,
    demo: false,
    nube: {
      url: baseNube(),
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      bucket: BUCKET_VIDEOS,
      ...(p?.data ? { poster: { path: p.data.path, token: p.data.token } } : {}),
      ...(v?.data ? { video: { path: v.data.path, token: v.data.token } } : {}),
    },
  };
}

export type ResultadoCrearPromo = { ok: true; promo: PromoTarjeta } | { ok: false; error: string };

/** Registra la promoción (con su portada y su video ya subidos, si los hay). */
export async function crearPromo(d: DatosNuevaPromo): Promise<ResultadoCrearPromo> {
  if (!(cloudReady && adminDb)) {
    const fila: Fila = {
      id: d.id,
      creado_en: new Date().toISOString(),
      titulo: d.titulo,
      gancho: d.gancho,
      detalle: d.detalle,
      clave: d.clave,
      condiciones: d.condiciones,
      inicio: d.inicio,
      fin: d.fin,
      poster_path: d.conPortada ? "/tarjeta/reels/maternidad.jpg" : "",
      video_path: d.conVideo ? "/tarjeta/reels/gastos-medicos.mp4" : "",
      duracion: d.conVideo ? d.duracion : 0,
      ia: d.ia,
      visible: true,
    };
    const s = demoStore();
    if (!s.some((x) => x.id === d.id)) s.push(fila);
    return { ok: true, promo: aPromo(s.find((x) => x.id === d.id) ?? fila) };
  }
  if (d.conVideo && !(await existeArchivo(rutaPromoVideo(d.id), "video/"))) return { ok: false, error: "El video no terminó de subirse. Vuelve a intentarlo." };
  const portadaLista = d.conPortada && (await existeArchivo(rutaPromoPortada(d.id), "image/"));
  if (d.conPortada && !portadaLista) return { ok: false, error: "La portada no terminó de subirse. Vuelve a intentarlo." };
  const { data, error } = await adminDb
    .from(TABLA)
    .insert({
      id: d.id,
      titulo: d.titulo,
      gancho: d.gancho,
      detalle: d.detalle,
      clave: d.clave,
      condiciones: d.condiciones,
      inicio: d.inicio,
      fin: d.fin,
      poster_path: portadaLista ? rutaPromoPortada(d.id) : "",
      video_path: d.conVideo ? rutaPromoVideo(d.id) : "",
      duracion: d.conVideo ? d.duracion : 0,
      ia: d.ia,
      visible: true,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      // La misma promoción registrada dos veces (doble toque): se devuelve la que ya existe.
      const ya = await adminDb.from(TABLA).select("*").eq("id", d.id).single();
      if (ya.data) return { ok: true, promo: aPromo(normalizar(ya.data)) };
    }
    throw errorDeBase(error);
  }
  return { ok: true, promo: aPromo(normalizar(data)) };
}

// ---- Cambios ----

export async function editarPromo(id: string, c: CambiosPromo): Promise<PromoTarjeta | null> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).update(c).eq("id", id).select("*").maybeSingle();
    if (error) throw errorDeBase(error);
    return data ? aPromo(normalizar(data)) : null;
  }
  const f = demoStore().find((x) => x.id === id);
  if (!f) return null;
  const nuevoInicio = c.inicio ?? f.inicio;
  const nuevoFin = c.fin === undefined ? f.fin : c.fin;
  if (nuevoFin && nuevoFin < nuevoInicio) throw new Error("La fecha de fin no puede ser anterior a la de inicio.");
  Object.assign(f, c);
  return aPromo(f);
}

/** Borra el renglón y los archivos del cajón. */
export async function eliminarPromo(id: string): Promise<boolean> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).select("video_path,poster_path").eq("id", id).maybeSingle();
    if (error) throw errorDeBase(error);
    if (!data) return false;
    const rutas = [data.video_path, data.poster_path].filter((r): r is string => typeof r === "string" && r.length > 0 && !esDemoRuta(r));
    if (rutas.length) {
      const r = await adminDb.storage.from(BUCKET_VIDEOS).remove(rutas);
      if (r.error) console.error("[tarjeta-promos] no pude borrar los archivos:", r.error.message);
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

// ---- Cambiar la portada de una promoción ya publicada ----

async function existePromo(id: string): Promise<boolean> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).select("id").eq("id", id).maybeSingle();
    if (error) throw errorDeBase(error);
    return Boolean(data);
  }
  return demoStore().some((x) => x.id === id);
}

/** Permiso de un solo uso para subir una portada nueva. `null` si esa promoción no existe. */
export async function prepararPortadaPromo(id: string): Promise<PermisoPortada | null> {
  if (!(await existePromo(id))) return null;
  const ts = Date.now();
  if (!(cloudReady && adminDb)) return { ts, demo: true };
  const { data, error } = await adminDb.storage.from(BUCKET_VIDEOS).createSignedUploadUrl(rutaPromoPortadaNueva(id, ts));
  if (error || !data) {
    if (/not found|bucket/i.test(error?.message ?? "")) throw new MigracionPendienteError(MENSAJE_MIGRACION_PROMOS, "0023_tarjeta_promos.sql");
    throw new Error(error?.message ?? "No pude preparar la subida de la portada.");
  }
  return { ts, demo: false, nube: { url: baseNube(), anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", bucket: BUCKET_VIDEOS, poster: { path: data.path, token: data.token } } };
}

export type ResultadoPortadaPromo = { ok: true; promo: PromoTarjeta } | { ok: false; error: string; estado: number };

/** Confirma la portada ya subida: reemplaza a la anterior (que se borra del cajón). */
export async function confirmarPortadaPromo(id: string, ts: unknown): Promise<ResultadoPortadaPromo> {
  if (!tsValido(ts)) return { ok: false, error: "Ese permiso ya venció. Vuelve a elegir la imagen.", estado: 422 };
  if (!(await existePromo(id))) return { ok: false, error: "Esa promoción ya no existe.", estado: 404 };

  if (!(cloudReady && adminDb)) {
    // DEMO: no se subió nada de verdad; solo se practica la pantalla.
    const f = demoStore().find((x) => x.id === id);
    if (!f) return { ok: false, error: "Esa promoción ya no existe.", estado: 404 };
    f.poster_path = "/tarjeta/reels/maternidad.jpg";
    return { ok: true, promo: aPromo(f) };
  }

  const ruta = rutaPromoPortadaNueva(id, ts);
  if (!(await existeArchivo(ruta, "image/"))) return { ok: false, error: "La portada no terminó de subirse. Vuelve a intentarlo.", estado: 422 };
  const antes = await adminDb.from(TABLA).select("poster_path").eq("id", id).maybeSingle();
  if (antes.error) throw errorDeBase(antes.error);
  const { data, error } = await adminDb.from(TABLA).update({ poster_path: ruta }).eq("id", id).select("*").maybeSingle();
  if (error) throw errorDeBase(error);
  if (!data) return { ok: false, error: "Esa promoción ya no existe.", estado: 404 };
  const vieja = antes.data?.poster_path;
  if (typeof vieja === "string" && vieja && vieja !== ruta && !esDemoRuta(vieja)) {
    const r = await adminDb.storage.from(BUCKET_VIDEOS).remove([vieja]);
    if (r.error) console.error("[tarjeta-promos] no pude borrar la portada anterior:", r.error.message);
  }
  return { ok: true, promo: aPromo(normalizar(data)) };
}
