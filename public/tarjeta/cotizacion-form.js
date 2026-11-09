/*
 * Formularios «Cotiza tu seguro» de la tarjeta /roberto (HTML estático, sin React).
 * Misma experiencia que components/captura/FormularioCotizacion.tsx: campos, mensajes de error, confirmación y antispam.
 * Las REGLAS (listas, validación, antispam) vienen de cotizacion-reglas.js, que se genera desde el mismo TypeScript que usa el servidor
 * (scripts/construir-cotizacion-tarjeta.cjs): no se copian a mano, así nunca quedan distintas.
 * Envía a POST /api/cotizacion → crea o identifica al prospecto en el CRM (Nuevo · origen «Sitio web»).
 *
 * Hay DOS lugares donde puede aparecer (mismo código, ids distintos, datos separados):
 *  1) Sección «Cotiza tu seguro» (#cotForm): el formulario completo, con todos los seguros. Encendido: CONFIG.cotizacionEnLinea = true
 *     en index.html (con false solo se ve con «?cotizacion=1» en la dirección).
 *  2) Panel de «¿Qué necesitas proteger?» (#ramoPanel): al tocar un ramo se abre AHÍ MISMO el formulario de ese ramo, con lo que cubre y
 *     sin pasos de más. Siempre activo (desde el 2026-11-08 la sección «Soluciones de seguros» ya no existe en la página: este panel la sustituye).
 */
(function () {
  "use strict";
  // Si llegan con #cotizacion (p. ej. desde el botón «Cotizar en línea» de la calculadora), al terminar de cargar se vuelve a alinear la sección:
  // las imágenes y las fuentes mueven el contenido después del salto del navegador y el ancla se queda corta.
  if (location.hash === "#cotizacion") window.addEventListener("load", function () {
    setTimeout(function () { var sec = document.getElementById("cotizacion"); if (sec) sec.scrollIntoView({ block: "start" }); }, 200);
  });
  var T = window.__tarjeta, R = window.CotizacionReglas;
  if (!T || !R) return;
  var C = T.C;
  var enLinea = C.cotizacionEnLinea === true || /[?&]cotizacion=1(&|$)/.test(location.search);

  var TEXTO_BOTON = "Quiero mi cotización";
  var CAMPOS = ["nombre", "whatsapp", "tipoSeguro", "paraQuien", "correo", "consentimiento"];
  // Lo que marcan en «¿Qué necesitas proteger?» → el seguro que se sugiere (solo si todavía no eligieron uno)
  var DE_INTERES = { salud: "gmm", familia: "vida", retiro: "ahorro", casa: "hogar", auto: "autos", impuestos: "ppr" };

  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var ic = function (id) { return '<svg class="ic" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; };
  var privacidad = esc(C.avisoPrivacidad || "/privacidad");

  function opcion(grupo, o, i) {
    return '<label class="cf-opt"><input type="radio" name="' + grupo + '" value="' + esc(o.id) + '"' + (i === 0 ? ' data-campo="' + grupo + '"' : "") + ">" +
      (o.icono ? '<span class="ico">' + ic(o.icono) + "</span>" : "") +
      '<span class="tx">' + esc(o.texto) + (o.ayuda ? "<small>" + esc(o.ayuda) + "</small>" : "") + (o.detalle ? '<small class="det">' + esc(o.detalle) + "</small>" : "") + "</span>" +
      '<span class="ok">' + ic("check") + "</span></label>";
  }
  function grupo(nombre, leyenda, lista, idErr) {
    return '<fieldset class="cf-f" aria-describedby="' + idErr + '"><legend class="cf-l">' + leyenda + ' <i aria-hidden="true">*</i><span class="sr-solo"> (obligatorio)</span></legend>' +
      '<div class="cf-opts">' + lista.map(function (o, i) { return opcion(nombre, o, i); }).join("") + "</div>" +
      '<p class="cf-err" id="' + idErr + '"></p></fieldset>';
  }

  /* ================================================================================================================================ */
  /*  El formulario (se puede montar en varios lugares: «pref» da ids únicos y cada uno lleva sus propios datos y su propio antispam)  */
  /* ================================================================================================================================ */
  // o.pref: prefijo de ids («cf» = sección Cotiza, «rf» = panel de ramos)
  // o.modo: «general» (todos los seguros) o «ramo» (los seguros los pone cambiarTipos(), según el ramo que tocaron)
  // o.escucharChips: sugiere el seguro cuando marcan algo en «¿Qué necesitas proteger?» (solo el formulario general)
  function montar(host, o) {
    var p = o.pref, esRamo = o.modo === "ramo";
    var id = function (s) { return p + "-" + s; };

    host.innerHTML =
      '<form class="cf glass" id="' + p + '" novalidate aria-label="Solicitud de cotización">' +
      '<p class="cf-nota"><i aria-hidden="true">*</i> Los campos con asterisco son obligatorios.</p>' +
      (esRamo ? '<div id="' + id("tipos") + '"></div>' : "") +
      '<div class="cf-f"><label class="cf-l" for="' + id("nombre") + '">Tu nombre <i aria-hidden="true">*</i></label>' +
      '<input type="text" id="' + id("nombre") + '" name="nombre" data-campo="nombre" placeholder="Ej. María González" autocomplete="name" maxlength="80" required aria-required="true" aria-describedby="' + id("err-nombre") + '">' +
      '<p class="cf-err" id="' + id("err-nombre") + '"></p></div>' +
      '<div class="cf-f"><label class="cf-l" for="' + id("whatsapp") + '">Tu WhatsApp <i aria-hidden="true">*</i></label>' +
      '<input type="tel" id="' + id("whatsapp") + '" name="whatsapp" data-campo="whatsapp" inputmode="tel" placeholder="81 1234 5678" autocomplete="tel" required aria-required="true" aria-describedby="' + id("ayuda-whatsapp") + " " + id("err-whatsapp") + '">' +
      '<p class="cf-hint" id="' + id("ayuda-whatsapp") + '">10 dígitos. Es por donde te escribiremos.</p><p class="cf-err" id="' + id("err-whatsapp") + '"></p></div>' +
      (esRamo ? "" : grupo("tipoSeguro", "Tipo de seguro", R.TIPOS_SEGURO, id("err-tipoSeguro"))) +
      grupo("paraQuien", "¿Para quién es?", R.PARA_QUIEN, id("err-paraQuien")) +
      '<div class="cf-f"><label class="cf-l" for="' + id("correo") + '">Tu correo <small>(opcional)</small></label>' +
      '<input type="email" id="' + id("correo") + '" name="correo" data-campo="correo" inputmode="email" placeholder="nombre@correo.com" autocomplete="email" aria-describedby="' + id("err-correo") + '">' +
      '<p class="cf-err" id="' + id("err-correo") + '"></p></div>' +
      '<div class="cf-trampa" aria-hidden="true"><label>No llenar este campo<input name="confirmar_sitio_web" tabindex="-1" autocomplete="off"></label></div>' +
      '<label class="cf-priv"><input type="checkbox" name="consentimiento" data-campo="consentimiento" aria-required="true" aria-describedby="' + id("err-consentimiento") + '">' +
      '<span>Acepto el <a href="' + privacidad + '" target="_blank" rel="noopener">aviso de privacidad</a> y que me contacten por WhatsApp o correo para atender mi solicitud. <i aria-hidden="true">*</i></span></label>' +
      '<p class="cf-err" id="' + id("err-consentimiento") + '"></p>' +
      '<div class="cf-aviso" id="' + id("aviso") + '" role="alert"></div>' +
      '<button class="btn btn-primary btn-caps btn-big" type="submit" id="' + id("enviar") + '">' + TEXTO_BOTON + "</button></form>" +
      '<div class="cf-ok glass" id="' + id("ok") + '" hidden aria-live="polite"></div>';

    var form = host.querySelector("#" + p), ok = host.querySelector("#" + id("ok")), boton = host.querySelector("#" + id("enviar")), aviso = host.querySelector("#" + id("aviso"));
    var el = form.elements; // colección «viva»: sigue al día aunque cambien los seguros del panel
    var montadoEn = Date.now(); // antispam: cuándo se mostró
    var enviando = false, envios = 0, tipoManual = false, paraManual = false;
    var tiposActuales = null; // (panel) lo último que se pintó, para volver a pintarlo tras «Enviar otra solicitud»

    function avisar(texto) { aviso.textContent = texto || ""; aviso.classList.toggle("on", !!texto); }
    function solicitud() {
      var f = T.ctx && T.ctx.f && T.ctx.f !== "directo" ? T.ctx.f : "";
      return {
        nombre: el.nombre.value, whatsapp: el.whatsapp.value, correo: el.correo.value,
        tipoSeguro: (el.tipoSeguro && el.tipoSeguro.value) || "", paraQuien: el.paraQuien.value || "",
        consentimiento: el.consentimiento.checked, trampa: el.confirmar_sitio_web.value,
        tiempoMs: Date.now() - montadoEn,
        origen: "tarjeta", utm: { source: f } // «?s=ig» etc.: llega al CRM como la fuente de la visita
      };
    }

    /* ---------------------------------- errores ---------------------------------- */
    function pintarCampo(campo, msg) {
      var pe = host.querySelector("#" + id("err-" + campo));
      if (pe) { pe.textContent = msg || ""; pe.classList.toggle("on", !!msg); }
      if (campo === "tipoSeguro" || campo === "paraQuien") {
        Array.prototype.forEach.call(host.querySelectorAll('input[name="' + campo + '"]'), function (i) { var t = i.closest(".cf-opt"); if (t) t.classList.toggle("bad", !!msg); });
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
      Array.prototype.forEach.call(host.querySelectorAll('input[name="' + nombre + '"]'), function (i) { var t = i.closest(".cf-opt"); if (t) t.classList.toggle("on", i.checked); });
    }
    function cablearGrupo(g) {
      Array.prototype.forEach.call(host.querySelectorAll('input[name="' + g + '"]'), function (i) {
        i.addEventListener("change", function () { marcarGrupo(g); pintarCampo(g, ""); avisar(""); if (g === "tipoSeguro") tipoManual = true; else paraManual = true; });
      });
    }
    if (!esRamo) cablearGrupo("tipoSeguro");
    cablearGrupo("paraQuien");

    // Formulario general: «¿Qué necesitas proteger?» (arriba en la página) sugiere el seguro, salvo que ya lo hayan elegido aquí
    if (o.escucharChips) {
      var chips = document.getElementById("chips");
      if (chips) chips.addEventListener("click", function () {
        setTimeout(function () {
          if (tipoManual) return;
          var marcado = chips.querySelector('.chip[aria-pressed="true"]');
          var radio = marcado && DE_INTERES[marcado.dataset.v] && form.querySelector('input[name="tipoSeguro"][value="' + DE_INTERES[marcado.dataset.v] + '"]');
          if (radio) { radio.checked = true; marcarGrupo("tipoSeguro"); pintarCampo("tipoSeguro", ""); }
        }, 0);
      });
    }

    /* ---------------------- panel de ramos: los seguros posibles de lo que tocaron ---------------------- */
    // lista: [{ id, texto, icono, ayuda, detalle }]. Con uno solo no hay nada que elegir: se muestra lo que cubre y se guarda ese.
    function cambiarTipos(lista, elegido, para) {
      if (!esRamo) return;
      tiposActuales = { lista: lista, elegido: elegido, para: para };
      var caja = host.querySelector("#" + id("tipos"));
      if (lista.length === 1) {
        var u = lista[0];
        caja.innerHTML = '<div class="rp-info"><span class="ico">' + ic(u.icono) + '</span><div><strong>' + esc(u.texto) + "</strong><p>" + esc(u.ayuda || "") + "</p>" +
          (u.detalle ? '<p class="det">' + esc(u.detalle) + "</p>" : "") + '</div></div><input type="hidden" name="tipoSeguro" value="' + esc(u.id) + '">';
      } else {
        caja.innerHTML = grupo("tipoSeguro", "¿Cuál te interesa?", lista, id("err-tipoSeguro"));
        var r = caja.querySelector('input[value="' + (elegido || lista[0].id) + '"]');
        if (r) r.checked = true;
        marcarGrupo("tipoSeguro");
        cablearGrupo("tipoSeguro");
      }
      if (!paraManual) { // lo que sugiere el mosaico se cambia solo; lo que la persona ya eligió se respeta
        Array.prototype.forEach.call(host.querySelectorAll('input[name="paraQuien"]'), function (i) { i.checked = i.value === para; });
        marcarGrupo("paraQuien");
      }
      pintarCampo("tipoSeguro", "");
    }

    /* ---------------------------------- envío ---------------------------------- */
    function reiniciar() {
      form.reset(); marcarGrupo("tipoSeguro"); marcarGrupo("paraQuien"); pintarTodos({}); avisar(""); tipoManual = false; paraManual = false;
      ok.hidden = true; form.hidden = false; montadoEn = Date.now();
      if (esRamo && tiposActuales) cambiarTipos(tiposActuales.lista, tiposActuales.elegido, tiposActuales.para);
    }
    function exito(s) {
      var nombre = R.primerNombre(s.nombre), tipo = R.textoTipoSeguro(s.tipoSeguro);
      var mensaje = "Hola Roberto, acabo de enviar mi solicitud de cotización de " + tipo + " desde tu tarjeta digital. ¿Cuándo podemos platicar?";
      ok.innerHTML =
        '<div class="cf-check">' + ic("check") + "</div>" +
        '<h3 id="' + id("ok-t") + '" tabindex="-1">' + (nombre ? "¡Gracias, " + esc(nombre) + "! " : "¡Gracias! ") + "Recibimos tu solicitud</h3>" +
        '<p class="cf-p">Con estos datos te escribiremos por WhatsApp para platicar tus opciones.</p>' +
        "<dl><div><dt>Seguro</dt><dd>" + esc(tipo) + "</dd></div><div><dt>Es</dt><dd>" + esc(R.textoParaQuien(s.paraQuien)) + "</dd></div>" +
        "<div><dt>Te escribimos al WhatsApp</dt><dd>terminación " + esc(s.whatsapp.slice(-4)) + "</dd></div></dl>" +
        '<a class="btn btn-wa btn-big" target="_blank" rel="noopener" data-ev="wa" data-d="cotizacion" href="' + esc(T.wa(mensaje)) + '">' + ic("wa") + "Prefiero adelantar por WhatsApp</a>" +
        '<button type="button" class="cf-otra" id="' + id("otra") + '">Enviar otra solicitud</button>';
      form.hidden = true;
      ok.hidden = false;
      ok.querySelector("#" + id("ok-t")).focus({ preventScroll: true });
      ok.scrollIntoView({ block: "center", behavior: T.reducido ? "auto" : "smooth" });
      ok.querySelector("#" + id("otra")).addEventListener("click", function () {
        reiniciar();
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

    return {
      cambiarTipos: cambiarTipos,
      hayConfirmacion: function () { return !ok.hidden; },
      reiniciar: reiniciar,
      foco: function () { el.nombre.focus({ preventScroll: true }); }
    };
  }

  /* ================================================ 1) Sección «Cotiza tu seguro» ================================================ */
  var hostGeneral = document.getElementById("cotForm");
  if (enLinea && hostGeneral) {
    montar(hostGeneral, { pref: "cf", modo: "general", escucharChips: true });
    hostGeneral.hidden = false;
    var otro = document.getElementById("cotOtro");
    if (otro) otro.hidden = false;
  }

  /* ============================================ 2) Panel de «¿Qué necesitas proteger?» ============================================ */
  var chipsEl = document.getElementById("chips"), panel = document.getElementById("ramoPanel");
  if (chipsEl && panel) {

    var tipoPorIcono = {};
    R.TIPOS_SEGURO.forEach(function (t) { tipoPorIcono[t.icono] = t.id; });
    // Los seguros de cada interés salen de las tarjetas de «Soluciones de seguros» (mismos textos aprobados): nada se inventa aquí
    function tiposDe(interes) {
      return (C.productos || []).filter(function (pr) { return (pr.tags || []).indexOf(interes) >= 0 && tipoPorIcono[pr.icono]; })
        .map(function (pr) { return { id: tipoPorIcono[pr.icono], texto: R.textoTipoSeguro(tipoPorIcono[pr.icono]), icono: pr.icono, ayuda: pr.texto, detalle: pr.detalle || "" }; });
    }

    var inst = null, abierto = "";
    function mostrar(nodo) { // lo acerca solo si hace falta (sin saltar a otra sección)
      var barras = document.querySelectorAll(".secnav"), nav = Array.prototype.filter.call(barras, function (n) { return n.getClientRects().length; })[0];
      var alto = nav ? nav.getBoundingClientRect().height : 70, r = nodo.getBoundingClientRect();
      if (r.top < alto + 8 || r.top > window.innerHeight * 0.55) window.scrollTo({ top: window.scrollY + r.top - alto - 14, behavior: T.reducido ? "auto" : "smooth" });
    }
    function cerrar() {
      abierto = "";
      panel.hidden = true;
      Array.prototype.forEach.call(chipsEl.querySelectorAll(".chip"), function (c) { c.setAttribute("aria-pressed", "false"); });
    }
    chipsEl.addEventListener("click", function (e) {
      var bt = e.target.closest(".chip"); if (!bt) return;
      var interes = bt.dataset.v;
      if (abierto === interes) { cerrar(); return; } // tocar otra vez el mismo mosaico lo cierra
      var tipos = tiposDe(interes);
      if (!tipos.length) return;
      Array.prototype.forEach.call(chipsEl.querySelectorAll(".chip"), function (c) { c.setAttribute("aria-pressed", String(c === bt)); });
      abierto = interes;
      var nombre = bt.querySelector(".tx").textContent;
      if (!inst) {
        panel.innerHTML = '<div class="rp-head"><span class="ico" id="rp-ico"></span><div><small>Cotiza</small><h3 id="rp-t" tabindex="-1"></h3></div></div><div id="rp-forma"></div>';
        inst = montar(panel.querySelector("#rp-forma"), { pref: "rf", modo: "ramo" });
      }
      panel.querySelector("#rp-ico").innerHTML = bt.querySelector(".ico").innerHTML;
      panel.querySelector("#rp-t").textContent = nombre;
      if (inst.hayConfirmacion()) inst.reiniciar(); // venían de enviar una solicitud: empieza limpio
      inst.cambiarTipos(tipos, tipos[0].id, interes === "familia" ? "familia" : "");
      panel.hidden = false;
      T.track("chip", nombre);
      // el botón de WhatsApp de la sección Cotiza ya lleva lo que marcaron
      var wa = document.getElementById("waAsesoria");
      if (wa) { wa.href = T.wa(C.mensajes.asesoria + " Me interesa proteger: " + nombre.toLowerCase() + "."); wa.dataset.d = "asesoria:" + nombre.slice(0, 45); }
      mostrar(panel);
      panel.querySelector("#rp-t").focus({ preventScroll: true });
    });
  }
})();
