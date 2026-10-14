"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { crmLeads, crmMover, crmLogout, getAjustesPublicas } from "@/lib/api";
import { ETAPAS } from "@/lib/crm-data";
import { Pipeline } from "./Pipeline";
import { TablaLeads } from "./TablaLeads";
import { LeadPanel } from "./LeadPanel";
import { Contactos } from "./Contactos";
import { ClientesGanados } from "./ClientesGanados";
import { ProspectosPerdidos } from "./ProspectosPerdidos";
import { PendientesDia } from "./PendientesDia";
import { Cotizaciones } from "./Cotizaciones";
import { Seguimiento } from "./Seguimiento";
import { EmbudoVentas } from "./EmbudoVentas";
import { PanelMando } from "./PanelMando";
import { ManagerIA } from "./ManagerIA";
import { Cobranza } from "./Cobranza";
import { Crecimiento } from "./Crecimiento";
import { PanelAdmin } from "./PanelAdmin";
import { PolizasAdjuntas } from "./PolizasAdjuntas";
import { SeguimientoSofi } from "./SeguimientoSofi";
import { ReportesClara } from "./ReportesClara";
import { Camila } from "./Camila";
import { MenuLateral, opcionDe, type Pestana } from "./MenuLateral";
import { polizaDesdeVenta } from "@/lib/poliza-desde-venta";
import type { Cotizacion } from "@/lib/cotizaciones-reglas";
import type { Lead, Sesion, EtapaId, DatosPoliza, FormaPago, Poliza } from "@/lib/types";

interface CRMAppProps {
  sesion: Sesion;
  inicial: Lead[];
  onLogout: () => void;
}

type Vista = "hoy" | "kanban" | "tabla";

export function CRMApp({ sesion, inicial, onLogout }: CRMAppProps) {
  const [leads, setLeads] = useState<Lead[]>(inicial);
  const [pestana, setPestana] = useState<Pestana>("tablero");
  const [vista, setVista] = useState<Vista>("hoy");
  const [busca, setBusca] = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState<EtapaId | "todas">("todas");
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [negocio, setNegocio] = useState("Tu CRM");
  // Póliza prellenada desde un cliente ganado ("Agregar a cobranza"). "vez" reinicia la pestaña de Valeri solo al llegar una nueva.
  const [polizaNueva, setPolizaNueva] = useState<Partial<DatosPoliza> | null>(null);
  const [vezPoliza, setVezPoliza] = useState(0);
  // Una póliza que ya existe y se abre para verla o editarla en Valeri (desde la ficha del cliente).
  const [polizaAEditar, setPolizaAEditar] = useState<Poliza | null>(null);
  // El prospecto al que se le cotiza (se conserva al cambiar de pestaña y volver).
  const [cotizarLeadId, setCotizarLeadId] = useState<string | null>(null);
  // Llegó desde el Panel de Mando («ganadas sin ramo»): Clientes ganados se abre ya filtrado.
  const [clientesSinRamo, setClientesSinRamo] = useState(false);
  // Celular: el menú vive escondido a la izquierda y se abre con el botón "Menú".
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    if (!menuAbierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && setMenuAbierto(false);
    window.addEventListener("keydown", alTeclear);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = "";
    };
  }, [menuAbierto]);

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

  // La vista "Hoy" trae sus propios filtros de etapa: solo le aplica la búsqueda.
  const buscados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? leads.filter((l) => l.nombre.toLowerCase().includes(q) || l.correo.toLowerCase().includes(q) || l.whatsapp.includes(q)) : leads;
  }, [leads, busca]);

  // Los clientes ganados y los perdidos viven en su propio apartado: Prospectos muestra solo a quien sigues atendiendo.
  // (Los perdidos NO se borran: se quedan en «Perdidos» para ofrecerles otro seguro.)
  const pipeline = useMemo(() => leads.filter((l) => l.etapa === "ganado"), [leads]);
  const perdidos = useMemo(() => leads.filter((l) => l.etapa === "perdido"), [leads]);
  const enAtencion = (l: Lead) => l.etapa !== "ganado" && l.etapa !== "perdido";
  const prospectos = useMemo(() => leads.filter((l) => l.etapa !== "ganado" && l.etapa !== "perdido"), [leads]);
  const prospectosFiltrados = useMemo(() => filtrados.filter(enAtencion), [filtrados]);
  const esAdmin = sesion.rol === "admin";
  const actual = opcionDe(pestana);

  function elegir(id: Pestana) {
    // Una búsqueda escrita en otra pantalla no se lleva a la nueva: así el tablero no aparece «vacío» sin saber por qué.
    if (id !== pestana) setBusca("");
    // Entrar a Clientes ganados desde el menú lo muestra completo; solo el Panel de Mando lo abre ya filtrado.
    if (id === "clientes") setClientesSinRamo(false);
    // Un filtro «Cliente ganado» o «Perdido» pendiente dejaría vacío Prospectos (esos ya no viven ahí).
    if (id === "contactos" && (filtroEtapa === "ganado" || filtroEtapa === "perdido")) setFiltroEtapa("todas");
    // Tocar «Cotizaciones» estando ya en Cotizaciones te regresa a la lista (si no, el botón del menú parecía no hacer nada).
    if (id === "cotizaciones" && pestana === "cotizaciones") setCotizarLeadId(null);
    setPestana(id);
    setMenuAbierto(false);
    window.scrollTo({ top: 0 });
  }

  /** Desde el Panel: muestra los clientes ganados que no tienen ramo para asignárselo. */
  function verGanadasSinRamo() {
    setClientesSinRamo(true);
    setPestana("clientes");
    setBusca("");
    window.scrollTo({ top: 0 });
  }

  /** Desde el expediente de un cliente ganado: lo lleva con Valeri con su póliza ya prellenada. */
  function agregarACobranza(lead: Lead, forma: FormaPago = "anual", cotizacion: Cotizacion | null = null) {
    // Con la cotización elegida se pasan sus cantidades reales (prima, primer pago y subsecuentes); sin ella, un estimado.
    setPolizaNueva(polizaDesdeVenta(lead, forma, cotizacion));
    setVezPoliza((v) => v + 1);
    setSeleccion(null);
    setPestana("valeri");
  }

  /** Desde el expediente de un cliente ganado: abre en Valeri la póliza que ya tiene. */
  function verPolizaEnValeri(p: Poliza) {
    setPolizaAEditar(p);
    setPolizaNueva(null);
    setVezPoliza((v) => v + 1);
    setSeleccion(null);
    setPestana("valeri");
    window.scrollTo({ top: 0 });
  }

  /** Desde Camila: abre Valeri con una póliza nueva ya prellenada con los datos del cliente que acaba de contratar. */
  function agregarPolizaDeCliente(datos: Partial<DatosPoliza>) {
    setPolizaNueva(datos);
    setPolizaAEditar(null);
    setVezPoliza((v) => v + 1);
    setPestana("valeri");
    window.scrollTo({ top: 0 });
  }

  /** Desde Camila: abre Cotizaciones con el prospecto de ese cliente (se recargan los prospectos por si se creó uno nuevo). */
  async function cotizarPorId(leadId: string) {
    await recargar();
    setCotizarLeadId(leadId);
    setPestana("cotizaciones");
    window.scrollTo({ top: 0 });
  }

  /** Desde el expediente de un prospecto: lo lleva a Cotizaciones ya elegido. */
  function cotizarA(lead: Lead) {
    setCotizarLeadId(lead.id);
    setSeleccion(null);
    setPestana("cotizaciones");
    window.scrollTo({ top: 0 });
  }

  const menu = (onCerrar?: () => void) => (
    <MenuLateral
      negocio={negocio}
      nombre={sesion.nombre}
      esAdmin={esAdmin}
      activa={pestana}
      onElegir={elegir}
      onSalir={salir}
      onCerrar={onCerrar}
    />
  );

  return (
    <div className="lg:flex">
      {/* Menú a la izquierda (compu): siempre a la vista */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-line bg-bg-2/80 lg:block">{menu()}</aside>

      {/* Celular: barra con el botón Menú y la sección en la que estás */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setMenuAbierto(true)} className="btn-ghost px-3 py-2 text-sm" aria-expanded={menuAbierto} aria-label="Abrir menú">
          <Icon icon="flat-color-icons:menu" width={20} aria-hidden /> Menú
        </button>
        <span className="flex min-w-0 items-center gap-2 font-semibold text-ink">
          <Icon icon={actual.icono} width={22} aria-hidden />
          <span className="min-w-0 leading-tight">
            <span className="block truncate">{actual.nombre}</span>
            <span className="block truncate text-xs font-normal text-ink-mute">{actual.pista}</span>
          </span>
        </span>
      </div>
      {menuAbierto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Cerrar menú" onClick={() => setMenuAbierto(false)} />
          <aside className="relative h-full w-72 max-w-[85%] overflow-y-auto border-r border-line bg-bg-2 shadow-2xl">{menu(() => setMenuAbierto(false))}</aside>
        </div>
      )}

      <main className="min-w-0 flex-1">
        <div className={`mx-auto px-4 py-6 ${pestana === "reportes" ? "max-w-[1800px]" : "max-w-6xl"}`}>
          {/* Dónde estás */}
          <header className="mb-5 hidden lg:block">
            <h1 className="flex items-center gap-2 font-display text-2xl text-ink">
              <Icon icon={actual.icono} width={28} aria-hidden /> {actual.nombre}
            </h1>
            <p className="text-sm text-ink-mute">{actual.pista}</p>
          </header>

          {/* Métricas rápidas (solo se muestran en Prospectos) */}
          {pestana === "contactos" && (
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metrica icono="flat-color-icons:business-contact" label="Prospectos" valor={String(prospectos.length)} />
            <Metrica icono="flat-color-icons:calendar" label="En cita" valor={String(prospectos.filter((l) => l.etapa === "cita").length)} />
            <Metrica icono="flat-color-icons:feedback" label="Con propuesta" valor={String(prospectos.filter((l) => l.etapa === "propuesta").length)} />
            <Metrica icono="flat-color-icons:approval" label="Clientes ganados" valor={String(pipeline.length)} onClick={() => elegir("clientes")} />
          </div>
          )}

          {(pestana === "tablero" || pestana === "contactos" || pestana === "reportes") && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-line bg-glass px-3 py-2">
                <Icon icon="flat-color-icons:search" width={18} />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nombre, correo o WhatsApp…"
                  className="w-56 bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute"
                />
                {busca && (
                  <button type="button" onClick={() => setBusca("")} className="-mr-1 rounded-lg px-1.5 text-lg leading-none text-ink-mute hover:text-ink" aria-label="Borrar la búsqueda">
                    ×
                  </button>
                )}
              </div>
              {pestana !== "reportes" && !(pestana === "tablero" && vista === "hoy") && (
              <select
                value={filtroEtapa}
                onChange={(e) => setFiltroEtapa(e.target.value as EtapaId | "todas")}
                className="rounded-xl border border-line bg-glass px-3 py-2 text-sm text-ink"
              >
                <option value="todas">Todas las etapas</option>
                {ETAPAS.filter((et) => !(pestana === "contactos" && (et.id === "ganado" || et.id === "perdido"))).map((et) => (
                  <option key={et.id} value={et.id}>
                    {et.nombre}
                  </option>
                ))}
              </select>
              )}
              {pestana === "contactos" && perdidos.length > 0 && (
                <button type="button" onClick={() => elegir("perdidos")} className="btn-ghost ml-auto px-3 py-2 text-sm" title="Los perdidos no se borran: están en su propio apartado">
                  <Icon icon="flat-color-icons:undo" width={18} aria-hidden /> Perdidos ({perdidos.length})
                </button>
              )}
              {pestana === "tablero" && (
                <div className="ml-auto flex rounded-xl border border-line bg-glass p-1">
                  <Toggle activo={vista === "hoy"} onClick={() => setVista("hoy")} icono="flat-color-icons:alarm-clock" label="Hoy" />
                  <Toggle activo={vista === "kanban"} onClick={() => setVista("kanban")} icono="flat-color-icons:flow-chart" label="Tablero" />
                  <Toggle activo={vista === "tabla"} onClick={() => setVista("tabla")} icono="flat-color-icons:grid" label="Tabla" />
                </div>
              )}
            </div>
          )}

          {pestana === "tablero" &&
            (vista === "hoy" ? (
              <Seguimiento leads={buscados} onAbrir={setSeleccion} onMover={mover} />
            ) : vista === "kanban" ? (
              <Pipeline leads={filtrados} onMover={mover} onAbrir={setSeleccion} />
            ) : (
              <TablaLeads leads={filtrados} onAbrir={setSeleccion} />
            ))}
          {pestana === "pendientes" && <PendientesDia leads={leads} onAbrir={setSeleccion} />}
          {pestana === "cotizaciones" && (
            <Cotizaciones
              leads={leads}
              firma={sesion.nombre}
              leadId={cotizarLeadId}
              onLead={setCotizarLeadId}
              onAbrir={setSeleccion}
              onNuevoProspecto={() => elegir("contactos")}
              onCambio={recargar}
            />
          )}
          {pestana === "contactos" && <Contactos leads={prospectosFiltrados} onAbrir={setSeleccion} onCambio={recargar} />}
          {pestana === "perdidos" && <ProspectosPerdidos leads={leads} onAbrir={setSeleccion} onCotizar={cotizarA} onReactivar={(l) => void mover(l.id, "nuevo")} />}
          {pestana === "clientes" && <ClientesGanados leads={leads} esAdmin={esAdmin} soloSinRamo={clientesSinRamo} onAbrir={setSeleccion} onCotizar={cotizarA} />}
          {pestana === "reportes" && <EmbudoVentas leads={buscados} todos={leads} busca={busca} onQuitarBusqueda={() => setBusca("")} onMover={mover} onAbrir={setSeleccion} />}
          {esAdmin && pestana === "panel" && <PanelMando onVerSinRamo={verGanadasSinRamo} />}
          {esAdmin && pestana === "crecimiento" && <Crecimiento />}
          {esAdmin && pestana === "polizas" && <PolizasAdjuntas />}
          {esAdmin && pestana === "admin" && <PanelAdmin onCambio={recargar} />}
          {esAdmin && pestana === "roro" && <ManagerIA sesion={sesion} onSofi={() => elegir("sofi")} onValeri={() => elegir("valeri")} onClara={() => elegir("clara")} />}
          {esAdmin && pestana === "sofi" && <SeguimientoSofi leads={leads} onAbrir={setSeleccion} onCambio={recargar} />}
          {esAdmin && pestana === "valeri" && (
            <Cobranza
              key={vezPoliza}
              prefill={polizaNueva}
              onPrefillUsado={() => setPolizaNueva(null)}
              abrir={polizaAEditar}
              onAbrirUsado={() => setPolizaAEditar(null)}
            />
          )}

          {esAdmin && pestana === "camila" && <Camila onCotizar={cotizarPorId} onVerPoliza={verPolizaEnValeri} onAgregarPoliza={agregarPolizaDeCliente} />}

          {esAdmin && pestana === "clara" && <ReportesClara />}

          {seleccion && (
            <LeadPanel
              id={seleccion}
              onClose={() => setSeleccion(null)}
              onCambio={recargar}
              onAgregarCobranza={esAdmin ? agregarACobranza : undefined}
              onVerPoliza={esAdmin ? verPolizaEnValeri : undefined}
              onCotizar={cotizarA}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function Metrica({ icono, label, valor, onClick }: { icono: string; label: string; valor: string; onClick?: () => void }) {
  const contenido = (
    <>
      <Icon icon={icono} width={30} />
      <div className="text-left">
        <p className="text-lg font-bold text-ink">{valor}</p>
        <p className="text-xs text-ink-mute">{label}</p>
      </div>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="glass flex items-center gap-3 rounded-2xl p-3 transition-colors hover:border-brand-2" title="Abrir Clientes ganados">
      {contenido}
    </button>
  ) : (
    <div className="glass flex items-center gap-3 rounded-2xl p-3">{contenido}</div>
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
