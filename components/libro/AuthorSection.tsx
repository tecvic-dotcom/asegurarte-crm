import { Eyebrow, Titulo } from "./ui";

/**
 * Sobre el autor: texto de Roberto (2026-11-14, igual que en la ficha de venta). La foto es la misma de /roberto.
 * El abogado pidió mencionar los años de experiencia solo si se pueden comprobar.
 */
export function AuthorSection() {
  return (
    <section className="grid items-start gap-8 md:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] md:gap-12">
      <div className="mx-auto w-full max-w-xs md:sticky md:top-8 md:max-w-none">
        <picture>
          <source srcSet="/tarjeta/img/roberto-600.avif" type="image/avif" />
          <source srcSet="/tarjeta/img/roberto-600.webp" type="image/webp" />
          <img
            src="/tarjeta/img/roberto-600.jpg"
            alt="Roberto Rodríguez, autor del libro"
            width={600}
            height={623}
            loading="lazy"
            className="w-full rounded-[28px] border border-line shadow-[0_30px_80px_-40px_rgba(42,34,245,0.9)]"
          />
        </picture>
        <p className="mt-4 text-center font-display text-lg text-ink">Roberto Rodríguez</p>
        <p className="text-center text-sm text-ink-mute">Asesor de seguros · autor de «De la Agenda al Algoritmo»</p>
      </div>

      <div>
        <Eyebrow>Sobre el autor</Eyebrow>
        <Titulo>Quién está detrás del método</Titulo>
        <div className="mt-6 space-y-4">
          <p>
            Con más de 15 años de experiencia en el sector asegurador, Roberto Rodríguez ha dedicado su trayectoria profesional a ayudar a personas,
            familias y empresarios a proteger su patrimonio y construir un futuro financiero más seguro.
          </p>
          <p>
            A lo largo de su carrera ha comprendido que uno de los mayores desafíos para los asesores de seguros no es la falta de experiencia o
            conocimiento, sino la necesidad de adaptarse a un entorno donde la tecnología está transformando la manera de trabajar, organizar
            información y desarrollar negocios.
          </p>
          <p>
            Convencido de que la inteligencia artificial no viene a reemplazar la experiencia humana, sino a potenciarla, Roberto comparte en{" "}
            <em>De la Agenda al Algoritmo</em> una metodología práctica de siete escalones para acompañar a otros profesionales del sector asegurador
            en su transformación digital.
          </p>
          <p>
            A través de instrucciones sencillas y ejercicios progresivos, muestra cómo comenzar desde cero con herramientas como Visual Studio Code y
            Claude, avanzando hacia una nueva forma de organizar y administrar la actividad profesional con ayuda de la inteligencia artificial.
          </p>
          <p>Su filosofía es clara:</p>
          <blockquote className="glass-soft rounded-2xl border-l-4 border-brand-2 p-5 font-display text-xl text-ink">
            «La experiencia es tu mayor activo. La inteligencia artificial es la herramienta que puede llevarla al siguiente nivel».
          </blockquote>
          <p>
            Con este libro, Roberto busca demostrar que no es necesario ser programador ni experto en tecnología para comenzar a aprovechar las
            oportunidades de la inteligencia artificial.
          </p>
          <p>Porque el futuro del asesor de seguros no consiste en elegir entre experiencia y tecnología, sino en aprender a combinar ambas.</p>
        </div>
      </div>
    </section>
  );
}
