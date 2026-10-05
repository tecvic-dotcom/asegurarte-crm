import type { NextConfig } from "next";

/**
 * Configuración endurecida para producción del kit AI Cash Machine.
 * - Optimización de imágenes a AVIF/WebP (mejor LCP / Core Web Vitals).
 * - Cabeceras de seguridad (protegen al usuario y suben "Best Practices").
 * - Sin cabecera X-Powered-By y con compresión activada.
 *
 * Nota para el alumno: la CSP de abajo permite tu propio sitio + Supabase +
 * los íconos a color (Iconify). Si agregas otro servicio (un video embebido,
 * un pixel, etc.) quizá tengas que añadir su dominio aquí. Está comentado.
 */
const csp = [
  "default-src 'self'",
  // Next.js necesita inline para hidratar; los estilos de Tailwind van inline.
  // Meta Pixel y TikTok Pixel se cargan solo tras aceptar cookies (ver Pixels.tsx).
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://analytics.tiktok.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // connect-src: tu base de datos (Supabase), el API de íconos a color y los píxeles.
  "connect-src 'self' https://*.supabase.co https://api.iconify.design https://api.simplesvg.com https://api.unisvg.com https://www.facebook.com https://analytics.tiktok.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    // `microphone=(self)` habilita el dictado por voz del CRM (Web Speech API)
    // solo en tu propio sitio; iframes de terceros no pueden usar el micrófono.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400, // 31 días
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Tarjeta digital (archivo estático en public/tarjeta/). /roberto es la dirección para
  // compartir (y la del QR); /tarjeta se conserva para los enlaces que ya se enviaron.
  async rewrites() {
    return [
      { source: "/roberto", destination: "/tarjeta/index.html" },
      { source: "/tarjeta", destination: "/tarjeta/index.html" },
      // Calculadora "Tu Escudo Familiar" (suma asegurada de vida)
      { source: "/escudo", destination: "/tarjeta/escudo.html" },
      // Guías de seguros agrupadas por ramo (imágenes en public/tarjeta/guias/)
      { source: "/guias", destination: "/tarjeta/guias.html" },
    ];
  },
};

export default nextConfig;
