# Conceptos clave — entiende tu Máquina de Ventas con dibujos

Aquí no memorizas nada. Solo vas a *entender* 6 ideas con dibujitos y analogías de
todos los días. Si tu tío de la taquería puede verlas en su cabeza, tú también.
¿Quieres la definición corta de una palabra suelta? Ve al **GLOSARIO.md**. Aquí
te explicamos cómo encajan las piezas entre sí.

> Color de tus apuntes: azul `#2a22f5`. Y se escribe **Vercel** (con V y con C).
> Nunca "Versel".

---

## 1. Los 3 estados de tu sitio: cocina, restaurante y letrero

Tu página de captura vive en uno de tres lugares según qué tan "abierta al público"
está. Imagina que estás montando un negocio de comida:

```
   ESTADO 1                ESTADO 2                  ESTADO 3
   localhost               Vercel                    tu dominio
   ----------              ----------                ----------
   tu cocina               restaurante abierto       letrero en la calle
   solo tú entras          cualquiera entra          tu nombre en la avenida
   localhost:3000          tu-app.vercel.app         tunegocio.com
   (dirección privada)     (dirección prestada)      (dirección tuya)
```

- **localhost = tu cocina.** Tu app corre *solo en tu computadora*. Nadie de afuera
  la ve. Aquí pruebas, ajustas y dejas todo bonito antes de abrir. Si algo sale
  mal, no pasa nada: estás en tu cocina.
- **Vercel = el restaurante abierto al público.** Tu misma app, pero ahora vive en
  internet en una dirección prestada (`tu-app.vercel.app`) que sí le puedes mandar
  a un cliente por WhatsApp.
- **dominio = el letrero con tu nombre en la calle.** Cambias la dirección larga y
  prestada por una bonita y tuya (`tunegocio.com`). Mismo restaurante, mejor letrero.

> Es el mismo platillo en los tres estados. Lo único que cambia es *quién puede
> entrar a probarlo*.

---

## 2. ¿Qué es "deploy"? Sacar el platillo de la cocina al menú

**Deploy** (se dice "diplóy") es el acto de **publicar**: pasar tu app de la cocina
(localhost) al restaurante (Vercel) para que el mundo la vea.

```
   TU COCINA                                 EL RESTAURANTE
   localhost:3000  ───────  deploy  ───────► tu-app.vercel.app
   (solo tú)                                 (todo internet)
```

Tú no cargas cajas. Le dictas a Claude Code en español *"sube mi app a Vercel y
dame el link"*, o aprietas un botón **Deploy** en la página de Vercel. En 1 o 2
minutos sale confeti y un botón **Visit**: ya estás en vivo.

> Si salió bien, deberías poder abrir `tu-app.vercel.app` desde el teléfono de otra
> persona y verla funcionar. Ese es el día que abriste de verdad.

---

## 3. Frontend vs Backend: el comedor y la cocina

Tu app tiene dos mitades. Una la ve el cliente; la otra, jamás.

```
        ┌─────────────────────────┐        ┌──────────────────────────┐
        │   FRONTEND (el comedor)  │        │   BACKEND (la cocina)     │
        │                          │        │                          │
        │  • lo que SÍ ve el       │  pide  │  • lo que NADIE ve        │
        │    cliente               │ ─────► │  • guarda los leads       │
        │  • botones, colores,     │ ◄───── │  • usa la llave secreta   │
        │    formulario azul       │ trae   │  • decide qué se muestra  │
        └─────────────────────────┘        └──────────────────────────┘
              público                              privado y a salvo
```

- **Frontend = el comedor.** Los colores, los botones, el formulario donde el
  visitante deja su nombre y teléfono. La cara bonita con tu marca azul `#2a22f5`.
- **Backend = la cocina.** Nadie del público pisa la cocina. Ahí se guardan tus
  leads, se revisa la llave de tu caja fuerte y se decide qué información sale.

> Por qué importa: tu lista de clientes vive en la cocina, **nunca en el comedor**.
> El visitante jamás puede ver la base de todos tus contactos, solo el formulario.

---

## 4. Base de datos vs código: la libreta y la receta

Mucha gente las confunde. Son dos cosas distintas que trabajan juntas.

```
   CÓDIGO (la receta)                BASE DE DATOS (la libreta)
   ------------------                --------------------------
   las instrucciones                 los nombres y teléfonos
   "muestra un formulario            "Juan Pérez, 33-1234-5678,
    azul y guarda el lead"            etapa: Nuevo"
   vive en GitHub                    vive en Supabase
   igual para todos                  distinta para cada negocio
```

- **El código = la receta del platillo.** Las instrucciones de cómo se ve y qué
  hace tu app. Se guarda en GitHub (la fotocopiadora con historial). Si tú y tu
  vecino usan el mismo kit, su *receta* es igual.
- **La base de datos = tu libreta de clientes.** Los nombres y teléfonos reales de
  *tus* prospectos. Vive en Supabase (tu libreta de clientes en la nube). Tu
  libreta es solo tuya; la de tu vecino tiene a *sus* clientes.

> Cambiar la receta (el código) no borra tu libreta (los clientes). Y borrar la
> receta no se lleva a tus clientes. Son cajones separados a propósito.

---

## 5. ¿Qué es una variable de entorno? La combinación de tu caja fuerte

Una **variable de entorno** es un dato secreto que tu app necesita pero que **no se
escribe dentro del código**. Es como la combinación de tu caja fuerte: la app la
usa, pero no la dejas pegada en un papelito a la vista.

```
   ┌──── CÓDIGO (a la vista de todos) ────┐   ┌──── CAJA FUERTE (privada) ────┐
   │  "para entrar a la libreta, usa       │   │  NEXT_PUBLIC_SUPABASE_URL      │
   │   la combinación guardada en la       │──►│  NEXT_PUBLIC_SUPABASE_ANON_KEY │
   │   caja fuerte"                         │   │  SUPABASE_SECRET_KEY  (¡secreta!)│
   └───────────────────────────────────────┘   └────────────────────────────────┘
```

Tu kit usa unas pocas. No las memorices; solo entiende que hay **dos tipos**:

- **Las que empiezan con `NEXT_PUBLIC_`** son seguras de mostrar. Es como el
  *nombre* de tu sucursal: que todos lo sepan no abre nada.
- **`SUPABASE_SECRET_KEY`** es la llave maestra de la bodega. **Solo el servidor
  (la cocina) la toca, nunca el navegador.** Si esa se filtra, alguien podría
  entrar a tu libreta de clientes. Por eso vive en la caja fuerte, no en el código.

> Regla simple: lo que diga `PUBLIC` puede verse; lo que diga `SECRET` jamás se
> pega en un chat, ni se sube a GitHub, ni se manda por WhatsApp.

---

## 6. Modo demo vs modo nube: con o sin libreta conectada

Tu Máquina de Ventas arranca aunque todavía no hayas conectado tu libreta. Para no
dejarte atorado, tiene dos modos:

```
   MODO DEMO                          MODO NUBE
   (sin caja fuerte conectada)        (con la llave secreta puesta)
   ---------------------------        ----------------------------
   los leads viven "en el aire"       los leads se guardan en Supabase
   se borran al reiniciar             se quedan para siempre
   perfecto para PROBAR               listo para CLIENTES REALES
   cloudReady = false                 cloudReady = true
```

- **Modo demo:** si todavía no pusiste tu llave secreta de Supabase, la app corre
  igual, pero los contactos se guardan *solo en la memoria* y se borran al
  reiniciar. Es tu cocina de pruebas: úsalo para ver que todo funciona, sin miedo
  a ensuciar nada.
- **Modo nube:** en cuanto conectas tu llave secreta, tu app empieza a guardar cada
  lead en tu libreta real (Supabase). Ahora sí, cada cliente que llega se queda
  para siempre.

> Cómo sabes en cuál estás: la app te muestra un aviso. Si ves "modo demo", todavía
> no has conectado tu libreta — y está perfecto para empezar. Cuando conectes tu
> llave de Supabase, pasas a modo nube solito.

---

## El mapa completo en un solo dibujo

Así se ven todas las piezas juntas cuando tu Máquina de Ventas ya está abierta:

```
   CLIENTE
   (su teléfono)
        │
        ▼
   tunegocio.com  ──►  Vercel  ──►  FRONTEND (comedor: formulario azul)
   (tu letrero)        (restaurante)        │
                                            ▼
                                       BACKEND (cocina) ──► usa la llave SECRETA
                                            │
                                            ▼
                                       Supabase (tu libreta de clientes)
                                            │
                                            ▼
                                    tú lo ves en tu CRM
```

El cliente entra por tu letrero, pasa por el comedor, deja sus datos en la cocina,
y aterrizan en tu libreta. Tú los ves ordenados en tu CRM. **Y nunca, en ningún
momento, el cliente vio tu lista completa de contactos.** Esa es la magia: simple
por fuera, bien guardado por dentro.

> ¿Te perdiste en alguna palabra? Vuelve al **GLOSARIO.md**. ¿Listo para construir?
> Sigue con **EMPIEZA-AQUI.md**.
