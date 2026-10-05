"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { crmGuardarManagerConfig, crmManager, crmPreguntarManager, ErrorCRM } from "@/lib/api";
import { AvatarRoro } from "./AvatarRoro";
import { DictadoBoton } from "./DictadoBoton";
import { AvisoMigracion } from "./panel/AvisoMigracion";
import type { ManagerConfig, ManagerEstado, RespuestaManager, Sesion, TurnoManager } from "@/lib/types";

type Mensaje =
  | { id: string; rol: "usuario"; texto: string }
  | { id: string; rol: "roro"; respuesta: RespuestaManager }
  | { id: string; rol: "error"; texto: string; pregunta: string };

// El chat se guarda solo en ESTE navegador mientras la pestaña esté abierta.
const CLAVE_CHAT = "roro.chat.v1";

function leerChat(): Mensaje[] {
  if (typeof window === "undefined") return [];
  try {
    const crudo = window.sessionStorage.getItem(CLAVE_CHAT);
    return crudo ? (JSON.parse(crudo) as Mensaje[]) : [];
  } catch {
    return [];
  }
}

function nuevoId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Solo las parejas pregunta → respuesta completas viajan como historial (nunca los errores). */
function historialPara(mensajes: Mensaje[]): TurnoManager[] {
  const turnos: TurnoManager[] = [];
  for (let i = 0; i < mensajes.length - 1; i++) {
    const a = mensajes[i];
    const b = mensajes[i + 1];
    if (a.rol === "usuario" && b.rol === "roro") {
      turnos.push({ rol: "usuario", texto: a.texto }, { rol: "roro", texto: JSON.stringify(b.respuesta) });
      i++;
    }
  }
  return turnos.slice(-8);
}

/**
 * Tu primer empleado digital: RORO, tu gerente. Lee los números del Panel y
 * te recomienda qué hacer, con el porqué, el riesgo y la acción de hoy.
 * Él propone; tú decides.
 */
export function ManagerIA({ sesion }: { sesion: Sesion }) {
  const [estado, setEstado] = useState<ManagerEstado | null>(null);
  const [errorCarga, setErrorCarga] = useState<ErrorCRM | Error | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>(leerChat);
  const [entrada, setEntrada] = useState("");
  const [pensando, setPensando] = useState(false);
  const [hablando, setHablando] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  const nombre = sesion.nombre.split(" ")[0] || "jefe";

  async function cargarEstado() {
    try {
      setEstado(await crmManager());
      setErrorCarga(null);
    } catch (e) {
      setErrorCarga(e as Error);
    }
  }

  useEffect(() => {
    let vivo = true;
    crmManager()
      .then((e) => vivo && setEstado(e))
      .catch((e) => vivo && setErrorCarga(e as Error));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(CLAVE_CHAT, JSON.stringify(mensajes.slice(-40)));
    } catch {
      /* sin almacenamiento: el chat solo vive en pantalla */
    }
    const el = lista.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [mensajes, pensando]);

  async function preguntar(texto: string) {
    const pregunta = texto.trim();
    if (!pregunta || pensando) return;
    const historial = historialPara(mensajes);
    setMensajes((m) => [...m, { id: nuevoId(), rol: "usuario", texto: pregunta }]);
    setEntrada("");
    setPensando(true);
    try {
      const r = await crmPreguntarManager(pregunta, historial);
      setMensajes((m) => [...m, { id: nuevoId(), rol: "roro", respuesta: r.respuesta }]);
      setEstado((e) => (e ? { ...e, uso: r.uso } : e));
      setHablando(true);
      window.setTimeout(() => setHablando(false), 2500);
    } catch (e) {
      setMensajes((m) => [...m, { id: nuevoId(), rol: "error", texto: (e as Error).message, pregunta }]);
    } finally {
      setPensando(false);
    }
  }

  function reintentar(err: Extract<Mensaje, { rol: "error" }>) {
    // Quita el error y la pregunta que lo causó, y vuelve a preguntar.
    setMensajes((m) => {
      const i = m.findIndex((x) => x.id === err.id);
      if (i > 0 && m[i - 1].rol === "usuario") return [...m.slice(0, i - 1), ...m.slice(i + 1)];
      return m.filter((x) => x.id !== err.id);
    });
    void preguntar(err.pregunta);
  }

  function nuevaConversacion() {
    setMensajes([]);
  }

  if (errorCarga instanceof ErrorCRM && errorCarga.migracion) {
    return <AvisoMigracion onListo={() => void cargarEstado()} />;
  }
  if (estado?.migracionPendiente) {
    return <AvisoMigracion onListo={() => void cargarEstado()} />;
  }

  const config = estado?.config;
  const uso = estado?.uso;
  const sinLlave = estado ? !estado.iaLista : false;
  const topeCerca = uso ? uso.usadas >= uso.tope * 0.8 : false;
  const ejemplos = [
    `¿Voy a llegar a mi meta de ${config?.meta_por_ramo ?? 20} pólizas por ramo?`,
    "¿En qué ramo me enfoco esta semana?",
    "¿Me conviene gastar más en publicidad?",
    "¿En qué estoy gastando de más?",
    "¿Qué hago hoy para cerrar más pólizas?",
  ];
  const bloqueado = pensando || sinLlave || !estado;

  return (
    <section className="space-y-4">
      {/* Cabecera: el gerente con cara */}
      <div className="glass-strong flex items-center gap-4 rounded-2xl p-4 sm:p-5">
        <AvatarRoro tamano={76} hablando={pensando || hablando} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl text-ink">{config?.nombre ?? "RORO"}</p>
          <p className="text-sm text-ink-soft">
            Tu gerente digital · <span style={{ color: "var(--green)" }}>en línea</span>
          </p>
          {uso && (
            <p className="mt-1 text-xs" style={{ color: topeCerca ? "var(--amber)" : "var(--ink-mute)" }}>
              {topeCerca && <strong>Atención: </strong>}
              Preguntas este mes: {uso.usadas} de {uso.tope}
            </p>
          )}
        </div>
        {mensajes.length > 0 && (
          // El contenedor oculta el botón en celular (.btn-ghost no deja que "hidden" lo oculte).
          <div className="hidden shrink-0 sm:block">
            <button type="button" onClick={nuevaConversacion} className="btn-ghost px-3 py-2 text-xs">
              Nueva conversación
            </button>
          </div>
        )}
      </div>

      {sinLlave && <AvisoLlave />}
      {errorCarga && !(errorCarga instanceof ErrorCRM && errorCarga.migracion) && (
        <div className="glass rounded-2xl p-4 text-sm text-ink-soft">
          {errorCarga.message}{" "}
          <button type="button" onClick={() => void cargarEstado()} className="underline">
            Reintentar
          </button>
        </div>
      )}

      {/* Conversación */}
      <div className="glass rounded-2xl p-3 sm:p-4">
        <div ref={lista} className="no-scrollbar max-h-[62vh] space-y-3 overflow-y-auto pr-1" aria-live="polite">
          <Burbuja lado="roro">
            Hola, {nombre} 👋 Soy {config?.nombre ?? "RORO"}, tu gerente digital. Leo tus números del CRM y te digo qué haría
            yo: la recomendación, el porqué con tus cifras, el riesgo y qué hacer hoy. Tú decides. ¿Qué vemos?
          </Burbuja>

          {mensajes.map((m) =>
            m.rol === "usuario" ? (
              <Burbuja key={m.id} lado="usuario">
                {m.texto}
              </Burbuja>
            ) : m.rol === "roro" ? (
              <Burbuja key={m.id} lado="roro">
                <TarjetaRespuesta r={m.respuesta} />
              </Burbuja>
            ) : (
              <Burbuja key={m.id} lado="roro">
                <p className="flex items-start gap-1.5" style={{ color: "var(--red)" }} role="alert">
                  <Icon icon="flat-color-icons:high-priority" width={16} className="mt-0.5 shrink-0" aria-hidden />
                  <span>
                    <strong>No pude responder: </strong>
                    {m.texto}
                  </span>
                </p>
                <button type="button" onClick={() => reintentar(m)} className="btn-ghost mt-2 px-3 py-1.5 text-xs">
                  Reintentar
                </button>
              </Burbuja>
            ),
          )}

          {pensando && (
            <Burbuja lado="roro">
              <span className="flex items-center gap-2 text-ink-soft">
                {config?.nombre ?? "RORO"} está revisando tus números
                <span className="flex gap-1" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="roro-punto inline-block h-1.5 w-1.5 rounded-full bg-ink-soft" style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </span>
              </span>
            </Burbuja>
          )}
        </div>

        {/* Preguntas de ejemplo: para arrancar con un clic */}
        {mensajes.length === 0 && !sinLlave && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-ink-mute">Para estrenarlo, toca una:</p>
            <div className="flex flex-wrap gap-2">
              {ejemplos.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={bloqueado}
                  onClick={() => void preguntar(q)}
                  className="rounded-xl border border-line bg-glass px-3 py-2.5 text-left text-sm text-ink-soft hover:border-brand-2 hover:text-ink disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void preguntar(entrada);
          }}
        >
          <label htmlFor="pregunta-roro" className="sr-only">
            Tu pregunta para {config?.nombre ?? "RORO"}
          </label>
          <textarea
            id="pregunta-roro"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void preguntar(entrada);
              }
            }}
            rows={2}
            maxLength={800}
            disabled={sinLlave}
            placeholder={sinLlave ? "Activa la llave de IA para preguntarle" : "Ej. ¿Puedo contratar a alguien?"}
            className="field-input resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span>{!sinLlave && <DictadoBoton onTexto={(t) => setEntrada((x) => (x ? `${x} ${t}` : t))} />}</span>
            <button type="submit" disabled={bloqueado || !entrada.trim()} className="btn-primary px-6 py-3 text-sm">
              Preguntar <span aria-hidden>→</span>
            </button>
          </div>
        </form>
        {mensajes.length > 0 && (
          <button type="button" onClick={nuevaConversacion} className="mt-3 text-xs text-ink-mute underline sm:hidden">
            Nueva conversación
          </button>
        )}
      </div>

      {estado && <EditorCerebro estado={estado} onGuardado={(c) => setEstado({ ...estado, config: c })} />}

      <EquipoDigital nombre={config?.nombre ?? "RORO"} />
    </section>
  );
}

function Burbuja({ lado, children }: { lado: "roro" | "usuario"; children: React.ReactNode }) {
  if (lado === "usuario") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand/30 px-4 py-2.5 text-[15px] text-ink">{children}</div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-line bg-bg-2/70 px-4 py-3 text-[15px] leading-relaxed text-ink-soft">
        {children}
      </div>
    </div>
  );
}

function TarjetaRespuesta({ r }: { r: RespuestaManager }) {
  return (
    <div className="space-y-3">
      <p className="whitespace-pre-line font-semibold text-ink">{r.resumen}</p>
      {r.recomendacion && <Bloque icono="flat-color-icons:approval" titulo="Mi recomendación" texto={r.recomendacion} />}
      {r.porque && <Bloque icono="flat-color-icons:bar-chart" titulo="Por qué (con tus números)" texto={r.porque} />}
      {r.riesgo && <Bloque icono="flat-color-icons:high-priority" titulo="El riesgo" texto={r.riesgo} />}
      {r.accion_hoy && <Bloque icono="flat-color-icons:todo-list" titulo="Hoy haz esto" texto={r.accion_hoy} destacado />}
      {r.dato_faltante && <Bloque icono="flat-color-icons:info" titulo="Me falta un dato" texto={r.dato_faltante} />}
    </div>
  );
}

function Bloque({ icono, titulo, texto, destacado }: { icono: string; titulo: string; texto: string; destacado?: boolean }) {
  return (
    <div className={destacado ? "rounded-xl border border-brand-2/60 bg-brand/10 p-3" : ""}>
      <p className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-mute">
        <Icon icon={icono} width={15} aria-hidden /> {titulo}
      </p>
      <p className="whitespace-pre-line text-[15px] text-ink-soft">{texto}</p>
    </div>
  );
}

function AvisoLlave() {
  return (
    <div className="glass rounded-2xl border p-4 sm:p-5" style={{ borderColor: "color-mix(in srgb, var(--amber) 50%, transparent)" }}>
      <p className="flex items-center gap-2 font-semibold text-ink">
        <Icon icon="flat-color-icons:key" width={20} aria-hidden /> Falta la llave para que RORO piense
      </p>
      <p className="mt-1.5 text-sm text-ink-soft">
        Es como la llave del coche: el coche ya está armado, solo falta encenderlo. Se hace una vez:
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-soft">
        <li>
          Entra a <strong className="text-ink">console.anthropic.com</strong> → API Keys → crea una llave (y ponle un límite de gasto mensual).
        </li>
        <li>
          Pégala en tu archivo <code className="rounded bg-bg-3 px-1.5 py-0.5 text-xs text-ink">.env.local</code> como{" "}
          <code className="rounded bg-bg-3 px-1.5 py-0.5 text-xs text-ink">ANTHROPIC_API_KEY=…</code>
        </li>
        <li>En Vercel → Settings → Environment Variables, agrega la misma llave y vuelve a publicar.</li>
      </ol>
      <p className="mt-2 text-xs text-ink-mute">Mientras tanto, tu Panel de Mando ya funciona con tus números.</p>
    </div>
  );
}

function EditorCerebro({ estado, onGuardado }: { estado: ManagerEstado; onGuardado: (c: ManagerConfig) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<ManagerConfig>(() => ({
    ...estado.config,
    cerebro: estado.config.cerebro.trim() || estado.cerebroBase,
  }));
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const set = (c: Partial<ManagerConfig>) => setForm((f) => ({ ...f, ...c }));

  async function guardar() {
    setGuardando(true);
    setAviso(null);
    try {
      const c = await crmGuardarManagerConfig(form);
      onGuardado(c);
      setAviso({ ok: true, texto: "Guardado. Desde ahora lo toma en cuenta en cada respuesta." });
    } catch (e) {
      setAviso({ ok: false, texto: (e as Error).message });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span>
          <span className="flex items-center gap-2 font-semibold text-ink">
            <Icon icon="flat-color-icons:idea" width={20} aria-hidden /> Lo que {estado.config.nombre} sabe de tu negocio
          </span>
          <span className="text-xs text-ink-mute">Su “cerebro”: entre más claro, mejores consejos. También aquí cambias tu meta.</span>
        </span>
        <Icon icon={abierto ? "flat-color-icons:collapse" : "flat-color-icons:expand"} width={20} aria-hidden />
      </button>

      {abierto && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <label className="field-label" htmlFor="cfg-nombre">Nombre</label>
              <input id="cfg-nombre" value={form.nombre} maxLength={30} onChange={(e) => set({ nombre: e.target.value })} className="field-input" />
            </div>
            <div>
              <label className="field-label" htmlFor="cfg-meta">Meta por ramo</label>
              <input
                id="cfg-meta"
                type="number"
                min={1}
                max={1000}
                value={form.meta_por_ramo}
                onChange={(e) => set({ meta_por_ramo: Number(e.target.value) })}
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="cfg-inicio">Inicio de la meta</label>
              <input id="cfg-inicio" type="date" value={form.meta_inicio} onChange={(e) => set({ meta_inicio: e.target.value })} className="field-input [color-scheme:dark]" />
            </div>
            <div>
              <label className="field-label" htmlFor="cfg-fin">Fin de la meta</label>
              <input id="cfg-fin" type="date" value={form.meta_fin} onChange={(e) => set({ meta_fin: e.target.value })} className="field-input [color-scheme:dark]" />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="cfg-cerebro">Contexto de tu negocio</label>
            <textarea
              id="cfg-cerebro"
              value={form.cerebro}
              onChange={(e) => set({ cerebro: e.target.value })}
              rows={14}
              maxLength={6000}
              className="field-input font-mono text-sm leading-relaxed"
            />
            <p className="mt-1 text-xs text-ink-mute">
              Completa lo que dice “por definir” (tus costos fijos y cuánto te pagan por ramo): con eso sus cuentas salen exactas.
              No pongas datos de tus clientes aquí.
            </p>
          </div>
          {aviso && (
            <p className="text-sm" style={{ color: aviso.ok ? "var(--green)" : "var(--red)" }} role="status">
              {aviso.texto}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={guardar} disabled={guardando} className="btn-primary px-5 py-3 text-sm">
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" onClick={() => set({ cerebro: estado.cerebroBase })} className="btn-ghost px-4 py-3 text-sm">
              Restaurar texto base
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EquipoDigital({ nombre }: { nombre: string }) {
  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <p className="font-semibold text-ink">Tu equipo digital</p>
      <p className="mb-3 text-xs text-ink-mute">Hoy tienes a tu gerente. Aquí llegan los siguientes.</p>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-brand-2/50 bg-brand/10 p-3">
          <AvatarRoro tamano={40} />
          <span className="font-semibold text-ink">{nombre}</span>
          <span className="text-ink-mute">Gerente · activo</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-line p-3 opacity-75">
          <Icon icon="flat-color-icons:debt" width={36} aria-hidden />
          <span className="font-semibold text-ink-soft">Cobranza</span>
          <span className="text-ink-mute">Próximamente</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-line p-3 opacity-75">
          <Icon icon="flat-color-icons:document" width={36} aria-hidden />
          <span className="font-semibold text-ink-soft">Reportes</span>
          <span className="text-ink-mute">Próximamente</span>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-mute">
        Para sumar uno, pídeselo a Claude Code: “créame mi empleado digital de cobranza, que viva junto a {nombre}”.
      </p>
    </div>
  );
}
