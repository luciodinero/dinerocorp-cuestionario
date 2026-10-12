/* =====================================================================
   INTERFAZ
   Las respuestas solo viven en la memoria de esta página: no se envían
   a ningún servidor ni se guardan en el navegador. Al cerrar o recargar
   la página se pierden, salvo que la persona descargue el informe.
   ===================================================================== */
(function () {
  var S = { answers: {}, mode: 'intro', screen: null, draft: {}, notice: null, fromReview: false, confirmReset: false, actionMsg: '', errors: {} };
  var app = document.getElementById('app');
  var live = document.getElementById('live');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function sid(key) { return String(key).replace(/[^a-zA-Z0-9_-]/g, '_'); }
  function announce(msg) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- Navegación ---------- */
  function realPath() { return DC.path(S.answers).filter(function (s) { return !s.estimate; }); }
  function screenObj(id) { return realPath().filter(function (s) { return s.id === id; })[0]; }
  function firstIncomplete() {
    var p = realPath().filter(function (s) { return !DC.screenDone(s, S.answers); })[0];
    return p ? p.id : null;
  }
  function neighbour(id, step) {
    var p = realPath(), i = p.map(function (s) { return s.id; }).indexOf(id);
    if (i === -1) return null;
    var t = p[i + step];
    return t ? t.id : null;
  }

  function emptyDraft(key) {
    var t = DC.def(key).type;
    if (t === 'multi') return { v: [], texts: {} };
    if (t === 'clarify') return { v: {}, texts: {} };
    if (t === 'text') return { v: '', texts: {} };
    return { v: null, texts: {} };
  }

  function goScreen(id, focus) {
    var scr = screenObj(id);
    if (!scr) { var fi = firstIncomplete(); if (fi && fi !== id) return goScreen(fi, focus); return showReport(); }
    S.mode = 'q'; S.screen = id; S.errors = {}; S.draft = {};
    scr.qs.forEach(function (k) {
      S.draft[k] = S.answers[k] ? { v: clone(S.answers[k].v), texts: clone(S.answers[k].texts || {}) } : emptyDraft(k);
    });
    if (DC.baseOf(id) === 'q6' && !S.answers[id]) {
      var d = DC.derive(S.answers), r = DC.routeObj(d, DC.routeOf(id));
      if (r && r.source === 'alt' && DC.ALT_TO_TASK[r.alt]) S.draft[id].v = DC.ALT_TO_TASK[r.alt];
    }
    render(focus);
  }

  function commitDraft() {
    var scr = screenObj(S.screen);
    if (!scr) return;
    scr.qs.forEach(function (k) {
      var dr = S.draft[k]; if (!dr) return;
      var t = DC.def(k).type;
      if (t === 'text') dr.v = (dr.v || '').trim();
      Object.keys(dr.texts).forEach(function (x) { dr.texts[x] = (dr.texts[x] || '').trim(); if (!dr.texts[x]) delete dr.texts[x]; });
      var empty = t === 'multi' ? !dr.v.length : t === 'single' ? !dr.v : t === 'text' ? !dr.v : false;
      if (empty) delete S.answers[k];
      else DC.commit(S.answers, k, dr.v, dr.texts);
    });
    var removed = DC.prune(S.answers).filter(function (q) { return scr.qs.indexOf(q) === -1; });
    if (removed.length) {
      S.notice = removed.length === 1 ? 'Hemos quitado 1 respuesta que ya no aplica tras tu cambio. Las respuestas generales se conservan.'
        : 'Hemos quitado ' + removed.length + ' respuestas que ya no aplican tras tu cambio. Las respuestas generales se conservan.';
    }
  }

  function validate() {
    var scr = screenObj(S.screen);
    S.errors = {};
    scr.qs.forEach(function (k) {
      if (DC.isAnswered(k, (function () { var o = {}; o[k] = { v: S.draft[k].v }; return o; })())) return;
      S.errors[k] = DC.def(k).type === 'multi' ? 'Marca al menos una opción para continuar.' : 'Elige una opción para continuar.';
    });
    return Object.keys(S.errors).length === 0;
  }

  function onContinue() {
    if (!validate()) {
      render();
      var k = Object.keys(S.errors)[0];
      var first = app.querySelector('[data-qbox="' + sid(k) + '"] input');
      if (first) first.focus();
      announce('Falta una respuesta. ' + S.errors[k]);
      return;
    }
    var cur = S.screen;
    S.notice = null;
    commitDraft();
    var nx = neighbour(cur, 1);
    if (!nx && !screenObj(cur)) nx = firstIncomplete();
    if (nx) goScreen(nx, true);
    else if (DC.isComplete(S.answers)) showReport();
    else { var fi = firstIncomplete(); if (fi) goScreen(fi, true); else showReport(); }
  }

  function onBack() {
    var cur = S.screen;
    commitDraft();
    var pv = neighbour(cur, -1);
    if (pv) goScreen(pv, true);
    else { S.mode = 'intro'; render(true); }
  }

  function showReport() { S.mode = 'report'; S.fromReview = false; S.confirmReset = false; S.actionMsg = ''; S.notice = null; render(true); }

  /* ---------- Edición del borrador ---------- */
  function onChoice(key, optId, checked) {
    var def = DC.def(key), dr = S.draft[key];
    if (def.type === 'single') {
      Object.keys(dr.texts).forEach(function (x) { if (x !== optId) delete dr.texts[x]; });
      dr.v = optId;
    } else {
      var opts = DC.optionsFor(key, S.answers);
      var find = function (id) { return opts.filter(function (o) { return o.id === id; })[0]; };
      var opt = find(optId);
      if (checked) {
        if (opt.exclusive) {
          if (dr.v.filter(function (x) { return x !== optId; }).length) announce('Se han desmarcado las demás opciones: «' + opt.label + '» no se combina con ellas.');
          dr.v = [optId];
        } else {
          var drop = dr.v.filter(function (x) {
            var o = find(x);
            return (o && o.exclusive) || (opt.incompatible || []).indexOf(x) !== -1 || (o && (o.incompatible || []).indexOf(optId) !== -1);
          });
          if (drop.length) announce('Se ha desmarcado «' + find(drop[0]).label + '» porque no se combina con «' + opt.label + '».');
          dr.v = dr.v.filter(function (x) { return drop.indexOf(x) === -1; });
          if (!def.max || dr.v.length < def.max) dr.v.push(optId);
          if (def.max && dr.v.length >= def.max) announce('Has elegido el máximo de ' + def.max + '. Desmarca una para cambiarla.');
        }
      } else dr.v = dr.v.filter(function (x) { return x !== optId; });
      var keep = def.extraText ? def.extraText.key : null;
      Object.keys(dr.texts).forEach(function (x) { if (x !== keep && dr.v.indexOf(x) === -1) delete dr.texts[x]; });
      if (def.extraText && !def.extraText.showIf.some(function (h) { return dr.v.indexOf(h) !== -1; })) delete dr.texts[keep];
    }
    delete S.errors[key];
    render(false, 'opt-' + sid(key) + '-' + optId);
  }

  /* ---------- Progreso ---------- */
  function setProgress() {
    var box = document.getElementById('progress');
    if (S.mode !== 'q') { box.hidden = true; return; }
    box.hidden = false;
    var d = DC.derive(S.answers);
    var p = DC.path(S.answers, d);
    var pos = p.map(function (s) { return s.id; }).indexOf(S.screen) + 1;
    var estimated = p.some(function (s) { return s.estimate; });
    var pct = Math.round((pos - 1) / p.length * 100);
    document.getElementById('progress-text').textContent = 'Pantalla ' + pos + ' de ' + (estimated ? 'unas ' : '') + p.length + (estimated ? ' (depende de tus respuestas)' : '');
    document.getElementById('progress-bar').setAttribute('aria-valuenow', pct);
    document.getElementById('progress-fill').style.width = pct + '%';
  }

  function render(focusHeading, focusId) {
    setProgress();
    app.innerHTML = S.mode === 'intro' ? introHTML() : S.mode === 'q' ? screenHTML() : S.mode === 'report' ? reportScreenHTML() : reviewHTML();
    bind();
    if (focusId) { var el = document.getElementById(focusId); if (el) el.focus(); }
    else if (focusHeading) {
      var h = app.querySelector('h1');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
      window.scrollTo(0, 0);
    }
  }

  function introHTML() {
    return '<div class="intro narrow">' +
      '<h1>Descubre qué podría facilitar tu día a día</h1>' +
      '<p>Responde unas preguntas sobre cómo haces algunas cosas cotidianas. Al terminar verás una propuesta orientativa de ayuda, basada en tus respuestas. No necesitas saber de tecnología ni tener una idea de aplicación.</p>' +
      '<p class="note">Piensa en las últimas dos semanas, salvo que indiquemos otra cosa. No incluyas información privada en los campos opcionales.</p>' +
      '<ul class="facts"><li>Duración prevista: unos 10 minutos (pendiente de comprobar)</li><li>Se responde con clics; escribir es opcional</li><li>Tus respuestas no salen de esta página</li></ul>' +
      '<button type="button" class="btn-primary" data-act="start">Empezar</button>' +
      '<p class="disclaimer">Es un cuestionario exploratorio, no un diagnóstico ni un instrumento validado científicamente.</p></div>';
  }

  function hintFor(def) {
    if (def.type === 'single') return '<span class="hint-ico" aria-hidden="true">◯</span><span><b>Elige una opción</b></span>';
    if (def.type === 'multi') return '<span class="hint-ico" aria-hidden="true">☐</span><span><b>' + (def.max ? 'Puedes elegir hasta ' + def.max : 'Puedes elegir varias') + '</b></span>';
    return '<span><b>Opcional</b></span>';
  }

  function helpHTML(h) {
    if (!h) return '';
    var o = '<aside class="qhelp" aria-label="Ayuda para responder">';
    if (h.explain) o += '<p>' + esc(h.explain) + '</p>';
    if (h.examples) o += '<p class="ex-label">Ejemplos</p><p class="ex">' + esc(h.examples) + '</p>';
    if (h.note) o += '<p class="ex-note">' + esc(h.note) + '</p>';
    return o + '</aside>';
  }

  function textField(id, label, max, value, dataText, dataKey, cls) {
    return '<div class="textfield ' + (cls || '') + '"><label for="' + id + '">' + esc(label) + '</label>' +
      '<input type="text" id="' + id + '" maxlength="' + max + '" value="' + esc(value) + '" data-text="' + esc(dataText) + '" data-key="' + esc(dataKey) + '" aria-describedby="' + id + '-c">' +
      '<span class="counter" id="' + id + '-c">' + value.length + ' / ' + max + ' caracteres</span></div>';
  }

  function optionsHTML(key, def, opts, dr) {
    var multi = def.type === 'multi', full = def.max && dr.v.length >= def.max, h = '';
    opts.forEach(function (o) {
      var checked = multi ? dr.v.indexOf(o.id) !== -1 : dr.v === o.id;
      var disabled = multi && !checked && full && !o.exclusive;
      var id = 'opt-' + sid(key) + '-' + o.id;
      var tag = multi && o.exclusive ? 'Si la marcas, se desmarcan las demás' : '';
      h += '<label class="opt ' + (multi ? 'check' : 'radio') + '" for="' + id + '">' +
        '<input type="' + (multi ? 'checkbox' : 'radio') + '" id="' + id + '" name="' + sid(key) + '" value="' + esc(o.id) + '"' +
        (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + ' data-q="' + esc(key) + '" data-opt="' + esc(o.id) + '">' +
        '<span class="mark" aria-hidden="true"></span><span class="lbl">' + esc(o.label) + (tag ? '<span class="tag">' + tag + '</span>' : '') + '</span>' +
        (checked ? '<span class="sel-state" aria-hidden="true">Elegida</span>' : '') + '</label>';
      if (o.textField && checked) h += textField('txt-' + sid(key) + '-' + o.id, o.textField.label, o.textField.max, dr.texts[o.id] || '', key, o.id, 'inline');
    });
    return h;
  }

  function questionBlock(key, single, d) {
    var def = DC.def(key), dr = S.draft[key], title = DC.titleFor(key, S.answers, d), err = S.errors[key];
    var hid = 'h-' + sid(key), hintId = 'hint-' + sid(key), errId = 'err-' + sid(key);
    if (def.type === 'text') {
      var tid = 'txt-' + sid(key);
      return '<div data-qbox="' + sid(key) + '"><div class="textfield"><label for="' + tid + '">Escribe aquí (opcional)</label>' +
        '<textarea id="' + tid + '" maxlength="' + def.max + '" data-text="' + esc(key) + '" data-key="__v" aria-describedby="' + tid + '-c ' + hid + '">' + esc(dr.v || '') + '</textarea>' +
        '<span class="counter" id="' + tid + '-c">' + (dr.v || '').length + ' / ' + def.max + ' caracteres</span></div></div>';
    }
    if (def.type === 'clarify') return clarifyBlock(key, d);
    var opts = DC.optionsFor(key, S.answers, d), full = def.max && dr.v.length >= def.max;
    var optional = DC.OPTIONAL_KEYS.indexOf(DC.baseOf(key)) !== -1;
    var h = '<fieldset data-qbox="' + sid(key) + '" aria-describedby="' + hintId + (err ? ' ' + errId : '') + '"' + (err ? ' aria-invalid="true"' : '') + (single ? ' aria-labelledby="' + hid + '"' : '') + '>';
    if (!single) h += '<legend class="subq">' + esc(title) + '</legend>';
    h += '<p class="hint" id="' + hintId + '">' + hintFor(def) + (optional ? '<span>(opcional)</span>' : '') + (full ? '<span>· Has llegado al máximo; desmarca una para cambiarla.</span>' : '') + '</p>';
    h += '<div class="opts' + (def.compact ? ' compact' : '') + '">' + optionsHTML(key, def, opts, dr) + '</div>';
    if (def.extraText && def.extraText.showIf.some(function (x) { return dr.v.indexOf(x) !== -1; })) {
      h += textField('txt-' + sid(key) + '-' + def.extraText.key, def.extraText.label, def.extraText.max, dr.texts[def.extraText.key] || '', key, def.extraText.key, 'spaced');
    }
    h += '<p class="error" id="' + errId + '"' + (err ? '' : ' hidden') + '><span aria-hidden="true">⚠</span> <span>Falta una respuesta: ' + esc(err || '') + '</span></p></fieldset>';
    return h;
  }

  function clarifyBlock(key, d) {
    var n = DC.routeOf(key), dr = S.draft[key], h = '';
    DC.contradictions(S.answers, d, n).forEach(function (c) {
      var name = sid(key) + '-' + c.id;
      h += '<fieldset data-qbox="' + sid(key) + '"><legend class="subq">' + esc(c.text(S.answers, d, n)) + '</legend><p class="hint">' + hintFor({ type: 'single' }) + '<span>(opcional)</span></p><div class="opts">';
      c.options.forEach(function (o) {
        var id = 'opt-' + name + '-' + o.id, checked = dr.v[c.id] === o.id;
        h += '<label class="opt radio" for="' + id + '"><input type="radio" id="' + id + '" name="' + name + '" data-clarkey="' + esc(key) + '" data-clar="' + c.id + '" value="' + o.id + '"' + (checked ? ' checked' : '') + '>' +
          '<span class="mark" aria-hidden="true"></span><span class="lbl">' + esc(o.label) + '</span>' + (checked ? '<span class="sel-state" aria-hidden="true">Elegida</span>' : '') + '</label>';
      });
      h += '</div></fieldset>';
    });
    return h;
  }

  function contextLine(key, d) {
    var n = DC.routeOf(key);
    if (!n) return '';
    var r = DC.routeObj(d, n);
    if (!r) return '';
    var t = DC.val(S.answers, DC.K(n, 'q6'));
    var about = (n === 2 ? 'Segunda situación · ' : '') + 'Sobre: ' + DC.SITUATIONS[r.situation].short.toLowerCase();
    if (t && DC.baseOf(key) !== 'q6' && DC.baseOf(key) !== 'q5') {
      about = (n === 2 ? 'Segunda situación · ' : '') + (r.situation === 'G' ? 'Lo que más te cuesta: ' : 'Sobre la tarea: ') +
        (t === 'otra' ? (DC.text(S.answers, DC.K(n, 'q6'), 'otra') || 'otra tarea') : DC.labelOf(DC.K(n, 'q6'), t, S.answers, d).toLowerCase());
    }
    return '<p class="about">' + esc(about) + '</p>';
  }

  function screenHTML() {
    var scr = screenObj(S.screen), d = DC.derive(S.answers);
    var first = scr.qs[0], def = DC.def(first);
    var help = null;
    scr.qs.forEach(function (k) { if (!help) help = DC.helpFor(k, S.answers, d); });
    var isClar = def.type === 'clarify';
    var single = scr.qs.length === 1 && !isClar;
    var head = '<p class="eyebrow">' + esc(def.section) + (def.sectionStep ? ' · ' + esc(def.sectionStep) : '') + '</p>';
    if (S.notice) head += '<div class="notice" role="status"><strong>Aviso:</strong> <span>' + esc(S.notice) + '</span></div>';
    if (DC.baseOf(first) === 'q5' && DC.routeOf(first) === 1 && d.r1 && d.r1.source === 'freq') {
      head += '<div class="notice"><span>Exploramos «' + esc(DC.SITUATIONS[d.r1.situation].short) + '» por ser la más frecuente, como criterio provisional.</span> <button type="button" class="btn-link" data-act="change-sit">Elegir otra</button></div>';
    }
    head += contextLine(first, d);
    if (isClar) head += '<h1>Antes del informe, una aclaración opcional</h1><p class="muted">Algunas respuestas parecen no encajar entre sí. No las corregimos por ti: puedes aclararlo o continuar sin responder.</p>';
    else if (single) head += '<h1 id="h-' + sid(first) + '">' + esc(DC.titleFor(first, S.answers, d)) + '</h1>';
    else head += '<h1>' + esc(DC.titleFor(first, S.answers, d)) + '</h1>';

    var body = '';
    if (single || isClar) body += questionBlock(first, true, d);
    else scr.qs.forEach(function (k, i) { body += i === 0 ? questionBlock(k, true, d).replace('aria-labelledby', 'data-x') : questionBlock(k, false, d); });

    var isLast = !neighbour(S.screen, 1);
    var nav = '<div class="nav"><button type="button" class="btn-ghost" data-act="back">Atrás</button><div class="right">';
    if (S.fromReview && DC.isComplete(S.answers) && !isLast) nav += '<button type="button" class="btn-ghost" data-act="toreport">Volver al informe</button>';
    nav += '<button type="submit" class="btn-primary">' + (isLast && DC.isComplete(Object.assign({}, S.answers)) ? 'Ver informe' : 'Continuar') + '</button></div></div>';

    return '<form id="qform" novalidate><div class="qlayout' + (help ? ' has-help' : '') + '">' +
      '<div class="qhead">' + head + '</div>' + helpHTML(help) + '<div class="qbody">' + body + nav + '</div></div></form>';
  }

  /* ---------- Informe ---------- */
  function list(items) { return '<ul>' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }

  function statusHTML(st) {
    return '<div class="status ' + st.level + '"><span class="sym">' + esc(st.symbol) + '</span><div><p class="st-label"><strong>' + esc(st.label) + '.</strong></p><p class="st-reason">' + esc(st.reason) + '</p></div></div>';
  }

  function commentHTML(c, mainExplored) {
    if (!c) return '';
    var h = '<section class="comment"><h2>' + (c.pending ? 'Información adicional pendiente de explorar' : 'Tu comentario') + '</h2>';
    h += '<p class="quote">«' + esc(c.text) + '»</p>';
    var rows = [];
    if (c.classification) rows.push(['La experiencia que describes', 'La has relacionado con: ' + c.classification + '.']);
    else if (c.relation === 'misma') rows.push(['La experiencia que describes', 'La has relacionado con la situación explorada.']);
    else if (c.hasExperience) rows.push(['La experiencia que describes', 'Indicaste que describe una dificultad o algo que quieres hacer.']);
    if (c.hasIdea) rows.push(['La solución que imaginas', 'Tu comentario incluye una idea de cómo resolverlo. La tomamos como una pista, no como una recomendación validada.']);
    var falta = (c.question ? [c.question] : []).concat(c.checks);
    if (falta.length) rows.push(['Lo que falta comprobar', falta.join(' ')]);
    if (rows.length) {
      h += '<dl class="triad">';
      rows.forEach(function (r) { h += '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; });
      h += '</dl>';
    }
    if (c.pending) h += '<p class="muted">No la hemos convertido en una recomendación porque todavía no se ha explorado.</p>';
    return h + '</section>';
  }

  function fnHTML(f) {
    return '<li><span class="fn-text">' + esc(f.text) + '</span><dl class="fn-just">' +
      '<dt>Se basa en</dt><dd>' + esc(f.evidence) + '</dd>' +
      '<dt>Pretende aliviar</dt><dd>' + esc(f.relieves) + '</dd>' +
      '<dt>Falta comprobar</dt><dd>' + esc(f.check) + '</dd></dl></li>';
  }

  function routeHTML(m) {
    var h = '';
    var proposal = m.status.level === 'ok' || m.status.level === 'plausible';
    h += '<section><h2>Situación explorada</h2><p>' + esc(m.summary) + '</p></section>';
    h += '<section><h2>Evidencia</h2><span class="label-said">Has indicado</span>' + list(m.evidence) + '</section>';
    h += '<section><h2>Posible ayuda</h2><span class="label-infer">' + (proposal ? 'Hipótesis' : 'Valoración') + '</span><div class="proposal"><p>' + esc(m.hypothesis) + '</p>' +
      (m.extraHypothesis ? '<p class="muted">' + esc(m.extraHypothesis) + '</p>' : '');
    if (m.candidates && m.candidates.length) {
      h += '<ul class="hyps">' + m.candidates.map(function (c) { return '<li><strong>' + esc(c.label) + ':</strong> ' + esc(c.idea) + ' <span class="muted">Encajaría ' + esc(c.when) + '.</span></li>'; }).join('') + '</ul>';
    }
    if (m.hyps && m.hyps.length) {
      h += (m.candidates ? '<p class="sub">Además, por lo que indicaste sobre la ayuda que necesitas:</p>' : '') +
        '<ul class="hyps">' + m.hyps.map(function (c) { return '<li><strong>' + esc(c.label) + ':</strong> ' + esc(c.idea) + '</li>'; }).join('') + '</ul>';
    }
    h += '</div>';
    h += '<dl class="kv"><dt>Formato</dt><dd>' + esc(m.format) + '</dd></dl>';
    if (m.formatNote) h += '<p class="muted small">' + esc(m.formatNote) + '</p>';
    if (m.inferences.length) h += '<p class="sub">Esto sugiere:</p>' + list(m.inferences);
    if (m.requirements.length) h += '<p class="sub">Condiciones que tendría que cumplir cualquier ayuda:</p>' + list(m.requirements);
    if (m.checks.length) h += '<p class="sub">Antes de construir nada, falta comprobar:</p>' + list(m.checks);
    h += '</section>';
    h += '<section><h2>Primera prueba</h2>';
    if (m.trialSteps.length) {
      h += '<p>Antes de construir una herramienta, una prueba con ejemplos reales:</p><ol class="steps">' + m.trialSteps.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>';
      if (m.firstTest.length) h += '<p class="sub">' + (m.firstTest.length === 1 ? 'Función que se probaría:' : 'Funciones que se probarían:') + '</p><ol class="features">' + m.firstTest.map(fnHTML).join('') + '</ol>';
    } else h += '<p>' + esc(m.firstTestNote) + '</p>';
    h += '</section>';
    h += '<section><h2>Pregunta pendiente más importante</h2>' + (m.question ? '<p class="ask">' + esc(m.question) + '</p>' : '<p>Ninguna esencial para esta situación.</p>') +
      (m.pendingPoints.length ? '<p class="sub">Otros puntos pendientes:</p>' + list(m.pendingPoints) : '') + '</section>';
    h += '<section><h2>Cómo comprobar si ayuda</h2>' + (m.measures.length ? list(m.measures) : '<p>No aplica mientras no haya una propuesta que probar.</p>') + '</section>';
    h += '<section><h2>Estado de la propuesta</h2>' + statusHTML(m.status) + '</section>';
    return h;
  }

  function reportBody(rep, withAnswers) {
    var h = '';
    if (rep.main) h += routeHTML(rep.main);
    else h += '<section><h2>Situación explorada</h2><p>' + esc(rep.empty.text) + '</p></section><section><h2>Estado</h2>' + statusHTML(rep.empty.status) + '</section>';
    if (rep.previous) {
      var p = rep.previous;
      h += '<section class="prev"><h2>Situación explorada antes</h2><p><strong>' + esc(p.situationLabel) + '.</strong> ' + esc(p.summary.replace(/^Situación: [^.]*\.\s*/, '')) + '</p>' +
        '<p>' + esc(p.hypothesis) + '</p>' + (p.extraHypothesis ? '<p class="muted">' + esc(p.extraHypothesis) + '</p>' : '') +
        (p.question ? '<p class="muted">Pregunta pendiente: ' + esc(p.question) + '</p>' : '') + statusHTML(p.status) + '</section>';
    }
    h += commentHTML(rep.comment);
    if (rep.pending.length) {
      h += '<section><h2>Otras situaciones pendientes</h2><p class="muted">Indicaste que te causaron una dificultad, pero no las hemos explorado.</p><ul>' +
        rep.pending.map(function (s) { return '<li><strong>' + esc(s.short) + '.</strong> <span class="muted">Para explorarla: ' + esc(s.question) + '</span></li>'; }).join('') + '</ul></section>';
    }
    h += '<p class="disclaimer">' + esc(rep.scopeNote) + ' Informe orientativo generado con reglas fijas a partir de tus respuestas, sin inteligencia artificial. El cuestionario es exploratorio: no es un diagnóstico ni un instrumento validado.</p>';
    if (withAnswers) {
      h += '<section><h2>Tus respuestas</h2><ul class="answers">' + DC.summary(S.answers).map(function (r) {
        return '<li><span class="q">' + esc(r.title) + '</span><br><strong>' + esc(r.answer) + '</strong></li>';
      }).join('') + '</ul></section>';
    }
    return h;
  }

  function reportScreenHTML() {
    var rep = DC.buildReport(S.answers);
    var h = '<div class="report narrow"><p class="eyebrow">Informe orientativo</p><h1>Tu propuesta de ayuda</h1>' +
      '<div class="actions"><button type="button" class="btn-ghost" data-act="review">Revisar mis respuestas</button>' +
      '<button type="button" class="btn-ghost" data-act="download">Descargar informe</button>' +
      '<button type="button" class="btn-ghost" data-act="print">Imprimir / guardar como PDF</button>' +
      '<button type="button" class="btn-ghost" data-act="reset">Empezar de nuevo</button></div>';
    if (S.actionMsg) h += '<p class="actions-msg" role="status">' + esc(S.actionMsg) + '</p>';
    if (S.confirmReset) h += '<div class="confirm" role="alert"><span>¿Empezar de nuevo? Se borrarán todas tus respuestas de esta página.</span>' +
      '<button type="button" class="btn-primary" data-act="reset-yes">Sí, borrar y empezar</button><button type="button" class="btn-ghost" data-act="reset-no">Cancelar</button></div>';
    return h + reportBody(rep, false) + '</div>';
  }

  function reviewHTML() {
    var h = '<div class="narrow"><p class="eyebrow">Tus respuestas</p><h1>Revisar mis respuestas</h1>' +
      '<p class="muted">Si cambias una respuesta que decide qué se explora, se quitarán solo las respuestas específicas que dejen de aplicar.</p><ul class="review-list">';
    DC.summary(S.answers).forEach(function (r) {
      h += '<li><span class="q">' + esc(r.title) + '</span><button type="button" class="btn-link" data-goto="' + esc(r.screen) + '" aria-label="Cambiar: ' + esc(r.title) + '">Cambiar</button><span class="a">' + esc(r.answer) + '</span></li>';
    });
    return h + '</ul><button type="button" class="btn-primary" data-act="toreport">Volver al informe</button></div>';
  }

  /* ---------- Exportación ---------- */
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function exportHTML() {
    var rep = DC.buildReport(S.answers);
    var css = 'body{font-family:"Atkinson Hyperlegible","Segoe UI",system-ui,sans-serif;color:#18221f;background:#fff;max-width:44rem;margin:0 auto;padding:24px 16px 48px;line-height:1.55;font-size:16px}' +
      'h1,h2{font-family:"Bricolage Grotesque","Segoe UI",system-ui,sans-serif;line-height:1.2}h1{font-size:1.8rem;margin:.2em 0 .6em}h2{font-size:1.2rem;margin:0 0 8px}' +
      'section{border-top:1px solid #d3d9d1;padding:16px 0}.muted,.disclaimer,.why{color:#56625d}.disclaimer{font-size:.88rem}.small{font-size:.9rem}.sub{font-weight:700;margin:12px 0 4px}' +
      '.label-said,.label-infer{display:inline-block;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:2px 8px;border-radius:4px;margin-bottom:6px}.label-said{background:#e2efe8;color:#1d5c47}.label-infer{border:1px dashed #56625d;color:#56625d}' +
      '.proposal{border:1.5px solid #1d5c47;border-radius:10px;padding:10px 16px;margin-bottom:10px}.kv,.triad{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px}.kv dd,.triad dd{margin:0}.kv dd{font-weight:700}.kv dt,.triad dt{color:#56625d}' +
      '.fn-just{display:grid;grid-template-columns:max-content 1fr;gap:2px 12px;font-size:.9rem;margin:4px 0}.fn-just dt{color:#56625d}.fn-just dd{margin:0}.fn-text{font-weight:700}.features li{margin-bottom:8px}.why{display:block;font-size:.9rem}.status{border:1.5px solid #56625d;border-radius:10px;padding:10px 16px;display:flex;gap:12px}.status p{margin:0 0 4px}.sym{font-weight:700;text-transform:uppercase;font-size:.72rem;border:1.5px solid currentColor;border-radius:4px;padding:2px 8px;height:fit-content;white-space:nowrap}' +
      '.ask{border-left:3px solid #1d5c47;padding-left:12px;font-weight:700}.quote{font-style:italic;border-left:3px solid #d3d9d1;padding-left:12px}.answers{padding-left:1.1rem}.answers li{margin-bottom:8px}.answers .q{color:#56625d;font-size:.92rem}' +
      '.top{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px}.brand{font-family:"Bricolage Grotesque",system-ui,sans-serif;font-weight:700}' +
      'button{font:inherit;font-weight:700;padding:10px 18px;border-radius:8px;border:0;background:#1d5c47;color:#fff;cursor:pointer;margin:6px 0 10px}' +
      '@media (max-width:480px){.kv,.triad{grid-template-columns:1fr}}@media print{.no-print{display:none}body{padding:0;font-size:11pt}section{break-inside:avoid}}';
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Informe orientativo · Dinerocorp</title><style>' + css + '</style></head><body>' +
      '<div class="top"><span class="brand">Dinerocorp</span><span class="muted">Informe orientativo · ' + today() + '</span></div>' +
      '<h1>Tu propuesta de ayuda</h1><button class="no-print" onclick="window.print()">Imprimir / guardar como PDF</button>' +
      reportBody(rep, true) + '</body></html>';
  }

  var dlNs;
  function getDownloads() {
    if (!window.claude || typeof window.claude.use !== 'function') return Promise.resolve(null);
    if (!dlNs) dlNs = window.claude.use('downloads').catch(function () { return null; });
    return dlNs;
  }
  function inFrame() { try { return window.self !== window.top; } catch (e) { return true; } }
  function setMsg(m) { S.actionMsg = m; render(false); announce(m); }

  function doDownload() {
    var html = exportHTML(), filename = 'informe-dinerocorp-' + today() + '.html';
    function fallback() {
      try {
        var url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        var a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        setMsg('Descarga iniciada: ' + filename + '. Al abrirlo encontrarás un botón para imprimirlo o guardarlo como PDF.');
      } catch (e) { setMsg('No se ha podido descargar el informe en esta vista.'); }
    }
    getDownloads().then(function (dl) {
      if (!dl) return fallback();
      dl.save({ filename: filename, data: html }).then(function () {
        setMsg('Informe descargado. Al abrirlo encontrarás un botón para imprimirlo o guardarlo como PDF.');
      }, function (e) {
        if (e && e.code === 'declined') setMsg('Descarga cancelada.');
        else if (e && e.code === 'rate_limited') setMsg('Ya hay una descarga pendiente de confirmar.');
        else fallback();
      });
    });
  }

  function doPrint() {
    if (inFrame()) { setMsg('Desde esta vista no se puede abrir el diálogo de impresión. Descarga el informe: al abrirlo encontrarás un botón para imprimirlo o guardarlo como PDF.'); return; }
    window.print();
  }

  /* ---------- Eventos ---------- */
  function bind() {
    var form = document.getElementById('qform');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); onContinue(); });
    app.querySelectorAll('input[data-opt]').forEach(function (inp) {
      inp.addEventListener('change', function () { onChoice(inp.dataset.q, inp.dataset.opt, inp.checked); });
    });
    app.querySelectorAll('input[data-clar]').forEach(function (inp) {
      inp.addEventListener('change', function () { S.draft[inp.dataset.clarkey].v[inp.dataset.clar] = inp.value; render(false, inp.id); });
    });
    app.querySelectorAll('[data-text]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var k = inp.dataset.text, x = inp.dataset.key;
        if (x === '__v') S.draft[k].v = inp.value; else S.draft[k].texts[x] = inp.value;
        var c = document.getElementById(inp.id + '-c');
        if (c) c.textContent = inp.value.length + ' / ' + inp.maxLength + ' caracteres';
      });
    });
    app.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.dataset.act;
        if (act === 'start') { S.notice = null; goScreen(firstIncomplete() || 'q1', true); }
        else if (act === 'back') { S.notice = null; onBack(); }
        else if (act === 'change-sit') { commitDraft(); S.notice = null; goScreen(screenObj('q4c') ? 'q4c' : 'q4', true); }
        else if (act === 'toreport') {
          if (S.mode === 'q') { if (!validate()) { render(); return; } commitDraft(); }
          if (DC.isComplete(S.answers)) showReport(); else goScreen(firstIncomplete(), true);
        }
        else if (act === 'review') { S.mode = 'review'; S.actionMsg = ''; render(true); }
        else if (act === 'download') doDownload();
        else if (act === 'print') doPrint();
        else if (act === 'reset') { S.confirmReset = true; render(false); var y = app.querySelector('[data-act="reset-yes"]'); if (y) y.focus(); }
        else if (act === 'reset-no') { S.confirmReset = false; render(false); }
        else if (act === 'reset-yes') { S.answers = {}; S.mode = 'intro'; S.confirmReset = false; S.actionMsg = ''; S.notice = null; render(true); announce('Respuestas borradas.'); }
      });
    });
    app.querySelectorAll('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { S.fromReview = true; S.notice = null; goScreen(b.dataset.goto, true); });
    });
  }

  window.DC_APP = { state: function () { return S; }, exportHTML: exportHTML };
  render(false);
})();
