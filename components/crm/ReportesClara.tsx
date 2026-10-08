"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { crmReporte, ErrorCRM } from "@/lib/api";
import { textoReporte } from "@/lib/reportes-reglas";
import { fechaCorta } from "@/lib/fechas";
import type { CifraReporte, ReporteClara, TipoReporte } from "@/lib/types";
import { AvatarEmpleado } from "./AvatarEmpleado";
import { AvisoMigracion } from "./panel/AvisoMigracion";
import { BonoBIC } from "./BonoBIC";

const COLOR_TONO: Record<CifraReporte["tono"], string> = {
  bien: "var(--green)",
  mal: "var(--red)",
  neutral: "var(--ink-mute)",
};

/** Copia al portapapeles (con plan B para navegadores viejos). */
async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = texto;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

/**
 * Clara, tu empleada digital de reportes: cada día 1 el cierre del mes y, al
 * terminar cada trimestre, el del trimestre, listos para copiar a WhatsApp o imprimir en PDF.
 */
export function ReportesClara() {
  const [tipo, setTipo] = useState<TipoReporte>("mes");
  const [fecha, setFecha] = useState<string | null>(null);
  // Tercera pestaña: el bono de AXA (BIC) por trimestre.
  const [bono, setBono] = useState(false);
  const [resultado, setResultado] = useState<{ clave: string; reporte: ReporteClara | null; error: Error | null } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const clave = `${tipo}|${fecha ?? ""}`;

  const cargar = useCallback(
    () =>
      crmReporte(tipo, fecha).then(
        (reporte) => setResultado({ clave, reporte, error: null }),
        (e: unknown) => setResultado({ clave, reporte: null, error: e as Error }),
      ),
    [tipo, fecha, clave],
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const listo = resultado?.clave === clave ? resultado : null;
  const reporte = listo?.reporte ?? null;
  const error = listo?.error ?? null;

  function cambiarTipo(t: TipoReporte) {
    setTipo(t);
    setFecha(null);
  }

  async function copiarTexto() {
    if (!reporte) return;
    if (await copiar(textoReporte(reporte))) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  }

  return (
    <section className="space-y-4">
      <div className="glass-strong flex items-start gap-3 rounded-2xl p-4 sm:p-5">
        <AvatarEmpleado variante="clara" tamano={64} />
        <div className="min-w-0">
          <h2 className="font-display text-lg text-ink">Clara, tus reportes</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Cada <strong className="text-ink">día 1</strong> te deja el cierre del mes y, al terminar cada <strong className="text-ink">trimestre</strong>, el
            de los 3 meses. Lee los mismos números de tu Panel, de Valeri y de Crecimiento. No usa IA: cuesta $0.
          </p>
        </div>
      </div>

      {/* Controles: qué reporte, qué periodo y qué hacer con él */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-line bg-glass p-1" role="group" aria-label="Tipo de reporte">
          {(["mes", "trimestre"] as TipoReporte[]).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={!bono && tipo === t}
              onClick={() => {
                setBono(false);
                cambiarTipo(t);
              }}
              className={`min-h-[40px] rounded-lg px-4 text-sm ${!bono && tipo === t ? "bg-brand/25 font-semibold text-ink" : "text-ink-mute hover:text-ink"}`}
            >
              {t === "trimestre" ? "Trimestral" : "Mensual"}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={bono}
            onClick={() => setBono(true)}
            className={`min-h-[40px] rounded-lg px-4 text-sm ${bono ? "bg-brand/25 font-semibold text-ink" : "text-ink-mute hover:text-ink"}`}
          >
            Bono AXA
          </button>
        </div>
        {!bono && (
          <>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => reporte?.anterior && setFecha(reporte.anterior)}
            disabled={!reporte?.anterior}
            className="min-h-[40px] rounded-xl border border-line bg-glass px-3 text-sm text-ink-soft hover:text-ink disabled:opacity-40"
            aria-label={tipo === "trimestre" ? "Trimestre anterior" : "Mes anterior"}
          >
            ‹ Anterior
          </button>
          <button
            type="button"
            onClick={() => reporte?.siguiente && setFecha(reporte.siguiente)}
            disabled={!reporte?.siguiente}
            className="min-h-[40px] rounded-xl border border-line bg-glass px-3 text-sm text-ink-soft hover:text-ink disabled:opacity-40"
            aria-label={tipo === "trimestre" ? "Trimestre siguiente" : "Mes siguiente"}
          >
            Siguiente ›
          </button>
          {fecha && (
            <button type="button" onClick={() => setFecha(null)} className="min-h-[40px] px-2 text-xs text-ink-mute underline hover:text-ink">
              Último cerrado
            </button>
          )}
        </div>
        <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
          <button type="button" onClick={() => void copiarTexto()} disabled={!reporte} className="btn-ghost flex-1 px-3 py-2 text-sm sm:flex-none">
            <Icon icon={copiado ? "flat-color-icons:ok" : "flat-color-icons:document"} width={18} aria-hidden />
            {copiado ? "¡Copiado!" : "Copiar"}
          </button>
          <a
            href={reporte ? `https://wa.me/?text=${encodeURIComponent(textoReporte(reporte))}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!reporte}
            className="btn-ghost flex-1 px-3 py-2 text-sm sm:flex-none"
          >
            <Icon icon="logos:whatsapp-icon" width={18} aria-hidden /> WhatsApp
          </a>
          <button type="button" onClick={() => window.print()} disabled={!reporte} className="btn-ghost flex-1 px-3 py-2 text-sm sm:flex-none">
            <Icon icon="flat-color-icons:print" width={18} aria-hidden /> PDF
          </button>
        </div>
          </>
        )}
      </div>

      {bono ? (
        <BonoBIC />
      ) : error instanceof ErrorCRM && error.migracion ? (
        <AvisoMigracion
          onListo={() => void cargar()}
          archivo={error.archivo}
          que="a Clara"
          detalle="Clara lee las mismas tablas que tu Panel de Mando. Falta crearlas una sola vez."
        />
      ) : error ? (
        <div className="glass rounded-2xl p-5 text-center">
          <p className="text-sm text-ink-soft">{error.message}</p>
          <button type="button" onClick={() => void cargar()} className="btn-primary mt-3 px-4 py-2.5 text-sm">
            Reintentar
          </button>
        </div>
      ) : !reporte ? (
        <div className="space-y-3" aria-label="Clara está armando tu reporte">
          <div className="h-24 animate-pulse rounded-2xl bg-bg-3/70" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[120px] animate-pulse rounded-2xl bg-bg-3/70" />
            ))}
          </div>
        </div>
      ) : (
        <Reporte r={reporte} />
      )}
    </section>
  );
}

function Reporte({ r }: { r: ReporteClara }) {
  return (
    <article className="clara-imprimible space-y-4">
      <header className="glass rounded-2xl p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-mute">
          Reporte {r.tipo === "trimestre" ? "trimestral" : "mensual"} · Clara
        </p>
        <h3 className="mt-0.5 flex flex-wrap items-center gap-2 font-display text-xl text-ink">
          {r.titulo}
          {r.enCurso && (
            <span className="rounded-full border px-2 py-0.5 font-sans text-xs font-semibold" style={{ borderColor: "var(--amber)", color: "var(--amber)" }}>
              en curso, al {fechaCorta(r.hasta)}
            </span>
          )}
        </h3>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{r.frase}</p>
        <p className="mt-2 text-xs text-ink-mute">Comparado con {r.comparadoCon}.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {r.cifras.map((c) => (
          <div key={c.titulo} className="glass flex min-h-[120px] flex-col rounded-2xl p-3.5 sm:p-4">
            <span className="text-[13px] font-semibold text-ink-soft">{c.titulo}</span>
            <span className="mt-1 text-[24px] font-bold leading-tight text-ink md:text-[26px]">{c.valor}</span>
            {c.cambio && (
              <span className="mt-1 text-xs font-semibold" style={{ color: COLOR_TONO[c.tono] }}>
                {c.cambio}
              </span>
            )}
            <span className="mt-auto pt-1 text-xs text-ink-mute">{c.detalle}</span>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-brand-2/60 bg-brand/10 p-4 sm:p-5">
        <h4 className="flex items-center gap-2 font-semibold text-ink">
          <Icon icon="flat-color-icons:todo-list" width={20} aria-hidden /> Focos {r.tipo === "trimestre" ? "del trimestre" : "del mes"}
        </h4>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[15px] text-ink-soft">
          {r.focos.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ol>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {r.secciones.map((s) => (
          <section key={s.id} className="glass rounded-2xl p-4 sm:p-5">
            <h4 className="flex items-center gap-2 font-semibold text-ink">
              <Icon icon={s.icono} width={20} aria-hidden /> {s.titulo}
            </h4>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              {s.lineas.map((l, i) => (
                <li key={i} className={l.startsWith("→") ? "pl-4 text-ink-mute" : ""}>
                  {l}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {r.avisos.length > 0 && (
        <div className="space-y-1 text-xs text-ink-mute">
          {r.avisos.map((a) => (
            <p key={a} className="flex items-start gap-1.5">
              <Icon icon="flat-color-icons:info" width={14} className="mt-px shrink-0" aria-hidden /> {a}
            </p>
          ))}
        </div>
      )}
      <p className="text-xs text-ink-mute">
        Hecho por Clara el {new Date(r.generado_en).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
      </p>
    </article>
  );
}
