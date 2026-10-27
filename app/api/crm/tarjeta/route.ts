import { exigirAdmin } from "@/lib/sesion-admin";
import { listLeads } from "@/lib/db";
import { resumenTarjeta } from "@/lib/tarjeta-eventos";
import { prospectosDeLaTarjeta } from "@/lib/tarjeta-reglas";
import { MigracionPendienteError } from "@/lib/migracion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Resumen de los toques de tu tarjeta web (?dias=7|30|90) y de los prospectos que marcaste como «Tarjeta web». Solo admin. */
export async function GET(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "las estadísticas de tu tarjeta");
  if ("respuesta" in puerta) return puerta.respuesta;
  const dias = Number(new URL(req.url).searchParams.get("dias")) || 30;
  try {
    const r = await resumenTarjeta(dias);
    // Los prospectos vienen del CRM, no de la medición: si no se pueden leer, el panel sigue sin ese dato.
    try {
      return Response.json({ ...r, crm: prospectosDeLaTarjeta(await listLeads(), r) });
    } catch (e) {
      console.error("[tarjeta-web] prospectos", e);
      return Response.json(r);
    }
  } catch (e) {
    if (e instanceof MigracionPendienteError) {
      return Response.json({ error: e.message, migracion: true, archivo: e.archivo }, { status: 409 });
    }
    console.error("[tarjeta-web]", e);
    return Response.json({ error: "No pude leer las estadísticas de tu tarjeta. Intenta de nuevo." }, { status: 500 });
  }
}
