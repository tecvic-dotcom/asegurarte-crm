"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { claveVideo, type ItemContenido, type ResumenTarjeta } from "@/lib/tarjeta-reglas";
import { ListaBarras, nf } from "./comunes";

type Tipo = ItemContenido["tipo"];
type Filtro = "todo" | Tipo;
type Orden = "aperturas" | "wa";

const TIPOS: Record<Tipo, { icono: string; nombre: string; plural: string }> = {
  video: { icono: "flat-color-icons:film-reel", nombre: "Video", plural: "Videos" },
  promocion: { icono: "flat-color-icons:advertising", nombre: "Promoción", plural: "Promociones" },
  historia: { icono: "flat-color-icons:feedback", nombre: "Historia de un cliente", plural: "Historias" },
  pregunta: { icono: "flat-color-icons:info", nombre: "Pregunta frecuente", plural: "Preguntas" },
  foto: { icono: "flat-color-icons:add-image", nombre: "Foto", plural: "Fotos" },
};
const MAX_FILAS = 25;

/** Ícono del tipo de contenido; en los videos, su portada (si la imagen no carga, vuelve al ícono). */
function Miniatura({ tipo, portada }: { tipo: Tipo; portada?: string }) {
  const [falla, setFalla] = useState(false);
  if (tipo === "video" && portada && !falla) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- portada de Supabase o de la tarjeta; el CRM no la optimiza
      <img src={portada} alt="" loading="lazy" decoding="async" onError={() => setFalla(true)} className="h-[72px] w-10 rounded-lg bg-bg-3 object-cover" />
    );
  }
  return (
    <span className="grid h-12 w-12 place-items-center rounded-xl bg-bg-3">
      <Icon icon={TIPOS[tipo].icono} width={26} />
    </span>
  );
}

/** Contenido: cada video, historia, pregunta, foto y promoción con cuántas veces lo abrieron, como la lista de «Contenido» de Instagram. */
export function Contenido({ r }: { r: ResumenTarjeta }) {
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [orden, setOrden] = useState<Orden>("aperturas");
  const [todos, setTodos] = useState(false);

  const hay = (t: Tipo) => r.contenido.some((c) => c.tipo === t);
  const lista = r.contenido
    .filter((c) => filtro === "todo" || c.tipo === filtro)
    .sort((a, b) => b[orden] - a[orden] || b.aperturas + b.wa - (a.aperturas + a.wa) || a.nombre.localeCompare(b.nombre, "es"));
  const visibles = todos ? lista : lista.slice(0, MAX_FILAS);
  const maximo = Math.max(1, ...lista.map((c) => c[orden]));

  return (
    <div className="space-y-4">
      <section className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de contenido">
          {([["todo", "Todo"], ...(Object.keys(TIPOS) as Tipo[]).filter(hay).map((t) => [t, TIPOS[t].plural])] as Array<[Filtro, string]>).map(([id, texto]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filtro === id}
              onClick={() => {
                setFiltro(id);
                setTodos(false);
              }}
              className={`min-h-[36px] rounded-full border px-3.5 text-sm ${filtro === id ? "border-brand-2 bg-brand/25 font-semibold text-ink" : "border-line bg-glass text-ink-mute hover:text-ink"}`}
            >
              {texto}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-mute" role="group" aria-label="Ordenar por">
          <span>Ordenar por</span>
          {(
            [
              ["aperturas", "Más abiertos"],
              ["wa", "Más WhatsApp"],
            ] as const
          ).map(([id, texto]) => (
            <button
              key={id}
              type="button"
              aria-pressed={orden === id}
              onClick={() => setOrden(id)}
              className={`min-h-[32px] rounded-full border px-3 ${orden === id ? "border-brand-2 bg-brand/25 font-semibold text-ink" : "border-line bg-glass hover:text-ink"}`}
            >
              {texto}
            </button>
          ))}
        </div>

        {!lista.length ? (
          <div className="glass rounded-2xl p-5 text-center text-sm text-ink-soft">Aún nadie abre videos, historias, preguntas ni fotos en estos días.</div>
        ) : (
          <ul className="glass divide-y divide-line rounded-2xl">
            {visibles.map((c) => (
              <li key={`${c.tipo}|${c.nombre}`} className="flex items-center gap-3 p-3">
                <span className="grid w-12 shrink-0 place-items-center" aria-hidden>
                  <Miniatura tipo={c.tipo} portada={r.miniaturas?.[claveVideo(c.nombre)]} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold text-ink">{c.nombre}</p>
                  <p className="mt-0.5 text-xs text-ink-mute">
                    {TIPOS[c.tipo].nombre}
                    {c.tipo === "historia" || c.tipo === "foto" ? "" : ` · ${nf(c.wa)} ${c.wa === 1 ? "toque a WhatsApp" : "toques a WhatsApp"}`}
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg-3" aria-hidden>
                    <div className="h-full rounded-full" style={{ width: `${Math.max(3, (c[orden] / maximo) * 100)}%`, background: "var(--brand-2)" }} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold leading-tight text-ink">{nf(c[orden])}</p>
                  <p className="text-[11px] text-ink-mute">{orden === "aperturas" ? (c.aperturas === 1 ? "apertura" : "aperturas") : "WhatsApp"}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {lista.length > MAX_FILAS && (
          <button type="button" onClick={() => setTodos((t) => !t)} className="btn-ghost w-full px-4 py-2.5 text-sm sm:w-auto">
            {todos ? "Ver menos" : `Ver los ${nf(lista.length)}`}
          </button>
        )}
        <p className="text-xs text-ink-mute">
          «Apertura» = tocaron para verlo (video, historia completa, pregunta, foto en grande). Los toques a WhatsApp son los del botón dentro de ese contenido; las historias y las fotos no tienen botón propio.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg text-ink">Otros toques</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ListaBarras titulo="Recomendaciones «Para ti» que tocan" ayuda="Lo que eligen de la lista que aparece al marcar «¿Qué quieres proteger hoy?»." filas={r.recomendaciones} vacio="Aún nadie toca una recomendación." />
          <ListaBarras
            titulo="Carruseles"
            ayuda="Cuántas veces deslizaron cada uno."
            filas={[
              { nombre: "Seguros", n: r.carruseles.productos },
              { nombre: "Testimonios", n: r.carruseles.testimonios },
              { nombre: "Reconocimientos", n: r.carruseles.reconocimientos },
              { nombre: "Videos", n: r.carruseles.videos },
              { nombre: "Eventos", n: r.carruseles.eventos },
            ].filter((x) => x.n > 0)}
            vacio="Aún nadie desliza los carruseles."
          />
          <ListaBarras titulo="Redes y recursos" ayuda="Lo que tocan de «Sigue mis canales» y «Recursos»." filas={[...r.redes, ...r.recursos].sort((a, b) => b.n - a.n).slice(0, 8)} vacio="Sin toques todavía." />
          <ListaBarras titulo="Productos (historial)" ayuda="Toques anteriores en «Quiero información» de cada seguro (ese botón ya no está en las tarjetas)." filas={r.productos} vacio="Sin toques de productos." />
        </div>
      </section>
    </div>
  );
}
