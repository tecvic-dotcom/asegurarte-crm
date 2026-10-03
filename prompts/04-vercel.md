# Publica tu AI Cash Machine en Vercel (abre el restaurante al publico)

> **Paso 4 de 6 · ~20 min · necesitas:** tu computadora encendida, el kit ya corriendo en local (Paso 1) y, si ya hiciste el Paso 3, tus llaves de Supabase a la mano. Tambien una cuenta de **GitHub** (la fotocopiadora con historial) y un correo.

Hasta ahora tu app vive **solo en tu cocina** (`localhost:3000`): nada mas tu la ves. Hoy abrimos el restaurante en la avenida principal para que **cualquier cliente entre desde su telefono**.

**Vercel** (se escribe asi, **Vercel**, siempre) es ese restaurante: tu app puesta en internet, en una direccion publica, con candadito de seguridad (HTTPS) que viene solito. Y para empezar, **es gratis**.

> Mi tio de la taqueria publico la suya solo, sin saber programar. Tu igual. Una pantalla, una accion, y un checkpoint para confirmar que vas bien.

---

## Antes de empezar: la cuenta de GitHub (1 sola vez)

**Para que sirve:** GitHub es **la fotocopiadora con historial** donde se guarda tu codigo. Vercel lee de ahi para publicar. Tu IA sube tu codigo a GitHub por ti; tu solo necesitas tener la cuenta.

Si ya tienes GitHub, sigue al Paso 1. Si no:

1. Entra a **github.com** y aprieta **Sign up** (Registrarse).
2. Pon tu correo, crea un usuario y una contrasena.
3. Abre tu correo y **verifica** dando clic en el mensaje que te llega.

> **¿Pide tarjeta?** No. GitHub es gratis para esto. **Plan gratis:** te alcanza de sobra para todo el kit. **Costo:** $0. Es como sacar tu credencial de la fotocopiadora: gratis, y la necesitas para que el restaurante lea tu menu.

> **Checkpoint:** si salio bien, puedes entrar a github.com y ves tu nombre de usuario arriba a la derecha. Si no llego el correo de verificacion, revisa spam.

---

## Paso 1 — Sube tu codigo a GitHub (diceselo a tu IA)

**Para que sirve:** llevar una copia de tu cocina a la fotocopiadora, para que Vercel la pueda leer. No copias nada a mano: tu IA lo hace.

En tu consola (Claude Code), pega este superprompt y dale Enter:

```
Sube el codigo de este kit a un repositorio nuevo en mi cuenta de GitHub.
Crea el repositorio como PRIVADO (que solo yo lo vea). NO subas el
archivo .env.local ni ningun secreto: confirma que .gitignore ya lo
excluye. Cuando termines, dame el link exacto del repositorio en GitHub.
```

> **Checkpoint:** si salio bien, tu IA te entrega un link tipo `github.com/tu-usuario/ai-cash-machine`. Abrelo: ahi estan tus archivos. Confirma que **NO** aparece `.env.local` en la lista (tus secretos se quedan en tu compu, nunca en la fotocopiadora). Si te pide permiso para conectar GitHub, acepta.

---

## Paso 2 — Crea tu cuenta en Vercel

**Para que sirve:** firmar el contrato del local. Una sola vez.

1. Entra a **vercel.com** y aprieta **Sign Up** (Registrarse).
2. Elige **Continue with GitHub** (Continuar con GitHub) — porque ahi vive tu codigo.
3. Aprieta **Authorize / Autorizar** para que Vercel y GitHub se den la mano.
4. Cuando pregunte el tipo de uso, elige **Hobby** (ese es el plan gratis).
5. Ya estas en tu **Dashboard** (tu tablero de control).

> **¿Pide tarjeta?** No. El plan **Hobby** de Vercel no pide tarjeta. **Plan gratis (Hobby):** publica tu app, le da una direccion `.vercel.app`, el candadito de seguridad, y aguanta de sobra el trafico de quien arranca. **Costo:** $0. (El plan de paga, Pro, ronda los **$400 MXN al mes**, y NO lo necesitas para este kit.) Es como rentar un local: el plan gratis es tu local de arranque, sin renta. Respira: empiezas sin gastar un peso.

> **[CAPTURA: pantalla de Sign Up de Vercel con el boton "Continue with GitHub" circulado en rojo — inserta aqui tu screenshot real]**

---

## Paso 3 — Importa tu proyecto desde GitHub

**Para que sirve:** decirle al restaurante "este es el menu que voy a servir". Vercel toma tu copia de GitHub y la prepara para publicar.

1. En tu tablero, arriba a la derecha: aprieta **Add New…** y elige **Project** (Proyecto).
2. Vercel te muestra tus repositorios de GitHub. Busca el de tu app y aprieta **Import** (Importar).
3. Vercel detecta solo que es un proyecto Next.js. **No toques la configuracion.** Asi esta bien.

> **Checkpoint:** si salio bien, ves la pantalla de tu proyecto con el nombre de tu app arriba y una seccion que dice **Environment Variables** (Variables de entorno) mas abajo. **No le des Deploy todavia:** primero pegamos las combinaciones de la caja fuerte en el Paso 4.

> **[CAPTURA: pantalla de "Import Project" de Vercel con el boton "Import" junto a tu repositorio circulado en rojo — inserta aqui tu screenshot real]**

---

## Paso 4 — Pega tus variables de entorno (la combinacion de la caja fuerte)

**Para que sirve:** tu restaurante necesita las mismas llaves secretas que usaste en tu cocina, o no podra entrar a tu libreta de clientes (Supabase). La **variable de entorno** es la combinacion de tu caja fuerte: la pegas aqui una vez y listo.

> **Si todavia NO conectaste Supabase (no hiciste el Paso 3 del kit):** puedes saltarte este paso. Tu app se publicara en **MODO DEMO** (los contactos se guardan en memoria y se borran al reiniciar). Sirve para verla en internet hoy; manana conectas Supabase. Si es tu caso, ve directo al Paso 5.

En la seccion **Environment Variables** de Vercel, agrega estas, **una por una** (Name = el nombre, Value = el valor que copiaste de tu `.env.local`):

| Name (nombre exacto) | Value (de donde sale) | ¿Para que? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | la URL de tu proyecto Supabase | direccion de tu libreta en la nube |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tu llave publicable de Supabase | llave que SI puede ver el navegador |
| `SUPABASE_SECRET_KEY` | tu llave secreta (`sb_secret_...`) | llave privada del servidor — guarda con cuidado |
| `ADMIN_CODE` | el codigo que tu elijas para tu admin | candado del panel de administracion |
| `NEXT_PUBLIC_ADMIN_CODE` | el mismo codigo de admin | solo destraba la pantalla del admin |

- Copia cada nombre **tal cual**, sin espacios ni cambios de mayusculas. Una letra mal y no jala.
- La `SUPABASE_SECRET_KEY` es la llave maestra: **nunca** la pongas en un chat publico ni se la mandes a nadie. Aqui en Vercel esta segura porque solo la usa el servidor.
- `SUPABASE_DB_PASSWORD` **NO** se pone aqui: esa solo se usa para migraciones, no para correr la app publicada.

> **Atajo:** ¿prefieres no copiar a mano? Dile a tu IA: *"dame mis variables de entorno en formato Name=Value, una por linea, para pegarlas en Vercel"*. Ella te las lista listas para copiar (Vercel deja pegar varias de golpe con el boton de importar/pegar).

> **Checkpoint:** si salio bien, ves tus 5 variables (o las que correspondan) listadas en la seccion de Environment Variables, cada una con su nombre y su valor oculto con puntitos. Asi debe verse.

---

## Paso 5 — Aprieta Deploy (publica)

**Para que sirve:** sacar el platillo de la cocina al menu del restaurante, a la vista de todos. **Deploy** (se lee "diploy") significa **publicar / poner en vivo**.

1. Aprieta el boton grande **Deploy** (Publicar).
2. Espera 1 o 2 minutos mientras Vercel cocina (vas a ver un texto corriendo: es el horno trabajando, no lo cierres).
3. Cuando termina, sale **confeti** y un boton **Visit** (Visitar).

> **Checkpoint:** si salio bien, tu app ya esta **en vivo** en una direccion gratis tipo **`tu-app.vercel.app`**. Apretale **Visit** y mirala abierta en internet. Ese link YA lo puede abrir cualquiera, desde cualquier telefono.

> **[CAPTURA: pantalla de Vercel con confeti, el mensaje de exito y el boton "Visit" circulado en rojo — inserta aqui tu screenshot real]**

---

## Paso 6 — Mandale el link a alguien y compruebalo

**Para que sirve:** la prueba de fuego. El dia que otra persona abre tu link desde **su** telefono y funciona, abriste de verdad.

1. Copia tu direccion `tu-app.vercel.app`.
2. Mandala por WhatsApp a tu pareja, un amigo o un familiar.
3. Pidele que la abra y te diga si la ve.

> **Checkpoint:** si salio bien, esa persona ve tu pagina de captura en su telefono. **Felicidades: estas en internet de verdad.** Tu AI Cash Machine ya tiene puerta abierta al publico.

---

## ¿Y despues? Cada cambio se publica solo

Lo mejor del restaurante con GitHub + Vercel: **cada vez que mejoras tu app, se publica solita.** Cuando tu IA guarda cambios y los sube a GitHub (un "push"), Vercel los hornea y los pone en vivo en automatico, en uno o dos minutos. Tu solo dictas la mejora en espanol; el restaurante se actualiza solo.

> **Alternativa para quien quiera ir mas tecnico (opcional):** existe la herramienta de linea de comando **Vercel CLI**. Se instala con `pnpm add -g vercel` y se publica con el comando `vercel`. Funciona, pero **no la necesitas**: importar tu repo desde el tablero de Vercel (lo que acabas de hacer) es el camino recomendado y mas facil. Si tu IA te ofrece usar el CLI, esta bien; solo no es obligatorio.

---

## SI ALGO SALE MAL (los 3 tropiezos comunes, con solucion)

### 1) El Deploy fallo / "Build failed" (sale en rojo, sin confeti)

Significa que el horno se trabo cocinando. No rompiste nada. Vercel te muestra un texto del error.

1. Aprieta **View Build Logs** (Ver registros) y copia el texto rojo del final.
2. Pegaselo a tu IA en espanol: *"mi deploy en Vercel fallo con este error, arreglalo y vuelve a subir el codigo a GitHub"*.
3. Cuando tu IA sube el arreglo, Vercel **vuelve a publicar solo**. Espera 1-2 min y revisa.

> **Checkpoint:** si salio bien, el nuevo intento termina en verde con su boton **Visit**.

### 2) La pagina abre pero los contactos no se guardan (falta una variable)

Casi siempre es una **variable de entorno** mal escrita o faltante. La caja fuerte tiene mal la combinacion.

1. Ve a tu proyecto en Vercel → **Settings** (Configuracion) → **Environment Variables**.
2. Revisa que esten las 5 y que cada **Name** este escrito **identico** (sin espacios). Si falta `SUPABASE_SECRET_KEY`, tu app se queda en MODO DEMO y por eso no guarda.
3. Corrige o agrega la que falte, **guarda**, y arriba en **Deployments** aprieta los tres puntitos del ultimo deploy → **Redeploy** (Volver a publicar). Las variables nuevas solo aplican tras republicar.

> **Checkpoint:** si salio bien, tras el Redeploy llenas tu formulario en internet y el contacto SI aparece en tu CRM.

### 3) El link da "404" (pagina no encontrada)

Un 404 quiere decir "esa puerta no existe aqui". Suele ser que abriste **mal la direccion** o que el deploy aun no termina.

1. Confirma que copiaste la direccion completa que te dio Vercel (`tu-app.vercel.app`), sin letras de mas.
2. Si recien apretaste Deploy, espera 1-2 minutos y recarga: a veces el 404 es porque el restaurante todavia esta abriendo la puerta.
3. Si persiste, en Vercel ve a **Deployments** y confirma que el ultimo diga **Ready** (Listo) en verde. Si dice **Error**, ve al tropiezo #1.

> **Checkpoint:** si salio bien, al recargar ya carga tu pagina de captura en vez del 404.

> **Cuando nada de esto resuelva:** copia lo que veas en pantalla y dile a tu IA en espanol: *"mi app en Vercel muestra esto, ayudame a arreglarlo paso a paso"*. Pegale el texto del error. Para eso esta tu JARVIS.

---

## Mini-glosario (por si una palabra te suena rara)

- **Vercel:** el restaurante abierto al publico en internet. Publica tu app gratis con candadito de seguridad.
- **GitHub:** la fotocopiadora con historial donde se guarda tu codigo. Vercel lee de ahi.
- **Deploy / Deployment:** publicar, poner en vivo. Sacar el platillo al menu.
- **Build:** el momento en que Vercel "cocina" tu codigo antes de servirlo.
- **Variable de entorno:** la combinacion de tu caja fuerte (una llave secreta que tu app usa).
- **Hobby:** el plan gratis de Vercel. Sin tarjeta, te alcanza para empezar.
- **404:** "esa puerta no existe aqui". Revisa la direccion o espera a que termine el deploy.
- **Vercel CLI:** la version por comandos (opcional). El tablero de Vercel es mas facil y es el camino recomendado.
