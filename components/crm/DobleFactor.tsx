"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { crm2faConfirmar, crm2faIniciar, crm2faVerificar, ErrorLogin, type DatosEnlace } from "@/lib/api";
import type { Sesion } from "@/lib/types";

/**
 * Segundo paso del login (doble factor):
 *  - PasoCodigo: ya enlazaste tu app → escribe el código de 6 dígitos (o uno de respaldo).
 *  - PasoConfigurar: primera vez → escanea el QR, escribe el primer código y guarda tus códigos de respaldo.
 */

interface PasoProps {
  /** Terminó bien: ya hay sesión. `respaldoRestantes` solo viene si entró con un código de respaldo. */
  onEntrar: (sesion: Sesion, respaldoRestantes?: number) => void;
  /** Volver al primer paso (la verificación venció o ya no aplica). */
  onReiniciar: (mensaje?: string) => void;
}

const soloDigitos = (v: string) => v.replace(/\D/g, "").slice(0, 6);

// ----------------------------------------------------------------------------
// Ya tienes tu app enlazada
// ----------------------------------------------------------------------------

export function PasoCodigo({ onEntrar, onReiniciar }: PasoProps) {
  const [codigo, setCodigo] = useState("");
  const [respaldo, setRespaldo] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(valor: string) {
    if (enviando) return;
    setError("");
    setEnviando(true);
    try {
      const r = await crm2faVerificar(valor);
      onEntrar(r.sesion, r.respaldoRestantes);
    } catch (err) {
      if (err instanceof ErrorLogin && err.reinicia) return onReiniciar(err.message);
      setError(err instanceof Error ? err.message : "No se pudo verificar el código.");
      setEnviando(false);
      setCodigo("");
    }
  }

  function cambiar(v: string) {
    if (respaldo) return setCodigo(v.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 11));
    const d = soloDigitos(v);
    setCodigo(d);
    if (d.length === 6) void enviar(d); // al completar los 6 dígitos entra solo
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (codigo) void enviar(codigo);
      }}
    >
      <div className="mb-6 text-center">
        <Icon icon="flat-color-icons:key" width={56} className="mx-auto" />
        <h1 className="mt-3 font-display text-2xl text-ink">Verificación en dos pasos</h1>
        <p className="text-sm text-ink-mute">
          {respaldo
            ? "Escribe uno de tus códigos de respaldo. Cada uno sirve una sola vez."
            : "Abre tu app autenticadora y escribe el código de 6 dígitos de «Asegurarte CRM»."}
        </p>
      </div>

      <label className="field-label" htmlFor="crm-codigo">
        {respaldo ? "Código de respaldo" : "Código de 6 dígitos"}
      </label>
      <input
        id="crm-codigo"
        name="otp"
        value={codigo}
        onChange={(e) => cambiar(e.target.value)}
        className="field-input text-center text-2xl tracking-[0.3em]"
        placeholder={respaldo ? "XXXXX-XXXXX" : "••••••"}
        inputMode={respaldo ? "text" : "numeric"}
        autoComplete="one-time-code"
        autoCapitalize="characters"
        spellCheck={false}
        autoFocus
        disabled={enviando}
      />

      {error && (
        <p className="mt-3 text-sm text-[#ff9a9a]" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={enviando || !codigo} className="btn-primary mt-6 w-full">
        {enviando ? "Verificando…" : "Entrar"}
      </button>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => {
            setRespaldo(!respaldo);
            setCodigo("");
            setError("");
          }}
          className="text-ink-mute underline-offset-2 hover:text-ink hover:underline"
        >
          {respaldo ? "Usar el código de mi app" : "No tengo mi celular"}
        </button>
        <button type="button" onClick={() => onReiniciar()} className="text-ink-mute underline-offset-2 hover:text-ink hover:underline">
          ← Volver
        </button>
      </div>
    </form>
  );
}

// ----------------------------------------------------------------------------
// Primera vez: enlazar la app
// ----------------------------------------------------------------------------

export function PasoConfigurar({ onEntrar, onReiniciar }: PasoProps) {
  const [datos, setDatos] = useState<DatosEnlace | null>(null);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<{ sesion: Sesion; codigos: string[] } | null>(null);
  // Pedir el QR crea un secreto nuevo en el servidor: solo se pide una vez aunque React monte dos veces en desarrollo.
  const pedido = useRef(false);

  function pedirQr() {
    setError("");
    crm2faIniciar().then(setDatos, (err: unknown) => {
      if (err instanceof ErrorLogin && err.reinicia) return onReiniciar(err.message);
      setError(err instanceof Error ? err.message : "No pude generar el código QR.");
    });
  }

  useEffect(() => {
    if (pedido.current) return;
    pedido.current = true;
    pedirQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmar(valor: string) {
    if (enviando) return;
    setError("");
    setEnviando(true);
    try {
      setListo(await crm2faConfirmar(valor));
    } catch (err) {
      if (err instanceof ErrorLogin && err.reinicia) return onReiniciar(err.message);
      setError(err instanceof Error ? err.message : "No se pudo verificar el código.");
      setEnviando(false);
      setCodigo("");
    }
  }

  if (listo) return <CodigosRespaldo codigos={listo.codigos} onContinuar={() => onEntrar(listo.sesion)} />;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (codigo.length === 6) void confirmar(codigo);
      }}
    >
      <div className="mb-5 text-center">
        <Icon icon="flat-color-icons:security-checked" width={56} className="mx-auto" />
        <h1 className="mt-3 font-display text-2xl text-ink">Protege tu CRM</h1>
        <p className="text-sm text-ink-mute">
          Cada vez que entres te pediremos un código de tu celular. Solo lo enlazas una vez.
        </p>
      </div>

      <ol className="space-y-1 text-sm text-ink-soft">
        <li>
          <strong>1.</strong> Instala <em>Google Authenticator</em> o <em>Microsoft Authenticator</em> (gratis).
        </li>
        <li>
          <strong>2.</strong> Ábrela, toca <em>+</em> y escanea este código:
        </li>
      </ol>

      <div className="mx-auto mt-3 grid h-[240px] w-[240px] place-items-center rounded-xl bg-white">
        {datos ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={datos.qr} alt="Código QR para enlazar tu app autenticadora" width={240} height={240} />
        ) : error ? (
          <button type="button" onClick={pedirQr} className="btn-ghost px-3 py-2 text-sm text-black">
            Reintentar
          </button>
        ) : (
          <span className="text-sm text-neutral-500">Generando…</span>
        )}
      </div>

      {datos && (
        <details className="mt-3 text-sm text-ink-mute">
          <summary className="cursor-pointer hover:text-ink">¿No puedes escanearlo?</summary>
          <p className="mt-2">
            En tu app elige «Ingresar clave de configuración» y escribe esta clave (cuenta: tu correo, tipo: basada en tiempo):
          </p>
          <p className="mt-2 select-all break-all rounded-lg border border-line bg-glass px-3 py-2 text-center font-mono text-ink">
            {datos.secreto.match(/.{1,4}/g)?.join(" ")}
          </p>
          <p className="mt-2">
            ¿Estás entrando desde el mismo celular?{" "}
            <a href={datos.uri} className="underline">
              Ábrelo directo en tu app
            </a>
            .
          </p>
        </details>
      )}

      <p className="mt-4 text-sm text-ink-soft">
        <strong>3.</strong> Escribe el código de 6 dígitos que muestra tu app:
      </p>
      <input
        id="crm-codigo"
        name="otp"
        value={codigo}
        onChange={(e) => {
          const d = soloDigitos(e.target.value);
          setCodigo(d);
          if (d.length === 6) void confirmar(d);
        }}
        className="field-input mt-2 text-center text-2xl tracking-[0.3em]"
        placeholder="••••••"
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Código de 6 dígitos"
        disabled={enviando || !datos}
      />

      {error && (
        <p className="mt-3 text-sm text-[#ff9a9a]" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={enviando || codigo.length !== 6} className="btn-primary mt-5 w-full">
        {enviando ? "Verificando…" : "Activar y entrar"}
      </button>
      <button
        type="button"
        onClick={() => onReiniciar()}
        className="mt-3 block w-full text-center text-sm text-ink-mute underline-offset-2 hover:text-ink hover:underline"
      >
        ← Volver
      </button>
    </form>
  );
}

// ----------------------------------------------------------------------------
// Códigos de respaldo (se muestran una sola vez)
// ----------------------------------------------------------------------------

function CodigosRespaldo({ codigos, onContinuar }: { codigos: string[]; onContinuar: () => void }) {
  const [guardados, setGuardados] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const texto = `Asegurarte CRM — códigos de respaldo (cada uno sirve una sola vez)\n\n${codigos.join("\n")}\n`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      /* sin permiso para copiar: se pueden seleccionar a mano o descargar */
    }
  }

  function descargar() {
    const url = URL.createObjectURL(new Blob([texto], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "codigos-respaldo-asegurarte-crm.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-5 text-center">
        <Icon icon="flat-color-icons:ok" width={56} className="mx-auto" />
        <h1 className="mt-3 font-display text-2xl text-ink">¡Listo, ya estás protegido!</h1>
        <p className="text-sm text-ink-mute">
          Guarda estos 10 códigos en un lugar seguro (gestor de contraseñas o impresos). Si pierdes tu celular, cada uno te deja entrar una vez.{" "}
          <strong className="text-ink">No se vuelven a mostrar.</strong>
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-glass p-3 font-mono text-sm text-ink" aria-label="Códigos de respaldo">
        {codigos.map((c) => (
          <li key={c} className="select-all text-center">
            {c}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => void copiar()} className="btn-ghost flex-1 px-3 py-2 text-sm">
          {copiado ? "Copiados ✓" : "Copiar"}
        </button>
        <button type="button" onClick={descargar} className="btn-ghost flex-1 px-3 py-2 text-sm">
          Descargar .txt
        </button>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={guardados} onChange={(e) => setGuardados(e.target.checked)} className="mt-1" />
        Ya guardé mis códigos de respaldo en un lugar seguro.
      </label>

      <button type="button" disabled={!guardados} onClick={onContinuar} className="btn-primary mt-4 w-full">
        Entrar al CRM
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Aviso tras entrar con un código de respaldo
// ----------------------------------------------------------------------------

export function AvisoRespaldo({ restantes, onContinuar }: { restantes: number; onContinuar: () => void }) {
  return (
    <div className="text-center">
      <Icon icon="flat-color-icons:info" width={56} className="mx-auto" />
      <h1 className="mt-3 font-display text-2xl text-ink">Entraste con un código de respaldo</h1>
      <p className="mt-2 text-sm text-ink-mute">
        {restantes > 0
          ? `Te ${restantes === 1 ? "queda 1 código" : `quedan ${restantes} códigos`} de respaldo.`
          : "Ya no te quedan códigos de respaldo."}{" "}
        Si cambiaste de celular, entra a <strong>Panel de admin → Usuarios</strong> y pulsa «Restablecer 2FA» en tu usuario:
        en tu próximo ingreso enlazas la app nueva y recibes códigos nuevos.
      </p>
      <button type="button" onClick={onContinuar} className="btn-primary mt-6 w-full">
        Continuar
      </button>
    </div>
  );
}
