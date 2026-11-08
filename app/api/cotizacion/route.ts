import { crearLeadCotizacion, getLead } from "@/lib/db";
import { notificarNuevoLead } from "@/lib/email";
import { agendarSeguimientoNuevoLead } from "@/lib/seguimiento-nuevo-lead";
import { rateLimit, ipDe } from "@/lib/rate-limit";
import { normWhatsapp } from "@/lib/normalize";
import { evaluarAntispam, leerSolicitud, prepararSolicitud, textoParaQuien, textoTipoSeguro, validarSolicitud } from "@/lib/captacion-cotizacion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Un doble toque o un reintento no se procesa dos veces: mientras una solicitud del mismo WhatsApp está en curso o se aceptó hace menos de
 * 20 s, la segunda se responde «recibida» sin repetir nada. Si la primera FALLA, se suelta la marca para que el reintento sí cuente.
 * (En memoria y por instancia: la barrera de fondo contra duplicados es la búsqueda por WhatsApp/correo al guardar.)
 */
const recientes = new Map<string, number>();
function tomar(clave: string, ms: number): boolean {
  const ahora = Date.now();
  for (const [k, hasta] of recientes) if (hasta <= ahora) recientes.delete(k);
  if ((recientes.get(clave) ?? 0) > ahora) return false;
  recientes.set(clave, ahora + ms);
  return true;
}

/** Adivina el dispositivo desde el user-agent (para el CRM). */
function dispositivo(ua: string): string {
  if (/mobile|iphone|ipod|android.*mobile/i.test(ua)) return "Móvil";
  if (/ipad|tablet|android/i.test(ua)) return "Tablet";
  return "Escritorio";
}

function safeDecode(v: string | null): string | null {
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/**
 * Recibe la solicitud del formulario «Cotiza tu seguro» y la convierte en un prospecto NUEVO (origen «Sitio web»).
 *
 *   formulario → esta ruta → crearLeadCotizacion (Supabase: crea o identifica al prospecto)
 *             → pendiente de hoy + correo a Roberto → Prospectos y Embudo de ventas (etapa «Nuevo»)
 *
 * Capas de defensa, en este orden: mismo sitio · límite por IP · tamaño · señuelo anti-bot (finge éxito) · validación completa
 * en el servidor · tiempo mínimo · un solo envío por WhatsApp cada 20 s. Respuestas: 200 {ok:true} · 422 {ok:false, errores | mensaje} ·
 * 429 {ok:false, mensaje} · 500. NUNCA dice si la persona ya existía (no se le regala a nadie la lista de contactos del CRM).
 */
export async function POST(req: Request): Promise<Response> {
  // 1 · Solo desde tu propio sitio
  const origen = req.headers.get("origin");
  if (origen) {
    try {
      const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
      if (new URL(origen).host !== host) return Response.json({ ok: false, mensaje: "Petición no permitida." }, { status: 403 });
    } catch {
      return Response.json({ ok: false, mensaje: "Petición no permitida." }, { status: 403 });
    }
  }

  // 2 · Límite por IP
  if (!rateLimit(`cotizacion:${ipDe(req)}`, 6, 60_000)) {
    return Response.json({ ok: false, mensaje: "Recibimos muchas solicitudes desde tu conexión. Espera un minuto e inténtalo otra vez.", reintentarEnSegundos: 60 }, { status: 429 });
  }

  // 3 · Tamaño y formato
  let cuerpo: unknown;
  try {
    const texto = await req.text();
    if (texto.length > 4000) return Response.json({ ok: false, mensaje: "Petición inválida." }, { status: 400 });
    cuerpo = JSON.parse(texto);
  } catch {
    return Response.json({ ok: false, mensaje: "Petición inválida." }, { status: 400 });
  }
  const solicitud = prepararSolicitud(leerSolicitud(cuerpo));

  // 4 · Señuelo: un bot lo llena. Se finge éxito y no se guarda nada.
  if (evaluarAntispam(solicitud) === "bot") return Response.json({ ok: true });

  // 5 · Validación completa (el navegador pudo ser saltado)
  const validacion = validarSolicitud(solicitud);
  if (!validacion.ok) return Response.json({ ok: false, errores: validacion.errores }, { status: 422 });

  // 6 · Demasiado rápido para ser una persona (el navegador pide revisar y reenviar)
  if (evaluarAntispam(solicitud) === "rapido") {
    return Response.json({ ok: false, mensaje: "Un momento: revisa tus datos con calma y vuelve a enviar." }, { status: 422 });
  }

  // 7 · Un doble toque o un reintento no se procesa dos veces (mismo WhatsApp en menos de 20 s): se responde «recibida» sin repetir nada
  const marca = `wa:${normWhatsapp(solicitud.whatsapp)}`;
  if (!tomar(marca, 20_000)) return Response.json({ ok: true });

  // 8 · Guardar: crea o identifica al prospecto
  const h = req.headers;
  const geo = {
    pais: h.get("x-vercel-ip-country"),
    ciudad: safeDecode(h.get("x-vercel-ip-city")),
    region: h.get("x-vercel-ip-country-region"),
    dispositivo: dispositivo(h.get("user-agent") ?? ""),
  };
  try {
    const r = await crearLeadCotizacion(solicitud, geo);
    if (!r.ok && r.errores) {
      recientes.delete(marca);
      return Response.json({ ok: false, errores: r.errores }, { status: 422 });
    }
    if (r.ok && r.id) {
      // Avisos: se esperan (en Vercel la función puede cortarse al responder) y cada uno falla en silencio sin tocar al prospecto ya guardado.
      const lead = await getLead(r.id);
      if (lead) {
        if (r.duplicado) {
          await agendarSeguimientoNuevoLead(lead, { repetido: true }); // ya estaba en el CRM y volvió a pedir cotización
        } else {
          const pendienteAgendado = await agendarSeguimientoNuevoLead(lead);
          await notificarNuevoLead(lead, { pendienteAgendado, resumen: `${textoTipoSeguro(solicitud.tipoSeguro)} · ${textoParaQuien(solicitud.paraQuien)}` });
        }
      }
    }
    return Response.json({ ok: true });
  } catch (e) {
    recientes.delete(marca);
    console.error("[api/cotizacion]", e instanceof Error ? e.message : e);
    return Response.json({ ok: false, mensaje: "No pudimos guardar tu solicitud en este momento. Intenta de nuevo en unos minutos." }, { status: 500 });
  }
}
