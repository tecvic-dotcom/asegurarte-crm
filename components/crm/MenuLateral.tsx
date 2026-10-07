"use client";

import { Icon } from "@iconify/react";
import { AvatarEmpleado, type VarianteAvatar } from "./AvatarEmpleado";

export type Pestana =
  | "tablero"
  | "contactos"
  | "seguimiento"
  | "campanas"
  | "reportes"
  | "panel"
  | "crecimiento"
  | "polizas"
  | "roro"
  | "sofi"
  | "valeri"
  | "clara";

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
      { id: "tablero", nombre: "Tablero", pista: "Prospectos por etapa", icono: "flat-color-icons:flow-chart" },
      { id: "contactos", nombre: "Contactos", pista: "Tu lista completa", icono: "flat-color-icons:grid" },
      { id: "seguimiento", nombre: "Hoy", pista: "A quién darle seguimiento", icono: "flat-color-icons:alarm-clock" },
      { id: "campanas", nombre: "Campañas", pista: "Qué anuncio te trae clientes", icono: "flat-color-icons:advertising" },
      { id: "reportes", nombre: "Embudo", pista: "Conversión y origen", icono: "flat-color-icons:statistics" },
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
    ],
  },
  {
    titulo: "Tu equipo digital",
    soloAdmin: true,
    opciones: [
      { id: "roro", nombre: "RORO", pista: "Tu gerente: pregúntale", icono: "flat-color-icons:assistant", avatar: "roro" },
      { id: "sofi", nombre: "Sofi", pista: "Seguimiento a prospectos", icono: "flat-color-icons:sms", avatar: "sofi" },
      { id: "valeri", nombre: "Valeri", pista: "Cobranza de hoy", icono: "flat-color-icons:debt", avatar: "valeri" },
      { id: "clara", nombre: "Clara", pista: "Reportes de semana y mes", icono: "flat-color-icons:document", avatar: "clara" },
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

      <div className="grid grid-cols-2 gap-1 border-t border-line px-3 py-2">
        <a href="/admin" className="flex min-h-[44px] items-center gap-3 rounded-xl px-2.5 text-sm text-ink-soft hover:bg-bg-3/60 hover:text-ink">
          <span className="flex w-[30px] justify-center">
            <Icon icon="flat-color-icons:settings" width={22} aria-hidden />
          </span>
          Admin
        </a>
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
