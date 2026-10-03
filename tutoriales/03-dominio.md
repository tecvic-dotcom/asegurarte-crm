# Etapa 5 — Conecta tu dominio (el letrero con tu nombre en la calle)

> **Paso 5 de 6 · ~15 min · necesitas:** tu app ya publicada en Vercel (etapa 4) + una tarjeta para comprar el dominio (~$200 MXN al año) + el panel de Vercel abierto.

Hasta ahora tu negocio vive en una dirección larga y prestada: algo como `tu-app.vercel.app`. Funciona perfecto, pero es como tener tu taquería en "Local 14-B, pasillo 3, plaza sin nombre". En esta etapa le pones **el letrero con tu nombre en la calle**: `tunegocio.com`. Más fácil de recordar, más serio, más tuyo.

> **¿Tienes prisa o presupuesto cero?** Esta etapa es **opcional**. Tu app ya está viva en su dirección `.vercel.app` y captura clientes igual de bien. Puedes saltarte a la etapa 6 y volver aquí cuando quieras. El letrero se pone cuando tú decidas.

---

## Antes de empezar: dos palabras, traducidas

- **Dominio** = el letrero con tu nombre en la calle (`tunegocio.com`). Es el nombre por el que la gente te encuentra.
- **DNS** = la guía telefónica de internet. Es la lista que dice "este nombre (`tunegocio.com`) apunta a este local (tu app en Vercel)". Cuando "conectas un dominio", solo estás dando de alta tu nombre en esa guía.

Eso es todo. Si entendiste el letrero y la guía telefónica, ya entendiste la etapa completa.

---

## Paso 1 de 5 — Compra tu dominio

**Para qué sirve:** apartar tu nombre para que nadie más lo use. Es tuyo mientras lo pagues, y suele ser barato al año.

1. Entra a una tienda de dominios. Las más usadas: **GoDaddy**, **Hostinger** o **Namecheap**. Cualquiera sirve.
2. En el buscador, escribe el nombre que quieres, por ejemplo `tunegocio.com`.
3. Si aparece **disponible**, agrégalo al carrito y págalo. Si está ocupado, prueba otra variante (`tunegocioya.com`, `.mx`, etc.).

> **¿Piden tarjeta? Sí.** Comprar un dominio siempre se paga; no hay versión gratis de esto.
> **Costo aproximado:** un `.com` cuesta entre **$180 y $350 MXN al año** (≈ 10 a 20 USD). El `.com.mx` anda parecido.
> **Cuidado con un truco común:** el primer año a veces lo ponen baratísimo (tipo $20) y al renovar sube. Mira el precio de **renovación**, no solo el de oferta. Y desactiva los extras que te quieran vender (protección de privacidad suele venir bien, lo demás casi nunca).
> **Que no te dé miedo:** es como rentar el letrero de tu negocio por un año. Lo pagas una vez, queda tuyo, y se renueva solo si tú quieres. Es el único costo obligatorio de todo el kit, y es de los más baratos.

**Checkpoint:** si salió bien, deberías ver una pantalla de "compra exitosa" y tu dominio listado como tuyo en la sección **My Domains / Mis dominios** de la tienda.

[CAPTURA: la sección "My Domains" con tu dominio recién comprado circulado en rojo — inserta aquí tu screenshot real]

---

## Paso 2 de 5 — Agrega el dominio dentro de Vercel

**Para qué sirve:** decirle a tu local "de hoy en adelante también respondes a este nombre".

1. En tu panel de Vercel, abre tu proyecto y entra a **Settings** (Configuración).

**Checkpoint:** si salió bien, deberías ver un menú lateral con varias opciones de configuración.

[CAPTURA: el menú lateral de Settings en Vercel — inserta aquí tu screenshot real]

---

## Paso 3 de 5 — Escribe tu dominio en Domains

**Para qué sirve:** registrar tu nombre nuevo en el panel, para que Vercel sepa a dónde quieres apuntar.

1. En ese menú lateral, haz clic en **Domains** (Dominios).
2. En el cuadro de texto, escribe tu dominio tal cual lo compraste: `tunegocio.com`.
3. Haz clic en **Add** (Agregar). Si Vercel te ofrece agregar también la versión con **`www`** (`www.tunegocio.com`), acéptala: es lo recomendado.

**Checkpoint:** si salió bien, Vercel te mostrará tu dominio en la lista con una marca de "pendiente" o "Invalid Configuration" en color naranja. **Eso es normal y es justo lo que esperamos** — todavía falta conectar la guía telefónica (paso 4). No te asustes con el "Invalid": significa "aún no terminas", no "lo hiciste mal".

[CAPTURA: el dominio agregado en Vercel mostrando el estado pendiente en naranja, circulado en rojo — inserta aquí tu screenshot real]

---

## Paso 4 de 5 — Copia los datos de DNS a tu tienda de dominios

**Para qué sirve:** dar de alta tu nombre en la guía telefónica de internet, para que apunte a tu local en Vercel. Vercel te muestra unos datos; tú los copias en la tienda donde compraste el dominio.

Vercel te enseña una tabla con **registros DNS**. Piensa en cada registro como una **tarjeta del directorio** que dice "este nombre vive en este número". Verás algo parecido a esto:

| Tipo | Nombre / Host | Valor a pegar |
|---|---|---|
| **A** (para el nombre raíz `tunegocio.com`) | `@` | `76.76.21.21` |
| **CNAME** (para `www.tunegocio.com`) | `www` | `cname.vercel-dns.com` |

1. Abre **otra pestaña** y entra a tu tienda de dominios (GoDaddy/Hostinger/Namecheap). Busca la sección **DNS** o **Manage DNS / Administrar DNS** de tu dominio.
2. Crea un registro **A**: en "Nombre/Host" pon `@`, y en "Valor" pega el número exacto que te muestra Vercel.
3. Crea un registro **CNAME**: en "Nombre/Host" pon `www`, y en "Valor" pega el texto exacto que te muestra Vercel.
4. Guarda los cambios.

> **REGLA DE ORO (léela dos veces):** copia **siempre el valor exacto que aparece en TU pantalla de Vercel**, no el de este manual. En 2026 Vercel a veces te da un CNAME **único de tu proyecto** (algo raro como `d1d4fc829.vercel-dns-017.com`). Si tu pantalla muestra algo distinto a lo de la tabla de arriba, **manda lo de tu pantalla**. La tabla es solo un ejemplo para que reconozcas la forma.
> **Truco anti-error:** si tu tienda ya tiene un registro viejo con el mismo Nombre/Host (`@` o `www`), edítalo en vez de crear uno duplicado. Dos tarjetas con el mismo nombre confunden a la guía telefónica.

**Checkpoint:** si salió bien, en el panel DNS de tu tienda deberías ver tus dos registros nuevos (uno tipo A y uno tipo CNAME) ya guardados en la lista.

[CAPTURA: el panel de DNS de tu tienda con los registros A y CNAME recién pegados, circulados en rojo — inserta aquí tu screenshot real]

---

## Paso 5 de 5 — Espera la propagación y verifica

**Para qué sirve:** la guía telefónica de internet tarda un rato en repartir tu nuevo número a todo el mundo. A eso se le llama **propagación**: es como cuando cambias de número de celular y tarda en que todos tus contactos lo tengan.

1. Regresa a la pestaña de Vercel.
2. Haz clic en **Refresh** o **Verify** (Actualizar / Verificar) junto a tu dominio.

> **No te preocupes si todavía sale naranja.** La propagación puede tardar **desde unos minutos hasta 48 horas** (casi siempre es cuestión de minutos). Es completamente normal y no significa que algo esté roto. Cierra la pestaña, ve por un café, y vuelve más tarde a darle **Refresh**. No tienes que repetir nada: ya está hecho, solo internet está repartiendo tu número.

**Checkpoint final:** cuando la propagación termine, Vercel pondrá una **palomita verde** que dice **"Valid Configuration"**. En ese momento:
- Tu app abre con **tu nombre** (`tunegocio.com`) desde cualquier teléfono del mundo.
- Vercel le pone solito el **candadito de seguridad (HTTPS)** — ese candado que sale junto a la dirección en el navegador y le dice a tus clientes "este sitio es seguro". No tienes que hacer nada para activarlo: es automático y gratis.

[CAPTURA: la palomita verde "Valid Configuration" en Vercel y el candadito junto a tu dominio en el navegador, circulados en rojo — inserta aquí tu screenshot real]

---

## Si algo se atora

- **Lleva horas en naranja y no cambia.** Revisa que el valor que pegaste en tu tienda sea **idéntico** al de tu pantalla de Vercel (sin espacios extra, sin un punto de más al final). Un solo carácter cambiado y la guía telefónica no encuentra tu local.
- **Vercel dice "Invalid Configuration" con un mensaje de qué falta.** Léelo: casi siempre te dice exactamente qué registro corregir. Ajusta ese dato en tu tienda y dale **Refresh** otra vez.
- **No encuentras la sección DNS en tu tienda.** Búscala como "DNS", "Manage DNS", "Administrar DNS", "Zona DNS" o "Registros". Está siempre dentro de los ajustes del dominio que compraste.
- **Quieres ayuda en español sin tocar nada.** Pega esto en Claude Code: *"Mi dominio en Vercel sigue en naranja. Dime paso a paso, en español sencillo, qué revisar en mi tienda de dominios para que apunte bien a mi app."*

---

## ✅ Etapa 5 lista

Le pusiste el letrero con tu nombre a tu negocio en internet. Tu app ya no es una dirección rara y prestada: es **tunegocio.com**, con candadito de seguridad incluido. Cuando salga la palomita verde, regresa a **EMPIEZA-AQUI.md**, tacha la etapa 5, y sigue con la **Etapa 6: prueba un lead real desde tu celular** — la prueba de fuego.
