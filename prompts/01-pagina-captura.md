# 01 · Tu página de captura (el aparador de tu negocio en internet)

**Paso 1 de 6 · ~25 min · necesitas:** tu proyecto del kit ya abierto en Claude Code, y a la mano 3 datos: qué regalas a cambio del dato, tu promesa en una frase, y tu número o grupo de WhatsApp.

---

## ¿Qué vas a construir aquí?

Una **página de captura**: el aparador de tu negocio en internet. En una taquería, el aparador es la barra con las salsas y el olor a carne asada que detiene a la gente en la banqueta. Tu página hace lo mismo: detiene al desconocido que venía pasando, le ofrece algo valioso gratis, y a cambio le pide tres datos: **nombre, correo y teléfono**.

No vas a programar nada. Le hablas a tu IA en español, ella construye, y tú revisas.

**Cómo se usa este archivo (un solo movimiento):**

1. Copia TODO el bloque grande de abajo (el que empieza con "Eres un equipo senior…").
2. Pégalo en Claude Code, dentro de tu proyecto del kit, y dale Enter.
3. La IA te hará unas preguntas de tu negocio. Respóndelas. Luego trabaja sola.

> **Checkpoint:** si pegaste bien, la IA NO empieza a programar de inmediato: primero te saluda y te hace 5 preguntas sobre tu negocio. Si te empieza a escribir código sin preguntar, escríbele "Primero hazme las preguntas del contexto" y volverá al orden.

---

## EL SUPERPROMPT (copia y pega completo)

```text
Eres un equipo senior trabajando juntos en MI proyecto del kit "AI Cash Machine":
un copywriter de respuesta directa, un ingeniero de marketing experto en embudos,
un ingeniero front-end senior, un diseñador UX/UI senior y un especialista en
conversión y analítica. Vamos a construir UNA PÁGINA DE CAPTURA/VENTA de altísima
conversión DENTRO de la app que ya tengo en este proyecto. NO crees un proyecto
nuevo ni apps sueltas: es un módulo más de la app que ya existe. Reutiliza mi
stack, mis estilos y mi marca. Háblame siempre como a un dueño de negocio, nunca
como a un programador.

================================================================
PREGÚNTAME ESTO ANTES DE ESCRIBIR UNA SOLA LÍNEA DE CÓDIGO
================================================================
Hazme estas preguntas en español y espera mis respuestas:
1. ¿Qué negocio tengo y a quién le vendo? (ej: estética, taquería, inmobiliaria)
2. ¿Qué regalo a cambio del dato? (guía, clase gratis, cupón, diagnóstico, demo)
3. ¿Cuál es mi promesa principal en una frase? (será el titular)
4. ¿A qué número o grupo de WhatsApp mando a la gente al final?
5. Si NO quieres mi azul de marca por defecto, ¿qué color de marca uso?
Si no te contesto algo, usa supuestos sensatos de mi industria y sigue. No te detengas.

================================================================
OBJETIVO
================================================================
Una página que VENDE y captura datos con conversión máxima. Una sola acción clara:
dejar Nombre, Correo y Teléfono. Después, página de GRACIAS con enlace a WhatsApp.

================================================================
STACK Y MARCA (OBLIGATORIO — reutiliza, no inventes)
================================================================
- Mismo proyecto Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4
  que ya tengo. Crea las rutas /captura y /gracias dentro de la app actual.
- Datos de leads: Supabase con @supabase/supabase-js. Animación: Framer Motion.
  Iconos a color con Iconify (flat-color-icons:* y fluent-emoji-flat:*). NO uses
  Zod (no está instalado): la validación es manual, escrita a mano.
- MARCA LEGENDAR·IA: color principal azul #2a22f5. Tipografías Montserrat (títulos)
  + Inter (texto). Estética Liquid Glass premium. PROHIBIDO el dorado o el coral.
- CERO colores escritos a mano (hex) dentro de los componentes: define los colores
  como tokens (variables CSS, ej. --brand: #2a22f5) en un solo lugar y usa el token.
- Imágenes generadas con IA (no banco de fotos genérico): si tengo el MCP Higgsfield
  o nano-banana disponible, genera las imágenes y guárdalas en /public. Si NO hay
  MCP de imágenes, usa un degradado de marca elegante como fondo. Nunca cuadros grises.

================================================================
ESTRUCTURA DE /captura (en este orden, mobile-first)
================================================================
1. HÉROE: titular gigante (la promesa), subtítulo de una línea, botón principal
   "Quiero mi [regalo]". Arriba a la derecha: puntito verde + "X viendo ahora".
2. DATO/PRUEBA GIGANTE (ej: "+1,200 clientes" o el % de resultado), bien grande.
3. 3 BENEFICIOS en tarjetas glass (qué se lleva, en lenguaje de beneficio, sin tecnicismos).
4. CÓMO FUNCIONA en 3 pasos simples con iconos a color.
5. TESTIMONIOS / confianza en tarjetas glass.
6. FORMULARIO DE CAPTURA (el centro de todo): campos Nombre, Correo, Teléfono.
   Repítelo también como botón pegado abajo (sticky) en móvil.
7. CIERRE con garantía / sin compromiso + repetición del botón.
8. Pie con aviso de privacidad y enlaces legales.

Copy: voz humana, directa, de tú a tú. PROHIBIDO sonar a robot ("desbloquea",
"revoluciona", "en la era de", "potencia", "sumérgete"). Frases cortas. Beneficio
antes que característica.

================================================================
EL FORMULARIO Y SUS VALIDACIONES (lo más importante — hazlo exacto)
================================================================
Campos visibles: Nombre, Correo, Teléfono. Validación EN EL NAVEGADOR (mensajes
claros en español) y OTRA VEZ EN EL SERVIDOR antes de guardar (nunca confíes solo
en el navegador). Reglas exactas:
- NOMBRE: obligatorio, mínimo 2 caracteres reales (sin contar espacios).
- CORREO: obligatorio, formato válido tipo RFC 5322 (algo@algo.dominio). Recházalo
  si no tiene "@" y un dominio con punto. Teclado de email en móvil (type="email").
- TELÉFONO: obligatorio, formato México. Acepta lo que el usuario escriba con
  espacios o guiones, pero al final deben quedar EXACTAMENTE 10 dígitos (celular MX).
  Guárdalo normalizado como +52 seguido de los 10 dígitos. Teclado numérico en móvil.
- HONEYPOT (trampa anti-robot): agrega un campo extra OCULTO a la vista humana
  (ej. un input llamado "empresa_web" escondido con CSS, no con type=hidden) que
  una persona jamás rellena. Si llega con algo escrito, es un robot: NO guardes el
  lead y responde como si todo hubiera salido bien (no le avises al bot).
- Solo guarda el lead si TODAS las validaciones pasan en el servidor.
- Sanitiza todo lo que el usuario escribe (evita inyección y XSS).

================================================================
CONSENTIMIENTO DE PRIVACIDAD (LFPDPPP) — BLOQUEANTE
================================================================
Ley mexicana (LFPDPPP). Junto al botón del formulario pon una casilla de
consentimiento que diga algo como: "Acepto el aviso de privacidad y el tratamiento
de mis datos para que me contacten." con enlace a un aviso de privacidad.
- El botón de enviar está DESACTIVADO hasta que el usuario marque la casilla.
- El servidor NO guarda el lead si no llega marcado el consentimiento (bloqueante).
- Guarda junto al lead la fecha/hora en que aceptó.

================================================================
CAPTURA DE ORIGEN DEL VISITANTE (de dónde llegó)
================================================================
Cuando alguien envía el formulario, junto al lead guarda en silencio:
- LOS 5 UTMs de la URL: utm_source, utm_medium, utm_campaign, utm_term, utm_content.
  (Es la etiqueta que dice de qué anuncio o publicación llegó el cliente.)
- DISPOSITIVO: móvil o escritorio, y el navegador (lo sabes por el "user-agent").
- GEO aproximada por IP en el SERVIDOR: ciudad / estado / país. Nunca guardes la IP
  completa cruda visible; quédate con la ubicación aproximada, con respeto a privacidad.
Estos datos NO se le piden al usuario: se capturan solos.

================================================================
POP-UP DE PRUEBA SOCIAL (notificaciones tipo "alguien acaba de registrarse")
================================================================
- Apágalo POR DEFECTO (debe nacer en OFF). Solo se enciende si yo lo activo.
- Cuando esté encendido, SOLO debe aparecer en ESCRITORIO. JAMÁS en móvil, para no
  tapar el formulario.
- Debe usar datos reales o verosímiles de registros que sí ocurren, no inventos.

================================================================
SEO / GEO (que se encuentre en Google y en buscadores con IA)
================================================================
- Metadatos completos (title, description), Open Graph y Twitter Card con imagen.
- HTML semántico: un solo h1, jerarquía correcta, texto alternativo en imágenes.
- Datos estructurados JSON-LD schema.org (Organization + Offer/Service) en la página.
- sitemap.xml y robots.txt. URLs limpias. Idioma es-MX declarado (<html lang="es-MX">).
- Buen rendimiento (Core Web Vitals): imágenes optimizadas con next/image.

================================================================
RESPONSIVE PERFECTO (Android e iOS)
================================================================
- Mobile-first real. Pruébalo mentalmente en iPhone (Safari) y Android (Chrome).
- Respeta el notch (safe-area-inset). Sin scroll horizontal. Tipografías que escalan.
- Botón de acción siempre visible (sticky) en móvil, área de toque mínima 48px.
- Que se vea espectacular en pantalla chica y en escritorio.

================================================================
SEGURIDAD Y SECRETOS
================================================================
- La base de leads NUNCA se expone al navegador. El navegador solo usa la llave
  PÚBLICA (NEXT_PUBLIC_SUPABASE_ANON_KEY). El guardado del lead pasa por el SERVIDOR
  usando la llave secreta (SUPABASE_SECRET_KEY), que jamás llega al navegador.
- Si NO existe la llave secreta, la app corre en MODO DEMO (guarda en memoria,
  cloudReady=false) sin romperse. Avísame en pantalla cuando esté en modo demo.
- Activa RLS (la puerta con llave de la bodega) en Supabase: deny por defecto.
  Nadie lee la tabla de leads desde el navegador.
- Variables de entorno EXACTAS que voy a usar (no inventes otros nombres):
  NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (pública, segura de exponer),
  SUPABASE_SECRET_KEY (solo servidor), SUPABASE_DB_PASSWORD (solo migraciones).
- Anti-spam: honeypot (arriba) + un límite de envíos por IP (rate limiting) para que
  un robot no inunde la tabla. Nada de secretos escritos en el código.

================================================================
PÁGINA DE GRACIAS /gracias
================================================================
- Mensaje cálido confirmando el registro, mismo estilo glass de marca.
- Botón grande "Únete al grupo de WhatsApp" / "Escríbeme por WhatsApp" según mi config.
- Pequeño dato gigante de bienvenida. Cuida que también se vea perfecto en móvil.

================================================================
ENTREGA (qué quiero al final)
================================================================
1. El código dentro de mi app actual (rutas /captura y /gracias).
2. El SQL exacto para crear la tabla de leads en Supabase y activar su RLS.
3. La lista de variables de entorno que necesito y dónde va cada una.
4. Pasos simples, en español de dueño de negocio, para publicar en Vercel.

Cuando termines, ponte el sombrero de diseñador UX/UI senior y AUDITA tu trabajo:
jerarquía visual, contraste/accesibilidad, coherencia de marca, fricción del
formulario, velocidad, responsive iOS/Android y "una sola acción clara". Corrige
tú mismo todo lo que salga mal antes de entregar. Empieza haciéndome las 5 preguntas.
```

> **Checkpoint:** cuando la IA termine, deberías ver en tu pantalla un mensaje tipo "Listo: creé /captura y /gracias", un bloque de SQL para Supabase, y una lista de variables de entorno. Si ves eso, vas perfecto. Lo de publicar en internet viene en el Paso siguiente del kit.

---

## CRITERIOS DE ACEPTACIÓN (tu lista para revisar antes de seguir)

Pon una palomita mental en cada uno. Si algo falta, díselo a la IA con una frase ("Te faltó X, agrégalo"):

- [ ] La página `/captura` abre y se ve con tu **azul #2a22f5** (NO dorado ni coral).
- [ ] El **héroe** muestra tu promesa como titular grande y un botón "Quiero mi [regalo]".
- [ ] El formulario tiene **exactamente 3 campos**: Nombre, Correo, Teléfono.
- [ ] **Nombre** rechaza menos de 2 caracteres; **Correo** rechaza textos sin "@" y dominio; **Teléfono** exige 10 dígitos y los guarda como +52.
- [ ] Existe la **casilla de consentimiento** y el botón está **apagado** hasta marcarla.
- [ ] Al enviar bien, te lleva a `/gracias` con el botón de **WhatsApp**.
- [ ] El **pop-up de prueba social nace apagado** y, si lo enciendes, solo sale en escritorio.
- [ ] La página se ve perfecta en tu **celular** (sin barra horizontal, botón pegado abajo).
- [ ] La IA te entregó el **SQL de Supabase** y la **lista de variables de entorno**.
- [ ] En el código NO hay colores escritos a mano ni llaves/secretos pegados (solo tokens y variables de entorno).

---

## QUÉ NO HACER (errores que cuestan caro)

- **No** le pidas crear un proyecto nuevo. Es un módulo dentro de tu app del kit.
- **No** pegues tu llave secreta (`SUPABASE_SECRET_KEY`) dentro del chat ni dentro del código. Esa es la combinación de tu caja fuerte: vive solo en las variables de entorno.
- **No** agregues más campos al formulario "por si acaso". Cada campo extra te quita teléfonos. Tres y ya.
- **No** enciendas el pop-up de prueba social en móvil. Tapa el formulario y mata ventas.
- **No** aceptes que la IA deje cuadros grises en lugar de imágenes. Si no hay generador de imágenes, que use un degradado de marca, nunca placeholders.
- **No** quites la casilla de consentimiento para "ir más rápido". En México es la ley (LFPDPPP) y te protege.

---

## SI ALGO SALE MAL

1. **La IA empezó a programar sin hacerme las preguntas.**
   Escríbele: *"Detente. Primero hazme las 5 preguntas del contexto de mi negocio y espera mis respuestas."* Volverá al orden.

2. **El formulario acepta teléfonos malos (con menos de 10 dígitos o con letras).**
   Escríbele: *"El teléfono debe quedar en exactamente 10 dígitos de México y guardarse como +52. Valídalo también en el servidor, no solo en el navegador."*

3. **El botón de enviar se queda apagado aunque lleno todo.**
   Es la casilla de consentimiento: márcala. Si aun marcándola sigue apagado, dile a la IA: *"El botón debe activarse en cuanto los 3 campos sean válidos y la casilla de privacidad esté marcada. Revísalo."*

4. **Aparecieron cuadros grises o la página se ve sin estilo / con colores raros.**
   Escríbele: *"Usa mi azul de marca #2a22f5 como token, tipografías Montserrat e Inter, y reemplaza cualquier cuadro gris por un degradado de marca o una imagen generada. Nada de dorado ni coral."*

5. **Me salió un aviso de "MODO DEMO" o los leads no se guardan.**
   Es normal si todavía no conectas Supabase: significa que la app corre guardando en memoria (`cloudReady=false`) y no se pierde. Cuando hagas el paso de Supabase del kit y pongas la variable `SUPABASE_SECRET_KEY`, los leads empezarán a guardarse de verdad en tu libreta de clientes en la nube. Mientras tanto, sigue avanzando: la página ya funciona para verla y probarla.

---

> **Lo que sigue:** ya tienes tu aparador. En el siguiente prompt del kit le conectas tu libreta de clientes en la nube (Supabase) y lo publicas para que cualquiera en internet pueda dejarte sus datos. Tu tío de la taquería llegó hasta aquí solo. Tú también.
