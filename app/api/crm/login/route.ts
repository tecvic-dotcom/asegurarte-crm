import { leerUsuarioMfa, loginUsuario } from "@/lib/db";
import { rateLimit, ipDe } from "@/lib/rate-limit";
import { captchaActivo, firmarPreauth, verificarCaptcha } from "@/lib/mfa";
import { borrarCookieMfa, borrarCookieSesion, cookieMfa, jsonConCookies } from "@/lib/cookies-auth";
import { MigracionPendienteError } from "@/lib/migracion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Login del equipo del CRM, PRIMER paso: correo + contraseña + captcha.
 * NO entrega la sesión: deja una verificación a medias (cookie de 5 min) y le dice al navegador qué sigue:
 *  - { paso: "codigo" }     → ya enlazó su app autenticadora: que escriba el código de 6 dígitos.
 *  - { paso: "configurar" } → todavía no: que enlace la app (QR) antes de entrar.
 * La sesión se entrega en /api/crm/2fa, cuando el código es correcto.
 */
export async function POST(req: Request): Promise<Response> {
  const ip = ipDe(req);
  if (!rateLimit(`login:${ip}`, 10, 60_000)) {
    return Response.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  }

  let correo = "";
  let password = "";
  let captcha = "";
  try {
    const b = (await req.json()) as { correo?: string; password?: string; captcha?: string };
    correo = (b.correo ?? "").trim();
    password = b.password ?? "";
    captcha = typeof b.captcha === "string" ? b.captcha : "";
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }
  if (!correo || !password) {
    return Response.json({ error: "Escribe tu correo y tu contraseña." }, { status: 400 });
  }

  // El captcha va ANTES de revisar la contraseña: frena a los robots sin gastar el cálculo pesado del hash.
  if (captchaActivo()) {
    const c = await verificarCaptcha(captcha, ip);
    if (c === "falla") {
      return Response.json({ error: "No pudimos comprobar que eres una persona. Inténtalo de nuevo.", captcha: true }, { status: 400 });
    }
    if (c === "error") {
      return Response.json({ error: "No pude verificar el captcha ahora mismo. Inténtalo en un momento.", captcha: true }, { status: 503 });
    }
  }

  try {
    const u = await loginUsuario(correo, password);
    if (!u) return Response.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });

    const estado = await leerUsuarioMfa(u.id);
    if (!estado) return Response.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });

    const token = firmarPreauth(u.id);
    if (!token) {
      return Response.json(
        { error: "Falta configurar APP_SESSION_SECRET en el servidor (Vercel → Environment Variables)." },
        { status: 500 },
      );
    }
    // Se limpia cualquier sesión anterior: mientras no termines el segundo paso, no hay sesión.
    return jsonConCookies({ paso: estado.mfa.activo ? "codigo" : "configurar" }, [cookieMfa(token, req), borrarCookieSesion(req)]);
  } catch (e) {
    if (e instanceof MigracionPendienteError) return Response.json({ error: e.message }, { status: 500 });
    return Response.json({ error: "Error del servidor. Intenta de nuevo." }, { status: 500 });
  }
}

/** Logout: borra la sesión (y cualquier verificación a medias). */
export async function DELETE(req: Request): Promise<Response> {
  return jsonConCookies({ ok: true }, [borrarCookieSesion(req), borrarCookieMfa(req)]);
}
