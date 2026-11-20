import { Eyebrow, Titulo } from "./ui";
import { VideoPromo } from "./VideoPromo";

/** El problema: el asesor con experiencia al que el día se le va en tareas repetitivas. Al lado, el reel «De la Agenda al Algoritmo» (el caos de carpetas). */
export function ProblemSection() {
  return (
    <section className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] md:gap-12">
      <div>
        <Eyebrow>Si esto te suena</Eyebrow>
        <Titulo>¿Tienes años en seguros y sientes que la tecnología corre más rápido que tú?</Titulo>
        <div className="mt-6 space-y-4">
          <p>Conoces a tus clientes. Sabes explicar una póliza sin tener que leerla y has resuelto problemas reales, de esos que no vienen en ningún manual.</p>
          <p>
            Pero el día se te va en otras cosas: buscar el documento que alguien guardó como «final final (2)», escribir otra vez el mismo seguimiento,
            acordarte de quién renueva este mes y, si sobra un rato, pensar qué publicar en tus redes.
          </p>
          <p className="glass-soft rounded-2xl border-l-4 border-brand-2 p-5 font-display text-xl leading-snug text-ink sm:text-2xl">
            No necesitas empezar de cero en tu profesión. Necesitas herramientas nuevas para aprovechar mejor lo que ya sabes.
          </p>
          <p>
            <em className="text-ink">De la Agenda al Algoritmo</em> te enseña cómo, en siete escalones prácticos: desde preparar tu computadora hasta
            dejar funcionando una forma nueva de administrar tu trabajo con un asistente de inteligencia artificial.
          </p>
        </div>
      </div>
      <VideoPromo id="agenda" titulo="¿Todavía haces esto a mano?" duracion="0:25" nota="Personas y escenas creadas con IA · Datos de ejemplo inventados" />
    </section>
  );
}
