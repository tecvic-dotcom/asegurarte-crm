import { sesionDesdeRequest } from "@/lib/auth";
import { listLeads, getLead, listActividad, actualizarLead, agregarActividad, crearLeadManual } from "@/lib/db";
import { esRamo } from "@/lib/ramos";
import { esCobranzaAseguradora } from "@/lib/cobranza-autos";
import type { EtapaId, TipoActividad, Genero, Ramo, NuevoLeadManual, CobranzaAseguradora } from "@/lib/types";

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
    lead?: Partial<NuevoLeadManual>;
    /** «Es otra persona»: guardar aunque comparta WhatsApp o correo con alguien de nombre parecido. */
    forzar?: boolean;
    patch?: {
      nombre?: string;
      notas?: string;
      valor?: number;
      asignado_a?: string | null;
      genero?: Genero | null;
      fecha_nacimiento?: string | null;
      codigo_postal?: string | null;
      ramo?: Ramo | null;
      origen?: string;
      cobranza_aseguradora?: CobranzaAseguradora | null;
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
    if (body.accion === "crear" && body.lead) {
      const l = body.lead;
      const r = await crearLeadManual(
        {
          nombre: String(l.nombre ?? ""),
          whatsapp: String(l.whatsapp ?? ""),
          correo: String(l.correo ?? ""),
          etapa: l.etapa as EtapaId,
          ramo: (l.ramo ?? null) as Ramo | null,
          valor: Number(l.valor) || 0,
          origen: String(l.origen ?? "Manual"),
          notas: String(l.notas ?? ""),
        },
        s.nombre,
        // Un vendedor captura ya asignado a él; así lo ve en su cartera.
        s.rol === "vendedor" ? s.id : null,
        { forzar: body.forzar === true },
      );
      if (!r.ok) {
        return Response.json({ errores: r.errores, error: Object.values(r.errores ?? {})[0] ?? "Revisa los datos." }, { status: 422 });
      }
      return Response.json({ ok: true, duplicado: r.duplicado, id: r.id, nombre: r.nombre });
    }
    if (body.accion === "mover" && body.id && body.etapa) {
      const lead = await actualizarLead(body.id, { etapa: body.etapa as EtapaId }, autor, soloMio);
      if (!lead) return Response.json({ error: "No encontrado" }, { status: 404 });
      return Response.json({ ok: true, lead });
    }
    if (body.accion === "editar" && body.id && body.patch) {
      if (body.patch.ramo !== undefined && body.patch.ramo !== null && !esRamo(body.patch.ramo)) {
        return Response.json({ error: "Ramo no válido." }, { status: 400 });
      }
      if (body.patch.origen !== undefined && (typeof body.patch.origen !== "string" || !body.patch.origen.trim())) {
        return Response.json({ error: "Origen no válido." }, { status: 400 });
      }
      const aseg = body.patch.cobranza_aseguradora;
      if (aseg !== undefined) {
        if (aseg !== null && !esCobranzaAseguradora(aseg)) return Response.json({ error: "Aseguradora no válida." }, { status: 400 });
        // Valeri y Dana son del administrador: un vendedor no decide dónde se cobra.
        if (s.rol !== "admin") return Response.json({ error: "Solo el administrador decide dónde se lleva la cobranza." }, { status: 403 });
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
