"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { crmChubb, crmPolizas } from "@/lib/api";
import { polizasDeCliente, type CargaChubb } from "@/lib/chubb-reglas";
import { textoDeCobro } from "@/lib/clientes-reglas";
import { moneda, monedaConCentavos } from "@/lib/crm-data";
import { infoRamo, RAMOS } from "@/lib/ramos";
import { whatsappDe } from "@/lib/seguimiento-reglas";
import type { Lead, Poliza, Ramo } from "@/lib/types";

const sinAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type FiltroRamo = "todos" | "sin_ramo" | Ramo;

interface ClientesGanadosProps {
  /** Todos tus prospectos: aquí solo se usan los que ya son clientes ganados. */
  leads: Lead[];
  esAdmin: boolean;
  /** Llega desde el Panel de Mando («ganadas sin ramo»): abre el apartado ya filtrado. */
  soloSinRamo?: boolean;
  onAbrir: (id: string) => void;
  /** Cotizarle OTRO seguro a un cliente que ya compró. */
  onCotizar: (lead: Lead) => void;
  /** Lleva a Dana a un cliente de Autos cuya cobranza va con Chubb. */
  onAbrirDana: (lead: Lead) => void;
  /** Pregunta de nuevo «¿AXA o Chubb?» para un cliente de Autos que aún no lo decide. */
  onElegirCobranza: (lead: Lead) => void;
}

/** Un cliente de Autos cuya póliza se cobra con Chubb: la lleva Dana, no Valeri. */
const conChubb = (c: Lead) => c.ramo === "autos" && c.cobranza_aseguradora === "chubb";

type TonoPastilla = "ok" | "ojo" | "info";
const COLOR_PASTILLA: Record<TonoPastilla, string> = { ok: "var(--green)", ojo: "var(--amber)", info: "var(--sky)" };

function cuando(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : "";
}

/**
 * Tus clientes ganados: los prospectos que ya compraron. Salen de «Prospectos» y de «Cotizaciones» para que esas listas
 * muestren solo a quien todavía estás atendiendo; aquí los encuentras con su ramo, lo que vale cada venta y, si eres
 * administrador, si ya tienen su póliza en Valeri (cobranza).
 */
export function ClientesGanados({ leads, esAdmin, soloSinRamo = false, onAbrir, onCotizar, onAbrirDana, onElegirCobranza }: ClientesGanadosProps) {
  const [busca, setBusca] = useState("");
  const [ramo, setRamo] = useState<FiltroRamo>(soloSinRamo ? "sin_ramo" : "todos");
  const [faltaPoliza, setFaltaPoliza] = useState(false);
  // null = todavía cargando · "no" = no se pudo leer la cartera (por ejemplo, un vendedor no la ve)
  const [polizas, setPolizas] = useState<Poliza[] | null | "no">(null);
  // El Excel de Chubb que Dana tiene cargado (null = todavía no llega, no hay ninguno o no se pudo leer).
  const [carga, setCarga] = useState<CargaChubb | null>(null);

  useEffect(() => {
    if (!esAdmin) return;
    let vivo = true;
    crmPolizas()
      .then((p) => vivo && setPolizas(p))
      .catch(() => vivo && setPolizas("no"));
    return () => {
      vivo = false;
    };
  }, [esAdmin]);

  const clientes = useMemo(
    () => leads.filter((l) => l.etapa === "ganado").sort((a, b) => (b.cerrado_en ?? b.actualizado_en).localeCompare(a.cerrado_en ?? a.actualizado_en)),
    [leads],
  );

  const polizasDe = useMemo(() => {
    const m = new Map<string, Poliza[]>();
    if (Array.isArray(polizas)) for (const p of polizas) if (p.lead_id) m.set(p.lead_id, [...(m.get(p.lead_id) ?? []), p]);
    return m;
  }, [polizas]);
  const sabeDePolizas = esAdmin && Array.isArray(polizas);

  // Solo si hay clientes con Chubb se le pide a Dana su Excel, para ver quiénes ya aparecen ahí.
  const hayConChubb = esAdmin && clientes.some(conChubb);
  useEffect(() => {
    if (!hayConChubb) return;
    let vivo = true;
    crmChubb()
      .then((c) => vivo && setCarga(c))
      .catch(() => {}); // sin su Excel (o sin su SQL) la tarjeta dice «Cobranza en Chubb (Dana)» y listo
    return () => {
      vivo = false;
    };
  }, [hayConChubb]);
  const enDana = useMemo(() => {
    const m = new Map<string, string>();
    if (carga) for (const c of clientes) if (conChubb(c)) polizasDeCliente(c.nombre, carga.polizas).slice(0, 1).forEach((p) => m.set(c.id, p.asegurado));
    return m;
  }, [carga, clientes]);

  // Lo de Chubb no se cuenta como «falta en Valeri»: esa póliza la lleva Dana.
  const faltaEnValeri = (c: Lead) => !polizasDe.has(c.id) && !conChubb(c);

  /** La pastilla de cada tarjeta: dónde está (o falta) la póliza del cliente. */
  function pastillaDe(c: Lead): { texto: string; tono: TonoPastilla; titulo: string; alTocar: () => void } {
    const suyas = polizasDe.get(c.id) ?? [];
    if (suyas.length) return { texto: `✓ En Valeri${suyas.length > 1 ? ` · ${suyas.length} pólizas` : ""}`, tono: "ok", titulo: "Ya está en tu cobranza (Valeri)", alTocar: () => onAbrir(c.id) };
    if (conChubb(c)) {
      const asegurado = enDana.get(c.id);
      return asegurado
        ? { texto: "✓ En Dana (Chubb)", tono: "ok", titulo: `Aparece en tu Excel de Chubb como «${asegurado}»`, alTocar: () => onAbrirDana(c) }
        : { texto: "Cobranza en Chubb (Dana)", tono: "info", titulo: "Su póliza se captura en tu Excel de Chubb y aparece en Dana cuando lo subas", alTocar: () => onAbrirDana(c) };
    }
    if (c.ramo === "autos" && !c.cobranza_aseguradora) {
      return { texto: "¿AXA o Chubb? Elegir", tono: "ojo", titulo: "Elige dónde registras su póliza: AXA (Valeri) o Chubb (Dana)", alTocar: () => onElegirCobranza(c) };
    }
    return { texto: "Falta su póliza en Valeri", tono: "ojo", titulo: "Abre su ficha para agregarlo a cobranza", alTocar: () => onAbrir(c.id) };
  }

  const sinRamo = clientes.filter((c) => !c.ramo).length;
  const sinPoliza = sabeDePolizas ? clientes.filter(faltaEnValeri).length : 0;
  const total = clientes.reduce((s, c) => s + c.valor, 0);

  const texto = sinAcentos(busca.trim());
  const visibles = clientes.filter((c) => {
    if (ramo === "sin_ramo" && c.ramo) return false;
    if (ramo !== "todos" && ramo !== "sin_ramo" && c.ramo !== ramo) return false;
    if (faltaPoliza && !faltaEnValeri(c)) return false;
    if (!texto) return true;
    return sinAcentos(c.nombre).includes(texto) || sinAcentos(c.correo).includes(texto) || c.whatsapp.includes(texto);
  });

  if (!clientes.length) {
    return (
      <section className="glass rounded-2xl p-8 text-center" aria-label="Clientes ganados">
        <Icon icon="flat-color-icons:approval" width={44} className="mx-auto" aria-hidden />
        <p className="mt-3 font-semibold text-ink">Todavía no tienes clientes ganados</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-mute">
          Cuando muevas un prospecto a «Cliente ganado», sale de Prospectos y de Cotizaciones y aparece aquí, con su póliza y todo lo de su venta.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Clientes ganados">
      {/* Cuántos son y cuánto vale lo vendido; las alertas se tocan para filtrar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cifra icono="flat-color-icons:approval" etiqueta="Clientes ganados" valor={String(clientes.length)} />
        <Cifra icono="flat-color-icons:money-transfer" etiqueta="Prima total vendida" valor={moneda(total)} />
        {esAdmin && (
          <Cifra
            icono="flat-color-icons:debt"
            etiqueta="Sin póliza en Valeri"
            bien={sabeDePolizas && sinPoliza === 0 ? (hayConChubb ? "✓ Todos en Valeri o en Dana" : "✓ Todos ya están en Valeri") : undefined}
            valor={sabeDePolizas ? String(sinPoliza) : polizas === "no" ? "—" : "…"}
            alerta={sinPoliza > 0}
            activa={faltaPoliza}
            onClick={sabeDePolizas && sinPoliza > 0 ? () => setFaltaPoliza((v) => !v) : undefined}
          />
        )}
        <Cifra
          icono="flat-color-icons:medium-priority"
          etiqueta="Sin ramo asignado"
          bien={sinRamo === 0 ? "✓ Todos tienen su ramo" : undefined}
          valor={String(sinRamo)}
          alerta={sinRamo > 0}
          activa={ramo === "sin_ramo"}
          onClick={sinRamo > 0 ? () => setRamo(ramo === "sin_ramo" ? "todos" : "sin_ramo") : undefined}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-glass px-3 py-2">
          <Icon icon="flat-color-icons:search" width={18} aria-hidden />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente por nombre, correo o WhatsApp…"
            aria-label="Buscar entre tus clientes ganados"
            className="w-64 bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute"
          />
          {busca && (
            <button type="button" onClick={() => setBusca("")} className="-mr-1 rounded-lg px-1.5 text-lg leading-none text-ink-mute hover:text-ink" aria-label="Borrar la búsqueda">
              ×
            </button>
          )}
        </div>
        <select
          value={ramo}
          onChange={(e) => setRamo(e.target.value as FiltroRamo)}
          aria-label="Filtrar por ramo"
          className="rounded-xl border border-line bg-glass px-3 py-2 text-sm text-ink"
        >
          <option value="todos">Todos los ramos</option>
          {RAMOS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
          <option value="sin_ramo">Sin ramo asignado</option>
        </select>
        {(ramo !== "todos" || faltaPoliza || busca) && (
          <button
            type="button"
            onClick={() => {
              setRamo("todos");
              setFaltaPoliza(false);
              setBusca("");
            }}
            className="text-sm text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Quitar filtros
          </button>
        )}
        <p className="ml-auto text-xs text-ink-mute">
          {visibles.length === clientes.length
            ? `${clientes.length} ${clientes.length === 1 ? "cliente" : "clientes"}`
            : `${visibles.length} de ${clientes.length} ${clientes.length === 1 ? "cliente" : "clientes"}`}
        </p>
      </div>

      {visibles.length === 0 ? (
        <p className="glass rounded-2xl p-6 text-center text-sm text-ink-mute">Ningún cliente coincide con eso.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibles.map((c) => {
            const wa = whatsappDe(c);
            const suyas = polizasDe.get(c.id) ?? [];
            const pastilla = sabeDePolizas ? pastillaDe(c) : null;
            return (
              <li key={c.id} className="glass flex flex-col rounded-2xl p-4" data-testid="cliente-ganado">
                <div className="flex items-start justify-between gap-2">
                <button type="button" onClick={() => onAbrir(c.id)} className="min-w-0 flex-1 text-left" title="Abrir su ficha">
                  <span className="block truncate text-[16px] font-semibold text-ink hover:underline">{c.nombre}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-mute">
                    {c.ramo ? (
                      <span className="inline-flex items-center gap-1 text-ink-soft">
                        <Icon icon={infoRamo(c.ramo).icono} width={14} aria-hidden /> {infoRamo(c.ramo).nombre}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold" style={{ color: "var(--amber)" }}>
                        <Icon icon="flat-color-icons:medium-priority" width={14} aria-hidden /> Sin ramo asignado
                      </span>
                    )}
                    {c.cerrado_en && <span>· Cerrado el {cuando(c.cerrado_en)}</span>}
                  </span>
                </button>
                {wa && (
                  <a
                    href={`https://wa.me/52${wa}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-glass hover:border-brand-2"
                    aria-label={`Escribirle por WhatsApp a ${c.nombre}`}
                    title="Abrir su WhatsApp"
                  >
                    <Icon icon="logos:whatsapp-icon" width={18} aria-hidden />
                  </a>
                )}
                </div>

                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-ink-mute">Prima total</p>
                    <p className="text-lg font-bold text-ink">{c.valor > 0 ? monedaConCentavos(c.valor) : "Sin capturar"}</p>
                  </div>
                  {pastilla && (
                    <button
                      type="button"
                      onClick={pastilla.alTocar}
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ color: COLOR_PASTILLA[pastilla.tono], background: `color-mix(in srgb, ${COLOR_PASTILLA[pastilla.tono]} 14%, transparent)` }}
                      title={pastilla.titulo}
                      data-testid="pastilla-cobranza"
                    >
                      {pastilla.texto}
                    </button>
                  )}
                </div>
                {suyas.length > 0 && (
                  <p className="mt-1.5 text-xs text-ink-soft" data-testid="cobro-del-cliente">
                    {suyas.slice(0, 2).map((p) => textoDeCobro(p)).join(" | ")}
                  </p>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => onAbrir(c.id)} className="btn-ghost w-full justify-center text-xs" style={{ padding: "0.6rem 0.5rem" }}>
                    <Icon icon="flat-color-icons:view-details" width={16} aria-hidden /> Ver ficha
                  </button>
                  <button type="button" onClick={() => onCotizar(c)} className="btn-ghost w-full justify-center text-xs" style={{ padding: "0.6rem 0.5rem" }} title="Cotizarle otro seguro">
                    <Icon icon="flat-color-icons:calculator" width={16} aria-hidden /> Cotizar otro seguro
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Cifra({
  icono,
  etiqueta,
  valor,
  alerta = false,
  bien,
  activa = false,
  onClick,
}: {
  icono: string;
  etiqueta: string;
  valor: string;
  alerta?: boolean;
  /** Cuando el 0 es una buena noticia: un texto en verde que lo explica. */
  bien?: string;
  activa?: boolean;
  onClick?: () => void;
}) {
  const contenido = (
    <>
      <Icon icon={icono} width={30} aria-hidden />
      <span className="text-left">
        <span className="block text-lg font-bold text-ink" style={alerta ? { color: "var(--amber)" } : bien ? { color: "var(--green)" } : undefined}>
          {valor}
        </span>
        <span className="block text-xs text-ink-mute">{etiqueta}</span>
        {bien && (
          <span className="block text-[11px] font-semibold" style={{ color: "var(--green)" }}>
            {bien}
          </span>
        )}
      </span>
    </>
  );
  const clase = `glass flex items-center gap-3 rounded-2xl p-3 ${activa ? "ring-1 ring-[color:var(--amber)]" : ""}`;
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={activa} className={`${clase} w-full transition-colors hover:border-brand-2`}>
      {contenido}
    </button>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}
