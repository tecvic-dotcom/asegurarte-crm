import "server-only";
import { Resend } from "resend";
import { CONTENIDO } from "./landing-content";
import type { Lead } from "./types";

/**
 * Aviso por correo cada vez que llega un lead nuevo. Usa Resend (server-only,
 * requiere RESEND_API_KEY). Si no está configurada, no hace nada — el lead se
 * guarda igual, solo no manda el correo (falla silencioso, nunca bloquea el
 * formulario del cliente).
 */
const DESDE = process.env.RESEND_FROM || "Asegurarte <onboarding@resend.dev>";

/** Lo que viene de la red (nombre, correo…) se escapa antes de ponerlo en el HTML del correo. */
const esc = (t: string): string => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export async function notificarNuevoLead(lead: Lead, opciones: { pendienteAgendado?: boolean; resumen?: string } = {}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: DESDE,
      to: CONTENIDO.contacto.correo,
      subject: `Nuevo prospecto: ${lead.nombre.replace(/[\r\n]+/g, " ")}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px;">
          <h2 style="color:#2a22f5;">Tienes un prospecto nuevo 🎉</h2>
          <p><strong>Nombre:</strong> ${esc(lead.nombre)}</p>
          ${lead.correo ? `<p><strong>Correo:</strong> ${esc(lead.correo)}</p>` : ""}
          <p><strong>WhatsApp:</strong> <a href="https://wa.me/52${encodeURIComponent(lead.whatsapp)}">${esc(lead.whatsapp)}</a></p>
          <p><strong>Origen:</strong> ${esc(lead.origen)}${lead.utm_source ? ` (${esc(lead.utm_source)})` : ""}</p>
          ${opciones.resumen ? `<p><strong>Pidió:</strong> ${esc(opciones.resumen)}</p>` : ""}
          ${opciones.pendienteAgendado ? `<p>Ya te dejé un pendiente para hoy en «Mis pendientes».</p>` : ""}
          <p style="margin-top:24px;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/crm"
               style="background:#2a22f5;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;">
              Verlo en mi CRM
            </a>
          </p>
        </div>
      `,
    });
  } catch {
    // No tiramos el flujo de captura si falla el correo — el lead ya está guardado.
  }
}
