import { Eyebrow, Lista, Titulo } from "./ui";
import { ImagenAmpliable } from "./ImagenAmpliable";
import { PORTADAS } from "./PaqueteLibro";
import { VideoPromo } from "./VideoPromo";

/**
 * Qué incluye la compra: libro + bono 1 + bono 2 en tres tarjetas con su portada (se amplían), lo que trae el libro y lo que se necesita aparte.
 * Los textos son los de la ficha de venta revisada por el abogado (venta.js): si cambia la ficha, cambiar aquí lo mismo.
 */
const INCLUYE = [
  "El libro en PDF: más de 160 páginas, siete capítulos y seis anexos.",
  "34 imágenes paso a paso, para saber dónde hacer clic.",
  "35 mensajes listos para copiar y pegar.",
  "La plantilla del expediente de tu asistente, atajos de teclado, un glosario y una guía de rescate para cuando te trabes.",
  "Una hoja de seguimiento de los siete escalones, para marcar tus avances.",
];

const BONOS_TEXTO = [
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

const PIEZAS = [
  {
    etiqueta: "El libro",
    titulo: "De la Agenda al Algoritmo",
    texto: "Siete escalones para armar tu oficina digital con un asistente de inteligencia artificial, de preparar tu computadora a un plan de 90 días (PDF de más de 160 páginas).",
    portada: PORTADAS.libro,
    bono: false,
  },
  ...BONOS_TEXTO.map((b, i) => ({ ...b, etiqueta: `${b.etiqueta} · incluido`, portada: i === 0 ? PORTADAS.bono1 : PORTADAS.bono2, bono: true })),
];

export function BookBundle() {
  return (
    <section id="incluye" className="scroll-mt-6">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>Tu compra</Eyebrow>
        <Titulo>Qué incluye tu compra</Titulo>
        <p className="mt-4">Un libro con todo lo necesario para practicar, más dos bonos que van incluidos siempre.</p>
      </div>

      {/* El paquete en tres tarjetas: libro + bono 1 + bono 2, cada uno con su portada grande */}
      <ul className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
        {PIEZAS.map((pz, i) => (
          <li
            key={pz.titulo}
            className={`relative flex flex-col rounded-[24px] ${pz.bono ? "glass-strong ring-1 ring-amber/40" : "glass"}`}
          >
            {i > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-7 left-1/2 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-white/20 bg-bg-3 font-display text-2xl text-ink md:top-1/3 md:-left-6 md:translate-x-0"
              >
                +
              </span>
            )}
            <div className="rounded-t-[24px] bg-[radial-gradient(circle_at_50%_45%,rgba(42,34,245,0.35),transparent_70%)] px-6 pt-8 pb-6">
              <ImagenAmpliable
                {...pz.portada}
                className="mx-auto block h-64 w-auto rounded-lg border border-white/10 shadow-[0_24px_50px_-18px_rgba(0,0,0,0.9)] sm:h-72"
              />
            </div>
            <div className="flex flex-1 flex-col p-6 pt-2">
              <span
                className={`self-start rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase ${
                  pz.bono ? "bg-amber text-[#1a1300]" : "bg-brand/30 text-ink"
                }`}
              >
                {pz.etiqueta}
              </span>
              <h3 className="mt-3 font-display text-xl text-ink">{pz.titulo}</h3>
              <p className="mt-2 text-base">{pz.texto}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* «Dentro del libro» con el reel de los bonos al lado */}
      <div className="glass mt-8 grid items-center gap-8 rounded-[24px] p-6 sm:p-8 md:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] md:gap-10">
        <div>
          <h3 className="font-display text-xl text-ink sm:text-2xl">Dentro del libro</h3>
          <Lista items={INCLUYE} />
        </div>
        <VideoPromo id="bonos" titulo="Compras un libro. Te llevas tres." duracion="0:35" />
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
