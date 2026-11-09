/**
 * Videos DESTACADOS de la tarjeta web (/roberto): los 3 que se ven en «Ideas claras sobre seguros y dinero». Reglas COMPARTIDAS entre el servidor y la pantalla
 * del CRM: límites, botones disponibles y limpieza de lo que llega. Sin acceso a base de datos.
 */
import { esIdFijo, limpiarTexto, UUID, type ResultadoValidacion } from "./tarjeta-videos-reglas";

/** La auditoría de la tarjeta pide solo 3: más de eso distrae del objetivo (que la persona pida una asesoría). */
export const MAX_DESTACADOS = 3;
export const MAX_BENEFICIO = 160;

/**
 * El botón que sale debajo de cada video: abre el mosaico de «¿Qué necesitas proteger?» (con su formulario) o, sin mosaico, lleva a la cotización.
 * `ramo` DEBE coincidir con los ids de CONFIG.intereses de public/tarjeta/index.html (los mismos de INTERESES_TARJETA).
 */
export const BOTONES_DESTACADO: ReadonlyArray<{ ramo: string; texto: string }> = [
  { ramo: "salud", texto: "Conoce gastos médicos" },
  { ramo: "familia", texto: "Conoce seguro de vida" },
  { ramo: "retiro", texto: "Conoce ahorro y retiro" },
  { ramo: "casa", texto: "Conoce protección patrimonial" },
  { ramo: "auto", texto: "Conoce seguro de auto" },
  { ramo: "impuestos", texto: "Conoce planeación fiscal" },
  { ramo: "", texto: "Solicita asesoría" },
];

export const textoBoton = (ramo: string): string => BOTONES_DESTACADO.find((b) => b.ramo === ramo)?.texto ?? "Solicita asesoría";
const ramoValido = (v: unknown): v is string => typeof v === "string" && BOTONES_DESTACADO.some((b) => b.ramo === v);

/** Un video destacado tal como lo guarda y lo edita el CRM (el orden es el de la lista). */
export interface DestacadoCRM {
  /** Un video que subiste (UUID) o uno de los fijos de la tarjeta (id como «amar-familia»). */
  video_id: string;
  /** La línea que se lee debajo del video: qué gana quien lo ve. */
  beneficio: string;
  /** Mosaico que abre el botón; vacío = «Solicita asesoría». */
  ramo: string;
}

/** Lo que la tarjeta pública necesita de cada destacado. Los videos fijos solo traen su id (la tarjeta ya los conoce); los tuyos traen sus datos. */
export interface DestacadoPublico {
  id: string;
  beneficio: string;
  ramo: string;
  boton: string;
  titulo?: string;
  clave?: string;
  dur?: number;
  ia?: boolean;
  src?: string;
  poster?: string;
}

/** La lista completa que manda el CRM: como mucho 3, sin repetir video, cada uno con su línea de beneficio. */
export function validarDestacados(b: unknown): ResultadoValidacion<DestacadoCRM[]> {
  const lista = Array.isArray(b) ? b : null;
  if (!lista) return { ok: false, error: "No llegó la lista de videos destacados." };
  if (lista.length > MAX_DESTACADOS) return { ok: false, error: `Solo puedes destacar ${MAX_DESTACADOS} videos.` };
  const salida: DestacadoCRM[] = [];
  for (const x of lista) {
    const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    const id = typeof o.video_id === "string" ? o.video_id : "";
    if (!(esIdFijo(id) || UUID.test(id))) return { ok: false, error: "Uno de los videos no es válido." };
    if (salida.some((s) => s.video_id === id)) return { ok: false, error: "Un mismo video no puede ir dos veces." };
    const beneficio = limpiarTexto(o.beneficio, MAX_BENEFICIO);
    if (!beneficio) return { ok: false, error: "Escribe la línea de beneficio de cada video destacado." };
    const ramo = ramoValido(o.ramo) ? o.ramo : "";
    salida.push({ video_id: id, beneficio, ramo });
  }
  return { ok: true, datos: salida };
}
