"use client";

/**
 * Página de PRUEBA del formulario de cotización.
 *  · Por defecto: servidor SIMULADO (lib/cotizacion-simulada.ts). No guarda nada.
 *  · «Conectado»: llama a la ruta REAL (/api/cotizacion) y crea de verdad un prospecto en el CRM. Hay que activarlo a propósito.
 * En los dos modos se muestra, solo en pantalla, lo que el formulario manda al servidor.
 */
import { useMemo, useState } from "react";
import { FormularioCotizacion } from "./FormularioCotizacion";
import type { ValoresFormularioCotizacion } from "./FormularioCotizacion";
import { crearEnviarCotizacionSimulado } from "@/lib/cotizacion-simulada";
import { enviarCotizacionServidor } from "@/lib/cotizacion-cliente";
import type { EnviarCotizacion, SolicitudCotizacion } from "@/lib/captacion-cotizacion";

const EJEMPLO: ValoresFormularioCotizacion = {
  nombre: "María Prueba",
  whatsapp: "81 5550 0123",
  correo: "maria.prueba@example.com",
  tipoSeguro: "gmm",
  paraQuien: "familia",
  consentimiento: false,
};

const CASOS_SIMULADOS: { nombre: string; que: string }[] = [
  { nombre: "Cualquier nombre normal", que: "Se envía y aparece la confirmación de recepción." },
  { nombre: "«Falla» en el nombre", que: "El servidor responde con un error general; lo escrito se conserva." },
  { nombre: "«Campo» en el nombre", que: "El servidor rechaza el WhatsApp: el error aparece junto a ese campo." },
  { nombre: "«Limite» en el nombre", que: "Respuesta de «demasiados envíos» (429)." },
  { nombre: "«Sinred» en el nombre", que: "Se cae la conexión: aviso para reintentar." },
  { nombre: "Enviar en menos de 3 segundos", que: "Antispam de tiempo: pide revisar y reenviar (a la segunda pasa)." },
  { nombre: "Dejar campos vacíos o mal escritos", que: "Mensajes por campo y, al enviar, el cursor salta al primero con error." },
  { nombre: "Enviar 4 veces seguidas", que: "A la cuarta, el tope por visita invita a escribir por WhatsApp." },
];

const CASOS_CONECTADOS: { nombre: string; que: string }[] = [
  { nombre: "Enviar una solicitud", que: "Aparece en Prospectos y en el Embudo de ventas, en «Nuevo», con origen «Sitio web», y te llega el pendiente de hoy y el correo." },
  { nombre: "Enviarla otra vez con el mismo WhatsApp", que: "NO se crea otro prospecto: se identifica el que ya existe y se le agrega una nota (y un pendiente de hoy)." },
  { nombre: "Mismo WhatsApp con otro nombre", que: "Tampoco se duplica; la nota dice con qué nombre escribió esta vez." },
  { nombre: "Cambiar tipo de seguro o «para quién»", que: "Se guarda en el mensaje del prospecto y en su historial." },
];

export function PruebaCotizacion() {
  const [llave, setLlave] = useState(0);
  const [iniciales, setIniciales] = useState<Partial<ValoresFormularioCotizacion>>({});
  const [ultima, setUltima] = useState<SolicitudCotizacion | null>(null);
  const [cuenta, setCuenta] = useState(0);
  const [conectado, setConectado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  // Cada envío se anota aquí (solo se ve en esta página) y se pasa al servidor simulado o al real.
  const enviar: EnviarCotizacion = useMemo(() => {
    const interno = conectado ? enviarCotizacionServidor : crearEnviarCotizacionSimulado();
    return async (s) => {
      setUltima(s);
      setCuenta((n) => n + 1);
      return interno(s);
    };
  }, [conectado]);

  function rellenar(valores: Partial<ValoresFormularioCotizacion>) {
    setIniciales(valores);
    setLlave((k) => k + 1); // vuelve a montar el formulario con esos valores
  }

  function cambiarModo(real: boolean) {
    setConectado(real);
    setConfirmando(false);
    setUltima(null);
    setCuenta(0);
    rellenar({});
  }

  const ejemplo = conectado ? { ...EJEMPLO, nombre: "PRUEBA María" } : EJEMPLO;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Modo: simulado (por defecto) o conectado al CRM */}
      <div role="group" aria-label="Modo de la prueba" className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          aria-pressed={!conectado}
          onClick={() => cambiarModo(false)}
          className={`rounded-2xl border px-4 py-3 text-left transition-colors ${!conectado ? "border-brand-2 bg-brand/30" : "border-[var(--line-strong)] bg-glass hover:border-brand-2"}`}
        >
          <span className="block font-semibold text-ink">Servidor simulado</span>
          <span className="block text-xs text-ink-mute">No guarda nada. Para probar la experiencia.</span>
        </button>
        <button
          type="button"
          aria-pressed={conectado}
          onClick={() => (conectado ? undefined : setConfirmando(true))}
          className={`rounded-2xl border px-4 py-3 text-left transition-colors ${conectado ? "border-amber bg-amber/15" : "border-[var(--line-strong)] bg-glass hover:border-amber"}`}
        >
          <span className="block font-semibold text-ink">Conectado a tu CRM</span>
          <span className="block text-xs text-ink-mute">Guarda de verdad un prospecto de prueba.</span>
        </button>
      </div>

      {confirmando && !conectado && (
        <div role="alertdialog" aria-labelledby="conf-t" className="mt-3 rounded-2xl border border-amber/50 bg-amber/10 p-4 text-sm text-ink-soft">
          <p id="conf-t" className="font-semibold text-amber">
            Esto SÍ guarda en tu CRM
          </p>
          <p className="mt-1">
            Al enviar se crea un prospecto en <strong>Nuevo</strong> con origen <strong>«Sitio web»</strong>, un pendiente de hoy y un correo de aviso. Usa un
            nombre que empiece con <strong>PRUEBA</strong> para encontrarlo y borrarlo después desde el CRM.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => cambiarModo(true)} className="btn-primary text-sm">
              Entiendo, activar la conexión real
            </button>
            <button type="button" onClick={() => setConfirmando(false)} className="btn-ghost text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => rellenar(ejemplo)} className="btn-ghost text-sm">
          Llenar con datos de ejemplo
        </button>
        <button type="button" onClick={() => rellenar({})} className="btn-ghost text-sm">
          Limpiar formulario
        </button>
      </div>

      <div className="mt-5">
        <FormularioCotizacion
          key={`${llave}-${conectado}`}
          valoresIniciales={iniciales}
          onEnviar={enviar}
          modoSimulado={!conectado}
          avisoPrueba={
            conectado
              ? {
                  formulario: (
                    <>
                      <strong>Prueba conectada.</strong> Lo que envíes SÍ se guarda como prospecto en tu CRM. Empieza el nombre con «PRUEBA» para identificarlo.
                    </>
                  ),
                  confirmacion: "Prueba conectada: se creó (o se identificó) el prospecto en tu CRM. Búscalo en Prospectos o en el Embudo de ventas.",
                }
              : undefined
          }
          origen="prueba"
        />
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-glass p-5">
        <h2 className="font-display text-lg text-ink">Lo que se envía al servidor</h2>
        <p className="mt-1 text-sm text-ink-mute">
          {conectado ? "Esto es lo que acaba de viajar a la ruta segura del servidor" : "Se ve solo en esta pantalla; no se guarda en ningún lado"}
          {cuenta > 0 ? ` (envíos en esta visita: ${cuenta}).` : "."}
        </p>
        {ultima ? (
          <pre className="mt-3 overflow-x-auto rounded-xl bg-bg-2 p-4 text-xs leading-relaxed text-ink-soft">{JSON.stringify(ultima, null, 2)}</pre>
        ) : (
          <p className="mt-3 text-sm text-ink-mute">Envía el formulario para verlo aquí.</p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-glass p-5">
        <h2 className="font-display text-lg text-ink">{conectado ? "Qué probar con la conexión real" : "Qué probar"}</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {(conectado ? CASOS_CONECTADOS : CASOS_SIMULADOS).map((c) => (
            <li key={c.nombre} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
              <span className="font-semibold text-ink sm:w-64 sm:shrink-0">{c.nombre}</span>
              <span className="text-ink-soft">{c.que}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
