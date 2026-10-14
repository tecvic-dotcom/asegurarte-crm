/**
 * Reglas de Camila, tu empleada digital de venta cruzada (puras: cliente y servidor, sin IA y sin costo).
 *
 * Analogía: la asistente que conoce el expediente de cada cliente, ve qué seguros ya tiene y cuáles le faltan, y cada mañana te deja
 * en el escritorio a quién conviene ofrecerle qué, por qué, y el mensaje escrito. Tú lo mandas; Camila no envía nada sola.
 *
 * Los candados que cuidan la relación con tu cliente:
 *  · solo se ofrece a clientes con al menos una póliza vigente;
 *  · nunca a quien marcaste «no ofrecer», ni a quien dijo que no le interesa hasta que pase el tiempo que pusiste;
 *  · nunca a quien tiene un pago vencido (primero se cobra);
 *  · lo que ya ofreciste espera una semana antes de insistir;
 *  · «Para hoy» propone un solo seguro por cliente, y pocos clientes a la vez.
 */
import { estadoDe, saludoPara } from "./cobranza-reglas";
import { diasEntre, esFechaValida, fechaLarga, fechaLocal, sumarDias } from "./fechas";
import { nombreDePila, palabraDeParentesco } from "./cruzada-familia";
import { temporadaDe } from "./cruzada-temporadas";
import { normCodigoPostal, normCorreo, normWhatsapp } from "./normalize";
import { esRamo, RAMOS } from "./ramos";
import type { Cliente, DatosCliente, EstadoCruzada, EstadoOferta, Genero, LibroPoliza, MomentoHecho, Poliza, Ramo } from "./types";

// ----------------------------------------------------------------------------
// Lo que se sabe de las pólizas de un cliente (de Valeri o de tus reportes de AXA)
// ----------------------------------------------------------------------------

export interface PolizaDeCliente {
  fuente: "cobranza" | "libro";
  numero: string;
  ramo: Ramo | null;
  aseguradora: string;
  vigente: boolean;
  renovacion: string | null;
  /** Último pago conocido: sirve para saber desde cuándo ya no está vigente. */
  ultimo_pago: string | null;
  prima: number;
}

export function desdePolizaCobranza(p: Pick<Poliza, "numero" | "ramo" | "aseguradora" | "estatus_manual" | "renovacion" | "ultimo_pago" | "prima_anual">): PolizaDeCliente {
  return {
    fuente: "cobranza",
    numero: p.numero,
    ramo: p.ramo,
    aseguradora: p.aseguradora,
    vigente: p.estatus_manual !== "cancelada",
    renovacion: p.renovacion,
    ultimo_pago: p.ultimo_pago,
    prima: p.prima_anual,
  };
}

export function desdeLibro(l: LibroPoliza): PolizaDeCliente {
  return {
    fuente: "libro",
    numero: l.numero,
    ramo: l.ramo,
    aseguradora: l.aseguradora,
    vigente: l.vigente,
    renovacion: l.renovacion,
    ultimo_pago: l.ultimo_pago,
    prima: l.prima_ultima,
  };
}

const claveNumero = (n: string) => n.replace(/[\s-]/g, "").toUpperCase();

/** Junta las pólizas de Valeri y las del libro de AXA sin repetir: si la misma póliza está en las dos, manda la de Valeri. */
export function unirPolizas(cobranza: PolizaDeCliente[], libro: PolizaDeCliente[]): PolizaDeCliente[] {
  const vistas = new Set(cobranza.map((p) => claveNumero(p.numero)).filter(Boolean));
  return [...cobranza, ...libro.filter((p) => !vistas.has(claveNumero(p.numero)))];
}

export interface EntradaCliente {
  cliente: Cliente;
  polizas: PolizaDeCliente[];
  estados: EstadoCruzada[];
  /** Tiene algún pago vencido en la cobranza de Valeri. */
  conAdeudo: boolean;
}

// ----------------------------------------------------------------------------
// Mapa de cobertura: qué ramos tiene cada cliente
// ----------------------------------------------------------------------------

/** vigente = lo tiene · tuvo = lo tuvo y ya no está vigente · sin = nunca se le ha vendido. */
export type EstadoCelda = "vigente" | "tuvo" | "sin";

export interface Celda {
  ramo: Ramo;
  estado: EstadoCelda;
  polizas: PolizaDeCliente[];
  /** La renovación más próxima de ese ramo (solo si está vigente y se conoce). */
  renovacion: string | null;
}

export function mapaDeCobertura(polizas: PolizaDeCliente[]): Celda[] {
  return RAMOS.map((r) => {
    const delRamo = polizas.filter((p) => p.ramo === r.id);
    const vigentes = delRamo.filter((p) => p.vigente);
    const estado: EstadoCelda = vigentes.length ? "vigente" : delRamo.length ? "tuvo" : "sin";
    const renovaciones = vigentes.map((p) => p.renovacion).filter((f): f is string => Boolean(f)).sort();
    return { ramo: r.id, estado, polizas: vigentes.length ? vigentes : delRamo, renovacion: renovaciones[0] ?? null };
  });
}

/** Un cliente «activo» es el que hoy tiene al menos una póliza vigente: solo a ellos se les vende más. */
export function esActivo(polizas: PolizaDeCliente[]): boolean {
  return polizas.some((p) => p.vigente);
}

/** Ramos que tiene vigentes, sin repetir y en el orden de siempre. */
export function ramosVigentes(polizas: PolizaDeCliente[]): Ramo[] {
  return RAMOS.map((r) => r.id).filter((id) => polizas.some((p) => p.vigente && p.ramo === id));
}

/** A una empresa no se le ofrece hogar ni ahorro personal. */
function ramosOfrecibles(c: Pick<Cliente, "tipo">): Ramo[] {
  return c.tipo === "empresa" ? ["vida", "gmm", "autos"] : RAMOS.map((r) => r.id);
}

export interface CoberturaGlobal {
  ramo: Ramo;
  /** Cuántos clientes activos lo tienen vigente. */
  tienen: number;
  /** Cuántos lo tuvieron y ya no. */
  tuvieron: number;
  /** Cuántos clientes activos no lo tienen. */
  sin: number;
}

export function coberturaGlobal(entradas: EntradaCliente[]): CoberturaGlobal[] {
  const activos = entradas.filter((e) => esActivo(e.polizas));
  return RAMOS.map((r) => {
    let tienen = 0;
    let tuvieron = 0;
    for (const e of activos) {
      const celda = mapaDeCobertura(e.polizas).find((c) => c.ramo === r.id)!;
      if (celda.estado === "vigente") tienen++;
      else if (celda.estado === "tuvo") tuvieron++;
    }
    return { ramo: r.id, tienen, tuvieron, sin: activos.length - tienen };
  });
}

// ----------------------------------------------------------------------------
// Oportunidades: a quién ofrecerle qué, y por qué
// ----------------------------------------------------------------------------

/** nueva: no tiene ese seguro · reactivar: lo tuvo y ya no está vigente · familiar: lo necesita un familiar suyo (se le pregunta al titular). */
export type TipoOportunidad = "nueva" | "reactivar" | "familiar";
export type Prioridad = "alta" | "media" | "baja";
/**
 * para_hoy: toca ofrecerlo · esperando: se ofreció hace poco · seguimiento: se ofreció y no contestó · cotizada: ya se le cotizó ·
 * pausa: se le ofreció OTRO seguro hace menos de 30 días (no se le escribe dos veces seguidas).
 */
export type SituacionOferta = "para_hoy" | "esperando" | "seguimiento" | "cotizada" | "pausa";

export interface Oportunidad {
  /** El cliente al que se le ofrece (en «familiar», el familiar que necesita el seguro). Con él se guarda cómo va la oferta. */
  cliente_id: string;
  /** A quién se le escribe: el mismo cliente, o el titular cuando la oferta es para un familiar. */
  destinatario_id: string;
  /** El nombre del destinatario (el que recibe el WhatsApp). */
  nombre: string;
  ramo: Ramo;
  tipo: TipoOportunidad;
  puntos: number;
  prioridad: Prioridad;
  razones: string[];
  situacion: SituacionOferta;
  estado: EstadoOferta | null;
  /** Días desde que se le ofreció (null si no se le ha ofrecido). */
  diasDesdeOferta: number | null;
  /** La mejor oportunidad de este cliente: es la única que aparece en «Para hoy». */
  principal: boolean;
  /** Los ramos que tiene vigentes (para el mensaje y para explicar). */
  tiene: Ramo[];
  /** Hasta cuándo está en pausa (solo cuando la situación es «pausa»). */
  pausaHasta: string | null;
  /** Para ofertas «familiar»: de quién se trata y qué es del titular. */
  familiar: { nombre: string; parentesco: string } | null;
}

export type MotivoRetenida = "adeudo" | "no_ofrecer" | "no_interesa";

/** Clientes a los que NO se les ofrece ahora, y por qué (para que no parezca que Camila se olvidó de ellos). */
export interface Retenida {
  cliente_id: string;
  nombre: string;
  motivo: MotivoRetenida;
  ramo: Ramo | null;
  /** Hasta cuándo (solo «no le interesa»). */
  hasta: string | null;
}

/** Días que se espera la respuesta a una oferta antes de dar seguimiento. */
export const DIAS_ESPERA = 7;
/** Pasados estos días sin respuesta, la oferta se da por enfriada y el ramo vuelve a «Para hoy». */
export const DIAS_ENFRIADA = 45;
/** Si dice «no me interesa» y no pones fecha, se vuelve a considerar tras este tiempo. */
export const DIAS_DESCANSO = 180;
/** Cuántos clientes caben en «Para hoy». */
export const MAX_PARA_HOY = 8;
/** Entre una oferta y la siguiente (de otro seguro) a un mismo cliente pasan al menos estos días. */
export const DIAS_ENTRE_OFERTAS = 30;
/** Cada cuántos días se le vuelven a pedir referidos a un cliente. */
export const DIAS_ENTRE_REFERIDOS = 90;

/** Qué seguros hacen natural ofrecer cada uno de los demás. */
const AFINIDAD: Record<Ramo, Ramo[]> = {
  vida: ["gmm", "ahorro", "hogar"],
  gmm: ["vida", "ahorro", "hogar"],
  ahorro: ["vida", "gmm"],
  autos: ["hogar", "gmm", "vida"],
  hogar: ["autos", "vida", "ahorro"],
};
const BASE: Record<Ramo, number> = { vida: 55, gmm: 55, autos: 45, hogar: 40, ahorro: 40 };

export function edadDe(nacimiento: string | null, hoy: string): number | null {
  if (!nacimiento || !/^\d{4}-\d{2}-\d{2}$/.test(nacimiento)) return null;
  let edad = Number(hoy.slice(0, 4)) - Number(nacimiento.slice(0, 4));
  if (hoy.slice(5) < nacimiento.slice(5)) edad--;
  return edad >= 0 && edad < 120 ? edad : null;
}

const NOMBRE_RAMO: Record<Ramo, string> = { vida: "vida", gmm: "gastos médicos", ahorro: "ahorro", autos: "auto", hogar: "hogar" };

function prioridadDe(puntos: number): Prioridad {
  return puntos >= 75 ? "alta" : puntos >= 60 ? "media" : "baja";
}

function puntuar(e: EntradaCliente, ramo: Ramo, tipo: TipoOportunidad, hoy: string, hijosMenores = 0): { puntos: number; razones: string[] } {
  const razones: string[] = [];
  const vigentes = e.polizas.filter((p) => p.vigente);
  const tiene = ramosVigentes(e.polizas);
  let puntos = BASE[ramo];

  const afines = AFINIDAD[ramo].filter((r) => tiene.includes(r));
  if (afines.length) {
    puntos += Math.min(20, afines.length * 10);
    razones.push(`Ya tiene ${listaDeRamos(afines)} contigo: ${nombreCorto(ramo)} es el paso natural`);
  }

  // La temporada del año que favorece a este seguro (lluvias → hogar y auto, aguinaldo → ahorro y vida, declaración → ahorro).
  const temporada = temporadaDe(ramo, hoy);
  if (temporada) {
    puntos += 10;
    razones.push(temporada.razon);
  }

  // Hijos menores de edad: el ahorro educativo es la oferta natural.
  if (ramo === "ahorro" && hijosMenores > 0) {
    puntos += 15;
    razones.push(hijosMenores === 1 ? "Tiene un hijo menor de edad: un ahorro educativo es una buena idea" : `Tiene ${hijosMenores} hijos menores de edad: un ahorro educativo es una buena idea`);
  }

  // Si una de sus pólizas renueva pronto ya van a hablar: es el mejor momento para mencionar otra.
  const proxima = vigentes
    .map((p) => (p.renovacion ? { p, d: diasEntre(hoy, p.renovacion) } : null))
    .filter((x): x is { p: PolizaDeCliente; d: number } => x !== null && x.d >= 0 && x.d <= 90)
    .sort((a, b) => a.d - b.d)[0];
  if (proxima) {
    const que = proxima.p.ramo ? seguroDe(proxima.p.ramo).replace(/^tu /, "su ") : "una de sus pólizas";
    if (proxima.d <= 30) {
      puntos += 20;
      razones.push(`${capitalizarPrimera(que)} renueva en ${proxima.d} ${proxima.d === 1 ? "día" : "días"}: ya van a hablar`);
    } else {
      puntos += 10;
      razones.push(`${capitalizarPrimera(que)} renueva en ${proxima.d} días`);
    }
  }

  // Cuenta tipos de seguro distintos, no pólizas: dos pólizas de GMM de una misma familia no son dos productos.
  if (tiene.length >= 2) {
    puntos += 10;
    razones.push(`Ya tiene ${tiene.length} tipos de seguro contigo`);
  }

  const edad = edadDe(e.cliente.fecha_nacimiento, hoy);
  if (edad !== null) {
    if (ramo === "vida" && edad >= 25 && edad <= 55) {
      puntos += 10;
      razones.push(`A los ${edad} años es buena edad para un seguro de vida (sale más barato)`);
    } else if (ramo === "vida" && edad >= 66) {
      puntos -= 20;
      razones.push(`A los ${edad} años el seguro de vida sale caro: cotiza con cuidado`);
    } else if (ramo === "gmm" && edad >= 50) {
      puntos += 10;
      razones.push(`A los ${edad} años los gastos médicos pesan más`);
    } else if (ramo === "ahorro" && edad >= 28 && edad <= 55) {
      puntos += 5;
    }
  }

  if (tipo === "reactivar") {
    const ultimas = e.polizas.filter((p) => p.ramo === ramo && p.ultimo_pago).map((p) => p.ultimo_pago!).sort();
    const ultima = ultimas[ultimas.length - 1];
    if (ultima && diasEntre(ultima, hoy) <= 730) {
      puntos += 15;
      razones.unshift(`Tuvo ${nombreCorto(ramo)} hasta ${mesYAnio(ultima)}: ya conoce el producto`);
    } else {
      razones.unshift(`Tuvo ${nombreCorto(ramo)} hace tiempo`);
    }
  }

  if (ramo === "ahorro") razones.push("Revisa que no lo tenga ya: tus reportes de AXA no distinguen el ahorro de Vida");
  return { puntos: Math.max(0, Math.min(100, puntos)), razones };
}

function mesYAnio(f: string): string {
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${meses[Number(f.slice(5, 7)) - 1]} ${f.slice(0, 4)}`;
}

function capitalizarPrimera(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function nombreCorto(r: Ramo): string {
  return r === "ahorro" ? "un plan de ahorro" : `un seguro de ${NOMBRE_RAMO[r]}`;
}

function listaDeRamos(rs: Ramo[]): string {
  const n = rs.map((r) => (r === "ahorro" ? "ahorro" : NOMBRE_RAMO[r]));
  return n.length <= 1 ? (n[0] ?? "") : `${n.slice(0, -1).join(", ")} y ${n[n.length - 1]}`;
}

export interface ResultadoOportunidades {
  lista: Oportunidad[];
  retenidas: Retenida[];
}

const ORDEN_SITUACION: Record<SituacionOferta, number> = { para_hoy: 0, seguimiento: 1, cotizada: 2, esperando: 3, pausa: 4 };

type EvaluacionEstado = { omitir: true } | { retenerHasta: string } | { situacion: SituacionOferta; dias: number | null };

/** Qué toca hacer con una oferta según cómo va (ofrecida, cotizada, cerrada, no le interesa…). */
function evaluarEstado(est: EstadoCruzada | null, hoy: string): EvaluacionEstado {
  let situacion: SituacionOferta = "para_hoy";
  let dias: number | null = null;
  if (est?.estado === "no_interesa") {
    const hasta = est.volver_a_ofrecer ?? sumarDias(fechaLocal(est.actualizado_en), DIAS_DESCANSO);
    if (hoy < hasta) return { retenerHasta: hasta };
  } else if (est?.estado === "cerrada") {
    // Dijo que sí: la póliza aparecerá en su mapa cuando se capture. Mientras tanto no se le vuelve a ofrecer.
    return { omitir: true };
  } else if (est?.estado === "cotizada") {
    situacion = "cotizada";
    if (est.ofrecida_en) dias = diasEntre(fechaLocal(est.ofrecida_en), hoy);
  } else if (est?.estado === "ofrecida" && est.ofrecida_en) {
    dias = diasEntre(fechaLocal(est.ofrecida_en), hoy);
    situacion = dias < DIAS_ESPERA ? "esperando" : dias <= DIAS_ENFRIADA ? "seguimiento" : "para_hoy";
  }
  if (est?.volver_a_ofrecer && hoy < est.volver_a_ofrecer && est.estado !== "no_interesa") {
    // Pidió que le escribas después de cierta fecha.
    situacion = "esperando";
  }
  return { situacion, dias };
}

/** Si se le ofreció (o cotizó) otro seguro hace menos de 30 días, hasta cuándo hay que esperar para escribirle de nuevo. */
function pausaDe(otrasOfertas: EstadoCruzada[], hoy: string): string | null {
  let ultima: string | null = null;
  for (const x of otrasOfertas) {
    if ((x.estado === "ofrecida" || x.estado === "cotizada") && x.ofrecida_en) {
      const f = fechaLocal(x.ofrecida_en);
      if (!ultima || f > ultima) ultima = f;
    }
  }
  if (!ultima) return null;
  const hasta = sumarDias(ultima, DIAS_ENTRE_OFERTAS);
  return hoy < hasta ? hasta : null;
}

/** Todas las oportunidades de venta cruzada de la cartera, ya ordenadas: primero lo que toca hacer hoy, de mayor a menor puntaje. */
export function calcularOportunidades(entradas: EntradaCliente[], hoy: string): ResultadoOportunidades {
  const lista: Oportunidad[] = [];
  const retenidas: Retenida[] = [];
  /** Hijos menores de edad por titular (para el ahorro educativo). */
  const hijosMenores = new Map<string, number>();
  for (const e of entradas) {
    const c = e.cliente;
    if (c.titular_id && c.parentesco === "hijo") {
      const edad = edadDe(c.fecha_nacimiento, hoy);
      if (edad !== null && edad < 18) hijosMenores.set(c.titular_id, (hijosMenores.get(c.titular_id) ?? 0) + 1);
    }
  }

  for (const e of entradas) {
    if (!esActivo(e.polizas)) continue;
    const c = e.cliente;
    if (c.no_ofrecer) {
      retenidas.push({ cliente_id: c.id, nombre: c.nombre, motivo: "no_ofrecer", ramo: null, hasta: null });
      continue;
    }
    if (e.conAdeudo) {
      retenidas.push({ cliente_id: c.id, nombre: c.nombre, motivo: "adeudo", ramo: null, hasta: null });
      continue;
    }

    const celdas = mapaDeCobertura(e.polizas);
    const tiene = ramosVigentes(e.polizas);

    for (const ramo of ramosOfrecibles(c)) {
      const celda = celdas.find((x) => x.ramo === ramo)!;
      if (celda.estado === "vigente") continue;
      const tipo: TipoOportunidad = celda.estado === "tuvo" ? "reactivar" : "nueva";
      const est = e.estados.find((x) => x.ramo === ramo) ?? null;
      const ev = evaluarEstado(est, hoy);
      if ("omitir" in ev) continue;
      if ("retenerHasta" in ev) {
        retenidas.push({ cliente_id: c.id, nombre: c.nombre, motivo: "no_interesa", ramo, hasta: ev.retenerHasta });
        continue;
      }
      let situacion = ev.situacion;
      const pausaHasta = situacion === "para_hoy" ? pausaDe(e.estados.filter((x) => x.ramo !== ramo), hoy) : null;
      if (pausaHasta) situacion = "pausa";

      const { puntos, razones } = puntuar(e, ramo, tipo, hoy, hijosMenores.get(c.id) ?? 0);
      lista.push({
        cliente_id: c.id,
        destinatario_id: c.id,
        nombre: c.nombre,
        ramo,
        tipo,
        puntos,
        prioridad: prioridadDe(puntos),
        razones,
        situacion,
        estado: est?.estado ?? null,
        diasDesdeOferta: ev.dias,
        principal: false,
        tiene,
        pausaHasta,
        familiar: null,
      });
    }

    // Ofertas para la familia: el cónyuge del titular que no tiene seguro de vida (se le pregunta al titular).
    const tieneBase = tiene.includes("vida") || tiene.includes("gmm");
    if (c.titular_id || !tieneBase) continue;
    for (const m of entradas) {
      const M = m.cliente;
      if (M.titular_id !== c.id || M.parentesco !== "conyuge" || M.no_ofrecer) continue;
      if (ramosVigentes(m.polizas).includes("vida")) continue;
      const est = m.estados.find((x) => x.ramo === "vida") ?? null;
      const ev = evaluarEstado(est, hoy);
      if ("omitir" in ev) continue;
      if ("retenerHasta" in ev) {
        retenidas.push({ cliente_id: M.id, nombre: M.nombre, motivo: "no_interesa", ramo: "vida", hasta: ev.retenerHasta });
        continue;
      }
      let situacion = ev.situacion;
      const pausaHasta = situacion === "para_hoy" ? pausaDe([...e.estados, ...m.estados.filter((x) => x.ramo !== "vida")], hoy) : null;
      if (pausaHasta) situacion = "pausa";

      const palabra = palabraDeParentesco("conyuge", M.genero);
      const razones = [`Su ${palabra} ${nombreDePila(M.nombre)} no tiene seguro de vida contigo`, `${nombreDePila(c.nombre)} ya tiene ${listaDeRamos(tiene)} contigo`];
      let puntos = BASE.vida + 15;
      const edad = edadDe(M.fecha_nacimiento, hoy);
      if (edad !== null && edad >= 25 && edad <= 55) {
        puntos += 10;
        razones.push(`A los ${edad} años es buena edad para un seguro de vida (sale más barato)`);
      }
      const temporada = temporadaDe("vida", hoy);
      if (temporada) {
        puntos += 10;
        razones.push(temporada.razon);
      }
      puntos = Math.max(0, Math.min(100, puntos));
      lista.push({
        cliente_id: M.id,
        destinatario_id: c.id,
        nombre: c.nombre,
        ramo: "vida",
        tipo: "familiar",
        puntos,
        prioridad: prioridadDe(puntos),
        razones,
        situacion,
        estado: est?.estado ?? null,
        diasDesdeOferta: ev.dias,
        principal: false,
        tiene,
        pausaHasta,
        familiar: { nombre: nombreDePila(M.nombre), parentesco: palabra },
      });
    }
  }

  // La mejor opción «para hoy» de cada destinatario es la principal: así nunca le llegan dos ofertas a la vez.
  const porDestinatario = new Map<string, Oportunidad[]>();
  for (const o of lista) if (o.situacion === "para_hoy") porDestinatario.set(o.destinatario_id, [...(porDestinatario.get(o.destinatario_id) ?? []), o]);
  for (const ofertas of porDestinatario.values()) ofertas.sort((a, b) => b.puntos - a.puntos)[0].principal = true;

  lista.sort(
    (a, b) =>
      ORDEN_SITUACION[a.situacion] - ORDEN_SITUACION[b.situacion] ||
      Number(b.principal) - Number(a.principal) ||
      b.puntos - a.puntos ||
      a.nombre.localeCompare(b.nombre, "es"),
  );
  return { lista, retenidas };
}

/** Lo que Camila propone hoy: la mejor oferta de cada cliente, los mejores primero, sin pasarse de MAX_PARA_HOY. */
export function paraHoy(lista: Oportunidad[]): Oportunidad[] {
  return lista.filter((o) => o.situacion === "para_hoy" && o.principal).slice(0, MAX_PARA_HOY);
}

// ----------------------------------------------------------------------------
// Datos por completar
// ----------------------------------------------------------------------------

export type TipoFaltante = "whatsapp" | "sin_ramo" | "nacimiento" | "renovacion" | "correo";

export interface Faltante {
  tipo: TipoFaltante;
  texto: string;
  /** alta = sin esto no puedes escribirle o el mapa sale mal; baja = mejora las sugerencias. */
  importancia: "alta" | "baja";
}

/** ¿Es un WhatsApp mexicano de 10 dígitos? */
export function whatsappValido(w: string): boolean {
  return normWhatsapp(w).length === 10;
}

export function faltantesDe(e: EntradaCliente): Faltante[] {
  const salida: Faltante[] = [];
  if (!whatsappValido(e.cliente.whatsapp)) salida.push({ tipo: "whatsapp", texto: "Falta su WhatsApp", importancia: "alta" });
  const sinRamo = e.polizas.filter((p) => !p.ramo).length;
  if (sinRamo) salida.push({ tipo: "sin_ramo", texto: `${sinRamo === 1 ? "Una póliza" : `${sinRamo} pólizas`} sin ramo`, importancia: "alta" });
  if (!e.cliente.fecha_nacimiento && e.cliente.tipo === "persona") {
    salida.push({ tipo: "nacimiento", texto: "Falta su fecha de nacimiento", importancia: "baja" });
  }
  const sinRenovacion = e.polizas.filter((p) => p.fuente === "cobranza" && p.vigente && !p.renovacion).length;
  if (sinRenovacion) {
    salida.push({ tipo: "renovacion", texto: `${sinRenovacion === 1 ? "Una póliza" : `${sinRenovacion} pólizas`} sin fecha de renovación`, importancia: "baja" });
  }
  if (!e.cliente.correo.trim()) salida.push({ tipo: "correo", texto: "Falta su correo", importancia: "baja" });
  return salida;
}

// ----------------------------------------------------------------------------
// Mensajes de WhatsApp (textos fijos que tú editas, igual que Valeri y Sofi)
// ----------------------------------------------------------------------------

/** Un texto por seguro que se ofrece, uno para reactivar, uno para la familia y los de los momentos de confianza. */
export type ClaveMensaje = Ramo | "reactivar" | "familiar" | "revision" | "cumple" | "pago" | "referidos";

const CLAVES_EXTRA: ClaveMensaje[] = ["reactivar", "familiar", "revision", "cumple", "pago", "referidos"];

export function esClaveMensaje(v: unknown): v is ClaveMensaje {
  return typeof v === "string" && ((CLAVES_EXTRA as string[]).includes(v) || RAMOS.some((r) => r.id === v));
}

/** Se agrega a los mensajes que ofrecen algo: quien no quiera recibir más, lo dice y queda en «no ofrecer». */
const BAJA = " Si prefieres que no te escriba de otros seguros, solo avísame.";

/** Texto base (el que Camila usa mientras no escribas el tuyo). Suena a Roberto, no a robot. */
export const PLANTILLAS_CRUZADA: Record<ClaveMensaje, string> = {
  vida:
    "{saludo}, soy Roberto Rodríguez de Asegurarte 👋 Gracias por confiar en mí con {tiene}. Te escribo porque veo que todavía no tienes un seguro de vida, que es lo que respalda a tu familia si algún día faltas. ¿Te platico en 5 minutos cómo funciona y cuánto costaría? Sin compromiso." +
    BAJA,
  gmm:
    "{saludo}, soy Roberto Rodríguez de Asegurarte 👋 Gracias por tener {tiene} conmigo. Te escribo porque veo que aún no cuentas con un seguro de gastos médicos, y una sola hospitalización sin seguro puede costar más que años de prima. ¿Te armo una cotización sin compromiso?" +
    BAJA,
  ahorro:
    "{saludo}, soy Roberto Rodríguez de Asegurarte 👋 Ya que tienes {tiene} conmigo, quería preguntarte si te interesa un plan de ahorro: vas juntando una cantidad cada mes para algo concreto (retiro, estudios de tus hijos, un proyecto) y te disciplinas sin sentirlo. ¿Te muestro cómo quedaría con lo que puedes apartar?" +
    BAJA,
  autos:
    "{saludo}, soy Roberto Rodríguez de Asegurarte 👋 Gracias por tener {tiene} conmigo. ¿Tu auto ya está asegurado? Si lo tienes con otra compañía, con gusto te cotizo para que compares precio y coberturas, sin compromiso." +
    BAJA,
  hogar:
    "{saludo}, soy Roberto Rodríguez de Asegurarte 👋 Gracias por tener {tiene} conmigo. ¿Tu casa o departamento ya está asegurado? Cubre incendio, robo y daños, y suele costar menos de lo que se piensa. ¿Te cotizo sin compromiso?" +
    BAJA,
  reactivar:
    "{saludo}, soy Roberto Rodríguez de Asegurarte 👋 Vi que {tuvo} ya no está vigente. ¿Quieres que lo revisemos y te cotice para que vuelvas a estar protegido? Sin compromiso." +
    BAJA,
  familiar:
    "{saludo}, soy Roberto Rodríguez de Asegurarte 👋 Ya que tienes {tiene} conmigo, quería preguntarte: ¿tu {parentesco} {familiar} ya cuenta con su propio seguro de vida? Si quieres, se lo cotizo sin compromiso." +
    BAJA,
  revision:
    "{saludo}, soy Roberto Rodríguez de Asegurarte 👋 Te escribo porque {poliza} renueva el {fecha}. Antes de que llegue, quiero revisar contigo tus coberturas para confirmar que sigan siendo las que necesitas (¿cambió algo en tu familia, tu auto o tu casa?). ¿Cuándo tienes 10 minutos para platicarlo?",
  cumple:
    "{saludo}, ¡feliz cumpleaños! 🎂 Que este nuevo año venga lleno de salud y buenos momentos. Un abrazo de parte de todos en Asegurarte. — Roberto",
  pago: "{saludo}, gracias por tu pago de {poliza} 🙌 Me da mucho gusto tenerte como cliente. Si surge cualquier duda con tu seguro, aquí estoy. — Roberto",
  referidos:
    "{saludo}, gracias por tu confianza 🙏 Si conoces a alguien (familia, amigos o compañeros de trabajo) a quien le pueda servir revisar sus seguros, con gusto lo atiendo igual que a ti. ¿Me compartes su contacto? Sin compromiso.",
};

export type GrupoMensaje = "seguros" | "familia" | "momentos";

export const MENSAJES_CRUZADA: { id: ClaveMensaje; nombre: string; cuando: string; grupo: GrupoMensaje }[] = [
  { id: "vida", nombre: "Ofrecer seguro de vida", cuando: "A un cliente que aún no tiene vida", grupo: "seguros" },
  { id: "gmm", nombre: "Ofrecer gastos médicos", cuando: "A un cliente que aún no tiene GMM", grupo: "seguros" },
  { id: "ahorro", nombre: "Ofrecer ahorro", cuando: "A un cliente que aún no tiene un plan de ahorro", grupo: "seguros" },
  { id: "autos", nombre: "Ofrecer seguro de auto", cuando: "A un cliente que aún no tiene auto contigo", grupo: "seguros" },
  { id: "hogar", nombre: "Ofrecer seguro de hogar", cuando: "A un cliente que aún no tiene hogar", grupo: "seguros" },
  { id: "reactivar", nombre: "Reactivar un seguro", cuando: "A un cliente cuyo seguro de ese ramo ya no está vigente", grupo: "seguros" },
  { id: "familiar", nombre: "Preguntar por un familiar", cuando: "Al titular, cuando su cónyuge no tiene seguro de vida", grupo: "familia" },
  { id: "referidos", nombre: "Pedir referidos", cuando: "Después de un pago o una venta, cada 90 días como máximo", grupo: "familia" },
  { id: "revision", nombre: "Revisión de coberturas", cuando: "30 a 60 días antes de que renueve una póliza", grupo: "momentos" },
  { id: "cumple", nombre: "Felicitación de cumpleaños", cuando: "El día de su cumpleaños (o la semana de antes)", grupo: "momentos" },
  { id: "pago", nombre: "Agradecer un pago", cuando: "Hasta 7 días después de que pagó", grupo: "momentos" },
];

export const VARIABLES_CRUZADA: { clave: string; ejemplo: string; descripcion: string }[] = [
  { clave: "saludo", ejemplo: "Hola Myrna", descripcion: "Saludo con el nombre del cliente" },
  { clave: "nombre", ejemplo: "Myrna", descripcion: "Solo el nombre de pila" },
  { clave: "tiene", ejemplo: "tus seguros de auto y hogar", descripcion: "Lo que ya tiene vigente contigo" },
  { clave: "seguro", ejemplo: "un seguro de vida", descripcion: "El seguro que le ofreces" },
  { clave: "tuvo", ejemplo: "tu seguro de auto", descripcion: "El seguro que dejó de estar vigente (para «Reactivar»)" },
  { clave: "poliza", ejemplo: "tu seguro de gastos médicos", descripcion: "La póliza de la que se trata (renovación o pago)" },
  { clave: "fecha", ejemplo: "15 de noviembre", descripcion: "La fecha de renovación de esa póliza" },
  { clave: "familiar", ejemplo: "Ana", descripcion: "El nombre de pila del familiar (para «Preguntar por un familiar»)" },
  { clave: "parentesco", ejemplo: "esposa", descripcion: "Qué es del titular: esposa, esposo, hijo…" },
];

const CLAVES_VALIDAS = new Set(VARIABLES_CRUZADA.map((v) => v.clave));

export function variablesDesconocidasCruzada(texto: string): string[] {
  return [...new Set([...texto.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]).filter((c) => !CLAVES_VALIDAS.has(c)))];
}

export type ResultadoMensajeCruzada = { ok: true; texto: string } | { ok: false; error: string };

export function validarMensajeCruzada(entrada: unknown): ResultadoMensajeCruzada {
  const texto = typeof entrada === "string" ? entrada.trim() : "";
  if (texto.length < 10) return { ok: false, error: "Escribe un mensaje de al menos 10 letras." };
  if (texto.length > 1000) return { ok: false, error: "El mensaje es muy largo (máximo 1,000 letras)." };
  const raras = variablesDesconocidasCruzada(texto);
  if (raras.length) {
    return { ok: false, error: `No conozco ${raras.map((r) => `{${r}}`).join(", ")}. Usa solo: ${VARIABLES_CRUZADA.map((v) => `{${v.clave}}`).join(" ")}.` };
  }
  return { ok: true, texto };
}

export function seguroDe(r: Ramo): string {
  return r === "ahorro" ? "tu plan de ahorro" : `tu seguro de ${NOMBRE_RAMO[r]}`;
}

/** «tu seguro de auto» · «tus seguros de auto y hogar» · «tus seguros de vida, auto y hogar». */
export function textoTiene(tiene: Ramo[]): string {
  if (!tiene.length) return "tus seguros";
  if (tiene.length === 1) return seguroDe(tiene[0]);
  return `tus seguros de ${listaDeRamos(tiene)}`;
}

export interface DatosMensaje {
  nombre: string;
  ramo: Ramo;
  tipo: TipoOportunidad;
  tiene: Ramo[];
  /** La póliza de la que se trata (para los momentos de renovación y pago). */
  polizaRamo?: Ramo | null;
  /** La fecha de renovación (AAAA-MM-DD). */
  fecha?: string | null;
  /** Para las ofertas a un familiar. */
  familiar?: { nombre: string; parentesco: string } | null;
}

/** Rellena una plantilla con los datos del cliente (el saludo cuida mayúsculas y razones sociales, igual que Valeri). */
export function rellenarCruzada(plantilla: string, d: DatosMensaje): string {
  const saludo = saludoPara(d.nombre);
  const valores: Record<string, string> = {
    saludo,
    nombre: saludo.replace(/^Hola,? /, ""),
    tiene: textoTiene(d.tiene),
    seguro: nombreCorto(d.ramo),
    tuvo: seguroDe(d.ramo),
    poliza: d.polizaRamo ? seguroDe(d.polizaRamo) : "tu póliza",
    fecha: d.fecha ? fechaLarga(d.fecha) : "la fecha de tu renovación",
    familiar: d.familiar?.nombre ?? "tu familiar",
    parentesco: d.familiar?.parentesco ?? "familiar",
  };
  return plantilla
    .replace(/\{([^{}]*)\}/g, (todo, clave: string) => (clave in valores ? valores[clave] : todo))
    .replace(/\s+([,.:;!?])/g, "$1")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** La clave del texto que toca: familiar, reactivar si el seguro ya existió, o el del ramo que se ofrece. */
export function claveDe(o: Pick<Oportunidad, "ramo" | "tipo">): ClaveMensaje {
  return o.tipo === "familiar" ? "familiar" : o.tipo === "reactivar" ? "reactivar" : o.ramo;
}

/** El WhatsApp listo para mandar: tu texto si lo personalizaste; si no, el base. */
export function mensajeCruzada(o: Pick<Oportunidad, "nombre" | "ramo" | "tipo" | "tiene" | "familiar">, personalizadas: Partial<Record<ClaveMensaje, string>> = {}): string {
  const clave = claveDe(o);
  return rellenarCruzada(personalizadas[clave] || PLANTILLAS_CRUZADA[clave], { nombre: o.nombre, ramo: o.ramo, tipo: o.tipo, tiene: o.tiene, familiar: o.familiar });
}

/** Liga de WhatsApp al cliente, o null si no tiene un número de 10 dígitos. */
export function ligaWhatsAppCliente(whatsapp: string, texto: string): string | null {
  const n = normWhatsapp(whatsapp);
  return n.length === 10 ? `https://wa.me/52${n}?text=${encodeURIComponent(texto)}` : null;
}

// ----------------------------------------------------------------------------
// Resumen para la cabecera de Camila
// ----------------------------------------------------------------------------

export interface ResumenCruzada {
  clientes: number;
  activos: number;
  paraHoy: number;
  porPrioridad: Record<Prioridad, number>;
  esperando: number;
  seguimiento: number;
  cotizadas: number;
  /** Ofertas en pausa porque se le ofreció otra cosa hace menos de 30 días. */
  pausa: number;
  retenidas: number;
  /** Clientes activos con algún dato importante por completar. */
  porCompletar: number;
}

export function resumenCruzada(entradas: EntradaCliente[], r: ResultadoOportunidades): ResumenCruzada {
  const activos = entradas.filter((e) => esActivo(e.polizas));
  const abiertas = r.lista.filter((o) => o.principal);
  return {
    clientes: entradas.length,
    activos: activos.length,
    paraHoy: paraHoy(r.lista).length,
    porPrioridad: {
      alta: abiertas.filter((o) => o.prioridad === "alta").length,
      media: abiertas.filter((o) => o.prioridad === "media").length,
      baja: abiertas.filter((o) => o.prioridad === "baja").length,
    },
    esperando: r.lista.filter((o) => o.situacion === "esperando").length,
    seguimiento: r.lista.filter((o) => o.situacion === "seguimiento").length,
    cotizadas: r.lista.filter((o) => o.situacion === "cotizada").length,
    pausa: r.lista.filter((o) => o.situacion === "pausa").length,
    retenidas: r.retenidas.length,
    porCompletar: activos.filter((e) => faltantesDe(e).some((f) => f.importancia === "alta")).length,
  };
}

// ----------------------------------------------------------------------------
// Armar los expedientes y validar lo que se captura
// ----------------------------------------------------------------------------

/** Junta, por cliente, sus pólizas de Valeri y del libro de AXA, lo que se le ha ofrecido y si debe algún pago. */
export function armarEntradas(clientes: Cliente[], polizas: Poliza[], libro: LibroPoliza[], estados: EstadoCruzada[], hoy: string): EntradaCliente[] {
  return clientes.map((cliente) => {
    const suyas = polizas.filter((p) => p.cliente_id === cliente.id);
    const deLibro = libro.filter((l) => l.cliente_id === cliente.id);
    const conAdeudo = suyas.some((p) => {
      if (p.estatus_manual === "cancelada") return false;
      const { estado } = estadoDe(p, hoy);
      return estado === "vencida" || estado === "promesa_vencida";
    });
    return {
      cliente,
      polizas: unirPolizas(suyas.map(desdePolizaCobranza), deLibro.map(desdeLibro)),
      estados: estados.filter((e) => e.cliente_id === cliente.id),
      conAdeudo,
    };
  });
}

export const ESTADOS_OFERTA: { id: EstadoOferta; nombre: string }[] = [
  { id: "pendiente", nombre: "Por ofrecer" },
  { id: "ofrecida", nombre: "Ya se lo ofrecí" },
  { id: "cotizada", nombre: "Le cotizo" },
  { id: "cerrada", nombre: "Lo contrató" },
  { id: "no_interesa", nombre: "No le interesa" },
];

export interface DatosEstado {
  ramo: Ramo;
  estado: EstadoOferta;
  volver_a_ofrecer: string | null;
  nota: string;
}

export type ResultadoEstado = { ok: true; datos: DatosEstado } | { ok: false; error: string };

export function validarEstado(entrada: unknown, hoy: string): ResultadoEstado {
  const e = (entrada ?? {}) as Record<string, unknown>;
  if (!esRamo(e.ramo)) return { ok: false, error: "Elige el seguro." };
  const estado = ESTADOS_OFERTA.find((x) => x.id === e.estado)?.id;
  if (!estado) return { ok: false, error: "Elige cómo va la oferta." };
  const volver = typeof e.volver_a_ofrecer === "string" && e.volver_a_ofrecer ? e.volver_a_ofrecer.slice(0, 10) : null;
  if (volver !== null && (!esFechaValida(volver) || volver < hoy)) return { ok: false, error: "Elige la fecha en que quieres volver a escribirle (de hoy en adelante)." };
  const nota = typeof e.nota === "string" ? e.nota.trim() : "";
  if (nota.length > 500) return { ok: false, error: "La nota es muy larga (máximo 500 letras)." };
  return { ok: true, datos: { ramo: e.ramo, estado, volver_a_ofrecer: volver, nota } };
}

export type ResultadoCliente = { ok: true; datos: DatosCliente } | { ok: false; error: string };

const GENEROS: Genero[] = ["mujer", "hombre", "prefiero_no_decir"];

/** Valida lo que se captura de un cliente. Lo vacío se acepta (se va completando con el tiempo) salvo el nombre. */
export function validarCliente(entrada: unknown, hoy: string): ResultadoCliente {
  const e = (entrada ?? {}) as Record<string, unknown>;
  const nombre = typeof e.nombre === "string" ? e.nombre.trim().replace(/\s+/g, " ") : "";
  if (nombre.length < 2) return { ok: false, error: "Escribe el nombre del cliente." };
  if (nombre.length > 160) return { ok: false, error: "El nombre es muy largo (máximo 160 letras)." };
  const tipo = e.tipo === "empresa" ? "empresa" : "persona";

  const whatsapp = normWhatsapp(typeof e.whatsapp === "string" ? e.whatsapp : "");
  if (whatsapp && whatsapp.length !== 10) return { ok: false, error: "El WhatsApp debe ser de 10 dígitos." };

  const correo = normCorreo(typeof e.correo === "string" ? e.correo : "");
  if (correo && (correo.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))) return { ok: false, error: "Revisa el correo: parece incompleto." };

  const nac = typeof e.fecha_nacimiento === "string" && e.fecha_nacimiento ? e.fecha_nacimiento.slice(0, 10) : null;
  if (nac !== null && (!esFechaValida(nac) || nac < "1900-01-01" || nac > hoy)) return { ok: false, error: "Revisa la fecha de nacimiento." };

  const genero = GENEROS.find((g) => g === e.genero) ?? null;

  const cp = normCodigoPostal(typeof e.codigo_postal === "string" ? e.codigo_postal : "");
  if (cp && cp.length !== 5) return { ok: false, error: "El código postal debe ser de 5 dígitos." };

  const notas = typeof e.notas === "string" ? e.notas.trim() : "";
  if (notas.length > 1000) return { ok: false, error: "Las notas son muy largas (máximo 1,000 letras)." };

  return {
    ok: true,
    datos: { nombre, tipo, whatsapp, correo, fecha_nacimiento: nac, genero, codigo_postal: cp || null, no_ofrecer: e.no_ofrecer === true, notas },
  };
}

/**
 * Lo que queda guardado al cambiar cómo va una oferta. «Ya se lo ofrecí» marca la fecha de hoy (de ahí cuentan los días de espera);
 * «Por ofrecer» la borra (deshacer); «Le cotizo», «Lo contrató» y «No le interesa» conservan la que ya había.
 */
export function siguienteEstado(
  previo: Pick<EstadoCruzada, "ofrecida_en"> | null,
  d: DatosEstado,
  ahora: string,
): Pick<EstadoCruzada, "estado" | "ofrecida_en" | "volver_a_ofrecer" | "nota"> {
  const ofrecida_en = d.estado === "ofrecida" ? ahora : d.estado === "pendiente" ? null : (previo?.ofrecida_en ?? (d.estado === "cotizada" ? ahora : null));
  return { estado: d.estado, ofrecida_en, volver_a_ofrecer: d.estado === "pendiente" ? null : d.volver_a_ofrecer, nota: d.nota };
}

/** Todo lo que la pantalla de Camila recibe del servidor. */
export interface DatosCamila {
  clientes: Cliente[];
  polizas: Poliza[];
  libro: LibroPoliza[];
  estados: EstadoCruzada[];
  mensajes: Partial<Record<ClaveMensaje, string>>;
  /** Momentos de confianza que ya atendiste (para que no se repitan). */
  momentos: MomentoHecho[];
}
