/**
 * Datos de venta del libro «De la Agenda al Algoritmo» que comparten app/libro/page.tsx y components/libro/*.
 *
 * VENTA_ABIERTA = false: los botones dicen «Muy pronto a la venta», la liga de Hotmart no sale en el HTML
 * y no aparece el botón fijo del celular. APAGADO (2026-11-14) hasta que el libro esté cargado en Hotmart.
 * Para abrir la venta: poner true + quitar `hidden` de los 2 <a class="nav-libro"> en public/tarjeta/index.html, y publicar juntos.
 */
export const VENTA_ABIERTA = false;
const CHECKOUT_HOTMART = "https://pay.hotmart.com/V108500398J";
export const CHECKOUT_URL = VENTA_ABIERTA ? CHECKOUT_HOTMART : "";

/** Precio tal como se muestra (Hotmart suma el IVA aparte). Si cambia, cambiar también ficha y términos (venta.js). */
export const PRECIO = "USD $29.99";
export const PRECIO_NOTA = "más impuestos";

export const CORREO_CONTACTO = "rdz.roberto@outlook.com";
