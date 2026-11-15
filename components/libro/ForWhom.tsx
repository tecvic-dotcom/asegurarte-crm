import { Lista } from "./ui";

/** Para quién es y para quién no (texto de la ficha de venta). */
const PARA_TI = [
  "Eres agente de seguros con experiencia y quieres sumar la tecnología sin dejar de ser tú.",
  "Sientes que las redes sociales y la computadora «no son lo tuyo», aunque en tu oficio te defiendes de maravilla.",
  "Quieres ahorrar tiempo en seguimiento, cobranza y contenido para tus redes.",
  "Te da un poco de miedo «romper algo» y quieres practicar con seguridad.",
];

const NO_PARA_TI = [
  "Esperas una fórmula mágica para vender sin trabajar.",
  "Quieres que la inteligencia artificial decida por ti sin que nadie revise.",
  "Buscas aprender a programar. Aquí usas la herramienta; no la programas.",
];

export function ForWhom() {
  return (
    <section className="grid gap-6 md:grid-cols-2">
      <div className="glass rounded-[24px] p-6 sm:p-8">
        <h2 className="font-display text-2xl text-ink">Es para ti si…</h2>
        <Lista items={PARA_TI} />
      </div>
      <div className="glass-soft rounded-[24px] p-6 sm:p-8">
        <h2 className="font-display text-2xl text-ink">No es para ti si…</h2>
        <Lista items={NO_PARA_TI} marca="✕" />
      </div>
    </section>
  );
}
