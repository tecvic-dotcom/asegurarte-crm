/**
 * Reglas de Sofi, tu empleada digital de seguimiento a prospectos (puras:
 * cliente y servidor, sin IA y sin costo).
 *
 * Analogía: la asistente que cada mañana te pone en el escritorio la lista de
 * prospectos a quienes ya toca escribirles, en orden, con el mensaje escrito.
 * Tú lo mandas; Sofi no envía nada sola.
 */
import { saludoPara } from "./cobranza-reglas";
import { diasEntre, fechaLocal } from "./fechas";
import type { EtapaId, Lead, Ramo } from "./types";

export type EtapaSeguimiento = Extract<EtapaId, "nuevo" | "cita" | "propuesta" | "stand_by">;

/** Cada cuántos días SIN contacto le toca seguimiento a un prospecto, según su etapa. */
export const DIAS_PARA_SEGUIR: Record<EtapaSeguimiento, number> = {
  nuevo: 0, // un prospecto nuevo se contacta el mismo día
  cita: 2,
  propuesta: 3,
  stand_by: 2, // ya decidió y solo falta información: no se enfría
};

/** Un prospecto nuevo al que ya le escribiste o llamaste vuelve a tocar a los 2 días sin contacto. */
const DIAS_NUEVO_YA_CONTACTADO = 2;

/** Desde cuántos días sin contacto ya es urgente. */
const DIAS_URGENTE: Record<EtapaSeguimiento, number> = { nuevo: 1, cita: 4, propuesta: 6, stand_by: 4 };

/** Qué tan cerca del dinero está cada etapa (pesa en el orden de la lista). */
const PESO_ETAPA: Record<EtapaSeguimiento, number> = { nuevo: 35, cita: 30, propuesta: 40, stand_by: 45 };

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
  /** Prospecto nuevo al que todavía nadie le ha escrito ni llamado. */
  sinContactar: boolean;
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
  return e === "nuevo" || e === "cita" || e === "propuesta" || e === "stand_by";
}

/**
 * ¿Alguien ya trabajó a este prospecto? Cada contacto que anotas (o cambio que haces) mueve «actualizado_en»;
 * si sigue igual a «creado_en» (con 10 segundos de margen), el prospecto está tal cual llegó, sin que nadie le haya escrito.
 */
function yaTrabajado(lead: Lead): boolean {
  return Date.parse(lead.actualizado_en) - Date.parse(lead.creado_en) > 10_000;
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
    const sinContactar = etapa === "nuevo" && !yaTrabajado(lead);
    const tocaDesde = etapa === "nuevo" && !sinContactar ? DIAS_NUEVO_YA_CONTACTADO : DIAS_PARA_SEGUIR[etapa];
    if (dias < tocaDesde) continue;
    const urgente = etapa === "nuevo" && !sinContactar ? DIAS_URGENTE.cita : DIAS_URGENTE[etapa];
    const urgencia: Urgencia = dias >= urgente ? "alta" : "media";
    const ultimoIntento = etapa === "propuesta" && dias >= DIAS_ULTIMO_INTENTO;
    const motivo =
      sinContactar
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
      sinContactar,
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
  const nuevosSinContacto = lista.filter((p) => p.sinContactar).length;
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

// ----------------------------------------------------------------------------
// Mensajes de WhatsApp (los envías TÚ; Sofi solo los deja listos). Se pueden personalizar, igual que los de Valeri.
// ----------------------------------------------------------------------------

/** Las situaciones que tienen su propio mensaje: una por etapa, y "último intento" para la propuesta que lleva mucho sin respuesta. */
export type MotivoSeguimiento = EtapaSeguimiento | "ultimo_intento";

/** Texto base de cada situación (el que Sofi usa mientras no escribas el tuyo). Suena a Roberto, no a robot. */
export const PLANTILLAS_SEGUIMIENTO: Record<MotivoSeguimiento, string> = {
  nuevo:
    "{saludo}, soy Roberto Rodríguez de Asegurarte 👋 Vi que pediste información de {seguro}. ¿Tienes 5 minutos hoy para platicarte las opciones? Sin compromiso.",
  cita: "{saludo}, ¿cómo vas? Quería confirmar nuestra cita para platicar de {seguro}. ¿Sigue en pie? Si necesitas moverla, dime qué día te acomoda.",
  propuesta:
    "{saludo}, ¿pudiste revisar la propuesta de {seguro} que te envié? Si quieres, te explico cualquier parte o ajustamos la cobertura al presupuesto que traes.",
  stand_by:
    "{saludo}, ¿cómo estás? Ya casi tenemos listo {seguro}. Para poder cerrarlo solo me falta la información que quedamos; ¿me la puedes mandar hoy? Así lo dejamos protegido cuanto antes.",
  ultimo_intento:
    "{saludo}, no quiero ser insistente: hace unos días te envié la propuesta de {seguro}. ¿Sigues interesado o prefieres que lo dejemos para más adelante? Cualquiera de las dos respuestas me sirve.",
};

export const MOTIVOS_SEGUIMIENTO: { id: MotivoSeguimiento; nombre: string; cuando: string }[] = [
  { id: "nuevo", nombre: "Prospecto nuevo", cuando: "Acaba de entrar y aún no lo contactas (o ya lo contactaste y lleva 2 días sin respuesta)" },
  { id: "cita", nombre: "Con cita", cuando: "Tiene cita agendada y lleva 2 días sin contacto" },
  { id: "propuesta", nombre: "Propuesta enviada", cuando: "Le mandaste la propuesta y lleva 3 días sin respuesta" },
  { id: "stand_by", nombre: "Stand by", cuando: "Ya decidió y solo falta información; lleva 2 días sin contacto" },
  { id: "ultimo_intento", nombre: "Último intento", cuando: `La propuesta lleva ${DIAS_ULTIMO_INTENTO} días o más sin respuesta` },
];

/** Lo que puedes poner entre llaves en tu mensaje, y qué se escribe en su lugar. */
export const VARIABLES_SEGUIMIENTO: { clave: string; ejemplo: string; descripcion: string }[] = [
  { clave: "saludo", ejemplo: "Hola Myrna", descripcion: "Saludo con el nombre del prospecto" },
  { clave: "nombre", ejemplo: "Myrna", descripcion: "Solo el nombre de pila" },
  { clave: "seguro", ejemplo: "tu seguro de vida", descripcion: "Qué seguro le interesa, según el ramo del prospecto (si no lo has definido, dice «tu seguro»)" },
];

const CLAVES_VALIDAS = new Set(VARIABLES_SEGUIMIENTO.map((v) => v.clave));

/** Variables entre llaves que no existen (para avisar en vez de mandarlas tal cual al prospecto). */
export function variablesDesconocidasSeguimiento(texto: string): string[] {
  return [...new Set([...texto.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]).filter((c) => !CLAVES_VALIDAS.has(c)))];
}

export type ResultadoMensajeSeguimiento = { ok: true; texto: string } | { ok: false; error: string };

export function validarMensajeSeguimiento(entrada: unknown): ResultadoMensajeSeguimiento {
  const texto = typeof entrada === "string" ? entrada.trim() : "";
  if (texto.length < 10) return { ok: false, error: "Escribe un mensaje de al menos 10 letras." };
  if (texto.length > 1000) return { ok: false, error: "El mensaje es muy largo (máximo 1,000 letras)." };
  const raras = variablesDesconocidasSeguimiento(texto);
  if (raras.length) {
    return { ok: false, error: `No conozco ${raras.map((r) => `{${r}}`).join(", ")}. Usa solo: ${VARIABLES_SEGUIMIENTO.map((v) => `{${v.clave}}`).join(" ")}.` };
  }
  return { ok: true, texto };
}

/** Rellena una plantilla con los datos del prospecto (el saludo cuida mayúsculas y razones sociales, igual que Valeri). */
export function rellenarSeguimiento(plantilla: string, lead: Pick<Lead, "nombre" | "ramo">): string {
  const saludo = saludoPara(lead.nombre);
  const valores: Record<string, string> = {
    saludo,
    nombre: saludo.replace(/^Hola,? /, ""),
    seguro: lead.ramo ? SEGURO[lead.ramo] : "tu seguro",
  };
  return plantilla
    .replace(/\{([^{}]*)\}/g, (todo, clave: string) => (clave in valores ? valores[clave] : todo))
    .replace(/\s+([,.:;!?])/g, "$1")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** La situación de un pendiente: su etapa, o "último intento" si la propuesta lleva mucho sin respuesta. */
export function motivoDe(p: Pick<PendienteSeguimiento, "etapa" | "ultimoIntento">): MotivoSeguimiento {
  return p.etapa === "propuesta" && p.ultimoIntento ? "ultimo_intento" : p.etapa;
}

/** El WhatsApp listo para mandar: tu texto si lo personalizaste; si no, el base. */
export function mensajeSeguimiento(p: PendienteSeguimiento, personalizadas: Partial<Record<MotivoSeguimiento, string>> = {}): string {
  const motivo = motivoDe(p);
  return rellenarSeguimiento(personalizadas[motivo] || PLANTILLAS_SEGUIMIENTO[motivo], p.lead);
}
