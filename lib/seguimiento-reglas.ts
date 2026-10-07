/**
 * Reglas de Sofi, tu empleada digital de seguimiento a prospectos (puras:
 * cliente y servidor, sin IA y sin costo).
 *
 * Analogía: la asistente que cada mañana te pone en el escritorio la lista de
 * prospectos a quienes ya toca escribirles, en orden, con el mensaje escrito.
 * Tú lo mandas; Sofi no envía nada sola.
 */
import { diasEntre, fechaLocal } from "./fechas";
import type { EtapaId, Lead, Ramo } from "./types";

export type EtapaSeguimiento = Extract<EtapaId, "nuevo" | "contactado" | "cita" | "propuesta">;

/** Cada cuántos días SIN contacto le toca seguimiento a un prospecto, según su etapa. */
export const DIAS_PARA_SEGUIR: Record<EtapaSeguimiento, number> = {
  nuevo: 0, // un prospecto nuevo se contacta el mismo día
  contactado: 2,
  cita: 2,
  propuesta: 3,
};

/** Desde cuántos días sin contacto ya es urgente. */
const DIAS_URGENTE: Record<EtapaSeguimiento, number> = { nuevo: 1, contactado: 4, cita: 4, propuesta: 6 };

/** Qué tan cerca del dinero está cada etapa (pesa en el orden de la lista). */
const PESO_ETAPA: Record<EtapaSeguimiento, number> = { nuevo: 35, contactado: 20, cita: 30, propuesta: 40 };

/** Pasados estos días en propuesta, el mensaje cambia a "último intento". */
export const DIAS_ULTIMO_INTENTO = 14;

export type Urgencia = "alta" | "media";

export interface PendienteSeguimiento {
  lead: Lead;
  etapa: EtapaSeguimiento;
  /** Días desde el último movimiento del prospecto. */
  dias: number;
  urgencia: Urgencia;
  prioridad: number;
  /** Frase corta de por qué le toca hoy. */
  motivo: string;
  ultimoIntento: boolean;
}

export interface ResumenSeguimiento {
  /** Prospectos activos en total. */
  activos: number;
  /** A los que les toca seguimiento hoy. */
  porContactar: number;
  urgentes: number;
  nuevosSinContacto: number;
  sinWhatsapp: number;
  alCorriente: number;
  frase: string;
}

function esEtapaSeguimiento(e: EtapaId): e is EtapaSeguimiento {
  return e === "nuevo" || e === "contactado" || e === "cita" || e === "propuesta";
}

function plural(n: number, uno: string, varios: string): string {
  return n === 1 ? uno : varios;
}

/** Los 10 dígitos del WhatsApp mexicano, o null si el número no sirve. */
export function whatsappDe(lead: Lead): string | null {
  const d = lead.whatsapp.replace(/\D/g, "");
  const diez = d.length === 12 && d.startsWith("52") ? d.slice(2) : d;
  return diez.length === 10 ? diez : null;
}

export function ligaWhatsAppLead(lead: Lead, texto: string): string | null {
  const n = whatsappDe(lead);
  return n ? `https://wa.me/52${n}?text=${encodeURIComponent(texto)}` : null;
}

/** A quién le toca hoy, en orden: primero lo más urgente y lo más cercano al cierre. */
export function listaDeSeguimiento(leads: Lead[], hoy: string): PendienteSeguimiento[] {
  const salida: PendienteSeguimiento[] = [];
  for (const lead of leads) {
    if (!esEtapaSeguimiento(lead.etapa)) continue;
    const etapa = lead.etapa;
    const dias = Math.max(0, diasEntre(fechaLocal(lead.actualizado_en), hoy));
    if (dias < DIAS_PARA_SEGUIR[etapa]) continue;
    const urgencia: Urgencia = dias >= DIAS_URGENTE[etapa] ? "alta" : "media";
    const ultimoIntento = etapa === "propuesta" && dias >= DIAS_ULTIMO_INTENTO;
    const motivo =
      etapa === "nuevo"
        ? dias === 0
          ? "Prospecto nuevo de hoy: contáctalo en la primera hora"
          : `Sigue sin contacto desde hace ${dias} ${plural(dias, "día", "días")}`
        : ultimoIntento
          ? `Propuesta sin respuesta hace ${dias} días: último intento`
          : `${dias} ${plural(dias, "día", "días")} sin contacto`;
    salida.push({
      lead,
      etapa,
      dias,
      urgencia,
      ultimoIntento,
      motivo,
      prioridad: PESO_ETAPA[etapa] + Math.min(dias, 20) * 2 + Math.min(lead.valor / 5000, 10),
    });
  }
  return salida.sort((a, b) => b.prioridad - a.prioridad);
}

export function resumenSeguimiento(leads: Lead[], hoy: string): ResumenSeguimiento {
  const activos = leads.filter((l) => esEtapaSeguimiento(l.etapa));
  const lista = listaDeSeguimiento(leads, hoy);
  const urgentes = lista.filter((p) => p.urgencia === "alta").length;
  const nuevosSinContacto = lista.filter((p) => p.etapa === "nuevo").length;
  const sinWhatsapp = lista.filter((p) => !whatsappDe(p.lead)).length;
  let frase: string;
  if (!activos.length) {
    frase = "Aún no hay prospectos activos: cuando entren, cada mañana te digo a quién escribirle.";
  } else if (!lista.length) {
    frase = "Todo al corriente: a nadie le toca seguimiento hoy. 🎉";
  } else {
    const partes = [`${lista.length} ${plural(lista.length, "prospecto espera", "prospectos esperan")} tu seguimiento`];
    if (nuevosSinContacto) partes.push(`${nuevosSinContacto} ${plural(nuevosSinContacto, "nuevo sin contactar", "nuevos sin contactar")}`);
    if (urgentes) partes.push(`${urgentes} ${plural(urgentes, "urgente", "urgentes")}`);
    frase = `Hoy: ${partes.join(" · ")}.`;
    if (sinWhatsapp) frase += ` Faltan WhatsApp en ${sinWhatsapp}.`;
  }
  return { activos: activos.length, porContactar: lista.length, urgentes, nuevosSinContacto, sinWhatsapp, alCorriente: activos.length - lista.length, frase };
}

const SEGURO: Record<Ramo, string> = {
  vida: "tu seguro de vida",
  gmm: "tu seguro de gastos médicos",
  ahorro: "tu plan de ahorro",
  autos: "tu seguro de auto",
  hogar: "tu seguro de hogar",
};

/** El WhatsApp listo para mandar, según la etapa del prospecto. Suena a Roberto, no a robot. */
export function mensajeSeguimiento(p: PendienteSeguimiento): string {
  const nombre = p.lead.nombre.trim().split(/\s+/)[0] || "";
  const hola = nombre ? `Hola ${nombre}` : "Hola";
  const seguro = p.lead.ramo ? SEGURO[p.lead.ramo] : "tu seguro";
  switch (p.etapa) {
    case "nuevo":
      return `${hola}, soy Roberto Rodríguez de Asegurarte 👋 Vi que pediste información de ${seguro}. ¿Tienes 5 minutos hoy para platicarte las opciones? Sin compromiso.`;
    case "contactado":
      return `${hola}, ¿cómo estás? Te escribo para dar seguimiento a lo que platicamos de ${seguro}. ¿Pudiste pensarlo o te surgió alguna duda? Con gusto la resolvemos.`;
    case "cita":
      return `${hola}, ¿cómo vas? Quería confirmar nuestra cita para platicar de ${seguro}. ¿Sigue en pie? Si necesitas moverla, dime qué día te acomoda.`;
    case "propuesta":
      return p.ultimoIntento
        ? `${hola}, no quiero ser insistente: hace unos días te envié la propuesta de ${seguro}. ¿Sigues interesado o prefieres que lo dejemos para más adelante? Cualquiera de las dos respuestas me sirve.`
        : `${hola}, ¿pudiste revisar la propuesta de ${seguro} que te envié? Si quieres, te explico cualquier parte o ajustamos la cobertura al presupuesto que traes.`;
  }
}
