/**
 * Genera public/tarjeta/cotizacion-reglas.js a partir de las MISMAS reglas TypeScript que usa el formulario de React
 * (lib/normalize.ts, lib/validacion.ts, lib/captacion-cotizacion.ts). Así la tarjeta /roberto (HTML estático, sin React ni
 * paso de compilación) valida y filtra spam exactamente igual que el servidor y que el formulario de /cotizacion-prueba.
 *
 *   node scripts/construir-cotizacion-tarjeta.cjs              → reescribe el archivo
 *   node scripts/construir-cotizacion-tarjeta.cjs --verificar  → no escribe; sale con error si el archivo quedó viejo
 *
 * Correrlo (y subir el archivo generado) cada vez que cambie algo en esas reglas: listas de seguros, validaciones, antispam.
 */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const raiz = path.resolve(__dirname, "..");
const SALIDA = path.join(raiz, "public", "tarjeta", "cotizacion-reglas.js");
const FUENTES = ["lib/normalize.ts", "lib/validacion.ts", "lib/captacion-cotizacion.ts"];
// Lo que la tarjeta necesita de las reglas.
const EXPUESTO = [
  "TIPOS_SEGURO", "PARA_QUIEN", "MAX_ENVIOS_POR_VISITA", "TIEMPO_MINIMO_MS",
  "validarSolicitud", "evaluarAntispam", "prepararSolicitud", "formatearWhatsapp",
  "textoTipoSeguro", "textoParaQuien", "primerNombre",
];

const partes = FUENTES.map((f) => {
  const src = fs.readFileSync(path.join(raiz, f), "utf8");
  const js = ts
    .transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2019, module: ts.ModuleKind.ESNext, removeComments: true } })
    .outputText.replace(/^import\s[^;]*;\s*$/gm, "") // los tres archivos se pegan en uno solo
    .replace(/^export\s+(?=(function|const|let|class)\b)/gm, "")
    .replace(/^export\s*\{\s*\};?\s*$/gm, "");
  if (/^\s*(import|export)\s/m.test(js)) throw new Error(`Quedó un import/export sin resolver en ${f}`);
  return `/* ${f} */\n${js.trim()}`;
});

const resultado = `/* GENERADO por scripts/construir-cotizacion-tarjeta.cjs a partir de ${FUENTES.join(", ")}. NO editar a mano: se pierde al regenerar. */
(function () {
"use strict";
${partes.join("\n\n")}

window.CotizacionReglas = { ${EXPUESTO.join(", ")} };
})();
`;

if (process.argv.includes("--verificar")) {
  const actual = fs.existsSync(SALIDA) ? fs.readFileSync(SALIDA, "utf8").replace(/\r\n/g, "\n") : "";
  if (actual !== resultado) {
    console.error("public/tarjeta/cotizacion-reglas.js está desactualizado: corre `node scripts/construir-cotizacion-tarjeta.cjs`.");
    process.exit(1);
  }
  console.log("cotizacion-reglas.js al día.");
} else {
  fs.writeFileSync(SALIDA, resultado);
  console.log(`Escrito ${path.relative(raiz, SALIDA)} (${resultado.length} bytes)`);
}
