import "server-only";
import { Resend } from "resend";
import { CORREO_CONTACTO } from "./libro";
import { TITULO_GUIA_IA, URL_GUIA_IA } from "./lectores-reglas";
import { DESPEDIDA_ULTIMO, SERIE_LECTORES, type Bloque } from "./secuencia-lectores";
import type { Lector } from "./lectores";

/**
 * Correos a los LECTORES del libro (lista aparte de los prospectos de seguros).
 * Salen desde RESEND_FROM (dominio especialistaenasegurarte.lat verificado en Resend el 2026-11-21) y las respuestas
 * llegan al Outlook de Roberto (reply-to). Cada correo lleva liga de baja visible y cabecera List-Unsubscribe de un clic.
 * Si falta RESEND_API_KEY no hace nada (falla en silencio: el lector ya quedó guardado y descargó la guía en pantalla).
 */
const DESDE = process.env.RESEND_FROM || "Roberto Rodríguez <onboarding@resend.dev>";
const SITIO = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.especialistaenasegurarte.lat").replace(/\/$/, "");

const esc = (t: string): string => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export function ligaBaja(lector: Pick<Lector, "token_baja">): string {
  return `${SITIO}/guia-ia/baja?t=${encodeURIComponent(lector.token_baja)}`;
}

function cabecerasBaja(lector: Pick<Lector, "token_baja">): Record<string, string> {
  return {
    "List-Unsubscribe": `<${SITIO}/api/lectores/baja?t=${encodeURIComponent(lector.token_baja)}>, <mailto:${CORREO_CONTACTO}?subject=Baja>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/** Marco común de los correos a lectores: texto sencillo, sin imágenes pesadas, pie con la baja. */
function envolver(cuerpo: string, lector: Pick<Lector, "token_baja">): string {
  return `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f4f6ff;">
<div style="max-width:560px;margin:0 auto;padding:28px 22px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1a1d33;">
${cuerpo}
<hr style="border:0;border-top:1px solid #dde1f3;margin:30px 0 14px;">
<p style="font-size:12px;line-height:1.5;color:#5a607a;margin:0;">Recibes este correo porque pediste la guía gratuita en especialistaenasegurarte.lat. Si no quieres recibir más correos sobre el libro, <a href="${esc(ligaBaja(lector))}" style="color:#5a607a;">date de baja aquí</a>.</p>
</div></body></html>`;
}

/** Correo de bienvenida con la liga del PDF. Devuelve true si Resend lo aceptó. */
export async function enviarBienvenidaLector(lector: Lector): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const primer = esc(lector.nombre.split(/\s+/)[0] ?? "");
  const pdf = `${SITIO}${URL_GUIA_IA}`;
  const html = envolver(
    `<p style="margin:0 0 16px;">Hola${primer ? ` ${primer}` : ""}:</p>
<p style="margin:0 0 16px;">Aquí está la guía que pediste, «${esc(TITULO_GUIA_IA)}».</p>
<p style="margin:0 0 22px;"><a href="${esc(pdf)}" style="display:inline-block;background:#2a22f5;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px;">Descargar la guía (PDF)</a></p>
<p style="margin:0 0 16px;">Un consejo: no la leas toda hoy. Abre la página 5, copia el primer prompt (el del recordatorio de renovación), cambia lo que está en amarillo y pruébalo. En diez minutos vas a notar la diferencia entre pedir «hazme un mensaje» y pedir con la receta.</p>
<p style="margin:0 0 16px;">En los próximos días te voy a mandar algunos correos cortos con ideas para aplicarla. Si en algún momento no te sirven, te das de baja con un clic al final de cualquiera de ellos.</p>
<p style="margin:0 0 16px;">Y si te surge una duda, responde a este correo. Me llega directo.</p>
<p style="margin:0;">Roberto Rodríguez<br><span style="color:#5a607a;font-size:14px;">Autor de «De la Agenda al Algoritmo»</span></p>`,
    lector,
  );
  const texto = [
    `Hola${lector.nombre ? ` ${lector.nombre.split(/\s+/)[0]}` : ""}:`,
    "",
    `Aquí está la guía que pediste, «${TITULO_GUIA_IA}».`,
    `Descárgala aquí: ${pdf}`,
    "",
    "Un consejo: no la leas toda hoy. Abre la página 5, copia el primer prompt (el del recordatorio de renovación), cambia lo que está en amarillo y pruébalo.",
    "",
    "En los próximos días te voy a mandar algunos correos cortos con ideas para aplicarla. Si no te sirven, te das de baja con un clic.",
    "",
    "Si te surge una duda, responde a este correo. Me llega directo.",
    "",
    "Roberto Rodríguez",
    "Autor de «De la Agenda al Algoritmo»",
    "",
    `Para no recibir más correos sobre el libro: ${ligaBaja(lector)}`,
  ].join("\n");

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: DESDE,
      to: lector.correo,
      replyTo: CORREO_CONTACTO,
      subject: "Tu guía: 10 actividades que puedes delegar a la IA",
      html,
      text: texto,
      headers: cabecerasBaja(lector),
      tags: [{ name: "tipo", value: "bienvenida-guia-ia" }],
    });
    if (error) {
      console.error("[email-lectores] bienvenida:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email-lectores] bienvenida:", e instanceof Error ? e.message : e);
    return false;
  }
}


// ---- Serie de 5 correos (lib/secuencia-lectores.ts) ----

/** **negritas** → <strong> (después de escapar el texto). */
const negritasHtml = (t: string): string => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong style="color:#101536;">$1</strong>');
const sinMarcas = (t: string): string => t.replace(/\*\*(.+?)\*\*/g, "$1");

function bloqueHtml(b: Bloque): string {
  if (typeof b === "string") return `<p style="margin:0 0 16px;">${negritasHtml(b)}</p>`;
  return `<ul style="margin:0 0 16px;padding-left:22px;">${b.lista.map((i) => `<li style="margin:0 0 8px;">${negritasHtml(i)}</li>`).join("")}</ul>`;
}

function bloqueTexto(b: Bloque): string {
  return typeof b === "string" ? sinMarcas(b) : b.lista.map((i) => `- ${sinMarcas(i)}`).join("\n");
}

/** Liga a /libro con la marca del correo que la trajo (para saber qué correo vende). */
function ligaLibro(n: number): string {
  return `${SITIO}/libro?utm_source=correo&utm_medium=email&utm_campaign=serie-guia-ia&utm_content=correo-${n}`;
}

/** Manda el correo número `n` (1–5) de la serie. Devuelve true si Resend lo aceptó. */
export async function enviarCorreoSerie(lector: Lector, n: number): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const c = SERIE_LECTORES[n - 1];
  if (!apiKey || !c) return false;
  const primer = lector.nombre.split(/\s+/)[0] ?? "";
  const ultimo = n === SERIE_LECTORES.length;
  const liga = ligaLibro(n);

  const html = envolver(
    `<p style="margin:0 0 16px;">Hola${primer ? ` ${esc(primer)}` : ""}:</p>
${c.bloques.map(bloqueHtml).join("\n")}
${c.boton ? `<p style="margin:6px 0 22px;"><a href="${esc(liga)}" style="display:inline-block;background:#2a22f5;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px;">${esc(c.boton)}</a></p>` : ""}
${ultimo ? `<p style="margin:0 0 16px;">${esc(DESPEDIDA_ULTIMO)}</p>` : ""}
<p style="margin:0;">Roberto</p>`,
    lector,
  );
  const texto = [
    `Hola${primer ? ` ${primer}` : ""}:`,
    "",
    ...c.bloques.flatMap((b) => [bloqueTexto(b), ""]),
    ...(c.boton ? [`${c.boton}: ${liga}`, ""] : []),
    ...(ultimo ? [DESPEDIDA_ULTIMO, ""] : []),
    "Roberto",
    "",
    `Para no recibir más correos sobre el libro: ${ligaBaja(lector)}`,
  ].join("\n");

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: DESDE,
      to: lector.correo,
      replyTo: CORREO_CONTACTO,
      subject: c.asunto,
      html,
      text: texto,
      headers: cabecerasBaja(lector),
      tags: [{ name: "tipo", value: `serie-guia-ia-${n}` }],
    });
    if (error) {
      console.error(`[email-lectores] correo ${n}:`, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[email-lectores] correo ${n}:`, e instanceof Error ? e.message : e);
    return false;
  }
}
