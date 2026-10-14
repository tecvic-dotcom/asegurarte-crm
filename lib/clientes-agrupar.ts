/**
 * Reconocer a la misma persona aunque su nombre venga escrito distinto — puro, sin dependencias.
 *
 * Los reportes de AXA escriben el nombre en dos órdenes («GAMEZ COVARRUBIAS RAUL FERNAN» en Salud, «ROBERTO JAVIER RODRIGUEZ GON» en
 * Vida y Autos) y lo CORTAN a unas 28 letras. Aquí se comparan las palabras sin importar el orden, sin acentos ni mayúsculas, y
 * tolerando que la última palabra venga cortada. Con esto se arma el expediente único: todas las pólizas de una persona juntas.
 */

const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y", "e", "da", "di"]);

/** Palabras que delatan una razón social (no una persona). */
const SENAS_EMPRESA = new Set([
  "sa", "cv", "sc", "sapi", "rl", "srl", "cia", "ac", "asociacion", "grupo", "asesores", "servicios", "constructora", "comercial", "despacho",
  "inmobiliaria", "transportes", "fundacion", "club", "colegio", "iglesia", "industrial", "empresa", "corporativo", "sociedad", "compania",
  "consultores", "distribuidora", "restaurante", "hotel",
]);

/** Desde esta longitud un nombre de AXA se considera cortado por el sistema. */
const LARGO_CORTADO = 24;

export function sinAcentos(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Las palabras del nombre en minúsculas, sin acentos, sin partículas («de», «del»…) y sin signos. */
export function tokensDeNombre(nombre: string): string[] {
  return sinAcentos(nombre)
    .toLowerCase()
    .replace(/[^a-zñ ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !PARTICULAS.has(w));
}

export function esEmpresa(nombre: string): boolean {
  return tokensDeNombre(nombre).some((w) => SENAS_EMPRESA.has(w));
}

export function estaCortado(nombre: string): boolean {
  return nombre.trim().length >= LARGO_CORTADO;
}

/**
 * Cada palabra de `x` necesita su pareja distinta en `y`. Si `x` es un nombre cortado por AXA, su ÚLTIMA palabra escrita puede ser
 * solo el principio de la completa («gon» → «gonzalez», «rodri» → «rodriguez»).
 */
function parejas(x: string[], y: string[], xCortado: boolean): boolean {
  const usados = new Set<number>();
  for (let i = 0; i < x.length; i++) {
    const w = x[i];
    const puedeSerPrefijo = xCortado && i === x.length - 1 && w.length >= 3;
    const j = y.findIndex((v, k) => !usados.has(k) && (v === w || (puedeSerPrefijo && v.startsWith(w))));
    if (j < 0) return false;
    usados.add(j);
  }
  return true;
}

/** ¿Estas dos escrituras son la misma persona? Mismas palabras en cualquier orden; AXA puede haber cortado la última. */
export function mismoNombre(a: string, b: string): boolean {
  const ta = tokensDeNombre(a);
  const tb = tokensDeNombre(b);
  if (ta.length < 2 || tb.length < 2) return false;
  if (ta.length === tb.length) return parejas(ta, tb, estaCortado(a)) || parejas(tb, ta, estaCortado(b));
  // Con distinto número de palabras solo cuenta si el más corto es el nombre que AXA cortó.
  return ta.length < tb.length ? estaCortado(a) && parejas(ta, tb, true) : estaCortado(b) && parejas(tb, ta, true);
}

/** Junta en grupos a los que son la misma persona. Mantiene el orden de aparición. */
export function agruparPorNombre<T>(items: T[], nombreDe: (t: T) => string): T[][] {
  const grupos: { nombres: string[]; items: T[] }[] = [];
  for (const it of items) {
    const nombre = nombreDe(it);
    const g = grupos.find((x) => x.nombres.some((n) => mismoNombre(n, nombre)));
    if (g) {
      g.items.push(it);
      if (!g.nombres.includes(nombre)) g.nombres.push(nombre);
    } else {
      grupos.push({ nombres: [nombre], items: [it] });
    }
  }
  return grupos.map((g) => g.items);
}

const PALABRAS_CHICAS = new Set(["de", "del", "la", "las", "los", "y", "e"]);

const SIGLAS = new Set(["sa", "cv", "sc", "sapi", "rl", "srl", "ac", "sab"]);

/** «JOSE DE JESUS GONZALEZ» → «Jose de Jesus Gonzalez»; «GRUPO PRETSA SA DE CV» → «Grupo Pretsa SA de CV» (para mostrar). */
export function capitalizarNombre(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && PALABRAS_CHICAS.has(w) ? w : SIGLAS.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/**
 * «GAMEZ COVARRUBIAS RAUL FERNAN» (apellidos primero, como lo escribe AXA en Salud) → «RAUL FERNAN GAMEZ COVARRUBIAS».
 * Se asume el patrón mexicano de dos apellidos; si hay menos de 3 palabras se deja igual.
 */
export function nombrePrimero(apellidosPrimero: string): string {
  const palabras = apellidosPrimero.trim().split(/\s+/).filter(Boolean);
  const unidades: string[] = [];
  for (let i = 0; i < palabras.length; i++) {
    if (PALABRAS_CHICAS.has(palabras[i].toLowerCase()) && unidades.length && i + 1 < palabras.length) {
      let pegado = `${unidades.pop()} ${palabras[i]}`;
      while (i + 1 < palabras.length && PALABRAS_CHICAS.has(palabras[i + 1].toLowerCase())) pegado += ` ${palabras[++i]}`;
      pegado += ` ${palabras[++i]}`;
      unidades.push(pegado);
    } else {
      unidades.push(palabras[i]);
    }
  }
  if (unidades.length < 3) return apellidosPrimero.trim();
  return [...unidades.slice(2), ...unidades.slice(0, 2)].join(" ");
}

/** El nombre que se muestra de un grupo: el más completo (el que AXA no cortó). */
export function nombreMasCompleto(nombres: string[]): string {
  return [...nombres].sort((a, b) => Number(estaCortado(a)) - Number(estaCortado(b)) || b.trim().length - a.trim().length)[0] ?? "";
}
