import "server-only";

/**
 * Lectores del libro (quienes piden la guía gratuita de /guia-ia) — SOLO SERVIDOR.
 *  - NUBE: tabla lectores (supabase/migrations/0027_lectores.sql). Lista APARTE de los prospectos de seguros (leads).
 *  - DEMO: memoria, para probar sin tocar tu Supabase.
 */
import { randomUUID } from "node:crypto";
import { adminDb, cloudReady } from "./supabase-admin";
import { faltaMigracion, MigracionPendienteError } from "./migracion";
import { validarLector, type EntradaLector, type LectorValido } from "./lectores-reglas";

const TABLA = "lectores";
const ARCHIVO = "0027_lectores.sql";
export const MENSAJE_MIGRACION_LECTORES =
  "Falta un paso para guardar a los lectores del libro: abre Supabase → SQL Editor → New query, pega el archivo supabase/migrations/0027_lectores.sql y dale Run.";

export interface Lector {
  id: string;
  nombre: string;
  correo: string;
  estado: "activo" | "baja" | "compro";
  paso: number;
  token_baja: string;
  creado_en: string;
}

interface UtmLector {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
}

interface GeoLector {
  pais?: string | null;
  ciudad?: string | null;
  dispositivo?: string | null;
}

export type ResultadoLector =
  | { ok: false; errores: LectorValido["errores"] }
  | { ok: true; senuelo: true }
  | { ok: true; senuelo?: false; nuevo: boolean; lector: Lector };

function errorDeBase(error: { code?: string; message: string }): Error {
  return faltaMigracion(error) ? new MigracionPendienteError(MENSAJE_MIGRACION_LECTORES, ARCHIVO) : new Error(error.message);
}

// ---- DEMO (memoria) ----
function demo(): Lector[] {
  const g = globalThis as typeof globalThis & { __lectores?: Lector[] };
  if (!g.__lectores) g.__lectores = [];
  return g.__lectores;
}

const CAMPOS = "id, nombre, correo, estado, paso, token_baja, creado_en";

/**
 * Guarda a quien pidió la guía. Si el correo ya estaba, no duplica: suma una vez más y, si se había dado de baja,
 * lo reactiva (acaba de pedir la guía otra vez y aceptó el aviso de nuevo). Un señuelo lleno finge éxito sin guardar.
 */
export async function registrarLector(input: EntradaLector & { trampa?: unknown }, utm: UtmLector = {}, geo: GeoLector = {}): Promise<ResultadoLector> {
  if (typeof input.trampa === "string" && input.trampa.trim()) return { ok: true, senuelo: true };
  const v = validarLector(input);
  if (!v.ok) return { ok: false, errores: v.errores };
  const ahora = new Date().toISOString();

  if (cloudReady && adminDb) {
    const { data: previo, error: e1 } = await adminDb.from(TABLA).select(`${CAMPOS}, veces`).eq("correo", v.correo).limit(1);
    if (e1) throw errorDeBase(e1);
    const p = previo?.[0] as (Lector & { veces: number }) | undefined;
    if (p) {
      const cambios: Record<string, unknown> = { veces: Math.min((p.veces ?? 1) + 1, 999), aviso_aceptado: ahora, actualizado_en: ahora };
      if (p.estado === "baja") Object.assign(cambios, { estado: "activo", baja_en: null });
      const { data, error } = await adminDb.from(TABLA).update(cambios).eq("id", p.id).select(CAMPOS).limit(1);
      if (error) throw errorDeBase(error);
      return { ok: true, nuevo: false, lector: (data?.[0] as Lector) ?? p };
    }
    const fila = {
      nombre: v.nombre,
      correo: v.correo,
      utm_source: (utm.source ?? "").slice(0, 120),
      utm_medium: (utm.medium ?? "").slice(0, 120),
      utm_campaign: (utm.campaign ?? "").slice(0, 120),
      utm_content: (utm.content ?? "").slice(0, 120),
      pais: geo.pais ?? null,
      ciudad: geo.ciudad ?? null,
      dispositivo: geo.dispositivo ?? null,
    };
    const { data, error } = await adminDb.from(TABLA).insert(fila).select(CAMPOS).limit(1);
    if (error) {
      // Dos envíos casi al mismo tiempo con el mismo correo: el segundo choca con «unique»; se trata como repetido.
      if (error.code === "23505") {
        const { data: d2 } = await adminDb.from(TABLA).select(CAMPOS).eq("correo", v.correo).limit(1);
        if (d2?.[0]) return { ok: true, nuevo: false, lector: d2[0] as Lector };
      }
      throw errorDeBase(error);
    }
    return { ok: true, nuevo: true, lector: data?.[0] as Lector };
  }

  const lista = demo();
  const existe = lista.find((l) => l.correo === v.correo);
  if (existe) {
    if (existe.estado === "baja") existe.estado = "activo";
    return { ok: true, nuevo: false, lector: existe };
  }
  const lector: Lector = { id: randomUUID(), nombre: v.nombre, correo: v.correo, estado: "activo", paso: 0, token_baja: randomUUID(), creado_en: ahora };
  lista.unshift(lector);
  return { ok: true, nuevo: true, lector };
}

/** Da de baja por la liga del correo (no recibe más correos de la secuencia). Devuelve false si el código no existe. Si ya había comprado, compro_en se conserva. */
export async function darDeBaja(token: string): Promise<boolean> {
  const ahora = new Date().toISOString();
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb
      .from(TABLA)
      .update({ estado: "baja", baja_en: ahora, proximo_envio: null, actualizado_en: ahora })
      .eq("token_baja", token)
      .select("id")
      .limit(1);
    if (error) throw errorDeBase(error);
    return Boolean(data?.length);
  }
  const l = demo().find((x) => x.token_baja === token);
  if (!l) return false;
  l.estado = "baja";
  return true;
}
