# 05 · Tu propio dominio: ponle a tu negocio su letrero con nombre

> **Paso 5 de 6 · ~25-40 min (de tu tiempo activo, ~10 min) · necesitas:** tu app ya publicada en Vercel (Paso 4), una tarjeta para comprar el dominio, y un poco de paciencia para esperar.

Hasta ahora tu app vive en una dirección larga y prestada tipo `tu-app.vercel.app`. Funciona perfecto, pero es como tener tu taquería en "Local 14-B, pasillo 3, plaza sin nombre". En este paso le pones a tu negocio **su letrero con su nombre en la avenida**: `tunegocio.com`. Más fácil de recordar, más serio, más tuyo.

---

## Las analogías de este paso (guárdalas)

- **Dominio = el letrero con tu nombre en la calle.** `tunegocio.com` es el rótulo que cuelgas sobre la puerta. La gente lo lee, lo recuerda, y llega.
- **DNS = la guía telefónica de internet.** Es la lista que dice: "este nombre (`tunegocio.com`) vive en este local (tu app en Vercel)". Cuando conectas un dominio, das de alta tu nombre en esa guía para que la gente sepa a dónde ir.
- **Propagación = el tiempo en que la guía nueva llega a todas las casas.** Cuando cambias de número de teléfono, tarda en que todos lo tengan. Igual aquí: tu nombre nuevo tarda un rato en repartirse por todo el mundo.

---

## ¿Cuánto cuesta? (sin sorpresas)

- **¿Pide tarjeta?** Sí. Comprar un dominio siempre se paga.
- **¿Hay plan gratis?** No para el nombre `.com`, pero es **barato**: normalmente **$200 a $400 pesos MXN al año** (unos $12 a $20 USD). Algunos `.com` en oferta el primer año bajan a ~$150 MXN.
- **¿Cuánto alcanza?** Con un dominio tienes tu nombre apartado **un año completo**. Nadie más puede usarlo mientras lo pagues.
- **Calma:** es como **rentar el letrero de tu local**. Pagas una vez al año una cantidad chica y tu nombre es tuyo. Conectarlo a Vercel **no cuesta nada extra**: Vercel no te cobra por usar tu propio dominio, ni por el candadito de seguridad. Lo único que pagas es el nombre, una vez al año, en donde lo compres.

---

## Antes de empezar: el superprompt (deja que JARVIS te guíe)

Si prefieres que la IA te lleve de la mano paso a paso mientras tú haces clics, **copia este bloque completo y pégalo en tu consola JARVIS (Claude Code)**:

```
Quiero conectar mi propio dominio a mi app que ya está publicada en Vercel.
Guíame como si nunca hubiera hecho esto, un paso a la vez, en español sencillo.

1. Ayúdame a decidir un buen nombre de dominio para mi negocio.
2. Dime exactamente qué escribir y dónde apretar en Vercel para agregar
   el dominio (Settings → Domains).
3. Cuando Vercel me muestre los registros DNS (el A y el CNAME), pídeme
   que te los pegue tal cual aparezcan en MI pantalla, y dime con cuáles
   me quedo y dónde pegarlos en GoDaddy / Hostinger / Namecheap.
4. Explícame en una línea qué es la "propagación" y cuánto esperar.
5. Al final, dime cómo confirmar que ya quedó (la palomita verde) y que
   el candadito de seguridad (HTTPS) se puso solo.

No uses términos técnicos sin traducirlos. Espérame en cada paso.
```

> JARVIS te acompaña, pero **la compra del dominio y los clics finales los haces tú** (con tu tarjeta y tu cuenta). Abajo está la guía manual completa por si la prefieres.

---

## Paso 1 de 4 · Compra tu dominio

**Para qué sirve:** apartar tu nombre para que nadie más lo use. Es tuyo mientras lo pagues.

1. Entra a uno de estos (cualquiera sirve): **GoDaddy**, **Hostinger** o **Namecheap**.
2. En el buscador escribe el nombre que quieres, por ejemplo `tutaqueria.com`.
3. Si aparece **disponible**, agrégalo al carrito y págalo con tu tarjeta.

> **Tip:** elige el `.com` si está libre; es el que la gente recuerda. Evita guiones y números raros. Corto y claro gana.

> [CAPTURA: el buscador de GoDaddy con tu nombre escrito y la palabra "disponible" circulada en rojo — inserta aquí tu screenshot real]

**Si salió bien, deberías ver:** un correo de confirmación de compra y tu dominio listado en tu cuenta como "tuyo".

---

## Paso 2 de 4 · Agrégalo en Vercel

**Para qué sirve:** decirle a tu local "de hoy en adelante también respondes a este nombre".

1. Entra a **vercel.com**, abre tu proyecto (tu app ya publicada).
2. Arriba, aprieta **Settings** (Configuración).
3. En el menú de la izquierda, aprieta **Domains** (Dominios).
4. Escribe tu dominio `tunegocio.com` en el campo y aprieta **Add** (Agregar).
5. Si Vercel te ofrece agregar también la versión con **`www`** (`www.tunegocio.com`), **acéptala** — es lo recomendado.

> [CAPTURA: pantalla Settings → Domains de Vercel con el campo del dominio y el botón "Add" circulados en rojo — inserta aquí tu screenshot real]

**Si salió bien, deberías ver:** tu dominio aparece en la lista de Vercel, pero con un aviso de que **falta configurar el DNS** (todavía en amarillo o con una advertencia). Eso es normal: vamos a eso en el Paso 3.

---

## Paso 3 de 4 · Pega los registros DNS donde compraste el dominio

**Para qué sirve:** dar de alta tu nombre en la guía telefónica de internet, para que apunte a tu local en Vercel. Vercel te muestra dos datos; tú los copias en el panel de donde compraste el dominio (GoDaddy / Hostinger / Namecheap).

Busca en tu proveedor la sección **DNS** o **Administrar DNS** (a veces "Zona DNS"). Ahí vas a agregar dos registros:

| Tipo de registro | Nombre / Host | Valor a pegar |
|---|---|---|
| **A** (para el nombre raíz `tunegocio.com`) | `@` | `76.76.21.21` |
| **CNAME** (para `www.tunegocio.com`) | `www` | `cname.vercel-dns.com` |

- El registro **A** (`76.76.21.21`) es la **dirección física** del local de Vercel.
- El **CNAME** del `www` reenvía a tu local.

> **REGLA DE ORO:** Vercel a veces te muestra en pantalla un valor **único de tu proyecto** (algo raro como `d1d4fc829.vercel-dns-017.com`). **Copia SIEMPRE el valor EXACTO que aparezca en TU pantalla de Vercel** — ese manda, no el de esta tabla. La tabla es solo el ejemplo más común.

> [CAPTURA: panel DNS de tu proveedor con los dos registros (A y CNAME) ya pegados, circulados en rojo — inserta aquí tu screenshot real]

**Si salió bien, deberías ver:** los dos registros guardados en la lista de DNS de tu proveedor, con su tipo (A y CNAME) y sus valores.

---

## Paso 4 de 4 · Espera la propagación y verifica

**Para qué sirve:** la guía de internet tarda un rato en repartir tu nuevo número a todo el mundo. A esto se le llama **propagación**.

1. Guarda los cambios en tu proveedor de dominio.
2. Regresa a Vercel, a tu lista de **Domains**.
3. Aprieta **Refresh** o **Verify** (Actualizar / Verificar).
4. Espera. Puede tardar de **unos minutos a unas horas**.

> **Sobre el famoso "tarda hasta 48 horas":** lo vas a leer en todos lados y da miedo. La verdad práctica: **casi siempre queda en menos de 1 hora**, muchas veces en 10-15 minutos. Las "48 horas" son el caso peor del peor, rarísimo. No te alarmes ni borres nada: lo único que tienes que hacer es **esperar y volver a apretar Verify**. Ve por un café. En serio, así de tranquilo.

5. Cuando Vercel ponga la **palomita verde "Valid Configuration"**, ¡listo!

**Si salió bien, deberías ver:** tu app abre con **tu nombre** (`tunegocio.com`) y con el **candadito de seguridad (HTTPS)** en la barra del navegador. Ese candado lo pone Vercel **solito y gratis**: no tienes que hacer nada para activarlo.

> [CAPTURA: la palomita verde "Valid Configuration" en Vercel + tu navegador mostrando tunegocio.com con el candadito — inserta aquí tu screenshot real]

---

## ✅ Checkpoint final del paso

- [ ] Tu dominio aparece en Vercel con **palomita verde**.
- [ ] Al escribir `tunegocio.com` en el navegador, **abre tu app**.
- [ ] También funciona con `www.tunegocio.com`.
- [ ] Ves el **candadito** (HTTPS) en la barra de direcciones.

Si las cuatro están palomeadas: **felicidades, tu negocio ya tiene su letrero con su nombre en internet.** Mándale el link a alguien por WhatsApp para presumirlo.

---

## 🆘 SI ALGO SALE MAL

**1) "Ya pasó rato y el DNS no propaga / sigue en amarillo."**
- Espera más. La propagación es lenta a veces; dale al menos 1 hora antes de preocuparte.
- Revisa que los registros estén **bien escritos**: el `@` en el registro A, el `www` en el CNAME, y los valores **idénticos** a los de tu pantalla de Vercel (sin espacios al inicio o al final).
- Vuelve a Vercel y aprieta **Refresh / Verify** otra vez. A veces solo necesita ese empujón.

**2) "Abre con `www` pero no sin `www` (o al revés)."**
- Esto pasa cuando falta uno de los dos registros. Necesitas **los dos**: el **A** para `tunegocio.com` (el nombre pelón, "apex") y el **CNAME** para `www.tunegocio.com`.
- Revisa tu panel DNS: ¿están los dos? Si falta uno, agrégalo según la tabla del Paso 3 y vuelve a verificar.
- En Vercel asegúrate de haber agregado **ambas versiones** del dominio (con y sin `www`).

**3) "Aparece un aviso de SSL / candadito pendiente."**
- El candadito (HTTPS) lo emite Vercel **automáticamente**, pero **solo después** de que el DNS quede en verde. Es lo último que se acomoda.
- No hagas nada manual con el SSL. Si el DNS ya está verde, espera unos minutos más y refresca la página de tu app. El candado aparece solo.

**4) "Le erré a un dato del DNS / pegué el valor que no era."**
- No pasa nada, se arregla. Entra al panel DNS de tu proveedor, **borra el registro mal** y vuelve a pegar el valor correcto (el que muestra TU pantalla de Vercel).
- Guarda y verifica de nuevo. El DNS es a prueba de errores: lo puedes corregir las veces que necesites.

**5) "Sigo atorado."**
- Pega esto en JARVIS: *"Conecté mi dominio en Vercel pero no me da la palomita verde. Estos son los registros DNS que puse: [pega lo que tienes]. Dime qué está mal y cómo arreglarlo, paso a paso."* Él te dice qué corregir.

---

> **Mini-glosario de este paso**
> - **Dominio:** el nombre de tu negocio (`tunegocio.com`). Tu letrero.
> - **DNS:** la guía telefónica de internet (dice dónde vive tu nombre).
> - **Registro A / CNAME:** las dos tarjetas que conectan tu nombre con tu local en Vercel.
> - **Propagación:** el tiempo que tarda internet en repartir tu nuevo nombre.
> - **HTTPS / candadito:** el sello de "sitio seguro". Vercel lo pone gratis y solo.

**Siguiente:** Paso 6 de 6 — medir de dónde llegan tus clientes (las etiquetas UTM) y pulir los últimos detalles de tu Máquina de Ventas.
