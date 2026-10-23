import { exigirAdmin } from "@/lib/sesion-admin";
import {
  confirmarPortada,
  crearVideo,
  editarVideo,
  eliminarVideo,
  listarFijos,
  listarVideos,
  prepararPortada,
  prepararSubida,
  quitarPortadaFija,
} from "@/lib/tarjeta-videos";
import { esIdFijo, UUID, validarCambios, validarNuevo } from "@/lib/tarjeta-videos-reglas";

/** El id de un video: uno de los fijos de la tarjeta o uno de los que subiste (UUID). */
const idVideoValido = (id: unknown): id is string => esIdFijo(id) || (typeof id === "string" && UUID.test(id));
import { isCloud } from "@/lib/db";
import { MigracionPendienteError } from "@/lib/migracion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fallo(e: unknown): Response {
  if (e instanceof MigracionPendienteError) {
    return Response.json({ error: e.message, migracion: true, archivo: e.archivo }, { status: 409 });
  }
  console.error("[tarjeta-videos]", e);
  return Response.json({ error: "No pude leer ni guardar tus videos. Intenta de nuevo." }, { status: 500 });
}

/** Tus videos de la tarjeta (también los ocultos) y los videos fijos con su portada actual. Solo admin. */
export async function GET(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "los videos de tu tarjeta");
  if ("respuesta" in puerta) return puerta.respuesta;
  try {
    const [videos, fijos] = await Promise.all([listarVideos(), listarFijos()]);
    return Response.json({ videos, fijos, cloud: isCloud() });
  } catch (e) {
    return fallo(e);
  }
}

/** preparar (permiso para subir) · crear (registrar el video ya subido) · editar · eliminar · preparar-portada / confirmar-portada / quitar-portada. Solo admin. */
export async function POST(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "los videos de tu tarjeta");
  if ("respuesta" in puerta) return puerta.respuesta;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  try {
    if (body.accion === "preparar") {
      return Response.json(await prepararSubida());
    }
    if (body.accion === "crear") {
      const r = validarNuevo(body);
      if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
      const res = await crearVideo(r.datos);
      if (!res.ok) return Response.json({ error: res.error }, { status: 422 });
      return Response.json({ video: res.video });
    }
    if (body.accion === "editar") {
      if (typeof body.id !== "string" || !UUID.test(body.id)) return Response.json({ error: "Falta el id." }, { status: 400 });
      const r = validarCambios(body.cambios);
      if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
      const video = await editarVideo(body.id, r.datos);
      if (!video) return Response.json({ error: "Ese video ya no existe." }, { status: 404 });
      return Response.json({ video });
    }
    if (body.accion === "eliminar") {
      if (typeof body.id !== "string" || !UUID.test(body.id)) return Response.json({ error: "Falta el id." }, { status: 400 });
      const ok = await eliminarVideo(body.id);
      if (!ok) return Response.json({ error: "Ese video ya no existe." }, { status: 404 });
      return Response.json({ ok: true });
    }
    if (body.accion === "preparar-portada") {
      if (!idVideoValido(body.objetivo)) return Response.json({ error: "Falta el video." }, { status: 400 });
      const permiso = await prepararPortada(body.objetivo);
      if (!permiso) return Response.json({ error: "Ese video ya no existe." }, { status: 404 });
      return Response.json(permiso);
    }
    if (body.accion === "confirmar-portada") {
      if (!idVideoValido(body.objetivo)) return Response.json({ error: "Falta el video." }, { status: 400 });
      const r = await confirmarPortada(body.objetivo, body.ts);
      if (!r.ok) return Response.json({ error: r.error }, { status: r.estado });
      return Response.json({ fijo: r.fijo, video: r.video });
    }
    if (body.accion === "quitar-portada") {
      if (!esIdFijo(body.id)) return Response.json({ error: "Falta el video." }, { status: 400 });
      const fijo = await quitarPortadaFija(body.id);
      if (!fijo) return Response.json({ error: "Ese video no existe." }, { status: 404 });
      return Response.json({ fijo });
    }
    return Response.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (e) {
    return fallo(e);
  }
}
