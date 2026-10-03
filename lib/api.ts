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
} from "./types";

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
