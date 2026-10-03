import { sesionDesdeRequest } from "@/lib/auth";
import { listPlantillas, guardarPlantilla, eliminarPlantilla } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function noAuth(): Response {
  return Response.json({ error: "Inicia sesión." }, { status: 401 });
}

/** Lista las plantillas de mensaje (primer contacto, seguimiento, reactivación…). */
export async function GET(req: Request): Promise<Response> {
  if (!sesionDesdeRequest(req)) return noAuth();
  try {
    return Response.json({ plantillas: await listPlantillas() });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

/** Crea, edita o elimina una plantilla. Compartidas por todo el equipo. */
export async function POST(req: Request): Promise<Response> {
  if (!sesionDesdeRequest(req)) return noAuth();

  let body: {
    accion?: string;
    id?: string;
    nombre?: string;
    canal?: string;
    cuerpo?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  try {
    if (body.accion === "guardar" && body.nombre && body.cuerpo) {
      const plantilla = await guardarPlantilla({
        id: body.id,
        nombre: body.nombre,
        canal: body.canal === "correo" ? "correo" : "whatsapp",
        cuerpo: body.cuerpo,
      });
      return Response.json({ ok: true, plantilla });
    }
    if (body.accion === "eliminar" && body.id) {
      await eliminarPlantilla(body.id);
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
