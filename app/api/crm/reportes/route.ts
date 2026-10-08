import { exigirAdmin } from "@/lib/sesion-admin";
import { fraseClara, reporteClara } from "@/lib/reportes";
import { MigracionPendienteError } from "@/lib/migracion";
import { esFechaValida } from "@/lib/fechas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Clara: tu reporte mensual o trimestral (?tipo=mes|trimestre&fecha=AAAA-MM-DD) o su frase (?resumen=1). Solo admin. */
export async function GET(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "tus reportes");
  if ("respuesta" in puerta) return puerta.respuesta;

  const q = new URL(req.url).searchParams;
  try {
    if (q.get("resumen")) return Response.json(await fraseClara());
    const tipo = q.get("tipo") === "trimestre" ? "trimestre" : "mes";
    const fecha = q.get("fecha");
    return Response.json(await reporteClara(tipo, fecha && esFechaValida(fecha) ? fecha : null));
  } catch (e) {
    if (e instanceof MigracionPendienteError) {
      return Response.json({ error: e.message, migracion: true, archivo: e.archivo }, { status: 409 });
    }
    console.error("[reportes]", e);
    return Response.json({ error: "No pude armar tu reporte. Intenta de nuevo." }, { status: 500 });
  }
}
