"use client";

/**
 * Cliente HTTP hacia los route handlers (app/api/*). El navegador NUNCA habla
 * directo con Supabase; todo pasa por el servidor con la secret key.
 */
import type { ResumenTarjeta } from "./tarjeta-reglas";
import type { CambiosVideo, DatosNuevoVideo, PermisoPortada, PermisoSubida, VideoFijo, VideoTarjeta } from "./tarjeta-videos-reglas";
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
  EventoPoliza,
  DatosEvento,
  DatosRenovacion,
  TipoEvento,
  Cliente,
  DatosCliente,
  EstadoCruzada,
  Parentesco,
} from "./types";

import type { MotivoCobro } from "./cobranza-reglas";
import type { ConteoEventos } from "./historial-reglas";
import type { MotivoSeguimiento } from "./seguimiento-reglas";
import type { ClaveMensaje, DatosCamila, DatosEstado } from "./cruzada-reglas";
import type { DatosFamiliar } from "./cruzada-familia";
import type { ResultadoSincronizar } from "./clientes-plan";
import type { Cotizacion, DatosCotizacion, EstadoCotizacion, LecturaCotizacion } from "./cotizaciones-reglas";
import type { DatosPendiente, Pendiente } from "./pendientes-reglas";
import type { CargaChubb, PolizaChubb } from "./chubb-reglas";

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

/** Error del login con pistas para la pantalla: volver al primer paso o pedir otro captcha. */
export class ErrorLogin extends Error {
  constructor(
    mensaje: string,
    public reinicia = false,
    public captcha = false,
  ) {
    super(mensaje);
    this.name = "ErrorLogin";
  }
}

async function jsonLogin(res: Response): Promise<Record<string, unknown>> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ErrorLogin(String(data.error ?? `Error ${res.status}`), data.reinicia === true, data.captcha === true);
  return data;
}

function postLogin(url: string, cuerpo: Record<string, unknown>): Promise<Response> {
  return fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
}

/** Primer paso: correo + contraseña (+ captcha). No entrega sesión: dice qué sigue. */
export async function crmLogin(correo: string, password: string, captcha = ""): Promise<{ paso: "codigo" | "configurar" }> {
  const data = await jsonLogin(await postLogin("/api/crm/login", { correo, password, captcha }));
  return { paso: data.paso === "configurar" ? "configurar" : "codigo" };
}

export interface DatosEnlace {
  /** Imagen del QR (data URL). */
  qr: string;
  /** La clave para escribirla a mano si no se puede escanear. */
  secreto: string;
  /** Enlace otpauth:// (abre la app autenticadora si estás en el mismo celular). */
  uri: string;
}

/** Primera vez: pide el QR para enlazar la app autenticadora. */
export async function crm2faIniciar(): Promise<DatosEnlace> {
  return (await jsonLogin(await postLogin("/api/crm/2fa", { accion: "iniciar" }))) as unknown as DatosEnlace;
}

/** Primera vez: confirma con el primer código. Entrega la sesión y los 10 códigos de respaldo (se ven una sola vez). */
export async function crm2faConfirmar(codigo: string): Promise<{ sesion: Sesion; codigos: string[] }> {
  return (await jsonLogin(await postLogin("/api/crm/2fa", { accion: "confirmar", codigo }))) as unknown as { sesion: Sesion; codigos: string[] };
}

/** Código de la app (6 dígitos) o de respaldo. Entrega la sesión. */
export async function crm2faVerificar(codigo: string): Promise<{ sesion: Sesion; respaldoRestantes?: number }> {
  return (await jsonLogin(await postLogin("/api/crm/2fa", { accion: "verificar", codigo }))) as unknown as {
    sesion: Sesion;
    respaldoRestantes?: number;
  };
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

// ---- Chubb Autos: Dana (solo admin) ----

/** El último Excel de Chubb Autos que subiste (null si todavía no subes ninguno). */
export async function crmChubb(): Promise<CargaChubb | null> {
  const res = await fetch("/api/crm/chubb", { cache: "no-store" });
  return ((await jsonOErrorCRM(res)) as { carga: CargaChubb | null }).carga;
}

/** Guarda un Excel nuevo (ya leído en el navegador) como la carga más reciente de Dana. */
export async function crmCargarChubb(archivo: string, polizas: PolizaChubb[]): Promise<CargaChubb> {
  const data = await jsonOErrorCRM(await postJSON("/api/crm/chubb", { accion: "cargar", archivo, polizas }));
  return (data as { carga: CargaChubb }).carga;
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

// ---- Seguimiento: Sofi (solo admin) ----

/** Tus mensajes de seguimiento personalizados (solo las situaciones que cambiaste). */
export async function crmMensajesSeguimiento(): Promise<Partial<Record<MotivoSeguimiento, string>>> {
  const res = await fetch("/api/crm/seguimiento/mensajes", { cache: "no-store" });
  return ((await jsonOErrorCRM(res)) as { mensajes: Partial<Record<MotivoSeguimiento, string>> }).mensajes;
}

/** Guarda tu texto para una situación; con texto null vuelve al base de Sofi. */
export async function crmGuardarMensajeSeguimiento(motivo: MotivoSeguimiento, texto: string | null): Promise<void> {
  await jsonOErrorCRM(await postJSON("/api/crm/seguimiento/mensajes", { motivo, texto }));
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

/** Renueva una póliza (a mano o con los datos del PDF ya confirmados). `reportes` dice si contó en los reportes de renovaciones. */
export async function crmRenovarPoliza(
  id: string,
  renovacion: DatosRenovacion,
): Promise<{ poliza: Poliza; reportes: "contada" | "duplicada" | "omitida" | "error" }> {
  const data = await jsonOErrorCRM(await postJSON("/api/crm/cobranza", { accion: "renovar", id, renovacion }));
  return data as { poliza: Poliza; reportes: "contada" | "duplicada" | "omitida" | "error" };
}

// ---- Historial de cada póliza: pagos, renovaciones y endosos (solo admin) ----

/** Los movimientos de una póliza (lo más nuevo primero), opcionalmente solo de un tipo. */
export async function crmHistorialPoliza(polizaId: string, tipo?: TipoEvento): Promise<EventoPoliza[]> {
  const res = await fetch(`/api/crm/historial?poliza_id=${encodeURIComponent(polizaId)}${tipo ? `&tipo=${tipo}` : ""}`, { cache: "no-store" });
  return ((await jsonOErrorCRM(res)) as { eventos: EventoPoliza[] }).eventos;
}

/** Cuántos pagos, renovaciones y endosos tiene cada póliza (para los globitos del listado). */
export async function crmConteoHistorial(): Promise<Record<string, ConteoEventos>> {
  const res = await fetch("/api/crm/historial?conteo=1", { cache: "no-store" });
  return ((await jsonOErrorCRM(res)) as { conteo: Record<string, ConteoEventos> }).conteo;
}

/** Anota un pago; con `avanzar` también salda el recibo que toca. Devuelve la lista de pagos y la póliza ya actualizada. */
export async function crmRegistrarPago(
  polizaId: string,
  evento: DatosEvento,
  avanzar: boolean,
): Promise<{ eventos: EventoPoliza[]; poliza: Poliza | null }> {
  const data = await jsonOErrorCRM(await postJSON("/api/crm/historial", { accion: "crear", poliza_id: polizaId, evento, avanzar }));
  return data as { eventos: EventoPoliza[]; poliza: Poliza | null };
}

export async function crmRegistrarEndoso(polizaId: string, evento: DatosEvento): Promise<EventoPoliza[]> {
  const data = await jsonOErrorCRM(await postJSON("/api/crm/historial", { accion: "crear", poliza_id: polizaId, evento }));
  return (data as { eventos: EventoPoliza[] }).eventos;
}

export async function crmEliminarEvento(id: string): Promise<void> {
  await jsonOErrorCRM(await postJSON("/api/crm/historial", { accion: "eliminar", id }));
}

// ---- Crecimiento (solo admin) ----

export async function crmCrecimiento(): Promise<{ filas: ProduccionMes[]; cloud: boolean }> {
  const res = await fetch("/api/crm/crecimiento", { cache: "no-store" });
  return (await jsonOErrorCRM(res)) as { filas: ProduccionMes[]; cloud: boolean };
}

// ---- Tarjeta web: qué se toca en /roberto (solo admin) ----

export async function crmTarjeta(dias: number): Promise<ResumenTarjeta> {
  const res = await fetch(`/api/crm/tarjeta?dias=${dias}`, { cache: "no-store" });
  return (await jsonOErrorCRM(res)) as ResumenTarjeta;
}

// ---- Videos de la tarjeta: los que subes desde el CRM y salen solos en /roberto (solo admin) ----

export async function crmVideosTarjeta(): Promise<{ videos: VideoTarjeta[]; fijos: VideoFijo[]; cloud: boolean }> {
  const res = await fetch("/api/crm/tarjeta-videos", { cache: "no-store" });
  return (await jsonOErrorCRM(res)) as { videos: VideoTarjeta[]; fijos: VideoFijo[]; cloud: boolean };
}

/** Pide un id y los permisos de un solo uso para subir el video y su portada directo al cajón de Supabase. */
export async function crmPrepararVideo(): Promise<PermisoSubida> {
  return (await jsonOErrorCRM(await postJSON("/api/crm/tarjeta-videos", { accion: "preparar" }))) as PermisoSubida;
}

/** Sube un archivo al cajón con el permiso de un solo uso (en modo demo no sube nada). */
export async function crmSubirArchivoVideo(permiso: PermisoSubida, cual: "video" | "poster", archivo: Blob): Promise<void> {
  const n = permiso.nube;
  if (permiso.demo || !n) return;
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(n.url, n.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const destino = cual === "video" ? n.video : n.poster;
  const { error } = await sb.storage.from(n.bucket).uploadToSignedUrl(destino.path, destino.token, archivo, {
    contentType: cual === "video" ? "video/mp4" : "image/jpeg",
    cacheControl: "31536000", // el archivo nunca cambia (su nombre lleva un id único): el celular puede guardarlo un año
  });
  if (error) throw new Error(cual === "video" ? "No pude subir el video. Revisa tu internet e intenta de nuevo." : "No pude subir la portada del video.");
}

/** sinIntereses = el video se publicó, pero los chips elegidos no se guardaron porque falta correr la migración 0022. */
export async function crmCrearVideo(datos: DatosNuevoVideo): Promise<{ video: VideoTarjeta; sinIntereses: boolean }> {
  const data = (await jsonOErrorCRM(await postJSON("/api/crm/tarjeta-videos", { accion: "crear", ...datos }))) as { video: VideoTarjeta; sinIntereses?: boolean };
  return { video: data.video, sinIntereses: data.sinIntereses === true };
}

export async function crmEditarVideo(id: string, cambios: CambiosVideo): Promise<VideoTarjeta> {
  const data = await jsonOErrorCRM(await postJSON("/api/crm/tarjeta-videos", { accion: "editar", id, cambios }));
  return (data as { video: VideoTarjeta }).video;
}

export async function crmEliminarVideo(id: string): Promise<void> {
  await jsonOErrorCRM(await postJSON("/api/crm/tarjeta-videos", { accion: "eliminar", id }));
}

// Portadas: de un video que subiste (id UUID) o de un video FIJO de la tarjeta (id como «maternidad»). Se sube directo al cajón, igual que el video.

/** Pide el permiso de un solo uso para subir la portada de ese video. */
export async function crmPrepararPortada(objetivo: string): Promise<PermisoPortada> {
  return (await jsonOErrorCRM(await postJSON("/api/crm/tarjeta-videos", { accion: "preparar-portada", objetivo }))) as PermisoPortada;
}

/** Sube la imagen (ya convertida a JPG vertical) al cajón con el permiso de un solo uso (en modo demo no sube nada). */
export async function crmSubirPortada(permiso: PermisoPortada, imagen: Blob): Promise<void> {
  const n = permiso.nube;
  if (permiso.demo || !n) return;
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(n.url, n.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await sb.storage.from(n.bucket).uploadToSignedUrl(n.poster.path, n.poster.token, imagen, {
    contentType: "image/jpeg",
    cacheControl: "31536000", // cada portada tiene su propia dirección (lleva la hora en el nombre): puede guardarse un año
  });
  if (error) throw new Error("No pude subir la portada. Revisa tu internet e intenta de nuevo.");
}

/** Avisa que la portada ya está subida: queda como la que se ve en la tarjeta. */
export async function crmConfirmarPortada(objetivo: string, ts: number): Promise<{ fijo?: VideoFijo; video?: VideoTarjeta }> {
  return (await jsonOErrorCRM(await postJSON("/api/crm/tarjeta-videos", { accion: "confirmar-portada", objetivo, ts }))) as { fijo?: VideoFijo; video?: VideoTarjeta };
}

/** Un video fijo vuelve a su portada original (borra la que habías subido). */
export async function crmQuitarPortada(id: string): Promise<VideoFijo> {
  const data = await jsonOErrorCRM(await postJSON("/api/crm/tarjeta-videos", { accion: "quitar-portada", id }));
  return (data as { fijo: VideoFijo }).fijo;
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
/** Guarda el orden en que arrastraste los pendientes de un día (el primero de la lista queda arriba). */
export async function crmOrdenarPendientes(ids: string[]): Promise<void> {
  await jsonOErrorCRM(await postJSON("/api/crm/pendientes", { accion: "ordenar", ids }));
}

// ---- Cotizaciones (cada usuario ve las suyas) ----

/** Las de un prospecto; sin prospecto, las más recientes de todos. */
export async function crmCotizaciones(leadId?: string): Promise<Cotizacion[]> {
  const res = await fetch(`/api/crm/cotizaciones${leadId ? `?lead_id=${encodeURIComponent(leadId)}` : ""}`, { cache: "no-store" });
  return ((await jsonOErrorCRM(res)) as { cotizaciones: Cotizacion[] }).cotizaciones;
}

async function accionCotizacion(cuerpo: Record<string, unknown>): Promise<Cotizacion> {
  return ((await jsonOErrorCRM(await postJSON("/api/crm/cotizaciones", cuerpo))) as { cotizacion: Cotizacion }).cotizacion;
}

export const crmCrearCotizacion = (cotizacion: DatosCotizacion) => accionCotizacion({ accion: "crear", cotizacion });
export const crmEditarCotizacion = (id: string, cotizacion: DatosCotizacion) => accionCotizacion({ accion: "editar", id, cotizacion });
export const crmEstadoCotizacion = (id: string, estado: EstadoCotizacion) => accionCotizacion({ accion: "estado", id, estado });
/** Las marca como enviadas; devuelve las que cambiaron (la elegida no cambia). */
export async function crmMarcarEnviadas(ids: string[]): Promise<Cotizacion[]> {
  const data = await jsonOErrorCRM(await postJSON("/api/crm/cotizaciones", { accion: "enviadas", ids }));
  return (data as { cotizaciones: Cotizacion[] }).cotizaciones;
}

/** La IA lee una cotización (PDF o foto) y devuelve un borrador para llenar el formulario. No guarda nada. */
export async function crmLeerCotizacion(archivo: File): Promise<LecturaCotizacion> {
  const form = new FormData();
  form.append("archivo", archivo);
  const res = await fetch("/api/crm/cotizaciones/leer", { method: "POST", body: form });
  return (await jsonOErrorCRM(res)) as LecturaCotizacion;
}

// ---- Admin (solo sesión de administrador; el encabezado x-admin-code ya no se usa) ----

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

/** Quita el 2FA de una persona (celular perdido o nuevo): en su próximo login enlaza la app de nuevo. */
export async function adminRestablecer2fa(code: string, id: string): Promise<void> {
  await jsonOrThrow(
    await fetch("/api/admin", {
      method: "POST",
      headers: adminHeaders(code),
      body: JSON.stringify({ accion: "restablecer-2fa", id }),
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

// ---- Venta cruzada: Camila y los expedientes de clientes (solo admin) ----

export async function crmCamila(): Promise<DatosCamila> {
  const res = await fetch("/api/crm/cruzada", { cache: "no-store" });
  return (await jsonOErrorCRM(res)) as DatosCamila;
}

async function accionCruzada(cuerpo: Record<string, unknown>): Promise<Record<string, unknown>> {
  return (await jsonOErrorCRM(await postJSON("/api/crm/cruzada", cuerpo))) as Record<string, unknown>;
}

/** «Armar expedientes»: junta cada póliza con su cliente y crea los que falten. */
export async function crmSincronizarClientes(): Promise<ResultadoSincronizar> {
  return ((await accionCruzada({ accion: "sincronizar" })) as { resultado: ResultadoSincronizar }).resultado;
}

/** Corrige datos de un cliente (se manda solo lo que cambia). */
export async function crmEditarCliente(id: string, cliente: Partial<DatosCliente>): Promise<Cliente> {
  return ((await accionCruzada({ accion: "cliente", id, cliente })) as { cliente: Cliente }).cliente;
}

/** Anota cómo va lo que se le ofreció a un cliente en un ramo. */
export async function crmEstadoOferta(cliente_id: string, estado: DatosEstado): Promise<EstadoCruzada> {
  return ((await accionCruzada({ accion: "estado", cliente_id, estado })) as { estado: EstadoCruzada }).estado;
}

/** Guarda tu texto para un mensaje de Camila; con texto null vuelve al base. */
export async function crmGuardarMensajeCruzada(clave: ClaveMensaje, texto: string | null): Promise<void> {
  await accionCruzada({ accion: "mensaje", clave, texto });
}

/** Prepara la cotización de otro seguro: devuelve el prospecto con el que se abre Cotizaciones. */
export async function crmCotizarCliente(cliente_id: string, ramo: Ramo): Promise<{ lead_id: string; creado: boolean; estado: EstadoCruzada }> {
  return (await accionCruzada({ accion: "cotizar", cliente_id, ramo })) as { lead_id: string; creado: boolean; estado: EstadoCruzada };
}

/** «Lo contrató»: cierra la oferta y, si hay un prospecto abierto de esa cotización, lo pasa a Cliente ganado (suma a tu meta). */
export async function crmVenderCruzada(cliente_id: string, ramo: Ramo): Promise<{ estado: EstadoCruzada; porProspecto: boolean; lead_id: string | null }> {
  return (await accionCruzada({ accion: "vender", cliente_id, ramo })) as { estado: EstadoCruzada; porProspecto: boolean; lead_id: string | null };
}

/** Liga (o desliga, con titular null) a un cliente con su familia. */
export async function crmFamilia(id: string, titular_id: string | null, parentesco: Parentesco | null): Promise<Cliente> {
  return ((await accionCruzada({ accion: "familia", id, familia: { titular_id, parentesco } })) as { cliente: Cliente }).cliente;
}

/** Crea un familiar (todavía sin pólizas) ligado a su titular. */
export async function crmCrearFamiliar(titular_id: string, familiar: Partial<DatosFamiliar>): Promise<Cliente> {
  return ((await accionCruzada({ accion: "crear_familiar", titular_id, familiar })) as { cliente: Cliente }).cliente;
}

/** Marca un momento de confianza como atendido (cumpleaños, revisión, pago, referidos) para que deje de aparecer. */
export async function crmMomentoHecho(cliente_id: string, clave: string): Promise<void> {
  await accionCruzada({ accion: "momento", cliente_id, clave });
}
