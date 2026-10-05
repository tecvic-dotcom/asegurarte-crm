"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { CONTENIDO } from "@/lib/landing-content";
import { FormularioCaptura } from "./FormularioCaptura";
import { PopupActividad } from "./PopupActividad";
import { GlowOrb } from "./GlowOrb";
import { Logo } from "@/components/ui/Logo";

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

export function Landing({ negocio, popupActivo, heroTitulo, heroCta }: LandingProps) {
  const c = CONTENIDO;
  const nombre = negocio || c.negocio;
  const titulo = heroTitulo || c.hero.titulo;
  const cta = heroCta || c.hero.cta;

  return (
    <main className="relative mx-auto max-w-6xl px-5 pb-24 pt-10 sm:pt-16">
      {/* Marca */}
      <header className="flex items-center justify-between gap-3">
        <Logo compacto />
        <a href="#form" className="chip lift shrink-0">
          <span className="dot-online" /> Agenda gratis
        </a>
      </header>

      {/* 1. HÉROE */}
      <section className="grid items-center gap-10 pt-12 lg:grid-cols-2 lg:pt-16">
        <motion.div {...aparecer}>
          <span className="chip">
            <Icon icon="flat-color-icons:like" width={16} /> {c.eyebrow}
          </span>
          <h1 className="mt-5 font-display text-4xl leading-[1.08] sm:text-5xl lg:text-[3.4rem]">
            <span className="text-gradient-brand">{titulo}</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">{c.hero.subtitulo}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#form" className="btn-primary anim-pulse-glow scanbeam-once text-lg">
              <Icon icon="flat-color-icons:calendar" width={22} /> {cta}
            </a>
            <a href="#como-funciona" className="btn-ghost">Ver cómo funciona</a>
          </div>
          <div className="mt-6 flex items-center gap-2 text-sm text-ink-mute">
            <Icon icon="flat-color-icons:lock" width={18} /> Tus datos están protegidos.
          </div>
        </motion.div>

        <motion.div {...aparecer} className="order-first lg:order-last">
          <GlowOrb />
        </motion.div>
      </section>

      {/* 2. BARRA DE CONFIANZA */}
      <motion.section {...aparecer} className="mt-16 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {c.confianza.map((item) => (
          <span key={item} className="chip">
            <Icon icon="flat-color-icons:ok" width={16} /> {item}
          </span>
        ))}
      </motion.section>

      {/* 3. DATO GIGANTE */}
      <section className="pt-20">
        <motion.div {...aparecer} className="glass-highlight flow-pulse mx-auto max-w-2xl rounded-[28px] p-8 text-center sm:p-12">
          <p className="holo-text font-display text-5xl sm:text-6xl">{c.datoDestacado.numero}</p>
          <p className="mx-auto mt-3 max-w-md text-ink-soft">{c.datoDestacado.texto}</p>
        </motion.div>
      </section>

      {/* 4. BENEFICIOS */}
      <section id="beneficios" className="pt-24">
        <motion.h2 {...aparecer} className="text-center font-display text-3xl sm:text-4xl">
          Qué ganas con tu asesoría
        </motion.h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
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
      </section>

      {/* 5. CÓMO FUNCIONA */}
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

      {/* 6. PRUEBA SOCIAL */}
      <section className="pt-24">
        <motion.h2 {...aparecer} className="text-center font-display text-3xl sm:text-4xl">
          Esto no es una promesa. Es lo que vivieron estas familias.
        </motion.h2>
        {c.testimonios.map((t) => (
          <motion.div
            key={t.nombre}
            {...aparecer}
            className="glass-highlight mx-auto mt-10 max-w-3xl rounded-[28px] p-8 sm:p-12"
          >
            <Icon icon="flat-color-icons:feedback" width={36} className="opacity-80" />
            <TextoTestimonio texto={t.texto} />
            <div className="mt-6 flex items-center gap-4">
              <Image
                src={t.foto}
                alt={`${t.nombre}, familia asegurada`}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-[var(--line-strong)]"
              />
              <div>
                <p className="font-display text-ink">{t.nombre}</p>
                <p className="text-sm text-ink-mute">Protegidos con una póliza de gastos médicos mayores</p>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* 7. PARA QUIÉN ES / NO ES */}
      <section className="pt-24">
        <div className="grid gap-5 sm:grid-cols-2">
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

      {/* 8. FAQ */}
      <section className="pt-24">
        <motion.h2 {...aparecer} className="text-center font-display text-3xl sm:text-4xl">
          Preguntas frecuentes
        </motion.h2>
        <div className="mx-auto mt-10 max-w-2xl space-y-4">
          {c.faq.map((f) => (
            <motion.details key={f.pregunta} {...aparecer} className="glass group rounded-2xl p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-display text-base text-ink">
                {f.pregunta}
                <Icon icon="flat-color-icons:plus" width={20} className="shrink-0 transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-3 text-sm text-ink-soft">{f.respuesta}</p>
            </motion.details>
          ))}
        </div>
      </section>

      {/* 9. CTA FINAL + FORMULARIO */}
      <section id="form" className="scroll-mt-24 pt-24">
        <motion.div {...aparecer} className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl text-gradient-blue sm:text-4xl">{c.ctaFinal.titulo}</h2>
            <p className="mt-4 max-w-md text-lg text-ink-soft">{c.ctaFinal.texto}</p>
          </div>
          <FormularioCaptura titulo={c.formulario.titulo} nota={c.formulario.nota} boton={c.ctaFinal.cta} />
        </motion.div>
      </section>

      {/* 10. FOOTER */}
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
