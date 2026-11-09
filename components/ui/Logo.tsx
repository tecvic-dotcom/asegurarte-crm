/**
 * Logotipo de la promotoría: "ROBERTO RODRIGUEZ" + "ESPECIALISTA EN Asegur-Arte".
 * Una sola tipografía (Anton, la misma del logo) para las tres líneas: la
 * diferencia entre "ESPECIALISTA EN" y "Asegur-Arte" es de TAMAÑO, no de
 * fuente — "Asegur-Arte" va notablemente más grande para tener presencia.
 */
export function Logo({ compacto = false, mini = false }: { compacto?: boolean; /** Más chico aún: para el menú fijo del celular. */ mini?: boolean }) {
  const t1 = mini ? "text-base sm:text-xl" : compacto ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl";
  const t2 = mini ? "text-[10px] sm:text-xs" : compacto ? "text-xs sm:text-sm" : "text-sm sm:text-base";
  const t3 = mini ? "text-xl sm:text-2xl" : compacto ? "text-2xl sm:text-3xl" : "text-4xl sm:text-5xl";
  return (
    <span className="inline-flex flex-col leading-none select-none">
      <span
        className={`font-[family-name:var(--font-logo-black)] italic tracking-wide text-ink ${t1}`}
      >
        ROBERTO RODRIGUEZ
      </span>
      <span
        className={`mt-1 flex flex-wrap items-baseline gap-x-2 font-[family-name:var(--font-logo-black)] italic tracking-wide ${t2}`}
      >
        <span className="text-ink">ESPECIALISTA EN</span>
        <span className={`text-brand-2 ${t3}`}>
          Asegur-Arte
        </span>
      </span>
    </span>
  );
}
