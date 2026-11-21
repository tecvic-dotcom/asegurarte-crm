import { registrarLector } from "@/lib/lectores";
import { enviarBienvenidaLector } from "@/lib/email-lectores";
import { URL_GUIA_IA } from "@/lib/lectores-reglas";
import { MigracionPendienteError } from "@/lib/migracion";
import { rateLimit, ipDe } from "@/lib/rate-limit";
import { limpiarTexto } from "@/lib/tarjeta-reglas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
 * Formulario de la guía gratuita del libro (/guia-ia): guarda a la persona en la lista APARTE de lectores (no en el CRM de seguros),
 * le manda el correo de bienvenida con el PDF (solo la primera vez) y responde con la dirección del PDF para descargarlo al instante.
 * Defensas: mismo sitio · límite por IP · tamaño · señuelo anti-bot (finge éxito) · validación completa en el servidor.
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
  if (!rateLimit(`guia-ia:${ipDe(req)}`, 6, 60_000)) {
    return Response.json({ error: "Demasiados envíos. Espera un minuto e inténtalo otra vez." }, { status: 429 });
  }

  let b: { nombre?: unknown; correo?: unknown; consentimiento?: unknown; trampa?: unknown; utm?: unknown };
  try {
    const texto = await req.text();
    if (texto.length > 3000) return Response.json({ error: "Petición inválida" }, { status: 400 });
    b = JSON.parse(texto);
    if (!b || typeof b !== "object") throw new Error();
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  const u = (b.utm && typeof b.utm === "object" ? b.utm : {}) as Record<string, unknown>;
  const limpia = (v: unknown) => limpiarTexto(v, 120).toLowerCase();
  const utm = { source: limpia(u.source), medium: limpia(u.medium), campaign: limpia(u.campaign), content: limpia(u.content) };
  const h = req.headers;
  const geo = { pais: h.get("x-vercel-ip-country"), ciudad: safeDecode(h.get("x-vercel-ip-city")), dispositivo: dispositivo(h.get("user-agent") ?? "") };

  try {
    const r = await registrarLector({ nombre: b.nombre, correo: b.correo, consentimiento: b.consentimiento, trampa: b.trampa }, utm, geo);
    if (!r.ok) return Response.json({ ok: false, errores: r.errores }, { status: 422 });
    // Bienvenida solo a quien llega por primera vez (si repite, ya la tiene y descarga en pantalla); nunca bloquea la descarga.
    if (!r.senuelo && r.nuevo) await enviarBienvenidaLector(r.lector);
    return Response.json({ ok: true, url: URL_GUIA_IA });
  } catch (e) {
    if (e instanceof MigracionPendienteError) console.error("[guia-ia] falta correr", e.message);
    else console.error("[guia-ia]", e instanceof Error ? e.message : e);
    return Response.json({ error: "No pudimos guardar tus datos en este momento. Intenta de nuevo en unos minutos." }, { status: 500 });
  }
}
