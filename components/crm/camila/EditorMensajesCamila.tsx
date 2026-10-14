"use client";

import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { crmGuardarMensajeCruzada } from "@/lib/api";
import {
  MENSAJES_CRUZADA,
  PLANTILLAS_CRUZADA,
  VARIABLES_CRUZADA,
  rellenarCruzada,
  validarMensajeCruzada,
  type ClaveMensaje,
  type DatosMensaje,
} from "@/lib/cruzada-reglas";

interface EditorMensajesCamilaProps {
  /** Lo que ya personalizaste (solo los que cambiaste). */
  personalizadas: Partial<Record<ClaveMensaje, string>>;
  /** Un cliente de ejemplo por mensaje para la vista previa (el primero de la lista, si hay). */
  ejemplos: Partial<Record<ClaveMensaje, DatosMensaje>>;
  onCambio: (clave: ClaveMensaje, texto: string | null) => void;
}

function muestra(clave: ClaveMensaje): DatosMensaje {
  return { nombre: "MYRNA MURGA CHAPA", ramo: clave === "reactivar" ? "autos" : clave, tipo: clave === "reactivar" ? "reactivar" : "nueva", tiene: ["gmm", "hogar"] };
}

/** Escribe tus propios mensajes de WhatsApp para cada seguro que Camila ofrece. {saludo}, {tiene}… se rellenan solos con los datos de cada cliente. */
export function EditorMensajesCamila({ personalizadas, ejemplos, onCambio }: EditorMensajesCamilaProps) {
  return (
    <section className="glass-strong space-y-4 rounded-2xl p-4 sm:p-5" data-testid="editor-mensajes-camila">
      <div>
        <h3 className="font-semibold text-ink">Mis mensajes de WhatsApp</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Escribe cómo quieres que suene cada mensaje. Los datos entre llaves, como <strong className="text-ink">{"{saludo}"}</strong> o <strong className="text-ink">{"{tiene}"}</strong>, se
          rellenan solos con los de cada cliente. Camila nunca envía nada: tú mandas.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs text-ink-mute" aria-label="Datos que puedes usar">
        {VARIABLES_CRUZADA.map((v) => (
          <span key={v.clave} className="rounded-lg border border-line bg-glass px-2 py-1" title={v.descripcion}>
            <span className="font-semibold text-ink">{`{${v.clave}}`}</span> → {v.ejemplo}
          </span>
        ))}
      </div>

      <div className="space-y-4">
        {MENSAJES_CRUZADA.map((m) => (
          <Mensaje key={m.id} clave={m.id} nombre={m.nombre} cuando={m.cuando} guardado={personalizadas[m.id]} ejemplo={ejemplos[m.id]} onCambio={onCambio} />
        ))}
      </div>
    </section>
  );
}

function Mensaje({
  clave,
  nombre,
  cuando,
  guardado,
  ejemplo,
  onCambio,
}: {
  clave: ClaveMensaje;
  nombre: string;
  cuando: string;
  guardado: string | undefined;
  ejemplo: DatosMensaje | undefined;
  onCambio: (clave: ClaveMensaje, texto: string | null) => void;
}) {
  const [texto, setTexto] = useState(guardado ?? PLANTILLAS_CRUZADA[clave]);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const esBase = !guardado;
  const cambio = texto.trim() !== (guardado ?? PLANTILLAS_CRUZADA[clave]).trim();
  const valido = validarMensajeCruzada(texto);

  function insertar(c: string) {
    const el = area.current;
    const ins = `{${c}}`;
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
      const igualBase = valido.texto === PLANTILLAS_CRUZADA[clave].trim();
      await crmGuardarMensajeCruzada(clave, igualBase ? null : valido.texto);
      onCambio(clave, igualBase ? null : valido.texto);
      setAviso({ ok: true, texto: igualBase ? "Quedó el texto base de Camila." : "Guardado: Camila ya usa tu mensaje." });
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
      await crmGuardarMensajeCruzada(clave, null);
      onCambio(clave, null);
      setTexto(PLANTILLAS_CRUZADA[clave]);
      setAviso({ ok: true, texto: "Restaurado el texto base de Camila." });
    } catch (e) {
      setAviso({ ok: false, texto: (e as Error).message });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line p-3 sm:p-4" data-clave={clave}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-ink">
          {nombre} <span className="text-xs font-normal text-ink-mute">· {cuando}</span>
        </p>
        <span className="text-xs text-ink-mute">{esBase ? "Texto base de Camila" : "Tu mensaje"}</span>
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
        {VARIABLES_CRUZADA.map((v) => (
          <button key={v.clave} type="button" onClick={() => insertar(v.clave)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand-2 hover:text-ink">
            + {`{${v.clave}}`}
          </button>
        ))}
      </div>

      <p className="mt-2 text-xs text-ink-mute">Así lo recibiría {ejemplo ? "tu primer cliente de esta lista" : "un cliente de ejemplo"}:</p>
      <p className="mt-1 rounded-xl border border-line bg-bg-2/60 p-3 text-sm leading-relaxed text-ink-soft">“{valido.ok ? rellenarCruzada(valido.texto, ejemplo ?? muestra(clave)) : "…"}”</p>

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
