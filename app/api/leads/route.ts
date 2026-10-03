import { crearLead, getLead } from "@/lib/db";
import { rateLimit, ipDe } from "@/lib/rate-limit";
import { notificarNuevoLead } from "@/lib/email";
import type { NuevoLead } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Adivina el dispositivo desde el user-agent (para el CRM). */
function dispositivo(ua: string): string {
  if (/mobile|iphone|ipod|android.*mobile/i.test(ua)) return "Móvil";
  if (/ipad|tablet|android/i.test(ua)) return "Tablet";
  return "Escritorio";
}

function safeDecode(v: string | null): string | null {
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/**
 * Recibe un lead de la página de captura. Valida en servidor (cliente Y
 * servidor), deduplica por correo/teléfono y guarda con sus UTMs + geo.
 * 422 = errores de validación por campo. La base nunca se expone al navegador.
 */
export async function POST(req: Request): Promise<Response> {
  const ip = ipDe(req);
  if (!rateLimit(`leads:${ip}`, 8, 60_000)) {
    return Response.json({ error: "Demasiados envíos. Espera un minuto." }, { status: 429 });
  }

  let body: NuevoLead;
  try {
    body = (await req.json()) as NuevoLead;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  const h = req.headers;
  const geo = {
    pais: h.get("x-vercel-ip-country"),
    ciudad: safeDecode(h.get("x-vercel-ip-city")),
    region: h.get("x-vercel-ip-country-region"),
    dispositivo: dispositivo(h.get("user-agent") ?? ""),
  };

  try {
    const r = await crearLead(body, geo);
    if (!r.ok && r.errores) {
      return Response.json({ ok: false, errores: r.errores }, { status: 422 });
    }
    if (r.ok && !r.duplicado && r.id) {
      // Esperamos el correo (falla silencioso adentro) para que funcione también
      // en Vercel, donde la función puede cortarse justo al responder.
      const lead = await getLead(r.id);
      if (lead) await notificarNuevoLead(lead);
    }
    return Response.json({ ok: true, duplicado: r.duplicado });
  } catch {
    return Response.json({ error: "Error del servidor. Intenta de nuevo." }, { status: 500 });
  }
}
