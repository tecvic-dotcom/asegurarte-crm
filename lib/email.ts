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

export async function notificarNuevoLead(lead: Lead): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: DESDE,
      to: CONTENIDO.contacto.correo,
      subject: `Nuevo prospecto: ${lead.nombre}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px;">
          <h2 style="color:#2a22f5;">Tienes un prospecto nuevo 🎉</h2>
          <p><strong>Nombre:</strong> ${lead.nombre}</p>
          <p><strong>Correo:</strong> ${lead.correo}</p>
          <p><strong>WhatsApp:</strong> <a href="https://wa.me/52${lead.whatsapp}">${lead.whatsapp}</a></p>
          <p><strong>Origen:</strong> ${lead.origen}${lead.utm_source ? ` (${lead.utm_source})` : ""}</p>
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
