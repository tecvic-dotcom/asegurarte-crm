"use client";

import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { fechaNumerica } from "@/lib/fechas";
import {
  FRECUENCIAS,
  buscarWhatsApp,
  etiquetaVencimiento,
  ligaWhatsAppChubb,
  listaPolizasConPendientes,
  listaRecibos,
  mensajeReciboChubb,
  pesos,
  type ContactoCRM,
  type EstadoRecibo,
  type InfoPoliza,
  type LineaRecibo,
  type PolizaConPendientes,
  type VentanaRecibos,
} from "@/lib/chubb-reglas";
import { COLOR_RECIBO, Dato, Nota, PALABRA_RECIBO, Pastillas, copiarTexto } from "./piezas";

type Modo = "polizas" | "recibos";

/** En la línea de pagos todo lo pendiente va en amarillo (como en tu Excel); solo lo vencido se pinta de rojo. */
const COLOR_LINEA: Record<EstadoRecibo, string> = {
  vencido: "var(--red)",
  hoy: "var(--amber)",
  proximo: "var(--amber)",
  futuro: "var(--amber)",
};

const TITULO_VENTANA: Record<VentanaRecibos, string> = {
  vencidos: "Vencidos",
  "7": "Próximos 7 días",
  "30": "Próximos 30 días",
  todos: "Todos los pendientes",
};
const COLOR_VENTANA: Record<VentanaRecibos, string> = {
  vencidos: "var(--red)",
  "7": "var(--amber)",
  "30": "var(--sky)",
  todos: "var(--ink-soft)",
};
const VENTANAS: VentanaRecibos[] = ["todos", "vencidos", "7", "30"];

/** Cuántas pólizas, cuántos recibos y cuánto dinero (aprox.) hay en una ventana. */
function medir(infos: InfoPoliza[], ventana: VentanaRecibos) {
  const lista = listaPolizasConPendientes(infos, ventana);
  const recibos = lista.flatMap((x) => x.enVentana);
  return { polizas: lista.length, recibos: recibos.length, importe: recibos.reduce((s, r) => s + (r.importe ?? 0), 0) };
}

/**
 * Las pólizas que tienen recibos sin pagar (los que están en amarillo en tu Excel), con lo necesario para cobrarlos:
 * qué recibo toca, cómo van sus pagos y el mensaje de WhatsApp listo. Las cifras de arriba filtran como en Valeri.
 */
export function VistaRecibos({ infos, contactos }: { infos: InfoPoliza[]; contactos: ContactoCRM[] | null }) {
  const medidas = useMemo(() => Object.fromEntries(VENTANAS.map((v) => [v, medir(infos, v)])) as Record<VentanaRecibos, ReturnType<typeof medir>>, [infos]);
  // Se empieza viendo TODAS las pólizas con recibos pendientes (de la más atrasada a la más lejana); las cifras acotan.
  const [ventana, setVentana] = useState<VentanaRecibos>("todos");
  const [modo, setModo] = useState<Modo>("polizas");

  const porPoliza = useMemo(() => listaPolizasConPendientes(infos, ventana), [infos, ventana]);
  const porRecibo = useMemo(() => listaRecibos(infos, ventana), [infos, ventana]);
  const calculados = (modo === "polizas" ? porPoliza.flatMap((x) => x.enVentana) : porRecibo).filter((r) => r.calculado).length;
  const m = medidas[ventana];

  if (medidas.todos.polizas === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-sm text-ink-soft" data-testid="recibos-vacio">
        <Icon icon="flat-color-icons:ok" width={28} className="mx-auto mb-2" aria-hidden />
        Ninguna póliza tiene recibos pendientes con estos filtros. Todo está al corriente.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" role="group" aria-label="Qué recibos ver">
        {VENTANAS.map((v) => {
          const x = medidas[v];
          const activa = ventana === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setVentana(v)}
              aria-pressed={activa}
              data-testid={`recibos-cifra-${v}`}
              title="Toca para ver solo estas pólizas"
              className={`glass flex min-h-[104px] w-full min-w-0 flex-col rounded-2xl p-3.5 text-left transition-transform hover:-translate-y-0.5 sm:p-4 ${activa ? "ring-2 ring-brand-2" : ""}`}
              style={x.polizas > 0 || activa ? { borderColor: `color-mix(in srgb, ${COLOR_VENTANA[v]} 55%, transparent)` } : undefined}
            >
              <span className="text-[13px] font-semibold text-ink-soft">{TITULO_VENTANA[v]}</span>
              <span className="mt-1 text-[26px] font-bold leading-tight text-ink" style={x.polizas > 0 && v !== "todos" ? { color: COLOR_VENTANA[v] } : undefined}>
                {x.polizas}
              </span>
              <span className="text-xs text-ink-mute">
                {x.polizas === 1 ? "póliza" : "pólizas"}
                {x.recibos > 0 ? ` · ${x.recibos} ${x.recibos === 1 ? "recibo" : "recibos"}` : ""}
              </span>
              {x.importe > 0 && <span className="mt-auto pt-1 text-sm font-semibold text-ink">≈ {pesos(x.importe)}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-soft" data-testid="recibos-resumen">
          <strong className="text-ink">{m.polizas}</strong> {m.polizas === 1 ? "póliza" : "pólizas"} · <strong className="text-ink">{m.recibos}</strong>{" "}
          {m.recibos === 1 ? "recibo" : "recibos"} · ≈ <strong className="text-ink">{pesos(m.importe)}</strong>
          {ventana !== "todos" && (
            <>
              {" "}
              · solo «{TITULO_VENTANA[ventana].toLowerCase()}»
              <button type="button" onClick={() => setVentana("todos")} className="ml-2 text-xs text-ink-mute underline hover:text-ink" data-testid="recibos-ver-todos">
                Ver todos los pendientes ({medidas.todos.polizas})
              </button>
            </>
          )}
        </p>
        <Pastillas<Modo>
          etiqueta="Cómo ver los recibos"
          valor={modo}
          onCambio={setModo}
          opciones={[
            { id: "polizas", nombre: "Por póliza" },
            { id: "recibos", nombre: "Por recibo" },
          ]}
        />
      </div>

      {ventana === "vencidos" && m.polizas > 0 && (
        <Nota tono="ojo">
          Un recibo aparece «vencido» mientras siga en <strong className="text-ink">amarillo</strong> en tu Excel. Si ya se pagó, píntalo de <strong className="text-ink">verde</strong> y vuelve a cargar el Excel.
        </Nota>
      )}
      {calculados > 0 && (
        <Nota tono="ojo">
          {calculados} {calculados === 1 ? "fecha fue calculada" : "fechas fueron calculadas"} por Dana porque la póliza está «pendiente de pago» pero el Excel no trae las fechas de sus recibos (llevan la marca «fecha
          calculada»). Confírmalas en el Excel antes de mandar un mensaje.
        </Nota>
      )}

      {m.polizas === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-ink-soft">
          <Icon icon="flat-color-icons:ok" width={28} className="mx-auto mb-2" aria-hidden />
          No hay recibos en esta ventana.
        </div>
      ) : modo === "polizas" ? (
        <>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-mute">
            <Leyenda color="var(--green)" texto="✓ pagado" />
            <Leyenda color="var(--amber)" texto="pendiente" />
            <Leyenda color="var(--red)" texto="vencido" />
          </p>
          <ul className="space-y-2.5" data-testid="recibos-polizas">
            {porPoliza.map((x) => (
              <TarjetaPoliza key={`${x.info.p.poliza}-${x.recibo.fecha}`} x={x} contactos={contactos} />
            ))}
          </ul>
        </>
      ) : (
        <ListaRecibos lista={porRecibo} />
      )}

      <Nota>El importe es aproximado: la prima total se reparte parejo entre los recibos. El primero suele ser un poco mayor porque lleva el derecho de póliza. Por eso los mensajes no llevan importe.</Nota>
    </div>
  );
}

function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {texto}
    </span>
  );
}

/** Todos los recibos de la póliza en fila: verde pagado, amarillo pendiente, rojo vencido. */
function LineaPagos({ linea }: { linea: LineaRecibo[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-1" aria-label="Línea de pagos de la póliza">
      {linea.map((l) => {
        const pagado = l.estado === "pagado";
        const color = pagado ? "var(--green)" : COLOR_LINEA[l.estado as EstadoRecibo];
        const detalle = pagado
          ? `Recibo ${l.numero} de ${l.de}: pagado${l.fecha ? ` (${fechaNumerica(l.fecha)})` : ""}`
          : `Recibo ${l.numero} de ${l.de}: ${PALABRA_RECIBO[l.estado as EstadoRecibo].toLowerCase()}, ${l.fecha ? fechaNumerica(l.fecha) : ""}`;
        return (
          <li
            key={`${l.numero}-${l.estado}`}
            title={detalle}
            aria-label={detalle}
            className="flex h-7 min-w-7 items-center justify-center rounded-md border px-1 text-[11px] font-bold"
            style={{ borderColor: color, color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
          >
            {pagado ? "✓" : l.numero}
          </li>
        );
      })}
    </ol>
  );
}

/** Una póliza con recibos pendientes: qué recibo toca, su línea de pagos y el mensaje listo para el cliente. */
function TarjetaPoliza({ x, contactos }: { x: PolizaConPendientes; contactos: ContactoCRM[] | null }) {
  const { info, recibo, enVentana } = x;
  const color = COLOR_RECIBO[recibo.estado];
  const original = useMemo(() => mensajeReciboChubb(info, recibo), [info, recibo]);
  // Retoque solo para este envío: no cambia el texto base.
  const [editado, setEditado] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [completo, setCompleto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const texto = editado ?? original;
  const wa = useMemo(() => (contactos ? buscarWhatsApp(info.p.asegurado, contactos) : null), [contactos, info.p.asegurado]);
  const numero = wa?.tipo === "encontrado" ? wa.whatsapp : null;
  const pendientes = info.recibos.length;
  const porCobrar = info.recibos.reduce((s, r) => s + (r.importe ?? 0), 0);

  async function copiar() {
    if (await copiarTexto(texto)) {
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    }
  }

  return (
    <li className="glass rounded-2xl p-3.5 sm:p-4" data-testid="recibos-poliza">
      {/* Celular: la fecha va como una franja arriba y el texto usa todo el ancho. Escritorio: cuadro a la izquierda. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <div
          className="flex flex-wrap items-baseline gap-x-2 self-start rounded-xl border px-2.5 py-1 sm:block sm:w-[5.5rem] sm:shrink-0 sm:self-auto sm:px-1.5 sm:py-1.5 sm:text-center"
          style={{ borderColor: color }}
        >
          <p className="text-[11px] font-semibold leading-tight" style={{ color }}>
            {PALABRA_RECIBO[recibo.estado]}
          </p>
          <p className="text-sm font-bold leading-tight text-ink sm:mt-1">{fechaNumerica(recibo.fecha)}</p>
          <p className="text-[11px] leading-tight text-ink-mute sm:mt-0.5">{etiquetaVencimiento(recibo.dias)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 font-semibold text-ink">{info.p.asegurado}</p>
            <p className="shrink-0 text-right font-semibold text-ink" title="Importe aproximado de este recibo">
              {recibo.importe === null ? "—" : `≈ ${pesos(Math.round(recibo.importe * 100) / 100)}`}
            </p>
          </div>
          <p className="text-sm text-ink-soft">{info.p.vehiculo ?? "Sin descripción del vehículo"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Dato titulo="Recibo que toca cobrar">
              Recibo {recibo.numero} de {recibo.de}
            </Dato>
            <Dato titulo="Número de póliza">{info.p.poliza}</Dato>
            <Dato>{FRECUENCIAS[info.p.frecuencia].nombre}</Dato>
            <Dato titulo="Recibos de esta póliza que siguen sin pagarse">
              {pendientes} {pendientes === 1 ? "pendiente" : "pendientes"}
              {pendientes > 1 ? ` · ≈ ${pesos(Math.round(porCobrar * 100) / 100)}` : ""}
            </Dato>
            {enVentana.length > 1 && <Dato titulo="Recibos de esta póliza dentro de la ventana elegida">{enVentana.length} en esta ventana</Dato>}
            {recibo.calculado && <Dato titulo="El Excel no traía esta fecha: Dana la calculó con el calendario de pagos">fecha calculada</Dato>}
          </div>
          <div className="mt-2.5">
            <LineaPagos linea={info.linea} />
          </div>
        </div>
      </div>

      {/* El mensaje tal como se enviará: tócalo para leerlo completo */}
      {editando ? (
        <div className="mt-3">
          <textarea
            value={texto}
            onChange={(e) => setEditado(e.target.value)}
            rows={5}
            maxLength={1000}
            aria-label={`Mensaje para ${info.p.asegurado}`}
            className="field-input w-full text-sm leading-relaxed"
            autoFocus
          />
          <div className="mt-1.5 flex flex-wrap gap-3 text-xs">
            <button type="button" onClick={() => setEditando(false)} className="min-h-[36px] font-semibold text-ink underline">
              Listo
            </button>
            {editado !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditado(null);
                  setEditando(false);
                }}
                className="min-h-[36px] text-ink-mute underline hover:text-ink"
              >
                Volver al original
              </button>
            )}
            <span className="self-center text-ink-mute">Solo cambia este envío.</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCompleto((v) => !v)}
          aria-expanded={completo}
          className="mt-3 block w-full rounded-xl border border-line bg-bg-2/60 p-3 text-left text-sm leading-relaxed text-ink-soft"
        >
          <span className={completo ? "block" : "line-clamp-3"}>“{texto}”</span>
          {!completo && <span className="mt-1 block text-xs text-ink-mute underline">Ver mensaje completo</span>}
        </button>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <a href={ligaWhatsAppChubb(numero, texto)} target="_blank" rel="noopener noreferrer" className="btn-primary col-span-2 w-full text-sm sm:w-auto" data-testid="recibos-whatsapp">
          <Icon icon="logos:whatsapp-icon" width={18} aria-hidden /> {numero ? "Enviar WhatsApp" : "Abrir WhatsApp"}
        </a>
        <button type="button" onClick={() => void copiar()} className="btn-ghost w-full text-sm sm:w-auto" data-testid="recibos-copiar">
          <Icon icon={copiado ? "flat-color-icons:ok" : "flat-color-icons:document"} width={18} aria-hidden /> {copiado ? "Copiado" : "Copiar mensaje"}
        </button>
        {!editando && (
          <button type="button" onClick={() => setEditando(true)} className="btn-ghost w-full text-sm sm:w-auto">
            <Icon icon="flat-color-icons:edit-image" width={18} aria-hidden /> Editar mensaje{editado !== null ? " (retocado)" : ""}
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-ink-mute" data-testid="recibos-destino">
        {wa === null
          ? "Buscando su WhatsApp en tu CRM…"
          : wa.tipo === "encontrado"
            ? `Se enviará al WhatsApp de ${wa.nombre} (····${wa.whatsapp.slice(-4)})${wa.exacto ? "." : ". Coincidencia parcial de nombre: verifica que sea la misma persona antes de enviar."}`
            : wa.tipo === "varios"
              ? "Hay varios contactos con ese nombre y números distintos en tu CRM: elige el chat en WhatsApp."
              : "No encontré su WhatsApp en tu CRM: se abre WhatsApp para que elijas el chat."}
      </p>
    </li>
  );
}

/** El otro modo de ver: un renglón por recibo, del más atrasado al más lejano. */
function ListaRecibos({ lista }: { lista: ReturnType<typeof listaRecibos> }) {
  return (
    <ul className="space-y-2.5" data-testid="recibos-lista">
      {lista.map((r) => {
        const color = COLOR_RECIBO[r.estado];
        return (
          <li key={`${r.info.p.poliza}-${r.fecha}-${r.numero}`} className="glass rounded-2xl p-3.5 sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
              <div
                className="flex flex-wrap items-baseline gap-x-2 self-start rounded-xl border px-2.5 py-1 sm:block sm:w-[5.5rem] sm:shrink-0 sm:self-auto sm:px-1.5 sm:py-1.5 sm:text-center"
                style={{ borderColor: color }}
              >
                <p className="text-[11px] font-semibold leading-tight" style={{ color }}>
                  {PALABRA_RECIBO[r.estado]}
                </p>
                <p className="text-sm font-bold leading-tight text-ink sm:mt-1">{fechaNumerica(r.fecha)}</p>
                <p className="text-[11px] leading-tight text-ink-mute sm:mt-0.5">{etiquetaVencimiento(r.dias)}</p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-semibold text-ink">{r.info.p.asegurado}</p>
                  <p className="shrink-0 text-right font-semibold text-ink" title="Importe aproximado de este recibo">
                    {r.importe === null ? "—" : `≈ ${pesos(Math.round(r.importe * 100) / 100)}`}
                  </p>
                </div>
                <p className="text-sm text-ink-soft">{r.info.p.vehiculo ?? "Sin descripción del vehículo"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Dato titulo="Número de recibo">
                    Recibo {r.numero} de {r.de}
                  </Dato>
                  <Dato titulo="Número de póliza">{r.info.p.poliza}</Dato>
                  <Dato>{FRECUENCIAS[r.info.p.frecuencia].nombre}</Dato>
                  {r.calculado && <Dato titulo="El Excel no traía esta fecha: Dana la calculó con el calendario de pagos">fecha calculada</Dato>}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
