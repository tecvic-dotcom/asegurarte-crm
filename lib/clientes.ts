import "server-only";

/**
 * Expediente único del cliente — SOLO SERVIDOR.
 *
 * Mismo patrón que lib/cobranza.ts:
 *  - NUBE (Supabase: tablas clientes y libro_axa) si hay secret key.
 *  - DEMO (memoria) con clientes y pólizas de AXA INVENTADOS para practicar.
 *
 * Un cliente junta todas sus pólizas: las de la cobranza de Valeri y las que se conocen por tus reportes de AXA (libro_axa).
 */
import { randomUUID } from "node:crypto";
import { adminDb, cloudReady } from "./supabase-admin";
import { faltaMigracion, MENSAJE_MIGRACION_CRUZADA, MENSAJE_MIGRACION_CRUZADA_2, MigracionPendienteError } from "./migracion";
import { esParentesco, type DatosFamiliar } from "./cruzada-familia";
import { esRamo } from "./ramos";
import { esFechaValida, hoyLocal, sumarDias } from "./fechas";
import { listarPolizas, ligarPolizasACliente } from "./cobranza";
import { listLeads } from "./db";
import { planearClientes, type PlanClientes, type ResultadoSincronizar } from "./clientes-plan";
import type { Cliente, DatosCliente, Genero, LibroPoliza, Poliza } from "./types";

/** Lo que trajo la segunda parte (SQL 0017): si lo que falta es eso, se pide el archivo 0017 y no el 0016. */
const DE_LA_SEGUNDA_PARTE = /titular_id|parentesco|referidos_pedidos_en|cruzada_estado\.lead_id|cruzada_momentos/;

export function errorDeCruzada(error: { code?: string; message: string }): Error {
  if (!faltaMigracion(error)) return new Error(error.message);
  return DE_LA_SEGUNDA_PARTE.test(error.message)
    ? new MigracionPendienteError(MENSAJE_MIGRACION_CRUZADA_2, "0017_venta_cruzada_2.sql")
    : new MigracionPendienteError(MENSAJE_MIGRACION_CRUZADA, "0016_venta_cruzada.sql");
}

function fecha(v: unknown): string | null {
  const f = String(v ?? "").slice(0, 10);
  return esFechaValida(f) ? f : null;
}

const GENEROS: Genero[] = ["mujer", "hombre", "prefiero_no_decir"];

function normalizarCliente(f: Record<string, unknown>): Cliente {
  return {
    id: String(f.id),
    nombre: String(f.nombre ?? ""),
    tipo: f.tipo === "empresa" ? "empresa" : "persona",
    whatsapp: String(f.whatsapp ?? ""),
    correo: String(f.correo ?? ""),
    fecha_nacimiento: fecha(f.fecha_nacimiento),
    genero: GENEROS.find((g) => g === f.genero) ?? null,
    codigo_postal: f.codigo_postal ? String(f.codigo_postal) : null,
    lead_id: f.lead_id ? String(f.lead_id) : null,
    no_ofrecer: f.no_ofrecer === true,
    notas: String(f.notas ?? ""),
    titular_id: f.titular_id ? String(f.titular_id) : null,
    parentesco: esParentesco(f.parentesco) ? f.parentesco : null,
    referidos_pedidos_en: f.referidos_pedidos_en ? String(f.referidos_pedidos_en) : null,
    creado_en: String(f.creado_en ?? ""),
    actualizado_en: String(f.actualizado_en ?? ""),
  };
}

function normalizarLibro(f: Record<string, unknown>): LibroPoliza {
  return {
    numero: String(f.numero ?? ""),
    cliente_id: f.cliente_id ? String(f.cliente_id) : null,
    asegurado: String(f.asegurado ?? ""),
    ramo: esRamo(f.ramo) ? f.ramo : "vida",
    subramo: String(f.subramo ?? ""),
    aseguradora: String(f.aseguradora ?? "AXA"),
    inicio_vigencia: fecha(f.inicio_vigencia),
    ultimo_pago: fecha(f.ultimo_pago),
    renovacion: fecha(f.renovacion),
    pagos_12m: Number(f.pagos_12m) || 0,
    prima_ultima: Number(f.prima_ultima) || 0,
    vigente: f.vigente !== false,
    fuente: String(f.fuente ?? ""),
  };
}

// ----------------------------------------------------------------------------
// Almacén DEMO — todo INVENTADO, con nombres que coinciden con las pólizas de muestra de Valeri.
// ----------------------------------------------------------------------------

interface StoreClientes {
  clientes: Cliente[];
  libro: LibroPoliza[];
}

function semilla(): StoreClientes {
  const hoy = hoyLocal();
  const l = (numero: string, asegurado: string, ramo: LibroPoliza["ramo"], o: Partial<LibroPoliza> = {}): LibroPoliza => ({
    numero,
    cliente_id: null,
    asegurado,
    ramo,
    subramo: "",
    aseguradora: "AXA",
    inicio_vigencia: sumarDias(hoy, -200),
    ultimo_pago: sumarDias(hoy, -40),
    renovacion: null,
    pagos_12m: 1,
    prima_ultima: 8000,
    vigente: true,
    fuente: "Demo",
    ...o,
  });
  return {
    clientes: [],
    libro: [
      // Laura (GMM en Valeri) también tiene una vida en AXA, escrita con apellidos primero como en el reporte de Salud.
      l("DEMO-L1", "MENDEZ RUIZ LAURA", "vida", { renovacion: sumarDias(hoy, 20) }),
      // Jorge (vida en Valeri) tiene un auto con AXA.
      l("DEMO-L2", "JORGE SALINAS TREVINO", "autos"),
      // Sofía (vida en Valeri) tuvo un auto que ya no está vigente → «reactivar».
      l("DEMO-L3", "SOFIA CANTU VILLARREAL", "autos", { vigente: false, ultimo_pago: sumarDias(hoy, -250) }),
      // Adriana solo existe en el libro: cliente nuevo con un seguro de hogar vigente.
      l("DEMO-L4", "ADRIANA CANTU PEREZ", "hogar", { renovacion: sumarDias(hoy, 70) }),
      // Pedro solo tiene una póliza vencida: NO es cliente.
      l("DEMO-L5", "PEDRO LUNA MARTINEZ", "gmm", { vigente: false, ultimo_pago: sumarDias(hoy, -500) }),
    ],
  };
}

const g = globalThis as unknown as { __acmClientes?: StoreClientes };
function store(): StoreClientes {
  if (!g.__acmClientes) g.__acmClientes = semilla();
  return g.__acmClientes;
}

// ----------------------------------------------------------------------------
// Lectura
// ----------------------------------------------------------------------------

const HOJA = 1000; // Supabase entrega como máximo 1,000 renglones por consulta: se pide por hojas.

export async function traerTodo(tabla: string, orden: string): Promise<Record<string, unknown>[]> {
  const salida: Record<string, unknown>[] = [];
  for (let desde = 0; ; desde += HOJA) {
    const { data, error } = await adminDb!.from(tabla).select("*").order(orden, { ascending: true }).range(desde, desde + HOJA - 1);
    if (error) throw errorDeCruzada(error);
    salida.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < HOJA) return salida;
  }
}

export async function listarClientes(): Promise<Cliente[]> {
  if (cloudReady && adminDb) return (await traerTodo("clientes", "nombre")).map(normalizarCliente);
  return [...store().clientes].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** El libro de AXA. `soloLigadas` deja fuera las pólizas que aún no pertenecen a ningún cliente. */
export async function listarLibro(soloLigadas = false): Promise<LibroPoliza[]> {
  if (cloudReady && adminDb) {
    const filas = (await traerTodo("libro_axa", "numero")).map(normalizarLibro);
    return soloLigadas ? filas.filter((l) => l.cliente_id) : filas;
  }
  const filas = store().libro;
  return (soloLigadas ? filas.filter((l) => l.cliente_id) : filas).map((l) => ({ ...l }));
}

export async function obtenerCliente(id: string): Promise<Cliente | null> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from("clientes").select("*").eq("id", id).limit(1);
    if (error) throw errorDeCruzada(error);
    return data?.[0] ? normalizarCliente(data[0] as Record<string, unknown>) : null;
  }
  return store().clientes.find((c) => c.id === id) ?? null;
}

// ----------------------------------------------------------------------------
// Escritura
// ----------------------------------------------------------------------------

export async function editarCliente(id: string, datos: DatosCliente): Promise<Cliente | null> {
  const cambios = { ...datos, actualizado_en: new Date().toISOString() };
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from("clientes").update(cambios).eq("id", id).select("*").limit(1);
    if (error) throw errorDeCruzada(error);
    return data?.[0] ? normalizarCliente(data[0] as Record<string, unknown>) : null;
  }
  const c = store().clientes.find((x) => x.id === id);
  if (!c) return null;
  Object.assign(c, cambios);
  return c;
}

/** Crea un familiar (un cliente más, sin pólizas todavía) ligado a su titular. */
export async function crearFamiliar(titular_id: string, d: DatosFamiliar): Promise<Cliente> {
  const ahora = new Date().toISOString();
  const fila = {
    id: randomUUID(),
    nombre: d.nombre,
    tipo: "persona",
    whatsapp: d.whatsapp,
    correo: "",
    fecha_nacimiento: d.fecha_nacimiento,
    genero: d.genero,
    codigo_postal: null,
    lead_id: null,
    no_ofrecer: false,
    notas: "",
    titular_id,
    parentesco: d.parentesco,
    creado_en: ahora,
    actualizado_en: ahora,
  };
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from("clientes").insert(fila).select("*").limit(1);
    if (error) throw errorDeCruzada(error);
    return normalizarCliente((data?.[0] ?? fila) as Record<string, unknown>);
  }
  const c = normalizarCliente(fila);
  store().clientes.push(c);
  return c;
}

/** Liga (o desliga, con titular null) a un cliente con su familia. */
export async function ligarFamilia(id: string, titular_id: string | null, parentesco: Cliente["parentesco"]): Promise<Cliente | null> {
  const cambios = { titular_id, parentesco, actualizado_en: new Date().toISOString() };
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from("clientes").update(cambios).eq("id", id).select("*").limit(1);
    if (error) throw errorDeCruzada(error);
    return data?.[0] ? normalizarCliente(data[0] as Record<string, unknown>) : null;
  }
  const c = store().clientes.find((x) => x.id === id);
  if (!c) return null;
  Object.assign(c, cambios);
  return c;
}

/** Anota que hoy se le pidieron referidos (no se vuelven a pedir en 90 días). */
export async function marcarReferidos(id: string): Promise<void> {
  const ahora = new Date().toISOString();
  if (cloudReady && adminDb) {
    const { error } = await adminDb.from("clientes").update({ referidos_pedidos_en: ahora, actualizado_en: ahora }).eq("id", id);
    if (error) throw errorDeCruzada(error);
    return;
  }
  const c = store().clientes.find((x) => x.id === id);
  if (c) Object.assign(c, { referidos_pedidos_en: ahora, actualizado_en: ahora });
}

/** Liga el prospecto con el que se le cotiza (para que Cotizaciones abra con él). */
export async function ligarLead(id: string, lead_id: string): Promise<void> {
  const cambios = { lead_id, actualizado_en: new Date().toISOString() };
  if (cloudReady && adminDb) {
    const { error } = await adminDb.from("clientes").update(cambios).eq("id", id);
    if (error) throw errorDeCruzada(error);
    return;
  }
  const c = store().clientes.find((x) => x.id === id);
  if (c) Object.assign(c, cambios);
}

const TROZO = 200;
function trozos<T>(lista: T[]): T[][] {
  const salida: T[][] = [];
  for (let i = 0; i < lista.length; i += TROZO) salida.push(lista.slice(i, i + TROZO));
  return salida;
}

/** Hace realidad un plan (ver lib/clientes-plan.ts): crea los clientes nuevos y liga las pólizas. */
export async function aplicarPlan(plan: PlanClientes): Promise<ResultadoSincronizar> {
  const ahora = new Date().toISOString();
  const idDe = new Map<string, string>();
  const filas = plan.nuevos.map((n) => {
    const id = randomUUID();
    idDe.set(n.clave, id);
    return {
      id,
      nombre: n.nombre,
      tipo: n.tipo,
      whatsapp: n.whatsapp,
      correo: n.correo,
      fecha_nacimiento: n.fecha_nacimiento,
      genero: n.genero,
      codigo_postal: n.codigo_postal,
      lead_id: n.lead_id,
      no_ofrecer: false,
      notas: "",
      creado_en: ahora,
      actualizado_en: ahora,
    };
  });
  const destino = (c: string) => idDe.get(c) ?? c;

  const polizasPorCliente = new Map<string, string[]>();
  for (const p of plan.polizas) polizasPorCliente.set(destino(p.cliente), [...(polizasPorCliente.get(destino(p.cliente)) ?? []), p.id]);
  const libroPorCliente = new Map<string, string[]>();
  for (const l of plan.libro) libroPorCliente.set(destino(l.cliente), [...(libroPorCliente.get(destino(l.cliente)) ?? []), l.numero]);

  if (cloudReady && adminDb) {
    for (const lote of trozos(filas)) {
      const { error } = await adminDb.from("clientes").insert(lote);
      if (error) throw errorDeCruzada(error);
    }
    for (const c of plan.completar) {
      const { error } = await adminDb.from("clientes").update({ ...c.cambios, actualizado_en: ahora }).eq("id", c.id);
      if (error) throw errorDeCruzada(error);
    }
    for (const [cliente, numeros] of libroPorCliente) {
      for (const lote of trozos(numeros)) {
        const { error } = await adminDb.from("libro_axa").update({ cliente_id: cliente }).in("numero", lote);
        if (error) throw errorDeCruzada(error);
      }
    }
  } else {
    const s = store();
    s.clientes.push(...filas.map((f) => normalizarCliente(f)));
    for (const c of plan.completar) {
      const x = s.clientes.find((k) => k.id === c.id);
      if (x) Object.assign(x, c.cambios, { actualizado_en: ahora });
    }
    for (const [cliente, numeros] of libroPorCliente) for (const l of s.libro) if (numeros.includes(l.numero)) l.cliente_id = cliente;
  }
  // Las pólizas de Valeri viven en lib/cobranza.ts (también tiene su propio modo demo).
  await ligarPolizasACliente([...polizasPorCliente].flatMap(([cliente, ids]) => ids.map((id) => ({ id, cliente_id: cliente }))));

  return {
    clientesNuevos: filas.length,
    polizasLigadas: plan.polizas.length,
    libroLigado: plan.libro.length,
    completados: plan.completar.length,
    porRevisar: plan.porRevisar,
  };
}

/** «Armar expedientes»: junta cada póliza con su cliente, crea los que falten y completa sus datos con los de tus prospectos ganados. */
export async function sincronizarClientes(): Promise<ResultadoSincronizar> {
  const [clientes, polizas, libro, leads] = await Promise.all([listarClientes(), listarPolizas(), listarLibro(), listLeads()]);
  const plan = planearClientes(
    {
      clientes,
      polizas: polizas.map((p) => ({ id: p.id, asegurado: p.asegurado, whatsapp: p.whatsapp, correo: p.correo, lead_id: p.lead_id, cliente_id: p.cliente_id })),
      // El reporte de Salud (GMM) escribe «APELLIDOS NOMBRES»; los demás, «NOMBRES APELLIDOS».
      libro: libro.map((l) => ({ numero: l.numero, asegurado: l.asegurado, apellidosPrimero: l.ramo === "gmm", vigente: l.vigente, cliente_id: l.cliente_id })),
      leads: leads.map((l) => ({
        id: l.id,
        nombre: l.nombre,
        whatsapp: l.whatsapp,
        correo: l.correo,
        etapa: l.etapa,
        fecha_nacimiento: l.fecha_nacimiento,
        genero: l.genero,
        codigo_postal: l.codigo_postal,
      })),
    },
    { crearDesdeLibro: true },
  );
  return aplicarPlan(plan);
}

/**
 * Después de crear una póliza en Valeri: la liga a su cliente (o crea el cliente si es nuevo). Nunca estorba el guardado:
 * si todavía no corres el SQL 0016 simplemente no hace nada.
 */
export async function vincularPoliza(p: Pick<Poliza, "id" | "asegurado" | "whatsapp" | "correo" | "lead_id" | "cliente_id">): Promise<void> {
  try {
    const [clientes, leads] = await Promise.all([listarClientes(), listLeads()]);
    const plan = planearClientes(
      {
        clientes,
        polizas: [{ id: p.id, asegurado: p.asegurado, whatsapp: p.whatsapp, correo: p.correo, lead_id: p.lead_id, cliente_id: p.cliente_id }],
        libro: [],
        leads: leads.map((l) => ({
          id: l.id,
          nombre: l.nombre,
          whatsapp: l.whatsapp,
          correo: l.correo,
          etapa: l.etapa,
          fecha_nacimiento: l.fecha_nacimiento,
          genero: l.genero,
          codigo_postal: l.codigo_postal,
        })),
      },
      { crearDesdeLibro: false },
    );
    // Solo se arma el expediente de esta póliza; completar a los demás clientes es trabajo de «Armar expedientes».
    await aplicarPlan({ ...plan, completar: [] });
  } catch (e) {
    if (!(e instanceof MigracionPendienteError)) console.error("[vincularPoliza]", e);
  }
}
