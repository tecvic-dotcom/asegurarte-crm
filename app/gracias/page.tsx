import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icono";
import { ConversionYRedireccion } from "@/components/gracias/ConversionYRedireccion";
import { Logo } from "@/components/ui/Logo";
import { getAjustes } from "@/lib/db";

export const metadata: Metadata = {
  title: "¡Gracias! Recibimos tus datos",
  robots: { index: false, follow: false },
};

/**
 * Página de gracias. Confirma el registro y manda a WhatsApp/grupo.
 * El enlace se LEE de los ajustes (Supabase), editable desde /admin — NO está
 * hardcodeado. Es Server Component: lee la base por el servidor, sin exponerla.
 */
export default async function GraciasPage() {
  const ajustes = await getAjustes().catch(() => null);
  const whatsapp = ajustes?.whatsapp_url || "";
  const grupo = ajustes?.group_url || "";

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-5 py-16 text-center">
      <div className="glass-strong rounded-[28px] p-8 sm:p-12">
        <div className="animate-float mx-auto w-fit">
          <Icon icon="flat-color-icons:ok" width={84} />
        </div>
        <h1 className="mt-6 font-display text-3xl sm:text-4xl text-gradient-brand">¡Listo! Te apartamos tu lugar</h1>
        <p className="mt-4 text-lg text-ink-soft">Recibimos tus datos en:</p>
        <div className="mt-2 flex justify-center">
          <Logo compacto />
        </div>
        <p className="mt-4 text-lg text-ink-soft">
          <strong className="text-ink">Tomaste una gran decisión.</strong> Te contactamos hoy mismo.
        </p>

        <div className="mt-8 grid gap-3">
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-lg"
            >
              <Icon icon="logos:whatsapp-icon" width={24} /> Escríbenos por WhatsApp
            </a>
          ) : (
            <p className="rounded-xl border border-line bg-glass px-4 py-3 text-sm text-ink-mute">
              (Configura tu link de WhatsApp en el panel <code>/admin</code> para que este botón funcione.)
            </p>
          )}
          <ConversionYRedireccion whatsapp={whatsapp} />
          {grupo && (
            <a href={grupo} target="_blank" rel="noopener noreferrer" className="btn-ghost">
              <Icon icon="flat-color-icons:conference-call" width={22} /> Únete a nuestro grupo
            </a>
          )}
        </div>

        <div className="mt-8 border-t border-line pt-6 text-left">
          <p className="mb-3 text-sm font-semibold text-ink-soft">¿Qué sigue?</p>
          <ol className="space-y-2 text-sm text-ink-mute">
            <li className="flex gap-2"><span className="text-brand-2">1.</span> Revisa tu WhatsApp: te escribimos pronto.</li>
            <li className="flex gap-2"><span className="text-brand-2">2.</span> Ten a la mano tus dudas para resolverlas.</li>
            <li className="flex gap-2"><span className="text-brand-2">3.</span> Guarda nuestro número para no perderte el mensaje.</li>
          </ol>
        </div>

        <Link href="/" className="mt-8 inline-block text-sm text-ink-mute underline hover:text-ink-soft">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
