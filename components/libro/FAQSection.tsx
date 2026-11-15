import { CORREO_CONTACTO } from "@/lib/libro";
import { Eyebrow, Titulo } from "./ui";

/**
 * Preguntas frecuentes. Cada respuesta repite lo que ya dicen la ficha de venta, «Datos de la venta» y los términos;
 * no agregar aquí nada que no esté en esos documentos.
 */
const PREGUNTAS: { p: string; r: React.ReactNode }[] = [
  {
    p: "¿Necesito saber programar?",
    r: "No. Aquí usas la herramienta; no la programas. Tampoco necesitas saber inglés ni una computadora nueva.",
  },
  {
    p: "¿Tengo que pagar Claude aparte?",
    r: (
      <>
        Sí. Para seguir los pasos necesitas un plan de pago de Claude, que <strong className="text-ink">no está incluido en este producto</strong> y el
        autor no vende. Consulta su precio y sus condiciones vigentes con el proveedor antes de contratar. Visual Studio Code es gratuito.
      </>
    ),
  },
  {
    p: "¿Qué computadora necesito?",
    r: "Una computadora con Windows 11 (o Windows 10), conexión a internet, un correo electrónico y unos 30 minutos por sesión. El libro está escrito para Windows.",
  },
  {
    p: "¿Cómo y cuándo recibo el libro?",
    r: "El acceso es inmediato cuando se confirma tu pago, en el área de miembros de Hotmart. Hotmart te envía por correo los datos para entrar. Si pasadas 24 horas no tienes acceso, escríbenos. El PDF se abre en computadora, tableta o celular.",
  },
  {
    p: "¿Y si no es lo que esperaba?",
    r: "Tienes 7 días naturales desde tu compra para pedir que te devuelvan el precio pagado, desde Hotmart, sin necesidad de explicar tus razones. Descargar el libro no te hace perder esta garantía ni los derechos que la ley te da como consumidor.",
  },
  {
    p: "¿Puedo usar los datos de mis clientes?",
    r: "Practicas primero con datos inventados. Los datos reales de tus clientes se usan solo con su autorización y con los cuidados que explica el Capítulo 6. Revisa también el contrato con tu aseguradora o agencia.",
  },
  {
    p: "¿La inteligencia artificial puede equivocarse?",
    r: "Sí. Por eso el libro te enseña a revisar siempre lo que entrega antes de enviarlo a un cliente: nombres, cifras, fechas, promesas y tono.",
  },
  {
    p: "¿Recibo las actualizaciones del libro?",
    r: (
      <>
        Sí. Las ediciones nuevas no tienen costo para quien ya compró el libro. Los cambios se publican en{" "}
        <a href="#actualizaciones" className="text-brand-2 underline">
          esta misma página
        </a>
        .
      </>
    ),
  },
  {
    p: "¿Recibo comprobante fiscal?",
    r: "Hotmart emite el comprobante fiscal de tu compra con los datos que captures al pagar.",
  },
  {
    p: "Tengo otra duda",
    r: (
      <>
        Escríbenos a{" "}
        <a href={`mailto:${CORREO_CONTACTO}`} className="text-brand-2 underline">
          {CORREO_CONTACTO}
        </a>{" "}
        o por WhatsApp al 81 8280 0234, de lunes a viernes de 9:00 a 18:00 h. Respondemos en 3 días hábiles.
      </>
    ),
  },
];

export function FAQSection() {
  return (
    <section id="preguntas" className="mx-auto max-w-3xl scroll-mt-6">
      <div className="text-center">
        <Eyebrow>Antes de decidir</Eyebrow>
        <Titulo>Preguntas frecuentes</Titulo>
      </div>
      <div className="mt-8 space-y-3">
        {PREGUNTAS.map((q) => (
          <details key={q.p} className="glass-soft group rounded-2xl">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
              <span>{q.p}</span>
              <span className="mas" aria-hidden="true" />
            </summary>
            <div className="border-t border-line px-5 py-4 text-base">{q.r}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
