"use client";

import { Icon } from "@iconify/react";
import { AvatarEmpleado, type VarianteAvatar } from "./AvatarEmpleado";

export type Pestana =
  | "tablero"
  | "pendientes"
  | "cotizaciones"
  | "contactos"
  | "clientes"
  | "perdidos"
  | "reportes"
  | "panel"
  | "crecimiento"
  | "tarjeta"
  | "videos-tarjeta"
  | "polizas"
  | "roro"
  | "sofi"
  | "valeri"
  | "camila"
  | "dana"
  | "clara"
  | "admin";

export interface OpcionMenu {
  id: Pestana;
  nombre: string;
  /** Para qué sirve, en 3-4 palabras. */
  pista: string;
  icono: string;
  /** Tus empleados digitales se reconocen por su cara. */
  avatar?: VarianteAvatar;
}

interface GrupoMenu {
  titulo: string;
  soloAdmin: boolean;
  opciones: OpcionMenu[];
}

export const GRUPOS_MENU: GrupoMenu[] = [
  {
    titulo: "Ventas",
    soloAdmin: false,
    opciones: [
      { id: "tablero", nombre: "Mi día", pista: "Pendientes y etapa de cada prospecto", icono: "flat-color-icons:flow-chart" },
      { id: "pendientes", nombre: "Mis pendientes", pista: "Anota lo de hoy y táchalo al terminar", icono: "flat-color-icons:todo-list" },
      { id: "cotizaciones", nombre: "Cotizaciones", pista: "Compáralas y mándalas por WhatsApp", icono: "flat-color-icons:calculator" },
      { id: "contactos", nombre: "Prospectos", pista: "A quién sigues atendiendo", icono: "flat-color-icons:grid" },
      { id: "clientes", nombre: "Clientes ganados", pista: "Tus ventas cerradas y su póliza", icono: "flat-color-icons:approval" },
      { id: "perdidos", nombre: "Perdidos", pista: "Para ofrecerles otro seguro", icono: "flat-color-icons:undo" },
      { id: "reportes", nombre: "Embudo de ventas", pista: "Arrastra cada prospecto de etapa", icono: "flat-color-icons:statistics" },
    ],
  },
  {
    // Módulo 3 (AI Manager): tus finanzas y tu equipo digital son solo para el administrador.
    titulo: "Tu negocio",
    soloAdmin: true,
    opciones: [
      { id: "panel", nombre: "Panel de Mando", pista: "Tu meta y tu dinero", icono: "flat-color-icons:combo-chart" },
      { id: "crecimiento", nombre: "Crecimiento", pista: "Producción por año y ramo", icono: "flat-color-icons:line-chart" },
      { id: "polizas", nombre: "Pólizas", pista: "Adjunta nuevas y renovaciones", icono: "flat-color-icons:file" },
      { id: "tarjeta", nombre: "Tarjeta web", pista: "Qué toca la gente en tu tarjeta", icono: "flat-color-icons:globe" },
      { id: "videos-tarjeta", nombre: "Videos de la tarjeta", pista: "Sube un video y sale solo", icono: "flat-color-icons:film-reel" },
    ],
  },
  {
    titulo: "Tu equipo digital",
    soloAdmin: true,
    opciones: [
      { id: "roro", nombre: "Robert", pista: "Tu gerente: pregúntale", icono: "flat-color-icons:assistant", avatar: "roro" },
      { id: "sofi", nombre: "Sofi", pista: "Seguimiento a prospectos", icono: "flat-color-icons:sms", avatar: "sofi" },
      { id: "valeri", nombre: "Valeri", pista: "Cobranza de hoy", icono: "flat-color-icons:debt", avatar: "valeri" },
      { id: "camila", nombre: "Camila", pista: "Venta cruzada a tus clientes", icono: "flat-color-icons:shop", avatar: "camila" },
      { id: "dana", nombre: "Dana", pista: "Chubb Autos: renovaciones y recibos", icono: "flat-color-icons:automotive", avatar: "dana" },
      { id: "clara", nombre: "Clara", pista: "Reportes y clientes por ramo", icono: "flat-color-icons:document", avatar: "clara" },
    ],
  },
  {
    titulo: "Administración",
    soloAdmin: true,
    opciones: [
      { id: "admin", nombre: "Panel de admin", pista: "Leads, ajustes y usuarios", icono: "flat-color-icons:settings" },
    ],
  },
];

export function opcionDe(id: Pestana): OpcionMenu {
  return GRUPOS_MENU.flatMap((g) => g.opciones).find((o) => o.id === id) ?? GRUPOS_MENU[0].opciones[0];
}

interface MenuLateralProps {
  negocio: string;
  nombre: string;
  esAdmin: boolean;
  activa: Pestana;
  onElegir: (id: Pestana) => void;
  onSalir: () => void;
  /** Solo en el celular: botón para cerrar el menú. */
  onCerrar?: () => void;
}

/**
 * El menú de tu CRM, a la izquierda y agrupado por lo que haces:
 * vender, ver cómo va tu negocio y hablar con tu equipo digital.
 */
export function MenuLateral({ negocio, nombre, esAdmin, activa, onElegir, onSalir, onCerrar }: MenuLateralProps) {
  return (
    <nav className="flex min-h-full flex-col lg:h-full" aria-label="Menú del CRM">
      <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-4">
        <div className="min-w-0">
          <p className="font-display text-base leading-tight text-ink">{negocio}</p>
          <p className="mt-1 text-xs text-ink-mute">
            Hola, {nombre} · {esAdmin ? "Administrador" : "Vendedor"}
          </p>
        </div>
        {onCerrar && (
          <button type="button" onClick={onCerrar} className="-mr-1 rounded-lg px-2 py-1 text-xl leading-none text-ink-mute hover:text-ink" aria-label="Cerrar menú">
            ×
          </button>
        )}
      </div>

      <div className="no-scrollbar flex-1 space-y-4 px-3 py-3 lg:overflow-y-auto">
        {GRUPOS_MENU.filter((g) => esAdmin || !g.soloAdmin).map((g) => (
          <div key={g.titulo}>
            <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-mute">{g.titulo}</p>
            <ul className="space-y-1">
              {g.opciones.map((o) => {
                const activo = o.id === activa;
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => onElegir(o.id)}
                      aria-current={activo ? "page" : undefined}
                      className={`flex min-h-[46px] w-full items-center gap-3 rounded-xl border px-2.5 py-1.5 text-left transition-colors ${
                        activo ? "border-brand-2/70 bg-brand/20" : "border-transparent hover:bg-bg-3/60"
                      }`}
                    >
                      {o.avatar ? (
                        <AvatarEmpleado variante={o.avatar} tamano={30} enLinea={false} />
                      ) : (
                        <span className="flex w-[30px] shrink-0 justify-center">
                          <Icon icon={o.icono} width={24} aria-hidden />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className={`block text-sm ${activo ? "font-semibold text-ink" : "font-medium text-ink-soft"}`}>{o.nombre}</span>
                        <span className="block truncate text-xs text-ink-mute">{o.pista}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line px-3 py-2">
        <button type="button" onClick={onSalir} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-2.5 text-left text-sm text-ink-soft hover:bg-bg-3/60 hover:text-ink">
          <span className="flex w-[30px] justify-center">
            <Icon icon="flat-color-icons:export" width={22} aria-hidden />
          </span>
          Salir
        </button>
      </div>
    </nav>
  );
}
