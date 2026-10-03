# 🟦 PASO 5 de 6 — GitHub: tu fotocopiadora con historial

> **Paso 5 de 6 · ~10 min · necesitas:** tu correo de siempre y una contraseña
> nueva que vas a inventar. **No** te pide tarjeta. Es gratis.
>
> **Esto es lo único que tienes que hacer tú:** abrir UNA cuenta. Todo lo demás
> (subir tu proyecto) se lo vas a **pedir a tu IA en español**. No vas a escribir
> ni una línea de código. Es un trámite tipo "abrir un correo nuevo".

---

## 🤖 SUPERPROMPT — pégaselo a tu IA cuando termines de crear tu cuenta

> Primero abre tu cuenta de GitHub siguiendo el tutorial de abajo (secciones 1 a
> 4). Cuando ya tengas cuenta, vuelve aquí, copia este bloque completo y pégalo en
> tu consola **Jarvis** (o en Claude Code, donde armaste tu proyecto). Luego dale
> Enter y deja que la IA haga el trabajo pesado.

```
Sube este proyecto a mi GitHub.

- Es la PRIMERA vez que uso GitHub. Guíame en lenguaje simple, una acción por vez.
- Crea un repositorio NUEVO y PRIVADO llamado: mi-pagina-de-ventas
- IMPORTANTE: NO subas el archivo .env.local ni ninguna llave secreta.
  Confirma que .gitignore ya está ignorando .env.local antes de subir nada.
- Cuando necesites que yo autorice la conexión, dímelo claro y dame el paso exacto.
- Al terminar, dame el LINK de mi repositorio. Ese es el que le daré a Vercel
  en el siguiente paso para publicar mi página en internet.
```

> **Por qué dice "privado":** tu repositorio es tu caja fuerte. Privado = solo tú
> (y Vercel, cuando lo conectes) lo ven. Tu lista de clientes y tus textos no
> quedan a la vista de todo internet.

---

## 1. ¿Qué es GitHub? (en cristiano)

Imagina la **fotocopiadora con historial** de tu oficina. Cada vez que cambias
una hoja de tu proyecto, ella saca una copia y la archiva **con fecha y hora**.
Mañana puedes ver qué cambiaste el martes, y si algo salió mal, regresas a la
versión de ayer sin perder nada. Eso es GitHub.

Se parece a Google Drive (guarda tus archivos en la nube), pero tiene un súper
poder que el Drive no tiene: **guarda CADA versión, para siempre, y puedes
regresar a cualquiera.**

| Lo que ya conoces | Su versión en GitHub |
|---|---|
| Google Drive (guardar archivos) | Guarda tu proyecto completo en la nube |
| El "historial de versiones" de un Word | Guarda cada cambio, con fecha, y puedes volver atrás |
| La fotocopiadora que archiva todo | Tu código vive seguro y respaldado, fuera de tu compu |

**¿Por qué te lo pide Vercel?** Vercel es el que va a poner tu página en internet
(eso es el Paso 6). Vercel no quiere archivos sueltos por correo: quiere
conectarse a tu fotocopiadora de GitHub y, cada vez que tú (o tu IA) actualicen
algo ahí, **Vercel republica tu página solito.**

> **GitHub guarda. Vercel publica. Tu IA hace el trabajo pesado.**

> 📸 **[CAPTURA: diagrama GitHub (caja fuerte) → Vercel (sitio en vivo) con una flecha entre los dos — inserta aquí tu screenshot real]**

---

## 2. Crear tu cuenta en github.com

**¿Pide tarjeta?** No. **¿Es gratis?** Sí, el plan gratis te alcanza de sobra para
todo este kit (repositorios privados ilimitados incluidos). **¿Cuánto cuesta?**
$0 MXN. Solo si algún día tienes un equipo grande pagarías planes de paga (~$80
MXN por persona al mes), y **no lo necesitas para nada de esto.**

> Tranquilo: es como abrir una cuenta de correo. No estás firmando ninguna deuda,
> no te van a cobrar, y puedes cerrarla cuando quieras.

### Pantalla 2.1 — Entra a la página
En tu navegador (Chrome, Safari, el que uses) escribe arriba **github.com** y dale
Enter.
**Si salió bien, deberías ver:** una página con un botón grande que dice **Sign up**
("Registrarse"). Dale clic.

> 📸 **[CAPTURA: github.com con el botón "Sign up" circulado en rojo — inserta aquí tu screenshot real]**

### Pantalla 2.2 — Escribe tu correo
Te pide tu **email** (tu correo de siempre, el que revisas a diario). Escríbelo y
dale **Continue** ("Continuar").
**Si salió bien, deberías ver:** que avanza y ahora te pide una contraseña.

### Pantalla 2.3 — Inventa tu contraseña
Crea una **contraseña** que no uses en otro lado. Mézclala con mayúsculas, números
y un símbolo. **Anótala donde la tengas segura.**

> Analogía: la contraseña es **la combinación de tu caja fuerte**. Que sea buena, y
> guárdala bien.

**Si salió bien, deberías ver:** una barrita verde que dice que tu contraseña es
fuerte.

### Pantalla 2.4 — Elige tu nombre de usuario
Te pide un **username** (nombre de usuario): es tu nombre público en GitHub, como
tu @ de Instagram. Usa el nombre de tu negocio o el tuyo, sin espacios.
Ejemplos: `tacoselgordo`, `estetica-marisol`, `juanperez-inmobiliaria`.
**Si salió bien, deberías ver:** una palomita verde a la derecha (significa que ese
nombre está libre). Si está ocupado, agrégale un número o tu ciudad.

> 📸 **[CAPTURA: el campo "Username" con una palomita verde de "disponible" — inserta aquí tu screenshot real]**

### Pantalla 2.5 — Demuestra que eres humano
Sale un mini juego (un rompecabezas: "gira la imagen hasta que el animal mire
derecho"). Resuélvelo. Es el guardia de la entrada confirmando que no eres un robot.
**Si salió bien, deberías ver:** una palomita y el botón para crear tu cuenta se
activa.

### Pantalla 2.6 — Confirma el código de tu correo
GitHub te manda un **código** a tu correo. Abre tu bandeja, copia ese número y
pégalo en GitHub.
**Si salió bien, deberías ver:** tu tablero de GitHub vacío. **¡Listo, ya tienes
cuenta!** Acabas de abrir tu fotocopiadora con historial.

> 📸 **[CAPTURA: el código de 6 dígitos en tu correo, circulado en rojo — inserta aquí tu screenshot real]**

---

## 3. ¿Qué es un "repositorio"?

Vas a oír mucho la palabra **repositorio** (o "repo"). Suena raro; es simplísimo:
un repositorio es **la carpeta de UN proyecto** dentro de tu GitHub.

Igual que en tu compu tienes una carpeta "Contabilidad 2026" y otra "Fotos del
local", en GitHub cada proyecto vive en su propia carpeta. A esa carpeta se le
dice repositorio. **Tu página = un repositorio.** Una carpeta por proyecto. Ya.

> Lo mejor: **tú no lo creas a mano.** Cuando le pidas a tu IA que suba tu proyecto
> (el superprompt de arriba), ella crea el repositorio por ti. Solo necesitabas
> entender la palabra para no asustarte cuando la veas.

---

## 4. Subir tu proyecto a GitHub (sin tocar comandos)

El secreto: **tú no subes nada. Se lo PIDES a tu IA.** Hay dos caminos. El A es el
recomendado y es el del superprompt de arriba.

### Camino A — Pídeselo a tu IA (recomendado, cero botones)

Pega el superprompt del inicio de este archivo en tu consola **Jarvis** (o en
Claude Code) y dale Enter. La IA empaqueta tu proyecto, crea el repositorio
privado y lo sube.

En algún momento puede aparecer una ventana pidiendo **autorizar la conexión**
(darle permiso a tu IA para entrar a tu GitHub). Cuando salga, dale **Authorize**
("Autorizar").

> Analogía: en vez de cargar tú las cajas al almacén, le firmas un poder a tu
> asistente y él las acomoda. Tú solo firmas el permiso de entrada.

**Si salió bien, deberías ver:** un mensaje de la IA con un **link** (una dirección
de internet) a tu repositorio. Ábrelo: ahí está tu proyecto, vivito, dentro de tu
GitHub. **Guarda ese link** — es el que Vercel te va a pedir en el Paso 6.

> 📸 **[CAPTURA: tu repositorio "mi-pagina-de-ventas" abierto en GitHub con sus archivos — inserta aquí tu screenshot real]**

### Camino B — Si prefieres botones: GitHub Desktop

Si quieres hacerlo tú mismo con botones (sin comandos), existe una app gratis y
amigable: **GitHub Desktop**. También es gratis y tampoco pide tarjeta.

| Acción | Qué haces (una sola cosa) | Analogía |
|---|---|---|
| 1 | Entra a **desktop.github.com** y descarga la app. Instálala como cualquier programa. | Bajar una app al teléfono |
| 2 | Ábrela y dale **Sign in** con la cuenta que acabas de crear. | Meter tu llave a tu casillero |
| 3 | Clic en **Add → Add Existing Repository** y elige la carpeta de tu proyecto. | Señalar qué cajón respaldar |
| 4 | Dale **Publish repository**, déjalo en **privado**, ponle `mi-pagina-de-ventas` y publica. | Mandar el cajón a la bóveda |
| 5 | Cuando cambies algo: escribe una nota corta (ej. "cambié los precios"), **Commit** y luego **Push**. | Anotar en la bitácora y guardar la versión |

> **Commit** = "guardar este momento con una nota". **Push** = "mándalo a la nube".
> Dos botones. Eso es todo.

> 📸 **[CAPTURA: GitHub Desktop con la nota y los botones "Commit" y "Push" circulados — inserta aquí tu screenshot real]**

---

## ⚡ GitHub en 6 pasos (versión para recordar)

1. **Entra a github.com** y dale **Sign up**.
2. **Escribe tu correo** y crea una **contraseña** fuerte (anótala).
3. **Elige tu usuario** (sirve el nombre de tu negocio) y resuelve el "no soy robot".
4. **Confirma el código** que llega a tu correo. → Ya tienes cuenta.
5. Pega el **superprompt** de este archivo en Jarvis: *"Sube este proyecto a mi GitHub"*. Autoriza cuando te lo pida.
6. **Guarda el link** que te da la IA. → Es el que le darás a **Vercel** para publicar tu página.

> No programaste. Solo pediste. Así se trabaja con IA.

---

## 🆘 SI ALGO SALE MAL (los tropiezos más comunes)

> Respira: es muy difícil que rompas algo. Si te trabas, pégale a la IA el mensaje
> rojo que viste y dile *"ayúdame con este error en lenguaje simple"*.

**1) Te pide usuario y contraseña a la mitad y se queda atorado (autenticación).**
   - *Qué pasó:* GitHub ya casi no acepta tu contraseña normal para subir desde la
     compu; pide un permiso especial (un "token") o que autorices desde el navegador.
   - *Solución:* deja que la IA lo maneje. Dile *"GitHub me pide autenticación, guíame
     paso a paso para autorizar desde el navegador"*. Cuando se abra la ventana de
     GitHub pidiendo permiso, dale **Authorize**. Si usas GitHub Desktop, este lío ni
     aparece: él te conecta solo al darle **Sign in**.

**2) Subiste al repositorio equivocado (o se llama distinto de lo que querías).**
   - *Qué pasó:* la IA creó el repo con otro nombre, o tienes dos repos y no sabes cuál
     darle a Vercel.
   - *Solución:* no borres nada con miedo. Dile a la IA *"muéstrame el link de TODOS mis
     repositorios y dime cuál es el de mi página de ventas"*. Para Vercel, usa el que
     tenga tus archivos (carpeta `app/`, `package.json`). Si de plano sobra uno vacío,
     pídele a la IA que lo elimine por ti; ella te confirma antes.

**3) ⚠️ Miedo número uno: ¿se subió mi llave secreta (.env.local)?**
   - *Qué pasó:* tu archivo `.env.local` guarda la **combinación de tu caja fuerte**
     (`SUPABASE_SECRET_KEY`, `ADMIN_CODE`). **Ese archivo NUNCA debe subir a GitHub.**
   - *Por qué casi seguro estás bien:* el kit ya trae un `.gitignore` (la lista de "esto
     NO se sube") que ignora `.env.local` por ti. Por eso el superprompt le pide a la IA
     confirmarlo **antes** de subir.
   - *Solución / revisión:* dile a la IA *"confírmame que .env.local NO se subió a GitHub
     y que .gitignore lo está ignorando"*. Si por accidente se subió, **dile de
     inmediato:** *"bórralo del historial de GitHub y ayúdame a rotar mis llaves de
     Supabase y mi ADMIN_CODE"*. Cambiar las llaves es como cambiar la chapa: lo viejo
     deja de servir y quedas seguro otra vez.

**4) "command not found: git" o la IA dice que no encuentra git.**
   - *Qué pasó:* tu compu todavía no tiene la herramienta base (git) que GitHub usa por
     debajo.
   - *Solución:* dile a la IA *"instálame git paso a paso para mi sistema"* y sigue el
     único comando que te dé. O usa el **Camino B (GitHub Desktop)**, que ya trae git
     adentro y te ahorra esto.

**5) El sitio te pide pagar o te asusta con un plan de paga.**
   - *Qué pasó:* GitHub te muestra sus planes Pro/Team en algún banner.
   - *Solución:* ignóralo. **Quédate en el plan gratis (Free).** Te alcanza de sobra para
     este kit, incluyendo repositorios **privados**. No metas tarjeta.

---

> **Cuando tengas el link de tu repositorio guardado, pasa al Paso 6 (`08-vercel.md`):
> ahí conectas este repositorio con Vercel y tu página queda publicada en internet,
> con tu nombre, lista para que la vea el mundo.** 🚀
