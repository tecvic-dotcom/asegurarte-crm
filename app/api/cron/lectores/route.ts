import { timingSafeEqual } from "node:crypto";
import { apartarCorreoSerie, lectoresParaSerie, liberarCorreoSerie } from "@/lib/lectores";
import { enviarCorreoSerie } from "@/lib/email-lectores";
import { correoQueToca, SERIE_LECTORES } from "@/lib/secuencia-lectores";
import { diasEntre, fechaLocal, hoyLocal } from "@/lib/fechas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Tope por corrida: cuida el límite diario de Resend y el tiempo de la función. */
const MAX_POR_CORRIDA = 60;
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

function autorizado(req: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false; // sin secreto configurado, no corre (falla cerrado)
  const recibido = Buffer.from(req.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${secreto}`);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

/**
 * Tarea diaria de Vercel (vercel.json → 15:00 UTC = 9:00 h de Monterrey): manda a cada lector activo el correo de la serie que le toca
 * (días 2, 4, 6, 8 y 10 después de pedir la guía). Uno por persona por corrida; quien se dio de baja o ya compró no recibe nada.
 * Protegida con CRON_SECRET (Vercel lo manda como «Authorization: Bearer …»).
 */
export async function GET(req: Request): Promise<Response> {
  if (!autorizado(req)) return Response.json({ error: "No autorizado" }, { status: 401 });
  const hoy = hoyLocal();
  const resumen = { revisados: 0, enviados: 0, fallidos: 0, porCorreo: {} as Record<string, number> };
  try {
    const lista = await lectoresParaSerie(SERIE_LECTORES.length, MAX_POR_CORRIDA);
    for (const l of lista) {
      resumen.revisados++;
      const n = correoQueToca(l.paso, diasEntre(fechaLocal(l.creado_en), hoy));
      if (!n) continue;
      if (!(await apartarCorreoSerie(l.id, n))) continue;
      const ok = await enviarCorreoSerie(l, n);
      if (ok) {
        resumen.enviados++;
        resumen.porCorreo[`correo-${n}`] = (resumen.porCorreo[`correo-${n}`] ?? 0) + 1;
      } else {
        resumen.fallidos++;
        await liberarCorreoSerie(l.id, n);
      }
      await esperar(600); // Resend permite pocas peticiones por segundo
    }
    console.log("[cron/lectores]", JSON.stringify(resumen));
    return Response.json({ ok: true, ...resumen });
  } catch (e) {
    console.error("[cron/lectores]", e instanceof Error ? e.message : e);
    return Response.json({ ok: false, ...resumen }, { status: 500 });
  }
}
