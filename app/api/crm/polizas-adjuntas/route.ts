import { exigirAdmin } from "@/lib/sesion-admin";
import { listarAdjuntas, crearAdjunta, eliminarAdjunta } from "@/lib/polizas-adjuntas";
import { validarAdjunta } from "@/lib/adjuntas-reglas";
import { isCloud } from "@/lib/db";
import { MigracionPendienteError } from "@/lib/migracion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fallo(e: unknown): Response {
  if (e instanceof MigracionPendienteError) {
    return Response.json({ error: e.message, migracion: true, archivo: e.archivo }, { status: 409 });
  }
  console.error("[polizas-adjuntas]", e);
  return Response.json({ error: "No pude leer ni guardar tus pólizas. Intenta de nuevo." }, { status: 500 });
}

/** Todas las pólizas adjuntas (con nombres de clientes). Solo admin. */
export async function GET(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "tus pólizas");
  if ("respuesta" in puerta) return puerta.respuesta;
  try {
    return Response.json({ polizas: await listarAdjuntas(), cloud: isCloud() });
  } catch (e) {
    return fallo(e);
  }
}

/** Guardar una póliza ya revisada, o borrar una. Solo admin. */
export async function POST(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "tus pólizas");
  if ("respuesta" in puerta) return puerta.respuesta;

  let body: { accion?: string; poliza?: unknown; id?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  try {
    if (body.accion === "crear") {
      const r = validarAdjunta(body.poliza);
      if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
      const res = await crearAdjunta(r.datos);
      if (!res.ok) {
        return Response.json({ error: "Esa póliza con esa fecha de inicio ya estaba cargada.", duplicada: true }, { status: 409 });
      }
      return Response.json({ poliza: res.poliza });
    }
    if (body.accion === "eliminar") {
      if (typeof body.id !== "string" || !body.id) return Response.json({ error: "Falta el id." }, { status: 400 });
      await eliminarAdjunta(body.id);
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (e) {
    return fallo(e);
  }
}
