import { exigirAdmin } from "@/lib/sesion-admin";
import {
  listarMovimientos,
  obtenerMovimiento,
  crearMovimientos,
  actualizarMovimiento,
  eliminarMovimiento,
} from "@/lib/finanzas";
import { validarMovimiento } from "@/lib/finanzas-reglas";
import { esFechaValida, hoyLocal, primeroDeMes } from "@/lib/fechas";
import { MigracionPendienteError } from "@/lib/migracion";
import type { NuevoMovimiento } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_POR_ENVIO = 500;

function fallo(e: unknown): Response {
  if (e instanceof MigracionPendienteError) {
    return Response.json({ error: e.message, migracion: true }, { status: 409 });
  }
  console.error("[finanzas]", e);
  return Response.json({ error: "No pude guardar ni leer tus movimientos. Intenta de nuevo." }, { status: 500 });
}

/** Lista tus movimientos de un rango de fechas (?desde=AAAA-MM-DD&hasta=AAAA-MM-DD). Solo admin. */
export async function GET(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "tus finanzas");
  if ("respuesta" in puerta) return puerta.respuesta;

  const q = new URL(req.url).searchParams;
  const hoy = hoyLocal();
  const desde = q.get("desde") ?? primeroDeMes(hoy);
  const hasta = q.get("hasta") ?? hoy;
  if (!esFechaValida(desde) || !esFechaValida(hasta) || hasta < desde) {
    return Response.json({ error: "Rango de fechas inválido." }, { status: 400 });
  }
  try {
    return Response.json({ movimientos: await listarMovimientos(desde, hasta) });
  } catch (e) {
    return fallo(e);
  }
}

/** Crear (uno o varios), editar o eliminar movimientos. Todo se valida aquí, en el servidor. */
export async function POST(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "tus finanzas");
  if ("respuesta" in puerta) return puerta.respuesta;

  let body: { accion?: string; id?: string; movimientos?: unknown[]; cambios?: Record<string, unknown> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  try {
    if (body.accion === "crear") {
      const lista = Array.isArray(body.movimientos) ? body.movimientos : [];
      if (!lista.length) return Response.json({ error: "No mandaste ningún movimiento." }, { status: 400 });
      if (lista.length > MAX_POR_ENVIO) {
        return Response.json({ error: `Máximo ${MAX_POR_ENVIO} movimientos por envío.` }, { status: 400 });
      }
      const validos: NuevoMovimiento[] = [];
      const errores: { indice: number; error: string }[] = [];
      lista.forEach((m, indice) => {
        const r = validarMovimiento(m);
        if (r.ok) validos.push(r.movimiento);
        else errores.push({ indice, error: r.error });
      });
      if (errores.length) {
        return Response.json({ error: errores[0].error, errores }, { status: 422 });
      }
      return Response.json({ movimientos: await crearMovimientos(validos, puerta.sesion.nombre) });
    }

    if (body.accion === "editar" && body.id) {
      const actual = await obtenerMovimiento(body.id);
      if (!actual) return Response.json({ error: "Ese movimiento ya no existe." }, { status: 404 });
      const r = validarMovimiento({ ...actual, ...(body.cambios ?? {}) });
      if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
      return Response.json({ movimiento: await actualizarMovimiento(body.id, r.movimiento) });
    }

    if (body.accion === "eliminar" && body.id) {
      await eliminarMovimiento(body.id);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (e) {
    return fallo(e);
  }
}
