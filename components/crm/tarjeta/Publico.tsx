"use client";

import { fuentesLegibles, type ResumenTarjeta } from "@/lib/tarjeta-reglas";
import { Columnas, ListaBarras, nf } from "./comunes";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
// Con pocas visitas «la hora más activa» es casualidad: no se afirma nada.
const MIN_VISITAS = 20;

const h12 = (h: number) => `${h % 12 || 12} ${h < 12 ? "a. m." : "p. m."}`;
const rangoHora = (h: number) => `${h12(h)} a ${h12((h + 1) % 24)}`;
const indiceMayor = (v: number[]) => v.indexOf(Math.max(...v));
const NOMBRES_HORAS = Array.from({ length: 24 }, (_, h) => String(h));
const TITULOS_HORAS = Array.from({ length: 24 }, (_, h) => rangoHora(h));

/** Público: quién llega (celular o computadora), de dónde, a qué hora y qué quiere proteger. Todo anónimo: sin ubicación, edad ni género. */
export function Publico({ r }: { r: ResumenTarjeta }) {
  const total = r.dispositivos.movil + r.dispositivos.escritorio;
  const pctMovil = total ? Math.round((r.dispositivos.movil / total) * 100) : 0;
  const alcanza = r.visitas >= MIN_VISITAS;

  return (
    <div className="space-y-4">
      <section className="glass rounded-2xl p-4">
        <h3 className="font-display text-base text-ink">Desde qué entran</h3>
        {total ? (
          <>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-bg-3" role="img" aria-label={`${pctMovil}% desde el celular y ${100 - pctMovil}% desde una computadora`}>
              <div style={{ width: `${pctMovil}%`, background: "var(--brand-2)" }} />
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-ink">
                <span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: "var(--brand-2)" }} />
                Celular <strong>{pctMovil}%</strong> · {nf(r.dispositivos.movil)}
              </span>
              <span className="text-ink">
                Computadora <strong>{100 - pctMovil}%</strong> · {nf(r.dispositivos.escritorio)}
              </span>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-ink-mute">Sin visitas todavía.</p>
        )}
      </section>

      <ListaBarras
        titulo="De dónde llegan"
        ayuda="Según el ?s= del enlace o el sitio que los mandó. «Directo» = sin etiqueta (por eso conviene ponerla: mira Inicio → Herramientas → Enlaces con etiqueta)."
        filas={fuentesLegibles(r.fuentes)}
        vacio="Sin datos todavía."
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <section className="glass rounded-2xl p-4">
          <h3 className="font-display text-base text-ink">Horas más activas</h3>
          <p className="mt-0.5 text-xs text-ink-mute">Visitas por hora del día (hora de Monterrey).</p>
          <div className="mt-3">
            <Columnas valores={r.horas} nombres={NOMBRES_HORAS} titulos={TITULOS_HORAS} cada={3} unidad={["visita", "visitas"]} etiqueta="Visitas por hora del día" />
          </div>
          <p className="mt-2 text-sm text-ink-soft">{alcanza ? `Más movimiento: de ${rangoHora(indiceMayor(r.horas))}` : "Aún son pocas visitas para decir cuál es la mejor hora."}</p>
        </section>
        <section className="glass rounded-2xl p-4">
          <h3 className="font-display text-base text-ink">Días más activos</h3>
          <p className="mt-0.5 text-xs text-ink-mute">Visitas por día de la semana.</p>
          <div className="mt-3">
            <Columnas valores={r.diasSemana} nombres={DIAS_CORTOS} unidad={["visita", "visitas"]} etiqueta="Visitas por día de la semana" />
          </div>
          <p className="mt-2 text-sm text-ink-soft">{alcanza ? `Más movimiento: los ${DIAS[indiceMayor(r.diasSemana)].toLowerCase()}.` : "Aún son pocas visitas para decir cuál es el mejor día."}</p>
        </section>
      </div>

      <ListaBarras titulo="Qué quieren proteger" ayuda="Lo que marcan en «¿Qué quieres proteger hoy?»." filas={r.intereses} vacio="Aún nadie ha marcado una opción." />

      <p className="text-xs text-ink-mute">
        Aquí no hay ciudad, edad ni género a propósito: la tarjeta no guarda IP, cookies ni datos personales. Para saber quién es cada persona, marca el origen «Tarjeta web» en su expediente cuando te escriba.
      </p>
    </div>
  );
}
