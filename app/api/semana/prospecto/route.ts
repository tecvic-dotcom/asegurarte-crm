import { crearLeadSemana, getLead } from "@/lib/db";
import { notificarNuevoLead } from "@/lib/email";
import { rateLimit, ipDe } from "@/lib/rate-limit";
import { registrarEventoTarjeta } from "@/lib/tarjeta-eventos";
import { limpiarTexto } from "@/lib/tarjeta-reglas";
import { limpiarPlan } from "@/lib/semana-reglas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Guarda como prospecto a quien, desde la app «Mi Semana Familiar» (/semana), pidió que Roberto lo contacte.
 * Solo acepta datos de contacto, el consentimiento y el plan en semáforo (nunca montos). Validación completa en el
 * servidor, solo desde tu propio sitio, con límite por IP. 422 = errores por campo.
 */
export async function POST(req: Request): Promise<Response> {
  const origen = req.headers.get("origin");
  if (origen) {
    try {
      const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
      if (new URL(origen).host !== host) return Response.json({ error: "Petición no permitida." }, { status: 403 });
    } catch {
      return Response.json({ error: "Petición no permitida." }, { status: 403 });
    }
  }
  if (!rateLimit(`semana-prospecto:${ipDe(req)}`, 6, 60_000)) {
    return Response.json({ error: "Demasiados envíos. Espera un minuto." }, { status: 429 });
  }

  let b: { nombre?: unknown; whatsapp?: unknown; correo?: unknown; consentimiento?: unknown; trampa?: unknown; plan?: unknown; f?: unknown };
  try {
    const texto = await req.text();
    if (texto.length > 3000) return Response.json({ error: "Petición inválida" }, { status: 400 });
    b = JSON.parse(texto);
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }
  const plan = limpiarPlan(b.plan);
  if (!plan) return Response.json({ error: "Petición inválida" }, { status: 400 });

  try {
    const r = await crearLeadSemana({ nombre: b.nombre, whatsapp: b.whatsapp, correo: b.correo, consentimiento: b.consentimiento, trampa: b.trampa, plan });
    if (!r.ok && r.errores) return Response.json({ ok: false, errores: r.errores }, { status: 422 });
    if (r.ok && r.id && !(typeof b.trampa === "string" && b.trampa.trim())) {
      // Contador anónimo: «dejó sus datos». No lleva nada de la persona.
      await registrarEventoTarjeta({
        evento: "sf_dato",
        detalle: r.duplicado ? "repetido" : "nuevo",
        dispositivo: "",
        fuente: limpiarTexto(b.f, 30).toLowerCase().replace(/[^a-z0-9._-]/g, ""),
      });
      if (!r.duplicado) {
        const lead = await getLead(r.id);
        if (lead) await notificarNuevoLead(lead); // falla en silencio adentro
      }
    }
    return Response.json({ ok: true, duplicado: r.duplicado });
  } catch (e) {
    console.error("[semana-prospecto]", e);
    return Response.json({ error: "Error del servidor. Intenta de nuevo." }, { status: 500 });
  }
}
