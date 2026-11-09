import { exigirAdmin } from "@/lib/sesion-admin";
import { guardarDestacados, listarDestacados } from "@/lib/tarjeta-destacados";
import { validarDestacados } from "@/lib/tarjeta-destacados-reglas";
import { MigracionPendienteError } from "@/lib/migracion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fallo(e: unknown): Response {
  if (e instanceof MigracionPendienteError) {
    return Response.json({ error: e.message, migracion: true, archivo: e.archivo }, { status: 409 });
  }
  console.error("[tarjeta-destacados]", e);
  return Response.json({ error: "No pude leer ni guardar tus videos destacados. Intenta de nuevo." }, { status: 500 });
}

/** Los videos destacados de la tarjeta (hasta 3, en orden). Solo admin. */
export async function GET(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "los videos destacados de tu tarjeta");
  if ("respuesta" in puerta) return puerta.respuesta;
  try {
    return Response.json({ destacados: await listarDestacados() });
  } catch (e) {
    return fallo(e);
  }
}

/** Guarda la lista completa de destacados: { destacados: [{ video_id, beneficio, ramo }] }, como mucho 3. Solo admin. */
export async function PUT(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "los videos destacados de tu tarjeta");
  if ("respuesta" in puerta) return puerta.respuesta;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }
  const r = validarDestacados(body.destacados);
  if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
  try {
    const g = await guardarDestacados(r.datos);
    if (!g.ok) return Response.json({ error: g.error }, { status: 422 });
    return Response.json({ destacados: g.lista });
  } catch (e) {
    return fallo(e);
  }
}
