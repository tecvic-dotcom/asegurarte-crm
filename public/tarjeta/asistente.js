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
    burbuja: "¿Te ayudo?",
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

  const NODOS = {
    inicio: {
      m: [
        "¡Hola! Soy el asistente virtual de Roberto. No soy una persona: te muestro respuestas que Roberto dejó preparadas y, cuando quieras, te paso con él.",
        "¿Qué te gustaría resolver?",
      ],
      o: [
        { t: "Quiero cuidar a mi familia", n: "familia", tema: "Familia" },
        { t: "Quiero ahorrar con un seguro de vida", n: "vida", tema: "Vida con ahorro" },
        { t: "Tengo un negocio", n: "negocio", tema: "Negocio" },
        { t: "Gastos médicos", n: "gmm", tema: "Gastos médicos" },
        { t: "Ya soy cliente", n: "cliente", tema: "Cliente" },
        { t: "Hablar con Roberto", n: "contacto", tema: "Contacto" },
      ],
    },

    /* ---------- Familia ---------- */
    familia: {
      m: ["Empezamos por lo que más le dolería a tu familia si faltara tu ingreso: los gastos de todos los días, las deudas y la escuela. Con eso se decide qué protección tiene sentido, y cuál no."],
      o: [
        { t: "¿Cuánto seguro de vida necesito?", n: "f_cuanto" },
        { t: "¿Qué pasaría si dejo de generar ingresos?", n: "f_ingresos" },
        { t: "¿Qué seguro debería contratar primero?", n: "f_primero" },
      ],
      a: [wa("Familia", "Pedir mi asesoría por WhatsApp", "Quiero revisar qué protección necesita mi familia.")],
    },
    f_cuanto: {
      padre: "familia",
      m: ["Depende de tus gastos, de tus deudas y de quién depende de ti. Puedes hacer un primer cálculo en un minuto con «Tu Escudo Familiar». Es una orientación, no una cotización."],
      a: [pagina("Abrir la calculadora", "/escudo", "Calculadora"), wa("Familia", "Revisarlo con Roberto", "Quiero revisar cuánto seguro de vida necesito.")],
    },
    f_ingresos: {
      padre: "familia",
      m: [
        "Si por una enfermedad, una incapacidad o un fallecimiento dejaras de generar ingresos, ¿cuánto tiempo podría tu familia pagar la casa, la comida, la escuela y las deudas? El cariño es indispensable, pero no sustituye los recursos económicos.",
        "Según tu caso pueden ayudar un seguro de vida, una cobertura por incapacidad o un plan de retiro.",
      ],
      a: [wa("Familia", "Revisar mi caso con Roberto", "Quiero revisar qué pasaría con mi familia si dejara de generar ingresos.")],
    },
    f_primero: {
      padre: "familia",
      m: ["No necesitas todos los seguros: necesitas atender el riesgo que más podría afectar tus finanzas. Empezamos por tus ingresos, tus dependientes, tus deudas y tu capacidad de ahorro; después se prioriza la protección médica, el respaldo económico familiar y tu futuro financiero."],
      a: [wa("Familia", "Revisar mi caso con Roberto", "Quiero saber qué seguro debería contratar primero.")],
    },

    /* ---------- Vida con ahorro ---------- */
    vida: {
      m: ["Un seguro de vida con ahorro protege a tu familia si tú faltas y, según el plan, también va formando un ahorro con los años. Para algunas personas funciona muy bien y para otras no."],
      o: [
        { t: "¿Es una inversión?", n: "v_inv" },
        { t: "¿Puedo sacar mi dinero cuando quiera?", n: "v_dinero" },
        { t: "¿Para quién tiene sentido?", n: "v_para" },
        { t: "¿Qué preguntar antes de contratar?", n: "v_pregs" },
      ],
      a: [
        pagina("Leer la guía completa", "/seguro-de-vida-con-ahorro", "Vida con ahorro"),
        wa("Vida con ahorro", "Pedir una cotización con mis datos", "Quiero conocer opciones de seguro de vida con ahorro y entender cuánto es protección y cuánto es ahorro."),
      ],
    },
    v_inv: {
      padre: "vida",
      m: ["Tiene una parte de ahorro, pero es un seguro: una parte de lo que pagas es la protección y otra son costos. Conviene evaluarlo como las dos cosas a la vez y no solo como una de ellas."],
      a: [wa("Vida con ahorro", "Platicarlo con Roberto", "Quiero entender cuánto es protección, cuánto ahorro y cuánto son costos.")],
    },
    v_dinero: {
      padre: "vida",
      m: ["Lo que la póliza te ofrece son los valores garantizados. Puedes rescatarlos (y entonces el seguro se cancela) o dejar de pagar primas con un seguro saldado (suma menor) o prorrogado (misma suma, por menos tiempo).", "Lo disponible depende del plan, de tu edad, de los años transcurridos y de las primas pagadas, y en los primeros años suele ser menor a lo que aportaste."],
      a: [wa("Vida con ahorro", "Platicarlo con Roberto", "Quiero entender qué pasa con mi dinero si dejo de pagar o quiero retirarlo.")],
    },
    v_para: {
      padre: "vida",
      m: ["Suele tener sentido si eres el principal proveedor, ya tienes un fondo de emergencia aparte y puedes pagar durante años sin que se resienta tu presupuesto.", "Quizá no si aún no tienes fondo de emergencia o podrías necesitar ese dinero pronto. Si es tu caso, no pasa nada: primero se arma el fondo."],
      a: [wa("Vida con ahorro", "Ver si es para mí", "Quiero ver si un seguro de vida con ahorro es para mí.")],
    },
    v_pregs: {
      padre: "vida",
      m: ["Tres que no pueden faltar: ¿cuánto de lo que pago es protección, ahorro y costos? ¿Qué valores están garantizados y cuáles no? ¿Cuánto recupero si cancelo en el año 3, el 5 y el 10?", "Las siete completas están en la guía."],
      a: [pagina("Ver las siete preguntas", "/seguro-de-vida-con-ahorro#h-preguntas", "Siete preguntas")],
    },

    /* ---------- Negocio (hombre clave) ---------- */
    negocio: {
      m: ["Si tu negocio depende mucho de una persona (tú, un socio, el director…), existe el seguro de hombre clave: lo contrata la empresa, lo paga la empresa y lo cobra la empresa, para sostenerse mientras se reacomoda. Protege al negocio, no a tu familia."],
      o: [
        { t: "¿Quién puede contratarlo?", n: "n_quien" },
        { t: "¿Se deduce de impuestos?", n: "n_imp" },
        { t: "¿Qué documentos piden?", n: "n_docs" },
        { t: "¿Cómo se decide la suma asegurada?", n: "n_suma" },
      ],
      a: [cita("Negocio"), pagina("Leer la página completa", "/empresarios", "Hombre clave"), wa("Negocio", "Escribirle a Roberto", "Tengo un negocio y quiero revisar un seguro de hombre clave.")],
    },
    n_quien: {
      padre: "negocio",
      m: ["Lo contrata una empresa constituida como persona moral. La persona clave debe tener relación de trabajo con ella (o ser socio industrial, en las sociedades donde aplica) y, si es empleado, la aseguradora pide dos años en el puesto.", "Si tu negocio opera como persona física, hay que ver otras opciones."],
      a: [cita("Negocio", "Revisar mi caso en una llamada")],
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
      a: [cita("Negocio", "Platicar mi caso en una llamada")],
    },

    /* ---------- Gastos médicos ---------- */
    gmm: {
      m: ["En gastos médicos mayores tú eliges el deducible, el coaseguro y la red de hospitales. Antes de contratar conviene saber qué cubre, qué no y en qué condiciones paga la aseguradora."],
      o: [
        { t: "¿La aseguradora realmente me va a pagar?", n: "g_pagar" },
        { t: "¿Puedo contratar si ya tengo una enfermedad?", n: "g_pre" },
        { t: "Planeamos tener un bebé", n: "g_bebe" },
      ],
      a: [wa("Gastos médicos", "Pedir mi asesoría por WhatsApp", "Quiero revisar un seguro de gastos médicos.")],
    },
    g_pagar: {
      padre: "gmm",
      m: ["Tener una póliza no garantiza que cualquier gasto te lo paguen: hay exclusiones, periodos de espera, deducibles y requisitos para presentar una reclamación.", "Antes de contratar pide que te expliquen con claridad qué cubre, qué no cubre y en qué condiciones responde la aseguradora. Parte de mi trabajo es ayudarte a entender tu póliza."],
      a: [wa("Gastos médicos", "Revisarlo con Roberto", "Quiero que me expliquen qué cubre y qué no un seguro de gastos médicos.")],
    },
    g_pre: {
      padre: "gmm",
      m: ["Una enfermedad preexistente puede cambiar las condiciones de aceptación, generar exclusiones o incluso impedir que te aseguren. Pero eso no significa que todas las puertas estén cerradas: dependiendo de la aseguradora y del producto podrían existir alternativas.", "Declara tus antecedentes con honestidad y pide una evaluación. La aceptación no está garantizada."],
      a: [wa("Gastos médicos", "Pedir una evaluación", "Quiero saber si puedo contratar un seguro de gastos médicos teniendo una enfermedad previa.")],
    },
    g_bebe: {
      padre: "gmm",
      m: ["Si planean tener un bebé, conviene resolverlo antes: algunas pólizas tienen un periodo de espera para cubrir el parto. Roberto te explica los tiempos según tu caso."],
      a: [pagina("Ver la guía para futuros papás", "/", "Futuros papás"), wa("Gastos médicos", "Platicarlo con Roberto", "Quiero revisar un seguro de gastos médicos para cuando tengamos un bebé.")],
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
.lanza,.burbuja,.panel{position:fixed;right:max(12px,env(safe-area-inset-right,0px));z-index:60;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.lanza{bottom:calc(var(--abajo,20px) + env(safe-area-inset-bottom,0px));width:64px;height:64px;padding:0;border-radius:50%;border:2px solid rgba(91,123,255,.6);background:#0a0c1c;
  cursor:pointer;overflow:hidden;box-shadow:0 12px 32px -10px rgba(42,34,245,.85),0 0 0 4px rgba(91,123,255,.14);transition:bottom .25s ease,transform .15s ease,opacity .2s ease}
.lanza:hover{transform:scale(1.06)}
.lanza.espera,.burbuja.espera{opacity:0;visibility:hidden;pointer-events:none;transform:scale(.85)}
.lanza img{display:block;width:100%;height:100%;object-fit:cover}
.lanza:focus-visible,.cerrar:focus-visible,.chip:focus-visible,.sal:focus-visible,.burbuja:focus-visible{outline:3px solid #fff;outline-offset:3px}
.panel:focus,.panel:focus-visible{outline:none}
.burbuja{bottom:calc(var(--abajo,20px) + env(safe-area-inset-bottom,0px) + 76px);max-width:210px;padding:10px 14px;border:0;border-radius:16px 16px 4px 16px;background:#fff;color:#0a0c1c;
  font-weight:700;font-size:14px;line-height:1.3;text-align:left;cursor:pointer;box-shadow:0 14px 34px -12px rgba(0,0,0,.7);
  opacity:0;transform:translateY(6px);pointer-events:none;transition:opacity .25s,transform .25s,bottom .25s}
.burbuja.on{opacity:1;transform:none;pointer-events:auto}
.panel{bottom:calc(var(--abajo,20px) + env(safe-area-inset-bottom,0px) + 76px);width:min(390px,calc(100vw - 24px));max-height:min(620px,calc(100dvh - var(--abajo,20px) - 104px));
  display:flex;flex-direction:column;border:1px solid rgba(180,192,255,.22);border-radius:22px;color:#f2f4ff;background:linear-gradient(165deg,#111741,#0a0c1c 70%);
  box-shadow:0 30px 80px -20px rgba(0,0,0,.9);opacity:0;visibility:hidden;transform:translateY(10px) scale(.98);transform-origin:bottom right;
  transition:opacity .18s,transform .18s,visibility .18s,bottom .25s}
.panel.on{opacity:1;visibility:visible;transform:none}
.cab{display:flex;align-items:center;gap:10px;padding:12px 8px 12px 14px;border-bottom:1px solid rgba(180,192,255,.14)}
.cab img{width:42px;height:42px;flex:none;border-radius:50%;object-fit:cover;border:1px solid rgba(91,123,255,.5);background:#0a0c1c}
.cab div{flex:1;min-width:0}
.cab h2{margin:0;font:800 15px/1.2 Montserrat,Inter,system-ui,sans-serif;color:#fff}
.cab p{margin:2px 0 0;font-size:12px;line-height:1.3;color:#9aa1c8}
.cerrar{display:grid;place-items:center;width:44px;height:44px;flex:none;border:0;border-radius:12px;background:transparent;color:#b8bedd;cursor:pointer}
.cerrar:hover{background:rgba(120,140,255,.12);color:#fff}
.cerrar svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}
.cuerpo{position:relative;flex:1;min-height:120px;overflow-y:auto;overscroll-behavior:contain;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}
.bot,.yo{max-width:92%;border-radius:16px;font-size:15px;line-height:1.5}
.bot{align-self:flex-start;padding:10px 13px 4px;border-bottom-left-radius:4px;background:rgba(120,140,255,.1);border:1px solid rgba(180,192,255,.14);color:#e6e9ff}
.bot p{margin:0 0 8px}
.yo{align-self:flex-end;padding:9px 13px;border-bottom-right-radius:4px;background:linear-gradient(180deg,#5b7bff,#2a22f5);color:#fff;font-weight:600;font-size:14.5px;line-height:1.4}
.pensando{align-self:flex-start;display:flex;gap:5px;padding:13px 15px;border-radius:16px;border-bottom-left-radius:4px;background:rgba(120,140,255,.1);border:1px solid rgba(180,192,255,.14)}
.pensando i{width:7px;height:7px;border-radius:50%;background:#8da2ff;animation:pt 1s infinite ease-in-out}
.pensando i:nth-child(2){animation-delay:.15s}.pensando i:nth-child(3){animation-delay:.3s}
@keyframes pt{0%,60%,100%{opacity:.35;transform:none}30%{opacity:1;transform:translateY(-3px)}}
.ctl{display:flex;flex-direction:column;gap:8px;margin-top:2px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{min-height:44px;padding:9px 14px;border:1px solid rgba(91,123,255,.65);border-radius:16px;background:rgba(91,123,255,.1);color:#f2f4ff;font-weight:600;font-size:14px;line-height:1.25;text-align:left;cursor:pointer;transition:background .15s,border-color .15s}
.chip:hover{background:rgba(91,123,255,.22);border-color:#8da2ff}
.chip.suave{border-color:rgba(180,192,255,.25);background:transparent;color:#b8bedd;font-weight:500}
.salidas{display:grid;gap:8px;margin-top:2px}
.sal{display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:10px 14px;border:1px solid transparent;border-radius:14px;font-weight:700;font-size:15px;line-height:1.2;text-align:center;text-decoration:none;cursor:pointer;transition:filter .15s,background .15s}
.sal svg{width:19px;height:19px;flex:none;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.sal.wa{background:#25d366;color:#04230f}.sal.wa:hover{background:#45e07f}
.sal.ag{background:linear-gradient(180deg,#5b7bff,#2a22f5);color:#fff}.sal.ag:hover{filter:brightness(1.1)}
.sal.fan{background:rgba(120,140,255,.08);border-color:rgba(180,192,255,.28);color:#f2f4ff}.sal.fan:hover{background:rgba(120,140,255,.16)}
.pie{padding:9px 14px 12px;border-top:1px solid rgba(180,192,255,.12);font-size:11.5px;line-height:1.45;color:#8a91b8}
.pie a{color:#b8bedd;text-underline-offset:2px}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;animation:none!important}.cuerpo{scroll-behavior:auto}}
@media print{:host{display:none}}
</style>
<button type="button" class="lanza" aria-haspopup="dialog" aria-expanded="false"><img alt="" width="64" height="64" decoding="async"></button>
<button type="button" class="burbuja" tabindex="-1" aria-hidden="true"></button>
<section class="panel" role="dialog" aria-modal="false" tabindex="-1">
  <header class="cab">
    <img alt="" width="42" height="42" decoding="async">
    <div><h2></h2><p>Asistente virtual · respuestas preparadas por Roberto</p></div>
    <button type="button" class="cerrar" aria-label="Cerrar el asistente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
  </header>
  <div class="cuerpo" role="log" aria-live="polite" aria-relevant="additions"></div>
  <footer class="pie">No es una cotización ni una asesoría. No te pide ni guarda datos personales. <a href="/privacidad">Aviso de privacidad</a></footer>
</section>`;

  const $ = (s) => raiz.querySelector(s);
  const lanza = $(".lanza"), burbuja = $(".burbuja"), panel = $(".panel"), cuerpo = $(".cuerpo");
  const imgs = raiz.querySelectorAll("img");
  imgs.forEach((im) => { im.src = BOT.mascota; im.addEventListener("error", () => { im.src = SVG_RESPALDO; }, { once: true }); });
  $(".cab h2").textContent = BOT.nombre;
  panel.setAttribute("aria-label", BOT.nombre);
  lanza.setAttribute("aria-label", "Abrir el " + BOT.nombre.charAt(0).toLowerCase() + BOT.nombre.slice(1));
  burbuja.textContent = BOT.burbuja;

  const IC = {
    wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.6 20.4l1.25-4.3A8.6 8.6 0 1 1 8 19.3z"/><path d="M9.2 8.1c-.4.4-.6 1-.4 1.8.6 2.2 2.6 4.3 4.9 4.9.8.2 1.4 0 1.8-.4l.4-.6-1.9-1.1-.8.7c-.9-.4-1.8-1.3-2.2-2.2l.7-.8-1.1-1.9z"/></svg>',
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    tel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
    arr: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
  };

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
  }
  ["dock", "bar"].forEach((id) => { const el = document.getElementById(id); if (el) new MutationObserver(acomodar).observe(el, { attributes: true, attributeFilter: ["class", "hidden"] }); });
  addEventListener("resize", acomodar);

  /* ---------- Conversación ---------- */
  let abiertoAntes = false, abierto = false, anterior = null;
  const esAqui = (href) => href.split("#")[0] === location.pathname && href.indexOf("#") === -1;

  function el(tag, cls, texto) { const e = document.createElement(tag); if (cls) e.className = cls; if (texto != null) e.textContent = texto; return e; }
  function bajar(nodo) { requestAnimationFrame(() => { cuerpo.scrollTop = Math.max(0, nodo.offsetTop - 10); }); }
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

  function controles(nodo, id) {
    const c = el("div", "ctl");
    const opciones = nodo.o || [];
    const hayChips = opciones.length || id !== "inicio";
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
      if (id !== "inicio") {
        const v = el("button", "chip suave", "Volver al inicio"); v.type = "button";
        v.addEventListener("click", () => elegir({ t: "Volver al inicio", n: "inicio", volver: true }));
        chips.append(v);
      }
      c.append(chips);
    }
    const sal = (nodo.a || []).filter((s) => !(s.k === "link" && esAqui(s.href)));
    if (sal.length) { const g = el("div", "salidas"); sal.forEach((s) => g.append(salida(s))); c.append(g); }
    return c;
  }

  function mostrar(id, usuario, forzado) {
    const nodo = forzado || NODOS[id];
    quitarControles();
    if (usuario) cuerpo.append(el("div", "yo", usuario));
    const pensando = el("div", "pensando"); pensando.setAttribute("aria-hidden", "true"); pensando.innerHTML = "<i></i><i></i><i></i>";
    cuerpo.append(pensando); cuerpo.scrollTop = cuerpo.scrollHeight;
    setTimeout(() => {
      pensando.remove();
      const burb = el("div", "bot");
      nodo.m.forEach((p) => burb.append(el("p", null, p)));
      cuerpo.append(burb);
      cuerpo.append(controles(nodo, id));
      bajar(burb);
      anterior = id;
    }, reducido ? 0 : 450);
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
    abierto = true; acomodar();
    panel.classList.add("on"); lanza.setAttribute("aria-expanded", "true"); burbuja.classList.remove("on");
    if (!abiertoAntes) { abiertoAntes = true; medir("bot", "abrir"); mostrar("inicio"); }
    setTimeout(() => panel.focus({ preventScroll: true }), 30);
  }
  function cerrar(devolverFoco) {
    if (!abierto) return;
    abierto = false;
    panel.classList.remove("on"); lanza.setAttribute("aria-expanded", "false");
    if (devolverFoco !== false) lanza.focus({ preventScroll: true });
  }
  lanza.addEventListener("click", () => (abierto ? cerrar() : abrir()));
  $(".cerrar").addEventListener("click", () => cerrar());
  burbuja.addEventListener("click", abrir);
  raiz.addEventListener("keydown", (e) => { if (e.key === "Escape" && abierto) { e.stopPropagation(); cerrar(); } });

  /* ---------- Saludo discreto: una sola vez por visita, a los 9 segundos, si no lo han abierto ---------- */
  let intentosSaludo = 0;
  function saludo() {
    try { if (sessionStorage.getItem("asistente-saludo")) return; } catch (_) {}
    if (abierto || abiertoAntes) return;
    if (lanza.classList.contains("espera")) { if (++intentosSaludo < 8) setTimeout(saludo, 3000); return; }
    try { sessionStorage.setItem("asistente-saludo", "1"); } catch (_) {}
    burbuja.classList.add("on");
    setTimeout(() => burbuja.classList.remove("on"), 8000);
  }

  document.body.appendChild(host);
  acomodar();
  setTimeout(saludo, 9000);
  window.AsistenteRR = { abrir, cerrar };
  }

  const cuando = () => ("requestIdleCallback" in window ? requestIdleCallback(arrancar, { timeout: 3000 }) : setTimeout(arrancar, 1500));
  if (document.readyState === "complete") cuando(); else addEventListener("load", cuando, { once: true });
})();
