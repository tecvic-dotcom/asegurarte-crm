"use client";

import { useMemo, useState } from "react";
import { crmCrearFamiliar, crmFamilia } from "@/lib/api";
import { edadDe } from "@/lib/cruzada-reglas";
import { PARENTESCOS, familiaDe, palabraDeParentesco, posiblesFamiliares } from "@/lib/cruzada-familia";
import { hoyLocal } from "@/lib/fechas";
import type { Cliente, Parentesco } from "@/lib/types";

interface SeccionFamiliaProps {
  cliente: Cliente;
  todos: Cliente[];
  /** Un cliente cambió o se creó: la pantalla lo actualiza. */
  onCambio: (c: Cliente) => void;
  /** Abrir el expediente de otro cliente (el titular o un familiar). */
  onAbrir: (id: string) => void;
}

const sinNada = { nombre: "", parentesco: "conyuge" as Parentesco, fecha_nacimiento: "", genero: "", whatsapp: "" };

/** La familia del cliente: su titular o sus familiares. Camila la usa para ver al cónyuge sin seguro de vida y a los hijos menores. */
export function SeccionFamilia({ cliente, todos, onCambio, onAbrir }: SeccionFamiliaProps) {
  const familia = familiaDe(cliente, todos);
  const posibles = useMemo(() => posiblesFamiliares(cliente, todos), [cliente, todos]);
  const [titularElegido, setTitularElegido] = useState("");
  const [parentesco, setParentesco] = useState<Parentesco>("conyuge");
  const [nuevo, setNuevo] = useState(sinNada);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const hoy = hoyLocal();

  // Quién puede ser su titular: cualquiera que no sea ya familiar de alguien (y no él mismo).
  const titulares = useMemo(
    () => todos.filter((x) => x.id !== cliente.id && !x.titular_id).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [todos, cliente.id],
  );

  async function ejecutar(accion: () => Promise<Cliente>, ok: string) {
    setOcupado(true);
    setAviso(null);
    try {
      onCambio(await accion());
      setAviso({ ok: true, texto: ok });
    } catch (e) {
      setAviso({ ok: false, texto: (e as Error).message });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section aria-label="Su familia" className="space-y-3" data-testid="familia">
      <h3 className="font-semibold text-ink">Su familia</h3>
      <p className="text-xs text-ink-mute">
        Si ligas a su cónyuge e hijos, Camila te avisa cuando el cónyuge no tiene seguro de vida o cuando hay un hijo menor que necesita un ahorro educativo.
      </p>

      {familia.titular && (
        <p className="text-sm text-ink-soft" data-testid="familia-titular">
          Es {palabraDeParentesco(cliente.parentesco ?? "otro", cliente.genero)} de{" "}
          <button type="button" onClick={() => onAbrir(familia.titular!.id)} className="font-semibold text-ink underline">
            {familia.titular.nombre}
          </button>
          .{" "}
          <button type="button" disabled={ocupado} onClick={() => void ejecutar(() => crmFamilia(cliente.id, null, null), "Quitado de esa familia.")} className="text-xs text-ink-mute underline hover:text-ink">
            Quitar de esa familia
          </button>
        </p>
      )}

      {familia.miembros.length > 0 && (
        <ul className="space-y-1.5" data-testid="familia-miembros">
          {familia.miembros.map((m) => {
            const edad = edadDe(m.fecha_nacimiento, hoy);
            return (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm">
                <span className="min-w-0">
                  <button type="button" onClick={() => onAbrir(m.id)} className="font-medium text-ink hover:underline">
                    {m.nombre}
                  </button>{" "}
                  <span className="text-xs text-ink-mute">
                    · {palabraDeParentesco(m.parentesco ?? "otro", m.genero)}
                    {edad !== null ? ` · ${edad} años` : ""}
                  </span>
                </span>
                <button type="button" disabled={ocupado} onClick={() => void ejecutar(() => crmFamilia(m.id, null, null), `${m.nombre} ya no está en esta familia.`)} className="text-xs text-ink-mute underline hover:text-ink">
                  Quitar
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!familia.titular && familia.miembros.length === 0 && (
        <div className="rounded-xl border border-line p-3">
          <p className="text-sm font-semibold text-ink">¿Es familiar de otro de tus clientes?</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <select aria-label="Titular de la familia" value={titularElegido} onChange={(e) => setTitularElegido(e.target.value)} className="field-input">
              <option value="">Elige a su titular…</option>
              {titulares.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
            <select aria-label="Qué es del titular" value={parentesco} onChange={(e) => setParentesco(e.target.value as Parentesco)} className="field-input" style={{ width: "auto" }}>
              {PARENTESCOS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <button type="button" disabled={ocupado || !titularElegido} onClick={() => void ejecutar(() => crmFamilia(cliente.id, titularElegido, parentesco), "Ligado a su familia.")} className="btn-ghost px-4 py-2 text-sm">
              Ligar
            </button>
          </div>
        </div>
      )}

      {posibles.length > 0 && !familia.titular && (
        <div className="rounded-xl border border-line p-3" data-testid="familia-posibles">
          <p className="text-sm font-semibold text-ink">¿Familia? Comparten apellidos</p>
          <ul className="mt-1.5 space-y-1">
            {posibles.slice(0, 5).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
                <span>{p.nombre}</span>
                <span className="flex gap-1.5">
                  <button type="button" disabled={ocupado} onClick={() => void ejecutar(() => crmFamilia(p.id, cliente.id, "conyuge"), `${p.nombre} quedó como cónyuge de ${cliente.nombre}.`)} className="btn-ghost px-2.5 py-1.5 text-xs">
                    Es su cónyuge
                  </button>
                  <button type="button" disabled={ocupado} onClick={() => void ejecutar(() => crmFamilia(p.id, cliente.id, "hijo"), `${p.nombre} quedó como hijo(a) de ${cliente.nombre}.`)} className="btn-ghost px-2.5 py-1.5 text-xs">
                    Es su hijo(a)
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] text-ink-mute">Es solo una sugerencia: dos personas con los mismos apellidos pueden no ser familia.</p>
        </div>
      )}

      {!familia.titular && (
        <details className="rounded-xl border border-line p-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Agregar un familiar que aún no es tu cliente</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="fam-nombre" className="field-label">
                Nombre
              </label>
              <input id="fam-nombre" value={nuevo.nombre} maxLength={160} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} className="field-input" />
            </div>
            <div>
              <label htmlFor="fam-parentesco" className="field-label">
                Qué es
              </label>
              <select id="fam-parentesco" value={nuevo.parentesco} onChange={(e) => setNuevo({ ...nuevo, parentesco: e.target.value as Parentesco })} className="field-input">
                {PARENTESCOS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fam-genero" className="field-label">
                Género
              </label>
              <select id="fam-genero" value={nuevo.genero} onChange={(e) => setNuevo({ ...nuevo, genero: e.target.value })} className="field-input">
                <option value="">Sin definir</option>
                <option value="mujer">Mujer</option>
                <option value="hombre">Hombre</option>
                <option value="prefiero_no_decir">Prefiere no decir</option>
              </select>
            </div>
            <div>
              <label htmlFor="fam-nacimiento" className="field-label">
                Fecha de nacimiento
              </label>
              <input id="fam-nacimiento" type="date" value={nuevo.fecha_nacimiento} onChange={(e) => setNuevo({ ...nuevo, fecha_nacimiento: e.target.value })} className="field-input" />
            </div>
            <div>
              <label htmlFor="fam-whatsapp" className="field-label">
                WhatsApp (opcional)
              </label>
              <input id="fam-whatsapp" inputMode="tel" value={nuevo.whatsapp} onChange={(e) => setNuevo({ ...nuevo, whatsapp: e.target.value })} placeholder="81 1234 5678" className="field-input" />
            </div>
          </div>
          <button
            type="button"
            disabled={ocupado}
            onClick={() =>
              void ejecutar(async () => {
                const c = await crmCrearFamiliar(cliente.id, {
                  nombre: nuevo.nombre,
                  parentesco: nuevo.parentesco,
                  fecha_nacimiento: nuevo.fecha_nacimiento || null,
                  genero: (nuevo.genero || null) as Cliente["genero"],
                  whatsapp: nuevo.whatsapp,
                });
                setNuevo(sinNada);
                return c;
              }, "Familiar agregado.")
            }
            className="btn-ghost mt-3 px-4 py-2 text-sm"
          >
            Agregar familiar
          </button>
        </details>
      )}

      {aviso && (
        <p className="text-sm" style={{ color: aviso.ok ? "var(--green)" : "var(--red)" }} role="status" data-testid="familia-aviso">
          {aviso.texto}
        </p>
      )}
    </section>
  );
}
