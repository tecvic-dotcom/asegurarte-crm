# Empieza aquí — Tu AI Cash Machine

> **Lo que vas a lograr hoy:** una página que captura clientes + un CRM para darles seguimiento + un panel de administración, publicados en internet con tu propio nombre. Sin saber programar. Pegando texto en Claude Code.

Si tu tío de la taquería puede seguir una receta paso a paso, tú puedes con esto. No hay un solo paso que junte dos cosas técnicas a la vez. Una pantalla, una acción, y un "si salió bien deberías ver…" para que nunca te quedes con la duda.

---

## El mapa del viaje

Son **6 etapas**, te toma **~90 minutos** en total, y **puedes pausar y seguir** cuando quieras. Nada se borra: cada etapa deja tu avance guardado en tu computadora.

Piénsalo como abrir un restaurante:
- Primero **cocinas el platillo en tu cocina** (lo pruebas en tu compu, eso es "local").
- Luego lo **sirves en un restaurante abierto al público** (lo publicas en internet, eso es **Vercel**).
- Y al final le pones **el letrero con tu nombre en la calle** (tu dominio).

---

## Las 6 etapas

| # | Etapa | Qué haces aquí | Tiempo | Necesitas… |
|---|---|---|---|---|
| **1** | **Prepara y corre en local** | Abres el kit en tu computadora y lo enciendes por primera vez. Es montar la cocina antes de cocinar. | ~12 min | Tu computadora encendida + Claude Code abierto |
| **2** | **Personaliza con tu negocio (wizard)** | Un asistente te hace preguntas sencillas (tu negocio, tu oferta, tus colores) y arma tu página a tu medida. | ~15 min | Saber qué vendes y a quién |
| **3** | **Conecta Supabase** | Conectas tu "libreta de clientes en la nube" para que los datos de quien te deja su teléfono se guarden de verdad. | ~18 min | Un correo electrónico (para crear tu cuenta gratis) |
| **4** | **Publica en Vercel** | Sacas tu página de la cocina al restaurante: la pones en internet para que cualquiera la vea. | ~20 min | Una cuenta de GitHub (la fotocopiadora con historial) + una de Vercel |
| **5** | **Conecta tu dominio** | Le pones el letrero con tu nombre en la calle: tu-negocio.com en vez de una dirección rara. | ~15 min | Comprar tu dominio (~$200 MXN al año) — opcional, puedes saltarla |
| **6** | **Prueba un lead real desde tu celular** | Sacas tu teléfono, llenas tu propia página como si fueras un cliente, y ves cómo aparece en tu CRM. La prueba de fuego. | ~10 min | Tu celular con internet |

> **Sobre costos:** las cuentas que vas a crear (GitHub, Vercel, Supabase) tienen **plan gratis** y te alcanza de sobra para empezar. Es como rentar un local: el plan gratis es tu local de arranque. Solo el dominio (etapa 5) cuesta un poco, y es opcional. En cada etapa te avisamos si piden tarjeta o no, sin sustos.

---

## Tu barra de progreso

Cada vez que termines una etapa, regresa aquí y tacha la casilla. Así siempre sabes dónde quedaste.

```
ETAPA   1     2     3     4     5     6
       [ ]   [ ]   [ ]   [ ]   [ ]   [ ]
        ▲
     estás aquí

  Vacía: [░░░░░░░░░░░░░░░░░░░░░░░░] 0/6
```

A medida que avances, la barra se va llenando así:

```
  1/6:  [████░░░░░░░░░░░░░░░░░░░░] cocina montada
  2/6:  [████████░░░░░░░░░░░░░░░░] tu negocio cargado
  3/6:  [████████████░░░░░░░░░░░░] libreta conectada
  4/6:  [████████████████░░░░░░░░] ¡EN INTERNET!
  5/6:  [████████████████████░░░░] con tu nombre
  6/6:  [████████████████████████] máquina probada ✓
```

---

## Cómo usar este kit (3 reglas simples)

1. **Ve en orden, una etapa a la vez.** Cada etapa tiene su propio archivo de instrucciones dentro del kit. Ábrelo, síguelo hasta el final, y vuelve aquí.
2. **No te brinques los checkpoints.** Cuando una pantalla diga "si salió bien deberías ver…", confirma que lo ves antes de seguir. Si no lo ves, ahí mismo te decimos qué revisar.
3. **Pausa sin miedo.** Puedes cerrar todo, comer, dormir, y mañana retomar exactamente donde quedaste. Tu avance vive en tu computadora.

> Una palabra que vas a oír mucho: **variable de entorno**. No te asustes: es solo **la combinación de tu caja fuerte**. Son llaves secretas que tu app usa para entrar a tus servicios. Tú las pegas una vez en su lugar y listo. Nunca las compartas con nadie, igual que la combinación de tu caja.

---

## El Test de la Victoria

No terminaste el kit cuando llegas a la etapa 6. Terminaste cuando puedes decir **SÍ** a estas 5 preguntas. Imprime esto o tenlo a la mano:

```
  ┌──────────────────────────────────────────────────────┐
  │   TEST DE LA VICTORIA — tu AI Cash Machine vive        │
  ├──────────────────────────────────────────────────────┤
  │                                                        │
  │  [ ] 1. Abro mi página en internet desde el celular    │
  │         de OTRA persona (no la tuya) y carga bien.     │
  │                                                        │
  │  [ ] 2. Lleno el formulario con un nombre y un         │
  │         teléfono de prueba y me da las gracias.        │
  │                                                        │
  │  [ ] 3. Entro a mi CRM y ese lead de prueba YA         │
  │         aparece ahí, con su nombre y su teléfono.      │
  │                                                        │
  │  [ ] 4. Puedo arrastrar ese lead de una columna a      │
  │         otra en el tablero (frío → tibio → caliente).  │
  │                                                        │
  │  [ ] 5. Mi panel de administración me deja entrar      │
  │         con mi código y NO deja entrar sin él.         │
  │                                                        │
  └──────────────────────────────────────────────────────┘
```

**Si marcaste las 5 casillas: felicidades, tu máquina de ventas ya trabaja para ti 24/7.** Atrae, captura y organiza clientes sola, sin que tú muevas un dedo. Eso es lo que acabas de construir.

¿Una sola casilla sin marcar? No pasa nada: regresa a la etapa que le corresponde (lead que no llega = etapa 3 o 6; página que no carga = etapa 4; código de admin = etapa 1 o 2) y revisa su checkpoint. Todo tiene solución y todo está explicado.

---

**Cuando estés listo, abre el archivo de la Etapa 1 dentro del kit y empezamos.** Te veo en el restaurante. 🚀
