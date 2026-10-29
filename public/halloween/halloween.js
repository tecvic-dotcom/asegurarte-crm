/* Halloween de octubre — fondo animado para el sitio de Roberto.
   Un solo archivo: inyecta su propio CSS y su propio HTML (cielo morado, luna, nubes, estrellas,
   destellos, brasas, silueta de rocas y murciélagos que vuelan y aletean). Sin imágenes ni librerías.
   - Se enciende solo durante octubre (fecha del visitante). El 1 de noviembre ya no corre ni se descarga (decisión de Roberto, 2026-10-29).
   - Para probar fuera de fecha: agregar ?halloween=1 a la dirección; ?halloween=0 lo apaga.
   - Para quitarlo: borrar la línea <script src="/halloween/halloween.js"> de la página.
   - Respeta «reducir movimiento»: ese visitante ve los murciélagos quietos. */
(function () {
  "use strict";
  if (window.__hw) return;

  var forzar = "";
  try { forzar = new URLSearchParams(location.search).get("halloween") || ""; } catch (e) {}
  var hoy = new Date();
  var activo = hoy.getMonth() === 9; // solo octubre: el 1 de noviembre ya está apagado
  if (forzar === "1") activo = true;
  if (forzar === "0") activo = false;
  if (!activo) return;

  var movil = window.matchMedia && window.matchMedia("(max-width:700px)").matches;
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var r1 = function (n) { return Math.round(n * 10) / 10; };

  /* ---------- CSS ---------- */
  var css = [
    /* Paleta morada: las superficies del sitio (tarjetas, ventanas, pie) toman el tono sin tocar su diseño. */
    "html.hw-on{--bg:#0d0622;--bg-2:#150a31;--bg-3:#1c1042;--line:rgba(205,170,255,.13);--line-strong:rgba(205,170,255,.24);--glass:rgba(62,30,112,.50);--glass-2:rgba(80,40,142,.56);background:#0d0622!important}",
    "html.hw-on body{background:transparent!important}",
    "html.hw-on body::before,html.hw-on .bg-ambient,html.hw-on .bg-grid{display:none!important}",
    "#hw{position:fixed;left:0;top:0;width:100%;height:100vh;height:100lvh;z-index:-1;pointer-events:none;overflow:hidden;contain:strict}",
    "#hw *{position:absolute;margin:0;padding:0}",
    "#hw .hw-sky{inset:0;background:radial-gradient(ellipse 85% 50% at 50% 42%,rgba(150,70,230,.40),transparent 72%),radial-gradient(ellipse 100% 38% at 50% 106%,rgba(255,120,40,.22),transparent 70%),linear-gradient(180deg,#0f0424 0%,#25093f 28%,#3b1263 54%,#240840 80%,#130427 100%)}",

    /* Estrellas y destellos de cuatro puntas */
    "#hw .hw-s{border-radius:50%;background:#f1e3ff;box-shadow:0 0 6px 1px rgba(220,190,255,.8);animation:hw-tw var(--du) ease-in-out infinite alternate;animation-delay:var(--dl)}",
    "#hw .hw-k{filter:drop-shadow(0 0 5px currentColor);animation:hw-sp var(--du) ease-in-out infinite;animation-delay:var(--dl)}",

    /* Luna verde-amarilla con halo */
    "#hw .hw-moon{left:66%;top:7vh;width:min(46vmin,420px);aspect-ratio:1;border-radius:50%;opacity:.8;" +
      "background:radial-gradient(circle at 26% 30%,rgba(90,110,30,.30) 0 7%,transparent 8%),radial-gradient(circle at 66% 62%,rgba(90,110,30,.26) 0 9%,transparent 10%),radial-gradient(circle at 44% 78%,rgba(90,110,30,.22) 0 5%,transparent 6%),radial-gradient(circle at 70% 24%,rgba(90,110,30,.20) 0 6%,transparent 7%),radial-gradient(circle at 36% 32%,#eef5b6 0%,#c8d676 38%,#9db04f 70%,#70863a 100%);" +
      "box-shadow:0 0 70px 24px rgba(205,230,110,.26),0 0 190px 80px rgba(165,205,60,.15);animation:hw-glow 7s ease-in-out infinite alternate}",

    /* Nubes moradas a la deriva */
    "#hw .hw-c{border-radius:50%;background:radial-gradient(closest-side,var(--c1),var(--c2) 58%,transparent 100%);animation:hw-drift var(--du) ease-in-out infinite alternate;animation-delay:var(--dl)}",

    /* Rocas del fondo, bruma y brasas */
    "#hw .hw-fog{left:0;right:0;bottom:0;height:34vh;background:linear-gradient(0deg,rgba(130,60,210,.40),rgba(130,60,210,.14) 55%,transparent)}",
    "#hw .hw-ridge{left:0;bottom:0;width:100%;height:max(150px,25vh)}",
    "#hw .hw-e{bottom:-8px;border-radius:50%;background:#ffb04a;box-shadow:0 0 8px 3px rgba(255,140,40,.75);opacity:0;animation:hw-rise var(--du) linear infinite;animation-delay:var(--dl)}",

    /* Murciélagos: el contenedor vuela, el svg se mece y las alas aletean */
    "#hw .hw-bat{left:0;top:0;will-change:transform;animation-timing-function:linear;animation-iteration-count:infinite}",
    "#hw .hw-bat svg{position:static;display:block;width:100%;height:auto;overflow:visible;filter:drop-shadow(0 0 7px rgba(190,95,255,.55));animation:hw-bob var(--bb) ease-in-out infinite alternate}",
    "#hw .hw-bat svg *{position:static}",
    ".hw-w{transform-box:view-box;transform-origin:104px 50px;animation:hw-flap var(--fl) ease-in-out infinite alternate}",

    "@keyframes hw-flap{from{transform:rotate(-30deg) scaleY(1)}to{transform:rotate(26deg) scaleY(.55)}}",
    "@keyframes hw-bob{from{transform:translateY(-6px) rotate(-5deg)}to{transform:translateY(8px) rotate(5deg)}}",
    "@keyframes hw-tw{from{opacity:.2}to{opacity:1}}",
    "@keyframes hw-sp{0%,100%{opacity:.3;transform:scale(.65) rotate(0)}50%{opacity:1;transform:scale(1.15) rotate(24deg)}}",
    "@keyframes hw-glow{from{box-shadow:0 0 60px 20px rgba(205,230,110,.22),0 0 170px 70px rgba(165,205,60,.12)}to{box-shadow:0 0 80px 30px rgba(205,230,110,.32),0 0 210px 90px rgba(165,205,60,.19)}}",
    "@keyframes hw-drift{from{transform:translate3d(-7vw,0,0)}to{transform:translate3d(9vw,2vh,0)}}",
    "@keyframes hw-rise{0%{opacity:0;transform:translate3d(0,0,0)}12%{opacity:.95}100%{opacity:0;transform:translate3d(var(--dx),-58vh,0)}}",

    /* Transformación en vampiro (solo la portada de /roberto): un ciclo de 12 s donde TODO va con la misma duración
       y arranca en el mismo instante: foto de Roberto → temblor + destello + parpadeo → vampiro → de vuelta. La luna se pone roja.
       SIN zoom: la foto del vampiro se coloca (colocar()) para que sus ojos caigan sobre los de Roberto y su cara mida lo mismo. */
    "html.hw-on .portrait.hw-vamp-on #fotoPic{animation:hw-rob 12s linear infinite}",
    ".hw-vw{position:absolute;left:0;top:0;width:100%;height:100%;opacity:0;pointer-events:none;animation:hw-vamp 12s linear infinite}",
    /* La foto del vampiro se achica al tamaño de la cara de Roberto y solo se muestra su cabeza (óvalo con orillas suaves, que llegan a 0 justo en los
       bordes de la foto): el traje de Roberto se queda debajo, oscurecido, y la cabeza cambia. */
    "html.hw-on .portrait .hw-vw img.hw-vamp{position:absolute;display:block;max-width:none;object-fit:fill;margin:0;" +
      "-webkit-mask-image:radial-gradient(ellipse 50% 47% at 52% 44%,#000 72%,transparent 100%),linear-gradient(180deg,transparent 0,#000 6%);-webkit-mask-composite:source-in;" +
      "mask-image:radial-gradient(ellipse 50% 47% at 52% 44%,#000 72%,transparent 100%),linear-gradient(180deg,transparent 0,#000 6%);mask-composite:intersect}",
    /* El tinte rojo y el destello llevan el mismo difuminado de bordes que la foto: sin él se nota el borde inferior de la portada. */
    ".hw-blood,.hw-flash{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;opacity:0;" +
      "-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 7%,#000 60%,transparent 97%),linear-gradient(90deg,transparent 0,#000 13%,#000 87%,transparent 100%);-webkit-mask-composite:source-in;" +
      "mask-image:linear-gradient(180deg,transparent 0,#000 7%,#000 60%,transparent 97%),linear-gradient(90deg,transparent 0,#000 13%,#000 87%,transparent 100%);mask-composite:intersect}",
    ".hw-blood{background:radial-gradient(ellipse 75% 70% at 50% 42%,transparent 38%,rgba(150,0,35,.6) 100%);animation:hw-bloodv 12s linear infinite}",
    ".hw-flash{background:radial-gradient(circle at 50% 38%,rgba(255,255,255,.95),rgba(255,70,80,.75) 28%,rgba(120,0,40,0) 68%);mix-blend-mode:screen;animation:hw-flashv 12s linear infinite}",
    ".hw-vb{position:absolute;left:50%;top:55%;margin:0;opacity:0;pointer-events:none;animation:hw-burst 12s linear infinite}",
    ".hw-vb svg{display:block;width:100%;height:auto;overflow:visible;filter:drop-shadow(0 0 5px rgba(255,60,90,.7))}",
    "#hw .hw-moon::after{content:'';position:absolute;left:0;top:0;width:100%;height:100%;border-radius:50%;opacity:0;background:radial-gradient(circle at 36% 32%,#ffb9a6 0%,#e0503f 42%,#8d1224 100%);box-shadow:0 0 70px 24px rgba(255,50,50,.34),0 0 190px 80px rgba(200,0,30,.22)}",
    "#hw.vamp .hw-moon::after{animation:hw-redmoon 12s linear infinite}",
    /* La foto de Roberto no desaparece: tiembla, se oscurece mientras dura el vampiro (queda su traje) y vuelve a su luz normal. */
    "@keyframes hw-rob{0%,40%{transform:none;filter:none}41.5%{transform:translate(-2px,1px)}42.5%{transform:translate(2px,-1px);filter:saturate(.8) contrast(1.08)}43.5%{transform:translate(-2px,0)}" +
      "44.5%{transform:translate(1px,1px);filter:saturate(.5) contrast(1.25) brightness(1.05)}46.8%{transform:none;filter:saturate(0) contrast(1.5) brightness(1.6)}47%{transform:none;filter:none}" +
      "50%{filter:brightness(.8) saturate(.8)}54%{filter:brightness(.5) saturate(.55)}83%{filter:brightness(.5) saturate(.55)}83.5%{transform:none;filter:none}100%{transform:none;filter:none}}",
    "@keyframes hw-vamp{0%,46.9%{opacity:0;transform:none;filter:none}47%{opacity:1;filter:brightness(2) contrast(1.3) saturate(.3)}47.9%{opacity:.25}48.7%{opacity:1;filter:brightness(1.4)}" +
      "49.4%{opacity:.45}50%{opacity:1;filter:brightness(1.15) contrast(1.1)}53%{filter:none}80%{opacity:1;transform:none;filter:none}" +
      "81.5%{transform:translate(-2px,1px)}82.5%{transform:translate(2px,-1px);filter:contrast(1.15)}83.5%{opacity:1;transform:none;filter:brightness(1.7) saturate(.2)}84%{opacity:.4}84.7%{opacity:.9}85.4%{opacity:0}100%{opacity:0}}",
    "@keyframes hw-flashv{0%,45%{opacity:0}46.6%{opacity:.35}47%{opacity:.85}47.7%{opacity:.1}48.5%{opacity:.4}49.6%{opacity:0}83%{opacity:0}83.5%{opacity:.5}84%{opacity:.85}84.9%{opacity:.1}86%{opacity:0}100%{opacity:0}}",
    "@keyframes hw-bloodv{0%,39%{opacity:0}44%{opacity:.7}47%{opacity:1}53%{opacity:.6}66%{opacity:.4}80%{opacity:.6}84%{opacity:.9}89%{opacity:0}100%{opacity:0}}",
    "@keyframes hw-burst{0%,46%{opacity:0;transform:translate(-50%,-50%) scale(.2)}47%{opacity:1}58%{opacity:0;transform:translate(calc(-50% + var(--bx)),calc(-50% + var(--by))) scale(1.15)}" +
      "59%,82.5%{opacity:0;transform:translate(-50%,-50%) scale(.2)}83.5%{opacity:1}94%{opacity:0;transform:translate(calc(-50% + var(--bx)),calc(-50% + var(--by))) scale(1.15)}100%{opacity:0}}",
    "@keyframes hw-redmoon{0%,45%{opacity:0}52%{opacity:1}80%{opacity:1}88%{opacity:0}100%{opacity:0}}",

    "@media (max-width:700px){#hw .hw-moon{left:34%;top:9vh;width:62vw}}",
    "@media (prefers-reduced-motion:reduce){#hw *{animation:none!important}#hw .hw-bat{transform:translate3d(var(--sx),var(--sy),0)}#hw .hw-e{display:none}}",
    "@media print{#hw{display:none!important}}"
  ].join("\n");

  /* ---------- Murciélago (vista desde arriba, alas extendidas) ---------- */
  var ALA = "M104 50C110 36 124 24 140 22C156 20 176 18 196 8Q172 28 170 52Q152 48 142 62Q126 58 120 70Q110 64 106 62Z";
  var DEDOS = "M140 22L170 52M140 22L142 62M140 22L120 70";
  var ala =
    '<g class="hw-w"><path d="' + ALA + '" fill="url(#hwg)" stroke="#f6d6ff" stroke-opacity=".55" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="' + DEDOS + '" stroke="#f1c8ff" stroke-opacity=".45" stroke-width="1.2" fill="none" stroke-linecap="round"/></g>';
  var murcielago =
    '<svg viewBox="0 0 200 100" aria-hidden="true">' + ala +
    '<g transform="translate(200 0) scale(-1 1)">' + ala + "</g>" +
    '<path d="M93 33L94 20L100 30L106 20L107 33Z" fill="url(#hwb)"/>' +
    '<ellipse cx="100" cy="60" rx="8.5" ry="17" fill="url(#hwb)"/>' +
    '<circle cx="100" cy="40" r="8.5" fill="url(#hwb)"/>' +
    '<circle cx="96.8" cy="39.5" r="1.5" fill="#ffd27a"/><circle cx="103.2" cy="39.5" r="1.5" fill="#ffd27a"/>' +
    "</svg>";

  var DEFS =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<linearGradient id="hwg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0b6ff"/><stop offset=".35" stop-color="#b058e8"/><stop offset=".72" stop-color="#6b21b8"/><stop offset="1" stop-color="#2b0a5a"/></linearGradient>' +
    '<radialGradient id="hwb" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#e2adff"/><stop offset=".6" stop-color="#7a2cc8"/><stop offset="1" stop-color="#2d0b5c"/></radialGradient>' +
    "</defs></svg>";

  var ROCAS =
    '<svg class="hw-ridge" viewBox="0 0 1440 260" preserveAspectRatio="none" aria-hidden="true">' +
    '<path d="M0 260V150L60 120L110 150L180 90L240 140L300 110L380 160L450 100L520 150L600 120L680 170L760 130L840 160L920 95L990 150L1070 120L1150 165L1230 110L1300 150L1380 125L1440 150V260Z" fill="#2c0f4d"/>' +
    '<path d="M0 260V205L80 182L150 212L240 172L330 206L420 188L520 222L620 192L720 217L820 182L930 212L1030 188L1130 217L1230 192L1330 212L1440 188V260Z" fill="#12052b"/>' +
    "</svg>";

  var DESTELLO = '<path d="M12 0C12.8 7 17 11.2 24 12C17 12.8 12.8 17 12 24C11.2 17 7 12.8 0 12C7 11.2 11.2 7 12 0Z" fill="currentColor"/>';

  /* ---------- Armado ---------- */
  var html = DEFS + '<div class="hw-sky"></div>';

  var nStars = movil ? 26 : 44, i;
  for (i = 0; i < nStars; i++) {
    var t = rnd(1, 2.6);
    html += '<i class="hw-s" style="left:' + r1(rnd(0, 100)) + "%;top:" + r1(rnd(0, 58)) + "%;width:" + r1(t) + "px;height:" + r1(t) +
      "px;--du:" + r1(rnd(1.8, 5)) + "s;--dl:-" + r1(rnd(0, 5)) + 's"></i>';
  }

  var colores = ["#ffb347", "#e8cbff", "#ffffff", "#ff9bd0"];
  var nSpark = movil ? 6 : 10;
  for (i = 0; i < nSpark; i++) {
    var sz = rnd(10, 22);
    html += '<svg class="hw-k" viewBox="0 0 24 24" aria-hidden="true" style="left:' + r1(rnd(2, 96)) + "%;top:" + r1(rnd(3, 72)) + "%;width:" + r1(sz) +
      "px;height:" + r1(sz) + "px;color:" + colores[i % colores.length] + ";--du:" + r1(rnd(2.6, 5.5)) + "s;--dl:-" + r1(rnd(0, 5)) + 's">' + DESTELLO + "</svg>";
  }

  html += '<div class="hw-moon"></div>';

  var nubes = [
    ["-12%", "6%", "86vw", "36vh", "rgba(170,90,240,.36)", "rgba(120,50,200,.16)", 90],
    ["34%", "20%", "92vw", "38vh", "rgba(205,110,235,.26)", "rgba(140,60,210,.12)", 110],
    ["-22%", "42%", "104vw", "42vh", "rgba(150,70,230,.38)", "rgba(100,40,190,.16)", 100],
    ["38%", "56%", "96vw", "36vh", "rgba(236,100,190,.20)", "rgba(150,60,200,.10)", 120],
    ["-8%", "68%", "90vw", "34vh", "rgba(130,60,220,.34)", "rgba(90,30,170,.14)", 85]
  ];
  for (i = 0; i < nubes.length; i++) {
    var n = nubes[i];
    html += '<div class="hw-c" style="left:' + n[0] + ";top:" + n[1] + ";width:" + n[2] + ";height:" + n[3] + ";--c1:" + n[4] + ";--c2:" + n[5] +
      ";--du:" + n[6] + "s;--dl:-" + r1(rnd(0, n[6])) + 's"></div>';
  }

  html += '<div class="hw-fog"></div>' + ROCAS;

  var nEmb = movil ? 8 : 16;
  for (i = 0; i < nEmb; i++) {
    var e = rnd(2, 4.5), du = rnd(7, 14);
    html += '<i class="hw-e" style="left:' + r1(rnd(0, 100)) + "%;width:" + r1(e) + "px;height:" + r1(e) + "px;--dx:" + r1(rnd(-6, 6)) + "vw;--du:" +
      r1(du) + "s;--dl:-" + r1(rnd(0, du)) + 's"></i>';
  }

  /* Murciélagos: cada uno con su propio camino ondulado (se generan los @keyframes), tamaño y velocidad.
     Los grandes van más rápido y más opacos (están «cerca»); los chicos, más lentos y tenues. */
  var nBats = movil ? 5 : 7, kf = "", bats = "";
  for (i = 0; i < nBats; i++) {
    var prof = i / (nBats - 1);                       // 0 = lejos, 1 = cerca
    var w = (movil ? 34 : 46) + prof * (movil ? 38 : 76);
    var dur = 36 - prof * 17 + rnd(-2, 2);
    var dir = i % 2 ? -1 : 1;
    var y0 = rnd(8, 60), amp = rnd(4, 11), ciclos = rnd(1.4, 3), fase = rnd(0, 6.28);
    var name = "hw-f" + i, pasos = 18, frames = "";
    for (var k = 0; k <= pasos; k++) {
      var tt = k / pasos;
      var x = dir > 0 ? -22 + 144 * tt : 122 - 144 * tt;
      var y = y0 + amp * Math.sin(6.283 * ciclos * tt + fase);
      frames += r1(tt * 100) + "%{transform:translate3d(" + r1(x) + "vw," + r1(y) + "vh,0)}";
    }
    kf += "@keyframes " + name + "{" + frames + "}";
    var sx = r1(rnd(8, 82)) + "vw", sy = r1(y0) + "vh";
    bats += '<div class="hw-bat" style="width:' + r1(w) + "px;opacity:" + r1(0.55 + prof * 0.45) + ";--sx:" + sx + ";--sy:" + sy +
      ";animation-name:" + name + ";animation-duration:" + r1(dur) + "s;animation-delay:-" + r1(rnd(0, dur)) + "s;--bb:" + r1(rnd(0.7, 1.2)) +
      "s;--fl:" + r1(rnd(0.3, 0.5)) + "s;--fd:0s\">" + murcielago + "</div>";
  }
  html += bats;

  /* ---------- Montaje ---------- */
  var estilo = document.createElement("style");
  estilo.id = "hw-css";
  estilo.textContent = css + "\n" + kf;
  var capa = document.createElement("div");
  capa.id = "hw";
  capa.setAttribute("aria-hidden", "true");
  capa.innerHTML = html;

  var meta = document.querySelector('meta[name="theme-color"]');
  var metaAntes = meta ? meta.getAttribute("content") : null;

  function montar() {
    document.head.appendChild(estilo);
    document.body.appendChild(capa);
    document.documentElement.classList.add("hw-on");
    if (meta) meta.setAttribute("content", "#12052b");
  }
  if (document.body) montar(); else document.addEventListener("DOMContentLoaded", montar);

  /* ---------- Transformación en vampiro: solo donde exista la portada de /roberto (#fotoPic) ---------- */
  var vampPiezas = [], vampFig = null, vampTimer = 0, vampRO = null, vampColocar = null;

  function vampiro() {
    var pic = document.getElementById("fotoPic");
    var fig = pic && pic.parentNode;
    if (!fig || !window.__hw || !capa.parentNode) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;   // sin movimiento: se queda la foto de Roberto
    if (navigator.connection && navigator.connection.saveData) return;                               // ahorro de datos: no baja la imagen extra

    var foto = new Image();
    foto.className = "hw-vamp";
    foto.alt = "";
    foto.setAttribute("aria-hidden", "true");
    foto.draggable = false;

    /* Dónde caen los ojos en cada foto (medidos a mano): Roberto en fracciones de su foto (1200×1245), el vampiro en píxeles de la suya (514×1112).
       La foto de Roberto llena el cuadro con object-fit:cover y object-position:50% 6%; con esa misma cuenta se calcula en qué punto del cuadro
       quedan sus ojos y cuánto miden, y la foto del vampiro se escala y se mueve para que sus ojos caigan exactamente ahí. */
    var ROB = { ex: 0.503, ey: 0.305, d: 0.135 };
    var VAM = { w: 514, h: 1112, ex: 273, ey: 405, d: 192 };
    var ESCALA = 1.12;   // la cara de Roberto es más ancha que la del vampiro para la misma distancia entre ojos

    var vw = document.createElement("div");
    vw.className = "hw-vw";
    vw.appendChild(foto);

    function colocar() {
      var im = pic.querySelector("img");
      var W = fig.clientWidth, H = fig.clientHeight;
      if (!im || !W || !H) return;
      var nw = im.naturalWidth || 1200, nh = im.naturalHeight || 1245;
      var s = Math.max(W / nw, H / nh);
      var ox = (W - nw * s) * 0.5, oy = (H - nh * s) * 0.06;
      var X = ox + ROB.ex * nw * s, Y = oy + ROB.ey * nh * s, D = ROB.d * nw * s;
      var sv = D * ESCALA / VAM.d;
      foto.style.width = r1(VAM.w * sv) + "px";
      foto.style.height = r1(VAM.h * sv) + "px";
      foto.style.left = r1(X - VAM.ex * sv) + "px";
      foto.style.top = r1(Y - VAM.ey * sv) + "px";
    }

    function listo() {
      if (!window.__hw || !fig.isConnected) return;
      colocar();
      var piezas = [vw];
      var sangre = document.createElement("div"); sangre.className = "hw-blood"; piezas.push(sangre);
      var destello = document.createElement("div"); destello.className = "hw-flash"; piezas.push(destello);
      /* Murciélagos que salen volando en cada transformación (desde la boca hacia afuera). */
      var salidas = [[-150, -120], [140, -110], [-90, -170], [100, -170], [-190, -40], [185, -30]];
      for (var j = 0; j < salidas.length; j++) {
        var b = document.createElement("div");
        b.className = "hw-vb";
        b.style.cssText = "width:" + (34 + (j % 3) * 12) + "px;--bx:" + salidas[j][0] + "px;--by:" + salidas[j][1] + "px;--fl:" + r1(0.18 + (j % 3) * 0.04) + "s;animation-delay:" + r1(j * 0.04) + "s";
        b.innerHTML = murcielago;
        piezas.push(b);
      }
      /* Todo entra en el mismo instante para que los ciclos de 12 s queden sincronizados (incluida la luna roja). */
      for (var k = 0; k < piezas.length; k++) fig.appendChild(piezas[k]);
      fig.classList.add("hw-vamp-on");
      capa.classList.add("vamp");
      vampPiezas = piezas; vampFig = fig;
      /* Si cambia el tamaño del cuadro (girar el celular, cambiar la ventana), los ojos se vuelven a alinear. */
      if (window.ResizeObserver) { vampRO = new ResizeObserver(colocar); vampRO.observe(fig); }
      else { vampColocar = colocar; window.addEventListener("resize", colocar); }
    }
    foto.onload = function () { if (foto.decode) foto.decode().then(listo, listo); else listo(); };
    foto.src = "/halloween/vampiro.webp";
  }

  function programarVampiro() { vampTimer = setTimeout(vampiro, 600); }
  if (document.readyState === "complete") programarVampiro(); else window.addEventListener("load", programarVampiro);

  window.__hw = {
    /* Para páginas que cambian de pantalla sin recargar (Next): deja todo como estaba. */
    off: function () {
      clearTimeout(vampTimer);
      window.removeEventListener("load", programarVampiro);
      if (vampRO) { vampRO.disconnect(); vampRO = null; }
      if (vampColocar) window.removeEventListener("resize", vampColocar);
      for (var q = 0; q < vampPiezas.length; q++) if (vampPiezas[q].parentNode) vampPiezas[q].parentNode.removeChild(vampPiezas[q]);
      if (vampFig) vampFig.classList.remove("hw-vamp-on");
      document.documentElement.classList.remove("hw-on");
      if (estilo.parentNode) estilo.parentNode.removeChild(estilo);
      if (capa.parentNode) capa.parentNode.removeChild(capa);
      if (meta && metaAntes !== null) meta.setAttribute("content", metaAntes);
      window.__hw = null;
    }
  };
})();
