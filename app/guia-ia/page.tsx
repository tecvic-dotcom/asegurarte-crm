import type { Metadata } from "next";
import Image from "next/image";
import { FormularioGuiaIA } from "@/components/libro/FormularioGuiaIA";
import { Eyebrow, Lista } from "@/components/libro/ui";

/**
 * Página de captación del libro: guía gratuita «10 actividades de tu negocio que puedes delegar a la inteligencia artificial».
 * Es la etapa 3 del embudo (redes → videos → ESTA guía → correos → /libro → Hotmart). Quien la pide entra a la lista APARTE de lectores.
 * El PDF se arma en proyectos/guia-ia-lectores (guia.html + construir.cjs). Todo lo de los ejemplos es ficticio; sin nombrar aseguradoras.
 */
const TITULO = "Guía gratis: 10 actividades que puedes delegar a la IA · Para agentes de seguros";
const DESCRIPCION =
  "Guía gratuita en PDF para agentes de seguros: 10 tareas de tu negocio que la inteligencia artificial puede hacer por ti, tres prompts listos para copiar y la receta para pedir bien.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: "/guia-ia" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "10 actividades de tu negocio que puedes delegar a la IA",
    description: "Guía gratuita para agentes de seguros. Te llega al instante.",
    url: "/guia-ia",
    type: "website",
    locale: "es_MX",
    images: [{ url: "/img/guia-ia/og-guia-ia.jpg", width: 1200, height: 630, alt: "Portada de la guía «10 actividades de tu negocio que puedes delegar a la inteligencia artificial»" }],
  },
};

const INCLUYE = [
  "Diez tareas que hoy te quitan horas, con qué le pides a la IA y qué te toca revisar a ti.",
  "Tres prompts listos para copiar: renovación, seguimiento a una cotización y la respuesta a «lo voy a pensar».",
  "La receta de cuatro ingredientes que cambia lo que te contesta la IA.",
  "Un reto sencillo para probar la primera hoy mismo.",
];

export default function GuiaIAPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <a href="/libro" className="text-sm text-ink-mute underline hover:text-ink-soft">
        Conoce el libro «De la Agenda al Algoritmo»
      </a>

      <header className="mt-6 grid items-start gap-8 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-12">
        <div>
          <Eyebrow>Guía gratuita para agentes de seguros</Eyebrow>
          <h1 className="mt-4 font-display text-[1.85rem] leading-[1.12] text-ink sm:text-[2.5rem] lg:text-[2.9rem]">
            10 actividades de tu negocio que puedes <span className="text-gradient-brand">delegar a la inteligencia artificial desde hoy</span>
          </h1>
          <p className="mt-5 text-lg text-ink-soft">
            Recordatorios, seguimientos, mensajes que escribes por décima vez. Esta guía te muestra cómo pasarle ese trabajo a la IA para que tú
            te quedes con lo que vende: platicar con tus clientes. No necesitas saber programar.
          </p>
          <div className="mt-2 text-ink-soft">
            <Lista items={INCLUYE} />
          </div>
          <div className="mt-8 hidden items-center gap-5 md:flex">
            <Image src="/img/guia-ia/portada-guia-ia.jpg" alt="Portada de la guía" width={900} height={1165} className="w-40 rounded-lg shadow-2xl" />
            <p className="text-sm text-ink-mute">PDF de 7 páginas, tamaño carta. Se lee en el celular o se imprime.</p>
          </div>
        </div>

        <div className="md:sticky md:top-6">
          <FormularioGuiaIA />
        </div>
      </header>

      <section className="glass mt-12 grid items-center gap-5 rounded-[22px] p-6 sm:grid-cols-[96px_1fr] sm:p-8">
        <Image src="/tarjeta/img/roberto-600.jpg" alt="Roberto Rodríguez" width={96} height={96} className="h-24 w-24 rounded-full object-cover object-top" />
        <div>
          <p className="font-display text-xl text-ink">Roberto Rodríguez</p>
          <p className="mt-1 text-ink-soft">
            Agente de seguros en Monterrey y autor de «De la Agenda al Algoritmo». Escribió esta guía con lo que aplica en su propio negocio para cuidar
            la cobranza, las renovaciones y los videos de sus redes.
          </p>
        </div>
      </section>

      <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-ink-mute">
        Información general con fines educativos. No garantiza ventas ni resultados. La inteligencia artificial puede equivocarse: revisa todo antes de
        usarlo. Guía independiente, sin afiliación con Anthropic (Claude) ni con ninguna aseguradora.{" "}
        <a href="/guia-ia/privacidad" className="underline hover:text-ink-soft">
          Aviso de privacidad
        </a>
      </p>
    </main>
  );
}
