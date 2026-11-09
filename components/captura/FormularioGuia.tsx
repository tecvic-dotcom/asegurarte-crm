"use client";

/**
 * «Guía para futuros papás»: tarjeta con su formulario (nombre, WhatsApp y correo) para la landing de bebé.
 * Envía a /api/guia-futuros-papas (guarda al prospecto en el CRM con origen «Guía para futuros papás») y entrega el PDF al instante.
 * Antispam: señuelo invisible, tiempo mínimo de 3 s y un solo envío a la vez; el servidor valida todo otra vez.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "@iconify/react";
import { CONTENIDO } from "@/lib/landing-content";
import { NOMBRE_ARCHIVO_GUIA, URL_GUIA_FUTUROS_PAPAS, validarProspectoGuia } from "@/lib/guia-futuros-papas-reglas";
import { normWhatsapp } from "@/lib/normalize";
import { dispararConversionLead } from "@/lib/pixels";
import { capturarUTMs, leerUTMs } from "@/lib/utm";

type Fase = "editando" | "enviando" | "listo";
type Errores = Partial<Record<"nombre" | "whatsapp" | "correo" | "consentimiento", string>>;

/** WhatsApp «bonito» mientras se escribe: 81 1234 5678 (acepta pegados con +52 / 521). */
function formatearWhatsapp(v: string): string {
  const d = normWhatsapp(v).slice(0, 10);
  return d.length > 6 ? `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}` : d.length > 2 ? `${d.slice(0, 2)} ${d.slice(2)}` : d;
}

export function FormularioGuia() {
  const base = useId();
  const montadoEn = useRef(0);
  const enviando = useRef(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const [v, setV] = useState({ nombre: "", whatsapp: "", correo: "" });
  const [consiente, setConsiente] = useState(false);
  const [trampa, setTrampa] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState("");
  const [fase, setFase] = useState<Fase>("editando");
  const [url, setUrl] = useState(URL_GUIA_FUTUROS_PAPAS);

  useEffect(() => {
    montadoEn.current = Date.now();
    capturarUTMs();
  }, []);
  useEffect(() => {
    if (fase === "listo") titulo.current?.focus();
  }, [fase]);

  const id = (campo: string) => `${base}-${campo}`;
  const primerNombre = v.nombre.trim().split(/\s+/)[0] ?? "";
  const whatsappUrl = `https://wa.me/${CONTENIDO.contacto.whatsapp}?text=${encodeURIComponent("Hola Roberto, descargué tu «Guía para futuros papás» y tengo una duda.")}`;

  async function alEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando.current) return;
    setAviso("");
    const val = validarProspectoGuia({ ...v, consentimiento: consiente });
    setErrores(val.errores);
    if (!val.ok) {
      const primero = (["nombre", "whatsapp", "correo", "consentimiento"] as const).find((k) => val.errores[k]);
      if (primero) (e.currentTarget.querySelector(`[data-campo="${primero}"]`) as HTMLElement | null)?.focus();
      return;
    }
    if (Date.now() - montadoEn.current < 3000) {
      setAviso("Un momento: revisa tus datos con calma y vuelve a enviar.");
      return;
    }
    enviando.current = true;
    setFase("enviando");
    try {
      const utm = leerUTMs();
      const r = await fetch("/api/guia-futuros-papas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nombre: val.nombre, whatsapp: val.whatsapp, correo: val.correo, consentimiento: true, trampa, utm, f: "landing" }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string; errores?: Errores };
      if (r.ok && j.ok && typeof j.url === "string" && j.url.startsWith("/descargas/")) {
        setUrl(j.url);
        setFase("listo");
        dispararConversionLead();
        return;
      }
      if (r.status === 422 && j.errores) setErrores(j.errores);
      else setAviso(j.error ?? "No pudimos enviar tus datos. Intenta de nuevo en unos minutos.");
      setFase("editando");
    } catch {
      setAviso("No pudimos enviar tus datos. Revisa tu conexión e inténtalo otra vez; lo que escribiste sigue aquí.");
      setFase("editando");
    } finally {
      enviando.current = false;
    }
  }

  const campo = (k: keyof typeof v, etiqueta: string, props: { type?: string; placeholder: string; autoComplete: string; inputMode?: "tel" | "email" | "text"; ayuda?: string; error?: string }) => (
    <div>
      <label htmlFor={id(k)} className="field-label">
        {etiqueta} <span className="text-brand-2">*</span>
      </label>
      <input
        id={id(k)}
        data-campo={k}
        type={props.type ?? "text"}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        value={v[k]}
        maxLength={k === "nombre" ? 80 : undefined}
        aria-invalid={Boolean(props.error)}
        aria-describedby={props.error ? `${id(k)}-err` : props.ayuda ? `${id(k)}-ayuda` : undefined}
        onChange={(e) => {
          setV((p) => ({ ...p, [k]: k === "whatsapp" ? formatearWhatsapp(e.target.value) : e.target.value }));
          if (errores[k]) setErrores((p) => ({ ...p, [k]: undefined }));
        }}
        className="field-input"
      />
      {props.ayuda && !props.error && (
        <p id={`${id(k)}-ayuda`} className="mt-1.5 text-xs text-ink-mute">
          {props.ayuda}
        </p>
      )}
      {props.error && (
        <p id={`${id(k)}-err`} role="alert" className="mt-1.5 text-sm text-[#ff9a9a]">
          {props.error}
        </p>
      )}
    </div>
  );

  return (
    <section aria-labelledby={id("t")} className="glass-highlight mx-auto grid max-w-4xl items-start gap-8 rounded-[28px] p-6 sm:p-10 md:grid-cols-[1fr_1fr]">
      <div>
        <span className="chip">
          <Icon icon="flat-color-icons:reading-ebook" width={16} /> Guía gratuita
        </span>
        <h3 id={id("t")} className="mt-4 font-display text-2xl text-ink sm:text-3xl">
          ¿Estás por convertirte en papá o mamá?
        </h3>
        <p className="mt-3 text-ink-soft">Descubre qué decisiones de protección conviene considerar antes de la llegada de tu bebé.</p>
        <ul className="mt-5 space-y-3 text-sm text-ink-soft">
          {[
            "Cuándo conviene contratar y por qué el periodo de espera cambia el calendario.",
            "Qué da la cobertura de maternidad y cómo queda protegido el recién nacido.",
            "Lo que no cubre y 8 preguntas para hacer antes de contratar.",
          ].map((t) => (
            <li key={t} className="flex items-start gap-3">
              <Icon icon="flat-color-icons:checkmark" width={18} className="mt-0.5 shrink-0" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-ink-mute">Sin costo. La recibes al instante, en PDF.</p>
      </div>

      {fase === "listo" ? (
        <div className="glass-strong rounded-[22px] p-6 text-center sm:p-8" aria-live="polite">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green/15" aria-hidden="true">
            <Icon icon="flat-color-icons:ok" width={40} />
          </span>
          <h4 ref={titulo} tabIndex={-1} className="mt-4 font-display text-2xl text-ink outline-none">
            {primerNombre ? `¡Listo, ${primerNombre}! ` : "¡Listo! "}Aquí está tu guía
          </h4>
          <p className="mt-2 text-sm text-ink-soft">Descárgala y léela con calma. Si algo te queda en duda, escríbeme.</p>
          <a href={url} download={NOMBRE_ARCHIVO_GUIA} className="btn-primary mt-5 w-full text-lg">
            <Icon icon="flat-color-icons:download" width={22} /> Descargar guía (PDF)
          </a>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-3 w-full">
            <Icon icon="logos:whatsapp-icon" width={20} /> Tengo una duda: escríbeme
          </a>
        </div>
      ) : (
        <form onSubmit={alEnviar} noValidate aria-busy={fase === "enviando"} className="glass-strong space-y-4 rounded-[22px] p-6 sm:p-8">
          {campo("nombre", "Tu nombre", { placeholder: "Ej. María González", autoComplete: "name", error: errores.nombre })}
          {campo("whatsapp", "Tu WhatsApp", { type: "tel", inputMode: "tel", placeholder: "81 1234 5678", autoComplete: "tel", ayuda: "10 dígitos. Es por donde te escribiré si te queda alguna duda.", error: errores.whatsapp })}
          {campo("correo", "Tu correo", { type: "email", inputMode: "email", placeholder: "nombre@correo.com", autoComplete: "email", error: errores.correo })}

          {/* Señuelo anti-bot: invisible para las personas */}
          <div aria-hidden className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
            <label htmlFor={id("trampa")}>No llenar este campo</label>
            <input id={id("trampa")} tabIndex={-1} autoComplete="off" value={trampa} onChange={(e) => setTrampa(e.target.value)} />
          </div>

          <div>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
              <input
                type="checkbox"
                data-campo="consentimiento"
                checked={consiente}
                onChange={(e) => {
                  setConsiente(e.target.checked);
                  if (errores.consentimiento) setErrores((p) => ({ ...p, consentimiento: undefined }));
                }}
                className="mt-1 h-4 w-4 accent-[var(--brand)]"
              />
              <span>
                Acepto el{" "}
                <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-brand-2 underline">
                  aviso de privacidad
                </a>{" "}
                y que Roberto me contacte por WhatsApp o correo.
              </span>
            </label>
            {errores.consentimiento && (
              <p role="alert" className="mt-1.5 text-sm text-[#ff9a9a]">
                {errores.consentimiento}
              </p>
            )}
          </div>

          {aviso && (
            <p role="alert" className="flex items-start gap-2 text-sm text-[#ff9a9a]">
              <Icon icon="flat-color-icons:high-priority" width={18} className="mt-0.5 shrink-0" /> {aviso}
            </p>
          )}
          <button type="submit" disabled={fase === "enviando"} className="btn-primary w-full text-lg">
            {fase === "enviando" ? "Enviando…" : "Recibir guía gratuita"}
            {fase !== "enviando" && <Icon icon="flat-color-icons:download" width={22} />}
          </button>
        </form>
      )}
    </section>
  );
}
