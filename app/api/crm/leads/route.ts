import { sesionDesdeRequest } from "@/lib/auth";
import { listLeads, getLead, listActividad, actualizarLead, agregarActividad } from "@/lib/db";
import { esRamo } from "@/lib/ramos";
import type { EtapaId, TipoActividad, Genero, Ramo } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function noAuth(): Response {
  return Response.json({ error: "Inicia sesión." }, { status: 401 });
}

/** Lista de leads (o un lead + su timeline si viene ?id=). Requiere sesión.
 *  Un vendedor SOLO ve su propia cartera (filtro por asignado_a); el admin ve todo. */
export async function GET(req: Request): Promise<Response> {
  const s = sesionDesdeRequest(req);
  if (!s) return noAuth();
  const soloMio = s.rol === "vendedor" ? s.id : undefined;
  const id = new URL(req.url).searchParams.get("id");
  try {
    if (id) {
      const lead = await getLead(id, soloMio);
      if (!lead) return Response.json({ error: "No encontrado" }, { status: 404 });
      const actividad = await listActividad(id);
      return Response.json({ lead, actividad });
    }
    return Response.json({ leads: await listLeads(soloMio) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

/** Mover de etapa, editar o registrar actividad. Requiere sesión. */
export async function POST(req: Request): Promise<Response> {
  const s = sesionDesdeRequest(req);
  if (!s) return noAuth();

  let body: {
    accion?: string;
    id?: string;
    etapa?: string;
    texto?: string;
    tipo?: string;
    patch?: {
      nombre?: string;
      notas?: string;
      valor?: number;
      asignado_a?: string | null;
      genero?: Genero | null;
      fecha_nacimiento?: string | null;
      codigo_postal?: string | null;
      ramo?: Ramo | null;
    };
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  const autor = s.nombre;
  const soloMio = s.rol === "vendedor" ? s.id : undefined;
  try {
    if (body.accion === "mover" && body.id && body.etapa) {
      const lead = await actualizarLead(body.id, { etapa: body.etapa as EtapaId }, autor, soloMio);
      if (!lead) return Response.json({ error: "No encontrado" }, { status: 404 });
      return Response.json({ ok: true, lead });
    }
    if (body.accion === "editar" && body.id && body.patch) {
      if (body.patch.ramo !== undefined && body.patch.ramo !== null && !esRamo(body.patch.ramo)) {
        return Response.json({ error: "Ramo no válido." }, { status: 400 });
      }
      const lead = await actualizarLead(body.id, body.patch, autor, soloMio);
      if (!lead) return Response.json({ error: "No encontrado" }, { status: 404 });
      return Response.json({ ok: true, lead });
    }
    if (body.accion === "actividad" && body.id && body.texto) {
      await agregarActividad(
        body.id,
        { tipo: (body.tipo as TipoActividad) ?? "nota", texto: String(body.texto).slice(0, 1000), autor },
        soloMio,
      );
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
