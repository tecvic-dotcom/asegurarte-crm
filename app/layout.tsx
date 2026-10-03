import type { Metadata, Viewport } from "next";
import { Montserrat, Inter, Anton } from "next/font/google";
import { CookieBanner } from "@/components/CookieBanner";
import { Pixels } from "@/components/Pixels";
import "./globals.css";

/**
 * Layout raíz del sitio del alumno.
 * Las tipografías y los tokens de marca (azul #2a22f5 + Liquid Glass) viven en
 * globals.css. La metadata es un punto de partida: el wizard + 00-MAESTRO la
 * personalizan con el nombre y la oferta de TU negocio.
 */

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700", "800", "900"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Tipografías del logotipo (encabezado "ROBERTO RODRIGUEZ · Asegur-Arte").
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});


const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const TITULO = "Roberto Rodríguez · Asegurarte — Asesoría gratis para tu embarazo";
const DESCRIPCION =
  "Agenda una asesoría gratis de 30 minutos y sabe qué seguro necesita tu familia para que tu bebé nazca protegido desde el primer día.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: TITULO,
    template: "%s · Roberto Rodríguez Asegurarte",
  },
  description: DESCRIPCION,
  openGraph: {
    title: TITULO,
    description: DESCRIPCION,
    url: SITE,
    siteName: "Roberto Rodríguez · Asegurarte",
    locale: "es_MX",
    type: "website",
    // ⚠️ Reemplaza /img/og-image.png por una imagen real de tu marca (1200x630)
    // antes de publicar: la que trae el kit es genérica.
    images: [{ url: "/img/og-image.png", width: 1200, height: 630, alt: TITULO }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRIPCION,
    images: ["/img/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#06070f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className={`${montserrat.variable} ${inter.variable} ${anton.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="bg-ambient" />
        <div className="bg-grid" />
        {children}
        <CookieBanner />
        <Pixels />
      </body>
    </html>
  );
}
