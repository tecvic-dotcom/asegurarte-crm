import { PRECIO, PRECIO_NOTA } from "@/lib/libro";
import { BotonComprar } from "./BotonComprar";
import { Eyebrow } from "./ui";

const DATOS_RAPIDOS = ["7 escalones", "Más de 160 páginas", "2 bonos incluidos", "Sin saber programar"];

/** Portada de /libro: promesa, portada real, datos rápidos y botón de compra. Lleva id="portada" para el botón fijo del celular. */
export function BookHero() {
  return (
    <header id="portada" className="mt-6 grid items-center gap-8 md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] md:gap-12">
      <div className="order-2 md:order-1">
        <Eyebrow>Guía práctica para agentes de seguros</Eyebrow>
        <h1 className="mt-4 font-display text-[1.85rem] leading-[1.12] text-ink sm:text-[2.6rem] lg:text-[3rem]">
          Tu experiencia en seguros vale mucho.{" "}
          <span className="text-gradient-brand">Aprende a multiplicar lo que haces con inteligencia artificial.</span>
        </h1>
        <p className="mt-5 text-lg text-ink-soft sm:text-xl">
          Arma paso a paso tu oficina digital con Claude y Visual Studio Code. Ordena tus archivos, crea herramientas para tu negocio y quítate de
          encima el trabajo repetitivo, sin conocimientos previos de programación.
        </p>

        <ul className="mt-6 flex flex-wrap gap-2" aria-label="El libro en datos">
          {DATOS_RAPIDOS.map((d) => (
            <li key={d} className="chip">
              {d}
            </li>
          ))}
        </ul>

        <div className="glass mt-7 rounded-[22px] p-5 sm:p-6">
          <p className="text-sm text-ink-mute">
            Libro digital <em className="not-italic text-ink">«De la Agenda al Algoritmo»</em>
          </p>
          <p className="mt-1 font-display text-3xl text-ink sm:text-4xl">
            {PRECIO} <span className="whitespace-nowrap text-lg font-semibold text-ink-soft sm:text-xl">{PRECIO_NOTA}</span>
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <BotonComprar grande />
            <a href="#incluye" className="btn-ghost">
              Ver qué incluye
            </a>
          </div>
          <p className="mt-4 text-sm text-ink-mute">Pago único · Entrega digital · Compra procesada por Hotmart · Garantía de 7 días</p>
        </div>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element -- imagen estática ya optimizada (WebP 900 px) */}
      <img
        src="/img/libro/libro-3d.webp"
        alt="Portada del libro «De la Agenda al Algoritmo», de Roberto Rodríguez"
        width={900}
        height={900}
        className="order-1 mx-auto w-full max-w-[11.5rem] rounded-[24px] shadow-[0_40px_90px_-40px_rgba(42,34,245,0.8)] sm:max-w-sm md:order-2 md:max-w-none"
        fetchPriority="high"
      />
    </header>
  );
}
