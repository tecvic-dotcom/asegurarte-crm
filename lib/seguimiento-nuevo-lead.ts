import "server-only";

/**
 * Pendiente de seguimiento automático para un prospecto que llega solo desde la página.
 *
 * Cuando alguien envía un formulario público (captura, guía «Dinero Bajo Control»), el prospecto ya entra en
 * «Nuevo» y se avisa por correo (lib/email.ts). Esto agrega lo que faltaba: un pendiente para HOY en
 * «Mis pendientes» de Roberto («Contactar a …»), ligado al prospecto, para que no se enfríe.
 *
 * Reglas:
 *  - Nunca bloquea ni rompe el formulario del cliente: cualquier falla se registra y devuelve false.
 *  - Solo se llama con prospectos NUEVOS (si la persona ya existía, no se duplica el pendiente).
 *  - No toca el embudo, la etapa ni las notas del prospecto: solo inserta una fila en `pendientes`.
 */
import { listUsuarios } from "./db";
import { hoyLocal } from "./fechas";
import { crearPendiente } from "./pendientes";
import { MAX_TEXTO_PENDIENTE, validarPendiente } from "./pendientes-reglas";
import type { Lead } from "./types";

/** El pendiente es del administrador activo más antiguo (Roberto): es quien atiende los prospectos de la página. */
async function duenoDeLosPendientes(): Promise<string | null> {
  const usuarios = await listUsuarios();
  return usuarios.find((u) => u.rol === "admin" && u.activo)?.id ?? null;
}

/** «Contactar a María López (8112345678) · llegó por landing», recortado al máximo que acepta un pendiente. */
export function textoDeSeguimiento(lead: Pick<Lead, "nombre" | "whatsapp" | "origen">): string {
  const origen = lead.origen ? ` · llegó por ${lead.origen}` : "";
  const contacto = lead.whatsapp ? ` (${lead.whatsapp})` : "";
  const texto = `Contactar a ${lead.nombre}${contacto}${origen}`;
  return texto.length <= MAX_TEXTO_PENDIENTE ? texto : `${texto.slice(0, MAX_TEXTO_PENDIENTE - 1)}…`;
}

/** Crea el pendiente de hoy para el prospecto. true = quedó agendado. */
export async function agendarSeguimientoNuevoLead(lead: Lead): Promise<boolean> {
  try {
    const usuarioId = await duenoDeLosPendientes();
    if (!usuarioId) return false;
    const r = validarPendiente({ texto: textoDeSeguimiento(lead), fecha: "", hora: "", lead_id: lead.id }, hoyLocal());
    if (!r.ok) return false;
    await crearPendiente(usuarioId, r.datos);
    return true;
  } catch (e) {
    // El prospecto ya está guardado: si falla el pendiente (p. ej. aún no corre el SQL 0009), solo se anota en el log.
    console.error("[seguimiento-nuevo-lead]", e instanceof Error ? e.message : e);
    return false;
  }
}
