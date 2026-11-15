import { PRECIO, PRECIO_NOTA } from "@/lib/libro";
import { BotonComprar } from "./BotonComprar";
import { PaqueteLibro } from "./PaqueteLibro";

/** Oferta final: resumen del paquete, precio y botón. */
const RESUMEN = [
  "Libro digital en PDF de más de 160 páginas",
  "Siete capítulos y seis anexos",
  "34 imágenes paso a paso",
  "35 mensajes listos para copiar y pegar",
  "Plantilla del expediente de tu asistente",
  "Hoja de seguimiento de los siete escalones",
  "Bono 1: Mi primera oficina inteligente con IA",
  "Bono 2: 100 prompts de seguros para redes sociales",
];

export function FinalOffer() {
  return (
    <section id="comprar" className="glass-strong scroll-mt-6 overflow-hidden rounded-[28px]">
      <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="flex items-center justify-center bg-[radial-gradient(circle_at_50%_40%,rgba(42,34,245,0.35),transparent_70%)] p-6 sm:p-10">
          <PaqueteLibro className="w-full max-w-sm" />
        </div>
        <div className="p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-2 sm:text-sm">Tu oficina digital empieza aquí</p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-4xl">De la Agenda al Algoritmo</h2>
          <p className="mt-2 text-ink-soft">Un método práctico para asesores de seguros que quieren aprovechar su experiencia en la era de la inteligencia artificial.</p>
          <ul className="mt-6 grid gap-2 text-base sm:grid-cols-2">
            {RESUMEN.map((r) => (
              <li key={r} className={`flex gap-2.5 ${r.startsWith("Bono") ? "font-semibold text-amber" : ""}`}>
                <span aria-hidden="true" className={`flex-none font-bold ${r.startsWith("Bono") ? "text-amber" : "text-green"}`}>
                  {r.startsWith("Bono") ? "★" : "✓"}
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 font-display text-3xl text-ink sm:text-4xl">
            {PRECIO} <span className="whitespace-nowrap text-lg font-semibold text-ink-soft sm:text-xl">{PRECIO_NOTA}</span>
          </p>
          <p className="mt-1 text-sm text-ink-mute">Pago único. Hotmart te muestra el total en pesos antes de pagar.</p>
          <div className="mt-5">
            <BotonComprar grande ancho />
          </div>
          <p className="mt-4 text-sm text-ink-mute">
            Acceso digital cuando se confirma tu pago. Garantía de 7 días naturales conforme a los{" "}
            <a href="/libro/terminos" className="underline hover:text-ink-soft">
              términos de venta
            </a>
            . El plan de pago de Claude se contrata por separado.
          </p>
        </div>
      </div>
    </section>
  );
}
