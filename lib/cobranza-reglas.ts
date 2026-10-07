/**
 * Reglas de cobranza de Valeri — puras (cliente y servidor), sin IA y sin costo.
 *
 * Analogía: la libreta del cobrador de antes, pero que se ordena sola cada
 * mañana: primero el que más debe y desde hace más tiempo, luego el que vence
 * pronto, y al final a quién toca recordarle su renovación.
 */
import { moneda } from "./crm-data";
import { diasEntre, esFechaValida, fechaLarga, fechaLocal, sumarMeses } from "./fechas";
import { normCorreo, normWhatsapp } from "./normalize";
import { esRamo } from "./ramos";
import type { DatosPoliza, EstadoCobro, FormaPago, Poliza, Ramo, ResumenCobranza } from "./types";

/** Días antes de la fecha límite en que Valeri empieza a avisarte. */
export const DIAS_AVISO = 15;
/** Días antes de la renovación en que Valeri te sugiere llamar. */
export const DIAS_RENOVACION = 30;

export const FORMAS_PAGO: { id: FormaPago; nombre: string; meses: number }[] = [
  { id: "anual", nombre: "Anual", meses: 12 },
  { id: "semestral", nombre: "Semestral", meses: 6 },
  { id: "trimestral", nombre: "Trimestral", meses: 3 },
  { id: "mensual", nombre: "Mensual", meses: 1 },
];

/** Al marcar "Pagó", el siguiente recibo vence un periodo después. */
export function siguienteFechaPago(fecha: string, forma: FormaPago): string {
  const meses = FORMAS_PAGO.find((f) => f.id === forma)?.meses ?? 12;
  return sumarMeses(fecha, meses);
}

// ----------------------------------------------------------------------------
// Estado de cada póliza
// ----------------------------------------------------------------------------

export function estadoDe(p: Poliza, hoy: string): { estado: EstadoCobro; dias: number } {
  if (p.estatus_manual === "cancelada") return { estado: "cancelada", dias: 0 };
  if (p.estatus_manual === "promesa" && p.promesa_fecha) {
    const d = diasEntre(hoy, p.promesa_fecha);
    return d >= 0 ? { estado: "promesa", dias: d } : { estado: "promesa_vencida", dias: -d };
  }
  if (!p.fecha_limite_pago) return { estado: "sin_fecha", dias: 0 };
  const d = diasEntre(hoy, p.fecha_limite_pago);
  if (d < 0) return { estado: "vencida", dias: -d };
  if (d <= DIAS_AVISO) return { estado: "por_vencer", dias: d };
  return { estado: "al_corriente", dias: d };
}

function plural(n: number, uno: string, varios: string): string {
  return n === 1 ? uno : varios;
}

/** Texto corto del estado, para la etiqueta de cada póliza. */
export function etiquetaEstado(estado: EstadoCobro, dias: number, p: Poliza): string {
  switch (estado) {
    case "vencida":
      return `Vencida hace ${dias} ${plural(dias, "día", "días")}`;
    case "promesa_vencida":
      return `Promesa incumplida hace ${dias} ${plural(dias, "día", "días")}`;
    case "promesa":
      return dias === 0 ? "Prometió pagar hoy" : `Prometió pagar el ${fechaLarga(p.promesa_fecha ?? "")}`;
    case "por_vencer":
      return dias === 0 ? "Vence hoy" : `Vence en ${dias} ${plural(dias, "día", "días")}`;
    case "al_corriente":
      return "Al corriente";
    case "sin_fecha":
      return "Sin fecha de pago";
    case "cancelada":
      return "Cancelada";
  }
}

/** Semáforo de cada estado (siempre con palabra + ícono en pantalla, nunca solo color). */
export const COLOR_ESTADO: Record<EstadoCobro, string> = {
  vencida: "var(--red)",
  promesa_vencida: "var(--red)",
  promesa: "var(--sky)",
  por_vencer: "var(--amber)",
  al_corriente: "var(--green)",
  sin_fecha: "var(--ink-mute)",
  cancelada: "var(--ink-mute)",
};

export const ICONO_ESTADO: Record<EstadoCobro, string> = {
  vencida: "flat-color-icons:high-priority",
  promesa_vencida: "flat-color-icons:high-priority",
  promesa: "flat-color-icons:clock",
  por_vencer: "flat-color-icons:medium-priority",
  al_corriente: "flat-color-icons:ok",
  sin_fecha: "flat-color-icons:info",
  cancelada: "flat-color-icons:cancel",
};

export function recordadaHoy(p: Poliza, hoy: string): boolean {
  return Boolean(p.ultimo_recordatorio && fechaLocal(p.ultimo_recordatorio) === hoy);
}

// ----------------------------------------------------------------------------
// La lista de hoy: a quién cobrarle y en qué orden
// ----------------------------------------------------------------------------

export type MotivoCobro = "vencida" | "promesa_vencida" | "promesa" | "por_vencer" | "renovacion";

export interface PendienteCobro {
  poliza: Poliza;
  motivo: MotivoCobro;
  estado: EstadoCobro;
  dias: number;
  recordadaHoy: boolean;
  urgencia: number;
}

/** Cada póliza aparece UNA vez, con su motivo más urgente. Las ya recordadas hoy, al final. */
export function listaDeHoy(polizas: Poliza[], hoy: string): PendienteCobro[] {
  const lista: PendienteCobro[] = [];
  for (const p of polizas) {
    const { estado, dias } = estadoDe(p, hoy);
    if (estado === "cancelada") continue;
    let motivo: MotivoCobro | null = null;
    let urgencia = 0;
    if (estado === "vencida") {
      motivo = "vencida";
      urgencia = 5000 + dias * 10 + Math.min(p.monto_pago / 1000, 9);
    } else if (estado === "promesa_vencida") {
      motivo = "promesa_vencida";
      urgencia = 4000 + dias;
    } else if (estado === "por_vencer") {
      motivo = "por_vencer";
      urgencia = 3000 - dias;
    } else if (estado === "promesa") {
      motivo = "promesa";
      urgencia = 2000 - dias;
    } else if (p.renovacion) {
      const r = diasEntre(hoy, p.renovacion);
      if (r >= 0 && r <= DIAS_RENOVACION) {
        motivo = "renovacion";
        urgencia = 1000 - r;
      }
    }
    if (!motivo) continue;
    const ya = recordadaHoy(p, hoy);
    lista.push({ poliza: p, motivo, estado, dias, recordadaHoy: ya, urgencia: ya ? urgencia - 10_000 : urgencia });
  }
  return lista.sort((a, b) => b.urgencia - a.urgencia);
}

// ----------------------------------------------------------------------------
// Mensajes de WhatsApp (los envías TÚ; Valeri solo los deja listos)
// ----------------------------------------------------------------------------

const PALABRAS_CHICAS = new Set(["de", "del", "la", "las", "los", "y", "e"]);

/** "JOAN DANIEL OLIVA" → "Joan Daniel Oliva" */
export function capitalizarPalabras(texto: string): string {
  return texto
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && PALABRAS_CHICAS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

// Palabras que delatan una razón social (no una persona).
const SENAS_EMPRESA = new Set([
  "sa", "s.a.", "sc", "s.c.", "sapi", "s.a.p.i.", "cv", "c.v.", "rl", "srl", "s.r.l.",
  "cia", "cía", "compania", "compañia", "compañía", "grupo", "inc", "inc.", "ltd", "ltd.",
]);
// Lo que se quita del final de una razón social: "SA DE CV", "S.A.P.I. DE C.V.", "S DE RL DE CV", "SC"…
const COLA_EMPRESA = new Set(["sa", "s.a.", "de", "cv", "c.v.", "sapi", "s.a.p.i.", "s", "rl", "r.l.", "sc", "s.c.", "srl"]);
const ABREVIATURAS = new Set(["ma", "ma.", "j.", "fco", "fco."]);

/** "MARIO ALBERTO VASQUEZ" → "Hola Mario" · "GRUPO PRETSA SA DE CV" → "Hola, equipo de Grupo Pretsa" */
export function saludoPara(asegurado: string): string {
  const palabras = asegurado.trim().replace(/[,]/g, " ").split(/\s+/).filter(Boolean);
  if (palabras.some((w) => SENAS_EMPRESA.has(w.toLowerCase()))) {
    while (palabras.length > 1 && COLA_EMPRESA.has(palabras[palabras.length - 1].toLowerCase())) palabras.pop();
    return `Hola, equipo de ${capitalizarPalabras(palabras.join(" "))}`;
  }
  const primera = ABREVIATURAS.has(palabras[0]?.toLowerCase() ?? "") && palabras[1] ? palabras[1] : palabras[0];
  return `Hola ${capitalizarPalabras(primera ?? "")}`;
}

const DE_RAMO: Record<Ramo, string> = {
  vida: "de vida",
  gmm: "de gastos médicos",
  ahorro: "de ahorro",
  autos: "de auto",
  hogar: "de hogar",
};

function laPoliza(p: Poliza): string {
  const numero = p.numero ? ` ${p.numero}` : "";
  const ramo = p.ramo ? ` ${DE_RAMO[p.ramo]}` : "";
  return `tu póliza${numero}${ramo}`;
}

/** Texto base de cada situación (el que Valeri usa mientras no escribas el tuyo). */
export const PLANTILLAS_BASE: Record<MotivoCobro, string> = {
  vencida:
    "{saludo}, te escribo por el pago de {poliza} {monto}: la fecha límite fue el {fecha_limite} y todavía lo veo pendiente. Para que tu protección no se suspenda, ¿te ayudo a dejarlo pagado hoy? Quedo atento.",
  promesa_vencida:
    "{saludo}, ¿cómo vas? Quedamos en que el pago de {poliza} {monto} quedaba el {fecha_promesa} y aún no lo veo reflejado. ¿Te comparto los datos para hacerlo hoy? Quedo atento.",
  promesa:
    "{saludo}, solo para recordarte que quedamos en el pago de {poliza} {monto} para el {fecha_promesa}. ¿Te comparto los datos para dejarlo listo? ¡Gracias!",
  por_vencer:
    "{saludo}, te recuerdo que el pago de {poliza} {monto} vence el {fecha_limite}. Así mantienes tu protección sin interrupciones. Si necesitas la línea de pago o ayuda, aquí estoy. ¡Gracias!",
  renovacion:
    "{saludo}, {poliza} renueva {fecha_renovacion}. Antes de esa fecha me gustaría revisar contigo que siga cubriendo lo que necesitas. ¿Qué día te acomoda una llamada de 10 minutos?",
};

export const MOTIVOS_MENSAJE: { id: MotivoCobro; nombre: string; cuando: string }[] = [
  { id: "vencida", nombre: "Vencida", cuando: "Ya pasó la fecha límite de pago" },
  { id: "por_vencer", nombre: "Por vencer", cuando: "Faltan pocos días para la fecha límite" },
  { id: "promesa", nombre: "Promesa de pago", cuando: "Quedó de pagar un día y aún no llega" },
  { id: "promesa_vencida", nombre: "Promesa incumplida", cuando: "Pasó el día que prometió pagar" },
  { id: "renovacion", nombre: "Renovación", cuando: "La póliza renueva pronto" },
];

/** Lo que puedes poner entre llaves en tu mensaje, y qué se escribe en su lugar. */
export const VARIABLES_MENSAJE: { clave: string; ejemplo: string; descripcion: string }[] = [
  { clave: "saludo", ejemplo: "Hola Joan", descripcion: "Saludo con el nombre del cliente" },
  { clave: "nombre", ejemplo: "Joan", descripcion: "Solo el nombre de pila" },
  { clave: "poliza", ejemplo: "tu póliza 93177V04 de gastos médicos", descripcion: "Cuál póliza (con número y ramo)" },
  { clave: "monto", ejemplo: "por $4,644", descripcion: "El monto del recibo (se omite si no lo has capturado)" },
  { clave: "fecha_limite", ejemplo: "14 de septiembre", descripcion: "Fecha límite de pago" },
  { clave: "fecha_promesa", ejemplo: "20 de octubre", descripcion: "Día que prometió pagar" },
  { clave: "fecha_renovacion", ejemplo: "el 3 de noviembre", descripcion: "Cuándo renueva (si no hay fecha, dice \"pronto\")" },
];

const CLAVES_VALIDAS = new Set(VARIABLES_MENSAJE.map((v) => v.clave));

/** Variables entre llaves que no existen (para avisar en vez de mandarlas tal cual al cliente). */
export function variablesDesconocidas(texto: string): string[] {
  return [...new Set([...texto.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]).filter((c) => !CLAVES_VALIDAS.has(c)))];
}

export type ResultadoMensaje = { ok: true; texto: string } | { ok: false; error: string };

export function validarMensajeCobro(entrada: unknown): ResultadoMensaje {
  const texto = typeof entrada === "string" ? entrada.trim() : "";
  if (texto.length < 10) return { ok: false, error: "Escribe un mensaje de al menos 10 letras." };
  if (texto.length > 1000) return { ok: false, error: "El mensaje es muy largo (máximo 1,000 letras)." };
  const raras = variablesDesconocidas(texto);
  if (raras.length) {
    return { ok: false, error: `No conozco ${raras.map((r) => `{${r}}`).join(", ")}. Usa solo: ${VARIABLES_MENSAJE.map((v) => `{${v.clave}}`).join(" ")}.` };
  }
  return { ok: true, texto };
}

/** Rellena una plantilla con los datos de la póliza. */
export function rellenarMensaje(plantilla: string, p: Poliza): string {
  const saludo = saludoPara(p.asegurado);
  const valores: Record<string, string> = {
    saludo,
    nombre: saludo.replace(/^Hola,? /, ""),
    poliza: laPoliza(p),
    monto: p.monto_pago > 0 ? `por ${moneda(p.monto_pago)}` : "",
    fecha_limite: p.fecha_limite_pago ? fechaLarga(p.fecha_limite_pago) : "",
    fecha_promesa: p.promesa_fecha ? fechaLarga(p.promesa_fecha) : "",
    fecha_renovacion: p.renovacion ? `el ${fechaLarga(p.renovacion)}` : "pronto",
  };
  return plantilla
    .replace(/\{([^{}]*)\}/g, (todo, clave: string) => (clave in valores ? valores[clave] : todo))
    .replace(/\s+([,.:;!?])/g, "$1")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** El mensaje listo para WhatsApp: tu texto si lo personalizaste; si no, el base (respetuoso pero firme). */
export function mensajeCobro(p: Poliza, motivo: MotivoCobro, personalizadas: Partial<Record<MotivoCobro, string>> = {}): string {
  return rellenarMensaje(personalizadas[motivo] || PLANTILLAS_BASE[motivo], p);
}

/** Liga directa a WhatsApp con el mensaje escrito. Null si la póliza no tiene WhatsApp. */
export function ligaWhatsApp(p: Poliza, texto: string): string | null {
  return p.whatsapp.length === 10 ? `https://wa.me/52${p.whatsapp}?text=${encodeURIComponent(texto)}` : null;
}

// ----------------------------------------------------------------------------
// Resumen (solo totales: es lo que ven el CRM y RORO)
// ----------------------------------------------------------------------------

export function resumenCobranza(polizas: Poliza[], hoy: string): ResumenCobranza {
  const activas = polizas.filter((p) => p.estatus_manual !== "cancelada");
  let vencidas = 0;
  let montoVencido = 0;
  let porVencer = 0;
  let montoPorVencer = 0;
  let promesas = 0;
  let renuevan = 0;
  for (const p of activas) {
    const { estado } = estadoDe(p, hoy);
    if (estado === "vencida" || estado === "promesa_vencida") {
      vencidas += 1;
      montoVencido += p.monto_pago;
    } else if (estado === "por_vencer") {
      porVencer += 1;
      montoPorVencer += p.monto_pago;
    } else if (estado === "promesa") {
      promesas += 1;
    }
    if (p.renovacion) {
      const r = diasEntre(hoy, p.renovacion);
      if (r >= 0 && r <= DIAS_RENOVACION) renuevan += 1;
    }
  }
  const sinWhatsapp = activas.filter((p) => p.whatsapp.length !== 10).length;
  const recordadasHoy = activas.filter((p) => recordadaHoy(p, hoy)).length;

  let frase: string;
  if (!activas.length) {
    frase = "Tu cartera está vacía: agrega tus pólizas y cada mañana te digo a quién cobrarle.";
  } else {
    const partes: string[] = [];
    if (vencidas) {
      partes.push(
        `${vencidas} ${plural(vencidas, "vencida", "vencidas")}${montoVencido > 0 ? ` (${moneda(montoVencido)} en riesgo)` : ""}`,
      );
    }
    if (porVencer) partes.push(`${porVencer} ${plural(porVencer, "vence", "vencen")} en los próximos ${DIAS_AVISO} días`);
    if (promesas) partes.push(`${promesas} ${plural(promesas, "promesa", "promesas")} de pago`);
    if (renuevan) partes.push(`${renuevan} ${plural(renuevan, "renueva", "renuevan")} en ${DIAS_RENOVACION} días`);
    frase = partes.length ? `Hoy: ${partes.join(" · ")}.` : "Todo al corriente: hoy nadie te debe. 🎉";
    if (sinWhatsapp) {
      frase += ` Faltan WhatsApp en ${sinWhatsapp} ${plural(sinWhatsapp, "póliza", "pólizas")}.`;
    }
  }

  return {
    polizas: activas.length,
    vencidas,
    montoVencido: Math.round(montoVencido),
    porVencer,
    montoPorVencer: Math.round(montoPorVencer),
    promesas,
    renuevan,
    sinWhatsapp,
    recordadasHoy,
    frase,
  };
}

// ----------------------------------------------------------------------------
// Validación (misma en el formulario y en el servidor)
// ----------------------------------------------------------------------------

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MONTO_MAXIMO = 50_000_000;

function dinero(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[$,\s]/g, "") || 0);
  if (!Number.isFinite(n) || n < 0 || n > MONTO_MAXIMO) return null;
  return Math.round(n * 100) / 100;
}

function fechaOpcional(v: unknown): string | null | false {
  const f = String(v ?? "").trim();
  if (!f) return null;
  return esFechaValida(f) ? f : false;
}

export type ResultadoPoliza = { ok: true; datos: DatosPoliza } | { ok: false; error: string };

export function validarPoliza(entrada: unknown): ResultadoPoliza {
  if (!entrada || typeof entrada !== "object") return { ok: false, error: "La póliza viene vacía." };
  const e = entrada as Record<string, unknown>;

  const asegurado = String(e.asegurado ?? "").trim().replace(/\s+/g, " ").slice(0, 160);
  if (asegurado.length < 2) return { ok: false, error: "Escribe el nombre del asegurado." };

  const whatsapp = normWhatsapp(String(e.whatsapp ?? ""));
  if (whatsapp && whatsapp.length !== 10) {
    return { ok: false, error: "El WhatsApp debe tener 10 dígitos (puedes incluir +52)." };
  }

  const correo = normCorreo(String(e.correo ?? "")).slice(0, 160);
  if (correo && !RE_CORREO.test(correo)) return { ok: false, error: "Revisa el correo (ejemplo: nombre@correo.com)." };

  const ramoCrudo = e.ramo === undefined || e.ramo === null || e.ramo === "" ? null : e.ramo;
  if (ramoCrudo !== null && !esRamo(ramoCrudo)) return { ok: false, error: "El ramo no es válido." };
  const ramo = ramoCrudo as Ramo | null;

  const forma = e.forma_pago ?? "anual";
  if (!FORMAS_PAGO.some((f) => f.id === forma)) return { ok: false, error: "La forma de pago no es válida." };

  const monto_pago = dinero(e.monto_pago);
  const prima_anual = dinero(e.prima_anual);
  if (monto_pago === null || prima_anual === null) {
    return { ok: false, error: "Revisa los montos: deben ser números (ejemplo: 1250)." };
  }

  const inicio = fechaOpcional(e.inicio);
  const renovacion = fechaOpcional(e.renovacion);
  const fecha_limite_pago = fechaOpcional(e.fecha_limite_pago);
  if (inicio === false || renovacion === false || fecha_limite_pago === false) {
    return { ok: false, error: "Alguna fecha no es válida (ejemplo: 2026-11-04)." };
  }

  const lead = e.lead_id === undefined || e.lead_id === null || e.lead_id === "" ? null : String(e.lead_id).slice(0, 64);

  return {
    ok: true,
    datos: {
      numero: String(e.numero ?? "").trim().slice(0, 40),
      asegurado,
      whatsapp,
      correo,
      ramo,
      aseguradora: String(e.aseguradora ?? "").trim().slice(0, 60),
      monto_pago,
      prima_anual,
      forma_pago: forma as FormaPago,
      inicio,
      renovacion,
      fecha_limite_pago,
      notas: String(e.notas ?? "").trim().slice(0, 1000),
      lead_id: lead,
    },
  };
}
