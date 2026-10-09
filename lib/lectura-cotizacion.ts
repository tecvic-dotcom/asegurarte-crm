import "server-only";

/**
 * Lectura de cotizaciones con IA — SOLO SERVIDOR.
 *
 * Recibe el PDF (o foto) que el agente bajó del portal de la aseguradora, se lo muestra a Claude y
 * devuelve un BORRADOR para llenar el formulario: la IA propone, el agente revisa y confirma.
 * El archivo no se guarda en ningún lado. (La IA recibe el documento completo, con los nombres
 * que traiga: es necesario para leerlo.)
 *
 * Mismo patrón y mismo modelo que lib/lectura-poliza.ts.
 */
import Anthropic from "@anthropic-ai/sdk";
import { CLAVES_CAMPOS, normalizarLectura, RAMOS_COTIZACION, type LecturaCotizacion } from "./cotizaciones-reglas";
import { ErrorLectura, getCliente, MODELO, traducirError, type TipoArchivo } from "./lectura-poliza";

const ESQUEMA = {
  type: "object",
  properties: {
    ramo: { type: "string", enum: ["gmm", "autos", "hogar", "viaje", "vida", "ahorro", "otro"] },
    aseguradora: { type: "string", description: 'Nombre corto de la aseguradora ("AXA", "Chubb", "Chubb Travel", "GNP"...).' },
    plan: { type: "string", description: "Producto o paquete como aparece, corto. Vacío si no se ve." },
    prima_contado: {
      type: "number",
      description: "Lo que paga el cliente DE CONTADO: prima total con IVA y derechos o gastos de expedición. 0 si no aparece.",
    },
    moneda: { type: "string", enum: ["MN", "DLS"], description: "Moneda de la PRIMA (no de las coberturas)." },
    forma_pago: {
      type: "string",
      enum: ["", "mensual", "trimestral", "semestral"],
      description: "Forma de pago fraccionado elegida (o la primera que aparezca). Vacío si no hay pagos fraccionados.",
    },
    primer_pago: { type: "number", description: "Monto del primer pago fraccionado. 0 si no hay o si todos los pagos son iguales." },
    pago_siguiente: { type: "number", description: "Monto de cada pago posterior al primero (o de todos, si son iguales). 0 si no hay pagos fraccionados." },
    fecha_cotizacion: { type: "string", description: "Fecha en que se hizo la cotización, AAAA-MM-DD; vacío si no se ve." },
    vigencia_hasta: { type: "string", description: "Fecha límite explícita de la cotización, AAAA-MM-DD; vacío si el documento no la da." },
    dias_vigencia: { type: "integer", description: 'Días de vigencia si el documento dice "N días naturales"; 0 si no lo dice.' },
    campos: {
      type: "array",
      description: "Datos propios del ramo, solo con las claves del ramo identificado.",
      items: {
        type: "object",
        properties: {
          clave: { type: "string", enum: CLAVES_CAMPOS },
          valor: { type: "string" },
        },
        required: ["clave", "valor"],
        additionalProperties: false,
      },
    },
    avisos: {
      type: "array",
      items: { type: "string" },
      description: "Dudas sobre lo leído: qué no se vio claro, cuál opción elegiste y por qué. Vacío si todo es claro.",
    },
  },
  required: [
    "ramo",
    "aseguradora",
    "plan",
    "prima_contado",
    "moneda",
    "forma_pago",
    "primer_pago",
    "pago_siguiente",
    "fecha_cotizacion",
    "vigencia_hasta",
    "dias_vigencia",
    "campos",
    "avisos",
  ],
  additionalProperties: false,
};

/** Las claves de cada ramo con su significado: sale de la misma lista que usa el formulario. */
function guiaDeCampos(): string {
  return RAMOS_COTIZACION.map((r) => `${r.id} (${r.nombre}):\n${r.campos.map((c) => `  - ${c.clave}: ${c.etiqueta}. ${c.ejemplo}`).join("\n")}`).join("\n");
}

const SISTEMA = `Eres un asistente que lee COTIZACIONES de seguros mexicanos (AXA, Chubb y otras) para un agente de seguros. El agente las baja del portal de la aseguradora y tú le llenas el formulario; él revisa antes de guardar.
Extrae solo lo que está escrito en el documento; nunca inventes. Si un dato no se ve, déjalo vacío (0 en los números) y dilo en "avisos".

- ramo: "gmm" gastos médicos mayores; "autos"; "hogar" (casa, hogar integral, daños); "viaje" (seguro de viaje); "vida"; "ahorro" (ahorro, educación, retiro). "otro" si no encaja.
- aseguradora: nombre corto ("AXA", "Chubb", "GNP", "Qualitas"...). Si es un seguro de viaje de Chubb, escribe "Chubb Travel".
- plan: el producto o paquete como aparece, corto (por ejemplo "Flex Plus", "Amplia", "Hogar Integral · Paquete Óptimo", "Infinite Internacional").
- prima_contado: lo que paga el cliente DE CONTADO por todo el periodo, con IVA y con derechos o gastos de expedición incluidos (la "prima total"). Si el documento trae una tabla de formas de pago (Contado, Semestral, Trimestral...), usa la de CONTADO. Nunca la prima neta, ni una prima con recargo por pago fraccionado. En seguros de viaje, el total del seguro.
- moneda: la de la PRIMA: "MN" pesos, "DLS" dólares. En viaje las coberturas pueden venir en dólares aunque la prima sea en pesos.
- forma_pago, primer_pago y pago_siguiente: solo si el documento muestra pagos fraccionados (mensual, trimestral o semestral). Elige la forma que el documento marque como la elegida; si no marca ninguna, la primera que aparezca. primer_pago es el monto del primer pago y pago_siguiente el de cada pago posterior. Si todos los pagos son iguales, pon ese monto en pago_siguiente y 0 en primer_pago. Sin pagos fraccionados: forma_pago vacío y 0 en ambos. "Efectivo", "Anual" y "Contado" NO son pagos fraccionados.
- fecha_cotizacion: la fecha en que se hizo la cotización (o de emisión del documento), AAAA-MM-DD.
- vigencia_hasta: solo si el documento da una fecha límite explícita de la cotización ("vigente hasta el 22 de octubre de 2026"), AAAA-MM-DD. NO uses las fechas de la póliza propuesta (inicio y fin de vigencia del seguro). Vacío si solo dice un número de días.
- dias_vigencia: si dice "vigencia de 15 días naturales", 15. Si no lo dice, 0.
- campos: pares clave/valor con los datos propios del ramo. Usa SOLO las claves del ramo que identificaste (lista abajo). Valores breves, con dinero como "$1,000,000" y porcentajes como "10%". Omite lo que no aparezca. En "asegurados" y "viajeros" no copies nombres de personas: usa parentesco y edad (por ejemplo "Titular 48 años, hija 22 años"). En "folio" pon el número o folio de la cotización. En "extras" y "coberturas" resume en una sola línea lo importante (coberturas adicionales, asistencias, exclusiones notables).
- avisos: dudas sobre lo leído (qué dato no se vio claro, cuál elegiste y por qué). Si el documento trae VARIAS opciones o planes, dilo y di cuál tomaste.
El documento trae datos personales (nombres, RFC, domicilio, correo, teléfono): no los copies a ningún campo, salvo lo que piden los campos.

Claves de "campos" por ramo:
${guiaDeCampos()}
Responde solo con el JSON pedido.`;

/** Lee UNA cotización (PDF o foto) y devuelve el borrador y las dudas. No guarda nada. */
export async function leerCotizacion(archivo: { bytes: Buffer; tipo: TipoArchivo; nombre: string }): Promise<LecturaCotizacion> {
  const data = archivo.bytes.toString("base64");
  const bloque: Anthropic.Beta.BetaContentBlockParam =
    archivo.tipo === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: archivo.tipo, data } };

  let resp: Anthropic.Beta.BetaMessage;
  try {
    resp = await getCliente().beta.messages.create({
      model: MODELO,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA } },
      system: SISTEMA,
      messages: [{ role: "user", content: [bloque, { type: "text", text: "Lee esta cotización y devuelve los datos." }] }],
    });
  } catch (e) {
    throw traducirError(e, "la cotización");
  }

  if (resp.stop_reason === "refusal") throw new ErrorLectura("La IA no pudo leer ese documento.", 422);
  if (resp.stop_reason === "max_tokens") throw new ErrorLectura("El documento es demasiado largo para leerlo de una vez.", 422);

  const textoIA = resp.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  let crudo: unknown;
  try {
    crudo = JSON.parse(textoIA);
  } catch {
    throw new ErrorLectura("No pude entender lo que leyó la IA. Intenta de nuevo.");
  }
  return normalizarLectura(crudo);
}
