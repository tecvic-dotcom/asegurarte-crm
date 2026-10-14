#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- script de Node (CommonJS), no código de la app */
/**
 * Importa tus reportes de AXA (comisiones 2022-2026) al «libro de AXA» de Camila y arma los expedientes de tus clientes.
 *
 *   node scripts/importar-libro-axa.cjs                       → ENSAYO: cuenta lo que haría, no escribe nada
 *   node scripts/importar-libro-axa.cjs --guardar             → escribe (solo AGREGA o COMPLETA; nunca borra)
 *   node scripts/importar-libro-axa.cjs --carpeta "C:\ruta"   → otra carpeta de reportes
 *
 * Qué hace:
 *  1. Lee los 4 reportes «Detalle RAMO …» (autos, daños/hogar, salud/GMM y vida), que son HTML disfrazado de .xls.
 *  2. De los pagos de cada póliza deduce si sigue vigente y, cuando se puede, cuándo renueva (lib/libro-axa-reglas.ts).
 *  3. Guarda cada póliza en la tabla libro_axa (si ya estaba, la actualiza sin perder a qué cliente pertenece).
 *  4. Junta cada póliza con su cliente (lib/clientes-plan.ts): ligas las de Valeri y las del libro, crea los clientes que falten
 *     y completa los datos vacíos con los de tus prospectos ganados. Es repetible: correrlo otra vez no duplica nada.
 *
 * Requiere haber corrido supabase/migrations/0016_venta_cruzada.sql en tu Supabase (para el ensayo no hace falta).
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");

const RAIZ = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const GUARDAR = args.includes("--guardar");
const iCarpeta = args.indexOf("--carpeta");
const CARPETA = iCarpeta >= 0 ? args[iCarpeta + 1] : path.resolve(RAIZ, "..", "..", "EXCEL REPORTES AXA");

// ---- Las reglas (TypeScript) se compilan a una carpeta temporal para usar EXACTAMENTE las mismas que el CRM ----
const SALIDA = fs.mkdtempSync(path.join(os.tmpdir(), "libro-axa-"));
execFileSync(
  process.execPath,
  [path.join(RAIZ, "node_modules", "typescript", "bin", "tsc"), path.join(RAIZ, "lib", "libro-axa-reglas.ts"), path.join(RAIZ, "lib", "clientes-plan.ts"), "--outDir", SALIDA, "--module", "commonjs", "--target", "es2022", "--moduleResolution", "node", "--skipLibCheck"],
  { cwd: RAIZ, stdio: "pipe" },
);
const { aISO, inferirPoliza } = require(path.join(SALIDA, "libro-axa-reglas.js"));
const { planearClientes } = require(path.join(SALIDA, "clientes-plan.js"));

// ---- Base de datos ----
const { createClient } = require(path.join(RAIZ, "node_modules", "@supabase", "supabase-js"));
const env = {};
for (const l of fs.readFileSync(path.join(RAIZ, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const FALTA_TABLA = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);

async function todo(tabla, columnas, orden, { opcional = false } = {}) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await db.from(tabla).select(columnas).order(orden, { ascending: true }).range(desde, desde + 999);
    if (error) {
      if (opcional && FALTA_TABLA.has(error.code)) return null;
      throw new Error(`${tabla}: ${error.message}`);
    }
    filas.push(...data);
    if (data.length < 1000) return filas;
  }
}

// ---- Los reportes ----
function texto(html) {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}
function leerReporte(archivo) {
  const html = fs.readFileSync(archivo).toString("latin1");
  const filas = [];
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const celdas = [...tr.matchAll(/<t([hd])[^>]*>([\s\S]*?)<\/t\1>/gi)].map((m) => ({ th: m[1].toLowerCase() === "h", v: texto(m[2]) }));
    if (celdas.length) filas.push(celdas);
  }
  return filas;
}
// Cada reporte → su ramo en el CRM (el reporte de Vida de AXA no distingue el ahorro: todo entra como vida).
const REPORTES = [
  { ramo: "autos", patron: /RAMO\s+AUTOS/i },
  { ramo: "hogar", patron: /RAMO\s+DA(Ñ|N|\uFFFD)OS|HOGAR/i },
  { ramo: "gmm", patron: /RAMO\s+SALUD/i },
  { ramo: "vida", patron: /RAMO\s+VIDA/i },
];
const num = (s) => Number(String(s).replace(/,/g, "")) || 0;

const hoyLocal = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Monterrey", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

function masFrecuente(lista) {
  const c = new Map();
  for (const x of lista) c.set(x, (c.get(x) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function leerLibro(hoy) {
  const archivos = fs.readdirSync(CARPETA).filter((f) => /\.xls$/i.test(f));
  const polizas = new Map();
  const usados = [];
  for (const r of REPORTES) {
    const f = archivos.find((a) => r.patron.test(a));
    if (!f) {
      console.log(`   ⚠ No encontré el reporte de ${r.ramo} en ${CARPETA}`);
      continue;
    }
    usados.push(f);
    const filas = leerReporte(path.join(CARPETA, f)).filter((c) => c.length === 16 && !c.every((x) => x.th) && /^\d{3,}$/.test(c[0].v));
    for (const fila of filas) {
      const v = fila.map((c) => c.v);
      const [, , subramo, asegurado, numero, , vigor, dia, , , prima] = v;
      if (!numero) continue;
      if (!polizas.has(numero)) polizas.set(numero, { ramo: r.ramo, subramo, fuente: f, nombres: [], pagos: [] });
      const p = polizas.get(numero);
      if (asegurado) p.nombres.push(asegurado.replace(/\s+/g, " ").trim());
      p.pagos.push({ vigor: aISO(vigor), dia: aISO(dia), prima: num(prima) });
    }
  }
  const libro = [];
  let sinNombre = 0;
  for (const [numero, p] of polizas) {
    const asegurado = masFrecuente(p.nombres);
    if (!asegurado) {
      sinNombre++;
      continue;
    }
    const i = inferirPoliza(p.pagos, hoy);
    libro.push({
      numero,
      asegurado,
      ramo: p.ramo,
      subramo: p.subramo ?? "",
      aseguradora: "AXA",
      inicio_vigencia: i.inicio_vigencia,
      ultimo_pago: i.ultimo_pago,
      renovacion: i.renovacion,
      pagos_12m: i.pagos_12m,
      prima_ultima: i.prima_ultima,
      vigente: i.vigente,
      fuente: p.fuente.replace(/\.xls$/i, ""),
      actualizado_en: new Date().toISOString(),
    });
  }
  return { libro, usados, sinNombre };
}

const cuenta = (lista, f) => lista.reduce((o, x) => ((o[f(x)] = (o[f(x)] ?? 0) + 1), o), {});
const trozos = (l, n = 200) => Array.from({ length: Math.ceil(l.length / n) }, (_, i) => l.slice(i * n, i * n + n));

(async () => {
  const hoy = hoyLocal();
  console.log(`${GUARDAR ? "GUARDAR" : "ENSAYO (no escribe nada)"} · hoy ${hoy} · reportes en ${CARPETA}\n`);

  const { libro, usados, sinNombre } = leerLibro(hoy);
  console.log(`1) Reportes leídos: ${usados.length} · pólizas distintas: ${libro.length}${sinNombre ? ` (+${sinNombre} sin nombre de asegurado, se omiten)` : ""}`);
  const vig = libro.filter((l) => l.vigente);
  console.log(`   vigentes (según sus pagos): ${vig.length} · por ramo: ${JSON.stringify(cuenta(vig, (l) => l.ramo))}`);
  console.log(`   con fecha de renovación conocida: ${vig.filter((l) => l.renovacion).length} de ${vig.length}`);

  // Lo que ya hay en la base.
  const clientes = await todo("clientes", "*", "id", { opcional: true });
  const tablasListas = clientes !== null;
  if (!tablasListas) {
    console.log("\n   ⚠ Todavía no existen las tablas de Camila (falta correr supabase/migrations/0016_venta_cruzada.sql). El ensayo sigue como si estuvieran vacías.");
    if (GUARDAR) {
      console.log("\nNo se guardó nada: corre primero el SQL 0016 en Supabase.");
      process.exit(1);
    }
  }
  const libroExistente = tablasListas ? await todo("libro_axa", "numero,cliente_id", "numero") : [];
  // Sin el SQL 0016 la columna cliente_id aún no existe: en el ensayo se toma como «ninguna póliza tiene cliente todavía».
  const polizas =
    (await todo("polizas", "id,asegurado,whatsapp,correo,lead_id,cliente_id,ramo,estatus_manual", "id", { opcional: true })) ??
    (await todo("polizas", "id,asegurado,whatsapp,correo,lead_id,ramo,estatus_manual", "id"));
  const leads = await todo("leads", "id,nombre,whatsapp,correo,etapa,fecha_nacimiento,genero,codigo_postal", "id");
  const previo = new Map(libroExistente.map((l) => [l.numero, l.cliente_id]));

  // El plan: con el libro nuevo + lo que ya estaba ligado.
  const plan = planearClientes(
    {
      clientes: clientes ?? [],
      polizas: polizas.map((p) => ({ id: p.id, asegurado: p.asegurado, whatsapp: p.whatsapp, correo: p.correo, lead_id: p.lead_id, cliente_id: p.cliente_id ?? null })),
      libro: libro.map((l) => ({ numero: l.numero, asegurado: l.asegurado, apellidosPrimero: l.ramo === "gmm", vigente: l.vigente, cliente_id: previo.get(l.numero) ?? null })),
      leads,
    },
    { crearDesdeLibro: true },
  );
  const nuevosLibro = libro.filter((l) => !previo.has(l.numero)).length;
  console.log(`\n2) Libro de AXA: ${libro.length - nuevosLibro} ya estaban (se actualizan) · ${nuevosLibro} nuevas`);
  console.log(`3) Expedientes: ${plan.nuevos.length} clientes nuevos (${plan.nuevos.filter((c) => c.tipo === "empresa").length} empresas) · ${plan.polizas.length} pólizas de Valeri y ${plan.libro.length} del libro ligadas · ${plan.completar.length} clientes existentes con datos por completar`);
  const sinLigar = polizas.filter((p) => !p.cliente_id && !plan.polizas.some((x) => x.id === p.id));
  if (sinLigar.length) console.log(`   ⚠ ${sinLigar.length} pólizas de Valeri sin nombre usable no se ligaron`);
  const noClientes = libro.length - libro.filter((l) => previo.get(l.numero) || plan.libro.some((x) => x.numero === l.numero)).length;
  console.log(`   pólizas del libro que NO crean cliente (solo pólizas vencidas de personas que ya no pagan): ${noClientes}`);
  const unidos = plan.porRevisar.filter((r) => r.motivo === "unido");
  const cortados = plan.porRevisar.filter((r) => r.motivo === "nombre_cortado");
  console.log(`   por revisar: ${unidos.length} clientes juntados por nombres escritos distinto · ${cortados.length} con el nombre cortado por AXA`);
  for (const r of unidos.slice(0, 15)) console.log(`      · ${r.nombre}  ←  ${r.variantes.join("  |  ")}`);
  if (unidos.length > 15) console.log(`      … y ${unidos.length - 15} más`);

  if (!GUARDAR) {
    console.log("\nEnsayo terminado: no se escribió nada. Para guardar: node scripts/importar-libro-axa.cjs --guardar");
    fs.rmSync(SALIDA, { recursive: true, force: true });
    return;
  }

  // ---- Guardar ----
  const respaldo = path.join(CARPETA, `respaldo-antes-de-importar-${hoy}.json`);
  fs.writeFileSync(respaldo, JSON.stringify({ hoy, polizas_cliente_id: polizas.map((p) => ({ id: p.id, cliente_id: p.cliente_id ?? null })), libro_axa: libroExistente, clientes_existentes: (clientes ?? []).map((c) => c.id) }, null, 2));
  console.log(`\nRespaldo del estado anterior: ${respaldo}`);

  for (const lote of trozos(libro)) {
    const { error } = await db.from("libro_axa").upsert(lote, { onConflict: "numero" });
    if (error) throw new Error("libro_axa: " + error.message);
  }
  console.log(`✔ libro_axa: ${libro.length} pólizas guardadas`);

  const ahora = new Date().toISOString();
  const idDe = new Map();
  const filas = plan.nuevos.map((n) => {
    const id = randomUUID();
    idDe.set(n.clave, id);
    return { id, nombre: n.nombre, tipo: n.tipo, whatsapp: n.whatsapp, correo: n.correo, fecha_nacimiento: n.fecha_nacimiento, genero: n.genero, codigo_postal: n.codigo_postal, lead_id: n.lead_id, no_ofrecer: false, notas: "", creado_en: ahora, actualizado_en: ahora };
  });
  for (const lote of trozos(filas)) {
    const { error } = await db.from("clientes").insert(lote);
    if (error) throw new Error("clientes: " + error.message);
  }
  console.log(`✔ clientes: ${filas.length} nuevos`);
  for (const c of plan.completar) {
    const { error } = await db.from("clientes").update({ ...c.cambios, actualizado_en: ahora }).eq("id", c.id);
    if (error) throw new Error("completar cliente: " + error.message);
  }
  if (plan.completar.length) console.log(`✔ clientes existentes completados: ${plan.completar.length}`);

  const destino = (c) => idDe.get(c) ?? c;
  const porCliente = (lista, campo) => {
    const m = new Map();
    for (const x of lista) m.set(destino(x.cliente), [...(m.get(destino(x.cliente)) ?? []), x[campo]]);
    return m;
  };
  let n = 0;
  for (const [cliente, ids] of porCliente(plan.polizas, "id")) {
    for (const lote of trozos(ids)) {
      const { error } = await db.from("polizas").update({ cliente_id: cliente }).in("id", lote);
      if (error) throw new Error("polizas: " + error.message);
      n += lote.length;
    }
  }
  console.log(`✔ pólizas de Valeri ligadas a su cliente: ${n}`);
  n = 0;
  for (const [cliente, numeros] of porCliente(plan.libro, "numero")) {
    for (const lote of trozos(numeros)) {
      const { error } = await db.from("libro_axa").update({ cliente_id: cliente }).in("numero", lote);
      if (error) throw new Error("libro_axa cliente: " + error.message);
      n += lote.length;
    }
  }
  console.log(`✔ pólizas del libro ligadas a su cliente: ${n}`);
  console.log("\nListo. Abre Camila en tu CRM.");
  fs.rmSync(SALIDA, { recursive: true, force: true });
})().catch((e) => {
  console.error("\nERROR:", e.message);
  process.exit(1);
});
