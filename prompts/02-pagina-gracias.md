# La página de GRACIAS: el apretón de manos que cierra el trato

**Paso 2 de 6 · ~10 min · necesitas:** tu app ya corriendo en tu cocina (localhost) con la página de captura del Paso 1 lista, y Claude Code abierto.

Cuando alguien deja su nombre, correo y teléfono en tu página de captura, **no puedes dejarlo en el aire**. Imagina que entra un cliente a tu taquería, te pide de comer, y tú te quedas callado mirándolo. Raro, ¿no? La página de gracias es ese momento en que lo miras a los ojos y le dices: *"listo, ya quedó, ahora pásale por aquí"*.

Esta página hace tres cosas, y solo tres:
1. **Confirma** que su registro entró bien (lo tranquiliza).
2. **Refuerza** que tomó una buena decisión (mata el arrepentimiento).
3. **Lo lleva al siguiente paso**: un botón grande a tu WhatsApp o a tu grupo.

Lo importante de este paso: ese enlace de WhatsApp **NO va escrito a fuego en el código**. Se guarda en tu libreta de clientes en la nube (Supabase), en una tabla llamada `ajustes`, y lo editas desde tu panel de admin cuando quieras. Hoy mandas a un número, mañana a un grupo, y nunca tienes que volver a tocar código. Como cambiar el letrero de la entrada sin tener que remodelar el local.

No vas a programar nada. Le hablas a tu IA en español, ella construye, tú revisas.

---

## 1. PROMPT MAESTRO (cópialo y pégalo completo en Claude Code)

```text
Eres mi equipo senior trabajando DENTRO de la app que ya tengo (mi sistema, NO un proyecto nuevo):
un copywriter de respuesta directa, un ingeniero front-end senior y un diseñador UX/UI senior.
Vamos a construir mi PÁGINA DE GRACIAS en la ruta /gracias. Ya existe /captura del paso anterior;
esto es la continuación natural de ese flujo. Reutiliza mi stack, mis estilos y mi marca. No inventes
stack nuevo, no crees apps sueltas.

================================================================
OBJETIVO DE /gracias
================================================================
Cuando alguien envía el formulario de /captura, lo redirijo a /gracias. Esta página debe:
1. CONFIRMAR el registro con un mensaje cálido y claro ("¡Listo, [Nombre]! Ya quedaste dentro").
2. REFORZAR la decisión (recordarle el regalo que va a recibir y por qué fue buena idea).
3. EXPLICAR el siguiente paso en una frase simple ("El último paso: únete por WhatsApp").
4. Mostrar un BOTÓN GRANDE a WhatsApp/grupo cuyo enlace se LEE de Supabase (ver más abajo).
5. REGISTRAR el avance del lead (que esta persona llegó a /gracias y si tocó WhatsApp).

================================================================
STACK Y REUTILIZACIÓN (OBLIGATORIO — no inventes nada nuevo)
================================================================
- Mismo proyecto Next.js 16 (App Router) + React 19 + TypeScript que ya tengo. Solo crea/edita /gracias.
- USA mis clases CSS ya implementadas en globals.css (las mismas de /captura), no escribas estilos
  desde cero:
    * glass / glass-strong / glass-highlight -> tarjetas y barras Liquid Glass
    * holo-text -> el dato o nombre gigante (texto holográfico)
    * scanbeam-once -> barrido de luz al cargar la página
    * anim-pulse-glow -> pulso en el botón principal de WhatsApp
    * anim-floaty -> flotación suave de algún ícono o ilustración
    * lift -> elevación al pasar el mouse sobre el botón
- Acento de marca por variable CSS --brand-2 (azul #2a22f5). CERO colores escritos a mano en el código;
  usa SIEMPRE las variables/tokens. PROHIBIDO usar dorado o coral (esos no son de esta marca).
- Tipografías: Montserrat para títulos, Inter para texto.
- Iconos a color profesionales vía Iconify (flat-color-icons:* y fluent-emoji-flat:*). Para WhatsApp
  usa un ícono de WhatsApp a color, no uno gris genérico.
- Framer Motion para la entrada suave de los elementos (que aparezcan de abajo hacia arriba).
- La página de /gracias debe verse IDÉNTICA en estilo a /captura: mismo fondo, mismas tarjetas glass,
  mismos acentos, misma tipografía. El visitante NO debe sentir que cambió de sitio. Consistencia total.

================================================================
EL ENLACE DE WHATSAPP SE LEE DE SUPABASE (NO LO ESCRIBAS EN EL CÓDIGO)
================================================================
Quiero poder cambiar mi WhatsApp desde el panel de admin sin tocar código. Por eso el enlace vive en
una tabla de configuración en Supabase llamada "ajustes", con formato clave/valor.

- Crea (si no existe) la tabla "ajustes" con columnas: clave (texto, única), valor (texto),
  actualizado_en (fecha/hora). Dame el SQL para crearla.
- Inserta estas filas iniciales por defecto:
    clave = 'whatsapp_url'        valor = '' (vacío; yo lo lleno desde admin)
    clave = 'whatsapp_texto'      valor = 'Únete a mi grupo de WhatsApp'
    clave = 'whatsapp_mensaje'    valor = 'Hola, acabo de registrarme y quiero mi regalo'
    clave = 'redirige_segundos'   valor = '0'   (0 = no redirige solo; el visitante toca el botón)
- La página /gracias LEE el valor de 'whatsapp_url' desde Supabase EN EL SERVIDOR (Server Component
  o route handler), nunca con la llave secreta expuesta al navegador. El cliente solo recibe el enlace
  final ya armado.
- Arma el enlace de WhatsApp así: si 'whatsapp_url' empieza con http (es un grupo), úsalo tal cual.
  Si es un número (ej. 5213312345678), conviértelo a https://wa.me/NUMERO?text=MENSAJE usando
  'whatsapp_mensaje' codificado para URL.
- Si 'whatsapp_url' está VACÍO (porque todavía no lo configuré), NO muestres un botón roto: muestra un
  aviso amable tipo "Tu equipo te contactará por WhatsApp en breve" y, en el panel admin, una alerta
  visible que diga "Falta configurar tu enlace de WhatsApp". Nunca dejes un botón que lleve a la nada.
- El botón de WhatsApp debe abrirse en una pestaña nueva (target=_blank, rel=noopener).

================================================================
REGISTRAR EL AVANCE DEL LEAD (medición del embudo)
================================================================
- Cuando alguien CARGA /gracias, registra el avance de ese lead a la etapa "llego_a_gracias"
  (actualiza su fila en la tabla leads, o registra un evento de embudo, según mi esquema actual).
- Cuando alguien TOCA el botón de WhatsApp, registra la etapa "fue_a_whatsapp" antes de abrir el enlace.
- Esto se hace contra el servidor con la llave secreta de Supabase (variable de entorno SUPABASE_SECRET_KEY),
  JAMÁS exponiendo la base de leads al navegador. El navegador solo dispara una llamada a mi propio
  endpoint; el endpoint guarda en Supabase.
- Si por cualquier razón no se puede registrar el avance (falla de red, modo demo sin llave), que la
  página NO se rompa: igual muestra el botón y deja pasar al visitante. Primero la experiencia del
  cliente, el registro es secundario.
- Recuerda mi MODO DEMO: si no hay SUPABASE_SECRET_KEY, la app corre en memoria con cloudReady=false.
  En ese caso lee 'whatsapp_url' de los ajustes en memoria y no truenes.

================================================================
ESTRUCTURA DE /gracias (en este orden, mobile-first)
================================================================
1. ENCABEZADO DE CONFIRMACIÓN: un ícono de palomita/celebración a color (anim-floaty) + título grande
   en Montserrat "¡Listo! Ya quedaste dentro" (si tengo el nombre del lead, personalízalo:
   "¡Listo, [Nombre]!"). Subtítulo de una línea confirmando qué va a recibir.
2. TARJETA glass con el REFUERZO: en 2-3 líneas, recuérdale el regalo y por qué tomó buena decisión.
   Tono humano, cercano, de tú a tú.
3. SIGUIENTE PASO en una sola frase clara: "Solo falta un paso: únete por WhatsApp para recibirlo."
4. BOTÓN PRINCIPAL grande a WhatsApp (anim-pulse-glow, lift, ícono de WhatsApp a color), con el texto
   leído de 'whatsapp_texto'. Área de toque mínima 48px, contraste alto.
5. MICROCOPY de confianza debajo del botón: "Sin spam. Tus datos están seguros."
6. (Opcional, si 'redirige_segundos' es mayor que 0) un texto chico tipo "Te llevamos a WhatsApp en
   N segundos..." con cuenta regresiva. Si es 0, no muestres nada de esto y deja que el visitante
   toque el botón él mismo.

================================================================
COPY (voz humana, NADA de robot)
================================================================
- Frases cortas, cálidas, de dueño de negocio a cliente.
- PROHIBIDO sonar a IA: nada de "desbloquea", "revoluciona", "potencia", "en la era de", "sumérgete".
- Beneficio antes que tecnicismo. Si aparece un término técnico, explícalo en lenguaje simple.
- En es-MX (español de México), trato de "tú".

================================================================
SEGURIDAD Y CALIDAD
================================================================
- La llave secreta de Supabase SOLO en el servidor (variable de entorno). Nunca en el navegador.
- Lee la tabla ajustes en el servidor; el cliente solo recibe el enlace ya armado.
- Misma estética glass/HUD que /captura: consistencia visual total.
- Responsive perfecto en iPhone (Safari) y Android (Chrome). Respeta el notch (safe-area). Sin scroll
  horizontal. Botón siempre cómodo de tocar.
- Al terminar, ponte el sombrero de diseñador UX/UI senior y AUDITA tu trabajo con una checklist (✅/⚠️):
  ¿se ve idéntica a /captura?, ¿el botón es lo más visible?, ¿el enlace se lee de Supabase y no está
  escrito en el código?, ¿se registra el avance del lead?, ¿se ve bien en móvil? Corrige lo que salga ⚠️.

================================================================
ENTREGA
================================================================
1. La página /gracias dentro de mi app actual, reutilizando mis clases CSS y mi marca azul.
2. El SQL para crear/poblar la tabla "ajustes" en Supabase (con las filas por defecto de arriba).
3. La forma en que el panel /admin edita esos ajustes (whatsapp_url, texto, mensaje, segundos) sin
   tocar código.
4. El reporte de tu auditoría UX/UI con su checklist.
Háblame siempre como a un dueño de negocio, no como a un programador.
```

---

## 2. Qué deberías ver cuando termine (tu checkpoint)

Cuando la IA acabe y guardes el archivo, abre en tu navegador **localhost:3000/gracias** (tu cocina, donde pruebas antes de abrir al público). Si salió bien, deberías ver:

- Un título grande de confirmación tipo "¡Listo! Ya quedaste dentro", con la misma pinta azul Liquid Glass de tu página de captura.
- Un botón verde de WhatsApp grande y pulsante.
- Que **se ve idéntica en estilo** a tu página de captura (mismo fondo, mismas tarjetas, mismo azul #2a22f5). Si parece "otra página", dile a la IA: *"la /gracias no se ve igual que /captura, hazla idéntica en estilo"*.

[CAPTURA: la página /gracias completa, con el botón de WhatsApp circulado en rojo — inserta aquí tu screenshot real]

Para probar el enlace de WhatsApp: entra a tu panel **/admin**, busca la sección de ajustes, pon tu número de WhatsApp (ejemplo: `5213312345678`) o tu link de grupo, guarda, y recarga /gracias. El botón ahora debe abrir tu WhatsApp real.

[CAPTURA: el campo de WhatsApp en /admin circulado en rojo, con tu número escrito — inserta aquí tu screenshot real]

---

## 3. SI ALGO SALE MAL

**"El botón de WhatsApp no lleva a ningún lado / dice 'tu equipo te contactará'."**
Es normal al principio: todavía no configuraste tu número. Entra a /admin, busca el ajuste `whatsapp_url`, escribe tu número (con código de país, sin signos: `5213312345678`) o tu link de grupo, guarda y recarga /gracias. El enlace vive en tu libreta de la nube (Supabase), por eso se cambia sin tocar código.

**"Puse mi número pero el botón sigue sin funcionar."**
Revisa que escribiste el número con el código de país y SIN espacios, guiones ni paréntesis. México empieza con `52` (y los celulares llevan `1` después: `521...`). Estados Unidos empieza con `1`. Si pusiste un grupo, el link debe empezar con `https://`.

**"La página de gracias se ve fea / diferente a la de captura."**
Pégale esto a la IA: *"la /gracias no está reutilizando mis clases CSS de globals.css ni mi marca; hazla con el mismo estilo glass y el azul #2a22f5 de /captura, que se vea idéntica."*

**"No veo dónde editar el WhatsApp en el admin."**
Dile a la IA: *"en /admin agrega una sección para editar los ajustes de la tabla ajustes (whatsapp_url, whatsapp_texto, whatsapp_mensaje, redirige_segundos) sin tocar código."*

**"Salió un error rojo que habla de Supabase o de 'secret key'."**
Tranquilo, es la combinación de tu caja fuerte que aún no pones. Mientras pruebas en tu cocina (localhost), la app puede correr en MODO DEMO (todo en memoria) sin la llave secreta. Si quieres guardar de verdad, revisa que tu archivo de variables de entorno tenga `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SECRET_KEY`. Eso lo configuras a fondo en un paso más adelante del kit; por ahora puedes seguir en modo demo.

**"No sé si se está registrando que la gente llegó a gracias."**
Entra a /admin y busca el embudo: debe mostrar el paso "llegó a gracias" y "fue a WhatsApp". Si no aparece, dile a la IA: *"asegúrate de que /gracias registre el avance del lead a 'llego_a_gracias' al cargar y a 'fue_a_whatsapp' al tocar el botón, contra el servidor con la llave secreta."*

> Recuerda: en tu cocina (localhost) nadie del público ve esto todavía. Cuando lo publiques en Vercel (tu restaurante abierto al público), repite la prueba del botón de WhatsApp ahí mismo, porque el restaurante de verdad debe funcionar igual que tu cocina.
