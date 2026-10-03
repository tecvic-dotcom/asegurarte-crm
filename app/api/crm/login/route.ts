import { loginUsuario } from "@/lib/db";
import { firmarSesion, COOKIE_SESION, SESION_MAX_AGE } from "@/lib/auth";
import { rateLimit, ipDe } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function esSeguro(req: Request): boolean {
  return req.headers.get("x-forwarded-proto") === "https" || new URL(req.url).protocol === "https:";
}

function cookieSesion(token: string, req: Request): string {
  const secure = esSeguro(req) ? " Secure;" : "";
  return `${COOKIE_SESION}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESION_MAX_AGE};${secure}`;
}

/** Login del equipo del CRM. Devuelve la sesión y fija la cookie firmada. */
export async function POST(req: Request): Promise<Response> {
  const ip = ipDe(req);
  if (!rateLimit(`login:${ip}`, 10, 60_000)) {
    return Response.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  }

  let correo = "";
  let password = "";
  try {
    const b = (await req.json()) as { correo?: string; password?: string };
    correo = (b.correo ?? "").trim();
    password = b.password ?? "";
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }
  if (!correo || !password) {
    return Response.json({ error: "Escribe tu correo y tu contraseña." }, { status: 400 });
  }

  try {
    const u = await loginUsuario(correo, password);
    if (!u) return Response.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });

    const sesion = { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol };
    const token = firmarSesion(sesion);
    if (!token) {
      return Response.json(
        { error: "Falta configurar APP_SESSION_SECRET en el servidor (Vercel → Environment Variables)." },
        { status: 500 },
      );
    }
    return new Response(JSON.stringify({ sesion }), {
      status: 200,
      headers: { "content-type": "application/json", "set-cookie": cookieSesion(token, req) },
    });
  } catch {
    return Response.json({ error: "Error del servidor. Intenta de nuevo." }, { status: 500 });
  }
}

/** Logout: borra la cookie. */
export async function DELETE(req: Request): Promise<Response> {
  const secure = esSeguro(req) ? " Secure;" : "";
  const cookie = `${COOKIE_SESION}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0;${secure}`;
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json", "set-cookie": cookie },
  });
}
