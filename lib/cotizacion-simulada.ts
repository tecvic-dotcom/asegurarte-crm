/**
 * «Servidor» de mentira para probar el formulario de cotización SIN guardar nada.
 * Hace lo mismo que hará el real (vuelve a validar, responde con el mismo formato) pero no escribe en ninguna parte:
 * no hay base de datos, ni correo, ni almacenamiento. Lo que recibe se pierde al cerrar la página.
 *
 * Para conectar el servidor de verdad: se escribe otra función con la misma firma (`EnviarCotizacion`) que haga
 * `fetch` a la ruta nueva, y se le pasa al formulario en lugar de ésta. El formulario no cambia.
 *
 * Casos de prueba (se activan con el NOMBRE, sin importar mayúsculas):
 *   «falla»  → el servidor responde con un error general
 *   «campo»  → el servidor rechaza el WhatsApp (error por campo)
 *   «limite» → demasiados envíos (429)
 *   «sinred» → se cae la conexión (la función lanza un error)
 */
import { evaluarAntispam, validarSolicitud } from "./captacion-cotizacion";
import type { EnviarCotizacion, ResultadoEnvio, SolicitudCotizacion } from "./captacion-cotizacion";

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function crearEnviarCotizacionSimulado(opciones: { latenciaMs?: number; alRecibir?: (s: SolicitudCotizacion) => void } = {}): EnviarCotizacion {
  const { latenciaMs = 900, alRecibir } = opciones;
  return async (s): Promise<ResultadoEnvio> => {
    await esperar(latenciaMs);
    alRecibir?.(s); // solo para mostrarlo en pantalla en la página de prueba

    // Mismas defensas que tendrá el servidor real.
    if (evaluarAntispam(s) === "bot") return { ok: true }; // se finge éxito
    const v = validarSolicitud(s);
    if (!v.ok) return { ok: false, errores: v.errores };

    const n = s.nombre.toLowerCase();
    if (n.includes("sinred")) throw new Error("Conexión simulada caída");
    if (n.includes("falla")) return { ok: false, mensaje: "No pudimos guardar tu solicitud en este momento. Intenta de nuevo en unos minutos." };
    if (n.includes("campo")) return { ok: false, errores: { whatsapp: "Ese número no puede recibir mensajes de WhatsApp (respuesta simulada del servidor)." } };
    if (n.includes("limite")) return { ok: false, mensaje: "Recibimos muchas solicitudes desde tu conexión. Espera un minuto e inténtalo otra vez.", reintentarEnSegundos: 60 };

    return { ok: true, folio: `PRUEBA-${Math.random().toString(36).slice(2, 8).toUpperCase()}` };
  };
}
