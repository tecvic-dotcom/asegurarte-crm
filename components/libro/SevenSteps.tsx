"use client";

import { useState } from "react";
import { Eyebrow, Titulo } from "./ui";

/**
 * La escalera de los siete escalones (los siete capítulos del libro). Se toca un escalón y abajo se ve qué logras en él.
 * Los logros salen de la sección «Lo que lograste» de cada capítulo (proyectos/ebook-mano-derecha-digital/build/capN.js).
 */
const ESCALONES = [
  {
    corto: "Prepara tu mesa",
    titulo: "Prepara tu mesa",
    resumen: "Instalas Visual Studio Code y la extensión de Claude. Al final del capítulo tu asistente te contesta su primer «Hola».",
    logros: ["Revisas los diez puntos de tu equipo.", "Reconoces las cinco zonas de la pantalla.", "Creas tu carpeta MI ASISTENTE y la abres."],
  },
  {
    corto: "Primera hora",
    titulo: "Tu primera hora: tres victorias",
    resumen: "Tres ejercicios cortos con datos inventados: resumes una póliza, escribes un seguimiento y ordenas una carpeta de prueba.",
    logros: [
      "Compruebas el resumen con cinco revisiones: nombres, cifras, fechas, promesas y tono.",
      "Pides tres versiones de un mensaje y eliges la que suena a ti.",
      "Tu asistente te propone un plan antes de mover un solo archivo.",
    ],
  },
  {
    corto: "Expediente",
    titulo: "El expediente de tu asistente",
    resumen: "Le das la ficha de tu negocio y tus reglas de trabajo, para que no empiece de cero cada día.",
    logros: ["Tu asistente te entrevista y arma la ficha.", "Le pones nombre y le dices cómo trabajar.", "En una conversación nueva, ya sabe quién eres."],
  },
  {
    corto: "Pedir bien",
    titulo: "Cómo pedir bien",
    resumen: "Contexto, tarea y formato. Con esa receta te entiende a la primera mucho más seguido.",
    logros: [
      "Comparas un pedido flojo con uno bueno y ves la diferencia.",
      "Haces que te pregunte antes de un trabajo grande.",
      "Deshaces un cambio con un botón.",
    ],
  },
  {
    corto: "Casos reales",
    titulo: "Casos reales: de lo fácil a lo difícil",
    resumen: "Cuatro proyectos completos: una página web de una pantalla, un plan de contenido, un tablero de cobranza y renovaciones y un mini-CRM.",
    logros: [
      "Ves en tu navegador una página con datos de ejemplo.",
      "Armas un plan de contenido de cuatro semanas y un guion para grabarte.",
      "Creas una cartera de ejemplo con semáforo y tu agenda del día.",
    ],
  },
  {
    corto: "Cuida tu negocio",
    titulo: "Cuida tu negocio",
    resumen: "Respaldos, privacidad de los datos de tus clientes, doble factor y qué hacer si algo sale mal.",
    logros: ["Haces un respaldo y compruebas que abre.", "Activas el doble factor en tu correo.", "Evalúas una herramienta antes de instalarla."],
  },
  {
    corto: "Plan 90 días",
    titulo: "Plan de 30, 60 y 90 días",
    resumen: "Tu meta se vuelve actividad semanal, con quince minutos al día y tu agenda real.",
    logros: ["Armas tu semana tipo.", "Creas tu calendario de 12 semanas.", "Llevas una hoja de medición semanal."],
  },
];

export function SevenSteps() {
  const [activo, setActivo] = useState(0);
  const e = ESCALONES[activo];

  return (
    <section>
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>El método</Eyebrow>
        <Titulo>Siete escalones, uno a la vez</Titulo>
        <p className="mt-4">Cada escalón termina en algo que ya funciona. Toca uno para ver qué logras en él.</p>
      </div>

      <div className="glass mt-10 rounded-[28px] p-4 sm:p-8">
        <div className="flex items-end gap-1.5 sm:gap-2.5" role="group" aria-label="Los siete escalones del libro">
          {ESCALONES.map((esc, i) => {
            const elegido = i === activo;
            return (
              <button
                key={esc.titulo}
                type="button"
                onClick={() => setActivo(i)}
                aria-pressed={elegido}
                aria-controls="escalon-detalle"
                aria-label={`Escalón ${i + 1}: ${esc.titulo}`}
                style={{ height: `${4.5 + i * 1.6}rem` }}
                className={`flex flex-1 flex-col items-center justify-start rounded-t-xl px-1 pt-2 text-center transition-[background,box-shadow,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-2 sm:pt-3 ${
                  elegido
                    ? "bg-gradient-to-b from-brand-2 to-brand text-white shadow-[0_18px_40px_-14px_rgba(42,34,245,0.95)]"
                    : "bg-bg-3 text-ink-soft hover:-translate-y-0.5 hover:bg-[#1a2160]"
                }`}
              >
                <span className="font-display text-2xl leading-none sm:text-4xl">{i + 1}</span>
                <span className="mt-2 hidden text-[0.7rem] font-semibold uppercase leading-tight tracking-wide sm:block lg:text-xs">{esc.corto}</span>
              </button>
            );
          })}
        </div>
        <div className="h-1.5 rounded-b-md bg-bg-3" aria-hidden="true" />

        <div id="escalon-detalle" aria-live="polite" className="mt-6 grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-2">
              Escalón {activo + 1} de {ESCALONES.length}
            </p>
            <h3 className="mt-2 font-display text-2xl text-ink sm:text-3xl">{e.titulo}</h3>
            <p className="mt-3">{e.resumen}</p>
          </div>
          <div className="glass-soft rounded-2xl p-5">
            <p className="text-sm font-semibold text-ink">Al terminar este escalón:</p>
            <ul className="mt-3 space-y-2.5">
              {e.logros.map((l) => (
                <li key={l} className="flex gap-3 text-base">
                  <span aria-hidden="true" className="flex-none font-bold text-green">
                    ✓
                  </span>
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" className="btn-ghost btn-sm disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setActivo((a) => Math.max(0, a - 1))} disabled={activo === 0}>
            ‹ Anterior
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setActivo((a) => Math.min(ESCALONES.length - 1, a + 1))}
            disabled={activo === ESCALONES.length - 1}
          >
            Siguiente ›
          </button>
        </div>
      </div>
    </section>
  );
}
