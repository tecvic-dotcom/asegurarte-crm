/* GENERADO por scripts/construir-cotizacion-tarjeta.cjs a partir de lib/normalize.ts, lib/validacion.ts, lib/captacion-cotizacion.ts. NO editar a mano: se pierde al regenerar. */
(function () {
"use strict";
/* lib/normalize.ts */
function normCorreo(v) {
    return (v !== null && v !== void 0 ? v : "").trim().toLowerCase();
}
function normWhatsapp(v) {
    const digitos = (v !== null && v !== void 0 ? v : "").replace(/\D+/g, "");
    return digitos.length > 10 ? digitos.slice(-10) : digitos;
}
function normCodigoPostal(v) {
    return (v !== null && v !== void 0 ? v : "").replace(/\D+/g, "").slice(0, 5);
}

/* lib/validacion.ts */
const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function validarCorreo(v) {
    return RE_CORREO.test(normCorreo(v));
}
function validarWhatsappMX(v) {
    return normWhatsapp(v).length === 10;
}
function validarNombre(v) {
    return (v !== null && v !== void 0 ? v : "").trim().length >= 2;
}
function validarCodigoPostal(v) {
    return /^\d{5}$/.test((v !== null && v !== void 0 ? v : "").trim());
}
function validarLead(input) {
    const errores = {};
    if (!validarNombre(input.nombre)) {
        errores.nombre = "Escribe tu nombre (al menos 2 letras).";
    }
    if (!validarCorreo(input.correo)) {
        errores.correo = "Revisa tu correo, parece que falta algo (ejemplo: nombre@correo.com).";
    }
    if (!validarWhatsappMX(input.whatsapp)) {
        errores.whatsapp = "Tu WhatsApp debe tener 10 dígitos (puedes incluir +52).";
    }
    return { ok: Object.keys(errores).length === 0, errores };
}
function validarLeadManual(input) {
    const errores = {};
    if (!validarNombre(input.nombre))
        errores.nombre = "Escribe el nombre (al menos 2 letras).";
    const tieneWa = normWhatsapp(input.whatsapp).length > 0;
    const tieneCorreo = normCorreo(input.correo).length > 0;
    if (tieneWa && !validarWhatsappMX(input.whatsapp))
        errores.whatsapp = "El WhatsApp debe tener 10 dígitos (puedes incluir +52).";
    if (tieneCorreo && !validarCorreo(input.correo))
        errores.correo = "Revisa el correo (ejemplo: nombre@correo.com).";
    if (!tieneWa && !tieneCorreo)
        errores.whatsapp = "Pon al menos un WhatsApp o un correo para poder contactarlo.";
    return { ok: Object.keys(errores).length === 0, errores };
}

/* lib/captacion-cotizacion.ts */
const TIPOS_SEGURO = [
    { id: "vida", texto: "Seguro de vida", icono: "heart", ramo: "vida" },
    { id: "gmm", texto: "Gastos médicos mayores", icono: "medical", ramo: "gmm" },
    { id: "autos", texto: "Seguro de auto", icono: "car", ramo: "autos" },
    { id: "hogar", texto: "Protección patrimonial (casa)", icono: "home", ramo: "hogar" },
    { id: "ahorro", texto: "Ahorro y retiro", icono: "coins", ramo: "ahorro" },
    { id: "ppr", texto: "PPR / Planeación fiscal", icono: "trend", ramo: "ahorro" },
    { id: "no-se", texto: "No estoy seguro, oriéntame", icono: "help", ramo: null },
];
const PARA_QUIEN = [
    { id: "yo", texto: "Para mí", ayuda: "Mi protección personal" },
    { id: "familia", texto: "Para mi familia", ayuda: "Pareja e hijos" },
    { id: "padres", texto: "Para mis padres u otro familiar", ayuda: "Alguien que depende de mí o a quien cuido" },
    { id: "negocio", texto: "Para mi negocio o mis empleados", ayuda: "Mi empresa o mi equipo" },
];
function formatearWhatsapp(v) {
    let d = (v !== null && v !== void 0 ? v : "").replace(/\D+/g, "");
    if (d.length > 10 && d.startsWith("521"))
        d = d.slice(3);
    else if (d.length > 10 && d.startsWith("52"))
        d = d.slice(2);
    d = d.slice(0, 10);
    if (d.length <= 2)
        return d;
    if (d.length <= 6)
        return `${d.slice(0, 2)} ${d.slice(2)}`;
    return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`;
}
function limpiarNombre(v) {
    return (v !== null && v !== void 0 ? v : "").replace(/\s+/g, " ").trim();
}
function prepararSolicitud(s) {
    var _a;
    return {
        ...s,
        nombre: limpiarNombre(s.nombre),
        whatsapp: normWhatsapp(s.whatsapp),
        correo: normCorreo(s.correo),
        trampa: ((_a = s.trampa) !== null && _a !== void 0 ? _a : "").trim(),
    };
}
function leerSolicitud(cuerpo) {
    const o = (cuerpo && typeof cuerpo === "object" ? cuerpo : {});
    const u = (o.utm && typeof o.utm === "object" ? o.utm : {});
    const txt = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
    return {
        nombre: txt(o.nombre, 200),
        whatsapp: txt(o.whatsapp, 40),
        tipoSeguro: txt(o.tipoSeguro, 20),
        paraQuien: txt(o.paraQuien, 20),
        correo: txt(o.correo, 200),
        consentimiento: o.consentimiento === true,
        trampa: txt(o.trampa, 200),
        tiempoMs: typeof o.tiempoMs === "number" ? o.tiempoMs : Number.NaN,
        utm: { source: txt(u.source, 120), medium: txt(u.medium, 120), campaign: txt(u.campaign, 120), term: txt(u.term, 120), content: txt(u.content, 120) },
        origen: txt(o.origen, 30).toLowerCase().replace(/[^a-z0-9._-]/g, ""),
    };
}
const RE_NOMBRE_SOSPECHOSO = /<|>|https?:|www\.|\.(com|net|org|mx|ru|xyz)\b|@|\{|\}|\[|\]|\\/i;
const RE_WHATSAPP_MX = /^[2-9]\d{9}$/;
function validarSolicitud(entrada, opciones = {}) {
    var _a;
    const s = prepararSolicitud(entrada);
    const e = {};
    if (!s.nombre)
        e.nombre = "Escribe tu nombre para saber cómo dirigirnos a ti.";
    else if (s.nombre.length < 2 || !/\p{L}.*\p{L}/u.test(s.nombre))
        e.nombre = "Tu nombre debe tener al menos 2 letras.";
    else if (s.nombre.length > 80)
        e.nombre = "Tu nombre es muy largo (máximo 80 caracteres).";
    else if (RE_NOMBRE_SOSPECHOSO.test(s.nombre))
        e.nombre = "Escribe solo tu nombre, sin enlaces ni símbolos como < o @.";
    if (!s.whatsapp)
        e.whatsapp = "Escribe tu número de WhatsApp (10 dígitos).";
    else if (s.whatsapp.length !== 10)
        e.whatsapp = "Tu WhatsApp debe tener 10 dígitos. Puedes incluir +52.";
    else if (!RE_WHATSAPP_MX.test(s.whatsapp) || /^(\d)\1{9}$/.test(s.whatsapp))
        e.whatsapp = "Ese número no parece válido. Revisa que lo hayas escrito completo.";
    if (!TIPOS_SEGURO.some((t) => t.id === s.tipoSeguro))
        e.tipoSeguro = "Elige el tipo de seguro que te interesa.";
    if (!PARA_QUIEN.some((p) => p.id === s.paraQuien))
        e.paraQuien = "Elige para quién sería la protección.";
    if (s.correo && !validarCorreo(s.correo))
        e.correo = "Revisa tu correo (ejemplo: nombre@correo.com). Si prefieres, déjalo vacío.";
    if (((_a = opciones.requiereConsentimiento) !== null && _a !== void 0 ? _a : true) && !s.consentimiento) {
        e.consentimiento = "Marca la casilla para aceptar el aviso de privacidad y poder contactarte.";
    }
    return { ok: Object.keys(e).length === 0, errores: e };
}
const TIEMPO_MINIMO_MS = 3000;
const MAX_ENVIOS_POR_VISITA = 3;
function evaluarAntispam(s, tiempoMinimoMs = TIEMPO_MINIMO_MS) {
    var _a;
    if (((_a = s.trampa) !== null && _a !== void 0 ? _a : "").trim().length > 0)
        return "bot";
    if (!Number.isFinite(s.tiempoMs) || s.tiempoMs < tiempoMinimoMs)
        return "rapido";
    return "ok";
}
const textoTipoSeguro = (id) => { var _a, _b; return (_b = (_a = TIPOS_SEGURO.find((t) => t.id === id)) === null || _a === void 0 ? void 0 : _a.texto) !== null && _b !== void 0 ? _b : ""; };
const textoParaQuien = (id) => { var _a, _b; return (_b = (_a = PARA_QUIEN.find((p) => p.id === id)) === null || _a === void 0 ? void 0 : _a.texto) !== null && _b !== void 0 ? _b : ""; };
const primerNombre = (nombre) => { var _a; return (_a = limpiarNombre(nombre).split(" ")[0]) !== null && _a !== void 0 ? _a : ""; };

window.CotizacionReglas = { TIPOS_SEGURO, PARA_QUIEN, MAX_ENVIOS_POR_VISITA, TIEMPO_MINIMO_MS, validarSolicitud, evaluarAntispam, prepararSolicitud, formatearWhatsapp, textoTipoSeguro, textoParaQuien, primerNombre };
})();
