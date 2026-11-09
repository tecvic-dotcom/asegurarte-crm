/*
 * Trayectoria y actividad profesional: datos COMPARTIDOS por la tarjeta (/roberto, que muestra solo las fotos con «destacada: true») y por la página
 * /trayectoria (que muestra todo: los reconocimientos y el evento). Para agregar un reconocimiento: copiar sus archivos a /tarjeta/reconocimientos/<id>.jpg y .webp
 * y sumar una línea en `fotos` (del más reciente al más antiguo). Cada foto acepta `anio`, `otorgado` y `explica` (se muestran solo si tienen texto; no se inventan).
 */
window.TRAYECTORIA = {
  // Eventos: un video real y fotos (archivos en /tarjeta/eventos/<id>.jpg|webp, recorte 4:5)
  eventos: {
    titulo: "Estuve en la inauguración de una nueva clínica",
    texto: "Recorrido por una nueva clínica médica en Cumbres, Monterrey (octubre de 2026).",
    avisoIa: "Imágenes reales del evento; la narración del video se creó con inteligencia artificial.",
    video: { id: "inauguracion", titulo: "Inauguración de una nueva clínica en Cumbres", dur: 60, real: true },
    fotos: [
      { id: "entrada", pie: "La entrada de la nueva clínica", alt: "Entrada de la nueva clínica médica en Cumbres" },
      { id: "recepcion", pie: "En la recepción", alt: "Roberto Rodríguez en la recepción de la clínica" },
      { id: "recorrido", pie: "El recorrido de la inauguración", alt: "Invitados recorriendo el pasillo de la clínica durante la inauguración" },
      { id: "consultorio", pie: "Uno de los consultorios", alt: "Consultorio de la clínica decorado con globos azules" },
      { id: "rayos-x", pie: "Sala de rayos X", alt: "Sala de rayos X de la clínica" },
      { id: "terapia-fisica", pie: "Gimnasio de terapia física", alt: "Gimnasio de terapia física de la clínica" }
    ]
  },

  // Reconocimientos, del más reciente al más antiguo (archivos en /tarjeta/reconocimientos/<id>.jpg|webp, completos; «pos» = qué parte se ve en la tarjeta 4:5, la ventana los muestra enteros)
  reconocimientos: {
    kicker: "Reconocimientos",
    titulo: "Experiencia y trayectoria respaldadas por resultados",
    texto: "A lo largo de mi trayectoria he tenido la oportunidad de recibir reconocimientos por mi desempeño y compromiso en el sector asegurador. Cada logro representa años de aprendizaje, preparación y dedicación a mis clientes.",
    // Cada foto puede llevar, además del nombre (`pie`): `anio`, `otorgado` (quién lo entregó, sin nombrar aseguradoras) y `explica` (qué representa y qué significa para el cliente).
    // Se muestran debajo de la foto SOLO cuando tienen texto: los datos los confirma Roberto, no se inventan.
    fotos: [
      { id: "entrega", destacada: true, pie: "Agente ALFA", anio: "2026", alt: "Cuatro agentes sostienen sus reconocimientos enmarcados en la entrega de reconocimientos 2026", pos: "50% 65%" },
      { id: "recibiendo", pie: "Entrega de premios campaña Salud", anio: "2026", alt: "Roberto Rodríguez junto a un compañero con un obsequio en la entrega de premios de la campaña Salud", pos: "50% 40%" },
      { id: "escenario", pie: "Agente ALFA", anio: "2025", alt: "Roberto Rodríguez recibiendo la placa «Reconocimiento Agente ALFA» en el escenario", pos: "50% 50%" },
      { id: "regional-noreste", pie: "Agente ALFA", anio: "2024", alt: "Pantalla con la lista de reconocimientos de la Regional Noreste y los agentes reconocidos con sus placas", pos: "40% 55%" },
      { id: "club-reclutamiento", pie: "Club de Reclutamiento y Desarrollo", anio: "2023", alt: "Agentes con los brazos en alto sobre el escenario del Club de Reclutamiento y Desarrollo", pos: "62% 50%" },
      { id: "reconocimiento", pie: "Agente ALFA", anio: "2023", alt: "Roberto Rodríguez y compañeros con una placa del Reconocimiento Agente ALFA", pos: "50% 50%" },
      { id: "mesa-campeones", destacada: true, pie: "Mesa de Campeones Vida", anio: "2020", alt: "Roberto Rodríguez frente al letrero «Mesa de Campeones Vida: tu lugar entre los mejores»", pos: "86% 50%" },
      { id: "congreso-agentes", destacada: true, pie: "Congreso Nacional de Agentes", anio: "2019", alt: "Entrega de reconocimientos en el Congreso Nacional de Agentes", pos: "40% 50%" },
      { id: "rompe-paradigmas", pie: "Reconocimiento «Rompe paradigmas»", anio: "2018", alt: "Roberto Rodríguez con su reconocimiento «Rompe paradigmas»", pos: "50% 50%" }
    ]
  },
};
