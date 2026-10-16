"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";

interface AgendaCitaProps {
  /** Enlace de la agenda: lo usa el botón si el navegador no soporta ventanas (se abre en otra pestaña). */
  href: string;
  /** La misma agenda lista para mostrarse dentro de la página. */
  embed: string;
  className?: string;
  children: ReactNode;
}

/**
 * Botón «Agenda tu cita» que abre el calendario de Google en una ventana DENTRO de la página (sin pestaña nueva).
 * El marco del calendario se crea al abrir y se quita al cerrar: así no deja entradas en el historial y el botón «atrás»
 * del celular siempre cierra la ventana. Al cerrar, la página queda exactamente donde estaba.
 */
export function AgendaCita({ href, embed, className, children }: AgendaCitaProps) {
  const dlg = useRef<HTMLDialogElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const marco = useRef<HTMLIFrameElement | null>(null);
  const desde = useRef<HTMLElement | null>(null);
  const est = useRef({ apilada: false, volviendo: false, y: 0 });

  const restaurar = () => {
    window.scrollTo(0, est.current.y);
    try {
      history.scrollRestoration = "auto";
    } catch {
      /* el navegador no deja cambiarlo: no pasa nada */
    }
  };

  // «Atrás» (gesto del celular o botón del navegador) cierra la ventana en vez de salir de la página.
  useEffect(() => {
    const alAtras = () => {
      const d = dlg.current;
      if (d?.open) {
        est.current.apilada = false;
        d.close();
        restaurar();
      } else if (est.current.volviendo) {
        est.current.volviendo = false;
        restaurar();
      }
    };
    window.addEventListener("popstate", alAtras);
    return () => window.removeEventListener("popstate", alAtras);
  }, []);

  const abrir = (e: MouseEvent<HTMLAnchorElement>) => {
    const d = dlg.current;
    if (!d || typeof d.showModal !== "function") return; // navegador muy viejo: el enlace abre otra pestaña
    e.preventDefault();
    desde.current = e.currentTarget;
    est.current.y = window.scrollY;
    try {
      history.scrollRestoration = "manual";
    } catch {
      /* igual se restaura a mano al cerrar */
    }
    const f = document.createElement("iframe");
    f.title = "Agenda de citas con Roberto Rodríguez";
    f.referrerPolicy = "no-referrer";
    f.src = embed;
    caja.current?.appendChild(f);
    marco.current = f;
    d.showModal();
    document.documentElement.style.overflow = "hidden";
    try {
      history.pushState({ agenda: 1 }, "");
      est.current.apilada = true;
    } catch {
      /* sin historial: se cierra con la X */
    }
  };

  const alCerrar = () => {
    marco.current?.remove();
    marco.current = null;
    document.documentElement.style.overflow = "";
    if (est.current.apilada) {
      est.current.apilada = false;
      est.current.volviendo = true;
      try {
        history.back();
      } catch {
        est.current.volviendo = false;
        restaurar();
      }
    } else {
      restaurar();
    }
    try {
      desde.current?.focus({ preventScroll: true });
    } catch {
      /* sin foco: no pasa nada */
    }
    desde.current = null;
  };

  return (
    <>
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={abrir}>
        {children}
      </a>
      <dialog
        ref={dlg}
        className="agenda-cita"
        aria-labelledby="agenda-cita-t"
        onClose={alCerrar}
        onClick={(e) => {
          if (e.target === dlg.current) dlg.current?.close(); // toque fuera de la ventana
        }}
      >
        <button type="button" className="agenda-cita-x" aria-label="Cerrar agenda" onClick={() => dlg.current?.close()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
        <div className="agenda-cita-dentro">
          <div className="agenda-cita-cabeza">
            <h3 id="agenda-cita-t">Agenda tu cita</h3>
            <a href={href} target="_blank" rel="noopener noreferrer">
              ¿No carga? Ábrela en otra pestaña
            </a>
          </div>
          <div className="agenda-cita-caja" ref={caja}>
            <p className="agenda-cita-carga">Cargando la agenda…</p>
          </div>
        </div>
      </dialog>
    </>
  );
}
