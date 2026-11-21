import type { Metadata } from "next";

/**
 * Aviso de privacidad de la GUÍA GRATUITA del libro (/guia-ia). Redactado por RORO el 2026-11-21 a partir del aviso de compra del libro
 * (/libro/privacidad). APROBADO por el abogado el 2026-11-21. Si se cambia, que lo vuelva a revisar.
 */
export const metadata: Metadata = {
  title: "Aviso de privacidad · Guía gratuita · De la Agenda al Algoritmo",
  description: "Aviso de privacidad de la guía gratuita «10 actividades de tu negocio que puedes delegar a la inteligencia artificial».",
  robots: { index: true, follow: true },
};

const fila = "grid gap-1 px-4 py-3 sm:grid-cols-[14rem_1fr]";

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <a href="/guia-ia" className="text-sm text-ink-mute underline hover:text-ink-soft">
        ← Volver
      </a>
      <h1 className="mt-6 font-display text-3xl sm:text-4xl">Aviso de privacidad</h1>
      <p className="mt-2 text-base text-ink-soft">Guía gratuita «10 actividades de tu negocio que puedes delegar a la inteligencia artificial»</p>
      <p className="mt-1 text-sm text-ink-mute">Última actualización: 21 de noviembre de 2026</p>

      <div className="prose-acm mt-8 space-y-6 text-ink-soft">
        <section>
          <h2 className="font-display text-xl text-ink">1 · Quién es el responsable de tus datos</h2>
          <dl className="mt-2 divide-y divide-black/10 rounded-lg border border-black/10 text-sm">
            <div className={fila}>
              <dt className="font-semibold text-ink">Responsable</dt>
              <dd>Roberto Javier Rodríguez González</dd>
            </div>
            <div className={fila}>
              <dt className="font-semibold text-ink">Domicilio</dt>
              <dd>América #520, colonia Centro, C.P. 64000, Monterrey, Nuevo León.</dd>
            </div>
            <div className={fila}>
              <dt className="font-semibold text-ink">Correo para asuntos de privacidad</dt>
              <dd>
                <a href="mailto:rdz.roberto@outlook.com" className="text-brand-2 underline">
                  rdz.roberto@outlook.com
                </a>
              </dd>
            </div>
          </dl>
          <p>Este aviso se refiere solo a la guía gratuita y a los correos sobre el libro. La compra del libro tiene su propio aviso.</p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">2 · Qué datos recabamos</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Los que escribes en el formulario: tu nombre y tu correo electrónico.</li>
            <li>
              Los que se obtienen al enviarlo: la fecha en que aceptaste este aviso, tu país y ciudad aproximados (según tu conexión), el tipo de
              dispositivo y, si llegaste desde un anuncio o una publicación, cuál fue.
            </li>
            <li>Si te das de baja, la fecha en que lo hiciste.</li>
          </ul>
          <p>No recabamos datos personales sensibles ni datos de pago.</p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">3 · Para qué los usamos</h2>
          <p>Para lo que pediste:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Entregarte la guía en pantalla y enviártela a tu correo.</li>
            <li>Atender tus dudas si respondes a nuestros correos.</li>
          </ul>
          <p>Y, si no te opones, para:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Mandarte algunos correos con ideas para aplicar la guía y con información del libro «De la Agenda al Algoritmo».</li>
            <li>Saber qué publicaciones o anuncios traen a más personas, con cifras agrupadas.</li>
          </ul>
          <p>
            Puedes oponerte a estos dos últimos usos cuando quieras: cada correo trae una liga para darte de baja, o puedes escribirnos al correo de
            privacidad.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">4 · Con quién compartimos tus datos</h2>
          <p>Solo con los proveedores que nos ayudan a prestar el servicio, que los tratan por nuestra cuenta:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Resend</strong>, el servicio que envía los correos.
            </li>
            <li>
              <strong>Supabase</strong>, donde se guarda la lista, y <strong>Vercel</strong>, donde está alojado el sitio.
            </li>
            <li>
              <strong>Microsoft (Outlook)</strong>, el correo del autor, cuando respondes a un correo.
            </li>
            <li>
              Las <strong>autoridades</strong>, cuando una ley o una orden válida nos lo exija.
            </li>
          </ul>
          <p>
            No vendemos tus datos ni los usamos para ofrecerte seguros. Estos proveedores pueden almacenar o procesar datos en servidores fuera de
            México.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">5 · Tus derechos</h2>
          <p>
            Tienes derecho a <strong>conocer</strong> qué datos tenemos de ti, a <strong>corregirlos</strong>, a pedir que los <strong>eliminemos</strong>{" "}
            y a <strong>oponerte</strong> a ciertos usos (derechos ARCO). También puedes <strong>retirar tu consentimiento</strong>. Es gratuito.
          </p>
          <p>
            Escribe a{" "}
            <a href="mailto:rdz.roberto@outlook.com" className="text-brand-2 underline">
              rdz.roberto@outlook.com
            </a>{" "}
            con tu nombre, el correo con el que pediste la guía y qué quieres hacer. Te responderemos por el mismo medio en un plazo máximo de 20 días y,
            si procede, lo haremos efectivo en los 15 días siguientes. Si consideras que tus derechos no fueron atendidos, puedes acudir ante la
            Secretaría Anticorrupción y Buen Gobierno.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">6 · Cuánto tiempo los guardamos</h2>
          <p>
            Mientras sigas en la lista. Si te das de baja, conservamos solo tu correo y la fecha de baja, para no volver a escribirte. Si nos pides que
            eliminemos tus datos, lo hacemos.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">7 · Cookies</h2>
          <p>Esta página usa las herramientas de medición del sitio solo si las aceptas en el aviso de cookies que aparece al entrar.</p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">8 · Menores de edad y cambios a este aviso</h2>
          <p>
            La guía está dirigida a personas adultas; no recabamos de manera intencional datos de menores de 18 años. Si cambia algo importante,
            publicaremos la nueva versión en esta misma página con su fecha.
          </p>
        </section>
      </div>
    </main>
  );
}
