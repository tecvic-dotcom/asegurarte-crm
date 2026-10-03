"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { crmLogin } from "@/lib/api";
import type { Sesion } from "@/lib/types";

interface LoginCRMProps {
  onLogin: (sesion: Sesion) => void;
}

export function LoginCRM({ onLogin }: LoginCRMProps) {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEntrando(true);
    try {
      const sesion = await crmLogin(correo, password);
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

        <label className="field-label">Correo</label>
        <input
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          className="field-input"
          placeholder="tucorreo@negocio.com"
          autoComplete="username"
        />
        <label className="field-label mt-4">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field-input"
          placeholder="••••••••"
          autoComplete="current-password"
        />

        {error && <p className="mt-3 text-sm text-[#ff9a9a]">{error}</p>}

        <button type="submit" disabled={entrando} className="btn-primary mt-6 w-full">
          {entrando ? "Entrando…" : "Entrar"}
        </button>

        <p className="mt-5 rounded-xl border border-line bg-glass px-3 py-2 text-center text-xs text-ink-mute">
          Modo demo: <strong>demo@demo.com</strong> / <strong>demo1234</strong>.
          <br />
          (Crea tus usuarios reales en <code>/admin</code> y borra el demo.)
        </p>
      </form>
    </main>
  );
}
