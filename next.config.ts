import type { NextConfig } from "next";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
// Política de las páginas del CRM (Next.js): necesita inline para hidratar.
const SCRIPT_SRC_APP =
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://analytics.tiktok.com https://challenges.cloudflare.com";

const csp = (scriptSrc: string) => [
  "default-src 'self'",
  // Next.js necesita inline para hidratar; los estilos de Tailwind van inline.
  // Meta Pixel y TikTok Pixel se cargan solo tras aceptar cookies (ver Pixels.tsx).
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  // Videos de la tarjeta (/roberto): los que subes desde el CRM viven en el cajón público de Supabase; blob: es la vista previa al comprimirlos.
  "media-src 'self' blob: https://*.supabase.co",
  "font-src 'self' data:",
  // connect-src: tu base de datos (Supabase), el API de íconos a color y los píxeles.
  "connect-src 'self' https://*.supabase.co https://api.iconify.design https://api.simplesvg.com https://api.unisvg.com https://www.facebook.com https://analytics.tiktok.com https://challenges.cloudflare.com",
  // El captcha del login (Cloudflare Turnstile) se dibuja en un iframe de Cloudflare.
  // La tarjeta /roberto abre la agenda de citas (Google Calendar) dentro de una ventana: solo se carga al tocar «Agendar cita».
  "frame-src https://challenges.cloudflare.com https://calendar.google.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/**
 * Páginas estáticas de la tarjeta (public/tarjeta/*.html): su JavaScript va en el propio HTML,
 * así que en vez de abrir `'unsafe-inline'` (que deja correr cualquier script inyectado) se
 * autoriza solo el contenido EXACTO de cada <script> con su huella SHA-256. Se calcula al
 * construir el sitio: si editas un script de estas páginas, la huella se actualiza sola.
 * - Los <script src="..."> ya los cubre 'self'.
 * - Los <script type="application/ld+json"> son datos (no se ejecutan) y no necesitan huella.
 * - El navegador convierte CRLF en LF antes de calcular la huella; aquí se hace igual.
 */
function scriptSrcConHuellas(archivo: string): string {
  const html = readFileSync(join(process.cwd(), "public", "tarjeta", archivo), "utf8");
  const huellas: string[] = [];
  for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
    const atributos = m[1] ?? "";
    if (/\bsrc\s*=/i.test(atributos)) continue;
    if (/type\s*=\s*["']?application\/ld\+json/i.test(atributos)) continue;
    const cuerpo = m[2].replace(/\r\n?/g, "\n");
    if (!cuerpo.trim()) continue;
    huellas.push(`'sha256-${createHash("sha256").update(cuerpo, "utf8").digest("base64")}'`);
  }
  return ["script-src 'self'", ...new Set(huellas)].join(" ");
}

// Dirección pública → archivo que la sirve (ver rewrites más abajo).
const paginasEstaticas: Record<string, string> = {
  "/roberto": "index.html",
  "/tarjeta": "index.html",
  "/escudo": "escudo.html",
  "/guias": "guias.html",
  "/seguro-de-vida-con-ahorro": "vida-ahorro.html",
  "/empresarios": "empresarios.html",
  "/cotiza": "cotiza.html",
};

const securityHeaders = (scriptSrc: string = SCRIPT_SRC_APP) => [
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
  { key: "Content-Security-Policy", value: csp(scriptSrc) },
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
    return [
      { source: "/:path*", headers: securityHeaders() },
      // Páginas estáticas de la tarjeta: CSP estricta (sin 'unsafe-inline' ni 'unsafe-eval' en script-src).
      // Va después de la general: si dos reglas fijan la misma cabecera, gana la última.
      ...Object.entries(paginasEstaticas).map(([source, archivo]) => ({
        source,
        headers: securityHeaders(scriptSrcConHuellas(archivo)),
      })),
      // Guías en PDF que se entregan a quien deja sus datos (public/descargas/): fuera de los buscadores
      { source: "/descargas/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // Contacto de la tarjeta: el celular lo abre como "Agregar a contactos"
      {
        source: "/tarjeta/roberto-rodriguez.vcf",
        headers: [
          { key: "Content-Type", value: "text/vcard; charset=utf-8" },
          { key: "Content-Disposition", value: 'inline; filename="Roberto-Rodriguez.vcf"' },
        ],
      },
    ];
  },
  // Guía gratuita «Dinero Bajo Control»: /semana lleva a su página; sus archivos viven en public/tarjeta/semana/ y salen
  // bajo /semana/... para que sus rutas relativas, su manifiesto y su service worker queden dentro de /semana/.
  async redirects() {
    return [{ source: "/semana", destination: "/semana/index.html", permanent: false }];
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
      // Páginas de contenido (texto escrito en el HTML, para que Google y las vistas previas lo lean)
      { source: "/seguro-de-vida-con-ahorro", destination: "/tarjeta/vida-ahorro.html" },
      { source: "/empresarios", destination: "/tarjeta/empresarios.html" },
      // Anuncio para los grupos de WhatsApp: 4 seguros que abren WhatsApp con el mensaje listo (noindex)
      { source: "/cotiza", destination: "/tarjeta/cotiza.html" },
      { source: "/semana/:path*", destination: "/tarjeta/semana/:path*" },
    ];
  },
};

export default nextConfig;
