# Assets de tu marca

Aquí van tus imágenes. El kit ya se ve bien sin ellas (usa íconos a color de
Iconify), pero personalizarlo lo hace tuyo.

## Logo

1. Pon tu logo en `assets/logos/` (PNG con fondo transparente, idealmente).
2. Cópialo también a `public/` (ahí es donde el sitio puede mostrarlo).
3. En `prompts/00-MAESTRO.md` dile a Claude Code: *"usa mi logo `/mi-logo.png` en
   el encabezado de la página de captura"*.

## Imágenes / mockups

- Cualquier foto que quieras en tu página va en `public/` y la referencias como
  `/mi-foto.jpg`.
- ¿No tienes fotos? Pídele a Claude Code que use ilustraciones o que genere
  imágenes on-brand (azul LEGENDAR·IA) con las herramientas del Módulo 2.

## Colores de marca

No necesitas tocar código: el wizard (`wizards/WIZARD-CONFIG.md`, pregunta 8) te
deja elegir tu paleta. Si quieres ajustarla a mano, los colores viven como
*tokens* en `app/globals.css` (busca `--brand`).

> Regla de oro: **cero colores escritos a mano** en los componentes. Todo sale
> de los tokens, así tu marca se mantiene consistente en todo el sitio.
