/* =====================================================================
   FLUJO Y RAMIFICACIÓN
   ---------------------------------------------------------------------
   Claves de respuesta:
     - Preguntas comunes: 'q1', 'q2A', 'q3', 'q12', 'q13'…
     - Preguntas por situación: '1.q6' (primera situación explorada),
       '2.q6' (segunda, como máximo una exploración adicional).
   derive()  → qué situaciones se exploran y por qué.
   path()    → lista ordenada de pantallas de la ruta activa.
   sig()     → firma de lo que condiciona cada respuesta; si cambia, la
               respuesta deja de ser válida y prune() la elimina. Las
               comunes (contexto, frecuencias, dificultades, condiciones
               de uso, comentario) se conservan al cambiar de situación.
   CONTRADICTIONS → aclaraciones opcionales antes del informe.
   ===================================================================== */
window.DC = window.DC || {};

DC.val = function (a, q) { return a[q] ? a[q].v : undefined; };
DC.has = function (a, q, id) { var v = DC.val(a, q); return Array.isArray(v) ? v.indexOf(id) !== -1 : v === id; };
DC.hasAny = function (a, q, ids) { return ids.some(function (id) { return DC.has(a, q, id); }); };
DC.text = function (a, q, key) { return (a[q] && a[q].texts && a[q].texts[key]) ? a[q].texts[key] : ''; };
DC.K = function (n, base) { return n + '.' + base; };
DC.baseOf = function (key) { var i = key.indexOf('.'); return i === -1 ? key : key.slice(i + 1); };
DC.routeOf = function (key) { var i = key.indexOf('.'); return i === -1 ? 0 : Number(key.slice(0, i)); };
DC.RV = function (a, n, base) { return DC.val(a, DC.K(n, base)); };

DC.scaleRank = function (v) {
  var o = DC.SCALE.filter(function (s) { return s.id === v; })[0];
  return o && o.rank ? o.rank : 0;
};

DC.derive = function (a) {
  var val = DC.val;
  var d = {
    occurred: [], candidates: [], uncertain: false, q2done: false,
    needsQ4: false, needsQ4b: false, needsQ4c: false, top: null, tied: [],
    altNeeded: false, altReason: null, route: 'pending',
    r1: null, r2: null, lastRoute: null, canExplore: true
  };
  DC.SIT_IDS.forEach(function (s) { if (DC.scaleRank(val(a, 'q2' + s)) > 0) d.occurred.push(s); });
  d.q2done = DC.SIT_IDS.every(function (s) { return !!val(a, 'q2' + s); });
  if (!d.q2done) return d;

  var goAlt = false;
  if (d.occurred.length === 0) { goAlt = true; d.altReason = 'sin-situaciones'; }
  else {
    var q3 = val(a, 'q3');
    if (!q3) return d;
    if (q3.indexOf('ninguna') !== -1) { goAlt = true; d.altReason = 'sin-dificultad'; }
    else {
      d.uncertain = q3.indexOf('noseguro') !== -1;
      d.candidates = d.uncertain ? d.occurred.slice() : q3.filter(function (s) { return d.occurred.indexOf(s) !== -1; });
      if (d.candidates.length === 1 && !d.uncertain) d.r1 = { n: 1, situation: d.candidates[0], source: 'single' };
      else {
        d.needsQ4 = true;
        var q4 = val(a, 'q4');
        if (!q4) return d;
        if (q4 === 'ninguna') { goAlt = true; d.altReason = 'no-explorar'; }
        else if (q4 === 'nopref') {
          d.needsQ4b = true;
          var q4b = val(a, 'q4b');
          if (!q4b) return d;
          if (d.candidates.indexOf(q4b) !== -1) d.r1 = { n: 1, situation: q4b, source: 'consequences' };
          else {
            d.needsQ4c = true;
            var max = Math.max.apply(null, d.candidates.map(function (s) { return DC.scaleRank(val(a, 'q2' + s)); }));
            d.tied = d.candidates.filter(function (s) { return DC.scaleRank(val(a, 'q2' + s)) === max; });
            d.top = d.tied.length === 1 ? d.tied[0] : null;
            var q4c = val(a, 'q4c');
            if (!q4c) return d;
            d.r1 = { n: 1, situation: q4c, source: q4c === d.top ? 'freq' : 'chosen' };
          }
        } else d.r1 = { n: 1, situation: q4, source: 'chosen' };
      }
    }
  }

  if (goAlt) {
    d.altNeeded = true;
    d.route = 'alt';
    var qa = val(a, 'qalt');
    if (!qa) return d;
    if (qa === 'nada') d.route = 'none';
    else d.r1 = { n: 1, situation: 'F', source: 'alt', alt: qa };
  }

  if (d.r1) {
    d.route = 'main';
    if (val(a, 'qconfirm') === 'otra' && val(a, 'qswitch')) d.r2 = { n: 2, situation: val(a, 'qswitch'), trigger: 'confirm' };
    d.canExplore = !d.r2;
    d.lastRoute = d.r2 || d.r1;
    var cc = val(a, 'qcclass');
    if (!d.r2 && val(a, 'qcomment') === 'explorar' && cc && cc !== 'ninguna' && cc !== d.r1.situation) {
      d.r2 = { n: 2, situation: cc, trigger: 'comment' };
    }
  } else if (d.route === 'none') {
    var cc2 = val(a, 'qcclass');
    if (val(a, 'qcomment') === 'explorar' && cc2 && cc2 !== 'ninguna') {
      d.r1 = { n: 1, situation: cc2, source: 'comment' };
      d.route = 'main';
      d.noneFirst = true;
    }
  }
  d.routes = [d.r1, d.r2].filter(Boolean);
  return d;
};

DC.routeObj = function (d, n) { return n === 1 ? d.r1 : n === 2 ? d.r2 : null; };

/* ¿Hace falta preguntar dónde están los materiales? Solo si la tarea usa
   materiales que una ayuda tendría que consultar. */
DC.needsAccess = function (a, n, r) {
  var mats = DC.hasAny(a, DC.K(n, 'q11'), ['archivos', 'videos', 'mensajes', 'app']);
  var rel = ['A', 'B', 'E', 'G'].indexOf(r.situation) !== -1 || ['dispersa', 'manual', 'herramienta'].indexOf(DC.RV(a, n, 'q7')) !== -1;
  return mats && rel;
};

/* Seguimiento de «aprender o practicar algo»: solo si la tarea no está concretada */
DC.needsLearnDetail = function (a, n, r) { return r.situation === 'F' && DC.RV(a, n, 'q6') === 'aprender'; };

/* «¿Qué acabaste haciendo?»: prioridad mínima. Solo con energía/ganas sin
   causa clara y si no hay otro seguimiento más útil en esta situación. */
DC.needsEnergyBehaviour = function (a, d, n) {
  if (DC.RV(a, n, 'q7') !== 'energia' || ['nolose', 'otra'].indexOf(DC.RV(a, n, 'q7b')) === -1) return false;
  var r = DC.routeObj(d, n);
  var other = DC.needsLearnDetail(a, n, r) || DC.RV(a, n, 'q9b') === 'sirve' || DC.has(a, 'q12', 'accesible') ||
    DC.clarification(a, n, 'c_consecuencia') === 'relevante';
  return !other;
};

DC.path = function (a, d) {
  d = d || DC.derive(a);
  var p = [];
  function add(id, qs, opt) { p.push({ id: id, qs: qs || [id], optional: !!opt }); }
  function block(n) {
    var r = DC.routeObj(d, n), K = function (b) { return DC.K(n, b); };
    add(K('q5')); add(K('q6'));
    if (DC.needsLearnDetail(a, n, r)) add(K('q6b'));
    if (r.situation === 'P' && DC.RV(a, n, 'q6') === 'ambitos') add(K('q6o'));
    add(K('q7'));
    if (DC.RV(a, n, 'q7') === 'energia') add(K('q7b'));
    if (DC.RV(a, n, 'q7') === 'dispersa') {
      add(K('q7d'));
      if (DC.RV(a, n, 'q7d') === 'reunir') add(K('q7e'));
    }
    add(K('q8'));
    if (!DC.has(a, K('q8'), 'nointentado')) add(K('q9'), [K('q9'), K('q9b')]);
    if (DC.RV(a, n, 'q9b') === 'sirve') {
      add(K('q9c'), [K('q9c'), K('q9d')]);
      if (['si', 'ocasiones'].indexOf(DC.RV(a, n, 'q9d')) !== -1) add(K('q9e'));
    }
    if (DC.scaleRank(DC.val(a, 'q2' + r.situation)) === 0) add(K('q10a'));
    add(K('q10b'));
    if (DC.has(a, K('q10b'), 'tiempo')) add(K('q10c'));
    if (DC.has(a, K('q10b'), 'ayuda')) add(K('q10d'));
    add(K('q11'));
    if (DC.needsAccess(a, n, r)) add(K('q11c'));
  }
  /* Aclaraciones y seguimientos posteriores de una situación:
     contradicción → descripción de la consecuencia (si aclaró que sí la hay)
     → qué acabó haciendo (solo si no hay otro seguimiento más útil). */
  function clar(n) {
    if (DC.contradictions(a, d, n).length) add(DC.K(n, 'qc'), null, true);
    if (DC.clarification(a, n, 'c_consecuencia') === 'relevante') add(DC.K(n, 'qconsec'), null, true);
    if (DC.needsEnergyBehaviour(a, d, n)) add(DC.K(n, 'q7c'));
  }
  function common() { add('q12'); if (DC.has(a, 'q12', 'accesible')) add('qacc', null, true); }
  function commentTail() {
    add('q13', null, true);
    if (DC.val(a, 'q13')) {
      add('qcomment', ['qcomment', 'qcomment2']);
      if (['explorar', 'pendiente'].indexOf(DC.val(a, 'qcomment')) !== -1) add('qcclass');
    }
  }
  function estimate(k) { for (var i = 0; i < k; i++) p.push({ id: 'est' + i, qs: [], estimate: true }); }

  add('q1');
  DC.SIT_IDS.forEach(function (s) { add('q2' + s); });
  if (!d.q2done) { estimate(13); return p; }
  if (d.occurred.length) add('q3');
  if (d.needsQ4) add('q4');
  if (d.needsQ4b) add('q4b');
  if (d.needsQ4c) add('q4c');
  if (d.altNeeded) add('qalt');
  if (d.route === 'pending' || (d.route === 'alt' && !d.r1)) { estimate(12); return p; }

  if (d.r1 && !d.noneFirst) {
    block(1); common(); clar(1); add('qconfirm');
    if (DC.val(a, 'qconfirm') === 'otra') {
      add('qswitch');
      if (d.r2 && d.r2.trigger === 'confirm') { block(2); clar(2); }
    }
    commentTail();
    if (d.r2 && d.r2.trigger === 'comment') { block(2); clar(2); }
  } else {
    commentTail();
    if (d.r1) { block(1); common(); clar(1); }
  }
  return p;
};

DC.sig = function (key, a, d) {
  var base = DC.baseOf(key), n = DC.routeOf(key);
  if (n) {
    var r = DC.routeObj(d, n);
    if (!r) return '×';
    var s = r.situation;
    if (base === 'q5') s += '|' + (DC.val(a, 'q1') || []).join(',');
    if (base === 'qc') s += '|' + DC.contradictions(a, d, n).map(function (c) { return c.id; }).join(',');
    return s;
  }
  switch (key) {
    case 'q3': return d.occurred.join(',');
    case 'q4': return d.candidates.join(',') + '|' + d.uncertain;
    case 'q4b': return d.candidates.join(',');
    case 'q4c': return d.candidates.join(',') + '|' + DC.val(a, 'q4b');
    case 'qconfirm': case 'qswitch': return d.r1 && !d.noneFirst ? d.r1.situation : '';
    case 'qcomment': return (DC.val(a, 'q13') || '') + '|' + d.canExplore + '|' + !!(d.lastRoute);
    case 'qcomment2': case 'qcclass': return DC.val(a, 'q13') || '';
  }
  return '';
};

/* Respuestas generales que se conservan aunque su pantalla quede fuera de
   la ruta un momento (p. ej. mientras se vuelve a elegir la situación). */
DC.PERSIST = ['q1', 'q12', 'q13'];

DC.prune = function (a) {
  var removed = [];
  for (var i = 0; i < 15; i++) {
    var d = DC.derive(a);
    var on = {};
    DC.path(a, d).forEach(function (s) { s.qs.forEach(function (q) { on[q] = true; }); });
    var changed = false;
    Object.keys(a).forEach(function (q) {
      var off = !on[q] && DC.PERSIST.indexOf(q) === -1;
      if (off || a[q].sig !== DC.sig(q, a, d)) { delete a[q]; removed.push(q); changed = true; }
    });
    if (!changed) break;
  }
  return removed;
};

DC.commit = function (a, q, value, texts) {
  a[q] = { v: value, texts: texts || {}, sig: '' };
  a[q].sig = DC.sig(q, a, DC.derive(a));
};

DC.ctx = function (key, d) { var n = DC.routeOf(key); return { n: n, r: DC.routeObj(d, n) || {} }; };
function resolve(x, key, a, d) { return typeof x === 'function' ? x(a, d, DC.ctx(key, d)) : x; }
DC.def = function (key) { return DC.QUESTIONS[DC.baseOf(key)]; };
DC.optionsFor = function (key, a, d) { d = d || DC.derive(a); return resolve(DC.def(key).options, key, a, d) || []; };
DC.titleFor = function (key, a, d) { d = d || DC.derive(a); return resolve(DC.def(key).title, key, a, d); };
DC.helpFor = function (key, a, d) { d = d || DC.derive(a); return resolve(DC.def(key).help, key, a, d) || null; };
DC.labelOf = function (key, id, a, d) {
  var o = DC.optionsFor(key, a, d).filter(function (x) { return x.id === id; })[0];
  return o ? o.label : id;
};

DC.OPTIONAL_KEYS = ['qcomment2', 'qacc'];
DC.isAnswered = function (key, a) {
  var def = DC.def(key);
  if (def.type === 'text' || def.type === 'clarify' || DC.OPTIONAL_KEYS.indexOf(DC.baseOf(key)) !== -1) return true;
  var v = DC.val(a, key);
  return Array.isArray(v) ? v.length > 0 : !!v;
};
DC.screenDone = function (s, a) { return !s.estimate && (s.optional || s.qs.every(function (q) { return DC.isAnswered(q, a); })); };
DC.isComplete = function (a) {
  var d = DC.derive(a);
  if (d.route === 'pending' || (d.route === 'alt' && !d.r1)) return false;
  return DC.path(a, d).every(function (s) { return DC.screenDone(s, a); });
};

/* ---------- Respuestas aparentemente contradictorias (por situación) ---------- */
var STRONG = ['errores', 'gasto', 'oportunidad', 'impide'];
DC.CONTRADICTIONS = [
  {
    id: 'c_metodo', target: 'q9',
    test: function (a, d, n) {
      var K = function (b) { return DC.K(n, b); };
      return DC.val(a, K('q9')) === 'bien' && (DC.has(a, K('q8'), 'pospongo') || DC.hasAny(a, K('q10b'), ['errores', 'oportunidad', 'impide']));
    },
    text: function (a, d, n) {
      var K = function (b) { return DC.K(n, b); };
      var other = DC.has(a, K('q8'), 'pospongo') ? 'que sueles posponerla o dejarla sin terminar'
        : 'esta consecuencia: «' + DC.labelOf(K('q10b'), ['errores', 'oportunidad', 'impide'].filter(function (x) { return DC.has(a, K('q10b'), x); })[0], a, d) + '»';
      return 'Has indicado que tu forma actual te funciona bien y con poco esfuerzo, y también ' + other + '. ¿Qué se acerca más a tu caso?';
    },
    options: [
      { id: 'funciona', label: 'Me funciona bien; lo otro tiene una causa distinta' },
      { id: 'parcial', label: 'Me funciona solo a veces, o con más esfuerzo del que indiqué' },
      { id: 'nodecir', label: 'Prefiero no aclararlo' }
    ]
  },
  {
    id: 'c_consecuencia', target: 'q10b',
    test: function (a, d, n) {
      var r = DC.routeObj(d, n);
      return r && !d.uncertain && (DC.val(a, 'q3') || []).indexOf(r.situation) !== -1 && DC.has(a, DC.K(n, 'q10b'), 'ninguna');
    },
    text: function () { return 'Antes indicaste que esta situación te causó una dificultad que te importaba, y ahora que no tiene consecuencias relevantes. ¿Qué se acerca más a tu caso?'; },
    options: [
      { id: 'relevante', label: 'Sí tiene consecuencias, pero no encajaban en la lista' },
      { id: 'norelevante', label: 'En realidad no tiene consecuencias relevantes' },
      { id: 'nodecir', label: 'Prefiero no aclararlo' }
    ]
  },
  {
    id: 'c_cambio', target: 'q12',
    test: function (a, d, n) { return DC.has(a, 'q12', 'continuar') && DC.hasAny(a, DC.K(n, 'q10b'), STRONG); },
    text: function (a, d, n) {
      var c = STRONG.filter(function (x) { return DC.has(a, DC.K(n, 'q10b'), x); })[0];
      return 'Prefieres continuar como ahora, aunque indicaste esta consecuencia: «' + DC.labelOf(DC.K(n, 'q10b'), c, a, d) + '». ¿Qué se acerca más a tu caso?';
    },
    options: [
      { id: 'mantener', label: 'Prefiero mantener mi forma actual igualmente' },
      { id: 'abierto', label: 'Probaría algo si encaja con cómo lo hago' },
      { id: 'nodecir', label: 'Prefiero no aclararlo' }
    ]
  }
];

DC.contradictions = function (a, d, n) {
  d = d || DC.derive(a);
  if (!DC.routeObj(d, n)) return [];
  return DC.CONTRADICTIONS.filter(function (c) { return c.test(a, d, n); });
};
DC.clarification = function (a, n, id) { var v = DC.val(a, DC.K(n, 'qc')); return v && v[id] ? v[id] : null; };

/* ---------- Resumen de respuestas (revisión y exportación) ---------- */
DC.answerText = function (key, a, d) {
  var def = DC.def(key), ans = a[key];
  if (!ans) return null;
  if (def.type === 'text') return ans.v ? '«' + ans.v + '»' : 'Sin respuesta';
  var ids = Array.isArray(ans.v) ? ans.v : [ans.v];
  var out = ids.map(function (id) {
    var l = DC.labelOf(key, id, a, d);
    var t = ans.texts && ans.texts[id];
    return t ? l + ': «' + t + '»' : l;
  }).join('; ');
  if (def.extraText && ans.texts && ans.texts[def.extraText.key]) out += ' (indicada: «' + ans.texts[def.extraText.key] + '»)';
  return out;
};

DC.laterClarifications = function (key, a, d) {
  var base = DC.baseOf(key), n = DC.routeOf(key), out = [];
  (n ? [n] : [1, 2]).forEach(function (rn) {
    DC.contradictions(a, d, rn).forEach(function (c) {
      if (c.target !== base) return;
      var v = DC.clarification(a, rn, c.id);
      if (!v || v === 'nodecir') return;
      var lbl = c.options.filter(function (o) { return o.id === v; })[0].label;
      if (c.id === 'c_consecuencia' && v === 'relevante') {
        var t = DC.RV(a, rn, 'qconsec');
        lbl += t ? ' («' + t + '»)' : ' (sin describir todavía)';
      }
      out.push(lbl);
    });
  });
  return out;
};

DC.summary = function (a) {
  var d = DC.derive(a), rows = [];
  DC.path(a, d).forEach(function (s) {
    s.qs.forEach(function (key) {
      if (!a[key]) return;
      var def = DC.def(key), n = DC.routeOf(key);
      var prefix = (n === 2 ? '[Segunda situación] ' : '');
      if (def.type === 'text' && !a[key].v) return;
      /* Las aclaraciones se muestran junto a la respuesta que aclaran */
      if (def.type === 'clarify' || DC.baseOf(key) === 'qconsec') return;
      if (Array.isArray(a[key].v) && !a[key].v.length) return;
      var answer = DC.answerText(key, a, d);
      var later = DC.laterClarifications(key, a, d);
      if (later.length) answer = 'Respuesta inicial: ' + answer + '. Aclaración posterior: ' + later.join(' · ');
      rows.push({ q: key, screen: s.id, title: prefix + DC.titleFor(key, a, d), answer: answer });
    });
  });
  return rows;
};
