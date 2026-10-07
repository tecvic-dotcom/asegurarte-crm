import "server-only";

/**
 * Capa de datos del CRM — SOLO SERVIDOR.
 *
 * Dos backends transparentes (igual patrón que el repo madre LEGENDAR·IA):
 *  - NUBE (Supabase): si hay secret key (supabase-admin → cloudReady). Salta RLS;
 *    la base está cerrada al público.
 *  - DEMO (memoria): semilla en memoria para ver el CRM antes de conectar tu base.
 *    (No persiste entre reinicios serverless; en producción siempre va con Supabase.)
 *
 * Todo acceso del cliente entra por app/api/*, nunca directo: así la lista de
 * leads (PII) jamás viaja con la llave pública del navegador.
 */
import { adminDb, cloudReady } from "./supabase-admin";
import { normCorreo, normWhatsapp, normCodigoPostal } from "./normalize";
import { validarLead, validarLeadManual } from "./validacion";
import { hashPassword, verifyPassword } from "./auth";
import { faltaMigracion, MENSAJE_MIGRACION } from "./migracion";
import { esRamo } from "./ramos";
import { ubicacionDeCP } from "./codigos-postales";
import type {
  Lead,
  Actividad,
  TipoActividad,
  Usuario,
  RolUsuario,
  Ajustes,
  NuevoLead,
  NuevoLeadManual,
  Geo,
  Metricas,
  EtapaId,
  Genero,
  PlantillaMensaje,
  Ramo,
} from "./types";

export function isCloud(): boolean {
  return cloudReady;
}

// ----------------------------------------------------------------------------
// Almacén DEMO (memoria del proceso) — sobrevive al hot-reload de `next dev`.
// ----------------------------------------------------------------------------

interface UsuarioConClave extends Usuario {
  password_hash: string;
  password_salt: string;
}

interface Store {
  leads: Lead[];
  actividad: Actividad[];
  usuarios: UsuarioConClave[];
  ajustes: Record<string, string>;
  plantillas: PlantillaMensaje[];
  seq: number;
}

function nowISO(): string {
  return new Date().toISOString();
}
function isoHoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

const PLANTILLAS_DEFAULT: Omit<PlantillaMensaje, "id" | "creado_en">[] = [
  {
    nombre: "Primer contacto",
    canal: "whatsapp",
    cuerpo:
      "Hola {nombre}, soy Roberto Rodríguez de Asegurarte 👋. Vi que agendaste tu asesoría gratis sobre el seguro para cuando llegue el bebé. ¿Qué día y horario te acomoda esta semana?",
  },
  {
    nombre: "Seguimiento sin respuesta",
    canal: "whatsapp",
    cuerpo:
      "Hola {nombre}, te escribo de nuevo por si se te pasó mi mensaje. Sigo con espacio para tu asesoría gratis de 30 minutos, sin compromiso. ¿Te late que veamos horario?",
  },
  {
    nombre: "Reactivación de frío",
    canal: "whatsapp",
    cuerpo:
      "Hola {nombre}, ha pasado tiempo desde que platicamos. Si ya están más cerca de buscar el embarazo, este es un buen momento para resolver el tema del seguro antes del periodo de espera. ¿Seguimos la plática?",
  },
];

function seed(): Store {
  const lead = (
    id: string,
    nombre: string,
    correo: string,
    whatsapp: string,
    etapa: EtapaId,
    valor: number,
    origen: string,
    utm_source: string,
    horas: number,
  ): Lead => ({
    id,
    nombre,
    correo: normCorreo(correo),
    whatsapp: normWhatsapp(whatsapp),
    mensaje: "",
    etapa,
    valor,
    origen,
    utm_source,
    utm_medium: utm_source ? "cpc" : "",
    utm_campaign: utm_source ? "lanzamiento" : "",
    utm_term: "",
    utm_content: "",
    pais: "México",
    ciudad: "Guadalajara",
    region: "Jalisco",
    dispositivo: "Móvil",
    asignado_a: null,
    notas: "",
    genero: null,
    fecha_nacimiento: null,
    codigo_postal: null,
    ramo: null,
    cerrado_en: etapa === "ganado" ? isoHoursAgo(horas) : null,
    creado_en: isoHoursAgo(horas),
    actualizado_en: isoHoursAgo(horas),
  });

  const leads: Lead[] = [
    lead("ld_1", "Gabriela Mendoza", "gabriela.mendoza@gmail.com", "5512345678", "cita", 18000, "Instagram", "instagram", 2),
    lead("ld_2", "Roberto Cárdenas", "roberto@cardenas.mx", "5587654321", "propuesta", 42000, "Recomendación", "", 26),
    lead("ld_3", "María Fernanda López", "mafer.lopez@hotmail.com", "5511223344", "ganado", 25000, "Facebook", "facebook", 96),
    lead("ld_4", "Jorge Treviño", "jorge.trevino@gmail.com", "8112349876", "nuevo", 0, "Landing", "google", 1),
    lead("ld_5", "Claudia Ríos", "claudia@boutique.mx", "3339998877", "contactado", 15000, "Facebook", "facebook", 24),
    lead("ld_6", "Héctor Domínguez", "hector.dom@gmail.com", "5566778899", "cita", 20000, "Google", "google", 5),
    lead("ld_7", "Patricia Guzmán", "paty.guzman@gmail.com", "4412345566", "perdido", 0, "Instagram", "instagram", 336),
    lead("ld_8", "Andrés Salinas", "andres@salinas.mx", "8113344556", "propuesta", 68000, "Recomendación", "", 48),
    lead("ld_9", "Lucía Herrera", "lucia.herrera@gmail.com", "8187654321", "ganado", 14000, "Recomendación", "", 30),
    lead("ld_10", "Ernesto Vela", "ernesto.vela@gmail.com", "8123456789", "ganado", 9500, "Landing", "google", 50),
  ];
  // Ramos de muestra para que el Panel de Mando del demo tenga algo que medir.
  const ramosDemo: Record<string, Ramo> = { ld_1: "gmm", ld_2: "vida", ld_3: "gmm", ld_6: "vida", ld_8: "ahorro", ld_9: "vida", ld_10: "autos" };
  for (const l of leads) l.ramo = ramosDemo[l.id] ?? null;

  const actividad: Actividad[] = leads.map((l, i) => ({
    id: `ac_${i}`,
    lead_id: l.id,
    tipo: "nota" as TipoActividad,
    texto: "Llegó por la página de captura.",
    autor: "Sistema",
    creado_en: l.creado_en,
  }));

  // Usuario demo SOLO en memoria (jamás en Supabase). Bórralo en producción.
  const { hash, salt } = hashPassword("demo1234");
  const usuarios: UsuarioConClave[] = [
    {
      id: "us_demo",
      nombre: "Tú (demo)",
      correo: "demo@demo.com",
      rol: "admin",
      activo: true,
      creado_en: isoHoursAgo(200),
      password_hash: hash,
      password_salt: salt,
    },
  ];

  const ajustes: Record<string, string> = {
    whatsapp_url: "https://wa.me/528182800234",
    group_url: "",
    popup_activo: "false",
    negocio_nombre: "Roberto Rodríguez · Asegurarte",
    hero_titulo: "",
    hero_cta: "",
  };

  const plantillas: PlantillaMensaje[] = PLANTILLAS_DEFAULT.map((p, i) => ({
    id: `pl_${i}`,
    ...p,
    creado_en: isoHoursAgo(200),
  }));

  return { leads, actividad, usuarios, ajustes, plantillas, seq: 1 };
}

const g = globalThis as unknown as { __acmStore?: Store };
function store(): Store {
  if (!g.__acmStore) g.__acmStore = seed();
  return g.__acmStore;
}
function uid(prefix: string): string {
  const s = store();
  return `${prefix}_${(s.seq++).toString(36)}${Math.floor(performance.now() % 1e6).toString(36)}`;
}

// ----------------------------------------------------------------------------
// LEADS
// ----------------------------------------------------------------------------

export interface CrearLeadResultado {
  ok: boolean;
  duplicado: boolean;
  id?: string;
  errores?: Record<string, string>;
}

export async function crearLead(input: NuevoLead, geo?: Partial<Geo>): Promise<CrearLeadResultado> {
  // Honeypot: si el campo trampa viene lleno, es un bot. Fingimos éxito.
  if (input.trampa && input.trampa.trim().length > 0) {
    return { ok: true, duplicado: false };
  }

  // Consentimiento LFPDPPP obligatorio en el SERVIDOR (no solo en el cliente):
  // sin él, no guardamos PII. Backstop contra envíos directos por curl.
  if (!input.consentimiento) {
    return { ok: false, duplicado: false, errores: { consentimiento: "Debes aceptar el aviso de privacidad." } };
  }

  const v = validarLead(input);
  if (!v.ok) return { ok: false, duplicado: false, errores: v.errores };

  const nombre = input.nombre.trim().slice(0, 160);
  const correo = normCorreo(input.correo);
  const whatsapp = normWhatsapp(input.whatsapp);
  const mensaje = (input.mensaje ?? "").trim().slice(0, 1000);
  const utm = input.utm ?? {};
  const fila = {
    nombre,
    correo,
    whatsapp,
    mensaje,
    etapa: "nuevo" as EtapaId,
    valor: 0,
    origen: utm.source ? "campaña" : "landing",
    utm_source: (utm.source ?? "").slice(0, 120),
    utm_medium: (utm.medium ?? "").slice(0, 120),
    utm_campaign: (utm.campaign ?? "").slice(0, 120),
    utm_term: (utm.term ?? "").slice(0, 120),
    utm_content: (utm.content ?? "").slice(0, 120),
    pais: geo?.pais ?? null,
    ciudad: geo?.ciudad ?? null,
    region: geo?.region ?? null,
    dispositivo: geo?.dispositivo ?? null,
    notas: "",
    genero: null as Genero | null,
    fecha_nacimiento: null as string | null,
    codigo_postal: null as string | null,
  };

  if (cloudReady && adminDb) {
    // Dedupe con consultas .eq() PARAMETRIZADAS (no interpolamos en .or(): eso
    // permitiría inyección de filtros PostgREST vía el campo correo).
    if (correo) {
      const { data } = await adminDb.from("leads").select("id").eq("correo", correo).limit(1);
      if (data && data.length) return { ok: true, duplicado: true, id: (data[0] as { id: string }).id };
    }
    if (whatsapp) {
      const { data } = await adminDb.from("leads").select("id").eq("whatsapp", whatsapp).limit(1);
      if (data && data.length) return { ok: true, duplicado: true, id: (data[0] as { id: string }).id };
    }

    const { data, error } = await adminDb.from("leads").insert(fila).select("id").limit(1);
    if (error) throw new Error(error.message);
    const id = (data?.[0] as { id: string } | undefined)?.id;
    if (id) {
      await adminDb.from("actividad").insert({
        lead_id: id,
        tipo: "nota",
        texto: "Llegó por la página de captura.",
        autor: "Sistema",
      });
    }
    return { ok: true, duplicado: false, id };
  }

  const s = store();
  const existe = s.leads.find((l) => (correo && l.correo === correo) || (whatsapp && l.whatsapp === whatsapp));
  if (existe) return { ok: true, duplicado: true, id: existe.id };
  const id = uid("ld");
  const lead: Lead = {
    id,
    asignado_a: null,
    ramo: null,
    cerrado_en: null,
    creado_en: nowISO(),
    actualizado_en: nowISO(),
    ...fila,
  };
  s.leads.unshift(lead);
  s.actividad.unshift({
    id: uid("ac"),
    lead_id: id,
    tipo: "nota",
    texto: "Llegó por la página de captura.",
    autor: "Sistema",
    creado_en: nowISO(),
  });
  return { ok: true, duplicado: false, id };
}

const ETAPAS_VALIDAS: EtapaId[] = ["nuevo", "contactado", "cita", "propuesta", "ganado", "perdido"];

/**
 * Prospecto capturado a mano desde el CRM (sin formulario público, sin consentimiento en pantalla:
 * quien captura es tu equipo, ya con la persona). Entra con la etapa que elijas.
 * Un vendedor lo captura ya asignado a él, para verlo en su cartera.
 */
export async function crearLeadManual(input: NuevoLeadManual, autor: string, asignadoA: string | null): Promise<CrearLeadResultado> {
  const v = validarLeadManual(input);
  if (!v.ok) return { ok: false, duplicado: false, errores: v.errores };
  if (!ETAPAS_VALIDAS.includes(input.etapa)) return { ok: false, duplicado: false, errores: { etapa: "Elige una etapa." } };
  if (input.ramo !== null && !esRamo(input.ramo)) return { ok: false, duplicado: false, errores: { ramo: "Elige un ramo válido." } };

  const correo = normCorreo(input.correo);
  const whatsapp = normWhatsapp(input.whatsapp);
  const ahora = nowISO();
  const fila = {
    nombre: input.nombre.trim().slice(0, 160),
    correo,
    whatsapp,
    mensaje: "",
    etapa: input.etapa,
    valor: Math.max(0, Math.round(Number(input.valor) || 0)),
    origen: (input.origen || "Manual").trim().slice(0, 60) || "Manual",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_term: "",
    utm_content: "",
    pais: null,
    ciudad: null,
    region: null,
    dispositivo: null,
    notas: (input.notas ?? "").slice(0, 4000),
    genero: null as Genero | null,
    fecha_nacimiento: null as string | null,
    codigo_postal: null as string | null,
    asignado_a: asignadoA,
    ramo: input.ramo,
    cerrado_en: input.etapa === "ganado" ? ahora : null,
  };
  const textoActividad = `Capturado a mano por ${autor} (${fila.origen}) en la etapa "${fila.etapa}".`;

  if (cloudReady && adminDb) {
    // Mismas consultas parametrizadas que la captura pública.
    if (correo) {
      const { data } = await adminDb.from("leads").select("id").eq("correo", correo).limit(1);
      if (data && data.length) return { ok: true, duplicado: true, id: (data[0] as { id: string }).id };
    }
    if (whatsapp) {
      const { data } = await adminDb.from("leads").select("id").eq("whatsapp", whatsapp).limit(1);
      if (data && data.length) return { ok: true, duplicado: true, id: (data[0] as { id: string }).id };
    }
    let { data, error } = await adminDb.from("leads").insert(fila).select("id").limit(1);
    if (error && faltaMigracion(error)) {
      // Sin la migración 0003 no existen ramo ni cerrado_en: el prospecto entra igual, sin ramo.
      if (input.ramo !== null) throw new Error(MENSAJE_MIGRACION);
      const { ramo: _r, cerrado_en: _c, ...sinCamposNuevos } = fila;
      void _r;
      void _c;
      ({ data, error } = await adminDb.from("leads").insert(sinCamposNuevos).select("id").limit(1));
    }
    if (error) throw new Error(error.message);
    const id = (data?.[0] as { id: string } | undefined)?.id;
    if (id) await adminDb.from("actividad").insert({ lead_id: id, tipo: "nota", texto: textoActividad, autor });
    return { ok: true, duplicado: false, id };
  }

  const s = store();
  const existe = s.leads.find((l) => (correo && l.correo === correo) || (whatsapp && l.whatsapp === whatsapp));
  if (existe) return { ok: true, duplicado: true, id: existe.id };
  const id = uid("ld");
  s.leads.unshift({ id, creado_en: ahora, actualizado_en: ahora, ...fila });
  s.actividad.unshift({ id: uid("ac"), lead_id: id, tipo: "nota", texto: textoActividad, autor, creado_en: ahora });
  return { ok: true, duplicado: false, id };
}

/**
 * Completa los campos del AI Manager (ramo, cerrado_en) en filas de la nube:
 * si la migración 0003 aún no corre, esas columnas no vienen y quedan en null.
 */
function conCamposManager(fila: Lead): Lead {
  return { ...fila, ramo: esRamo(fila.ramo) ? fila.ramo : null, cerrado_en: fila.cerrado_en ?? null };
}

/**
 * Lista leads. Si `asignadoA` viene, filtra solo lo de ese vendedor — así un
 * vendedor nunca ve la cartera de otro (RLS no aplica porque el servidor usa
 * la service_role; este filtro es la barrera real de "quién ve qué").
 */
export async function listLeads(asignadoA?: string): Promise<Lead[]> {
  if (cloudReady && adminDb) {
    let q = adminDb.from("leads").select("*").order("creado_en", { ascending: false });
    if (asignadoA) q = q.eq("asignado_a", asignadoA);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return ((data as Lead[]) ?? []).map(conCamposManager);
  }
  const leads = [...store().leads].sort((a, b) => b.creado_en.localeCompare(a.creado_en));
  return asignadoA ? leads.filter((l) => l.asignado_a === asignadoA) : leads;
}

export async function getLead(id: string, asignadoA?: string): Promise<Lead | null> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb.from("leads").select("*").eq("id", id).limit(1);
    if (error) throw new Error(error.message);
    const lead = data?.[0] ? conCamposManager(data[0] as Lead) : null;
    if (lead && asignadoA && lead.asignado_a !== asignadoA) return null;
    return lead;
  }
  const lead = store().leads.find((l) => l.id === id) ?? null;
  if (lead && asignadoA && lead.asignado_a !== asignadoA) return null;
  return lead;
}

export interface LeadPatch {
  nombre?: string;
  notas?: string;
  valor?: number;
  asignado_a?: string | null;
  etapa?: EtapaId;
  genero?: Genero | null;
  fecha_nacimiento?: string | null;
  codigo_postal?: string | null;
  ramo?: Ramo | null;
}

export async function actualizarLead(
  id: string,
  patch: LeadPatch,
  autor = "Equipo",
  asignadoA?: string,
): Promise<Lead | null> {
  if (asignadoA) {
    const actual = await getLead(id, asignadoA);
    if (!actual) return null; // no es su lead: no existe para él
  }

  const limpio: Record<string, unknown> = { actualizado_en: nowISO() };
  if (patch.nombre !== undefined) limpio.nombre = patch.nombre.trim().slice(0, 160);
  if (patch.notas !== undefined) limpio.notas = patch.notas.slice(0, 4000);
  if (patch.valor !== undefined) limpio.valor = Math.max(0, Math.round(patch.valor));
  if (patch.asignado_a !== undefined) limpio.asignado_a = patch.asignado_a;
  if (patch.etapa !== undefined) limpio.etapa = patch.etapa;
  if (patch.genero !== undefined) limpio.genero = patch.genero;
  if (patch.fecha_nacimiento !== undefined) limpio.fecha_nacimiento = patch.fecha_nacimiento;
  if (patch.codigo_postal !== undefined) limpio.codigo_postal = patch.codigo_postal ? normCodigoPostal(patch.codigo_postal) : null;
  if (patch.ramo !== undefined) limpio.ramo = patch.ramo;
  // La fecha de cierre alimenta tu meta: se pone al pasar a "ganado" y se borra si regresa.
  if (patch.etapa !== undefined) limpio.cerrado_en = patch.etapa === "ganado" ? nowISO() : null;
  // Con el código postal capturado, la ciudad, el estado y el país se rellenan solos (catálogo de Correos de México).
  if (typeof limpio.codigo_postal === "string") {
    const u = await ubicacionDeCP(limpio.codigo_postal);
    if (u) {
      limpio.ciudad = u.ciudad;
      limpio.region = u.estado;
      limpio.pais = u.pais;
    }
  }

  if (cloudReady && adminDb) {
    let { data, error } = await adminDb.from("leads").update(limpio).eq("id", id).select("*").limit(1);
    if (error && faltaMigracion(error)) {
      // Sin la migración 0003 tu CRM sigue funcionando igual que antes: guardamos
      // todo menos los campos nuevos. Solo el ramo necesita la migración.
      if (patch.ramo !== undefined) throw new Error(MENSAJE_MIGRACION);
      const { ramo: _r, cerrado_en: _c, ...sinCamposNuevos } = limpio;
      void _r;
      void _c;
      ({ data, error } = await adminDb.from("leads").update(sinCamposNuevos).eq("id", id).select("*").limit(1));
    }
    if (error) throw new Error(error.message);
    const lead = data?.[0] ? conCamposManager(data[0] as Lead) : null;
    if (lead && patch.etapa !== undefined) {
      await adminDb.from("actividad").insert({
        lead_id: id,
        tipo: "etapa",
        texto: `Pasó a "${patch.etapa}"`,
        autor,
      });
    }
    return lead;
  }

  const s = store();
  const lead = s.leads.find((l) => l.id === id);
  if (!lead) return null;
  Object.assign(lead, limpio);
  if (patch.etapa !== undefined) {
    s.actividad.unshift({
      id: uid("ac"),
      lead_id: id,
      tipo: "etapa",
      texto: `Pasó a "${patch.etapa}"`,
      autor,
      creado_en: nowISO(),
    });
  }
  return lead;
}

export async function eliminarLead(id: string): Promise<void> {
  if (cloudReady && adminDb) {
    const { error } = await adminDb.from("leads").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const s = store();
  s.leads = s.leads.filter((l) => l.id !== id);
  s.actividad = s.actividad.filter((a) => a.lead_id !== id);
}

// ----------------------------------------------------------------------------
// ACTIVIDAD (timeline)
// ----------------------------------------------------------------------------

export async function listActividad(lead_id: string): Promise<Actividad[]> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb
      .from("actividad")
      .select("*")
      .eq("lead_id", lead_id)
      .order("creado_en", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as Actividad[]) ?? [];
  }
  return store()
    .actividad.filter((a) => a.lead_id === lead_id)
    .sort((a, b) => b.creado_en.localeCompare(a.creado_en));
}

export async function agregarActividad(
  lead_id: string,
  item: { tipo: TipoActividad; texto: string; autor: string },
  asignadoA?: string,
): Promise<void> {
  if (asignadoA) {
    const actual = await getLead(lead_id, asignadoA);
    if (!actual) return; // no es su lead: no-op silencioso
  }
  if (cloudReady && adminDb) {
    const { error } = await adminDb.from("actividad").insert({ lead_id, ...item });
    if (error) throw new Error(error.message);
    await adminDb.from("leads").update({ actualizado_en: nowISO() }).eq("id", lead_id);
    return;
  }
  const s = store();
  s.actividad.unshift({ id: uid("ac"), lead_id, ...item, creado_en: nowISO() });
  const lead = s.leads.find((l) => l.id === lead_id);
  if (lead) lead.actualizado_en = nowISO();
}

// ----------------------------------------------------------------------------
// MÉTRICAS + EXPORT
// ----------------------------------------------------------------------------

export async function metricas(): Promise<Metricas> {
  const leads = await listLeads();
  const hoy = new Date().toISOString().slice(0, 10);
  const porEtapa = (["nuevo", "contactado", "cita", "propuesta", "ganado", "perdido"] as EtapaId[]).map(
    (etapa) => ({ etapa, count: leads.filter((l) => l.etapa === etapa).length }),
  );
  const ganados = leads.filter((l) => l.etapa === "ganado").length;
  const valorGanado = leads.filter((l) => l.etapa === "ganado").reduce((s, l) => s + l.valor, 0);
  const conversion = leads.length ? Math.round((ganados / leads.length) * 100) : 0;
  const nuevosHoy = leads.filter((l) => l.creado_en.slice(0, 10) === hoy).length;
  return { totalLeads: leads.length, porEtapa, ganados, valorGanado, conversion, nuevosHoy, cloud: cloudReady };
}

function csvCampo(v: string): string {
  const s = v ?? "";
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportarLeadsCSV(): Promise<string> {
  const leads = await listLeads();
  const cab = [
    "nombre", "correo", "whatsapp", "genero", "fecha_nacimiento", "codigo_postal", "etapa", "ramo", "valor", "origen",
    "utm_source", "utm_medium", "utm_campaign", "pais", "ciudad", "dispositivo", "creado_en",
  ];
  const filas = leads.map((l) =>
    [
      l.nombre, l.correo, l.whatsapp, l.genero ?? "", l.fecha_nacimiento ?? "", l.codigo_postal ?? "",
      l.etapa, l.ramo ?? "", String(l.valor), l.origen,
      l.utm_source, l.utm_medium, l.utm_campaign, l.pais ?? "", l.ciudad ?? "", l.dispositivo ?? "", l.creado_en,
    ]
      .map(csvCampo)
      .join(","),
  );
  return [cab.join(","), ...filas].join("\n");
}

// ----------------------------------------------------------------------------
// AJUSTES (config editable)
// ----------------------------------------------------------------------------

function aBool(v: string | undefined): boolean {
  return v === "true" || v === "1";
}

export async function getAjustes(): Promise<Ajustes> {
  if (cloudReady && adminDb) {
    const { data } = await adminDb.from("ajustes").select("clave,valor");
    const map = new Map((data ?? []).map((r) => [(r as { clave: string }).clave, (r as { valor: string }).valor]));
    return {
      whatsapp_url: map.get("whatsapp_url") ?? "",
      group_url: map.get("group_url") ?? "",
      popup_activo: aBool(map.get("popup_activo")),
      negocio_nombre: map.get("negocio_nombre") ?? "Roberto Rodríguez · Asegurarte",
      hero_titulo: map.get("hero_titulo") ?? "",
      hero_cta: map.get("hero_cta") ?? "",
    };
  }
  const a = store().ajustes;
  return {
    whatsapp_url: a.whatsapp_url ?? "",
    group_url: a.group_url ?? "",
    popup_activo: aBool(a.popup_activo),
    negocio_nombre: a.negocio_nombre ?? "Roberto Rodríguez · Asegurarte",
    hero_titulo: a.hero_titulo ?? "",
    hero_cta: a.hero_cta ?? "",
  };
}

const CLAVES_AJUSTE = new Set([
  "whatsapp_url",
  "group_url",
  "popup_activo",
  "negocio_nombre",
  "hero_titulo",
  "hero_cta",
]);

export async function setAjuste(clave: string, valor: string): Promise<void> {
  if (!CLAVES_AJUSTE.has(clave)) throw new Error("Ajuste no permitido.");
  const v = valor.trim().slice(0, 500);
  if (cloudReady && adminDb) {
    const { error } = await adminDb
      .from("ajustes")
      .upsert({ clave, valor: v, actualizado_en: nowISO() }, { onConflict: "clave" });
    if (error) throw new Error(error.message);
    return;
  }
  store().ajustes[clave] = v;
}

// ----------------------------------------------------------------------------
// USUARIOS (equipo del CRM, con contraseña real)
// ----------------------------------------------------------------------------

function sinClave(u: UsuarioConClave): Usuario {
  const { password_hash: _h, password_salt: _s, ...rest } = u;
  void _h;
  void _s;
  return rest;
}

export async function listUsuarios(): Promise<Usuario[]> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb
      .from("usuarios")
      .select("id,nombre,correo,rol,activo,creado_en")
      .order("creado_en", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as Usuario[]) ?? [];
  }
  return store().usuarios.map(sinClave);
}

export interface NuevoUsuario {
  nombre: string;
  correo: string;
  rol: RolUsuario;
  password: string;
}

export async function crearUsuario(input: NuevoUsuario): Promise<{ ok: boolean; duplicado: boolean; usuario?: Usuario }> {
  const nombre = input.nombre.trim().slice(0, 160) || "Usuario";
  const correo = normCorreo(input.correo);
  const rol: RolUsuario = input.rol === "admin" ? "admin" : "vendedor";
  if (!correo.includes("@")) throw new Error("Correo inválido.");
  if (input.password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
  const { hash, salt } = hashPassword(input.password);

  if (cloudReady && adminDb) {
    const { data: dup } = await adminDb.from("usuarios").select("id").eq("correo", correo).limit(1);
    if (dup && dup.length) return { ok: true, duplicado: true };
    const { data, error } = await adminDb
      .from("usuarios")
      .insert({ nombre, correo, rol, password_hash: hash, password_salt: salt })
      .select("id,nombre,correo,rol,activo,creado_en")
      .limit(1);
    if (error) throw new Error(error.message);
    return { ok: true, duplicado: false, usuario: data?.[0] as Usuario };
  }

  const s = store();
  if (s.usuarios.some((u) => u.correo === correo)) return { ok: true, duplicado: true };
  const u: UsuarioConClave = {
    id: uid("us"),
    nombre,
    correo,
    rol,
    activo: true,
    creado_en: nowISO(),
    password_hash: hash,
    password_salt: salt,
  };
  s.usuarios.push(u);
  return { ok: true, duplicado: false, usuario: sinClave(u) };
}

export async function loginUsuario(correo: string, password: string): Promise<Usuario | null> {
  const c = normCorreo(correo);
  if (cloudReady && adminDb) {
    const { data } = await adminDb
      .from("usuarios")
      .select("id,nombre,correo,rol,activo,creado_en,password_hash,password_salt")
      .eq("correo", c)
      .limit(1);
    const u = data?.[0] as UsuarioConClave | undefined;
    if (!u || !u.activo) return null;
    return verifyPassword(password, u.password_hash, u.password_salt) ? sinClave(u) : null;
  }
  const u = store().usuarios.find((x) => x.correo === c);
  if (!u || !u.activo) return null;
  return verifyPassword(password, u.password_hash, u.password_salt) ? sinClave(u) : null;
}

export async function eliminarUsuario(id: string): Promise<void> {
  if (cloudReady && adminDb) {
    const { error } = await adminDb.from("usuarios").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const s = store();
  s.usuarios = s.usuarios.filter((u) => u.id !== id);
}

// ----------------------------------------------------------------------------
// PLANTILLAS DE MENSAJE (primer contacto, seguimiento, reactivación…)
// ----------------------------------------------------------------------------

export async function listPlantillas(): Promise<PlantillaMensaje[]> {
  if (cloudReady && adminDb) {
    const { data, error } = await adminDb
      .from("plantillas_mensaje")
      .select("*")
      .order("creado_en", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as PlantillaMensaje[]) ?? [];
  }
  return [...store().plantillas];
}

export async function guardarPlantilla(
  input: Omit<PlantillaMensaje, "id" | "creado_en"> & { id?: string },
): Promise<PlantillaMensaje> {
  const nombre = input.nombre.trim().slice(0, 120) || "Sin nombre";
  const cuerpo = input.cuerpo.trim().slice(0, 1000);
  const canal = input.canal === "correo" ? "correo" : "whatsapp";

  if (cloudReady && adminDb) {
    if (input.id) {
      const { data, error } = await adminDb
        .from("plantillas_mensaje")
        .update({ nombre, cuerpo, canal })
        .eq("id", input.id)
        .select("*")
        .limit(1);
      if (error) throw new Error(error.message);
      return data?.[0] as PlantillaMensaje;
    }
    const { data, error } = await adminDb
      .from("plantillas_mensaje")
      .insert({ nombre, cuerpo, canal })
      .select("*")
      .limit(1);
    if (error) throw new Error(error.message);
    return data?.[0] as PlantillaMensaje;
  }

  const s = store();
  if (input.id) {
    const p = s.plantillas.find((x) => x.id === input.id);
    if (!p) throw new Error("Plantilla no encontrada.");
    Object.assign(p, { nombre, cuerpo, canal });
    return p;
  }
  const nueva: PlantillaMensaje = { id: uid("pl"), nombre, cuerpo, canal, creado_en: nowISO() };
  s.plantillas.push(nueva);
  return nueva;
}

export async function eliminarPlantilla(id: string): Promise<void> {
  if (cloudReady && adminDb) {
    const { error } = await adminDb.from("plantillas_mensaje").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const s = store();
  s.plantillas = s.plantillas.filter((p) => p.id !== id);
}
