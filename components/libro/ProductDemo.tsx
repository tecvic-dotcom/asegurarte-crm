import { Eyebrow, Titulo } from "./ui";

/**
 * Demostración: tres figuras tomadas del libro (proyectos/ebook-mano-derecha-digital/img), todas con datos inventados.
 * Cuando Roberto grabe el video de 30–45 s de su pantalla, va arriba de estas tarjetas.
 */
const MUESTRAS = [
  {
    img: "/img/libro/demo-carpeta.webp",
    alto: 725,
    escalon: "Escalón 2",
    titulo: "Una carpeta en orden, en minutos",
    texto: "Tu asistente propone cómo ordenar y renombrar los archivos. Tú apruebas el plan antes de que mueva nada.",
    alt: "Carpeta de prueba antes y después: a la izquierda, archivos con nombres desordenados; a la derecha, los mismos archivos ordenados en carpetas por ramo y con fecha",
  },
  {
    img: "/img/libro/demo-expediente.webp",
    alto: 771,
    escalon: "Escalón 3",
    titulo: "El expediente de tu asistente",
    texto: "Cuatro archivos que funcionan como una póliza: carátula, datos del asegurado, condiciones generales y endosos.",
    alt: "Esquema del expediente: CLAUDE.md es la carátula, info/negocio.md los datos del asegurado, protocolos/reglas.md las condiciones generales y la bitácora los endosos",
  },
  {
    img: "/img/libro/demo-tablero.webp",
    alto: 720,
    escalon: "Escalón 5",
    titulo: "Tablero de renovaciones con semáforo",
    texto: "Urgentes, próximas y tranquilas de un vistazo, con la prima y el estado del pago de cada cliente de ejemplo.",
    alt: "Tablero de renovaciones con datos inventados: 3 urgentes, 3 próximas y 1 tranquila, y una tabla con cliente, ramo, vencimiento, prima y pago",
  },
];

export function ProductDemo() {
  return (
    <section>
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>Demostración</Eyebrow>
        <Titulo>Lo que vas a construir</Titulo>
        <p className="mt-4">Tres imágenes tal como vienen en el libro. Todo con datos inventados, para que practiques sin arriesgar nada.</p>
      </div>

      <ul className="mt-10 grid gap-6 md:grid-cols-3">
        {MUESTRAS.map((m) => (
          <li key={m.img} className="glass flex flex-col overflow-hidden rounded-[22px]">
            <a href={m.img} target="_blank" rel="noopener" className="group block bg-white p-3" aria-label={`Ver en grande: ${m.titulo}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- imágenes estáticas ya optimizadas (WebP 1200 px) */}
              <img
                src={m.img}
                alt={m.alt}
                width={1200}
                height={m.alto}
                loading="lazy"
                className="w-full transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </a>
            <div className="flex flex-1 flex-col p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-2">{m.escalon}</p>
              <h3 className="mt-2 font-display text-xl text-ink">{m.titulo}</h3>
              <p className="mt-2 text-base">{m.texto}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
