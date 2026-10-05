"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { crmCrearMovimientos, crmEditarMovimiento, crmEliminarMovimiento, crmMovimientos } from "@/lib/api";
import { categoriasDe, validarMovimiento } from "@/lib/finanzas-reglas";
import { RAMOS, infoRamo } from "@/lib/ramos";
import { fechaCorta, hoyLocal } from "@/lib/fechas";
import type { Movimiento, Ramo, RangoFechas, TipoMovimiento } from "@/lib/types";
import { dinero } from "./formato";

interface Borrador {
  id?: string;
  tipo: TipoMovimiento;
  monto: string;
  fecha: string;
  concepto: string;
  categoria: string;
  ramo: Ramo | "";
  porConfirmar: boolean;
  conciliado: boolean;
  notas: string;
}

function borradorNuevo(tipo: TipoMovimiento = "ingreso"): Borrador {
  return {
    tipo,
    monto: "",
    fecha: hoyLocal(),
    concepto: "",
    categoria: categoriasDe(tipo)[0],
    ramo: "",
    porConfirmar: false,
    conciliado: false,
    notas: "",
  };
}

function borradorDe(m: Movimiento): Borrador {
  return {
    id: m.id,
    tipo: m.tipo,
    monto: String(m.monto),
    fecha: m.fecha,
    concepto: m.concepto,
    categoria: m.categoria,
    ramo: m.ramo ?? "",
    porConfirmar: m.estado === "por_confirmar",
    conciliado: m.conciliado,
    notas: m.notas,
  };
}

const VISIBLES = 30;

/**
 * Movimientos del periodo: aquí registras lo que te entra (comisiones, bonos)
 * y lo que gastas. Es la gasolina del Panel: sin esto, los números de dinero
 * se quedan en cero.
 */
export function Movimientos({ rango, onCambio }: { rango: RangoFechas; onCambio: () => void }) {
  const [lista, setLista] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [verTodos, setVerTodos] = useState(false);
  const { desde, hasta } = rango;

  /** Trae la lista del periodo (el estado solo cambia cuando llega la respuesta). */
  const recargar = useCallback(
    () =>
      crmMovimientos(desde, hasta).then(
        (l) => {
          setLista(l);
          setError(null);
          setCargando(false);
        },
        (e: unknown) => {
          setError((e as Error).message);
          setCargando(false);
        },
      ),
    [desde, hasta],
  );

  useEffect(() => {
    void recargar();
  }, [recargar]);

  async function guardar() {
    if (!borrador) return;
    const r = validarMovimiento({
      fecha: borrador.fecha,
      tipo: borrador.tipo,
      monto: borrador.monto,
      concepto: borrador.concepto,
      categoria: borrador.categoria,
      ramo: borrador.tipo === "ingreso" ? borrador.ramo || null : null,
      estado: borrador.porConfirmar ? "por_confirmar" : "confirmado",
      conciliado: borrador.conciliado,
      notas: borrador.notas,
    });
    if (!r.ok) {
      setErrorForm(r.error);
      return;
    }
    setGuardando(true);
    setErrorForm(null);
    try {
      if (borrador.id) await crmEditarMovimiento(borrador.id, r.movimiento);
      else await crmCrearMovimientos([r.movimiento]);
      setBorrador(null);
      await recargar();
      onCambio();
    } catch (e) {
      setErrorForm((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function confirmar(m: Movimiento) {
    try {
      await crmEditarMovimiento(m.id, { estado: "confirmado" });
      await recargar();
      onCambio();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function borrar(m: Movimiento) {
    if (!window.confirm(`¿Borrar “${m.concepto}” por ${dinero(m.monto)}? No se puede deshacer.`)) return;
    try {
      await crmEliminarMovimiento(m.id);
      await recargar();
      onCambio();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const visibles = verTodos ? lista : lista.slice(0, VISIBLES);

  return (
    <section className="glass rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-ink">Movimientos · {rango.etiqueta}</h3>
          <p className="text-xs text-ink-mute">Lo que entró y salió. Esto alimenta tus números de arriba.</p>
        </div>
        {!borrador && (
          <button type="button" onClick={() => { setBorrador(borradorNuevo()); setErrorForm(null); }} className="btn-primary px-4 py-2.5 text-sm">
            <Icon icon="flat-color-icons:plus" width={18} aria-hidden /> Registrar
          </button>
        )}
      </div>

      {borrador && (
        <Formulario
          borrador={borrador}
          onCambio={setBorrador}
          onGuardar={guardar}
          onCancelar={() => { setBorrador(null); setErrorForm(null); }}
          guardando={guardando}
          error={errorForm}
        />
      )}

      {error && <p className="mb-3 rounded-xl border border-line bg-bg-3/60 p-3 text-sm text-ink-soft">{error}</p>}

      {cargando ? (
        <div className="space-y-2" aria-label="Cargando movimientos">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-bg-3/70" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-mute">
          Aún no hay movimientos en este periodo. Toca <strong className="text-ink-soft">Registrar</strong> para anotar tu primera comisión o gasto.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {visibles.map((m) => (
            <li key={m.id} className="flex items-start gap-3 py-3">
              <span
                className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: m.tipo === "ingreso" ? "var(--serie-entro)" : "var(--serie-salio)" }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm text-ink">
                    <span className="text-ink-mute">{fechaCorta(m.fecha)} · </span>
                    {m.concepto}
                  </p>
                  <p className="shrink-0 text-sm font-semibold text-ink">
                    {m.tipo === "ingreso" ? "+" : "−"}
                    {dinero(m.monto)}
                  </p>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-mute">
                  <span>{m.categoria}</span>
                  {m.ramo && <span>· {infoRamo(m.ramo).corto}</span>}
                  {m.conciliado && (
                    <span className="inline-flex items-center gap-1 text-ink-soft">
                      <Icon icon="flat-color-icons:ok" width={13} aria-hidden /> cuadrado con el banco
                    </span>
                  )}
                  {m.estado === "por_confirmar" && (
                    <>
                      <span className="inline-flex items-center gap-1 font-semibold" style={{ color: "var(--amber)" }}>
                        <Icon icon="flat-color-icons:medium-priority" width={13} aria-hidden /> Por confirmar
                      </span>
                      <button type="button" onClick={() => confirmar(m)} className="rounded-lg border border-line px-2 py-1 text-ink-soft hover:text-ink">
                        Confirmar
                      </button>
                    </>
                  )}
                  <span className="ml-auto flex gap-1">
                    <button
                      type="button"
                      onClick={() => { setBorrador(borradorDe(m)); setErrorForm(null); }}
                      className="grid h-8 w-8 place-items-center rounded-lg hover:bg-glass"
                      aria-label={`Editar ${m.concepto}`}
                    >
                      <Icon icon="flat-color-icons:edit-image" width={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => borrar(m)}
                      className="grid h-8 w-8 place-items-center rounded-lg hover:bg-glass"
                      aria-label={`Borrar ${m.concepto}`}
                    >
                      <Icon icon="flat-color-icons:full-trash" width={17} />
                    </button>
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!verTodos && lista.length > VISIBLES && (
        <button type="button" onClick={() => setVerTodos(true)} className="btn-ghost mt-3 w-full py-2.5 text-sm">
          Ver los {lista.length} movimientos
        </button>
      )}

      <p className="mt-4 flex items-start gap-2 text-xs text-ink-mute">
        <Icon icon="flat-color-icons:idea" width={16} className="shrink-0" aria-hidden />
        <span>
          ¿Tienes tu estado de cuenta o tus estados de comisiones? Pégalos tal cual en Claude Code y pídele:
          “ordéname estos movimientos, concílialos y guárdalos en mi CRM”. Tu Director Financiero IA hace el trabajo pesado.
        </span>
      </p>
    </section>
  );
}

function Formulario({
  borrador,
  onCambio,
  onGuardar,
  onCancelar,
  guardando,
  error,
}: {
  borrador: Borrador;
  onCambio: (b: Borrador) => void;
  onGuardar: () => void;
  onCancelar: () => void;
  guardando: boolean;
  error: string | null;
}) {
  const b = borrador;
  const set = (cambios: Partial<Borrador>) => onCambio({ ...b, ...cambios });
  const categorias = categoriasDe(b.tipo);
  const opcionesCategoria = categorias.includes(b.categoria) ? categorias : [b.categoria, ...categorias];

  return (
    <div className="mb-4 rounded-2xl border border-line bg-bg-2/60 p-4">
      <p className="mb-3 text-sm font-semibold text-ink">{b.id ? "Editar movimiento" : "Nuevo movimiento"}</p>

      <div className="mb-3 grid grid-cols-2 gap-2" role="group" aria-label="Tipo de movimiento">
        {(["ingreso", "gasto"] as TipoMovimiento[]).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={b.tipo === t}
            onClick={() => set({ tipo: t, categoria: categoriasDe(t)[0], ramo: t === "gasto" ? "" : b.ramo })}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold ${
              b.tipo === t ? "border-brand-2 bg-brand/15 text-ink" : "border-line text-ink-mute"
            }`}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: t === "ingreso" ? "var(--serie-entro)" : "var(--serie-salio)" }}
              aria-hidden
            />
            {t === "ingreso" ? "Me entró" : "Gasté"}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="mov-monto">Monto (MXN)</label>
          <input
            id="mov-monto"
            inputMode="decimal"
            value={b.monto}
            onChange={(e) => set({ monto: e.target.value })}
            placeholder="8400"
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="mov-fecha">Fecha</label>
          <input id="mov-fecha" type="date" value={b.fecha} onChange={(e) => set({ fecha: e.target.value })} className="field-input [color-scheme:dark]" />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="mov-concepto">Concepto</label>
          <input
            id="mov-concepto"
            value={b.concepto}
            maxLength={200}
            onChange={(e) => set({ concepto: e.target.value })}
            placeholder={b.tipo === "ingreso" ? "Comisión póliza vida octubre" : "Publicidad Facebook"}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="mov-categoria">Categoría</label>
          <select id="mov-categoria" value={b.categoria} onChange={(e) => set({ categoria: e.target.value })} className="field-input">
            {opcionesCategoria.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {b.tipo === "ingreso" && (
          <div>
            <label className="field-label" htmlFor="mov-ramo">Ramo (opcional)</label>
            <select id="mov-ramo" value={b.ramo} onChange={(e) => set({ ramo: e.target.value as Ramo | "" })} className="field-input">
              <option value="">Sin ramo</option>
              {RAMOS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2 text-sm text-ink-soft">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={b.porConfirmar} onChange={(e) => set({ porConfirmar: e.target.checked })} className="h-5 w-5" />
          Por confirmar (no estoy seguro de este dato)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={b.conciliado} onChange={(e) => set({ conciliado: e.target.checked })} className="h-5 w-5" />
          Ya lo cuadré con mi estado de cuenta
        </label>
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-1.5 text-sm" style={{ color: "var(--red)" }} role="alert">
          <Icon icon="flat-color-icons:high-priority" width={16} className="mt-0.5 shrink-0" aria-hidden /> {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onGuardar} disabled={guardando} className="btn-primary flex-1 py-3 text-sm">
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" onClick={onCancelar} className="btn-ghost px-4 py-3 text-sm">
          Cancelar
        </button>
      </div>
    </div>
  );
}
