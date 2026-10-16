import { listarVideosPublicos } from "@/lib/tarjeta-videos";

export const runtime = "nodejs";
// Se pide en cada visita a la tarjeta, pero la nube la guarda 60 s: un video nuevo sale en ~1 minuto y la base casi no se toca.
export const dynamic = "force-dynamic";

/** Videos visibles que subiste desde el CRM (los que se suman a los fijos de la tarjeta). Público y sin datos internos. */
export async function GET(): Promise<Response> {
  const videos = await listarVideosPublicos();
  return Response.json({ videos }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } });
}
