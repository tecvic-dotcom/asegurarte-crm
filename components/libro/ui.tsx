/** Piezas pequeñas que repiten las secciones de /libro. */

export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-xs font-semibold uppercase tracking-[0.22em] text-brand-2 sm:text-sm ${className}`}>{children}</p>;
}

export function Titulo({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`mt-3 font-display text-3xl leading-tight text-ink sm:text-4xl ${className}`}>{children}</h2>;
}

export function Lista({ items, marca = "✓" }: { items: React.ReactNode[]; marca?: string }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden="true" className="mt-0.5 flex-none font-bold text-brand-2">
            {marca}
          </span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
