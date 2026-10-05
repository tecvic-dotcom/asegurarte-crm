# AI Manager (Módulo 3) — instalado en tu CRM

> Tu negocio, administrado con IA **dentro de tu propio sistema**. No es otra app: es el siguiente cuarto de la misma casa.

## Qué quedó instalado (la analogía del coche)

| Pieza del kit | Qué es en tu CRM | Analogía |
|---|---|---|
| **Director Financiero IA** | Tabla segura `finanzas_movimientos` en tu Supabase + sección **Movimientos** en el Panel (registrar, confirmar, editar, borrar). Y Claude Code ordena tus estados de cuenta (prompt fijo abajo). | La gasolina del tanque |
| **Panel de Mando** | Pestaña **Panel de Mando**: reporte de una frase, 4 números grandes (pólizas vs meta, cuánto entró, cuánto salió, lo que te quedó), tu meta por ramo, entró vs salió por mes y en qué se te va el dinero. Se actualiza solo cada minuto. | El tablero |
| **Agente-Manager** | Pestaña **RORO**: tu gerente digital con avatar. Lee los mismos números del Panel y te responde con recomendación + porqué + riesgo + qué hacer hoy. | El copiloto |
| Extra para tu meta | Cada prospecto tiene **Ramo** (vida, GMM, ahorro, autos, hogar) y fecha de cierre automática al pasarlo a “Cliente ganado”. | El odómetro de tu meta |

Solo el **administrador** ve el Panel y a RORO. Un vendedor de tu equipo no ve tus números.

---

## Para encenderlo: 3 pasos (una sola vez)

1. **Supabase (2 min):** Supabase → tu proyecto → **SQL Editor** → **New query** → pega todo `supabase/migrations/0003_ai_manager.sql` → **Run**. Debe decir “Success”.
   *Mientras no lo corras, tu CRM sigue funcionando igual; el Panel te muestra este mismo paso.*
2. **Llave de IA para RORO (5 min):** entra a **console.anthropic.com** → API Keys → crea una llave. **Ponle un límite de gasto mensual** (Billing → Limits). Pégala:
   - en tu `.env.local`, en el renglón `ANTHROPIC_API_KEY=` (ya está listo, solo pega), y
   - en **Vercel → Settings → Environment Variables** como `ANTHROPIC_API_KEY` (y opcional `RORO_TOPE_MENSUAL=200`).
3. **Publicar:** pídele a Claude Code *“sube a GitHub los cambios del AI Manager”*. Vercel lo publica solo.

**✔ Checkpoint:** abres tu CRM y arriba ves a RORO con “reporte de hoy”. En **Panel de Mando** ves tus 4 números. En **RORO** tocas “¿Voy a llegar a mi meta…?” y te contesta con tus cifras.

---

## Tu hábito diario (2 minutos)

1. Abre el CRM y lee el **reporte de una frase** (arriba).
2. ¿Cerraste una venta? Pásala a **Cliente ganado** y ponle su **Ramo** (si no, no cuenta para tu meta; el Panel te avisa).
3. ¿Te pagaron una comisión o gastaste? **Panel → Registrar** (10 segundos).
4. ¿Dudas para decidir? Pregúntale a **RORO**. Él propone; tú decides.

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
- **RORO:** usa el modelo de Claude `claude-opus-5-5` y cobra por uso. Estimado: **unos centavos de dólar por pregunta (≈ $1 MXN)**; depende de qué tan larga sea la plática.
- **Frenos que ya tiene:** máximo **200 preguntas al mes** (cámbialo con `RORO_TOPE_MENSUAL`) y máximo 6 por minuto. Verás “Preguntas este mes: X de 200” en su pestaña. El límite de gasto en console.anthropic.com es tu segundo candado.

## Seguridad (ya cuidada)

- Tus tablas nuevas tienen el mismo candado que las demás (RLS sin acceso público). Solo tu servidor entra, y solo con sesión de administrador.
- La llave de IA vive solo en el servidor (nunca en el navegador).
- A la IA **solo le llegan totales**: nunca nombres, teléfonos ni correos de tus clientes.
- RORO no mueve dinero ni manda mensajes: recomienda y tú aprietas el gatillo.

---

## Cómo agrego un número nuevo al Panel

Dile a Claude Code, por ejemplo: *“Agrégame al Panel de Mando una tarjeta con la prima promedio por póliza ganada este mes”*. (Los cálculos viven en `lib/panel.ts`; la pantalla en `components/crm/panel/`.)

## Cómo creo mi siguiente empleado digital

Ejemplo para **cobranza**: *“Créame mi empleado digital de cobranza junto a RORO: que lea mis pólizas con pago o renovación cercana, me diga a quién cobrarle hoy y me deje el mensaje de WhatsApp listo para que yo lo envíe”*. Ya hay un lugar reservado para él en la pestaña de RORO (“Tu equipo digital”).

---

## Si algo sale mal

| Lo que ves | Qué hacer |
|---|---|
| “Falta 1 paso para encender tu AI Manager” | Corre el SQL del paso 1. |
| “RORO todavía no tiene su llave de IA” | Paso 2 (y vuelve a publicar si fue en Vercel). |
| “Tu cuenta de IA se quedó sin saldo” | Recarga en console.anthropic.com → Billing. |
| “Llegaste al tope de preguntas” | Espera al mes siguiente o sube `RORO_TOPE_MENSUAL`. |
| Los montos salen en $0 | No hay movimientos registrados en ese periodo: “sin registrar” no es “cero”. |
| Una venta no cuenta en tu meta | Revisa que esté en “Cliente ganado” y que tenga **Ramo**. |
| En tu compu (`pnpm dev`) se ven estilos viejos | Borra la carpeta `.next/dev/cache` y vuelve a correr `pnpm dev`. |

## Lo que NO se instaló del kit (y por qué)

`skills-recomendadas.md` sugiere apps externas (QuickBooks, Xero, Ramp, Zapier, Lindy, Looker Studio, Gemini en Sheets) y “enchufes” MCP. Son cuentas de terceros y la mayoría de pago; no hacen falta para lo que ya tienes. Se conectan solo si tú lo decides, una a la vez, empezando por la que de verdad uses (por ejemplo, Google Sheets si llevas ahí tus números).

## Archivos del AI Manager (referencia para Claude Code)

- `supabase/migrations/0003_ai_manager.sql` — tablas nuevas y ramo en prospectos.
- `lib/panel.ts` — todos los cálculos del Panel (y lo que lee RORO).
- `lib/finanzas.ts`, `lib/finanzas-reglas.ts` — movimientos y su validación.
- `lib/manager.ts`, `lib/manager-config.ts` — RORO (llamada a Claude, cerebro, tope de uso).
- `app/api/crm/panel`, `app/api/crm/finanzas`, `app/api/crm/manager` — rutas del servidor (solo admin).
- `components/crm/PanelMando.tsx`, `components/crm/panel/*`, `components/crm/ManagerIA.tsx`, `components/crm/AvatarRoro.tsx`, `components/crm/SlotRoro.tsx` — pantallas.
