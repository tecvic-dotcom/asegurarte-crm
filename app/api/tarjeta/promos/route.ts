import { listarPromosPublicas } from "@/lib/tarjeta-promos";

export const runtime = "nodejs";
// Se pide en cada visita a la tarjeta, pero la nube la guarda 60 s: una promoción nueva sale en ~1 minuto y la base casi no se toca.
export const dynamic = "force-dynamic";

/**
 * Lo que la tarjeta pide al abrirse: las promociones VIGENTES hoy (visibles, ya empezadas y sin vencer). Público y sin datos internos.
 * Si no hay ninguna (o falta la migración), devuelve una lista vacía y la tarjeta no muestra la sección.
 */
export async function GET(): Promise<Response> {
  const promos = await listarPromosPublicas();
  return Response.json({ promos }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } });
}
