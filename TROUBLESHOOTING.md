# Si algo sale mal — Manual de calma del Kit AI Cash Machine

> **Respira. No rompiste nada.** Casi todo lo que pasa aquí es normal, le pasa a todos, y **todo se puede deshacer**. Tu app es como una receta: si un paso te sale raro, lo repites o lo borras y vuelves a empezar — la cocina sigue intacta. Esta guía está ordenada por lo que **ves en la pantalla** (el síntoma). Busca el tuyo, lee el *por qué* en cristiano, y sigue la solución paso por paso. Vara de medir: **mi tío de la taquería lo logra solo.**
>
> Recordatorio de analogías que usamos en todo el kit:
> **localhost** = tu cocina (solo tú la ves) · **Vercel** = el restaurante abierto al público · **dominio** = el letrero con tu nombre en la calle · **variable de entorno** = la combinación de tu caja fuerte · **Supabase** = tu libreta de clientes en la nube · **GitHub** = la fotocopiadora con historial · **RLS** = la puerta con llave de tu bodega.

---

## 1. "command not found: pnpm" (la computadora no conoce esa palabra)

**Síntoma:** Escribes algo y sale `pnpm: command not found` o `'pnpm' no se reconoce`.

**Por qué pasa (humano):** `pnpm` es el ayudante que arma tu app (junta todas las piezas). Tu computadora todavía no lo tiene instalado. Es como pedirle a alguien una herramienta que aún no compró: no es que esté roto, es que falta.

**Solución paso a paso:**
1. No escribas nada más todavía. Solo dile esto a Claude Code: *"No tengo pnpm instalado. Instálamelo de la forma más fácil para mi computadora."*
2. Deja que Claude lo instale por ti (él sabe el comando exacto para Mac o Windows).
3. **Checkpoint visual:** cuando termine, escribe `pnpm -v` y aprieta Enter. Si salió bien, deberías ver un número (ejemplo: `9.1.0`). Ese número es la prueba de que ya está instalado.

---

## 2. "Port 3000 is already in use" (la puerta de tu cocina ya está ocupada)

**Síntoma:** Sale `Port 3000 is already in use` o `EADDRINUSE`.

**Por qué pasa (humano):** Tu app abre la puerta número 3000 de tu cocina. Si ya tienes otra ventana corrida de antes (o la cerraste mal), esa puerta sigue ocupada. No es un error grave: es como llegar a tu cocina y encontrar que dejaste una olla en el fuego de ayer.

**Solución paso a paso:**
1. Lo más simple: cierra **todas** las ventanas negras (terminales) que tengas abiertas y vuelve a abrir solo una.
2. Si sigue ocupada, dile a Claude Code: *"El puerto 3000 está ocupado. Libéralo o ábreme la app en otro puerto."*
3. **Checkpoint visual:** cuando vuelva a encender, deberías ver un texto como `Local: http://localhost:3001`. Si el número cambió a 3001, perfecto — usa ese link en lugar de 3000.

---

## 3. Pantalla en blanco (abro localhost y no se ve nada)

**Síntoma:** Abres `http://localhost:3000` en Chrome y la página está **toda blanca**, sin botones ni textos.

**Por qué pasa (humano):** Casi siempre es uno de dos: la app **todavía se está prendiendo** (como un foco que tarda un segundo), o se quedó a medio cargar. No perdiste tu trabajo; solo no terminó de mostrarse.

**Solución paso a paso:**
1. Espera 10 segundos y **recarga** la página (aprieta el botón de recargar de Chrome, la flechita en círculo).
2. Si sigue blanca, mira la ventana negra donde encendiste la app. ¿Dice `Local: http://localhost:3000` y **ningún texto rojo**? Entonces solo recarga otra vez.
3. Si la ventana negra **sí** tiene texto rojo, ese es el verdadero problema — ve al punto 5 ("Failed to compile") de esta guía.
4. **Checkpoint visual:** si salió bien, deberías ver tu página de captura con su título y el espacio para nombre y teléfono.

---

## 4. La pantalla se ve "desnuda" (sin colores ni estilos)

**Síntoma:** Se ven los textos y botones, pero **todo amontonado**, sin el azul de la marca, letras de máquina de escribir, todo blanco y negro.

**Por qué pasa (humano):** Los estilos (los colores, las formas bonitas) se cargan aparte del contenido. A veces el navegador se queda con una versión vieja guardada, como cuando ves una foto borrosa porque tu teléfono no la actualizó.

**Solución paso a paso:**
1. Haz una **recarga forzada**: en Mac aprieta `Cmd` + `Shift` + `R`; en Windows `Ctrl` + `Shift` + `R`. (Esto le dice a Chrome "olvida lo viejo y trae todo de nuevo".)
2. Si sigue desnuda, dile a Claude Code: *"La página se ve sin estilos, sin los colores de la marca. Revísalo y arréglalo."*
3. **Checkpoint visual:** si salió bien, deberías ver el azul de marca (#2a22f5), los bordes tipo vidrio (Liquid Glass) y los iconos a color en su lugar.

---

## 5. "Failed to compile" (texto rojo al encender la app)

**Síntoma:** En la ventana negra sale `Failed to compile` o `Module not found` en letras rojas, y la página no abre.

**Por qué pasa (humano):** "Compilar" es cuando la app se arma sola antes de mostrarse. Si una pieza está mal puesta o falta, se detiene y te avisa en rojo. **Esto es bueno**: te está diciendo exactamente dónde tropezó, no se rompió en silencio.

**Solución paso a paso:**
1. **No te asustes con el texto rojo.** Selecciónalo con el mouse, cópialo.
2. Pégaselo a Claude Code con una frase sencilla: *"Me salió este error rojo al encender la app. Arréglalo, por favor:"* y pega el texto.
3. Deja que Claude lo lea y lo corrija. Él entiende ese idioma.
4. **Checkpoint visual:** cuando termine, el texto rojo desaparece y vuelves a ver `Local: http://localhost:3000` en verde o blanco. Recarga Chrome y tu página aparece.

---

## 6. Variables de entorno mal pegadas (la combinación de la caja fuerte quedó chueca)

**Síntoma:** La app abre pero **no guarda contactos**, o sale un error que menciona `SUPABASE_URL`, `undefined` o `missing environment variable`.

**Por qué pasa (humano):** Las **variables de entorno** son la combinación secreta de tu caja fuerte: le dicen a tu app dónde está tu libreta de clientes y cuál es su llave. Si pegaste un espacio de más, comillas que sobran, o una línea cortada, la combinación no abre. Es como marcar bien todos los números menos uno.

**Solución paso a paso:**
1. Abre el archivo llamado `.env.local` (es donde viven las combinaciones). Si no sabes dónde está, dile a Claude Code: *"Ábreme el archivo .env.local."*
2. Revisa que cada línea esté **completa, en una sola renglón, sin espacios al principio ni al final y sin comillas de más.** Los nombres deben ser **exactos**:
   - `NEXT_PUBLIC_SUPABASE_URL` — la dirección de tu libreta en la nube.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — la llave **pública** (es segura de mostrar, no te preocupes).
   - `SUPABASE_SECRET_KEY` — la llave **secreta** (empieza con `sb_secret_...`; esta NUNCA se enseña a nadie).
   - `ADMIN_CODE` — tu código de jefe para entrar al panel de administración.
3. Pega cada valor **completo**: a veces al copiar se corta. Vuelve a Supabase y cópialo entero de nuevo.
4. **Importante:** cada vez que cambias el `.env.local`, tienes que **apagar y volver a encender** la app para que tome la nueva combinación. Dile a Claude: *"Cambié las variables, apaga y vuelve a encender el proyecto."*
5. **Checkpoint visual:** si salió bien, registras un contacto de prueba y aparece en tu panel; ya no sale el error de `undefined`.

---

## 7. El build falla en Vercel (el restaurante no abre al publicar)

**Síntoma:** En Vercel sale `Build Failed` en rojo, o un texto largo de error, y tu app **no se publica**.

**Por qué pasa (humano):** Cuando publicas en Vercel, el restaurante intenta "armar el platillo" en su propia cocina, no en la tuya. Si en tu cocina (localhost) funcionaba pero olvidaste darle a Vercel las combinaciones de la caja fuerte (las variables de entorno), o quedó una pieza a medias, se frena al abrir. **Tu app local sigue intacta** — esto solo afecta la copia que vive en internet.

**Solución paso a paso:**
1. Primero confirma que **en tu cocina sí funciona**: enciende la app en localhost. Si ahí abre bien, el problema es de configuración en Vercel, no de tu app.
2. En Vercel, entra a tu proyecto → **Settings** (Configuración) → **Environment Variables** (Variables de entorno).
3. Asegúrate de haber pegado **las mismas combinaciones** que tienes en tu `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY` y `ADMIN_CODE`. Sin ellas, Vercel no sabe dónde está tu libreta.
4. Si las pegaste **después** del primer intento, hay que volver a publicar: entra a la pestaña **Deployments**, busca el último y aprieta los tres puntitos → **Redeploy** (Volver a publicar).
5. Si el error sigue, copia el texto rojo de Vercel y pégaselo a Claude Code: *"Vercel me dio este error al publicar, arréglalo:"*
6. **Checkpoint visual:** si salió bien, Vercel muestra **Ready** con palomita, sale confeti y un botón **Visit** (Visitar). Ese link ya abre tu app en internet.

[CAPTURA: la sección Environment Variables de Vercel con las 4 variables pegadas — inserta aquí tu screenshot real]

---

## 8. Los leads no aparecen — ¿modo demo o nube? (tu libreta está en blanco)

**Síntoma:** Registras un contacto de prueba, pero al volver a abrir la app o desde otra computadora **ya no está**. O ves un letrero que dice "Modo demo".

**Por qué pasa (humano):** Tu app tiene dos formas de guardar contactos:
- **Modo demo** (memoria): si **no** pusiste la llave secreta `SUPABASE_SECRET_KEY`, la app guarda los contactos solo "en la mente", de forma temporal. Sirve para probar, pero **se borran al recargar**. Es como anotar en una servilleta: funciona un rato, pero no es tu libreta de verdad.
- **Modo nube** (Supabase): cuando sí pones la llave secreta, los contactos se guardan en tu **libreta en la nube** y ahí se quedan para siempre, los veas desde donde los veas.

**Solución paso a paso:**
1. Decide qué quieres: si solo estás practicando, el modo demo está bien y no tienes que hacer nada.
2. Si quieres que **se guarden de verdad**, necesitas la llave secreta de Supabase. Sigue el tutorial de Supabase del kit para sacarla (empieza con `sb_secret_...`).
3. Pégala en tu `.env.local` con el nombre exacto `SUPABASE_SECRET_KEY` y, si vas a publicar, también en las variables de entorno de Vercel.
4. Apaga y enciende la app para que tome la llave.
5. **Checkpoint visual:** si salió bien, en algún lugar de tu app/panel deja de decir "Modo demo" (la señal interna `cloudReady` pasa a verdadero). Registras un contacto, recargas, y **sigue ahí**. Esa es la prueba de que ya guarda en la nube.

---

## 9. RLS te bloquea (la puerta de tu bodega no te deja pasar)

**Síntoma:** Sale un error tipo `new row violates row-level security policy`, `permission denied`, o el panel queda vacío aunque sí registraste contactos.

**Por qué pasa (humano):** **RLS** es la puerta con llave de tu bodega. Por seguridad, tu libreta de clientes está cerrada con llave **por defecto** (así nadie de fuera puede asomarse a los datos de tus contactos). Eso es a propósito y es bueno: protege la información de tus clientes. El detalle es que tu app tiene que entrar **con la llave secreta del servidor**, no con la pública. Si falta esa llave, ni tú mismo puedes abrir.

**Solución paso a paso:**
1. Confirma que pusiste `SUPABASE_SECRET_KEY` en tu `.env.local` (y en Vercel si ya publicaste). Esa es la llave que abre la bodega desde el servidor.
2. Si la llave está bien y aún te bloquea, deja que Claude revise las reglas: dile *"Me sale un error de RLS / permisos en Supabase. Revisa que las migraciones y políticas estén bien aplicadas."*
3. Si nunca corriste las migraciones (el plano de tu libreta), dile a Claude: *"Aplica las migraciones de Supabase."* Para eso a veces pide `SUPABASE_DB_PASSWORD`; tenla a la mano del tutorial de Supabase.
4. **Checkpoint visual:** si salió bien, registras un contacto y **aparece en tu panel** sin el error rojo de permisos. La puerta abre solo con tu llave secreta — justo lo que queremos.

---

## 10. El dominio no resuelve (el letrero todavía no aparece en la calle)

**Síntoma:** Compraste `tunegocio.com`, lo conectaste, pero al abrirlo sale `This site can't be reached`, `DNS_PROBE_FINISHED` o simplemente no carga.

**Por qué pasa (humano):** Cuando pones tu nombre nuevo en el directorio de internet (el DNS), ese aviso **tarda en repartirse por todo el mundo**. A esto se le llama **propagación**, y es totalmente normal: como cuando cambias de número de teléfono y tardan unos días en que todos lo tengan. **No te equivocaste**; solo hay que esperar.

**Solución paso a paso:**
1. Ten paciencia: puede tardar de unos minutos a unas horas (a veces hasta un día). Es lo normal.
2. Confirma que pegaste bien los dos datos que Vercel te dio, en el panel de donde compraste el dominio (GoDaddy, Hostinger o Namecheap):
   - Registro **A** con host `@` → `76.76.21.21`
   - Registro **CNAME** con host `www` → el valor exacto que **Vercel te muestre en TU pantalla** (a veces es uno único de tu proyecto; copia siempre el de tu pantalla, no el del manual).
3. Vuelve a Vercel, entra a tu proyecto → **Settings** → **Domains**, y aprieta **Refresh** (Actualizar).
4. **Checkpoint visual:** si salió bien, Vercel pone una **palomita verde** que dice **Valid Configuration**, y tu app abre con tu nombre y con el candadito de seguridad (HTTPS) automático.

[CAPTURA: el panel Domains de Vercel con la palomita verde "Valid Configuration" circulada en rojo — inserta aquí tu screenshot real]

---

## 11. El botón de WhatsApp no abre (el mensaje no se manda)

**Síntoma:** Aprietas el botón de WhatsApp en tu app y no pasa nada, o abre un chat con número equivocado.

**Por qué pasa (humano):** El botón de WhatsApp lleva tu número adentro. Si quedó vacío, con guiones, espacios, o sin la clave del país, WhatsApp no sabe a quién escribirle. Es como marcar un teléfono al que le faltan dígitos.

**Solución paso a paso:**
1. El número debe ir con **clave de país y sin espacios ni signos**. Para México: `52` + los 10 dígitos. Ejemplo correcto: `5213311234567` (sin `+`, sin guiones, sin espacios).
2. Dile a Claude Code: *"Pon mi número de WhatsApp en el botón. Es este: [tu número con clave de país]. Sin espacios ni guiones."*
3. Pruébalo tú primero desde tu propio teléfono antes de mandarle el link a un cliente.
4. **Checkpoint visual:** si salió bien, al apretar el botón se abre WhatsApp con **tu** número y un mensaje listo para enviar.

---

## 12. Admin dice "No autorizado" (el panel de jefe no te deja entrar)

**Síntoma:** Entras a la sección de administración y sale **"No autorizado"**, `401` o `403`.

**Por qué pasa (humano):** El panel de administración es tu oficina privada, cerrada con un código. Tu app revisa ese código en el **servidor** (la cabecera `x-admin-code`) antes de dejarte ver los contactos. Si el código que pusiste no coincide, o falta, te deja afuera — a propósito, para que nadie más entre.

**Solución paso a paso:**
1. Recuerda que hay **dos** códigos parecidos y hacen cosas distintas:
   - `ADMIN_CODE` (en el servidor) — **este es el de verdad**, el candado real. Tiene que coincidir.
   - `NEXT_PUBLIC_ADMIN_CODE` — este solo **muestra u oculta** el botón de admin en pantalla; **no es seguridad**. No te protege por sí solo.
2. Abre tu `.env.local` y confirma que `ADMIN_CODE` tiene el valor que tú elegiste, sin espacios de más.
3. Al entrar al panel, escribe **exactamente** ese mismo código (cuidado con mayúsculas y minúsculas).
4. Si lo cambiaste, apaga y enciende la app. Si ya publicaste, ponlo también en las variables de entorno de Vercel y vuelve a publicar.
5. **Checkpoint visual:** si salió bien, entra el panel y ves tu lista de contactos en lugar del letrero "No autorizado".

---

## 13. El micrófono del dictado no tiene permiso (no me escucha)

**Síntoma:** Aprietas el botón de dictar por voz y no pasa nada, o el navegador muestra un aviso de micrófono bloqueado.

**Por qué pasa (humano):** Por seguridad, Chrome **te pregunta** antes de dejar que cualquier página use tu micrófono. Si dijiste "Bloquear" sin querer, o nunca diste permiso, el dictado no puede oírte. No está roto: es Chrome cuidándote.

**Solución paso a paso:**
1. Mira la barra de dirección de Chrome (donde está el link). A la izquierda hay un **candadito** o un icono de ajustes; aprieta ahí.
2. Busca **Micrófono** y cámbialo a **Permitir**.
3. Recarga la página.
4. Un detalle importante: el micrófono solo funciona en `localhost` o en sitios con candadito (`https`). Tu app de Vercel ya tiene `https`, así que ahí funciona; en internet **no** funciona si la dirección empieza con `http://` pelón.
5. **Checkpoint visual:** si salió bien, al apretar dictar, Chrome muestra que el micrófono está activo y tus palabras aparecen escritas.

[CAPTURA: el menú de permisos de Chrome con "Micrófono — Permitir" circulado en rojo — inserta aquí tu screenshot real]

---

## 14. La app se cerró sola en la ventana negra (se apagó el fogón)

**Síntoma:** La ventana negra donde corría la app volvió a mostrar la línea de comandos normal, y `localhost:3000` ya no abre.

**Por qué pasa (humano):** La app vive mientras esa ventana esté encendida. Si cerraste la ventana, apretaste `Ctrl` + `C`, o tu computadora se durmió, el fogón se apagó. **No perdiste nada de tu trabajo** — solo hay que volver a prender.

**Solución paso a paso:**
1. Dile a Claude Code: *"Vuelve a encender el proyecto en local."*
2. Espera a que aparezca de nuevo `Local: http://localhost:3000`.
3. **Checkpoint visual:** recargas Chrome en `localhost:3000` y tu app vuelve a aparecer, con todo tu trabajo intacto.

---

## 15. "No me deja subir a GitHub" (la fotocopiadora pide identificarse)

**Síntoma:** Al subir tu código sale un error de `authentication`, `permission denied`, o te pide usuario y contraseña una y otra vez.

**Por qué pasa (humano):** **GitHub** es la fotocopiadora con historial: guarda cada versión de tu app por si quieres regresar a como estaba ayer. Para dejarte subir, primero tiene que saber que eres tú. Si tu cuenta no está conectada o tu correo sin verificar, te frena. Es como la copiadora que pide tu credencial antes de imprimir.

**Solución paso a paso:**
1. Confirma que ya tienes cuenta en **github.com** y que **verificaste tu correo** (revisa tu bandeja de entrada; sin ese clic, GitHub no te deja).
2. Deja que Claude Code maneje la conexión: dile *"Conéctame con GitHub y sube mi proyecto. Si necesito iniciar sesión, dime exactamente qué apretar."*
3. La forma más fácil para cero-tech: en lugar de pelear con la terminal, importa tu repo desde el **dashboard de Vercel** (Vercel se encarga de subir a GitHub y publicar en cada cambio).
4. **Checkpoint visual:** si salió bien, entras a github.com, ves tu repositorio con tus archivos adentro, y en Vercel aparece listo para importar.

---

## 16. Cambié algo y se ve peor — ¿cómo lo deshago? (regresar la receta a como estaba)

**Síntoma:** Le pediste un cambio a la IA, no te gustó cómo quedó, y quieres regresar.

**Por qué pasa (humano):** Probar y equivocarse es **parte normal** de construir. Lo bueno es que, gracias a GitHub (la fotocopiadora con historial), casi todo se puede regresar a una versión anterior. Nada es definitivo.

**Solución paso a paso:**
1. Lo más simple: dile a Claude Code en español qué querías y qué no te gustó: *"El último cambio no me gustó, el botón quedó muy chico. Regrésalo a como estaba y hazlo más grande en vez de eso."*
2. Si quieres volver completo a una versión anterior, dile: *"Regresa el proyecto a la última versión que sí funcionaba."* Claude usa el historial de GitHub para eso.
3. **Checkpoint visual:** si salió bien, recargas `localhost:3000` y tu app vuelve a verse como te gustaba. Tranquilo: mientras tengas tu historial, siempre hay un "deshacer".

---

## Cuando nada de esto encaja: la regla de oro

Si tu síntoma no está en esta lista, **no inventes ni borres cosas a la fuerza.** Haz esto:

1. **Copia el texto del error completo** (selecciónalo con el mouse y cópialo).
2. Pégaselo a Claude Code con una frase simple: *"Me salió este error y no sé qué es. Explícamelo en palabras sencillas y arréglalo, por favor:"* y pega el texto.
3. Dile **qué estabas haciendo** justo antes (ejemplo: "estaba publicando en Vercel" o "acababa de cambiar mis variables").

Claude entiende el idioma de los errores. Tú no tienes que entenderlo — solo copiar, pegar y contar qué pasó. **Recuerda: es como rentar un local; el plan gratis te alcanza para empezar, y todo se puede deshacer.** No rompiste nada.
