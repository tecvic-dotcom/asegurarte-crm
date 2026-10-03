"use client";

import { useRef } from "react";
import { Icon } from "@iconify/react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";

/**
 * Objeto "3D" ligero del héroe: una esfera de cristal con parallax al mover
 * el mouse (desktop) e inclinación suave. Sin React Three Fiber ni GSAP:
 * mismo efecto de profundidad premium con Framer Motion + CSS, sin pagar
 * el peso de una librería 3D completa (protege el LCP en móvil).
 */
export function GlowOrb() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-40, 40], [10, -10]), { stiffness: 120, damping: 14 });
  const rotateY = useSpring(useTransform(x, [-40, 40], [-10, 10]), { stiffness: 120, damping: 14 });

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set(e.clientX - (rect.left + rect.width / 2));
    y.set(e.clientY - (rect.top + rect.height / 2));
  }

  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative mx-auto aspect-square w-full max-w-sm select-none [perspective:900px]"
      aria-hidden
    >
      <motion.div
        style={{ rotateX: reduceMotion ? 0 : rotateX, rotateY: reduceMotion ? 0 : rotateY }}
        className="relative h-full w-full [transform-style:preserve-3d]"
      >
        {/* Halo exterior */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(91,123,255,0.55),rgba(42,34,245,0.12)_55%,transparent_75%)] blur-2xl anim-pulse-glow" />

        {/* Esfera de cristal */}
        <motion.div
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={reduceMotion ? undefined : { duration: 26, repeat: Infinity, ease: "linear" }}
          className="glass-strong absolute inset-6 rounded-full"
        >
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_200deg,rgba(255,255,255,0.18),transparent_30%,rgba(154,107,255,0.25)_60%,transparent_85%)]" />
          <div className="absolute left-[18%] top-[14%] h-10 w-16 rounded-full bg-white/30 blur-md" />
        </motion.div>

        {/* Anillo orbital con ícono (beneficio clave: protección) */}
        <motion.div
          animate={reduceMotion ? undefined : { rotate: -360 }}
          transition={reduceMotion ? undefined : { duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <div className="glass absolute -right-2 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-2xl anim-floaty">
            <Icon icon="flat-color-icons:family" width={30} />
          </div>
        </motion.div>

        <div className="glass absolute -left-3 bottom-6 flex h-12 w-12 items-center justify-center rounded-2xl anim-floaty" style={{ animationDelay: "1.2s" }}>
          <Icon icon="flat-color-icons:document" width={24} />
        </div>
      </motion.div>
    </div>
  );
}
