# Formulario de captación «Cotiza tu seguro»

Componente reutilizable de React + TypeScript. **Todavía no está conectado al servidor**: hoy se prueba con un servidor simulado que no guarda nada.

## Piezas

| Archivo | Qué hace |
|---|---|
| `lib/captacion-cotizacion.ts` | Tipos, listas de opciones, **validación** y **antispam**. Puro (sin React): lo usan el navegador y, después, el servidor. |
| `components/captura/FormularioCotizacion.tsx` | El formulario. Recibe `onEnviar` y no sabe nada del servidor. |
| `lib/cotizacion-simulada.ts` | «Servidor» de mentira para probar (casos: nombre con «falla», «campo», «limite», «sinred»). |
| `components/captura/PruebaCotizacion.tsx` + `app/cotizacion-prueba/page.tsx` | Página de prueba `/cotizacion-prueba` (no indexada). |

## Campos

Nombre*, WhatsApp* (10 dígitos MX), Tipo de seguro*, ¿Para quién es?*, Correo (opcional) y casilla del aviso de privacidad* (`requiereConsentimiento={false}` la quita donde no corresponda).

## Usarlo en otra página

```tsx
<FormularioCotizacion onEnviar={enviarCotizacion} origen="tarjeta" valoresIniciales={{ tipoSeguro: "gmm" }} />
```

## Conectarlo al servidor (siguiente paso)

1. Crear la ruta (p. ej. `app/api/cotizacion/route.ts`) que reciba `SolicitudCotizacion`, vuelva a correr `validarSolicitud` y `evaluarAntispam`, aplique `rateLimit` y guarde el prospecto (reutilizar `crearLead` / el pendiente automático de `seguimiento-nuevo-lead`).
   - 200 `{ ok: true }` · 422 `{ ok: false, errores }` · 429 `{ ok: false, mensaje }`.
   - Si `evaluarAntispam` dice `"bot"`: responder 200 sin guardar (igual que hoy el señuelo de `/api/leads`).
2. Escribir `enviarCotizacion` (misma firma que `EnviarCotizacion`: hace `fetch` y devuelve el JSON) y pasársela al formulario en lugar del simulador. El formulario no cambia.
3. Campos nuevos del prospecto (`tipoSeguro` → `ramo`, `paraQuien`) necesitan columna o van en las notas: decidirlo al conectar.

## Antispam que ya trae

- **Señuelo** invisible (`confirmar_sitio_web`): con texto = bot; se finge éxito y no se envía.
- **Tiempo mínimo** de 3 s: más rápido pide revisar y reenviar (una persona real pasa al segundo intento sin perder lo escrito).
- Un solo envío a la vez y tope de 3 envíos por visita.
- Nombre sin enlaces ni `< > @`; WhatsApp que no sea un celular MX posible (empieza en 0 o 1, o el mismo dígito repetido).
- Pendiente para el servidor: `rateLimit` por IP y, si hace falta, Cloudflare Turnstile (el login ya lo contempla).
