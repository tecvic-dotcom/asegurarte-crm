/**
 * Datos de venta del libro «De la Agenda al Algoritmo» que comparten app/libro/page.tsx y components/libro/*.
 *
 * VENTA_ABIERTA = false: los botones dicen «Muy pronto a la venta», la liga de Hotmart no sale en el HTML
 * y no aparece el botón fijo del celular. Estuvo APAGADO del 2026-11-14 al 2026-11-19; ENCENDIDO el 2026-11-19 (venta abierta en Hotmart).
 * Para abrir la venta: poner true + quitar `hidden` de los 2 <a class="nav-libro"> en public/tarjeta/index.html, y publicar juntos.
 */
export const VENTA_ABIERTA = true;
const CHECKOUT_HOTMART = "https://pay.hotmart.com/V108500398J";
export const CHECKOUT_URL = VENTA_ABIERTA ? CHECKOUT_HOTMART : "";

/**
 * Ligas para compartir fuera del sitio (reels, correos, afiliados): /comprar lleva a la principal,
 * /comprar/hotmart y /comprar/whop a cada una (app/comprar/[[...plataforma]]/route.ts).
 * Liga vacía o venta cerrada → manda a /libro. Lo que vaya después de «?» pasa tal cual (Hotmart lee ?src=tiktok).
 */
export const PLATAFORMAS: Record<string, string> = {
  hotmart: CHECKOUT_HOTMART,
  whop: "", // pegar aquí la liga de pago de Whop cuando el producto esté publicado
};
export const PLATAFORMA_PRINCIPAL = "hotmart";

/** Precio tal como se muestra (Hotmart suma el IVA aparte). Si cambia, cambiar también ficha y términos (venta.js). */
export const PRECIO = "USD $29.99";
export const PRECIO_NOTA = "más impuestos";

export const CORREO_CONTACTO = "rdz.roberto@outlook.com";
