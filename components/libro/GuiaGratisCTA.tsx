import Image from "next/image";

/**
 * Tarjeta de /libro para quien todavía no está listo para comprar: lo manda a la guía gratuita (/guia-ia),
 * que lo mete a la lista de lectores y a la serie de correos. Va justo después de la oferta final.
 */
export function GuiaGratisCTA() {
  return (
    <section aria-labelledby="guia-gratis-t" className="glass grid items-center gap-6 rounded-[24px] p-6 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:p-8">
      <Image src="/img/guia-ia/portada-guia-ia.jpg" alt="" width={900} height={1165} className="mx-auto w-24 rounded-md shadow-xl sm:w-full" />
      <div className="text-center sm:text-left">
        <h2 id="guia-gratis-t" className="font-display text-xl text-ink sm:text-2xl">
          ¿Todavía no? Llévate la guía gratis
        </h2>
        <p className="mt-2 text-base">
          «10 actividades de tu negocio que puedes delegar a la inteligencia artificial»: tres prompts listos para copiar y la receta para pedir bien.
          Pruébala primero y decide después.
        </p>
      </div>
      <a href="/guia-ia?utm_source=libro&utm_medium=web&utm_campaign=tarjeta-libro" className="btn-ghost justify-self-center whitespace-nowrap">
        Quiero la guía gratis
      </a>
    </section>
  );
}
