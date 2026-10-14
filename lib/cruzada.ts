import "server-only";

/**
 * Camila, venta cruzada — SOLO SERVIDOR (mismo patrón que lib/seguimiento-mensajes.ts y lib/cobranza.ts).
 *  - NUBE: tablas cruzada_estado (qué se le ofreció a cada cliente), cruzada_mensajes (tus textos) y cruzada_momentos
 *    (momentos de confianza ya atendidos).
 *  - DEMO: memoria.
 */
import { adminDb, cloudReady } from "./supabase-admin";
import { errorDeCruzada, ligarLead, listarClientes, listarLibro, obtenerCliente, traerTodo } from "./clientes";
import { listarPolizas } from "./cobranza";
import { actualizarLead, crearLeadManual, getLead, listLeads } from "./db";
import { MigracionPendienteError } from "./migracion";
import { esRamo } from "./ramos";
import { normCorreo, normWhatsapp } from "./normalize";
import { esClaveMensaje, siguienteEstado, type ClaveMensaje, type DatosCamila, type DatosEstado } from "./cruzada-reglas";
import type { EstadoCruzada, EstadoOferta, MomentoHecho, Ramo } from "./types";

const ESTADOS: EstadoOferta[] = ["pendiente", "ofrecida", "cotizada", "cerrada", "no_interesa"];

function normalizarEstado(f: Record<string, unknown>): EstadoCruzada {
  return {
    cliente_id: String(f.cliente_id),
    ramo: esRamo(f.ramo) ? f.ramo : "vida",
    estado: ESTADOS.find((e) => e === f.estado) ?? "pendiente",
    lead_id: f.lead_id ? String(f.lead_id) : null,
    ofrecida_en: f.ofrecida_en ? String(f.ofrecida_en) : null,
    volver_a_ofrecer: f.volver_a_ofrecer ? String(f.volver_a_ofrecer).slice(0, 10) : null,
    nota: String(f.nota ?? ""),
    actualizado_en: String(f.actualizado_en ?? ""),
  };
}

const g = globalThis as unknown as {
  __acmCruzada?: { estados: EstadoCruzada[]; mensajes: Partial<Record<ClaveMensaje, string>>; momentos: MomentoHecho[] };
};
function demo() {
  return (g.__acmCruzada ??= { estados: [], mensajes: {}, momentos: [] });
}

// ----------------------------------------------------------------------------
// Qué se le ha ofrecido a cada cliente
// ----------------------------------------------------------------------------

export async function listarEstados(): Promise<EstadoCruzada[]> {
  if (cloudReady && adminDb) return (await traerTodo("cruzada_estado", "actualizado_en")).map(normalizarEstado);
  return demo().estados.map((e) => ({ ...e }));
}

/**
 * Guarda cómo va una oferta. `lead_id` (opcional) anota el prospecto de Cotizaciones que lleva esa venta; si no se manda, se conserva
 * el que ya tenía (y sin el SQL 0017 ni siquiera se toca esa columna, para que lo de siempre siga funcionando).
 */
export async function guardarEstado(cliente_id: string, d: DatosEstado, lead_id?: string | null): Promise<EstadoCruzada> {
  const ahora = new Date().toISOString();
  if (cloudReady && adminDb) {
    const { data: previoFila, error: e1 } = await adminDb.from("cruzada_estado").select("*").eq("cliente_id", cliente_id).eq("ramo", d.ramo).limit(1);
    if (e1) throw errorDeCruzada(e1);
    const previo = previoFila?.[0] ? normalizarEstado(previoFila[0] as Record<string, unknown>) : null;
    const fila = {
      cliente_id,
      ramo: d.ramo,
      ...siguienteEstado(previo, d, ahora),
      ...(lead_id !== undefined ? { lead_id } : {}),
      actualizado_en: ahora,
    };
    const { data, error } = await adminDb.from("cruzada_estado").upsert(fila, { onConflict: "cliente_id,ramo" }).select("*").limit(1);
    if (error) throw errorDeCruzada(error);
    return normalizarEstado((data?.[0] ?? fila) as Record<string, unknown>);
  }
  const lista = demo().estados;
  const i = lista.findIndex((e) => e.cliente_id === cliente_id && e.ramo === d.ramo);
  const previo = i >= 0 ? lista[i] : null;
  const nuevo: EstadoCruzada = {
    cliente_id,
    ramo: d.ramo,
    ...siguienteEstado(previo, d, ahora),
    lead_id: lead_id !== undefined ? lead_id : (previo?.lead_id ?? null),
    actualizado_en: ahora,
  };
  if (i >= 0) lista[i] = nuevo;
  else lista.push(nuevo);
  return nuevo;
}

// ----------------------------------------------------------------------------
// Momentos de confianza ya atendidos
// ----------------------------------------------------------------------------

export async function listarMomentos(): Promise<MomentoHecho[]> {
  if (cloudReady && adminDb) {
    try {
      const filas = await traerTodo("cruzada_momentos", "hecho_en");
      return filas.map((f) => ({ cliente_id: String(f.cliente_id), clave: String(f.clave), hecho_en: String(f.hecho_en ?? "") }));
    } catch (e) {
      // Sin el SQL 0017 todavía no hay momentos atendidos: Camila sigue, y los muestra todos.
      if (e instanceof MigracionPendienteError) return [];
      throw e;
    }
  }
  return demo().momentos.map((m) => ({ ...m }));
}

export async function marcarMomento(cliente_id: string, clave: string): Promise<void> {
  const hecho_en = new Date().toISOString();
  if (cloudReady && adminDb) {
    const { error } = await adminDb.from("cruzada_momentos").upsert({ cliente_id, clave, hecho_en }, { onConflict: "cliente_id,clave" });
    if (error) throw errorDeCruzada(error);
    return;
  }
  const lista = demo().momentos;
  const i = lista.findIndex((m) => m.cliente_id === cliente_id && m.clave === clave);
  if (i >= 0) lista[i] = { cliente_id, clave, hecho_en };
  else lista.push({ cliente_id, clave, hecho_en });
}

// ----------------------------------------------------------------------------
// Tus textos de WhatsApp
// ----------------------------------------------------------------------------

export async function listarMensajesCruzada(): Promise<Partial<Record<ClaveMensaje, string>>> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from("cruzada_mensajes").select("clave, texto");
    if (error) throw errorDeCruzada(error);
    const salida: Partial<Record<ClaveMensaje, string>> = {};
    for (const f of data ?? []) if (esClaveMensaje(f.clave)) salida[f.clave] = String(f.texto);
    return salida;
  }
  return { ...demo().mensajes };
}

/** Guarda tu texto; con texto null borra tu versión y vuelve al texto base. */
export async function guardarMensajeCruzada(clave: ClaveMensaje, texto: string | null): Promise<void> {
  if (cloudReady && adminDb) {
    const { error } =
      texto === null
        ? await adminDb.from("cruzada_mensajes").delete().eq("clave", clave)
        : await adminDb.from("cruzada_mensajes").upsert({ clave, texto, actualizado_en: new Date().toISOString() }, { onConflict: "clave" });
    if (error) throw errorDeCruzada(error);
    return;
  }
  if (texto === null) delete demo().mensajes[clave];
  else demo().mensajes[clave] = texto;
}

// ----------------------------------------------------------------------------
// Todo lo que Camila necesita para pintar su pantalla
// ----------------------------------------------------------------------------

export async function datosCamila(): Promise<DatosCamila> {
  const [clientes, polizas, libro, estados, mensajes, momentos] = await Promise.all([
    listarClientes(),
    listarPolizas(),
    listarLibro(true),
    listarEstados(),
    listarMensajesCruzada(),
    listarMomentos(),
  ]);
  return { clientes, polizas, libro, estados, mensajes, momentos };
}

// ----------------------------------------------------------------------------
// Cotizar otro seguro a un cliente
// ----------------------------------------------------------------------------

export type ResultadoCotizar = { ok: true; lead_id: string; creado: boolean } | { ok: false; error: string; noExiste?: boolean };

/**
 * Cotizaciones trabaja con un prospecto: se usa el que ya tiene el cliente, o el que coincide por WhatsApp o correo,
 * y si no existe se crea uno nuevo («Cliente actual») con el seguro que se le va a cotizar.
 * (El CRM guarda UN prospecto por persona: por eso no se crea un segundo para otro seguro.)
 */
export async function leadParaCotizar(cliente_id: string, ramo: Ramo, autor: string): Promise<ResultadoCotizar> {
  const cliente = await obtenerCliente(cliente_id);
  if (!cliente) return { ok: false, error: "Ese cliente ya no existe.", noExiste: true };
  if (cliente.lead_id && (await getLead(cliente.lead_id))) return { ok: true, lead_id: cliente.lead_id, creado: false };

  const w = normWhatsapp(cliente.whatsapp);
  const c = normCorreo(cliente.correo);
  const leads = await listLeads();
  const hallado = leads.find((l) => (w !== "" && normWhatsapp(l.whatsapp) === w) || (c !== "" && normCorreo(l.correo) === c));
  if (hallado) {
    await ligarLead(cliente.id, hallado.id);
    return { ok: true, lead_id: hallado.id, creado: false };
  }

  const r = await crearLeadManual(
    { nombre: cliente.nombre, whatsapp: w, correo: c, etapa: "nuevo", ramo, valor: 0, origen: "Cliente actual", notas: "Venta cruzada: se le cotiza otro seguro (Camila)." },
    autor,
    null,
  );
  if (!r.ok || !r.id) {
    const motivo = r.errores ? Object.values(r.errores)[0] : "No se pudo preparar la cotización.";
    return { ok: false, error: `Para cotizarle, completa antes sus datos: ${motivo}` };
  }
  await ligarLead(cliente.id, r.id);
  return { ok: true, lead_id: r.id, creado: !r.duplicado };
}

// ----------------------------------------------------------------------------
// Registrar la venta («Lo contrató») y cerrar lo que quedó abierto
// ----------------------------------------------------------------------------

export type ResultadoVenta =
  | { ok: true; estado: EstadoCruzada; /** true = el prospecto pasó a «Cliente ganado» y cuenta en tu meta por él */ porProspecto: boolean; lead_id: string | null }
  | { ok: false; error: string; noExiste?: boolean };

/**
 * «Lo contrató»: marca la oferta como cerrada. Si el cliente tiene un prospecto abierto (el de la cotización), lo pasa a «Cliente ganado»
 * con ese ramo y así suma a tu meta. Si su prospecto ya estaba ganado por una venta anterior (el CRM guarda uno por persona) no se toca:
 * esta venta se suma a la meta desde el registro de la oferta cerrada, así no se pierde ninguna ni cuenta dos veces.
 */
export async function venderCruzada(cliente_id: string, ramo: Ramo, autor: string): Promise<ResultadoVenta> {
  const cliente = await obtenerCliente(cliente_id);
  if (!cliente) return { ok: false, error: "Ese cliente ya no existe.", noExiste: true };
  const previo = (await listarEstados()).find((e) => e.cliente_id === cliente_id && e.ramo === ramo) ?? null;
  const leadId = previo?.lead_id ?? cliente.lead_id;
  const lead = leadId ? await getLead(leadId) : null;

  let porProspecto = false;
  if (lead && lead.etapa !== "ganado" && (!lead.ramo || lead.ramo === ramo)) {
    await actualizarLead(lead.id, { etapa: "ganado", ramo }, autor);
    porProspecto = true;
  }
  const estado = await guardarEstado(cliente_id, { ramo, estado: "cerrada", volver_a_ofrecer: null, nota: "" }, lead?.id ?? null);
  return { ok: true, estado, porProspecto, lead_id: lead?.id ?? null };
}

/**
 * «No le interesa»: si la cotización dejó un prospecto abierto creado por Camila («Cliente actual»), pasa a «Perdido» para que Sofi no
 * siga persiguiéndolo (queda en Perdidos, donde puedes volver a ofrecerle algo). Los prospectos que tú trabajabas aparte no se tocan.
 */
export async function cerrarProspectoDeOferta(cliente_id: string, ramo: Ramo, autor: string): Promise<void> {
  const previo = (await listarEstados()).find((e) => e.cliente_id === cliente_id && e.ramo === ramo);
  if (!previo?.lead_id) return;
  const lead = await getLead(previo.lead_id);
  if (lead && lead.origen === "Cliente actual" && lead.etapa !== "ganado" && lead.etapa !== "perdido") {
    await actualizarLead(lead.id, { etapa: "perdido" }, autor);
  }
}
