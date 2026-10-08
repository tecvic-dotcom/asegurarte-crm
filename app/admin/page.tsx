"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { adminResumen, type ResumenAdmin } from "@/lib/api";
import { TABS_ADMIN, TabAjustes, TabLeads, TabMetricas, TabUsuarios, type TabAdmin } from "@/components/admin/AdminTabs";

const CODE_KEY = "acm.admincode";

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
  const [tab, setTab] = useState<TabAdmin>("metricas");

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
        {TABS_ADMIN.map(([id, label, icono]) => (
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
