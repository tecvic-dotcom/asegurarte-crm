"use client";

import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { crmGuardarMensajeCobro } from "@/lib/api";
import {
  MOTIVOS_MENSAJE,
  PLANTILLAS_BASE,
  VARIABLES_MENSAJE,
  rellenarMensaje,
  validarMensajeCobro,
  type MotivoCobro,
} from "@/lib/cobranza-reglas";
import type { Poliza } from "@/lib/types";

interface EditorMensajesProps {
  /** Lo que ya personalizaste (solo las situaciones que cambiaste). */
  personalizadas: Partial<Record<MotivoCobro, string>>;
  /** Pólizas de ejemplo para la vista previa (la primera de cada situación, si hay). */
  ejemplos: Partial<Record<MotivoCobro, Poliza>>;
  onCambio: (motivo: MotivoCobro, texto: string | null) => void;
  onCerrar: () => void;
}

const MUESTRA: Poliza = {
  id: "muestra",
  numero: "93177V04",
  asegurado: "JOAN DANIEL OLIVA SERNA",
  whatsapp: "",
  correo: "",
  ramo: "gmm",
  aseguradora: "AXA",
  monto_pago: 4644,
  prima_anual: 18576,
  forma_pago: "trimestral",
  inicio: null,
  renovacion: "2026-11-03",
  fecha_limite_pago: "2026-09-14",
  estatus_manual: null,
  promesa_fecha: "2026-10-20",
  ultimo_pago: null,
  ultimo_recordatorio: null,
  lead_id: null,
  notas: "",
  creado_en: "",
  actualizado_en: "",
};

/** Escribe tus propios mensajes de WhatsApp para cada situación de cobro. {saludo}, {monto}… se rellenan solos con los datos de cada póliza. */
export function EditorMensajes({ personalizadas, ejemplos, onCambio, onCerrar }: EditorMensajesProps) {
  return (
    <section className="glass-strong space-y-4 rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink">Mis mensajes de WhatsApp</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Escribe cómo quieres que suene cada mensaje. Los datos entre llaves, como <strong className="text-ink">{"{saludo}"}</strong> o{" "}
            <strong className="text-ink">{"{monto}"}</strong>, se rellenan solos con los de cada cliente. Valeri nunca envía nada: tú mandas.
          </p>
        </div>
        <button type="button" onClick={onCerrar} className="rounded-lg px-2 py-1 text-xl leading-none text-ink-mute hover:text-ink" aria-label="Cerrar">
          ×
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs text-ink-mute" aria-label="Datos que puedes usar">
        {VARIABLES_MENSAJE.map((v) => (
          <span key={v.clave} className="rounded-lg border border-line bg-glass px-2 py-1" title={v.descripcion}>
            <span className="font-semibold text-ink">{`{${v.clave}}`}</span> → {v.ejemplo}
          </span>
        ))}
      </div>

      <div className="space-y-4">
        {MOTIVOS_MENSAJE.map((m) => (
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
  id: MotivoCobro;
  nombre: string;
  cuando: string;
  guardado: string | undefined;
  ejemplo: Poliza;
  onCambio: (motivo: MotivoCobro, texto: string | null) => void;
}) {
  const [texto, setTexto] = useState(guardado ?? PLANTILLAS_BASE[id]);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const esBase = !guardado;
  const cambio = texto.trim() !== (guardado ?? PLANTILLAS_BASE[id]).trim();
  const valido = validarMensajeCobro(texto);

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
      const igualBase = valido.texto === PLANTILLAS_BASE[id].trim();
      await crmGuardarMensajeCobro(id, igualBase ? null : valido.texto);
      onCambio(id, igualBase ? null : valido.texto);
      setAviso({ ok: true, texto: igualBase ? "Quedó el texto base de Valeri." : "Guardado: Valeri ya usa tu mensaje." });
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
      await crmGuardarMensajeCobro(id, null);
      onCambio(id, null);
      setTexto(PLANTILLAS_BASE[id]);
      setAviso({ ok: true, texto: "Restaurado el texto base de Valeri." });
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
        <span className="text-xs text-ink-mute">{esBase ? "Texto base de Valeri" : "Tu mensaje"}</span>
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
        {VARIABLES_MENSAJE.map((v) => (
          <button key={v.clave} type="button" onClick={() => insertar(v.clave)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand-2 hover:text-ink">
            + {`{${v.clave}}`}
          </button>
        ))}
      </div>

      <p className="mt-2 text-xs text-ink-mute">Así lo recibiría {ejemplo.id === "muestra" ? "un cliente de ejemplo" : "tu primer cliente de esta lista"}:</p>
      <p className="mt-1 rounded-xl border border-line bg-bg-2/60 p-3 text-sm leading-relaxed text-ink-soft">
        “{valido.ok ? rellenarMensaje(valido.texto, ejemplo) : "…"}”
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
