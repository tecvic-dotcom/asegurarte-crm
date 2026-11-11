/**
 * Íconos de línea blancos con el mismo trazo que /cotiza y los mosaicos de /roberto.
 * Cada uno tiene su propio movimiento al pasar el ratón o tocar la tarjeta (estilos en app/globals.css, «.il-*»).
 */
export type DibujoLinea = "reloj" | "bebe" | "escudo";

const TRAZOS: Record<DibujoLinea, React.ReactNode> = {
  // Despertador: el periodo de espera
  reloj: (
    <>
      <circle cx="32" cy="35" r="19" />
      <path className="il-aguja" d="M32 24 V35 L40 40" />
      <path d="M12 17 L19 10" />
      <path d="M52 17 L45 10" />
      <path d="M19 52 L15 57" />
      <path d="M45 52 L49 57" />
    </>
  ),
  // Carriola: el bebé protegido desde el día uno
  bebe: (
    <>
      <path d="M30 10 A20 20 0 0 0 10 30 H30 Z" />
      <path d="M10 30 H54 Q52 46 32 46 Q12 46 10 30" />
      <path d="M54 30 L56 18 H61" />
      <circle cx="20" cy="53" r="5" />
      <circle cx="44" cy="53" r="5" />
    </>
  ),
  // Escudo con palomita: decides con claridad
  escudo: (
    <>
      <path d="M32 8 L52 15 V30 C52 43 43 52 32 56 C21 52 12 43 12 30 V15 Z" />
      <path className="il-trazo" d="M23 32 L30 39 L42 26" />
    </>
  ),
};

export function IconoLinea({ nombre, className = "" }: { nombre: DibujoLinea; className?: string }) {
  return (
    <svg className={`il il-${nombre} ${className}`} viewBox="0 0 64 64" aria-hidden="true">
      {TRAZOS[nombre]}
    </svg>
  );
}
