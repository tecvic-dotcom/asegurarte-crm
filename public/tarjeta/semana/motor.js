/* Dinero Bajo Control — motor de cálculo.
   Regla de diseño: TODAS las cifras salen de aquí con reglas fijas. La IA (si se conecta) solo redacta
   sobre el JSON de `armarHechos` y su texto se valida con `validarTexto` (no puede inventar cifras). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Motor = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Supuestos editables. Se muestran a la familia en «Cómo calculamos».
  const REGLAS = {
    diasMes: 30.4,
    semanasPorMes: 30.4 / 7,
    ahorroPctIngreso: 0.10,   // lo que se intenta apartar cada mes, si hay holgura
    fondoMini: 1,             // primer escalón del fondo de emergencia (meses de gasto)
    fondoMesesBase: 3,
    fondoMesesDependientes: 6,
    deudaVerde: 0.20,         // pagos de deuda / ingreso
    deudaRojo: 0.35,
    flujoVerde: 0.10,         // holgura / ingreso
    tasaAltaAnual: 30,        // % anual a partir del cual una deuda es «cara»
    maxMesesSim: 600,
  };

  const CATEGORIAS = {
    comida: "Comida y despensa",
    transporte: "Transporte",
    salidas: "Salidas y gustos",
    hogar: "Hogar",
    salud: "Salud",
    escuela: "Escuela e hijos",
    ropa: "Ropa",
    otros: "Otros",
  };

  // Los 4 tipos de movimiento que la familia puede anotar. Lo anterior a esto eran solo gastos (sin `tipo`).
  const TIPOS = { gasto: "Gasto", ingreso: "Ingreso extra", ahorro: "Ahorro apartado", abono: "Abono a deuda" };
  const tipoDe = (m) => (m && Object.prototype.hasOwnProperty.call(TIPOS, m.tipo) ? m.tipo : "gasto");
  const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  const PALABRAS = {
    comida: ["super", "despensa", "comida", "tortilla", "restaurante", "taco", "cafe", "pan", "fruta", "verdura", "carne", "pollo", "leche", "mercado", "walmart", "soriana", "heb", "oxxo", "desayuno", "cena", "lonche"],
    transporte: ["gasolina", "uber", "didi", "camion", "metro", "estacionamiento", "caseta", "taxi", "pasaje", "transporte", "refaccion", "llanta"],
    salidas: ["cine", "fiesta", "salida", "netflix", "spotify", "juego", "helado", "pizza", "bar", "viaje", "paseo", "regalo", "antojo"],
    hogar: ["gas", "foco", "plomero", "limpieza", "detergente", "mueble", "reparacion", "herramienta", "cloro", "jabon"],
    salud: ["medicina", "farmacia", "doctor", "consulta", "dentista", "analisis", "hospital", "lentes", "vitamina"],
    escuela: ["escuela", "colegiatura", "uniforme", "utiles", "libro", "cuaderno", "mochila", "pañal", "panal", "guarderia", "juguete"],
    ropa: ["ropa", "zapato", "tenis", "playera", "pantalon", "vestido", "chamarra"],
  };

  // ---------- utilidades ----------
  const num = (v) => {
    const n = typeof v === "string" ? Number(v.replace(/[$,\s]/g, "")) : Number(v);
    return isFinite(n) && n > 0 ? n : 0;
  };
  const suma = (o) => Object.values(o || {}).reduce((a, v) => a + num(v), 0);
  const redondea = (n) => Math.round(n);
  const mxn = (n) => "$" + Math.round(n).toLocaleString("en-US");
  const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const PUNTOS = { verde: 100, amarillo: 50, rojo: 0 };

  const z2 = (n) => String(n).padStart(2, "0");
  const iso = (d) => d.getFullYear() + "-" + z2(d.getMonth() + 1) + "-" + z2(d.getDate());
  const aFecha = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const lunesDe = (d) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  };
  const sumaDias = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };

  const normDeuda = (d) => ({
    nombre: String(d.nombre || "Deuda").slice(0, 40),
    saldo: num(d.saldo),
    tasa: num(d.tasa),
    pago: num(d.pago),
  });

  // ---------- presupuesto base ----------
  function resumen(p, R = REGLAS) {
    const ingreso = num(p.ingreso);
    const fijos = suma(p.fijos);
    const deudas = (p.deudas || []).map(normDeuda).filter((d) => d.saldo > 0);
    const pagosDeuda = deudas.reduce((a, d) => a + d.pago, 0);
    const basico = num(p.basico);
    const libre = ingreso - fijos - pagosDeuda;            // para vivir y ahorrar
    const holgura = libre - basico;                        // lo que sobra después de lo básico
    const apartarMes = Math.max(0, Math.min(ingreso * R.ahorroPctIngreso, holgura));
    const limiteMes = Math.max(0, libre - apartarMes);     // todo el gasto del día a día
    const limiteSemana = limiteMes / R.semanasPorMes;
    return {
      ingreso, fijos, pagosDeuda, basico, deudas, libre, holgura,
      deficit: libre < 0 ? -libre : 0,
      faltaBasico: libre >= 0 && libre < basico ? basico - libre : 0,
      apartarMes, apartarSemana: apartarMes / R.semanasPorMes,
      limiteMes, limiteSemana,
    };
  }

  function fondo(p, res, R = REGLAS) {
    const esenciales = res.fijos + res.pagosDeuda + res.basico;
    const ahorro = num(p.ahorro);
    const meses = esenciales > 0 ? ahorro / esenciales : 0;
    const metaMeses = p.dependientes ? R.fondoMesesDependientes : R.fondoMesesBase;
    const metaMonto = esenciales * metaMeses;
    const miniMonto = esenciales * R.fondoMini;
    const faltante = Math.max(0, metaMonto - ahorro);
    const faltanteMini = Math.max(0, miniMonto - ahorro);
    const color = meses < R.fondoMini ? "rojo" : meses < metaMeses ? "amarillo" : "verde";
    return {
      ahorro, esenciales, meses, metaMeses, metaMonto, miniMonto, faltante, faltanteMini, color,
      mesesParaMeta: res.apartarMes > 0 && faltante > 0 ? Math.ceil(faltante / res.apartarMes) : null,
    };
  }

  // ---------- deudas ----------
  function simularDeudas(deudas, extra, estrategia, R = REGLAS) {
    const ds = deudas.map((d) => ({ nombre: d.nombre, saldo: d.saldo, i: d.tasa / 100 / 12, pago: d.pago, tasa: d.tasa }));
    const presupuesto = ds.reduce((a, d) => a + d.pago, 0) + extra;
    const orden = estrategia === "bola"
      ? (a, b) => a.saldo - b.saldo
      : (a, b) => b.tasa - a.tasa || a.saldo - b.saldo;
    const liquidadas = [];
    let meses = 0, intereses = 0;
    while (ds.some((d) => d.saldo > 0.005) && meses < R.maxMesesSim) {
      meses++;
      for (const d of ds) if (d.saldo > 0.005) { const x = d.saldo * d.i; d.saldo += x; intereses += x; }
      let disp = presupuesto;
      for (const d of ds) {
        if (d.saldo <= 0.005) continue;
        const pg = Math.min(d.pago, d.saldo);
        d.saldo -= pg; disp -= pg;
      }
      for (const d of ds.filter((x) => x.saldo > 0.005).sort(orden)) {
        if (disp <= 0.005) break;
        const pg = Math.min(disp, d.saldo);
        d.saldo -= pg; disp -= pg;
      }
      for (const d of ds) if (d.saldo <= 0.005 && !liquidadas.find((l) => l.nombre === d.nombre)) liquidadas.push({ nombre: d.nombre, mes: meses });
    }
    const termina = !ds.some((d) => d.saldo > 0.005);
    return { meses: termina ? meses : null, intereses: redondea(intereses), liquidadas, termina };
  }

  function deudaInfo(p, res, R = REGLAS) {
    const total = res.deudas.reduce((a, d) => a + d.saldo, 0);
    const ratio = res.ingreso > 0 ? res.pagosDeuda / res.ingreso : 0;
    const cara = res.deudas.filter((d) => d.tasa >= R.tasaAltaAnual);
    const creceSola = res.deudas.some((d) => d.pago > 0 && d.pago <= (d.saldo * d.tasa) / 1200);
    let color = "verde";
    if (res.deudas.length) {
      color = ratio > R.deudaRojo || creceSola ? "rojo" : ratio > R.deudaVerde || cara.length ? "amarillo" : "verde";
    }
    const extra = res.apartarMes;
    const soloMinimos = res.deudas.length ? simularDeudas(res.deudas, 0, "avalancha", R) : null;
    const avalancha = res.deudas.length && extra > 0 ? simularDeudas(res.deudas, extra, "avalancha", R) : null;
    const bola = res.deudas.length && extra > 0 ? simularDeudas(res.deudas, extra, "bola", R) : null;
    const masCara = [...res.deudas].sort((a, b) => b.tasa - a.tasa || b.saldo - a.saldo)[0] || null;
    const ahorroIntereses = soloMinimos && avalancha && soloMinimos.termina ? Math.max(0, soloMinimos.intereses - avalancha.intereses) : null;
    return { total, ratioPct: Math.round(ratio * 100), color, hayCara: cara.length > 0, creceSola, masCara, extra, soloMinimos, avalancha, bola, ahorroIntereses };
  }

  // ---------- protección ----------
  function proteccion(p) {
    const s = p.seguros || {};
    const huecos = [];
    if (s.gmm === "no") huecos.push({ ramo: "gmm", prioridad: "alta", titulo: "Gastos médicos mayores", razon: "Una hospitalización puede terminarse el fondo de emergencia de golpe." });
    if (s.vida === "no" && p.dependientes) huecos.push({ ramo: "vida", prioridad: "alta", titulo: "Seguro de vida", razon: "Hay personas que dependen del ingreso de la casa." });
    if (s.auto === "no") huecos.push({ ramo: "auto", prioridad: "media", titulo: "Seguro de auto", razon: "Un choque sin seguro se paga de tu bolsa." });
    if (s.hogar === "no") huecos.push({ ramo: "hogar", prioridad: "media", titulo: "Seguro de hogar", razon: "Un daño o robo en casa pega directo al presupuesto." });
    const altas = huecos.filter((h) => h.prioridad === "alta").length;
    return { huecos, altas, color: altas > 0 ? "rojo" : huecos.length ? "amarillo" : "verde" };
  }

  // ---------- plan «vivo»: el plan base + lo que la familia va anotando ----------
  // Un movimiento solo mueve el plan si se anotó DESPUÉS de la última vez que la familia editó sus datos (`editadoEn`):
  // al editar, las cifras ya reflejan todo lo anterior y no se cuenta dos veces. `hasta` (YYYY-MM-DD) corta en esa fecha.
  function perfilVivo(p, movs, hasta) {
    const desde = num(p.editadoEn);
    let ahorro = num(p.ahorro);
    const idsMetas = new Set(((p && p.metas) || []).map((g) => g.id));
    const abonos = {};
    for (const m of movs || []) {
      if (num(m.ts) <= desde) continue;
      if (hasta && m.fecha > hasta) continue;
      const t = tipoDe(m);
      if (t === "ahorro") { if (!(m.meta && idsMetas.has(m.meta))) ahorro += num(m.monto); } // lo apartado para una meta con nombre no es fondo de emergencia
      else if (t === "abono") { const k = String(m.deuda || ""); abonos[k] = (abonos[k] || 0) + num(m.monto); }
    }
    const deudas = (p.deudas || []).map(normDeuda);
    for (const k of Object.keys(abonos)) {
      const d = deudas.find((x) => x.nombre === k && x.saldo > 0);
      if (d) d.saldo = Math.max(0, d.saldo - abonos[k]); // lo que sobre de una deuda ya liquidada se ignora
    }
    return { ...p, ahorro, deudas };
  }

  // ---------- metas de ahorro con nombre ----------
  // Una meta: { id, nombre, objetivo, fecha ("" = sin fecha), estado: "activa" | "lograda", creada }. Lo que se aparta para ella es un movimiento
  // de tipo «ahorro» con `meta: id`; el avance sale de esos movimientos (no depende de `editadoEn`) y NO suma al fondo de emergencia.
  const MAX_METAS = 24;
  const mapaMetas = (p) => Object.fromEntries(((p && p.metas) || []).map((g) => [g.id, g.nombre]));
  // `al` (YYYY-MM-DD, opcional): el avance como estaba ese día, solo con las metas que ya existían.
  function progresoMetas(p, movs, ahora, al) {
    const aport = {};
    for (const m of movs || []) {
      if (tipoDe(m) !== "ahorro" || !m.meta) continue;
      if (al && m.fecha > al) continue;
      aport[m.meta] = (aport[m.meta] || 0) + num(m.monto);
    }
    const hoyIso = iso(ahora);
    return ((p && p.metas) || [])
      .map((g, orden) => ({ g, orden }))
      .filter(({ g }) => !al || !g.creada || g.creada <= al)
      .map(({ g, orden }) => {
        const aportado = aport[g.id] || 0, faltante = Math.max(0, g.objetivo - aportado);
        let semanasRestantes = null, ritmoSemanal = null, vencida = false;
        if (g.fecha) {
          const dias = Math.round((aFecha(g.fecha) - aFecha(hoyIso)) / 86400000);
          if (dias < 0) vencida = true;
          else { semanasRestantes = Math.max(1, Math.ceil(dias / 7)); ritmoSemanal = faltante > 0 ? Math.ceil(faltante / semanasRestantes) : 0; }
        }
        return { id: g.id, nombre: g.nombre, objetivo: redondea(g.objetivo), fecha: g.fecha || "", estado: g.estado === "lograda" ? "lograda" : "activa", aportado: redondea(aportado), faltante: redondea(faltante), pct: g.objetivo > 0 ? Math.min(100, Math.round((aportado / g.objetivo) * 100)) : 0, completada: aportado >= g.objetivo, vencida, semanasRestantes, ritmoSemanal, orden };
      })
      .sort((x, y) => (x.estado === y.estado ? (x.fecha && y.fecha ? (x.fecha < y.fecha ? -1 : x.fecha > y.fecha ? 1 : 0) : x.fecha ? -1 : y.fecha ? 1 : 0) || x.orden - y.orden : x.estado === "activa" ? -1 : 1));
  }

  // ---------- semana ----------
  // `hoy` es cualquier fecha dentro de la semana que se quiere ver; `ahora` es el día real (para saber cuántos días faltan).
  function semana(p, movs, hoy, R = REGLAS, ahora = hoy) {
    const res = resumen(p, R);
    const lun = lunesDe(hoy);
    const a = iso(lun), b = iso(sumaDias(lun, 6));
    const lista = (movs || []).filter((g) => g.fecha >= a && g.fecha <= b);
    const de = (t) => lista.filter((g) => tipoDe(g) === t).reduce((x, g) => x + num(g.monto), 0);
    const gastado = de("gasto"), ingresosExtra = de("ingreso"), ahorrado = de("ahorro"), abonado = de("abono");
    const limite = res.limiteSemana + ingresosExtra; // lo que entra extra se suma al dinero de ESA semana
    const restante = limite - gastado;
    const hoyIso = iso(ahora);
    const diasRestantes = hoyIso > b ? 0 : hoyIso < a ? 7 : 7 - ((ahora.getDay() + 6) % 7);
    const pct = limite > 0 ? gastado / limite : gastado > 0 ? 9.99 : 0;
    return {
      desde: a, hasta: b, gastado, ingresosExtra, ahorrado, abonado, limite, limiteBase: res.limiteSemana, restante, diasRestantes,
      porDia: restante > 0 && diasRestantes > 0 ? restante / diasRestantes : 0,
      pct, color: pct < 0.75 ? "verde" : pct <= 1 ? "amarillo" : "rojo",
      lista,
    };
  }

  // Solo cuentan los gastos (ni ingresos, ni ahorro, ni abonos).
  function porCategoriaRango(movs, desde, hasta) {
    const tot = {};
    let total = 0;
    for (const g of movs || []) {
      if (tipoDe(g) !== "gasto" || g.fecha < desde || g.fecha > hasta) continue;
      const m = num(g.monto);
      tot[g.categoria] = (tot[g.categoria] || 0) + m;
      total += m;
    }
    return Object.entries(tot)
      .map(([categoria, monto]) => ({ categoria, nombre: CATEGORIAS[categoria] || categoria, monto: redondea(monto), pct: total ? Math.round((monto / total) * 100) : 0 }))
      .sort((x, y) => y.monto - x.monto);
  }
  const porCategoria = (movs, hoy, dias = 30) => porCategoriaRango(movs, iso(sumaDias(hoy, -(dias - 1))), iso(hoy));

  // ---------- captura estilo WhatsApp ----------
  // `tipo`: gasto | ingreso | ahorro | abono. Solo el gasto adivina la categoría por palabras («súper», «gasolina»…).
  function parsearMovimiento(texto, hoy, tipo = "gasto", extra = {}) {
    const crudo = String(texto || "").trim();
    if (!crudo || !Object.prototype.hasOwnProperty.call(TIPOS, tipo)) return null;
    const t = norm(crudo);
    const reMonto = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/;
    const conPeso = t.match(/\$\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/);
    const m = conPeso ? conPeso[1] : (t.match(reMonto) || [])[0];
    const monto = m ? num(m) : 0;
    if (!monto || monto > 10000000) return null;
    let desfase = 0;
    if (/\bante ?ayer\b|\bantier\b/.test(t)) desfase = -2;
    else if (/\bayer\b/.test(t)) desfase = -1;
    let categoria = tipo;
    if (tipo === "gasto") {
      categoria = "otros";
      const palabras = t.split(/[^a-zñ]+/).filter(Boolean);
      outer: for (const [cat, lista] of Object.entries(PALABRAS)) {
        for (const w of lista) if (palabras.includes(w) || palabras.includes(w + "s")) { categoria = cat; break outer; }
      }
    }
    const mov = { tipo, monto, categoria, fecha: iso(sumaDias(hoy, desfase)), nota: /^[\s$0-9,.]+$/.test(crudo) ? "" : crudo.slice(0, 80) }; // si solo escribió el monto («1200») no hay nota
    if (tipo === "abono") mov.deuda = String(extra.deuda || "").slice(0, 40);
    return mov;
  }
  function parsearGasto(texto, hoy) {
    const r = parsearMovimiento(texto, hoy, "gasto");
    if (!r) return null;
    const { tipo, ...resto } = r;
    return resto;
  }

  // ---------- semáforo, fase y acciones ----------
  function fase(res, fon, deu) {
    if (res.deficit > 0 || res.faltaBasico > 0 || res.apartarMes <= 0) return 0;
    if (fon.meses < REGLAS.fondoMini) return 1;
    if (deu.hayCara) return 2;
    if (fon.meses < fon.metaMeses) return 3;
    return 4;
  }

  function acciones(p, res, fon, deu, pro, f, metas) {
    const out = [];
    const sem = redondea(res.apartarSemana);
    if (f === 0) {
      if (res.deficit > 0) out.push({ tipo: "ordenar", titulo: "Tu mes cierra en negativo", detalle: "Tus compromisos fijos y pagos de deuda suman " + mxn(res.deficit) + " más de lo que entra. Antes de ahorrar hay que bajar compromisos o subir ingresos." });
      else if (res.faltaBasico > 0) out.push({ tipo: "ordenar", titulo: "No alcanza para lo básico", detalle: "Después de compromisos y deudas te faltan " + mxn(res.faltaBasico) + " al mes para comida, transporte y básicos." });
      else out.push({ tipo: "ordenar", titulo: "Tu margen es casi cero", detalle: "Después de lo básico no queda para apartar. Busca un gasto que recortar o un ingreso extra." });
    } else if (f === 1) {
      out.push({ tipo: "fondo", titulo: "Aparta " + mxn(sem) + " esta semana", detalle: "Para tu primer escalón del fondo de emergencia: un mes de gastos (" + mxn(fon.miniMonto) + "). Te faltan " + mxn(fon.faltanteMini) + "." });
    } else if (f === 2) {
      out.push({ tipo: "deuda", titulo: "Abona " + mxn(sem) + " extra a «" + deu.masCara.nombre + "»", detalle: "Es tu deuda más cara (" + deu.masCara.tasa + "% anual). Cada peso que le quitas rinde más que cualquier ahorro." });
    } else if (f === 3) {
      out.push({ tipo: "fondo", titulo: "Aparta " + mxn(sem) + " a tu fondo", detalle: "Llevas " + fon.meses.toFixed(1) + " de " + fon.metaMeses + " meses. Te faltan " + mxn(fon.faltante) + "." });
    } else if (deu.masCara) {
      out.push({ tipo: "deuda", titulo: "Abona " + mxn(sem) + " extra a «" + deu.masCara.nombre + "»", detalle: "Tu fondo ya está completo: acelera la deuda que sigue." });
    } else {
      const g = (metas || []).find((x) => x.estado === "activa" && !x.completada);
      if (g) out.push({ tipo: "meta", titulo: "Aparta " + mxn(sem) + " a «" + g.nombre + "»", detalle: "Fondo completo y sin deudas: tu siguiente meta es «" + g.nombre + "». Llevas " + mxn(g.aportado) + " de " + mxn(g.objetivo) + (g.ritmoSemanal ? " y para llegar a tiempo conviene apartar " + mxn(g.ritmoSemanal) + " por semana" : "") + "." });
      else out.push({ tipo: "meta", titulo: "Aparta " + mxn(sem) + " a tu meta", detalle: "Fondo completo y sin deudas: es momento de invertir en lo que sigue." });
    }
    if (pro.huecos[0]) out.push({ tipo: "proteccion", titulo: "Cubre el hueco: " + pro.huecos[0].titulo, detalle: pro.huecos[0].razon });
    out.push({ tipo: "registro", titulo: "Anota tus movimientos de la semana", detalle: "Gastos, ingresos extra, lo que apartas y tus abonos a deudas. Escríbelos como en WhatsApp y yo los acomodo. Sin registro no hay semáforo." });
    return out.slice(0, 3);
  }

  // ---------- hechos (único insumo permitido para la IA) ----------
  function armarHechos(p0, gastos, hoy, R = REGLAS, ahora = hoy) {
    const p = perfilVivo(p0, gastos, iso(hoy)); // el plan con todo lo que se anotó hasta esa fecha
    const res = resumen(p, R);
    const fon = fondo(p, res, R);
    const deu = deudaInfo(p, res, R);
    const pro = proteccion(p);
    const sem = semana(p, gastos, hoy, R, ahora);
    const cats = porCategoria(gastos, hoy);
    const f = fase(res, fon, deu);
    const metas = progresoMetas(p0, gastos, ahora, iso(hoy));
    const flujoColor = res.holgura < 0 ? "rojo" : res.ingreso > 0 && res.holgura / res.ingreso < R.flujoVerde ? "amarillo" : "verde";
    const pilares = { flujo: flujoColor, fondo: fon.color, deuda: deu.color, proteccion: pro.color };
    const puntaje = Math.round(Object.values(pilares).reduce((a, c) => a + PUNTOS[c], 0) / 4);
    const sim = (x) => x && { meses: x.meses, intereses: x.termina ? x.intereses : null, termina: x.termina };
    const pct = (x) => (res.ingreso > 0 ? Math.round((x / res.ingreso) * 100) : 0);
    const h = {
      familia: p.familia || "tu familia", personas: num(p.personas), dependientes: !!p.dependientes,
      ingreso: redondea(res.ingreso), fijos: redondea(res.fijos), pagosDeuda: redondea(res.pagosDeuda), basico: redondea(res.basico),
      libre: redondea(res.libre), deficit: redondea(res.deficit), faltaBasico: redondea(res.faltaBasico),
      apartarMes: redondea(res.apartarMes), apartarSemana: redondea(res.apartarSemana), limiteMes: redondea(res.limiteMes), limiteSemana: redondea(res.limiteSemana),
      pctFijos: pct(res.fijos), pctDeuda: pct(res.pagosDeuda), pctBasico: pct(res.basico), pctApartar: pct(res.apartarMes),
      pctMargen: pct(Math.max(0, res.limiteMes - res.basico)),
      fase: f, pilares, puntaje,
      fondo: { ahorro: redondea(fon.ahorro), meses: Math.round(fon.meses * 10) / 10, metaMeses: fon.metaMeses, metaMonto: redondea(fon.metaMonto), miniMonto: redondea(fon.miniMonto), faltante: redondea(fon.faltante), faltanteMini: redondea(fon.faltanteMini), mesesParaMeta: fon.mesesParaMeta, color: fon.color },
      deudas: {
        cuantas: res.deudas.length, total: redondea(deu.total), ratioPct: deu.ratioPct, color: deu.color, creceSola: deu.creceSola, extra: redondea(deu.extra),
        masCara: deu.masCara ? { nombre: deu.masCara.nombre, tasa: deu.masCara.tasa, saldo: redondea(deu.masCara.saldo) } : null,
        soloMinimos: sim(deu.soloMinimos), avalancha: sim(deu.avalancha), bola: sim(deu.bola),
        ahorroIntereses: deu.ahorroIntereses,
        extraVsBola: deu.avalancha && deu.bola && deu.avalancha.termina && deu.bola.termina ? Math.max(0, deu.bola.intereses - deu.avalancha.intereses) : null,
      },
      semana: { limite: redondea(sem.limite), gastado: redondea(sem.gastado), restante: redondea(sem.restante), porDia: redondea(sem.porDia), diasRestantes: sem.diasRestantes, color: sem.color, pct: Math.round(sem.pct * 100), ingresosExtra: redondea(sem.ingresosExtra), ahorrado: redondea(sem.ahorrado), abonado: redondea(sem.abonado) },
      categorias: cats,
      proteccion: { color: pro.color, huecos: pro.huecos },
      metas: metas.map(({ orden, ...x }) => x),
    };
    h.acciones = acciones(p, res, fon, deu, pro, f, metas);
    return h;
  }

  // ---------- textos de los 4 pilares (los comparten la pantalla «Mi plan» y el PDF) ----------
  function pilaresTexto(h) {
    return [
      { k: "flujo", nombre: "Flujo mensual", color: h.pilares.flujo, texto: h.deficit > 0 ? "Gastas " + mxn(h.deficit) + " más de lo que entra." : h.faltaBasico > 0 ? "Te faltan " + mxn(h.faltaBasico) + " para lo básico." : h.pilares.flujo === "amarillo" ? "Queda muy poco margen después de lo básico." : "Después de lo básico queda margen para apartar." },
      { k: "fondo", nombre: "Fondo de emergencia", color: h.pilares.fondo, texto: "Cubre " + h.fondo.meses.toFixed(1) + " de " + h.fondo.metaMeses + " meses de gastos." },
      { k: "deuda", nombre: "Deudas", color: h.pilares.deuda, texto: h.deudas.cuantas ? "Pagas " + h.deudas.ratioPct + "% de tu ingreso en deudas." + (h.deudas.masCara && h.deudas.masCara.tasa >= REGLAS.tasaAltaAnual ? " Una cobra " + h.deudas.masCara.tasa + "% anual." : "") : "Sin deudas registradas." },
      { k: "proteccion", nombre: "Protección", color: h.pilares.proteccion, texto: h.proteccion.huecos.length ? "Falta: " + h.proteccion.huecos.map((x) => x.titulo.toLowerCase()).join(", ") + "." : "Cubierta." },
    ];
  }

  // ---------- cierre semanal y racha ----------
  // Una semana (lunes a domingo) está CUMPLIDA si se anotó algo y no se pasó del tope; EXCEDIDA si se pasó; SIN REGISTRO si no se anotó nada.
  // La racha cuenta las semanas CERRADAS cumplidas seguidas (la semana en curso todavía no cuenta).
  const MAX_SEMANAS_HIST = 104;
  const etiquetaCorta = (lun, dom) => (lun.getMonth() === dom.getMonth() ? lun.getDate() + "–" + dom.getDate() + " " + MESES_CORTOS[dom.getMonth()] : lun.getDate() + " " + MESES_CORTOS[lun.getMonth()] + "–" + dom.getDate() + " " + MESES_CORTOS[dom.getMonth()]);
  const estadoSemana = (s) => (s.lista.length === 0 ? "sin_registro" : s.gastado > s.limite + 0.5 ? "excedida" : "cumplida");

  function historialSemanas(p, movs, ahora, R = REGLAS) {
    const fechas = (movs || []).map((m) => m.fecha).filter((f) => typeof f === "string").sort();
    if (!fechas.length) return [];
    const primera = iso(lunesDe(aFecha(fechas[0])));
    const semanas = [];
    for (let w = sumaDias(lunesDe(ahora), -7); iso(w) >= primera && semanas.length < MAX_SEMANAS_HIST; w = sumaDias(w, -7)) semanas.unshift(w); // de la más vieja a la última cerrada
    return semanas.map((lun) => {
      const dom = sumaDias(lun, 6);
      const s = semana(perfilVivo(p, movs, iso(dom)), movs, dom, R, ahora);
      return { desde: s.desde, hasta: s.hasta, etiqueta: etiquetaCorta(lun, dom), movimientos: s.lista.length, gastado: redondea(s.gastado), limite: redondea(s.limite), restante: redondea(s.restante), ahorrado: redondea(s.ahorrado), abonado: redondea(s.abonado), ingresosExtra: redondea(s.ingresosExtra), estado: estadoSemana(s) };
    });
  }

  function racha(hist) {
    let corrida = 0, mejor = 0, cumplidas = 0;
    for (const w of hist) {
      if (w.estado === "cumplida") { corrida++; cumplidas++; if (corrida > mejor) mejor = corrida; } else corrida = 0;
    }
    return { actual: corrida, mejor, cumplidas, semanas: hist.length };
  }

  // Resumen de la última semana cerrada (la que acaba de terminar), o null si todavía no hay ninguna con historia.
  function armarCierre(p, movs, ahora, R = REGLAS) {
    const hist = historialSemanas(p, movs, ahora, R);
    if (!hist.length) return null;
    const w = hist[hist.length - 1], r = racha(hist);
    const h = armarHechos(p, movs, ahora, R, ahora);
    const titulo = w.estado === "cumplida" ? "¡Semana cumplida!" : w.estado === "excedida" ? "Te pasaste del tope" : "No anotaste movimientos";
    const texto = w.estado === "cumplida" ? "Gastaste " + mxn(w.gastado) + " de tu tope de " + mxn(w.limite) + " y te sobraron " + mxn(w.restante) + "."
      : w.estado === "excedida" ? "Gastaste " + mxn(w.gastado) + " y tu tope era " + mxn(w.limite) + ": te pasaste por " + mxn(w.gastado - w.limite) + ". Esta semana empieza de cero."
      : "En esa semana no hay registros, y sin registro no hay semáforo. Anota esta semana para retomar tu racha.";
    const rachaTexto = r.actual >= 2 ? "Llevas " + r.actual + " semanas cumplidas seguidas."
      : r.actual === 1 ? "Llevas 1 semana cumplida."
      : r.mejor > 0 ? "Tu mejor racha ha sido de " + r.mejor + (r.mejor === 1 ? " semana." : " semanas.") + " Esta semana puedes empezar otra."
      : "Tu racha empieza con tu primera semana cumplida.";
    return { estado: w.estado, titulo, texto, rachaTexto, racha: r, semana: w, topeEstaSemana: redondea(h.semana.limite) };
  }

  // ---------- reportes (insumo del PDF) ----------
  function etiquetaRango(lun, dom) {
    const m = (d) => MESES_LARGOS[d.getMonth()];
    if (lun.getFullYear() !== dom.getFullYear()) return lun.getDate() + " de " + m(lun) + " de " + lun.getFullYear() + " al " + dom.getDate() + " de " + m(dom) + " de " + dom.getFullYear();
    if (lun.getMonth() !== dom.getMonth()) return lun.getDate() + " de " + m(lun) + " al " + dom.getDate() + " de " + m(dom) + " de " + dom.getFullYear();
    return lun.getDate() + " al " + dom.getDate() + " de " + m(dom) + " de " + dom.getFullYear();
  }
  const MAX_FILAS_REPORTE = 400;
  const TEXTOS_SEMANA = { encabezado: "REPORTE SEMANAL", tope: "Tope de la semana", categorias: "En qué se fue el gasto", sinGastos: "Sin gastos registrados esta semana.", topeTitulo: "Cómo vas contra tu tope", movimientos: "Movimientos de la semana", vacio: "Todavía no hay movimientos en esta semana.", total: "Gastos de la semana (cuentan contra tu tope)", accion: "Tu acción para la próxima semana" };
  const TEXTOS_MES = { encabezado: "REPORTE MENSUAL", tope: "Tope del mes", categorias: "En qué se fue el gasto", sinGastos: "Sin gastos registrados este mes.", topeTitulo: "Cómo vas contra tu tope del mes", movimientos: "Movimientos del mes", vacio: "Todavía no hay movimientos en este mes.", total: "Gastos del mes (cuentan contra tu tope)", accion: "Tu acción para el próximo mes", semanas: "Semana por semana" };

  const mensajeTope = (limite, restante, color, enCurso, unidad) => (limite <= 0 ? (unidad === "mes" ? "Ese mes no hubo margen para gastar." : "Esa semana no hubo margen para gastar.") : color === "rojo" ? "Te pasaste por " + mxn(-restante) + " del tope." : color === "amarillo" ? (enCurso ? "Vas bien, pero cerca del límite: cuida los gustos." : "Cerraste muy cerca del límite.") : enCurso ? "Vas bien." : "Cerraste dentro de tu tope.");

  function filasMov(lista, metasPorId = {}) { // los movimientos ya listos para tabla, en orden de fecha
    const ordenados = [...lista].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : num(a.ts) - num(b.ts)));
    const detalle = (m) => {
      const t = tipoDe(m);
      const base = String(m.nota || "").trim() || TIPOS[t];
      if (t === "gasto") return base + (m.categoria && CATEGORIAS[m.categoria] ? " (" + CATEGORIAS[m.categoria].toLowerCase() + ")" : "");
      if (t === "abono") return (m.deuda ? m.deuda + ": " : "") + base;
      if (t === "ahorro" && m.meta && metasPorId[m.meta]) return base + " (meta: " + metasPorId[m.meta] + ")";
      return base;
    };
    return {
      movimientos: ordenados.slice(0, MAX_FILAS_REPORTE).map((m) => {
        const t = tipoDe(m), d = aFecha(m.fecha), monto = num(m.monto);
        return { fecha: m.fecha, dia: DIAS_CORTOS[d.getDay()] + " " + d.getDate(), tipo: t, tipoNombre: TIPOS[t].split(" ")[0], detalle: detalle(m), monto, texto: (t === "gasto" ? "-" : t === "ingreso" ? "+" : "") + mxn(monto) };
      }),
      omitidos: Math.max(0, ordenados.length - MAX_FILAS_REPORTE),
    };
  }
  const barrasCategorias = (cats) => { const mx = Math.max(1, ...cats.map((c) => c.monto)); return cats.map((c) => ({ nombre: c.nombre, monto: c.monto, rel: c.monto / mx })); };

  function armarReporte(p, movs, ref, ahora = ref, R = REGLAS) {
    const lun = lunesDe(ref), dom = sumaDias(lun, 6), fin = iso(dom);
    const h = armarHechos(p, movs, dom, R, ahora); // el plan tal como estaba al cerrar esa semana
    const s = semana(perfilVivo(p, movs, fin), movs, dom, R, ahora);
    const enCurso = iso(ahora) <= s.hasta;
    const rr = racha(historialSemanas(p, movs, ahora, R).filter((w) => w.hasta <= fin)); // racha al cierre de esa semana
    const f = filasMov(s.lista, mapaMetas(p));
    return {
      tipo: "semanal", textos: TEXTOS_SEMANA, metas: progresoMetas(p, movs, ahora, fin),
      familia: String(p.familia || "Mi familia"),
      periodo: { desde: s.desde, hasta: s.hasta, clave: s.desde, etiqueta: etiquetaRango(lun, dom), subtitulo: "de lunes " + lun.getDate() + " a domingo " + dom.getDate(), enCurso },
      racha: rr.actual,
      puntaje: h.puntaje,
      pilares: pilaresTexto(h),
      kpis: { tope: redondea(s.limite), gastado: redondea(s.gastado), restante: redondea(s.restante), ingresosExtra: redondea(s.ingresosExtra), ahorrado: redondea(s.ahorrado), abonado: redondea(s.abonado) },
      uso: Math.round(s.pct * 100), color: s.color, mensajeTope: mensajeTope(s.limite, s.restante, s.color, enCurso, "semana"),
      categorias: barrasCategorias(porCategoriaRango(movs, s.desde, s.hasta)),
      movimientos: f.movimientos, omitidos: f.omitidos,
      totalGastos: redondea(s.gastado),
      accion: h.acciones[0] || null,
    };
  }

  // Reporte de un mes natural (1 al último día). El tope del mes es el presupuesto mensual del plan más los ingresos extra de ese mes.
  function armarReporteMensual(p, movs, ref, ahora = ref, R = REGLAS) {
    const y = ref.getFullYear(), mo = ref.getMonth();
    const primero = new Date(y, mo, 1), ultimo = new Date(y, mo + 1, 0), a = iso(primero), b = iso(ultimo);
    const enCurso = iso(ahora) <= b;
    const corte = iso(ahora) < b ? ahora : ultimo; // el plan se toma al cierre del mes (o hoy, si el mes sigue)
    const h = armarHechos(p, movs, corte, R, ahora);
    const res = resumen(perfilVivo(p, movs, iso(corte)), R);
    const delMes = (movs || []).filter((m) => m.fecha >= a && m.fecha <= b);
    const de = (t) => delMes.filter((m) => tipoDe(m) === t).reduce((x, m) => x + num(m.monto), 0);
    const gastado = de("gasto"), ingresosExtra = de("ingreso"), ahorrado = de("ahorro"), abonado = de("abono");
    const tope = res.limiteMes + ingresosExtra, restante = tope - gastado;
    const pct = tope > 0 ? gastado / tope : gastado > 0 ? 9.99 : 0;
    const color = pct < 0.75 ? "verde" : pct <= 1 ? "amarillo" : "rojo";
    const semanas = [];
    for (let w = lunesDe(primero); iso(w) <= b; w = sumaDias(w, 7)) {
      const dom = sumaDias(w, 6), cerrada = iso(dom) < iso(ahora);
      const s = semana(perfilVivo(p, movs, cerrada ? iso(dom) : iso(ahora)), movs, dom, R, ahora);
      semanas.push({ etiqueta: etiquetaCorta(w, dom), gastado: redondea(s.gastado), tope: redondea(s.limite), estado: cerrada ? estadoSemana(s) : "en_curso" });
    }
    const f = filasMov(delMes, mapaMetas(p));
    return {
      tipo: "mensual", textos: TEXTOS_MES, metas: progresoMetas(p, movs, ahora, iso(corte)),
      familia: String(p.familia || "Mi familia"),
      periodo: { desde: a, hasta: b, clave: a.slice(0, 7), etiqueta: MESES_LARGOS[mo] + " de " + y, subtitulo: "del 1 al " + ultimo.getDate() + " de " + MESES_LARGOS[mo], enCurso },
      puntaje: h.puntaje,
      pilares: pilaresTexto(h),
      kpis: { tope: redondea(tope), gastado: redondea(gastado), restante: redondea(restante), ingresosExtra: redondea(ingresosExtra), ahorrado: redondea(ahorrado), abonado: redondea(abonado) },
      uso: Math.round(pct * 100), color, mensajeTope: mensajeTope(tope, restante, color, enCurso, "mes"),
      categorias: barrasCategorias(porCategoriaRango(movs, a, b)),
      semanas, semanasCumplidas: semanas.filter((x) => x.estado === "cumplida").length, semanasCerradas: semanas.filter((x) => x.estado !== "en_curso").length,
      movimientos: f.movimientos, omitidos: f.omitidos,
      totalGastos: redondea(gastado),
      accion: h.acciones[0] || null,
    };
  }

  // Reporte de un año natural: mes por mes, en qué se fue el gasto, los gastos más grandes y cómo van las metas.
  const TEXTOS_ANIO = { encabezado: "REPORTE ANUAL", categorias: "En qué se fue el gasto del año", sinGastos: "Sin gastos registrados este año.", topeTitulo: "El año en breve", movimientos: "Los gastos más grandes del año", vacio: "Todavía no hay gastos registrados este año.", total: "Total de gastos del año (suma de todos, no solo estos)", accion: "Tu acción para el próximo año", meses: "Mes por mes" };

  function armarReporteAnual(p, movs, ref, ahora = ref, R = REGLAS) {
    const y = ref.getFullYear(), a = y + "-01-01", b = y + "-12-31", hoyIso = iso(ahora);
    const enCurso = hoyIso <= b;
    const corte = hoyIso < b ? ahora : new Date(y, 11, 31);
    const h = armarHechos(p, movs, corte, R, ahora);
    const delAnio = (movs || []).filter((m) => m.fecha >= a && m.fecha <= b);
    const suma$ = (lista, t) => lista.filter((m) => tipoDe(m) === t).reduce((x, m) => x + num(m.monto), 0);
    const gastado = suma$(delAnio, "gasto"), ingresosExtra = suma$(delAnio, "ingreso"), ahorrado = suma$(delAnio, "ahorro"), abonado = suma$(delAnio, "abono");
    const idsMetas = new Set(((p && p.metas) || []).map((g) => g.id));
    const aMetas = delAnio.filter((m) => tipoDe(m) === "ahorro" && m.meta && idsMetas.has(m.meta)).reduce((x, m) => x + num(m.monto), 0);
    const primera = (movs || []).map((m) => m.fecha).filter((f) => typeof f === "string").sort()[0] || "9999-12-31";
    const meses = [];
    for (let mo = 0; mo < 12; mo++) {
      const ini = iso(new Date(y, mo, 1)), fin = iso(new Date(y, mo + 1, 0)), del = delAnio.filter((m) => m.fecha >= ini && m.fecha <= fin);
      const sinDatos = ini > hoyIso || fin < primera; // meses que todavía no llegan o anteriores a su primer movimiento: sin cifras de fondo
      meses.push({ nombre: MESES_LARGOS[mo], gastado: redondea(suma$(del, "gasto")), ingresosExtra: redondea(suma$(del, "ingreso")), ahorrado: redondea(suma$(del, "ahorro")), abonado: redondea(suma$(del, "abono")), fondo: sinDatos ? null : Math.round(armarHechos(p, movs, aFecha(fin < hoyIso ? fin : hoyIso), R, ahora).fondo.meses * 10) / 10 });
    }
    const conGasto = meses.filter((x) => x.gastado > 0);
    const promedio = conGasto.length ? gastado / conGasto.length : 0;
    const mayor = conGasto.length ? conGasto.reduce((x, m) => (m.gastado > x.gastado ? m : x)) : null;
    const menor = conGasto.length > 1 ? conGasto.reduce((x, m) => (m.gastado < x.gastado ? m : x)) : null;
    const rr = racha(historialSemanas(p, movs, ahora, R).filter((w) => w.desde >= a && w.hasta <= b));
    const resumenTexto = [];
    if (conGasto.length) resumenTexto.push("Gastaste en promedio " + mxn(promedio) + " al mes (en los " + conGasto.length + (conGasto.length === 1 ? " mes" : " meses") + " con gastos).");
    if (mayor && menor && mayor.nombre !== menor.nombre) resumenTexto.push("El mes que más gastaste fue " + mayor.nombre + " (" + mxn(mayor.gastado) + ") y el que menos, " + menor.nombre + " (" + mxn(menor.gastado) + ").");
    if (ahorrado > 0) resumenTexto.push("Apartaste " + mxn(ahorrado) + (aMetas > 0 ? ": " + mxn(ahorrado - aMetas) + " a tu fondo y " + mxn(aMetas) + " a tus metas." : " para tu fondo."));
    if (rr.semanas) resumenTexto.push("Semanas cumplidas: " + rr.cumplidas + " de " + rr.semanas + (rr.mejor > 1 ? " (tu mejor racha: " + rr.mejor + " seguidas)." : "."));
    resumenTexto.push("Tu fondo de emergencia " + (enCurso ? "va en " : "terminó el año en ") + h.fondo.meses.toFixed(1) + " de " + h.fondo.metaMeses + " meses de gastos.");
    const grandes = delAnio.filter((m) => tipoDe(m) === "gasto").sort((x, z) => num(z.monto) - num(x.monto)).slice(0, 8).map((m) => {
      const d = aFecha(m.fecha), monto = num(m.monto);
      return { fecha: m.fecha, dia: d.getDate() + " " + MESES_CORTOS[d.getMonth()], tipo: "gasto", tipoNombre: "Gasto", detalle: (String(m.nota || "").trim() || "Gasto") + (m.categoria && CATEGORIAS[m.categoria] ? " (" + CATEGORIAS[m.categoria].toLowerCase() + ")" : ""), monto, texto: "-" + mxn(monto) };
    });
    return {
      tipo: "anual", textos: TEXTOS_ANIO,
      familia: String(p.familia || "Mi familia"),
      periodo: { desde: a, hasta: b, clave: String(y), etiqueta: String(y), subtitulo: enCurso ? "de enero a hoy" : "del 1 de enero al 31 de diciembre", enCurso },
      puntaje: h.puntaje,
      pilares: pilaresTexto(h),
      tarjetas: [
        { etiqueta: "Gastaste en el año", valor: mxn(gastado) }, { etiqueta: "Ingresos extra", valor: mxn(ingresosExtra) },
        { etiqueta: "Apartaste (fondo y metas)", valor: mxn(ahorrado), resalta: true },
        { etiqueta: "Abonaste a deudas", valor: mxn(abonado) }, { etiqueta: "Promedio de gasto al mes", valor: mxn(promedio) }, { etiqueta: "Semanas cumplidas", valor: rr.semanas ? rr.cumplidas + " de " + rr.semanas : "—" },
      ],
      resumenTexto,
      categorias: barrasCategorias(porCategoriaRango(movs, a, b)),
      tablaMeses: meses, semanasCumplidas: rr.cumplidas, semanasCerradas: rr.semanas,
      metas: progresoMetas(p, movs, ahora, iso(corte)),
      movimientos: grandes, omitidos: 0,
      totalGastos: redondea(gastado),
      accion: h.acciones[0] || null,
    };
  }

  // ---------- recordatorio semanal para el calendario (.ics) ----------
  // Un evento que se repite cada semana a la hora elegida (hora local, sin zona: se acomoda al teléfono). Se arma aquí y se guarda en su calendario.
  const icsTexto = (t) => String(t).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  function plegarICS(linea) { // RFC 5545: máximo 75 octetos por línea; las que siguen empiezan con un espacio
    const te = new TextEncoder();
    let out = "", bytes = 0;
    for (const ch of linea) {
      const b = te.encode(ch).length;
      if (bytes + b > 75) { out += "\r\n "; bytes = 1; }
      out += ch; bytes += b;
    }
    return out;
  }
  function recordatorioICS(o = {}) {
    const ahora = o.ahora || new Date();
    const dia = Math.min(6, Math.max(0, Math.round(Number(o.dia)) || 0));
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(o.hora || ""));
    const hh = m ? Math.min(23, Number(m[1])) : 19, mm = m ? Math.min(59, Number(m[2])) : 0;
    let d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), hh, mm);
    while (d.getDay() !== dia || d <= ahora) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, hh, mm);
    const local = (x) => x.getFullYear() + z2(x.getMonth() + 1) + z2(x.getDate()) + "T" + z2(x.getHours()) + z2(x.getMinutes()) + "00";
    const por = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][dia];
    const url = "https://www.especialistaenasegurarte.lat/semana";
    const lineas = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Dinero Bajo Control//Recordatorio semanal//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:recordatorio-" + por + "-" + z2(hh) + z2(mm) + "@especialistaenasegurarte.lat", // mismo día y hora = mismo evento: no se duplica si lo agregan otra vez
      "DTSTAMP:" + ahora.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""),
      "DTSTART:" + local(d), "DURATION:PT15M", "RRULE:FREQ=WEEKLY;BYDAY=" + por,
      "SUMMARY:" + icsTexto("Anota mi semana · Dinero Bajo Control"),
      "DESCRIPTION:" + icsTexto("Abre la guía y anota tus gastos, ingresos extra, lo que apartaste y tus abonos a deudas. Así tu plan y tu racha se mantienen al día.\n" + url),
      "URL:" + url,
      "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", "DESCRIPTION:" + icsTexto("Anota tu semana en Dinero Bajo Control"), "END:VALARM",
      "END:VEVENT", "END:VCALENDAR",
    ];
    return lineas.map(plegarICS).join("\r\n") + "\r\n";
  }

  // ---------- exportar: movimientos en CSV (Excel) y respaldo completo ----------
  function movimientosCSV(movs, metas) {
    const nombres = Object.fromEntries((metas || []).map((g) => [g.id, g.nombre]));
    // Las celdas que empiezan con = + - @ se neutralizan: Excel las leería como fórmula.
    const q = (v) => { let t = String(v == null ? "" : v).replace(/[\r\n]+/g, " "); if (/^[=+\-@\t]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; };
    const filas = [...(movs || [])].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : num(a.ts) - num(b.ts)));
    const out = [["Fecha", "Tipo", "Categoría", "Detalle", "Deuda", "Meta", "Monto"].map(q).join(",")];
    for (const m of filas) {
      const t = tipoDe(m);
      out.push([q(m.fecha), q(TIPOS[t]), q(t === "gasto" ? CATEGORIAS[m.categoria] || "Otros" : ""), q(m.nota || ""), q(t === "abono" ? m.deuda || "" : ""), q(t === "ahorro" && m.meta ? nombres[m.meta] || "" : ""), num(m.monto).toFixed(2)].join(","));
    }
    return out.join("\r\n");
  }

  const cadena = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n);
  const fechaValida = (f) => typeof f === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f) && iso(aFecha(f)) === f;
  const SI_NO_NA = ["si", "no", "na"];

  function limpiarMovimiento(m) {
    if (!m || typeof m !== "object" || !fechaValida(m.fecha)) return null;
    const monto = num(m.monto);
    if (!monto || monto > 10000000) return null;
    const tipo = tipoDe(m);
    const mov = { id: cadena(m.id, 24).replace(/[^a-zA-Z0-9]/g, ""), tipo, monto, categoria: tipo === "gasto" ? (Object.prototype.hasOwnProperty.call(CATEGORIAS, m.categoria) ? m.categoria : "otros") : tipo, fecha: m.fecha, nota: cadena(m.nota, 80), ts: Math.max(0, Math.round(num(m.ts))) };
    if (tipo === "abono") mov.deuda = cadena(m.deuda, 40);
    if (tipo === "ahorro" && m.meta) { const id = cadena(m.meta, 24).replace(/[^a-zA-Z0-9]/g, ""); if (id) mov.meta = id; }
    return mov;
  }

  function limpiarPerfil(p) {
    if (!p || typeof p !== "object") return null;
    const ingreso = num(p.ingreso);
    if (!ingreso || ingreso > 1e8) return null;
    const tope = (v) => Math.min(num(v), 1e8);
    const f = p.fijos || {}, sg = p.seguros || {};
    const nombres = new Set();
    const deudas = (Array.isArray(p.deudas) ? p.deudas : []).slice(0, 30).map((d) => {
      let nombre = cadena(d && d.nombre, 40) || "Deuda", k = 2;
      while (nombres.has(nombre)) nombre = cadena(nombre, 34) + " (" + k++ + ")";
      nombres.add(nombre);
      return { nombre, saldo: tope(d && d.saldo), tasa: Math.min(num(d && d.tasa), 300), pago: tope(d && d.pago) };
    }).filter((d) => d.saldo > 0);
    const idsMeta = new Set();
    const metas = (Array.isArray(p.metas) ? p.metas : []).slice(0, MAX_METAS).map((g, i) => {
      if (!g || typeof g !== "object") return null;
      const nombre = cadena(g.nombre, 30), objetivo = Math.min(num(g.objetivo), 1e8);
      if (nombre.length < 2 || !objetivo) return null;
      let id = cadena(g.id, 24).replace(/[^a-zA-Z0-9]/g, "");
      if (!id || idsMeta.has(id)) id = "m" + i.toString(36) + Math.random().toString(36).slice(2, 6);
      idsMeta.add(id);
      return { id, nombre, objetivo, fecha: fechaValida(g.fecha) ? g.fecha : "", estado: g.estado === "lograda" ? "lograda" : "activa", creada: fechaValida(g.creada) ? g.creada : "" };
    }).filter(Boolean);
    return {
      familia: cadena(p.familia, 30) || "Mi familia", personas: Math.min(12, Math.max(1, Math.round(num(p.personas)) || 3)), dependientes: p.dependientes !== false,
      ingreso, fijos: { vivienda: tope(f.vivienda), servicios: tope(f.servicios), educacion: tope(f.educacion), otros: tope(f.otros) },
      basico: tope(p.basico), ahorro: tope(p.ahorro), deudas,
      seguros: { vida: SI_NO_NA.includes(sg.vida) ? sg.vida : "na", gmm: SI_NO_NA.includes(sg.gmm) ? sg.gmm : "na", auto: SI_NO_NA.includes(sg.auto) ? sg.auto : "na", hogar: SI_NO_NA.includes(sg.hogar) ? sg.hogar : "na" },
      editadoEn: Math.max(0, Math.round(num(p.editadoEn))),
      metas,
    };
  }

  const MAX_MOVIMIENTOS = 5000;
  function exportarRespaldo(estado, exportadoEn) {
    return JSON.stringify({ app: "dinero-bajo-control", v: 1, exportadoEn: exportadoEn || "", perfil: estado.perfil, gastos: estado.gastos }, null, 1);
  }
  // Un respaldo es un archivo que la persona elige: se valida y se limpia TODO antes de usarlo.
  function importarRespaldo(texto) {
    const malo = (error) => ({ ok: false, error });
    if (typeof texto !== "string" || texto.length > 3_000_000) return malo("El archivo es demasiado grande para ser un respaldo.");
    let d;
    try { d = JSON.parse(texto); } catch (e) { return malo("Ese archivo no es un respaldo de Dinero Bajo Control."); }
    if (!d || d.app !== "dinero-bajo-control" || d.v !== 1) return malo("Ese archivo no es un respaldo de Dinero Bajo Control.");
    const perfil = limpiarPerfil(d.perfil);
    if (!perfil) return malo("El respaldo no trae un plan válido.");
    const ids = new Set();
    const gastos = [];
    let descartados = 0;
    for (const m of (Array.isArray(d.gastos) ? d.gastos : []).slice(0, MAX_MOVIMIENTOS)) {
      const x = limpiarMovimiento(m);
      if (!x) { descartados++; continue; }
      if (!x.id || ids.has(x.id)) x.id = "r" + gastos.length.toString(36) + Math.random().toString(36).slice(2, 6);
      ids.add(x.id);
      gastos.push(x);
    }
    const idsOk = new Set(perfil.metas.map((g) => g.id));
    for (const m of gastos) if (m.meta && !idsOk.has(m.meta)) delete m.meta; // ahorro para una meta que ya no existe: vuelve al fondo
    return { ok: true, estado: { perfil, gastos, ejemplo: false }, descartados };
  }

  // ---------- respuestas locales (5 preguntas) ----------
  const PREGUNTAS = {
    enQueSeVa: "¿En qué se va nuestro dinero?",
    cuanto: "¿Cuánto podemos gastar esta semana?",
    queHago: "¿Qué hacemos esta semana?",
    deudas: "¿Cómo reducimos las deudas?",
    preparados: "¿Qué tan preparados estamos?",
  };

  function responder(clave, h) {
    const P = [];
    if (clave === "enQueSeVa") {
      P.push("De cada $100 que entran: $" + h.pctFijos + " van a compromisos fijos, $" + h.pctDeuda + " a pagos de deuda, $" + h.pctBasico + " a lo básico del día a día y $" + h.pctApartar + " se apartan. Lo que queda ($" + h.pctMargen + ") es tu margen.");
      if (h.categorias.length) {
        const top = h.categorias[0];
        P.push("De lo que has registrado, lo que más pesa es " + top.nombre.toLowerCase() + ": " + mxn(top.monto) + " (" + top.pct + "% de tus gastos registrados).");
      } else P.push("Todavía no hay gastos registrados. Escríbeme tus gastos como en WhatsApp y empiezo a mostrarte en qué se va.");
    } else if (clave === "cuanto") {
      const s = h.semana;
      if (h.limiteSemana <= 0) P.push("Esta semana no hay margen: tus compromisos y deudas se llevan todo el ingreso. Lo primero es ordenar el presupuesto.");
      else if (s.color === "rojo") P.push("Esta semana puedes gastar " + mxn(s.limite) + " y ya llevas " + mxn(s.gastado) + ": te pasaste. Congela los gustos hasta el lunes y compensa con la semana que viene.");
      else {
        P.push("Esta semana puedes gastar hasta " + mxn(s.limite) + ". Llevas " + mxn(s.gastado) + " y te quedan " + mxn(s.restante) + ".");
        P.push((s.diasRestantes === 1 ? "Solo queda hoy: te alcanza para " + mxn(s.porDia) : "Quedan " + s.diasRestantes + " días: te alcanza para unos " + mxn(s.porDia) + " por día") + (s.color === "amarillo" ? ", pero vas cerca del límite: cuida los gustos." : "."));
      }
    } else if (clave === "queHago") {
      h.acciones.forEach((a, i) => P.push((i + 1) + ". " + a.titulo + ". " + a.detalle));
    } else if (clave === "deudas") {
      const d = h.deudas;
      if (!d.cuantas) P.push("No registraste deudas. Si aparece una, antes de abonar extra revisa su tasa anual (CAT): esa cifra decide cuál pagar primero.");
      else {
        P.push("Pagas " + mxn(h.pagosDeuda) + " al mes en deudas (" + d.ratioPct + "% de tu ingreso) y debes " + mxn(d.total) + " en total. La más cara es «" + d.masCara.nombre + "» con " + d.masCara.tasa + "% anual.");
        if (d.creceSola) P.push("Ojo: en alguna deuda el pago mínimo no cubre ni los intereses. Se hace más grande aunque pagues. Hay que pagar más o renegociar.");
        if (d.soloMinimos && !d.soloMinimos.termina) P.push("Pagando solo los mínimos, estas deudas no se terminan de pagar.");
        else if (d.soloMinimos && !d.avalancha) P.push("Pagando solo los mínimos terminas en " + d.soloMinimos.meses + " meses y pagas " + mxn(d.soloMinimos.intereses) + " de intereses.");
        if (d.avalancha && d.avalancha.termina) {
          const base = d.soloMinimos && d.soloMinimos.termina ? "Pagando solo los mínimos terminas en " + d.soloMinimos.meses + " meses con " + mxn(d.soloMinimos.intereses) + " de intereses. " : "";
          P.push(base + (h.fase <= 1 ? "Cuando tengas tu primer mes de fondo, si abonas " : "Si abonas ") + mxn(d.extra) + " extra al mes a la más cara (método avalancha), terminas en " + d.avalancha.meses + " meses con " + mxn(d.avalancha.intereses) + " de intereses" + (d.ahorroIntereses ? ": te ahorras " + mxn(d.ahorroIntereses) + "." : "."));
          if (d.extraVsBola) P.push("Si prefieres ir liquidando primero la más chica para sentir avance (bola de nieve), pagas " + mxn(d.extraVsBola) + " más de intereses.");
        } else if (!d.avalancha) P.push("Hoy no hay margen para abonar extra; liberar ese margen es el primer paso.");
      }
    } else if (clave === "preparados") {
      const f = h.fondo;
      P.push("Tu fondo de emergencia cubre " + f.meses.toFixed(1) + " meses de gastos; lo recomendable para ti es " + f.metaMeses + " (" + mxn(f.metaMonto) + ").");
      if (f.faltante > 0) P.push("Te faltan " + mxn(f.faltante) + (f.mesesParaMeta ? ": apartando " + mxn(h.apartarMes) + " al mes llegas en " + f.mesesParaMeta + " meses." : ". Hoy no hay margen para apartar."));
      else P.push("Tu fondo ya está completo.");
      if (h.proteccion.huecos.length) P.push("Además, sin " + h.proteccion.huecos.map((x) => x.titulo.toLowerCase()).join(" ni ") + " un imprevisto grande se pagaría de ese fondo. Es lo más urgente de cubrir.");
      else P.push("Tu protección con seguros se ve cubierta.");
      const ma = h.metas.filter((x) => x.estado === "activa");
      if (ma.length) P.push("Además tienes " + (ma.length === 1 ? "una meta de ahorro" : ma.length + " metas de ahorro") + ": " + ma.slice(0, 3).map((x) => "«" + x.nombre + "» va en " + x.pct + "% (" + mxn(x.aportado) + " de " + mxn(x.objetivo) + ")").join("; ") + ".");
    }
    return P.join("\n\n");
  }

  // ---------- guardarraíl para IA ----------
  const PROMPT_SISTEMA =
    "Eres el asistente financiero de una familia mexicana. Recibes un JSON con cifras YA calculadas. " +
    "Reglas: usa SOLO cifras que estén en el JSON; no calcules ni inventes; no recomiendes productos financieros, rendimientos ni asesoría fiscal o legal; " +
    "tono cálido y claro; máximo 120 palabras; termina con UNA acción concreta para esta semana.";

  function cifras(x, set) {
    if (typeof x === "number") { set.add(x); set.add(Math.round(x)); }
    else if (Array.isArray(x)) x.forEach((v) => cifras(v, set));
    else if (x && typeof x === "object") Object.values(x).forEach((v) => cifras(v, set));
    return set;
  }
  function validarTexto(texto, hechos) {
    const permitidas = cifras(hechos, new Set());
    const extras = [];
    for (const m of String(texto).match(/\d[\d,]*(?:\.\d+)?/g) || []) {
      const v = parseFloat(m.replace(/,/g, ""));
      if (!isFinite(v) || (Number.isInteger(v) && (v <= 12 || v === 30 || v === 100))) continue;
      const ok = [...permitidas].some((c) => Math.abs(c - v) <= 1);
      if (!ok) extras.push(m);
    }
    return { ok: extras.length === 0, extras };
  }

  // ---------- mensaje a Roberto (sin montos) ----------
  function mensajeWhatsApp(h, nombre) {
    const e = { verde: "🟢", amarillo: "🟡", rojo: "🔴" };
    const limpio = nombre ? String(nombre).replace(/<[^>]*>/g, " ").replace(/[^\p{L} '.\-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 40) : "";
    const l = [
      "Hola Roberto, " + (limpio ? "soy " + limpio + ". Usé" : "usé") + " «Dinero Bajo Control» y quiero que me ayudes a revisar mi situación.",
      "",
      "Mi semáforo (" + h.puntaje + "/100):",
      e[h.pilares.flujo] + " Flujo mensual",
      e[h.pilares.fondo] + " Fondo de emergencia (" + h.fondo.meses.toFixed(1) + " de " + h.fondo.metaMeses + " meses)",
      e[h.pilares.deuda] + " Deudas",
      e[h.pilares.proteccion] + " Protección",
    ];
    if (h.proteccion.huecos.length) l.push("", "Me falta: " + h.proteccion.huecos.map((x) => x.titulo).join(", ") + ".");
    return l.join("\n");
  }

  // Lo ÚNICO que viaja al CRM cuando la familia autoriza que Roberto la contacte: semáforo y huecos, jamás montos.
  function planParaCRM(h) {
    return {
      puntaje: h.puntaje,
      pilares: { flujo: h.pilares.flujo, fondo: h.pilares.fondo, deuda: h.pilares.deuda, proteccion: h.pilares.proteccion },
      huecos: h.proteccion.huecos.map((x) => x.ramo),
      mesesFondo: h.fondo.meses,
      metaMeses: h.fondo.metaMeses,
    };
  }

  const EJEMPLO = {
    familia: "Familia Ejemplo", personas: 4, dependientes: true, ingreso: 38000,
    fijos: { vivienda: 9500, servicios: 2200, educacion: 3800, otros: 1500 }, basico: 9000, ahorro: 4000,
    deudas: [
      { nombre: "Tarjeta de crédito", saldo: 28000, tasa: 62, pago: 1900 },
      { nombre: "Crédito del auto", saldo: 95000, tasa: 16, pago: 3100 },
    ],
    seguros: { vida: "no", gmm: "no", auto: "si", hogar: "na" },
    metas: [{ id: "ejemploviaje", nombre: "Viaje en familia", objetivo: 15000, fecha: "", estado: "activa", creada: "" }],
  };

  return { TIPOS, tipoDe, MAX_METAS, progresoMetas, armarReporteAnual, perfilVivo, parsearMovimiento, porCategoriaRango, pilaresTexto, historialSemanas, racha, armarCierre, armarReporte, armarReporteMensual, recordatorioICS, movimientosCSV, exportarRespaldo, importarRespaldo, limpiarPerfil, limpiarMovimiento, REGLAS, CATEGORIAS, PREGUNTAS, PROMPT_SISTEMA, EJEMPLO, resumen, fondo, deudaInfo, simularDeudas, proteccion, semana, porCategoria, parsearGasto, armarHechos, responder, validarTexto, mensajeWhatsApp, planParaCRM, mxn, iso, aFecha, lunesDe };
});
