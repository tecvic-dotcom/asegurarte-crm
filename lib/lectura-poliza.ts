import "server-only";

/**
 * Lectura de pólizas con IA — SOLO SERVIDOR.
 *
 * Recibe el PDF (o foto) de una póliza nueva o de renovación, se lo muestra a
 * Claude y devuelve los datos para que Roberto los REVISE antes de guardar:
 * la IA propone, él confirma. El archivo no se guarda en ningún lado.
 * (La IA recibe el documento completo, con nombres: es necesario para leerlo.)
 */
import Anthropic from "@anthropic-ai/sdk";
import { validarAdjunta } from "./adjuntas-reglas";
import { esFechaValida } from "./fechas";
import type { LecturaPoliza, TipoAdjunta } from "./types";

const MODELO = "claude-sonnet-5-5";

export const TIPOS_ARCHIVO = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;
type TipoArchivo = (typeof TIPOS_ARCHIVO)[number];
export function esTipoArchivo(t: string): t is TipoArchivo {
  return (TIPOS_ARCHIVO as readonly string[]).includes(t);
}

/** Vercel acepta cuerpos de hasta 4.5 MB: dejamos margen. */
export const MAX_BYTES = 4 * 1024 * 1024;

const ESQUEMA = {
  type: "object",
  properties: {
    ramo: { type: "string", enum: ["vida", "gmm", "ahorro", "autos", "hogar", "otro"] },
    aseguradora: { type: "string", description: "Nombre corto de la aseguradora (AXA, GNP, Qualitas...)." },
    numero: { type: "string", description: "Número de póliza tal como aparece; vacío si no se ve." },
    contratante: { type: "string", description: "Nombre del contratante." },
    inicio: { type: "string", description: "Inicio de vigencia en formato AAAA-MM-DD; vacío si no se ve." },
    prima_neta: {
      type: "number",
      description:
        "PRIMA NETA ANUAL en números, sin derechos de póliza, sin recargos por pago fraccionado y sin IVA. 0 si no aparece.",
    },
    moneda: { type: "string", enum: ["MN", "DLS"] },
    asegurados_nombres: {
      type: "array",
      items: { type: "string" },
      description: "Solo en gastos médicos: nombre de cada asegurado de la póliza (titular y dependientes). Vacío en otros ramos.",
    },
    avisos: {
      type: "array",
      items: { type: "string" },
      description: "Dudas sobre lo leído: qué dato no se vio claro o cuál elegiste y por qué. Vacío si todo es claro.",
    },
  },
  required: ["ramo", "aseguradora", "numero", "contratante", "inicio", "prima_neta", "moneda", "asegurados_nombres", "avisos"],
  additionalProperties: false,
};

const SISTEMA = `Eres un asistente que lee carátulas y pólizas de seguros mexicanos (vida, gastos médicos mayores GMM, ahorro, autos, hogar/daños) para un agente de seguros.
Extrae solo lo que está escrito en el documento; nunca inventes. Si un dato no se ve, déjalo vacío (o 0 en la prima) y dilo en "avisos".
- ramo: "gmm" para gastos médicos y salud; "vida" para vida (incluye temporal y vida entera); "ahorro" para planes de ahorro, educación y retiro; "autos"; "hogar" para casa/daños. "otro" si no encaja.
- inicio: el INICIO DE VIGENCIA de esta póliza o renovación (no la fecha de emisión ni la de impresión), en AAAA-MM-DD.
- prima_neta: la prima neta ANUAL. Si el documento solo muestra la prima de un pago fraccionado, calcula la anual solo si el documento dice cuántos pagos son, y anótalo en avisos. Nunca uses la prima total con IVA como si fuera neta; si solo ves la total, pon 0 y avísalo.
- asegurados_nombres: en GMM, todos los asegurados listados (titular y dependientes), un nombre por elemento. En otros ramos, lista vacía.
Responde solo con el JSON pedido.`;

let cliente: Anthropic | null = null;
function getCliente(): Anthropic {
  cliente ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0, timeout: 55_000 });
  return cliente;
}

export function iaLista(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export class ErrorLectura extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
    this.name = "ErrorLectura";
  }
}

function traducirError(e: unknown): ErrorLectura {
  if (e instanceof Anthropic.AuthenticationError) return new ErrorLectura("La llave de IA no es válida. Revisa ANTHROPIC_API_KEY en tu .env.local y en Vercel.");
  if (e instanceof Anthropic.RateLimitError) return new ErrorLectura("Muchas lecturas seguidas. Espera un minuto e intenta de nuevo.", 429);
  if (e instanceof Anthropic.APIError && (e.status === 402 || (e as { type?: string }).type === "billing_error")) {
    return new ErrorLectura("Tu cuenta de IA se quedó sin saldo. Recárgala en console.anthropic.com → Billing.");
  }
  if (e instanceof Anthropic.BadRequestError) return new ErrorLectura("La IA no pudo abrir ese archivo. Prueba con el PDF original o una foto más clara.", 422);
  if (e instanceof Anthropic.APIConnectionError) return new ErrorLectura("No pude conectarme con la IA (internet o tiempo de espera). Intenta de nuevo.", 504);
  return new ErrorLectura("La IA tuvo un problema al leer la póliza. Intenta de nuevo.");
}

export async function leerPoliza(
  archivo: { bytes: Buffer; tipo: TipoArchivo; nombre: string },
  tipo: TipoAdjunta,
): Promise<LecturaPoliza> {
  const data = archivo.bytes.toString("base64");
  const bloque: Anthropic.Beta.BetaContentBlockParam =
    archivo.tipo === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: archivo.tipo, data } };

  let resp: Anthropic.Beta.BetaMessage;
  try {
    resp = await getCliente().beta.messages.create({
      model: MODELO,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA } },
      system: SISTEMA,
      messages: [
        {
          role: "user",
          content: [bloque, { type: "text", text: `Lee esta póliza (${tipo === "nueva" ? "póliza nueva" : "renovación"}) y devuelve los datos.` }],
        },
      ],
    });
  } catch (e) {
    throw traducirError(e);
  }

  if (resp.stop_reason === "refusal") throw new ErrorLectura("La IA no pudo leer ese documento.", 422);
  if (resp.stop_reason === "max_tokens") throw new ErrorLectura("El documento es demasiado largo para leerlo de una vez.", 422);

  const textoIA = resp.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  let crudo: Record<string, unknown>;
  try {
    crudo = JSON.parse(textoIA) as Record<string, unknown>;
  } catch {
    throw new ErrorLectura("No pude entender lo que leyó la IA. Intenta de nuevo.");
  }

  const avisos = Array.isArray(crudo.avisos) ? crudo.avisos.map(String).filter(Boolean) : [];
  const nombres = Array.isArray(crudo.asegurados_nombres) ? crudo.asegurados_nombres.map(String).filter(Boolean) : [];
  const ramo = crudo.ramo === "otro" ? "" : String(crudo.ramo ?? "");
  const inicio = esFechaValida(String(crudo.inicio ?? "")) ? String(crudo.inicio) : "";
  if (!ramo) avisos.push("No pude identificar el ramo: elígelo tú.");
  if (!inicio) avisos.push("No vi la fecha de inicio de vigencia: escríbela tú.");
  if (!Number(crudo.prima_neta)) avisos.push("No vi la prima neta: captúrala tú.");

  // Sin validar el ramo/fecha aquí: el formulario deja corregir lo que la IA no vio.
  const base = validarAdjunta({
    tipo,
    ramo: ramo || "gmm",
    aseguradora: crudo.aseguradora,
    numero: crudo.numero,
    contratante: crudo.contratante,
    inicio: inicio || "2000-01-01",
    prima_neta: Number(crudo.prima_neta) || 0,
    moneda: crudo.moneda,
    asegurados_nombres: nombres,
    asegurados_total: Math.max(1, nombres.length),
    // En una renovación los asegurados no cuentan como nuevos.
    asegurados_nuevos: tipo === "nueva" ? nombres.length : 0,
    archivo: archivo.nombre,
  });
  if (!base.ok) throw new ErrorLectura("La IA devolvió datos raros. Intenta de nuevo.");
  return { datos: { ...base.datos, ramo: (ramo || "") as typeof base.datos.ramo, inicio }, avisos };
}
