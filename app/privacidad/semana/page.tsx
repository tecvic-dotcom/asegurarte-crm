import type { Metadata } from "next";
import { getAjustes } from "@/lib/db";
import { CONTENIDO } from "@/lib/landing-content";
import { AVISO_SEMANA_VERSION } from "@/lib/semana-reglas";

export const metadata: Metadata = {
  title: "Aviso de privacidad · Mi Semana Familiar",
  robots: { index: true, follow: true },
};

/**
 * Aviso de privacidad PROPIO de la app «Mi Semana Familiar» (/semana). Describe lo que la app realmente hace:
 * las cifras se quedan en el teléfono, hay un contador anónimo y solo si la persona lo pide se guardan su contacto y su semáforo.
 * Si cambias lo que la app recaba, actualiza este texto y AVISO_SEMANA_VERSION (lib/semana-reglas.ts): esa versión
 * queda anotada en cada prospecto como prueba del consentimiento.
 */
export default async function PrivacidadSemanaPage() {
  const ajustes = await getAjustes().catch(() => null);
  const negocio = ajustes?.negocio_nombre || CONTENIDO.negocio;
  const whatsapp = ajustes?.whatsapp_url || "";
  const correo = CONTENIDO.contacto.correo;

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      {/* <a> normal: /semana es un archivo estático (rewrite), no una página de Next */}
      <a href="/semana" className="text-sm text-ink-mute underline hover:text-ink-soft">
        ← Volver a la app
      </a>
      <h1 className="mt-6 font-display text-3xl sm:text-4xl">Aviso de privacidad · Mi Semana Familiar</h1>
      <p className="mt-2 text-sm text-ink-mute">Versión {AVISO_SEMANA_VERSION} (18 de octubre de 2026).</p>

      <div className="prose-acm mt-8 space-y-5 text-ink-soft">
        <section>
          <h2 className="font-display text-xl text-ink">1. Responsable</h2>
          <p>
            {negocio} (en adelante, “nosotros”), con domicilio en {CONTENIDO.contacto.domicilio} y correo de contacto{" "}
            <a href={`mailto:${correo}`} className="text-brand-2 underline">
              {correo}
            </a>
            , es responsable del tratamiento de los datos personales que se describen aquí, conforme a la Ley Federal de Protección de
            Datos Personales en Posesión de los Particulares (LFPDPPP). Este aviso aplica solo a la app «Mi Semana Familiar»; el aviso del
            sitio y de la tarjeta digital está en{" "}
            <a href="/privacidad" className="text-brand-2 underline">
              /privacidad
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">2. Lo que escribes en la app se queda en tu teléfono</h2>
          <p>
            Para armar tu plan la app te pide el nombre de tu familia, cuántas personas viven en casa, tus ingresos, gastos fijos, deudas,
            ahorro, los seguros que ya tienes y los gastos que vayas anotando. <strong>Todo eso se guarda únicamente en tu dispositivo</strong>{" "}
            (en el almacenamiento del navegador o de la app instalada). <strong>No llega a nuestros servidores</strong> y nosotros no podemos
            verlo. Puedes borrarlo en cualquier momento con el botón «Borrar mis datos de este teléfono» o limpiando los datos del navegador.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">3. Medición anónima</h2>
          <p>
            Contamos de forma <strong>anónima</strong> cuántas veces se abre la app, cuántas veces alguien termina de armar su plan, cuántas
            veces se instala y cuántas veces se toca el botón de WhatsApp o se deja el contacto, y desde qué tipo de pantalla (celular o
            computadora) y qué enlace se llegó (por ejemplo, Instagram). Esta medición{" "}
            <strong>no usa cookies, no guarda tu dirección IP, tu nombre ni tu teléfono</strong> y no puede relacionarse contigo. Sirve solo
            para saber si la app es útil y mejorarla.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">4. Si pides que Roberto te contacte</h2>
          <p>Solo si tú lo pides, tocando «Quiero que Roberto me contacte» y marcando la casilla de autorización, recibimos y guardamos:</p>
          <ul className="list-disc pl-5">
            <li>
              <strong>Tu nombre, tu WhatsApp y, si quieres, tu correo.</strong>
            </li>
            <li>
              <strong>El semáforo de tu plan</strong>: un puntaje del 0 al 100, el color (verde, amarillo o rojo) de tu flujo mensual, fondo de
              emergencia, deudas y protección, los meses de fondo con que cuentas y qué seguros dijiste que te faltan.
            </li>
            <li>La fecha y hora de tu autorización y la versión de este aviso.</li>
          </ul>
          <p className="mt-2">
            <strong>No recibimos tus montos</strong> (ingresos, gastos, deudas ni ahorro), ni el nombre de tu familia, ni tu ubicación. Como
            el semáforo y lo que te falta proteger reflejan tu situación económica, los tratamos como datos patrimoniales y por eso te pedimos
            tu <strong>consentimiento expreso</strong> con la casilla de la app; sin ella no se envía nada.
          </p>
          <p className="mt-2">
            Para evitar abusos, el servidor usa tu dirección IP unos instantes para limitar envíos repetidos; <strong>no se guarda</strong> con tus
            datos.
          </p>
          <p className="mt-2">
            Si prefieres no dejar tus datos, puedes usar «Solo abrir WhatsApp»: se abre WhatsApp con un mensaje que tú ves y decides si
            mandas; en ese caso la app no nos envía nada.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">5. Para qué usamos tus datos</h2>
          <p>
            Para contactarte por WhatsApp, llamada o correo y orientarte sobre lo que te falta proteger, darle seguimiento a tu solicitud y,
            si así lo decides, cotizarte un seguro. No los usamos para fines distintos sin pedirte antes tu consentimiento y{" "}
            <strong>no vendemos tus datos</strong>.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">6. Con quién los compartimos</h2>
          <p>
            No transferimos tus datos a terceros para sus propios fines. Usamos proveedores de hospedaje, base de datos y correo que los
            tratan por nuestra cuenta y bajo nuestras instrucciones; algunos de sus servidores pueden estar fuera de México. Si tocas el
            botón de WhatsApp, la conversación se hace en esa aplicación y se rige por sus propios términos.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">7. Cuánto tiempo los conservamos</h2>
          <p>
            Mientras te demos seguimiento o tengamos una relación contigo. Si no avanzas, puedes pedir en cualquier momento que borremos tus
            datos.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">8. Tus derechos (ARCO) y cómo revocar tu consentimiento</h2>
          <p>
            Puedes solicitar el Acceso, Rectificación, Cancelación u Oposición al tratamiento de tus datos, o revocar tu consentimiento,
            escribiéndonos a{" "}
            <a href={`mailto:${correo}`} className="text-brand-2 underline">
              {correo}
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
            . Si consideras que tus derechos no fueron atendidos, puedes acudir ante la autoridad de protección de datos personales
            (actualmente, la Secretaría Anticorrupción y Buen Gobierno).
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">9. Solo para personas adultas</h2>
          <p>
            La app es para personas mayores de edad. No recabamos datos de menores: solo se pide cuántas personas viven en casa, como un
            número.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">10. Lo que la app es y lo que no es</h2>
          <p>
            «Mi Semana Familiar» es una herramienta de orientación educativa. No es asesoría financiera, fiscal ni legal, ni una cotización
            de seguros. Los cálculos se hacen con reglas fijas visibles en la propia app.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">11. Cambios a este aviso</h2>
          <p>
            Si cambia lo que la app recaba o cómo lo usa, publicaremos aquí la nueva versión antes de empezar a aplicarla. La versión
            vigente aparece al inicio de esta página.
          </p>
        </section>
      </div>
    </main>
  );
}
