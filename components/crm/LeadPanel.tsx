"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { crmLead, crmMover, crmActualizar, crmAgregarActividad, crmPlantillas } from "@/lib/api";
import { ETAPAS, etapa as etapaPorId, ICONO_ACTIVIDAD } from "@/lib/crm-data";
import { aplicarPlantilla } from "@/lib/plantillas";
import { RAMOS } from "@/lib/ramos";
import { DictadoBoton } from "./DictadoBoton";
import type { Lead, Actividad, EtapaId, TipoActividad, Genero, PlantillaMensaje, Ramo } from "@/lib/types";

interface LeadPanelProps {
  id: string;
  onClose: () => void;
  onCambio: () => void;
}

export function LeadPanel({ id, onClose, onCambio }: LeadPanelProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [actividad, setActividad] = useState<Actividad[]>([]);
  const [notas, setNotas] = useState("");
  const [valor, setValor] = useState("0");
  const [genero, setGenero] = useState<Genero | "">("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [plantillas, setPlantillas] = useState<PlantillaMensaje[]>([]);
  const [mostrarPlantillas, setMostrarPlantillas] = useState(false);
  const [errorRamo, setErrorRamo] = useState<string | null>(null);

  function cargarDesde(l: Lead) {
    setLead(l);
    setNotas(l.notas);
    setValor(String(l.valor));
    setGenero(l.genero ?? "");
    setFechaNacimiento(l.fecha_nacimiento ?? "");
    setCodigoPostal(l.codigo_postal ?? "");
  }

  async function cargar() {
    setCargando(true);
    try {
      const r = await crmLead(id);
      cargarDesde(r.lead);
      setActividad(r.actividad);
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => {
    let vivo = true;
    (async () => {
      const r = await crmLead(id);
      if (!vivo) return;
      cargarDesde(r.lead);
      setActividad(r.actividad);
      setCargando(false);
    })();
    crmPlantillas()
      .then((p) => vivo && setPlantillas(p))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [id]);

  async function cambiarEtapa(e: EtapaId) {
    if (!lead) return;
    setLead({ ...lead, etapa: e });
    await crmMover(id, e);
    onCambio();
    void cargar();
  }

  /** El ramo se guarda al momento (como la etapa): cuenta para tu meta del Panel. */
  async function cambiarRamo(r: Ramo | null) {
    if (!lead) return;
    const antes = lead.ramo;
    setLead({ ...lead, ramo: r });
    setErrorRamo(null);
    try {
      await crmActualizar(id, { ramo: r });
      onCambio();
    } catch (e) {
      setLead((l) => (l ? { ...l, ramo: antes } : l));
      setErrorRamo((e as Error).message);
    }
  }

  async function guardar() {
    setGuardando(true);
    try {
      await crmActualizar(id, {
        notas,
        valor: Number(valor) || 0,
        genero: genero || null,
        fecha_nacimiento: fechaNacimiento || null,
        codigo_postal: codigoPostal || null,
      });
      onCambio();
      await cargar();
    } finally {
      setGuardando(false);
    }
  }

  async function registrar(tipo: TipoActividad, texto: string) {
    await crmAgregarActividad(id, tipo, texto);
    void cargar();
  }

  function usarPlantilla(p: PlantillaMensaje) {
    if (!lead) return;
    const texto = aplicarPlantilla(p.cuerpo, lead.nombre);
    window.open(`https://wa.me/52${lead.whatsapp}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
    setMostrarPlantillas(false);
    void registrar("mensaje", `Mensaje enviado (plantilla: ${p.nombre})`);
  }

  const e = lead ? etapaPorId(lead.etapa) : null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="no-scrollbar relative z-10 h-full w-full max-w-md overflow-y-auto border-l border-line bg-bg-2 p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <button onClick={onClose} className="text-ink-mute hover:text-ink">
            <Icon icon="flat-color-icons:previous" width={26} />
          </button>
          {e && (
            <span
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{ background: `color-mix(in srgb, ${e.color} 16%, transparent)`, color: e.color }}
            >
              {e.nombre}
            </span>
          )}
        </div>

        {cargando || !lead ? (
          <p className="py-12 text-center text-ink-mute">Cargando expediente…</p>
        ) : (
          <>
            <h2 className="font-display text-2xl text-ink">{lead.nombre}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`mailto:${lead.correo}`} className="chip text-xs">
                <Icon icon="flat-color-icons:feedback" width={16} /> {lead.correo}
              </a>
              <a
                href={`https://wa.me/52${lead.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="chip text-xs"
              >
                <Icon icon="logos:whatsapp-icon" width={16} /> {lead.whatsapp}
              </a>
            </div>

            {/* Mover de etapa */}
            <label className="field-label mt-6">Etapa</label>
            <select
              value={lead.etapa}
              onChange={(ev) => cambiarEtapa(ev.target.value as EtapaId)}
              className="field-input"
            >
              {ETAPAS.map((et) => (
                <option key={et.id} value={et.id}>
                  {et.nombre}
                </option>
              ))}
            </select>

            {/* Ramo: cuenta para tu meta de pólizas por ramo (Panel de Mando) */}
            <label className="field-label mt-4" htmlFor="lead-ramo">Ramo</label>
            <select
              id="lead-ramo"
              value={lead.ramo ?? ""}
              onChange={(ev) => cambiarRamo((ev.target.value || null) as Ramo | null)}
              className="field-input"
            >
              <option value="">Sin definir</option>
              {RAMOS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
            {lead.etapa === "ganado" && !lead.ramo && !errorRamo && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs" style={{ color: "var(--amber)" }}>
                <Icon icon="flat-color-icons:medium-priority" width={14} className="mt-px shrink-0" aria-hidden />
                <span><strong>Atención:</strong> asígnale el ramo para que esta póliza cuente en tu meta.</span>
              </p>
            )}
            {lead.etapa === "ganado" && lead.cerrado_en && (
              <p className="mt-1.5 text-xs text-ink-mute">
                Cerrado el {new Date(lead.cerrado_en).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
            {errorRamo && (
              <p className="mt-1.5 text-xs" style={{ color: "var(--red)" }} role="alert">
                {errorRamo}
              </p>
            )}

            {/* Valor */}
            <label className="field-label mt-4">Valor estimado (MXN)</label>
            <input
              type="number"
              min={0}
              value={valor}
              onChange={(ev) => setValor(ev.target.value)}
              className="field-input"
            />

            {/* Datos de la pareja (los completas tú durante la asesoría) */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Género</label>
                <select value={genero} onChange={(ev) => setGenero(ev.target.value as Genero | "")} className="field-input">
                  <option value="">Sin especificar</option>
                  <option value="mujer">Mujer</option>
                  <option value="hombre">Hombre</option>
                  <option value="prefiero_no_decir">Prefiere no decir</option>
                </select>
              </div>
              <div>
                <label className="field-label">Fecha de nacimiento</label>
                <input
                  type="date"
                  value={fechaNacimiento}
                  onChange={(ev) => setFechaNacimiento(ev.target.value)}
                  className="field-input"
                />
              </div>
            </div>
            <label className="field-label mt-3">Código postal</label>
            <input
              value={codigoPostal}
              onChange={(ev) => setCodigoPostal(ev.target.value.replace(/\D+/g, "").slice(0, 5))}
              placeholder="44100"
              inputMode="numeric"
              className="field-input"
            />

            {/* Notas + dictado */}
            <div className="mt-4 flex items-center justify-between">
              <label className="field-label mb-0">Notas</label>
              <DictadoBoton onTexto={(t) => setNotas((n) => (n ? `${n} ${t}` : t))} />
            </div>
            <textarea
              value={notas}
              onChange={(ev) => setNotas(ev.target.value)}
              rows={3}
              className="field-input mt-2 resize-y"
              placeholder="Escribe o dicta una nota…"
            />
            <button onClick={guardar} disabled={guardando} className="btn-primary mt-3 w-full">
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>

            {/* Acciones rápidas */}
            <p className="field-label mt-6">Registrar acción</p>
            <div className="flex flex-wrap gap-2">
              <Accion icono="flat-color-icons:phone" label="Llamada" onClick={() => registrar("llamada", "Llamada realizada")} />
              <div className="relative">
                <Accion icono="flat-color-icons:sms" label="Mensaje" onClick={() => setMostrarPlantillas((v) => !v)} />
                {mostrarPlantillas && (
                  <div className="glass-strong absolute left-0 top-full z-10 mt-2 w-64 rounded-2xl p-2">
                    {plantillas.length === 0 && <p className="p-2 text-xs text-ink-mute">Sin plantillas todavía.</p>}
                    {plantillas.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => usarPlantilla(p)}
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm text-ink-soft hover:bg-glass hover:text-ink"
                      >
                        {p.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Accion icono="flat-color-icons:calendar" label="Cita" onClick={() => registrar("cita", "Cita agendada")} />
            </div>

            {/* Origen / contexto */}
            <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-line bg-glass p-4 text-sm">
              <Dato label="Origen" valor={lead.origen} />
              <Dato label="Campaña" valor={lead.utm_campaign || "—"} />
              <Dato label="Fuente (UTM)" valor={lead.utm_source || "—"} />
              <Dato label="Ciudad" valor={lead.ciudad ?? "—"} />
              <Dato label="Dispositivo" valor={lead.dispositivo ?? "—"} />
              <Dato label="País" valor={lead.pais ?? "—"} />
            </div>

            {/* Timeline */}
            <p className="field-label mt-6">Línea de tiempo</p>
            <ol className="space-y-3">
              {actividad.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <Icon icon={ICONO_ACTIVIDAD[a.tipo] ?? "flat-color-icons:edit-image"} width={22} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-ink-soft">{a.texto}</p>
                    <p className="text-xs text-ink-mute">{a.autor}</p>
                  </div>
                </li>
              ))}
              {!actividad.length && <p className="text-sm text-ink-mute">Sin actividad todavía.</p>}
            </ol>
          </>
        )}
      </motion.aside>
    </div>
  );
}

function Accion({ icono, label, onClick }: { icono: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="btn-ghost px-3 py-2 text-sm">
      <Icon icon={icono} width={18} /> {label}
    </button>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-ink-mute">{label}</p>
      <p className="truncate text-ink-soft">{valor}</p>
    </div>
  );
}
