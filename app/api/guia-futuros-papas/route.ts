import { crearLeadGuia, getLead } from "@/lib/db";
import { notificarNuevoLead } from "@/lib/email";
import { agendarSeguimientoNuevoLead } from "@/lib/seguimiento-nuevo-lead";
import { rateLimit, ipDe } from "@/lib/rate-limit";
import { registrarEventoTarjeta } from "@/lib/tarjeta-eventos";
import { limpiarTexto } from "@/lib/tarjeta-reglas";
import { URL_GUIA_FUTUROS_PAPAS } from "@/lib/guia-futuros-papas-reglas";

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
 * Recibe el formulario de la «Guía para futuros papás» (tarjeta /roberto y landing): guarda al prospecto en el CRM
 * (origen «Guía para futuros papás», etapa «Nuevo», con su pendiente de hoy y el aviso por correo) y responde con la dirección del PDF.
 * Capas de defensa: mismo sitio · límite por IP · tamaño · señuelo anti-bot (finge éxito) · validación completa en el servidor.
 * 200 {ok, url} · 422 {ok:false, errores} · 429 · 400/403/500.
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
  if (!rateLimit(`guia-papas:${ipDe(req)}`, 6, 60_000)) {
    return Response.json({ error: "Demasiados envíos. Espera un minuto e inténtalo otra vez." }, { status: 429 });
  }

  let b: { nombre?: unknown; whatsapp?: unknown; correo?: unknown; consentimiento?: unknown; trampa?: unknown; utm?: unknown; f?: unknown };
  try {
    const texto = await req.text();
    if (texto.length > 3000) return Response.json({ error: "Petición inválida" }, { status: 400 });
    b = JSON.parse(texto);
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  // UTMs: solo texto corto y seguro
  const u = (b.utm && typeof b.utm === "object" ? b.utm : {}) as Record<string, unknown>;
  const limpia = (v: unknown) => limpiarTexto(v, 120).toLowerCase();
  const utm = { source: limpia(u.source), medium: limpia(u.medium), campaign: limpia(u.campaign), term: limpia(u.term), content: limpia(u.content) };

  const h = req.headers;
  const geo = {
    pais: h.get("x-vercel-ip-country"),
    ciudad: safeDecode(h.get("x-vercel-ip-city")),
    region: h.get("x-vercel-ip-country-region"),
    dispositivo: dispositivo(h.get("user-agent") ?? ""),
  };

  try {
    const r = await crearLeadGuia({ nombre: b.nombre, whatsapp: b.whatsapp, correo: b.correo, consentimiento: b.consentimiento, trampa: b.trampa, utm }, geo);
    if (!r.ok && r.errores) return Response.json({ ok: false, errores: r.errores }, { status: 422 });
    if (r.ok && r.id && !(typeof b.trampa === "string" && b.trampa.trim())) {
      // Contador anónimo (no lleva nada de la persona)
      await registrarEventoTarjeta({
        evento: "guia",
        detalle: r.duplicado ? "dato-repetido" : "dato-nuevo",
        dispositivo: "",
        fuente: limpiarTexto(b.f, 30).toLowerCase().replace(/[^a-z0-9._-]/g, "") || utm.source.slice(0, 30),
      });
      if (!r.duplicado) {
        const lead = await getLead(r.id);
        if (lead) {
          // Pendiente de hoy + correo de aviso: ambos fallan en silencio sin tocar al prospecto ya guardado
          const pendienteAgendado = await agendarSeguimientoNuevoLead(lead);
          await notificarNuevoLead(lead, { pendienteAgendado, resumen: "Pidió la «Guía para futuros papás»" });
        }
      }
    }
    return Response.json({ ok: true, url: URL_GUIA_FUTUROS_PAPAS });
  } catch (e) {
    console.error("[guia-futuros-papas]", e instanceof Error ? e.message : e);
    return Response.json({ error: "No pudimos guardar tus datos en este momento. Intenta de nuevo en unos minutos." }, { status: 500 });
  }
}
