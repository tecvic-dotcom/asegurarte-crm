import { sesionDesdeRequest } from "@/lib/auth";
import { getLead } from "@/lib/db";
import { esFechaValida, hoyLocal } from "@/lib/fechas";
import { MigracionPendienteError } from "@/lib/migracion";
import { crearPendiente, editarPendiente, listarPendientes, marcarHecho, moverPendiente } from "@/lib/pendientes";
import { validarPendiente } from "@/lib/pendientes-reglas";
import { rateLimit } from "@/lib/rate-limit";
import type { Pendiente } from "@/lib/pendientes-reglas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fallo(e: unknown): Response {
  if (e instanceof MigracionPendienteError) {
    return Response.json({ error: e.message, migracion: true, archivo: e.archivo }, { status: 409 });
  }
  console.error("[pendientes]", e);
  return Response.json({ error: "No pude leer ni guardar tus pendientes. Intenta de nuevo." }, { status: 500 });
}

/** Tus pendientes por hacer y tus completados. Cada usuario ve solo los suyos. */
export async function GET(req: Request): Promise<Response> {
  const s = sesionDesdeRequest(req);
  if (!s) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  try {
    return Response.json(await listarPendientes(s.id));
  } catch (e) {
    return fallo(e);
  }
}

/** Anotar un pendiente, editarlo, completarlo (o devolverlo) y pasarlo a otro día. */
export async function POST(req: Request): Promise<Response> {
  const s = sesionDesdeRequest(req);
  if (!s) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  if (!rateLimit(`pendientes:${s.id}`, 60, 60_000)) {
    return Response.json({ error: "Vas muy rápido. Espera unos segundos e intenta de nuevo." }, { status: 429 });
  }

  let body: { accion?: string; id?: string; pendiente?: unknown; hecho?: boolean; fecha?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  const responder = (p: Pendiente | null) =>
    p ? Response.json({ pendiente: p }) : Response.json({ error: "Ese pendiente ya no existe." }, { status: 404 });

  /** Solo se puede ligar a un prospecto que sí es tuyo (un vendedor solo ve su cartera). Devuelve el error, o null si está bien. */
  const leadInvalido = async (leadId: string | null): Promise<Response | null> => {
    if (!leadId) return null;
    const lead = await getLead(leadId, s.rol === "vendedor" ? s.id : undefined).catch(() => null);
    return lead ? null : Response.json({ error: "Ese prospecto ya no existe." }, { status: 422 });
  };

  try {
    switch (body.accion) {
      case "crear": {
        const r = validarPendiente(body.pendiente, hoyLocal());
        if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
        const sinLead = await leadInvalido(r.datos.lead_id);
        if (sinLead) return sinLead;
        return Response.json({ pendiente: await crearPendiente(s.id, r.datos) });
      }
      case "editar": {
        if (!body.id) break;
        const r = validarPendiente(body.pendiente, hoyLocal());
        if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
        const sinLead = await leadInvalido(r.datos.lead_id);
        if (sinLead) return sinLead;
        return responder(await editarPendiente(s.id, body.id, r.datos));
      }
      case "hecho":
        if (!body.id) break;
        return responder(await marcarHecho(s.id, body.id, body.hecho !== false));
      case "mover": {
        if (!body.id) break;
        const fecha = String(body.fecha ?? "");
        if (!esFechaValida(fecha)) return Response.json({ error: "Esa fecha no es válida." }, { status: 422 });
        return responder(await moverPendiente(s.id, body.id, fecha));
      }
    }
    return Response.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (e) {
    return fallo(e);
  }
}
