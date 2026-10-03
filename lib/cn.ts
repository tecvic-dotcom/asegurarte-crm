import { clsx, type ClassValue } from "clsx";

/** Une clases de Tailwind condicionalmente (azúcar sobre clsx). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
