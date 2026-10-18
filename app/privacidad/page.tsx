import type { Metadata } from "next";
import { getAjustes } from "@/lib/db";
import { CONTENIDO } from "@/lib/landing-content";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  robots: { index: true, follow: true },
};

/**
 * Aviso de privacidad (LFPDPPP, México). Declara explícitamente que, además de
 * los datos del formulario, podemos registrar IP/ubicación aproximada y tipo de
 * dispositivo (por los encabezados de Vercel) con fines analíticos.
 * ⚠️ Personaliza los datos del responsable (nombre, correo, domicilio).
 */
export default async function PrivacidadPage() {
  const ajustes = await getAjustes().catch(() => null);
  const negocio = ajustes?.negocio_nombre || CONTENIDO.negocio;
  const whatsapp = ajustes?.whatsapp_url || "";

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      {/* <a> normal: /roberto es un archivo estático (rewrite), no una página de Next */}
      <a href="/roberto" className="text-sm text-ink-mute underline hover:text-ink-soft">
        ← Volver
      </a>
      <h1 className="mt-6 font-display text-3xl sm:text-4xl">Aviso de privacidad</h1>
      <p className="mt-2 text-sm text-ink-mute">Última actualización: 15 de octubre de 2026.</p>

      <div className="prose-acm mt-8 space-y-5 text-ink-soft">
        <section>
          <h2 className="font-display text-xl text-ink">1. Responsable</h2>
          <p>
            {negocio} (en adelante, “nosotros”), con domicilio en {CONTENIDO.contacto.domicilio} y correo de
            contacto <a href={`mailto:${CONTENIDO.contacto.correo}`} className="text-brand-2 underline">{CONTENIDO.contacto.correo}</a>,
            es responsable del tratamiento de tus datos personales conforme a la Ley Federal de Protección de Datos
            Personales en Posesión de los Particulares (LFPDPPP).
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">2. Datos que recabamos</h2>
          <ul className="list-disc pl-5">
            <li>Los que nos das en el formulario: <strong>nombre, correo electrónico y teléfono</strong>.</li>
            <li>
              Datos técnicos automáticos: <strong>dirección IP, ubicación aproximada (país/ciudad/región) y tipo de
              dispositivo</strong>, obtenidos de los encabezados de nuestro proveedor de hospedaje (Vercel), con fines
              estadísticos y de seguridad.
            </li>
            <li>El origen de tu visita (etiquetas UTM de campañas), para saber cómo llegaste.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">3. Para qué los usamos</h2>
          <p>
            Para contactarte, darte seguimiento, ofrecerte nuestros productos o servicios y mejorar nuestra atención. No
            vendemos tus datos a terceros.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">4. Tus derechos (ARCO)</h2>
          <p>
            Puedes solicitar el Acceso, Rectificación, Cancelación u Oposición al tratamiento de tus datos, así como
            revocar tu consentimiento, escribiéndonos a{" "}
            <a href={`mailto:${CONTENIDO.contacto.correo}`} className="text-brand-2 underline">
              {CONTENIDO.contacto.correo}
            </a>
            {whatsapp && (
              <>
                {" "}
                o por{" "}
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-brand-2 underline">
                  WhatsApp
                </a>
              </>
            )}
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">5. Seguridad</h2>
          <p>
            Resguardamos tus datos con medidas técnicas razonables. Tu información se almacena de forma protegida y solo
            nuestro equipo autorizado puede consultarla.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">6. Medición de la tarjeta digital</h2>
          <p>
            En la tarjeta digital (/roberto) contamos de forma <strong>anónima</strong> qué se toca —por ejemplo, «se vio la
            sección Seguros» o «se tocó el botón de WhatsApp»—, si la visita fue desde un celular o una computadora y, si el
            enlace lo indica, desde qué red llegaste (por ejemplo, Instagram). Esta medición <strong>no usa cookies, no guarda
            tu dirección IP, tu nombre ni tu teléfono</strong> y no puede relacionarse contigo; sirve únicamente para saber qué
            partes de la tarjeta funcionan y mejorarlas.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">7. App «Dinero Bajo Control»</h2>
          <p>
            La app gratuita «Dinero Bajo Control» (/semana) tiene su propio aviso de privacidad, porque maneja información distinta: lo que
            escribes se queda en tu teléfono y solo recibimos tus datos si tú pides que te contactemos. Léelo en{" "}
            <a href="/privacidad/semana" className="text-brand-2 underline">
              Aviso de privacidad · Dinero Bajo Control
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
