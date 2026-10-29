import "server-only";

/**
 * Medición ANÓNIMA de la tarjeta digital (/roberto) — SOLO SERVIDOR.
 *  - NUBE: tabla tarjeta_eventos (sin IP ni datos personales; ver supabase/migrations/0019_tarjeta_eventos.sql).
 *  - DEMO: eventos en memoria; arranca con una muestra inventada para ver cómo luce el panel.
 */
import { adminDb, cloudReady } from "./supabase-admin";
import { faltaMigracion, MENSAJE_MIGRACION_TARJETA, MigracionPendienteError } from "./migracion";
import { hoyLocal } from "./fechas";
import { resumir, type FilaEvento, type ResumenTarjeta } from "./tarjeta-reglas";

const MAX_DEMO = 20_000;
const PAGINA = 1000; // PostgREST entrega 1000 filas por consulta: se pide por páginas
const MAX_FILAS = 100_000;

/** Muestra de demostración: ~30 días de visitas con un embudo creíble (determinista). */
function semilla(): FilaEvento[] {
  const filas: FilaEvento[] = [];
  let s = 11;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const elige = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
  const productos = ["Seguro de Vida", "Gastos Médicos Mayores", "Ahorro y Retiro", "PPR / Planeación Fiscal", "Protección Patrimonial", "Seguro de Auto"];
  const historias = ["Istmenia y Carlos", "Tere y Mauricio", "Nere y Sergio"];
  const videos = ["Todo estaba bien… hasta que sonó el teléfono", "¿Planean tener un bebé? Esto casi nadie lo dice", "¿Casados… o socios financieros?", "Tus hijos podrían terminar manteniéndote", "¿Los seguros son un lujo o una herramienta?"];
  const preguntas = ["¿Los seguros son demasiado caros?", "¿La aseguradora realmente me va a pagar?", "¿Qué seguro debería contratar primero?", "¿Puedo contratar un seguro si ya tengo una enfermedad?"];
  const fotos = ["En la recepción", "Sala de rayos X", "La entrada de la nueva clínica", "Mesa de Campeones Vida", "Congreso Nacional de Agentes"];
  const chips = ["Mi salud", "Mi familia", "Mi retiro", "Mi casa", "Mi auto", "Mis impuestos"];
  const fuentes = ["directo", "directo", "wa", "wa", "ig", "qr", "l.facebook.com", "tiktok"];
  for (let d = 29; d >= 0; d--) {
    const visitas = 14 + Math.floor(rnd() * 30) + (d % 7 === 2 ? 14 : 0);
    for (let i = 0; i < visitas; i++) {
      const t = Date.now() - d * 86_400_000 - Math.floor(rnd() * 12 * 3_600_000);
      const base = { dispositivo: rnd() < 0.82 ? "movil" : "escritorio", fuente: elige(fuentes) };
      const e = (evento: string, detalle = "", dt = 0) => filas.push({ creado_en: new Date(t + dt * 1000).toISOString(), evento, detalle, ...base });
      e("vista");
      const llega = ["quien", "promociones", "herramientas", "seguros", "asesoria", "opiniones", "reconocimientos", "videos", "eventos", "faq", "recursos", "contacto"];
      const hasta = rnd() < 0.18 ? 0 : 1 + Math.floor(rnd() * rnd() * 11);
      llega.slice(0, hasta).forEach((id, k) => e("sec", id, 5 + k * 6));
      if (hasta > 1 && rnd() < 0.2) e("promo", "Halloween · Seguro de Auto", 12);
      if (hasta > 1 && rnd() < 0.06) e("wa", "promo:Halloween · Seguro de Auto", 16);
      if (hasta > 1 && rnd() < 0.45) e("car", "productos", 20);
      if (hasta > 3 && rnd() < 0.5) e("car", "testimonios", 40);
      if (hasta > 3 && rnd() < 0.3) e("historia", elige(historias), 50);
      if (hasta > 4 && rnd() < 0.3) { e("car", "reconocimientos", 52); e("foto", elige(fotos), 54); }
      if (hasta > 5 && rnd() < 0.5) { e("car", "videos", 55); e("reel", elige(videos), 58); }
      if (hasta > 6 && rnd() < 0.35) { e("car", "eventos", 62); e("foto", elige(fotos), 64); }
      if (hasta > 7 && rnd() < 0.4) e("faq", elige(preguntas), 70);
      if (hasta > 2 && rnd() < 0.12) e("rec", elige(["producto:Gastos Médicos Mayores", "producto:Seguro de Vida", "video:¿Casados… o socios financieros?", "pregunta:¿Qué seguro debería contratar primero?"]), 40);
      if (hasta > 2 && rnd() < 0.2) e("chip", elige(chips), 35);
      if (hasta > 0 && rnd() < 0.1) {
        e("bot", "abrir", 30);
        const tema = elige(["Familia", "Vida con ahorro", "Negocio", "Gastos médicos", "Contacto"]);
        e("bot", `tema:${tema}`, 34);
        if (rnd() < 0.6) e("bot", `p:${elige(["Cuánto seguro de vida necesito", "Es una inversión", "Quién puede contratarlo", "Se deduce de impuestos", "La aseguradora me va a pagar"])}`, 40);
        if (rnd() < 0.25) e("bot", `pagina:${elige(["Calculadora", "Vida con ahorro", "Hombre clave"])}`, 46);
        if (rnd() < 0.2) e("wa", `asistente:${tema}`, 50);
      }
      if (rnd() < 0.09) e("wa", "hero", 12);
      if (hasta > 1 && rnd() < 0.05) e("wa", `producto:${elige(productos)}`, 30);
      if (hasta > 2 && rnd() < 0.05) e("wa", "asesoria:Mi familia", 45);
      if (rnd() < 0.015) e("llamar", "hero", 10);
      if (rnd() < 0.02) e("agendar", "hero", 14);
      if (rnd() < 0.04) e("guardar", "hero", 16);
      if (hasta > 4 && rnd() < 0.08) e("red", elige(["Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn"]), 70);
    }
    // «Dinero Bajo Control»: un embudo creíble para ver cómo luce la tarjeta del panel.
    const abren = 3 + Math.floor(rnd() * 9);
    for (let i = 0; i < abren; i++) {
      const t = Date.now() - d * 86_400_000 - Math.floor(rnd() * 12 * 3_600_000);
      const base = { dispositivo: rnd() < 0.9 ? "movil" : "escritorio", fuente: elige(["wa", "wa", "ig", "qr", "directo", "tiktok"]) };
      const e = (evento: string, detalle = "", dt = 0) => filas.push({ creado_en: new Date(t + dt * 1000).toISOString(), evento, detalle, ...base });
      e("sf_abrir");
      if (rnd() < 0.3) e("sf_plan", "ejemplo", 20);
      if (rnd() < 0.45) {
        e("sf_plan", "plan", 150);
        if (rnd() < 0.12) e("sf_instalar", "", 200);
        if (rnd() < 0.2) e("sf_pdf", (rnd() < 0.7 ? "descarga" : "compartir") + (rnd() < 0.25 ? "-mes" : rnd() < 0.1 ? "-anio" : ""), 300);
        if (rnd() < 0.3) {
          if (rnd() < 0.55) { e("sf_wa", "datos", 400); e("sf_dato", rnd() < 0.9 ? "nuevo" : "repetido", 401); }
          else e("sf_wa", "directo", 400);
        }
      }
    }
  }
  return filas;
}

function demoStore(): FilaEvento[] {
  const g = globalThis as typeof globalThis & { __tarjetaEventos?: FilaEvento[] };
  if (!g.__tarjetaEventos) g.__tarjetaEventos = semilla();
  return g.__tarjetaEventos;
}

export type NuevoEvento = Pick<FilaEvento, "evento" | "detalle" | "dispositivo" | "fuente">;

/** Guarda un toque. Nunca lanza: si falla, la tarjeta sigue igual. */
export async function registrarEventoTarjeta(ev: NuevoEvento): Promise<void> {
  try {
    if (cloudReady && adminDb) {
      const { error } = await adminDb.from("tarjeta_eventos").insert(ev);
      if (error && !faltaMigracion(error)) console.error("[tarjeta-eventos]", error.message);
      return;
    }
    const s = demoStore();
    s.push({ creado_en: new Date().toISOString(), ...ev });
    if (s.length > MAX_DEMO) s.splice(0, s.length - MAX_DEMO);
  } catch (e) {
    console.error("[tarjeta-eventos]", e);
  }
}

async function leerDesde(desdeISO: string): Promise<FilaEvento[]> {
  if (!(cloudReady && adminDb)) return demoStore().filter((f) => f.creado_en >= desdeISO);
  const filas: FilaEvento[] = [];
  for (let a = 0; a < MAX_FILAS; a += PAGINA) {
    const { data, error } = await adminDb
      .from("tarjeta_eventos")
      .select("creado_en, evento, detalle, dispositivo, fuente")
      .gte("creado_en", desdeISO)
      .order("id", { ascending: true })
      .range(a, a + PAGINA - 1);
    if (error) {
      if (faltaMigracion(error)) throw new MigracionPendienteError(MENSAJE_MIGRACION_TARJETA, "0019_tarjeta_eventos.sql");
      throw new Error(error.message);
    }
    filas.push(...(data as FilaEvento[]));
    if (!data || data.length < PAGINA) break;
  }
  return filas;
}

/** Los últimos 30 y 7 días con UNA sola lectura (es lo que le sirve a Robert, el gerente digital). */
export async function resumenesParaManager(): Promise<{ d30: ResumenTarjeta; d7: ResumenTarjeta }> {
  const hoy = hoyLocal();
  const filas = await leerDesde(new Date(Date.now() - 31 * 86_400_000).toISOString());
  return { d30: { ...resumir(filas, 30, hoy), cloud: cloudReady }, d7: { ...resumir(filas, 7, hoy), cloud: cloudReady } };
}

/** Resumen de los últimos 7, 30 o 90 días, con el periodo anterior de igual largo para compararlo. */
export async function resumenTarjeta(dias: number): Promise<ResumenTarjeta> {
  const d = [7, 30, 90].includes(dias) ? dias : 30;
  const filas = await leerDesde(new Date(Date.now() - (2 * d + 1) * 86_400_000).toISOString());
  return { ...resumir(filas, d, hoyLocal()), cloud: cloudReady };
}
