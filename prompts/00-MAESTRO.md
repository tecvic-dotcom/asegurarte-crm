# 🟦 SUPERPROMPT MAESTRO — "AI Cash Machine"

> **Esto es lo único que tienes que pegar.** Un solo bloque. Lo copias completo,
> lo pegas en Claude Code (la ventana negra donde escribes), presionas Enter, y
> Claude construye TODO tu sistema: tu página para atraer clientes, tu libreta de
> clientes en la nube (CRM) y tu panel de control, y lo deja **publicado en
> internet** con tu nombre.
>
> **Analogía:** es como entregarle a un arquitecto un solo papel con todo lo que
> quieres, y que él construya la casa entera, le ponga el letrero en la calle y te
> entregue las llaves. Tú no pones un ladrillo: tú das la orden.

---

## ANTES DE PEGAR ESTO (3 cosas, 1 minuto)

1. **Abriste el kit en Claude Code.** Si no sabes cómo, lee primero
   `PASO-0-PREPARA-TU-COMPU.md`. (Si ya ves la ventana negra esperándote, vas bien.)
2. **Llenaste el formulario de tu negocio.** Abre `wizards/WIZARD-CONFIG.md`,
   responde las 18 preguntas, y al final copia el **bloque de tu negocio** que ese
   archivo te genera.
3. **Pega ese bloque justo aquí abajo**, en el espacio marcado `[[PEGA AQUÍ...]]`,
   ANTES de copiar todo este superprompt.
   - **Checkpoint visual:** si abajo, donde dice `Nombre del negocio:`, sigue
     diciendo `[[PEGA AQUÍ...]]`, **todavía no lo hiciste**. Vuelve al paso 3.

```
====================  TU NEGOCIO (pega tu bloque del wizard)  ====================
[[PEGA AQUÍ EL BLOQUE QUE TE DIO wizards/WIZARD-CONFIG.md — son ~18 líneas]]
=================================================================================
```

> Si pegaste tu bloque, ya puedes copiar de aquí **hasta el final del archivo** y
> pegarlo en Claude Code. Lo demás lo lee Claude, no tú.

---

## ⟦0⟧ ROL (esto se lo dices a Claude)

Eres un ingeniero full-stack experto y mi guía paciente. Yo soy un empresario que
**nunca abrió una terminal**. Tu trabajo: construir y **publicar en internet** mi
sistema completo (página de captura + página de gracias + CRM + panel de admin),
personalizado con MI negocio (el bloque de arriba), explicándome cada cosa
importante con palabras simples y una analogía cotidiana. La vara de medir:
*"mi tío de la taquería tiene que poder seguirte solo."*

## ⟦1⟧ CONTEXTO (el material con el que trabajas — no inventes)

- Estás dentro de la carpeta del kit **AI Cash Machine**. Todo lo que necesitas ya
  está aquí: arranca de estos archivos, no escribas la app desde cero.
- **Stack exacto (respétalo, no lo cambies):** Next.js **16.2.9** (App Router) ·
  React **19** · TypeScript · **Tailwind v4** · **Supabase** (`@supabase/supabase-js`) ·
  **Framer Motion** · **Iconify** (íconos a color) · **@dnd-kit** (kanban arrastrable) ·
  **pnpm** como gestor de paquetes.
- **Zod NO está instalado.** No lo agregues: usa la **validación manual** que ya trae
  el kit (normalizar correo y teléfono, deduplicar por correo/teléfono).
- **Marca LEGENDAR·IA (innegociable):** azul **`#2a22f5`**, tipografías
  **Montserrat + Inter**, estética **Liquid Glass**, íconos **Iconify a color**.
  **Cero hex hardcodeado**: usa los tokens de color del kit. **NUNCA** uses dorado,
  coral ni colores de otra marca.
- **Variables de entorno — nombres EXACTOS** (viven en `.env.local`, nunca en el
  navegador): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (llave **publicable**, segura de exponer), `SUPABASE_SECRET_KEY`
  (`sb_secret_…` o `service_role`; **solo servidor**), `SUPABASE_DB_PASSWORD`
  (solo para migraciones), `ADMIN_CODE` (solo servidor; valida la cabecera
  `x-admin-code`), `NEXT_PUBLIC_ADMIN_CODE` (solo **desbloquea la pantalla** de admin,
  **NO es seguridad**).
- **MODO DEMO:** si todavía no hay `SUPABASE_SECRET_KEY`, la app corre con datos de
  muestra en memoria (`cloudReady=false`). Eso es a propósito: deja que yo vea algo
  funcionando **antes** de conectar mi base real.

## ⟦2⟧ REGLA DE ORO: PII PRIMERO (la seguridad de mis clientes)

- Mi **libreta de clientes (leads) nunca se muestra al navegador.** Solo el servidor,
  con la llave secreta, puede leerla.
- En Supabase: **RLS activado y deny-by-default** (la bodega siempre con llave; sin
  puertas públicas). El cliente usa solo la llave **publicable**; el servidor usa la
  **secreta**.
- **El panel de admin se protege con `ADMIN_CODE` en el servidor** (la verdadera
  barrera, validada en CADA endpoint). `NEXT_PUBLIC_ADMIN_CODE` solo prende la
  pantalla. **Falla cerrado:** si no hay código configurado, NO dejes pasar a nadie.
- **Nunca** escribas un secreto dentro del código. **Nunca** me pidas pegar la llave
  secreta en un archivo que termine en internet.

---

## ⟦3⟧ LO QUE VAS A HACER, PASO POR PASO

Vas a ejecutar 7 etapas en orden. Cada etapa tiene su propio superprompt guía dentro
de la carpeta `prompts/` (úsalos como tu receta detallada de esa etapa). **Después de
cada etapa, párate y dime en una frase qué quedó listo y qué sigue, en lenguaje de mi
tío de la taquería.** No avances dos etapas sin avisarme.

### PASO 1 de 7 — Instalar y ver tu sistema "en tu cocina" (local)
- Lee mi bloque de negocio (arriba) y guíate por **`prompts/01-pagina-captura.md`**.
- Instala las dependencias del kit con **pnpm** (un solo comando) y arranca el
  servidor local.
- **Analogía:** *localhost = tu cocina.* Aquí cocinas y pruebas; todavía nadie de la
  calle lo ve.
- **Checkpoint:** dime exactamente qué dirección abrir en mi navegador
  (algo como `http://localhost:3000`) y qué debería ver: **mi página de captura ya
  con el nombre de mi negocio y mis colores de marca.**

### PASO 2 de 7 — Personalizar tu página de captura y tu página de gracias
- Con mi bloque de negocio, personaliza la **página de captura/ventas** siguiendo
  **`prompts/01-pagina-captura.md`**: hero claro, oferta, beneficios, prueba social,
  un CTA visible y repetido, y el **formulario (nombre, correo, teléfono)**.
- **Validaciones obligatorias en cliente Y servidor:** correo válido, teléfono MX
  (lada + 10 dígitos, acepta `+52`), nombre de 2+ letras, **honeypot anti-spam**,
  y errores en español amable.
- **UTMs:** captura las 5 etiquetas (`source/medium/campaign/term/content`) en la
  primera visita, guárdalas en sessionStorage, mételas como campos ocultos y
  **guárdalas en el mismo registro del lead**.
  - **Analogía:** *UTM = la etiqueta que dice de dónde llegó el cliente.*
- Personaliza la **página de gracias** con **`prompts/02-pagina-gracias.md`**:
  confirma el registro, refuerza la decisión, y pon el **botón a WhatsApp / grupo**.
  Ese enlace **no va hardcodeado**: se lee de una tabla `settings` y se edita desde el
  panel de admin.
- **Checkpoint:** llena tú mismo el formulario en local; deberías caer en tu página de
  gracias y ver tu botón de WhatsApp.

### PASO 3 de 7 — Tu libreta de clientes en la nube (Supabase)
- Guíame con **`prompts/03-supabase.md`** y con **`supabase/GUIA-SUPABASE.md`**.
- **Analogía:** *Supabase = tu libreta de clientes en la nube, ordenada y segura.*
- Pídeme, **una cosa a la vez**, que cree mi cuenta y mi proyecto en Supabase, corra
  el SQL de `supabase/migrations/0001_init.sql` (crea `leads`, `settings`, usuarios y
  el **RLS server-only**), y copie sus 3 llaves.
- Dime **dónde pegar cada llave** en `.env.local`, usando los nombres EXACTOS del §1.
  - **Analogía:** *variable de entorno = la combinación de tu caja fuerte.* No se la
    enseñas a nadie ni la subes a internet.
- **Checkpoint:** reinicia el servidor local; ahora `cloudReady=true`. Registra un
  lead de prueba y dime que ya aparece en Supabase de verdad (no en memoria).

### PASO 4 de 7 — El CRM y el panel de admin
- Monta el **CRM** siguiendo **`prompts/06-crm.md`**: vista **kanban arrastrable**
  (`@dnd-kit`) + **vista tabla estilo Excel**, **etapas reales** del embudo
  (configurables), **timeline de actividad** (nota/llamada/mensaje/correo/cita/pago),
  filtros, archivos por lead y **login multiusuario con contraseña real** (no la
  sesión de demo).
- Monta el **panel de admin**: editar el enlace de WhatsApp/grupo, **exportar leads a
  CSV**, gestionar usuarios y ver métricas básicas. Protégelo con `ADMIN_CODE` en el
  servidor (§2).
- **Marca:** todo en azul `#2a22f5` + Liquid Glass + íconos Iconify a color. Deja
  preparado (sin construir) un **espacio para avatares animados** que usaré en módulos
  futuros.
- **Checkpoint:** entra a tu CRM, arrastra tu lead de prueba de una columna a otra, y
  dime que el cambio se guardó.

### PASO 5 de 7 — Guardar tu trabajo en GitHub
- Guíame con **`prompts/07-github.md`**.
- **Analogía:** *GitHub = la fotocopiadora con historial.* Guarda una copia de tu
  proyecto con fecha; si algo se rompe, siempre puedes volver atrás.
- Pídeme crear mi cuenta de GitHub y subir el proyecto. **Confirma que `.env.local`
  está ignorado** y NO se sube (mis llaves se quedan en mi compu).
- **Checkpoint:** dime que mi proyecto ya está en github.com y que mis secretos NO
  viajaron con él.

### PASO 6 de 7 — Publicar en internet (Vercel)
- Guíame con **`prompts/04-vercel.md`**.
- **Analogía:** *Vercel = el restaurante abierto al público.* Lo que estaba en tu
  cocina ahora lo puede visitar cualquiera.
- Camino recomendado para mí (cero-tech): **importar mi repositorio de GitHub en el
  panel de Vercel** (así cada vez que actualice, se publica solo). Menciona el comando
  `vercel` como alternativa, pero no me lo impongas.
- Recuérdame **volver a pegar mis variables de entorno en Vercel** (mismos nombres del
  §1). La llave `SUPABASE_SECRET_KEY` y `ADMIN_CODE` van como **variables de servidor**.
- **Checkpoint:** dame mi dirección pública (algo como
  `mi-negocio.vercel.app`); ábrela en el celular y dime qué debería ver.

### PASO 7 de 7 — Tu dominio propio (tu letrero en la calle)
- Guíame con **`prompts/05-dominio.md`**.
- **Analogía:** *dominio = el letrero con tu nombre en la calle.*
- Pídeme, una cosa a la vez, conectar mi dominio en Vercel y, si hace falta, cambiar
  un par de datos donde compré el dominio. Espera a que se active el candado de
  seguridad (HTTPS).
- **Checkpoint:** abre mi dominio con `https://` y dime que el candado ya aparece.

---

## ⟦4⟧ CRITERIOS DE ACEPTACIÓN (no digas "listo" hasta cumplirlos)

- [ ] La app corre en local (`localhost`) con mi nombre de negocio y mis colores de marca.
- [ ] Página de captura con formulario validado en **cliente Y servidor**, honeypot y UTMs guardados en el mismo registro.
- [ ] Página de gracias con botón de WhatsApp **leído de `settings`** (editable desde admin), no hardcodeado.
- [ ] Supabase conectado con **RLS server-only**; un lead de prueba llega a la tabla `leads` con sus UTMs.
- [ ] CRM con login real multiusuario, kanban arrastrable + tabla, etapas, timeline, filtros y export CSV.
- [ ] Panel de admin protegido por `ADMIN_CODE` en el servidor (falla cerrado, sin atajos).
- [ ] Proyecto en GitHub **sin** `.env.local` (cero secretos subidos).
- [ ] Publicado en **Vercel** con variables de entorno repuestas; dominio propio con **HTTPS**.
- [ ] `pnpm build` en verde, `npx tsc --noEmit` limpio, `pnpm lint` limpio.
- [ ] **Aviso de privacidad (LFPDPPP)** con casilla de consentimiento **bloqueante antes de guardar el lead**.

**TEST DE LA VICTORIA (mi celebración):** *abro mi celular, entro a mi página, me
registro con mi propio nombre y me veo aparecer en vivo en mi CRM.* Cuando logre eso,
dímelo así de claro.

## ⟦5⟧ QUÉ NO HACER (líneas que no cruzas)

- ❌ No cambies el stack ni las versiones (sigue Next.js 16.2.9, Tailwind v4, pnpm).
- ❌ No instales Zod ni reemplaces la validación manual del kit.
- ❌ No uses dorado, coral ni colores de otra marca. Solo azul `#2a22f5` + Liquid Glass.
- ❌ No hardcodees hex en el código: usa tokens. No hardcodees el WhatsApp: va en `settings`.
- ❌ No pongas la lista de leads en el navegador. No expongas la llave secreta.
- ❌ No valides el admin solo en el cliente. No dejes un código por defecto.
- ❌ No construyas cobro real (Stripe/MercadoPago), chatbot/WhatsApp API ni dashboards
  financieros: eso llega en módulos siguientes. Deja el espacio para avatares, sin construirlos.
- ❌ No me encadenes dos pasos técnicos juntos. **Una sola acción por pantalla**, con
  su checkpoint. No me hables con jerga sin traducirla.
- ❌ No declares "terminado" sin pasar todos los criterios del §4.

---

## ⟦6⟧ 🆘 SI ALGO SALE MAL (los 5 tropiezos más comunes)

> Primero, respira: **es muy difícil que rompas algo de verdad.** Tu trabajo está
> guardado y casi todo se arregla con un paso. Si te trabas, pégale a Claude el
> mensaje rojo que viste y dile *"ayúdame con este error en lenguaje simple"*.

**1) "command not found: pnpm" (o "npm").**
   - *Qué pasó:* tu compu todavía no tiene la herramienta que instala el kit.
   - *Solución:* dile a Claude *"instálame pnpm paso a paso para mi sistema"* y sigue
     el único comando que te dé. Vuelve a intentar el Paso 1.

**2) La página carga pero los leads no se guardan / dice "modo demo".**
   - *Qué pasó:* todavía no pegaste tu `SUPABASE_SECRET_KEY`, así que la app está en
     **modo demo** (memoria), no en tu base real (`cloudReady=false`).
   - *Solución:* repite el Paso 3, pega las 3 llaves con los nombres EXACTOS en
     `.env.local`, **apaga y vuelve a prender** el servidor local. Reiniciar es la
     clave: las llaves solo se leen al arrancar.

**3) En Vercel sale "Internal Server Error" o el sitio se ve roto, aunque en tu cocina
   se veía bien.**
   - *Qué pasó:* casi siempre, **olvidaste repetir las variables de entorno en Vercel.**
     Tu cocina (local) y tu restaurante (Vercel) tienen cajas fuertes distintas.
   - *Solución:* en el panel de Vercel, **Settings → Environment Variables**, vuelve a
     pegar las mismas variables del §1 y manda republicar (redeploy). Las que dicen
     `SUPABASE_SECRET_KEY` y `ADMIN_CODE` van como servidor.

**4) El dominio "no abre" o muestra "no seguro" un rato después de conectarlo.**
   - *Qué pasó:* el letrero de la calle tarda en avisarle a todo el mundo dónde vives
     (propagación), y el candado de seguridad tarda unos minutos en activarse.
   - *Solución:* espera de 10 a 60 minutos y vuelve a abrir con `https://`. Si tras una
     hora sigue mal, pídele a Claude que revise contigo los datos del dominio en Vercel.

**5) El admin no te deja entrar (o sí entra, pero no carga los leads).**
   - *Qué pasó:* `NEXT_PUBLIC_ADMIN_CODE` solo prende la pantalla; la verdadera puerta
     es `ADMIN_CODE` en el servidor. Si no coinciden o falta una, te frena (a propósito:
     **falla cerrado** para proteger a tus clientes).
   - *Solución:* revisa que tengas las dos variables de admin, con un código **fuerte**
     (no el de ejemplo), iguales en local y en Vercel. Reinicia/republica y prueba.

---

## ⟦7⟧ CIERRE

Cuando termines las 7 etapas y pases todos los criterios del §4, dame el **resumen de
graduación** en lenguaje simple:
- mi dirección pública (dominio con HTTPS),
- dónde entro a mi CRM y con qué usuario,
- cómo edito mi enlace de WhatsApp desde el admin,
- y la frase de la victoria para que la haga yo mismo desde el celular.

> 📸 **[CAPTURA: tu CRM con tu primer lead real resaltado en azul — inserta aquí tu screenshot real]**

**Construye con calma, una etapa a la vez, y avísame en cada checkpoint. Empieza por el PASO 1.**
