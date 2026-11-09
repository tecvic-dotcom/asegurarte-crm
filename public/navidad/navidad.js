/* Navidad — solo copos de nieve sobre el fondo oficial del sitio de Roberto (tarjeta /roberto). Se enciende solo del 1 de noviembre de 2026 al 6 de enero.
   Mismo molde que halloween.js: un solo archivo que inyecta su CSS y su HTML, se apaga solo y respeta «reducir movimiento».
   - Se carga desde un bloque en línea al final de public/tarjeta/index.html (solo descarga este archivo dentro de las fechas).
     Para quitarlo del todo: borrar ese bloque «Navidad». (window.__nvPrueba solo lo usa el servidor de prueba.)
   - Sin fondo ni cambios de color: el sitio conserva su azul-noche oficial. Solo cae nieve (círculos suaves y algunos copos de texto), detrás del contenido.
     (Hasta el 8 de noviembre de 2026 había además una imagen de fondo con árbol, un velo azul-petróleo y un gorro de Santa en la foto: se quitaron por pedido de Roberto.)
   - Ventana de fechas: del 1 de noviembre al 6 de enero (VENTANA). ?navidad=1 fuerza, ?navidad=0 apaga. */
(function () {
  "use strict";
  if (window.__nv) return;

  var VENTANA = { desde: [10, 1], hasta: [0, 6] }; // [mes 0-11, día]: 1 nov → 6 ene

  var q = {};
  try { q = new URLSearchParams(location.search); } catch (e) { q = { get: function () { return null; } }; }
  var hoy = new Date();
  var md = hoy.getMonth() * 100 + hoy.getDate();
  var d = VENTANA.desde[0] * 100 + VENTANA.desde[1];
  var h = VENTANA.hasta[0] * 100 + VENTANA.hasta[1];
  var activo = d > h ? (md >= d || md <= h) : (md >= d && md <= h);
  if (window.__nvPrueba || q.get("navidad") === "1") activo = true;
  if (q.get("navidad") === "0") activo = false;
  if (!activo) return;

  var movil = window.matchMedia && window.matchMedia("(max-width:700px)").matches;
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var r1 = function (n) { return Math.round(n * 10) / 10; };

  var css = [
    /* El <body> de la tarjeta pinta su propio fondo y taparía la nieve (que va detrás del contenido): se deja transparente.
       El fondo oficial lo sigue dibujando el <html> y el degradado de body::before; los colores NO cambian. */
    "html.nv-on body{background:transparent!important}",

    "#nv{position:fixed;left:0;top:0;width:100%;height:100vh;height:100lvh;z-index:-1;pointer-events:none;overflow:hidden;contain:strict}",
    "#nv *{position:absolute;margin:0;padding:0}",
    /* Nieve que cae: círculos suaves (sin filtros de desenfoque, que pesan en el celular) y algunos copos de texto. */
    "#nv .nv-f{top:0;left:var(--x);width:var(--s);height:var(--s);border-radius:50%;background:radial-gradient(circle,#fff 0,rgba(255,255,255,.85) 45%,rgba(255,255,255,0) 72%);opacity:var(--o);will-change:transform;animation:nv-fall var(--du) linear infinite;animation-delay:var(--dl)}",
    "#nv .nv-g{top:0;left:var(--x);width:auto;height:auto;font-size:var(--s);line-height:1;color:#fff;opacity:var(--o);will-change:transform;animation:nv-fall var(--du) linear infinite;animation-delay:var(--dl);text-shadow:0 0 6px rgba(255,255,255,.6)}",
    "@keyframes nv-fall{from{transform:translate3d(0,-8vh,0) rotate(0)}to{transform:translate3d(var(--dx),108vh,0) rotate(var(--rot))}}",
    "@media (prefers-reduced-motion:reduce){#nv .nv-f,#nv .nv-g{display:none}}",
    "@media print{#nv{display:none!important}}"
  ].join("\n");

  var st = document.createElement("style");
  st.id = "nv-css";
  st.textContent = css;
  document.head.appendChild(st);

  var root = document.createElement("div");
  root.id = "nv";
  root.setAttribute("aria-hidden", "true");

  var n = movil ? 38 : 80;
  var glifos = ["❄︎", "❅︎", "❆︎"]; // ︎: símbolo blanco, no emoji de color
  var frag = document.createDocumentFragment();
  for (var i = 0; i < n; i++) {
    var g = i % 6 === 0;
    var el = document.createElement("div");
    el.className = g ? "nv-g" : "nv-f";
    var s = g ? r1(rnd(11, 22)) : r1(rnd(3, 11));
    if (g) el.textContent = glifos[i % 3];
    var du = r1(rnd(9, 20));
    el.style.cssText =
      "--x:" + r1(rnd(-2, 100)) + "vw;--s:" + s + "px;--o:" + r1(rnd(.35, .95) * 100) / 100 +
      ";--du:" + du + "s;--dl:-" + r1(rnd(0, du)) + "s;--dx:" + r1(rnd(-12, 12)) + "vw;--rot:" + Math.round(rnd(-200, 200)) + "deg";
    frag.appendChild(el);
  }
  root.appendChild(frag);
  document.body.insertBefore(root, document.body.firstChild);
  document.documentElement.classList.add("nv-on");

  window.__nv = {
    off: function () {
      document.documentElement.classList.remove("nv-on");
      if (root.parentNode) root.parentNode.removeChild(root);
      if (st.parentNode) st.parentNode.removeChild(st);
      window.__nv = null;
    }
  };
})();
