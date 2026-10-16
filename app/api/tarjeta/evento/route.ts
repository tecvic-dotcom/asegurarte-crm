import { rateLimit, ipDe } from "@/lib/rate-limit";
import { registrarEventoTarjeta } from "@/lib/tarjeta-eventos";
import { esEventoTarjeta, limpiarTexto } from "@/lib/tarjeta-reglas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROBOTS = /bot|crawl|spider|slurp|facebookexternalhit|headless|lighthouse|pingdom|uptime/i;

/**
 * Recibe los toques ANÓNIMOS de la tarjeta digital (/roberto): qué sección se vio, qué botón se tocó.
 * No guarda IP, nombre ni cookies. Solo acepta eventos conocidos, con texto corto y limpio, desde tu propio sitio,
 * y con límite por IP para que nadie inunde la tabla. Responde siempre 204 (la tarjeta no espera nada).
 */
export async function POST(req: Request): Promise<Response> {
  const fin = () => new Response(null, { status: 204 });
  try {
    if (ROBOTS.test(req.headers.get("user-agent") ?? "")) return fin();
    const origen = req.headers.get("origin");
    if (origen) {
      try {
        const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
        if (new URL(origen).host !== host) return fin(); // otro sitio mandando toques: se ignora
      } catch {
        return fin();
      }
    }
    if (!rateLimit(`tarjeta-ev:${ipDe(req)}`, 120, 60_000)) return fin();
    const texto = await req.text();
    if (texto.length > 600) return fin();
    const b = JSON.parse(texto) as { e?: unknown; d?: unknown; v?: unknown; f?: unknown };
    if (!esEventoTarjeta(b.e)) return fin();
    await registrarEventoTarjeta({
      evento: b.e,
      detalle: limpiarTexto(b.d, 60),
      dispositivo: b.v === "movil" || b.v === "escritorio" ? b.v : "",
      fuente: limpiarTexto(b.f, 30).toLowerCase().replace(/[^a-z0-9._-]/g, ""),
    });
  } catch {
    /* un toque que no se pudo guardar no le importa a nadie */
  }
  return fin();
}
