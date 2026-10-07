import { exigirAdmin } from "@/lib/sesion-admin";
import { rateLimit } from "@/lib/rate-limit";
import { ErrorLectura, MAX_BYTES, esTipoArchivo, iaLista, leerPoliza } from "@/lib/lectura-poliza";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Leer un PDF puede tardar unos segundos.
export const maxDuration = 60;

const SIN_LLAVE =
  "Aún no tengo la llave de IA para leer pólizas. Agrega ANTHROPIC_API_KEY en tu .env.local (y en Vercel) y vuelve a intentar.";

/** Lee UNA póliza (PDF o foto) con IA y devuelve los datos para revisar. No guarda nada. Solo admin. */
export async function POST(req: Request): Promise<Response> {
  const puerta = exigirAdmin(req, "tus pólizas");
  if ("respuesta" in puerta) return puerta.respuesta;

  if (!rateLimit(`leer-poliza:${puerta.sesion.id}`, 20, 60_000)) {
    return Response.json({ error: "Vas muy rápido. Espera un minuto y sigue con las demás." }, { status: 429 });
  }
  if (!iaLista()) return Response.json({ error: SIN_LLAVE, sinLlave: true }, { status: 503 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "No pude recibir el archivo." }, { status: 400 });
  }
  const archivo = form.get("archivo");
  const tipo = form.get("tipo");
  if (tipo !== "nueva" && tipo !== "renovacion") return Response.json({ error: "Elige si es nueva o renovación." }, { status: 400 });
  if (!(archivo instanceof File)) return Response.json({ error: "Falta el archivo." }, { status: 400 });
  if (!esTipoArchivo(archivo.type)) return Response.json({ error: "Solo PDF o foto (PNG, JPG, WEBP)." }, { status: 415 });
  if (archivo.size > MAX_BYTES) {
    return Response.json({ error: "El archivo pesa más de 4 MB. Comprímelo o sube solo las hojas principales." }, { status: 413 });
  }

  try {
    const bytes = Buffer.from(await archivo.arrayBuffer());
    const lectura = await leerPoliza({ bytes, tipo: archivo.type, nombre: archivo.name }, tipo);
    return Response.json(lectura);
  } catch (e) {
    if (e instanceof ErrorLectura) return Response.json({ error: e.message }, { status: e.status });
    console.error("[leer-poliza]", e);
    return Response.json({ error: "No pude leer esa póliza. Intenta de nuevo." }, { status: 500 });
  }
}
