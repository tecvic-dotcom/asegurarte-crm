# AI Manager (Módulo 3) — instalado en tu CRM

> Tu negocio, administrado con IA **dentro de tu propio sistema**. No es otra app: es el siguiente cuarto de la misma casa.

## Qué quedó instalado (la analogía del coche)

| Pieza del kit | Qué es en tu CRM | Analogía |
|---|---|---|
| **Director Financiero IA** | Tabla segura `finanzas_movimientos` en tu Supabase + sección **Movimientos** en el Panel (registrar, confirmar, editar, borrar). Y Claude Code ordena tus estados de cuenta (prompt fijo abajo). | La gasolina del tanque |
| **Panel de Mando** | Pestaña **Panel de Mando**: reporte de una frase, 4 números grandes (pólizas vs meta, cuánto entró, cuánto salió, lo que te quedó), tu meta por ramo, entró vs salió por mes y en qué se te va el dinero. Se actualiza solo cada minuto. | El tablero |
| **Agente-Manager** | Pestaña **Robert**: tu gerente digital con avatar. Lee los mismos números del Panel y te responde con recomendación + porqué + riesgo + qué hacer hoy. | El copiloto |
| Extra para tu meta | Cada prospecto tiene **Ramo** (vida, GMM, ahorro, autos, hogar) y fecha de cierre automática al pasarlo a “Cliente ganado”. | El odómetro de tu meta |
| **Valeri (cobranza)** | Pestaña **Valeri · Cobranza**: tu cartera de pólizas y, cada día, a quién cobrarle primero (vencidas, por vencer, promesas, renovaciones) con el WhatsApp listo. Botones: **Pagó** (avanza al siguiente recibo), **Promesa** y **Ya le recordé**. No usa IA: cuesta $0. | El cobrador que nunca olvida |
| **Crecimiento** | Pestaña **Crecimiento**: prima pagada, comisión o número de pagos por año y mes a mes, por ramo, comparando el año en curso contra los **mismos meses** del anterior. Se alimenta de los reportes de prima pagada de la aseguradora (tabla `produccion_mensual`, migración `0005_produccion.sql`, solo totales sin clientes). Las comisiones de esos reportes también entran a tus finanzas (“Cuánto entró”). | El historial del odómetro |
| **Clara (reportes)** | Pestaña **Clara · Reportes**: cada **día 1** el cierre del mes y, al terminar cada trimestre, el del **trimestre** (ventas vs meta, prospectos, dinero, cobranza, producción de la aseguradora y **3 focos**). Botones **Copiar**, **WhatsApp** y **PDF**. Puedes ver meses y trimestres anteriores. Un cuarto botón, **Clientes por ramo**, arma el listado de tus pólizas (ver abajo). No usa IA: cuesta $0 (solo el lector de PDF de las renovaciones lee con IA). | La secretaria que te deja el resumen en el escritorio |

Para actualizarla cada mes: descarga el reporte de prima pagada por ramo y pídele a Claude Code *“carga mi producción del mes en Crecimiento”*.

Solo el **administrador** ve el Panel, a Robert, a Valeri y a Clara. Un vendedor de tu equipo no ve tus números ni tu cartera.

---

## Para encenderlo: 3 pasos (una sola vez)

1. **Supabase (2 min):** Supabase → tu proyecto → **SQL Editor** → **New query** → pega todo `supabase/migrations/0003_ai_manager.sql` → **Run**. Debe decir “Success”.
   *Mientras no lo corras, tu CRM sigue funcionando igual; el Panel te muestra este mismo paso.*
2. **Llave de IA para Robert (5 min):** entra a **console.anthropic.com** → API Keys → crea una llave. **Ponle un límite de gasto mensual** (Billing → Limits). Pégala:
   - en tu `.env.local`, en el renglón `ANTHROPIC_API_KEY=` (ya está listo, solo pega), y
   - en **Vercel → Settings → Environment Variables** como `ANTHROPIC_API_KEY` (y opcional `RORO_TOPE_MENSUAL=200`).
3. **Publicar:** pídele a Claude Code *“sube a GitHub los cambios del AI Manager”*. Vercel lo publica solo.
4. **Valeri (2 min):** igual que el paso 1, pero con el archivo `supabase/migrations/0004_cobranza.sql`. Mientras no lo corras, la pestaña de Valeri te muestra este mismo paso.

**✔ Checkpoint:** abres tu CRM y arriba ves a Robert con “reporte de hoy”. En **Panel de Mando** ves tus 4 números. En **Robert** tocas “¿Voy a llegar a mi meta…?” y te contesta con tus cifras.

---

## Tu hábito diario (2 minutos)

1. Abre el CRM y lee el **reporte de una frase** (arriba).
2. ¿Cerraste una venta? Pásala a **Cliente ganado** y ponle su **Ramo** (si no, no cuenta para tu meta; el Panel te avisa).
3. ¿Te pagaron una comisión o gastaste? **Panel → Registrar** (10 segundos).
4. ¿Dudas para decidir? Pregúntale a **Robert**. Él propone; tú decides.
5. Abre **Valeri · Cobranza**: envía los WhatsApp que te deja listos (los mandas tú) y marca **Pagó** o **Promesa** según te contesten. ¿Cerraste una venta? En el expediente del cliente ganado toca **“Agregar su póliza a cobranza”**.
6. **Día 1 de cada mes:** abre **Clara · Reportes**, lee los 3 focos del mes y, si quieres, mándatelo o compártelo con **WhatsApp**. **Al cerrar un trimestre:** cambia a **Trimestral**. Para el cierre del mes (carga antes el reporte de prima pagada del mes para que salga tu producción).

### Una vez al mes: tu Director Financiero (prompt fijo para Claude Code)

Copia esto en Claude Code, dentro de la carpeta de tu CRM, y pega abajo tu estado de cuenta o tus estados de comisiones **tal cual** (puedes tapar números de cuenta completos):

```
Eres mi Director Financiero IA. Abajo te pego mis movimientos de [MES] tal cual.
1) Ordénalos en movimientos: fecha, concepto, entró/salió, categoría y ramo (si es comisión).
   Lo ambiguo márcalo "por confirmar": no inventes nada.
2) Concílialos contra lo que ya registré ese mes en mi Panel: dime qué falta, qué sobra
   y qué parece duplicado o comisión bancaria.
3) Enséñame la tabla limpia y espera mi OK.
4) Con mi OK, guárdalos en mi CRM (tabla finanzas_movimientos) y dime en una frase
   cómo cerró el mes y qué revisar mañana.
[PEGA AQUÍ TUS MOVIMIENTOS]
```

---

## Cuánto cuesta

- **Panel de Mando:** $0. No usa IA; son cálculos de tu propio sistema.
- **Robert:** usa el modelo de Claude `claude-opus-5-5` y cobra por uso. Estimado: **unos centavos de dólar por pregunta (≈ $1 MXN)**; depende de qué tan larga sea la plática.
- **Frenos que ya tiene:** máximo **200 preguntas al mes** (cámbialo con `RORO_TOPE_MENSUAL`) y máximo 6 por minuto. Verás “Preguntas este mes: X de 200” en su pestaña. El límite de gasto en console.anthropic.com es tu segundo candado.

## Seguridad (ya cuidada)

- Tus tablas nuevas tienen el mismo candado que las demás (RLS sin acceso público). Solo tu servidor entra, y solo con sesión de administrador.
- La llave de IA vive solo en el servidor (nunca en el navegador).
- A la IA **solo le llegan totales**: nunca nombres, teléfonos ni correos de tus clientes.
- Robert no mueve dinero ni manda mensajes: recomienda y tú aprietas el gatillo.

---

## Cómo agrego un número nuevo al Panel

Dile a Claude Code, por ejemplo: *“Agrégame al Panel de Mando una tarjeta con la prima promedio por póliza ganada este mes”*. (Los cálculos viven en `lib/panel.ts`; la pantalla en `components/crm/panel/`.)

## Cómo creo mi siguiente empleado digital

Valeri (cobranza) y Clara (reportes) ya están trabajando. Para el siguiente, pídele a Claude Code algo como: *“Créame mi empleado digital de seguimiento a prospectos, que viva junto a Robert”*.

¿Tienes tu cartera en Excel? Pídele a Claude Code: *“carga mi cartera de este Excel en Valeri”*. Te preguntará qué columnas usar antes de guardar nada.

---

## Si algo sale mal

| Lo que ves | Qué hacer |
|---|---|
| “Falta 1 paso para encender tu AI Manager” | Corre el SQL del paso 1. |
| “Falta 1 paso para encender a Valeri” | Corre `0004_cobranza.sql` (paso 4). |
| Clara dice “sin registrar” en Lo que te quedó | No hay comisiones ni gastos en ese periodo: regístralos en el Panel. |
| Clara dice “Aún no está cargado el reporte de prima pagada” | Pásale a Claude Code el reporte del mes: *“carga mi producción del mes en Crecimiento”*. |
| Las pólizas cerradas de Clara salen en 0 | Clara cuenta los prospectos que pasas a **Cliente ganado** (con su fecha de cierre). |
| Valeri no muestra el botón de WhatsApp | A esa póliza le falta el WhatsApp: toca “Agregar WhatsApp”. |
| “Robert todavía no tiene su llave de IA” | Paso 2 (y vuelve a publicar si fue en Vercel). |
| “Tu cuenta de IA se quedó sin saldo” | Recarga en console.anthropic.com → Billing. |
| “Llegaste al tope de preguntas” | Espera al mes siguiente o sube `RORO_TOPE_MENSUAL`. |
| Los montos salen en $0 | No hay movimientos registrados en ese periodo: “sin registrar” no es “cero”. |
| Una venta no cuenta en tu meta | Revisa que esté en “Cliente ganado” y que tenga **Ramo**. |
| En tu compu (`pnpm dev`) se ven estilos viejos | Borra la carpeta `.next/dev/cache` y vuelve a correr `pnpm dev`. |

## Clara · Clientes por ramo (listado con acciones)

En **Clara** toca el botón **Clientes por ramo**: es tu cartera de pólizas (la misma de Valeri) agrupada por ramo, con **nombre, aseguradora, WhatsApp, vigencia y estatus**. Arriba filtras por ramo, buscas, filtras por estatus (pago vencido, por vencer, por renovar…) y puedes **Copiar**, mandar por **WhatsApp**, bajar en **Excel (CSV)** o sacar el **PDF**.

A un costado de cada renglón están los 5 botones de acción:

| Botón | Qué hace |
|---|---|
| ✏️ **Editar** | La misma ficha de Valeri: datos, montos, fechas; también cancelar o borrar la póliza. |
| 💵 **Historial de pagos** | Cada vez que en Valeri marcas **Pagó**, el pago se anota solo aquí. También puedes registrar pagos viejos a mano (con la opción de saldar el recibo que toca o no). |
| 🔄 **Renovación manual** | Escribes la vigencia nueva, los montos y la fecha del primer pago. La póliza se actualiza, queda en su historial y, si escribes la **prima neta**, suma en tus reportes de prima renovada. |
| ⬆️ **Renovación con lector de PDF** | Adjuntas el PDF (o foto) de la renovación; la IA lee número, aseguradora, inicio y prima neta, te avisa si el documento parece de otra póliza o persona, y tú confirmas antes de guardar. El archivo no se guarda. |
| 📋 **Endosos** | Bitácora de cambios de la póliza (alta o baja de asegurado, cambio de vehículo, de suma, etc.) con fecha, número de endoso y ajuste de prima (+ o −). Si el endoso cambia lo que paga el cliente, actualiza el monto con ✏️ Editar. |

Un globito en 💵 y 📋 te dice cuántos movimientos hay. **Una sola vez**, para encender el historial, corre en Supabase el archivo `supabase/migrations/0013_polizas_historial.sql` (Valeri sigue funcionando igual aunque todavía no lo corras; solo no se anotarán los pagos).

## Camila · Venta cruzada y expediente único del cliente

**Camila** (menú «Tu equipo digital») junta en un solo **expediente** todo lo de cada cliente: sus pólizas de **Valeri** y las que se conocen por tus **reportes de AXA** (2022 en adelante), aunque AXA escriba el nombre en otro orden o lo corte. Con eso ve **qué seguro tiene y cuál le falta** y te dice a quién ofrecerle qué. No usa IA y no manda nada sola: tú envías el WhatsApp.

| Pestaña | Qué ves |
|---|---|
| **Oportunidades** | «Para hoy» (un solo seguro por cliente, los mejores primero), quienes no han contestado, cotizaciones en curso, los que esperan respuesta, los que están **en pausa** y a quién **no** se le ofrece ahora (y por qué). Cada oferta trae sus razones y el WhatsApp ya escrito. Arriba avisa la **temporada** del año (lluvias y huracanes → hogar y auto; aguinaldo → ahorro y vida; declaración anual → ahorro). |
| **Momentos** | Ocasiones en que escribirle cae bien, que no son ventas: **cumpleaños** (la semana de antes), **revisión de coberturas** (póliza que renueva en 30 a 60 días), **agradecer un pago** (hasta 7 días después) y **pedir referidos** (tras un pago o una venta, máximo cada 90 días). Cada uno desaparece al atenderlo. |
| **Embudo** | El embudo de la venta cruzada, aparte del de prospectos: Identificadas → Contactadas → Cotizadas → Cerradas (90 días) / No les interesa. Con sus cifras: pólizas por cliente, % con 2 o más seguros, prima por cliente, conversión de 90 días y ventas cerradas por ramo. |
| **Mapa de cobertura** | Cada cliente contra los 5 ramos: ✓ lo tiene (con su renovación), ↺ lo tuvo, — nunca lo ha tenido. Arriba de cada ramo, cuántos clientes lo tienen. |
| **Clientes** | Tus expedientes y **datos por completar** (WhatsApp, ramo, fecha de nacimiento, renovación, correo). Toca uno para ver todas sus pólizas, su **familia** y corregir sus datos. |
| **Mis mensajes** | Los 11 textos de WhatsApp (5 seguros, reactivar, familiar, referidos y 3 momentos), editables con `{saludo}`, `{nombre}`, `{tiene}`, `{seguro}`, `{tuvo}`, `{poliza}`, `{fecha}`, `{familiar}` y `{parentesco}`. |

**Los candados (para no fastidiar):** solo clientes con una póliza vigente · nunca a quien tiene un pago vencido (primero se cobra; solo se le felicita su cumpleaños) · nunca a quien marcaste «no ofrecer» ni a quien dijo que no hasta la fecha que elegiste · lo que ya ofreciste espera una semana antes de insistir · **entre una oferta y la siguiente (de otro seguro) pasan al menos 30 días**: lo demás queda «en pausa» · los mensajes que ofrecen algo traen la línea «si prefieres que no te escriba de otros seguros, solo avísame» · empresas solo vida, GMM y autos. El puntaje sube si ya tiene seguros afines (de tipos distintos), si una de sus pólizas renueva pronto, por la temporada, si tiene un hijo menor o si su edad lo hace buena idea.

**Familias:** en el expediente de un cliente puedes ligarlo como cónyuge, hijo, padre o madre de otro (el titular) o agregar un familiar que aún no es cliente. Camila usa eso para dos cosas: si el titular tiene vida o GMM y su **cónyuge no tiene seguro de vida**, le pregunta al titular por él o ella; y si tiene un **hijo menor de 18**, sube la oferta de ahorro educativo. También sugiere «posibles familiares» que comparten los dos apellidos, para que tú confirmes.

**«Lo contrató» y tu meta:** al marcar que lo contrató (te pide confirmar), si la cotización dejó un prospecto abierto pasa a **Cliente ganado** con ese ramo y suma a tu meta de 20 por ramo. Si el cliente ya tenía un prospecto ganado de una venta anterior (el CRM guarda **un prospecto por persona**), no se toca: la venta se suma al Panel desde Camila, sin contarse dos veces. Después te ofrece abrir Valeri con su póliza prellenada. Con «No le interesa», el prospecto que dejó la cotización pasa a Perdidos para que Sofi no lo persiga.

**Para encenderla (una sola vez):** corre en Supabase `supabase/migrations/0016_venta_cruzada.sql` y `0017_venta_cruzada_2.sql`; luego, en una terminal dentro de la carpeta del CRM, `node scripts/importar-libro-axa.cjs` (ensayo: solo cuenta) y `node scripts/importar-libro-axa.cjs --guardar`. Cuando lleguen reportes nuevos de AXA, vuelve a correrlo: no duplica nada. Las pólizas nuevas que captures en Valeri se ligan solas a su cliente.

**El WhatsApp:** los reportes de AXA no traen teléfonos, así que la mayoría de tus clientes entra a Camila sin WhatsApp. Cada tarjeta trae un campo para escribirlo ahí mismo («Guardar WhatsApp») y queda listo para enviar; el botón **Solo con WhatsApp** deja a la vista solo a quienes ya se les puede escribir. Para cotizarle a alguien necesitas su WhatsApp o su correo.

**Lo que hay que saber:** «vigente» en lo que viene de AXA es una **estimación** por sus pagos (¿sigue pagando al ritmo que le toca?); la renovación solo se conoce en pólizas anuales; tus reportes de AXA no distinguen el **ahorro** del seguro de Vida; los nombres que AXA cortó se corrigen a mano en el expediente; no hay datos de **siniestros**, así que no hay un momento «después de un siniestro bien atendido»; y el **aniversario de la póliza** coincide con su renovación, por eso lo cubre la revisión de coberturas. Las listas de clientes y los mensajes **no sustituyen tu aviso de privacidad ni el consentimiento** para escribirles por WhatsApp (LFPDPPP): quien pida no recibir más, márcalo como «no ofrecer».

## Dana · Chubb Autos (renovaciones, prima pagada y recibos pendientes)

Dana es tu empleada digital de **Chubb Autos**: lee tu Excel **«Producción Detalle»** y te dice qué renovaciones vienen, cuánta prima neta ya está pagada y qué recibos siguen sin pagarse. Vive en **Tu equipo digital**, junto a Robert. **No usa IA** (son cuentas sobre tu Excel): cuesta $0.

**Para encenderla (una sola vez):** corre en Supabase `supabase/migrations/0021_chubb_autos.sql` (crea la tabla `chubb_cargas`, cerrada al público como las demás). Después, en Dana toca **Cargar mi Excel**, elige tu archivo, revisa lo que Dana entendió y confirma con **Guardar y usar este Excel**. El archivo se lee en tu navegador; solo se guarda lo que confirmas.

**Qué lee del Excel:** la hoja **«Producción»** (o la primera que tenga las columnas *Poliza* y *Asegurado*), con *Año, Mes emitida, Poliza, Asegurado, Vehiculo, Inicio Vigencia, Fin Vigencia, Prima neta, Prima Total, Frecuencia de pago, Estatus de pago* y, desde **«Siguiente recibo»** hacia la derecha, la **fecha de cada recibo**; su **color de relleno** dice si ya se pagó: **verde = pagado, amarillo = pendiente**. Si una póliza dice «NO ENCONTRADA» en *Vehiculo*, Dana la cuenta como «sin vehículo».

**Tu rutina:** cuando se pague un recibo, **píntalo de verde** en el Excel y vuelve a cargarlo (Cargar Excel nuevo). Antes de guardar, Dana te dice cuántos recibos leyó en verde y en amarillo y qué cambió desde la carga anterior (pólizas nuevas, recibos que dejaron de estar pendientes, primas distintas). Si un Excel no trae ningún verde, Dana usa la costumbre anterior: toda fecha que aparece es un recibo pendiente (por eso conviene pintar los pagados y no borrarlos). Cada carga queda guardada; Dana trabaja con la más reciente.

**Qué te muestra:** *Resumen* (pólizas, prima neta y total, prima neta pagada y por cobrar, renovaciones a 30/60/90 días, recibos vencidos, renovaciones y emisiones por mes, frecuencia de pago, clientes con más prima), *Renovaciones* (de la que vence primero a la última, con los días que faltan), *Recibos pendientes* (las **pólizas con recibos en amarillo**: cuatro cifras que filtran —vencidos, próximos 7 días, próximos 30 días y todos—; cada póliza muestra qué recibo toca, su **línea de pagos** verde/amarillo/rojo y un **mensaje de cobro listo** para el cliente con **Enviar WhatsApp**, **Copiar** y **Editar mensaje**; también se puede ver «Por recibo», un renglón por recibo), *Pólizas* (todas, con sus primas y recibos pagados) y *Por revisar* (lo que no cuadra en tu Excel y cómo arreglarlo). Se filtra por **año y mes** —de la **emisión** o de la **renovación**—, frecuencia de pago, con/sin recibos pendientes y búsqueda. Todo se puede **Copiar**, mandar por **WhatsApp**, bajar en **Excel** (4 hojas, respeta los filtros; en *Pólizas* trae el **próximo recibo pendiente** y cuándo vence) o guardar en **PDF**.

**El WhatsApp del cliente:** el Excel de Chubb no trae teléfonos, así que Dana busca al asegurado **por nombre** entre tus clientes (Camila), tus pólizas de Valeri y tus prospectos. Si hay coincidencia exacta, el botón dice «Enviar WhatsApp» y abre el chat con el mensaje escrito; si el nombre solo coincide en parte, lo avisa para que verifiques; si hay varios números distintos o ninguno, abre WhatsApp sin número y tú eliges el chat. Dana **no manda nada sola**, y el mensaje **no lleva importe** (el de Dana es aproximado).

**Lo que es estimación (y la pantalla lo dice):** la prima de cada recibo se reparte **parejo** (prima ÷ número de recibos; el primero suele ser un poco mayor por el derecho de póliza), y un recibo cuenta como **pagado cuando está en verde** en tu Excel (sin colores, cuando su fecha ya no aparece en la lista). Si una póliza dice «pendiente de pago» pero no trae fechas, Dana calcula el calendario con el inicio de la vigencia y asume que ninguno está pagado (lo marca como «fecha calculada»). La prima de la renovación puede cambiar: la que ves es la de la póliza actual.

## Lo que NO se instaló del kit (y por qué)

`skills-recomendadas.md` sugiere apps externas (QuickBooks, Xero, Ramp, Zapier, Lindy, Looker Studio, Gemini en Sheets) y “enchufes” MCP. Son cuentas de terceros y la mayoría de pago; no hacen falta para lo que ya tienes. Se conectan solo si tú lo decides, una a la vez, empezando por la que de verdad uses (por ejemplo, Google Sheets si llevas ahí tus números).

## Archivos del AI Manager (referencia para Claude Code)

- `supabase/migrations/0003_ai_manager.sql` — tablas nuevas y ramo en prospectos.
- `lib/panel.ts` — todos los cálculos del Panel (y lo que lee Robert).
- `lib/finanzas.ts`, `lib/finanzas-reglas.ts` — movimientos y su validación.
- `lib/manager.ts`, `lib/manager-config.ts` — Robert (llamada a Claude, cerebro, tope de uso).
- `app/api/crm/panel`, `app/api/crm/finanzas`, `app/api/crm/manager` — rutas del servidor (solo admin).
- `supabase/migrations/0004_cobranza.sql`, `lib/cobranza.ts`, `lib/cobranza-reglas.ts`, `app/api/crm/cobranza` — Valeri (cartera, reglas de cobro y mensajes).
- `lib/reportes-reglas.ts`, `lib/reportes.ts`, `app/api/crm/reportes` — Clara (reportes mensual y trimestral; sin tabla nueva: lee las que ya existen).
- `supabase/migrations/0013_polizas_historial.sql`, `lib/polizas-historial.ts`, `lib/historial-reglas.ts`, `lib/clientes-reglas.ts`, `app/api/crm/historial`, `components/crm/clientes/*` — Clara · Clientes por ramo (listado, historial de pagos, renovaciones y endosos; las renovaciones pasan por `app/api/crm/cobranza`, acción `renovar`).
- `supabase/migrations/0016_venta_cruzada.sql`, `0017_venta_cruzada_2.sql`, `lib/cruzada-reglas.ts`, `lib/cruzada-momentos.ts`, `lib/cruzada-familia.ts`, `lib/cruzada-temporadas.ts`, `lib/cruzada.ts`, `lib/clientes.ts`, `lib/clientes-plan.ts`, `lib/clientes-agrupar.ts`, `lib/libro-axa-reglas.ts`, `scripts/importar-libro-axa.cjs`, `app/api/crm/cruzada`, `components/crm/Camila.tsx`, `components/crm/camila/*` — Camila (venta cruzada, expediente único, familias, momentos, embudo y libro de AXA; las ventas cerradas suman al Panel desde `lib/panel.ts`).
- `supabase/migrations/0021_chubb_autos.sql`, `lib/xlsx-lector.ts`, `lib/chubb-reglas.ts`, `lib/chubb.ts`, `lib/chubb-excel.ts`, `app/api/crm/chubb`, `components/crm/ChubbDana.tsx`, `components/crm/chubb/*` — Dana (Chubb Autos: lector de Excel, reglas de renovaciones/recibos/primas, cargas guardadas y reporte en Excel).
- `components/crm/PanelMando.tsx`, `components/crm/panel/*`, `components/crm/ManagerIA.tsx`, `components/crm/Cobranza.tsx`, `components/crm/cobranza/*`, `components/crm/ReportesClara.tsx`, `components/crm/AvatarEmpleado.tsx`, `components/crm/SlotRoro.tsx` — pantallas.
