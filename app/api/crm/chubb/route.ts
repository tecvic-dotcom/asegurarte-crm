import { exigirAdmin } from "@/lib/sesion-admin";
import { contactosDelCRM, guardarCarga, guardarWhatsapp, ultimaCarga } from "@/lib/chubb";
import { limpiarNombreArchivo, validarPolizasChubb, whatsappDe10 } from "@/lib/chubb-reglas";
import { MigracionPendienteError } from "@/lib/migracion";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Un Excel con 3,000 pólizas pesa ~1.5 MB como JSON: el tope deja margen y frena envíos absurdos. */
const MAX_BYTES = 3_000_000;

function fallo(e: unknown): Response {
  if (e instanceof MigracionPendienteError) {
    return Response.json({ error: e.message, migracion: true, archivo: e.archivo }, { status: 409 });
  }
  console.error("[chubb]", e);
  return Response.json({ error: "Dana no pudo leer ni guardar tu Excel de Chubb Autos. Intenta de nuevo." }, { status: 500 });
}

/**
 * La última carga del Excel de Chubb Autos (o `carga: null` si aún no subes ninguno). Solo admin.
 * Con `?contactos=1` devuelve en cambio nombre y WhatsApp de tus contactos, para mandar el recordatorio de un recibo.
 */
export async function GET(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "Chubb Autos");
  if ("respuesta" in puerta) return puerta.respuesta;
  try {
    if (new URL(req.url).searchParams.get("contactos")) return Response.json({ contactos: await contactosDelCRM() });
    return Response.json({ carga: await ultimaCarga() });
  } catch (e) {
    return fallo(e);
  }
}

/** Sube un Excel nuevo: el navegador lo lee, aquí se vuelve a validar todo y se guarda como la foto más reciente. Solo admin. */
export async function POST(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "Chubb Autos");
  if ("respuesta" in puerta) return puerta.respuesta;
  if (!rateLimit(`chubb:${puerta.sesion.id}`, 10, 60_000)) {
    return Response.json({ error: "Vas muy rápido. Espera unos segundos e intenta de nuevo." }, { status: 429 });
  }

  let body: { accion?: string; archivo?: unknown; polizas?: unknown; asegurado?: unknown; whatsapp?: unknown };
  try {
    const texto = await req.text();
    if (texto.length > MAX_BYTES) return Response.json({ error: "Ese Excel es demasiado grande." }, { status: 413 });
    body = JSON.parse(texto) as typeof body;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  try {
    if (body.accion === "cargar") {
      const r = validarPolizasChubb(body.polizas);
      if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
      return Response.json({ carga: await guardarCarga(limpiarNombreArchivo(body.archivo), r.polizas) });
    }
    if (body.accion === "whatsapp") {
      const asegurado = typeof body.asegurado === "string" ? body.asegurado.trim() : "";
      if (!asegurado || asegurado.length > 200) return Response.json({ error: "Falta el nombre del asegurado." }, { status: 422 });
      if (whatsappDe10(body.whatsapp) === null) return Response.json({ error: "Escribe los 10 dígitos de su WhatsApp." }, { status: 422 });
      const contacto = await guardarWhatsapp(asegurado, body.whatsapp);
      if (!contacto) return Response.json({ error: "No encontré a ese asegurado en tu última carga. Recarga la pantalla." }, { status: 404 });
      return Response.json({ contacto });
    }
    return Response.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (e) {
    return fallo(e);
  }
}
