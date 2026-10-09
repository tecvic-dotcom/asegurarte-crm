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
| **Clara (reportes)** | Pestaña **Clara · Reportes**: cada **día 1** el cierre del mes y, al terminar cada trimestre, el del **trimestre** (ventas vs meta, prospectos, dinero, cobranza, producción de la aseguradora y **3 focos**). Botones **Copiar**, **WhatsApp** y **PDF**. Puedes ver meses y trimestres anteriores. No usa IA: cuesta $0. | La secretaria que te deja el resumen en el escritorio |

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
- `components/crm/PanelMando.tsx`, `components/crm/panel/*`, `components/crm/ManagerIA.tsx`, `components/crm/Cobranza.tsx`, `components/crm/cobranza/*`, `components/crm/ReportesClara.tsx`, `components/crm/AvatarEmpleado.tsx`, `components/crm/SlotRoro.tsx` — pantallas.
