"use client";

// Re-exporta el <Icon> de Iconify como componente de CLIENTE, para poder usar
// íconos a color también dentro de Server Components (gracias, privacidad) sin
// romper la frontera servidor/cliente.
export { Icon } from "@iconify/react";
