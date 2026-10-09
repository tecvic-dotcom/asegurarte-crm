import { sesionDesdeRequest } from "@/lib/auth";
import { ErrorLectura, MAX_BYTES, esTipoArchivo, iaLista } from "@/lib/lectura-poliza";
import { leerCotizacion } from "@/lib/lectura-cotizacion";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Leer un PDF puede tardar unos segundos.
export const maxDuration = 60;

const SIN_LLAVE =
  "Aún no está la llave de IA para leer cotizaciones. Agrega ANTHROPIC_API_KEY en tu .env.local (y en Vercel) y vuelve a intentar.";

/** Lee UNA cotización (PDF o foto) con IA y devuelve el borrador para revisar. No guarda nada. Cualquier usuario con sesión. */
export async function POST(req: Request): Promise<Response> {
  const s = sesionDesdeRequest(req);
  if (!s) return Response.json({ error: "Inicia sesión." }, { status: 401 });

  if (!rateLimit(`leer-cotizacion:${s.id}`, 20, 60_000)) {
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
  if (!(archivo instanceof File)) return Response.json({ error: "Falta el archivo." }, { status: 400 });
  if (!esTipoArchivo(archivo.type)) return Response.json({ error: "Solo PDF o foto (PNG, JPG, WEBP)." }, { status: 415 });
  if (archivo.size > MAX_BYTES) {
    return Response.json({ error: "El archivo pesa más de 4 MB. Comprímelo o sube solo las hojas principales." }, { status: 413 });
  }

  try {
    const bytes = Buffer.from(await archivo.arrayBuffer());
    return Response.json(await leerCotizacion({ bytes, tipo: archivo.type, nombre: archivo.name }));
  } catch (e) {
    if (e instanceof ErrorLectura) return Response.json({ error: e.message }, { status: e.status });
    console.error("[leer-cotizacion]", e);
    return Response.json({ error: "No pude leer esa cotización. Intenta de nuevo." }, { status: 500 });
  }
}
