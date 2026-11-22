import type { Metadata } from "next";
import { BotonInicio } from "@/components/ui/BotonInicio";
import { BookHero } from "@/components/libro/BookHero";
import { VideoAutor } from "@/components/libro/VideoAutor";
import { ProblemSection } from "@/components/libro/ProblemSection";
import { TransformationSection } from "@/components/libro/TransformationSection";
import { SevenSteps } from "@/components/libro/SevenSteps";
import { ProductDemo } from "@/components/libro/ProductDemo";
import { BookBundle } from "@/components/libro/BookBundle";
import { ForWhom } from "@/components/libro/ForWhom";
import { AuthorSection } from "@/components/libro/AuthorSection";
import { FAQSection } from "@/components/libro/FAQSection";
import { FinalOffer } from "@/components/libro/FinalOffer";
import { StickyBuyButton } from "@/components/libro/StickyBuyButton";
import { GuiaGratisCTA } from "@/components/libro/GuiaGratisCTA";
import { Lista } from "@/components/libro/ui";
import { CORREO_CONTACTO } from "@/lib/libro";

/**
 * Página de ventas del libro «De la Agenda al Algoritmo» (la que se da a Hotmart como «Página de ventas»).
 * También es la página de actualizaciones que enlaza el Anexo F del libro: sección #actualizaciones al final.
 *
 * Rediseño 2026-11-15 según la auditoría: portada → problema → transformación → siete escalones → demostración →
 * qué incluye → para quién → autor → preguntas → oferta final. Cada bloque vive en components/libro/.
 * Venta abierta/cerrada, precio y checkout: lib/libro.ts.
 *
 * El texto de venta sale de proyectos/ebook-mano-derecha-digital/venta/1-Ficha-de-venta.docx (lo revisó el abogado):
 * si cambia la ficha (venta.js), cambiar aquí lo mismo. No agregar promesas, testimonios ni nombres de aseguradoras.
 */

// Cada edición nueva agrega una fila; debe coincidir con el «Registro de ediciones» del Anexo F.
const EDICIONES = [{ edicion: "Primera edición", fecha: "Noviembre de 2026", cambios: "Versión inicial del libro." }];

const TITULO = "De la Agenda al Algoritmo · Libro para agentes de seguros";
const DESCRIPCION =
  "Libro paso a paso para agentes de seguros que quieren usar la inteligencia artificial en su trabajo de todos los días, sin saber programar. PDF, USD $29.99 más impuestos, garantía de 7 días.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: "/libro" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "De la Agenda al Algoritmo",
    description: DESCRIPCION,
    url: "/libro",
    type: "website",
    locale: "es_MX",
    images: [{ url: "/img/libro/og-libro.jpg", width: 1200, height: 1200, alt: "Portada del libro «De la Agenda al Algoritmo»" }],
  },
};

const SABER_ANTES = [
  <>
    Es una obra educativa. No es asesoría jurídica, fiscal, financiera ni actuarial, y <strong className="text-ink">no garantiza ventas ni resultados</strong>.
  </>,
  "La experiencia que el autor cuenta en la introducción es personal y no garantiza resultados semejantes.",
  "La inteligencia artificial puede equivocarse: el libro te enseña a revisar siempre lo que entrega antes de enviarlo a un cliente.",
  "Es un libro independiente. No está afiliado, patrocinado ni respaldado por Anthropic (Claude) ni por Microsoft (Visual Studio Code). Sus nombres pertenecen a sus dueños.",
  "Las pantallas, los planes y las políticas de esas herramientas cambian con el tiempo. Consulta siempre su versión vigente.",
  "Los datos reales de tus clientes se usan solo con su autorización y con los cuidados que explica el Capítulo 6. Revisa también el contrato con tu aseguradora o agencia.",
];

const DATOS: [string, React.ReactNode][] = [
  ["Producto", "Libro digital «De la Agenda al Algoritmo» en PDF, con sus dos bonos en PDF."],
  ["ISBN", "978-970-95706-0-1 (libro digital en PDF, primera edición, noviembre de 2026)."],
  [
    "Contacto",
    <>
      Correo:{" "}
      <a href={`mailto:${CORREO_CONTACTO}`} className="text-brand-2 underline">
        {CORREO_CONTACTO}
      </a>
      <br />
      WhatsApp o teléfono: 81 8280 0234
      <br />
      Horario: lunes a viernes, de 9:00 a 18:00 h
    </>,
  ],
  ["Plataforma de venta", "Hotmart. El pago se hace en su sitio; el autor no recibe ni guarda los datos de tu tarjeta."],
  [
    "Precio total",
    <>
      <strong className="text-ink">USD $29.99</strong> (dólares estadounidenses) <strong className="text-ink">más impuestos</strong>. Pago único. En
      México se suma el IVA y Hotmart te muestra el total en pesos antes de pagar. Los medios de pago son los que Hotmart te muestre al comprar.
    </>,
  ],
  [
    "Entrega",
    "Acceso inmediato cuando se confirma tu pago, en el área de miembros de Hotmart. Hotmart te envía por correo los datos para entrar. Si pasadas 24 horas no tienes acceso, escríbenos.",
  ],
  [
    "Formato y requisitos",
    "PDF de unos 7 MB. Se abre con cualquier lector de PDF, en computadora, tableta o celular. Para seguir los pasos necesitas lo indicado en «Lo que necesitas aparte».",
  ],
  [
    "Licencia",
    "Personal, no exclusiva e intransferible. Puedes adaptar las plantillas y los mensajes en tu práctica profesional. No puedes revender ni redistribuir el libro, completo o por partes.",
  ],
  [
    "Garantía y reembolso",
    <>
      <strong className="text-ink">7 días naturales</strong> desde tu compra para pedir que te devuelvan el precio pagado, desde Hotmart, sin necesidad de
      explicar tus razones. Descargar el libro no te hace perder esta garantía ni los derechos que la ley te da como consumidor.
    </>,
  ],
  ["Comprobante fiscal", "Hotmart emite el comprobante fiscal de tu compra con los datos que captures al pagar."],
  [
    "Dudas y reclamaciones",
    "Escríbenos al correo de contacto. Respondemos en 3 días hábiles. También puedes acudir a la Procuraduría Federal del Consumidor (Profeco).",
  ],
];

export default function LibroPage() {
  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <BotonInicio />

        <BookHero />

        <div className="mt-20 space-y-24 text-base leading-relaxed text-ink-soft sm:mt-28 sm:space-y-32 sm:text-lg">
          <VideoAutor />
          <ProblemSection />
          <TransformationSection />
          <SevenSteps />
          <ProductDemo />
          <BookBundle />
          <ForWhom />
          <AuthorSection />
          <FAQSection />

          <div className="space-y-8">
            <FinalOffer />
            <GuiaGratisCTA />

            <section className="glass-soft rounded-[24px] p-6 sm:p-8">
              <h2 className="font-display text-xl text-ink sm:text-2xl">Lo que debes saber antes de comprar</h2>
              <div className="text-base">
                <Lista items={SABER_ANTES} marca="•" />
              </div>
            </section>
          </div>

          {/* ---------- Actualizaciones (enlace del Anexo F, para quien ya compró) ---------- */}
          <section id="actualizaciones" className="mx-auto max-w-3xl scroll-mt-6">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">Actualizaciones del libro</h2>
            <p className="mt-4">
              Aquí se publican las pantallas actualizadas y los cambios de cada edición del libro. Las ediciones nuevas no tienen costo para quien ya
              compró el libro.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-base">
                <thead>
                  <tr className="border-b border-white/20 text-ink">
                    <th className="py-2 pr-4 font-semibold">Edición</th>
                    <th className="py-2 pr-4 font-semibold">Fecha</th>
                    <th className="py-2 font-semibold">Qué cambió</th>
                  </tr>
                </thead>
                <tbody>
                  {EDICIONES.map((e) => (
                    <tr key={e.edicion} className="border-b border-line">
                      <td className="py-2 pr-4">{e.edicion}</td>
                      <td className="py-2 pr-4">{e.fecha}</td>
                      <td className="py-2">{e.cambios}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3 className="mt-6 font-display text-xl text-ink">Si algo se ve distinto en tu pantalla</h3>
            <p className="mt-2">
              Los programas se actualizan seguido: un botón puede cambiar de nombre o de lugar. No es un error tuyo ni del libro. Sigue el método del
              Anexo F del libro («Cuando algo se ve distinto») y, si sigues atorado, escríbenos a{" "}
              <a href={`mailto:${CORREO_CONTACTO}`} className="text-brand-2 underline">
                {CORREO_CONTACTO}
              </a>
              . Respondemos en 3 días hábiles.
            </p>
          </section>

          <div className="mx-auto max-w-3xl space-y-8">
            {/* ---------- Datos de la venta: al final y contraídos (quien quiera verlos da clic) ---------- */}
            <details className="group scroll-mt-6 rounded-2xl border border-line" id="datos">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block font-display text-xl text-ink sm:text-2xl">Datos de la venta</span>
                  <span className="mt-1 block text-sm text-ink-mute">Contacto, precio, entrega, licencia y garantía</span>
                </span>
                <span className="mas" aria-hidden="true" />
              </summary>
              <div className="border-t border-line px-1 pb-1">
                <dl className="divide-y divide-line text-base">
                  {DATOS.map(([k, v]) => (
                    <div key={k} className="grid gap-1 px-5 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
                      <dt className="font-semibold text-ink">{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </details>

            <p className="text-sm text-ink-mute">
              © 2026 Roberto Rodríguez. Todos los derechos reservados. ·{" "}
              <a href="/libro/terminos" className="underline hover:text-ink-soft">
                Términos de venta
              </a>{" "}
              ·{" "}
              <a href="/libro/privacidad" className="underline hover:text-ink-soft">
                Aviso de privacidad
              </a>
            </p>
          </div>
        </div>
      </main>
      <StickyBuyButton />
    </>
  );
}
