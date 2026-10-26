import { exigirAdmin } from "@/lib/sesion-admin";
import { confirmarPortadaPromo, crearPromo, editarPromo, eliminarPromo, listarPromos, prepararPortadaPromo, prepararPromo } from "@/lib/tarjeta-promos";
import { validarCambiosPromo, validarNuevaPromo } from "@/lib/tarjeta-promos-reglas";
import { UUID } from "@/lib/tarjeta-videos-reglas";
import { isCloud } from "@/lib/db";
import { MigracionPendienteError } from "@/lib/migracion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fallo(e: unknown): Response {
  if (e instanceof MigracionPendienteError) {
    return Response.json({ error: e.message, migracion: true, archivo: e.archivo }, { status: 409 });
  }
  console.error("[tarjeta-promos]", e);
  // Los mensajes de las reglas del negocio (fechas, por ejemplo) sí se muestran; los técnicos no.
  const claro = e instanceof Error && /^La fecha de fin/.test(e.message);
  return Response.json({ error: claro ? (e as Error).message : "No pude leer ni guardar tus promociones. Intenta de nuevo." }, { status: claro ? 422 : 500 });
}

/** Tus promociones de la tarjeta (también las ocultas, programadas y vencidas). Solo admin. */
export async function GET(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "las promociones de tu tarjeta");
  if ("respuesta" in puerta) return puerta.respuesta;
  try {
    return Response.json({ promos: await listarPromos(), cloud: isCloud() });
  } catch (e) {
    return fallo(e);
  }
}

/** preparar (permisos para subir) · crear (registrar la promoción) · editar · eliminar · preparar-portada / confirmar-portada. Solo admin. */
export async function POST(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "las promociones de tu tarjeta");
  if ("respuesta" in puerta) return puerta.respuesta;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  const idValido = (id: unknown): id is string => typeof id === "string" && UUID.test(id);

  try {
    if (body.accion === "preparar") {
      return Response.json(await prepararPromo(body.conPortada === true, body.conVideo === true));
    }
    if (body.accion === "crear") {
      const r = validarNuevaPromo(body);
      if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
      const res = await crearPromo(r.datos);
      if (!res.ok) return Response.json({ error: res.error }, { status: 422 });
      return Response.json({ promo: res.promo });
    }
    if (body.accion === "editar") {
      if (!idValido(body.id)) return Response.json({ error: "Falta el id." }, { status: 400 });
      const r = validarCambiosPromo(body.cambios);
      if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
      const promo = await editarPromo(body.id, r.datos);
      if (!promo) return Response.json({ error: "Esa promoción ya no existe." }, { status: 404 });
      return Response.json({ promo });
    }
    if (body.accion === "eliminar") {
      if (!idValido(body.id)) return Response.json({ error: "Falta el id." }, { status: 400 });
      const ok = await eliminarPromo(body.id);
      if (!ok) return Response.json({ error: "Esa promoción ya no existe." }, { status: 404 });
      return Response.json({ ok: true });
    }
    if (body.accion === "preparar-portada") {
      if (!idValido(body.id)) return Response.json({ error: "Falta la promoción." }, { status: 400 });
      const permiso = await prepararPortadaPromo(body.id);
      if (!permiso) return Response.json({ error: "Esa promoción ya no existe." }, { status: 404 });
      return Response.json(permiso);
    }
    if (body.accion === "confirmar-portada") {
      if (!idValido(body.id)) return Response.json({ error: "Falta la promoción." }, { status: 400 });
      const r = await confirmarPortadaPromo(body.id, body.ts);
      if (!r.ok) return Response.json({ error: r.error }, { status: r.estado });
      return Response.json({ promo: r.promo });
    }
    return Response.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (e) {
    return fallo(e);
  }
}
