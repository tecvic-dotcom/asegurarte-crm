"use client";

/**
 * Formulario de la guía gratuita del libro (/guia-ia): nombre + correo + aviso de privacidad.
 * Envía a /api/guia-ia (lista aparte de lectores, correo de bienvenida) y entrega el PDF al instante.
 * Antispam: señuelo invisible, tiempo mínimo de 3 s y un solo envío a la vez; el servidor valida todo otra vez.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { NOMBRE_ARCHIVO_GUIA_IA, URL_GUIA_IA, validarLector } from "@/lib/lectores-reglas";
import { dispararConversionLead } from "@/lib/pixels";
import { capturarUTMs, leerUTMs } from "@/lib/utm";

type Fase = "editando" | "enviando" | "listo";
type Errores = Partial<Record<"nombre" | "correo" | "consentimiento", string>>;

export function FormularioGuiaIA() {
  const base = useId();
  const montadoEn = useRef(0);
  const enviando = useRef(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const [v, setV] = useState({ nombre: "", correo: "" });
  const [consiente, setConsiente] = useState(false);
  const [trampa, setTrampa] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState("");
  const [fase, setFase] = useState<Fase>("editando");
  const [url, setUrl] = useState(URL_GUIA_IA);

  useEffect(() => {
    montadoEn.current = Date.now();
    capturarUTMs();
  }, []);
  useEffect(() => {
    if (fase === "listo") titulo.current?.focus();
  }, [fase]);

  const id = (c: string) => `${base}-${c}`;
  const primerNombre = v.nombre.trim().split(/\s+/)[0] ?? "";

  async function alEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando.current) return;
    setAviso("");
    const val = validarLector({ ...v, consentimiento: consiente });
    setErrores(val.errores);
    if (!val.ok) {
      const primero = (["nombre", "correo", "consentimiento"] as const).find((k) => val.errores[k]);
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
      const r = await fetch("/api/guia-ia", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nombre: val.nombre, correo: val.correo, consentimiento: true, trampa, utm: leerUTMs() }),
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

  if (fase === "listo") {
    return (
      <div className="glass-strong rounded-[22px] p-6 text-center sm:p-8" aria-live="polite">
        <span aria-hidden="true" className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand/15 text-3xl">
          ✓
        </span>
        <h2 ref={titulo} tabIndex={-1} className="mt-4 font-display text-2xl text-ink outline-none">
          {primerNombre ? `Listo, ${primerNombre}. ` : "Listo. "}Aquí está tu guía
        </h2>
        <p className="mt-2 text-sm text-ink-soft">También te la mandé a tu correo. Si no la ves en unos minutos, revisa la carpeta de promociones o de spam.</p>
        <a href={url} download={NOMBRE_ARCHIVO_GUIA_IA} className="btn-primary mt-5 w-full text-lg">
          Descargar guía (PDF)
        </a>
        <p className="mt-5 text-sm text-ink-soft">Empieza por la página 5: copia el primer prompt y pruébalo hoy.</p>
        <a href="/libro" className="btn-ghost mt-4 w-full">
          Conocer el libro completo
        </a>
      </div>
    );
  }

  const campo = (k: keyof typeof v, etiqueta: string, p: { type: string; placeholder: string; autoComplete: string; inputMode?: "email" | "text"; error?: string }) => (
    <div>
      <label htmlFor={id(k)} className="field-label">
        {etiqueta} <span className="text-brand-2">*</span>
      </label>
      <input
        id={id(k)}
        data-campo={k}
        type={p.type}
        inputMode={p.inputMode}
        autoComplete={p.autoComplete}
        placeholder={p.placeholder}
        value={v[k]}
        maxLength={k === "nombre" ? 80 : 254}
        aria-invalid={Boolean(p.error)}
        aria-describedby={p.error ? `${id(k)}-err` : undefined}
        onChange={(e) => {
          setV((x) => ({ ...x, [k]: e.target.value }));
          if (errores[k]) setErrores((x) => ({ ...x, [k]: undefined }));
        }}
        className="field-input"
      />
      {p.error && (
        <p id={`${id(k)}-err`} role="alert" className="mt-1.5 text-sm text-[#ff9a9a]">
          {p.error}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={alEnviar} noValidate aria-busy={fase === "enviando"} className="glass-strong relative space-y-4 rounded-[22px] p-6 sm:p-8">
      <p className="font-display text-xl text-ink">Recíbela gratis</p>
      {campo("nombre", "Tu nombre", { type: "text", placeholder: "Ej. María González", autoComplete: "name", error: errores.nombre })}
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
              if (errores.consentimiento) setErrores((x) => ({ ...x, consentimiento: undefined }));
            }}
            className="mt-1 h-4 w-4 accent-[var(--brand)]"
          />
          <span>
            Acepto el{" "}
            <a href="/guia-ia/privacidad" target="_blank" rel="noopener noreferrer" className="text-brand-2 underline">
              aviso de privacidad
            </a>{" "}
            y recibir por correo la guía y algunos mensajes sobre el libro. Me puedo dar de baja cuando quiera.
          </span>
        </label>
        {errores.consentimiento && (
          <p role="alert" className="mt-1.5 text-sm text-[#ff9a9a]">
            {errores.consentimiento}
          </p>
        )}
      </div>

      {aviso && (
        <p role="alert" className="text-sm text-[#ff9a9a]">
          {aviso}
        </p>
      )}
      <button type="submit" disabled={fase === "enviando"} className="btn-primary w-full text-lg">
        {fase === "enviando" ? "Enviando…" : "Quiero la guía gratis"}
      </button>
      <p className="text-center text-xs text-ink-mute">PDF de 7 páginas. Te llega al instante.</p>
    </form>
  );
}
