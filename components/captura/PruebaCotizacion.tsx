"use client";

/**
 * Página de PRUEBA del formulario de cotización: todo con datos simulados.
 * El «servidor» es lib/cotizacion-simulada.ts (no guarda nada). Aquí también se muestra, solo en pantalla,
 * lo que el formulario mandaría al servidor real, para revisar que el contrato quede como se espera.
 */
import { useMemo, useState } from "react";
import { FormularioCotizacion } from "./FormularioCotizacion";
import type { ValoresFormularioCotizacion } from "./FormularioCotizacion";
import { crearEnviarCotizacionSimulado } from "@/lib/cotizacion-simulada";
import type { SolicitudCotizacion } from "@/lib/captacion-cotizacion";

const EJEMPLO: ValoresFormularioCotizacion = {
  nombre: "María Prueba",
  whatsapp: "81 5550 0123",
  correo: "maria.prueba@example.com",
  tipoSeguro: "gmm",
  paraQuien: "familia",
  consentimiento: false,
};

const CASOS: { nombre: string; que: string }[] = [
  { nombre: "Cualquier nombre normal", que: "Se envía y aparece la confirmación de recepción." },
  { nombre: "«Falla» en el nombre", que: "El servidor responde con un error general; lo escrito se conserva." },
  { nombre: "«Campo» en el nombre", que: "El servidor rechaza el WhatsApp: el error aparece junto a ese campo." },
  { nombre: "«Limite» en el nombre", que: "Respuesta de «demasiados envíos» (429)." },
  { nombre: "«Sinred» en el nombre", que: "Se cae la conexión: aviso para reintentar." },
  { nombre: "Enviar en menos de 3 segundos", que: "Antispam de tiempo: pide revisar y reenviar (a la segunda pasa)." },
  { nombre: "Dejar campos vacíos o mal escritos", que: "Mensajes por campo y, al enviar, el cursor salta al primero con error." },
  { nombre: "Enviar 4 veces seguidas", que: "A la cuarta, el tope por visita invita a escribir por WhatsApp." },
];

export function PruebaCotizacion() {
  const [llave, setLlave] = useState(0);
  const [iniciales, setIniciales] = useState<Partial<ValoresFormularioCotizacion>>({});
  const [ultima, setUltima] = useState<SolicitudCotizacion | null>(null);
  const [cuenta, setCuenta] = useState(0);

  // El simulador avisa aquí qué recibió (solo se ve en esta página; no sale de tu navegador).
  const enviar = useMemo(
    () =>
      crearEnviarCotizacionSimulado({
        alRecibir: (s) => {
          setUltima(s);
          setCuenta((n) => n + 1);
        },
      }),
    [],
  );

  function rellenar(valores: Partial<ValoresFormularioCotizacion>) {
    setIniciales(valores);
    setLlave((k) => k + 1); // vuelve a montar el formulario con esos valores
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => rellenar(EJEMPLO)} className="btn-ghost text-sm">
          Llenar con datos de ejemplo
        </button>
        <button type="button" onClick={() => rellenar({})} className="btn-ghost text-sm">
          Limpiar formulario
        </button>
      </div>

      <div className="mt-5">
        <FormularioCotizacion key={llave} valoresIniciales={iniciales} onEnviar={enviar} modoSimulado origen="prueba" />
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-glass p-5">
        <h2 className="font-display text-lg text-ink">Lo que se enviaría al servidor</h2>
        <p className="mt-1 text-sm text-ink-mute">
          Se ve solo en esta pantalla; no se guarda en ningún lado. Así llegará la solicitud cuando se conecte el servidor
          {cuenta > 0 ? ` (envíos simulados en esta visita: ${cuenta}).` : "."}
        </p>
        {ultima ? (
          <pre className="mt-3 overflow-x-auto rounded-xl bg-bg-2 p-4 text-xs leading-relaxed text-ink-soft">{JSON.stringify(ultima, null, 2)}</pre>
        ) : (
          <p className="mt-3 text-sm text-ink-mute">Envía el formulario para verlo aquí.</p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-glass p-5">
        <h2 className="font-display text-lg text-ink">Qué probar</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {CASOS.map((c) => (
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
