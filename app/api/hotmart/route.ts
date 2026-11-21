import { timingSafeEqual } from "node:crypto";
import { marcarCompraLector } from "@/lib/lectores";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Eventos de Hotmart que cuentan como compra hecha. */
const COMPRA = new Set(["PURCHASE_APPROVED", "PURCHASE_COMPLETE"]);

function hottokValido(req: Request): boolean {
  const secreto = process.env.HOTMART_HOTTOK;
  if (!secreto) return false; // sin el código configurado, no se acepta nada
  const recibido = Buffer.from(req.headers.get("x-hotmart-hottok") ?? "");
  const esperado = Buffer.from(secreto);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

/**
 * Aviso de venta de Hotmart (Webhook versión 2.0.0). Cuando alguien compra el libro, si su correo está en la lista de lectores,
 * se marca como «compro» y deja de recibir la serie de correos. Hotmart se identifica con el «hottok» (variable HOTMART_HOTTOK).
 * No guarda datos del comprador: solo cambia el estado de un lector que ya existía.
 * Responde 200 a todo evento válido (aunque no aplique) para que Hotmart no lo reintente.
 */
export async function POST(req: Request): Promise<Response> {
  if (!hottokValido(req)) return Response.json({ error: "No autorizado" }, { status: 401 });
  let b: { event?: unknown; data?: { buyer?: { email?: unknown } } };
  try {
    const texto = await req.text();
    if (texto.length > 100_000) return Response.json({ error: "Petición inválida" }, { status: 400 });
    b = JSON.parse(texto);
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }
  const evento = typeof b.event === "string" ? b.event : "";
  if (!COMPRA.has(evento)) return Response.json({ ok: true, ignorado: evento || "sin-evento" });
  const correo = typeof b.data?.buyer?.email === "string" ? b.data.buyer.email : "";
  try {
    const marcado = await marcarCompraLector(correo);
    console.log("[hotmart]", evento, marcado ? "lector marcado como compro" : "comprador fuera de la lista de lectores");
    return Response.json({ ok: true, marcado });
  } catch (e) {
    console.error("[hotmart]", e instanceof Error ? e.message : e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
