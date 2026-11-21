import { darDeBaja } from "@/lib/lectores";
import { esTokenBaja } from "@/lib/lectores-reglas";
import { rateLimit, ipDe } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Baja de la lista de lectores. Lo usan:
 *  - el botón de /guia-ia/baja (POST con ?t=código), y
 *  - el botón «Cancelar suscripción» de Gmail/Outlook (cabecera List-Unsubscribe-Post: un POST de un clic, sin Origin).
 * Solo por POST: así los antivirus que abren las ligas del correo (GET) no dan de baja a nadie sin querer.
 * El código es secreto (uuid), así que no hace falta revisar el origen. Siempre responde igual para no revelar si un código existe.
 */
export async function POST(req: Request): Promise<Response> {
  if (!rateLimit(`baja-lectores:${ipDe(req)}`, 20, 60_000)) return Response.json({ error: "Espera un minuto." }, { status: 429 });
  const t = new URL(req.url).searchParams.get("t");
  if (!esTokenBaja(t)) return Response.json({ ok: false }, { status: 400 });
  try {
    await darDeBaja(t.toLowerCase());
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[lectores/baja]", e instanceof Error ? e.message : e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
