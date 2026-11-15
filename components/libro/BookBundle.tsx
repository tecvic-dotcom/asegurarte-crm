import { Eyebrow, Lista, Titulo } from "./ui";

/**
 * Qué incluye la compra: el paquete (libro + 2 bonos) como imagen, la lista de lo que trae y lo que se necesita aparte.
 * Los textos son los de la ficha de venta revisada por el abogado (venta.js): si cambia la ficha, cambiar aquí lo mismo.
 */
const INCLUYE = [
  "El libro en PDF: más de 160 páginas, siete capítulos y seis anexos.",
  "34 imágenes paso a paso, para saber dónde hacer clic.",
  "35 mensajes listos para copiar y pegar.",
  "La plantilla del expediente de tu asistente, atajos de teclado, un glosario y una guía de rescate para cuando te trabes.",
  "Una hoja de seguimiento de los siete escalones, para marcar tus avances.",
];

const BONOS = [
  {
    etiqueta: "Bono 1",
    titulo: "Mi primera oficina inteligente con IA",
    texto: "Guía visual de una página que muestra cómo debe quedar tu espacio de trabajo al terminar los tres primeros escalones (PDF).",
  },
  {
    etiqueta: "Bono 2",
    titulo: "100 prompts de seguros para redes sociales",
    texto:
      "100 instrucciones listas para copiar y pegar en tu herramienta de inteligencia artificial: borradores de publicaciones, anuncios, carruseles y campañas, ordenados en ocho temas (PDF de 12 páginas).",
  },
];

export function BookBundle() {
  return (
    <section id="incluye" className="scroll-mt-6">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>Tu compra</Eyebrow>
        <Titulo>Qué incluye tu compra</Titulo>
        <p className="mt-4">Un libro con todo lo necesario para practicar, más dos bonos que van incluidos siempre.</p>
      </div>

      {/* Paquete: los dos bonos detrás, el libro al frente */}
      <div className="relative mx-auto mt-10 flex max-w-2xl items-end justify-center" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- imágenes estáticas ya optimizadas */}
        <img
          src="/img/libro/bono.webp"
          alt=""
          width={720}
          height={900}
          loading="lazy"
          className="relative z-0 -mr-10 w-[30%] -rotate-6 rounded-xl border border-white/15 shadow-2xl sm:-mr-14"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- imágenes estáticas ya optimizadas */}
        <img
          src="/img/libro/libro-3d.webp"
          alt=""
          width={900}
          height={900}
          loading="lazy"
          className="relative z-10 w-[48%] rounded-[22px] shadow-[0_40px_90px_-30px_rgba(42,34,245,0.9)]"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- imágenes estáticas ya optimizadas */}
        <img
          src="/img/libro/bono-100-prompts.webp"
          alt=""
          width={720}
          height={932}
          loading="lazy"
          className="relative z-0 -ml-10 w-[30%] rotate-6 rounded-xl border border-white/15 shadow-2xl sm:-ml-14"
        />
      </div>
      <p className="sr-only">Imagen del paquete: el libro «De la Agenda al Algoritmo» al centro y las portadas de los dos bonos a los lados.</p>

      <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <div className="glass rounded-[24px] p-6 sm:p-8">
          <h3 className="font-display text-xl text-ink sm:text-2xl">El libro</h3>
          <Lista items={INCLUYE} />
        </div>
        <div className="flex flex-col gap-4">
          {BONOS.map((b) => (
            <div key={b.titulo} className="glass-strong rounded-[24px] p-6">
              <span className="inline-block rounded-full bg-amber/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber">
                {b.etiqueta} · incluido
              </span>
              <h3 className="mt-3 font-display text-lg text-ink sm:text-xl">{b.titulo}</h3>
              <p className="mt-2 text-base">{b.texto}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-soft mt-6 rounded-[24px] p-6 sm:p-8">
        <h3 className="font-display text-xl text-ink">Lo que necesitas aparte</h3>
        <Lista
          marca="•"
          items={[
            "Una computadora con Windows 11 (o Windows 10) y conexión a internet.",
            "Un correo electrónico y unos 30 minutos por sesión.",
            <>
              Un plan de pago de Claude. <strong className="text-ink">No está incluido en este producto</strong> y el autor no lo vende: consulta su
              precio y sus condiciones vigentes con el proveedor antes de contratar.
            </>,
            "Visual Studio Code, un programa gratuito de Microsoft que el libro te enseña a instalar.",
          ]}
        />
        <p className="mt-4">No necesitas saber programar, saber inglés ni una computadora nueva.</p>
      </div>
    </section>
  );
}
