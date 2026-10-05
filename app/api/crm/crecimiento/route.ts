import { exigirAdmin } from "@/lib/sesion-admin";
import { listarProduccion } from "@/lib/produccion";
import { isCloud } from "@/lib/db";
import { MigracionPendienteError } from "@/lib/migracion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Tu producción por mes y ramo (solo totales, sin clientes). Solo admin. */
export async function GET(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "tu crecimiento");
  if ("respuesta" in puerta) return puerta.respuesta;
  try {
    return Response.json({ filas: await listarProduccion(), cloud: isCloud() });
  } catch (e) {
    if (e instanceof MigracionPendienteError) {
      return Response.json({ error: e.message, migracion: true, archivo: e.archivo }, { status: 409 });
    }
    console.error("[crecimiento]", e);
    return Response.json({ error: "No pude leer tu producción. Intenta de nuevo." }, { status: 500 });
  }
}
