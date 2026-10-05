import "server-only";
import { sesionDesdeRequest } from "./auth";
import type { Sesion } from "./types";

/**
 * Puerta de las rutas del AI Manager: tus finanzas y tu gerente digital son
 * solo para el ADMINISTRADOR. Un vendedor de tu equipo no ve tus números.
 */
export function exigirAdmin(req: Request, que = "esta sección"): { sesion: Sesion } | { respuesta: Response } {
  const sesion = sesionDesdeRequest(req);
  if (!sesion) return { respuesta: Response.json({ error: "Inicia sesión." }, { status: 401 }) };
  if (sesion.rol !== "admin") {
    return { respuesta: Response.json({ error: `Solo el administrador puede ver ${que}.` }, { status: 403 }) };
  }
  return { sesion };
}
