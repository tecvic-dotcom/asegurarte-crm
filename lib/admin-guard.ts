import "server-only";

/**
 * Valida el código de admin enviado en la cabecera `x-admin-code`.
 * El código de servidor (ADMIN_CODE) protege los DATOS; el NEXT_PUBLIC solo
 * desbloquea la UI. Tener ambos da defensa en profundidad.
 *
 * SEGURIDAD: falla CERRADO. Si no hay `ADMIN_CODE` configurado, el panel queda
 * inaccesible (NUNCA hubo un código por defecto tipo "admin"). Configura
 * `ADMIN_CODE` en Vercel → Settings → Environment Variables.
 *
 * IMPORTANTE: la barrera del SERVIDOR usa SOLO `ADMIN_CODE` (server-only). NO
 * cae a `NEXT_PUBLIC_ADMIN_CODE`, porque Next inyecta las variables NEXT_PUBLIC_
 * en el bundle del navegador: usarla como auth de servidor la dejaría leíble por
 * cualquiera. `NEXT_PUBLIC_ADMIN_CODE` es opcional y solo sirve para la UI.
 */
export function checkAdmin(req: Request): boolean {
  const expected = process.env.ADMIN_CODE;
  if (!expected) return false; // sin código de servidor configurado = acceso cerrado
  const code = req.headers.get("x-admin-code");
  return Boolean(code && code === expected);
}

export function noAutorizado(): Response {
  return Response.json({ error: "No autorizado" }, { status: 401 });
}
