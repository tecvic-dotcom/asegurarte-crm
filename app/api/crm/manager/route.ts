import { exigirAdmin } from "@/lib/sesion-admin";
import { rateLimit } from "@/lib/rate-limit";
import {
  CEREBRO_BASE,
  getManagerConfig,
  guardarManagerConfig,
  validarConfig,
  getUso,
  registrarUso,
} from "@/lib/manager-config";
import { iaLista, preguntarAManager, validarHistorial, ErrorManager } from "@/lib/manager";
import { MENSAJE_MIGRACION, MigracionPendienteError } from "@/lib/migracion";
import type { ManagerEstado } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// La IA puede tardar unos segundos en pensar; damos margen (y el cliente corta a los 50 s).
export const maxDuration = 60;

const SIN_LLAVE =
  "Robert todavía no tiene su llave de IA. Agrega ANTHROPIC_API_KEY en tu .env.local (y en Vercel) y vuelve a intentar.";

async function anotarUso(tokens: { entrada: number; salida: number }): Promise<void> {
  try {
    await registrarUso(tokens.entrada, tokens.salida);
  } catch (e) {
    console.error("[manager] no pude registrar el uso", e);
  }
}

/** Estado de Robert: su configuración, cuántas preguntas llevas este mes y si ya tiene llave de IA. */
export async function GET(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "a Robert");
  if ("respuesta" in puerta) return puerta.respuesta;
  try {
    const [{ config, migracionPendiente }, uso] = await Promise.all([getManagerConfig(), getUso()]);
    const estado: ManagerEstado = { config, cerebroBase: CEREBRO_BASE, uso, iaLista: iaLista(), migracionPendiente };
    return Response.json(estado);
  } catch (e) {
    console.error("[manager]", e);
    return Response.json({ error: "No pude cargar a Robert. Intenta de nuevo." }, { status: 500 });
  }
}

/** Preguntarle a Robert, o guardar lo que sabe de tu negocio. */
export async function POST(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "a Robert");
  if ("respuesta" in puerta) return puerta.respuesta;
  const { sesion } = puerta;

  let body: { accion?: string; pregunta?: unknown; historial?: unknown; config?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  if (body.accion === "guardar-config") {
    const r = validarConfig(body.config);
    if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
    try {
      await guardarManagerConfig(r.config);
      return Response.json({ config: r.config });
    } catch (e) {
      if (e instanceof MigracionPendienteError) {
        return Response.json({ error: e.message, migracion: true }, { status: 409 });
      }
      console.error("[manager]", e);
      return Response.json({ error: "No pude guardar. Intenta de nuevo." }, { status: 500 });
    }
  }

  if (body.accion !== "preguntar") return Response.json({ error: "Acción no reconocida" }, { status: 400 });

  // Freno de mano: máximo 6 preguntas por minuto (evita gastos por doble clic o un error).
  if (!rateLimit(`roro:${sesion.id}`, 6, 60_000)) {
    return Response.json({ error: "Vas muy rápido. Espera un minuto y vuelve a preguntar." }, { status: 429 });
  }
  if (!iaLista()) return Response.json({ error: SIN_LLAVE, sinLlave: true }, { status: 503 });

  const pregunta = typeof body.pregunta === "string" ? body.pregunta.trim() : "";
  if (pregunta.length < 2 || pregunta.length > 800) {
    return Response.json({ error: "Escribe tu pregunta (máximo 800 caracteres)." }, { status: 400 });
  }
  const historial = validarHistorial(body.historial);
  if (!historial.ok) return Response.json({ error: historial.error }, { status: 400 });

  try {
    const { config, migracionPendiente } = await getManagerConfig();
    if (migracionPendiente) return Response.json({ error: MENSAJE_MIGRACION, migracion: true }, { status: 409 });

    const uso = await getUso();
    if (uso.usadas >= uso.tope) {
      return Response.json(
        {
          error: `Llegaste al tope de ${uso.tope} preguntas de este mes (así cuidas tu gasto). Si lo quieres subir, cambia RORO_TOPE_MENSUAL.`,
          tope: true,
        },
        { status: 429 },
      );
    }

    const { respuesta, tokens } = await preguntarAManager(config, pregunta, historial.turnos, sesion.nombre);
    await anotarUso(tokens);
    return Response.json({ respuesta, uso: { ...uso, usadas: uso.usadas + 1 } });
  } catch (e) {
    if (e instanceof ErrorManager) {
      if (e.tokens) await anotarUso(e.tokens);
      return Response.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof MigracionPendienteError) {
      return Response.json({ error: e.message, migracion: true }, { status: 409 });
    }
    console.error("[manager]", e);
    return Response.json({ error: "Robert no pudo leer tus números. Intenta de nuevo." }, { status: 500 });
  }
}
