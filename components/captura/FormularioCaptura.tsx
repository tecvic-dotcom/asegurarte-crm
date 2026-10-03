"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { enviarLead } from "@/lib/api";
import { capturarUTMs, leerUTMs } from "@/lib/utm";
import { validarLead } from "@/lib/validacion";

interface FormularioCapturaProps {
  titulo: string;
  nota: string;
  boton: string;
}

type Campos = { nombre: string; correo: string; whatsapp: string; mensaje: string };
const VACIO: Campos = { nombre: "", correo: "", whatsapp: "", mensaje: "" };

export function FormularioCaptura({ titulo, nota, boton }: FormularioCapturaProps) {
  const router = useRouter();
  const [campos, setCampos] = useState<Campos>(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [consentimiento, setConsentimiento] = useState(false);
  const [trampa, setTrampa] = useState(""); // honeypot
  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");
  const baseId = useId();

  // Captura las UTMs al primer arribo (las persiste en sessionStorage). No
  // guardamos en estado: las leemos al enviar. Así no hay setState en el efecto.
  useEffect(() => {
    capturarUTMs();
  }, []);

  function set<K extends keyof Campos>(k: K, v: string) {
    setCampos((c) => ({ ...c, [k]: v }));
    if (errores[k]) setErrores((e) => ({ ...e, [k]: "" }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorGeneral("");
    const v = validarLead(campos);
    if (!v.ok) {
      setErrores(v.errores);
      return;
    }
    if (!consentimiento) {
      setErrorGeneral("Marca la casilla de privacidad para continuar.");
      return;
    }
    setEnviando(true);
    try {
      const r = await enviarLead({ ...campos, utm: leerUTMs(), consentimiento, trampa });
      if (!r.ok && r.errores) {
        setErrores(r.errores);
        setEnviando(false);
        return;
      }
      router.push("/gracias");
    } catch (err) {
      setErrorGeneral(err instanceof Error ? err.message : "No se pudo enviar. Intenta de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="glass-strong rounded-[22px] p-6 sm:p-8">
      <h3 className="font-display text-2xl text-ink">{titulo}</h3>
      <p className="mt-1 text-sm text-ink-mute">{nota}</p>

      <div className="mt-6 space-y-4">
        <Campo
          id={`${baseId}-nombre`}
          label="Tu nombre"
          value={campos.nombre}
          onChange={(v) => set("nombre", v)}
          error={errores.nombre}
          placeholder="Ej. María González"
          autoComplete="name"
        />
        <Campo
          id={`${baseId}-correo`}
          label="Tu correo"
          type="email"
          value={campos.correo}
          onChange={(v) => set("correo", v)}
          error={errores.correo}
          placeholder="nombre@correo.com"
          autoComplete="email"
        />
        <Campo
          id={`${baseId}-whatsapp`}
          label="Tu WhatsApp"
          type="tel"
          value={campos.whatsapp}
          onChange={(v) => set("whatsapp", v)}
          error={errores.whatsapp}
          placeholder="33 1234 5678"
          autoComplete="tel"
        />

        {/* Honeypot anti-spam: invisible para humanos, tentador para bots. */}
        <div aria-hidden className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor={`${baseId}-trampa`}>No llenar</label>
          <input
            id={`${baseId}-trampa`}
            tabIndex={-1}
            autoComplete="off"
            value={trampa}
            onChange={(e) => setTrampa(e.target.value)}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={consentimiento}
            onChange={(e) => setConsentimiento(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--brand)]"
          />
          <span>
            Acepto el{" "}
            <a href="/privacidad" target="_blank" className="text-brand-2 underline">
              aviso de privacidad
            </a>{" "}
            y que me contacten por este medio.
          </span>
        </label>

        {errorGeneral && (
          <p className="flex items-center gap-2 text-sm text-[#ff9a9a]">
            <Icon icon="flat-color-icons:high-priority" width={18} /> {errorGeneral}
          </p>
        )}

        <button type="submit" disabled={enviando || !consentimiento} className="btn-primary w-full text-lg">
          {enviando ? "Enviando…" : boton}
          {!enviando && <Icon icon="flat-color-icons:right" width={22} />}
        </button>
      </div>
    </form>
  );
}

interface CampoProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}

function Campo({ id, label, value, onChange, error, placeholder, type = "text", autoComplete }: CampoProps) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : undefined}
        className="field-input"
      />
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-sm text-[#ff9a9a]">
          {error}
        </p>
      )}
    </div>
  );
}
