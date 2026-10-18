/* Dinero Bajo Control — reporte semanal en PDF.
   Se arma dentro del teléfono con jsPDF (vendor/): ninguna cifra sale del dispositivo. Los títulos y las cifras llevan la
   Anton cursiva de la marca (incrustada); el resto va en Helvetica. Recibe el objeto que arma Motor.armarReporte(). */
(function (root) {
  "use strict";

  const S = 0.75;                 // 1 px de la maqueta = 0.75 pt de la hoja Carta (612 x 792 pt)
  const W = 816, H = 1056;        // la hoja en «px de maqueta»
  const PIE = 86;                 // alto del pie de página
  const MARGEN = 36;
  const COL = {
    ink: [11, 16, 48], mute: [91, 99, 134], linea: [223, 227, 245], suave: [244, 246, 255], pista: [232, 235, 250],
    royal: [42, 34, 245], royal2: [91, 123, 255], navy: [6, 7, 15], blanco: [255, 255, 255],
    verde: [18, 165, 116], ama: [242, 165, 22], rojo: [229, 72, 77],
  };
  const COLOR_SEMAFORO = { verde: COL.verde, amarillo: COL.ama, rojo: COL.rojo };
  const COLOR_TIPO = { gasto: [192, 57, 43], ingreso: COL.verde, ahorro: COL.royal, abono: [185, 119, 14] };
  const WA = "https://wa.me/528182800234";

  let lib = null;

  const cargarScript = (src) => new Promise((ok, mal) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => mal(new Error("no cargó " + src)); document.head.appendChild(s); });
  const aBase64 = (buf) => { const b = new Uint8Array(buf); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  const aDataUrl = (blob) => new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(blob); });

  // Carga (una sola vez) la librería, la Anton y el logo. La primera vez necesita internet; luego queda guardado para usarse sin conexión.
  async function cargar() {
    if (lib) return lib;
    if (!root.jspdf) await cargarScript("vendor/jspdf.umd.min.js");
    const [ttf, logoBlob] = await Promise.all([
      fetch("vendor/Anton-Regular.ttf").then((r) => { if (!r.ok) throw new Error("fuente"); return r.arrayBuffer(); }),
      fetch("vendor/logo.png").then((r) => { if (!r.ok) throw new Error("logo"); return r.blob(); }),
    ]);
    const url = await aDataUrl(logoBlob);
    const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error("logo")); i.src = url; });
    // el color de fondo del propio logo: la franja del encabezado lo usa para fundirse con él
    let fondo = COL.navy;
    try { const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext("2d"); x.drawImage(img, 0, 0); const p = x.getImageData(4, 4, 1, 1).data; fondo = [p[0], p[1], p[2]]; } catch (e) { /* se queda el azul-noche */ }
    lib = { jsPDF: root.jspdf.jsPDF, anton: aBase64(ttf), logo: { url, w: img.naturalWidth, h: img.naturalHeight, fondo } };
    return lib;
  }

  // Solo caracteres que las letras del PDF saben dibujar (lo demás, como un emoji en una nota, se quita).
  const limpiar = (t) => String(t == null ? "" : t).replace(/−/g, "-").replace(/[^ -~ -ÿ–—‘’“”•…€]/g, "").replace(/\s+/g, " ").trim();

  async function generar(rep) {
    const L = await cargar();
    const doc = new L.jsPDF({ unit: "pt", format: [612, 792], compress: true });
    doc.addFileToVFS("Anton-Regular.ttf", L.anton);
    doc.addFont("Anton-Regular.ttf", "Anton", "normal");
    doc.setProperties({
      title: "Reporte semanal · " + limpiar(rep.familia) + " · " + rep.periodo.etiqueta,
      subject: "Dinero Bajo Control", author: "Dinero Bajo Control · Roberto Rodríguez - Especialista en Asegurarte", creator: "Dinero Bajo Control",
    });

    const px = (n) => n * S;
    // ---- dibujo básico (todo en px de maqueta; y = línea base del texto) ----
    function texto(t, x, y, o) {
      o = Object.assign({ size: 12, anton: false, peso: "normal", color: COL.ink, align: "left", cursiva: false, espacio: 0 }, o);
      t = limpiar(t);
      if (!t) return;
      if (o.anton) doc.setFont("Anton", "normal"); else doc.setFont("helvetica", o.peso);
      doc.setFontSize(o.size * S);
      doc.setTextColor(o.color[0], o.color[1], o.color[2]);
      if (o.espacio) doc.setCharSpace(o.espacio * S);
      const yp = px(y);
      if (o.cursiva) { // Anton no trae cursiva: se inclina 14° (igual que en el logo y en la tarjeta), sin mover la línea base
        const sk = Math.tan((14 * Math.PI) / 180);
        doc.internal.write("q 1 0 " + sk.toFixed(4) + " 1 " + (-sk * (doc.internal.pageSize.getHeight() - yp)).toFixed(3) + " 0 cm");
      }
      doc.text(t, px(x), yp, { align: o.align });
      if (o.cursiva) doc.internal.write("Q");
      if (o.espacio) doc.setCharSpace(0);
    }
    const ancho = (t, o) => { if (o.anton) doc.setFont("Anton", "normal"); else doc.setFont("helvetica", o.peso || "normal"); doc.setFontSize(o.size * S); return doc.getTextWidth(limpiar(t)) / S; };
    function recortar(t, max, o) { // corta con «…» si no cabe
      t = limpiar(t);
      if (ancho(t, o) <= max) return t;
      while (t.length > 1 && ancho(t + "…", o) > max) t = t.slice(0, -1);
      return t + "…";
    }
    function lineas(t, max, o) { // parte un texto en renglones que quepan
      if (o.anton) doc.setFont("Anton", "normal"); else doc.setFont("helvetica", o.peso || "normal");
      doc.setFontSize(o.size * S);
      return doc.splitTextToSize(limpiar(t), px(max));
    }
    function caja(x, y, w, h, o) {
      o = Object.assign({ fill: null, stroke: null, radio: 0, grosor: 1, dash: false }, o);
      if (o.fill) doc.setFillColor(o.fill[0], o.fill[1], o.fill[2]);
      if (o.stroke) { doc.setDrawColor(o.stroke[0], o.stroke[1], o.stroke[2]); doc.setLineWidth(px(o.grosor)); }
      if (o.dash) doc.setLineDashPattern([px(3), px(3)], 0);
      doc.roundedRect(px(x), px(y), px(w), px(h), px(o.radio), px(o.radio), o.fill && o.stroke ? "FD" : o.fill ? "F" : "S");
      if (o.dash) doc.setLineDashPattern([], 0);
    }
    function punto(cx, cy, r, c) { doc.setFillColor(c[0], c[1], c[2]); doc.circle(px(cx), px(cy), px(r), "F"); }
    function raya(x1, y, x2, c, grosor) { doc.setDrawColor(c[0], c[1], c[2]); doc.setLineWidth(px(grosor)); doc.line(px(x1), px(y), px(x2), px(y)); }

    // ---- bloques de la hoja ----
    function encabezado(grande) {
      const hh = grande ? 84 : 52, lh = grande ? 56 : 34;
      caja(0, 0, W, hh, { fill: L.logo.fondo });
      doc.addImage(L.logo.url, "PNG", px(MARGEN), px((hh - lh) / 2), px((lh * L.logo.w) / L.logo.h), px(lh));
      texto("REPORTE SEMANAL", W - MARGEN, grande ? 38 : 25, { size: grande ? 10 : 8.5, peso: "bold", color: COL.royal2, align: "right", espacio: 1.4 });
      texto(rep.periodo.etiqueta, W - MARGEN, grande ? 58 : 41, { size: grande ? 15 : 12, peso: "bold", color: COL.blanco, align: "right" });
      return hh;
    }
    function pie(n, total) {
      const top = H - PIE;
      caja(0, top, W, PIE, { fill: COL.navy });
      texto("¿Quieres revisar con Roberto lo que te falta proteger?", MARGEN, top + 25, { anton: true, cursiva: true, size: 14, color: COL.blanco });
      texto("Sin compromiso. Escríbele por WhatsApp.", MARGEN, top + 41, { size: 11, color: [184, 190, 221] });
      const bw = 172, bx = W - MARGEN - bw;
      caja(bx, top + 12, bw, 31, { fill: [37, 211, 102], radio: 8 });
      texto("WhatsApp 81 8280 0234", bx + bw / 2, top + 32, { size: 12, peso: "bold", color: [4, 35, 15], align: "center" });
      doc.link(px(bx), px(top + 12), px(bw), px(31), { url: WA });
      raya(MARGEN, top + 52, W - MARGEN, [32, 38, 77], 1);
      texto("Dinero Bajo Control · un regalo de Roberto Rodríguez - Especialista en Asegurarte · especialistaenasegurarte.lat/roberto", MARGEN, top + 65, { size: 8.5, color: [138, 144, 180] });
      texto("Orientación educativa. No es asesoría financiera, fiscal ni cotización de seguros. Tus datos se quedaron en tu teléfono.", MARGEN, top + 77, { size: 8, color: [110, 116, 150] });
      texto("Hoja " + n + " de " + total, W - MARGEN, top + 65, { size: 8.5, color: [138, 144, 180], align: "right" });
    }

    const LIMITE = H - PIE - 14; // hasta dónde puede llegar el contenido
    let y = encabezado(true);

    // título
    texto(rep.familia, MARGEN, y + 40, { anton: true, cursiva: true, size: 28, color: COL.ink });
    texto("Dinero Bajo Control · " + rep.periodo.subtitulo, MARGEN, y + 60, { size: 12.5, color: COL.mute });
    if (rep.ejemplo) {
      caja(W - MARGEN - 100, y + 16, 100, 34, { stroke: [185, 191, 220], radio: 6, dash: true });
      texto("EJEMPLO", W - MARGEN - 50, y + 30, { size: 9, color: COL.mute, align: "center", espacio: 0.6 });
      texto("DATOS DE MUESTRA", W - MARGEN - 50, y + 43, { size: 8, color: COL.mute, align: "center", espacio: 0.4 });
    }

    // semáforo
    y += 78;
    const SH = 64;
    caja(MARGEN, y, 118, SH, { stroke: COL.royal, radio: 12, grosor: 2 });
    texto(String(rep.puntaje), MARGEN + 59, y + 36, { anton: true, cursiva: true, size: 34, color: COL.royal, align: "center" });
    texto("de 100", MARGEN + 59, y + 49, { size: 9.5, color: COL.mute, align: "center" });
    texto("salud financiera", MARGEN + 59, y + 59, { size: 9.5, color: COL.mute, align: "center" });
    const pw = (W - 2 * MARGEN - 118 - 4 * 8) / 4;
    rep.pilares.forEach((p, i) => {
      const x = MARGEN + 118 + 8 + i * (pw + 8);
      caja(x, y, pw, SH, { fill: COL.suave, radio: 10 });
      punto(x + 14, y + 17, 5.5, COLOR_SEMAFORO[p.color] || COL.mute);
      texto(p.nombre, x + 26, y + 21, { size: 11, peso: "bold" });
      lineas(p.texto, pw - 22, { size: 10 }).slice(0, 3).forEach((l, k) => texto(l, x + 11, y + 37 + k * 12, { size: 10, color: COL.mute }));
    });

    // cifras
    y += SH + 10;
    const k = rep.kpis, KH = 48, KW = (W - 2 * MARGEN - 14) / 3;
    const pasado = k.restante < 0;
    const tarjetas = [
      ["Tope de la semana", k.tope], ["Gastaste", k.gastado], [pasado ? "Te pasaste por" : "Te quedó", Math.abs(k.restante)],
      ["Ingresos extra", k.ingresosExtra], ["Apartaste para tu fondo", k.ahorrado], ["Abonaste a deudas", k.abonado],
    ];
    const mxn = (n) => "$" + Math.round(n).toLocaleString("en-US");
    tarjetas.forEach(([et, v], i) => {
      const x = MARGEN + (i % 3) * (KW + 7), yy = y + Math.floor(i / 3) * (KH + 7), resaltada = i === 2;
      caja(x, yy, KW, KH, resaltada ? { fill: pasado ? COL.rojo : COL.royal, radio: 10 } : { fill: COL.blanco, stroke: COL.linea, radio: 10 });
      texto(et, x + 12, yy + 17, { size: 10.5, color: resaltada ? [207, 214, 255] : COL.mute });
      texto(mxn(v), x + 12, yy + 40, { anton: true, cursiva: true, size: 22, color: resaltada ? COL.blanco : COL.ink });
    });
    y += 2 * KH + 7 + 12;

    // categorías + tope
    const cw = (W - 2 * MARGEN - 14) * 1.15 / 2.15, tw = W - 2 * MARGEN - 14 - cw, tx = MARGEN + cw + 14;
    texto("En qué se fue el gasto", MARGEN, y + 14, { anton: true, cursiva: true, size: 15 });
    const cats = rep.categorias.slice(0, 5);
    if (!cats.length) texto("Sin gastos registrados esta semana.", MARGEN, y + 38, { size: 11.5, color: COL.mute });
    cats.forEach((c, i) => {
      const yy = y + 26 + i * 28;
      texto(recortar(c.nombre, cw - 80, { size: 11.5 }), MARGEN, yy + 11, { size: 11.5 });
      texto(mxn(c.monto), MARGEN + cw, yy + 11, { size: 11.5, peso: "bold", align: "right" });
      caja(MARGEN, yy + 16, cw, 8, { fill: COL.pista, radio: 4 });
      caja(MARGEN, yy + 16, Math.max(8, cw * c.rel), 8, { fill: COL.royal2, radio: 4 });
    });
    const altoCats = 26 + Math.max(1, cats.length) * 28 + 6;
    caja(tx, y, tw, 118, { fill: COL.blanco, stroke: COL.linea, radio: 10 });
    texto("Cómo vas contra tu tope", tx + 12, y + 26, { anton: true, cursiva: true, size: 15 });
    caja(tx + 12, y + 40, tw - 24, 14, { fill: COL.pista, radio: 7 });
    caja(tx + 12, y + 40, Math.max(14, (tw - 24) * Math.min(1, Math.max(0, rep.uso) / 100)), 14, { fill: COLOR_SEMAFORO[rep.color] || COL.royal2, radio: 7 });
    lineas(rep.uso + "% usado. " + rep.mensajeTope, tw - 24, { size: 11.5 }).slice(0, 4).forEach((l, i) => texto(l, tx + 12, y + 76 + i * 14, { size: 11.5, color: COL.mute }));
    y += Math.max(altoCats, 118) + 12;

    // movimientos (la tabla sigue en otra hoja si no cabe)
    const COLS = { dia: MARGEN + 8, tipo: MARGEN + 70, detalle: MARGEN + 150, monto: W - MARGEN - 8 };
    const RH = 22;
    function cabezaTabla() {
      texto("DÍA", COLS.dia, y + 10, { size: 9, peso: "bold", color: COL.mute, espacio: 0.7 });
      texto("TIPO", COLS.tipo, y + 10, { size: 9, peso: "bold", color: COL.mute, espacio: 0.7 });
      texto("DETALLE", COLS.detalle, y + 10, { size: 9, peso: "bold", color: COL.mute, espacio: 0.7 });
      texto("MONTO", COLS.monto, y + 10, { size: 9, peso: "bold", color: COL.mute, align: "right", espacio: 0.7 });
      raya(MARGEN, y + 15, W - MARGEN, COL.ink, 2);
      y += 15;
    }
    function nuevaHoja() { doc.addPage(); y = encabezado(false) + 14; }
    texto("Movimientos de la semana", MARGEN, y + 14, { anton: true, cursiva: true, size: 15 });
    y += 22;
    cabezaTabla();
    if (!rep.movimientos.length) {
      texto("Todavía no hay movimientos en esta semana.", COLS.dia, y + 16, { size: 11.5, color: COL.mute });
      y += RH;
    }
    rep.movimientos.forEach((m, i) => {
      if (y + RH > LIMITE) { nuevaHoja(); texto("Movimientos de la semana (continuación)", MARGEN, y + 10, { anton: true, cursiva: true, size: 13 }); y += 18; cabezaTabla(); }
      if (i % 2 === 1) caja(MARGEN, y, W - 2 * MARGEN, RH, { fill: COL.suave });
      texto(m.dia, COLS.dia, y + 15, { size: 11.5 });
      texto(m.tipoNombre.toUpperCase(), COLS.tipo, y + 15, { size: 8.5, peso: "bold", color: COLOR_TIPO[m.tipo] || COL.ink, espacio: 0.4 });
      texto(recortar(m.detalle, COLS.monto - COLS.detalle - 90, { size: 11.5 }), COLS.detalle, y + 15, { size: 11.5 });
      texto(m.texto, COLS.monto, y + 15, { size: 11.5, align: "right" });
      raya(MARGEN, y + RH, W - MARGEN, COL.linea, 0.8);
      y += RH;
    });
    if (y + RH + 4 > LIMITE) nuevaHoja();
    raya(MARGEN, y + 2, W - MARGEN, COL.ink, 2);
    texto("Gastos de la semana (cuentan contra tu tope)", COLS.dia, y + 19, { size: 11.5, peso: "bold" });
    texto("-" + mxn(rep.totalGastos), COLS.monto, y + 19, { size: 11.5, peso: "bold", align: "right" });
    y += RH + 4;
    if (rep.omitidos) { texto("Se muestran los primeros " + rep.movimientos.length + " movimientos; faltan " + rep.omitidos + " (sí están en los totales).", COLS.dia, y + 8, { size: 9.5, color: COL.mute }); y += 14; }

    // acción para la próxima semana
    if (rep.accion) {
      const cuerpo = lineas(rep.accion.titulo + ". " + rep.accion.detalle, W - 2 * MARGEN - 34, { size: 11.5 }).slice(0, 4);
      const ah = 36 + cuerpo.length * 14;
      if (y + 10 + ah > LIMITE) nuevaHoja();
      caja(MARGEN, y + 10, W - 2 * MARGEN, ah, { fill: COL.suave, radio: 8 });
      caja(MARGEN, y + 10, 6, ah, { fill: COL.royal });
      texto("Tu acción para la próxima semana", MARGEN + 18, y + 31, { anton: true, cursiva: true, size: 13 });
      cuerpo.forEach((l, i) => texto(l, MARGEN + 18, y + 49 + i * 14, { size: 11.5 }));
    }

    // pie en todas las hojas
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) { doc.setPage(i); pie(i, total); }

    return { blob: doc.output("blob"), nombre: "Dinero-Bajo-Control_semana_" + rep.periodo.desde + ".pdf", paginas: total };
  }

  root.Pdf = { generar, cargar };
})(typeof window !== "undefined" ? window : this);
