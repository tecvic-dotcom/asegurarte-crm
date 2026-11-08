/**
 * Envío REAL del formulario «Cotiza tu seguro»: llama a la ruta segura del servidor (/api/cotizacion).
 * Tiene la misma firma que el simulador (`EnviarCotizacion`), así que se le pasa al formulario igual y el formulario no cambia.
 *
 *  · Sin conexión (fetch lanza error): se deja que el error suba; el formulario avisa «revisa tu conexión» y conserva lo escrito.
 *  · 422/429/500: el servidor manda `errores` por campo o un `mensaje`; se pasan tal cual al formulario.
 */
import type { EnviarCotizacion, ErroresCotizacion, ResultadoEnvio } from "./captacion-cotizacion";

interface Respuesta {
  ok?: boolean;
  errores?: ErroresCotizacion;
  mensaje?: string;
  reintentarEnSegundos?: number;
}

export const enviarCotizacionServidor: EnviarCotizacion = async (solicitud): Promise<ResultadoEnvio> => {
  const r = await fetch("/api/cotizacion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(solicitud),
  });
  let j: Respuesta = {};
  try {
    j = (await r.json()) as Respuesta;
  } catch {
    // respuesta sin JSON (por ejemplo, una página de error): se trata como falla general
  }
  if (r.ok && j.ok) return { ok: true };
  return {
    ok: false,
    errores: j.errores,
    mensaje: j.mensaje ?? (j.errores ? undefined : "No pudimos enviar tu solicitud. Intenta de nuevo en unos minutos."),
    reintentarEnSegundos: j.reintentarEnSegundos,
  };
};
