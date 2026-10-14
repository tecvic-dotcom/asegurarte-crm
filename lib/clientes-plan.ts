/**
 * Arma el plan para juntar cada póliza con su cliente (el «expediente único») — puro, sin tocar la base.
 *
 * Quien lo usa (el botón «Armar expedientes» y el importador de tus reportes de AXA) recibe un plan y lo aplica:
 *  · pólizas de Valeri y del libro de AXA que son de un cliente que ya existe → se ligan a él;
 *  · las que no → se agrupan por nombre (aunque AXA lo escriba en otro orden o lo corte) y de cada grupo sale un cliente nuevo;
 *  · de tus prospectos ganados se completan los datos que falten (WhatsApp, nacimiento…), sin pisar nada de lo que ya tenías.
 */
import { agruparPorNombre, capitalizarNombre, esEmpresa, estaCortado, mismoNombre, nombrePrimero, tokensDeNombre } from "./clientes-agrupar";
import { normCorreo, normCodigoPostal, normWhatsapp } from "./normalize";
import type { Genero, TipoCliente } from "./types";

export interface ClienteParaPlan {
  id: string;
  nombre: string;
  whatsapp: string;
  correo: string;
  fecha_nacimiento: string | null;
  genero: Genero | null;
  codigo_postal: string | null;
  lead_id: string | null;
}

export interface PolizaParaPlan {
  id: string;
  asegurado: string;
  whatsapp: string;
  correo: string;
  lead_id: string | null;
  cliente_id: string | null;
}

export interface LibroParaPlan {
  numero: string;
  asegurado: string;
  /** AXA escribe el nombre como «APELLIDOS NOMBRES» en el reporte de Salud. */
  apellidosPrimero: boolean;
  vigente: boolean;
  cliente_id: string | null;
}

export interface LeadParaPlan {
  id: string;
  nombre: string;
  whatsapp: string;
  correo: string;
  etapa: string;
  fecha_nacimiento: string | null;
  genero: Genero | null;
  codigo_postal: string | null;
}

export interface EntradaPlan {
  clientes: ClienteParaPlan[];
  polizas: PolizaParaPlan[];
  libro: LibroParaPlan[];
  leads: LeadParaPlan[];
}

export interface OpcionesPlan {
  /** Crear clientes a partir del libro de AXA (solo personas con alguna póliza vigente). */
  crearDesdeLibro: boolean;
}

export interface ClienteNuevo {
  /** Identificador temporal («nuevo:0») al que apuntan las pólizas y el libro del plan. */
  clave: string;
  nombre: string;
  tipo: TipoCliente;
  whatsapp: string;
  correo: string;
  fecha_nacimiento: string | null;
  genero: Genero | null;
  codigo_postal: string | null;
  lead_id: string | null;
}

export interface CompletarCliente {
  id: string;
  cambios: Partial<Pick<ClienteParaPlan, "whatsapp" | "correo" | "fecha_nacimiento" | "genero" | "codigo_postal" | "lead_id">>;
}

export interface PorRevisar {
  nombre: string;
  /** Las distintas formas en que venía escrito, para que lo confirmes con tus propios ojos. */
  variantes: string[];
  motivo: "unido" | "nombre_cortado";
}

export interface PlanClientes {
  nuevos: ClienteNuevo[];
  completar: CompletarCliente[];
  /** `cliente` es el id de un cliente que ya existe o la `clave` de uno nuevo. */
  polizas: { id: string; cliente: string }[];
  libro: { numero: string; cliente: string }[];
  porRevisar: PorRevisar[];
}

interface Elemento {
  tipo: "poliza" | "libro";
  nombre: string;
  /** Nombre en el orden de siempre (nombres primero), para mostrar. */
  paraMostrar: string;
  prioridad: number;
  vigente: boolean;
  poliza?: PolizaParaPlan;
  libro?: LibroParaPlan;
}

function whatsappBueno(w: string): string {
  const n = normWhatsapp(w);
  return n.length === 10 ? n : "";
}

function mismoWhatsapp(a: string, b: string): boolean {
  const x = whatsappBueno(a);
  return x !== "" && x === whatsappBueno(b);
}

/** El lead de este cliente: el que ya tiene ligado, el de su póliza, o el ganado con el mismo WhatsApp, correo o nombre. */
function leadDe(
  c: { nombre: string; whatsapp: string; correo: string; lead_id: string | null },
  leadsPoliza: string[],
  leads: LeadParaPlan[],
): LeadParaPlan | null {
  const porId = (id: string | null | undefined) => (id ? leads.find((l) => l.id === id) ?? null : null);
  const ligado = porId(c.lead_id) ?? leadsPoliza.map(porId).find(Boolean) ?? null;
  if (ligado) return ligado;
  const ganados = leads.filter((l) => l.etapa === "ganado");
  return (
    ganados.find((l) => mismoWhatsapp(l.whatsapp, c.whatsapp)) ??
    ganados.find((l) => normCorreo(c.correo) !== "" && normCorreo(l.correo) === normCorreo(c.correo)) ??
    ganados.find((l) => mismoNombre(l.nombre, c.nombre)) ??
    null
  );
}

function nombreDeMostrar(e: Elemento): string {
  return e.paraMostrar === e.paraMostrar.toUpperCase() ? capitalizarNombre(e.paraMostrar) : e.paraMostrar;
}

export function planearClientes(entrada: EntradaPlan, opciones: OpcionesPlan): PlanClientes {
  const { clientes, polizas, libro, leads } = entrada;
  const plan: PlanClientes = { nuevos: [], completar: [], polizas: [], libro: [], porRevisar: [] };

  // 1) Todo lo que todavía no tiene cliente.
  const pendientes: Elemento[] = [
    ...polizas
      .filter((p) => !p.cliente_id && p.asegurado.trim().length >= 2)
      .map((p): Elemento => ({ tipo: "poliza", nombre: p.asegurado, paraMostrar: p.asegurado.trim(), prioridad: 2, vigente: true, poliza: p })),
    ...libro
      .filter((l) => !l.cliente_id && l.asegurado.trim().length >= 2)
      .map(
        (l): Elemento => ({
          tipo: "libro",
          nombre: l.asegurado,
          paraMostrar: l.apellidosPrimero ? nombrePrimero(l.asegurado) : l.asegurado.trim(),
          prioridad: 1,
          vigente: l.vigente,
          libro: l,
        }),
      ),
  ];

  // 2) Los que son de un cliente que ya existe se ligan a él.
  const sinCliente: Elemento[] = [];
  for (const e of pendientes) {
    const dueno = clientes.find((c) => mismoNombre(c.nombre, e.nombre));
    if (!dueno) {
      sinCliente.push(e);
      continue;
    }
    if (e.poliza) plan.polizas.push({ id: e.poliza.id, cliente: dueno.id });
    if (e.libro) plan.libro.push({ numero: e.libro.numero, cliente: dueno.id });
  }

  // 3) El resto se agrupa por nombre: cada grupo con una póliza de Valeri (o, si lo pides, con una póliza vigente del libro) es un cliente nuevo.
  for (const grupo of agruparPorNombre(sinCliente, (e) => e.nombre)) {
    const conValeri = grupo.some((e) => e.tipo === "poliza");
    const conVigenteLibro = grupo.some((e) => e.tipo === "libro" && e.vigente);
    if (!conValeri && !(opciones.crearDesdeLibro && conVigenteLibro)) continue;

    // El mejor nombre: el que AXA no cortó, de preferencia el que escribiste tú en Valeri.
    const mejor = [...grupo].sort(
      (a, b) => Number(estaCortado(a.nombre)) - Number(estaCortado(b.nombre)) || b.prioridad - a.prioridad || b.nombre.trim().length - a.nombre.trim().length,
    )[0];
    const nombre = nombreDeMostrar(mejor);
    const clave = `nuevo:${plan.nuevos.length}`;
    const dePoliza = grupo.filter((e) => e.poliza).map((e) => e.poliza!);
    const nuevo: ClienteNuevo = {
      clave,
      nombre,
      tipo: esEmpresa(nombre) ? "empresa" : "persona",
      whatsapp: dePoliza.map((p) => whatsappBueno(p.whatsapp)).find(Boolean) ?? "",
      correo: dePoliza.map((p) => normCorreo(p.correo)).find(Boolean) ?? "",
      fecha_nacimiento: null,
      genero: null,
      codigo_postal: null,
      lead_id: null,
    };
    const lead = leadDe({ nombre, whatsapp: nuevo.whatsapp, correo: nuevo.correo, lead_id: null }, dePoliza.map((p) => p.lead_id ?? "").filter(Boolean), leads);
    if (lead) {
      nuevo.lead_id = lead.id;
      nuevo.whatsapp ||= whatsappBueno(lead.whatsapp);
      nuevo.correo ||= normCorreo(lead.correo);
      nuevo.fecha_nacimiento = lead.fecha_nacimiento;
      nuevo.genero = lead.genero;
      nuevo.codigo_postal = lead.codigo_postal ? normCodigoPostal(lead.codigo_postal) || null : null;
    }
    plan.nuevos.push(nuevo);
    for (const e of grupo) {
      if (e.poliza) plan.polizas.push({ id: e.poliza.id, cliente: clave });
      if (e.libro) plan.libro.push({ numero: e.libro.numero, cliente: clave });
    }

    // Para que lo confirmes: nombres distintos que se juntaron, o nombres que AXA cortó y no se pudieron completar.
    const formas = new Map<string, string>();
    for (const e of grupo) formas.set(tokensDeNombre(e.nombre).sort().join(" "), e.nombre.trim());
    if (formas.size >= 2) plan.porRevisar.push({ nombre, variantes: [...formas.values()], motivo: "unido" });
    else if (estaCortado(mejor.nombre) && mejor.tipo === "libro") plan.porRevisar.push({ nombre, variantes: [mejor.nombre.trim()], motivo: "nombre_cortado" });
  }

  // 4) A los clientes que ya existían se les completa lo que les falte con los datos de su prospecto ganado (nunca se pisa nada).
  for (const c of clientes) {
    const lead = leadDe(c, polizas.filter((p) => p.cliente_id === c.id).map((p) => p.lead_id ?? "").filter(Boolean), leads);
    if (!lead) continue;
    const cambios: CompletarCliente["cambios"] = {};
    if (!c.lead_id) cambios.lead_id = lead.id;
    if (!c.whatsapp && whatsappBueno(lead.whatsapp)) cambios.whatsapp = whatsappBueno(lead.whatsapp);
    if (!c.correo && normCorreo(lead.correo)) cambios.correo = normCorreo(lead.correo);
    if (!c.fecha_nacimiento && lead.fecha_nacimiento) cambios.fecha_nacimiento = lead.fecha_nacimiento;
    if (!c.genero && lead.genero) cambios.genero = lead.genero;
    if (!c.codigo_postal && lead.codigo_postal && normCodigoPostal(lead.codigo_postal).length === 5) cambios.codigo_postal = normCodigoPostal(lead.codigo_postal);
    if (Object.keys(cambios).length) plan.completar.push({ id: c.id, cambios });
  }
  return plan;
}

/** Lo que se hizo al aplicar un plan (para contárselo a Roberto). */
export interface ResultadoSincronizar {
  clientesNuevos: number;
  polizasLigadas: number;
  libroLigado: number;
  completados: number;
  porRevisar: PorRevisar[];
}
