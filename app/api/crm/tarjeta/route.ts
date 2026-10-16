import { exigirAdmin } from "@/lib/sesion-admin";
import { resumenTarjeta } from "@/lib/tarjeta-eventos";
import { MigracionPendienteError } from "@/lib/migracion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Resumen de los toques de tu tarjeta web (?dias=7|30|90). Solo admin. */
export async function GET(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "las estadísticas de tu tarjeta");
  if ("respuesta" in puerta) return puerta.respuesta;
  const dias = Number(new URL(req.url).searchParams.get("dias")) || 30;
  try {
    return Response.json(await resumenTarjeta(dias));
  } catch (e) {
    if (e instanceof MigracionPendienteError) {
      return Response.json({ error: e.message, migracion: true, archivo: e.archivo }, { status: 409 });
    }
    console.error("[tarjeta-web]", e);
    return Response.json({ error: "No pude leer las estadísticas de tu tarjeta. Intenta de nuevo." }, { status: 500 });
  }
}
