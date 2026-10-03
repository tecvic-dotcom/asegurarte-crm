# Tutorial 2 — Abre tu restaurante en internet con Vercel

> **Paso 2 de 6 · ~25 min · necesitas:** tu computadora, tu cuenta de GitHub ya creada (la del tutorial anterior), tu correo a la mano, y tus 4 datos de Supabase apuntados en un papelito (la URL y las llaves del Tutorial 3 si ya lo hiciste; si no, no pasa nada, aquí te digo qué hacer).

Hasta ahora tu Máquina de Ventas vivía **solo en tu computadora**. Eso es tu **cocina** (los técnicos le dicen `localhost`): tú cocinas y pruebas, pero nadie de la calle ve nada. Hoy abrimos el **restaurante en la avenida principal** para que cualquier cliente entre desde su teléfono. Ese restaurante se llama **Vercel**.

Se escribe **Vercel** y se dice **"ver-SEL"**. No es "Versel", no es "Brusel", no es una ciudad de Bélgica. Es **Vercel**. Cuando tu sobrino te oiga decirlo bien, se va a impresionar.

Mi tío de la taquería hizo esto solo, sin saber nada de computadoras. Tú también.

---

## Antes de empezar: ¿cuesta dinero? ¿piden tarjeta?

- **¿Piden tarjeta?** NO. Para empezar NO te piden ninguna tarjeta.
- **¿Hay plan gratis?** SÍ. Se llama plan **Hobby** (se dice "jóbi", quiere decir "pasatiempo"). Es gratis para siempre.
- **¿Qué alcanza el plan gratis?** Te alcanza de sobra para tu página de captura, tu CRM y tu admin, con tu sitio en internet las 24 horas. Para un negocio que está empezando, sobra.
- **¿Cuánto cuesta si algún día creces?** El plan de paga ronda los **$400 pesos mexicanos al mes** (unos 20 dólares). Pero eso es para más adelante; hoy NO lo necesitas.

> **Cálmate, esto es normal.** Es como rentar un local: el plan gratis es como un puesto que no te cobra renta mientras vendes poquito. Empieza gratis. El día que tu negocio crezca tanto que se quede chico, ya verás cómo te sobra para pagar la versión grande.

---

## Paso 1 de 6 — Crea tu cuenta en Vercel

**Qué vas a hacer (en simple):** firmar el contrato de tu local nuevo. Una sola vez en la vida.

1. Abre tu navegador (Chrome) y entra a **vercel.com**.
2. Aprieta el botón **Sign Up** (que quiere decir "Registrarse").

> **Checkpoint visual:** si salió bien, deberías ver una pantalla que te pregunta cómo quieres entrar, con un botón que dice **Continue with GitHub**.
>
> [CAPTURA: botón "Continue with GitHub" circulado en rojo — inserta aquí tu screenshot real]

---

## Paso 2 de 6 — Conecta tu GitHub con un clic

**Qué vas a hacer (en simple):** presentar a Vercel con GitHub para que se den la mano. **GitHub** es la fotocopiadora con historial donde tu código quedó guardado en el tutorial pasado. Vercel necesita verla para servir tu app.

1. Aprieta **Continue with GitHub** (Continuar con GitHub).
2. Si te pide tu correo y contraseña de GitHub, escríbelos. Es la misma cuenta del tutorial anterior.
3. Aparece una pantalla que pide permiso. Aprieta el botón verde **Authorize** (que quiere decir "Autorizar").

> **Checkpoint visual:** si salió bien, deberías aterrizar en tu **Dashboard** de Vercel: una pantalla casi vacía (tu escritorio de control) porque todavía no has publicado nada. Es normal que se vea solo.
>
> [CAPTURA: pantalla Dashboard de Vercel vacía — inserta aquí tu screenshot real]

---

## Paso 3 de 6 — Importa tu proyecto desde GitHub

**Qué vas a hacer (en simple):** traer tu app desde la fotocopiadora (GitHub) al restaurante (Vercel). A esto Vercel le llama **Import** (Importar).

1. Arriba a la derecha de tu Dashboard, aprieta el botón **Add New…** (Agregar nuevo).
2. En el menú que se abre, elige **Project** (Proyecto).

> **Checkpoint visual:** deberías ver una lista de tus carpetas de GitHub. Ahí está la de tu Máquina de Ventas.
>
> [CAPTURA: lista de repositorios de GitHub con tu proyecto circulado en rojo — inserta aquí tu screenshot real]

3. Junto al nombre de tu app, aprieta el botón **Import** (Importar).

> **Checkpoint visual:** si salió bien, Vercel abre una pantalla de configuración con un botón azul grande que dice **Deploy**. **No le piques todavía** — primero pegamos las llaves en el Paso 4.

---

## Paso 4 de 6 — Pega las llaves de tu caja fuerte (variables de entorno)

**Qué vas a hacer (en simple):** darle a tu restaurante la **combinación de tu caja fuerte** para que se conecte a tu libreta de clientes en la nube (Supabase). A estas combinaciones los técnicos les dicen **variables de entorno**. Suena feo; es solo "datos secretos que tu app necesita para funcionar".

> **Si AÚN no hiciste el Tutorial 3 de Supabase:** sáltate este paso por hoy, aprieta **Deploy** en el Paso 5, y tu app abrirá en **modo demostración** (funciona, pero los contactos se guardan solo en memoria y se borran al rato). Cuando termines Supabase, regresas aquí y pegas las llaves. Sin problema.

En esa misma pantalla de configuración busca la sección que dice **Environment Variables** (Variables de entorno). Ábrela. Vas a pegar estas, **una por una**. En cada una hay una casilla para el **nombre** (izquierda) y otra para el **valor** (derecha):

| Nombre (cópialo TAL CUAL) | Qué pegas en el valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | La dirección de tu Supabase (empieza con `https://`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | La llave pública de Supabase (es larga; es segura de compartir) |
| `SUPABASE_SECRET_KEY` | La llave SECRETA de Supabase (empieza con `sb_secret_`; esta NO se le enseña a nadie) |
| `ADMIN_CODE` | Una clave que tú inventes para entrar a tu panel de administrador (por ejemplo `mitaqueria2026`) |

1. En la casilla del **nombre**, escribe el primero: `NEXT_PUBLIC_SUPABASE_URL`.
2. En la casilla del **valor**, pega su dato (el que apuntaste en tu papelito de Supabase).
3. Aprieta **Add** (Agregar) para guardar esa fila.
4. Repite lo mismo, una por una, con las otras tres de la tabla.

> **Cuidado con los espacios:** al copiar y pegar, no dejes un espacio ni adelante ni atrás del valor. Un espacio de más y tu app no conecta. Pégalo limpio.

> **Checkpoint visual:** si salió bien, deberías ver las **4 filas** listadas, cada una con su nombre y su valor tapado con puntitos (•••••). Eso de los puntitos es bueno: significa que están guardadas como secreto.
>
> [CAPTURA: las 4 variables de entorno listadas con sus valores ocultos — inserta aquí tu screenshot real]

---

## Paso 5 de 6 — Aprieta Deploy y abre tu restaurante

**Qué vas a hacer (en simple):** publicar. **Deploy** (se dice "di-plóy") quiere decir "poner en vivo en internet". Es el momento de abrir las puertas.

1. Aprieta el botón azul grande que dice **Deploy** (Publicar).
2. Ahora **no toques nada**. Vercel se pone a trabajar: vas a ver textos corriendo y una barrita de progreso. Tarda entre **1 y 3 minutos**. Es normal, respira.

> **Checkpoint visual:** si salió bien, sale **confeti** en la pantalla y un mensaje de felicitación con un botón que dice **Visit** (Visitar). El confeti es la señal de que tu restaurante ya está abierto.
>
> [CAPTURA: pantalla de éxito con confeti y botón "Visit" circulado en rojo — inserta aquí tu screenshot real]

> **¿Salió un error en lugar de confeti?** Casi siempre es una llave del Paso 4 mal pegada (un espacio de más, o un nombre mal escrito). No te asustes: vuelve a la sección **Environment Variables**, revísalas con calma, corrige la que falle, y vuelve a publicar. Nadie se da cuenta de estos tropiezos; el cliente solo ve el sitio final.

---

## Paso 6 de 6 — Mira tu app en vivo y mándasela a alguien

**Qué vas a hacer (en simple):** sentarte en tu propio restaurante ya abierto, y comprobar que un cliente de verdad puede entrar.

1. Aprieta el botón **Visit** (Visitar).
2. Se abre tu Máquina de Ventas en una dirección gratis que se ve así: **`tu-app.vercel.app`**. ¡Esa es tu app, viva, en internet de verdad!
3. Copia esa dirección de la barra del navegador.
4. Mándala por WhatsApp a tu pareja, a un amigo o a un hijo, y pídele que la abra **desde su teléfono**.

> **Checkpoint visual:** si la otra persona ve tu página de captura en su celular y puede dejar su nombre y teléfono, **felicidades: estás en internet de verdad.** Eso ya no se borra: tu restaurante quedó abierto las 24 horas.
>
> [CAPTURA: tu app abierta en un teléfono mostrando la página de captura — inserta aquí tu screenshot real]

---

## Bonus: la magia automática de aquí en adelante

Esto es lo mejor y casi nadie te lo cuenta: ya conectaste GitHub (la fotocopiadora) con Vercel (el restaurante). **Eso significa que cada vez que cambies algo en tu app, Vercel lo publica solo.**

Tú le dictas a tu IA un cambio (por ejemplo: *"haz el botón más grande y azul"*), eso sube a GitHub, y Vercel lo detecta y **vuelve a publicar tu sitio en automático**. No tienes que repetir todos estos pasos nunca más. Solo cambias, y al ratito ya está en vivo.

> **Alternativa para curiosos:** existe otra forma de publicar escribiendo el comando `vercel` en la terminal. Funciona, pero es para gente que ya le agarró confianza a la computadora. Tú quédate con el método de GitHub + Vercel de este tutorial: es el más fácil y el que se actualiza solito.

---

## Mini-resumen para no perderte

1. **vercel.com** → **Sign Up** → **Continue with GitHub** → **Authorize**.
2. **Add New** → **Project** → **Import** (tu app).
3. Pega tus **4 llaves** en **Environment Variables** (una por una, sin espacios).
4. **Deploy** → espera el **confeti**.
5. **Visit** → copia el link `tu-app.vercel.app` → mándalo por WhatsApp.
6. De aquí en adelante, **cada cambio se publica solo**.

**Siguiente:** Tutorial 3 — tu libreta de clientes en la nube con Supabase (para que los contactos se guarden de verdad y no se borren).
