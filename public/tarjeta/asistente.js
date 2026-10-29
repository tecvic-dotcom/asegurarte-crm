/* =====================================================================================================
   ASISTENTE VIRTUAL GUIADO de Roberto Rodríguez (nivel A: SIN inteligencia artificial).
   Una mascota flotante abre un chat de botones. Las respuestas las escribió Roberto (salen de sus preguntas frecuentes y de sus
   páginas «Seguro de vida con ahorro» y «Seguro de hombre clave»); el asistente no inventa nada y no recibe texto ni datos de nadie.
   Cuando la persona quiere, la pasa a WhatsApp, a la agenda o a una llamada.

   CÓMO CAMBIAR LA MASCOTA: sube la imagen (cuadrada, PNG, WebP o SVG, de 256 px o más) a /public/tarjeta/bot/ y cambia BOT.mascota.
   CÓMO CAMBIAR EL NOMBRE: BOT.nombre. LOS TEXTOS: el objeto NODOS, más abajo.

   Medición anónima y sin cookies (la misma de la tarjeta): evento «bot» (abrir, tema, pregunta, página) y, para las salidas,
   «wa», «agendar» y «llamar» con detalle «asistente:…». No guarda IP, nombre ni teléfono.
   ===================================================================================================== */
(function () {
  "use strict";
  if (window.__asistenteRR) return;
  window.__asistenteRR = true;

  /* ============================== CONFIGURACIÓN ============================== */
  const BOT = {
    nombre: "Asistente de Roberto",
    mascota: "/tarjeta/bot/mascota.svg", // mascota provisional: se reemplaza por la definitiva
    // Preguntas que lanza la burbuja para que lo vean (máximo 2 por visita, solo mientras nadie lo haya abierto). Cada página puede tener las suyas.
    avisos: ["¿Qué seguro te interesa?", "¿Dudas sobre tu seguro? Pregúntame."],
    avisosPagina: {
      "/seguro-de-vida-con-ahorro": ["¿Dudas sobre el seguro de vida con ahorro?", "Pregúntame lo que quieras de este seguro."],
      "/empresarios": ["¿Tu negocio depende de una persona clave?", "Pregúntame cómo protegerlo."],
    },
  };
  const WHATSAPP = "528182800234";
  const TELEFONO = "+528182800234";
  const ORIGEN = "Te escribo desde tu tarjeta digital."; // le avisa a Roberto de dónde llega el prospecto (igual que la tarjeta)
  const AGENDA_URL = "https://calendar.app.google/dxf4aRZFHkux6MqL8";

  /* ================================ TEXTOS ================================
     m: lo que dice el asistente · o: botones de respuesta · a: salidas (WhatsApp, cita, llamada, página)
     tema: cuenta como «tema elegido» · padre: a dónde vuelve «Otra pregunta». */
  const wa = (tema, t, msg) => ({ k: "wa", t, tema, msg });
  const cita = (tema, t) => ({ k: "agenda", t: t || "Agendar una llamada de orientación", tema });
  const pagina = (t, href, etiqueta) => ({ k: "link", t, href, etiqueta: etiqueta || t });
  const llamar = (tema) => ({ k: "call", t: "Llamar a Roberto", tema });

  /* Selector de ramos: todo lo que Roberto maneja. «n» es el nodo que se muestra al elegirlo. */
  const RAMOS = [
    { v: "vida", t: "Seguro de vida y ahorro", n: "vida", tema: "Vida y ahorro" },
    { v: "gmm", t: "Gastos médicos mayores", n: "gmm", tema: "Gastos médicos" },
    { v: "ahorro", t: "Ahorro y retiro", n: "ahorro", tema: "Ahorro y retiro" },
    { v: "ppr", t: "PPR: retiro y planeación fiscal", n: "ppr", tema: "PPR" },
    { v: "hogar", t: "Hogar y patrimonio", n: "hogar", tema: "Hogar" },
    { v: "auto", t: "Auto", n: "auto", tema: "Auto" },
    { v: "clave", t: "Hombre clave (seguro para empresas)", n: "negocio", tema: "Hombre clave" },
    { v: "nose", t: "Todavía no sé cuál necesito", n: "nose", tema: "No sé cuál" },
  ];
  const SALUDO = "¡Hola! Soy el asistente virtual de Roberto. No soy una persona: te muestro respuestas que Roberto dejó preparadas y, cuando quieras, te paso con él.";
  const OTROS = [
    { t: "Ya soy cliente", n: "cliente", tema: "Cliente" },
    { t: "Hablar con Roberto", n: "contacto", tema: "Contacto" },
  ];

  /* Regla de contenido: lo detallado sale SOLO de los documentos oficiales de Roberto: ficha del producto de vida, manual de persona clave y condiciones
     generales de gastos médicos, auto y hogar. «Ahorro y retiro» y «PPR» llevan solo lo que dicen sus tarjetas de producto, hasta que Roberto pase el
     documento de cada uno. No se nombra a la aseguradora ni a los productos, y las cifras que cambian por edición o por póliza se mandan a la carátula. */
  const NODOS = {
    inicio: { m: [SALUDO, "¿Qué seguro te interesa?"], sel: true, o: OTROS },
    menu: { m: ["¿Qué seguro te interesa?"], sel: true, o: OTROS },

    /* ---------- Seguro de vida y ahorro (ficha oficial del producto) ---------- */
    vida: {
      m: ["Un seguro de vida con ahorro protege a tu familia si tú faltas y, según el plan, también va formando un ahorro con los años. Para algunas personas funciona muy bien y para otras no."],
      o: [
        { t: "¿Qué cubre?", n: "v_cubre" },
        { t: "¿Qué coberturas puedo agregar?", n: "v_extra" },
        { t: "¿Cómo se forma el ahorro?", n: "v_ahorro" },
        { t: "¿Puedo sacar mi dinero cuando quiera?", n: "v_dinero" },
        { t: "¿Quién puede contratarlo?", n: "v_quien" },
        { t: "¿Para quién tiene sentido?", n: "v_para" },
        { t: "¿Qué preguntar antes de contratar?", n: "v_pregs" },
      ],
      a: [
        pagina("Leer la guía completa", "/seguro-de-vida-con-ahorro", "Vida con ahorro"),
        wa("Vida y ahorro", "Pedir una cotización con mis datos", "Quiero conocer opciones de seguro de vida con ahorro y entender cuánto es protección y cuánto es ahorro."),
      ],
    },
    v_cubre: {
      padre: "vida",
      m: [
        "Si la persona asegurada fallece, sus beneficiarios reciben la suma asegurada. Al contratar eliges cómo la recibirán: en un solo pago o por medio de un fideicomiso.",
        "Incluye un anticipo por fallecimiento (30% de la suma asegurada, después de dos años continuos de vigencia) y un anticipo por enfermedad terminal (30%, con diagnóstico y un pronóstico de vida no mayor a 12 meses, después de tres meses de contratada).",
        "También trae orientación médica telefónica las 24 horas, asistencia funeraria y asesoría legal, que prestan terceros con sus propios términos.",
      ],
      a: [pagina("Ver todo lo que incluye", "/seguro-de-vida-con-ahorro#h-incluye", "Qué incluye")],
    },
    v_extra: {
      padre: "vida",
      m: [
        "Invalidez total y permanente, muerte accidental y pérdidas orgánicas, cáncer, enfermedades graves, desempleo, cobertura conyugal y gastos funerarios.",
        "Se contratan por separado o en tres planes ya armados. Cada una tiene sus edades de contratación, periodos de espera y sumas máximas, y se revisan al cotizar.",
      ],
      a: [pagina("Ver cada cobertura", "/seguro-de-vida-con-ahorro#h-incluye", "Coberturas")],
    },
    v_ahorro: {
      padre: "vida",
      m: [
        "Tiene una parte de ahorro, pero es un seguro: una parte de lo que pagas es la protección y otra son costos. El ahorro sale del plan que eliges (temporal, ordinario de vida o pagos limitados): los valores garantizados dependen del plan, de tu edad, de los años transcurridos y de las primas pagadas.",
        "Si quieres ahorrar más, puedes hacer aportaciones voluntarias (dotales a corto plazo) que pasan a un fondo en administración que genera intereses. Yo no prometo rendimientos.",
      ],
      a: [pagina("Ver cómo se forma el ahorro", "/seguro-de-vida-con-ahorro#h-ahorro", "Ahorro")],
    },
    v_dinero: {
      padre: "vida",
      m: ["Lo que la póliza te ofrece son los valores garantizados. Puedes rescatarlos (y entonces el seguro se cancela) o dejar de pagar primas con un seguro saldado (suma menor) o prorrogado (misma suma, por menos tiempo).", "Lo disponible depende del plan, de tu edad, de los años transcurridos y de las primas pagadas, y en los primeros años suele ser menor a lo que aportaste."],
      a: [wa("Vida y ahorro", "Platicarlo con Roberto", "Quiero entender qué pasa con mi dinero si dejo de pagar o quiero retirarlo.")],
    },
    v_quien: {
      padre: "vida",
      m: ["Se contrata de los 18 a los 70 años, en pesos, dólares o UDIS, con una suma asegurada mínima de $500,000 (30,000 dólares o 60,000 UDIS).", "Puede ser individual o mancomunada. El pago puede ser anual, semestral, trimestral o mensual (el fraccionado lleva recargo)."],
      a: [wa("Vida y ahorro", "Revisar mi caso con Roberto", "Quiero saber si puedo contratar un seguro de vida con ahorro.")],
    },
    v_para: {
      padre: "vida",
      m: ["Suele tener sentido si eres el principal proveedor, ya tienes un fondo de emergencia aparte y puedes pagar durante años sin que se resienta tu presupuesto.", "Quizá no si aún no tienes fondo de emergencia o podrías necesitar ese dinero pronto. Si es tu caso, no pasa nada: primero se arma el fondo."],
      a: [wa("Vida y ahorro", "Ver si es para mí", "Quiero ver si un seguro de vida con ahorro es para mí.")],
    },
    v_pregs: {
      padre: "vida",
      m: ["Tres que no pueden faltar: ¿cuánto de lo que pago es protección, ahorro y costos? ¿Qué valores están garantizados y cuáles no? ¿Cuánto recupero si cancelo en el año 3, el 5 y el 10?", "Las siete completas están en la guía."],
      a: [pagina("Ver las siete preguntas", "/seguro-de-vida-con-ahorro#h-preguntas", "Siete preguntas")],
    },

    /* ---------- Hombre clave (manual oficial de persona clave) ---------- */
    negocio: {
      m: ["El seguro de hombre clave (o de persona clave) es para empresas que dependen mucho de una persona: tú, un socio, el director… Lo contrata la empresa, lo paga la empresa y lo cobra la empresa, para sostenerse mientras se reacomoda. Protege al negocio, no a tu familia."],
      o: [
        { t: "¿Quién puede contratarlo?", n: "n_quien" },
        { t: "¿Qué opciones de seguro hay?", n: "n_opciones" },
        { t: "¿Se deduce de impuestos?", n: "n_imp" },
        { t: "¿Qué documentos piden?", n: "n_docs" },
        { t: "¿Cómo se decide la suma asegurada?", n: "n_suma" },
        { t: "¿Y si la persona deja la empresa?", n: "n_deja" },
      ],
      a: [cita("Hombre clave"), pagina("Leer la página completa", "/empresarios", "Hombre clave"), wa("Hombre clave", "Escribirle a Roberto", "Tengo un negocio y quiero revisar un seguro de hombre clave.")],
    },
    n_quien: {
      padre: "negocio",
      m: ["Lo contrata una empresa constituida como persona moral. La persona clave debe tener relación de trabajo con ella (o ser socio industrial, en las sociedades donde aplica) y, si es empleado, la aseguradora pide dos años en el puesto.", "Si tu negocio opera como persona física, hay que ver otras opciones."],
      a: [cita("Hombre clave", "Revisar mi caso en una llamada")],
    },
    n_opciones: {
      padre: "negocio",
      m: ["Hay dos formas de contratarlo: un seguro temporal de protección pura, o uno de protección y ahorro. Cuál conviene depende de tu objetivo y de cómo lo trate fiscalmente tu contador.", "En ambas no pueden contratarse aportaciones adicionales y el contratante no puede cambiarse. Para el tratamiento fiscal, además, durante la vigencia no se otorgan préstamos con la póliza."],
      a: [cita("Hombre clave", "Platicar mi caso en una llamada")],
    },
    n_imp: {
      padre: "negocio",
      m: ["Puede aplicar, bajo condiciones de la Ley del ISR (art. 27, fracc. XII) y su reglamento (art. 51): por ejemplo, que el seguro sea temporal de hasta 20 años con prima nivelada y que la empresa sea contratante y beneficiaria irrevocable. Y lo que la empresa cobra se acumula como ingreso.", "Esto no es asesoría fiscal: se revisa con tu contador."],
      a: [pagina("Ver el detalle", "/empresarios#h-fiscal", "Impuestos")],
    },
    n_docs: {
      padre: "negocio",
      m: ["Lo habitual: acta constitutiva y cédula fiscal de la empresa, identificación de la persona asegurada y del representante legal, comprobante de domicilio, cuestionario financiero y comprobante de antigüedad. Para sumas altas, estados financieros.", "La lista completa está en la página."],
      a: [pagina("Ver la lista completa", "/empresarios#h-quien", "Documentos")],
    },
    n_suma: {
      padre: "negocio",
      m: ["Se establece según lo que la persona clave aporta a los resultados de la empresa y tiene un máximo: en el producto que manejo, hasta siete veces la utilidad neta promedio de los últimos tres años, o cinco veces el salario anual con un tope de $4,000,000 por empresa.", "Dentro de ese máximo, lo que se contrata sale de platicar tu caso."],
      a: [cita("Hombre clave", "Platicar mi caso en una llamada")],
    },
    n_deja: {
      padre: "negocio",
      m: ["Uno de los requisitos del reglamento es que la persona asegurada tenga relación de trabajo con la empresa. Si eso cambia, hay que revisar con tu contador y con la aseguradora qué sigue con la póliza y con su tratamiento fiscal.", "Y recuerda que el contratante no puede cambiarse."],
      a: [cita("Hombre clave", "Revisarlo en una llamada")],
    },

    /* ---------- Gastos médicos mayores (condiciones generales oficiales) ---------- */
    gmm: {
      m: [
        "Un seguro de gastos médicos mayores paga los gastos de hospital, médicos y tratamientos de las enfermedades y accidentes que cubre, y tú participas con un deducible y un coaseguro.",
        "Lo que sigue sale de las condiciones generales; lo que aplica a ti queda en la carátula de tu póliza.",
      ],
      o: [
        { t: "¿Qué cubre?", n: "g_cubre" },
        { t: "¿Cómo funcionan el deducible y el coaseguro?", n: "g_dedu" },
        { t: "¿Qué es el periodo de espera?", n: "g_espera" },
        { t: "¿Y si ya tengo una enfermedad?", n: "g_preex" },
        { t: "¿Cubre maternidad?", n: "g_mater" },
        { t: "¿Qué no cubre?", n: "g_nocubre" },
        { t: "¿Pago directo o reembolso?", n: "g_pago" },
        { t: "¿Se renueva? ¿Puede subir?", n: "g_renov" },
      ],
      a: [wa("Gastos médicos", "Pedir mi asesoría por WhatsApp", "Quiero revisar un seguro de gastos médicos mayores."), cita("Gastos médicos")],
    },
    g_cubre: {
      padre: "gmm",
      m: [
        "Honorarios médicos, gastos de hospital, cuidados en casa, terapias de rehabilitación, inmunoterapia, quimioterapia y radioterapia, cirugía reconstructiva, trasplantes, dispositivos médicos, tratamiento dental por accidente, ambulancia aérea y terrestre dentro del país y apoyo psicológico en casos específicos (hasta 10 consultas).",
        "En general se aplican el deducible y el coaseguro de tu póliza, y el gasto debe ser médicamente necesario. Hay coberturas opcionales con costo, como medicamentos fuera del hospital, maternidad extendida, preexistencias, deducible cero por accidente o atención en el extranjero.",
        "Los gastos deben hacerse dentro de México: fuera del país solo si contrataste una cobertura opcional para eso.",
      ],
      a: [wa("Gastos médicos", "Revisar qué cubriría en mi caso", "Quiero saber qué cubriría un seguro de gastos médicos mayores en mi caso.")],
    },
    g_dedu: {
      padre: "gmm",
      m: [
        "El deducible es lo que pagas tú primero, por cada enfermedad o accidente, antes de que la aseguradora empiece a pagar. Una vez cubierto no se actualiza, salvo que cambies de plan o de producto.",
        "Después entra el coaseguro: un porcentaje de los gastos procedentes que pagas tú, hasta un tope por siniestro. El deducible, el porcentaje y el tope están en tu carátula.",
        "El coaseguro puede subir si te atiendes en un hospital de una gama superior a la contratada, en otra zona o fuera de la red de convenio (en ese caso puede quedar sin tope y el trámite es por reembolso), y baja un poco si eliges una gama menor. Hay excepciones, como las emergencias médicas. Por eso conviene saber a qué hospitales irías antes de contratar.",
      ],
      a: [wa("Gastos médicos", "Revisar deducible y coaseguro", "Quiero entender cómo funcionan el deducible y el coaseguro de un seguro de gastos médicos mayores.")],
    },
    g_espera: {
      padre: "gmm",
      m: [
        "Es el tiempo que debe pasar desde que entras a la póliza para que ciertos padecimientos queden cubiertos. No aplica a accidentes ni a emergencias médicas.",
        "10 meses: maternidad, complicaciones del embarazo y cobertura del recién nacido.\n12 meses: esclerosis múltiple.\n18 meses: columna (salvo hernias de disco), piedras en riñón y vías urinarias, vesícula, padecimientos ginecológicos, piso pélvico, várices, rodilla, gastritis y reflujo.\n24 meses: desviación de tabique, padecimientos anorrectales, amígdalas y adenoides, hernias (incluidas las de disco), cataratas y próstata.\n48 meses: VIH/SIDA y cirugía bariátrica.",
        "Si ya tenías gastos médicos mayores con continuidad en otra aseguradora, se puede reconocer esa antigüedad para reducir estas esperas. Se revisa al contratar.",
      ],
      a: [wa("Gastos médicos", "Ver mi caso con Roberto", "Quiero saber qué periodos de espera me aplicarían en un seguro de gastos médicos mayores.")],
    },
    g_preex: {
      padre: "gmm",
      m: [
        "Las enfermedades preexistentes, las que ya tenías antes de contratar, no se cubren, salvo que hayas contratado la cobertura opcional de preexistencias.",
        "Con esa cobertura, después de 2 años continuos la aseguradora paga los gastos de preexistencias que declaraste en la solicitud, siempre que en esos 2 años no hayas recibido tratamiento ni gastado para atenderlas, y que no estén excluidas expresamente en un endoso de tu póliza.",
        "Por eso es tan importante declarar tu salud con verdad en la solicitud: omitir datos o declararlos mal puede afectar tus derechos. Y si la aseguradora te pide un examen médico, ya no puede aplicarte la cláusula de preexistencia sobre algo que ese examen evaluó y no encontró.",
      ],
      a: [wa("Gastos médicos", "Platicar mi caso con Roberto", "Tengo una enfermedad o antecedente de salud y quiero saber cómo se maneja en un seguro de gastos médicos mayores.")],
    },
    g_mater: {
      padre: "gmm",
      m: [
        "Sí, con periodo de espera: 10 meses desde que la asegurada entra a la póliza. Pasado ese tiempo, la cobertura básica da una ayuda por maternidad (con la suma que aparece en tu carátula) y la aseguradora puede adelantar el pago desde la semana 29 de embarazo con la interpretación de un ultrasonido. Si necesitas más, existe la maternidad extendida, que tiene su propia espera.",
        "También se cubren, después de la espera, complicaciones específicas del embarazo, como embarazo extrauterino, preeclampsia, placenta previa y diabetes gestacional.",
        "El recién nacido puede darse de alta sin examen médico y quedar asegurado desde su nacimiento si la mamá ya cumplió la espera y lo da de alta dentro de los 30 días naturales siguientes. No se cubren: aborto, interrupción del embarazo en las primeras 12 semanas, maternidad subrogada ni tratamientos de fertilidad o reproducción asistida.",
      ],
      a: [wa("Gastos médicos", "Planear mi maternidad con Roberto", "Quiero planear la cobertura de maternidad de un seguro de gastos médicos mayores.")],
    },
    g_nocubre: {
      padre: "gmm",
      m: [
        "Entre lo que las condiciones generales dejan fuera: enfermedades preexistentes (salvo la cobertura opcional), tratamientos estéticos o para la calvicie, obesidad y reducción de peso (con la excepción de la cirugía bariátrica bajo sus requisitos), fertilidad y reproducción asistida, aborto, maternidad subrogada, y lo derivado de alcohol, drogas o sustancias no prescritas.",
        "También la corrección de la vista (miopía, astigmatismo, presbicia, lentes), trastornos del sueño y apnea, disfunción sexual, tratamientos psiquiátricos y psicológicos (salvo las hasta 10 consultas de apoyo en casos específicos), tratamientos dentales por enfermedad, magnetoterapia y cualquier gasto que no esté expresamente cubierto.",
        "La lista completa es larga y tiene excepciones. Pídele a Roberto que la revise contigo antes de contratar.",
      ],
      a: [wa("Gastos médicos", "Revisar exclusiones con Roberto", "Quiero que me expliques qué no cubre un seguro de gastos médicos mayores.")],
    },
    g_pago: {
      padre: "gmm",
      m: [
        "Con pago directo, la aseguradora paga al hospital o médico en convenio, con autorización previa por escrito, y tú cubres el deducible, el coaseguro y lo que no esté cubierto.",
        "Con reembolso, tú pagas primero y después la aseguradora te restituye los gastos procedentes. Si te atiendes fuera de la red de convenio, el trámite es por reembolso.",
        "Para una cirugía o un tratamiento programado, pide la programación de servicios antes, con la información médica que respalde la solicitud.",
      ],
      a: [wa("Gastos médicos", "Preguntar cómo se tramita", "Quiero saber cómo se tramita un siniestro de gastos médicos mayores: pago directo y reembolso.")],
    },
    g_renov: {
      padre: "gmm",
      m: [
        "Se renueva automáticamente cada año, a menos que el contratante avise por escrito, en los últimos 30 días de la vigencia, que no quiere renovarla.",
        "En cada renovación se actualizan la prima, el deducible, la suma asegurada, el coaseguro y sus topes, con tu antigüedad respetada y sin nuevos requisitos de asegurabilidad. Las actualizaciones no eliminan coberturas.",
        "Y la aseguradora no puede dejar de renovarte por haber reclamado, salvo que haya dolo o mala fe.",
      ],
      a: [wa("Gastos médicos", "Hablarlo con Roberto", "Quiero entender cómo se renueva y cómo cambia el costo de un seguro de gastos médicos mayores.")],
    },
    ahorro: {
      m: ["Estrategias para construir patrimonio y prepararte para el futuro, con planes en pesos, dólares o UDIS.", "Qué plan te conviene depende de tu objetivo y de tus plazos: se ve con Roberto, con costos y condiciones por escrito."],
      a: [pagina("Ver el seguro de vida con ahorro", "/seguro-de-vida-con-ahorro", "Vida con ahorro"), wa("Ahorro y retiro", "Pedir mi asesoría por WhatsApp", "Quiero revisar opciones de ahorro y retiro.")],
    },
    ppr: {
      m: ["Alternativas de ahorro para el retiro con beneficios fiscales conforme a la legislación aplicable. Las aportaciones pueden ser deducibles según el artículo 151 de la Ley del ISR, con sus topes.", "Es información general, no asesoría fiscal: se revisa con tu contador."],
      a: [wa("PPR", "Pedir mi asesoría por WhatsApp", "Quiero revisar un plan personal de retiro (PPR)."), cita("PPR")],
    },
    /* ---------- Hogar (condiciones generales oficiales) ---------- */
    hogar: {
      m: [
        "Un seguro de hogar protege los daños materiales a tu casa y a lo que hay dentro, y también tu responsabilidad civil familiar frente a terceros. Se arma por coberturas: las básicas son los daños al edificio y a los contenidos, y lo demás se agrega con prima adicional.",
        "Lo que sigue sale de las condiciones generales; lo que aplica a ti queda en la relación de ubicaciones de tu póliza.",
      ],
      o: [
        { t: "¿Qué protege?", n: "h_protege" },
        { t: "¿Cubre sismo, huracán o inundación?", n: "h_fenom" },
        { t: "¿Cubre robo?", n: "h_robo" },
        { t: "¿Qué es la responsabilidad civil familiar?", n: "h_rc" },
        { t: "¿Qué más puedo agregar?", n: "h_mas" },
        { t: "¿Qué no cubre?", n: "h_nocubre" },
        { t: "¿Qué hago si hay un siniestro?", n: "h_sin" },
        { t: "¿Trae asistencia en el hogar?", n: "h_asist" },
      ],
      a: [wa("Hogar", "Pedir mi asesoría por WhatsApp", "Quiero revisar un seguro para mi casa."), cita("Hogar")],
    },
    h_protege: {
      padre: "hogar",
      m: [
        "El edificio: tu vivienda, muros, techos, puertas, ventanas, instalaciones de agua y luz, paneles y calentadores solares, y construcciones o instalaciones fijas como albercas, bardas, palapas o sistemas de riego. Si vives en condominio, entra la parte que te corresponde de las áreas comunes. Si un siniestro agota la suma asegurada, la aseguradora la aumenta automáticamente 10% para pagar.",
        "Los contenidos: muebles, electrodomésticos, ropa, alimentos y, si son perros o gatos mayores de seis meses, gastos veterinarios por accidente o enfermedad, con un límite. Se cubre cualquier riesgo súbito, accidental o imprevisto que no esté excluido.",
        "Ojo con dos reglas: los objetos de alto valor (joyas, relojes, arte, instrumentos; más de 3,000 UMA, una unidad de referencia que se actualiza cada año) deben estar listados en la póliza o no quedan amparados, y los celulares y tabletas deben tener menos de 9 meses de compra y las computadoras menos de 18, con factura.",
      ],
      a: [wa("Hogar", "Revisar mi casa con Roberto", "Quiero revisar qué protegería un seguro de hogar en mi casa y mis cosas.")],
    },
    h_fenom: {
      padre: "hogar",
      m: [
        "El sismo, la erupción volcánica y los fenómenos hidrometeorológicos (huracán, granizo, inundación, vientos tempestuosos, nevada, golpe de mar, entre otros) no vienen en la cobertura básica: se agregan por convenio y con prima adicional, y se pagan como un sublímite de la suma asegurada.",
        "En los fenómenos hidrometeorológicos, si al contratar tus bienes ya están expuestos a una tormenta nombrada, la cobertura entra 14 días naturales después de que inicie la póliza. En cada reclamación se aplica primero el deducible y luego el coaseguro.",
        "No se cubren, por ejemplo, inundaciones que solo afecten tu propiedad, bienes en zonas que Protección Civil considera de alto riesgo de inundación, ni hundimientos o asentamientos del terreno.",
      ],
      a: [wa("Hogar", "Preguntar por sismo y huracán", "Quiero saber si puedo agregar sismo y fenómenos hidrometeorológicos a un seguro de hogar.")],
    },
    h_robo: {
      padre: "hogar",
      m: [
        "Robo de contenidos dentro de la casa: se cubre el robo con violencia, cuando entraron del exterior y dejaron señales visibles, y el asalto. No se cubre el robo sin violencia, la desaparición misteriosa, el extravío ni el robo cometido por empleados domésticos o por quienes viven en la casa. El dinero en efectivo y los valores no entran aquí: tienen su propia cobertura.",
        "Robo fuera de la casa: cubre en todo el mundo el asalto o robo con violencia de tus objetos personales (celular, joyas, ropa, documentos oficiales) mientras los traes tú o alguien de tu familia, y también lo que vaya dentro de un auto si se lo roban o lo violentan.",
        "Son coberturas adicionales: están solo si las contrataste, con los mismos límites de valor y antigüedad de los objetos. Para reclamar piden denuncia ante la autoridad y copia certificada de la carpeta.",
      ],
      a: [wa("Hogar", "Consultar cobertura de robo", "Quiero saber qué cubre el robo en un seguro de hogar.")],
    },
    h_rc: {
      padre: "hogar",
      m: [
        "Es lo que responde por ti, sin dolo, cuando tú o quienes viven contigo causan un daño a otras personas: por ejemplo un derrame de agua o un incendio que afecta a tu vecino, tu perro que lastima a alguien o un accidente jugando un deporte como aficionado. Paga la reparación del daño, el daño moral y los gastos de defensa.",
        "Cubre a ti, a tu cónyuge, a tus hijos que viven contigo o están de viaje de estudio o placer, y a los trabajadores domésticos en sus funciones. Fuera de México aplica solo en viajes de estudio o de placer.",
        "No cubre incumplimiento de contratos, daños a familiares que viven contigo, actividades de negocio, oficio o profesión, daños por sismo o fenómenos naturales, obras estructurales, multas ni daños punitivos.",
      ],
      a: [wa("Hogar", "Preguntar por responsabilidad civil", "Quiero saber cómo funciona la responsabilidad civil familiar de un seguro de hogar.")],
    },
    h_mas: {
      padre: "hogar",
      m: [
        "Además puedes agregar: cristales (vidrios y espejos instalados, sin cubrir raspaduras), remoción de escombros, robo de dinero y valores (en caja fuerte o contigo en la calle, con condiciones), gastos extraordinarios y pérdida de rentas.",
        "Gastos extraordinarios sirve si tienes que dejar tu casa tras un siniestro cubierto: paga renta, hotel, mudanza, almacenaje y sustento inmediato, con un anticipo de un mes sin comprobantes. Pérdida de rentas sirve si tu casa está rentada y dejas de cobrar por un siniestro cubierto.",
        "También existe una cobertura de pérdida de ingresos por fallecimiento o invalidez total y permanente de la persona titular, que se acepta de los 18 a los 64 años y termina al cumplir 65.",
      ],
      a: [wa("Hogar", "Armar mi paquete con Roberto", "Quiero ver qué coberturas adicionales me convienen en un seguro de hogar.")],
    },
    h_nocubre: {
      padre: "hogar",
      m: [
        "Las condiciones generales dejan fuera, entre otras cosas: terrenos, jardines, árboles y cultivos; casas con un giro distinto a habitación o en obra estructural; vehículos que requieren placas; y todo daño que ya existía antes de contratar.",
        "Tampoco cubren desgaste, falta de mantenimiento, humedades por impermeabilizante deficiente o filtraciones por la cimentación, plagas, errores de construcción, hundimientos, robo sin violencia, extravío ni fallas del servicio público de luz, agua o gas.",
        "Cada cobertura trae además sus propias exclusiones. Pídele a Roberto que las revise contigo antes de contratar.",
      ],
      a: [wa("Hogar", "Revisar exclusiones con Roberto", "Quiero que me expliques qué no cubre un seguro de hogar.")],
    },
    h_sin: {
      padre: "hogar",
      m: [
        "Avisa a la aseguradora lo antes posible, por el medio más rápido: las condiciones piden hacerlo dentro de 5 días hábiles desde que te enteras. Haz lo razonable para que el daño no crezca y conserva las partes dañadas hasta que te indiquen.",
        "Si es robo, presenta denuncia. No arregles nada con el tercero responsable sin autorización. A ti te toca demostrar que los bienes eran tuyos, que existían y cuánto valían: facturas, notas de compra o avalúos ayudan mucho.",
        "La aseguradora paga dentro de 30 días naturales desde que tiene la documentación completa. La póliza opera a primer riesgo: si tu suma asegurada es menor al valor del bien, no recorta el pago de forma proporcional; paga el daño hasta la suma asegurada, menos tu deducible o coaseguro. Y ojo: los plazos para reclamar prescriben en 2 años.",
      ],
      a: [wa("Hogar", "Avisarle a Roberto de un siniestro", "Tuve un siniestro en mi casa y necesito ayuda con el trámite.")],
    },
    h_asist: {
      padre: "hogar",
      m: [
        "Si está incluida en tu póliza, trae asistencia en la vivienda las 24 horas, todo el año: plomería, cerrajería, electricidad y vidriería, herrería o carpintería para urgencias. Son hasta 4 eventos al año en total, con un tope por evento; si lo rebasa, la diferencia la pagas tú.",
        "Con cita y cotización hay servicios especializados como pintura e impermeabilización, y la visita de diagnóstico la pagas tú. También puede haber asistencia funeraria, médica (médico a domicilio con costo preferencial y ambulancia), legal y para mascotas, según lo que traiga tu póliza.",
      ],
      a: [wa("Hogar", "Preguntar por la asistencia", "Quiero saber qué servicios de asistencia trae un seguro de hogar.")],
    },
    /* ---------- Auto (condiciones generales oficiales) ---------- */
    auto: {
      m: [
        "Un seguro de auto se arma por coberturas, y lo que no contratas no está cubierto. Las principales son daños materiales, robo total y responsabilidad civil por daños a terceros.",
        "Lo que sigue sale de las condiciones generales; lo que aplica a ti queda en la carátula de tu póliza.",
      ],
      o: [
        { t: "¿Qué cubre?", n: "a_cubre" },
        { t: "¿Cómo funciona el deducible?", n: "a_dedu" },
        { t: "¿Qué no cubre?", n: "a_nocubre" },
        { t: "¿Qué hago si choco o me roban el auto?", n: "a_sin" },
        { t: "¿Cómo es la reparación?", n: "a_repara" },
        { t: "¿Y si es pérdida total?", n: "a_total" },
        { t: "¿Trae asistencia vial?", n: "a_asist" },
      ],
      a: [wa("Auto", "Cotizar mi seguro de auto", "Quiero cotizar mi seguro de auto."), cita("Auto")],
    },
    a_cubre: {
      padre: "auto",
      m: [
        "Daños materiales: choque y volcadura, incendio, fenómenos naturales (granizo, inundación, sismo y más), actos de paros o alborotos y daños durante el traslado del auto. Robo total: el robo del vehículo y los daños que sufra por ese robo.",
        "Responsabilidad civil: lo que debas por daños a terceros en sus bienes, lesiones o muerte, incluido el daño moral, y los costos de un juicio civil. Su límite está en la carátula. La rotura de cristales requiere tener daños materiales.",
        "Se pueden agregar, entre otras, gastos médicos de ocupantes, defensa legal, auto sustituto por robo total, robo parcial de autopartes, multas y corralones, y ayuda para llantas y rines.",
      ],
      a: [wa("Auto", "Armar mi cotización", "Quiero cotizar mi seguro de auto y ver qué coberturas me convienen.")],
    },
    a_dedu: {
      padre: "auto",
      m: [
        "El deducible es lo que pones tú en cada siniestro. En daños materiales y robo total siempre se aplica, y puede ser un monto o un porcentaje de la suma asegurada o del valor comercial a la fecha del siniestro: el que elegiste está en tu carátula.",
        "En responsabilidad civil el deducible es opcional, y si lo contratas la aseguradora responde frente al tercero sin que tengas que pagarlo antes. En rotura de cristales es del 20% del monto de los bienes afectados.",
        "Si recuperan tu auto robado, el deducible solo se aplica si la aseguradora paga daños. Y los servicios de asistencia vial se dan sin deducible.",
      ],
      a: [wa("Auto", "Revisar mi deducible", "Quiero entender cómo funciona el deducible de mi seguro de auto.")],
    },
    a_nocubre: {
      padre: "auto",
      m: [
        "Fuera de la póliza queda lo que no contrataste, el desgaste natural y la depreciación, las descomposturas mecánicas por uso, el robo parcial de autopartes (salvo que contrates esa cobertura) y las partes bajas dañadas al andar fuera de caminos.",
        "Tampoco se cubre el auto cuando maneja alguien sin la licencia que corresponde (con una salvedad si no se le puede imputar culpa o negligencia graves). Y sin un convenio expreso no se cubre un uso distinto al indicado en la póliza, jalar remolques, usarlo para enseñar a manejar, carreras o pruebas de velocidad, ni vehículos blindados.",
        "El robo total no se cubre si lo comete por abuso de confianza un familiar (incluida tu pareja) o quien aparece como asegurado, ni delitos distintos al robo, como extorsión, fraude o secuestro. Manejar bajo los efectos del alcohol o de drogas tiene reglas de exclusión propias que dependen del uso del auto: revísalas con las condiciones a la mano.",
      ],
      a: [wa("Auto", "Revisar exclusiones con Roberto", "Quiero que me expliques qué no cubre un seguro de auto.")],
    },
    a_sin: {
      padre: "auto",
      m: [
        "Primero evita o reduce el daño y, si no hay peligro, pide instrucciones a la aseguradora. Avísale por escrito dentro de los 5 días siguientes al siniestro (salvo fuerza mayor): un aviso tardío puede reducir la indemnización.",
        "Si fue robo u otro delito, presenta denuncia ante la autoridad y coopera para recuperar el auto.",
        "No repares ni desarmes el vehículo antes de que la aseguradora lo valúe: si lo haces, no queda obligada a indemnizar. La valuación debe empezar dentro de las 72 horas siguientes al aviso.",
      ],
      a: [wa("Auto", "Avisarle a Roberto de un siniestro", "Tuve un siniestro con mi auto y necesito ayuda con el trámite.")],
    },
    a_repara: {
      padre: "auto",
      m: [
        "Tras la valuación, la aseguradora puede indemnizarte o reparar el auto. Si repara, los modelos del año en curso y hasta un año anterior van a la agencia de la marca; los más antiguos, a talleres multimarca, donde las refacciones pueden ser genuinas, genéricas o de otras marcas.",
        "Los plazos, en días hábiles desde que termina la valuación (o llegan las piezas): hojalatería y pintura, 20 días; si hay que cambiar piezas, 10 más; si se toca algo mecánico o eléctrico, 20 más. La disponibilidad de refacciones depende del mercado, y la garantía de la reparación la da por escrito el centro de reparación.",
        "Si hay que cambiar el motor completo o llantas, se descuenta la depreciación por uso.",
      ],
      a: [wa("Auto", "Preguntar por la reparación", "Quiero saber cómo funciona la reparación de mi auto en un siniestro.")],
    },
    a_total: {
      padre: "auto",
      m: [
        "Si los daños pasan de 50% del valor comercial (o del valor convenido en tu carátula), la aseguradora, con tu autorización, puede considerar el auto pérdida total. Si pasan de 75%, lo considera pérdida total sin más.",
        "Se indemniza según lo que diga tu carátula: valor comercial o valor convenido. El valor comercial sale del promedio de publicaciones especializadas del mercado automotriz mexicano al momento del siniestro; en un auto último modelo con menos de 12 meses de uso, parte del valor factura menos 1.7% por cada mes de uso. El valor convenido lo acuerdas con la aseguradora con base en un avalúo.",
        "Si pagas la prima en parcialidades, de la indemnización se descuenta la prima que falte para completar el año.",
      ],
      a: [wa("Auto", "Elegir valor comercial o convenido", "Quiero entender la diferencia entre valor comercial y valor convenido en un seguro de auto.")],
    },
    a_asist: {
      padre: "auto",
      m: [
        "Si la contrataste, la asistencia se da sin deducible, en la República y desde tu domicilio (kilómetro 0), hasta un radio de 80 km del centro en la Ciudad de México y de 50 km en otras ciudades.",
        "Incluye envío y pago de mecánico por falta de gasolina, batería descargada o llanta ponchada (tú pagas la gasolina, el aceite, el acumulador o la reparación de la llanta), remolque hasta el taller más cercano, referencia de talleres y orientación para denunciar un robo total. Mecánico y remolque, hasta dos eventos al año.",
        "Si hay un accidente, hay traslado médico al hospital más cercano, también hasta dos eventos al año.",
      ],
      a: [wa("Auto", "Preguntar por la asistencia", "Quiero saber qué asistencia vial incluye un seguro de auto.")],
    },
    nose: {
      m: ["Está bien. Para saber qué seguro te conviene, Roberto necesita conocer tu situación: tus ingresos, quién depende de ti, tus deudas y lo que quieres cuidar.", "Mientras tanto, puedes hacer un primer cálculo de cuánto seguro de vida necesitarías."],
      a: [pagina("Abrir la calculadora", "/escudo", "Calculadora"), cita("No sé cuál", "Platicarlo en una llamada"), wa("No sé cuál", "Escribirle a Roberto", "Quiero que me ayudes a saber qué seguro necesito.")],
    },

    /* ---------- Cliente y contacto ---------- */
    cliente: {
      m: ["Para dudas de tu póliza, un siniestro o un pago, lo más rápido es escribirle directo a Roberto por WhatsApp: ahí te atiende él.", "Este asistente no te pide datos personales ni de tu póliza."],
      a: [wa("Cliente", "Escribirle a Roberto", "Soy cliente y tengo una duda sobre mi póliza."), llamar("Cliente")],
    },
    contacto: {
      m: ["Con gusto. ¿Cómo prefieres?"],
      a: [wa("Contacto", "Escribirle por WhatsApp", "Quiero recibir asesoría para conocer qué seguro es más adecuado para mí."), cita("Contacto", "Agendar una cita"), llamar("Contacto")],
    },
  };

  /* ================================ CÓDIGO ================================ */
  const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Medición anónima y sin cookies (la misma de la tarjeta) */
  const qs = new URLSearchParams(location.search);
  let refHost = "";
  try { refHost = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : ""; } catch (_) {}
  const ctx = {
    v: matchMedia("(hover:none) and (pointer:coarse)").matches ? "movil" : "escritorio",
    f: (qs.get("s") || refHost || "directo").toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 30) || "directo",
  };
  const medir = (e, d) => {
    try {
      const body = JSON.stringify({ e, d: String(d || "").slice(0, 60), ...ctx });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/tarjeta/evento", new Blob([body], { type: "application/json" }));
      else fetch("/api/tarjeta/evento", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
    } catch (_) {}
  };

  const waUrl = (msg) => "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent("Hola Roberto, hablé con tu asistente virtual. " + msg + " " + ORIGEN);
  const SVG_RESPALDO = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="63" fill="#0a0c1c"/><path d="M64 14C74 22 88 26 100 26V62C100 88 84 104 64 114C44 104 28 88 28 62V26C40 26 54 22 64 14Z" fill="#2a22f5"/></svg>');

  /* Todo lo de abajo se arma cuando la página ya cargó y el navegador está libre (función «arrancar», al final): así no compite con lo que la persona ve primero */
  function arrancar() {
  /* ---------- Contenedor aislado (Shadow DOM): los estilos de la página no lo tocan ---------- */
  const host = document.createElement("div");
  host.id = "asistente-rr";
  const raiz = host.attachShadow({ mode: "open" });
  raiz.innerHTML = `
<style>
:host{all:initial}
*,*::before,*::after{box-sizing:border-box}
button,a{font:inherit;color:inherit}
.lanza,.burbuja,.panel,.aro{position:fixed;right:max(12px,env(safe-area-inset-right,0px));z-index:60;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.lanza{bottom:calc(var(--abajo,20px) + env(safe-area-inset-bottom,0px));width:64px;height:64px;padding:0;border-radius:50%;border:2px solid rgba(91,123,255,.6);background:#0a0c1c;
  cursor:pointer;overflow:hidden;box-shadow:0 12px 32px -10px rgba(42,34,245,.85),0 0 0 4px rgba(91,123,255,.14);transition:bottom .25s ease,transform .15s ease,opacity .2s ease}
.lanza:hover{transform:scale(1.06)}
.lanza.espera,.burbuja.espera{opacity:0;visibility:hidden;pointer-events:none;transform:scale(.85)}
.lanza img{display:block;width:100%;height:100%;object-fit:cover}
/* Llamar la atención sin molestar: entra con un salto, da un saltito con un aro que se expande y lanza la pregunta. Solo transform/opacity (no mueve nada de la página), dura pocos segundos y no se repite en bucle */
.aro{z-index:59;bottom:calc(var(--abajo,20px) + env(safe-area-inset-bottom,0px));width:64px;height:64px;border:3px solid #5b7bff;border-radius:50%;opacity:0;pointer-events:none;transition:bottom .25s ease}
.aro.on{animation:aro 1.6s ease-out 2}
.lanza.espera~.aro,.lanza.abierto~.aro{display:none}
.lanza.entra{animation:pop .6s cubic-bezier(.2,.9,.3,1.25) both}
.lanza.hola{animation:hola 1.4s ease-in-out}
@keyframes pop{0%{opacity:0;transform:scale(.35)}100%{opacity:1;transform:none}}
@keyframes hola{0%,100%{transform:none}12%{transform:translateY(-14px) rotate(-8deg)}26%{transform:translateY(0) rotate(7deg)}40%{transform:translateY(-8px) rotate(-5deg)}54%{transform:translateY(0) rotate(3deg)}68%{transform:none}}
@keyframes aro{0%{opacity:.8;transform:scale(1)}100%{opacity:0;transform:scale(1.7)}}
.lanza:focus-visible,.cerrar:focus-visible,.inicio:focus-visible,.mas-ops:focus-visible,.chip:focus-visible,.sal:focus-visible,.burbuja:focus-visible{outline:3px solid #fff;outline-offset:3px}
.panel:focus,.panel:focus-visible{outline:none}
.burbuja::after{content:"";position:absolute;right:24px;bottom:-5px;width:12px;height:12px;background:#fff;border-radius:0 0 3px 0;transform:rotate(45deg)}
.burbuja{bottom:calc(var(--abajo,20px) + env(safe-area-inset-bottom,0px) + 76px);max-width:230px;padding:10px 14px;border:0;border-radius:16px 16px 4px 16px;background:#fff;color:#0a0c1c;
  font-weight:700;font-size:14px;line-height:1.3;text-align:left;cursor:pointer;box-shadow:0 14px 34px -12px rgba(0,0,0,.7);
  opacity:0;transform:translateY(6px);pointer-events:none;transition:opacity .25s,transform .25s,bottom .25s}
.burbuja.on{opacity:1;transform:none;pointer-events:auto}
.panel{bottom:calc(var(--abajo,20px) + env(safe-area-inset-bottom,0px) + 76px);width:min(390px,calc(100vw - 24px));max-height:min(620px,calc(100vh - var(--abajo,20px) - 104px));max-height:min(620px,calc(100dvh - var(--abajo,20px) - 104px));
  display:flex;flex-direction:column;border:1px solid rgba(180,192,255,.22);border-radius:22px;color:#f2f4ff;background:linear-gradient(165deg,#111741,#0a0c1c 70%);
  box-shadow:0 30px 80px -20px rgba(0,0,0,.9);opacity:0;visibility:hidden;transform:translateY(10px) scale(.98);transform-origin:bottom right;
  transition:opacity .18s,transform .18s,visibility .18s,bottom .25s}
.panel.on{opacity:1;visibility:visible;transform:none}
.cab{display:flex;align-items:center;gap:10px;padding:12px 8px 12px 14px;border-bottom:1px solid rgba(180,192,255,.14)}
.cab img{width:42px;height:42px;flex:none;border-radius:50%;object-fit:cover;border:1px solid rgba(91,123,255,.5);background:#0a0c1c}
.cab div{flex:1;min-width:0}
.cab h2{margin:0;font:800 15px/1.2 Montserrat,Inter,system-ui,sans-serif;color:#fff}
.cab p{margin:2px 0 0;font-size:12px;line-height:1.3;color:#9aa1c8}
.inicio{display:flex;align-items:center;gap:6px;flex:none;min-height:44px;padding:0 12px;border:1px solid rgba(91,123,255,.65);border-radius:999px;background:rgba(91,123,255,.14);color:#f2f4ff;font-weight:700;font-size:13px;line-height:1;cursor:pointer}
.inicio:hover{background:rgba(91,123,255,.28)}
.inicio svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.cerrar{display:grid;place-items:center;width:44px;height:44px;flex:none;border:0;border-radius:12px;background:transparent;color:#b8bedd;cursor:pointer}
.cerrar:hover{background:rgba(120,140,255,.12);color:#fff}
.cerrar svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}
.zona{position:relative;display:flex;flex-direction:column;flex:1;min-height:120px}
.cuerpo{position:relative;flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:14px;display:flex;flex-direction:column;gap:10px}
.mas-ops{position:absolute;right:12px;bottom:10px;display:flex;align-items:center;gap:6px;min-height:38px;padding:0 15px;border:1px solid rgba(180,192,255,.45);border-radius:999px;background:rgba(10,12,28,.95);color:#fff;font-weight:700;font-size:13px;line-height:1;cursor:pointer;box-shadow:0 8px 22px -8px rgba(0,0,0,.9)}
.mas-ops[hidden]{display:none}
.bot,.yo{max-width:92%;border-radius:16px;font-size:15px;line-height:1.5}
.bot{align-self:flex-start;padding:10px 13px 4px;border-bottom-left-radius:4px;background:rgba(120,140,255,.1);border:1px solid rgba(180,192,255,.14);color:#e6e9ff}
.bot p{margin:0 0 8px;white-space:pre-line}
.yo{align-self:flex-end;padding:9px 13px;border-bottom-right-radius:4px;background:linear-gradient(180deg,#5b7bff,#2a22f5);color:#fff;font-weight:600;font-size:14.5px;line-height:1.4}
.pensando{align-self:flex-start;display:flex;gap:5px;padding:13px 15px;border-radius:16px;border-bottom-left-radius:4px;background:rgba(120,140,255,.1);border:1px solid rgba(180,192,255,.14)}
.pensando i{width:7px;height:7px;border-radius:50%;background:#8da2ff;animation:pt 1s infinite ease-in-out}
.pensando i:nth-child(2){animation-delay:.15s}.pensando i:nth-child(3){animation-delay:.3s}
@keyframes pt{0%,60%,100%{opacity:.35;transform:none}30%{opacity:1;transform:translateY(-3px)}}
.ctl{display:flex;flex-direction:column;gap:8px;margin-top:2px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{min-height:44px;padding:9px 14px;border:1px solid rgba(91,123,255,.65);border-radius:16px;background:rgba(91,123,255,.1);color:#f2f4ff;font-weight:600;font-size:14px;line-height:1.25;text-align:left;cursor:pointer;transition:background .15s,border-color .15s}
.chip:hover{background:rgba(91,123,255,.22);border-color:#8da2ff}
.chip.suave{border-color:rgba(180,192,255,.45);background:rgba(120,140,255,.07);color:#e3e7ff;font-weight:600}
.chip.suave::before{content:"← "}
.salidas{display:grid;gap:8px;margin-top:2px}
.sal{display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:10px 14px;border:1px solid transparent;border-radius:14px;font-weight:700;font-size:15px;line-height:1.2;text-align:center;text-decoration:none;cursor:pointer;transition:filter .15s,background .15s}
.sal svg{width:19px;height:19px;flex:none;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.sal.wa{background:#25d366;color:#04230f}.sal.wa:hover{background:#45e07f}
.sal.ag{background:linear-gradient(180deg,#5b7bff,#2a22f5);color:#fff}.sal.ag:hover{filter:brightness(1.1)}
.sal.fan{background:rgba(120,140,255,.08);border-color:rgba(180,192,255,.28);color:#f2f4ff}.sal.fan:hover{background:rgba(120,140,255,.16)}
.selector label{display:block;margin:0 0 6px;font-size:12.5px;font-weight:600;color:#9aa1c8}
.selector select{display:block;width:100%;min-height:50px;padding:0 44px 0 14px;border:1px solid rgba(91,123,255,.75);border-radius:14px;color:#f2f4ff;cursor:pointer;font:600 15px/1.2 Inter,ui-sans-serif,system-ui,sans-serif;-webkit-appearance:none;appearance:none;background:#0f1538 url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23b8bedd' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>") no-repeat right 14px center/18px}
.selector select:focus-visible{outline:3px solid #fff;outline-offset:3px}
.selector option{background:#0f1538;color:#f2f4ff}
.pie{padding:9px 14px 12px;border-top:1px solid rgba(180,192,255,.12);font-size:11.5px;line-height:1.45;color:#8a91b8}
.pie a{color:#b8bedd;text-underline-offset:2px}
/* Celular: el panel se acomoda como una hoja pegada a la barra de abajo, mas alto, y el boton flotante se esconde mientras esta abierto */
@media (max-width:600px){
  .panel{left:8px;right:8px;width:auto;bottom:calc(var(--abajo,20px) + env(safe-area-inset-bottom,0px));max-height:calc(100vh - var(--abajo,20px) - 24px);max-height:min(640px,calc(100dvh - var(--abajo,20px) - 24px))}
  .lanza.abierto,.burbuja.abierto{opacity:0;visibility:hidden;pointer-events:none}
  .cab{gap:8px}.cab h2{font-size:14px}.cab>img{width:36px;height:36px}
}
@media (max-width:420px){.cab p{display:none}.inicio{padding:0 10px}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;animation:none!important}}
@media print{:host{display:none}}
</style>
<button type="button" class="lanza" aria-haspopup="dialog" aria-expanded="false"><img alt="" width="64" height="64" decoding="async"></button>
<span class="aro" aria-hidden="true"></span>
<button type="button" class="burbuja" tabindex="-1" aria-hidden="true"></button>
<section class="panel" role="dialog" aria-modal="false" tabindex="-1">
  <header class="cab">
    <img alt="" width="42" height="42" decoding="async">
    <div><h2></h2><p>Asistente virtual · respuestas de Roberto</p></div>
    <button type="button" class="inicio" aria-label="Inicio: volver al menú principal"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>Inicio</button>
    <button type="button" class="cerrar" aria-label="Cerrar el asistente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
  </header>
  <div class="zona"><div class="cuerpo" role="log" aria-live="polite" aria-relevant="additions"></div><button type="button" class="mas-ops" hidden>↓ Ver más opciones</button></div>
  <footer class="pie">No es una cotización ni una asesoría. No te pide ni guarda datos personales. <a href="/privacidad">Aviso de privacidad</a></footer>
</section>`;

  const $ = (s) => raiz.querySelector(s);
  const lanza = $(".lanza"), burbuja = $(".burbuja"), aro = $(".aro"), panel = $(".panel"), cuerpo = $(".cuerpo"), inicioBtn = $(".inicio"), masOps = $(".mas-ops");
  const imgs = raiz.querySelectorAll("img");
  imgs.forEach((im) => { im.src = BOT.mascota; im.addEventListener("error", () => { im.src = SVG_RESPALDO; }, { once: true }); });
  $(".cab h2").textContent = BOT.nombre;
  panel.setAttribute("aria-label", BOT.nombre);
  lanza.setAttribute("aria-label", "Abrir el " + BOT.nombre.charAt(0).toLowerCase() + BOT.nombre.slice(1));

  const IC = {
    wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.6 20.4l1.25-4.3A8.6 8.6 0 1 1 8 19.3z"/><path d="M9.2 8.1c-.4.4-.6 1-.4 1.8.6 2.2 2.6 4.3 4.9 4.9.8.2 1.4 0 1.8-.4l.4-.6-1.9-1.1-.8.7c-.9-.4-1.8-1.3-2.2-2.2l.7-.8-1.1-1.9z"/></svg>',
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    tel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
    arr: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
  };

  /* ---------- Avisos: para que lo noten, al verse entra con un salto y, a los 2.5 s, da un saltito con un aro y lanza una pregunta
     en la burbuja (9 s). Si nadie lo abre, repite 20 s después con otra pregunta y ya no insiste. Se cuenta por visita (sessionStorage):
     al cambiar de página no empieza de cero y, si ya lo abrieron, no vuelve a avisar. Sin repetir en bucle: nada dura más de unos segundos. ---------- */
  const PAGINA = location.pathname.replace(/\/+$/, "") || "/";
  const PREGUNTAS = BOT.avisosPagina[PAGINA] || BOT.avisos;
  const MAX_AVISOS = 2;
  const leer = (k) => { try { return sessionStorage.getItem(k); } catch (_) { return null; } };
  const guardar = (k, v) => { try { sessionStorage.setItem(k, v); } catch (_) {} };
  let hechos = parseInt(leer("asistente-avisos"), 10) || 0, yaAbierto = !!leer("asistente-abierto");
  let yaEntro = false, tSig = null, tBurbuja = null;
  function animar(el, clase, ms) { el.classList.remove(clase); void el.offsetWidth; el.classList.add(clase); setTimeout(() => el.classList.remove(clase), ms); }
  function planear() {
    if (tSig || abierto || abiertoAntes || yaAbierto || hechos >= MAX_AVISOS || lanza.classList.contains("espera")) return;
    tSig = setTimeout(avisar, hechos === 0 ? 2500 : 20000);
  }
  function avisar() {
    tSig = null;
    if (abierto || abiertoAntes || yaAbierto || hechos >= MAX_AVISOS) return;
    if (lanza.classList.contains("espera")) return; // se ve de nuevo (barra de abajo) y acomodar() lo reprograma
    if (document.hidden) { planear(); return; }
    burbuja.textContent = PREGUNTAS[Math.min(hechos, PREGUNTAS.length - 1)];
    hechos++; guardar("asistente-avisos", String(hechos));
    burbuja.classList.add("on");
    animar(lanza, "hola", 1500); animar(aro, "on", 3400);
    clearTimeout(tBurbuja); tBurbuja = setTimeout(() => burbuja.classList.remove("on"), 9000);
    planear();
  }

  /* ---------- Posición: se acomoda sobre las barras fijas de abajo (la de la tarjeta o la de las páginas de contenido) ---------- */
  function acomodar() {
    let abajo = 20;
    const dock = document.getElementById("dock");
    const barra = document.getElementById("bar");
    if (dock && dock.classList.contains("on") && getComputedStyle(dock).display !== "none") abajo = dock.offsetHeight + 14;
    else if (barra && !barra.hidden) abajo = barra.offsetHeight + 14;
    host.style.setProperty("--abajo", abajo + "px");
    // En la tarjeta de celular la portada ocupa todo el ancho: el botón espera a que aparezca la barra de abajo para no taparla
    const espera = !abierto && !!dock && getComputedStyle(dock).display !== "none" && !dock.classList.contains("on");
    lanza.classList.toggle("espera", espera); burbuja.classList.toggle("espera", espera);
    lanza.tabIndex = espera ? -1 : 0; lanza.setAttribute("aria-hidden", espera ? "true" : "false");
    if (!espera && !abierto) { // en cuanto se ve por primera vez: entra con un salto y se programan los avisos
      if (!yaEntro) { yaEntro = true; animar(lanza, "entra", 700); }
      planear();
    }
  }
  ["dock", "bar"].forEach((id) => { const el = document.getElementById(id); if (el) new MutationObserver(acomodar).observe(el, { attributes: true, attributeFilter: ["class", "hidden"] }); });
  addEventListener("resize", acomodar);

  /* ---------- Conversación ---------- */
  let abiertoAntes = false, abierto = false, anterior = null;
  const esAqui = (href) => href.split("#")[0] === location.pathname && href.indexOf("#") === -1;

  function el(tag, cls, texto) { const e = document.createElement(tag); if (cls) e.className = cls; if (texto != null) e.textContent = texto; return e; }
  function cue() { const resto = cuerpo.scrollHeight - cuerpo.scrollTop - cuerpo.clientHeight; masOps.hidden = !abierto || resto < 28; }
  function bajar(nodo) { requestAnimationFrame(() => { cuerpo.scrollTop = Math.max(0, nodo.offsetTop - 10); cue(); }); }
  function quitarControles() { cuerpo.querySelectorAll(".ctl").forEach((c) => c.remove()); }

  function abrirAgenda(tema) {
    cerrar(false);
    medir("agendar", "asistente:" + tema);
    const a = document.querySelector("[data-agenda]");
    if (!a) { window.open(AGENDA_URL, "_blank", "noopener"); return; }
    // Se usa la ventana de agenda que ya trae la página; se quita un instante su etiqueta de medición para no contar dos veces el toque
    const ev = a.dataset.ev;
    if (ev !== undefined) delete a.dataset.ev;
    a.click();
    if (ev !== undefined) a.dataset.ev = ev;
  }

  function salida(s) {
    if (s.k === "wa") {
      const a = el("a", "sal wa"); a.href = waUrl(s.msg); a.target = "_blank"; a.rel = "noopener";
      a.innerHTML = IC.wa; a.append(s.t);
      a.addEventListener("click", () => medir("wa", "asistente:" + s.tema));
      return a;
    }
    if (s.k === "agenda") {
      const b = el("button", "sal ag"); b.type = "button"; b.innerHTML = IC.cal; b.append(s.t);
      b.addEventListener("click", () => abrirAgenda(s.tema));
      return b;
    }
    if (s.k === "call") {
      const a = el("a", "sal fan"); a.href = "tel:" + TELEFONO; a.innerHTML = IC.tel; a.append(s.t);
      a.addEventListener("click", () => medir("llamar", "asistente"));
      return a;
    }
    const a = el("a", "sal fan"); a.href = s.href; a.innerHTML = IC.arr; a.append(s.t);
    a.addEventListener("click", () => { medir("bot", "pagina:" + s.etiqueta); if (esAqui(s.href) || s.href.indexOf("#") !== -1 && s.href.split("#")[0] === location.pathname) cerrar(false); });
    return a;
  }

  let nSel = 0;
  function selector() {
    const w = el("div", "selector");
    const idSel = "seg" + (++nSel);
    const l = el("label", null, "Elige un seguro"); l.htmlFor = idSel;
    const sel = el("select"); sel.id = idSel;
    const ph = el("option", null, "Elige un seguro…"); ph.value = ""; ph.disabled = true; ph.selected = true; sel.append(ph);
    RAMOS.forEach((r) => { const o = el("option", null, r.t); o.value = r.v; sel.append(o); });
    sel.addEventListener("change", () => { const r = RAMOS.find((x) => x.v === sel.value); if (r) elegir({ t: r.t, n: r.n, tema: r.tema }); });
    w.append(l, sel);
    return w;
  }

  function controles(nodo, id) {
    const c = el("div", "ctl");
    const enMenu = id === "inicio" || id === "menu";
    if (nodo.sel) c.append(selector());
    const opciones = nodo.o || [];
    const hayChips = opciones.length || !enMenu;
    if (hayChips) {
      const chips = el("div", "chips");
      opciones.forEach((o) => {
        const b = el("button", "chip", o.t); b.type = "button";
        b.addEventListener("click", () => elegir(o));
        chips.append(b);
      });
      if (nodo.padre) {
        const otra = el("button", "chip suave", "Otra pregunta"); otra.type = "button";
        otra.addEventListener("click", () => elegir({ t: "Otra pregunta", otra: nodo.padre }));
        chips.append(otra);
      }
      if (!enMenu) {
        const v = el("button", "chip suave", "Volver al inicio"); v.type = "button";
        v.addEventListener("click", () => elegir({ t: "Volver al inicio", n: "menu", volver: true }));
        chips.append(v);
      }
      c.append(chips);
    }
    const sal = (nodo.a || []).filter((s) => !(s.k === "link" && esAqui(s.href)));
    if (sal.length) { const g = el("div", "salidas"); sal.forEach((s) => g.append(salida(s))); c.append(g); }
    return c;
  }

  let pendiente = null;
  function mostrar(id, usuario, forzado, sinDemora) {
    const nodo = forzado || NODOS[id];
    clearTimeout(pendiente);
    cuerpo.querySelectorAll(".pensando").forEach((x) => x.remove());
    quitarControles();
    if (usuario) cuerpo.append(el("div", "yo", usuario));
    const poner = () => {
      const burb = el("div", "bot");
      nodo.m.forEach((p) => burb.append(el("p", null, p)));
      cuerpo.append(burb);
      cuerpo.append(controles(nodo, id));
      bajar(burb);
      anterior = id;
    };
    if (sinDemora || reducido) { poner(); return; }
    const pensando = el("div", "pensando"); pensando.setAttribute("aria-hidden", "true"); pensando.innerHTML = "<i></i><i></i><i></i>";
    cuerpo.append(pensando); cuerpo.scrollTop = cuerpo.scrollHeight;
    pendiente = setTimeout(() => { pensando.remove(); poner(); }, 450);
  }
  /* Vuelve al menu principal con la conversacion en blanco */
  function reiniciar(conDemora) {
    clearTimeout(pendiente);
    cuerpo.textContent = "";
    mostrar("inicio", null, null, !conDemora);
    cuerpo.scrollTop = 0; cue();
  }

  function elegir(o) {
    if (o.otra) {
      const p = NODOS[o.otra];
      medir("bot", "otra");
      mostrar(o.otra, o.t, { m: ["Claro. ¿Qué más te gustaría saber?"], o: p.o, a: p.a, padre: null, _id: o.otra });
      return;
    }
    if (o.tema) medir("bot", "tema:" + o.tema);
    else if (!o.volver) medir("bot", "p:" + o.t);
    mostrar(o.n, o.t);
  }

  /* ---------- Abrir y cerrar ---------- */
  function abrir() {
    if (abierto) return;
    abierto = true; yaAbierto = true; guardar("asistente-abierto", "1"); clearTimeout(tSig); tSig = null; clearTimeout(tBurbuja); acomodar();
    panel.classList.add("on"); lanza.setAttribute("aria-expanded", "true"); burbuja.classList.remove("on");
    lanza.classList.add("abierto"); burbuja.classList.add("abierto");
    if (!abiertoAntes) { abiertoAntes = true; medir("bot", "abrir"); mostrar("inicio"); }
    else reiniciar(false); // al volver a abrirlo empieza otra vez en el menu principal
    setTimeout(() => panel.focus({ preventScroll: true }), 30);
  }
  function cerrar(devolverFoco) {
    if (!abierto) return;
    abierto = false;
    panel.classList.remove("on"); lanza.setAttribute("aria-expanded", "false");
    lanza.classList.remove("abierto"); burbuja.classList.remove("abierto"); cue();
    if (devolverFoco !== false) lanza.focus({ preventScroll: true });
  }
  lanza.addEventListener("click", () => (abierto ? cerrar() : abrir()));
  $(".cerrar").addEventListener("click", () => cerrar());
  inicioBtn.addEventListener("click", () => { medir("bot", "inicio"); reiniciar(true); });
  masOps.addEventListener("click", () => { cuerpo.scrollTop = cuerpo.scrollHeight; cue(); });
  cuerpo.addEventListener("scroll", cue, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(cue).observe(cuerpo);
  burbuja.addEventListener("click", abrir);
  raiz.addEventListener("keydown", (e) => { if (e.key === "Escape" && abierto) { e.stopPropagation(); cerrar(); } });

  document.body.appendChild(host);
  acomodar();
  window.AsistenteRR = { abrir, cerrar };
  }

  const cuando = () => ("requestIdleCallback" in window ? requestIdleCallback(arrancar, { timeout: 3000 }) : setTimeout(arrancar, 1500));
  if (document.readyState === "complete") cuando(); else addEventListener("load", cuando, { once: true });
})();
