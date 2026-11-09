"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { CONTENIDO } from "@/lib/landing-content";
import { enviarCotizacionServidor } from "@/lib/cotizacion-cliente";
import { dispararConversionLead } from "@/lib/pixels";
import { FormularioCotizacion } from "./FormularioCotizacion";
import { PopupActividad } from "./PopupActividad";
import { AgendaCita } from "./AgendaCita";
import { Logo } from "@/components/ui/Logo";
import { BotonInicio } from "@/components/ui/BotonInicio";
import { Halloween } from "./Halloween";

interface LandingProps {
  negocio: string;
  popupActivo: boolean;
  /** Overrides editables desde /admin (si están vacíos, se usa lib/landing-content.ts). */
  heroTitulo?: string;
  heroCta?: string;
}

const aparecer = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5 },
};

/**
 * Orden de la página (el mismo de /roberto, adaptado a la campaña de bebé):
 *  1 Inicio · 2 ¿Qué necesitas proteger? · 3 Cómo funciona · 4 ¿Por qué asesorarte conmigo? · 5 Testimonios
 *  6 Trayectoria y reconocimientos · 7 Herramientas y recursos · 8 Preguntas frecuentes · 9 Cotiza tu seguro y contacto.
 */
const MENU = [
  { id: "proteger", texto: "Qué proteger" },
  { id: "como-funciona", texto: "Cómo funciona" },
  { id: "quien", texto: "Por qué yo" },
  { id: "opiniones", texto: "Testimonios" },
  { id: "trayectoria", texto: "Trayectoria" },
  { id: "recursos", texto: "Recursos" },
  { id: "faq", texto: "FAQ" },
];
const IDS_MENU = MENU.map((m) => m.id);

/** Sección que está cruzando la parte alta de la pantalla (para marcar su botón en el menú). */
function useSeccionActiva(ids: string[]): string {
  const [activa, setActiva] = useState("");
  useEffect(() => {
    const elementos = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => e !== null);
    if (!elementos.length || typeof IntersectionObserver === "undefined") return;
    const visibles = new Set<string>();
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) visibles.add(e.target.id);
          else visibles.delete(e.target.id);
        }
        setActiva(ids.find((id) => visibles.has(id)) ?? "");
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    elementos.forEach((e) => observador.observe(e));
    return () => observador.disconnect();
  }, [ids]);
  return activa;
}

export function Landing({ negocio, popupActivo, heroTitulo, heroCta }: LandingProps) {
  const c = CONTENIDO;
  const nombre = negocio || c.negocio;
  const titulo = heroTitulo || c.hero.titulo;
  const cta = heroCta || c.hero.cta;
  const activa = useSeccionActiva(IDS_MENU);
  const whatsappUrl = `https://wa.me/${c.contacto.whatsapp}?text=${encodeURIComponent(c.contacto.mensajeWhatsapp)}`;

  return (
    <>
      {/* Menú fijo: secciones + botón de cotizar siempre a la vista (también en el celular) */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-2">
          <a href="#inicio" aria-label="Ir al inicio">
            <Logo mini />
          </a>
          <nav aria-label="Secciones de la página" className="hidden items-center gap-1 lg:flex">
            {MENU.map((m) => (
              <a
                key={m.id}
                href={`#${m.id}`}
                aria-current={activa === m.id ? "true" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  activa === m.id ? "bg-glass text-ink ring-1 ring-[var(--line-strong)]" : "text-ink-soft hover:text-ink"
                }`}
              >
                {m.texto}
              </a>
            ))}
          </nav>
          <a href="#cotizacion" className="btn-primary btn-sm shrink-0">
            Cotiza tu seguro
          </a>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 pb-24 pt-4 sm:pt-8">
        <Halloween />
        {/* Regreso a la página principal (la tarjeta de Roberto): el mismo botón «‹ Inicio» del resto del sitio. */}
        <BotonInicio />

        {/* 1. INICIO */}
        <section id="inicio" className="grid scroll-mt-24 items-center gap-5 pt-6 sm:gap-10 sm:pt-10 lg:grid-cols-2 lg:pt-14">
          <motion.div {...aparecer}>
            <span className="chip">
              <Icon icon="flat-color-icons:like" width={16} /> {c.eyebrow}
            </span>
            <h1 className="mt-5 font-display text-4xl leading-[1.08] sm:text-5xl lg:text-[3.4rem]">
              <span className="text-gradient-brand">{titulo}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">{c.hero.subtitulo}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#cotizacion" className="btn-primary anim-pulse-glow scanbeam-once text-lg">
                <Icon icon="flat-color-icons:calculator" width={22} /> Cotiza tu seguro
              </a>
              <AgendaCita href={c.contacto.agendaUrl} embed={c.contacto.agendaEmbed} className="btn-ghost">
                <Icon icon="flat-color-icons:calendar" width={22} /> {cta}
              </AgendaCita>
            </div>
            <p className="mt-3 text-sm text-ink-mute">Asesoría inicial sin costo · Sin compromiso</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-ink-mute">
              <Icon icon="flat-color-icons:lock" width={18} /> Tus datos están protegidos.
            </div>
          </motion.div>

          <motion.div {...aparecer} className="order-first lg:order-last">
            {/* Video sin audio. Celular/tablet: franja a lo ancho cuyo alto se ajusta a la
                pantalla (svh) para que el título se lea sin hacer scroll. Desktop: vertical 9:16. */}
            <div className="glass relative mx-auto h-[clamp(130px,calc(100svh-490px),420px)] w-full overflow-hidden rounded-[28px] sm:max-w-xl lg:aspect-[9/16] lg:h-auto lg:max-w-[340px]">
              <video
                src="/video/maternidad.mp4"
                poster="/video/maternidad-poster.jpg"
                className="h-full w-full object-cover object-[50%_38%] lg:object-center"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden
              />
            </div>
          </motion.div>
        </section>

        {/* Barra de confianza (parte del inicio) */}
        <motion.section {...aparecer} className="mt-16 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {c.confianza.map((item) => (
            <span key={item} className="chip">
              <Icon icon="flat-color-icons:ok" width={16} /> {item}
            </span>
          ))}
        </motion.section>

        {/* 2. ¿QUÉ NECESITAS PROTEGER? */}
        <section id="proteger" className="scroll-mt-24 pt-24">
          <motion.div {...aparecer} className="mx-auto max-w-3xl text-center">
            <span className="chip">Empieza aquí</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl">{c.proteger.titulo}</h2>
            <p className="mt-3 text-lg text-ink-soft">{c.proteger.texto}</p>
          </motion.div>

          <motion.div {...aparecer} className="glass-highlight flow-pulse mx-auto mt-10 max-w-2xl rounded-[28px] p-8 text-center sm:p-12">
            <p className="holo-text font-display text-5xl sm:text-6xl">{c.datoDestacado.numero}</p>
            <p className="mx-auto mt-3 max-w-md text-ink-soft">{c.datoDestacado.texto}</p>
          </motion.div>

          <div id="beneficios" className="scroll-mt-24 pt-14">
            <motion.h3 {...aparecer} className="text-center font-display text-2xl sm:text-3xl">
              Qué ganas con tu asesoría
            </motion.h3>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {c.beneficios.map((b, i) => (
                <motion.div
                  key={b.titulo}
                  {...aparecer}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="glass card-3d lift rounded-3xl p-6 text-center"
                >
                  <Icon icon={b.icono} width={46} className="mx-auto" />
                  <h3 className="mt-4 font-display text-xl text-ink">{b.titulo}</h3>
                  <p className="mt-2 text-sm text-ink-soft">{b.texto}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. CÓMO FUNCIONA */}
        <section id="como-funciona" className="scroll-mt-24 pt-24">
          <motion.h2 {...aparecer} className="text-center font-display text-3xl sm:text-4xl">
            Así de simple es tu asesoría
          </motion.h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {c.comoFunciona.map((paso, i) => (
              <motion.div
                key={paso.numero}
                {...aparecer}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="glass relative rounded-3xl p-6"
              >
                <span className="font-display text-sm text-ink-mute">Paso {paso.numero}</span>
                <Icon icon={paso.icono} width={40} className="mt-3" />
                <h3 className="mt-3 font-display text-lg text-ink">{paso.titulo}</h3>
                <p className="mt-2 text-sm text-ink-soft">{paso.texto}</p>
              </motion.div>
            ))}
          </div>

          {/* Oferta: qué te llevas (reciprocidad) */}
          <motion.div {...aparecer} className="glass-strong mt-10 rounded-[28px] p-8 sm:p-12">
            <h3 className="font-display text-2xl sm:text-3xl">{c.oferta.titulo}</h3>
            <ul className="mt-6 grid gap-4 sm:grid-cols-3">
              {c.oferta.puntos.map((p) => (
                <li key={p} className="flex items-start gap-3 text-ink-soft">
                  <Icon icon="flat-color-icons:ok" width={26} className="shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </section>

        {/* 4. ¿POR QUÉ ASESORARTE CONMIGO? */}
        <section id="quien" className="scroll-mt-24 pt-24">
          <motion.div {...aparecer} className="mx-auto max-w-3xl text-center">
            <span className="chip">Conóceme</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl">{c.quien.titulo}</h2>
            <p className="mt-3 text-lg text-ink-soft">{c.quien.texto}</p>
          </motion.div>

          <motion.div {...aparecer} className="glass mx-auto mt-10 grid max-w-4xl items-center gap-8 rounded-[28px] p-6 sm:p-10 md:grid-cols-[260px_1fr]">
            <figure className="mx-auto w-full max-w-[260px]">
              <Image
                src={c.quien.foto.src}
                alt={c.quien.foto.alt}
                width={c.quien.foto.ancho}
                height={c.quien.foto.alto}
                sizes="260px"
                className="h-auto w-full rounded-2xl ring-1 ring-[var(--line-strong)]"
              />
              <figcaption className="mt-3 text-center text-xs text-ink-mute">{c.quien.cedula}</figcaption>
            </figure>
            <div>
              {c.quien.parrafos.map((p) => (
                <p key={p} className="text-lg leading-relaxed text-ink-soft">
                  {p}
                </p>
              ))}
              <p className="mt-5 rounded-2xl border border-[var(--line-strong)] bg-glass px-5 py-4 text-ink">{c.quien.nota}</p>
            </div>
          </motion.div>

          {/* Para quién es / no es */}
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <motion.div {...aparecer} className="glass rounded-3xl p-6 sm:p-8">
              <h3 className="flex items-center gap-2 font-display text-xl text-ink">
                <Icon icon="flat-color-icons:ok" width={26} /> Esta asesoría es para ti si…
              </h3>
              <ul className="mt-5 space-y-3">
                {c.paraQuienEs.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm text-ink-soft">
                    <Icon icon="flat-color-icons:checkmark" width={18} className="mt-0.5 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div {...aparecer} className="glass rounded-3xl p-6 sm:p-8">
              <h3 className="flex items-center gap-2 font-display text-xl text-ink">
                <Icon icon="flat-color-icons:cancel" width={26} /> No es para ti si…
              </h3>
              <ul className="mt-5 space-y-3">
                {c.paraQuienNo.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm text-ink-soft">
                    <Icon icon="flat-color-icons:cancel" width={18} className="mt-0.5 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        {/* 5. TESTIMONIOS */}
        <section id="opiniones" className="scroll-mt-24 pt-24">
          <motion.h2 {...aparecer} className="text-center font-display text-3xl sm:text-4xl">
            Esto no es una promesa. Es lo que vivieron estas familias.
          </motion.h2>
          {c.testimonios.map((t) => (
            <motion.div
              key={t.nombre}
              {...aparecer}
              className="glass-highlight mx-auto mt-10 max-w-4xl rounded-[28px] p-5 sm:p-10 md:grid md:grid-cols-[300px_1fr] md:items-start md:gap-10"
            >
              {/* La foto completa (sin recortar): arriba en el celular, a la izquierda en la compu */}
              <Image
                src={t.foto}
                alt={`${t.nombre}, familia asegurada`}
                width={t.fotoAncho}
                height={t.fotoAlto}
                sizes="(min-width: 768px) 300px, 100vw"
                className="h-auto w-full rounded-2xl ring-1 ring-[var(--line-strong)] md:sticky md:top-24"
              />
              <div className="px-1 pt-5 sm:px-0 md:pt-0">
                <Icon icon="flat-color-icons:feedback" width={36} className="opacity-80" />
                {/* Frase destacada: palabras textuales del cliente, en grande; abajo, su historia completa */}
                {t.destacada && <p className="mt-4 font-display text-xl leading-snug text-ink sm:text-2xl">“{t.destacada}”</p>}
                <TextoTestimonio texto={t.texto} />
                <div className="mt-6 border-t border-[var(--line)] pt-4">
                  <p className="font-display text-ink">{t.nombre}</p>
                  <p className="text-sm text-ink-mute">Protegidos con una póliza de gastos médicos mayores</p>
                </div>
              </div>
            </motion.div>
          ))}
        </section>

        {/* 6. TRAYECTORIA Y RECONOCIMIENTOS (junto a los testimonios) */}
        <section id="trayectoria" className="scroll-mt-24 pt-24">
          <motion.div {...aparecer} className="mx-auto max-w-3xl text-center">
            <span className="chip">Mi trayectoria</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl">{c.trayectoria.titulo}</h2>
            <p className="mt-3 text-lg text-ink-soft">{c.trayectoria.texto}</p>
          </motion.div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
            {c.trayectoria.fotos.map((f, i) => (
              <motion.figure
                key={f.id}
                {...aparecer}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                className="glass overflow-hidden rounded-2xl"
              >
                <a href={`/tarjeta/reconocimientos/${f.id}.jpg`} target="_blank" rel="noopener noreferrer" aria-label={`Ver la foto completa: ${f.pie}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- fotos estáticas ya optimizadas, compartidas con /roberto */}
                  <img
                    src={`/tarjeta/reconocimientos/${f.id}.webp`}
                    alt={f.alt}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/3] w-full object-cover"
                    style={{ objectPosition: f.pos }}
                  />
                </a>
                <figcaption className="px-3 py-2.5 text-xs text-ink-soft sm:text-sm">{f.pie}</figcaption>
              </motion.figure>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href={c.trayectoria.enlace} className="btn-ghost">
              Ver mi trayectoria completa <Icon icon="flat-color-icons:right" width={18} />
            </a>
          </div>
        </section>

        {/* 7. HERRAMIENTAS Y RECURSOS (después de la confianza: testimonios y trayectoria) */}
        <section id="recursos" className="scroll-mt-24 pt-24">
          <motion.div {...aparecer} className="mx-auto max-w-3xl text-center">
            <span className="chip">Aprende y calcula</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl">{c.recursos.titulo}</h2>
            <p className="mt-3 text-lg text-ink-soft">{c.recursos.texto}</p>
          </motion.div>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {c.recursos.items.map((r, i) => (
              <motion.a
                key={r.url}
                href={r.url}
                {...aparecer}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="glass lift group flex items-start gap-4 rounded-3xl p-6"
              >
                <Icon icon={r.icono} width={40} className="shrink-0" />
                <span className="min-w-0">
                  <span className="block font-display text-lg text-ink">{r.titulo}</span>
                  <span className="mt-1 block text-sm text-ink-soft">{r.texto}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-2">
                    Abrir <Icon icon="flat-color-icons:right" width={16} />
                  </span>
                </span>
              </motion.a>
            ))}
          </div>
        </section>

        {/* 8. PREGUNTAS FRECUENTES */}
        <section id="faq" className="scroll-mt-24 pt-24">
          <motion.h2 {...aparecer} className="text-center font-display text-3xl sm:text-4xl">
            Preguntas frecuentes
          </motion.h2>
          <div className="mx-auto mt-10 max-w-2xl space-y-4">
            {c.faq.map((f) => (
              <motion.details key={f.pregunta} {...aparecer} className="glass group rounded-2xl p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-display text-base text-ink">
                  {f.pregunta}
                  <span className="mas" aria-hidden="true" />
                </summary>
                <p className="mt-3 text-sm text-ink-soft">{f.respuesta}</p>
              </motion.details>
            ))}
          </div>
        </section>

        {/* 9. COTIZA TU SEGURO Y CONTACTO */}
        <section id="cotizacion" className="scroll-mt-24 pt-24">
          <motion.div {...aparecer} className="grid items-start gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl text-gradient-blue sm:text-4xl">{c.ctaFinal.titulo}</h2>
              <p className="mt-4 max-w-md text-lg text-ink-soft">{c.ctaFinal.texto}</p>

              <div className="mt-8 max-w-md rounded-3xl border border-[var(--line-strong)] bg-glass p-5">
                <p className="font-display text-lg text-ink">¿Prefieres escribirme directo?</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                    <Icon icon="logos:whatsapp-icon" width={22} /> WhatsApp
                  </a>
                  <a href={`tel:${c.contacto.telefonoIntl}`} className="btn-ghost">
                    <Icon icon="flat-color-icons:phone" width={22} /> {c.contacto.telefono}
                  </a>
                </div>
                <AgendaCita href={c.contacto.agendaUrl} embed={c.contacto.agendaEmbed} className="btn-ghost mt-3 w-full">
                  <Icon icon="flat-color-icons:calendar" width={22} /> Agendar mi asesoría gratis
                </AgendaCita>
              </div>
            </div>

            {/* Formulario «Cotiza tu seguro»: el mismo de /roberto. Llega al CRM como «Sitio web» (en el mensaje queda «Desde: landing»). */}
            <FormularioCotizacion
              onEnviar={enviarCotizacionServidor}
              titulo="Solicita tu asesoría sin costo"
              nota="Cuéntame qué necesitas y te escribo por WhatsApp para platicar tus opciones."
              origen="landing"
              valoresIniciales={{ tipoSeguro: "gmm", paraQuien: "familia" }}
              onExito={dispararConversionLead}
            />
          </motion.div>
        </section>

        {/* FOOTER */}
        <footer className="mt-24 border-t border-line pt-8 text-center text-sm text-ink-mute">
          <p>
            © {nombre}.{" "}
            <a href="/privacidad" className="underline hover:text-ink-soft">
              Aviso de privacidad
            </a>
          </p>
          <p className="mt-2 text-xs">Tus datos se usan solo para contactarte sobre tu asesoría.</p>
        </footer>

        <PopupActividad activo={popupActivo} />
      </main>
    </>
  );
}

/** Párrafos que se ven antes de "Leer la historia completa" (las historias largas no tapan la página en el celular). */
const PARRAFOS_VISIBLES = 4;

function TextoTestimonio({ texto }: { texto: string }) {
  const parrafos = texto.split(/\n\s*\n/);
  const largo = parrafos.length > PARRAFOS_VISIBLES;
  const [abierto, setAbierto] = useState(false);
  const cortado = largo && !abierto;
  const visibles = cortado ? parrafos.slice(0, PARRAFOS_VISIBLES) : parrafos;
  return (
    <>
      <blockquote className="mt-4 space-y-4 whitespace-pre-line text-lg leading-relaxed text-ink-soft">
        {visibles.map((p, i) => (
          <p key={i}>
            {i === 0 && "“"}
            {cortado && i === visibles.length - 1 ? `${p.replace(/[.…]+$/, "")}…` : p}
            {i === visibles.length - 1 && !cortado && "”"}
          </p>
        ))}
      </blockquote>
      {largo && (
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="mt-4 text-sm font-semibold text-brand-2 underline underline-offset-4 hover:text-ink"
        >
          {abierto ? "Ver menos" : "Leer la historia completa"}
        </button>
      )}
    </>
  );
}
