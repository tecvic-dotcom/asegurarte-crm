"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { crmChubb, crmContactosChubb, ErrorCRM } from "@/lib/api";
import { diasEntre, fechaLarga, fechaLocal, hoyLocal } from "@/lib/fechas";
import {
  FRECUENCIAS,
  MESES,
  SIN_FILTROS,
  analizarTodas,
  filtrarPolizas,
  hayFiltros,
  nombreArchivoChubb,
  opcionesDeFiltro,
  resumenChubb,
  textoReporteChubb,
  type CargaChubb,
  type ContactoCRM,
  type FiltrosChubb,
} from "@/lib/chubb-reglas";
import { hojasChubb } from "@/lib/chubb-excel";
import { TIPO_XLSX, crearXlsx } from "@/lib/xlsx-simple";
import { AvatarEmpleado } from "./AvatarEmpleado";
import { AvisoMigracion } from "./panel/AvisoMigracion";
import { CargarExcel } from "./chubb/CargarExcel";
import { Filtros } from "./chubb/Filtros";
import { Nota, Pastillas, copiarTexto, type VistaDana } from "./chubb/piezas";
import { VistaPolizas } from "./chubb/VistaPolizas";
import { VistaRecibos } from "./chubb/VistaRecibos";
import { VistaRenovaciones } from "./chubb/VistaRenovaciones";
import { VistaResumen } from "./chubb/VistaResumen";
import { VistaRevisar } from "./chubb/VistaRevisar";

/** «Por renovación · 2026 · diciembre · mensual», para el encabezado del reporte y del Excel. */
function describirFiltros(f: FiltrosChubb): string {
  const partes: string[] = [];
  if (f.anio !== null || f.mes !== null) {
    partes.push(`${f.ver === "emision" ? "emisión" : "renovación"} ${[f.mes !== null ? MESES[f.mes - 1] : "", f.anio ?? ""].filter(Boolean).join(" ")}`);
  }
  if (f.frecuencia) partes.push(FRECUENCIAS[f.frecuencia].nombre.toLowerCase());
  if (f.pagos) partes.push(f.pagos === "con_pendientes" ? "con recibos pendientes" : "sin recibos pendientes");
  if (f.busca.trim()) partes.push(`búsqueda «${f.busca.trim()}»`);
  return partes.length ? `filtros: ${partes.join(" · ")}` : "";
}

type Estado = { carga: CargaChubb | null; error: Error | null; listo: boolean };

/**
 * Dana, tu empleada digital de Chubb Autos: lee tu Excel «Producción Detalle» y te dice qué renovaciones vienen,
 * cuánta prima neta ya está pagada y qué recibos siguen sin pagarse. Sin IA y sin costo: son cuentas sobre tu Excel.
 */
export function ChubbDana() {
  const hoy = useMemo(() => hoyLocal(), []);
  const [estado, setEstado] = useState<Estado>({ carga: null, error: null, listo: false });
  // Falta correr el SQL 0021: puede saberse al leer o al guardar el primer Excel.
  const [migracion, setMigracion] = useState<string | null>(null);
  const [vista, setVista] = useState<VistaDana>("resumen");
  const [filtros, setFiltros] = useState<FiltrosChubb>(SIN_FILTROS);
  const [aviso, setAviso] = useState<string | null>(null);
  // Nombre y WhatsApp de tus contactos del CRM; se piden una sola vez, la primera vez que abres «Recibos pendientes».
  const [contactos, setContactos] = useState<ContactoCRM[] | null>(null);

  const cargar = useCallback(
    () =>
      crmChubb().then(
        (carga) => {
          setMigracion(null);
          setEstado({ carga, error: null, listo: true });
        },
        (e: unknown) => setEstado({ carga: null, error: e as Error, listo: true }),
      ),
    [],
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!aviso) return;
    const reloj = window.setTimeout(() => setAviso(null), 4500);
    return () => window.clearTimeout(reloj);
  }, [aviso]);

  const { carga } = estado;
  const necesitaContactos = vista === "recibos" && carga !== null && contactos === null;
  useEffect(() => {
    if (!necesitaContactos) return;
    let vigente = true;
    // Si no se pueden leer, el mensaje se abre en WhatsApp sin número y tú eliges el chat.
    crmContactosChubb().then(
      (c) => vigente && setContactos(c),
      () => vigente && setContactos([]),
    );
    return () => {
      vigente = false;
    };
  }, [necesitaContactos]);
  const infos =useMemo(() => (carga ? analizarTodas(carga.polizas, hoy) : []), [carga, hoy]);
  const filtradas = useMemo(() => filtrarPolizas(infos, filtros), [infos, filtros]);
  const resumen = useMemo(() => resumenChubb(filtradas), [filtradas]);
  const opciones = useMemo(() => opcionesDeFiltro(infos, filtros.ver), [infos, filtros.ver]);
  const conAvisos = useMemo(() => filtradas.filter((i) => i.avisos.length > 0).length, [filtradas]);
  const nota = describirFiltros(filtros);
  const diasSinCargar = carga ? diasEntre(fechaLocal(carga.cargado_en), hoy) : 0;

  async function copiarReporte() {
    setAviso((await copiarTexto(textoReporteChubb(filtradas, hoy, nota))) ? "Reporte copiado: pégalo donde quieras." : "No pude copiar. Intenta de nuevo.");
  }

  /** Baja a tu compu el Excel del reporte, con lo que ves hoy en pantalla (respeta los filtros). */
  function bajarExcel() {
    try {
      const nombre = nombreArchivoChubb(hoy);
      const url = URL.createObjectURL(new Blob([crearXlsx(hojasChubb(filtradas, hoy, nota))], { type: TIPO_XLSX }));
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      setAviso(`Excel descargado (${nombre}): trae el resumen, las renovaciones, los recibos pendientes y las pólizas.`);
    } catch {
      setAviso("No pude armar el Excel. Intenta de nuevo.");
    }
  }

  const errorMigracion = estado.error instanceof ErrorCRM && estado.error.migracion ? estado.error : null;
  const hayMigracion = migracion !== null || errorMigracion !== null;

  return (
    <section className="space-y-4">
      <div className="glass-strong flex items-start gap-3 rounded-2xl p-4 sm:p-5">
        <AvatarEmpleado variante="dana" tamano={64} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg text-ink">Dana, tu Chubb Autos</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Lee tu Excel <strong className="text-ink">«Producción Detalle»</strong> y te dice qué <strong className="text-ink">renovaciones</strong> vienen, cuánta{" "}
            <strong className="text-ink">prima neta</strong> ya está pagada y qué <strong className="text-ink">recibos</strong> siguen pendientes. Todo se puede filtrar por año y mes. No usa IA: cuesta $0.
          </p>
          {carga && (
            <p className="mt-2 text-xs text-ink-mute" data-testid="chubb-ultima">
              Excel en uso: <strong className="text-ink-soft">{carga.archivo}</strong> · cargado el{" "}
              {new Date(carga.cargado_en).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })} · {carga.polizas.length} pólizas
            </p>
          )}
          <div className="mt-3">
            <CargarExcel
              actual={carga}
              principal={estado.listo && !carga && !hayMigracion}
              onGuardada={(c) => {
                setEstado({ carga: c, error: null, listo: true });
                setMigracion(null);
                setFiltros(SIN_FILTROS);
                setVista("resumen");
                setAviso(`Listo: Dana ya trabaja con tu Excel (${c.polizas.length} pólizas).`);
              }}
              onMigracion={setMigracion}
            />
          </div>
        </div>
      </div>

      {aviso && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-line bg-glass px-3 py-2 text-sm text-ink">
          <Icon icon="flat-color-icons:ok" width={18} aria-hidden /> {aviso}
        </p>
      )}

      {hayMigracion ? (
        <AvisoMigracion
          onListo={() => {
            setMigracion(null);
            setEstado((e) => ({ ...e, error: null, listo: false }));
            void cargar();
          }}
          archivo={migracion ?? errorMigracion?.archivo}
          que="a Dana"
          detalle="Dana guarda cada Excel que subes en una tabla nueva de tu Supabase. Falta crearla una sola vez."
        />
      ) : estado.error ? (
        <div className="glass rounded-2xl p-5 text-center">
          <p className="text-sm text-ink-soft">{estado.error.message}</p>
          <button type="button" onClick={() => void cargar()} className="btn-primary mt-3 px-4 py-2.5 text-sm">
            Reintentar
          </button>
        </div>
      ) : !estado.listo ? (
        <div className="space-y-3" aria-label="Dana está leyendo tu Excel">
          <div className="h-16 animate-pulse rounded-2xl bg-bg-3/70" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[116px] animate-pulse rounded-2xl bg-bg-3/70" />
            ))}
          </div>
        </div>
      ) : !carga ? (
        <div className="glass rounded-2xl p-5 sm:p-6" data-testid="chubb-vacio">
          <h3 className="flex items-center gap-2 font-semibold text-ink">
            <Icon icon="flat-color-icons:data-sheet" width={22} aria-hidden /> Empecemos: sube tu Excel
          </h3>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
            <li>
              Toca <strong className="text-ink">Cargar mi Excel</strong> y elige tu archivo <strong className="text-ink">Producción Detalle</strong> (el .xlsx de Chubb Autos).
            </li>
            <li>
              Dana lee la hoja <strong className="text-ink">«Producción»</strong> (necesita las columnas Poliza, Asegurado, Inicio y Fin de vigencia y Frecuencia de pago) y te enseña qué entendió.
            </li>
            <li>Confirma, y listo: indicadores, renovaciones y recibos pendientes.</li>
          </ol>
          <p className="mt-3 text-xs text-ink-mute">
            En las pólizas que no son anuales, pinta de <strong className="text-ink-soft">verde</strong> cada recibo pagado y de <strong className="text-ink-soft">amarillo</strong> cada recibo pendiente (columnas «Siguiente recibo» y las de su derecha); cuando se pague uno, cámbialo a verde y vuelve a cargar el Excel. Cada carga queda guardada.
          </p>
        </div>
      ) : (
        <>
          {diasSinCargar >= 7 && (
            <Nota tono="ojo">
              Tu Excel se cargó hace {diasSinCargar} días. Si lo has actualizado desde entonces, vuelve a cargarlo para que Dana vea lo más reciente.
            </Nota>
          )}

          <Filtros filtros={filtros} onCambio={setFiltros} anios={opciones.anios} meses={opciones.meses} mostradas={filtradas.length} total={infos.length} />

          <div className="flex flex-wrap items-center gap-2">
            <Pastillas<VistaDana>
              etiqueta="Pantalla de Dana"
              valor={vista}
              onCambio={setVista}
              opciones={[
                { id: "resumen", nombre: "Resumen" },
                { id: "renovaciones", nombre: "Renovaciones", cuenta: resumen.renovaciones.d30.n + resumen.renovaciones.vencidas.n, tono: "var(--red)" },
                { id: "recibos", nombre: "Recibos pendientes", cuenta: resumen.recibos.pendientes, tono: "var(--red)" },
                { id: "polizas", nombre: "Pólizas", cuenta: filtradas.length },
                { id: "revisar", nombre: "Por revisar", cuenta: conAvisos, tono: "var(--amber)" },
              ]}
            />
            <div className="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto">
              <button type="button" onClick={() => void copiarReporte()} disabled={!filtradas.length} className="btn-ghost flex-1 px-3 py-2 text-sm sm:flex-none">
                <Icon icon="flat-color-icons:document" width={18} aria-hidden /> Copiar
              </button>
              <a
                href={filtradas.length ? `https://wa.me/?text=${encodeURIComponent(textoReporteChubb(filtradas, hoy, nota))}` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!filtradas.length}
                className="btn-ghost flex-1 px-3 py-2 text-sm sm:flex-none"
              >
                <Icon icon="logos:whatsapp-icon" width={18} aria-hidden /> WhatsApp
              </a>
              <button type="button" onClick={bajarExcel} disabled={!filtradas.length} className="btn-ghost flex-1 px-3 py-2 text-sm sm:flex-none" data-testid="chubb-excel">
                <Icon icon="flat-color-icons:data-sheet" width={18} aria-hidden /> Excel
              </button>
              <button type="button" onClick={() => window.print()} disabled={!filtradas.length} className="btn-ghost flex-1 px-3 py-2 text-sm sm:flex-none">
                <Icon icon="flat-color-icons:print" width={18} aria-hidden /> PDF
              </button>
            </div>
          </div>

          {filtradas.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center text-sm text-ink-soft">
              {hayFiltros(filtros) ? "Ninguna póliza coincide con estos filtros." : "Tu Excel no trae pólizas."}
              {hayFiltros(filtros) && (
                <button type="button" onClick={() => setFiltros({ ...SIN_FILTROS, ver: filtros.ver })} className="ml-2 underline hover:text-ink">
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="clara-imprimible space-y-4">
              {/* Solo se ve al imprimir / guardar en PDF */}
              <header className="hidden print:block">
                <p className="text-xs font-semibold uppercase tracking-wide">Chubb Autos · reporte de Dana</p>
                <p className="text-sm">
                  Al {fechaLarga(hoy)} · {filtradas.length} pólizas{nota ? ` · ${nota}` : ""}
                </p>
              </header>
              {vista === "resumen" && (
                <VistaResumen
                  r={resumen}
                  filtradas={filtradas}
                  hoy={hoy}
                  onIr={setVista}
                  onVerFrecuencia={(f) => {
                    setFiltros((x) => ({ ...x, frecuencia: f }));
                    setVista("polizas");
                    window.scrollTo({ top: 0 });
                  }}
                />
              )}
              {vista === "renovaciones" && <VistaRenovaciones infos={filtradas} />}
              {/* Al cambiar los filtros se vuelve a ver «todos los pendientes»: una ventana angosta de antes escondería pólizas. */}
              {vista === "recibos" && <VistaRecibos key={JSON.stringify(filtros)} infos={filtradas} contactos={contactos} />}
              {vista === "polizas" && <VistaPolizas infos={filtradas} />}
              {vista === "revisar" && <VistaRevisar infos={filtradas} />}
            </div>
          )}
        </>
      )}
    </section>
  );
}
