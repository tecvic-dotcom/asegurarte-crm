import { exigirAdmin } from "@/lib/sesion-admin";
import { obtenerPoliza, registrarPago } from "@/lib/cobranza";
import { validarEvento } from "@/lib/historial-reglas";
import { conteoHistorial, crearEvento, eliminarEvento, listarHistorial } from "@/lib/polizas-historial";
import { MigracionPendienteError } from "@/lib/migracion";
import type { TipoEvento } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ID = /^[\w-]{1,64}$/;

function fallo(e: unknown): Response {
  if (e instanceof MigracionPendienteError) {
    return Response.json({ error: e.message, migracion: true, archivo: e.archivo }, { status: 409 });
  }
  console.error("[historial]", e);
  return Response.json({ error: "No pude leer ni guardar el historial de la póliza. Intenta de nuevo." }, { status: 500 });
}

function tipoValido(v: string | null): TipoEvento | undefined {
  return v === "pago" || v === "endoso" || v === "renovacion" ? v : undefined;
}

/**
 * El historial de una póliza (?poliza_id=…, opcional &tipo=pago|endoso|renovacion) o, con ?conteo=1, cuántos movimientos
 * tiene cada póliza (solo cifras). Solo admin.
 */
export async function GET(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "el historial de tus pólizas");
  if ("respuesta" in puerta) return puerta.respuesta;
  const url = new URL(req.url);
  try {
    if (url.searchParams.get("conteo")) return Response.json({ conteo: await conteoHistorial() });
    const id = url.searchParams.get("poliza_id") ?? "";
    if (!ID.test(id)) return Response.json({ error: "Falta la póliza." }, { status: 422 });
    return Response.json({ eventos: await listarHistorial(id, tipoValido(url.searchParams.get("tipo"))) });
  } catch (e) {
    return fallo(e);
  }
}

/** Anotar un pago (con o sin saldar el recibo que toca) o un endoso, o borrar un movimiento. Solo admin. */
export async function POST(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "el historial de tus pólizas");
  if ("respuesta" in puerta) return puerta.respuesta;

  let body: { accion?: string; poliza_id?: string; evento?: unknown; avanzar?: boolean; id?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  try {
    if (body.accion === "crear") {
      const polizaId = String(body.poliza_id ?? "");
      if (!ID.test(polizaId)) return Response.json({ error: "Falta la póliza." }, { status: 422 });
      const r = validarEvento(body.evento);
      if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
      const poliza = await obtenerPoliza(polizaId);
      if (!poliza) return Response.json({ error: "Esa póliza ya no existe." }, { status: 404 });
      const d = r.datos;

      if (d.tipo === "pago") {
        const actual = await registrarPago(
          polizaId,
          { fecha: d.fecha, monto: d.monto, concepto: d.concepto, nota: d.nota, recibo: d.recibo },
          body.avanzar === true,
        );
        return Response.json({ poliza: actual, eventos: await listarHistorial(polizaId, "pago") });
      }
      await crearEvento({
        poliza_id: polizaId,
        tipo: "endoso",
        fecha: d.fecha,
        monto: d.monto,
        concepto: d.concepto,
        numero: d.numero,
        nota: d.nota,
        recibo: null,
        desde: null,
        hasta: null,
      });
      return Response.json({ eventos: await listarHistorial(polizaId, "endoso") });
    }
    if (body.accion === "eliminar") {
      if (!body.id || !ID.test(body.id)) return Response.json({ error: "Falta el movimiento." }, { status: 422 });
      await eliminarEvento(body.id);
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (e) {
    return fallo(e);
  }
}
