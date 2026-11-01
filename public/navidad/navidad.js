/* Navidad — fondo con nieve para el sitio de Roberto (tarjeta /roberto). Se enciende solo del 1 de noviembre de 2026 al 6 de enero.
   Mismo molde que halloween.js: un solo archivo que inyecta su CSS y su HTML, se apaga solo y respeta «reducir movimiento».
   - Se carga desde un bloque en línea al final de public/tarjeta/index.html (solo descarga este archivo dentro de las fechas).
     Para quitarlo del todo: borrar ese bloque «Navidad». (window.__nvPrueba solo lo usa el servidor de prueba.)
   - Fondo: imagen «NAVIDAD COPOS» (navidad-copos.webp) + velo oscuro para que el texto blanco del sitio se lea + nieve que cae.
   - Las superficies del sitio (tarjetas de vidrio, menú, barra de WhatsApp, pie) toman un tono azul-petróleo sin tocar su diseño.
   - Gorro de Santa en la foto de portada de /roberto (solo si existe #fotoPic): dibujado en SVG, colocado con los ojos de Roberto,
     recortado por el marco de la foto y con 8 px mínimos de separación del logo (#logoAnim); la bolita se mece un poco.
   - Ventana de fechas: del 1 de noviembre al 6 de enero (VENTANA). ?navidad=1 fuerza, ?navidad=0 apaga.
   - Para ajustar el velo en pantalla: ?velo=0.4 (0 = sin velo, 1 = negro). Por defecto 0.6. */
(function () {
  "use strict";
  if (window.__nv) return;

  var VENTANA = { desde: [10, 1], hasta: [0, 6] }; // [mes 0-11, día]: 1 nov → 6 ene
  var IMG = "/navidad/navidad-copos.webp";

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

  var velo = parseFloat(q.get("velo"));
  if (!(velo >= 0 && velo <= 1)) velo = 0.6;

  var movil = window.matchMedia && window.matchMedia("(max-width:700px)").matches;
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var r1 = function (n) { return Math.round(n * 10) / 10; };

  var css = [
    /* Paleta azul-petróleo: tarjetas, ventanas y pie toman el tono. Los fondos con alfa dejan ver la imagen a través del vidrio. */
    /* Los textos grises y el azul de la marca se aclaran un poco: los originales están pensados para fondo casi negro. */
    "html.nv-on{--bg:#071f2f;--bg-2:#0a2a3f;--bg-3:#0d3450;--line:rgba(200,240,255,.16);--line-strong:rgba(200,240,255,.28);--glass:rgba(8,42,64,.72);--glass-2:rgba(12,60,88,.78);--ink-soft:#d4e6f2;--ink-mute:#9db9ca;--brand-2:#86a8ff;background:#071f2f!important}",
    "html.nv-on body{background:transparent!important}",
    "html.nv-on body::before,html.nv-on .bg-ambient,html.nv-on .bg-grid{display:none!important}",
    /* Superficies con color fijo en el CSS de la tarjeta (no usan variables) */
    "html.nv-on .secnav{background:rgba(7,31,47,.80)!important}",
    "html.nv-on .dock{background:rgba(7,31,47,.92)!important}",
    "html.nv-on footer{background:rgba(7,31,47,.86)!important}",
    "html.nv-on .match{background:rgba(7,31,47,.45)!important}",
    "@media (min-width:1000px){html.nv-on .hero{background:rgba(7,31,47,.62)!important}}",
    "html.nv-on .cta{background:linear-gradient(160deg,rgba(14,62,92,.82),rgba(8,42,64,.88))!important}",
    "html.nv-on .teaser{background:linear-gradient(135deg,rgba(26,70,150,.62),rgba(10,44,100,.58))!important}",
    "html.nv-on .regalo{background:linear-gradient(135deg,rgba(26,70,150,.70),rgba(10,44,100,.64))!important}",
    /* Portada: el nombre, el cargo y la frase caen sobre el árbol; una sombra suave detrás del bloque (NO text-shadow en el h1: es texto con degradado). */
    "html.nv-on .id::before{content:'';position:absolute;z-index:-1;inset:-34px -26px -22px;pointer-events:none;background:radial-gradient(ellipse 72% 64% at 42% 52%,rgba(4,24,38,.78),rgba(4,24,38,.5) 55%,rgba(4,24,38,0) 78%)}",
    "html.nv-on .role,html.nv-on .tagline{text-shadow:0 1px 8px rgba(3,20,32,.9)}",

    "#nv{position:fixed;left:0;top:0;width:100%;height:100vh;height:100lvh;z-index:-1;pointer-events:none;overflow:hidden;contain:strict;background:#0c3a52}",
    "#nv *{position:absolute;margin:0;padding:0}",
    /* La imagen es horizontal y el árbol queda a la derecha: en pantalla vertical se corre para que el árbol no se pierda. */
    "#nv .nv-img{inset:0;background:url(" + IMG + ") 86% center/cover no-repeat}",
    "#nv .nv-veil{inset:0;background:#06202f;opacity:" + velo + "}",

    /* Nieve que cae: círculos suaves (sin filtros de desenfoque, que pesan en el celular) y algunos copos de texto. */
    "#nv .nv-f{top:0;left:var(--x);width:var(--s);height:var(--s);border-radius:50%;background:radial-gradient(circle,#fff 0,rgba(255,255,255,.85) 45%,rgba(255,255,255,0) 72%);opacity:var(--o);will-change:transform;animation:nv-fall var(--du) linear infinite;animation-delay:var(--dl)}",
    "#nv .nv-g{top:0;left:var(--x);width:auto;height:auto;font-size:var(--s);line-height:1;color:#fff;opacity:var(--o);will-change:transform;animation:nv-fall var(--du) linear infinite;animation-delay:var(--dl);text-shadow:0 0 6px rgba(255,255,255,.6)}",
    "@keyframes nv-fall{from{transform:translate3d(0,-8vh,0) rotate(0)}to{transform:translate3d(var(--dx),108vh,0) rotate(var(--rot))}}",

    /* Gorro de Santa sobre la cabeza de Roberto: vive DENTRO de la foto de portada (que recorta lo que se sale), así que nunca llega al logo. */
    ".nv-hat{position:absolute;left:0;top:0;z-index:3;pointer-events:none;opacity:0;transform-origin:50% 100%;animation:nv-pop .9s cubic-bezier(.2,.9,.3,1.25) .5s forwards}",
    ".nv-hat svg{display:block;width:100%;height:100%;overflow:visible}",
    ".nv-hat .nv-pom{transform-origin:772px 468px;animation:nv-sway 3.4s ease-in-out infinite alternate}",
    "@keyframes nv-pop{from{opacity:0;transform:translateY(-16%) rotate(-6deg)}to{opacity:1;transform:none}}",
    "@keyframes nv-sway{from{transform:rotate(-3.5deg)}to{transform:rotate(3.5deg)}}",
    "@media (prefers-reduced-motion:reduce){.nv-hat{animation:none;opacity:1}.nv-hat .nv-pom{animation:none}}",

    "@media (max-width:700px){#nv .nv-img{background-position:86% center}}",
    "@media (min-width:1000px){#nv .nv-img{background-position:center}}",
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
  root.innerHTML = '<div class="nv-img"></div><div class="nv-veil"></div>';

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

  /* ---------- Gorro de Santa ---------- */
  /* Dibujado en unidades de una referencia donde la distancia entre los ojos mide 135 y el punto medio de los ojos es (477,520). */
  var GORRO =
    '<svg viewBox="270 170 590 410" aria-hidden="true"><defs>' +
    '<linearGradient id="nvh-r" x1="0" y1="0" x2="1" y2=".35"><stop offset="0" stop-color="#8a0b14"/><stop offset=".38" stop-color="#cf1f29"/><stop offset=".62" stop-color="#e5323a"/><stop offset="1" stop-color="#9c0e18"/></linearGradient>' +
    '<radialGradient id="nvh-w" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".65" stop-color="#f3f5f9"/><stop offset="1" stop-color="#cfd5e1"/></radialGradient>' +
    '<filter id="nvh-fur" x="-8%" y="-25%" width="116%" height="150%"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="3" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="11" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="1"/></filter>' +
    '<filter id="nvh-pom" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency=".07" numOctaves="3" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="20" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation=".8"/></filter>' +
    '<filter id="nvh-b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>' +
    "</defs>" +
    /* sombra del borde sobre la frente */
    '<ellipse cx="490" cy="466" rx="130" ry="12" fill="#000" opacity=".26" filter="url(#nvh-b)"/>' +
    /* cuerpo rojo que cae hacia la derecha */
    '<path d="M322 382C322 297 395 228 500 220C600 212 690 266 748 394C760 422 772 454 778 488L748 498C722 454 700 420 672 396C600 362 400 354 322 382Z" fill="url(#nvh-r)"/>' +
    '<path d="M352 352C366 298 424 244 500 232" fill="none" stroke="#ff8a8a" stroke-opacity=".38" stroke-width="12" stroke-linecap="round" filter="url(#nvh-b)"/>' +
    '<path d="M540 246C620 256 700 330 744 456" fill="none" stroke="#5a0008" stroke-opacity=".42" stroke-width="16" stroke-linecap="round" filter="url(#nvh-b)"/>' +
    /* borde de piel blanca */
    '<g filter="url(#nvh-fur)"><path d="M298 420C294 388 330 362 400 354C480 345 600 347 666 372C700 387 700 428 672 446C620 464 520 458 440 460C380 462 324 456 298 420Z" fill="url(#nvh-w)"/>' +
    '<path d="M326 424C388 440 520 442 656 424" fill="none" stroke="#aab3c6" stroke-opacity=".5" stroke-width="9" stroke-linecap="round" filter="url(#nvh-b)"/></g>' +
    /* bolita que se mece */
    '<g class="nv-pom"><g filter="url(#nvh-pom)"><circle cx="783" cy="516" r="52" fill="url(#nvh-w)"/></g>' +
    '<circle cx="800" cy="534" r="30" fill="#aab3c6" fill-opacity=".25" filter="url(#nvh-b)"/></g>' +
    "</svg>";

  var gorroEl = null, gorroRO = null;
  function gorro() {
    var pic = document.getElementById("fotoPic");
    var fig = pic && pic.closest ? pic.closest(".portrait") : null;
    if (!fig || document.getElementById("nv-hat")) return;
    var PW = 1200, PH = 1245;                // la foto de Roberto
    var ROB = { ex: .503, ey: .305, d: .135 }; // ojos: fracciones de su foto (medidos a mano; los mismos del vampiro de Halloween)
    var APICE = 306;                          // alto de la punta del gorro sobre los ojos, en unidades de la referencia
    gorroEl = document.createElement("div");
    gorroEl.id = "nv-hat";
    gorroEl.className = "nv-hat";
    gorroEl.setAttribute("aria-hidden", "true");
    gorroEl.innerHTML = GORRO;
    fig.appendChild(gorroEl);
    var colocar = function () {
      var W = fig.clientWidth, H = fig.clientHeight;
      if (!W || !H) return;
      var s = Math.max(W / PW, H / PH);       // object-fit:cover con object-position 50% 6%
      var ox = (W - PW * s) * .5, oy = (H - PH * s) * .06;
      var ex = ox + ROB.ex * PW * s, ey = oy + ROB.ey * PH * s;
      var k = (ROB.d * PW * s) / 135;
      // La punta nunca pasa del borde de arriba de la foto ni se acerca a menos de 8 px del logo: si no cabe, el gorro se achica.
      var tope = 4, lg = document.getElementById("logoAnim");
      if (lg) tope = Math.max(tope, lg.getBoundingClientRect().bottom + 8 - fig.getBoundingClientRect().top);
      k = Math.min(k, Math.max(ey - tope, 20) / APICE);
      gorroEl.style.cssText = "left:" + r1(ex - 207 * k) + "px;top:" + r1(ey - 350 * k) + "px;width:" + r1(590 * k) + "px;height:" + r1(410 * k) + "px";
    };
    colocar();
    if (window.ResizeObserver) { gorroRO = new ResizeObserver(colocar); gorroRO.observe(fig); }
    else window.addEventListener("resize", colocar);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", gorro);
  else gorro();

  var tc = document.querySelector('meta[name="theme-color"]');
  var tcAntes = tc ? tc.getAttribute("content") : null;
  if (tc) tc.setAttribute("content", "#0a2f45");
  document.documentElement.classList.add("nv-on");

  window.__nv = {
    off: function () {
      document.documentElement.classList.remove("nv-on");
      if (gorroRO) gorroRO.disconnect();
      if (gorroEl && gorroEl.parentNode) gorroEl.parentNode.removeChild(gorroEl);
      if (root.parentNode) root.parentNode.removeChild(root);
      if (st.parentNode) st.parentNode.removeChild(st);
      if (tc && tcAntes !== null) tc.setAttribute("content", tcAntes);
      window.__nv = null;
    }
  };
})();
