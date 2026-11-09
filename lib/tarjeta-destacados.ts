import "server-only";

/**
 * Videos destacados de la tarjeta (/roberto) — SOLO SERVIDOR.
 *  - NUBE: tabla tarjeta_destacados, hasta 3 renglones (ver supabase/migrations/0026_tarjeta_destacados.sql).
 *  - DEMO: memoria, para practicar la pantalla sin tocar tu Supabase.
 * Si la tabla no existe todavía, la tarjeta sigue mostrando los 3 videos que trae de fábrica (CONFIG.videos.destacados).
 */
import { adminDb, cloudReady } from "./supabase-admin";
import { faltaMigracion, MENSAJE_MIGRACION_DESTACADOS, MigracionPendienteError } from "./migracion";
import { esIdFijo, UUID } from "./tarjeta-videos-reglas";
import { MAX_DESTACADOS, textoBoton, type DestacadoCRM, type DestacadoPublico } from "./tarjeta-destacados-reglas";
import { videosPublicosPorId } from "./tarjeta-videos";

const TABLA = "tarjeta_destacados";
const ARCHIVO = "0026_tarjeta_destacados.sql";

function errorDeBase(error: { code?: string; message: string }): Error {
  return faltaMigracion(error) ? new MigracionPendienteError(MENSAJE_MIGRACION_DESTACADOS, ARCHIVO) : new Error(error.message);
}

// ---- DEMO (memoria): arranca con dos de los videos fijos, como la tarjeta de fábrica ----

function demoStore(): { lista: DestacadoCRM[] } {
  const g = globalThis as typeof globalThis & { __tarjetaDestacados?: { lista: DestacadoCRM[] } };
  if (!g.__tarjetaDestacados) {
    g.__tarjetaDestacados = {
      lista: [
        { video_id: "amar-familia", beneficio: "Qué pasa con el ingreso de tu familia si un día no puedes trabajar y cómo armar un escudo familiar.", ramo: "familia" },
        { video_id: "seguro-o-lujo", beneficio: "Si crees que un seguro es un lujo, mira cómo verlo como una herramienta y qué conviene priorizar.", ramo: "" },
      ],
    };
  }
  return g.__tarjetaDestacados;
}

// ---- Lectura ----

/** Los destacados de hoy, en orden (el CRM los muestra y los edita). Lanza MigracionPendienteError si falta la tabla. */
export async function listarDestacados(): Promise<DestacadoCRM[]> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from(TABLA).select("posicion, video_id, beneficio, ramo").order("posicion", { ascending: true }).limit(MAX_DESTACADOS);
    if (error) throw errorDeBase(error);
    return (data ?? []).map((r) => ({ video_id: String(r.video_id), beneficio: String(r.beneficio ?? ""), ramo: String(r.ramo ?? "") }));
  }
  return [...demoStore().lista];
}

/**
 * Para la tarjeta pública. Nunca lanza: si algo falla (o falta la tabla), devuelve [] y la tarjeta usa sus 3 destacados de fábrica.
 * Los videos tuyos que estén ocultos se saltan; los fijos solo llevan su id (la tarjeta ya conoce su archivo y su portada).
 */
export async function destacadosPublicos(): Promise<DestacadoPublico[]> {
  try {
    const lista = await listarDestacados();
    if (!lista.length) return [];
    const ids = lista.map((d) => d.video_id).filter((id) => !esIdFijo(id));
    const videos = ids.length ? await videosPublicosPorId(ids) : [];
    const salida: DestacadoPublico[] = [];
    for (const d of lista) {
      const base = { id: d.video_id, beneficio: d.beneficio, ramo: d.ramo, boton: textoBoton(d.ramo) };
      if (esIdFijo(d.video_id)) {
        salida.push(base);
        continue;
      }
      const v = videos.find((x) => x.id === d.video_id);
      if (v) salida.push({ ...base, titulo: v.titulo, clave: v.clave, dur: v.dur, ia: v.ia, src: v.src, poster: v.poster });
    }
    return salida;
  } catch (e) {
    if (!(e instanceof MigracionPendienteError)) console.error("[tarjeta-destacados]", e);
    return [];
  }
}

// ---- Escritura ----

export type ResultadoGuardar = { ok: true; lista: DestacadoCRM[] } | { ok: false; error: string };

/** Guarda la lista completa (ya validada): reemplaza lo que había, en el orden recibido. */
export async function guardarDestacados(lista: DestacadoCRM[]): Promise<ResultadoGuardar> {
  if (cloudReady && adminDb) {
    // Los videos tuyos deben existir (no se destaca uno que ya borraste)
    const uuids = lista.map((d) => d.video_id).filter((id) => !esIdFijo(id) && UUID.test(id));
    if (uuids.length) {
      const { data, error } = await adminDb.from("tarjeta_videos").select("id").in("id", uuids);
      if (error) throw error.code && faltaMigracion(error) ? new MigracionPendienteError(undefined, "0020_tarjeta_videos.sql") : new Error(error.message);
      if ((data ?? []).length !== uuids.length) return { ok: false, error: "Uno de los videos ya no existe. Recarga la pantalla." };
    }
    // Se quitan las posiciones que sobran y se guardan las demás (la posición es la llave: no hay choques al cambiar el orden)
    const del = await adminDb.from(TABLA).delete().gt("posicion", lista.length);
    if (del.error) throw errorDeBase(del.error);
    if (lista.length) {
      const filas = lista.map((d, i) => ({ posicion: i + 1, video_id: d.video_id, beneficio: d.beneficio, ramo: d.ramo }));
      const up = await adminDb.from(TABLA).upsert(filas, { onConflict: "posicion" });
      if (up.error) throw errorDeBase(up.error);
    }
    return { ok: true, lista: await listarDestacados() };
  }
  demoStore().lista = [...lista];
  return { ok: true, lista: [...demoStore().lista] };
}
