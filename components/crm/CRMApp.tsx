"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { crmLeads, crmMover, crmLogout, getAjustesPublicas } from "@/lib/api";
import { ETAPAS, moneda } from "@/lib/crm-data";
import { Pipeline } from "./Pipeline";
import { TablaLeads } from "./TablaLeads";
import { LeadPanel } from "./LeadPanel";
import { Contactos } from "./Contactos";
import { Seguimiento } from "./Seguimiento";
import { Campanas } from "./Campanas";
import { Reportes } from "./Reportes";
import { PanelMando } from "./PanelMando";
import { ManagerIA } from "./ManagerIA";
import { Cobranza } from "./Cobranza";
import { SlotRoro } from "./SlotRoro";
import type { Lead, Sesion, EtapaId, DatosPoliza } from "@/lib/types";

interface CRMAppProps {
  sesion: Sesion;
  inicial: Lead[];
  onLogout: () => void;
}

type Vista = "kanban" | "tabla";
type Pestana = "tablero" | "contactos" | "seguimiento" | "campanas" | "reportes" | "panel" | "roro" | "valeri";

const PESTANAS: [Pestana, string, string][] = [
  ["tablero", "Tablero", "flat-color-icons:flow-chart"],
  ["contactos", "Contactos", "flat-color-icons:grid"],
  ["seguimiento", "Hoy", "flat-color-icons:alarm-clock"],
  ["campanas", "Campañas", "flat-color-icons:advertising"],
  ["reportes", "Reportes", "flat-color-icons:statistics"],
];

/** Módulo 3 (AI Manager): tus finanzas y tu equipo digital son solo para el administrador. */
const PESTANAS_ADMIN: [Pestana, string, string][] = [
  ["panel", "Panel de Mando", "flat-color-icons:combo-chart"],
  ["roro", "RORO", "flat-color-icons:assistant"],
  ["valeri", "Valeri · Cobranza", "flat-color-icons:debt"],
];

/** En estas pestañas no se repite el reporte de arriba (ahí ya está). */
const SIN_SLOT: Pestana[] = ["panel", "roro", "valeri"];

export function CRMApp({ sesion, inicial, onLogout }: CRMAppProps) {
  const [leads, setLeads] = useState<Lead[]>(inicial);
  const [pestana, setPestana] = useState<Pestana>("tablero");
  const [vista, setVista] = useState<Vista>("kanban");
  const [busca, setBusca] = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState<EtapaId | "todas">("todas");
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [negocio, setNegocio] = useState("Tu CRM");
  // Póliza prellenada desde un cliente ganado ("Agregar a cobranza"). "vez" reinicia la pestaña de Valeri solo al llegar una nueva.
  const [polizaNueva, setPolizaNueva] = useState<Partial<DatosPoliza> | null>(null);
  const [vezPoliza, setVezPoliza] = useState(0);

  useEffect(() => {
    getAjustesPublicas()
      .then((a) => a.negocio_nombre && setNegocio(a.negocio_nombre))
      .catch(() => {});
  }, []);

  async function recargar() {
    try {
      setLeads(await crmLeads());
    } catch {
      /* si caduca la sesión, el panel se cerrará al fallar */
    }
  }

  async function mover(id: string, etapa: EtapaId) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, etapa } : l))); // optimista
    try {
      await crmMover(id, etapa);
    } catch {
      void recargar();
    }
  }

  async function salir() {
    await crmLogout();
    onLogout();
  }

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return leads.filter((l) => {
      if (filtroEtapa !== "todas" && l.etapa !== filtroEtapa) return false;
      if (!q) return true;
      return (
        l.nombre.toLowerCase().includes(q) ||
        l.correo.toLowerCase().includes(q) ||
        l.whatsapp.includes(q)
      );
    });
  }, [leads, busca, filtroEtapa]);

  const pipeline = useMemo(() => leads.filter((l) => l.etapa === "ganado"), [leads]);
  const valorGanado = pipeline.reduce((s, l) => s + l.valor, 0);
  const esAdmin = sesion.rol === "admin";
  const pestanas = esAdmin ? [...PESTANAS, ...PESTANAS_ADMIN] : PESTANAS;

  /** Desde el Panel: muestra en tabla las pólizas ganadas para asignarles su ramo. */
  function verGanadasSinRamo() {
    setPestana("tablero");
    setVista("tabla");
    setFiltroEtapa("ganado");
    setBusca("");
  }

  /** Desde el expediente de un cliente ganado: lo lleva con Valeri con su póliza ya prellenada. */
  function agregarACobranza(lead: Lead) {
    setPolizaNueva({
      asegurado: lead.nombre,
      whatsapp: lead.whatsapp,
      correo: lead.correo,
      ramo: lead.ramo,
      prima_anual: lead.valor,
      lead_id: lead.id,
    });
    setVezPoliza((v) => v + 1);
    setSeleccion(null);
    setPestana("valeri");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Barra superior */}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">{negocio}</h1>
          <p className="text-sm text-ink-mute">
            Hola, {sesion.nombre} · {sesion.rol === "admin" ? "Administrador" : "Vendedor"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/admin" className="btn-ghost px-3 py-2 text-sm">
            <Icon icon="flat-color-icons:settings" width={18} /> Admin
          </a>
          <button onClick={salir} className="btn-ghost px-3 py-2 text-sm">
            <Icon icon="flat-color-icons:export" width={18} /> Salir
          </button>
        </div>
      </header>

      {/* Métricas rápidas */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metrica icono="flat-color-icons:business-contact" label="Prospectos" valor={String(leads.length)} />
        <Metrica icono="flat-color-icons:calendar" label="En cita" valor={String(leads.filter((l) => l.etapa === "cita").length)} />
        <Metrica icono="flat-color-icons:approval" label="Clientes" valor={String(pipeline.length)} />
        <Metrica icono="flat-color-icons:money-transfer" label="Ganado" valor={moneda(valorGanado)} />
      </div>

      {/* Tu equipo digital (Módulo 3 · AI Manager): RORO y Valeri con su reporte de hoy.
          En sus propias pestañas no se repite (ahí ya está). */}
      {esAdmin && !SIN_SLOT.includes(pestana) && (
        <SlotRoro
          onPanel={() => setPestana("panel")}
          onRoro={() => setPestana("roro")}
          onValeri={() => setPestana("valeri")}
        />
      )}

      {/* Pestañas */}
      <nav className="mb-4 flex flex-wrap gap-2">
        {pestanas.map(([id, label, icono]) => (
          <button
            key={id}
            onClick={() => setPestana(id)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
              pestana === id ? "border-brand-2 bg-brand/15 text-ink" : "border-line bg-glass text-ink-mute hover:text-ink"
            }`}
          >
            <Icon icon={icono} width={18} /> {label}
          </button>
        ))}
      </nav>

      {(pestana === "tablero" || pestana === "contactos") && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-glass px-3 py-2">
            <Icon icon="flat-color-icons:search" width={18} />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nombre, correo o WhatsApp…"
              className="w-56 bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute"
            />
          </div>
          <select
            value={filtroEtapa}
            onChange={(e) => setFiltroEtapa(e.target.value as EtapaId | "todas")}
            className="rounded-xl border border-line bg-glass px-3 py-2 text-sm text-ink"
          >
            <option value="todas">Todas las etapas</option>
            {ETAPAS.map((et) => (
              <option key={et.id} value={et.id}>
                {et.nombre}
              </option>
            ))}
          </select>
          {pestana === "tablero" && (
            <div className="ml-auto flex rounded-xl border border-line bg-glass p-1">
              <Toggle activo={vista === "kanban"} onClick={() => setVista("kanban")} icono="flat-color-icons:flow-chart" label="Tablero" />
              <Toggle activo={vista === "tabla"} onClick={() => setVista("tabla")} icono="flat-color-icons:grid" label="Tabla" />
            </div>
          )}
        </div>
      )}

      {pestana === "tablero" &&
        (vista === "kanban" ? (
          <Pipeline leads={filtrados} onMover={mover} onAbrir={setSeleccion} />
        ) : (
          <TablaLeads leads={filtrados} onAbrir={setSeleccion} />
        ))}
      {pestana === "contactos" && <Contactos leads={filtrados} onAbrir={setSeleccion} onCambio={recargar} />}
      {pestana === "seguimiento" && <Seguimiento leads={leads} onAbrir={setSeleccion} />}
      {pestana === "campanas" && <Campanas leads={leads} />}
      {pestana === "reportes" && <Reportes leads={leads} />}
      {esAdmin && pestana === "panel" && <PanelMando onVerSinRamo={verGanadasSinRamo} />}
      {esAdmin && pestana === "roro" && <ManagerIA sesion={sesion} onValeri={() => setPestana("valeri")} />}
      {esAdmin && pestana === "valeri" && (
        <Cobranza
          key={vezPoliza}
          prefill={polizaNueva}
          onPrefillUsado={() => setPolizaNueva(null)}
        />
      )}

      {seleccion && (
        <LeadPanel
          id={seleccion}
          onClose={() => setSeleccion(null)}
          onCambio={recargar}
          onAgregarCobranza={esAdmin ? agregarACobranza : undefined}
        />
      )}
    </div>
  );
}

function Metrica({ icono, label, valor }: { icono: string; label: string; valor: string }) {
  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-3">
      <Icon icon={icono} width={30} />
      <div>
        <p className="text-lg font-bold text-ink">{valor}</p>
        <p className="text-xs text-ink-mute">{label}</p>
      </div>
    </div>
  );
}

function Toggle({ activo, onClick, icono, label }: { activo: boolean; onClick: () => void; icono: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
        activo ? "bg-brand/20 text-ink" : "text-ink-mute hover:text-ink"
      }`}
    >
      <Icon icon={icono} width={18} /> {label}
    </button>
  );
}
