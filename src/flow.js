/* =====================================================================
   FLUJO Y RAMIFICACIÓN
   ---------------------------------------------------------------------
   derive()  → calcula qué situación se explora y por qué ruta.
   SCREENS   → orden de pantallas y condiciones para mostrarlas.
   sig()     → "firma" de lo que condiciona cada respuesta. Si la firma
               cambia (por ejemplo, cambia la situación explorada), la
               respuesta guardada deja de ser válida y se elimina.
   prune()   → elimina respuestas que ya no aplican.
   CONTRADICTIONS → reglas de respuestas aparentemente contradictorias
               que generan una aclaración opcional antes del informe.
   ===================================================================== */
window.DC = window.DC || {};

DC.val = function (a, q) { return a[q] ? a[q].v : undefined; };
DC.has = function (a, q, id) { var v = DC.val(a, q); return Array.isArray(v) ? v.indexOf(id) !== -1 : v === id; };
DC.hasAny = function (a, q, ids) { return ids.some(function (id) { return DC.has(a, q, id); }); };
DC.text = function (a, q, key) { return (a[q] && a[q].texts && a[q].texts[key]) ? a[q].texts[key] : ''; };

DC.scaleRank = function (v) {
  var o = DC.SCALE.filter(function (s) { return s.id === v; })[0];
  return o && o.rank ? o.rank : 0;
};

/* Ruta: 'pending' (faltan respuestas para decidir), 'alt' (ruta de
   actividades deseadas, a la espera de qalt), 'main' (hay situación
   elegida) o 'none' (no hay nada que explorar). */
DC.derive = function (a) {
  var val = DC.val;
  var d = {
    occurred: [], candidates: [], tied: [], uncertain: false,
    q2done: false, needsQ4: false, needsQ4b: false, altNeeded: false,
    route: 'pending', situation: null, source: null, alt: null
  };
  DC.SIT_IDS.forEach(function (s) { if (DC.scaleRank(val(a, 'q2' + s)) > 0) d.occurred.push(s); });
  d.q2done = DC.SIT_IDS.every(function (s) { return !!val(a, 'q2' + s); });
  if (!d.q2done) return d;

  var goAlt = false;
  if (d.occurred.length === 0) {
    goAlt = true;
    d.altReason = 'sin-situaciones';
  } else {
    var q3 = val(a, 'q3');
    if (!q3) return d;
    if (q3.indexOf('ninguna') !== -1) {
      goAlt = true;
      d.altReason = 'sin-consecuencias';
    } else {
      d.uncertain = q3.indexOf('noseguro') !== -1;
      d.candidates = d.uncertain ? d.occurred.slice() : q3.filter(function (s) { return d.occurred.indexOf(s) !== -1; });
      if (d.candidates.length === 1 && !d.uncertain) {
        d.situation = d.candidates[0]; d.source = 'single';
      } else {
        d.needsQ4 = true;
        var q4 = val(a, 'q4');
        if (!q4) return d;
        if (q4 === 'ninguna') {
          goAlt = true;
          d.altReason = 'no-explorar';
        } else if (q4 === 'nopref') {
          var max = Math.max.apply(null, d.candidates.map(function (s) { return DC.scaleRank(val(a, 'q2' + s)); }));
          d.tied = d.candidates.filter(function (s) { return DC.scaleRank(val(a, 'q2' + s)) === max; });
          if (d.tied.length === 1) {
            d.situation = d.tied[0]; d.source = 'freq';
          } else {
            d.needsQ4b = true;
            var q4b = val(a, 'q4b');
            if (!q4b) return d;
            d.situation = q4b; d.source = 'tiebreak';
          }
        } else {
          d.situation = q4; d.source = 'chosen';
        }
      }
    }
  }

  if (goAlt) {
    d.altNeeded = true;
    d.route = 'alt';
    var qa = val(a, 'qalt');
    if (!qa) return d;
    if (qa === 'nada') { d.route = 'none'; return d; }
    d.situation = 'F'; d.source = 'alt'; d.alt = qa;
  }
  if (d.situation) d.route = 'main';
  return d;
};

function mainOrPending(d) { return d.route === 'main' || d.route === 'pending'; }

DC.SCREENS = [
  { id: 'q1', qs: ['q1'] }
].concat(DC.SIT_IDS.map(function (s) { return { id: 'q2' + s, qs: ['q2' + s] }; })).concat([
  { id: 'q3', qs: ['q3'], show: function (a, d) { return !d.q2done || d.occurred.length > 0; } },
  { id: 'q4', qs: ['q4'], show: function (a, d) { return d.needsQ4; } },
  { id: 'q4b', qs: ['q4b'], show: function (a, d) { return d.needsQ4b; } },
  { id: 'qalt', qs: ['qalt'], show: function (a, d) { return d.altNeeded; } },
  { id: 'q5', qs: ['q5'], show: function (a, d) { return mainOrPending(d); } },
  { id: 'q6', qs: ['q6'], show: function (a, d) { return mainOrPending(d); } },
  { id: 'q7', qs: ['q7'], show: function (a, d) { return mainOrPending(d); } },
  { id: 'q8', qs: ['q8'], show: function (a, d) { return mainOrPending(d); } },
  { id: 'q9', qs: ['q9'], show: function (a, d) { return mainOrPending(d) && !DC.has(a, 'q8', 'nointentado'); } },
  { id: 'q10a', qs: ['q10a'], show: function (a, d) { return mainOrPending(d); } },
  { id: 'q10b', qs: ['q10b'], show: function (a, d) { return mainOrPending(d); } },
  { id: 'q10c', qs: ['q10c'], show: function (a, d) { return d.route === 'main' && DC.has(a, 'q10b', 'tiempo'); } },
  { id: 'q11', qs: ['q11a', 'q11b'], show: function (a, d) { return mainOrPending(d); } },
  { id: 'q12', qs: ['q12'], show: function (a, d) { return mainOrPending(d); } },
  { id: 'qc', qs: ['qc'], optional: true, show: function (a, d) { return d.route === 'main' && DC.contradictions(a, d).length > 0; } },
  { id: 'q13', qs: ['q13'], optional: true, show: function (a, d) { return mainOrPending(d); } }
]);

DC.screenById = function (id) { return DC.SCREENS.filter(function (s) { return s.id === id; })[0]; };
DC.screenOfQuestion = function (q) { return DC.SCREENS.filter(function (s) { return s.qs.indexOf(q) !== -1; })[0]; };

DC.path = function (a, d) {
  d = d || DC.derive(a);
  return DC.SCREENS.filter(function (s) { return !s.show || s.show(a, d); });
};

DC.sig = function (q, a, d) {
  var after = ['q7', 'q8', 'q9', 'q10a', 'q10b', 'q10c', 'q11a', 'q11b', 'q12', 'q13'];
  if (q === 'q3') return d.occurred.join(',');
  if (q === 'q4') return d.candidates.join(',') + '|' + d.uncertain;
  if (q === 'q4b') return d.tied.join(',');
  if (q === 'q5') return d.situation + '|' + ((DC.val(a, 'q1') || []).join(','));
  if (q === 'q6') return String(d.situation);
  if (q === 'qc') return DC.contradictions(a, d).map(function (c) { return c.id; }).join(',');
  if (after.indexOf(q) !== -1) return String(d.situation);
  return '';
};

/* Elimina respuestas fuera de la ruta activa o cuya firma ha cambiado.
   Devuelve la lista de preguntas eliminadas. */
DC.prune = function (a) {
  var removed = [];
  for (var i = 0; i < 12; i++) {
    var d = DC.derive(a);
    var onPath = {};
    DC.path(a, d).forEach(function (s) { s.qs.forEach(function (q) { onPath[q] = true; }); });
    var changed = false;
    Object.keys(a).forEach(function (q) {
      if (!onPath[q] || a[q].sig !== DC.sig(q, a, d)) {
        delete a[q]; removed.push(q); changed = true;
      }
    });
    /* Selecciones de q3 que ya no corresponden a situaciones ocurridas */
    if (!changed) break;
  }
  return removed;
};

DC.commit = function (a, q, value, texts) {
  a[q] = { v: value, texts: texts || {}, sig: '' };
  a[q].sig = DC.sig(q, a, DC.derive(a));
};

DC.optionsFor = function (q, a, d) {
  var def = DC.QUESTIONS[q];
  var o = def.options;
  return typeof o === 'function' ? o(a, d || DC.derive(a)) : (o || []);
};
DC.titleFor = function (q, a, d) {
  var t = DC.QUESTIONS[q].title;
  return typeof t === 'function' ? t(a, d || DC.derive(a)) : t;
};
DC.labelOf = function (q, id, a, d) {
  var o = DC.optionsFor(q, a, d).filter(function (x) { return x.id === id; })[0];
  return o ? o.label : id;
};

DC.isAnswered = function (q, a) {
  var def = DC.QUESTIONS[q];
  if (def.type === 'text' || def.type === 'clarify') return true;
  var v = DC.val(a, q);
  return Array.isArray(v) ? v.length > 0 : !!v;
};

DC.screenDone = function (s, a) {
  return s.optional || s.qs.every(function (q) { return DC.isAnswered(q, a); });
};

DC.isComplete = function (a) {
  var d = DC.derive(a);
  if (d.route === 'none') return true;
  if (d.route !== 'main') return false;
  return DC.path(a, d).every(function (s) { return DC.screenDone(s, a); });
};

/* ---------- Respuestas aparentemente contradictorias ---------- */
var STRONG = ['errores', 'gasto', 'oportunidad', 'impide'];

DC.CONTRADICTIONS = [
  {
    id: 'c_metodo',
    test: function (a) {
      return DC.val(a, 'q9') === 'bien' && (DC.has(a, 'q8', 'pospongo') || DC.hasAny(a, 'q10b', ['errores', 'oportunidad', 'impide']));
    },
    text: function (a, d) {
      var other = DC.has(a, 'q8', 'pospongo')
        ? 'que sueles posponerla o dejarla sin resolver'
        : 'que tiene esta consecuencia: «' + DC.labelOf('q10b', ['errores', 'oportunidad', 'impide'].filter(function (x) { return DC.has(a, 'q10b', x); })[0], a, d) + '»';
      return 'Has indicado que tu forma actual de hacerlo te funciona bien y requiere poco esfuerzo, y también ' + other + '. ¿Qué se acerca más a tu caso?';
    },
    options: [
      { id: 'funciona', label: 'Me funciona bien; lo otro tiene una causa distinta' },
      { id: 'parcial', label: 'Me funciona solo a veces, o con más esfuerzo del que indiqué' },
      { id: 'nodecir', label: 'Prefiero no aclararlo' }
    ]
  },
  {
    id: 'c_consecuencia',
    test: function (a, d) {
      return ['single', 'chosen', 'freq', 'tiebreak'].indexOf(d.source) !== -1 && !d.uncertain && DC.has(a, 'q10b', 'ninguna');
    },
    text: function () {
      return 'Al principio marcaste que esta situación tuvo alguna consecuencia que te importaba, y ahora que no tiene consecuencias relevantes. ¿Qué se acerca más a tu caso?';
    },
    options: [
      { id: 'relevante', label: 'Sí tiene consecuencias, pero no encajaban en la lista' },
      { id: 'norelevante', label: 'En realidad no tiene consecuencias relevantes' },
      { id: 'nodecir', label: 'Prefiero no aclararlo' }
    ]
  },
  {
    id: 'c_cambio',
    test: function (a) { return DC.has(a, 'q12', 'continuar') && DC.hasAny(a, 'q10b', STRONG); },
    text: function (a, d) {
      var c = STRONG.filter(function (x) { return DC.has(a, 'q10b', x); })[0];
      return 'Prefieres continuar como ahora, aunque indicaste esta consecuencia: «' + DC.labelOf('q10b', c, a, d) + '». ¿Qué se acerca más a tu caso?';
    },
    options: [
      { id: 'mantener', label: 'Prefiero mantener mi forma actual igualmente' },
      { id: 'abierto', label: 'Probaría algo si encaja con cómo lo hago' },
      { id: 'nodecir', label: 'Prefiero no aclararlo' }
    ]
  }
];

DC.contradictions = function (a, d) {
  d = d || DC.derive(a);
  return DC.CONTRADICTIONS.filter(function (c) { return c.test(a, d); });
};

DC.clarification = function (a, id) {
  var v = DC.val(a, 'qc');
  return v && v[id] ? v[id] : null;
};

/* ---------- Resumen de respuestas (revisión y exportación) ---------- */
DC.summaryTitle = function (q, a, d) {
  var def = DC.QUESTIONS[q];
  if (def.lead) return def.lead.replace('…', '') + def.title.replace('…', '');
  return DC.titleFor(q, a, d);
};

DC.answerText = function (q, a, d) {
  var def = DC.QUESTIONS[q];
  var ans = a[q];
  if (!ans) return null;
  if (def.type === 'text') return ans.v ? '«' + ans.v + '»' : 'Sin respuesta';
  if (def.type === 'clarify') {
    var parts = DC.contradictions(a, d).map(function (c) {
      var v = ans.v && ans.v[c.id];
      var lbl = v ? c.options.filter(function (o) { return o.id === v; })[0].label : 'Sin respuesta';
      return lbl;
    });
    return parts.join(' · ');
  }
  var ids = Array.isArray(ans.v) ? ans.v : [ans.v];
  var out = ids.map(function (id) {
    var l = DC.labelOf(q, id, a, d);
    var t = ans.texts && ans.texts[id];
    return t ? l + ': «' + t + '»' : l;
  }).join('; ');
  if (def.extraText && ans.texts && ans.texts[def.extraText.key]) out += ' (herramienta: «' + ans.texts[def.extraText.key] + '»)';
  return out;
};

DC.summary = function (a) {
  var d = DC.derive(a);
  var rows = [];
  DC.path(a, d).forEach(function (s) {
    s.qs.forEach(function (q) {
      if (!a[q]) return;
      if (DC.QUESTIONS[q].type === 'text' && !a[q].v) return;
      if (DC.QUESTIONS[q].type === 'clarify') {
        DC.contradictions(a, d).forEach(function (c) {
          var v = a[q].v && a[q].v[c.id];
          if (v) rows.push({ q: q, screen: s.id, title: c.text(a, d), answer: c.options.filter(function (o) { return o.id === v; })[0].label });
        });
        return;
      }
      rows.push({ q: q, screen: s.id, title: DC.summaryTitle(q, a, d), answer: DC.answerText(q, a, d) });
    });
  });
  return rows;
};
