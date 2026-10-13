"use client";

import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { crmLeerPoliza, crmRenovarPoliza, ErrorCRM } from "@/lib/api";
import { moneda } from "@/lib/crm-data";
import { FORMAS_PAGO, estadoDe, montoDelProximoPago } from "@/lib/cobranza-reglas";
import { diasEntre, esFechaValida, fechaCorta, hoyLocal, sumarMeses } from "@/lib/fechas";
import { sugerirRenovacion, validarRenovacion } from "@/lib/historial-reglas";
import { infoRamo } from "@/lib/ramos";
import type { FormaPago, Poliza } from "@/lib/types";
import { AvisoMigracion } from "../panel/AvisoMigracion";

const MAX_MB = 4;
const conAnio = (f: string) => `${fechaCorta(f)} ${f.slice(0, 4)}`;

/** Lo que se captura en pantalla (todo como texto, igual que lo escribes). */
interface Campos {
  inicio: string;
  hasta: string;
  forma_pago: FormaPago;
  monto_pago: string;
  primer_pago: string;
  prima_anual: string;
  fecha_limite_pago: string;
  numero: string;
  aseguradora: string;
  prima_neta: string;
  nota: string;
}

const sinAcentos = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** ¿Comparten alguna palabra de más de 2 letras? (para avisar si el PDF parece de otra persona) */
function seParecen(a: string, b: string): boolean {
  const palabras = (t: string) => sinAcentos(t).split(/[^a-zñ]+/).filter((w) => w.length > 2);
  const pb = new Set(palabras(b));
  return palabras(a).some((w) => pb.has(w));
}

const limpiarNumero = (n: string) => n.replace(/[\s-]/g, "").toUpperCase();

interface RenovacionProps {
  poliza: Poliza;
  /** manual = tú escribes la vigencia nueva · pdf = la IA lee el PDF de la renovación y tú confirmas. */
  modo: "manual" | "pdf";
  onHecha: (poliza: Poliza, reportes: "contada" | "duplicada" | "omitida" | "error") => void;
}

/** Renovar una póliza, a mano o con el lector de PDF. */
export function Renovacion({ poliza, modo, onHecha }: RenovacionProps) {
  const hoy = hoyLocal();
  const sugerida = sugerirRenovacion(poliza, hoy);
  const [campos, setCampos] = useState<Campos>({
    inicio: sugerida.inicio,
    hasta: sugerida.hasta,
    forma_pago: sugerida.forma_pago,
    monto_pago: sugerida.monto_pago ? String(sugerida.monto_pago) : "",
    primer_pago: sugerida.primer_pago ? String(sugerida.primer_pago) : "",
    prima_anual: sugerida.prima_anual ? String(sugerida.prima_anual) : "",
    fecha_limite_pago: sugerida.fecha_limite_pago ?? "",
    numero: sugerida.numero,
    aseguradora: sugerida.aseguradora,
    prima_neta: "",
    nota: "",
  });
  // Mientras no toques «fin de vigencia» o «fecha límite», siguen al inicio que escribas.
  const [tocadoHasta, setTocadoHasta] = useState(false);
  const [tocadoLimite, setTocadoLimite] = useState(false);
  const [archivo, setArchivo] = useState<string>("");
  const [leyendo, setLeyendo] = useState(false);
  const [leido, setLeido] = useState(modo === "manual");
  const [avisos, setAvisos] = useState<string[]>([]);
  const [errorLectura, setErrorLectura] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const set = (c: Partial<Campos>) => setCampos((x) => ({ ...x, ...c }));

  function cambiarInicio(v: string) {
    const c: Partial<Campos> = { inicio: v };
    if (esFechaValida(v)) {
      if (!tocadoHasta) c.hasta = sumarMeses(v, 12);
      if (!tocadoLimite) c.fecha_limite_pago = v;
    }
    set(c);
  }

  async function leer(f: File) {
    setErrorLectura(null);
    const valido = /^(application\/pdf|image\/(png|jpeg|webp))$/.test(f.type);
    if (!valido) return setErrorLectura("Solo PDF o foto (PNG, JPG, WEBP).");
    if (f.size > MAX_MB * 1024 * 1024) return setErrorLectura(`Pesa más de ${MAX_MB} MB. Comprímelo o sube solo las hojas principales.`);
    setLeyendo(true);
    setArchivo(f.name);
    try {
      const l = await crmLeerPoliza(f, "renovacion");
      const d = l.datos;
      const aviso = [...l.avisos];
      if (poliza.numero && d.numero && limpiarNumero(poliza.numero) !== limpiarNumero(d.numero)) {
        aviso.push(`El número de póliza del PDF (${d.numero}) no coincide con el de este cliente (${poliza.numero}). Confirma que es su renovación; al guardar se cambia el número.`);
      }
      if (poliza.ramo && d.ramo && poliza.ramo !== d.ramo) {
        aviso.push(`El PDF parece de ${infoRamo(d.ramo).nombre} y esta póliza es de ${infoRamo(poliza.ramo).nombre}.`);
      }
      if (d.contratante && !seParecen(poliza.asegurado, d.contratante)) {
        aviso.push(`El contratante del PDF (${d.contratante}) no se parece a ${poliza.asegurado}. Revisa que sea el documento correcto.`);
      }
      const inicio = esFechaValida(d.inicio) ? d.inicio : sugerida.inicio;
      if (!esFechaValida(d.inicio)) aviso.push("La IA no encontró el inicio de vigencia: revisa la fecha.");
      else if (Math.abs(diasEntre(hoy, d.inicio)) > 400) aviso.push(`El inicio de vigencia que leyó (${conAnio(d.inicio)}) está lejos de hoy: revísalo.`);
      if (d.moneda === "DLS") aviso.push("La póliza viene en dólares: esos montos no se suman a tus reportes en pesos.");
      setAvisos(aviso);
      setTocadoHasta(false);
      setTocadoLimite(false);
      set({
        inicio,
        hasta: sumarMeses(inicio, 12),
        fecha_limite_pago: inicio,
        numero: d.numero || poliza.numero,
        aseguradora: d.aseguradora || poliza.aseguradora,
        prima_neta: d.prima_neta && d.moneda !== "DLS" ? String(d.prima_neta) : "",
      });
      setLeido(true);
    } catch (e) {
      setErrorLectura((e as Error).message);
      setArchivo("");
    } finally {
      setLeyendo(false);
    }
  }

  async function guardar() {
    const r = validarRenovacion({ ...campos, origen: modo, archivo });
    if (!r.ok) return setError(new Error(r.error));
    setGuardando(true);
    setError(null);
    try {
      const res = await crmRenovarPoliza(poliza.id, r.datos);
      onHecha(res.poliza, res.reportes);
    } catch (e) {
      setError(e as Error);
    } finally {
      setGuardando(false);
    }
  }

  if (error instanceof ErrorCRM && error.migracion) {
    return (
      <AvisoMigracion
        onListo={() => setError(null)}
        archivo={error.archivo}
        que="las renovaciones de tus pólizas"
        detalle="Tu libreta en la nube (Supabase) necesita un cajón nuevo para guardar el historial de cada póliza (pagos, renovaciones y endosos). Se hace una sola vez; después vuelve a darle «Renovar»."
      />
    );
  }

  const { estado } = estadoDe(poliza, hoy);
  const recibo = poliza.fecha_limite_pago && (estado === "vencida" || estado === "promesa_vencida" || estado === "por_vencer");

  return (
    <div className="space-y-4">
      <p className="rounded-2xl border border-line bg-glass p-4 text-sm text-ink-soft">
        <strong className="text-ink">{poliza.asegurado}</strong>
        {[poliza.aseguradora, poliza.numero].filter(Boolean).length > 0 && ` · ${[poliza.aseguradora, poliza.numero].filter(Boolean).join(" ")}`}
        <span className="mt-1 block text-xs text-ink-mute">
          Vigencia actual: {poliza.inicio ? conAnio(poliza.inicio) : "sin inicio"} → {poliza.renovacion ? conAnio(poliza.renovacion) : "sin fecha de renovación"}
        </span>
      </p>

      {modo === "pdf" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            const f = e.dataTransfer.files[0];
            if (f && !leyendo) void leer(f);
          }}
          className={`flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center ${arrastrando ? "border-brand-2 bg-brand/10" : "border-line"}`}
        >
          <Icon icon="flat-color-icons:upload" width={30} aria-hidden />
          {leyendo ? (
            <p className="animate-pulse text-sm text-ink-soft">Leyendo «{archivo}» con IA…</p>
          ) : (
            <>
              <button type="button" onClick={() => entrada.current?.click()} className="btn-primary px-4 py-2.5 text-sm">
                {leido ? "Leer otro archivo" : "Adjuntar el PDF de la renovación"}
              </button>
              <p className="text-xs text-ink-mute">
                o arrástralo aquí · PDF, PNG, JPG · máx. {MAX_MB} MB. La IA propone, tú confirmas; el archivo no se guarda.
              </p>
              {leido && archivo && <p className="text-xs font-semibold" style={{ color: "var(--green)" }}>✓ Leído: {archivo}</p>}
            </>
          )}
          {errorLectura && (
            <p className="text-sm" style={{ color: "var(--red)" }} role="alert">
              {errorLectura}
            </p>
          )}
          <input
            ref={entrada}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void leer(f);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {leido && (
        <>
          {avisos.length > 0 && (
            <ul className="space-y-1 rounded-xl border p-3 text-xs text-ink-soft" style={{ borderColor: "color-mix(in srgb, var(--amber) 50%, transparent)" }}>
              {avisos.map((a) => (
                <li key={a}>⚠ {a}</li>
              ))}
            </ul>
          )}
          {recibo && (
            <p className="rounded-xl border border-line p-3 text-xs text-ink-soft">
              Esta póliza tiene un recibo pendiente del {conAnio(poliza.fecha_limite_pago!)}
              {montoDelProximoPago(poliza) > 0 ? ` (${moneda(montoDelProximoPago(poliza))})` : ""}. Al renovar, la fecha límite pasa al primer pago de la vigencia nueva.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo id="rn-inicio" etiqueta="Inicio de la vigencia nueva *">
              <input id="rn-inicio" type="date" value={campos.inicio} onChange={(e) => cambiarInicio(e.target.value)} className="field-input [color-scheme:dark]" />
            </Campo>
            <Campo id="rn-hasta" etiqueta="Próxima renovación *">
              <input
                id="rn-hasta"
                type="date"
                value={campos.hasta}
                onChange={(e) => {
                  setTocadoHasta(true);
                  set({ hasta: e.target.value });
                }}
                className="field-input [color-scheme:dark]"
              />
            </Campo>
            <Campo id="rn-forma" etiqueta="Forma de pago">
              <select id="rn-forma" value={campos.forma_pago} onChange={(e) => set({ forma_pago: e.target.value as FormaPago })} className="field-input">
                {FORMAS_PAGO.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            {campos.forma_pago !== "anual" && (
              <Campo id="rn-primer" etiqueta="Primer pago (con derecho de póliza)">
                <input id="rn-primer" inputMode="decimal" value={campos.primer_pago} onChange={(e) => set({ primer_pago: e.target.value })} placeholder="2150" className="field-input" />
              </Campo>
            )}
            <Campo id="rn-monto" etiqueta={campos.forma_pago === "anual" ? "Monto del pago (MXN)" : "Pagos subsecuentes (MXN)"}>
              <input id="rn-monto" inputMode="decimal" value={campos.monto_pago} onChange={(e) => set({ monto_pago: e.target.value })} placeholder="1850" className="field-input" />
            </Campo>
            <Campo id="rn-limite" etiqueta="Fecha límite del primer pago">
              <input
                id="rn-limite"
                type="date"
                value={campos.fecha_limite_pago}
                onChange={(e) => {
                  setTocadoLimite(true);
                  set({ fecha_limite_pago: e.target.value });
                }}
                className="field-input [color-scheme:dark]"
              />
            </Campo>
            <Campo id="rn-prima" etiqueta="Prima anual total (MXN)">
              <input id="rn-prima" inputMode="decimal" value={campos.prima_anual} onChange={(e) => set({ prima_anual: e.target.value })} placeholder="22000" className="field-input" />
            </Campo>
            <Campo id="rn-numero" etiqueta="Número de póliza">
              <input id="rn-numero" value={campos.numero} maxLength={40} onChange={(e) => set({ numero: e.target.value })} className="field-input" />
            </Campo>
            <Campo id="rn-aseguradora" etiqueta="Aseguradora">
              <input id="rn-aseguradora" value={campos.aseguradora} maxLength={60} onChange={(e) => set({ aseguradora: e.target.value })} className="field-input" />
            </Campo>
            <Campo id="rn-neta" etiqueta="Prima neta anual para tus reportes (opcional)" className="sm:col-span-2">
              <input id="rn-neta" inputMode="decimal" value={campos.prima_neta} onChange={(e) => set({ prima_neta: e.target.value })} placeholder="Sin derechos ni IVA. Vacío = no contarla" className="field-input" />
              <span className="mt-1 block text-[11px] text-ink-mute">
                Si la escribes, esta renovación suma en los reportes de prima renovada (pestaña Pólizas y reportes de Clara).
              </span>
            </Campo>
            <Campo id="rn-nota" etiqueta="Nota (opcional)" className="sm:col-span-2">
              <input id="rn-nota" value={campos.nota} maxLength={500} onChange={(e) => set({ nota: e.target.value })} placeholder="Subió la prima por edad, cambió de plan…" className="field-input" />
            </Campo>
          </div>

          {error && (
            <p className="flex items-start gap-1.5 text-sm" style={{ color: "var(--red)" }} role="alert">
              <Icon icon="flat-color-icons:high-priority" width={16} className="mt-0.5 shrink-0" aria-hidden /> {error.message}
            </p>
          )}
          <button type="button" onClick={() => void guardar()} disabled={guardando || leyendo} className="btn-primary w-full px-6 py-3 text-sm sm:w-auto">
            {guardando ? "Renovando…" : "Renovar póliza"}
          </button>
        </>
      )}
    </div>
  );
}

function Campo({ id, etiqueta, className = "", children }: { id: string; etiqueta: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={id}>
        {etiqueta}
      </label>
      {children}
    </div>
  );
}
