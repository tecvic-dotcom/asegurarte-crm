"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { crmLogin } from "@/lib/api";
import { AvisoRespaldo, PasoCodigo, PasoConfigurar } from "@/components/crm/DobleFactor";
import { TURNSTILE_SITE_KEY, Turnstile } from "@/components/crm/Turnstile";
import type { Sesion } from "@/lib/types";

interface LoginCRMProps {
  onLogin: (sesion: Sesion) => void;
}

const CLAVE_CORREO = "crm.correo.v1";

/** El correo con el que entraste la última vez en ESTE navegador (vacío si no hay o no se puede leer). */
function leerCorreoGuardado(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(CLAVE_CORREO) ?? "";
  } catch {
    return "";
  }
}

/** clave = correo y contraseña · codigo = código de tu app · configurar = enlazar la app (primera vez) · aviso = entró con código de respaldo */
type Paso = "clave" | "codigo" | "configurar" | "aviso";

export function LoginCRM({ onLogin }: LoginCRMProps) {
  // Esta pantalla solo se monta en el navegador (la página espera a revisar tu sesión), así que
  // se puede leer el correo guardado desde el primer pintado sin chocar con el servidor.
  const [recordado] = useState(leerCorreoGuardado);
  const [correo, setCorreo] = useState(recordado);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [paso, setPaso] = useState<Paso>("clave");
  // Captcha: el token solo sirve una vez, así que tras cada intento se pide uno nuevo.
  const captchaOn = Boolean(TURNSTILE_SITE_KEY);
  const [captcha, setCaptcha] = useState("");
  const [captchaFallo, setCaptchaFallo] = useState(false);
  const [reinicioCaptcha, setReinicioCaptcha] = useState(0);
  const [aviso, setAviso] = useState<{ sesion: Sesion; restantes: number } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEntrando(true);
    try {
      const r = await crmLogin(correo, password, captcha);
      setPassword("");
      setPaso(r.paso);
      setEntrando(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
      setEntrando(false);
      if (captchaOn) setReinicioCaptcha((n) => n + 1); // el token ya se gastó: pide uno nuevo
    }
  }

  /** Terminó el segundo paso: ya hay sesión. */
  function terminar(sesion: Sesion, respaldoRestantes?: number) {
    // Solo se recuerda si entró bien: un correo mal escrito no se queda guardado.
    try {
      window.localStorage.setItem(CLAVE_CORREO, correo.trim());
    } catch {
      /* sin almacenamiento: simplemente no se recuerda */
    }
    if (respaldoRestantes !== undefined) {
      setAviso({ sesion, restantes: respaldoRestantes });
      setPaso("aviso");
      return;
    }
    onLogin(sesion);
  }

  function volver(mensaje?: string) {
    setPaso("clave");
    setPassword("");
    setCaptcha("");
    setError(mensaje ?? "");
  }

  const bloqueadoPorCaptcha = captchaOn && (!captcha || captchaFallo);

  return (
    <main className="grid min-h-[80vh] place-items-center px-5">
      <div className={`glass-strong w-full rounded-[22px] p-8 ${paso === "configurar" ? "max-w-md" : "max-w-sm"}`}>
        {paso === "codigo" && <PasoCodigo onEntrar={terminar} onReiniciar={volver} />}
        {paso === "configurar" && <PasoConfigurar onEntrar={terminar} onReiniciar={volver} />}
        {paso === "aviso" && aviso && <AvisoRespaldo restantes={aviso.restantes} onContinuar={() => onLogin(aviso.sesion)} />}

        {paso === "clave" && (
          <form onSubmit={onSubmit}>
            <div className="mb-6 text-center">
              <Icon icon="flat-color-icons:business-contact" width={56} className="mx-auto" />
              <h1 className="mt-3 font-display text-2xl text-ink">Tu CRM</h1>
              <p className="text-sm text-ink-mute">Entra para ver y atender a tus prospectos.</p>
            </div>

            <label className="field-label" htmlFor="crm-correo">Correo</label>
            <input
              id="crm-correo"
              name="email"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="field-input"
              placeholder="tucorreo@negocio.com"
              autoComplete="username"
            />
            <label className="field-label mt-4" htmlFor="crm-password">Contraseña</label>
            <input
              id="crm-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-input"
              placeholder="••••••••"
              autoComplete="current-password"
              // Si ya sabemos tu correo, el cursor queda directo en la contraseña.
              autoFocus={Boolean(recordado)}
            />

            {captchaOn && (
              <div className="mt-4">
                <Turnstile onToken={setCaptcha} onFallo={() => setCaptchaFallo(true)} reinicio={reinicioCaptcha} />
              </div>
            )}
            {captchaFallo && (
              <p className="mt-3 text-sm text-[#ff9a9a]" role="alert">
                No pude cargar la verificación anti-robots. Revisa tu internet o desactiva el bloqueador de anuncios y recarga la página.
              </p>
            )}

            {error && (
              <p className="mt-3 text-sm text-[#ff9a9a]" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={entrando || bloqueadoPorCaptcha} className="btn-primary mt-6 w-full">
              {entrando ? "Entrando…" : captchaOn && !captcha && !captchaFallo ? "Verificando…" : "Entrar"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
