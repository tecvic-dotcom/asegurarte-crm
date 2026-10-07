"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { crmAdjuntas, crmEliminarAdjunta, crmGuardarAdjunta, crmLeerPoliza, ErrorCRM } from "@/lib/api";
import { RAMOS, infoRamo } from "@/lib/ramos";
import { fechaCorta, hoyLocal } from "@/lib/fechas";
import { aniosConPolizas, porPeriodo, totalPeriodos, type Agrupar } from "@/lib/adjuntas-reglas";
import type { DatosAdjunta, PolizaAdjunta, Ramo, TipoAdjunta } from "@/lib/types";
import { GraficaColumnas } from "./panel/GraficaColumnas";
import { AvisoMigracion } from "./panel/AvisoMigracion";
import { dinero, dineroEje } from "./panel/formato";

const MAX_MB = 4;

/** Un archivo en la fila: leyendo con IA → por revisar → guardado (o con error). */
interface Item {
  clave: number;
  archivo: string;
  estado: "leyendo" | "revisar" | "guardando" | "guardada" | "error";
  /** Texto del formulario (siempre texto: se valida al guardar). */
  form?: Formulario;
  avisos: string[];
  error?: string;
}

interface Formulario {
  tipo: TipoAdjunta;
  ramo: Ramo | "";
  aseguradora: string;
  numero: string;
  contratante: string;
  inicio: string;
  prima_neta: string;
  moneda: "MN" | "DLS";
  asegurados_total: string;
  asegurados_nuevos: string;
  asegurados_nombres: string[];
  archivo: string;
}

function aFormulario(d: DatosAdjunta): Formulario {
  return {
    tipo: d.tipo,
    ramo: d.ramo || "",
    aseguradora: d.aseguradora,
    numero: d.numero,
    contratante: d.contratante,
    inicio: d.inicio,
    prima_neta: d.prima_neta ? String(d.prima_neta) : "",
    moneda: d.moneda,
    asegurados_total: String(d.asegurados_total),
    asegurados_nuevos: String(d.asegurados_nuevos),
    asegurados_nombres: d.asegurados_nombres,
    archivo: d.archivo,
  };
}

function aDatos(f: Formulario): DatosAdjunta {
  return {
    tipo: f.tipo,
    ramo: f.ramo as Ramo,
    aseguradora: f.aseguradora,
    numero: f.numero,
    contratante: f.contratante,
    inicio: f.inicio,
    prima_neta: Number(f.prima_neta.replace(/[$,\s]/g, "")) || 0,
    moneda: f.moneda,
    asegurados_total: Number(f.asegurados_total) || 1,
    asegurados_nuevos: Number(f.asegurados_nuevos) || 0,
    asegurados_nombres: f.asegurados_nombres,
    notas: "",
    archivo: f.archivo,
  };
}

/**
 * Pólizas: adjuntas una póliza nueva o de renovación, la IA lee los datos, tú
 * los confirmas, y de ahí salen los reportes de prima neta por ramo, mes y
 * trimestre (y los asegurados nuevos en gastos médicos).
 */
export function PolizasAdjuntas() {
  const [polizas, setPolizas] = useState<PolizaAdjunta[] | null>(null);
  const [cloud, setCloud] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tipo, setTipo] = useState<TipoAdjunta>("nueva");
  const [items, setItems] = useState<Item[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const contador = useRef(0);
  // Las lecturas van de una en una: más barato, más claro y sin saturar el límite por minuto.
  const cola = useRef<Promise<void>>(Promise.resolve());

  const [ramo, setRamo] = useState<Ramo | null>(null);
  const [anio, setAnio] = useState(Number(hoyLocal().slice(0, 4)));
  const [agrupar, setAgrupar] = useState<Agrupar>("mes");

  const cargar = useCallback(
    () =>
      crmAdjuntas().then(
        (d) => {
          setPolizas(d.polizas);
          setCloud(d.cloud);
          setError(null);
        },
        (e: unknown) => setError(e as Error),
      ),
    [],
  );
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cambiar = (clave: number, parche: Partial<Item>) =>
    setItems((xs) => xs.map((x) => (x.clave === clave ? { ...x, ...parche } : x)));

  function agregar(archivos: FileList | File[]) {
    for (const f of Array.from(archivos)) {
      const clave = ++contador.current;
      const valido = /^(application\/pdf|image\/(png|jpeg|webp))$/.test(f.type);
      if (!valido || f.size > MAX_MB * 1024 * 1024) {
        setItems((xs) => [
          ...xs,
          {
            clave,
            archivo: f.name,
            estado: "error",
            avisos: [],
            error: !valido ? "Solo PDF o foto (PNG, JPG, WEBP)." : `Pesa más de ${MAX_MB} MB. Comprímelo o sube solo las hojas principales.`,
          },
        ]);
        continue;
      }
      setItems((xs) => [...xs, { clave, archivo: f.name, estado: "leyendo", avisos: [] }]);
      const tipoAhora = tipo;
      cola.current = cola.current.then(() =>
        crmLeerPoliza(f, tipoAhora).then(
          (l) => cambiar(clave, { estado: "revisar", form: aFormulario(l.datos), avisos: l.avisos }),
          (e: unknown) => cambiar(clave, { estado: "error", error: (e as Error).message }),
        ),
      );
    }
  }

  async function guardar(it: Item) {
    if (!it.form) return;
    cambiar(it.clave, { estado: "guardando", error: undefined });
    try {
      const nueva = await crmGuardarAdjunta(aDatos(it.form));
      setPolizas((ps) => (ps ? [nueva, ...ps] : ps));
      cambiar(it.clave, { estado: "guardada" });
    } catch (e) {
      cambiar(it.clave, { estado: "revisar", error: (e as Error).message });
    }
  }

  async function borrar(p: PolizaAdjunta) {
    if (!window.confirm(`¿Quitar la póliza ${p.numero || p.contratante} de los reportes?`)) return;
    try {
      await crmEliminarAdjunta(p.id);
      setPolizas((ps) => (ps ? ps.filter((x) => x.id !== p.id) : ps));
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  const anios = useMemo(() => aniosConPolizas(polizas ?? [], Number(hoyLocal().slice(0, 4))), [polizas]);
  const filas = useMemo(() => porPeriodo(polizas ?? [], anio, ramo, agrupar), [polizas, anio, ramo, agrupar]);
  const total = useMemo(() => totalPeriodos(filas), [filas]);
  const porRamoTrim = useMemo(
    () => RAMOS.map((r) => ({ ramo: r.id, trims: porPeriodo(polizas ?? [], anio, r.id, "trimestre") })).filter((r) => r.trims.some((t) => t.nuevas + t.renovaciones > 0)),
    [polizas, anio],
  );

  if (error instanceof ErrorCRM && error.migracion) {
    return (
      <AvisoMigracion
        onListo={() => void cargar()}
        archivo={error.archivo}
        que="tu pestaña de Pólizas"
        detalle="Tu libreta en la nube (Supabase) necesita un cajón nuevo para guardar los datos de las pólizas que adjuntes (prima neta, vigencia y asegurados). El archivo del PDF no se guarda. Se hace una sola vez."
      />
    );
  }
  if (error) {
    return (
      <div className="glass rounded-2xl p-5 text-center">
        <p className="text-sm text-ink-soft">{error.message}</p>
        <button type="button" onClick={() => void cargar()} className="btn-primary mt-3 px-4 py-2.5 text-sm">
          Reintentar
        </button>
      </div>
    );
  }

  const esGmm = ramo === "gmm";
  const mostrarAsegurados = ramo === null || esGmm;
  const nombreRamo = ramo ? infoRamo(ramo).corto : "todos los ramos";
  const pendientes = items.filter((i) => i.estado !== "guardada");

  return (
    <section className="space-y-4">
      <div className="glass-strong rounded-2xl p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-display text-lg text-ink">
          <Icon icon="flat-color-icons:file" width={22} aria-hidden /> Pólizas nuevas y renovaciones
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Adjunta la póliza (PDF o foto). La IA lee ramo, vigencia, <strong className="text-ink">prima neta</strong> y, en gastos médicos, los
          asegurados. Tú revisas y confirmas antes de que cuente en los reportes.
        </p>
        <p className="mt-1 text-xs text-ink-mute">
          El archivo no se guarda: solo los datos que confirmes. Para leerlo, la IA recibe el documento completo (con nombres).
          {!cloud && " · MODO DEMOSTRACIÓN: pólizas inventadas"}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Qué tipo de pólizas vas a adjuntar">
          <span className="text-sm text-ink-soft">Estas son:</span>
          {(["nueva", "renovacion"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tipo === t}
              onClick={() => setTipo(t)}
              className={`min-h-[40px] rounded-xl border px-3 text-sm ${
                tipo === t ? "border-brand-2 bg-brand/15 font-semibold text-ink" : "border-line bg-glass text-ink-mute hover:text-ink"
              }`}
            >
              {t === "nueva" ? "Pólizas nuevas" : "Renovaciones"}
            </button>
          ))}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            agregar(e.dataTransfer.files);
          }}
          className={`mt-3 flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center ${
            arrastrando ? "border-brand-2 bg-brand/10" : "border-line"
          }`}
        >
          <Icon icon="flat-color-icons:upload" width={32} aria-hidden />
          <button type="button" onClick={() => entrada.current?.click()} className="btn-primary px-4 py-2.5 text-sm">
            Adjuntar {tipo === "nueva" ? "pólizas nuevas" : "renovaciones"}
          </button>
          <p className="text-xs text-ink-mute">o arrastra los archivos aquí · PDF, PNG, JPG · máx. {MAX_MB} MB cada uno · puedes subir varios</p>
          <input
            ref={entrada}
            type="file"
            multiple
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) agregar(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {items.length > 0 && (
        <div className="space-y-3" aria-live="polite">
          {items.map((it) => (
            <TarjetaItem
              key={it.clave}
              it={it}
              onForm={(form) => cambiar(it.clave, { form })}
              onGuardar={() => void guardar(it)}
              onQuitar={() => setItems((xs) => xs.filter((x) => x.clave !== it.clave))}
            />
          ))}
          {pendientes.length === 0 && (
            <button type="button" onClick={() => setItems([])} className="btn-ghost px-3 py-2 text-xs">
              Limpiar lista
            </button>
          )}
        </div>
      )}

      {!polizas ? (
        <div className="h-[200px] animate-pulse rounded-2xl bg-bg-3/70" aria-label="Cargando tus pólizas" />
      ) : polizas.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="font-semibold text-ink">Aún no hay pólizas cargadas.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">Adjunta la primera arriba y aquí aparecerán tus reportes por mes y trimestre.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-line bg-glass p-1" role="group" aria-label="Agrupar por">
              {(["mes", "trimestre"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={agrupar === a}
                  onClick={() => setAgrupar(a)}
                  className={`min-h-[40px] rounded-lg px-3 text-sm ${agrupar === a ? "bg-brand/25 font-semibold text-ink" : "text-ink-mute hover:text-ink"}`}
                >
                  Por {a}
                </button>
              ))}
            </div>
            <select
              aria-label="Año"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="field-input min-h-[40px] w-auto py-1.5 text-sm"
            >
              {anios.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ramo">
              {[null, ...RAMOS.map((r) => r.id)].map((r) => (
                <button
                  key={r ?? "todos"}
                  type="button"
                  aria-pressed={ramo === r}
                  onClick={() => setRamo(r)}
                  className={`min-h-[40px] rounded-xl border px-3 text-sm ${
                    ramo === r ? "border-brand-2 bg-brand/15 font-semibold text-ink" : "border-line bg-glass text-ink-mute hover:text-ink"
                  }`}
                >
                  {r ? infoRamo(r).corto : "Todos"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tarjeta titulo={`Prima neta nueva ${anio}`} valor={dinero(total.primaNueva, true)} nota={`${total.nuevas} pólizas nuevas · ${nombreRamo}`} />
            <Tarjeta titulo="Prima neta renovada" valor={dinero(total.primaRenovacion, true)} nota={`${total.renovaciones} renovaciones`} />
            {mostrarAsegurados && (
              <Tarjeta
                titulo="Asegurados nuevos"
                valor={String(
                  (polizas ?? []).filter((p) => p.ramo === "gmm" && Number(p.inicio.slice(0, 4)) === anio).reduce((s, p) => s + p.asegurados_nuevos, 0),
                )}
                nota={`gastos médicos · ${anio}`}
              />
            )}
          </div>

          <GraficaColumnas
            titulo={`Prima neta nueva por ${agrupar} · ${nombreRamo} · ${anio}`}
            subtitulo="Por inicio de vigencia, solo pesos. Toca una columna para ver la cifra"
            categorias={filas.map((f) => f.etiqueta)}
            series={[{ nombre: "Prima neta nueva", color: "var(--serie-entro)", valores: filas.map((f) => f.primaNueva) }]}
            formato={(n) => dinero(n)}
            formatoEje={dineroEje}
            etiquetasArriba={agrupar === "trimestre"}
          />

          <section className="glass rounded-2xl p-4 sm:p-5">
            <h3 className="font-semibold text-ink">
              Detalle por {agrupar} · {nombreRamo} · {anio}
            </h3>
            <div className="no-scrollbar mt-2 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-mute">
                    <th className="py-2 font-semibold">{agrupar === "mes" ? "Mes" : "Trimestre"}</th>
                    <th className="py-2 text-right font-semibold">Nuevas</th>
                    <th className="py-2 text-right font-semibold">Prima neta nueva</th>
                    <th className="py-2 text-right font-semibold">Renovaciones</th>
                    <th className="py-2 text-right font-semibold">Prima renovada</th>
                    {mostrarAsegurados && <th className="py-2 text-right font-semibold">Asegurados nuevos{ramo === null ? " (GMM)" : ""}</th>}
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {[...filas, total].map((f, i, todas) => (
                    <tr key={f.etiqueta} className={`border-b border-line/60 ${i === todas.length - 1 ? "font-semibold text-ink" : "text-ink-soft"}`}>
                      <td className="py-2 capitalize text-ink">{f.etiqueta}</td>
                      <td className="py-2 text-right">{f.nuevas || "—"}</td>
                      <td className="py-2 text-right">{f.primaNueva ? dinero(f.primaNueva) : "—"}</td>
                      <td className="py-2 text-right">{f.renovaciones || "—"}</td>
                      <td className="py-2 text-right">{f.primaRenovacion ? dinero(f.primaRenovacion) : "—"}</td>
                      {mostrarAsegurados && <td className="py-2 text-right">{f.aseguradosNuevos || "—"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ramo === null && <p className="mt-2 text-xs text-ink-mute">En “Todos”, los asegurados nuevos suman cualquier ramo que los tenga capturados.</p>}
          </section>

          {ramo === null && porRamoTrim.length > 0 && (
            <section className="glass rounded-2xl p-4 sm:p-5">
              <h3 className="font-semibold text-ink">Prima neta nueva por ramo y trimestre · {anio}</h3>
              <div className="no-scrollbar mt-2 overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-ink-mute">
                      <th className="py-2 font-semibold">Ramo</th>
                      {["T1", "T2", "T3", "T4"].map((t) => (
                        <th key={t} className="py-2 text-right font-semibold">
                          {t}
                        </th>
                      ))}
                      <th className="py-2 text-right font-semibold">Año</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {porRamoTrim.map((r) => (
                      <tr key={r.ramo} className="border-b border-line/60">
                        <td className="py-2">
                          <button type="button" onClick={() => setRamo(r.ramo)} className="inline-flex items-center gap-2 text-ink hover:underline">
                            <Icon icon={infoRamo(r.ramo).icono} width={16} aria-hidden /> {infoRamo(r.ramo).corto}
                          </button>
                        </td>
                        {r.trims.map((t) => (
                          <td key={t.etiqueta} className="py-2 text-right text-ink-soft">
                            {t.primaNueva ? dinero(t.primaNueva) : "—"}
                          </td>
                        ))}
                        <td className="py-2 text-right font-semibold text-ink">{dinero(totalPeriodos(r.trims).primaNueva)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="glass rounded-2xl p-4 sm:p-5">
            <h3 className="font-semibold text-ink">Pólizas cargadas ({polizas.length})</h3>
            <ul className="mt-2 divide-y divide-line/60">
              {polizas.slice(0, 60).map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                  <Icon icon={infoRamo(p.ramo).icono} width={20} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-ink">
                      {p.contratante || "Sin nombre"} <span className="text-ink-mute">· {p.aseguradora} {p.numero}</span>
                    </p>
                    <p className="text-xs text-ink-mute">
                      {p.tipo === "nueva" ? "Nueva" : "Renovación"} · inicio {fechaCorta(p.inicio)} {p.inicio.slice(0, 4)}
                      {p.ramo === "gmm" && ` · ${p.asegurados_nuevos} asegurado${p.asegurados_nuevos === 1 ? "" : "s"} nuevo${p.asegurados_nuevos === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <span className="tabular-nums text-ink">
                    {p.moneda === "DLS" ? "US" : ""}
                    {dinero(p.prima_neta)}
                  </span>
                  <button type="button" onClick={() => void borrar(p)} className="rounded-lg px-2 py-1 text-ink-mute hover:text-ink" aria-label={`Quitar póliza ${p.numero || p.contratante}`}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
            {polizas.length > 60 && <p className="mt-2 text-xs text-ink-mute">Se muestran las 60 más recientes; los reportes usan todas.</p>}
          </section>
        </>
      )}
    </section>
  );
}

function Tarjeta({ titulo, valor, nota }: { titulo: string; valor: string; nota: string }) {
  return (
    <div className="glass flex min-h-[110px] flex-col rounded-2xl p-3.5 sm:p-4">
      <span className="text-[13px] font-semibold text-ink-soft">{titulo}</span>
      <span className="mt-1 text-[26px] font-bold leading-tight text-ink">{valor}</span>
      <span className="mt-auto pt-1 text-xs text-ink-mute">{nota}</span>
    </div>
  );
}

function TarjetaItem({
  it,
  onForm,
  onGuardar,
  onQuitar,
}: {
  it: Item;
  onForm: (f: Formulario) => void;
  onGuardar: () => void;
  onQuitar: () => void;
}) {
  const f = it.form;
  const set = (parche: Partial<Formulario>) => f && onForm({ ...f, ...parche });
  const [verNombres, setVerNombres] = useState(false);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <Icon icon="flat-color-icons:file" width={20} aria-hidden />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{it.archivo}</p>
        {it.estado === "leyendo" && <span className="animate-pulse text-xs text-ink-mute">Leyendo con IA…</span>}
        {it.estado === "guardada" && <span className="text-xs font-semibold" style={{ color: "var(--green)" }}>✓ Guardada</span>}
        {(it.estado === "error" || it.estado === "revisar") && (
          <button type="button" onClick={onQuitar} className="rounded-lg px-2 py-1 text-ink-mute hover:text-ink" aria-label="Descartar">
            ×
          </button>
        )}
      </div>

      {it.error && (
        <p className="mt-2 text-sm" style={{ color: "var(--red)" }} role="alert">
          {it.error}
        </p>
      )}

      {f && (it.estado === "revisar" || it.estado === "guardando") && (
        <div className="mt-3 space-y-3">
          {it.avisos.length > 0 && (
            <ul className="space-y-1 rounded-xl border p-3 text-xs text-ink-soft" style={{ borderColor: "color-mix(in srgb, var(--amber) 50%, transparent)" }}>
              {it.avisos.map((a) => (
                <li key={a}>⚠ {a}</li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Campo etiqueta="Tipo">
              <select className="field-input" value={f.tipo} onChange={(e) => set({ tipo: e.target.value as TipoAdjunta })}>
                <option value="nueva">Póliza nueva</option>
                <option value="renovacion">Renovación</option>
              </select>
            </Campo>
            <Campo etiqueta="Ramo">
              <select className="field-input" value={f.ramo} aria-invalid={!f.ramo} onChange={(e) => set({ ramo: e.target.value as Ramo })}>
                <option value="">Elige…</option>
                {RAMOS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Inicio de vigencia">
              <input type="date" className="field-input" value={f.inicio} aria-invalid={!f.inicio} onChange={(e) => set({ inicio: e.target.value })} />
            </Campo>
            <Campo etiqueta="Prima neta anual">
              <input inputMode="decimal" className="field-input" value={f.prima_neta} aria-invalid={!f.prima_neta} onChange={(e) => set({ prima_neta: e.target.value })} placeholder="0.00" />
            </Campo>
            <Campo etiqueta="Moneda">
              <select className="field-input" value={f.moneda} onChange={(e) => set({ moneda: e.target.value as "MN" | "DLS" })}>
                <option value="MN">Pesos (MN)</option>
                <option value="DLS">Dólares</option>
              </select>
            </Campo>
            <Campo etiqueta="Aseguradora">
              <input className="field-input" value={f.aseguradora} onChange={(e) => set({ aseguradora: e.target.value })} />
            </Campo>
            <Campo etiqueta="Número de póliza">
              <input className="field-input" value={f.numero} onChange={(e) => set({ numero: e.target.value })} />
            </Campo>
            <Campo etiqueta="Contratante">
              <input className="field-input" value={f.contratante} onChange={(e) => set({ contratante: e.target.value })} />
            </Campo>
            {f.ramo === "gmm" && (
              <>
                <Campo etiqueta="Asegurados en la póliza">
                  <input inputMode="numeric" className="field-input" value={f.asegurados_total} onChange={(e) => set({ asegurados_total: e.target.value })} />
                </Campo>
                <Campo etiqueta={f.tipo === "nueva" ? "Asegurados nuevos (todos)" : "Asegurados nuevos que se agregaron"}>
                  <input inputMode="numeric" className="field-input" value={f.asegurados_nuevos} onChange={(e) => set({ asegurados_nuevos: e.target.value })} />
                </Campo>
              </>
            )}
          </div>
          {f.ramo === "gmm" && f.asegurados_nombres.length > 0 && (
            <div>
              <button type="button" onClick={() => setVerNombres((v) => !v)} className="text-xs text-ink-mute underline">
                {verNombres ? "Ocultar" : "Ver"} los {f.asegurados_nombres.length} asegurados que leyó la IA
              </button>
              {verNombres && <p className="mt-1 text-xs text-ink-soft">{f.asegurados_nombres.join(" · ")}</p>}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={it.estado === "guardando" || !f.ramo || !f.inicio}
              onClick={onGuardar}
              className="btn-primary px-4 py-2.5 text-sm"
            >
              {it.estado === "guardando" ? "Guardando…" : "Confirmar y guardar"}
            </button>
            <button type="button" onClick={onQuitar} className="btn-ghost px-4 py-2.5 text-sm">
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-ink-mute">
      {etiqueta}
      <span className="mt-1 block text-sm text-ink">{children}</span>
    </label>
  );
}
