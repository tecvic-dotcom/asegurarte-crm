# 03 · Conecta tu libreta de clientes en la nube (Supabase)

> Paso 3 de 6 · ~25 min · necesitas: tu proyecto ya abierto en Claude Code, un correo para crear cuenta, y 10 minutos de paciencia.

Hasta aquí tu app corre en tu **cocina** (localhost): solo tú la ves. Y ahora mismo guarda los clientes "en el aire" (modo demo): si cierras todo, se borran. En este paso le vamos a poner a tu app una **libreta de clientes en la nube** que se llama **Supabase**, para que cada lead quede guardado de verdad, ordenado y a salvo.

**Analogía:** Supabase es tu libreta de clientes en la nube. Es como esa libreta donde tu tío de la taquería apunta quién le debe y a quién hay que llamarle el jueves, pero guardada en un cajón con candado en internet, que nunca se pierde y a la que solo entra quien tú dejas entrar.

Tu tío de la taquería puede hacer esto solo. Tú también. Vamos despacio, una acción por pantalla.

---

## Antes de pegar nada: ¿pide tarjeta? ¿cuánto cuesta?

- **¿Pide tarjeta para empezar?** No. Te registras solo con correo (o con tu Google). Cero tarjeta.
- **Plan gratis:** te alcanza para arrancar de sobra: 500 MB de espacio y 50,000 usuarios. Para tus primeros cientos o miles de clientes, ni te le acercas al límite.
- **Costo si algún día creces:** el plan de paga ronda los **$25 USD al mes** (unos **$450 MXN**), pero eso es mucho más adelante. Hoy: **$0**.
- **Calma:** es como rentar un local. El plan gratis es tu local chiquito para empezar a vender; cuando ya tengas mucha clientela, te cambias a uno más grande. Nadie te cobra por entrar.

---

## La regla de oro de la seguridad (léela una vez, te ahorra sustos)

Tu app va a tener **dos llaves**, como un negocio tiene dos tipos de llave:

- **La llave pública** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`): es como la llave de la puerta de entrada del local. Está bien que la vean los clientes; sola no abre la bodega. **Es segura de exponer.**
- **La llave secreta** (`SUPABASE_SECRET_KEY`): es la combinación de la caja fuerte. **JAMÁS la pega el navegador, JAMÁS la subes a internet, JAMÁS se la mandas a nadie.** Solo vive en el servidor (la trastienda donde el cliente no entra).

**Frontera servidor/cliente, en cristiano:**
- El **navegador del visitante** (el cliente) solo usa la **llave pública**. Nunca toca la base de leads directo.
- El **servidor** (la trastienda) usa la **llave secreta** para entrar a la libreta completa.
- Tu lista de clientes **nunca** se la enseñamos al navegador. Esa es la regla "PII primero": los datos de tus clientes están bajo llave.

Si la llave secreta **no** está puesta, tu app sigue funcionando pero en **MODO DEMO** (los datos viven solo en memoria y se borran al reiniciar). Con la llave secreta puesta, entra en **MODO NUBE** y todo se guarda de verdad.

---

## Paso 1 de 6 — Crea tu cuenta de Supabase

1. Abre tu navegador y entra a **supabase.com**.
2. Da clic en **"Start your project"** y regístrate con tu correo o con tu Google.

> Checkpoint visual: si salió bien, deberías ver un tablero (dashboard) verde oscuro que dice arriba **"Welcome"** o **"Your Projects"**.
>
> [CAPTURA: el botón verde "New project" circulado en rojo — inserta aquí tu screenshot real]

---

## Paso 2 de 6 — Crea tu proyecto

1. Da clic en **"New project"** (Nuevo proyecto).
2. Ponle de nombre el de tu negocio (ejemplo: `mi-negocio-crm`).
3. En **"Database Password"** inventa una contraseña fuerte y **guárdala en un lugar seguro** (notas del teléfono, gestor de contraseñas). Esa es tu `SUPABASE_DB_PASSWORD`; solo se usa una vez, para crear las tablas.
4. Da clic en **"Create new project"** y espera ~2 minutos a que termine de prepararse.

> Checkpoint visual: si salió bien, deberías ver tu proyecto con una palomita verde y la palabra **"Active"** (Activo) junto al nombre.
>
> [CAPTURA: estado "Active" del proyecto circulado en rojo — inserta aquí tu screenshot real]

---

## Paso 3 de 6 — Copia tus tres datos (la dirección y las dos llaves)

1. Dentro de tu proyecto, ve al menú de la izquierda: **Settings (engrane) → API Keys**.
2. Vas a copiar **tres cosas** (cópialas a un bloc de notas por ahora, las pegamos en el Paso 5):
   - **Project URL** → es la dirección de tu libreta. Va en `NEXT_PUBLIC_SUPABASE_URL`.
   - **anon public** (llave pública) → la de la puerta de entrada. Va en `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - **service_role** o **secret** (empieza con `sb_secret_...`) → la combinación de la caja fuerte. Va en `SUPABASE_SECRET_KEY`.

> Checkpoint visual: deberías tener tres textos largos copiados. La dirección empieza con `https://` y termina en `.supabase.co`. Las llaves son códigos largos.
>
> [CAPTURA: las tres filas (URL, anon, secret) circuladas en rojo — inserta aquí tu screenshot real]

> Tip de seguridad: la fila **service_role / secret** suele venir tapada con puntitos y un botón "Reveal". No le tomes screenshot a esa llave ni la pegues en ningún chat.

---

## Paso 4 de 6 — Pega ESTE superprompt en Claude Code

Copia TODO el bloque de abajo y pégalo en Claude Code (dentro de tu proyecto JARVIS). Es la instrucción para que la IA prepare tu libreta y deje todo conectado. No tienes que entenderlo: solo pégalo y dale enter.

```text
Eres mi arquitecto de software senior. Yo NO sé programar. Háblame en español
simple y, cuando necesites que yo haga algo (copiar una llave, dar un clic),
DETENTE y dame pasos numerados a prueba de tontos. Trabaja dentro de mi proyecto
JARVIS actual; NO crees un proyecto nuevo. Stack: Next.js 16 (App Router) +
React 19 + TypeScript + Tailwind v4 + @supabase/supabase-js. NO uso Zod
(validación manual). Comenta todo el código en español sencillo.

TAREA: dejar conectada mi base de datos Supabase (mi "libreta de clientes en la
nube"), con la migración corrida y la seguridad activada. Hazlo en este orden y
DETENTE a confirmarme al final de cada bloque:

1) ARCHIVO DE LLAVES (.env.local)
   - Crea (o actualiza) el archivo .env.local en la raíz con EXACTAMENTE estas
     variables, cada una con un comentario en español de para qué sirve:
       NEXT_PUBLIC_SUPABASE_URL=        # dirección de mi libreta (público)
       NEXT_PUBLIC_SUPABASE_ANON_KEY=   # llave pública, segura de exponer
       SUPABASE_SECRET_KEY=             # llave secreta sb_secret_... SOLO servidor
       SUPABASE_DB_PASSWORD=            # contraseña de la base, solo migraciones
       ADMIN_CODE=                      # código que valida la cabecera x-admin-code (servidor)
       NEXT_PUBLIC_ADMIN_CODE=          # solo desbloquea la UI del admin, NO es seguridad
   - Deja los valores VACÍOS y DETENTE: dime con pasos numerados dónde saco cada
     uno en Supabase (Settings → API Keys) y dime qué pegar en cada renglón.
   - Asegúrate de que .env.local esté en .gitignore (que NUNCA se suba a internet).

2) MIGRACIÓN (crear las tablas con seguridad)
   - Genera UN solo bloque de SQL que cree estas 4 tablas:
       * leads      (id, nombre, whatsapp, correo, etapa, fuente, utm_source,
                     utm_medium, utm_campaign, vendedor_asignado, valor_estimado,
                     fecha_entrada, creado_en)
       * ajustes    (etapas del pipeline, fuentes y campos editables sin tocar código)
       * usuarios   (perfil de cada persona del equipo: nombre, correo, rol)
       * actividad  (historial: notas con fecha/hora, cambios de etapa, quién hizo qué)
   - Activa Row Level Security (RLS) en TODAS y déjalas DENY-BY-DEFAULT: si no
     hay una regla que permita, NADIE ve nada. (RLS = la puerta con llave de mi
     bodega; cerrada por defecto.)
   - Reglas RLS: el cliente con la llave PÚBLICA solo puede INSERTAR un lead nuevo
     (para que mi página de captura funcione); NO puede leer la lista de leads.
     La lectura completa de leads es SOLO desde el servidor con la llave secreta.
   - Dame el bloque SQL listo para pegar y dime EXACTAMENTE dónde: Supabase →
     SQL Editor → New query → pegar → botón "Run". Pasos numerados.

3) FRONTERA SERVIDOR / CLIENTE (que no se filtre nada)
   - Crea un cliente de servidor que use SUPABASE_SECRET_KEY (solo en código de
     servidor: route handlers / server actions). NUNCA importes la llave secreta
     en componentes de cliente.
   - Crea un cliente de navegador que use SOLO NEXT_PUBLIC_SUPABASE_ANON_KEY.
   - Si SUPABASE_SECRET_KEY falta, la app debe correr en MODO DEMO (datos en
     memoria) y marcar cloudReady=false; si está, MODO NUBE y cloudReady=true.

4) VERIFICACIÓN DE CONEXIÓN
   - Crea una pequeña pantalla o endpoint de salud que me diga en español claro:
     "MODO NUBE ✅ (conectado a Supabase)" o "MODO DEMO ⚠️ (sin llave secreta,
     los datos no se guardan)". Que muestre el estado, NUNCA el valor de la llave.

REGLAS:
- Nunca imprimas, registres ni muestres el valor de SUPABASE_SECRET_KEY ni de
  ninguna llave en pantalla, logs o mensajes de error.
- Todo texto que yo vea va en español y con letra grande.
- Si algo me toca a mí, DETENTE y espera a que te diga "listo".

Empieza por el bloque 1 y confírmame cada paso.
```

> Checkpoint visual: si salió bien, la IA te va a responder en español pidiéndote que copies tus tres datos de Supabase. No avanza sola: te va a esperar.

---

## Paso 5 de 6 — Pega tus llaves donde la IA te diga

1. La IA va a abrir (o crear) el archivo de llaves, que se llama `.env.local`. Piénsalo como la **combinación de tu caja fuerte**: vive en tu compu, nunca se sube a internet.
2. Pega cada dato en su renglón, tal cual lo copiaste en el Paso 3:
   - `NEXT_PUBLIC_SUPABASE_URL=` la dirección (`https://...supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=` la llave pública
   - `SUPABASE_SECRET_KEY=` la llave secreta (`sb_secret_...`)
3. Para `ADMIN_CODE` y `NEXT_PUBLIC_ADMIN_CODE` inventa un código tuyo (ejemplo: `mi-negocio-2026`) y ponlo en los dos. Ese es el código que desbloquea tu pantalla de admin.
4. Guarda el archivo (Ctrl+S / Cmd+S).

> Checkpoint visual: si salió bien, los seis renglones tienen algo después del `=` y ninguno quedó vacío. La línea de la llave secreta empieza con `sb_secret_`.

---

## Paso 6 de 6 — Corre la migración y verifica la conexión

1. Pídele a la IA: **"corre la migración"**. Te va a dar un bloque de SQL.
2. Cópialo y pégalo en Supabase: menú izquierdo **SQL Editor → New query**, pega, y da clic en **"Run"** (el botón verde).
3. Regresa a tu app y pídele a la IA: **"verifica la conexión"**.

> Checkpoint visual: si salió bien, deberías ver el letrero **"MODO NUBE ✅ (conectado a Supabase)"**. Si dice **"MODO DEMO ⚠️"**, te falta pegar la llave secreta (ve a "SI ALGO SALE MAL" abajo).
>
> [CAPTURA: el letrero "MODO NUBE ✅" circulado en rojo — inserta aquí tu screenshot real]

---

## Cómo sé que quedó bien (criterios de aceptación)

Tienes el paso completo cuando puedes decir "sí" a todo esto:

- [ ] Tengo una cuenta y un proyecto de Supabase en estado **"Active"**.
- [ ] En el SQL Editor corrieron las **4 tablas**: `leads`, `ajustes`, `usuarios`, `actividad`.
- [ ] Las 4 tablas tienen **RLS activado** y están **deny-by-default** (sin reglas, nadie lee).
- [ ] Mi `.env.local` tiene las **6 variables** con sus valores, y `.env.local` está en `.gitignore`.
- [ ] La app muestra **"MODO NUBE ✅"** (no "MODO DEMO").
- [ ] La llave secreta **no** aparece en ninguna pantalla, log ni mensaje de error.
- [ ] Desde el navegador, un visitante **no** puede leer la lista de leads (solo el servidor puede).

---

## SI ALGO SALE MAL (los 5 tropezones más comunes)

**1) Dice "MODO DEMO ⚠️" y yo sí quería nube.**
Te falta la llave secreta o quedó mal pegada. Revisa que en `.env.local` el renglón `SUPABASE_SECRET_KEY=` tenga el código que empieza con `sb_secret_` (o tu `service_role`), sin espacios ni comillas. Guarda el archivo y vuelve a arrancar la app. Es como prender el local: si no metiste la llave de la caja fuerte, la caja no abre.

**2) Pegué la llave equivocada (puse la pública donde iba la secreta o al revés).**
Síntoma típico: errores de permiso o que "no guarda nada". La llave pública (`anon`) va en `NEXT_PUBLIC_SUPABASE_ANON_KEY`. La secreta (`sb_secret_...`) va en `SUPABASE_SECRET_KEY`. Si las cruzaste, intercámbialas, guarda y reinicia. Pídele a la IA: "verifica que mis llaves estén en el renglón correcto".

**3) RLS me bloquea TODO (ni yo veo mis leads).**
Eso en realidad es buena señal: la puerta con llave de tu bodega está cerrada, como debe estar. La lectura de leads es **solo desde el servidor** con la llave secreta. Si tu pantalla de admin no muestra leads, casi siempre es porque está leyendo desde el navegador (cliente) en vez del servidor. Pídele a la IA: "asegúrate de que la lista de leads se lea desde el servidor con la llave secreta, no desde el navegador".

**4) Mi página de captura no puede guardar el lead.**
La regla RLS debe permitir que el cliente con la llave pública pueda **INSERTAR** un lead (solo eso, no leer). Si tu formulario marca "permiso denegado" al enviar, falta esa regla de INSERT en la tabla `leads`. Pídele a la IA: "agrega la política RLS que deja al cliente público insertar leads, sin permitirle leer la lista".

**5) Sospecho que la llave secreta se filtró al navegador.**
Riesgo serio: la llave secreta JAMÁS debe estar en código de cliente. Si alguna vez la pegaste en un componente del navegador, en un chat público, o la subiste a internet, **rótala ya**: en Supabase ve a **Settings → API Keys → Reset / Roll** la `service_role`, copia la nueva, y vuelve a pegarla SOLO en `.env.local`. Recuerda: lo que lleva `NEXT_PUBLIC_` puede verlo cualquiera; la secreta no lleva ese prefijo por algo.

---

> **Tu tarea de este paso:** deja tu Supabase creado, la migración corrida con las 4 tablas y RLS, y tu app diciendo **"MODO NUBE ✅"**. Cuando veas ese letrero verde, ya tienes tu libreta de clientes en la nube, bajo llave y lista para recibir tu primer lead.
>
> Sigue con **04 — Publica tu app en internet (Vercel)**.
