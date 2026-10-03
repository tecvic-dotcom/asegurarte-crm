# Tutorial 01 — Tu libreta de clientes en la nube (Supabase)

> **Paso 1 de 6 · ~15 min · necesitas:** tu correo, una contraseña nueva que vas a inventar, y un lugar seguro para guardarla (tu app de notas o un papel). Nada más.

---

## Qué vamos a lograr aquí (en una frase)

Vamos a crear **Supabase**, que es **tu libreta de clientes en la nube**: el lugar seguro, en internet, donde van a vivir todos los datos de la gente que llene tu página de captura. Sin esto, los nombres y WhatsApps de tus clientes no tienen dónde quedarse guardados.

Piénsalo así: tu página de captura es la **red que atrapa peces**. Supabase es la **cubeta donde caen ordenados, vivos y listos**. Hoy armamos la cubeta.

**Tranquilo con el costo:** Supabase tiene **plan gratis** y **NO te pide tarjeta** para empezar. El plan gratis te alcanza de sobra para tus primeros cientos de clientes. Es como rentar un local: el plan gratis es el local chiquito que te regalan para arrancar; cuando crezcas mucho, ya verás si pagas (ronda los **$25 USD al mes, unos $450 pesos**, pero eso es problema de cuando ya estés vendiendo).

Cuando termines, vas a tener **tres datos** copiados y guardados que la IA te va a pedir más adelante. Eso es todo.

---

## Paso 1 — Crea tu cuenta de Supabase

1. Abre tu navegador (Chrome, Safari, el que uses) y entra a **supabase.com**.
2. Arriba a la derecha, haz clic en el botón **"Start your project"** (Empieza tu proyecto).
3. Entra con tu cuenta de **Google** (lo más fácil) o con tu **correo y una contraseña**.

✅ **Si salió bien, deberías ver:** una pantalla oscura que dice "Welcome" o un tablero vacío que dice algo como "New project". Esa es la entrada a tu nueva libreta.

> [CAPTURA: botón "Start your project" circulado en rojo, arriba a la derecha — inserta aquí tu screenshot real]

---

## Paso 2 — Crea tu proyecto (tu libreta nueva)

Un "proyecto" en Supabase es simplemente **tu libreta**. Vamos a crear la tuya.

1. Haz clic en el botón verde **"New project"** (Nuevo proyecto).

✅ **Si salió bien, deberías ver:** un formulario con varios espacios para llenar. No te asustes, son poquitos.

> [CAPTURA: botón verde "New project" circulado en rojo — inserta aquí tu screenshot real]

---

## Paso 3 — Ponle nombre a tu libreta

1. En el espacio que dice **"Project name"** (Nombre del proyecto), escribe el nombre de tu negocio. Ejemplo: `tacos-el-guero` o `crm-mi-negocio`.

✅ **Si salió bien, deberías ver:** tu nombre escrito en el recuadro. No uses acentos ni espacios raros; guiones está bien.

> Esto es solo una etiqueta para que TÚ reconozcas tu libreta. Nadie más la ve.

---

## Paso 4 — Inventa la contraseña de tu libreta (la combinación de tu caja fuerte)

Supabase te va a pedir una contraseña para tu base de datos. Esta es **la combinación de tu caja fuerte**: con ella se abren tus datos. Tómatela en serio.

1. En el espacio **"Database Password"** (Contraseña de la base de datos), escribe una contraseña fuerte. Tip: junta dos palabras y un número, ejemplo `Tacos-Dorados-2026`.
2. **Cópiala y guárdala AHORA MISMO** en tus notas del celular o en un papel. Si la pierdes, recuperarla es un dolor de cabeza.

✅ **Si salió bien, deberías ver:** la contraseña escrita (a veces tapada con puntitos) y una barra que dice que es "fuerte" o "strong".

> [CAPTURA: campo "Database Password" con la contraseña tapada y la barra de seguridad en verde — inserta aquí tu screenshot real]

> ⚠️ Esta contraseña la guardas pero **NO** la vas a pegar todavía en ningún lado. Es solo para que tú la tengas a la mano. La IA te dirá si la necesita (solo se usa para casos especiales).

---

## Paso 5 — Elige el lugar (la región) y crea

1. En **"Region"** (Región), elige el país más cercano a ti. Si estás en México, busca **"East US (North Virginia)"** o el que diga estar más cerca; cualquiera funciona bien para empezar.
2. Haz clic en el botón verde de abajo **"Create new project"** (Crear nuevo proyecto).
3. **Espera 1 a 2 minutos sin cerrar la ventana.** Vas a ver una rueda girando: tu libreta se está construyendo en la nube.

✅ **Si salió bien, deberías ver:** un tablero con el nombre de tu proyecto arriba y menús a la izquierda. Ya tienes libreta. La parte difícil ya pasó.

> [CAPTURA: tablero del proyecto recién creado con el nombre arriba — inserta aquí tu screenshot real]

---

## Paso 6 — Prepara las "casillas" de tu libreta (correr el 0001_init.sql)

Tu libreta nació en blanco. Hay que dibujarle las columnas: dónde va el nombre, dónde el WhatsApp, dónde la etapa de cada cliente. En el kit ya te dejamos esas instrucciones listas en un archivo que se llama **`0001_init.sql`**. Tú solo lo copias y lo pegas; no escribes nada técnico.

> **¿Qué es esto?** Es como pegar la plantilla de una agenda ya rayada, con sus renglones y columnas, en vez de rayarla a mano. Una sola vez.

1. En el menú de la **izquierda**, busca y haz clic en el ícono **"SQL Editor"** (Editor SQL). Es como una hoja en blanco para pegar instrucciones.

   > [CAPTURA: ícono "SQL Editor" en el menú izquierdo circulado en rojo — inserta aquí tu screenshot real]

2. Abre el archivo del kit **`0001_init.sql`** (está en la carpeta de tu kit, dentro de `supabase/migrations/`). Ábrelo con cualquier editor de texto, selecciona **TODO** (Ctrl+A en Windows / Cmd+A en Mac) y cópialo (Ctrl+C / Cmd+C).

3. Regresa a Supabase y **pega** todo ese texto (Ctrl+V / Cmd+V) en la hoja en blanco del SQL Editor.

   ✅ **Si salió bien, deberías ver:** la hoja llena de texto de colores. No tienes que entenderlo; solo que esté pegado completo.

4. Haz clic en el botón verde **"Run"** (Correr / Ejecutar), abajo a la derecha.

   > [CAPTURA: botón verde "Run" del SQL Editor circulado en rojo, abajo a la derecha — inserta aquí tu screenshot real]

✅ **Si salió bien, deberías ver:** abajo un mensaje verde que dice **"Success. No rows returned"** (Éxito. Sin filas devueltas). Eso es perfecto: significa que tus casillas quedaron creadas.

> **¿Salió un mensaje rojo?** Tranquilo, no rompiste nada. Casi siempre es porque faltó copiar un pedacito. Borra todo, vuelve a copiar el archivo COMPLETO desde el principio, pégalo de nuevo y dale Run otra vez. Si sigue, copia el mensaje rojo y pégaselo a tu IA: ella te dice qué pasó.

---

## Paso 7 — Copia tus dos llaves (la combinación que conecta todo)

Ya tienes la libreta y sus casillas. Falta sacar **dos llaves**: son los códigos que le dan permiso a tu app de hablar con tu libreta. Sin ellas, tu página de captura y tu CRM no saben dónde guardar los clientes.

> **Analogía:** la primera llave es la **dirección** de tu libreta (dónde está). La segunda es la **llave pública** que abre solo la puerta de entrada, sin dar acceso a la bodega. Hay una tercera llave secreta (la de la bodega) que veremos en su momento; esa NUNCA se enseña.

1. En el menú izquierdo, hasta abajo, haz clic en **"Project Settings"** (Ajustes del proyecto), el íconito de engrane.
2. Dentro, haz clic en **"API"** o **"API Keys"**.

   > [CAPTURA: sección "API" dentro de Project Settings circulada en rojo — inserta aquí tu screenshot real]

3. Vas a ver tres datos. Copia estos **dos** y guárdalos en tus notas, cada uno con su etiqueta para no confundirlos:

   - **Project URL** (una dirección que empieza con `https://`) → guárdala como
     `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** / **publishable key** (un código largo) → guárdala como
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   ✅ **Si salió bien, deberías tener:** dos textos copiados en tus notas, cada uno con su nombre. Estos dos **SÍ** son seguros de usar en tu app; no son secretos peligrosos.

4. Más abajo, en esa misma pantalla, vas a ver una llave marcada como **"secret"** (`service_role` o `sb_secret_...`). **NO la copies todavía y NUNCA la pegues en un chat ni se la mandes a nadie.** Es la llave de tu bodega: solo el servidor la toca. La usaremos en otro paso.

   > ⚠️ Regla de oro: las dos primeras (URL y anon) son públicas y seguras. La "secret" es privada. Si alguna vez se te escapa la secret, en esta misma pantalla hay un botón para regenerarla (hacerla nueva).

---

## ✅ Checklist final (palomea antes de pasar al siguiente tutorial)

- [ ] Tengo cuenta en Supabase y entré sin problema.
- [ ] Creé mi proyecto (mi libreta) y aparece su tablero.
- [ ] Guardé la **contraseña de la base de datos** en un lugar seguro.
- [ ] Corrí el `0001_init.sql` y salió el mensaje verde de "Success".
- [ ] Copié y guardé mis dos llaves: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Identifiqué la llave "secret" y entendí que esa **no se enseña**.

Si palomeaste todo: **felicidades, tu libreta de clientes en la nube ya existe.** Tu tío el de la taquería lo logra solo, y tú también. En el siguiente paso vamos a publicar tu app en internet (en Vercel) y a pegarle estas llaves para que todo se conecte.

> **Guarda tus tres datos a la mano.** En los siguientes tutoriales la IA te los va a pedir, y vas a copiar-pegar nada más. Sin sustos.
