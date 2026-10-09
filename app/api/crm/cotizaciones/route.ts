import { sesionDesdeRequest } from "@/lib/auth";
import { getLead } from "@/lib/db";
import { MigracionPendienteError } from "@/lib/migracion";
import { cambiarEstado, crearCotizacion, editarCotizacion, listarCotizaciones, marcarEnviadas } from "@/lib/cotizaciones";
import { esEstadoCotizacion, validarCotizacion, type Cotizacion } from "@/lib/cotizaciones-reglas";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ID = /^[\w-]{1,64}$/;
/** Tope de cotizaciones que se marcan enviadas de una vez (un mensaje nunca lleva tantas). */
const MAX_ENVIADAS = 30;

function fallo(e: unknown): Response {
  if (e instanceof MigracionPendienteError) {
    return Response.json({ error: e.message, migracion: true, archivo: e.archivo }, { status: 409 });
  }
  console.error("[cotizaciones]", e);
  return Response.json({ error: "No pude leer ni guardar tus cotizaciones. Intenta de nuevo." }, { status: 500 });
}

/** Solo se cotiza a un prospecto que sí es tuyo (un vendedor solo ve su cartera). Devuelve el error, o null si está bien. */
async function prospectoInvalido(leadId: string, esVendedor: boolean, usuarioId: string): Promise<Response | null> {
  const lead = await getLead(leadId, esVendedor ? usuarioId : undefined).catch(() => null);
  return lead ? null : Response.json({ error: "Ese prospecto ya no existe." }, { status: 422 });
}

/** Tus cotizaciones: las de un prospecto (?lead_id=) o las más recientes de todos. Cada usuario ve solo las suyas. */
export async function GET(req: Request): Promise<Response> {
  const s = sesionDesdeRequest(req);
  if (!s) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  const leadId = new URL(req.url).searchParams.get("lead_id")?.trim() || undefined;
  if (leadId && !ID.test(leadId)) return Response.json({ error: "Ese prospecto no es válido." }, { status: 422 });
  try {
    return Response.json({ cotizaciones: await listarCotizaciones(s.id, leadId) });
  } catch (e) {
    return fallo(e);
  }
}

/** Guardar una cotización, corregirla, cambiarle el estado o marcar varias como enviadas. */
export async function POST(req: Request): Promise<Response> {
  const s = sesionDesdeRequest(req);
  if (!s) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  if (!rateLimit(`cotizaciones:${s.id}`, 60, 60_000)) {
    return Response.json({ error: "Vas muy rápido. Espera unos segundos e intenta de nuevo." }, { status: 429 });
  }

  let body: { accion?: string; id?: string; ids?: unknown; cotizacion?: unknown; estado?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  const responder = (c: Cotizacion | null) =>
    c ? Response.json({ cotizacion: c }) : Response.json({ error: "Esa cotización ya no existe." }, { status: 404 });

  try {
    switch (body.accion) {
      case "crear": {
        const r = validarCotizacion(body.cotizacion);
        if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
        const sinProspecto = await prospectoInvalido(r.datos.lead_id, s.rol === "vendedor", s.id);
        if (sinProspecto) return sinProspecto;
        return Response.json({ cotizacion: await crearCotizacion(s.id, r.datos) });
      }
      case "editar": {
        if (!body.id || !ID.test(body.id)) break;
        const r = validarCotizacion(body.cotizacion);
        if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
        return responder(await editarCotizacion(s.id, body.id, r.datos));
      }
      case "estado": {
        if (!body.id || !ID.test(body.id)) break;
        if (!esEstadoCotizacion(body.estado)) return Response.json({ error: "Ese estado no es válido." }, { status: 422 });
        return responder(await cambiarEstado(s.id, body.id, body.estado));
      }
      case "enviadas": {
        const ids = body.ids;
        const valido =
          Array.isArray(ids) &&
          ids.length > 0 &&
          ids.length <= MAX_ENVIADAS &&
          ids.every((x) => typeof x === "string" && ID.test(x)) &&
          new Set(ids).size === ids.length;
        if (!valido) return Response.json({ error: "Esas cotizaciones no son válidas." }, { status: 422 });
        return Response.json({ cotizaciones: await marcarEnviadas(s.id, ids as string[]) });
      }
    }
    return Response.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (e) {
    return fallo(e);
  }
}
