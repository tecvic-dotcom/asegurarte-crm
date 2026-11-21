/**
 * Serie de 5 correos a los lectores que pidieron la guía gratuita (/guia-ia). Texto APROBADO por Roberto el 2026-11-21
 * (fuente: proyectos/guia-ia-lectores/secuencia-correos.md) y aviso de privacidad de la guía aprobado por el abogado ese mismo día.
 * Precio, bonos y garantía salen de /libro (lib/libro.ts): si cambian allá, cambiar aquí.
 * Sin promesas de ventas ni urgencia falsa. «{nombre}» se reemplaza por el primer nombre.
 */
import { PRECIO, PRECIO_NOTA } from "./libro";

export type Bloque = string | { lista: string[] };

export interface CorreoSerie {
  /** Días después de pedir la guía (fecha de Monterrey). */
  dia: number;
  asunto: string;
  bloques: Bloque[];
  boton?: string;
}

export const SERIE_LECTORES: CorreoSerie[] = [
  {
    dia: 2,
    asunto: "¿Ya probaste el primer prompt?",
    bloques: [
      "Hace un par de días te mandé la guía. Si todavía no la abres, no pasa nada: casi nadie la lee el mismo día.",
      "Te propongo algo muy concreto para hoy. Abre la página 5, copia el prompt del recordatorio de renovación, cambia lo que está en amarillo y mándalo a la IA. Son diez minutos.",
      "Si lo que te contesta no te convence, no empieces de cero. Escríbele «más corto», «más cálido» o «quita la segunda línea». Corrígela como corregirías a un asistente nuevo en su primer día.",
      "Cuéntame cómo te fue. Respondes a este correo y me llega directo.",
    ],
  },
  {
    dia: 4,
    asunto: "Lo que el chat no te dice",
    bloques: [
      "Si ya probaste alguno de los prompts, seguro notaste algo: cada vez que abres el chat, empiezas de cero. Tienes que volver a explicarle quién eres, qué vendes y cómo hablas.",
      "Es como contratar a un asistente que cada mañana olvida todo lo de ayer.",
      "En el libro resolvemos eso con lo que llamo **el expediente de tu asistente**. Funciona igual que la carátula de una póliza: en una hoja quedan tus datos, tus ramos, tu forma de escribir y tus reglas («nunca prometas rendimientos», «pregúntame antes de un trabajo grande»). Tu asistente la lee sola cada vez que empiezas, y ya no le explicas nada.",
      "Lo armamos juntos, paso a paso, en el capítulo 3.",
    ],
    boton: "Ver qué incluye el libro",
  },
  {
    dia: 6,
    asunto: "El seguimiento que se te olvida",
    bloques: [
      "Una pregunta incómoda: ¿cuántas cotizaciones mandaste el mes pasado a las que nunca les diste seguimiento?",
      "No es falta de ganas. Es que el seguimiento no tiene fecha en la agenda, y lo que no tiene fecha se pierde entre las citas y la cobranza.",
      "La actividad 2 de la guía te da los mensajes. El libro te enseña a ir un paso más allá: que tu asistente trabaje dentro de Visual Studio Code, con tus propias carpetas, y te ayude a llevar tus renovaciones, tu cobranza y tus pendientes en un solo lugar. Todo con datos inventados mientras practicas, y con un capítulo completo sobre cómo cuidar los datos reales de tus clientes.",
      "No necesitas saber programar. El libro está escrito para agentes que no se llevan bien con la tecnología.",
    ],
    boton: "Conocer el libro",
  },
  {
    dia: 8,
    asunto: "«Es que yo no soy de tecnología»",
    bloques: [
      "Es lo que más me dicen los agentes cuando les hablo del libro. Te respondo las tres dudas que más escucho:",
      "**«No soy de tecnología.»** El libro está pensado justo para eso. Son siete escalones, con imágenes paso a paso, y te voy diciendo dónde hacer clic desde el primer capítulo.",
      "**«No tengo tiempo.»** El plan del capítulo 7 es de quince minutos diarios. Lo que buscas es quitarte trabajo de encima, no sumar otro.",
      "**«¿Y si no me sirve?»** Tienes 7 días naturales desde tu compra para pedir el reembolso en Hotmart, sin explicar por qué.",
      "Si tienes otra duda, respóndeme. Las leo todas.",
    ],
    boton: "Ver el libro y la garantía",
  },
  {
    dia: 10,
    asunto: "Último correo de esta serie",
    bloques: [
      "Este es el último correo de la serie que empezó con la guía. Te dejo en un solo lugar lo que trae el libro, por si te sirve para decidir:",
      {
        lista: [
          "**«De la Agenda al Algoritmo»**, en PDF: siete escalones para armar tu oficina digital con inteligencia artificial, sin programar.",
          "**Bono 1:** «Mi primera oficina inteligente con IA».",
          "**Bono 2:** 100 prompts de seguros para redes sociales.",
          `Precio: **${PRECIO} ${PRECIO_NOTA}**, pago único en Hotmart.`,
          "Garantía de 7 días naturales.",
        ],
      },
      "Si no es tu momento, no te preocupes: la guía es tuya y puedes seguir usándola. De vez en cuando te escribiré si hay algo nuevo que valga la pena.",
    ],
    boton: "Quiero el libro",
  },
];

/** Línea final antes de la firma (solo el último correo la lleva). */
export const DESPEDIDA_ULTIMO = "Gracias por leerme estos días.";

/**
 * ¿Qué correo de la serie le toca hoy? Devuelve el número (1–5) o null.
 * `paso` = último correo enviado (0 = solo la bienvenida). `dias` = días desde que pidió la guía (fechas de Monterrey).
 * Nunca se salta correos: si una corrida falló, manda el siguiente pendiente (uno por día como máximo; lo cuida proximo_envio).
 */
export function correoQueToca(paso: number, dias: number): number | null {
  const n = paso + 1;
  const c = SERIE_LECTORES[n - 1];
  if (!c) return null;
  return dias >= c.dia ? n : null;
}
