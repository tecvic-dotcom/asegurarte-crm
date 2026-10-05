import { exigirAdmin } from "@/lib/sesion-admin";
import {
  listarPolizas,
  obtenerPoliza,
  crearPoliza,
  editarPoliza,
  eliminarPoliza,
  marcarPagada,
  registrarPromesa,
  marcarRecordada,
  cancelarPoliza,
} from "@/lib/cobranza";
import { resumenCobranza, validarPoliza } from "@/lib/cobranza-reglas";
import { esFechaValida, hoyLocal } from "@/lib/fechas";
import { MigracionPendienteError } from "@/lib/migracion";
import type { Poliza } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fallo(e: unknown): Response {
  if (e instanceof MigracionPendienteError) {
    return Response.json({ error: e.message, migracion: true, archivo: e.archivo }, { status: 409 });
  }
  console.error("[cobranza]", e);
  return Response.json({ error: "Valeri no pudo leer ni guardar tu cartera. Intenta de nuevo." }, { status: 500 });
}

/** Tu cartera completa, o solo el resumen (?resumen=1, sin datos de clientes). Solo admin. */
export async function GET(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "tu cobranza");
  if ("respuesta" in puerta) return puerta.respuesta;
  try {
    const polizas = await listarPolizas();
    if (new URL(req.url).searchParams.get("resumen")) {
      return Response.json({ resumen: resumenCobranza(polizas, hoyLocal()) });
    }
    return Response.json({ polizas });
  } catch (e) {
    return fallo(e);
  }
}

/** Crear, editar, borrar y las acciones rápidas de Valeri (pagó, promesa, recordado, cancelar). */
export async function POST(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "tu cobranza");
  if ("respuesta" in puerta) return puerta.respuesta;

  let body: { accion?: string; id?: string; poliza?: unknown; fecha?: string; cancelada?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  const responder = (p: Poliza | null) =>
    p ? Response.json({ poliza: p }) : Response.json({ error: "Esa póliza ya no existe." }, { status: 404 });

  try {
    switch (body.accion) {
      case "crear": {
        const r = validarPoliza(body.poliza);
        if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
        return Response.json({ poliza: await crearPoliza(r.datos) });
      }
      case "editar": {
        if (!body.id) break;
        const actual = await obtenerPoliza(body.id);
        if (!actual) return responder(null);
        // Se mezcla con lo que ya tenía y se vuelve a validar completo.
        const r = validarPoliza({ ...actual, ...((body.poliza as object) ?? {}) });
        if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
        return responder(await editarPoliza(body.id, r.datos));
      }
      case "eliminar": {
        if (!body.id) break;
        await eliminarPoliza(body.id);
        return Response.json({ ok: true });
      }
      case "pagada":
        if (!body.id) break;
        return responder(await marcarPagada(body.id));
      case "promesa": {
        if (!body.id) break;
        const fecha = String(body.fecha ?? "");
        if (!esFechaValida(fecha) || fecha < hoyLocal()) {
          return Response.json({ error: "Elige la fecha en que prometió pagar (de hoy en adelante)." }, { status: 422 });
        }
        return responder(await registrarPromesa(body.id, fecha));
      }
      case "recordada":
        if (!body.id) break;
        return responder(await marcarRecordada(body.id));
      case "cancelar":
        if (!body.id) break;
        return responder(await cancelarPoliza(body.id, body.cancelada !== false));
    }
    return Response.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (e) {
    return fallo(e);
  }
}
