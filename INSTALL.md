# Correr tu AI Cash Machine en tu cocina (local)

> **Paso 1 de 6 · ~12 min · necesitas:** tu computadora, la carpeta del kit ya descargada, y conexion a internet.

Antes de abrirle las puertas al publico, un buen restaurantero **ensaya el platillo en su propia cocina**. Lo prueba, lo ajusta, lo vuelve a probar. Nadie de la calle lo ve todavia. Si algo sale mal, no pasa nada: esta en su cocina.

Eso es **correr en local**. *Local* significa que tu app corre **solo en tu computadora**, en una direccion privada que unicamente tu ves. Es tu cocina de pruebas. Aqui mueves, corriges y dejas todo bonito **antes** de que el mundo lo vea.

Esa direccion privada se llama **localhost** (se lee "localjost"). Piensa: *local* = aqui, en mi compu. Se ve asi: `http://localhost:3000`. Ese `:3000` es solo el numero de la puerta de tu cocina.

> Mi tio de la taqueria hace esto solo. Tu tambien. Son 4 acciones, una por pantalla.

---

## Antes de empezar: abre la carpeta del kit

Abre tu consola (en Claude Code ya estas en ella) **dentro de la carpeta del kit** que descargaste. Es como pararte adentro de tu cocina antes de cocinar: tienes que estar en el lugar correcto.

Si no sabes si estas adentro, pidele a tu IA en espanol: *"confirmame que estoy dentro de la carpeta del kit"*. Ella lo revisa por ti.

> **Checkpoint:** si salio bien, al escribir tu primer comando no veras un error de "no encuentro el archivo". Si lo ves, avisale a tu IA: *"no estoy en la carpeta correcta, llevame a la del kit"*.

---

## Paso 1 — Surte tu despensa (instala las piezas)

**Para que sirve:** una cocina no funciona sin ingredientes. Este comando baja todas las piezas que tu app necesita para encender. Se hace **una sola vez**.

Pega esto en tu consola y dale Enter:

```
pnpm install
```

> **Checkpoint:** si salio bien, despues de un rato veras un mensaje verde tipo `Done` y aparecera una carpeta nueva llamada `node_modules` (esa es tu despensa llena). Tarda de 1 a 3 minutos la primera vez. Es normal.

### ¿Y si te dice "pnpm: command not found"?

Tranquilo, no rompiste nada. **pnpm** es solo el ayudante que carga los ingredientes. Tu compu todavia no lo conoce. Hay dos formas de presentarselo; usa la primera, y si falla, la segunda:

**Opcion A (la mas limpia):** activa el ayudante que ya viene con tu compu.

```
corepack enable
```

Luego vuelve a correr `pnpm install`.

**Opcion B (si la A no jala):** instala pnpm a mano.

```
npm i -g pnpm
```

Luego vuelve a correr `pnpm install`.

> **Checkpoint:** si salio bien, al escribir `pnpm install` ya **no** sale el "command not found", sino el mensaje verde de la despensa llena. Si las dos opciones fallan, dile a tu IA en espanol: *"no puedo instalar pnpm, ayudame paso a paso"*.

---

## Paso 2 — Copia la combinacion de la caja fuerte (.env.local)

**Para que sirve:** tu app guarda secretos (como la llave de tu libreta de clientes) en un archivo privado. La **variable de entorno** es la combinacion de tu caja fuerte. El kit ya trae una caja de ejemplo; aqui haces **tu copia personal** para escribir tus combinaciones.

Pidele a tu IA en espanol:

```
Copia el archivo .env.example y crea uno nuevo llamado .env.local en la
misma carpeta. No cambies nada adentro todavia, solo haz la copia.
```

(Si prefieres hacerlo tu, es copiar `.env.example` y nombrar la copia `.env.local`.)

> **Checkpoint:** si salio bien, ahora existe un archivo llamado `.env.local` junto al `.env.example`. Ese `.env.local` es **tuyo y privado**: nunca lo subas a internet ni lo compartas. Es la combinacion de tu caja fuerte.

> **Importante (lee esto con calma):** por ahora **NO necesitas llenar nada** en ese archivo para ver tu app funcionando. Con la copia vacia, el kit arranca en **MODO DEMO**: todo se ve y se prueba, pero los contactos se guardan solo en la memoria del momento (como una libreta de borrador que se borra al apagar). Eso es perfecto para hoy. Conectar tu libreta real en la nube (Supabase) es otro paso, mas adelante.

---

## Paso 3 — Enciende los fogones (corre la app)

**Para que sirve:** prender la estufa. Este comando enciende tu app en tu cocina, lista para que tu la pruebes.

Pega esto y dale Enter:

```
pnpm dev
```

> **Checkpoint:** si salio bien, en unos segundos veras un texto que dice algo parecido a:
>
> ```
> ▲ Next.js 16.2.9
> - Local:  http://localhost:3000
> ✓ Ready
> ```
>
> Esa linea **`Local: http://localhost:3000`** es la puerta de tu cocina. Deja esta consola abierta y trabajando; si la cierras, se apagan los fogones.

> Si en vez de eso ves un error rojo, copialo y pegaselo a tu IA en espanol: *"me salio este error al correr pnpm dev, arreglalo"*.

---

## Paso 4 — Sientate a tu propia mesa (abre la app)

**Para que sirve:** probar el platillo antes que nadie. Te sientas a tu mesa y miras tu app viva.

1. Abre tu navegador (Chrome, Safari, el que uses).
2. En la barra de direcciones escribe: **`http://localhost:3000`** y dale Enter.

> **Checkpoint:** si salio bien, ahi esta tu **pagina de captura** de la AI Cash Machine, **viva, pero solo para ti**. Pruebala: escribe un nombre y un telefono de mentira, dale enviar, y entra al CRM para ver que aparezca en la lista.

> **[CAPTURA: tu pagina de captura abierta en localhost:3000, con la barra de direccion circulada en rojo — inserta aqui tu screenshot real]**

¿Algo no te gusto? No lo publiques todavia. Dile a tu IA en espanol lo que quieras cambiar, por ejemplo: *"el boton deberia ser mas grande y azul"*, guarda, y vuelve a mirar la pagina (se actualiza solita). Repite hasta que te enamore.

---

## Recuerda: nadie de afuera lo ve todavia

Mientras tu app este en `localhost`, vive **solo en tu cocina**. No le puedes mandar ese link a un cliente: en su telefono no abrira nada, porque esa direccion solo existe en tu computadora.

Para que cualquiera entre desde su telefono, hay que **abrir el restaurante al publico**: publicarla en **Vercel** (se escribe siempre asi: **Vercel**). Eso es el siguiente tutorial del kit.

---

## Modo demo vs. modo real (en una frase)

- **Hoy, sin secretos:** corre en **MODO DEMO**. Los contactos se guardan en memoria (se borran al reiniciar). Sirve para ver y ajustar todo. `cloudReady = false`.
- **Manana, con tu llave secreta de Supabase** (`SUPABASE_SECRET_KEY`): tu libreta de clientes vive en la nube y los contactos se quedan guardados de verdad. Ese paso viene mas adelante en el kit.

> Tip: es como rentar un local. El plan gratis y el modo demo te alcanzan de sobra para empezar y aprender. No gastas un peso hoy.

---

## Mini-glosario (por si una palabra te suena rara)

- **Local / localhost:** tu app corriendo solo en tu compu. Tu cocina de pruebas.
- **pnpm:** el ayudante que carga los ingredientes de tu app.
- **.env.local:** la caja fuerte privada con tus combinaciones (secretos). Nunca se comparte.
- **Variable de entorno:** una combinacion guardada en esa caja fuerte.
- **Modo demo:** la app funciona sin secretos, pero guarda en memoria (se borra al reiniciar).
- **Vercel:** el restaurante abierto al publico en internet (siguiente paso).
