# Guía Supabase — tu libreta de clientes en la nube

> Kit AI Cash Machine · Módulo 2 de la Certificación LEGENDAR·IA
> **Paso 4 de 6 · ~20 min · necesitas:** tu correo, una contraseña nueva que vas a inventar, y el archivo `.env.local` de tu kit abierto.

---

## Antes de tocar nada: ¿qué es Supabase y por qué lo necesitas?

Acuérdate de la libreta donde el dueño de la ferretería anotaba quién le debía y a quién había que llamarle. **Supabase es esa libreta, pero guardada en internet, con candado, y que nunca se pierde aunque se te caiga el celular al agua.**

Es **tu libreta de clientes en la nube.** Ahí van a vivir, ordenados y seguros, todos los leads que te deje tu página de captura. Tu kit la usa para guardar y leer clientes.

Una cosa importante para que duermas tranquilo: hay una puerta con llave en esa bodega. Se llama RLS (lo vemos abajo). **RLS = la puerta con llave de tu bodega:** por defecto, nadie ve nada hasta que tú das permiso. Tus clientes nunca quedan tirados a la vista de cualquiera.

> **Tranquilo si nunca has hecho esto.** Es como darte de alta en el banco por primera vez: la primera vez parece mucho, pero solo se hace una vez y después ya quedó. Mi tío de la taquería lo logró solo.

---

## ¿Pide tarjeta? ¿Cuánto cuesta?

- **¿Pide tarjeta para empezar?** **NO.** Te das de alta con tu correo o tu Google y ya.
- **Plan gratis:** te alcanza de sobra para arrancar y para tus primeros cientos (de hecho, miles) de clientes. Incluye base de datos, login y espacio guardado.
- **Costo aproximado si algún día creces:** el plan de paga ronda los **$500 MXN al mes** (25 dólares), pero **no lo vas a necesitar al principio.**
- **El miedo, calmado:** es como rentar un local. El plan gratis es como empezar con un puesto que no te cobra renta. Solo pagas cuando ya tienes tanta clientela que necesitas un local más grande. Ese día será buena señal.

---

## El mapa de lo que vas a hacer (4 acciones, una por pantalla)

1. Crear tu cuenta de Supabase.
2. Crear tu proyecto (tu bodega).
3. Pegar el código que arma los cajones de tu libreta (el SQL).
4. Copiar 3 llaves a tu archivo `.env.local`.

Hazlas en orden. Una por una. No te saltes ninguna.

---

# PARTE 1 — Crear tu cuenta de Supabase

### Pantalla 1 — Abre la página

En tu navegador, escribe **supabase.com** y entra.

> **Checkpoint:** si salió bien, deberías ver una página azul/verde con un botón grande que dice **"Start your project"** (Empieza tu proyecto).

[CAPTURA: el botón "Start your project" circulado en rojo — inserta aquí tu screenshot real]

---

### Pantalla 2 — Date de alta con tu correo o Google

Haz clic en **"Start your project"** y elige entrar **con tu cuenta de Google** (lo más fácil) o con tu correo y una contraseña.

> **Checkpoint:** si salió bien, deberías ver un tablero (dashboard) vacío que dice algo como "No projects yet" (Todavía no tienes proyectos). Eso es perfecto: vamos a crear el primero.

---

# PARTE 2 — Crear tu proyecto (tu bodega)

### Pantalla 3 — Dale a "New Project"

Haz clic en el botón verde **"New Project"** (Nuevo proyecto).

> **Checkpoint:** si salió bien, deberías ver un formulario que te pide ponerle nombre al proyecto y una contraseña.

[CAPTURA: el formulario de nuevo proyecto, campo "Name" circulado en rojo — inserta aquí tu screenshot real]

---

### Pantalla 4 — Ponle nombre a tu proyecto

En el campo **"Name"** (Nombre) escribe el nombre de tu negocio. Por ejemplo: `mi-negocio-crm`.

> **Checkpoint:** si salió bien, deberías ver tu nombre escrito en el campo. No uses acentos ni espacios raros; guiones está bien.

---

### Pantalla 5 — Inventa la contraseña de la base de datos

Te va a pedir una **"Database Password"** (contraseña de la base de datos). Inventa una **fuerte** (letras, números y un símbolo).

**Cópiala y guárdala en un lugar seguro AHORA MISMO** (en las notas de tu teléfono o un papel). La vas a necesitar solo si algún día corres migraciones; esta es la `SUPABASE_DB_PASSWORD`.

> **Variable de entorno = la combinación de tu caja fuerte.** Esta contraseña es una de esas combinaciones. Si la pierdes, recuperarla es un lío. Guárdala bien.

> **Checkpoint:** si salió bien, deberías ver puntitos •••• en el campo de contraseña y una palomita verde o la palabra "Strong" (fuerte).

---

### Pantalla 6 — Elige la región y crea

Deja la región que te sugiere (la más cercana a México suele ser **"East US"** o similar; cualquiera sirve). Haz clic en **"Create new project"** (Crear nuevo proyecto).

Ahora **espera 2 minutos** mientras se construye tu bodega. Es normal que tarde.

> **Checkpoint:** si salió bien, deberías ver una barra que se llena y luego tu proyecto ya abierto, con un menú a la izquierda. Tu bodega está lista.

[CAPTURA: el proyecto ya creado, con el menú lateral izquierdo visible — inserta aquí tu screenshot real]

---

# PARTE 3 — Armar los cajones de tu libreta (correr el SQL)

> **¿Qué es esto?** Tu libreta necesita cajones bien hechos: uno para los leads, uno para las notas, uno para los vendedores. El archivo `migrations/0001_init.sql` (viene dentro de tu kit) es la receta exacta que crea todos esos cajones y, además, **le pone la puerta con llave (RLS) a tu bodega.** Tú no escribes nada: solo copias y pegas.

---

### Pantalla 7 — Abre el "SQL Editor"

En el menú de la izquierda busca el icono **"SQL Editor"** (Editor SQL) y haz clic. Luego dale a **"New query"** (Nueva consulta).

> **Checkpoint:** si salió bien, deberías ver un recuadro grande en blanco donde se puede escribir. Es como una hoja de Word vacía, pero para instrucciones.

[CAPTURA: el SQL Editor abierto con la hoja en blanco — inserta aquí tu screenshot real]

---

### Pantalla 8 — Abre el archivo de la receta en tu kit

En la carpeta de tu kit, abre el archivo **`supabase/migrations/0001_init.sql`**. Ábrelo con tu editor (el mismo donde corres Claude Code) o con cualquier bloc de notas.

> **Checkpoint:** si salió bien, deberías ver un montón de texto que empieza con palabras como `create table`. No te asustes: no vas a entenderlo, y no tienes por qué. Solo lo vas a copiar.

> **Si no ves el archivo:** pídele a tu IA en Claude Code: *"Muéstrame el contenido de supabase/migrations/0001_init.sql para copiarlo."* Ella te lo deja listo.

---

### Pantalla 9 — Copia TODO y pégalo en Supabase

Selecciona **todo** el texto del archivo (Ctrl+A en Windows, Cmd+A en Mac), cópialo (Ctrl+C / Cmd+C), regresa a la hoja en blanco del SQL Editor de Supabase y pégalo ahí (Ctrl+V / Cmd+V).

> **Checkpoint:** si salió bien, deberías ver la hoja antes vacía ahora llena con ese texto.

---

### Pantalla 10 — Dale "Run" (Correr)

Haz clic en el botón verde **"Run"** (Correr), abajo a la derecha de la hoja.

> **Checkpoint:** si salió bien, deberías ver abajo un mensaje verde que dice **"Success. No rows returned"** (Éxito. Sin filas) o algo parecido en verde. **Verde = todo bien.** Si sale rojo, no pasó nada malo en tu negocio: copia el mensaje rojo, pégaselo a tu IA en Claude Code y dile *"me salió este error al correr el SQL"*, y te lo resuelve.

[CAPTURA: el mensaje verde "Success" debajo de la hoja — inserta aquí tu screenshot real]

> **Lo que acabas de lograr (sin darte cuenta):** ya tienes los cajones de tu libreta Y la puerta con llave puesta. **RLS está activo por defecto, todo cerrado:** nadie ve un solo cliente hasta que tu servidor abra con la llave correcta. Esto protege a tus clientes.

---

# PARTE 4 — Copiar tus 3 llaves al archivo `.env.local`

> Tu kit habla con tu bodega usando 3 llaves. Vamos a copiarlas una por una. Imagina que le das a tu app: la **dirección** del local, la **llave de la entrada** (para los visitantes) y la **llave maestra** (solo para ti, el dueño).

---

### Pantalla 11 — Abre la página de las llaves

En el menú de la izquierda, hasta abajo, haz clic en **"Project Settings"** (Configuración del proyecto) y luego en **"API"** o en **"API Keys"** (Llaves de API).

> **Checkpoint:** si salió bien, deberías ver una pantalla con una "Project URL" (una dirección web) y unas llaves largas tipo `eyJ...` o `sb_...`.

[CAPTURA: la pantalla de API con la Project URL y las llaves — inserta aquí tu screenshot real]

---

### Pantalla 12 — Copia la PRIMERA llave: la dirección (URL)

Busca **"Project URL"** (la dirección de tu proyecto). Cópiala con el botoncito de copiar que tiene al lado.

Pégala en tu archivo `.env.local`, en esta línea:

```
NEXT_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
```

> **Checkpoint:** si salió bien, después del `=` deberías ver tu dirección, empezando con `https://` y terminando en `.supabase.co`.

---

### Pantalla 13 — Copia la SEGUNDA llave: la pública (anon)

Busca la llave que dice **"anon" / "public" / "publishable"** (llave pública). Cópiala.

Pégala en tu archivo `.env.local`, en esta línea:

```
NEXT_PUBLIC_SUPABASE_ANON_KEY=pega-aqui-tu-llave-publica
```

> **Esta es la llave de la entrada.** Es segura de mostrarle al público (por eso lleva `NEXT_PUBLIC_`): solo deja pasar a recepción, no a la bodega. No abre los cajones de clientes.

> **Checkpoint:** si salió bien, deberías ver un código largo después del `=`.

---

### Pantalla 14 — Copia la TERCERA llave: la secreta (la llave maestra)

Busca la llave que dice **"service_role"** o **"secret"** (empieza con `sb_secret_...`). Cópiala.

Pégala en tu archivo `.env.local`, en esta línea:

```
SUPABASE_SECRET_KEY=pega-aqui-tu-llave-secreta
```

> **🔒 Esta es la llave maestra, y es SOLO para el servidor. Por qué importa tanto:**
> La llave secreta abre TODOS los cajones, saltándose la puerta con llave (RLS). Por eso **NUNCA** debe llegar al navegador del cliente. Fíjate que su línea NO lleva `NEXT_PUBLIC_` adelante: eso es a propósito. Lo que lleva `NEXT_PUBLIC_` cualquiera lo puede ver desde su teléfono; lo que no lo lleva, se queda escondido en tu servidor, como la llave maestra que guarda el dueño en su bolsa y nunca le presta a nadie.
>
> Tu kit usa esta llave solo del lado del servidor para leer y escribir tus leads de forma segura. **Nunca la pegues en un chat, ni en un correo, ni se la mandes a nadie.** Si alguna vez crees que se te salió, vuelve a la pantalla de API en Supabase y dale "Reset" para generar una nueva.

> **Checkpoint:** si salió bien, deberías ver las **3 líneas** llenas en tu `.env.local`: la URL, la pública y la secreta.

[CAPTURA: tu archivo .env.local con las 3 líneas llenas (tapa los códigos antes de compartir) — inserta aquí tu screenshot real]

---

### Pantalla 15 — Guarda el archivo

Guarda tu archivo `.env.local` (Ctrl+S / Cmd+S).

> **Checkpoint:** si salió bien, el nombre del archivo deja de tener el puntito o asterisco de "sin guardar". Listo.

---

## ¿Y si me salto la llave secreta? (modo demo)

Si por ahora dejas vacía la línea `SUPABASE_SECRET_KEY`, **no se rompe nada:** tu kit arranca en **MODO DEMO**, guardando los clientes solo en la memoria de tu computadora (se borran al cerrar). Sirve para practicar. Cuando pegues la llave secreta de verdad, tu kit pasa a **modo nube** (`cloudReady = true`) y empieza a guardar clientes de a deveras en tu libreta de Supabase.

> Mi recomendación: pega las 3 llaves desde ya. Así tus primeros leads de prueba ya quedan guardados para siempre.

---

## Mini checklist final (palomea con tus propios ojos)

- [ ] Mi proyecto de Supabase está creado y abierto.
- [ ] Guardé mi `SUPABASE_DB_PASSWORD` en un lugar seguro.
- [ ] Corrí el SQL de `0001_init.sql` y me salió **verde** ("Success").
- [ ] Mi `.env.local` tiene las **3 líneas** llenas: URL, pública y secreta.
- [ ] Guardé el archivo `.env.local`.
- [ ] Entendí que la llave secreta es SOLO del servidor y nunca se comparte.

> **Si todo está palomeado: ¡felicidades!** Ya tienes tu libreta de clientes en la nube, con candado, lista para recibir tu primer lead. Sigue con el siguiente paso del kit (publicar en **Vercel**), donde tu CRM sale del taller y abre al público.
