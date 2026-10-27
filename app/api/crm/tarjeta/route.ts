import { exigirAdmin } from "@/lib/sesion-admin";
import { listLeads } from "@/lib/db";
import { resumenTarjeta } from "@/lib/tarjeta-eventos";
import { claveVideo, prospectosDeLaTarjeta } from "@/lib/tarjeta-reglas";
import { listarFijos, listarVideos } from "@/lib/tarjeta-videos";
import { MigracionPendienteError } from "@/lib/migracion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Portada de cada video (los fijos y los que subes desde el CRM) para la lista de «Contenido». Nunca lanza: sin portada la lista usa un ícono. */
async function miniaturasDeVideos(): Promise<Record<string, string>> {
  const [fijos, subidos] = await Promise.all([listarFijos().catch(() => []), listarVideos().catch(() => [])]);
  const m: Record<string, string> = {};
  // Los fijos van primero: si un video subido repite el título de uno fijo, gana su portada.
  for (const v of [...fijos, ...subidos]) if (v.poster) m[claveVideo(v.titulo)] = v.poster;
  return m;
}

/** Resumen de los toques de tu tarjeta web (?dias=7|30|90) y de los prospectos que marcaste como «Tarjeta web». Solo admin. */
export async function GET(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "las estadísticas de tu tarjeta");
  if ("respuesta" in puerta) return puerta.respuesta;
  const dias = Number(new URL(req.url).searchParams.get("dias")) || 30;
  try {
    const r = await resumenTarjeta(dias);
    // Los prospectos y las portadas vienen del CRM, no de la medición: si no se pueden leer, el panel sigue sin ese dato.
    const prospectos = async () => {
      try {
        return prospectosDeLaTarjeta(await listLeads(), r);
      } catch (e) {
        console.error("[tarjeta-web] prospectos", e);
        return undefined;
      }
    };
    const [miniaturas, crm] = await Promise.all([miniaturasDeVideos(), prospectos()]);
    return Response.json({ ...r, miniaturas, crm });
  } catch (e) {
    if (e instanceof MigracionPendienteError) {
      return Response.json({ error: e.message, migracion: true, archivo: e.archivo }, { status: 409 });
    }
    console.error("[tarjeta-web]", e);
    return Response.json({ error: "No pude leer las estadísticas de tu tarjeta. Intenta de nuevo." }, { status: 500 });
  }
}
