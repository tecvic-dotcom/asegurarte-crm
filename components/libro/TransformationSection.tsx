import { Eyebrow, Titulo } from "./ui";

/**
 * La transformación: cómo trabajas hoy contra cómo trabajas con tu oficina digital.
 * Cada «después» corresponde a un ejercicio del libro (caps. 2, 3 y 5). Sin cifras de tiempo ni resultados prometidos.
 */
const CAMBIOS = [
  {
    tema: "Tus archivos",
    antes: "Pólizas regadas con nombres como «poliza maria nueva FINAL (2)».",
    despues: "Carpetas por ramo y nombres con fecha que cualquiera entiende.",
  },
  {
    tema: "Tus seguimientos",
    antes: "Cada mensaje de WhatsApp lo escribes desde cero.",
    despues: "Tu asistente te da tres borradores con tu tono. Tú eliges, corriges y envías.",
  },
  {
    tema: "Tus pólizas",
    antes: "Pasar páginas y páginas de condiciones a palabras sencillas.",
    despues: "Un resumen de diez líneas que comparas contra el original antes de mandarlo.",
  },
  {
    tema: "Tus renovaciones",
    antes: "Las fechas viven en tu memoria o en una libreta.",
    despues: "Un tablero con semáforo te enseña qué vence en menos de 15 días.",
  },
  {
    tema: "Tus redes",
    antes: "Publicas cuando te acuerdas.",
    despues: "Un plan de contenido de cuatro semanas y guiones para grabarte con el celular.",
  },
  {
    tema: "Tu asistente",
    antes: "Cada vez que abres la IA le vuelves a explicar quién eres.",
    despues: "Lee tu expediente y arranca sabiendo cómo trabajas.",
  },
];

export function TransformationSection() {
  return (
    <section>
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>La transformación</Eyebrow>
        <Titulo>De la libreta a tu oficina digital</Titulo>
        <p className="mt-4">Lo que ya sabes hacer se queda. Cambia la forma de hacerlo.</p>
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CAMBIOS.map((c) => (
          <li key={c.tema} className="glass flex flex-col rounded-[22px] p-5 sm:p-6">
            <p className="font-display text-lg text-ink">{c.tema}</p>
            <p className="mt-4 flex gap-3 text-base text-ink-mute">
              <span aria-hidden="true" className="flex-none font-bold text-red">
                ✕
              </span>
              <span>
                <span className="sr-only">Hoy: </span>
                {c.antes}
              </span>
            </p>
            <p className="mt-3 flex gap-3 border-t border-line pt-3 text-base text-ink">
              <span aria-hidden="true" className="flex-none font-bold text-green">
                ✓
              </span>
              <span>
                <span className="sr-only">Con tu oficina digital: </span>
                {c.despues}
              </span>
            </p>
          </li>
        ))}
      </ul>

      <p className="mx-auto mt-8 max-w-2xl text-center text-base text-ink-mute">
        Practicas siempre primero con datos inventados y a tu ritmo. La inteligencia artificial propone; tú revisas y decides.
      </p>
    </section>
  );
}
