<!-- Color de marca LEGENDAR·IA: azul #2a22f5. Escribir SIEMPRE "Vercel". -->

# 🎨 Imágenes y video del kit (generados con IA, on-brand)

El kit ya trae un set visual **azul LEGENDAR·IA (Liquid Glass)** listo para usar,
generado con IA (Higgsfield: imágenes `nano_banana_2` + video **Veo 3**). Son un
**punto de partida**: puedes quedártelos o reemplazarlos por los tuyos. Todos
viven en `public/` (ahí es donde tu sitio puede mostrarlos).

| Archivo | Qué es | Dónde se usa | Cómo lo cambias |
|---|---|---|---|
| `public/img/hero-bg.png` | Fondo abstracto azul del encabezado | Detrás del hero de la página de captura ([`components/captura/Landing.tsx`](../components/captura/Landing.tsx)) | Reemplaza el archivo (mismo nombre) o pídele a Claude Code otro fondo. |
| `public/img/og-image.png` | Tarjeta de vista previa al compartir el link | Metadata social ([`app/layout.tsx`](../app/layout.tsx), OpenGraph + Twitter) | Cambia el archivo; ideal 1200×630 px. |
| `public/img/mockup.png` | Render de tu página + tu CRM en dispositivos | Portada del [`README.md`](../README.md) y material de marketing | Decorativo; puedes borrarlo o sustituirlo. |
| `public/img/funnel-keyframe.png` | Primer cuadro del video del funnel | Portada (poster) del video | Es la base del video; cámbiala si rehaces el video. |
| `public/video/funnel-hook.mp4` | Video 9:16 del funnel orgánico (voz ES) | Anuncio/Reel que lleva a tu página (ver [VIDEO-FUNNEL.md](VIDEO-FUNNEL.md)) | Genera el tuyo con la plantilla de Veo 3. |
| `public/video/funnel-hook-poster.png` | Imagen de portada del video | Miniatura del video | Igual que el keyframe. |

> 📁 En `assets/generados/virality-dashboard.html` queda el reporte completo del
> **predictor de viralidad** del video (ábrelo en tu navegador con doble clic).

---

## Cómo pedirle a Claude Code que los reemplace

Cuando pegues [`prompts/00-MAESTRO.md`](../prompts/00-MAESTRO.md), puedes añadir:

> *"Reemplaza `public/img/hero-bg.png` por una imagen on-brand de **mi** negocio
> ([describe tu giro y tu color]). Mantén el estilo Liquid Glass azul #2a22f5.
> Actualiza también `og-image.png` con el nombre de mi negocio."*

> Regla de oro de marca: **cero colores escritos a mano** en el código. El azul
> `#2a22f5` y los demás colores viven como *tokens* en `app/globals.css`.
