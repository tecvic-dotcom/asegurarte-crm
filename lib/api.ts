"use client";

/**
 * Cliente HTTP hacia los route handlers (app/api/*). El navegador NUNCA habla
 * directo con Supabase; todo pasa por el servidor con la secret key.
 */
import type {
  Lead,
  Actividad,
  Usuario,
  Ajustes,
  Sesion,
  NuevoLead,
  Metricas,
  EtapaId,
  TipoActividad,
  Genero,
  PlantillaMensaje,
  Ramo,
  PeriodoPanel,
  PanelSnapshot,
  Movimiento,
  NuevoMovimiento,
  ManagerEstado,
  ManagerConfig,
  ManagerUso,
  RespuestaManager,
  TurnoManager,
  Poliza,
  DatosPoliza,
  ResumenCobranza,
  ProduccionMes,
  ReporteClara,
  PolizaAdjunta,
  DatosAdjunta,
  LecturaPoliza,
  TipoAdjunta,
  NuevoLeadManual,
  TipoReporte,
} from "./types";

import type { MotivoCobro } from "./cobranza-reglas";
import type { DatosPendiente, Pendiente } from "./pendientes-reglas";

async function jsonOrThrow(res: Response): Promise<unknown> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? `Error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ---- Captura (público) ----

export interface EnvioLead {
  ok: boolean;
  duplicado: boolean;
  errores?: Record<string, string>;
}

export async function enviarLead(input: NuevoLead): Promise<EnvioLead> {
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  // 422 = errores de validación por campo (no es un throw, los pintamos).
  if (res.status === 422) return { ok: false, duplicado: false, errores: (data as EnvioLead).errores };
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "No se pudo enviar. Intenta de nuevo.");
  return data as EnvioLead;
}

export async function getAjustesPublicas(): Promise<Ajustes> {
  const res = await fetch("/api/settings", { cache: "no-store" });
  return (await jsonOrThrow(res)) as Ajustes;
}

// ---- CRM (sesión por cookie firmada) ----

export async function crmLogin(correo: string, password: string): Promise<Sesion> {
  const res = await fetch("/api/crm/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ correo, password }),
  });
  const data = (await jsonOrThrow(res)) as { sesion: Sesion };
  return data.sesion;
}

export async function crmLogout(): Promise<void> {
  await fetch("/api/crm/login", { method: "DELETE" });
}

export async function crmLeads(): Promise<Lead[]> {
  const res = await fetch("/api/crm/leads", { cache: "no-store" });
  return ((await jsonOrThrow(res)) as { leads: Lead[] }).leads;
}

export async function crmLead(id: string): Promise<{ lead: Lead; actividad: Actividad[] }> {
  const res = await fetch(`/api/crm/leads?id=${encodeURIComponent(id)}`, { cache: "no-store" });
  return (await jsonOrThrow(res)) as { lead: Lead; actividad: Actividad[] };
}

export async function crmMover(id: string, etapa: EtapaId): Promise<void> {
  await jsonOrThrow(
    await fetch("/api/crm/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accion: "mover", id, etapa }),
    }),
  );
}

export async function crmActualizar(
  id: string,
  patch: {
    nombre?: string;
    notas?: string;
    valor?: number;
    asignado_a?: string | null;
    genero?: Genero | null;
    fecha_nacimiento?: string | null;
    codigo_postal?: string | null;
    ramo?: Ramo | null;
  },
): Promise<Lead> {
  const data = (await jsonOrThrow(
    await fetch("/api/crm/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accion: "editar", id, patch }),
    }),
  )) as { lead: Lead };
  return data.lead;
}

/** Captura un prospecto a mano. Si ya existía (mismo WhatsApp o correo) devuelve duplicado:true y su id. */
export async function crmCrearLead(lead: NuevoLeadManual): Promise<{ id: string | undefined; duplicado: boolean }> {
  const data = (await jsonOrThrow(
    await fetch("/api/crm/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accion: "crear", lead }),
    }),
  )) as { id?: string; duplicado: boolean };
  return { id: data.id, duplicado: data.duplicado };
}

export async function crmAgregarActividad(id: string, tipo: TipoActividad, texto: string): Promise<void> {
  await jsonOrThrow(
    await fetch("/api/crm/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accion: "actividad", id, tipo, texto }),
    }),
  );
}

export async function crmPlantillas(): Promise<PlantillaMensaje[]> {
  const res = await fetch("/api/crm/plantillas", { cache: "no-store" });
  return ((await jsonOrThrow(res)) as { plantillas: PlantillaMensaje[] }).plantillas;
}

export async function crmGuardarPlantilla(input: {
  id?: string;
  nombre: string;
  canal: "whatsapp" | "correo";
  cuerpo: string;
}): Promise<PlantillaMensaje> {
  const data = (await jsonOrThrow(
    await fetch("/api/crm/plantillas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accion: "guardar", ...input }),
    }),
  )) as { plantilla: PlantillaMensaje };
  return data.plantilla;
}

export async function crmEliminarPlantilla(id: string): Promise<void> {
  await jsonOrThrow(
    await fetch("/api/crm/plantillas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accion: "eliminar", id }),
    }),
  );
}

// ---- AI Manager: Panel de Mando, finanzas y RORO (solo admin) ----

/** Error del CRM que además dice si falta una migración (y cuál) o la llave de IA. */
export class ErrorCRM extends Error {
  constructor(
    message: string,
    public status: number,
    public migracion = false,
    public sinLlave = false,
    /** Archivo de supabase/migrations que falta correr. */
    public archivo = "0003_ai_manager.sql",
  ) {
    super(message);
    this.name = "ErrorCRM";
  }
}

async function jsonOErrorCRM(res: Response): Promise<unknown> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data as { error?: string; migracion?: boolean; sinLlave?: boolean; archivo?: string };
    throw new ErrorCRM(
      d.error ?? `Error ${res.status}`,
      res.status,
      Boolean(d.migracion),
      Boolean(d.sinLlave),
      d.archivo ?? "0003_ai_manager.sql",
    );
  }
  return data;
}

function postJSON(url: string, body: unknown): Promise<Response> {
  return fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

export async function crmPanel(periodo: PeriodoPanel): Promise<PanelSnapshot> {
  const res = await fetch(`/api/crm/panel?periodo=${periodo}`, { cache: "no-store" });
  return (await jsonOErrorCRM(res)) as PanelSnapshot;
}

export async function crmMovimientos(desde: string, hasta: string): Promise<Movimiento[]> {
  const res = await fetch(`/api/crm/finanzas?desde=${desde}&hasta=${hasta}`, { cache: "no-store" });
  return ((await jsonOErrorCRM(res)) as { movimientos: Movimiento[] }).movimientos;
}

export async function crmCrearMovimientos(movimientos: NuevoMovimiento[]): Promise<Movimiento[]> {
  const data = await jsonOErrorCRM(await postJSON("/api/crm/finanzas", { accion: "crear", movimientos }));
  return (data as { movimientos: Movimiento[] }).movimientos;
}

export async function crmEditarMovimiento(id: string, cambios: Partial<NuevoMovimiento>): Promise<Movimiento> {
  const data = await jsonOErrorCRM(await postJSON("/api/crm/finanzas", { accion: "editar", id, cambios }));
  return (data as { movimiento: Movimiento }).movimiento;
}

export async function crmEliminarMovimiento(id: string): Promise<void> {
  await jsonOErrorCRM(await postJSON("/api/crm/finanzas", { accion: "eliminar", id }));
}

export async function crmManager(): Promise<ManagerEstado> {
  const res = await fetch("/api/crm/manager", { cache: "no-store" });
  return (await jsonOErrorCRM(res)) as ManagerEstado;
}

export async function crmPreguntarManager(
  pregunta: string,
  historial: TurnoManager[],
): Promise<{ respuesta: RespuestaManager; uso: ManagerUso }> {
  const data = await jsonOErrorCRM(await postJSON("/api/crm/manager", { accion: "preguntar", pregunta, historial }));
  return data as { respuesta: RespuestaManager; uso: ManagerUso };
}

export async function crmGuardarManagerConfig(config: ManagerConfig): Promise<ManagerConfig> {
  const data = await jsonOErrorCRM(await postJSON("/api/crm/manager", { accion: "guardar-config", config }));
  return (data as { config: ManagerConfig }).config;
}

// ---- Cobranza: Valeri (solo admin) ----

export async function crmPolizas(): Promise<Poliza[]> {
  const res = await fetch("/api/crm/cobranza", { cache: "no-store" });
  return ((await jsonOErrorCRM(res)) as { polizas: Poliza[] }).polizas;
}

/** Tus mensajes de cobranza personalizados (solo las situaciones que cambiaste). */
export async function crmMensajesCobro(): Promise<Partial<Record<MotivoCobro, string>>> {
  const res = await fetch("/api/crm/cobranza/mensajes", { cache: "no-store" });
  return ((await jsonOErrorCRM(res)) as { mensajes: Partial<Record<MotivoCobro, string>> }).mensajes;
}

/** Guarda tu texto para una situación; con texto null vuelve al base de Valeri. */
export async function crmGuardarMensajeCobro(motivo: MotivoCobro, texto: string | null): Promise<void> {
  await jsonOErrorCRM(await postJSON("/api/crm/cobranza/mensajes", { motivo, texto }));
}

export async function crmResumenCobranza(): Promise<ResumenCobranza> {
  const res = await fetch("/api/crm/cobranza?resumen=1", { cache: "no-store" });
  return ((await jsonOErrorCRM(res)) as { resumen: ResumenCobranza }).resumen;
}

async function accionCobranza(cuerpo: Record<string, unknown>): Promise<Poliza> {
  return ((await jsonOErrorCRM(await postJSON("/api/crm/cobranza", cuerpo))) as { poliza: Poliza }).poliza;
}

export const crmCrearPoliza = (poliza: DatosPoliza) => accionCobranza({ accion: "crear", poliza });
export const crmEditarPoliza = (id: string, poliza: Partial<DatosPoliza>) => accionCobranza({ accion: "editar", id, poliza });
export const crmPolizaPagada = (id: string) => accionCobranza({ accion: "pagada", id });
export const crmPolizaPromesa = (id: string, fecha: string) => accionCobranza({ accion: "promesa", id, fecha });
export const crmPolizaRecordada = (id: string) => accionCobranza({ accion: "recordada", id });
export const crmPolizaCancelar = (id: string, cancelada: boolean) => accionCobranza({ accion: "cancelar", id, cancelada });

// ---- Crecimiento (solo admin) ----

export async function crmCrecimiento(): Promise<{ filas: ProduccionMes[]; cloud: boolean }> {
  const res = await fetch("/api/crm/crecimiento", { cache: "no-store" });
  return (await jsonOErrorCRM(res)) as { filas: ProduccionMes[]; cloud: boolean };
}

// ---- Pólizas adjuntas: nuevas y renovaciones (solo admin) ----

export async function crmAdjuntas(): Promise<{ polizas: PolizaAdjunta[]; cloud: boolean }> {
  const res = await fetch("/api/crm/polizas-adjuntas", { cache: "no-store" });
  return (await jsonOErrorCRM(res)) as { polizas: PolizaAdjunta[]; cloud: boolean };
}

/** Manda UN archivo a la IA para que lo lea (no guarda nada). */
export async function crmLeerPoliza(archivo: File, tipo: TipoAdjunta): Promise<LecturaPoliza> {
  const form = new FormData();
  form.append("archivo", archivo);
  form.append("tipo", tipo);
  const res = await fetch("/api/crm/polizas-adjuntas/leer", { method: "POST", body: form });
  return (await jsonOErrorCRM(res)) as LecturaPoliza;
}

export async function crmGuardarAdjunta(poliza: DatosAdjunta): Promise<PolizaAdjunta> {
  const data = await jsonOErrorCRM(await postJSON("/api/crm/polizas-adjuntas", { accion: "crear", poliza }));
  return (data as { poliza: PolizaAdjunta }).poliza;
}

export async function crmEliminarAdjunta(id: string): Promise<void> {
  await jsonOErrorCRM(await postJSON("/api/crm/polizas-adjuntas", { accion: "eliminar", id }));
}

// ---- Reportes: Clara (solo admin) ----

export async function crmReporte(tipo: TipoReporte, fecha?: string | null): Promise<ReporteClara> {
  const res = await fetch(`/api/crm/reportes?tipo=${tipo}${fecha ? `&fecha=${fecha}` : ""}`, { cache: "no-store" });
  return (await jsonOErrorCRM(res)) as ReporteClara;
}

export async function crmFraseClara(): Promise<{ frase: string; tipo: TipoReporte }> {
  const res = await fetch("/api/crm/reportes?resumen=1", { cache: "no-store" });
  return (await jsonOErrorCRM(res)) as { frase: string; tipo: TipoReporte };
}

export async function crmEliminarPoliza(id: string): Promise<void> {
  await jsonOErrorCRM(await postJSON("/api/crm/cobranza", { accion: "eliminar", id }));
}

// ---- Mis pendientes (cada usuario ve los suyos) ----

export async function crmPendientes(): Promise<{ activos: Pendiente[]; hechos: Pendiente[] }> {
  const res = await fetch("/api/crm/pendientes", { cache: "no-store" });
  return (await jsonOErrorCRM(res)) as { activos: Pendiente[]; hechos: Pendiente[] };
}

async function accionPendiente(cuerpo: Record<string, unknown>): Promise<Pendiente> {
  return ((await jsonOErrorCRM(await postJSON("/api/crm/pendientes", cuerpo))) as { pendiente: Pendiente }).pendiente;
}

export const crmCrearPendiente = (pendiente: DatosPendiente) => accionPendiente({ accion: "crear", pendiente });
export const crmEditarPendiente = (id: string, pendiente: DatosPendiente) => accionPendiente({ accion: "editar", id, pendiente });
/** Completar (se guarda con su hora) o devolver a pendientes. */
export const crmPendienteHecho = (id: string, hecho: boolean) => accionPendiente({ accion: "hecho", id, hecho });
export const crmMoverPendiente = (id: string, fecha: string) => accionPendiente({ accion: "mover", id, fecha });

// ---- Admin (requiere código x-admin-code) ----

function adminHeaders(code: string): HeadersInit {
  return { "content-type": "application/json", "x-admin-code": code };
}

export interface ResumenAdmin {
  metricas: Metricas;
  leads: Lead[];
  usuarios: Usuario[];
  ajustes: Ajustes;
}

export async function adminResumen(code: string): Promise<ResumenAdmin> {
  const res = await fetch("/api/admin?recurso=resumen", { headers: adminHeaders(code), cache: "no-store" });
  return (await jsonOrThrow(res)) as ResumenAdmin;
}

export async function adminSetAjuste(code: string, clave: keyof Ajustes, valor: string): Promise<void> {
  await jsonOrThrow(
    await fetch("/api/admin", {
      method: "POST",
      headers: adminHeaders(code),
      body: JSON.stringify({ accion: "ajuste", clave, valor }),
    }),
  );
}

export async function adminCrearUsuario(
  code: string,
  input: { nombre: string; correo: string; rol: "admin" | "vendedor"; password: string },
): Promise<{ duplicado: boolean }> {
  return (await jsonOrThrow(
    await fetch("/api/admin", {
      method: "POST",
      headers: adminHeaders(code),
      body: JSON.stringify({ accion: "crear-usuario", ...input }),
    }),
  )) as { duplicado: boolean };
}

export async function adminEliminarUsuario(code: string, id: string): Promise<void> {
  await jsonOrThrow(
    await fetch("/api/admin", {
      method: "POST",
      headers: adminHeaders(code),
      body: JSON.stringify({ accion: "eliminar-usuario", id }),
    }),
  );
}

export async function adminEliminarLead(code: string, id: string): Promise<void> {
  await jsonOrThrow(
    await fetch("/api/admin", {
      method: "POST",
      headers: adminHeaders(code),
      body: JSON.stringify({ accion: "eliminar-lead", id }),
    }),
  );
}

/** Descarga el CSV de leads (devuelve el texto para crear un Blob). */
export async function adminExportCSV(code: string): Promise<string> {
  const res = await fetch("/api/admin?recurso=csv", { headers: adminHeaders(code), cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo exportar.");
  return res.text();
}
