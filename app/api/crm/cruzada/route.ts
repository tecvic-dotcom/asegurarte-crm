import { exigirAdmin } from "@/lib/sesion-admin";
import { editarCliente, obtenerCliente, sincronizarClientes } from "@/lib/clientes";
import { datosCamila, guardarEstado, guardarMensajeCruzada, leadParaCotizar } from "@/lib/cruzada";
import { esClaveMensaje, validarCliente, validarEstado, validarMensajeCruzada } from "@/lib/cruzada-reglas";
import { hoyLocal } from "@/lib/fechas";
import { esRamo } from "@/lib/ramos";
import { MigracionPendienteError } from "@/lib/migracion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fallo(e: unknown): Response {
  if (e instanceof MigracionPendienteError) {
    return Response.json({ error: e.message, migracion: true, archivo: e.archivo }, { status: 409 });
  }
  console.error("[cruzada]", e);
  return Response.json({ error: "Camila no pudo leer ni guardar tus clientes. Intenta de nuevo." }, { status: 500 });
}

const noExiste = () => Response.json({ error: "Ese cliente ya no existe." }, { status: 404 });

/** Todo lo que Camila necesita: clientes, pólizas de Valeri, libro de AXA, ofertas y tus mensajes. Solo admin. */
export async function GET(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "a tus clientes");
  if ("respuesta" in puerta) return puerta.respuesta;
  try {
    return Response.json(await datosCamila());
  } catch (e) {
    return fallo(e);
  }
}

/** Corregir un cliente, anotar cómo va una oferta, personalizar mensajes, armar expedientes y preparar una cotización. Solo admin. */
export async function POST(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "a tus clientes");
  if ("respuesta" in puerta) return puerta.respuesta;

  let body: { accion?: string; id?: string; cliente?: unknown; cliente_id?: string; estado?: unknown; clave?: unknown; texto?: unknown; ramo?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  try {
    switch (body.accion) {
      case "sincronizar":
        return Response.json({ resultado: await sincronizarClientes() });

      case "cliente": {
        if (!body.id) break;
        const actual = await obtenerCliente(body.id);
        if (!actual) return noExiste();
        // Se mezcla con lo que ya tenía y se vuelve a validar completo.
        const r = validarCliente({ ...actual, ...((body.cliente as object) ?? {}) }, hoyLocal());
        if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
        const guardado = await editarCliente(body.id, r.datos);
        return guardado ? Response.json({ cliente: guardado }) : noExiste();
      }

      case "estado": {
        if (!body.cliente_id) break;
        if (!(await obtenerCliente(body.cliente_id))) return noExiste();
        const r = validarEstado(body.estado, hoyLocal());
        if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
        return Response.json({ estado: await guardarEstado(body.cliente_id, r.datos) });
      }

      case "mensaje": {
        if (!esClaveMensaje(body.clave)) return Response.json({ error: "Situación no válida." }, { status: 400 });
        if (body.texto === null) {
          await guardarMensajeCruzada(body.clave, null);
          return Response.json({ ok: true });
        }
        const r = validarMensajeCruzada(body.texto);
        if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
        await guardarMensajeCruzada(body.clave, r.texto);
        return Response.json({ ok: true });
      }

      case "cotizar": {
        if (!body.cliente_id || !esRamo(body.ramo)) break;
        const r = await leadParaCotizar(body.cliente_id, body.ramo, puerta.sesion.nombre);
        if (!r.ok) return Response.json({ error: r.error }, { status: r.noExiste ? 404 : 422 });
        return Response.json({ lead_id: r.lead_id, creado: r.creado });
      }
    }
    return Response.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (e) {
    return fallo(e);
  }
}
