"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { crmCamila, crmCotizarCliente, crmEstadoOferta, crmSincronizarClientes, ErrorCRM } from "@/lib/api";
import { fechaNumerica, hoyLocal } from "@/lib/fechas";
import { infoRamo } from "@/lib/ramos";
import {
  armarEntradas,
  calcularOportunidades,
  claveDe,
  paraHoy,
  resumenCruzada,
  type ClaveMensaje,
  type DatosCamila,
  type DatosMensaje,
  type Oportunidad,
} from "@/lib/cruzada-reglas";
import type { ResultadoSincronizar } from "@/lib/clientes-plan";
import type { Cliente, EstadoCruzada, EstadoOferta, Poliza, Ramo } from "@/lib/types";
import { AvatarEmpleado } from "./AvatarEmpleado";
import { TarjetaOportunidad } from "./camila/TarjetaOportunidad";
import { MapaCobertura } from "./camila/MapaCobertura";
import { ListaClientes } from "./camila/ListaClientes";
import { ExpedienteCliente } from "./camila/ExpedienteCliente";
import { EditorMensajesCamila } from "./camila/EditorMensajesCamila";

interface CamilaProps {
  /** Abre Cotizaciones con este prospecto ya elegido. */
  onCotizar: (leadId: string) => void | Promise<void>;
  /** Abre una póliza en Valeri para verla o editarla. */
  onVerPoliza: (p: Poliza) => void;
}

type Seccion = "oportunidades" | "mapa" | "clientes" | "mensajes";

const SECCIONES: { id: Seccion; nombre: string; icono: string }[] = [
  { id: "oportunidades", nombre: "Oportunidades", icono: "flat-color-icons:idea" },
  { id: "mapa", nombre: "Mapa de cobertura", icono: "flat-color-icons:grid" },
  { id: "clientes", nombre: "Clientes", icono: "flat-color-icons:contacts" },
  { id: "mensajes", nombre: "Mis mensajes", icono: "flat-color-icons:edit-image" },
];

/** Las que se muestran de golpe en cada lista larga (el resto, con «Ver más»). */
const TOPE_LISTA = 30;

function reemplazarEstado(lista: EstadoCruzada[], e: EstadoCruzada): EstadoCruzada[] {
  return [...lista.filter((x) => !(x.cliente_id === e.cliente_id && x.ramo === e.ramo)), e];
}

/**
 * Camila, tu empleada digital de venta cruzada. Vive junto a Sofi y Valeri.
 * Junta las pólizas de cada cliente en un solo expediente (las de tu cobranza y las de tus reportes de AXA), ve qué seguros le faltan
 * y cada mañana te dice a quién ofrecerle qué, por qué, y deja el WhatsApp listo. Tú lo envías; Camila no manda nada sola.
 * No usa IA: trabaja con reglas fijas, sin costo, y los datos de tus clientes no salen de tu CRM.
 */
export function Camila({ onCotizar, onVerPoliza }: CamilaProps) {
  const hoy = hoyLocal();
  const [datos, setDatos] = useState<DatosCamila | null>(null);
  const [cargando, setCargando] = useState(true);
  const [falla, setFalla] = useState<{ texto: string; migracion: boolean } | null>(null);
  const [seccion, setSeccion] = useState<Seccion>("oportunidades");
  const [busca, setBusca] = useState("");
  const [filtroRamo, setFiltroRamo] = useState<Ramo | "todos">("todos");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [ocupados, setOcupados] = useState<string[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [sync, setSync] = useState<ResultadoSincronizar | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [verMas, setVerMas] = useState(false);
  const relojAviso = useRef<number | undefined>(undefined);

  /** Pone en pantalla lo que respondió el servidor (o por qué no pudo). */
  const mostrar = useCallback(
    (pedido: Promise<DatosCamila>) =>
      pedido
        .then((d) => {
          setDatos(d);
          setFalla(null);
        })
        .catch((e: unknown) => setFalla({ texto: (e as Error).message || "Camila no pudo leer tus clientes.", migracion: e instanceof ErrorCRM && e.migracion }))
        .finally(() => setCargando(false)),
    [],
  );

  const cargar = useCallback(() => {
    setCargando(true);
    return mostrar(crmCamila());
  }, [mostrar]);

  useEffect(() => {
    void mostrar(crmCamila());
  }, [mostrar]);

  const avisar = useCallback((texto: string) => {
    setAviso(texto);
    window.clearTimeout(relojAviso.current);
    relojAviso.current = window.setTimeout(() => setAviso(null), 6000);
  }, []);

  const entradas = useMemo(() => (datos ? armarEntradas(datos.clientes, datos.polizas, datos.libro, datos.estados, hoy) : []), [datos, hoy]);
  const resultado = useMemo(() => calcularOportunidades(entradas, hoy), [entradas, hoy]);
  const resumen = useMemo(() => resumenCruzada(entradas, resultado), [entradas, resultado]);
  const clientes = useMemo(() => new Map((datos?.clientes ?? []).map((c) => [c.id, c])), [datos]);
  const sinExpediente = datos ? datos.polizas.filter((p) => !p.cliente_id && p.estatus_manual !== "cancelada").length : 0;

  // Las listas de la pestaña Oportunidades.
  const q = busca.trim().toLowerCase();
  const visibles = useMemo(
    () => resultado.lista.filter((o) => (filtroRamo === "todos" || o.ramo === filtroRamo) && (!q || o.nombre.toLowerCase().includes(q))),
    [resultado.lista, filtroRamo, q],
  );
  const hoyLista = useMemo(() => {
    if (filtroRamo === "todos" && !q) return paraHoy(resultado.lista);
    return visibles.filter((o) => o.situacion === "para_hoy").slice(0, TOPE_LISTA);
  }, [resultado.lista, visibles, filtroRamo, q]);
  const idsHoy = new Set(hoyLista.map((o) => `${o.cliente_id}:${o.ramo}`));
  const masOportunidades = visibles.filter((o) => o.situacion === "para_hoy" && !idsHoy.has(`${o.cliente_id}:${o.ramo}`));
  const seguimiento = visibles.filter((o) => o.situacion === "seguimiento");
  const cotizadas = visibles.filter((o) => o.situacion === "cotizada");
  const esperando = visibles.filter((o) => o.situacion === "esperando");
  const retenidas = resultado.retenidas.filter((r) => !q || r.nombre.toLowerCase().includes(q));

  const ejemplos = useMemo(() => {
    const salida: Partial<Record<ClaveMensaje, DatosMensaje>> = {};
    for (const o of [...resultado.lista].reverse()) {
      if (o.situacion === "para_hoy") salida[claveDe(o)] = { nombre: o.nombre, ramo: o.ramo, tipo: o.tipo, tiene: o.tiene };
    }
    return salida;
  }, [resultado.lista]);

  // ---- Acciones ----

  const marcar = (clave: string, activo: boolean) => setOcupados((o) => (activo ? [...o, clave] : o.filter((x) => x !== clave)));

  async function cambiarEstado(o: Pick<Oportunidad, "cliente_id" | "ramo" | "nombre">, estado: EstadoOferta, volver: string | null = null) {
    const clave = `${o.cliente_id}:${o.ramo}`;
    marcar(clave, true);
    try {
      const e = await crmEstadoOferta(o.cliente_id, { ramo: o.ramo, estado, volver_a_ofrecer: volver, nota: "" });
      setDatos((d) => (d ? { ...d, estados: reemplazarEstado(d.estados, e) } : d));
      avisar(
        estado === "ofrecida"
          ? `Anotado: se lo ofreciste a ${o.nombre}. Si no contesta, Camila te lo recuerda en una semana.`
          : estado === "cerrada"
            ? `¡Felicidades! Cuando tengas la póliza de ${o.nombre}, agrégala en Valeri para que quede en su mapa.`
            : estado === "no_interesa"
              ? `Entendido: no vuelvo a sugerirte ${infoRamo(o.ramo).corto} para ${o.nombre}${volver ? ` hasta el ${fechaNumerica(volver)}` : ""}.`
              : estado === "pendiente"
                ? `Listo: ${infoRamo(o.ramo).corto} de ${o.nombre} vuelve a «por ofrecer».`
                : "Anotado.",
      );
    } catch (e) {
      avisar((e as Error).message || "No pude anotarlo. Intenta de nuevo.");
    } finally {
      marcar(clave, false);
    }
  }

  async function cotizar(clienteId: string, ramo: Ramo) {
    const clave = `${clienteId}:${ramo}`;
    marcar(clave, true);
    try {
      const r = await crmCotizarCliente(clienteId, ramo);
      // Ir a cotizarle ya cuenta como «cotizada» para que Camila no se lo vuelva a ofrecer mañana (se deshace desde su tarjeta).
      const nombre = clientes.get(clienteId)?.nombre ?? "";
      try {
        const e = await crmEstadoOferta(clienteId, { ramo, estado: "cotizada", volver_a_ofrecer: null, nota: "" });
        setDatos((d) => (d ? { ...d, estados: reemplazarEstado(d.estados, e) } : d));
      } catch {
        /* no estorba: la cotización se abre igual */
      }
      setAbierto(null);
      void nombre;
      await onCotizar(r.lead_id);
    } catch (e) {
      avisar((e as Error).message || "No pude preparar la cotización.");
    } finally {
      marcar(clave, false);
    }
  }

  async function armar() {
    setSincronizando(true);
    setSync(null);
    try {
      setSync(await crmSincronizarClientes());
      await cargar();
    } catch (e) {
      avisar((e as Error).message || "No pude armar los expedientes.");
    } finally {
      setSincronizando(false);
    }
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      avisar("Mensaje copiado.");
    } catch {
      /* sin portapapeles: el mensaje sigue visible para copiarlo a mano */
    }
  }

  // ---- Pantalla ----

  const frase = !datos
    ? "Estoy revisando tus expedientes…"
    : datos.clientes.length === 0
      ? "Todavía no tengo expedientes de tus clientes. Pulsa «Armar expedientes» y junto cada póliza con su dueño."
      : hoyLista.length > 0
        ? `Hay ${resumen.paraHoy} ${resumen.paraHoy === 1 ? "cliente" : "clientes"} a quien conviene ofrecerle otro seguro hoy. Empieza por ${hoyLista[0].nombre}: ${infoRamo(hoyLista[0].ramo).corto}.`
        : seguimiento.length > 0
          ? `Hoy no hay ofertas nuevas, pero ${seguimiento.length} ${seguimiento.length === 1 ? "cliente no ha contestado" : "clientes no han contestado"} lo que les ofreciste.`
          : "Hoy no hay a quién ofrecerle algo nuevo: ya les ofreciste a todos o están esperando su respuesta.";

  const cardDe = (o: Oportunidad) => {
    const cliente = clientes.get(o.cliente_id);
    if (!cliente) return null;
    return (
      <TarjetaOportunidad
        key={`${o.cliente_id}:${o.ramo}`}
        o={o}
        cliente={cliente}
        mensajes={datos?.mensajes ?? {}}
        ocupado={ocupados.includes(`${o.cliente_id}:${o.ramo}`)}
        onAbrir={() => setAbierto(o.cliente_id)}
        onEnviado={() => void cambiarEstado(o, "ofrecida")}
        onEstado={(estado, volver) => void cambiarEstado(o, estado, volver ?? null)}
        onCotizar={() => void cotizar(o.cliente_id, o.ramo)}
        onCopiar={(t) => void copiar(t)}
      />
    );
  };

  const abiertoEntrada = abierto ? entradas.find((e) => e.cliente.id === abierto) : undefined;

  return (
    <section className="space-y-4" data-testid="camila">
      <div className="glass-strong flex items-start gap-4 rounded-2xl p-4 sm:p-5">
        <AvatarEmpleado variante="camila" tamano={76} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl text-ink">Camila</p>
          <p className="text-sm text-ink-soft">
            Tu venta cruzada · <span style={{ color: "var(--green)" }}>en línea</span>
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink" data-testid="camila-frase">
            {frase}
          </p>
        </div>
      </div>

      {falla && (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: falla.migracion ? "var(--amber)" : "var(--red)" }} role="alert" data-testid="camila-falla">
          <p className="text-ink">{falla.texto}</p>
          <button type="button" onClick={() => void cargar()} className="btn-ghost mt-3 px-4 py-2 text-sm">
            Reintentar
          </button>
        </div>
      )}

      {aviso && (
        <p className="rounded-xl border border-line bg-bg-3/70 px-4 py-3 text-sm text-ink" role="status">
          {aviso}
        </p>
      )}

      {datos && (
        <>
          {(sinExpediente > 0 || datos.clientes.length === 0 || sync) && (
            <div className="glass rounded-2xl border border-line p-4" data-testid="camila-armar">
              {sync ? (
                <>
                  <p className="text-sm text-ink" role="status">
                    <Icon icon="flat-color-icons:ok" width={16} className="mr-1 inline" aria-hidden />
                    Listo: {sync.clientesNuevos} {sync.clientesNuevos === 1 ? "cliente nuevo" : "clientes nuevos"} · {sync.polizasLigadas} {sync.polizasLigadas === 1 ? "póliza" : "pólizas"} de Valeri
                    ligadas · {sync.libroLigado} de tus reportes de AXA.
                  </p>
                  {sync.porRevisar.length > 0 && (
                    <details className="mt-2 text-sm text-ink-soft">
                      <summary className="cursor-pointer text-ink">Revisa estos nombres ({sync.porRevisar.length})</summary>
                      <ul className="mt-2 space-y-1.5">
                        {sync.porRevisar.map((r) => (
                          <li key={r.nombre}>
                            <strong className="text-ink">{r.nombre}</strong>
                            {r.motivo === "unido" ? ": se juntaron estas escrituras → " : ": AXA cortó su nombre → "}
                            {r.variantes.join(" · ")}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink-soft">
                  {datos.clientes.length === 0
                    ? "Aún no hay expedientes. Camila junta cada póliza con su cliente (aunque AXA escriba su nombre en otro orden) para saber qué le falta."
                    : `${sinExpediente} ${sinExpediente === 1 ? "póliza de Valeri todavía no está" : "pólizas de Valeri todavía no están"} en un expediente de cliente.`}
                </p>
              )}
              <button type="button" disabled={sincronizando} onClick={() => void armar()} className="btn-primary mt-3 px-4 py-2 text-sm" data-testid="btn-armar">
                <Icon icon="flat-color-icons:synchronize" width={18} aria-hidden /> {sincronizando ? "Armando…" : "Armar expedientes"}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Cifra id="para-hoy" titulo="Para hoy" valor={resumen.paraHoy} nota="clientes a quien ofrecerle" color={resumen.paraHoy ? "var(--green)" : "var(--ink-mute)"} />
            <Cifra id="seguimiento" titulo="Sin respuesta" valor={resumen.seguimiento} nota="ofrecido hace más de una semana" color={resumen.seguimiento ? "var(--amber)" : "var(--green)"} />
            <Cifra id="cotizadas" titulo="Cotizadas" valor={resumen.cotizadas} nota="en seguimiento" color={resumen.cotizadas ? "var(--sky)" : "var(--green)"} />
            <Cifra id="activos" titulo="Clientes activos" valor={resumen.activos} nota={`de ${resumen.clientes} expedientes`} color="var(--green)" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div role="tablist" aria-label="Secciones de Camila" className="flex flex-wrap gap-1 rounded-xl border border-line bg-glass p-1">
              {SECCIONES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={seccion === s.id}
                  data-testid={`tab-${s.id}`}
                  onClick={() => setSeccion(s.id)}
                  className={`flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${seccion === s.id ? "bg-brand/20 text-ink" : "text-ink-mute hover:text-ink"}`}
                >
                  <Icon icon={s.icono} width={18} aria-hidden /> {s.nombre}
                </button>
              ))}
            </div>
            {seccion !== "mensajes" && (
              <div className="flex items-center gap-2 rounded-xl border border-line bg-glass px-3 py-2">
                <Icon icon="flat-color-icons:search" width={18} aria-hidden />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar cliente…"
                  aria-label="Buscar cliente"
                  className="w-44 bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute"
                />
                {busca && (
                  <button type="button" onClick={() => setBusca("")} className="-mr-1 rounded-lg px-1.5 text-lg leading-none text-ink-mute hover:text-ink" aria-label="Borrar la búsqueda">
                    ×
                  </button>
                )}
              </div>
            )}
          </div>

          {seccion === "oportunidades" && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por seguro">
                {(["todos", "vida", "gmm", "ahorro", "autos", "hogar"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={filtroRamo === r}
                    onClick={() => setFiltroRamo(r)}
                    className={`rounded-xl border px-3 py-1.5 text-sm ${filtroRamo === r ? "border-brand-2 bg-brand/20 text-ink" : "border-line text-ink-soft hover:border-brand-2"}`}
                  >
                    {r === "todos" ? "Todos los seguros" : infoRamo(r).corto}
                  </button>
                ))}
              </div>

              <Lista titulo="Para hoy" vacio={resultado.lista.length ? "No hay nada nuevo que ofrecer con este filtro." : "Cuando haya clientes con póliza vigente, aquí te digo a quién ofrecerle qué."} id="lista-hoy" items={hoyLista.map(cardDe)} />
              {seguimiento.length > 0 && <Lista titulo="Dar seguimiento (no han contestado)" id="lista-seguimiento" items={seguimiento.slice(0, TOPE_LISTA).map(cardDe)} />}
              {cotizadas.length > 0 && <Lista titulo="Cotizaciones en curso" id="lista-cotizadas" items={cotizadas.slice(0, TOPE_LISTA).map(cardDe)} />}
              {esperando.length > 0 && (
                <Plegable titulo={`Esperando respuesta (${esperando.length})`} id="lista-esperando">
                  <ul className="space-y-3">{esperando.slice(0, TOPE_LISTA).map(cardDe)}</ul>
                </Plegable>
              )}
              {masOportunidades.length > 0 && (
                <Plegable titulo={`Más oportunidades (${masOportunidades.length})`} id="lista-mas" onAbrir={() => setVerMas(true)}>
                  <ul className="space-y-3">{(verMas ? masOportunidades.slice(0, TOPE_LISTA) : []).map(cardDe)}</ul>
                  {masOportunidades.length > TOPE_LISTA && <p className="mt-2 text-xs text-ink-mute">Se muestran las {TOPE_LISTA} mejores; usa el buscador o el filtro para ver otras.</p>}
                </Plegable>
              )}
              {retenidas.length > 0 && (
                <Plegable titulo={`No se les ofrece por ahora (${retenidas.length})`} id="lista-retenidas">
                  <ul className="space-y-2 text-sm">
                    {retenidas.map((r, i) => (
                      <li key={`${r.cliente_id}-${r.ramo ?? i}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
                        <button type="button" onClick={() => setAbierto(r.cliente_id)} className="text-left font-medium text-ink hover:underline">
                          {r.nombre}
                        </button>
                        <span className="text-xs text-ink-mute">
                          {r.motivo === "adeudo"
                            ? "Tiene un pago vencido: primero cobrar"
                            : r.motivo === "no_ofrecer"
                              ? "Marcado como «no ofrecer»"
                              : `No le interesa ${r.ramo ? infoRamo(r.ramo).corto : ""}${r.hasta ? ` hasta el ${fechaNumerica(r.hasta)}` : ""}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Plegable>
              )}
              <p className="text-xs text-ink-mute">
                Camila sugiere un solo seguro por cliente a la vez, no insiste antes de una semana, y no le ofrece nada a quien tiene un pago vencido. Los puntos suben cuando ya tiene
                seguros afines, cuando una de sus pólizas renueva pronto o cuando su edad lo hace buena idea.
              </p>
            </div>
          )}

          {seccion === "mapa" && <MapaCobertura entradas={entradas} busca={busca} onAbrir={setAbierto} />}
          {seccion === "clientes" && <ListaClientes entradas={entradas} busca={busca} onAbrir={setAbierto} />}
          {seccion === "mensajes" && (
            <EditorMensajesCamila
              personalizadas={datos.mensajes}
              ejemplos={ejemplos}
              onCambio={(clave, texto) =>
                setDatos((d) => {
                  if (!d) return d;
                  const mensajes = { ...d.mensajes };
                  if (texto === null) delete mensajes[clave];
                  else mensajes[clave] = texto;
                  return { ...d, mensajes };
                })
              }
            />
          )}
        </>
      )}

      {cargando && !datos && !falla && <p className="py-8 text-center text-ink-mute">Camila está revisando tus expedientes…</p>}

      {abiertoEntrada && datos && (
        <ExpedienteCliente
          key={abiertoEntrada.cliente.id}
          entrada={abiertoEntrada}
          valeri={datos.polizas.filter((p) => p.cliente_id === abiertoEntrada.cliente.id)}
          libro={datos.libro.filter((l) => l.cliente_id === abiertoEntrada.cliente.id)}
          oportunidades={resultado.lista.filter((o) => o.cliente_id === abiertoEntrada.cliente.id)}
          onCerrar={() => setAbierto(null)}
          onGuardado={(c: Cliente) => setDatos((d) => (d ? { ...d, clientes: d.clientes.map((x) => (x.id === c.id ? c : x)) } : d))}
          onVerPoliza={(p) => {
            setAbierto(null);
            onVerPoliza(p);
          }}
          onCotizar={(id, ramo) => void cotizar(id, ramo)}
        />
      )}
    </section>
  );
}

function Cifra({ id, titulo, valor, nota, color }: { id: string; titulo: string; valor: number; nota: string; color: string }) {
  return (
    <div className="glass flex min-h-[110px] flex-col rounded-2xl p-3.5 sm:p-4" data-testid={`cifra-${id}`}>
      <span className="text-[13px] font-semibold text-ink-soft">{titulo}</span>
      <span className="mt-1 text-[28px] font-bold leading-tight" style={{ color }}>
        {valor}
      </span>
      <span className="mt-auto pt-1 text-xs text-ink-mute">{nota}</span>
    </div>
  );
}

function Lista({ titulo, id, items, vacio }: { titulo: string; id: string; items: React.ReactNode[]; vacio?: string }) {
  const llenas = items.filter(Boolean);
  return (
    <div data-testid={id}>
      <h3 className="mb-2 font-semibold text-ink">
        {titulo} <span className="text-sm font-normal text-ink-mute">({llenas.length})</span>
      </h3>
      {llenas.length > 0 ? <ul className="space-y-3">{llenas}</ul> : <p className="rounded-2xl border border-line p-4 text-sm" style={{ color: "var(--green)" }}>{vacio ?? "Nada pendiente."}</p>}
    </div>
  );
}

function Plegable({ titulo, id, onAbrir, children }: { titulo: string; id: string; onAbrir?: () => void; children: React.ReactNode }) {
  return (
    <details data-testid={id} className="rounded-2xl border border-line p-3 sm:p-4" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && onAbrir?.()}>
      <summary className="cursor-pointer font-semibold text-ink">{titulo}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
