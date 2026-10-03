# PASO 0 — Prepara tu compu

**Paso 0 de 6 · ~20 min · necesitas:** tu computadora (Mac o Windows), internet, y la carpeta del kit ya descargada en tu Escritorio.

> Marca LEGENDAR·IA · color guía **azul #2a22f5**
> Antes de hacer dinero con tu máquina de captura, hay que prender el motor. Eso es este paso: dejar tu compu lista. Una sola vez. Después ya nunca más.

---

## ¿Qué es Claude Code? (en una frase de taquería)

Claude Code es un ayudante de inteligencia artificial que vive **dentro de tu computadora** y construye páginas web y programas por ti **mientras tú le hablas en español normal**. Tú le pegas un texto (un "superprompt") y él teclea por ti: arma tu página de captura, tu CRM y tu panel de administración. Tú no programas nada; tú diriges. Es como tener un albañil experto al que solo le dices "quiero la casa así" y él la levanta.

Para que ese ayudante exista, primero hay que abrir **la terminal**.

---

## La terminal, sin miedo

**La terminal = el cuarto de mando donde le hablas a tu compu por escrito.**

Toda la vida le has hablado a tu compu con clics y con el mouse. La terminal es otra puerta: en vez de clics, le escribes una orden y le das Enter. Se ve como una pantalla negra (o blanca) con letras. Da respeto la primera vez, igual que la primera vez que manejaste un coche. Pero solo vas a copiar y pegar lo que este kit te dice. Nada más.

> Regla de oro de este paso: **una sola acción por pantalla**. No corras. Termina una, ve la palomita verde, y pasa a la siguiente.

---

# PARTE A — Si tienes Mac 🍎

## Paso 1 de 6 — Abre la terminal (Mac)

1. Mantén presionada la tecla **Cmd (⌘)** y, sin soltarla, toca la tecla de la **barra espaciadora**. Se abre el buscador **Spotlight** (una barrita en medio de la pantalla).
2. Escribe la palabra: **Terminal**
3. Presiona **Enter**.

✅ **Checkpoint visual:** se abrió una ventana con fondo claro u oscuro y un texto que termina con tu nombre de usuario y el símbolo **`%`** o **`$`** parpadeando. Eso es el cuarto de mando. Ya estás dentro.

[CAPTURA: ventana de Terminal abierta en Mac con el símbolo % circulado en rojo — inserta aquí tu screenshot real]

---

## Paso 2 de 6 — Revisa si ya tienes "Node" (Mac)

Node es el motorcito que necesita Claude Code para correr. **Node = la gasolina del coche.** Vamos a ver si ya la tienes en el tanque.

1. En la terminal, escribe exactamente esto (o cópialo y pégalo): `node --version`
2. Presiona **Enter**.

✅ **Checkpoint visual:**
- Si ves algo como **`v20.11.0`** o cualquier número que empiece con **v18** o más alto → ya tienes gasolina. **Sáltate el Paso 3 y ve directo al Paso 4.**
- Si ves **`command not found`** (no encontrado) → te falta el motorcito. Sigue al Paso 3.

---

## Paso 3 de 6 — Instala Node (Mac, solo si te faltó)

1. Abre tu navegador (Safari o Chrome) y entra a esta dirección: **nodejs.org**
2. Haz clic en el botón grande que dice **"LTS"** (es la versión estable y recomendada). Se descarga un archivo que termina en **`.pkg`**.
3. Abre ese archivo descargado y haz clic en **"Continuar"** hasta el final, como cuando instalas cualquier programa en tu Mac.

> 💳 **Sobre costo:** Node es **100% gratis**. No pide tarjeta. No hay plan de pago. Es una herramienta libre que usa todo el mundo. Tranquilo: aquí no gastas un peso.

✅ **Checkpoint visual:** al terminar, cierra la terminal y vuelve a abrirla (Paso 1), escribe otra vez `node --version` y ahora sí debe aparecer un número con **`v`**.

---

## Paso 4 de 6 — Instala Claude Code (Mac)

1. En la terminal, copia y pega esta línea completa:
   ```
   curl -fsSL https://claude.ai/install.sh | bash
   ```
2. Presiona **Enter** y espera. Verás texto corriendo solo por la pantalla. Eso es normal: el ayudante se está instalando. **No cierres nada.**

✅ **Checkpoint visual:** cuando termina, aparece un mensaje de éxito con la palabra **`claude`** y la pantalla deja de moverse. Listo, el ayudante ya vive en tu compu.

[CAPTURA: mensaje final de instalación de Claude Code con la palabra "claude" circulada en rojo — inserta aquí tu screenshot real]

---

## Paso 5 de 6 — Métete a la carpeta del kit (Mac)

Ahora hay que pararte **dentro** de la carpeta del kit, para que el ayudante trabaje ahí y no en otro lado. **Esto es como entrar a la cocina correcta antes de empezar a cocinar.**

1. Asegúrate de que la carpeta del kit (`kit-ai-cash-machine`) esté en tu **Escritorio**.
2. En la terminal, copia y pega esta línea:
   ```
   cd ~/Desktop/kit-ai-cash-machine
   ```
3. Presiona **Enter**.

✅ **Checkpoint visual:** la línea de la terminal ahora muestra `kit-ai-cash-machine` antes del símbolo `%`. Eso significa "ya estás parado adentro de la carpeta correcta".

> Si te marca **`No such file or directory`** (no existe), es que la carpeta tiene otro nombre o está en otro lugar. Arrástrala a tu Escritorio y vuelve a intentar.

---

## Paso 6 de 6 — Aprende a PEGAR en la terminal (Mac)

Este es el truco que vas a usar todo el kit: **pegar el superprompt**.

1. Copia el texto que quieras pegar (con **Cmd + C**, como siempre).
2. Haz clic una vez dentro de la ventana de la terminal para activarla.
3. Mantén **Cmd (⌘)** y toca la tecla **V**. (**Cmd + V** = pegar.)

✅ **Checkpoint visual:** el texto que copiaste aparece escrito en la terminal. **Ojo:** no presiones Enter hasta que el kit te lo indique.

---

# PARTE B — Si tienes Windows 🪟

## Paso 1 de 6 — Abre la terminal (Windows)

1. Haz clic en el botón de **Inicio** (el logo de Windows, abajo a la izquierda) **o** presiona la tecla con el logo de Windows.
2. Escribe la palabra: **terminal**
3. Presiona **Enter** (se abre la app **Terminal** o **PowerShell**; cualquiera de las dos sirve).

✅ **Checkpoint visual:** se abrió una ventana con letras y una línea que termina con el símbolo **`>`** parpadeando. Ese es tu cuarto de mando.

[CAPTURA: ventana de Terminal/PowerShell abierta en Windows con el símbolo > circulado en rojo — inserta aquí tu screenshot real]

---

## Paso 2 de 6 — Revisa si ya tienes "Node" (Windows)

**Node = la gasolina del coche.** Vamos a ver si ya la tienes.

1. En la terminal, copia y pega: `node --version`
2. Presiona **Enter**.

✅ **Checkpoint visual:**
- Si ves un número como **`v20.11.0`** (que empiece con **v18** o más) → ya tienes gasolina. **Sáltate el Paso 3 y ve al Paso 4.**
- Si ves un error en rojo o **`no se reconoce`** → te falta el motorcito. Sigue al Paso 3.

---

## Paso 3 de 6 — Instala Node (Windows, solo si te faltó)

1. Abre tu navegador (Edge o Chrome) y entra a: **nodejs.org**
2. Haz clic en el botón **"LTS"**. Se descarga un archivo que termina en **`.msi`**.
3. Abre ese archivo y haz clic en **"Next"** (Siguiente) hasta el final, aceptando los términos. Al final pulsa **"Finish"**.

> 💳 **Sobre costo:** Node es **gratis total**. No pide tarjeta ni datos de pago. Lo usa medio mundo. Aquí no gastas nada.

✅ **Checkpoint visual:** cierra la terminal, vuelve a abrirla (Paso 1), escribe otra vez `node --version` y ahora debe salir un número con **`v`**.

---

## Paso 4 de 6 — Instala Claude Code (Windows)

1. En la terminal (PowerShell), copia y pega esta línea completa:
   ```
   irm https://claude.ai/install.ps1 | iex
   ```
2. Presiona **Enter** y espera. Verás texto corriendo solo. Es normal: el ayudante se está instalando. **No cierres la ventana.**

✅ **Checkpoint visual:** al terminar aparece un mensaje con la palabra **`claude`** y la pantalla se queda quieta. El ayudante ya vive en tu compu.

[CAPTURA: mensaje final de instalación de Claude Code en Windows con la palabra "claude" circulada en rojo — inserta aquí tu screenshot real]

---

## Paso 5 de 6 — Métete a la carpeta del kit (Windows)

Hay que pararte **dentro** de la carpeta del kit. **Es entrar a la cocina correcta antes de cocinar.**

1. Asegúrate de que la carpeta `kit-ai-cash-machine` esté en tu **Escritorio**.
2. En la terminal, copia y pega esta línea:
   ```
   cd "$env:USERPROFILE\Desktop\kit-ai-cash-machine"
   ```
3. Presiona **Enter**.

✅ **Checkpoint visual:** la línea de la terminal ahora termina con `kit-ai-cash-machine>`. Ya estás parado adentro de la carpeta correcta.

> Si te marca que **no existe la ruta**, la carpeta tiene otro nombre o está en otro lugar. Muévela a tu Escritorio y vuelve a intentar.

---

## Paso 6 de 6 — Aprende a PEGAR en la terminal (Windows)

El truco que vas a usar en todo el kit: **pegar el superprompt**.

1. Copia el texto que quieras pegar (con **Ctrl + C**, como siempre).
2. Haz clic dentro de la ventana de la terminal para activarla.
3. Haz **clic derecho** una vez. (En PowerShell, el clic derecho pega lo que copiaste. También sirve **Ctrl + V**.)

✅ **Checkpoint visual:** el texto que copiaste aparece escrito en la terminal. **No presiones Enter** hasta que el kit te lo pida.

---

# ✅ Ya quedó tu compu lista

Si llegaste hasta aquí, tu motor está prendido:

- [ ] La terminal abre sin problema (tu cuarto de mando).
- [ ] `node --version` te responde con un número.
- [ ] Claude Code quedó instalado (tu ayudante).
- [ ] Sabes meterte a la carpeta del kit con `cd`.
- [ ] Sabes pegar texto en la terminal (Cmd+V en Mac · clic derecho en Windows).

> Esto se hace **una sola vez en la vida** de tu compu. La próxima vez ya solo abres la terminal, te metes a la carpeta y trabajas.

**Si mi tío de la taquería lo logró solo, tú también.** Respira: lo difícil ya pasó.

➡️ **Siguiente:** abre el **PASO 1** del kit para crear tus cuentas y arrancar tu máquina de captura.
