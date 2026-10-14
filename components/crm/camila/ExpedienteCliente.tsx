"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { crmEditarCliente } from "@/lib/api";
import { fechaNumerica } from "@/lib/fechas";
import { infoRamo } from "@/lib/ramos";
import { formatoWhatsapp, textoDeCobro } from "@/lib/clientes-reglas";
import { ESTADOS_OFERTA, esActivo, mapaDeCobertura, type EntradaCliente, type Oportunidad } from "@/lib/cruzada-reglas";
import type { Cliente, Genero, LibroPoliza, Poliza, Ramo } from "@/lib/types";
import { Modal } from "../clientes/Modal";
import { SeccionFamilia } from "./SeccionFamilia";

interface ExpedienteClienteProps {
  entrada: EntradaCliente;
  /** Sus pólizas de Valeri completas (para abrirlas) y las que se conocen por tus reportes de AXA. */
  valeri: Poliza[];
  libro: LibroPoliza[];
  oportunidades: Oportunidad[];
  /** Todos los clientes (para ligar la familia). */
  todos: Cliente[];
  /** Abrir el expediente de otro cliente (el titular o un familiar). */
  onAbrir: (clienteId: string) => void;
  onCerrar: () => void;
  /** Un cliente cambió (o se creó): la pantalla lo actualiza. */
  onGuardado: (c: Cliente) => void;
  onVerPoliza: (p: Poliza) => void;
  onCotizar: (clienteId: string, ramo: Ramo) => void;
}

/** Todo lo de un cliente en un solo lugar: sus datos, todas sus pólizas y lo que Camila le sugiere. */
export function ExpedienteCliente({ entrada, valeri, libro, oportunidades, todos, onAbrir, onCerrar, onGuardado, onVerPoliza, onCotizar }: ExpedienteClienteProps) {
  const c = entrada.cliente;
  const [f, setF] = useState({
    nombre: c.nombre,
    tipo: c.tipo,
    whatsapp: c.whatsapp,
    correo: c.correo,
    fecha_nacimiento: c.fecha_nacimiento ?? "",
    genero: c.genero ?? "",
    codigo_postal: c.codigo_postal ?? "",
    no_ofrecer: c.no_ofrecer,
    notas: c.notas,
  });
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const celdas = mapaDeCobertura(entrada.polizas);

  const set = (cambios: Partial<typeof f>) => {
    setF((x) => ({ ...x, ...cambios }));
    setAviso(null);
  };

  async function guardar() {
    setGuardando(true);
    setAviso(null);
    try {
      const guardado = await crmEditarCliente(c.id, { ...f, genero: (f.genero === "" ? null : f.genero) as Genero | null, fecha_nacimiento: f.fecha_nacimiento || null, codigo_postal: f.codigo_postal || null });
      onGuardado(guardado);
      setAviso({ ok: true, texto: "Guardado." });
    } catch (e) {
      setAviso({ ok: false, texto: (e as Error).message });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={c.nombre} subtitulo={esActivo(entrada.polizas) ? "Expediente del cliente" : "Sin póliza vigente"} ancho="lg" onCerrar={onCerrar}>
      <div className="space-y-5" data-testid="expediente-cliente">
        {entrada.conAdeudo && (
          <p className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--red)", color: "var(--red)" }} role="status">
            <Icon icon="flat-color-icons:high-priority" width={16} className="mr-1 inline" aria-hidden />
            Tiene un pago vencido en la cobranza: Camila no le sugiere nada nuevo hasta que se ponga al corriente.
          </p>
        )}

        <section aria-label="Sus pólizas" className="space-y-2">
          <h3 className="font-semibold text-ink">Sus pólizas</h3>
          {valeri.length === 0 && libro.length === 0 && <p className="text-sm text-ink-mute">Todavía no hay pólizas ligadas a este cliente.</p>}
          {valeri.map((p) => (
            <div key={p.id} className="rounded-xl border border-line bg-glass p-3 text-sm" data-testid="poliza-valeri">
              <p className="font-semibold text-ink">
                {p.ramo ? infoRamo(p.ramo).corto : "Sin ramo"} · {[p.aseguradora, p.numero].filter(Boolean).join(" ") || "Póliza sin número"}
                {p.estatus_manual === "cancelada" && <span className="ml-2 text-xs font-normal" style={{ color: "var(--red)" }}>Cancelada</span>}
              </p>
              <p className="mt-0.5 text-ink-soft">{textoDeCobro(p) || "Sin montos capturados"}</p>
              <p className="mt-0.5 text-xs text-ink-mute">{p.renovacion ? `Renueva el ${fechaNumerica(p.renovacion)}` : "Sin fecha de renovación"} · Está en la cobranza de Valeri</p>
              <button type="button" onClick={() => onVerPoliza(p)} className="btn-ghost mt-2 px-3 py-2 text-xs">
                <Icon icon="flat-color-icons:debt" width={16} aria-hidden /> Ver o editar en Valeri
              </button>
            </div>
          ))}
          {libro.map((l) => (
            <div key={l.numero} className="rounded-xl border border-line p-3 text-sm" data-testid="poliza-libro">
              <p className="font-semibold text-ink">
                {infoRamo(l.ramo).corto} · {l.aseguradora} {l.numero}
                <span className="ml-2 text-xs font-normal" style={{ color: l.vigente ? "var(--green)" : "var(--amber)" }}>
                  {l.vigente ? "Vigente" : "Ya no vigente"}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-ink-mute">
                Según tus reportes de AXA{l.ultimo_pago ? ` · último pago ${fechaNumerica(l.ultimo_pago)}` : ""}
                {l.renovacion ? ` · renueva ${fechaNumerica(l.renovacion)}` : ""}
              </p>
            </div>
          ))}
        </section>

        <section aria-label="Lo que le falta" className="space-y-2">
          <h3 className="font-semibold text-ink">Qué tiene y qué le falta</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {celdas.map((x) => {
              const r = infoRamo(x.ramo);
              const op = oportunidades.find((o) => o.ramo === x.ramo);
              const estado = op?.estado ? ESTADOS_OFERTA.find((e) => e.id === op.estado)?.nombre : null;
              return (
                <li key={x.ramo} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2" data-estado={x.estado}>
                  <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                    <Icon icon={r.icono} width={20} aria-hidden /> {r.corto}
                    <span className="text-xs" style={{ color: x.estado === "vigente" ? "var(--green)" : x.estado === "tuvo" ? "var(--amber)" : "var(--ink-mute)" }}>
                      {x.estado === "vigente" ? "Lo tiene" : x.estado === "tuvo" ? "Lo tuvo" : "No lo tiene"}
                      {estado && x.estado !== "vigente" ? ` · ${estado}` : ""}
                    </span>
                  </span>
                  {x.estado !== "vigente" && (
                    <button type="button" onClick={() => onCotizar(c.id, x.ramo)} className="btn-ghost shrink-0 px-2.5 py-1.5 text-xs">
                      Cotizar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <SeccionFamilia cliente={c} todos={todos} onCambio={onGuardado} onAbrir={onAbrir} />

        <section aria-label="Sus datos" className="space-y-3">
          <h3 className="font-semibold text-ink">Sus datos</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo id="cl-nombre" etiqueta="Nombre" className="sm:col-span-2">
              <input id="cl-nombre" value={f.nombre} maxLength={160} onChange={(e) => set({ nombre: e.target.value })} className="field-input" />
            </Campo>
            <Campo id="cl-whatsapp" etiqueta="WhatsApp">
              <input id="cl-whatsapp" inputMode="tel" value={f.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="81 1234 5678" className="field-input" />
              {c.whatsapp.length === 10 && f.whatsapp === c.whatsapp && <span className="mt-1 block text-xs text-ink-mute">{formatoWhatsapp(c.whatsapp)}</span>}
            </Campo>
            <Campo id="cl-correo" etiqueta="Correo">
              <input id="cl-correo" type="email" value={f.correo} maxLength={160} onChange={(e) => set({ correo: e.target.value })} placeholder="nombre@correo.com" className="field-input" />
            </Campo>
            <Campo id="cl-tipo" etiqueta="Es">
              <select id="cl-tipo" value={f.tipo} onChange={(e) => set({ tipo: e.target.value as Cliente["tipo"] })} className="field-input">
                <option value="persona">Persona</option>
                <option value="empresa">Empresa</option>
              </select>
            </Campo>
            {f.tipo === "persona" && (
              <>
                <Campo id="cl-nacimiento" etiqueta="Fecha de nacimiento">
                  <input id="cl-nacimiento" type="date" value={f.fecha_nacimiento} onChange={(e) => set({ fecha_nacimiento: e.target.value })} className="field-input" />
                </Campo>
                <Campo id="cl-genero" etiqueta="Género">
                  <select id="cl-genero" value={f.genero} onChange={(e) => set({ genero: e.target.value as typeof f.genero })} className="field-input">
                    <option value="">Sin definir</option>
                    <option value="mujer">Mujer</option>
                    <option value="hombre">Hombre</option>
                    <option value="prefiero_no_decir">Prefiere no decir</option>
                  </select>
                </Campo>
              </>
            )}
            <Campo id="cl-cp" etiqueta="Código postal">
              <input id="cl-cp" inputMode="numeric" value={f.codigo_postal} maxLength={5} onChange={(e) => set({ codigo_postal: e.target.value })} placeholder="64000" className="field-input" />
            </Campo>
            <Campo id="cl-notas" etiqueta="Notas" className="sm:col-span-2">
              <textarea id="cl-notas" value={f.notas} maxLength={1000} rows={3} onChange={(e) => set({ notas: e.target.value })} className="field-input" />
            </Campo>
          </div>
          <label className="flex min-h-[44px] items-start gap-2 text-sm text-ink-soft">
            <input type="checkbox" className="mt-1" checked={f.no_ofrecer} onChange={(e) => set({ no_ofrecer: e.target.checked })} />
            <span>
              <span className="font-semibold text-ink">No ofrecerle más seguros ni escribirle.</span> Camila lo deja fuera de sus sugerencias y de sus momentos (por ejemplo si te pidió no recibir mensajes).
            </span>
          </label>
          {aviso && (
            <p className="text-sm" style={{ color: aviso.ok ? "var(--green)" : "var(--red)" }} role="status">
              {aviso.texto}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={guardando} onClick={() => void guardar()} className="btn-primary px-5 py-2 text-sm">
              {guardando ? "Guardando…" : "Guardar datos"}
            </button>
            <button type="button" onClick={onCerrar} className="btn-ghost px-5 py-2 text-sm">
              Cerrar
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}

function Campo({ id, etiqueta, className = "", children }: { id: string; etiqueta: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}
