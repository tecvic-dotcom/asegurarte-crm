import type { Metadata } from "next";

/**
 * Página de ventas del libro «De la Agenda al Algoritmo» (la que se da a Hotmart como «Página de ventas»).
 * También es la página de actualizaciones que enlaza el Anexo F del libro: sección #actualizaciones al final.
 *
 * El texto de venta es el de proyectos/ebook-mano-derecha-digital/venta/1-Ficha-de-venta.docx (lo revisó el abogado):
 * si cambia la ficha (venta.js), cambiar aquí lo mismo. No agregar promesas, testimonios ni nombres de aseguradoras.
 */

// Enlace de pago de Hotmart. Mientras esté vacío, el botón dice «Muy pronto» y no lleva a ningún lado.
const CHECKOUT_URL = "https://pay.hotmart.com/V108500398J";

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

const SABRAS = [
  "Dejar funcionando tu asistente de inteligencia artificial en tu computadora con Windows.",
  "Resumir una póliza de ejemplo en diez líneas claras para tu cliente, y comprobar lo que te entrega.",
  "Escribir tu mensaje de seguimiento por WhatsApp con tu propio tono.",
  "Ordenar y renombrar los archivos de una carpeta desordenada.",
  "Darle a tu asistente un expediente para que te conozca y no empiece de cero cada día.",
  "Pedir bien: contexto, tarea y formato.",
  "Armar casos reales de lo fácil a lo difícil: un sitio de una página, un plan de contenido para tus redes, un tablero de cobranza y renovaciones, y un mini-CRM.",
  "Cuidar tu negocio: respaldos, privacidad de los datos de tus clientes, doble factor y qué hacer si algo sale mal.",
  "Seguir un plan de 30, 60 y 90 días con tu agenda real.",
];

const INCLUYE = [
  "El libro en PDF: más de 160 páginas, siete capítulos y seis anexos.",
  "34 imágenes paso a paso, para saber dónde hacer clic.",
  "35 mensajes listos para copiar y pegar, la plantilla del expediente de tu asistente, atajos de teclado, un glosario y una guía de rescate para cuando te trabes.",
  "Una hoja de seguimiento de los siete escalones, para marcar tus avances.",
];

const PARA_TI = [
  "Eres agente de seguros con experiencia y quieres sumar la tecnología sin dejar de ser tú.",
  "Sientes que las redes sociales y la computadora «no son lo tuyo», aunque en tu oficio te defiendes de maravilla.",
  "Quieres ahorrar tiempo en seguimiento, cobranza y contenido para tus redes.",
  "Te da un poco de miedo «romper algo» y quieres practicar con seguridad.",
];

const NO_PARA_TI = [
  "Esperas una fórmula mágica para vender sin trabajar.",
  "Quieres que la inteligencia artificial decida por ti sin que nadie revise.",
  "Buscas aprender a programar. Aquí usas la herramienta; no la programas.",
];

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
  ["Producto", "Libro digital «De la Agenda al Algoritmo» en PDF, con su bono en PDF."],
  [
    "Proveedor",
    <>
      Roberto Javier Rodríguez González
      <br />
      RFC: ROGR771202921
      <br />
      Domicilio: Trinidad Dávila 740, colonia Jerónimo Siller, C.P. 66250, San Pedro Garza García, Nuevo León.
    </>,
  ],
  [
    "Contacto",
    <>
      Correo:{" "}
      <a href="mailto:rdz.roberto@outlook.com" className="text-brand-2 underline">
        rdz.roberto@outlook.com
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
      México se suma el IVA y Hotmart te muestra el total en pesos antes de pagar; como ejemplo, el 14 de noviembre de 2026 el total era de $680.92
      MXN, IVA incluido, y puede variar con el tipo de cambio. Los medios de pago son los que Hotmart te muestre al comprar.
    </>,
  ],
  [
    "Entrega",
    "Acceso inmediato cuando se confirma tu pago, en el área de miembros de Hotmart. Hotmart te envía por correo los datos para entrar. Si pasadas 24 horas no tienes acceso, escríbenos.",
  ],
  [
    "Formato y requisitos",
    "PDF de unos 7 MB. Se abre con cualquier lector de PDF, en computadora, tableta o celular. Para seguir los pasos necesitas lo indicado en «Lo que necesitas».",
  ],
  [
    "Licencia",
    "Personal, no exclusiva e intransferible. Puedes adaptar las plantillas y los mensajes en tu práctica profesional. No puedes revender ni redistribuir el libro, completo o por partes.",
  ],
  [
    "Garantía y reembolso",
    <>
      <strong className="text-ink">7 días naturales</strong> desde tu compra para pedir que te devuelvan el precio pagado, desde Hotmart, sin necesidad de
      explicar tus razones. Descargar el libro no te hace perder esta garantía ni los derechos que la ley te da como consumidor. Más detalle en los{" "}
      <a href="/libro/terminos" className="text-brand-2 underline">
        términos de venta
      </a>
      .
    </>,
  ],
  ["Comprobante fiscal", "Hotmart emite el comprobante fiscal de tu compra con los datos que captures al pagar."],
  [
    "Dudas y reclamaciones",
    "Escríbenos al correo de contacto. Respondemos en 3 días hábiles. También puedes acudir a la Procuraduría Federal del Consumidor (Profeco).",
  ],
];

function BotonComprar({ grande = false }: { grande?: boolean }) {
  const clase = `btn-primary ${grande ? "text-lg" : ""}`;
  if (!CHECKOUT_URL) {
    return (
      <span className={`${clase} cursor-not-allowed opacity-60`} aria-disabled="true">
        Muy pronto a la venta
      </span>
    );
  }
  return (
    <a href={CHECKOUT_URL} className={clase} rel="noopener">
      Comprar el libro · USD $29.99
    </a>
  );
}

function Lista({ items, marca = "✓" }: { items: React.ReactNode[]; marca?: string }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden="true" className="mt-0.5 flex-none font-bold text-brand-2">
            {marca}
          </span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Seccion({ titulo, children, id }: { titulo: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="font-display text-2xl text-ink sm:text-3xl">{titulo}</h2>
      {children}
    </section>
  );
}

export default function LibroPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
      {/* <a> normal: /roberto es un archivo estático (rewrite), no una página de Next */}
      <a href="/roberto" className="text-sm text-ink-mute underline hover:text-ink-soft">
        ← Inicio
      </a>

      {/* ---------- Portada ---------- */}
      <header className="mt-6 grid items-center gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen estática ya optimizada (WebP 900 px) */}
        <img
          src="/img/libro/libro-3d.webp"
          alt="Portada del libro «De la Agenda al Algoritmo», de Roberto Rodríguez"
          width={900}
          height={900}
          className="mx-auto w-full max-w-sm rounded-[28px] md:max-w-none"
          fetchPriority="high"
        />
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-2">Libro digital · PDF</p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-ink sm:text-5xl">De la Agenda al Algoritmo</h1>
          <p className="mt-4 text-lg text-ink-soft sm:text-xl">
            Integra tu experiencia en seguros con el poder de la Inteligencia Artificial y la prospección digital en tu etapa de mayor experiencia.
          </p>
          <p className="mt-6 font-display text-4xl text-ink">
            USD $29.99 <span className="text-2xl text-ink-soft">+ impuestos</span>
          </p>
          <p className="mt-1 text-sm text-ink-mute">
            En México: $680.92 MXN con IVA incluido (14 de noviembre de 2026; varía con el tipo de cambio). Pago único · garantía de 7 días
            naturales
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <BotonComprar grande />
            <a href="#incluye" className="btn-ghost">
              Ver qué incluye
            </a>
          </div>
          <p className="mt-4 text-sm text-ink-mute">El pago se hace en Hotmart, que te muestra el total en pesos antes de pagar. Acceso inmediato cuando se confirma tu pago.</p>
        </div>
      </header>

      <div className="mt-16 space-y-14 text-base leading-relaxed text-ink-soft sm:text-lg">
        <Seccion titulo="En pocas palabras">
          <p className="mt-4">
            Es un libro paso a paso para agentes de seguros que quieren usar la inteligencia artificial en su trabajo de todos los días, sin saber
            programar y sin tecnicismos. Preparas tu computadora, le das a un asistente de inteligencia artificial la información de tu negocio y lo
            pones a ayudarte en tareas concretas: explicar una póliza, escribir tu seguimiento por WhatsApp, ordenar tus archivos.
          </p>
          <p className="mt-4">Son siete escalones. Cada uno termina en algo que ya funciona, y practicas siempre primero con datos inventados.</p>
        </Seccion>

        <Seccion titulo="Al terminarlo sabrás cómo">
          <Lista items={SABRAS} />
        </Seccion>

        <Seccion titulo="Qué incluye" id="incluye">
          <div className="mt-4 grid items-start gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div>
              <Lista items={INCLUYE} />
              <p className="glass-soft mt-6 rounded-2xl p-5">
                <strong className="text-ink">Bono:</strong> la guía visual de una página «Mi primera oficina inteligente con IA», que muestra cómo debe
                quedar tu espacio de trabajo al terminar los tres primeros escalones (PDF).
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- imagen estática ya optimizada (WebP 720 px) */}
            <img
              src="/img/libro/bono.webp"
              alt="Bono «Mi primera oficina inteligente con IA»: así debería verse tu espacio de trabajo al terminar los tres primeros escalones"
              width={720}
              height={900}
              loading="lazy"
              className="mx-auto w-full max-w-xs rounded-2xl border border-line"
            />
          </div>
        </Seccion>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="glass rounded-[24px] p-6 sm:p-8">
            <h2 className="font-display text-2xl text-ink">Es para ti si…</h2>
            <Lista items={PARA_TI} />
          </div>
          <div className="glass rounded-[24px] p-6 sm:p-8">
            <h2 className="font-display text-2xl text-ink">No es para ti si…</h2>
            <Lista items={NO_PARA_TI} marca="✕" />
          </div>
        </div>

        <Seccion titulo="Lo que necesitas">
          <Lista
            marca="•"
            items={[
              "Una computadora con Windows 11 (o Windows 10) y conexión a internet.",
              "Un correo electrónico y unos 30 minutos por sesión.",
              <>
                Un plan de pago de Claude. <strong className="text-ink">No está incluido en este producto</strong> y el autor no lo vende: consulta su
                precio y sus condiciones vigentes con el proveedor antes de contratar.
              </>,
              "Visual Studio Code, un programa gratuito de Microsoft que el libro te enseña a instalar.",
            ]}
          />
          <p className="mt-4">No necesitas saber programar, saber inglés ni una computadora nueva.</p>
        </Seccion>

        <Seccion titulo="Lo que debes saber antes de comprar">
          <Lista items={SABER_ANTES} marca="•" />
        </Seccion>

        <Seccion titulo="Sobre el autor">
          <p className="mt-4">
            Con más de 15 años de experiencia en el sector asegurador, Roberto Rodríguez ha dedicado su trayectoria profesional a ayudar a personas,
            familias y empresarios a proteger su patrimonio y construir un futuro financiero más seguro.
          </p>
          <p className="mt-4">
            A lo largo de su carrera ha comprendido que uno de los mayores desafíos para los asesores de seguros no es la falta de experiencia o
            conocimiento, sino la necesidad de adaptarse a un entorno donde la tecnología está transformando la manera de trabajar, organizar
            información y desarrollar negocios.
          </p>
          <p className="mt-4">
            Convencido de que la inteligencia artificial no viene a reemplazar la experiencia humana, sino a potenciarla, Roberto comparte en{" "}
            <em>De la Agenda al Algoritmo</em> una metodología práctica de siete escalones para acompañar a otros profesionales del sector asegurador
            en su transformación digital.
          </p>
          <p className="mt-4">
            A través de instrucciones sencillas y ejercicios progresivos, muestra cómo comenzar desde cero con herramientas como Visual Studio Code y
            Claude, avanzando hacia una nueva forma de organizar y administrar la actividad profesional con ayuda de la inteligencia artificial.
          </p>
          <p className="mt-4">Su filosofía es clara:</p>
          <blockquote className="glass-soft mt-4 rounded-2xl border-l-4 border-brand-2 p-5 font-display text-xl text-ink">
            «La experiencia es tu mayor activo. La inteligencia artificial es la herramienta que puede llevarla al siguiente nivel».
          </blockquote>
          <p className="mt-4">
            Con este libro, Roberto busca demostrar que no es necesario ser programador ni experto en tecnología para comenzar a aprovechar las
            oportunidades de la inteligencia artificial.
          </p>
          <p className="mt-4">
            Porque el futuro del asesor de seguros no consiste en elegir entre experiencia y tecnología, sino en aprender a combinar ambas.
          </p>
        </Seccion>

        {/* ---------- Cierre de compra ---------- */}
        <div className="glass-strong rounded-[28px] p-6 text-center sm:p-10">
          <p className="font-display text-3xl text-ink sm:text-4xl">De la Agenda al Algoritmo</p>
          <p className="mt-2 text-ink-soft">Libro en PDF + bono · USD $29.99 más impuestos · garantía de 7 días naturales</p>
          <div className="mt-6 flex justify-center">
            <BotonComprar grande />
          </div>
        </div>

        <Seccion titulo="Datos de la venta">
          <dl className="mt-4 divide-y divide-line rounded-2xl border border-line text-base">
            {DATOS.map(([k, v]) => (
              <div key={k} className="grid gap-1 px-5 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
                <dt className="font-semibold text-ink">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            <div className="grid gap-1 px-5 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
              <dt className="font-semibold text-ink">Documentos</dt>
              <dd>
                <a href="/libro/terminos" className="text-brand-2 underline">
                  Términos de venta
                </a>
                <br />
                <a href="/libro/privacidad" className="text-brand-2 underline">
                  Aviso de privacidad
                </a>
              </dd>
            </div>
          </dl>
        </Seccion>

        {/* ---------- Actualizaciones (enlace del Anexo F, para quien ya compró) ---------- */}
        <Seccion titulo="Actualizaciones del libro" id="actualizaciones">
          <p className="mt-4">
            Aquí se publican las pantallas actualizadas y los cambios de cada edición del libro. Las ediciones nuevas no tienen costo para quien ya
            compró el libro.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-base">
              <thead>
                <tr className="border-b border-line-strong text-ink">
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
            <a href="mailto:rdz.roberto@outlook.com" className="text-brand-2 underline">
              rdz.roberto@outlook.com
            </a>
            . Respondemos en 3 días hábiles.
          </p>
        </Seccion>

        <p className="text-sm text-ink-mute">© 2026 Roberto Rodríguez. Todos los derechos reservados.</p>
      </div>
    </main>
  );
}
