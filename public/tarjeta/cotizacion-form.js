/*
 * Formulario «Cotiza tu seguro» de la tarjeta /roberto (HTML estático, sin React).
 * Misma experiencia que components/captura/FormularioCotizacion.tsx: campos, mensajes de error, confirmación y antispam.
 * Las REGLAS (listas, validación, antispam) vienen de cotizacion-reglas.js, que se genera desde el mismo TypeScript que usa el servidor
 * (scripts/construir-cotizacion-tarjeta.cjs): no se copian a mano, así nunca quedan distintas.
 * Envía a POST /api/cotizacion → crea o identifica al prospecto en el CRM (Nuevo · origen «Sitio web»).
 *
 * Encendido: CONFIG.cotizacionEnLinea = true en index.html. Mientras sea false, solo se ve con «?cotizacion=1» en la dirección.
 */
(function () {
  "use strict";
  var T = window.__tarjeta, R = window.CotizacionReglas, host = document.getElementById("cotForm");
  if (!T || !R || !host) return;
  if (!(T.C.cotizacionEnLinea === true || /[?&]cotizacion=1(&|$)/.test(location.search))) return;

  var TEXTO_BOTON = "Quiero mi cotización";
  var CAMPOS = ["nombre", "whatsapp", "tipoSeguro", "paraQuien", "correo", "consentimiento"];
  // Lo que marcan en «¿Qué necesitas proteger?» → el seguro que se sugiere aquí (solo si todavía no eligieron uno)
  var DE_INTERES = { salud: "gmm", familia: "vida", retiro: "ahorro", casa: "hogar", auto: "autos", impuestos: "ppr" };

  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var ic = function (id) { return '<svg class="ic" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; };

  function opcion(grupo, o, i) {
    return '<label class="cf-opt"><input type="radio" name="' + grupo + '" value="' + esc(o.id) + '"' + (i === 0 ? ' data-campo="' + grupo + '"' : "") + ">" +
      (o.icono ? '<span class="ico">' + ic(o.icono) + "</span>" : "") +
      '<span class="tx">' + esc(o.texto) + (o.ayuda ? "<small>" + esc(o.ayuda) + "</small>" : "") + "</span>" +
      '<span class="ok">' + ic("check") + "</span></label>";
  }
  function grupo(nombre, leyenda, lista) {
    return '<fieldset class="cf-f" aria-describedby="cf-err-' + nombre + '"><legend class="cf-l">' + leyenda + ' <i aria-hidden="true">*</i><span class="sr-solo"> (obligatorio)</span></legend>' +
      '<div class="cf-opts">' + lista.map(function (o, i) { return opcion(nombre, o, i); }).join("") + "</div>" +
      '<p class="cf-err" id="cf-err-' + nombre + '"></p></fieldset>';
  }
  var privacidad = esc(T.C.avisoPrivacidad || "/privacidad");

  host.innerHTML =
    '<form class="cf glass" id="cf" novalidate aria-label="Solicitud de cotización">' +
    '<p class="cf-nota"><i aria-hidden="true">*</i> Los campos con asterisco son obligatorios.</p>' +
    '<div class="cf-f"><label class="cf-l" for="cf-nombre">Tu nombre <i aria-hidden="true">*</i></label>' +
    '<input type="text" id="cf-nombre" name="nombre" data-campo="nombre" placeholder="Ej. María González" autocomplete="name" maxlength="80" required aria-required="true" aria-describedby="cf-err-nombre">' +
    '<p class="cf-err" id="cf-err-nombre"></p></div>' +
    '<div class="cf-f"><label class="cf-l" for="cf-whatsapp">Tu WhatsApp <i aria-hidden="true">*</i></label>' +
    '<input type="tel" id="cf-whatsapp" name="whatsapp" data-campo="whatsapp" inputmode="tel" placeholder="81 1234 5678" autocomplete="tel" required aria-required="true" aria-describedby="cf-ayuda-whatsapp cf-err-whatsapp">' +
    '<p class="cf-hint" id="cf-ayuda-whatsapp">10 dígitos. Es por donde te escribiremos.</p><p class="cf-err" id="cf-err-whatsapp"></p></div>' +
    grupo("tipoSeguro", "Tipo de seguro", R.TIPOS_SEGURO) +
    grupo("paraQuien", "¿Para quién es?", R.PARA_QUIEN) +
    '<div class="cf-f"><label class="cf-l" for="cf-correo">Tu correo <small>(opcional)</small></label>' +
    '<input type="email" id="cf-correo" name="correo" data-campo="correo" inputmode="email" placeholder="nombre@correo.com" autocomplete="email" aria-describedby="cf-err-correo">' +
    '<p class="cf-err" id="cf-err-correo"></p></div>' +
    '<div class="cf-trampa" aria-hidden="true"><label>No llenar este campo<input name="confirmar_sitio_web" tabindex="-1" autocomplete="off"></label></div>' +
    '<label class="cf-priv"><input type="checkbox" name="consentimiento" data-campo="consentimiento" aria-required="true" aria-describedby="cf-err-consentimiento">' +
    '<span>Acepto el <a href="' + privacidad + '" target="_blank" rel="noopener">aviso de privacidad</a> y que me contacten por WhatsApp o correo para atender mi solicitud. <i aria-hidden="true">*</i></span></label>' +
    '<p class="cf-err" id="cf-err-consentimiento"></p>' +
    '<div class="cf-aviso" id="cf-aviso" role="alert"></div>' +
    '<button class="btn btn-primary btn-caps btn-big" type="submit" id="cf-enviar">' + TEXTO_BOTON + "</button></form>" +
    '<div class="cf-ok glass" id="cf-ok" hidden aria-live="polite"></div>';
  host.hidden = false;
  var otro = document.getElementById("cotOtro");
  if (otro) otro.hidden = false;

  var form = host.querySelector("#cf"), ok = host.querySelector("#cf-ok"), boton = host.querySelector("#cf-enviar"), aviso = host.querySelector("#cf-aviso");
  var el = form.elements;
  var montadoEn = Date.now(); // antispam: cuándo se mostró
  var enviando = false, envios = 0, tipoManual = false;

  function avisar(texto) { aviso.textContent = texto || ""; aviso.classList.toggle("on", !!texto); }
  function solicitud() {
    var f = T.ctx && T.ctx.f && T.ctx.f !== "directo" ? T.ctx.f : "";
    return {
      nombre: el.nombre.value, whatsapp: el.whatsapp.value, correo: el.correo.value,
      tipoSeguro: el.tipoSeguro.value || "", paraQuien: el.paraQuien.value || "",
      consentimiento: el.consentimiento.checked, trampa: el.confirmar_sitio_web.value,
      tiempoMs: Date.now() - montadoEn,
      origen: "tarjeta", utm: { source: f } // «?s=ig» etc.: llega al CRM como la fuente de la visita
    };
  }

  /* ---------------------------------- errores ---------------------------------- */
  function pintarCampo(campo, msg) {
    var p = host.querySelector("#cf-err-" + campo);
    if (p) { p.textContent = msg || ""; p.classList.toggle("on", !!msg); }
    if (campo === "tipoSeguro" || campo === "paraQuien") {
      Array.prototype.forEach.call(host.querySelectorAll('input[name="' + campo + '"]'), function (i) { i.closest(".cf-opt").classList.toggle("bad", !!msg); });
    } else {
      var c = host.querySelector('[data-campo="' + campo + '"]');
      if (c) { if (msg) c.setAttribute("aria-invalid", "true"); else c.removeAttribute("aria-invalid"); }
    }
  }
  function pintarTodos(errs) {
    var n = 0;
    CAMPOS.forEach(function (c) { var m = (errs && errs[c]) || ""; pintarCampo(c, m); if (m) n++; });
    return n;
  }
  function enfocarPrimero(errs) {
    var campo = CAMPOS.filter(function (c) { return errs && errs[c]; })[0];
    var c = campo && host.querySelector('[data-campo="' + campo + '"]');
    if (c) { c.focus(); c.scrollIntoView({ block: "center", behavior: T.reducido ? "auto" : "smooth" }); }
  }
  function revisar(campo) { // al salir de un campo con texto, se revisa solo ese campo
    if (!el[campo].value.trim()) return;
    pintarCampo(campo, R.validarSolicitud(R.prepararSolicitud(solicitud())).errores[campo]);
  }
  ["nombre", "whatsapp", "correo"].forEach(function (c) {
    el[c].addEventListener("blur", function () { revisar(c); });
    el[c].addEventListener("input", function () { pintarCampo(c, ""); avisar(""); });
  });
  el.whatsapp.addEventListener("input", function () { var f = R.formatearWhatsapp(el.whatsapp.value); if (f !== el.whatsapp.value) el.whatsapp.value = f; });
  el.consentimiento.addEventListener("change", function () { pintarCampo("consentimiento", ""); avisar(""); });

  function marcarGrupo(nombre) {
    Array.prototype.forEach.call(host.querySelectorAll('input[name="' + nombre + '"]'), function (i) { i.closest(".cf-opt").classList.toggle("on", i.checked); });
  }
  ["tipoSeguro", "paraQuien"].forEach(function (g) {
    Array.prototype.forEach.call(host.querySelectorAll('input[name="' + g + '"]'), function (i) {
      i.addEventListener("change", function () { marcarGrupo(g); pintarCampo(g, ""); avisar(""); if (g === "tipoSeguro") tipoManual = true; });
    });
  });

  // «¿Qué necesitas proteger?» (arriba en la página) sugiere el seguro, salvo que ya lo hayan elegido aquí
  var chips = document.getElementById("chips");
  if (chips) chips.addEventListener("click", function () {
    setTimeout(function () {
      if (tipoManual) return;
      var marcado = chips.querySelector('.chip[aria-pressed="true"]');
      var radio = marcado && DE_INTERES[marcado.dataset.v] && form.querySelector('input[name="tipoSeguro"][value="' + DE_INTERES[marcado.dataset.v] + '"]');
      if (radio) { radio.checked = true; marcarGrupo("tipoSeguro"); pintarCampo("tipoSeguro", ""); }
    }, 0);
  });

  /* ---------------------------------- envío ---------------------------------- */
  function exito(s) {
    var nombre = R.primerNombre(s.nombre), tipo = R.textoTipoSeguro(s.tipoSeguro);
    var mensaje = "Hola Roberto, acabo de enviar mi solicitud de cotización de " + tipo + " desde tu tarjeta digital. ¿Cuándo podemos platicar?";
    ok.innerHTML =
      '<div class="cf-check">' + ic("check") + "</div>" +
      '<h3 id="cf-ok-t" tabindex="-1">' + (nombre ? "¡Gracias, " + esc(nombre) + "! " : "¡Gracias! ") + "Recibimos tu solicitud</h3>" +
      '<p class="cf-p">Con estos datos te escribiremos por WhatsApp para platicar tus opciones.</p>' +
      "<dl><div><dt>Seguro</dt><dd>" + esc(tipo) + "</dd></div><div><dt>Es</dt><dd>" + esc(R.textoParaQuien(s.paraQuien)) + "</dd></div>" +
      "<div><dt>Te escribimos al WhatsApp</dt><dd>terminación " + esc(s.whatsapp.slice(-4)) + "</dd></div></dl>" +
      '<a class="btn btn-wa btn-big" target="_blank" rel="noopener" data-ev="wa" data-d="cotizacion" href="' + esc(T.wa(mensaje)) + '">' + ic("wa") + "Prefiero adelantar por WhatsApp</a>" +
      '<button type="button" class="cf-otra" id="cf-otra">Enviar otra solicitud</button>';
    form.hidden = true;
    ok.hidden = false;
    var h = ok.querySelector("#cf-ok-t");
    h.focus({ preventScroll: true });
    ok.scrollIntoView({ block: "center", behavior: T.reducido ? "auto" : "smooth" });
    ok.querySelector("#cf-otra").addEventListener("click", function () {
      form.reset(); marcarGrupo("tipoSeguro"); marcarGrupo("paraQuien"); pintarTodos({}); avisar(""); tipoManual = false;
      ok.hidden = true; form.hidden = false; montadoEn = Date.now();
      el.nombre.focus({ preventScroll: true }); form.scrollIntoView({ block: "start", behavior: T.reducido ? "auto" : "smooth" });
    });
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (enviando) return;
    avisar("");
    var s = R.prepararSolicitud(solicitud());

    // 1 · Validación con mensajes claros
    var v = R.validarSolicitud(s);
    if (!v.ok) { var n = pintarTodos(v.errores); avisar(n === 1 ? "Revisa el campo marcado en rojo para poder enviar." : "Revisa los " + n + " campos marcados en rojo para poder enviar."); enfocarPrimero(v.errores); return; }
    pintarTodos({});

    // 2 · Antispam
    var veredicto = R.evaluarAntispam(s);
    if (veredicto === "bot") { exito(s); return; } // se finge éxito: no se envía nada
    if (veredicto === "rapido") { avisar("Un momento: revisa tus datos con calma y vuelve a enviar."); return; }
    if (envios >= R.MAX_ENVIOS_POR_VISITA) { avisar("Ya recibimos varias solicitudes desde esta página. Si necesitas algo más, escríbeme por WhatsApp."); return; }

    // 3 · Envío al servidor
    enviando = true; boton.disabled = true; boton.textContent = "Enviando…";
    fetch("/api/cotizacion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(s) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.status >= 200 && res.status < 300 && res.j.ok) { envios++; exito(s); return; }
        var errs = res.j.errores, hay = !!errs && Object.keys(errs).some(function (k) { return errs[k]; });
        if (hay) { pintarTodos(errs); enfocarPrimero(errs); }
        if (res.j.mensaje || !hay) avisar(res.j.mensaje || "No pudimos enviar tu solicitud. Intenta de nuevo en unos minutos.");
      })
      .catch(function () { avisar("No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo otra vez; lo que escribiste sigue aquí."); })
      .then(function () { enviando = false; boton.disabled = false; boton.textContent = TEXTO_BOTON; });
  });
})();
