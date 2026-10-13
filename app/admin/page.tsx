import { redirect } from "next/navigation";

/**
 * Antes aquí había un panel suelto que se abría con un código fijo (sin contraseña ni doble factor).
 * Ya no existe: el panel de administración vive dentro del CRM («Panel de admin» en el menú) y solo lo abre
 * una sesión de administrador con su código del celular.
 */
export default function AdminPage() {
  redirect("/crm");
}
