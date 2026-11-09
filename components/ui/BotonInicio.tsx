/**
 * Botón de regreso «‹ Inicio»: el MISMO que usan /escudo, /guias, /empresarios y /seguro-de-vida-con-ahorro
 * (estilo `.btn-volver` en globals.css). <a> normal: /roberto es un archivo estático (rewrite), no una página de Next.
 */
export function BotonInicio({ href = "/roberto", className = "" }: { href?: string; className?: string }) {
  return (
    <a href={href} className={`btn-volver ${className}`}>
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m15 18-6-6 6-6" />
      </svg>
      Inicio
    </a>
  );
}
