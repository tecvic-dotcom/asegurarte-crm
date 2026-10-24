/**
 * Lector mínimo de archivos Excel (.xlsx) — puro, sin dependencias (navegador y servidor).
 *
 * Analogía: es el gemelo de `xlsx-simple.ts` (que ESCRIBE). Un .xlsx es una carpeta comprimida con hojitas de
 * texto (XML); aquí abrimos esa carpeta, leemos qué hojas hay, qué dice cada celda y cuáles son fechas.
 *
 * Lo que sabe hacer: leer todas las hojas, texto (incluido el compartido), números, fechas (las devuelve como
 * texto AAAA-MM-DD) y celdas con fórmula (su valor ya calculado). Lo que NO hace: macros, imágenes ni tablas dinámicas.
 *
 * Usa `DecompressionStream` (viene en los navegadores y en Node 18+), así que no instala nada.
 */

/** Una fecha de Excel, ya convertida a AAAA-MM-DD. Se distingue del texto normal que "parece" fecha. */
export interface FechaExcel {
  fecha: string;
}
export type ValorLeido = string | number | boolean | FechaExcel | null;

export interface HojaLeida {
  nombre: string;
  /** Renglones de arriba abajo; cada uno con sus celdas desde la columna A (las vacías son null). */
  filas: ValorLeido[][];
}

export function esFechaExcel(v: ValorLeido | undefined): v is FechaExcel {
  return typeof v === "object" && v !== null && "fecha" in v;
}

// ----------------------------------------------------------------------------
// ZIP
// ----------------------------------------------------------------------------

interface EntradaZip {
  metodo: number;
  comprimido: number;
  inicio: number;
}

function u16(d: DataView, o: number): number {
  return d.getUint16(o, true);
}
function u32(d: DataView, o: number): number {
  return d.getUint32(o, true);
}

/** Lee el índice del .zip (el «directorio central», que vive al final del archivo). */
function indiceZip(bytes: Uint8Array): Map<string, EntradaZip> {
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let fin = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65_535); i--) {
    if (u32(d, i) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin < 0) throw new Error("Ese archivo no parece un Excel (.xlsx).");
  const total = u16(d, fin + 10);
  let o = u32(d, fin + 16);
  const nombre = new TextDecoder();
  const indice = new Map<string, EntradaZip>();
  for (let n = 0; n < total; n++) {
    if (u32(d, o) !== 0x02014b50) throw new Error("El Excel está dañado (no pude leer su índice).");
    const metodo = u16(d, o + 10);
    const comprimido = u32(d, o + 20);
    const largoNombre = u16(d, o + 28);
    const largoExtra = u16(d, o + 30);
    const largoComentario = u16(d, o + 32);
    const local = u32(d, o + 42);
    const ruta = nombre.decode(bytes.subarray(o + 46, o + 46 + largoNombre));
    // El encabezado local trae su propio largo de nombre y extras: ahí empiezan los datos.
    if (u32(d, local) !== 0x04034b50) throw new Error("El Excel está dañado (encabezado local).");
    const inicio = local + 30 + u16(d, local + 26) + u16(d, local + 28);
    indice.set(ruta, { metodo, comprimido, inicio });
    o += 46 + largoNombre + largoExtra + largoComentario;
  }
  return indice;
}

async function inflar(datos: Uint8Array): Promise<Uint8Array> {
  const flujo = new Blob([datos as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

async function textoDe(bytes: Uint8Array, indice: Map<string, EntradaZip>, ruta: string): Promise<string | null> {
  const e = indice.get(ruta);
  if (!e) return null;
  const crudo = bytes.subarray(e.inicio, e.inicio + e.comprimido);
  if (e.metodo === 0) return new TextDecoder().decode(crudo);
  if (e.metodo === 8) return new TextDecoder().decode(await inflar(crudo));
  throw new Error("Ese Excel usa una compresión que no conozco.");
}

// ----------------------------------------------------------------------------
// XML (solo lo que usa un .xlsx; el de Excel siempre viene bien formado)
// ----------------------------------------------------------------------------

function sinEntidades(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function atributos(etiqueta: string): Record<string, string> {
  const a: Record<string, string> = {};
  for (const m of etiqueta.matchAll(/([A-Za-z_:][\w:.-]*)="([^"]*)"/g)) a[m[1]] = sinEntidades(m[2]);
  return a;
}

/** Todo el texto de un trozo de XML: junta cada <t>…</t> (así también sirve el texto con formato mixto). */
function textoDeSi(trozo: string): string {
  let t = "";
  for (const m of trozo.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) t += sinEntidades(m[1]);
  return t;
}

// ----------------------------------------------------------------------------
// Fechas
// ----------------------------------------------------------------------------

/** Formatos de fecha que trae Excel de fábrica (los demás —los personalizados— se revisan por su código). */
const FORMATOS_FECHA_INTEGRADOS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);

/** ¿Este código de formato personalizado pinta una fecha? (d, m, y fuera de comillas y de [corchetes]). */
function codigoEsFecha(codigo: string): boolean {
  const limpio = codigo.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "").replace(/\\./g, "");
  return /[dmy]/i.test(limpio) && !/^General$/i.test(limpio.trim());
}

/** Número de serie de Excel → AAAA-MM-DD (sistema 1900, el que usa Excel en Windows y Mac moderno). */
export function serieAFecha(serie: number): string {
  const ms = Date.UTC(1899, 11, 30) + Math.floor(serie) * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

// ----------------------------------------------------------------------------
// Libro
// ----------------------------------------------------------------------------

function columnaANumero(letras: string): number {
  let n = 0;
  for (const c of letras) n = n * 26 + c.charCodeAt(0) - 64;
  return n - 1;
}

/** Abre un .xlsx y devuelve todas sus hojas. Lanza un Error con mensaje claro si no se puede leer. */
export async function leerXlsx(contenido: ArrayBuffer | Uint8Array): Promise<HojaLeida[]> {
  const bytes = contenido instanceof Uint8Array ? contenido : new Uint8Array(contenido);
  const indice = indiceZip(bytes);

  const libro = await textoDe(bytes, indice, "xl/workbook.xml");
  if (!libro) throw new Error("Ese archivo no parece un Excel (.xlsx): no trae su libro de hojas.");
  const rels = (await textoDe(bytes, indice, "xl/_rels/workbook.xml.rels")) ?? "";
  const destinos = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const a = atributos(m[0]);
    if (a.Id && a.Target) destinos.set(a.Id, a.Target.replace(/^\//, "").replace(/^(?!xl\/)/, "xl/"));
  }

  // Textos compartidos: las celdas de texto guardan solo el número de renglón de esta lista.
  const compartidos: string[] = [];
  const sst = await textoDe(bytes, indice, "xl/sharedStrings.xml");
  if (sst) for (const m of sst.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) compartidos.push(textoDeSi(m[1]));

  // Qué estilos son de fecha.
  const estiloEsFecha: boolean[] = [];
  const estilos = await textoDe(bytes, indice, "xl/styles.xml");
  if (estilos) {
    const personalizados = new Map<number, boolean>();
    for (const m of estilos.matchAll(/<numFmt\b[^>]*>/g)) {
      const a = atributos(m[0]);
      personalizados.set(Number(a.numFmtId), codigoEsFecha(a.formatCode ?? ""));
    }
    const bloque = estilos.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/);
    if (bloque) {
      for (const m of bloque[1].matchAll(/<xf\b[^>]*>/g)) {
        const id = Number(atributos(m[0]).numFmtId ?? 0);
        estiloEsFecha.push(personalizados.has(id) ? personalizados.get(id)! : FORMATOS_FECHA_INTEGRADOS.has(id));
      }
    }
  }

  const hojas: HojaLeida[] = [];
  for (const m of libro.matchAll(/<sheet\b[^>]*>/g)) {
    const a = atributos(m[0]);
    const ruta = destinos.get(a["r:id"] ?? "");
    const xml = ruta ? await textoDe(bytes, indice, ruta) : null;
    if (!a.name || !xml) continue;

    const filas: ValorLeido[][] = [];
    for (const fila of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const numero = Number(atributos(fila[1]).r);
      const celdas: ValorLeido[] = [];
      for (const c of (fila[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ca = atributos(c[1]);
        const col = columnaANumero((ca.r ?? "").replace(/\d+/g, ""));
        if (col < 0 || col > 200) continue;
        const cuerpo = c[2] ?? "";
        const v = cuerpo.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        let valor: ValorLeido = null;
        if (ca.t === "s" && v !== undefined) valor = compartidos[Number(v)] ?? null;
        else if (ca.t === "inlineStr") valor = textoDeSi(cuerpo);
        else if (ca.t === "str" && v !== undefined) valor = sinEntidades(v);
        else if (ca.t === "b" && v !== undefined) valor = v === "1";
        else if (ca.t === "e") valor = null;
        else if (v !== undefined && v !== "") {
          const n = Number(v);
          if (Number.isFinite(n)) valor = estiloEsFecha[Number(ca.s ?? 0)] ? { fecha: serieAFecha(n) } : n;
        }
        while (celdas.length < col) celdas.push(null);
        celdas[col] = valor;
      }
      // Los renglones vacíos entre dos con datos también cuentan (conservan la posición).
      while (Number.isFinite(numero) && filas.length < numero - 1) filas.push([]);
      filas.push(celdas);
    }
    hojas.push({ nombre: a.name, filas });
  }
  if (!hojas.length) throw new Error("Ese Excel no trae ninguna hoja que pueda leer.");
  return hojas;
}
