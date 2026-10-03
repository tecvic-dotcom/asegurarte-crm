import type { Metadata } from "next";
import { getAjustes } from "@/lib/db";
import { CONTENIDO } from "@/lib/landing-content";
import { Landing } from "@/components/captura/Landing";

/** Metadata dinámica con el nombre de tu negocio (de los ajustes). */
export async function generateMetadata(): Promise<Metadata> {
  const ajustes = await getAjustes().catch(() => null);
  const negocio = ajustes?.negocio_nombre || CONTENIDO.negocio;
  return {
    title: `${negocio} — Aparta tu lugar`,
    description: CONTENIDO.hero.subtitulo,
  };
}

export default async function Page() {
  const ajustes = await getAjustes().catch(() => null);
  const negocio = ajustes?.negocio_nombre || CONTENIDO.negocio;
  const popupActivo = ajustes?.popup_activo ?? false;
  const heroTitulo = ajustes?.hero_titulo || undefined;
  const heroCta = ajustes?.hero_cta || undefined;

  // JSON-LD para SEO/GEO (Google + buscadores con IA).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: negocio,
    description: CONTENIDO.hero.subtitulo,
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: CONTENIDO.faq.map((f) => ({
      "@type": "Question",
      name: f.pregunta,
      acceptedAnswer: { "@type": "Answer", text: f.respuesta },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Landing negocio={negocio} popupActivo={popupActivo} heroTitulo={heroTitulo} heroCta={heroCta} />
    </>
  );
}
