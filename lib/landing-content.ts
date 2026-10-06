/**
 * Contenido editable de la página de captura.
 * 👉 Negocio: Roberto Rodríguez, especialista en Asegurarte.
 * Público: matrimonios sin hijos que están pensando en embarazarse pronto.
 * Resultado prometido: claridad sobre qué seguro necesitan para que su bebé
 * nazca protegido por la póliza de la mamá.
 * (Sin server-only: lo usa el componente cliente de la landing.)
 */

export interface Beneficio {
  icono: string; // ícono Iconify a color (flat-color-icons:*)
  titulo: string;
  texto: string;
}

export interface Testimonio {
  nombre: string;
  foto: string;
  /** Medidas reales de la foto (para mostrarla completa, sin recortar ni deformar). */
  fotoAncho: number;
  fotoAlto: number;
  /** Párrafos separados por una línea en blanco. */
  texto: string;
}

export interface PasoProceso {
  numero: string;
  titulo: string;
  texto: string;
  icono: string;
}

export interface PreguntaFrecuente {
  pregunta: string;
  respuesta: string;
}

export interface LandingContent {
  negocio: string;
  /** Para el aviso de privacidad (LFPDPPP): responsable, correo y domicilio reales. */
  contacto: { correo: string; domicilio: string };
  eyebrow: string;
  hero: { gancho: string; titulo: string; subtitulo: string; cta: string };
  confianza: string[];
  datoDestacado: { numero: string; texto: string };
  beneficios: Beneficio[];
  comoFunciona: PasoProceso[];
  oferta: { titulo: string; puntos: string[] };
  testimonios: Testimonio[];
  paraQuienEs: string[];
  paraQuienNo: string[];
  faq: PreguntaFrecuente[];
  ctaFinal: { titulo: string; texto: string; cta: string };
  formulario: { titulo: string; nota: string; boton: string };
}

export const CONTENIDO: LandingContent = {
  negocio: "Roberto Rodríguez · Asegurarte",
  contacto: {
    correo: "rdz.roberto@outlook.com",
    domicilio: "América #520, Colonia Centro, Monterrey, N.L.",
  },
  eyebrow: "Para parejas que están pensando en embarazarse pronto",

  hero: {
    gancho: "Asesoría gratis de 30 minutos",
    titulo: "Que tu bebé nazca protegido por el seguro de mamá desde el primer día",
    subtitulo:
      "Agenda una asesoría gratis de 30 minutos. Te explico, en palabras simples, qué seguro le conviene a tu familia y cuándo contratarlo, antes de que empiecen a buscar el embarazo.",
    cta: "Quiero mi asesoría gratis",
  },

  confianza: [
    "Asesoría 100% gratis",
    "Sin compromiso de compra",
    "Información confidencial",
    "Respuesta en menos de 24 horas",
  ],

  datoDestacado: {
    numero: "10 meses",
    texto:
      "es lo que puede tardar un seguro de gastos médicos en empezar a cubrir un parto. Resuélvelo antes de buscar el embarazo, no después.",
  },

  beneficios: [
    {
      icono: "flat-color-icons:alarm-clock",
      titulo: "Evitas el periodo de espera",
      texto: "Sabrás con tiempo qué póliza necesitas antes de que el reloj de las aseguradoras juegue en tu contra.",
    },
    {
      icono: "flat-color-icons:family",
      titulo: "Tu bebé queda protegido desde el día uno",
      texto: "Te decimos qué seguro cubre a tu hijo recién nacido, sin letras chiquitas ni sorpresas de último momento.",
    },
    {
      icono: "flat-color-icons:privacy",
      titulo: "Decides con claridad, no con presión",
      texto: "Te explico tus opciones en español sencillo. Tú decides qué hacer con tu información, sin tecnicismos.",
    },
  ],

  comoFunciona: [
    {
      numero: "1",
      icono: "flat-color-icons:calendar",
      titulo: "Agenda tu asesoría",
      texto: "Elige el horario que te acomode. Son 30 minutos, por videollamada o por teléfono.",
    },
    {
      numero: "2",
      icono: "flat-color-icons:conference-call",
      titulo: "Platicamos tu caso",
      texto: "Me cuentas en qué momento están y qué les preocupa. Sin presión ni venta forzada.",
    },
    {
      numero: "3",
      icono: "flat-color-icons:document",
      titulo: "Te llevas un plan claro",
      texto: "Sales sabiendo exactamente qué seguro le conviene a tu familia y cuándo contratarlo.",
    },
  ],

  oferta: {
    titulo: "Esto es lo que te llevas en tu asesoría",
    puntos: [
      "Un diagnóstico claro de qué tipo de seguro necesita tu familia hoy.",
      "Los tiempos exactos: cuándo contratar para que tu bebé quede cubierto a tiempo.",
      "Respuestas directas a tus dudas, sin compromiso de comprar nada.",
    ],
  },

  testimonios: [
    {
      nombre: "Istmenia y Carlos, papás de Carlitos",
      foto: "/img/testimonio-carlitos.jpg",
      fotoAncho: 960,
      fotoAlto: 1280,
      texto: "Hoy quiero compartir algo que aprendí de la manera más especial: cuando se trata de salud, estar protegido hace toda la diferencia. ❤️\n\nDurante mi primer embarazo, mi ginecólogo me informó que necesitaba realizarme un procedimiento llamado cerclaje cervical. En ese momento, escuchar que necesitaba una operación fue algo inesperado y que, sinceramente, me tomó por sorpresa.\n\nPero hubo algo que me dio tranquilidad: ya contaba con una póliza de Gastos Médicos Mayores.\n\nGracias a mi seguro, los gastos relacionados con la operación —doctores, hospital, medicamentos y demás— estuvieron cubiertos, teniendo que pagar únicamente una diferencia mínima en comparación con la cantidad tan alta que representaba la cuenta.\n\nMeses después nació mi bebé y, gracias a Dios, todo salió muy bien. ❤️ Además, mi seguro me otorgó una cantidad por el nacimiento de mi hijo, que aunque no cubrió el total de los gastos, fue una gran ayuda en ese momento tan importante para nuestra familia.\n\nHoy, con mucha tranquilidad y confianza, estoy esperando a mi segundo bebé. Nuevamente será necesario realizar el mismo procedimiento y, hasta ahora, todo marcha perfectamente, tal como ocurrió en mi primera experiencia.\n\nPor eso quiero hacer una mención especial a Roberto Rodríguez, mi asesor de seguros, por su excelente atención y seguimiento durante todo el proceso. Tener un asesor que te acompañe cuando más lo necesitas también hace una gran diferencia.\n\nComparto mi experiencia porque muchas veces pensamos:\n\n“A mí no me va a pasar.”\n“Seguramente nunca lo voy a necesitar.”\n“Después contrato un seguro.”\n\nPero la realidad es que la salud no avisa, no espera y muchas veces las situaciones llegan cuando menos las imaginamos.\n\nSi eres mamá, estás planeando tener hijos o simplemente quieres proteger lo que más amas, considera contar con una póliza de Gastos Médicos Mayores.\n\nPorque un seguro no solamente protege tu bolsillo...\n\nTambién te da tranquilidad para enfrentar los momentos difíciles y la posibilidad de concentrarte en lo verdaderamente importante: cuidar de ti y de tu familia. ❤️\n\nHoy agradezco haber tomado aquella decisión a tiempo. Mañana, esa decisión podría hacer toda la diferencia para alguien más.",
    },
    {
      nombre: "Tere y Mauricio, papás de Mateo",
      foto: "/img/testimonio-mateo.jpg",
      fotoAncho: 1280,
      fotoAlto: 960,
      texto:
        "El nacimiento de Mateo fue una experiencia que nos llenó de esperanza, pero también de grandes desafíos. Al llegar de manera prematura, tuvimos momentos de incertidumbre y preocupación por su salud y por los gastos que implicaba su atención médica. Por fortuna, el contar con una póliza de gastos médicos mayores hizo la diferencia en el proceso y cubrieron los gastos necesarios para que Mateo recibiera la atención que necesitaba. Hoy, ver a Mateo salir adelante nos recuerda que, en los momentos más difíciles, contar con el respaldo adecuado puede hacer una enorme diferencia.",
    },
    {
      nombre: "Nere y Sergio, papás de Rafael",
      foto: "/img/testimonio-rafael.jpg",
      fotoAncho: 768,
      fotoAlto: 823,
      texto: "Cuando esperas un hijo, lo último que quieres imaginar es que tendrá que entrar a un quirófano.\n\nDesde el embarazo de nuestro hijo menor, Rafael, los médicos detectaron un agrandamiento de su riñón izquierdo debido a una estenosis pieloureteral.\n\nEl urólogo pediatra nos explicó que, al nacer, probablemente tendría que ser operado.\n\nComo padres, sentimos miedo e incertidumbre… pero también tuvimos una enorme tranquilidad: su mamá contaba con un seguro de gastos médicos mayores, y gracias a ello, Rafael estaría cubierto desde su nacimiento y podría recibir la atención médica que necesitara.\n\nY así fue.\n\nDesde el primer momento recibió la atención de los especialistas y el tratamiento necesario.\n\nHoy, Rafael tiene 5 años, está completamente recuperado y sus riñones funcionan perfectamente. ❤️\n\nEsta experiencia nos enseñó algo que nunca olvidaremos:\n\nUn seguro de gastos médicos no evita que ocurran los problemas de salud. Pero sí puede evitar que una enfermedad o una cirugía se convierta, además, en un problema financiero para la familia.\n\nPorque cuando se trata de nuestros hijos, la tranquilidad de saber que podrán recibir la mejor atención posible no tiene precio.\n\nPrevenir no es pensar en que algo malo va a pasar.\nEs estar preparados para proteger lo que más amamos. ❤️",
    },
  ],

  paraQuienEs: [
    "Están casados o viviendo en pareja y planean embarazarse en los próximos meses.",
    "Quieren evitar sorpresas de dinero cuando nazca el bebé.",
    "Prefieren decidir con información clara, no con presión de venta.",
  ],

  paraQuienNo: [
    "Ya tienen un seguro de gastos médicos mayores contratado desde hace más de un año.",
    "Buscan nada más el seguro más barato, sin importar qué cubre.",
    "No están listos para platicar de su situación real (ingresos, salud, planes).",
  ],

  faq: [
    {
      pregunta: "¿La asesoría tiene costo?",
      respuesta: "No. Los 30 minutos son gratis y sin compromiso de compra.",
    },
    {
      pregunta: "¿Me van a presionar para comprar algo?",
      respuesta: "No. Te explico tus opciones y tú decides. Si no es el momento, no pasa nada.",
    },
    {
      pregunta: "¿Y si todavía no nos embarazamos?",
      respuesta: "Mejor. Entre antes lo resuelvas, menos riesgo de toparte con el periodo de espera de las aseguradoras.",
    },
    {
      pregunta: "¿Qué necesito tener a la mano para la llamada?",
      respuesta: "Nada especial. Solo tus dudas y una idea de cuándo planean buscar el embarazo.",
    },
    {
      pregunta: "¿Mis datos están seguros?",
      respuesta: "Sí. Solo los uso para contactarte y nunca los comparto. Puedes ver el detalle en el aviso de privacidad.",
    },
  ],

  ctaFinal: {
    titulo: "Dale a tu bebé la protección que se merece, desde antes de nacer",
    texto: "Agenda tu asesoría gratis de 30 minutos y sal con un plan claro, no con más dudas.",
    cta: "Quiero mi asesoría gratis",
  },

  formulario: {
    titulo: "Agenda tu asesoría gratis",
    nota: "Te contacto por WhatsApp en menos de 24 horas. Tus datos están seguros.",
    boton: "Quiero mi asesoría gratis",
  },
};
