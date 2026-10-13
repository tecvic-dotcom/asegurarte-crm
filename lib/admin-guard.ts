import "server-only";
import { sesionDesdeRequest } from "./auth";

/**
 * Puerta del panel de administración: SOLO una sesión de ADMINISTRADOR.
 *
 * Esa sesión solo existe si la persona pasó contraseña + captcha + código de su app (doble factor).
 *
 * Antes también se aceptaba un código fijo (ADMIN_CODE, cabecera `x-admin-code`): quien lo supiera entraba
 * al panel —leads con datos de clientes, crear usuarios admin— sin contraseña ni doble factor. Se quitó:
 * un 2FA con una puerta trasera no protege nada. La variable ADMIN_CODE ya no se usa; puedes borrarla de Vercel.
 */
export function checkAdmin(req: Request): boolean {
  return sesionDesdeRequest(req)?.rol === "admin";
}

export function noAutorizado(): Response {
  return Response.json({ error: "No autorizado" }, { status: 401 });
}
