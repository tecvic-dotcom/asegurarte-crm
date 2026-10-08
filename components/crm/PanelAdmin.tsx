"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { adminResumen, type ResumenAdmin } from "@/lib/api";
import { TABS_ADMIN, TabAjustes, TabLeads, TabMetricas, TabUsuarios, type TabAdmin } from "@/components/admin/AdminTabs";

interface PanelAdminProps {
  /** Avisa al CRM que cambiaron los leads (para que refresque su tablero). */
  onCambio: () => void;
}

/**
 * El panel de administración dentro del CRM: métricas, leads (exportar y eliminar), ajustes de
 * la página de captura y usuarios del equipo. Entra con tu sesión de administrador: no pide el código aparte.
 */
export function PanelAdmin({ onCambio }: PanelAdminProps) {
  const [data, setData] = useState<ResumenAdmin | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabAdmin>("metricas");

  const cargar = useCallback(
    () =>
      adminResumen("").then(
        (r) => {
          setData(r);
          setError("");
        },
        (e: unknown) => setError(e instanceof Error ? e.message : "No pude abrir el panel de admin."),
      ),
    [],
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function recargar() {
    await cargar();
    onCambio();
  }

  if (error) {
    return (
      <div className="glass rounded-2xl p-5 text-center">
        <p className="text-sm text-ink-soft">{error}</p>
        <button type="button" onClick={() => void cargar()} className="btn-primary mt-3 px-4 py-2.5 text-sm">
          Reintentar
        </button>
      </div>
    );
  }
  if (!data) return <div className="h-40 animate-pulse rounded-2xl bg-bg-3/70" aria-label="Abriendo el panel de admin" />;

  return (
    <section>
      <nav className="mb-5 flex flex-wrap items-center gap-2" aria-label="Secciones del panel de admin">
        {TABS_ADMIN.map(([id, label, icono]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
              tab === id ? "border-brand-2 bg-brand/15 text-ink" : "border-line bg-glass text-ink-mute hover:text-ink"
            }`}
          >
            <Icon icon={icono} width={18} /> {label}
          </button>
        ))}
        <button type="button" onClick={() => void cargar()} className="btn-ghost ml-auto px-3 py-2 text-sm">
          <Icon icon="flat-color-icons:synchronize" width={18} /> Actualizar
        </button>
      </nav>

      {tab === "metricas" && <TabMetricas data={data} />}
      {tab === "leads" && <TabLeads data={data} code="" onCambio={recargar} />}
      {tab === "ajustes" && <TabAjustes ajustes={data.ajustes} code="" onCambio={recargar} />}
      {tab === "usuarios" && <TabUsuarios data={data} code="" onCambio={recargar} />}
    </section>
  );
}
