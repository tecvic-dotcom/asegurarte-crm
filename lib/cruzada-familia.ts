/**
 * Familias de tus clientes: titular, cónyuge, hijos — puro, sin dependencias de cliente/servidor.
 *
 * Un familiar es un cliente más (con su propia ficha) ligado a un titular. Sirve para dos cosas: detectar al cónyuge que no tiene
 * seguro de vida y a los hijos menores que necesitan un ahorro educativo.
 */
import { esFechaValida } from "./fechas";
import { esEmpresa, tokensDeNombre } from "./clientes-agrupar";
import type { Cliente, Genero, Parentesco } from "./types";

export const PARENTESCOS: { id: Parentesco; nombre: string }[] = [
  { id: "conyuge", nombre: "Cónyuge o pareja" },
  { id: "hijo", nombre: "Hijo o hija" },
  { id: "padre_madre", nombre: "Padre o madre" },
  { id: "otro", nombre: "Otro familiar" },
];

export function esParentesco(v: unknown): v is Parentesco {
  return typeof v === "string" && PARENTESCOS.some((p) => p.id === v);
}

/** Cómo se le dice en el mensaje: «esposa», «esposo», «hija»… (si no se sabe su género, una palabra neutra). */
export function palabraDeParentesco(p: Parentesco, genero: Genero | null): string {
  if (p === "conyuge") return genero === "mujer" ? "esposa" : genero === "hombre" ? "esposo" : "pareja";
  if (p === "hijo") return genero === "mujer" ? "hija" : genero === "hombre" ? "hijo" : "hijo o hija";
  if (p === "padre_madre") return genero === "mujer" ? "mamá" : genero === "hombre" ? "papá" : "papá o mamá";
  return "familiar";
}

/** Primer nombre de pila, con mayúscula inicial: «ANA MARIA SOTO» → «Ana». */
export function nombreDePila(nombre: string): string {
  const w = nombre.trim().split(/\s+/)[0] ?? "";
  return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : "";
}

export interface FamiliaDe {
  titular: Cliente | null;
  miembros: Cliente[];
}

/** Con quién está ligado este cliente: su titular (si es familiar de alguien) y sus familiares (si es titular). */
export function familiaDe(c: Cliente, todos: Cliente[]): FamiliaDe {
  return {
    titular: c.titular_id ? (todos.find((x) => x.id === c.titular_id) ?? null) : null,
    miembros: todos.filter((x) => x.titular_id === c.id),
  };
}

export type ResultadoFamilia = { ok: true; titular_id: string | null; parentesco: Parentesco | null } | { ok: false; error: string };

/** Valida ligar (o desligar) a un cliente con su titular. Sin cadenas: un familiar no puede ser titular de otro. */
export function validarFamilia(entrada: unknown, cliente: Cliente, todos: Cliente[]): ResultadoFamilia {
  const e = (entrada ?? {}) as Record<string, unknown>;
  if (e.titular_id === null || e.titular_id === undefined || e.titular_id === "") return { ok: true, titular_id: null, parentesco: null };
  if (typeof e.titular_id !== "string") return { ok: false, error: "Elige al titular." };
  if (e.titular_id === cliente.id) return { ok: false, error: "Un cliente no puede ser familiar de sí mismo." };
  const titular = todos.find((x) => x.id === e.titular_id);
  if (!titular) return { ok: false, error: "Ese titular ya no existe." };
  if (titular.titular_id) return { ok: false, error: "Elige al titular de la familia, no a otro familiar." };
  if (todos.some((x) => x.titular_id === cliente.id)) return { ok: false, error: "Este cliente ya es titular de otros familiares: primero desliga a esos familiares." };
  if (!esParentesco(e.parentesco)) return { ok: false, error: "Elige qué es del titular (cónyuge, hijo…)." };
  return { ok: true, titular_id: titular.id, parentesco: e.parentesco };
}

export interface DatosFamiliar {
  nombre: string;
  parentesco: Parentesco;
  fecha_nacimiento: string | null;
  genero: Genero | null;
  whatsapp: string;
}

export type ResultadoFamiliar = { ok: true; datos: DatosFamiliar } | { ok: false; error: string };

const GENEROS: Genero[] = ["mujer", "hombre", "prefiero_no_decir"];

/** Valida los datos de un familiar nuevo (alguien que todavía no tiene pólizas contigo). */
export function validarFamiliar(entrada: unknown, hoy: string): ResultadoFamiliar {
  const e = (entrada ?? {}) as Record<string, unknown>;
  const nombre = typeof e.nombre === "string" ? e.nombre.trim().replace(/\s+/g, " ") : "";
  if (nombre.length < 2) return { ok: false, error: "Escribe el nombre del familiar." };
  if (nombre.length > 160) return { ok: false, error: "El nombre es muy largo (máximo 160 letras)." };
  if (!esParentesco(e.parentesco)) return { ok: false, error: "Elige qué es del titular (cónyuge, hijo…)." };
  const nac = typeof e.fecha_nacimiento === "string" && e.fecha_nacimiento ? e.fecha_nacimiento.slice(0, 10) : null;
  if (nac !== null && (!esFechaValida(nac) || nac < "1900-01-01" || nac > hoy)) return { ok: false, error: "Revisa la fecha de nacimiento." };
  const whatsapp = typeof e.whatsapp === "string" ? e.whatsapp.replace(/\D+/g, "").slice(-10) : "";
  if (whatsapp && whatsapp.length !== 10) return { ok: false, error: "El WhatsApp debe ser de 10 dígitos." };
  return { ok: true, datos: { nombre, parentesco: e.parentesco, fecha_nacimiento: nac, genero: GENEROS.find((g) => g === e.genero) ?? null, whatsapp } };
}

/** Los dos apellidos de una persona (las dos últimas palabras de «NOMBRES APELLIDO1 APELLIDO2»), o null si no se pueden saber. */
function apellidos(c: Cliente): string[] | null {
  if (c.tipo === "empresa" || esEmpresa(c.nombre)) return null;
  const t = tokensDeNombre(c.nombre);
  return t.length >= 3 ? t.slice(-2) : null;
}

/**
 * Clientes que comparten los dos apellidos con este y todavía no están ligados a su familia: son SUGERENCIAS para que tú confirmes
 * (dos personas con los mismos apellidos pueden no ser familia). Solo cuenta a quien aún no tiene titular.
 */
export function posiblesFamiliares(c: Cliente, todos: Cliente[]): Cliente[] {
  const a = apellidos(c);
  if (!a) return [];
  return todos.filter((x) => {
    if (x.id === c.id || x.titular_id || c.titular_id === x.id || x.id === c.titular_id) return false;
    const b = apellidos(x);
    return b !== null && b[0] === a[0] && b[1] === a[1];
  });
}
