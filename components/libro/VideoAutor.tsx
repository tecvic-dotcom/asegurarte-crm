import { BotonComprar } from "./BotonComprar";
import { Eyebrow, Titulo } from "./ui";
import { VideoPromo } from "./VideoPromo";

/** Video principal de /libro, justo debajo de la portada: Roberto cuenta por qué escribió el libro (reel «Roberto explicando»). */
export function VideoAutor() {
  return (
    <section className="glass mx-auto grid max-w-5xl items-center gap-8 rounded-[28px] p-6 sm:p-10 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-12">
      <VideoPromo id="autor" titulo="Por qué escribí este libro" duracion="0:54" nota="Video con avatar digital creado con IA" />
      <div>
        <Eyebrow>Mensaje del autor</Eyebrow>
        <Titulo>La IA no viene a reemplazar tu experiencia. Viene a potenciarla.</Titulo>
        <p className="mt-5">
          El mayor reto del asesor de seguros hoy no es la falta de experiencia ni de conocimiento: es adaptarse a la tecnología. En menos de un
          minuto te cuento por qué escribí este libro y cómo te acompaña, escalón por escalón.
        </p>
        <p className="mt-4 font-display text-xl text-ink">
          Tu experiencia es tu mayor activo. <span className="text-brand-2">La IA, la herramienta.</span>
        </p>
        <div className="mt-6">
          <BotonComprar grande />
        </div>
      </div>
    </section>
  );
}
