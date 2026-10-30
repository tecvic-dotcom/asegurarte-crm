"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { crmCotizaciones, crmLead, crmMover, crmActualizar, crmAgregarActividad, crmPlantillas, crmPolizas } from "@/lib/api";
import { ETAPAS, etapa as etapaPorId, ICONO_ACTIVIDAD } from "@/lib/crm-data";
import { COLOR_ESTADO, FORMAS_PAGO, esPrimerPago, estadoDe, etiquetaEstado } from "@/lib/cobranza-reglas";
import { textoDeCobro } from "@/lib/clientes-reglas";
import { hoyLocal } from "@/lib/fechas";
import { avisoDeMontos, cotizacionElegida } from "@/lib/poliza-desde-venta";
import { ASEGURADORAS_COBRANZA } from "@/lib/cobranza-autos";
import type { Cotizacion } from "@/lib/cotizaciones-reglas";
import { aplicarPlantilla } from "@/lib/plantillas";
import { RAMOS } from "@/lib/ramos";
import { DictadoBoton } from "./DictadoBoton";
import { ORIGENES_MANUAL } from "@/lib/types";
import type { Lead, Actividad, EtapaId, TipoActividad, Genero, PlantillaMensaje, Ramo, FormaPago, Poliza, CobranzaAseguradora } from "@/lib/types";

/** Mensual → anual, como se elige de corto a largo. */
const FORMAS_DE_CORTO_A_LARGO = [...FORMAS_PAGO].reverse();

interface LeadPanelProps {
  id: string;
  onClose: () => void;
  onCambio: () => void;
  /** Solo admin: lleva al cliente ganado con Valeri para dar de alta su póliza en cobranza (con la frecuencia de pago elegida). */
  onAgregarCobranza?: (lead: Lead, forma: FormaPago, cotizacion: Cotizacion | null) => void;
  /** Abre en Valeri la póliza que ya tiene el cliente para verla o editarla. */
  onVerPoliza?: (poliza: Poliza) => void;
  /** Solo admin: lleva a Dana al cliente de Autos cuya cobranza va con Chubb. */
  onAbrirDana?: (lead: Lead) => void;
  /** Lleva a Cotizaciones con este prospecto ya elegido. */
  onCotizar?: (lead: Lead) => void;
}

export function LeadPanel({ id, onClose, onCambio, onAgregarCobranza, onVerPoliza, onAbrirDana, onCotizar }: LeadPanelProps) {
  const puedeAgregarCobranza = Boolean(onAgregarCobranza);
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
  const [errorOrigen, setErrorOrigen] = useState<string | null>(null);
  const [errorCobranza, setErrorCobranza] = useState<string | null>(null);
  const [formaPago, setFormaPago] = useState<FormaPago>("anual");
  // La cotización que elegiste para este cliente (si hay): de ella salen la prima, el primer pago y los pagos subsecuentes.
  const [elegida, setElegida] = useState<Cotizacion | null>(null);
  // Las pólizas que este cliente YA tiene en Valeri: null = revisando · "no" = no se pudo leer la cartera.
  const [susPolizas, setSusPolizas] = useState<Poliza[] | null | "no">(null);
  const [agregandoOtra, setAgregandoOtra] = useState(false);
  // Un cliente de Autos cuya cobranza va con Chubb: la lleva Dana, así que no se le da de alta en Valeri.
  const conChubb = lead?.ramo === "autos" && lead.cobranza_aseguradora === "chubb";

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
      setFormaPago("anual"); // cada prospecto empieza en «Anual»
      setActividad(r.actividad);
      setCargando(false);
      setElegida(null);
      setSusPolizas(null);
      setAgregandoOtra(false);
      if (r.lead.etapa === "ganado" && puedeAgregarCobranza) {
        crmPolizas()
          .then((todas) => vivo && setSusPolizas(todas.filter((p) => p.lead_id === r.lead.id)))
          .catch(() => vivo && setSusPolizas("no")); // sin acceso a la cartera: se ofrece agregar como siempre
        crmCotizaciones(id)
          .then((lista) => vivo && setElegida(cotizacionElegida(lista)))
          .catch(() => {}); // sin cotizaciones (o sin su SQL) se usa el estimado de siempre
      }
    })();
    crmPlantillas()
      .then((p) => vivo && setPlantillas(p))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [id, puedeAgregarCobranza]);

  async function cambiarEtapa(e: EtapaId) {
    if (!lead) return;
    setLead({ ...lead, etapa: e });
    await crmMover(id, e);
    // Recién ganado: se revisa su póliza en Valeri (al abrir la ficha solo se hacía si ya llegaba ganado).
    if (e === "ganado" && puedeAgregarCobranza && susPolizas === null) {
      crmPolizas()
        .then((todas) => setSusPolizas(todas.filter((p) => p.lead_id === id)))
        .catch(() => setSusPolizas("no"));
      crmCotizaciones(id)
        .then((lista) => setElegida(cotizacionElegida(lista)))
        .catch(() => {});
    }
    onCambio();
    void cargar();
  }

  /** Con qué aseguradora se cobra su auto (AXA → Valeri, Chubb → Dana): se guarda al momento, como el ramo. */
  async function cambiarCobranza(a: CobranzaAseguradora) {
    if (!lead || a === lead.cobranza_aseguradora) return;
    const antes = lead.cobranza_aseguradora ?? null;
    setLead({ ...lead, cobranza_aseguradora: a });
    setErrorCobranza(null);
    try {
      await crmActualizar(id, { cobranza_aseguradora: a });
      onCambio();
    } catch (e) {
      setLead((l) => (l ? { ...l, cobranza_aseguradora: antes } : l));
      setErrorCobranza((e as Error).message);
    }
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

  /** El origen se guarda al momento y deja huella en la línea de tiempo (de qué a qué cambió). */
  async function cambiarOrigen(nuevo: string) {
    if (!lead || nuevo === lead.origen) return;
    const antes = lead.origen;
    setLead({ ...lead, origen: nuevo });
    setErrorOrigen(null);
    try {
      await crmActualizar(id, { origen: nuevo });
      await crmAgregarActividad(id, "nota", `Origen cambiado de «${antes || "sin origen"}» a «${nuevo}».`);
      onCambio();
      void cargar();
    } catch (e) {
      setLead((l) => (l ? { ...l, origen: antes } : l));
      setErrorOrigen((e as Error).message);
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

            {onCotizar && (
              <button type="button" onClick={() => onCotizar(lead)} className="btn-ghost mt-4 w-full py-2.5 text-sm">
                <Icon icon="flat-color-icons:calculator" width={18} aria-hidden /> Cotizar a {lead.nombre.split(" ")[0]}
              </button>
            )}

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

            {/* Origen: de dónde llegó. Con «Tarjeta web» Robert puede medir cuántos llegan por ahí y cuántos compran */}
            <label className="field-label mt-4" htmlFor="lead-origen">¿De dónde viene?</label>
            <select
              id="lead-origen"
              value={lead.origen}
              onChange={(ev) => cambiarOrigen(ev.target.value)}
              className="field-input"
            >
              {/* Los que llegan solos (landing, campaña, Dinero Bajo Control…) traen un origen propio: se conserva en la lista. */}
              {!(ORIGENES_MANUAL as readonly string[]).includes(lead.origen) && (
                <option value={lead.origen}>{lead.origen || "Sin origen"}</option>
              )}
              {ORIGENES_MANUAL.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            {errorOrigen && (
              <p className="mt-1.5 text-xs" style={{ color: "var(--red)" }} role="alert">
                {errorOrigen}
              </p>
            )}
            {lead.etapa === "ganado" && onAgregarCobranza && (
              <>
                {/* Autos: se cobra con AXA (Valeri) o con Chubb (Dana); aquí se decide y se puede cambiar */}
                {lead.ramo === "autos" && (
                  <div className="mt-4" data-testid="cobranza-aseguradora">
                    <p className="field-label !mb-1.5">¿Dónde registras su póliza?</p>
                    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Aseguradora de su póliza de Autos">
                      {ASEGURADORAS_COBRANZA.map((a) => {
                        const activa = lead.cobranza_aseguradora === a.id;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => void cambiarCobranza(a.id)}
                            aria-pressed={activa}
                            data-testid={`ficha-${a.id}`}
                            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${activa ? "border-brand-2 bg-brand/20 text-ink" : "border-line bg-glass text-ink-soft hover:border-brand-2"}`}
                          >
                            {a.nombre} <span className="font-normal text-ink-mute">· {a.empleado}</span>
                          </button>
                        );
                      })}
                    </div>
                    {errorCobranza && (
                      <p className="mt-1.5 text-xs" style={{ color: "var(--red)" }} role="alert">
                        {errorCobranza}
                      </p>
                    )}
                    {!lead.cobranza_aseguradora && !errorCobranza && <p className="mt-1.5 text-xs text-ink-mute">Elige una para saber con quién se cobra: Valeri lleva AXA y Dana lleva Chubb.</p>}
                  </div>
                )}
                {conChubb && (
                  <div className="mt-3 rounded-xl border border-line bg-glass p-3 text-sm" data-testid="cobranza-en-dana">
                    <p className="font-semibold text-ink">Su cobranza la lleva Dana (Chubb)</p>
                    <p className="mt-0.5 text-xs text-ink-soft">Su póliza se captura en tu Excel de Chubb; Dana la reconoce por nombre cuando lo subas.</p>
                    {onAbrirDana && (
                      <button type="button" onClick={() => onAbrirDana(lead)} className="btn-ghost mt-2 px-3 py-2 text-xs">
                        <Icon icon="flat-color-icons:data-sheet" width={16} aria-hidden /> Abrir Dana
                      </button>
                    )}
                  </div>
                )}

                {!conChubb && susPolizas === null && <p className="mt-4 text-xs text-ink-mute">Revisando su póliza en Valeri…</p>}

                {/* Lo que este cliente ya tiene en Valeri: su frecuencia de pago REAL y cómo quedan sus pagos */}
                {Array.isArray(susPolizas) && susPolizas.length > 0 && (
                  <div className="mt-4 space-y-2" data-testid="polizas-del-cliente">
                    <p className="field-label !mb-0">Su póliza en Valeri</p>
                    {susPolizas.slice(0, 3).map((p) => {
                      const { estado, dias } = estadoDe(p, hoyLocal());
                      return (
                        <div key={p.id} className="rounded-xl border border-line bg-glass p-3 text-sm">
                          <p className="font-semibold text-ink">
                            {[p.aseguradora, p.numero].filter(Boolean).join(" ") || "Póliza sin número"}
                          </p>
                          <p className="mt-0.5 text-ink-soft" data-testid="cobro-de-poliza">{textoDeCobro(p) || "Sin montos capturados"}</p>
                          {esPrimerPago(p) && <p className="mt-0.5 text-xs text-ink-mute">El próximo pago que toca cobrar es el primero (lleva el derecho de póliza).</p>}
                          <p className="mt-1 text-xs font-semibold" style={{ color: COLOR_ESTADO[estado] }}>
                            {p.fecha_limite_pago ? `Próximo pago: ${p.fecha_limite_pago.split("-").reverse().join("/")} · ` : ""}
                            {etiquetaEstado(estado, dias, p)}
                          </p>
                          {onVerPoliza && (
                            <button type="button" onClick={() => onVerPoliza(p)} className="btn-ghost mt-2 px-3 py-2 text-xs">
                              <Icon icon="flat-color-icons:debt" width={16} aria-hidden /> Ver o editar en Valeri
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {!agregandoOtra && (
                      <button type="button" onClick={() => setAgregandoOtra(true)} className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink">
                        Agregar otra póliza de este cliente
                      </button>
                    )}
                  </div>
                )}

                {!conChubb && susPolizas !== null && (susPolizas === "no" || susPolizas.length === 0 || agregandoOtra) && (
                  <>
                <label className="field-label mt-4" htmlFor="lead-forma-pago">
                  {agregandoOtra ? "Frecuencia de pago de la otra póliza" : "Frecuencia de pago de su póliza"}
                </label>
                <select
                  id="lead-forma-pago"
                  value={formaPago}
                  onChange={(ev) => setFormaPago(ev.target.value as FormaPago)}
                  className="field-input"
                >
                  {FORMAS_DE_CORTO_A_LARGO.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre}
                    </option>
                  ))}
                </select>
                {avisoDeMontos(lead, formaPago, elegida) && (
                  <p className="mt-1.5 text-xs text-ink-mute" data-testid="aviso-montos">
                    {avisoDeMontos(lead, formaPago, elegida)}
                  </p>
                )}
                <button type="button" onClick={() => onAgregarCobranza(lead, formaPago, elegida)} className="btn-ghost mt-3 w-full py-2.5 text-sm">
                  <Icon icon="flat-color-icons:debt" width={18} aria-hidden /> {agregandoOtra ? "Agregar la otra póliza a cobranza (Valeri)" : "Agregar su póliza a cobranza (Valeri)"}
                </button>
                  </>
                )}
              </>
            )}

            {/* Valor */}
            <label className="field-label mt-4">Prima total (MXN)</label>
            <input
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
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
