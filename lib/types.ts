/**
 * Tipos compartidos cliente ↔ servidor (sin dependencias de runtime).
 * Viven aparte de lib/db.ts (server-only) para que el cliente pueda tiparse
 * sin arrastrar el bundle del servidor.
 */

export type EtapaId =
  | "nuevo"
  | "contactado"
  | "cita"
  | "propuesta"
  | "ganado"
  | "perdido";

export interface Etapa {
  id: EtapaId;
  nombre: string;
  /** Token CSS (var(--…)) — sin hex hardcodeado fuera de globals.css. */
  color: string;
}

export type TipoActividad =
  | "nota"
  | "llamada"
  | "mensaje"
  | "correo"
  | "cita"
  | "etapa"
  | "pago";

export interface UTM {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
}

export interface Geo {
  pais: string | null;
  ciudad: string | null;
  region: string | null;
  dispositivo: string | null;
}

export type Genero = "mujer" | "hombre" | "prefiero_no_decir";

export interface Lead {
  id: string;
  nombre: string;
  correo: string;
  whatsapp: string;
  mensaje: string;
  etapa: EtapaId;
  valor: number;
  origen: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  pais: string | null;
  ciudad: string | null;
  region: string | null;
  dispositivo: string | null;
  asignado_a: string | null;
  notas: string;
  /** Datos que el vendedor completa durante la asesoría (no van en el form público). */
  genero: Genero | null;
  fecha_nacimiento: string | null;
  codigo_postal: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface Actividad {
  id: string;
  lead_id: string;
  tipo: TipoActividad;
  texto: string;
  autor: string;
  creado_en: string;
}

export type RolUsuario = "admin" | "vendedor";

/** Usuario tal como lo ve el cliente (NUNCA incluye hash/salt). */
export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
  creado_en: string;
}

/** Sesión mínima del CRM (lo que viaja en la cookie firmada). */
export interface Sesion {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
}

export interface Ajustes {
  whatsapp_url: string;
  group_url: string;
  popup_activo: boolean;
  negocio_nombre: string;
  hero_titulo: string;
  hero_cta: string;
}

/** Lo que entra desde la página de captura (sin tocar aún la base). */
export interface NuevoLead {
  nombre: string;
  correo: string;
  whatsapp: string;
  mensaje?: string;
  utm?: Partial<UTM>;
  geo?: Partial<Geo>;
  /** Consentimiento LFPDPPP. El servidor RECHAZA el lead si no es true. */
  consentimiento?: boolean;
  /** Honeypot anti-spam: si trae valor, es un bot. */
  trampa?: string;
}

/** Plantilla de mensaje reutilizable (WhatsApp/correo) con variables {nombre}. */
export interface PlantillaMensaje {
  id: string;
  nombre: string;
  canal: "whatsapp" | "correo";
  cuerpo: string;
  creado_en: string;
}

export interface Metricas {
  totalLeads: number;
  porEtapa: { etapa: EtapaId; count: number }[];
  ganados: number;
  valorGanado: number;
  conversion: number;
  nuevosHoy: number;
  cloud: boolean;
}

export interface ImportResult {
  total: number;
  creados: number;
  duplicados: number;
  errores: string[];
}
