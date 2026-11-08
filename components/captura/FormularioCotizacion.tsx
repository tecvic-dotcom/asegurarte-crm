"use client";

/**
 * Formulario de captación «Cotiza tu seguro» — componente REUTILIZABLE.
 *
 *  · No habla con ningún servidor: recibe `onEnviar` (hoy, el simulador; mañana, la llamada real). Así el mismo
 *    componente sirve en la tarjeta, en la landing o donde haga falta, y se prueba sin guardar datos.
 *  · Campos: nombre*, WhatsApp*, tipo de seguro*, ¿para quién es?*, correo (opcional) y aviso de privacidad*.
 *  · Validación con mensajes claros (lib/captacion-cotizacion.ts, la misma que usará el servidor), confirmación
 *    de recepción y antispam: señuelo invisible, tiempo mínimo, un solo envío a la vez y tope por visita.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  MAX_ENVIOS_POR_VISITA,
  PARA_QUIEN,
  TIPOS_SEGURO,
  evaluarAntispam,
  formatearWhatsapp,
  prepararSolicitud,
  primerNombre,
  textoParaQuien,
  textoTipoSeguro,
  validarSolicitud,
} from "@/lib/captacion-cotizacion";
import type { CampoCotizacion, EnviarCotizacion, ErroresCotizacion, ParaQuienId, SolicitudCotizacion, TipoSeguroId } from "@/lib/captacion-cotizacion";
import { capturarUTMs, leerUTMs } from "@/lib/utm";

export interface ValoresFormularioCotizacion {
  nombre: string;
  whatsapp: string;
  correo: string;
  tipoSeguro: TipoSeguroId | "";
  paraQuien: ParaQuienId | "";
  consentimiento: boolean;
}

export interface FormularioCotizacionProps {
  /** Recibe la solicitud ya validada y limpia. Debe devolver `{ ok: true }` o `{ ok: false, errores?, mensaje? }`. */
  onEnviar: EnviarCotizacion;
  titulo?: string;
  nota?: string;
  textoBoton?: string;
  urlPrivacidad?: string;
  /** false = no pide la casilla del aviso de privacidad («según corresponda»). Por defecto, sí la pide. */
  requiereConsentimiento?: boolean;
  /** Valores con los que arranca (p. ej. el interés que la persona ya marcó en otra parte). */
  valoresIniciales?: Partial<ValoresFormularioCotizacion>;
  /** Desde qué parte del sitio se envía; viaja con la solicitud («tarjeta», «landing»…). */
  origen?: string;
  /** Muestra el aviso «modo de prueba: no se guarda nada». */
  modoSimulado?: boolean;
  /** Aviso propio arriba del formulario y en la confirmación (p. ej. «prueba conectada: SÍ se guarda»). Sustituye al de `modoSimulado`. */
  avisoPrueba?: { formulario: ReactNode; confirmacion: ReactNode };
  /** Texto de la confirmación (por defecto, uno genérico sin promesas de tiempos). */
  mensajeConfirmacion?: ReactNode;
  /** Se llama una vez que el servidor confirmó la recepción. */
  onExito?: (solicitud: SolicitudCotizacion) => void;
  className?: string;
}

type Fase = "editando" | "enviando" | "enviado";

const VACIO: ValoresFormularioCotizacion = { nombre: "", whatsapp: "", correo: "", tipoSeguro: "", paraQuien: "", consentimiento: false };
const ORDEN_CAMPOS: CampoCotizacion[] = ["nombre", "whatsapp", "tipoSeguro", "paraQuien", "correo", "consentimiento"];

export function FormularioCotizacion({
  onEnviar,
  titulo = "Cotiza tu seguro",
  nota = "Cuéntame qué necesitas y te escribo por WhatsApp para platicar tus opciones. Asesoría sin costo.",
  textoBoton = "Quiero mi cotización",
  urlPrivacidad = "/privacidad",
  requiereConsentimiento = true,
  valoresIniciales,
  origen,
  modoSimulado = false,
  avisoPrueba,
  mensajeConfirmacion,
  onExito,
  className = "",
}: FormularioCotizacionProps) {
  const [v, setV] = useState<ValoresFormularioCotizacion>({ ...VACIO, ...valoresIniciales });
  const [trampa, setTrampa] = useState(""); // señuelo anti-bot
  const [errores, setErrores] = useState<ErroresCotizacion>({});
  const [fase, setFase] = useState<Fase>("editando");
  const [errorGeneral, setErrorGeneral] = useState("");
  const [enviada, setEnviada] = useState<{ nombre: string; tipo: string; para: string; terminacion: string; folio?: string } | null>(null);

  const base = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const tituloConfirmacion = useRef<HTMLHeadingElement>(null);
  const montadoEn = useRef(0); // cuándo se mostró el formulario (antispam: tiempo mínimo)
  const enviando = useRef(false); // un solo envío a la vez
  const envios = useRef(0); // envíos aceptados en esta visita

  useEffect(() => {
    montadoEn.current = Date.now();
    capturarUTMs();
  }, []);

  // Al confirmar, el foco pasa al aviso para que lectores de pantalla y teclado lo encuentren.
  useEffect(() => {
    if (fase === "enviado") tituloConfirmacion.current?.focus();
  }, [fase]);

  const idDe = (campo: string) => `${base}-${campo}`;
  const opciones = { requiereConsentimiento };

  function solicitudActual(tiempoMs = 0): SolicitudCotizacion {
    return { ...v, trampa, tiempoMs, utm: leerUTMs(), origen };
  }

  function cambiar<K extends keyof ValoresFormularioCotizacion>(campo: K, valor: ValoresFormularioCotizacion[K]) {
    setV((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo as CampoCotizacion]) setErrores((e) => ({ ...e, [campo]: undefined }));
    if (errorGeneral) setErrorGeneral("");
  }

  // Al salir de un campo de texto se revisa ese campo (solo si ya escribió algo: no se regaña por un campo apenas tocado).
  function alSalir(campo: "nombre" | "whatsapp" | "correo") {
    if (!v[campo].trim()) return;
    const { errores: e } = validarSolicitud(prepararSolicitud(solicitudActual()), opciones);
    setErrores((prev) => ({ ...prev, [campo]: e[campo] }));
  }

  function enfocarPrimero(e: ErroresCotizacion) {
    const campo = ORDEN_CAMPOS.find((c) => e[c]);
    if (!campo) return;
    const el = formRef.current?.querySelector<HTMLElement>(`[data-campo="${campo}"]`);
    el?.focus();
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function terminar(s: SolicitudCotizacion, folio?: string) {
    setEnviada({
      nombre: primerNombre(s.nombre),
      tipo: textoTipoSeguro(s.tipoSeguro),
      para: textoParaQuien(s.paraQuien),
      terminacion: s.whatsapp.slice(-4),
      folio,
    });
    setFase("enviado");
  }

  async function alEnviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (enviando.current) return;
    setErrorGeneral("");

    const solicitud = prepararSolicitud(solicitudActual(Date.now() - montadoEn.current));

    // 1 · Validación con mensajes claros
    const validacion = validarSolicitud(solicitud, opciones);
    if (!validacion.ok) {
      setErrores(validacion.errores);
      enfocarPrimero(validacion.errores);
      return;
    }
    setErrores({});

    // 2 · Antispam
    const veredicto = evaluarAntispam(solicitud);
    if (veredicto === "bot") {
      terminar(solicitud); // se finge éxito: nada se envía y el bot no se entera de qué lo delató
      return;
    }
    if (veredicto === "rapido") {
      setErrorGeneral("Un momento: revisa tus datos con calma y vuelve a enviar.");
      return;
    }
    if (envios.current >= MAX_ENVIOS_POR_VISITA) {
      setErrorGeneral("Ya recibimos varias solicitudes desde esta página. Si necesitas algo más, escríbeme por WhatsApp.");
      return;
    }

    // 3 · Envío
    enviando.current = true;
    setFase("enviando");
    try {
      const r = await onEnviar(solicitud);
      if (r.ok) {
        envios.current += 1;
        terminar(solicitud, r.folio);
        onExito?.(solicitud);
        return;
      }
      const hayCampos = !!r.errores && Object.values(r.errores).some(Boolean);
      if (hayCampos && r.errores) {
        setErrores(r.errores);
        enfocarPrimero(r.errores);
      }
      if (r.mensaje || !hayCampos) setErrorGeneral(r.mensaje ?? "No pudimos enviar tu solicitud. Intenta de nuevo.");
      setFase("editando");
    } catch {
      setErrorGeneral("No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo otra vez; lo que escribiste sigue aquí.");
      setFase("editando");
    } finally {
      enviando.current = false;
    }
  }

  function otraSolicitud() {
    setV({ ...VACIO, ...valoresIniciales, nombre: "", whatsapp: "", correo: "", consentimiento: false });
    setTrampa("");
    setErrores({});
    setErrorGeneral("");
    setEnviada(null);
    montadoEn.current = Date.now();
    setFase("editando");
  }

  /* ----------------------------------- Confirmación de recepción ----------------------------------- */
  if (fase === "enviado" && enviada) {
    return (
      <section className={`glass-strong rounded-[22px] p-6 sm:p-8 ${className}`} aria-live="polite">
        <div className="flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-green/15 text-green" aria-hidden="true">
            <Ico id="check" className="h-9 w-9" trazo={2.6} />
          </span>
          <h3 ref={tituloConfirmacion} tabIndex={-1} className="mt-4 font-display text-2xl text-ink outline-none">
            {enviada.nombre ? `¡Gracias, ${enviada.nombre}! ` : "¡Gracias! "}Recibimos tu solicitud
          </h3>
          <p className="mt-2 max-w-md text-ink-soft">
            {mensajeConfirmacion ?? "Con estos datos te escribiremos por WhatsApp para platicar tus opciones."}
          </p>
        </div>

        <dl className="mx-auto mt-6 grid max-w-md gap-3 rounded-2xl border border-line bg-glass p-4 text-sm">
          <Resumen etiqueta="Seguro" valor={enviada.tipo} />
          <Resumen etiqueta="Es" valor={enviada.para} />
          <Resumen etiqueta="Te escribimos al WhatsApp" valor={`terminación ${enviada.terminacion}`} />
          {enviada.folio && <Resumen etiqueta="Folio de prueba" valor={enviada.folio} />}
        </dl>
        <p className="mx-auto mt-3 max-w-md text-center text-xs text-ink-mute">¿Algún dato está mal? Envía otra solicitud con la corrección.</p>

        {(avisoPrueba || modoSimulado) && (
          <p className="mx-auto mt-4 max-w-md rounded-xl border border-amber/40 bg-amber/10 px-3 py-2 text-center text-xs text-amber">
            {avisoPrueba ? avisoPrueba.confirmacion : "Modo de prueba: no se guardó ni se envió nada a nadie."}
          </p>
        )}

        <div className="mt-6 flex justify-center">
          <button type="button" onClick={otraSolicitud} className="btn-ghost">
            Enviar otra solicitud
          </button>
        </div>
      </section>
    );
  }

  /* --------------------------------------------- Formulario --------------------------------------------- */
  const cuenta = Object.values(errores).filter(Boolean).length;
  const ocupado = fase === "enviando";

  return (
    <form ref={formRef} onSubmit={alEnviar} noValidate aria-busy={ocupado} className={`glass-strong rounded-[22px] p-6 sm:p-8 ${className}`}>
      {(avisoPrueba || modoSimulado) && (
        <p className="mb-5 rounded-xl border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">
          {avisoPrueba ? (
            avisoPrueba.formulario
          ) : (
            <>
              <strong>Modo de prueba.</strong> Lo que escribas aquí NO se guarda ni se envía a nadie. Usa datos inventados.
            </>
          )}
        </p>
      )}

      <h3 className="font-display text-2xl text-ink">{titulo}</h3>
      <p className="mt-1 text-sm text-ink-mute">{nota}</p>
      <p className="mt-3 text-xs text-ink-mute">
        <span aria-hidden="true" className="text-brand-2">
          *
        </span>{" "}
        Los campos con asterisco son obligatorios.
      </p>

      <div className="mt-5 space-y-5">
        <Campo id={idDe("nombre")} etiqueta="Tu nombre" obligatorio error={errores.nombre}>
          <input
            id={idDe("nombre")}
            data-campo="nombre"
            type="text"
            value={v.nombre}
            onChange={(e) => cambiar("nombre", e.target.value)}
            onBlur={() => alSalir("nombre")}
            placeholder="Ej. María González"
            autoComplete="name"
            maxLength={80}
            required
            aria-required="true"
            aria-invalid={Boolean(errores.nombre)}
            aria-describedby={errores.nombre ? `${idDe("nombre")}-err` : undefined}
            className="field-input"
          />
        </Campo>

        <Campo id={idDe("whatsapp")} etiqueta="Tu WhatsApp" obligatorio error={errores.whatsapp} ayuda="10 dígitos. Es por donde te escribiremos.">
          <input
            id={idDe("whatsapp")}
            data-campo="whatsapp"
            type="tel"
            inputMode="tel"
            value={v.whatsapp}
            onChange={(e) => cambiar("whatsapp", formatearWhatsapp(e.target.value))}
            onBlur={() => alSalir("whatsapp")}
            placeholder="81 1234 5678"
            autoComplete="tel"
            required
            aria-required="true"
            aria-invalid={Boolean(errores.whatsapp)}
            aria-describedby={`${idDe("whatsapp")}-ayuda${errores.whatsapp ? ` ${idDe("whatsapp")}-err` : ""}`}
            className="field-input"
          />
        </Campo>

        <Grupo
          nombre="tipoSeguro"
          idBase={idDe("tipoSeguro")}
          leyenda="Tipo de seguro"
          error={errores.tipoSeguro}
          columnas="sm:grid-cols-2"
          opciones={TIPOS_SEGURO.map((t) => ({ id: t.id, texto: t.texto, icono: t.icono }))}
          valor={v.tipoSeguro}
          onChange={(id) => cambiar("tipoSeguro", id as TipoSeguroId)}
        />

        <Grupo
          nombre="paraQuien"
          idBase={idDe("paraQuien")}
          leyenda="¿Para quién es?"
          error={errores.paraQuien}
          columnas="sm:grid-cols-2"
          opciones={PARA_QUIEN.map((p) => ({ id: p.id, texto: p.texto, ayuda: p.ayuda }))}
          valor={v.paraQuien}
          onChange={(id) => cambiar("paraQuien", id as ParaQuienId)}
        />

        <Campo id={idDe("correo")} etiqueta="Tu correo" opcional error={errores.correo}>
          <input
            id={idDe("correo")}
            data-campo="correo"
            type="email"
            inputMode="email"
            value={v.correo}
            onChange={(e) => cambiar("correo", e.target.value)}
            onBlur={() => alSalir("correo")}
            placeholder="nombre@correo.com"
            autoComplete="email"
            aria-invalid={Boolean(errores.correo)}
            aria-describedby={errores.correo ? `${idDe("correo")}-err` : undefined}
            className="field-input"
          />
        </Campo>

        {/* Antispam: señuelo invisible para las personas (fuera de pantalla, sin foco ni autocompletar). Un bot lo llena. */}
        <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor={idDe("senuelo")}>No llenar este campo</label>
          <input id={idDe("senuelo")} name="confirmar_sitio_web" tabIndex={-1} autoComplete="off" value={trampa} onChange={(e) => setTrampa(e.target.value)} />
        </div>

        {requiereConsentimiento && (
          <div>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
              <input
                type="checkbox"
                data-campo="consentimiento"
                checked={v.consentimiento}
                onChange={(e) => cambiar("consentimiento", e.target.checked)}
                aria-required="true"
                aria-invalid={Boolean(errores.consentimiento)}
                aria-describedby={errores.consentimiento ? `${idDe("consentimiento")}-err` : undefined}
                className="mt-1 h-5 w-5 shrink-0 accent-[var(--brand)]"
              />
              <span>
                Acepto el{" "}
                <a href={urlPrivacidad} target="_blank" rel="noopener noreferrer" className="text-brand-2 underline">
                  aviso de privacidad
                </a>{" "}
                y que me contacten por WhatsApp o correo para atender mi solicitud.
                <span aria-hidden="true" className="ml-1 text-brand-2">
                  *
                </span>
              </span>
            </label>
            <MensajeError id={`${idDe("consentimiento")}-err`} texto={errores.consentimiento} />
          </div>
        )}

        {(errorGeneral || cuenta > 0) && (
          <div role="alert" className="rounded-xl border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
            {errorGeneral ? (
              <p>{errorGeneral}</p>
            ) : (
              <p>{cuenta === 1 ? "Revisa el campo marcado en rojo para poder enviar." : `Revisa los ${cuenta} campos marcados en rojo para poder enviar.`}</p>
            )}
          </div>
        )}

        <button type="submit" disabled={ocupado} className="btn-primary w-full text-lg">
          {ocupado ? (
            <>
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> Enviando…
            </>
          ) : (
            textoBoton
          )}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------- Piezas internas ------------------------------------------- */

function Campo({
  id,
  etiqueta,
  obligatorio,
  opcional,
  ayuda,
  error,
  children,
}: {
  id: string;
  etiqueta: string;
  obligatorio?: boolean;
  opcional?: boolean;
  ayuda?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {etiqueta}
        {obligatorio && (
          <span aria-hidden="true" className="ml-1 text-brand-2">
            *
          </span>
        )}
        {opcional && <span className="ml-1 font-normal text-ink-mute">(opcional)</span>}
      </label>
      {children}
      {ayuda && !error && (
        <p id={`${id}-ayuda`} className="mt-1.5 text-xs text-ink-mute">
          {ayuda}
        </p>
      )}
      {ayuda && error && (
        <span id={`${id}-ayuda`} className="sr-only">
          {ayuda}
        </span>
      )}
      <MensajeError id={`${id}-err`} texto={error} />
    </div>
  );
}

function MensajeError({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm text-red">
      <span aria-hidden="true" className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-red text-[11px] font-bold leading-none text-bg">
        !
      </span>
      {texto}
    </p>
  );
}

interface OpcionGrupo {
  id: string;
  texto: string;
  icono?: string;
  ayuda?: string;
}

/** Grupo de opciones tipo tarjeta (botones de radio de verdad: se manejan con flechas y lectores de pantalla). */
function Grupo({
  nombre,
  idBase,
  leyenda,
  error,
  columnas,
  opciones,
  valor,
  onChange,
}: {
  nombre: CampoCotizacion;
  idBase: string;
  leyenda: string;
  error?: string;
  columnas: string;
  opciones: OpcionGrupo[];
  valor: string;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset aria-describedby={error ? `${idBase}-err` : undefined} className="min-w-0">
      <legend className="field-label">
        {leyenda}
        <span aria-hidden="true" className="ml-1 text-brand-2">
          *
        </span>
        <span className="sr-only"> (obligatorio)</span>
      </legend>
      <div className={`grid grid-cols-1 gap-2 ${columnas}`}>
        {opciones.map((o, i) => {
          const marcada = valor === o.id;
          return (
            <label
              key={o.id}
              className={`group relative flex cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 transition-colors hover:border-brand-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-2 ${
                marcada ? "border-brand-2 bg-brand/30" : error ? "border-red/60 bg-glass" : "border-[var(--line-strong)] bg-glass"
              }`}
            >
              <input
                type="radio"
                name={`${idBase}-grupo`}
                value={o.id}
                checked={marcada}
                onChange={() => onChange(o.id)}
                data-campo={i === 0 ? nombre : undefined}
                className="sr-only"
              />
              {o.icono && (
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${marcada ? "border-white/40 bg-white/15 text-white" : "border-[var(--line-strong)] bg-glass text-brand-2"}`} aria-hidden="true">
                  <Ico id={o.icono} className="h-5 w-5" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold leading-snug text-ink">{o.texto}</span>
                {o.ayuda && <span className="block text-xs text-ink-mute">{o.ayuda}</span>}
              </span>
              <span
                aria-hidden="true"
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${marcada ? "border-transparent bg-brand-2 text-white" : "border-[var(--line-strong)] text-transparent"}`}
              >
                <Ico id="check" className="h-3 w-3" trazo={3.4} />
              </span>
            </label>
          );
        })}
      </div>
      <MensajeError id={`${idBase}-err`} texto={error} />
    </fieldset>
  );
}

function Resumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-mute">{etiqueta}</dt>
      <dd className="text-right font-semibold text-ink">{valor}</dd>
    </div>
  );
}

/** Íconos propios (sin descargar nada): los mismos trazos de la tarjeta /roberto. */
const ICONOS: Record<string, ReactNode> = {
  heart: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
  medical: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="M9 12h6" />
      <path d="M12 9v6" />
    </>
  ),
  coins: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </>
  ),
  trend: (
    <>
      <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
      <path d="M16 7h6v6" />
    </>
  ),
  home: (
    <>
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </>
  ),
  car: (
    <>
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
};

function Ico({ id, className, trazo = 1.7 }: { id: string; className?: string; trazo?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={trazo} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONOS[id] ?? null}
    </svg>
  );
}
