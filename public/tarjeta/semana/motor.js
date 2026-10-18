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

  // ---------- gastos registrados ----------
  function semana(p, gastos, hoy, R = REGLAS) {
    const res = resumen(p, R);
    const lun = lunesDe(hoy);
    const a = iso(lun), b = iso(sumaDias(lun, 6));
    const lista = (gastos || []).filter((g) => g.fecha >= a && g.fecha <= b);
    const gastado = lista.reduce((s, g) => s + num(g.monto), 0);
    const limite = res.limiteSemana;
    const restante = limite - gastado;
    const diasRestantes = 7 - ((hoy.getDay() + 6) % 7);
    const pct = limite > 0 ? gastado / limite : gastado > 0 ? 9.99 : 0;
    return {
      desde: a, hasta: b, gastado, limite, restante, diasRestantes,
      porDia: restante > 0 ? restante / diasRestantes : 0,
      pct, color: pct < 0.75 ? "verde" : pct <= 1 ? "amarillo" : "rojo",
      lista,
    };
  }

  function porCategoria(gastos, hoy, dias = 30) {
    const desde = iso(sumaDias(hoy, -(dias - 1)));
    const tot = {};
    let total = 0;
    for (const g of gastos || []) {
      if (g.fecha < desde || g.fecha > iso(hoy)) continue;
      const m = num(g.monto);
      tot[g.categoria] = (tot[g.categoria] || 0) + m;
      total += m;
    }
    return Object.entries(tot)
      .map(([categoria, monto]) => ({ categoria, nombre: CATEGORIAS[categoria] || categoria, monto: redondea(monto), pct: total ? Math.round((monto / total) * 100) : 0 }))
      .sort((x, y) => y.monto - x.monto);
  }

  // ---------- captura estilo WhatsApp ----------
  function parsearGasto(texto, hoy) {
    const crudo = String(texto || "").trim();
    if (!crudo) return null;
    const t = norm(crudo);
    const reMonto = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/;
    const conPeso = t.match(/\$\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/);
    const m = conPeso ? conPeso[1] : (t.match(reMonto) || [])[0];
    const monto = m ? num(m) : 0;
    if (!monto || monto > 10000000) return null;
    let desfase = 0;
    if (/\bante ?ayer\b|\bantier\b/.test(t)) desfase = -2;
    else if (/\bayer\b/.test(t)) desfase = -1;
    let categoria = "otros";
    const palabras = t.split(/[^a-zñ]+/).filter(Boolean);
    outer: for (const [cat, lista] of Object.entries(PALABRAS)) {
      for (const w of lista) if (palabras.includes(w) || palabras.includes(w + "s")) { categoria = cat; break outer; }
    }
    return { monto, categoria, fecha: iso(sumaDias(hoy, desfase)), nota: crudo.slice(0, 80) };
  }

  // ---------- semáforo, fase y acciones ----------
  function fase(res, fon, deu) {
    if (res.deficit > 0 || res.faltaBasico > 0 || res.apartarMes <= 0) return 0;
    if (fon.meses < REGLAS.fondoMini) return 1;
    if (deu.hayCara) return 2;
    if (fon.meses < fon.metaMeses) return 3;
    return 4;
  }

  function acciones(p, res, fon, deu, pro, f) {
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
      out.push({ tipo: "meta", titulo: "Aparta " + mxn(sem) + " a tu meta", detalle: "Fondo completo y sin deudas: es momento de invertir en lo que sigue." });
    }
    if (pro.huecos[0]) out.push({ tipo: "proteccion", titulo: "Cubre el hueco: " + pro.huecos[0].titulo, detalle: pro.huecos[0].razon });
    out.push({ tipo: "registro", titulo: "Registra tus gastos de la semana", detalle: "Escríbelos como en WhatsApp, por ejemplo «gasté en el súper», y yo los acomodo. Sin registro no hay semáforo." });
    return out.slice(0, 3);
  }

  // ---------- hechos (único insumo permitido para la IA) ----------
  function armarHechos(p, gastos, hoy, R = REGLAS) {
    const res = resumen(p, R);
    const fon = fondo(p, res, R);
    const deu = deudaInfo(p, res, R);
    const pro = proteccion(p);
    const sem = semana(p, gastos, hoy, R);
    const cats = porCategoria(gastos, hoy);
    const f = fase(res, fon, deu);
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
      semana: { limite: redondea(sem.limite), gastado: redondea(sem.gastado), restante: redondea(sem.restante), porDia: redondea(sem.porDia), diasRestantes: sem.diasRestantes, color: sem.color, pct: Math.round(sem.pct * 100) },
      categorias: cats,
      proteccion: { color: pro.color, huecos: pro.huecos },
    };
    h.acciones = acciones(p, res, fon, deu, pro, f);
    return h;
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
  };

  return { REGLAS, CATEGORIAS, PREGUNTAS, PROMPT_SISTEMA, EJEMPLO, resumen, fondo, deudaInfo, simularDeudas, proteccion, semana, porCategoria, parsearGasto, armarHechos, responder, validarTexto, mensajeWhatsApp, planParaCRM, mxn, iso, aFecha, lunesDe };
});
