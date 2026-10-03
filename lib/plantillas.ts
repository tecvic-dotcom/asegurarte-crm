/** Sustituye {nombre} por el nombre de pila del lead (primera palabra). Puro: usable en cliente y servidor. */
export function aplicarPlantilla(cuerpo: string, nombreLead: string): string {
  const primerNombre = (nombreLead || "").trim().split(/\s+/)[0] || "";
  return cuerpo.replaceAll("{nombre}", primerNombre);
}
