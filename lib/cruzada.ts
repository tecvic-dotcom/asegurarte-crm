import "server-only";

/**
 * Camila, venta cruzada — SOLO SERVIDOR (mismo patrón que lib/seguimiento-mensajes.ts y lib/cobranza.ts).
 *  - NUBE: tablas cruzada_estado (qué se le ofreció a cada cliente) y cruzada_mensajes (tus textos).
 *  - DEMO: memoria.
 */
import { adminDb, cloudReady } from "./supabase-admin";
import { errorDeCruzada, ligarLead, listarClientes, listarLibro, obtenerCliente, traerTodo } from "./clientes";
import { listarPolizas } from "./cobranza";
import { crearLeadManual, getLead, listLeads } from "./db";
import { esRamo } from "./ramos";
import { normCorreo, normWhatsapp } from "./normalize";
import { siguienteEstado, type ClaveMensaje, type DatosCamila, type DatosEstado } from "./cruzada-reglas";
import type { EstadoCruzada, EstadoOferta, Ramo } from "./types";

const ESTADOS: EstadoOferta[] = ["pendiente", "ofrecida", "cotizada", "cerrada", "no_interesa"];

function normalizarEstado(f: Record<string, unknown>): EstadoCruzada {
  return {
    cliente_id: String(f.cliente_id),
    ramo: esRamo(f.ramo) ? f.ramo : "vida",
    estado: ESTADOS.find((e) => e === f.estado) ?? "pendiente",
    ofrecida_en: f.ofrecida_en ? String(f.ofrecida_en) : null,
    volver_a_ofrecer: f.volver_a_ofrecer ? String(f.volver_a_ofrecer).slice(0, 10) : null,
    nota: String(f.nota ?? ""),
    actualizado_en: String(f.actualizado_en ?? ""),
  };
}

const g = globalThis as unknown as { __acmCruzada?: { estados: EstadoCruzada[]; mensajes: Partial<Record<ClaveMensaje, string>> } };
function demo() {
  return (g.__acmCruzada ??= { estados: [], mensajes: {} });
}

// ----------------------------------------------------------------------------
// Qué se le ha ofrecido a cada cliente
// ----------------------------------------------------------------------------

export async function listarEstados(): Promise<EstadoCruzada[]> {
  if (cloudReady && adminDb) return (await traerTodo("cruzada_estado", "actualizado_en")).map(normalizarEstado);
  return demo().estados.map((e) => ({ ...e }));
}

export async function guardarEstado(cliente_id: string, d: DatosEstado): Promise<EstadoCruzada> {
  const ahora = new Date().toISOString();
  if (cloudReady && adminDb) {
    const { data: previoFila, error: e1 } = await adminDb.from("cruzada_estado").select("*").eq("cliente_id", cliente_id).eq("ramo", d.ramo).limit(1);
    if (e1) throw errorDeCruzada(e1);
    const previo = previoFila?.[0] ? normalizarEstado(previoFila[0] as Record<string, unknown>) : null;
    const fila = { cliente_id, ramo: d.ramo, ...siguienteEstado(previo, d, ahora), actualizado_en: ahora };
    const { data, error } = await adminDb.from("cruzada_estado").upsert(fila, { onConflict: "cliente_id,ramo" }).select("*").limit(1);
    if (error) throw errorDeCruzada(error);
    return normalizarEstado((data?.[0] ?? fila) as Record<string, unknown>);
  }
  const lista = demo().estados;
  const i = lista.findIndex((e) => e.cliente_id === cliente_id && e.ramo === d.ramo);
  const nuevo: EstadoCruzada = { cliente_id, ramo: d.ramo, ...siguienteEstado(i >= 0 ? lista[i] : null, d, ahora), actualizado_en: ahora };
  if (i >= 0) lista[i] = nuevo;
  else lista.push(nuevo);
  return nuevo;
}

// ----------------------------------------------------------------------------
// Tus textos de WhatsApp
// ----------------------------------------------------------------------------

export async function listarMensajesCruzada(): Promise<Partial<Record<ClaveMensaje, string>>> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from("cruzada_mensajes").select("clave, texto");
    if (error) throw errorDeCruzada(error);
    const salida: Partial<Record<ClaveMensaje, string>> = {};
    for (const f of data ?? []) if (f.clave === "reactivar" || esRamo(f.clave)) salida[f.clave as ClaveMensaje] = String(f.texto);
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
  const [clientes, polizas, libro, estados, mensajes] = await Promise.all([listarClientes(), listarPolizas(), listarLibro(true), listarEstados(), listarMensajesCruzada()]);
  return { clientes, polizas, libro, estados, mensajes };
}

// ----------------------------------------------------------------------------
// Cotizar otro seguro a un cliente
// ----------------------------------------------------------------------------

export type ResultadoCotizar = { ok: true; lead_id: string; creado: boolean } | { ok: false; error: string; noExiste?: boolean };

/**
 * Cotizaciones trabaja con un prospecto: se usa el que ya tiene el cliente, o el que coincide por WhatsApp o correo,
 * y si no existe se crea uno nuevo («Cliente actual») con el seguro que se le va a cotizar.
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
    { nombre: cliente.nombre, whatsapp: w, correo: c, etapa: "contactado", ramo, valor: 0, origen: "Cliente actual", notas: "Venta cruzada: se le cotiza otro seguro (Camila)." },
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
