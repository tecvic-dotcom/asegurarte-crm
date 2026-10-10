"use client";

import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { crmGuardarMensajeSeguimiento } from "@/lib/api";
import {
  MOTIVOS_SEGUIMIENTO,
  PLANTILLAS_SEGUIMIENTO,
  VARIABLES_SEGUIMIENTO,
  rellenarSeguimiento,
  validarMensajeSeguimiento,
  type MotivoSeguimiento,
} from "@/lib/seguimiento-reglas";
import type { Lead } from "@/lib/types";

/** Del prospecto solo hace falta lo que usan las variables. */
export type EjemploProspecto = Pick<Lead, "id" | "nombre" | "ramo">;

interface EditorMensajesSofiProps {
  /** Lo que ya personalizaste (solo las situaciones que cambiaste). */
  personalizadas: Partial<Record<MotivoSeguimiento, string>>;
  /** Prospectos de ejemplo para la vista previa (el primero de cada situación, si hay). */
  ejemplos: Partial<Record<MotivoSeguimiento, EjemploProspecto>>;
  onCambio: (motivo: MotivoSeguimiento, texto: string | null) => void;
  onCerrar: () => void;
}

const MUESTRA: EjemploProspecto = { id: "muestra", nombre: "MYRNA MURGA CHAPA", ramo: "vida" };

/** Escribe tus propios mensajes de WhatsApp para cada situación de seguimiento. {saludo}, {seguro}… se rellenan solos con los datos de cada prospecto. */
export function EditorMensajesSofi({ personalizadas, ejemplos, onCambio, onCerrar }: EditorMensajesSofiProps) {
  return (
    <section className="glass-strong space-y-4 rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink">Mis mensajes de WhatsApp</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Escribe cómo quieres que suene cada mensaje. Los datos entre llaves, como <strong className="text-ink">{"{saludo}"}</strong> o{" "}
            <strong className="text-ink">{"{seguro}"}</strong>, se rellenan solos con los de cada prospecto. Sofi nunca envía nada: tú mandas.
          </p>
        </div>
        <button type="button" onClick={onCerrar} className="rounded-lg px-2 py-1 text-xl leading-none text-ink-mute hover:text-ink" aria-label="Cerrar">
          ×
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs text-ink-mute" aria-label="Datos que puedes usar">
        {VARIABLES_SEGUIMIENTO.map((v) => (
          <span key={v.clave} className="rounded-lg border border-line bg-glass px-2 py-1" title={v.descripcion}>
            <span className="font-semibold text-ink">{`{${v.clave}}`}</span> → {v.ejemplo}
          </span>
        ))}
      </div>

      <div className="space-y-4">
        {MOTIVOS_SEGUIMIENTO.map((m) => (
          <Situacion key={m.id} id={m.id} nombre={m.nombre} cuando={m.cuando} guardado={personalizadas[m.id]} ejemplo={ejemplos[m.id] ?? MUESTRA} onCambio={onCambio} />
        ))}
      </div>
    </section>
  );
}

function Situacion({
  id,
  nombre,
  cuando,
  guardado,
  ejemplo,
  onCambio,
}: {
  id: MotivoSeguimiento;
  nombre: string;
  cuando: string;
  guardado: string | undefined;
  ejemplo: EjemploProspecto;
  onCambio: (motivo: MotivoSeguimiento, texto: string | null) => void;
}) {
  const [texto, setTexto] = useState(guardado ?? PLANTILLAS_SEGUIMIENTO[id]);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const esBase = !guardado;
  const cambio = texto.trim() !== (guardado ?? PLANTILLAS_SEGUIMIENTO[id]).trim();
  const valido = validarMensajeSeguimiento(texto);

  function insertar(clave: string) {
    const el = area.current;
    const ins = `{${clave}}`;
    if (!el) return setTexto((t) => `${t} ${ins}`);
    const [a, b] = [el.selectionStart, el.selectionEnd];
    setTexto(texto.slice(0, a) + ins + texto.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + ins.length, a + ins.length);
    });
  }

  async function guardar() {
    if (!valido.ok) return setAviso({ ok: false, texto: valido.error });
    setGuardando(true);
    setAviso(null);
    try {
      // Si queda igual al base, no hace falta guardar una copia.
      const igualBase = valido.texto === PLANTILLAS_SEGUIMIENTO[id].trim();
      await crmGuardarMensajeSeguimiento(id, igualBase ? null : valido.texto);
      onCambio(id, igualBase ? null : valido.texto);
      setAviso({ ok: true, texto: igualBase ? "Quedó el texto base de Sofi." : "Guardado: Sofi ya usa tu mensaje." });
    } catch (e) {
      setAviso({ ok: false, texto: (e as Error).message });
    } finally {
      setGuardando(false);
    }
  }

  async function restaurar() {
    setGuardando(true);
    setAviso(null);
    try {
      await crmGuardarMensajeSeguimiento(id, null);
      onCambio(id, null);
      setTexto(PLANTILLAS_SEGUIMIENTO[id]);
      setAviso({ ok: true, texto: "Restaurado el texto base de Sofi." });
    } catch (e) {
      setAviso({ ok: false, texto: (e as Error).message });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-ink">
          {nombre} <span className="text-xs font-normal text-ink-mute">· {cuando}</span>
        </p>
        <span className="text-xs text-ink-mute">{esBase ? "Texto base de Sofi" : "Tu mensaje"}</span>
      </div>
      <textarea
        ref={area}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={4}
        maxLength={1000}
        aria-label={`Mensaje para: ${nombre}`}
        className="field-input mt-2 w-full leading-relaxed"
      />
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {VARIABLES_SEGUIMIENTO.map((v) => (
          <button key={v.clave} type="button" onClick={() => insertar(v.clave)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand-2 hover:text-ink">
            + {`{${v.clave}}`}
          </button>
        ))}
      </div>

      <p className="mt-2 text-xs text-ink-mute">Así lo recibiría {ejemplo.id === "muestra" ? "un prospecto de ejemplo" : "tu primer prospecto de esta lista"}:</p>
      <p className="mt-1 rounded-xl border border-line bg-bg-2/60 p-3 text-sm leading-relaxed text-ink-soft">
        “{valido.ok ? rellenarSeguimiento(valido.texto, ejemplo) : "…"}”
      </p>

      {aviso && (
        <p className="mt-2 flex items-center gap-1.5 text-sm" style={{ color: aviso.ok ? "var(--green)" : "var(--red)" }} role="status">
          {aviso.ok && <Icon icon="flat-color-icons:ok" width={16} aria-hidden />} {aviso.texto}
        </p>
      )}
      {!valido.ok && cambio && !aviso && (
        <p className="mt-2 text-sm" style={{ color: "var(--amber)" }}>
          {valido.error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={guardando || !cambio || !valido.ok} onClick={() => void guardar()} className="btn-primary px-4 py-2 text-sm">
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        {(!esBase || cambio) && (
          <button type="button" disabled={guardando} onClick={() => void restaurar()} className="btn-ghost px-4 py-2 text-sm">
            Volver al texto base
          </button>
        )}
      </div>
    </div>
  );
}
