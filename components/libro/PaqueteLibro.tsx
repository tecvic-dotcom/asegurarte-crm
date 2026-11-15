import { ImagenAmpliable } from "./ImagenAmpliable";

/**
 * El paquete completo como una sola imagen: la portada del libro al centro y las portadas de los dos bonos a los lados,
 * cada una con su listón. Cada portada se amplía al tocarla. Se usa en la portada de /libro, en «Qué incluye» y en la oferta final.
 */
export const PORTADAS = {
  libro: {
    src: "/img/libro/portada-plana.webp",
    srcGrande: "/img/libro/portada-plana-grande.webp",
    width: 800,
    height: 1200,
    alt: "Portada del libro «De la Agenda al Algoritmo», de Roberto Rodríguez",
  },
  bono1: {
    src: "/img/libro/bono.webp",
    srcGrande: "/img/libro/bono-grande.webp",
    width: 720,
    height: 900,
    alt: "Bono 1, «Mi primera oficina inteligente con IA»: así debería verse tu espacio de trabajo al terminar los tres primeros escalones",
  },
  bono2: {
    src: "/img/libro/bono-100-prompts.webp",
    width: 720,
    height: 932,
    alt: "Bono 2: portada de «100 prompts de seguros para redes sociales»",
  },
} as const;

function Liston({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute -top-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-amber px-3 py-1 text-[0.65rem] font-extrabold tracking-wider whitespace-nowrap text-[#1a1300] uppercase shadow-[0_6px_18px_-6px_rgba(255,194,75,0.9)] sm:text-xs">
      {children}
    </span>
  );
}

export function PaqueteLibro({ prioridad = false, className = "" }: { prioridad?: boolean; className?: string }) {
  const { libro, bono1, bono2 } = PORTADAS;
  return (
    <figure className={`relative ${className}`}>
      {/* halo detrás del paquete */}
      <div aria-hidden="true" className="absolute inset-x-[10%] top-[15%] bottom-[10%] rounded-full bg-brand/40 blur-3xl" />
      <div className="relative flex items-center justify-center pt-4">
        <div className="relative z-0 -mr-[7%] w-[34%] -rotate-[7deg] transition-transform duration-300 hover:-rotate-[3deg]">
          <Liston>Bono 1</Liston>
          <ImagenAmpliable {...bono1} lupa={false} prioridad={prioridad} className="w-full rounded-lg border border-white/15 shadow-2xl" />
        </div>
        <div className="relative z-10 w-[44%]">
          <ImagenAmpliable
            {...libro}
            prioridad={prioridad}
            className="w-full rounded-lg shadow-[0_30px_70px_-20px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)]"
          />
        </div>
        <div className="relative z-0 -ml-[7%] w-[34%] rotate-[7deg] transition-transform duration-300 hover:rotate-[3deg]">
          <Liston>Bono 2</Liston>
          <ImagenAmpliable {...bono2} lupa={false} prioridad={prioridad} className="w-full rounded-lg border border-white/15 shadow-2xl" />
        </div>
      </div>
      <figcaption className="relative mt-5 text-center text-sm font-semibold text-ink-soft">
        Libro + <span className="text-amber">2 bonos incluidos</span> · toca una portada para verla en grande
      </figcaption>
    </figure>
  );
}
