"use client";

import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { crmCargarChubb, ErrorCRM } from "@/lib/api";
import { compararCargas, polizasDesdeHojas, type CambiosCarga, type CargaChubb, type LecturaExcelChubb } from "@/lib/chubb-reglas";
import { leerXlsx } from "@/lib/xlsx-lector";

/** El Excel pesa unos cuantos cientos de KB; 10 MB frena un archivo equivocado (un video, un PDF grande…). */
const MAX_BYTES = 10 * 1024 * 1024;

type Subida =
  | { fase: "ninguna" }
  | { fase: "leyendo"; archivo: string }
  | { fase: "revisar"; archivo: string; lectura: LecturaExcelChubb; cambios: CambiosCarga | null; pocas: boolean }
  | { fase: "guardando"; archivo: string }
  | { fase: "error"; mensaje: string };

/**
 * Subir el Excel «Producción Detalle»: el navegador lo lee (no sale de tu compu hasta que lo confirmas), Dana te
 * enseña qué entendió y qué cambió desde la última vez, y solo entonces lo guarda.
 */
export function CargarExcel({
  actual,
  principal,
  onGuardada,
  onMigracion,
}: {
  actual: CargaChubb | null;
  /** true cuando todavía no hay ningún Excel cargado: el botón se vuelve el protagonista. */
  principal: boolean;
  onGuardada: (c: CargaChubb) => void;
  onMigracion: (archivo: string) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subida, setSubida] = useState<Subida>({ fase: "ninguna" });

  async function leer(archivo: File) {
    if (/\.xls$/i.test(archivo.name)) {
      setSubida({ fase: "error", mensaje: "Dana lee el Excel moderno (.xlsx). Abre tu archivo, elige Guardar como y escoge «Libro de Excel (.xlsx)»." });
      return;
    }
    if (!/\.xls[xm]$/i.test(archivo.name)) {
      setSubida({ fase: "error", mensaje: "Ese no es un archivo de Excel (.xlsx). Sube tu «Producción Detalle»." });
      return;
    }
    if (archivo.size > MAX_BYTES) {
      setSubida({ fase: "error", mensaje: "Ese archivo es demasiado grande para ser tu Excel de producción. ¿Elegiste el correcto?" });
      return;
    }
    setSubida({ fase: "leyendo", archivo: archivo.name });
    try {
      const hojas = await leerXlsx(await archivo.arrayBuffer());
      const r = polizasDesdeHojas(hojas);
      if (!r.ok) {
        setSubida({ fase: "error", mensaje: r.error });
        return;
      }
      const cambios = actual ? compararCargas(actual.polizas, r.lectura.polizas) : null;
      const pocas = Boolean(actual && actual.polizas.length >= 5 && r.lectura.polizas.length < actual.polizas.length * 0.7);
      setSubida({ fase: "revisar", archivo: archivo.name, lectura: r.lectura, cambios, pocas });
    } catch (e) {
      setSubida({ fase: "error", mensaje: (e as Error).message || "No pude leer ese archivo. ¿Está abierto o dañado?" });
    }
  }

  async function guardar() {
    if (subida.fase !== "revisar") return;
    const { archivo, lectura } = subida;
    setSubida({ fase: "guardando", archivo });
    try {
      onGuardada(await crmCargarChubb(archivo, lectura.polizas));
      setSubida({ fase: "ninguna" });
    } catch (e) {
      if (e instanceof ErrorCRM && e.migracion) {
        setSubida({ fase: "ninguna" });
        onMigracion(e.archivo);
        return;
      }
      setSubida({ fase: "error", mensaje: (e as Error).message || "No pude guardar el Excel. Intenta de nuevo." });
    }
  }

  const ocupado = subida.fase === "leyendo" || subida.fase === "guardando";

  return (
    <div className="space-y-3">
      <input
        ref={entrada}
        type="file"
        accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        tabIndex={-1}
        aria-label="Elegir el Excel de Chubb Autos"
        data-testid="chubb-archivo"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void leer(f);
        }}
      />
      <button
        type="button"
        onClick={() => entrada.current?.click()}
        disabled={ocupado}
        className={`${principal ? "btn-primary" : "btn-ghost"} px-4 py-2.5 text-sm`}
        data-testid="chubb-cargar"
      >
        <Icon icon="flat-color-icons:upload" width={18} aria-hidden />
        {subida.fase === "leyendo" ? "Leyendo tu Excel…" : subida.fase === "guardando" ? "Guardando…" : actual ? "Cargar Excel nuevo" : "Cargar mi Excel"}
      </button>

      {subida.fase === "error" && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border px-3 py-2 text-sm text-ink" style={{ borderColor: "color-mix(in srgb, var(--red) 55%, transparent)", background: "color-mix(in srgb, var(--red) 10%, transparent)" }}>
          <Icon icon="flat-color-icons:high-priority" width={18} className="mt-0.5 shrink-0" aria-hidden />
          <span className="flex-1">{subida.mensaje}</span>
          <button type="button" onClick={() => setSubida({ fase: "ninguna" })} className="shrink-0 text-ink-mute underline hover:text-ink">
            Cerrar
          </button>
        </p>
      )}

      {subida.fase === "revisar" && (
        <section className="glass-strong rounded-2xl p-4 sm:p-5" aria-label="Revisa tu Excel antes de guardar" data-testid="chubb-revision">
          <h3 className="flex items-center gap-2 font-semibold text-ink">
            <Icon icon="flat-color-icons:inspection" width={22} aria-hidden /> Revisa antes de guardar
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            Leí <strong className="text-ink">{subida.lectura.polizas.length} pólizas</strong> de la hoja «{subida.lectura.hoja}» de <em>{subida.archivo}</em>.
          </p>

          {subida.pocas && actual && (
            <p className="mt-2 flex items-start gap-2 text-sm text-ink">
              <Icon icon="flat-color-icons:medium-priority" width={18} className="mt-0.5 shrink-0" aria-hidden />
              Trae bastantes menos pólizas que tu última carga ({actual.polizas.length}). ¿Es el archivo correcto?
            </p>
          )}

          {subida.cambios ? (
            <ul className="mt-3 space-y-1 text-sm text-ink-soft">
              <li>
                Pólizas nuevas: <strong className="text-ink">{subida.cambios.nuevas.length}</strong>
              </li>
              <li>
                Pólizas que ya no vienen: <strong className="text-ink">{subida.cambios.quitadas.length}</strong>
                {subida.cambios.quitadas.length > 0 && <span className="text-ink-mute"> (dejan de contar en Dana; tu carga anterior se conserva)</span>}
              </li>
              <li>
                Recibos que dejaron de estar pendientes: <strong className="text-ink">{subida.cambios.recibos_cobrados}</strong>
                <span className="text-ink-mute"> (Dana los cuenta como pagados)</span>
              </li>
              <li>
                Recibos pendientes nuevos: <strong className="text-ink">{subida.cambios.recibos_nuevos}</strong>
              </li>
              <li>
                Pólizas con prima distinta: <strong className="text-ink">{subida.cambios.primas_cambiadas}</strong>
              </li>
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">Es tu primera carga: Dana empieza a trabajar con este Excel.</p>
          )}

          {subida.lectura.avisos.length > 0 && (
            <div className="mt-3 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "color-mix(in srgb, var(--amber) 50%, transparent)" }}>
              <p className="font-semibold text-ink">Esto no pude leer bien:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-soft">
                {subida.lectura.avisos.slice(0, 8).map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              {subida.lectura.avisos.length > 8 && <p className="mt-1 text-xs text-ink-mute">…y {subida.lectura.avisos.length - 8} avisos más.</p>}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => void guardar()} className="btn-primary px-4 py-2.5 text-sm" data-testid="chubb-guardar">
              <Icon icon="flat-color-icons:ok" width={18} aria-hidden /> Guardar y usar este Excel
            </button>
            <button type="button" onClick={() => setSubida({ fase: "ninguna" })} className="btn-ghost px-4 py-2.5 text-sm">
              Cancelar
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
