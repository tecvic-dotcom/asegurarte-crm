/**
 * Logotipo de la promotoría: "ROBERTO RODRIGUEZ" + "ESPECIALISTA EN Asegur-Arte".
 * Una sola tipografía (Anton, la misma del logo) para las tres líneas: la
 * diferencia entre "ESPECIALISTA EN" y "Asegur-Arte" es de TAMAÑO, no de
 * fuente — "Asegur-Arte" va notablemente más grande para tener presencia.
 */
export function Logo({ compacto = false }: { compacto?: boolean }) {
  return (
    <span className="inline-flex flex-col leading-none select-none">
      <span
        className={`font-[family-name:var(--font-logo-black)] italic tracking-wide text-ink ${
          compacto ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl"
        }`}
      >
        ROBERTO RODRIGUEZ
      </span>
      <span
        className={`mt-1 flex flex-wrap items-baseline gap-x-2 font-[family-name:var(--font-logo-black)] italic tracking-wide ${
          compacto ? "text-xs sm:text-sm" : "text-sm sm:text-base"
        }`}
      >
        <span className="text-ink">ESPECIALISTA EN</span>
        <span className={`text-brand-2 ${compacto ? "text-2xl sm:text-3xl" : "text-4xl sm:text-5xl"}`}>
          Asegur-Arte
        </span>
      </span>
    </span>
  );
}
