/**
 * Lector mínimo de archivos Excel (.xlsx) — puro, sin dependencias (navegador y servidor).
 *
 * Analogía: es el gemelo de `xlsx-simple.ts` (que ESCRIBE). Un .xlsx es una carpeta comprimida con hojitas de
 * texto (XML); aquí abrimos esa carpeta, leemos qué hojas hay, qué dice cada celda y cuáles son fechas.
 *
 * Lo que sabe hacer: leer todas las hojas, texto (incluido el compartido), números, fechas (las devuelve como
 * texto AAAA-MM-DD), celdas con fórmula (su valor ya calculado) y el COLOR DE RELLENO de cada celda (como #RRGGBB;
 * así Dana distingue un recibo verde de uno amarillo). Lo que NO hace: macros, imágenes ni tablas dinámicas.
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
  /**
   * Color de relleno de cada celda («#RRGGBB»; null = sin relleno), con la misma forma que `filas`. Un renglón puede
   * traer menos celdas que `filas`: lo que falta es sin color. Solo viene si el libro trae estilos.
   */
  fondos?: (string | null)[][];
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
// Colores de relleno
// ----------------------------------------------------------------------------

/** Colores «indexados» de la paleta clásica de Excel (los que no están aquí se leen como sin color). */
const PALETA_INDEXADA: Record<number, string> = {
  8: "000000", 9: "FFFFFF", 10: "FF0000", 11: "00FF00", 12: "0000FF", 13: "FFFF00", 14: "FF00FF", 15: "00FFFF",
  16: "800000", 17: "008000", 18: "000080", 19: "808000", 20: "800080", 21: "008080", 22: "C0C0C0", 23: "808080",
  42: "CCFFCC", 43: "FFFF99", 44: "99CCFF", 45: "FF99CC", 46: "CC99FF", 47: "FFCC99", 51: "99CC00", 52: "FFCC00", 53: "FF9900",
};

/** Aclara u oscurece un color como lo hace Excel con «tint» (-1 a 1). */
function aplicarTinte(hex: string, tinte: number): string {
  if (!tinte) return hex;
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  l = tinte < 0 ? l * (1 + tinte) : l * (1 - tinte) + tinte;
  const f = (p: number, q: number, t: number) => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    return u < 1 / 6 ? p + (q - p) * 6 * u : u < 1 / 2 ? q : u < 2 / 3 ? p + (q - p) * (2 / 3 - u) * 6 : p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const canal = (x: number) =>
    Math.round(Math.min(1, Math.max(0, x)) * 255)
      .toString(16)
      .padStart(2, "0");
  const salida = s === 0 ? canal(l).repeat(3) : `${canal(f(p, q, h + 1 / 3))}${canal(f(p, q, h))}${canal(f(p, q, h - 1 / 3))}`;
  return salida.toUpperCase();
}

/** Los 12 colores del tema del libro, en el orden en que Excel los numera (claro 1, oscuro 1, claro 2, oscuro 2, acentos…). */
function coloresDeTema(xml: string | null): string[] {
  if (!xml) return [];
  const esquema = xml.match(/<a:clrScheme\b[^>]*>([\s\S]*?)<\/a:clrScheme>/)?.[1] ?? "";
  const color = (nombre: string): string | null => {
    const bloque = esquema.match(new RegExp(`<a:${nombre}\\b[^>]*>([\\s\\S]*?)</a:${nombre}>`))?.[1] ?? "";
    const v = bloque.match(/<a:srgbClr\b[^>]*val="([0-9a-fA-F]{6})"/)?.[1] ?? bloque.match(/<a:sysClr\b[^>]*lastClr="([0-9a-fA-F]{6})"/)?.[1];
    return v ? v.toUpperCase() : null;
  };
  return ["lt1", "dk1", "lt2", "dk2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"].map((n) => color(n) ?? "");
}

/** Un `<fgColor …/>` de estilos → «#RRGGBB», o null si no se puede saber. */
function colorDeEtiqueta(etiqueta: string, tema: string[]): string | null {
  const a = atributos(etiqueta);
  let hex: string | null = null;
  if (a.rgb && /^[0-9a-fA-F]{6,8}$/.test(a.rgb)) hex = a.rgb.slice(-6).toUpperCase();
  else if (a.indexed !== undefined) hex = PALETA_INDEXADA[Number(a.indexed)] ?? null;
  else if (a.theme !== undefined) hex = tema[Number(a.theme)] || null;
  if (!hex) return null;
  const tinte = Number(a.tint ?? 0);
  return `#${aplicarTinte(hex, Number.isFinite(tinte) ? tinte : 0)}`;
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

  // Qué estilos son de fecha y de qué color es el relleno de cada estilo.
  const estiloEsFecha: boolean[] = [];
  const estiloFondo: (string | null)[] = [];
  const estilos = await textoDe(bytes, indice, "xl/styles.xml");
  if (estilos) {
    const personalizados = new Map<number, boolean>();
    for (const m of estilos.matchAll(/<numFmt\b[^>]*>/g)) {
      const a = atributos(m[0]);
      personalizados.set(Number(a.numFmtId), codigoEsFecha(a.formatCode ?? ""));
    }
    // Rellenos: la lista de colores que usan los estilos (solo cuentan los rellenos lisos).
    const tema = coloresDeTema(await textoDe(bytes, indice, "xl/theme/theme1.xml"));
    const rellenos: (string | null)[] = [];
    const bloqueRellenos = estilos.match(/<fills\b[^>]*>([\s\S]*?)<\/fills>/);
    if (bloqueRellenos) {
      for (const m of bloqueRellenos[1].matchAll(/<fill\b[^>]*>([\s\S]*?)<\/fill>/g)) {
        const patron = m[1].match(/<patternFill\b[^>]*>/);
        const fg = m[1].match(/<fgColor\b[^>]*>/);
        rellenos.push(patron && atributos(patron[0]).patternType === "solid" && fg ? colorDeEtiqueta(fg[0], tema) : null);
      }
    }
    const bloque = estilos.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/);
    if (bloque) {
      for (const m of bloque[1].matchAll(/<xf\b[^>]*>/g)) {
        const a = atributos(m[0]);
        const id = Number(a.numFmtId ?? 0);
        estiloEsFecha.push(personalizados.has(id) ? personalizados.get(id)! : FORMATOS_FECHA_INTEGRADOS.has(id));
        estiloFondo.push(rellenos[Number(a.fillId ?? 0)] ?? null);
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
    const fondos: (string | null)[][] = [];
    for (const fila of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const numero = Number(atributos(fila[1]).r);
      const celdas: ValorLeido[] = [];
      const fondosFila: (string | null)[] = [];
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
        while (fondosFila.length < col) fondosFila.push(null);
        fondosFila[col] = estiloFondo[Number(ca.s ?? 0)] ?? null;
      }
      // Los renglones vacíos entre dos con datos también cuentan (conservan la posición).
      while (Number.isFinite(numero) && filas.length < numero - 1) {
        filas.push([]);
        fondos.push([]);
      }
      filas.push(celdas);
      fondos.push(fondosFila);
    }
    hojas.push({ nombre: a.name, filas, fondos });
  }
  if (!hojas.length) throw new Error("Ese Excel no trae ninguna hoja que pueda leer.");
  return hojas;
}
