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

/** Ramo del seguro. Cada uno tiene su propia meta en el Panel de Mando. */
export type Ramo = "vida" | "gmm" | "ahorro" | "autos" | "hogar";

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
  /** Ramo del seguro que le vendes (null = sin definir). Cuenta para tu meta. */
  ramo: Ramo | null;
  /** Cuándo pasó a "Cliente ganado". Null si no está ganado. */
  cerrado_en: string | null;
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

// ----------------------------------------------------------------------------
// AI MANAGER (Módulo 3): finanzas, Panel de Mando y RORO
// ----------------------------------------------------------------------------

export type TipoMovimiento = "ingreso" | "gasto";
export type EstadoMovimiento = "confirmado" | "por_confirmar";

/** Un movimiento de dinero: lo que entró (comisión, bono) o lo que salió (gasto). */
export interface Movimiento {
  id: string;
  /** AAAA-MM-DD */
  fecha: string;
  concepto: string;
  tipo: TipoMovimiento;
  monto: number;
  categoria: string;
  ramo: Ramo | null;
  estado: EstadoMovimiento;
  conciliado: boolean;
  notas: string;
  creado_en: string;
}

export type NuevoMovimiento = Omit<Movimiento, "id" | "creado_en">;

export type PeriodoPanel = "mes" | "mes_pasado" | "meta";

/** Semáforo de cada número: siempre se muestra con ícono + palabra, nunca solo color. */
export type EstadoSemaforo = "bien" | "atencion" | "alerta" | "neutral";

export interface RangoFechas {
  desde: string;
  hasta: string;
  etiqueta: string;
}

export interface KpiPanel {
  id: "polizas" | "entro" | "salio" | "quedo";
  titulo: string;
  valor: number;
  formato: "numero" | "moneda";
  /** Mismo número en el periodo anterior (null = no aplica). */
  anterior: number | null;
  /** Para las pólizas: cuántas deberías llevar a hoy para ir en ritmo con tu meta. */
  ritmo: number | null;
  estado: EstadoSemaforo;
  aviso: string | null;
  subtitulo: string;
  explicacion: string;
}

export interface AvanceRamo {
  ramo: Ramo;
  cerradas: number;
  /** Meta de este ramo para el periodo (ya prorrateada de tu meta de 90 días). */
  meta: number;
  /** Cuántas deberías llevar a hoy para ir en ritmo. */
  ritmo: number;
  estado: EstadoSemaforo;
}

export interface MesFinanzas {
  /** AAAA-MM */
  mes: string;
  etiqueta: string;
  entro: number;
  salio: number;
}

export interface GastoCategoria {
  categoria: string;
  monto: number;
}

export interface PanelSnapshot {
  periodo: PeriodoPanel;
  actual: RangoFechas;
  anterior: RangoFechas;
  /** El reporte de una frase de hoy (siempre del mes en curso + tu meta). */
  frase: string;
  kpis: KpiPanel[];
  ramos: {
    titulo: string;
    porRamo: AvanceRamo[];
    sinRamo: number;
    hayMeta: boolean;
  };
  meta: {
    inicio: string;
    fin: string;
    porRamo: number;
    total: number;
    cerradas: number;
    dia: number;
    diasTotales: number;
  };
  meses: MesFinanzas[];
  gastosPorCategoria: GastoCategoria[];
  porConfirmar: number;
  hayFinanzas: boolean;
  generado_en: string;
  cloud: boolean;
}

export interface ManagerConfig {
  nombre: string;
  /** Lo que RORO sabe de tu negocio (editable desde su pestaña). */
  cerebro: string;
  meta_por_ramo: number;
  meta_inicio: string;
  meta_fin: string;
}

export interface ManagerUso {
  mes: string;
  usadas: number;
  tope: number;
}

export interface ManagerEstado {
  config: ManagerConfig;
  /** El texto base del cerebro (para "restaurar"). */
  cerebroBase: string;
  uso: ManagerUso;
  /** true cuando hay llave de IA configurada en el servidor. */
  iaLista: boolean;
  migracionPendiente: boolean;
}

/** Respuesta de RORO: siempre con el formato de un director, no de un buscador. */
export interface RespuestaManager {
  tipo: "decision" | "respuesta" | "falta_dato";
  resumen: string;
  recomendacion: string;
  porque: string;
  riesgo: string;
  accion_hoy: string;
  dato_faltante: string;
}

/** Un turno del chat con RORO tal como viaja del navegador al servidor. */
export interface TurnoManager {
  rol: "usuario" | "roro";
  texto: string;
}

// ----------------------------------------------------------------------------
// COBRANZA: Valeri, tu empleado digital de cobranza
// ----------------------------------------------------------------------------

export type FormaPago = "anual" | "semestral" | "trimestral" | "mensual";

/** Una póliza de tu cartera (lo que Valeri vigila para cobrar). */
export interface Poliza {
  id: string;
  numero: string;
  asegurado: string;
  whatsapp: string;
  correo: string;
  ramo: Ramo | null;
  aseguradora: string;
  /** Lo que paga el cliente en cada recibo (0 = sin dato). */
  monto_pago: number;
  prima_anual: number;
  forma_pago: FormaPago;
  inicio: string | null;
  renovacion: string | null;
  /** Fecha límite del recibo que toca pagar (AAAA-MM-DD). */
  fecha_limite_pago: string | null;
  estatus_manual: "promesa" | "cancelada" | null;
  promesa_fecha: string | null;
  ultimo_pago: string | null;
  ultimo_recordatorio: string | null;
  lead_id: string | null;
  notas: string;
  creado_en: string;
  actualizado_en: string;
}

/** Lo que se puede capturar o editar de una póliza. */
export type DatosPoliza = Pick<
  Poliza,
  | "numero"
  | "asegurado"
  | "whatsapp"
  | "correo"
  | "ramo"
  | "aseguradora"
  | "monto_pago"
  | "prima_anual"
  | "forma_pago"
  | "inicio"
  | "renovacion"
  | "fecha_limite_pago"
  | "notas"
  | "lead_id"
>;

export type EstadoCobro = "vencida" | "promesa_vencida" | "promesa" | "por_vencer" | "al_corriente" | "sin_fecha" | "cancelada";

// ----------------------------------------------------------------------------
// CRECIMIENTO: producción por mes y ramo (de los reportes de prima pagada)
// ----------------------------------------------------------------------------

/** Totales de UN mes y UN ramo (sin clientes). */
export interface ProduccionMes {
  /** AAAA-MM (mes en que se aplicó el pago) */
  mes: string;
  aseguradora: string;
  ramo: Ramo;
  subramo: string;
  moneda: "MN" | "DLS";
  pagos: number;
  prima: number;
  comision: number;
  ultimo_dia: string | null;
}

export type MetricaCrecimiento = "prima" | "comision" | "pagos";

/** Resumen de cobranza (solo totales, sin datos de clientes). */
export interface ResumenCobranza {
  polizas: number;
  vencidas: number;
  montoVencido: number;
  porVencer: number;
  montoPorVencer: number;
  promesas: number;
  renuevan: number;
  sinWhatsapp: number;
  recordadasHoy: number;
  /** La línea diaria de Valeri. */
  frase: string;
}
