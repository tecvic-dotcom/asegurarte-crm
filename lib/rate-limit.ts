import "server-only";

/**
 * Rate limiting mínimo en memoria (best-effort) para frenar enumeración y spam
 * en endpoints públicos (captura, login). En serverless es por-instancia; para
 * límites estrictos a escala usarías Upstash/Redis, pero esto cubre el caso real
 * del kit sin dependencias nuevas.
 */
interface Bucket {
  count: number;
  reset: number;
}
const buckets = new Map<string, Bucket>();

/** True si la petición CABE en la ventana; false si excede el límite. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count++;
  return true;
}

/** IP del cliente (detrás del proxy de Vercel). "anon" si no se sabe. */
export function ipDe(req: Request): string {
  const h = req.headers;
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "anon";
}
