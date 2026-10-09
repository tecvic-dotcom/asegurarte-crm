"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { crmLogin } from "@/lib/api";
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

export function LoginCRM({ onLogin }: LoginCRMProps) {
  // Esta pantalla solo se monta en el navegador (la página espera a revisar tu sesión), así que
  // se puede leer el correo guardado desde el primer pintado sin chocar con el servidor.
  const [recordado] = useState(leerCorreoGuardado);
  const [correo, setCorreo] = useState(recordado);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEntrando(true);
    try {
      const sesion = await crmLogin(correo, password);
      // Solo se recuerda si entró bien: un correo mal escrito no se queda guardado.
      try {
        window.localStorage.setItem(CLAVE_CORREO, correo.trim());
      } catch {
        /* sin almacenamiento: simplemente no se recuerda */
      }
      onLogin(sesion);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
      setEntrando(false);
    }
  }

  return (
    <main className="grid min-h-[80vh] place-items-center px-5">
      <form onSubmit={onSubmit} className="glass-strong w-full max-w-sm rounded-[22px] p-8">
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

        {error && <p className="mt-3 text-sm text-[#ff9a9a]">{error}</p>}

        <button type="submit" disabled={entrando} className="btn-primary mt-6 w-full">
          {entrando ? "Entrando…" : "Entrar"}
        </button>

        <p className="mt-5 rounded-xl border border-line bg-glass px-3 py-2 text-center text-xs text-ink-mute">
          Modo demo: <strong>demo@demo.com</strong> / <strong>demo1234</strong>.
          <br />
          (Crea tus usuarios reales en Panel de admin (menú izquierdo) y borra el demo.)
        </p>
      </form>
    </main>
  );
}
