import { exigirAdmin } from "@/lib/sesion-admin";
import { esMotivo, guardarMensajeCobro, listarMensajesCobro } from "@/lib/cobranza-mensajes";
import { validarMensajeCobro } from "@/lib/cobranza-reglas";
import { MigracionPendienteError } from "@/lib/migracion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fallo(e: unknown): Response {
  if (e instanceof MigracionPendienteError) {
    return Response.json({ error: e.message, migracion: true, archivo: e.archivo }, { status: 409 });
  }
  console.error("[cobranza-mensajes]", e);
  return Response.json({ error: "No pude guardar tus mensajes. Intenta de nuevo." }, { status: 500 });
}

/** Tus mensajes personalizados de cobranza. Solo admin. */
export async function GET(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "tu cobranza");
  if ("respuesta" in puerta) return puerta.respuesta;
  try {
    return Response.json({ mensajes: await listarMensajesCobro() });
  } catch (e) {
    // Sin la tabla, Valeri sigue funcionando con sus textos base.
    if (e instanceof MigracionPendienteError) return Response.json({ mensajes: {}, migracion: true });
    return fallo(e);
  }
}

/** Guardar tu texto para una situación (texto null = volver al base). Solo admin. */
export async function POST(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "tu cobranza");
  if ("respuesta" in puerta) return puerta.respuesta;

  let body: { motivo?: unknown; texto?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }
  if (!esMotivo(body.motivo)) return Response.json({ error: "Situación no válida." }, { status: 400 });

  try {
    if (body.texto === null) {
      await guardarMensajeCobro(body.motivo, null);
      return Response.json({ ok: true });
    }
    const r = validarMensajeCobro(body.texto);
    if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
    await guardarMensajeCobro(body.motivo, r.texto);
    return Response.json({ ok: true });
  } catch (e) {
    return fallo(e);
  }
}
