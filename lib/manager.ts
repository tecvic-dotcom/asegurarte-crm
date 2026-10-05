import "server-only";

/**
 * RORO, tu gerente digital — SOLO SERVIDOR.
 *
 * Arma la pregunta para la IA de Claude con:
 *  1) quién es RORO y cómo debe responder (fijo; se guarda en caché para que
 *     cada pregunta cueste menos),
 *  2) el cerebro de tu negocio (lo editas en su pestaña),
 *  3) tus NÚMEROS de hoy, calculados por lib/panel.ts (los mismos del Panel).
 *
 * La llave de la IA vive SOLO aquí, en el servidor (ANTHROPIC_API_KEY, sin
 * NEXT_PUBLIC). Y a la IA nunca le mandamos nombres, teléfonos ni correos de
 * tus clientes: solo totales.
 */
import Anthropic from "@anthropic-ai/sdk";
import { numerosParaManager } from "./panel";
import { cerebroEfectivo } from "./manager-config";
import type { ManagerConfig, RespuestaManager, TurnoManager } from "./types";

/** El modelo de Claude que usa RORO. */
const MODELO = "claude-opus-5-5";

/** Cuántos turnos previos del chat se mandan (más turnos = más costo por pregunta). */
const MAX_TURNOS_HISTORIAL = 8;

/** Formato fijo de cada respuesta: así RORO siempre contesta como director, no como buscador. */
const ESQUEMA_RESPUESTA = {
  type: "object",
  properties: {
    tipo: {
      type: "string",
      enum: ["decision", "respuesta", "falta_dato"],
      description: "decision = pide decidir algo; respuesta = pregunta informativa; falta_dato = falta un dato clave.",
    },
    resumen: { type: "string", description: "La respuesta directa en 1 o 2 frases." },
    recomendacion: { type: "string", description: "Qué harías tú, concreto. Vacío si no es una decisión." },
    porque: { type: "string", description: "El porqué con las cifras reales de Roberto. Vacío si no aplica." },
    riesgo: {
      type: "string",
      description: "Qué pasa si sale mal y a partir de qué número reconsiderar. Vacío si no aplica.",
    },
    accion_hoy: { type: "string", description: "Una sola acción concreta para hoy. Vacío si no aplica." },
    dato_faltante: {
      type: "string",
      description: "Qué dato falta exactamente y dónde se registra en el CRM. Vacío si no falta nada.",
    },
  },
  required: ["tipo", "resumen", "recomendacion", "porque", "riesgo", "accion_hoy", "dato_faltante"],
  additionalProperties: false,
};

export function iaLista(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let cliente: Anthropic | null = null;
function getCliente(): Anthropic {
  // Sin reintentos automáticos: la ruta tiene 60 s de vida y un error claro
  // ("intenta de nuevo") es mejor que una espera muda.
  cliente ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0, timeout: 50_000 });
  return cliente;
}

/** Error con mensaje humano (y, si la IA alcanzó a trabajar, los tokens que gastó). */
export class ErrorManager extends Error {
  constructor(
    message: string,
    public status = 502,
    public tokens: { entrada: number; salida: number } | null = null,
  ) {
    super(message);
    this.name = "ErrorManager";
  }
}

function sistemaEstable(config: ManagerConfig): string {
  return `Eres ${config.nombre}, el gerente digital de Roberto Rodríguez, agente de seguros independiente en México (marca "Asegurarte"). Vives dentro de su CRM y lees sus números reales. Eres directo: dices sin rodeos qué harías tú, como un director que está de su lado.

CÓMO RESPONDES
- Español de México, claro y cálido, frases cortas. Cero jerga sin traducir: si dices "margen", explica "lo que te queda limpio de cada venta"; si dices "conversión", di "de cada 10 prospectos, cuántos compran".
- Si te pide decidir algo (contratar, gastar, subir precios, en qué enfocarse), usa tipo "decision" y llena los cuatro campos: recomendacion (qué harías tú, concreto y valiente), porque (con SUS cifras del bloque NÚMEROS), riesgo (qué pasa si te equivocas y a partir de qué número reconsiderarías) y accion_hoy (una sola cosa que puede hacer hoy).
- Si es una pregunta informativa ("¿cuánto llevo?"), usa tipo "respuesta": contesta en resumen y llena accion_hoy si aplica; deja vacíos los campos que no apliquen.
- Si te falta un dato clave para responder bien, usa tipo "falta_dato": di en dato_faltante qué necesitas exactamente y dónde lo registra en el CRM (pestaña Panel → Movimientos para dinero; el expediente del prospecto para ramo y etapa; tu pestaña para el contexto del negocio). No inventes.

REGLAS DE NÚMEROS
- Usa solo las cifras del bloque NÚMEROS y del contexto del negocio. Nunca inventes cifras ni uses "promedios de la industria" como si fueran suyos.
- Marca qué es cálculo exacto y qué es estimación. Si proyectas, di el supuesto y da un escenario optimista y uno pesimista con los mismos datos.
- Montos en pesos mexicanos con separador de miles ($12,500). Di siempre de qué periodo es cada número ("octubre al día 4", "septiembre").
- Un monto en 0 por falta de registros significa "sin registrar", no "cero": dilo así y sugiere registrarlo.
- La "meta" son pólizas por ramo dentro de una ventana de fechas; el ritmo es cuántas debería llevar a hoy para llegar a tiempo.

TU EQUIPO
- Valeri es el empleado digital de cobranza: cada día ordena a quién cobrarle y le deja a Roberto el WhatsApp listo. En NÚMEROS, el bloque "cobranza" trae sus totales (vencidas, dinero en riesgo, por vencer, promesas, renovaciones).
- Si te preguntan por cobranza, da la estrategia con esos totales y manda a Roberto a la pestaña "Valeri · Cobranza" para ver nombres y mensajes.

LÍMITES
- Tú propones; Roberto decide. Nunca digas que moviste dinero, mandaste mensajes o cambiaste datos: no puedes hacerlo.
- No pidas ni repitas datos personales de clientes (nombres, teléfonos, correos): trabaja con totales.
- Si te preguntan algo fuera del negocio, contesta breve y regresa al negocio.

CONTEXTO DEL NEGOCIO (lo escribió Roberto; lo puede cambiar en tu pestaña del CRM):
<negocio>
${cerebroEfectivo(config)}
</negocio>`;
}

function validarRespuesta(x: unknown): RespuestaManager | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const tipo = r.tipo;
  if (tipo !== "decision" && tipo !== "respuesta" && tipo !== "falta_dato") return null;
  const texto = (k: string) => (typeof r[k] === "string" ? (r[k] as string).trim() : "");
  const resumen = texto("resumen");
  if (!resumen) return null;
  return {
    tipo,
    resumen,
    recomendacion: texto("recomendacion"),
    porque: texto("porque"),
    riesgo: texto("riesgo"),
    accion_hoy: texto("accion_hoy"),
    dato_faltante: texto("dato_faltante"),
  };
}

export type ResultadoHistorial = { ok: true; turnos: TurnoManager[] } | { ok: false; error: string };

/**
 * Revisa el historial que manda el navegador: turnos alternados que empiezan
 * con el usuario, de tamaño acotado. Solo viaja TEXTO (nunca bloques internos
 * de razonamiento de la IA), así el historial nunca queda "editado".
 */
export function validarHistorial(entrada: unknown): ResultadoHistorial {
  if (entrada === undefined || entrada === null) return { ok: true, turnos: [] };
  if (!Array.isArray(entrada) || entrada.length > 40) return { ok: false, error: "Historial inválido." };
  const turnos: TurnoManager[] = [];
  for (const t of entrada) {
    const rol = (t as { rol?: unknown })?.rol;
    const texto = (t as { texto?: unknown })?.texto;
    if ((rol !== "usuario" && rol !== "roro") || typeof texto !== "string" || !texto.trim()) {
      return { ok: false, error: "Historial inválido." };
    }
    turnos.push({ rol, texto: texto.slice(0, 4000) });
  }
  for (let i = 0; i < turnos.length; i++) {
    if (turnos[i].rol !== (i % 2 === 0 ? "usuario" : "roro")) return { ok: false, error: "Historial inválido." };
  }
  if (turnos.length % 2 !== 0) return { ok: false, error: "Historial inválido." };
  // Solo los últimos turnos (en pares completos pregunta-respuesta).
  return { ok: true, turnos: turnos.slice(-MAX_TURNOS_HISTORIAL) };
}

function traducirError(e: unknown): ErrorManager {
  if (e instanceof Anthropic.AuthenticationError) {
    return new ErrorManager("La llave de IA no es válida. Revisa ANTHROPIC_API_KEY en tu .env.local y en Vercel.");
  }
  if (e instanceof Anthropic.PermissionDeniedError) {
    return new ErrorManager("Tu cuenta de IA no tiene permiso para este modelo. Revísala en console.anthropic.com.");
  }
  if (e instanceof Anthropic.NotFoundError) {
    return new ErrorManager("No encontré el modelo de IA. Pídele a Claude Code que lo revise.");
  }
  if (e instanceof Anthropic.RateLimitError) {
    return new ErrorManager("Muchas preguntas seguidas. Espera un minuto e intenta de nuevo.", 429);
  }
  if (e instanceof Anthropic.APIError && (e.status === 402 || (e as { type?: string }).type === "billing_error")) {
    return new ErrorManager("Tu cuenta de IA se quedó sin saldo. Recárgala en console.anthropic.com → Billing.");
  }
  if (e instanceof Anthropic.BadRequestError) {
    return new ErrorManager("La IA no aceptó la pregunta. Intenta decirla de otra forma.");
  }
  if (e instanceof Anthropic.InternalServerError) {
    return new ErrorManager("La IA está saturada en este momento. Intenta en un minuto.", 503);
  }
  if (e instanceof Anthropic.APIConnectionError) {
    return new ErrorManager("No pude conectarme con la IA (internet o tiempo de espera). Intenta de nuevo.", 504);
  }
  if (e instanceof Anthropic.APIError) {
    return new ErrorManager("La IA tuvo un problema. Intenta de nuevo.");
  }
  return new ErrorManager("Algo falló al consultar a la IA. Intenta de nuevo.", 500);
}

export async function preguntarAManager(
  config: ManagerConfig,
  pregunta: string,
  historial: TurnoManager[],
  nombreUsuario: string,
): Promise<{ respuesta: RespuestaManager; tokens: { entrada: number; salida: number } }> {
  const numeros = await numerosParaManager(config);

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...historial.map((t): Anthropic.Beta.BetaMessageParam => ({
      role: t.rol === "usuario" ? "user" : "assistant",
      content: t.texto,
    })),
    { role: "user", content: pregunta },
  ];

  let resp: Anthropic.Beta.BetaMessage;
  try {
    resp = await getCliente().beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      // Si los filtros de seguridad de la IA rechazan por error una pregunta
      // normal, la API reintenta sola con el modelo de respaldo recomendado.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: ESQUEMA_RESPUESTA },
      },
      system: [
        // Bloque fijo (se cachea): RORO + cerebro. Los números van aparte porque cambian.
        { type: "text", text: sistemaEstable(config), cache_control: { type: "ephemeral" } },
        {
          type: "text",
          text: `Te escribe: ${nombreUsuario}.\nNÚMEROS DEL CRM (calculados hoy ${numeros.hoy}; montos en pesos MXN):\n${JSON.stringify(numeros)}`,
        },
      ],
      messages,
    });
  } catch (e) {
    throw traducirError(e);
  }

  const u = resp.usage;
  const tokens = {
    entrada: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0),
    salida: u.output_tokens ?? 0,
  };

  if (resp.stop_reason === "refusal") {
    throw new ErrorManager(
      "RORO no puede responder esa pregunta. Intenta decirla de otra forma, enfocada en tu negocio.",
      422,
      tokens,
    );
  }
  if (resp.stop_reason === "max_tokens") {
    throw new ErrorManager("La respuesta salió demasiado larga. Hazme una pregunta más concreta.", 422, tokens);
  }

  const texto = resp.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    throw new ErrorManager("RORO se trabó al responder. Intenta de nuevo.", 502, tokens);
  }
  const respuesta = validarRespuesta(crudo);
  if (!respuesta) throw new ErrorManager("RORO se trabó al responder. Intenta de nuevo.", 502, tokens);
  return { respuesta, tokens };
}
