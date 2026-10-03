<!--
  Color de marca LEGENDAR·IA: azul #2a22f5 (sin dorado/coral del Club).
  Escribir SIEMPRE "Vercel". Tono: celebración + calma, cero-tech.
  Superprompt 06 — El CRM. Se pega en Claude Code (dentro de tu proyecto JARVIS).
-->

# 06 · Tu CRM: la libreta de clientes que se ordena sola

**Paso 6 de 6 · ~25 min · necesitas:** Claude Code abierto en la carpeta del kit, tu cuenta de Supabase ya creada (la del prompt 03), y tus respuestas del wizard del CRM a la mano.

---

## Antes de pegar nada: ¿qué es un CRM, sin choro?

Imagina la libreta donde el de la ferretería anotaba quién le debía, quién regresaba el jueves por la pintura, y a quién había que llamarle porque "andaba interesado". Esa libreta era su tesoro.

**Un CRM es esa libreta, pero en la nube y con esteroides.** Es el lugar donde vive cada persona que levantó la mano por tu producto, en qué punto de la compra va, y qué sigue para cerrarla.

La mayoría de los negocios pierde dinero por una sola razón: **el cliente interesado se enfría porque nadie le dio seguimiento.** Te llegó por la página de captura (la del prompt 05) y ahí murió, porque andabas atendiendo a otros tres. El CRM existe para que eso no vuelva a pasar.

> **La página de captura es la red que atrapa peces. El CRM es la cubeta donde caen ordenados, vivos y listos para cocinar.** Tu libreta de clientes en la nube (Supabase) es esa cubeta con candado.

Una regla de oro de toda la certificación: **no estamos haciendo apps sueltas, estamos haciendo UNA app que crece.** Tu CRM nace DENTRO de JARVIS, junto a tu página de captura. Todo bajo el mismo techo.

---

## Cómo se usa este prompt (3 movimientos)

1. **Copia TODO el bloque gris de abajo.** Es largo a propósito: entre más claro, mejor te queda el CRM.
2. **Reemplaza los `[CORCHETES EN MAYÚSCULAS]`** con tus respuestas del wizard. Lo demás, déjalo igual.
3. **Pégalo en Claude Code** (dentro de tu proyecto JARVIS) y dale Enter. La IA construye; tú solo revisas y dices "sí, sigue".

Piénsalo como una sastrería: el wizard te tomó las medidas, este prompt es el papelito con tus medidas, y la IA es el sastre que corta y cose. Tú solo te pruebas el traje al final.

> **[CAPTURA: la ventana de Claude Code con el cursor parpadeando, lista para pegar — inserta aquí tu screenshot real]**

---

## EL SUPERPROMPT (copia desde aquí)

```text
Eres mi arquitecto de software senior. Vas a construir, DENTRO de mi proyecto
JARVIS que ya existe en esta carpeta, un CRM completo y funcional para mi
negocio. Yo NO sé programar. Háblame en español simple y avísame cuando
necesites que yo haga algo (copiar una llave, crear una cuenta). Trabaja paso a
paso y confírmame cada bloque terminado antes de seguir.

═══════════════════════════════════════════════
CONTEXTO — NO HAGAS UNA APP NUEVA
═══════════════════════════════════════════════
- Este CRM vive DENTRO de mi app JARVIS actual. NO crees un proyecto aparte.
- Ya tengo una PÁGINA DE CAPTURA funcionando (prompt 05). El CRM debe recibir
  AUTOMÁTICAMENTE los leads que llegan por esa página.
- Stack obligatorio (ya instalado, reúsalo, no dupliques):
  Next.js 16.2.9 App Router + React 19 + TypeScript + Tailwind v4 +
  @supabase/supabase-js + Framer Motion + Iconify (iconos a color) + @dnd-kit.
  Gestor de paquetes: pnpm. Zod NO está instalado: valida a mano con funciones
  simples, no agregues librerías nuevas sin avisarme.
- Marca LEGENDAR·IA: azul de marca #2a22f5, tipografías Montserrat (títulos) e
  Inter (texto), estética Liquid Glass, iconos a color de Iconify. CERO colores
  escritos a mano en el código: usa los tokens/variables de marca que ya existen.
  NUNCA uses dorado ni coral.
- Comenta el código en español sencillo, para que un no-técnico entienda qué hace
  cada parte.

═══════════════════════════════════════════════
1) MI NEGOCIO
═══════════════════════════════════════════════
- Nombre del negocio: [RESPUESTA 1.1]
- A qué se dedica: [RESPUESTA 1.2]
- Qué vende y precios: [RESPUESTA 1.3]
- Cliente ideal: [RESPUESTA 1.4]
- Canales de contacto actuales: [RESPUESTA 1.5]
- Estilo/colores (dentro de la marca azul LEGENDAR·IA): [RESPUESTA 1.6]

═══════════════════════════════════════════════
2) LOS LEADS (la ficha de cada cliente)
═══════════════════════════════════════════════
Cada lead guarda SIEMPRE estos datos base:
  Nombre, Teléfono/WhatsApp, Correo, Etapa, Fuente, Fecha de entrada,
  Vendedor asignado, Valor estimado de la venta, y Notas (un historial donde
  cada apunte queda con su fecha y hora, no se borra el anterior).

Además guarda las ETIQUETAS DE ORIGEN (UTMs) que vengan en el link:
  utm_source, utm_medium, utm_campaign. Son la etiqueta que dice de dónde llegó
  el cliente. La página de captura ya las manda; tú solo guárdalas.

Campos extra de MI negocio (si no tengo, ignora):
[RESPUESTA 4.1]
Campos obligatorios para poder guardar un lead:
[RESPUESTA 4.2]

La ficha del lead debe tener un botón "Abrir WhatsApp" que abra el chat con ese
número, y el campo de notas con fecha automática en cada apunte.

═══════════════════════════════════════════════
3) LAS ETAPAS DEL PIPELINE (configurables, no fijas)
═══════════════════════════════════════════════
El "pipeline" es la tubería por donde pasa un cliente desde que te conoce hasta
que te paga. Usa estas etapas en este orden (puedo cambiarlas después desde
AJUSTES, sin tocar código):
[PEGA AQUÍ TUS ETAPAS — RESPUESTA 2.1]
Si no las pegué, usa estas 6 por defecto:
  Nuevo → Contactado → Cita → Propuesta → Cerrado-Ganado → Cerrado-Perdido

Etapa(s) donde se enfrían mis clientes (úsalas para alertas):
[RESPUESTA 2.2]

Guarda las etapas en una tabla aparte para que sean EDITABLES desde la pestaña
AJUSTES (cambiar nombre, color, orden, agregar o quitar). El pipeline NUNCA debe
quedar escrito a fuego en el código.

═══════════════════════════════════════════════
4) DOS VISTAS DEL MISMO TABLERO
═══════════════════════════════════════════════
Quiero ver mis leads de DOS maneras, con un botón para cambiar entre ellas:

  A) VISTA KANBAN (la principal): columnas, una por etapa, con tarjetas que
     ARRASTRO con el mouse de una columna a otra usando @dnd-kit. Al soltar la
     tarjeta, la etapa se guarda sola en Supabase. Cada tarjeta muestra: nombre,
     WhatsApp, fuente, vendedor y "días sin movimiento". Las tarjetas sin
     movimiento por X días (ver sección 7) se ponen en rojo.

  B) VISTA TABLA estilo Excel: filas y columnas ordenables, con buscador arriba
     y filtros por etapa, fuente y vendedor. Para quien prefiere ver todo en lista.

Ambas vistas leen los mismos leads de Supabase. Cambiar de vista NO cambia los
datos, solo cómo los veo.

═══════════════════════════════════════════════
5) TIMELINE DE ACTIVIDAD (la historia de cada cliente)
═══════════════════════════════════════════════
Dentro de la ficha de cada lead, muestra una LÍNEA DE TIEMPO (timeline) de arriba
hacia abajo con todo lo que pasó, lo más reciente primero:
  - cuándo entró y de qué fuente,
  - cada cambio de etapa (de "Nuevo" a "Contactado", etc.),
  - cada nota que se escribió,
  - quién hizo cada cosa y a qué hora.
Esto se llena solo cada vez que alguien mueve o anota algo. Es la memoria del
cliente: nunca se borra.

═══════════════════════════════════════════════
6) MULTIUSUARIO CON LOGIN REAL (con contraseña, no la demo)
═══════════════════════════════════════════════
- Quiero LOGIN DE VERDAD: cada persona entra con su CORREO y su CONTRASEÑA,
  usando la autenticación de Supabase (Supabase Auth). Esto NO es el modo demo
  sin contraseña: es acceso real, cada quien con su cuenta. Nadie ve nada sin
  iniciar sesión.
- Crea pantallas de "Iniciar sesión" y "Olvidé mi contraseña".
- CUENTA ADMINISTRADOR (la llave maestra: ve y edita todo, da de alta y de baja
  vendedores, borra cosas, edita etapas y campos):
  [RESPUESTA 3.1 — mi correo de admin]
- Otros usuarios (vendedores) a crear:
  [RESPUESTA 3.2 — nombre, correo y rol de cada uno]
- Regla de visibilidad: [RESPUESTA 3.3 — cada vendedor ve solo lo suyo / todos ven todo]
- Pantalla "EQUIPO" (solo admin): invitar gente nueva por correo, asignar rol,
  dar de baja.

SEGURIDAD (esto es lo más importante, no lo saltes):
- La base de leads NUNCA se expone al navegador. El cliente (el navegador) solo
  usa la llave PÚBLICA (NEXT_PUBLIC_SUPABASE_ANON_KEY). Cualquier lectura o
  escritura sensible pasa por el SERVIDOR usando la llave secreta
  (SUPABASE_SECRET_KEY), que JAMÁS se manda al navegador.
- Activa Row Level Security (RLS) en TODAS las tablas, con regla "negar por
  defecto" (deny-by-default): nadie ve ni toca una fila salvo que una política lo
  permita explícitamente. Un vendedor NUNCA debe ver leads que no le tocan, ni
  aunque manipule el navegador. El admin sí ve todo.
- Si yo todavía no pegué la llave secreta (SUPABASE_SECRET_KEY), la app debe
  correr en MODO DEMO (datos en memoria, cloudReady=false) y avisarme en pantalla
  con un letrero suave: "Estás en modo demo: practica libre, nada se guarda en la
  nube todavía". En cuanto pegue la llave, pasa a modo nube real.

═══════════════════════════════════════════════
7) FILTROS Y AUTOMATIZACIONES (lo que el CRM hace solito)
═══════════════════════════════════════════════
- Filtros (en ambas vistas): por etapa, por fuente, por vendedor, por "en rojo".
- Al entrar un lead nuevo: [RESPUESTA 6.1]
- Alerta de enfriamiento: si un lead lleva X días sin movimiento, ponlo en rojo
  y muéstralo en la pestaña SEGUIMIENTO. Detalle: [RESPUESTA 6.2]
- Resumen periódico: [RESPUESTA 6.3]
- Cadencia de seguimiento sugerida (ritmo de toques): [RESPUESTA 6.4]
  Si propones una cadencia, déjala en la ficha del lead como lista de pasos con
  casillas que pueda ir palomeando.

═══════════════════════════════════════════════
8) LAS PESTAÑAS DEL CRM (el menú de arriba)
═══════════════════════════════════════════════
  1. TABLERO — Kanban + botón para cambiar a vista Tabla (pantalla principal).
  2. LEADS — lista completa con buscador y filtros.
  3. CONTACTOS — clientes ya ganados, para recompra y referidos.
  4. CAMPAÑAS — desempeño por fuente/campaña: cuántos leads y cuántas ventas
     trajo cada canal, con porcentajes. Aquí se ven los UTMs en cristiano.
  5. SEGUIMIENTO — a quién le toca contactar HOY y qué leads están en rojo.
  6. TABLERO DE CONTROL — números GRANDES (se leen desde el celular): leads
     nuevos del mes, ventas cerradas, dinero vendido, % de cierre.
  7. EQUIPO — (solo admin) alta/baja de vendedores.
  8. AJUSTES — (solo admin) editar etapas, fuentes y campos SIN tocar código.

═══════════════════════════════════════════════
9) CONEXIÓN CON LA PÁGINA DE CAPTURA (prompt 05) — CRÍTICO
═══════════════════════════════════════════════
- La página de captura YA existe en este proyecto. Conéctala para que CADA vez
  que alguien llena el formulario, se cree solo un lead nuevo en la etapa "Nuevo",
  guardado en Supabase, a través del servidor (con la llave secreta), nunca
  exponiendo la base al navegador.
- Guarda los UTMs (utm_source, utm_medium, utm_campaign) que vengan en el link,
  para saber canal y campaña de origen sin que yo escriba nada.
- Si la captura aún no manda los datos a Supabase, deja TÚ esa conexión de punta a
  punta y pruébala metiendo un lead de ejemplo. Muéstrame que aparece solo.

═══════════════════════════════════════════════
10) CONEXIÓN CON JARVIS (mi centro de mando) + DICTADO POR VOZ
═══════════════════════════════════════════════
JARVIS ya existe en este proyecto. El CRM es una de sus habitaciones.
- Pon en el TABLERO DE CONTROL un botón/CTA visible "Preguntarle a JARVIS" que
  abra la consola de JARVIS con el contexto del CRM ya cargado.
- DICTADO POR VOZ: en esa consola, agrega un botón de micrófono que use la
  Web Speech API del navegador con idioma es-MX (español de México), para que yo
  hable y JARVIS me entienda. Si el navegador no soporta voz, muestra el cuadro
  de texto normal y un aviso suave (nada de errores feos).
- Cosas que quiero preguntarle a JARVIS: [RESPUESTA 7.1]
- Qué puede MOVER JARVIS vs. qué solo consulta: [RESPUESTA 7.2]
- Avisos proactivos de JARVIS: [RESPUESTA 7.3]
- Implementación: JARVIS toca el CRM SOLO a través de funciones del servidor que
  respetan el login y los roles (RLS). JARVIS nunca lee ni mueve datos saltándose
  la seguridad de Supabase.

═══════════════════════════════════════════════
11) SLOT DE AVATARES DE EMPLEADOS DIGITALES (solo el hueco, NO los construyas)
═══════════════════════════════════════════════
En el TABLERO DE CONTROL, deja un ESPACIO VISUAL reservado (un slot) con el
título "Mi equipo de empleados digitales" y un texto suave: "Próximamente: aquí
vivirán tus avatares animados (Módulo 3)". Que se vea bonito y de marca, pero NO
construyas los avatares ni traigas librerías de 3D ni de video. Es solo el cajón
vacío, listo para el Módulo 3. No gastes tiempo aquí.

═══════════════════════════════════════════════
12) PERSISTENCIA EN SUPABASE
═══════════════════════════════════════════════
Todo se guarda en Supabase (mi libreta de clientes en la nube), con RLS activado.
Tablas mínimas: leads, notas (timeline), usuarios/roles, etapas, campañas/fuentes.
Comenta cada tabla en español. Si falta la llave secreta, modo demo en memoria
(sección 6).

═══════════════════════════════════════════════
13) CÓMO QUIERO QUE TRABAJES (paso a paso, a prueba de errores)
═══════════════════════════════════════════════
Sigue este orden y DETENTE a confirmar conmigo al final de cada paso:

PASO 1. Resúmeme con tus palabras qué vas a construir y muéstrame el mapa de las
        tablas (en español, sin tecnicismos). Espera mi OK.
PASO 2. Crea las tablas en Supabase con RLS deny-by-default. Dame el bloque exacto
        que debo pegar y dime DÓNDE pegarlo, con pasos numerados a prueba de tontos.
PASO 3. Construye el login real con contraseña y la cuenta de administrador.
PASO 4. Construye las 8 pestañas. Empieza por el TABLERO (Kanban + Tabla) y LEADS.
PASO 5. Conecta la página de captura (prompt 05). Prueba con un lead de ejemplo y
        muéstrame que aparece solo en la etapa "Nuevo".
PASO 6. Activa filtros, automatizaciones, timeline, conexión con JARVIS + voz, y
        deja el slot de avatares (sin construirlos).
PASO 7. Dame una LISTA DE VERIFICACIÓN final en español para comprobar, con mis
        propios clics, que todo jala.

Reglas durante todo el proceso:
- Si algo me toca a mí (copiar una llave, crear una cuenta), DETENTE y dame
  instrucciones numeradas clarísimas. Espera a que te diga "listo".
- Maneja TODOS los errores con mensajes amables en español (ej. "Falta el
  WhatsApp, escríbelo para guardar").
- NUNCA guardes contraseñas ni llaves dentro del código a la vista: usa variables
  de entorno y avísame cuáles pegar.
- CERO colores escritos a mano: usa los tokens de marca (azul #2a22f5), NUNCA
  dorado ni coral.
- Todo el texto que vea el usuario final va en español y con letra grande.

Empieza por el PASO 1. No avances solo: confírmame cada paso.
```

## (termina de copiar aquí)

---

## Las variables de entorno que la IA te va a pedir (explicadas con calma)

Una "variable de entorno" es **la combinación de tu caja fuerte**: un dato secreto que la app usa, pero que NO se escribe dentro del código a la vista. Van en un archivo `.env.local`. La IA te dice cuáles pegar; aquí están en cristiano:

| Variable | En cristiano | ¿Es secreta? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | La dirección de tu libreta en la nube. | No, es pública y segura de mostrar. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | La llave pública (publicable). El navegador la usa; es segura de exponer. | No. |
| `SUPABASE_SECRET_KEY` | La llave secreta (empieza con `sb_secret_...`). **Solo el servidor.** Sin ella, el CRM corre en MODO DEMO. | **Sí. Jamás la compartas.** |
| `SUPABASE_DB_PASSWORD` | La contraseña de la base de datos. Solo se usa para preparar las tablas. | **Sí.** |
| `ADMIN_CODE` | El código que el servidor revisa para acciones de admin. | **Sí.** |
| `NEXT_PUBLIC_ADMIN_CODE` | Solo desbloquea botones en pantalla. **No es seguridad de verdad**, solo comodidad. | No. |

> **Calma:** si todavía no pegas `SUPABASE_SECRET_KEY`, no pasa nada. El CRM arranca en modo demo (datos en memoria, `cloudReady=false`) y tú practicas sin miedo. Cuando estés listo, pegas la llave y se conecta a la nube real.

> **[CAPTURA: el archivo .env.local con las variables pegadas, los valores tapados en negro — inserta aquí tu screenshot real]**

---

## CRITERIOS — sabes que quedó bien si...

- [ ] Entras al CRM con **correo y contraseña reales** (no es la demo sin clave). Sin login, no ves nada.
- [ ] El **TABLERO Kanban** te deja **arrastrar** una tarjeta de "Nuevo" a "Contactado" y, al recargar, **siguió ahí** (se guardó sola).
- [ ] El botón **"Vista Tabla"** muestra los mismos leads en lista estilo Excel, con buscador y filtros por etapa, fuente y vendedor.
- [ ] Llenas tu **página de captura** y aparece **solo** un lead nuevo en la etapa "Nuevo", con su **etiqueta de origen** (UTM) visible en CAMPAÑAS.
- [ ] La **ficha de un lead** muestra su **timeline** (entró → cambió de etapa → notas), con fecha y hora.
- [ ] Las **etapas se editan desde AJUSTES** (nombre, color, orden) sin tocar código.
- [ ] Un vendedor de prueba **NO ve** los leads de otro (RLS funcionando). El admin **sí ve todo**.
- [ ] El botón **"Preguntarle a JARVIS"** abre la consola y el **micrófono** te escucha en español de México.
- [ ] El TABLERO DE CONTROL muestra números **grandes** (leads del mes, ventas, dinero, % de cierre) y el **slot de avatares** dice "Próximamente (Módulo 3)".
- [ ] Todo se ve **azul de marca**, limpio, Liquid Glass. **Cero dorado, cero coral.**

---

## LO QUE NO HACES (para no romper tu propia máquina)

- **No** creas un proyecto nuevo. El CRM vive **dentro de JARVIS**, junto a tu página de captura.
- **No** construyes los avatares animados aquí: eso es Módulo 3. Solo dejas el **hueco** reservado.
- **No** uses la **llave secreta** (`SUPABASE_SECRET_KEY`) en el navegador ni la pegues en ningún chat, correo o captura de pantalla. Solo va en el servidor.
- **No** confundas `NEXT_PUBLIC_ADMIN_CODE` con seguridad: **no protege nada**, solo prende botones. La seguridad real es `ADMIN_CODE` + RLS en el servidor.
- **No** dejes el login sin contraseña (eso era la demo). Aquí queremos **auth real**.
- **No** metas colores escritos a mano ni el **dorado/coral del Club**. Solo el azul `#2a22f5` por tokens.
- **No** agregues librerías nuevas (Zod, etc.) sin avisarte: la validación se hace a mano.
- **No** publiques tu lista de leads al navegador. La base **nunca** se expone: el servidor entra con la llave secreta, el cliente solo con la pública.

---

## 🛟 SI ALGO SALE MAL

**"El CRM dice MODO DEMO y no guarda nada."**
Te falta pegar la `SUPABASE_SECRET_KEY` en `.env.local`. Es normal al principio. Pega tu llave secreta, apaga y vuelve a prender el servidor (en Claude Code escribe "reinicia el servidor"), y pasa a modo nube. Es como abrir tu caja fuerte: sin la combinación, queda cerrada.

**"Arrastro una tarjeta pero al recargar se regresa."**
La etapa no se está guardando en la nube. Dile a Claude Code: *"al soltar la tarjeta en el Kanban, guarda la nueva etapa en Supabase y confírmamelo con un lead de prueba"*.

**"Lleno la página de captura y no aparece el lead."**
La conexión captura → CRM no quedó. Dile: *"conecta mi página de captura del prompt 05 para que cada registro cree un lead en la etapa Nuevo, y pruébalo con un lead de ejemplo"*.

**"Un vendedor ve leads que no le tocan."**
Falla la puerta con llave de tu bodega (RLS). Dile: *"revisa que el Row Level Security esté en deny-by-default: cada vendedor ve solo lo suyo, el admin ve todo. Pruébalo con dos cuentas"*. **Esto es seguridad: no sigas hasta que cierre.**

**"El micrófono de JARVIS no me oye."**
Tu navegador puede no soportar voz, o no le diste permiso de micrófono. Usa Google Chrome, acepta el permiso cuando lo pida, y si aun así no jala, usa el cuadro de texto (funciona igual). Dile a Claude Code: *"deja el dictado por voz en es-MX y, si el navegador no lo soporta, muestra el cuadro de texto sin error feo"*.

**"Pedí publicar y no sé cómo."**
Lo más fácil para alguien cero-tech: sube tu proyecto a **GitHub** (la fotocopiadora con historial) e **importa el repo desde el panel de Vercel**; con eso, cada cambio que subas se publica solo. Si prefieres, el comando `vercel` desde la terminal también publica. La IA te guía por cualquiera de los dos.

**"Sigo atorado."**
Copia el mensaje rojo que veas y pégaselo a Claude Code con esta frase: *"me salió este error, explícame en español qué pasó y arréglalo paso a paso"*. Casi siempre lo resuelve a la primera. Respira: nada se rompe, todo se puede volver a intentar.

---

## El círculo completo (para que veas la película entera)

```
   📱 Alguien ve tu reel hecho con IA
              │
              ▼
   🪝 Hace clic y llega a tu PÁGINA DE CAPTURA (prompt 05) → deja nombre + WhatsApp
              │
              ▼
   📥 Cae solo como LEAD en tu CRM, etapa "Nuevo" (con su UTM: ya sabes que vino de Instagram)
              │
              ▼
   🤖 JARVIS te avisa: "Entró un lead nuevo, le toca a Mariana"
              │
              ▼
   📊 Lo arrastras por el TABLERO hasta "Cerrado-Ganado"
              │
              ▼
   💰 Vendiste. Y todo quedó registrado, ordenado y tuyo.
```

Eso es **tu máquina de ventas**: el embudo atrae, la página captura, **el CRM ordena y cierra.**

> **Tu tarea de esta lección:** contesta el wizard, arma este superprompt, pégalo en JARVIS y deja tu CRM publicado con un lead de prueba dentro. Cuando veas esa primera tarjetita aparecer sola en tu tablero porque alguien llenó tu página de captura, ahí vas a entender de qué se trata todo esto. 🔵
