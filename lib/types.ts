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
  /** Si ya enlazó su app autenticadora (doble factor). Solo viene en la lista del panel de admin. */
  mfa_activo?: boolean;
}

/** Estado del doble factor de una persona, tal como se guarda (el secreto va CIFRADO; nunca sale del servidor). */
export interface EstadoMfa {
  activo: boolean;
  secreto: string;
  /** Último paso de 30 s aceptado: un código ya usado no sirve otra vez. */
  ultimoPaso: number;
  fallos: number;
  bloqueoHasta: string | null;
  /** Huellas de los códigos de respaldo que aún no se han usado. */
  respaldo: string[];
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
  /** Lo que paga el cliente en cada recibo (0 = sin dato). En pólizas no anuales son los pagos SUBSECUENTES. */
  monto_pago: number;
  /** Lo que cuesta el primer recibo de la vigencia (lleva el derecho de póliza). 0 = todos los pagos son iguales. */
  primer_pago: number;
  /** El próximo pago por cobrar es ese primer pago (pasa a false al marcar «Pagó»; al renovar vuelve a true). */
  primer_pago_pendiente: boolean;
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
  /** A qué cliente (expediente único) pertenece. Null = todavía sin ligar. */
  cliente_id: string | null;
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
  | "primer_pago"
  | "primer_pago_pendiente"
  | "prima_anual"
  | "forma_pago"
  | "inicio"
  | "renovacion"
  | "fecha_limite_pago"
  | "notas"
  | "lead_id"
>;

// ----------------------------------------------------------------------------
// VENTA CRUZADA: Camila y el expediente único del cliente
// ----------------------------------------------------------------------------

export type TipoCliente = "persona" | "empresa";

/** Una persona o empresa a la que le has vendido (o le puedes vender): su expediente único. */
/** Cómo se relaciona un familiar con el titular (el cliente que tiene las pólizas). */
export type Parentesco = "conyuge" | "hijo" | "padre_madre" | "otro";

export interface Cliente {
  id: string;
  nombre: string;
  tipo: TipoCliente;
  whatsapp: string;
  correo: string;
  fecha_nacimiento: string | null;
  genero: Genero | null;
  codigo_postal: string | null;
  /** El prospecto con el que se le vendió o cotizó. */
  lead_id: string | null;
  /** true = no ofrecerle venta cruzada. */
  no_ofrecer: boolean;
  notas: string;
  /** Si es familiar de otro cliente: el titular (null = es titular o no tiene familia ligada). */
  titular_id: string | null;
  parentesco: Parentesco | null;
  /** Cuándo se le pidieron referidos por última vez (para no pedirlos otra vez en 90 días). */
  referidos_pedidos_en: string | null;
  creado_en: string;
  actualizado_en: string;
}

/** Lo que se puede capturar o corregir de un cliente. */
export type DatosCliente = Pick<
  Cliente,
  "nombre" | "tipo" | "whatsapp" | "correo" | "fecha_nacimiento" | "genero" | "codigo_postal" | "no_ofrecer" | "notas"
>;

/** Una póliza que se conoce por tus reportes de AXA (no es cobranza: solo sirve para saber qué tiene el cliente). */
export interface LibroPoliza {
  numero: string;
  cliente_id: string | null;
  asegurado: string;
  ramo: Ramo;
  subramo: string;
  aseguradora: string;
  inicio_vigencia: string | null;
  ultimo_pago: string | null;
  /** Próxima renovación; solo viene cuando se pudo saber con confianza. */
  renovacion: string | null;
  pagos_12m: number;
  prima_ultima: number;
  vigente: boolean;
  fuente: string;
}

export type EstadoOferta = "pendiente" | "ofrecida" | "cotizada" | "cerrada" | "no_interesa";

/** Cómo va lo que se le ofreció a un cliente en un ramo. */
export interface EstadoCruzada {
  cliente_id: string;
  ramo: Ramo;
  estado: EstadoOferta;
  /** El prospecto de Cotizaciones que lleva esta venta cruzada (para registrarla como cliente ganado al cerrarla). */
  lead_id: string | null;
  ofrecida_en: string | null;
  volver_a_ofrecer: string | null;
  nota: string;
  actualizado_en: string;
}

/** Un momento de confianza que ya atendiste (cumpleaños, revisión de renovación, pago…): deja de aparecer. */
export interface MomentoHecho {
  cliente_id: string;
  clave: string;
  hecho_en: string;
}

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

// ----------------------------------------------------------------------------
// REPORTES: Clara, tu empleada digital de reportes (mensual y trimestral)
// ----------------------------------------------------------------------------

export type TipoReporte = "mes" | "trimestre";

/** Una cifra grande del reporte (ya formateada). */
export interface CifraReporte {
  titulo: string;
  valor: string;
  detalle: string;
  /** "▲ 12% vs agosto" (null = sin comparación). */
  cambio: string | null;
  tono: "bien" | "mal" | "neutral";
}

export interface SeccionReporte {
  id: string;
  titulo: string;
  icono: string;
  lineas: string[];
}

export interface ReporteClara {
  tipo: TipoReporte;
  desde: string;
  /** Último día que cubre (si va en curso, es hoy). */
  hasta: string;
  titulo: string;
  enCurso: boolean;
  /** Con qué se compara ("agosto", "T3 2026 (primeros 7 días)"). */
  comparadoCon: string;
  /** Fecha para pedir el periodo anterior / siguiente (null = no hay). */
  anterior: string | null;
  siguiente: string | null;
  frase: string;
  cifras: CifraReporte[];
  focos: string[];
  secciones: SeccionReporte[];
  avisos: string[];
  generado_en: string;
  cloud: boolean;
}

/** Resumen de cobranza (solo totales, sin datos de clientes). */
export interface ResumenCobranza {
  polizas: number;
  vencidas: number;
  montoVencido: number;
  porVencer: number;
  montoPorVencer: number;
  promesas: number;
  /** Pólizas al corriente: su próximo recibo vence en más de 15 días (ya pagaron el de este periodo). */
  alCorriente: number;
  renuevan: number;
  sinWhatsapp: number;
  recordadasHoy: number;
  /** La línea diaria de Valeri. */
  frase: string;
}

// ---- Pólizas adjuntas (nuevas y renovaciones leídas con IA) ----

export type TipoAdjunta = "nueva" | "renovacion";

export interface DatosAdjunta {
  tipo: TipoAdjunta;
  ramo: Ramo;
  aseguradora: string;
  numero: string;
  contratante: string;
  /** Inicio de vigencia AAAA-MM-DD (de aquí sale el mes del reporte). */
  inicio: string;
  /** Prima neta anual (sin derechos ni IVA). */
  prima_neta: number;
  moneda: "MN" | "DLS";
  asegurados_total: number;
  /** Asegurados que se sumaron (GMM). */
  asegurados_nuevos: number;
  asegurados_nombres: string[];
  notas: string;
  archivo: string;
}

export interface PolizaAdjunta extends DatosAdjunta {
  id: string;
  creado_en: string;
}

/** Lo que la IA leyó del PDF, para que Roberto lo revise antes de guardar. */
export interface LecturaPoliza {
  datos: DatosAdjunta;
  avisos: string[];
}

// ---- Historial de cada póliza de la cartera: pagos, renovaciones y endosos (tabla polizas_historial) ----

export type TipoEvento = "pago" | "endoso" | "renovacion";

export interface EventoPoliza {
  id: string;
  poliza_id: string;
  tipo: TipoEvento;
  /** Día en que ocurrió (AAAA-MM-DD). */
  fecha: string;
  /** Pago: lo pagado · endoso: ajuste de prima (puede ser negativo) · renovación: prima anual de la vigencia nueva. */
  monto: number;
  /** Pago: quién lo anotó · endoso: su tipo · renovación: manual o lector de PDF. */
  concepto: string;
  /** Número de endoso (opcional). */
  numero: string;
  nota: string;
  /** Pago: fecha límite del recibo que cubrió. */
  recibo: string | null;
  /** Renovación: la vigencia nueva. */
  desde: string | null;
  hasta: string | null;
  creado_en: string;
}

/** Lo que se captura de un pago o de un endoso (la renovación va por su propio formulario). */
export interface DatosEvento {
  tipo: "pago" | "endoso";
  fecha: string;
  monto: number;
  concepto: string;
  numero: string;
  nota: string;
  recibo: string | null;
}

/** Los datos de una renovación (manual, o leída del PDF y confirmada por Roberto). */
export interface DatosRenovacion {
  /** Inicio de la vigencia nueva. */
  inicio: string;
  /** Fin de la vigencia nueva (la siguiente renovación). */
  hasta: string;
  forma_pago: FormaPago;
  /** Lo que paga el cliente en cada recibo de la vigencia nueva (los subsecuentes si hay primer pago distinto). */
  monto_pago: number;
  /** Lo que cuesta el primer recibo de la vigencia nueva (derecho de póliza). 0 = todos los pagos son iguales. */
  primer_pago: number;
  prima_anual: number;
  /** Fecha límite del primer recibo de la vigencia nueva. */
  fecha_limite_pago: string | null;
  numero: string;
  aseguradora: string;
  origen: "manual" | "pdf";
  /** Prima neta anual (sin derechos ni IVA): si es mayor a 0 cuenta en los reportes de renovaciones. 0 = no contarla. */
  prima_neta: number;
  nota: string;
  archivo: string;
}

/** Prospecto capturado a mano por Roberto o su equipo (con su etapa desde el inicio). */
export interface NuevoLeadManual {
  nombre: string;
  whatsapp: string;
  correo: string;
  etapa: EtapaId;
  ramo: Ramo | null;
  valor: number;
  origen: string;
  notas: string;
}

/** De dónde viene un prospecto capturado a mano. */
export const ORIGENES_MANUAL = ["Manual", "Referido", "Llamada", "Redes sociales", "Grupos de ventas WA", "Evento", "Cliente actual"] as const;
