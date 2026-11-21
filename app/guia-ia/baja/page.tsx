import type { Metadata } from "next";
import { BotonBaja } from "./BotonBaja";

/** Página de la liga «date de baja» de los correos a lectores. La baja se confirma con un botón (POST), no al abrir la liga. */
export const metadata: Metadata = {
  title: "Darme de baja · De la Agenda al Algoritmo",
  robots: { index: false, follow: false },
};

export default async function BajaPage({ searchParams }: { searchParams: Promise<{ t?: string | string[] }> }) {
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : "";
  return (
    <main className="mx-auto max-w-xl px-5 py-20 text-center">
      <h1 className="font-display text-3xl text-ink">¿Ya no quieres recibir mis correos?</h1>
      <p className="mt-4 text-ink-soft">Si te das de baja, no te vuelvo a escribir sobre el libro. Tu guía sigue siendo tuya.</p>
      <div className="mt-8">
        <BotonBaja token={token} />
      </div>
    </main>
  );
}
