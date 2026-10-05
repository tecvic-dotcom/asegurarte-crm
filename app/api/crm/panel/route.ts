import { exigirAdmin } from "@/lib/sesion-admin";
import { panelSnapshot } from "@/lib/panel";
import { MigracionPendienteError } from "@/lib/migracion";
import type { PeriodoPanel } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PERIODOS: PeriodoPanel[] = ["mes", "mes_pasado", "meta"];

/** Panel de Mando: tus números del periodo, ya resumidos (solo totales). Solo admin. */
export async function GET(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "el Panel de Mando");
  if ("respuesta" in puerta) return puerta.respuesta;

  const pedido = new URL(req.url).searchParams.get("periodo") as PeriodoPanel | null;
  const periodo = pedido && PERIODOS.includes(pedido) ? pedido : "mes";
  try {
    return Response.json(await panelSnapshot(periodo));
  } catch (e) {
    if (e instanceof MigracionPendienteError) {
      return Response.json({ error: e.message, migracion: true }, { status: 409 });
    }
    console.error("[panel]", e);
    return Response.json({ error: "No pude leer tus números. Revisa tu conexión e intenta de nuevo." }, { status: 500 });
  }
}
