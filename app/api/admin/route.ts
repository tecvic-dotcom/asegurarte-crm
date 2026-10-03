import { checkAdmin, noAutorizado } from "@/lib/admin-guard";
import { rateLimit, ipDe } from "@/lib/rate-limit";
import {
  metricas,
  listLeads,
  listUsuarios,
  getAjustes,
  setAjuste,
  crearUsuario,
  eliminarUsuario,
  eliminarLead,
  exportarLeadsCSV,
} from "@/lib/db";
import type { RolUsuario } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Panel admin. Protegido por código (cabecera x-admin-code, fail-closed).
 * GET  ?recurso=resumen|csv
 * POST { accion: 'ajuste'|'crear-usuario'|'eliminar-usuario'|'eliminar-lead', ... }
 */
export async function GET(req: Request): Promise<Response> {
  if (!checkAdmin(req)) return noAutorizado();
  const ip = ipDe(req);
  if (!rateLimit(`admin:${ip}`, 30, 60_000)) {
    return Response.json({ error: "Demasiadas peticiones." }, { status: 429 });
  }
  const recurso = new URL(req.url).searchParams.get("recurso") ?? "resumen";

  try {
    if (recurso === "csv") {
      const csv = await exportarLeadsCSV();
      return new Response(csv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="leads.csv"',
        },
      });
    }
    const [m, leads, usuarios, ajustes] = await Promise.all([
      metricas(),
      listLeads(),
      listUsuarios(),
      getAjustes(),
    ]);
    return Response.json({ metricas: m, leads, usuarios, ajustes });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<Response> {
  if (!checkAdmin(req)) return noAutorizado();
  const ip = ipDe(req);
  if (!rateLimit(`admin:${ip}`, 40, 60_000)) {
    return Response.json({ error: "Demasiadas peticiones." }, { status: 429 });
  }

  let body: {
    accion?: string;
    clave?: string;
    valor?: string;
    id?: string;
    nombre?: string;
    correo?: string;
    rol?: string;
    password?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  try {
    if (body.accion === "ajuste" && body.clave) {
      await setAjuste(body.clave, String(body.valor ?? ""));
      return Response.json({ ok: true });
    }
    if (body.accion === "crear-usuario") {
      const r = await crearUsuario({
        nombre: body.nombre ?? "",
        correo: body.correo ?? "",
        rol: (body.rol === "admin" ? "admin" : "vendedor") as RolUsuario,
        password: body.password ?? "",
      });
      return Response.json(r);
    }
    if (body.accion === "eliminar-usuario" && body.id) {
      await eliminarUsuario(body.id);
      return Response.json({ ok: true });
    }
    if (body.accion === "eliminar-lead" && body.id) {
      await eliminarLead(body.id);
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
