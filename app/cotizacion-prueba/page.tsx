import type { Metadata } from "next";
import { Logo } from "@/components/ui/Logo";
import { PruebaCotizacion } from "@/components/captura/PruebaCotizacion";

export const metadata: Metadata = {
  title: "Prueba del formulario de cotización",
  robots: { index: false, follow: false },
};

/**
 * Página de PRUEBA (no se enlaza desde ningún lado y no la indexan los buscadores).
 * Prueba la experiencia del formulario con un servidor simulado: no guarda ni envía datos.
 */
export default function CotizacionPruebaPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-8 sm:pt-12">
      <header className="mx-auto max-w-3xl">
        <Logo compacto />
        <h1 className="mt-8 font-display text-3xl sm:text-4xl text-gradient-brand">Prueba del formulario de cotización</h1>
        <p className="mt-3 text-ink-soft">
          Así se verá y se comportará el formulario. Todo es simulado: lo que escribas no se guarda ni se envía a nadie.
        </p>
      </header>
      <div className="mt-8">
        <PruebaCotizacion />
      </div>
    </main>
  );
}
