import { agregarActividad } from "@/lib/db";
import { rateLimit, ipDe } from "@/lib/rate-limit";
import type { TipoActividad } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TIPOS = new Set<string>(["nota", "llamada", "mensaje", "correo", "cita", "etapa", "pago"]);

/**
 * Sumidero ligero de eventos. Registra actividad atada a un lead conocido
 * (p. ej. "abrió el WhatsApp"). Con rate limiting y validación del tipo para que
 * no se pueda inundar la tabla ni inyectar tipos no permitidos.
 * Gancho para M3/M4 (analítica de embudo) sin construirlo aún.
 */
export async function POST(req: Request): Promise<Response> {
  const ip = ipDe(req);
  // Silencioso (devolvemos ok) para no revelar el límite a un atacante.
  if (!rateLimit(`tracking:${ip}`, 20, 60_000)) return Response.json({ ok: true });

  let body: { lead_id?: string; tipo?: string; texto?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ ok: true });
  }
  try {
    if (body.lead_id && body.texto) {
      const tipo = (TIPOS.has(body.tipo ?? "") ? body.tipo : "nota") as TipoActividad;
      await agregarActividad(body.lead_id, { tipo, texto: String(body.texto).slice(0, 500), autor: "Sistema" });
    }
  } catch {
    /* nunca rompemos la experiencia por un evento de tracking */
  }
  return Response.json({ ok: true });
}
