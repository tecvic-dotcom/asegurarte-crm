/**
 * Generador mínimo de archivos Excel (.xlsx) — puro, sin dependencias (cliente y servidor).
 *
 * Analogía: un .xlsx es una carpeta comprimida con varias hojitas de texto (XML). Aquí armamos esas hojitas
 * y las metemos en un .zip «sin comprimir» (cada archivo se guarda tal cual), que Excel abre igual.
 *
 * Lo que sabe hacer: varias hojas, estilos (negrita, color de letra y de fondo, bordes, alineación), formatos
 * de pesos / fecha / entero, anchos de columna, filas y columnas congeladas, filtros, celdas combinadas y
 * fórmulas sencillas (con su valor ya calculado para que se vea aunque no se recalcule).
 */

export type Formato = "texto" | "entero" | "moneda" | "fecha";

export interface Estilo {
  negrita?: boolean;
  cursiva?: boolean;
  /** Color de la letra (RRGGBB). */
  color?: string;
  /** Color de fondo (RRGGBB). */
  relleno?: string;
  /** Tamaño de letra (por defecto 11). */
  tamano?: number;
  formato?: Formato;
  alinear?: "izquierda" | "centro" | "derecha";
  /** Parte el texto en varias líneas dentro de la celda. */
  envolver?: boolean;
  /** Línea fina alrededor de la celda. */
  borde?: boolean;
}

/** Valor de una celda: texto, número (las fechas van como número de serie, ver `serieExcel`) o vacío. */
export type Valor = string | number | null | undefined;

export interface Celda {
  v: Valor;
  e?: Estilo;
  /** Fórmula sin el signo igual, por ejemplo `SUBTOTAL(109,I4:I30)`. `v` es su resultado ya calculado. */
  f?: string;
}

export interface Hoja {
  nombre: string;
  /** Ancho de cada columna, en caracteres. */
  anchos: number[];
  /** Filas de arriba abajo; cada fila es una lista de celdas (o valores sueltos). */
  filas: (Celda | Valor)[][];
  /** Alto de filas concretas (número de fila desde 1 → puntos). */
  altos?: Record<number, number>;
  /** Deja fijas las primeras filas y/o columnas al desplazarse. */
  congelar?: { filas?: number; columnas?: number };
  /** Activa los filtros del encabezado: fila del encabezado (desde 1), y desde qué columna hasta cuál (desde 1) y hasta qué fila. */
  filtro?: { fila: number; desdeColumna: number; hastaColumna: number; hastaFila: number };
  /** Celdas combinadas, por ejemplo `A1:D1`. */
  combinar?: string[];
  /** Sin la cuadrícula gris de fondo (se ve más limpia en los resúmenes). */
  sinCuadricula?: boolean;
  /** Color de la pestaña (RRGGBB). */
  colorPestana?: string;
}

// ----------------------------------------------------------------------------
// Utilidades
// ----------------------------------------------------------------------------

/** Número de serie de Excel para una fecha AAAA-MM-DD (para que la celda sea una fecha de verdad, no texto). */
export function serieExcel(fecha: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Math.round(ms / 86_400_000) + 25569;
}

/** Nombre de columna de Excel: 1 → A, 27 → AA. */
export function letraColumna(n: number): string {
  let s = "";
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
}

// Caracteres que XML no admite (ni siquiera escritos como &#..;): se quitan en vez de romper el archivo.
const PROHIBIDOS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

function esc(texto: string): string {
  return texto
    .replace(PROHIBIDOS, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const enc = new TextEncoder();
const bytes = (s: string) => enc.encode(s);

/** Nombre de pestaña válido para Excel: sin [ ] : * ? / \, máximo 31 letras y sin repetirse. */
function nombreHoja(n: string, usados: Set<string>): string {
  const base = n.replace(/[[\]:*?/\\]/g, " ").replace(/^'+|'+$/g, "").trim().slice(0, 31) || "Hoja";
  let nombre = base;
  let i = 2;
  while (usados.has(nombre.toLowerCase())) {
    const sufijo = ` ${i++}`;
    nombre = base.slice(0, 31 - sufijo.length) + sufijo;
  }
  usados.add(nombre.toLowerCase());
  return nombre;
}

// ----------------------------------------------------------------------------
// Estilos (se reparten en tablas de fuentes, rellenos y formatos, sin repetir)
// ----------------------------------------------------------------------------

const FORMATOS: Record<Formato, number> = { texto: 0, entero: 1, moneda: 164, fecha: 165 };

class Estilos {
  private fuentes: string[] = [];
  private rellenos: string[] = [];
  private bordes = ["<border><left/><right/><top/><bottom/><diagonal/></border>"];
  private xfs: string[] = [];
  private indice = new Map<string, number>();

  constructor() {
    // El estilo 0 es el «normal» de todas las celdas sin estilo.
    this.rellenos.push('<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>');
    this.id({});
  }

  private pos(lista: string[], xml: string): number {
    const i = lista.indexOf(xml);
    if (i >= 0) return i;
    lista.push(xml);
    return lista.length - 1;
  }

  id(e: Estilo): number {
    const clave = JSON.stringify([e.negrita, e.cursiva, e.color, e.relleno, e.tamano, e.formato, e.alinear, e.envolver, e.borde]);
    const ya = this.indice.get(clave);
    if (ya !== undefined) return ya;

    const fuente =
      "<font>" +
      (e.negrita ? "<b/>" : "") +
      (e.cursiva ? "<i/>" : "") +
      `<sz val="${e.tamano ?? 11}"/>` +
      `<color rgb="FF${(e.color ?? "1F2937").toUpperCase()}"/>` +
      '<name val="Calibri"/><family val="2"/></font>';
    const f = this.pos(this.fuentes, fuente);
    const r = e.relleno
      ? this.pos(this.rellenos, `<fill><patternFill patternType="solid"><fgColor rgb="FF${e.relleno.toUpperCase()}"/><bgColor indexed="64"/></patternFill></fill>`)
      : 0;
    const gris = '<color rgb="FFD1D5DB"/>';
    const b = e.borde
      ? this.pos(this.bordes, `<border><left style="thin">${gris}</left><right style="thin">${gris}</right><top style="thin">${gris}</top><bottom style="thin">${gris}</bottom><diagonal/></border>`)
      : 0;
    const numFmt = FORMATOS[e.formato ?? "texto"];
    const h = e.alinear === "centro" ? "center" : e.alinear === "derecha" ? "right" : e.alinear === "izquierda" ? "left" : "";
    const alinea = `<alignment${h ? ` horizontal="${h}"` : ""} vertical="center"${e.envolver ? ' wrapText="1"' : ""}/>`;
    const xf =
      `<xf numFmtId="${numFmt}" fontId="${f}" fillId="${r}" borderId="${b}" xfId="0"` +
      `${numFmt ? ' applyNumberFormat="1"' : ""} applyFont="1"${r ? ' applyFill="1"' : ""}${b ? ' applyBorder="1"' : ""} applyAlignment="1">${alinea}</xf>`;
    this.xfs.push(xf);
    const n = this.xfs.length - 1;
    this.indice.set(clave, n);
    return n;
  }

  xml(): string {
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>' +
      `<fonts count="${this.fuentes.length}">${this.fuentes.join("")}</fonts>` +
      `<fills count="${this.rellenos.length}">${this.rellenos.join("")}</fills>` +
      `<borders count="${this.bordes.length}">${this.bordes.join("")}</borders>` +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      `<cellXfs count="${this.xfs.length}">${this.xfs.join("")}</cellXfs>` +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      "</styleSheet>"
    );
  }
}

// ----------------------------------------------------------------------------
// Hojas
// ----------------------------------------------------------------------------

function esCelda(c: Celda | Valor): c is Celda {
  return typeof c === "object" && c !== null;
}

function xmlHoja(h: Hoja, estilos: Estilos, activa: boolean): string {
  const columnas = Math.max(h.anchos.length, ...h.filas.map((f) => f.length), 1);
  const ultima = Math.max(h.filas.length, 1);

  let datos = "";
  h.filas.forEach((fila, i) => {
    const r = i + 1;
    const alto = h.altos?.[r];
    let celdas = "";
    fila.forEach((crudo, j) => {
      const c: Celda = esCelda(crudo) ? crudo : { v: crudo };
      const ref = `${letraColumna(j + 1)}${r}`;
      const s = estilos.id(c.e ?? {});
      const sAttr = s ? ` s="${s}"` : "";
      const v = c.v;
      if (c.f) {
        const cache = typeof v === "number" && Number.isFinite(v) ? `<v>${v}</v>` : "";
        celdas += `<c r="${ref}"${sAttr}><f>${esc(c.f)}</f>${cache}</c>`;
      } else if (typeof v === "number") {
        celdas += Number.isFinite(v) ? `<c r="${ref}"${sAttr}><v>${v}</v></c>` : `<c r="${ref}"${sAttr}/>`;
      } else if (typeof v === "string" && v !== "") {
        celdas += `<c r="${ref}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${esc(v.slice(0, 32000))}</t></is></c>`;
      } else {
        celdas += `<c r="${ref}"${sAttr}/>`;
      }
    });
    datos += `<row r="${r}"${alto ? ` ht="${alto}" customHeight="1"` : ""}>${celdas}</row>`;
  });

  const cols = h.anchos.map((a, i) => `<col min="${i + 1}" max="${i + 1}" width="${a}" customWidth="1"/>`).join("");

  // Filas / columnas congeladas
  const fr = h.congelar?.filas ?? 0;
  const fc = h.congelar?.columnas ?? 0;
  let vista = "";
  if (fr || fc) {
    const sup = `${letraColumna(fc + 1)}${fr + 1}`;
    const panel = fr && fc ? "bottomRight" : fr ? "bottomLeft" : "topRight";
    vista =
      `<pane${fc ? ` xSplit="${fc}"` : ""}${fr ? ` ySplit="${fr}"` : ""} topLeftCell="${sup}" activePane="${panel}" state="frozen"/>` +
      (fr && fc ? `<selection pane="topRight"/><selection pane="bottomLeft"/>` : "") +
      `<selection pane="${panel}" activeCell="${sup}" sqref="${sup}"/>`;
  }

  const filtro = h.filtro
    ? `<autoFilter ref="${letraColumna(h.filtro.desdeColumna)}${h.filtro.fila}:${letraColumna(h.filtro.hastaColumna)}${h.filtro.hastaFila}"/>`
    : "";
  const combinadas = h.combinar?.length
    ? `<mergeCells count="${h.combinar.length}">${h.combinar.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>`
    : "";

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetPr>${h.colorPestana ? `<tabColor rgb="FF${h.colorPestana.toUpperCase()}"/>` : ""}<pageSetUpPr fitToPage="1"/></sheetPr>` +
    `<dimension ref="A1:${letraColumna(columnas)}${ultima}"/>` +
    `<sheetViews><sheetView${h.sinCuadricula ? ' showGridLines="0"' : ""}${activa ? ' tabSelected="1"' : ""} workbookViewId="0">${vista}</sheetView></sheetViews>` +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    (cols ? `<cols>${cols}</cols>` : "") +
    `<sheetData>${datos}</sheetData>` +
    filtro +
    combinadas +
    '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>' +
    '<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
    "</worksheet>"
  );
}

// ----------------------------------------------------------------------------
// ZIP sin compresión (método «stored»)
// ----------------------------------------------------------------------------

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(archivos: { nombre: string; datos: Uint8Array }[], ahora: Date): Uint8Array<ArrayBuffer> {
  const hora = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1);
  const fecha = ((Math.max(ahora.getFullYear(), 1980) - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();

  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let desplazamiento = 0;

  for (const a of archivos) {
    const nombre = bytes(a.nombre);
    const crc = crc32(a.datos);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true); // versión necesaria
    local.setUint16(6, 0x0800, true); // nombres en UTF-8
    local.setUint16(8, 0, true); // sin compresión
    local.setUint16(10, hora, true);
    local.setUint16(12, fecha, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, a.datos.length, true);
    local.setUint32(22, a.datos.length, true);
    local.setUint16(26, nombre.length, true);
    local.setUint16(28, 0, true);
    partes.push(new Uint8Array(local.buffer), nombre, a.datos);

    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint16(8, 0x0800, true);
    dir.setUint16(10, 0, true);
    dir.setUint16(12, hora, true);
    dir.setUint16(14, fecha, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, a.datos.length, true);
    dir.setUint32(24, a.datos.length, true);
    dir.setUint16(28, nombre.length, true);
    dir.setUint32(42, desplazamiento, true);
    central.push(new Uint8Array(dir.buffer), nombre);

    desplazamiento += 30 + nombre.length + a.datos.length;
  }

  const tamCentral = central.reduce((s, p) => s + p.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamCentral, true);
  fin.setUint32(16, desplazamiento, true);

  const todo = [...partes, ...central, new Uint8Array(fin.buffer)];
  const salida = new Uint8Array(todo.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of todo) {
    salida.set(p, o);
    o += p.length;
  }
  return salida;
}

// ----------------------------------------------------------------------------
// El libro completo
// ----------------------------------------------------------------------------

export const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Arma el archivo .xlsx (sus bytes) con las hojas dadas. */
export function crearXlsx(hojas: Hoja[], ahora: Date = new Date()): Uint8Array<ArrayBuffer> {
  if (!hojas.length) throw new Error("Un Excel necesita al menos una hoja.");
  const estilos = new Estilos();
  const usados = new Set<string>();
  const nombres = hojas.map((h) => nombreHoja(h.nombre, usados));
  const xmls = hojas.map((h, i) => xmlHoja(h, estilos, i === 0));

  const tipoHoja = "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml";
  const contenidos =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="${tipoHoja}"/>`).join("") +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    "</Types>";

  const raiz =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    "</Relationships>";

  // Los filtros necesitan además un nombre oculto que Excel espera ver en el libro.
  const nombresDefinidos = hojas
    .map((h, i) => {
      if (!h.filtro) return "";
      const a = `$${letraColumna(h.filtro.desdeColumna)}$${h.filtro.fila}:$${letraColumna(h.filtro.hastaColumna)}$${h.filtro.hastaFila}`;
      return `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${nombres[i].replace(/'/g, "''")}'!${a}</definedName>`;
    })
    .join("");

  const libro =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<bookViews><workbookView activeTab="0"/></bookViews>' +
    `<sheets>${nombres.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>` +
    (nombresDefinidos ? `<definedNames>${nombresDefinidos}</definedNames>` : "") +
    '<calcPr calcId="191029"/>' +
    "</workbook>";

  const relLibro =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    hojas
      .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
      .join("") +
    `<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    "</Relationships>";

  return zip(
    [
      { nombre: "[Content_Types].xml", datos: bytes(contenidos) },
      { nombre: "_rels/.rels", datos: bytes(raiz) },
      { nombre: "xl/workbook.xml", datos: bytes(libro) },
      { nombre: "xl/_rels/workbook.xml.rels", datos: bytes(relLibro) },
      { nombre: "xl/styles.xml", datos: bytes(estilos.xml()) },
      ...xmls.map((x, i) => ({ nombre: `xl/worksheets/sheet${i + 1}.xml`, datos: bytes(x) })),
    ],
    ahora,
  );
}
