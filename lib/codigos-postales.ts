import "server-only";

/**
 * Código postal → ciudad, estado y país — SOLO SERVIDOR.
 * Lee la tabla codigos_postales (catálogo de Correos de México, cargado en tu
 * Supabase). Si la tabla aún no existe o el código no está, simplemente no
 * rellena nada: guardar un código postal nunca debe fallar por esto.
 */
import { adminDb, cloudReady } from "./supabase-admin";

export interface UbicacionCP {
  ciudad: string;
  estado: string;
  pais: string;
}

export async function ubicacionDeCP(cp: string): Promise<UbicacionCP | null> {
  if (!/^\d{5}$/.test(cp) || !(cloudReady && adminDb)) return null;
  try {
    const { data, error } = await adminDb.from("codigos_postales").select("ciudad, municipio, estado").eq("cp", cp).limit(1);
    if (error || !data?.length) return null;
    const f = data[0] as { ciudad: string; municipio: string; estado: string };
    const ciudad = f.ciudad || f.municipio;
    if (!ciudad && !f.estado) return null;
    return { ciudad, estado: f.estado, pais: "México" };
  } catch {
    return null;
  }
}
