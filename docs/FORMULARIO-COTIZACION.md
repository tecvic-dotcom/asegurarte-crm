# Formulario de captación «Cotiza tu seguro»

Componente reutilizable de React + TypeScript. **Ya está conectado al CRM** (ruta `/api/cotizacion`), pero todavía no está puesto en la tarjeta `/roberto`; `/cotizacion-prueba` prueba la experiencia simulada o conectada.

## Piezas

| Archivo | Qué hace |
|---|---|
| `lib/captacion-cotizacion.ts` | Tipos, listas de opciones, **validación** y **antispam**. Puro (sin React): lo usan el navegador y, después, el servidor. |
| `components/captura/FormularioCotizacion.tsx` | El formulario. Recibe `onEnviar` y no sabe nada del servidor. |
| `lib/cotizacion-simulada.ts` | «Servidor» de mentira para probar (casos: nombre con «falla», «campo», «limite», «sinred»). |
| `lib/cotizacion-cliente.ts` + `app/api/cotizacion/route.ts` | Envío real: el cliente HTTP y la ruta segura. |
| `lib/db.ts` → `crearLeadCotizacion` | Crea o identifica al prospecto (Supabase o memoria en demo). |
| `components/captura/PruebaCotizacion.tsx` + `app/cotizacion-prueba/page.tsx` | Página de prueba `/cotizacion-prueba` (no indexada). |

## Campos

Nombre*, WhatsApp* (10 dígitos MX), Tipo de seguro*, ¿Para quién es?*, Correo (opcional) y casilla del aviso de privacidad* (`requiereConsentimiento={false}` la quita donde no corresponda).

## Usarlo en otra página

```tsx
<FormularioCotizacion onEnviar={enviarCotizacion} origen="tarjeta" valoresIniciales={{ tipoSeguro: "gmm" }} />
```

## Conexión con el CRM (hecha, probada en demo)

```
formulario → POST /api/cotizacion → crearLeadCotizacion → Supabase (leads + actividad)
          → pendiente de hoy + correo → Prospectos y Embudo de ventas (etapa «Nuevo», origen «Sitio web»)
```

- **No se creó ninguna tabla ni columna, y no hay SQL nuevo.** Se usa `leads` y `actividad`: el tipo de seguro y «para quién» quedan en el campo `mensaje` del prospecto y en su historial (con el consentimiento y la fecha). El campo `ramo` NO se toca (es el ramo que se le VENDE y cuenta para la meta).
- `lib/cotizacion-cliente.ts` → `enviarCotizacionServidor` (misma firma que el simulador). Uso: `<FormularioCotizacion onEnviar={enviarCotizacionServidor} origen="tarjeta" />`.
- **Sin duplicados:** se busca por correo (si lo dio) y por WhatsApp. Si ya existe, NO se crea otro: se agrega una nota a su historial (con el nombre que escribió, si es distinto), se le deja un pendiente de hoy y no se toca su etapa. Si ya había un pendiente abierto para esa persona, no se amontonan más.
- **Doble toque / reintento:** el mismo WhatsApp en menos de 20 s se responde «recibida» sin repetir nada (se suelta si el guardado falla).
- **Privacidad:** la respuesta nunca dice si la persona ya existía.
- Respuestas: 200 `{ok:true}` · 422 `{ok:false, errores | mensaje}` · 429 `{ok:false, mensaje}` · 400/403 · 500.
- Capas, en orden: mismo sitio → límite por IP (6/min) → tamaño (4000) → señuelo (finge éxito) → validación completa → tiempo mínimo → barrera de 20 s por WhatsApp.
- Riesgo que queda: dos solicitudes NUEVAS idénticas que lleguen en el mismo instante a instancias distintas podrían crear dos fichas si en la base ya no hay índices únicos (SQL 0024). La barrera de 20 s lo cubre dentro de una instancia; evitarlo del todo exigiría una restricción en la base (cambio de esquema).
- `/cotizacion-prueba` tiene un interruptor «Conectado a tu CRM» que SÍ guarda (usar nombres «PRUEBA …» para encontrarlos y borrarlos desde el CRM).
- Pendiente a futuro: Cloudflare Turnstile (el login ya lo contempla) si llega spam real.

## Antispam que ya trae

- **Señuelo** invisible (`confirmar_sitio_web`): con texto = bot; se finge éxito y no se envía.
- **Tiempo mínimo** de 3 s: más rápido pide revisar y reenviar (una persona real pasa al segundo intento sin perder lo escrito).
- Un solo envío a la vez y tope de 3 envíos por visita.
- Nombre sin enlaces ni `< > @`; WhatsApp que no sea un celular MX posible (empieza en 0 o 1, o el mismo dígito repetido).
- El servidor repite todo esto (nunca confía en el navegador) y añade el límite por IP y la barrera de 20 s por WhatsApp.
