"use client";

import type { GastoCategoria } from "@/lib/types";
import { dinero } from "./formato";

/** ¿En qué se te va el dinero? Gastos del periodo por categoría, de mayor a menor. */
export function GastosCategoria({ gastos, etiqueta }: { gastos: GastoCategoria[]; etiqueta: string }) {
  const max = Math.max(1, ...gastos.map((g) => g.monto));
  return (
    <section className="glass h-full rounded-2xl p-4 sm:p-5">
      <h3 className="font-semibold text-ink">¿En qué se te va el dinero?</h3>
      <p className="mb-4 text-xs text-ink-mute">Gastos por categoría · {etiqueta}</p>
      {gastos.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-mute">Sin gastos registrados en este periodo.</p>
      ) : (
        <ul className="space-y-3">
          {gastos.map((g) => (
            <li key={g.categoria}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-ink-soft">{g.categoria}</span>
                <span className="shrink-0 font-semibold text-ink">{dinero(g.monto)}</span>
              </div>
              <div className="h-3" aria-hidden>
                <div
                  className="h-full rounded-r-[4px]"
                  style={{ width: `${Math.max(1.5, (g.monto / max) * 100)}%`, background: "var(--serie-salio)" }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
