"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import {
  adminResumen,
  adminSetAjuste,
  adminCrearUsuario,
  adminEliminarUsuario,
  adminEliminarLead,
  adminExportCSV,
  type ResumenAdmin,
} from "@/lib/api";
import { etapa as etapaPorId, moneda } from "@/lib/crm-data";
import type { Ajustes } from "@/lib/types";

const CODE_KEY = "acm.admincode";
type Tab = "metricas" | "leads" | "ajustes" | "usuarios";

/**
 * Panel de administración. La barrera REAL es el servidor (cabecera
 * x-admin-code, fail-closed). Aquí solo guardamos el código en sessionStorage
 * para no re-escribirlo en cada recarga.
 */
export default function AdminPage() {
  const [code, setCode] = useState("");
  const [data, setData] = useState<ResumenAdmin | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [tab, setTab] = useState<Tab>("metricas");

  async function entrar(c: string) {
    setError("");
    setCargando(true);
    try {
      const r = await adminResumen(c);
      setData(r);
      setCode(c);
      try {
        sessionStorage.setItem(CODE_KEY, c);
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Código incorrecto.");
      setData(null);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let guardado = "";
    try {
      guardado = sessionStorage.getItem(CODE_KEY) ?? "";
    } catch {
      /* ignore */
    }
    if (!guardado) return;
    let vivo = true;
    (async () => {
      try {
        const r = await adminResumen(guardado);
        if (!vivo) return;
        setData(r);
        setCode(guardado);
      } catch {
        /* código inválido o caduco: se queda en la pantalla de acceso */
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const recargar = () => entrar(code);

  if (!data) {
    return (
      <main className="grid min-h-[80vh] place-items-center px-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void entrar(code);
          }}
          className="glass-strong w-full max-w-sm rounded-[22px] p-8"
        >
          <Icon icon="flat-color-icons:lock" width={52} className="mx-auto" />
          <h1 className="mt-3 text-center font-display text-2xl text-ink">Panel admin</h1>
          <p className="mb-6 text-center text-sm text-ink-mute">Escribe tu código de administrador.</p>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="field-input"
            placeholder="Código de admin"
            autoFocus
          />
          {error && <p className="mt-3 text-sm text-[#ff9a9a]">{error}</p>}
          <button disabled={cargando} className="btn-primary mt-5 w-full">
            {cargando ? "Entrando…" : "Entrar"}
          </button>
          <Link href="/crm" className="mt-4 block text-center text-sm text-ink-mute underline">
            Ir al CRM
          </Link>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink">Panel de administración</h1>
        <div className="flex gap-2">
          <Link href="/crm" className="btn-ghost px-3 py-2 text-sm">
            <Icon icon="flat-color-icons:flow-chart" width={18} /> CRM
          </Link>
          <button onClick={recargar} className="btn-ghost px-3 py-2 text-sm">
            <Icon icon="flat-color-icons:synchronize" width={18} /> Actualizar
          </button>
        </div>
      </header>

      <nav className="mb-5 flex flex-wrap gap-2">
        {([
          ["metricas", "Métricas", "flat-color-icons:bar-chart"],
          ["leads", "Leads", "flat-color-icons:contacts"],
          ["ajustes", "Ajustes", "flat-color-icons:settings"],
          ["usuarios", "Usuarios", "flat-color-icons:conference-call"],
        ] as [Tab, string, string][]).map(([id, label, icono]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
              tab === id ? "border-brand-2 bg-brand/15 text-ink" : "border-line bg-glass text-ink-mute hover:text-ink"
            }`}
          >
            <Icon icon={icono} width={18} /> {label}
          </button>
        ))}
      </nav>

      {tab === "metricas" && <TabMetricas data={data} />}
      {tab === "leads" && <TabLeads data={data} code={code} onCambio={recargar} />}
      {tab === "ajustes" && <TabAjustes ajustes={data.ajustes} code={code} onCambio={recargar} />}
      {tab === "usuarios" && <TabUsuarios data={data} code={code} onCambio={recargar} />}
    </main>
  );
}

function TabMetricas({ data }: { data: ResumenAdmin }) {
  const m = data.metricas;
  const max = Math.max(1, ...m.porEtapa.map((e) => e.count));
  return (
    <section>
      {!m.cloud && (
        <p className="mb-4 rounded-xl border border-line bg-glass px-4 py-3 text-sm text-ink-mute">
          ⚠️ Modo DEMO (sin Supabase): estos datos son de muestra y no se guardan. Conecta tu base para usarlo de verdad.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tarjeta icono="flat-color-icons:contacts" label="Leads totales" valor={String(m.totalLeads)} />
        <Tarjeta icono="flat-color-icons:plus" label="Nuevos hoy" valor={String(m.nuevosHoy)} />
        <Tarjeta icono="flat-color-icons:approval" label="Clientes" valor={String(m.ganados)} />
        <Tarjeta icono="flat-color-icons:money-transfer" label="Ganado" valor={moneda(m.valorGanado)} />
      </div>
      <div className="mt-5 glass rounded-2xl p-5">
        <p className="mb-4 font-semibold text-ink">Prospectos por etapa</p>
        <div className="space-y-3">
          {m.porEtapa.map((e) => {
            const et = etapaPorId(e.etapa);
            return (
              <div key={e.etapa} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm text-ink-soft">{et.nombre}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-bg-3">
                  <div className="h-full rounded-full" style={{ width: `${(e.count / max) * 100}%`, background: et.color }} />
                </div>
                <span className="w-8 text-right text-sm text-ink-mute">{e.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TabLeads({ data, code, onCambio }: { data: ResumenAdmin; code: string; onCambio: () => void }) {
  async function exportar() {
    const csv = await adminExportCSV(code);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function borrar(id: string) {
    if (!confirm("¿Eliminar este lead? No se puede deshacer.")) return;
    await adminEliminarLead(code, id);
    onCambio();
  }
  return (
    <section>
      <div className="mb-3 flex justify-end">
        <button onClick={exportar} className="btn-ghost px-3 py-2 text-sm">
          <Icon icon="flat-color-icons:export" width={18} /> Exportar CSV
        </button>
      </div>
      <div className="no-scrollbar overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-ink-mute">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Etapa</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {data.leads.map((l) => (
              <tr key={l.id} className="border-b border-line/60">
                <td className="px-4 py-3 text-ink">{l.nombre}</td>
                <td className="px-4 py-3 text-ink-soft">{l.correo}</td>
                <td className="px-4 py-3 text-ink-soft">{l.whatsapp}</td>
                <td className="px-4 py-3 text-ink-soft">{etapaPorId(l.etapa).nombre}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => borrar(l.id)} className="text-ink-mute hover:text-[#ff9a9a]" title="Eliminar">
                    <Icon icon="flat-color-icons:delete-database" width={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TabAjustes({ ajustes, code, onCambio }: { ajustes: Ajustes; code: string; onCambio: () => void }) {
  const [form, setForm] = useState<Ajustes>(ajustes);
  const [guardado, setGuardado] = useState(false);

  async function guardar() {
    await Promise.all([
      adminSetAjuste(code, "negocio_nombre", form.negocio_nombre),
      adminSetAjuste(code, "whatsapp_url", form.whatsapp_url),
      adminSetAjuste(code, "group_url", form.group_url),
      adminSetAjuste(code, "popup_activo", form.popup_activo ? "true" : "false"),
      adminSetAjuste(code, "hero_titulo", form.hero_titulo),
      adminSetAjuste(code, "hero_cta", form.hero_cta),
    ]);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
    onCambio();
  }

  return (
    <section className="glass rounded-2xl p-6">
      <label className="field-label">Nombre del negocio</label>
      <input className="field-input" value={form.negocio_nombre} onChange={(e) => setForm({ ...form, negocio_nombre: e.target.value })} />

      <label className="field-label mt-4">Titular de la página de captura</label>
      <input
        className="field-input"
        value={form.hero_titulo}
        onChange={(e) => setForm({ ...form, hero_titulo: e.target.value })}
        placeholder="Déjalo vacío para usar el titular de lib/landing-content.ts"
      />

      <label className="field-label mt-4">Texto del botón (CTA)</label>
      <input
        className="field-input"
        value={form.hero_cta}
        onChange={(e) => setForm({ ...form, hero_cta: e.target.value })}
        placeholder="Déjalo vacío para usar el de lib/landing-content.ts"
      />

      <label className="field-label mt-4">Link de WhatsApp (de la página de gracias)</label>
      <input className="field-input" value={form.whatsapp_url} onChange={(e) => setForm({ ...form, whatsapp_url: e.target.value })} placeholder="https://wa.me/521..." />

      <label className="field-label mt-4">Link del grupo (opcional)</label>
      <input className="field-input" value={form.group_url} onChange={(e) => setForm({ ...form, group_url: e.target.value })} placeholder="https://chat.whatsapp.com/..." />

      <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-ink-soft">
        <input type="checkbox" checked={form.popup_activo} onChange={(e) => setForm({ ...form, popup_activo: e.target.checked })} className="h-4 w-4 accent-[var(--brand)]" />
        Mostrar el pop-up de actividad (solo en escritorio)
      </label>

      <button onClick={guardar} className="btn-primary mt-6">
        {guardado ? "¡Guardado!" : "Guardar ajustes"}
      </button>
    </section>
  );
}

function TabUsuarios({ data, code, onCambio }: { data: ResumenAdmin; code: string; onCambio: () => void }) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState<"admin" | "vendedor">("vendedor");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function crear() {
    setMsg("");
    try {
      const r = await adminCrearUsuario(code, { nombre, correo, rol, password });
      setMsg(r.duplicado ? "Ese correo ya existe." : "Usuario creado ✓");
      setNombre("");
      setCorreo("");
      setPassword("");
      onCambio();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error al crear.");
    }
  }
  async function borrar(id: string) {
    if (!confirm("¿Eliminar este usuario?")) return;
    await adminEliminarUsuario(code, id);
    onCambio();
  }

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <div className="glass rounded-2xl p-6">
        <p className="mb-4 font-semibold text-ink">Agregar usuario del equipo</p>
        <label className="field-label">Nombre</label>
        <input className="field-input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <label className="field-label mt-3">Correo</label>
        <input className="field-input" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <label className="field-label mt-3">Rol</label>
        <select className="field-input" value={rol} onChange={(e) => setRol(e.target.value as "admin" | "vendedor")}>
          <option value="vendedor">Vendedor</option>
          <option value="admin">Administrador</option>
        </select>
        <label className="field-label mt-3">Contraseña (mín. 8 caracteres)</label>
        <input type="password" className="field-input" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={crear} className="btn-primary mt-5 w-full">Crear usuario</button>
        {msg && <p className="mt-3 text-sm text-ink-soft">{msg}</p>}
      </div>

      <div className="glass rounded-2xl p-6">
        <p className="mb-4 font-semibold text-ink">Equipo</p>
        <ul className="space-y-2">
          {data.usuarios.map((u) => (
            <li key={u.id} className="flex items-center justify-between rounded-xl border border-line bg-glass px-3 py-2">
              <div>
                <p className="text-sm font-medium text-ink">{u.nombre}</p>
                <p className="text-xs text-ink-mute">{u.correo} · {u.rol}</p>
              </div>
              <button onClick={() => borrar(u.id)} className="text-ink-mute hover:text-[#ff9a9a]" title="Eliminar">
                <Icon icon="flat-color-icons:delete-database" width={20} />
              </button>
            </li>
          ))}
          {!data.usuarios.length && <p className="text-sm text-ink-mute">Aún no hay usuarios.</p>}
        </ul>
      </div>
    </section>
  );
}

function Tarjeta({ icono, label, valor }: { icono: string; label: string; valor: string }) {
  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-4">
      <Icon icon={icono} width={32} />
      <div>
        <p className="text-xl font-bold text-ink">{valor}</p>
        <p className="text-xs text-ink-mute">{label}</p>
      </div>
    </div>
  );
}
