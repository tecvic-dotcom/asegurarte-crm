import { getAjustes } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Ajustes PÚBLICOS no sensibles (link de WhatsApp/grupo, nombre, toggle del
 * pop-up). Los lee la página de gracias y la de captura. Editarlos requiere
 * el código admin (eso vive en /api/admin).
 */
export async function GET(): Promise<Response> {
  try {
    return Response.json(await getAjustes());
  } catch {
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}
