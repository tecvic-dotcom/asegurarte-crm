import { listarVideosPublicos, portadasPublicas } from "@/lib/tarjeta-videos";
import { destacadosPublicos } from "@/lib/tarjeta-destacados";

export const runtime = "nodejs";
// Se pide en cada visita a la tarjeta, pero la nube la guarda 60 s: un video nuevo sale en ~1 minuto y la base casi no se toca.
export const dynamic = "force-dynamic";

/**
 * Lo que la tarjeta pide al abrirse: los videos visibles que subiste desde el CRM (se suman a los fijos) y las portadas que subiste para los videos FIJOS
 * (id → dirección) y los videos DESTACADOS que elegiste (los únicos que se ven en la tarjeta; lista vacía = la tarjeta usa los 3 de fábrica). Público y sin datos internos.
 */
export async function GET(): Promise<Response> {
  const [videos, portadas, destacados] = await Promise.all([listarVideosPublicos(), portadasPublicas(), destacadosPublicos()]);
  return Response.json({ videos, portadas, destacados }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } });
}
