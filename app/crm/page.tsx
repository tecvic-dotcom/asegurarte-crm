"use client";

import { useEffect, useState } from "react";
import { crmLeads } from "@/lib/api";
import { LoginCRM } from "@/components/crm/LoginCRM";
import { CRMApp } from "@/components/crm/CRMApp";
import type { Lead, Sesion } from "@/lib/types";

type Estado = "cargando" | "login" | "app";
const SESION_KEY = "acm.sesion";

/**
 * Ruta del CRM. La autorización REAL la hace el servidor (cookie firmada): si
 * /api/crm/leads responde 401, mostramos el login. La sesión que guardamos en
 * localStorage es SOLO para mostrar el nombre/rol — no es seguridad.
 */
export default function CrmPage() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sesion, setSesion] = useState<Sesion | null>(null);

  function leerSesionLocal(): Sesion {
    try {
      const raw = localStorage.getItem(SESION_KEY);
      if (raw) return JSON.parse(raw) as Sesion;
    } catch {
      /* ignore */
    }
    return { id: "", nombre: "Equipo", correo: "", rol: "vendedor" };
  }

  useEffect(() => {
    crmLeads()
      .then((ls) => {
        setLeads(ls);
        setSesion(leerSesionLocal());
        setEstado("app");
      })
      .catch(() => setEstado("login"));
  }, []);

  async function onLogin(s: Sesion) {
    try {
      localStorage.setItem(SESION_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
    setSesion(s);
    setLeads(await crmLeads().catch(() => []));
    setEstado("app");
  }

  function onLogout() {
    try {
      localStorage.removeItem(SESION_KEY);
    } catch {
      /* ignore */
    }
    setSesion(null);
    setEstado("login");
  }

  if (estado === "cargando") {
    return <main className="grid min-h-[80vh] place-items-center text-ink-mute">Cargando tu CRM…</main>;
  }
  if (estado === "login" || !sesion) {
    return <LoginCRM onLogin={onLogin} />;
  }
  return <CRMApp sesion={sesion} inicial={leads} onLogout={onLogout} />;
}
