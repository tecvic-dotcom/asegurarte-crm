# Tutorial 04 — La fotocopiadora con historial (GitHub)

> **Paso 4 de 6 · ~15 min · necesitas:** tu correo, una contraseña nueva que vas a inventar, y un lugar seguro para guardarla (tu app de notas o un papel). Tu proyecto del kit ya armado en tu compu. Nada más.

---

## Qué vamos a lograr aquí (en una frase)

Vamos a crear **GitHub**, que es **la fotocopiadora con historial** de tu proyecto: el lugar en internet donde se guarda una copia completa de tu página, con una foto de cada cambio que hagas, fechada y guardada para siempre. Si algo se rompe mañana, puedes regresar a como estaba antes, sin perder nada.

Piénsalo así: en tu compu (tu cocina) está tu proyecto. GitHub es la **fotocopiadora con historial** que guarda una copia segura fuera de tu cocina y anota cada versión. Y lo más importante: es el puente para que **Vercel** (el restaurante abierto al público, lo vemos en el siguiente paso) saque tu página a internet.

> **GitHub guarda. Vercel publica. Tu IA hace el trabajo pesado.**

**Tranquilo con el costo:** GitHub tiene **plan gratis** y **NO te pide tarjeta** para empezar. El plan gratis te alcanza de sobra para tu página, tu CRM y muchos proyectos más. Es como rentar un local: el plan gratis es el local chiquito que te regalan para arrancar, y para lo que tú vas a hacer, te sobra. Si algún día creces un montón, el plan de paga ronda los **$4 USD al mes (unos $75 pesos)**, pero eso es problema de cuando ya estés facturando.

Cuando termines, vas a tener **un link** (una dirección de internet) con tu proyecto guardado. Ese link es justo el que Vercel te va a pedir en el siguiente tutorial. Eso es todo.

---

## La regla más importante de todo el kit (léela dos veces)

Tu proyecto tiene un archivo que se llama **`.env`** (o `.env.local`). Ahí adentro viven tus llaves secretas de Supabase: la combinación de tu caja fuerte.

**Ese archivo NUNCA se sube a GitHub. Jamás.**

> **Analogía:** subir tu proyecto a GitHub es como mandar las fotocopias de tu negocio a una bóveda compartida. Tus textos, tus imágenes, tu estructura: todo eso se copia, perfecto. Pero la combinación de tu caja fuerte **NO se fotocopia ni se manda**. Se queda solo en tu cocina.

La buena noticia: **ya lo dejamos resuelto por ti.** Tu kit trae un archivo guardián llamado `.gitignore` que le dice a GitHub: "el `.env` ni lo mires". Tú no tienes que hacer nada para esto; solo necesitas saber que está protegido y dormir tranquilo. Al final de este tutorial te enseño a confirmar con tus propios ojos que tu `.env` NO se subió.

---

## ¿Qué es un repositorio? (la palabra rara, en cristiano)

Vas a oír mucho la palabra **repositorio** (o "repo"). Suena técnica. Es simplísima.

Un repositorio es **la carpeta de UN proyecto** dentro de tu GitHub. Igual que en tu compu tienes una carpeta "Contabilidad 2026" y otra "Fotos del local", en GitHub cada proyecto vive en su propia carpeta. A esa carpeta se le dice repositorio.

> Tu página = un repositorio. Mañana otro proyecto = otro repositorio. Una carpeta por proyecto. Ya está. No te asustes cuando veas la palabra.

---

## Paso 1 — Crea tu cuenta en github.com

Es igual de fácil que abrir un Gmail. Sígueme.

1. Abre tu navegador (Chrome, Safari, el que uses) y entra a **github.com**.
2. Haz clic en el botón **"Sign up"** (significa "Registrarse").
3. Escribe tu **correo**, dale **Continue** (Continuar), e inventa una **contraseña fuerte**.

✅ **Si salió bien, deberías ver:** una pantalla pidiéndote tu correo y, después, tu contraseña.

> **Tip de contraseña:** junta dos palabras y un número, ejemplo `Tacos-Dorados-2026`. Cópiala y guárdala AHORA en tus notas. Es la combinación de tu caja fuerte.

> [CAPTURA: botón "Sign up" circulado en rojo en github.com — inserta aquí tu screenshot real]

---

## Paso 2 — Elige tu nombre de usuario

GitHub te pide un **username** (nombre de usuario). Es tu nombre público, como tu @ de Instagram.

1. Escribe un nombre sencillo, sin espacios y sin acentos. Usa el de tu negocio o el tuyo. Ejemplos: `tacoselguero`, `estetica-marisol`, `juanperez-inmobiliaria`.

✅ **Si salió bien, deberías ver:** una palomita verde indicando que el nombre está disponible.

> Si el nombre que quieres ya está ocupado, GitHub te avisa. Agrégale un número o tu ciudad, ejemplo `marisol-gdl`.

> [CAPTURA: campo "Username" con tu nombre y la palomita verde de "disponible" — inserta aquí tu screenshot real]

---

## Paso 3 — Confirma que eres humano y verifica tu correo

1. Te sale un mini juego (un rompecabezas: "gira la imagen hasta que el animal mire derecho"). Resuélvelo. Es solo para confirmar que no eres un robot.
2. GitHub te manda un **código** a tu correo. Abre tu bandeja de entrada, copia el número que llegó y pégalo en GitHub.

✅ **Si salió bien, deberías ver:** una pantalla de bienvenida o un tablero. Ya tienes cuenta. Acabas de instalar tu fotocopiadora con historial.

> Si no llega el código en un par de minutos, revisa la carpeta de spam o correo no deseado.

> [CAPTURA: campo del código de verificación de 6 dígitos circulado en rojo — inserta aquí tu screenshot real]

---

## Paso 4 — Sube tu proyecto a GitHub (elige UNA de las dos rutas)

Aquí está el secreto: tienes dos caminos para subir tu proyecto. **El más fácil es la Ruta A.** Lee las dos, elige una, y sáltate la otra.

### Ruta A — La fácil: con botones (GitHub Desktop) 👈 recomendada

GitHub Desktop es una app gratis y amigable para subir tu proyecto con clics, sin escribir ni un comando.

1. Entra a **desktop.github.com**, descarga la app e instálala como cualquier programa.

   ✅ **Si salió bien, deberías ver:** la app instalada y abierta en tu compu.

   > [CAPTURA: página desktop.github.com con el botón de descarga circulado en rojo — inserta aquí tu screenshot real]

2. Ábrela y haz clic en **"Sign in to GitHub.com"**. Entra con la cuenta que acabas de crear.

   ✅ **Si salió bien, deberías ver:** tu nombre de usuario arriba en la app.

3. Haz clic en **"Add"** → **"Add Existing Repository…"** (Agregar un repositorio existente) y elige la **carpeta de tu kit** en tu compu.

   ✅ **Si salió bien, deberías ver:** la lista de tus archivos del proyecto dentro de la app. (Fíjate: el `.env` NO aparece en la lista de cosas por subir. Eso es correcto y a propósito.)

   > [CAPTURA: ventana de GitHub Desktop con la lista de archivos; nota que el .env NO está — inserta aquí tu screenshot real]

4. Arriba aparece un botón azul **"Publish repository"** (Publicar repositorio). Dale clic, ponle de nombre `mi-pagina-de-ventas` y dale **"Publish repository"** de nuevo.

   ✅ **Si salió bien, deberías ver:** que la app termina de cargar y el botón cambia. Tu proyecto ya está en la nube.

   > [CAPTURA: botón azul "Publish repository" circulado en rojo — inserta aquí tu screenshot real]

> **De aquí en adelante:** cada vez que cambies algo, en la app escribes una notita corta (ej. "cambié los precios"), das **"Commit to main"** y luego **"Push origin"**. **Commit** = guardar este momento con una nota. **Push** = mandarlo a la nube. Dos botones. Eso es todo.

### Ruta B — Por terminal (solo si te late la consola)

Si prefieres la terminal (la ventana negra de comandos), aquí van los pasos. **Una línea por pantalla.** No los pegues todos juntos.

1. Abre la terminal **dentro de la carpeta de tu kit** y escribe esta línea, luego Enter:

   ```
   git init
   ```

   ✅ **Si salió bien, deberías ver:** un mensaje tipo "Initialized empty Git repository". Acabas de prender la fotocopiadora en tu carpeta.

2. Ahora esta línea, luego Enter:

   ```
   git add .
   ```

   ✅ **Si salió bien, deberías ver:** que no pasa nada visible (sin error). Tu `.gitignore` ya está bloqueando el `.env` automáticamente; no necesitas hacer nada extra para protegerlo.

3. Ahora esta, luego Enter (es tu primera "foto con nota"):

   ```
   git commit -m "primer commit de mi pagina"
   ```

   ✅ **Si salió bien, deberías ver:** una lista de archivos y, abajo, cuántos se guardaron. **Revisa que en esa lista NO aparezca `.env`.**

4. Entra a **github.com**, dale al botón **"New"** (Nuevo) o **"New repository"**, ponle de nombre `mi-pagina-de-ventas` y dale **"Create repository"**. GitHub te muestra unas líneas para conectar. Copia y pega esas dos líneas que empiezan con `git remote add origin` y `git push`, una a la vez, dándole Enter a cada una.

   ✅ **Si salió bien, deberías ver:** al recargar la página del repositorio en github.com, tus archivos ahí arriba.

> Si la terminal te pide usuario y contraseña y se complica, no sufras: cierra todo y usa la **Ruta A** (GitHub Desktop). Llegas al mismo lado, más tranquilo.

---

## Paso 5 — Confirma con tus ojos que el .env NO se subió (importantísimo)

Vamos a verificar, en 20 segundos, que tu llave secreta se quedó en casa.

1. Entra a **github.com** y abre tu repositorio `mi-pagina-de-ventas`.
2. Mira la lista de archivos que aparecen ahí.

✅ **Si salió bien, deberías ver:** tus archivos del proyecto (carpetas como `app`, `components`, archivos como `package.json`, `README.md`), pero **NO** un archivo llamado `.env` ni `.env.local`. Sí puedes ver uno llamado `.env.example` (ese es un ejemplo vacío, sin secretos, y está bien que se vea).

> **¿Ves tu `.env` o `.env.local` ahí?** Detente. No sigas a Vercel todavía. Bórralo del repositorio y avísale a tu IA: pégale "se me subió el .env a GitHub, ¿cómo lo quito?" y ella te guía. Además, por seguridad, conviene regenerar tus llaves de Supabase (en Supabase hay un botón para hacerlas nuevas). Mejor prevenir.

> [CAPTURA: lista de archivos en GitHub mostrando que NO está el .env, solo el .env.example — inserta aquí tu screenshot real]

---

## ✅ Checklist final (palomea antes de pasar al siguiente tutorial)

- [ ] Tengo cuenta en GitHub y entré sin problema.
- [ ] Subí mi proyecto a un repositorio llamado `mi-pagina-de-ventas` (con la Ruta A o la B).
- [ ] Confirmé con mis ojos en github.com que mi proyecto está ahí.
- [ ] Confirmé que el `.env` (mi llave secreta) **NO** se subió. Solo se ve el `.env.example`.
- [ ] Tengo a la mano el link de mi repositorio (la dirección que aparece arriba en el navegador).

Si palomeaste todo: **felicidades, tu fotocopiadora con historial ya está trabajando.** Tu tío el de la taquería lo logra solo, y tú también. En el siguiente paso vamos a llevar este repositorio a **Vercel** para publicar tu página en internet (de la cocina al restaurante abierto al público).

> **Guarda el link de tu repositorio a la mano.** En el siguiente tutorial Vercel te lo va a pedir, y vas a copiar-pegar nada más. Sin sustos.
