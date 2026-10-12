/* =====================================================================
   INTERFAZ
   Las respuestas solo viven en la memoria de esta página: no se envían
   a ningún servidor ni se guardan en el navegador. Al cerrar o recargar
   la página se pierden, salvo que la persona descargue el informe.
   ===================================================================== */
(function () {
  var S = {
    answers: {}, mode: 'intro', screen: null, draft: {},
    notice: null, fromReview: false, confirmReset: false, actionMsg: '', errors: {}
  };
  var app = document.getElementById('app');
  var live = document.getElementById('live');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function announce(msg) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- Navegación ---------- */
  var ORDER = DC.SCREENS.map(function (s) { return s.id; });
  function gi(id) { return ORDER.indexOf(id); }

  function nextScreen(fromId) {
    var path = DC.path(S.answers);
    var g = gi(fromId);
    var nx = path.filter(function (s) { return gi(s.id) > g; })[0];
    return nx ? nx.id : null;
  }
  function prevScreen(fromId) {
    var path = DC.path(S.answers);
    var g = gi(fromId);
    var pv = path.filter(function (s) { return gi(s.id) < g; });
    return pv.length ? pv[pv.length - 1].id : null;
  }
  function firstIncomplete() {
    var p = DC.path(S.answers).filter(function (s) { return !DC.screenDone(s, S.answers); })[0];
    return p ? p.id : null;
  }

  function goScreen(id, opts) {
    S.mode = 'q'; S.screen = id; S.errors = {};
    var scr = DC.screenById(id);
    S.draft = {};
    scr.qs.forEach(function (q) {
      S.draft[q] = S.answers[q] ? { v: clone(S.answers[q].v), texts: clone(S.answers[q].texts || {}) } : emptyDraft(q);
    });
    /* Ruta de actividades: preselecciona la tarea equivalente (se puede cambiar) */
    if (id === 'q6' && !S.answers.q6) {
      var d = DC.derive(S.answers);
      if (d.source === 'alt' && DC.ALT_TO_TASK[d.alt] && DC.ALT_TO_TASK[d.alt] !== 'otra') S.draft.q6.v = DC.ALT_TO_TASK[d.alt];
    }
    render(opts && opts.focus);
  }

  function emptyDraft(q) {
    var t = DC.QUESTIONS[q].type;
    if (t === 'multi') return { v: [], texts: {} };
    if (t === 'clarify') return { v: {}, texts: {} };
    if (t === 'text') return { v: '', texts: {} };
    return { v: null, texts: {} };
  }

  function commitDraft() {
    var scr = DC.screenById(S.screen);
    var before = Object.keys(S.answers).length;
    scr.qs.forEach(function (q) {
      var dr = S.draft[q]; if (!dr) return;
      var t = DC.QUESTIONS[q].type;
      var empty = t === 'multi' ? !dr.v.length : (t === 'single' ? !dr.v : false);
      if (t === 'text') dr.v = (dr.v || '').trim();
      Object.keys(dr.texts).forEach(function (k) { dr.texts[k] = (dr.texts[k] || '').trim(); if (!dr.texts[k]) delete dr.texts[k]; });
      if (empty) delete S.answers[q];
      else DC.commit(S.answers, q, dr.v, dr.texts);
    });
    var removed = DC.prune(S.answers).filter(function (q) { return scr.qs.indexOf(q) === -1; });
    if (removed.length) {
      S.notice = removed.length === 1
        ? 'Hemos quitado 1 respuesta posterior que ya no aplica tras tu cambio.'
        : 'Hemos quitado ' + removed.length + ' respuestas posteriores que ya no aplican tras tu cambio.';
    }
    return before;
  }

  function validate() {
    var scr = DC.screenById(S.screen);
    S.errors = {};
    scr.qs.forEach(function (q) {
      var t = DC.QUESTIONS[q].type;
      if (t === 'text' || t === 'clarify') return;
      var v = S.draft[q].v;
      if (Array.isArray(v) ? !v.length : !v) S.errors[q] = t === 'multi' ? 'Marca al menos una opción para continuar.' : 'Elige una opción para continuar.';
    });
    return Object.keys(S.errors).length === 0;
  }

  function onContinue() {
    if (!validate()) {
      render();
      var q = Object.keys(S.errors)[0];
      var first = app.querySelector('[data-q="' + q + '"] input');
      if (first) first.focus();
      announce('Falta una respuesta. ' + S.errors[q]);
      return;
    }
    var cur = S.screen;
    S.notice = null;
    commitDraft();
    var nx = nextScreen(cur);
    if (S.fromReview && DC.isComplete(S.answers) && !nx) { showReport(); return; }
    if (nx) goScreen(nx, { focus: true });
    else if (DC.isComplete(S.answers)) showReport();
    else { var fi = firstIncomplete(); if (fi) goScreen(fi, { focus: true }); }
  }

  function onBack() {
    var cur = S.screen;
    commitDraft();
    var pv = prevScreen(cur);
    if (pv) goScreen(pv, { focus: true });
    else { S.mode = 'intro'; render(true); }
  }

  function showReport() {
    S.mode = 'report'; S.fromReview = false; S.confirmReset = false; S.actionMsg = ''; S.notice = null;
    render(true);
  }

  /* ---------- Edición del borrador ---------- */
  function onChoice(q, optId, checked) {
    var def = DC.QUESTIONS[q];
    var dr = S.draft[q];
    if (def.type === 'single' || def.type === 'clarifyItem') {
      Object.keys(dr.texts).forEach(function (k) { if (k !== optId && k !== 'tool') delete dr.texts[k]; });
      dr.v = optId;
    } else {
      var opts = DC.optionsFor(q, S.answers);
      var opt = opts.filter(function (o) { return o.id === optId; })[0];
      if (checked) {
        if (opt && opt.exclusive) {
          var dropped = dr.v.filter(function (x) { return x !== optId; });
          dr.v = [optId];
          if (dropped.length) announce('Se han desmarcado las demás opciones porque «' + opt.label + '» es incompatible con ellas.');
        } else {
          var ex = dr.v.filter(function (x) { var o = opts.filter(function (oo) { return oo.id === x; })[0]; return o && o.exclusive; });
          if (ex.length) announce('Se ha desmarcado «' + DC.labelOf(q, ex[0], S.answers) + '».');
          dr.v = dr.v.filter(function (x) { return ex.indexOf(x) === -1; });
          if (!def.max || dr.v.length < def.max) dr.v.push(optId);
        }
      } else {
        dr.v = dr.v.filter(function (x) { return x !== optId; });
      }
      Object.keys(dr.texts).forEach(function (k) { if (k !== def.extraText?.key && dr.v.indexOf(k) === -1) delete dr.texts[k]; });
      if (def.extraText && def.extraText.hideIf && def.extraText.hideIf.some(function (h) { return dr.v.indexOf(h) !== -1; })) delete dr.texts[def.extraText.key];
      if (def.max && dr.v.length >= def.max && checked) announce('Has elegido el máximo de ' + def.max + ' opciones. Desmarca una para cambiarla.');
    }
    delete S.errors[q];
    render(false, 'opt-' + q + '-' + optId);
  }

  /* ---------- Render ---------- */
  function setProgress() {
    var box = document.getElementById('progress');
    if (S.mode !== 'q') { box.hidden = true; return; }
    box.hidden = false;
    var d = DC.derive(S.answers);
    var path = DC.path(S.answers, d);
    var idx = path.map(function (s) { return s.id; }).indexOf(S.screen);
    var pos = idx + 1, total = path.length;
    var pct = Math.round((pos - 1) / total * 100);
    document.getElementById('progress-text').textContent = 'Pantalla ' + pos + ' de ' + total + (d.route === 'pending' ? ' (aproximado: depende de tus respuestas)' : '');
    var bar = document.getElementById('progress-bar');
    bar.setAttribute('aria-valuenow', pct);
    document.getElementById('progress-fill').style.width = pct + '%';
  }

  function render(focusHeading, focusId) {
    setProgress();
    if (S.mode === 'intro') app.innerHTML = introHTML();
    else if (S.mode === 'q') app.innerHTML = screenHTML();
    else if (S.mode === 'report') app.innerHTML = reportScreenHTML();
    else if (S.mode === 'review') app.innerHTML = reviewHTML();
    bind();
    if (focusId) { var el = document.getElementById(focusId); if (el) el.focus(); }
    else if (focusHeading) {
      var h = app.querySelector('h1');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
      window.scrollTo(0, 0);
    }
  }

  function introHTML() {
    return '<div class="intro">' +
      '<h1>Descubre qué podría facilitar tu día a día</h1>' +
      '<p>Responde unas preguntas sobre cómo haces algunas cosas cotidianas. Al terminar verás una propuesta orientativa de ayuda, basada en tus respuestas. No necesitas saber de tecnología ni tener una idea de aplicación.</p>' +
      '<p class="note">Piensa en las últimas dos semanas, salvo que indiquemos otra cosa. No incluyas información privada en los campos opcionales.</p>' +
      '<ul class="facts"><li>Duración prevista: 5–10 minutos</li><li>Ningún campo de texto es obligatorio</li><li>Tus respuestas no salen de esta página</li></ul>' +
      '<button type="button" class="btn-primary" data-act="start">Empezar</button>' +
      '<p class="disclaimer">Es un cuestionario exploratorio, no un diagnóstico ni un instrumento validado científicamente.</p>' +
      '</div>';
  }

  function hintFor(def) {
    if (def.type === 'single') return '<span aria-hidden="true">◯</span> <span><b>Elige una opción</b></span>';
    if (def.type === 'multi') return '<span aria-hidden="true">☐</span> <span><b>' + (def.max ? 'Puedes elegir hasta ' + def.max : 'Puedes elegir varias') + '</b></span>';
    return '<span><b>Opcional</b></span>';
  }

  function optionHTML(q, def, o, dr, name, disabledFull) {
    var multi = def.type === 'multi';
    var checked = multi ? dr.v.indexOf(o.id) !== -1 : dr.v === o.id;
    var disabled = multi && !checked && disabledFull && !o.exclusive;
    var id = 'opt-' + name + '-' + o.id;
    var h = '<label class="opt ' + (multi ? 'check' : 'radio') + '" for="' + id + '">' +
      '<input type="' + (multi ? 'checkbox' : 'radio') + '" id="' + id + '" name="' + esc(name) + '" value="' + esc(o.id) + '"' +
      (checked ? ' checked' : '') + (disabled ? ' disabled aria-disabled="true"' : '') +
      ' data-q="' + q + '" data-opt="' + esc(o.id) + '"' + '>' +
      '<span class="mark" aria-hidden="true"></span>' +
      '<span class="lbl">' + esc(o.label) + (o.exclusive && multi ? '<span class="tag">Si la marcas, se desmarcan las demás</span>' : '') + '</span>' +
      (checked ? '<span class="sel-state" aria-hidden="true">Elegida</span>' : '') +
      '</label>';
    if (o.textField && checked) {
      var tv = dr.texts[o.id] || '';
      var tid = 'txt-' + q + '-' + o.id;
      h += '<div class="textfield inline"><label for="' + tid + '">' + esc(o.textField.label) + '</label>' +
        '<input type="text" id="' + tid + '" maxlength="' + o.textField.max + '" value="' + esc(tv) + '" data-text="' + q + '" data-key="' + o.id + '" aria-describedby="' + tid + '-c">' +
        '<span class="counter" id="' + tid + '-c">' + tv.length + ' / ' + o.textField.max + ' caracteres</span></div>';
    }
    return h;
  }

  function questionBlock(q, single) {
    var def = DC.QUESTIONS[q];
    var d = DC.derive(S.answers);
    var dr = S.draft[q];
    var title = DC.titleFor(q, S.answers, d);
    var hid = 'h-' + q, hintId = 'hint-' + q, errId = 'err-' + q;
    var h = '';
    var err = S.errors[q];
    if (def.type === 'text') {
      var tid = 'txt-' + q;
      h += single ? '<h1 id="' + hid + '">' + esc(title) + '</h1>' : '<h2>' + esc(title) + '</h2>';
      h += '<div class="textfield"><label for="' + tid + '">' + esc(def.help || 'Opcional') + '</label>' +
        '<textarea id="' + tid + '" maxlength="' + def.max + '" data-text="' + q + '" data-key="__v" aria-describedby="' + tid + '-c">' + esc(dr.v || '') + '</textarea>' +
        '<span class="counter" id="' + tid + '-c">' + (dr.v || '').length + ' / ' + def.max + ' caracteres</span></div>';
      return h;
    }
    var opts = DC.optionsFor(q, S.answers, d);
    var full = def.max && dr.v.length >= def.max;
    if (single) {
      if (def.lead) h += '<p class="lead">' + esc(def.lead) + '</p>';
      h += '<h1 id="' + hid + '">' + esc(title) + '</h1>';
    }
    h += '<fieldset data-q="' + q + '" aria-describedby="' + hintId + (err ? ' ' + errId : '') + '"' + (err ? ' aria-invalid="true"' : '') + (single ? ' aria-labelledby="' + hid + '"' : '') + '>';
    if (!single) h += '<legend class="subq">' + esc(title) + '</legend>';
    h += '<p class="hint" id="' + hintId + '">' + hintFor(def) + (full ? ' <span>· Has llegado al máximo; desmarca una para cambiarla.</span>' : '') + '</p>';
    if (def.help) h += '<p class="muted">' + esc(def.help) + '</p>';
    h += '<div class="opts' + (def.compact ? ' compact' : '') + '">';
    opts.forEach(function (o) { h += optionHTML(q, def, o, dr, q, full); });
    h += '</div>';
    if (def.extraText) {
      var hide = def.extraText.hideIf.some(function (x) { return dr.v.indexOf(x) !== -1; });
      if (!hide) {
        var eid = 'txt-' + q + '-' + def.extraText.key, ev = dr.texts[def.extraText.key] || '';
        h += '<div class="textfield" style="margin-top:16px"><label for="' + eid + '">' + esc(def.extraText.label) + '</label>' +
          '<input type="text" id="' + eid + '" maxlength="' + def.extraText.max + '" value="' + esc(ev) + '" data-text="' + q + '" data-key="' + def.extraText.key + '" aria-describedby="' + eid + '-c">' +
          '<span class="counter" id="' + eid + '-c">' + ev.length + ' / ' + def.extraText.max + ' caracteres</span></div>';
      }
    }
    h += '<p class="error" id="' + errId + '"' + (err ? '' : ' hidden') + '><span aria-hidden="true">⚠</span> <span>Falta una respuesta: ' + esc(err || '') + '</span></p>';
    h += '</fieldset>';
    return h;
  }

  function clarifyBlock() {
    var d = DC.derive(S.answers);
    var dr = S.draft.qc;
    var h = '<h1>Antes del informe, una aclaración opcional</h1>' +
      '<p class="muted">Algunas respuestas parecen no encajar entre sí. No las vamos a corregir por ti: puedes aclararlo o seguir sin responder.</p>';
    DC.contradictions(S.answers, d).forEach(function (c) {
      var name = 'qc-' + c.id;
      h += '<fieldset data-q="qc"><legend class="subq">' + esc(c.text(S.answers, d)) + '</legend>' +
        '<p class="hint">' + hintFor({ type: 'single' }) + ' <span>(opcional)</span></p><div class="opts">';
      c.options.forEach(function (o) {
        var id = 'opt-' + name + '-' + o.id;
        var checked = dr.v[c.id] === o.id;
        h += '<label class="opt radio" for="' + id + '"><input type="radio" id="' + id + '" name="' + name + '" data-clar="' + c.id + '" value="' + o.id + '"' + (checked ? ' checked' : '') + '>' +
          '<span class="mark" aria-hidden="true"></span><span class="lbl">' + esc(o.label) + '</span>' + (checked ? '<span class="sel-state" aria-hidden="true">Elegida</span>' : '') + '</label>';
      });
      h += '</div></fieldset>';
    });
    return h;
  }

  function contextLine(d) {
    if (['q6', 'q7', 'q8', 'q9', 'q10a', 'q10b', 'q10c', 'q11', 'q12', 'q13', 'q5'].indexOf(S.screen) === -1 || !d.situation) return '';
    var about;
    if (S.answers.q6 && S.screen !== 'q6' && S.screen !== 'q5') {
      var t = S.answers.q6.v;
      about = 'Sobre la tarea: ' + (t === 'otra' ? (DC.text(S.answers, 'q6', 'otra') || 'otra tarea') : DC.labelOf('q6', t, S.answers, d).toLowerCase());
    } else {
      about = 'Sobre: ' + (d.source === 'alt' ? DC.labelOf('qalt', d.alt, S.answers, d).toLowerCase() : DC.SITUATIONS[d.situation].short.toLowerCase());
    }
    return '<p class="muted" style="margin:0 0 6px;font-size:.92rem">' + esc(about) + '</p>';
  }

  function screenHTML() {
    var scr = DC.screenById(S.screen);
    var d = DC.derive(S.answers);
    var first = scr.qs[0], def = DC.QUESTIONS[first];
    var h = '<form id="qform" novalidate>';
    h += '<p class="eyebrow">' + esc(def.section) + (def.sectionStep ? ' · ' + esc(def.sectionStep) : '') + '</p>';
    if (S.notice) h += '<div class="notice" role="status"><strong>Aviso:</strong> <span>' + esc(S.notice) + '</span></div>';
    if (S.screen === 'q5' && d.source === 'freq') {
      h += '<div class="notice"><span>Vamos a explorar «' + esc(DC.SITUATIONS[d.situation].short) + '» porque has indicado que ocurre con más frecuencia. Puedes cambiarla.</span> ' +
        '<button type="button" class="btn-link" data-act="change-sit">Cambiar la situación</button></div>';
    }
    h += contextLine(d);
    if (def.type === 'clarify') h += clarifyBlock();
    else if (scr.qs.length === 1) h += questionBlock(first, true);
    else {
      h += '<h1>' + esc(def.section) + '</h1><p class="muted">Dos preguntas breves.</p>';
      scr.qs.forEach(function (q) { h += questionBlock(q, false); });
    }
    var isLast = !nextScreen(S.screen);
    h += '<div class="nav"><button type="button" class="btn-ghost" data-act="back">Atrás</button><div class="right">';
    if (S.fromReview && DC.isComplete(S.answers) && !isLast) h += '<button type="button" class="btn-ghost" data-act="toreport">Volver al informe</button>';
    h += '<button type="submit" class="btn-primary">' + (isLast ? 'Ver informe' : 'Continuar') + '</button></div></div></form>';
    return h;
  }

  /* ---------- Informe ---------- */
  var SYM = { ok: 'Suficiente', provisional: 'Provisional', none: 'Sin oportunidad clara' };

  function reportBody(rep, opts) {
    opts = opts || {};
    var h = '';
    var I = rep.identified;
    h += '<section><h2><span class="secnum">1</span>Lo que hemos identificado</h2>';
    h += '<p>' + esc(I.summary) + '</p>';
    if (I.evidence.length) {
      h += '<h3>Respuestas que respaldan la interpretación</h3><span class="label-said">Has indicado</span><ul>';
      I.evidence.forEach(function (e) { h += '<li>' + esc(e) + '</li>'; });
      h += '</ul>';
    }
    if (I.inferences.length) {
      h += '<span class="label-infer">Esto sugiere</span><ul>';
      I.inferences.forEach(function (e) { h += '<li>' + esc(e) + '</li>'; });
      h += '</ul>';
    }
    h += '</section>';

    h += '<section><h2><span class="secnum">2</span>Una posible ayuda</h2><div class="proposal"><p>' + esc(rep.proposal.text) + '</p></div>';
    h += '<dl class="kv"><dt>Formato más adecuado</dt><dd>' + esc(rep.proposal.format) + '</dd></dl>';
    if (rep.proposal.formatNote) h += '<p class="muted" style="margin-top:8px">' + esc(rep.proposal.formatNote) + '</p>';
    h += '</section>';

    h += '<section><h2><span class="secnum">3</span>Primera versión que merecería probarse</h2>';
    if (rep.firstVersion.length) {
      h += '<ol class="features">';
      rep.firstVersion.forEach(function (f) { h += '<li><span>' + esc(f.text) + '</span><span class="why">' + esc(f.why) + '</span></li>'; });
      h += '</ol><p class="muted">Sin cuentas, avisos, chats ni integraciones mientras no haya una necesidad concreta que los justifique.</p>';
    } else h += '<p>No aplica: no proponemos construir una herramienta.</p>';
    h += '</section>';

    h += '<section><h2><span class="secnum">4</span>Qué necesitamos comprobar</h2>';
    if (rep.checks.length) { h += '<ul>'; rep.checks.forEach(function (c) { h += '<li>' + esc(c) + '</li>'; }); h += '</ul>'; }
    else h += '<p>No hay puntos esenciales pendientes para una primera prueba.</p>';
    if (rep.question) h += '<p class="ask">Pregunta que lo aclararía: ' + esc(rep.question) + '</p>';
    h += '</section>';

    h += '<section><h2><span class="secnum">5</span>Cómo sabríamos si ayuda</h2>';
    if (rep.measure.length) { h += '<ul>'; rep.measure.forEach(function (m) { h += '<li>' + esc(m) + '</li>'; }); h += '</ul>'; }
    else h += '<p>No aplica mientras no haya una propuesta que probar.</p>';
    h += '</section>';

    h += '<section><h2><span class="secnum">6</span>Solidez de la propuesta</h2>' +
      '<div class="solidity ' + rep.solidity.level + '"><span class="sym">' + SYM[rep.solidity.level] + '</span><div><p style="margin:0 0 4px"><strong>' + esc(rep.solidity.label) + '.</strong></p><p style="margin:0">' + esc(rep.solidity.reason) + '</p></div></div>';
    h += '<p class="disclaimer">Informe orientativo generado con reglas fijas a partir de tus respuestas, sin inteligencia artificial. El cuestionario es exploratorio: no es un diagnóstico ni un instrumento validado.</p></section>';

    if (opts.withAnswers) {
      h += '<section><h2>Tus respuestas</h2><ul class="answers">';
      DC.summary(S.answers).forEach(function (r) { h += '<li><span class="q">' + esc(r.title) + '</span><br><strong>' + esc(r.answer) + '</strong></li>'; });
      h += '</ul></section>';
    }
    return h;
  }

  function reportScreenHTML() {
    var rep = DC.buildReport(S.answers);
    var h = '<div class="report"><p class="eyebrow">Informe orientativo</p><h1>Tu propuesta de ayuda</h1>';
    h += '<div class="actions">' +
      '<button type="button" class="btn-ghost" data-act="review">Revisar mis respuestas</button>' +
      '<button type="button" class="btn-ghost" data-act="download">Descargar informe</button>' +
      '<button type="button" class="btn-ghost" data-act="print">Imprimir / guardar como PDF</button>' +
      '<button type="button" class="btn-ghost" data-act="reset">Empezar de nuevo</button></div>';
    if (S.actionMsg) h += '<p class="actions-msg" role="status">' + esc(S.actionMsg) + '</p>';
    if (S.confirmReset) h += '<div class="confirm" role="alert"><span>¿Empezar de nuevo? Se borrarán todas tus respuestas de esta página.</span>' +
      '<button type="button" class="btn-primary" data-act="reset-yes">Sí, borrar y empezar</button><button type="button" class="btn-ghost" data-act="reset-no">Cancelar</button></div>';
    h += reportBody(rep) + '</div>';
    return h;
  }

  function reviewHTML() {
    var rows = DC.summary(S.answers);
    var h = '<p class="eyebrow">Tus respuestas</p><h1>Revisar mis respuestas</h1>' +
      '<p class="muted">Si cambias una respuesta que decide qué se explora, las respuestas posteriores que ya no apliquen se eliminarán.</p><ul class="review-list">';
    rows.forEach(function (r) {
      h += '<li><span class="q">' + esc(r.title) + '</span><button type="button" class="btn-link" data-goto="' + r.screen + '" aria-label="Cambiar: ' + esc(r.title) + '">Cambiar</button><span class="a">' + esc(r.answer) + '</span></li>';
    });
    h += '</ul><button type="button" class="btn-primary" data-act="toreport">Volver al informe</button>';
    return h;
  }

  /* ---------- Exportación ---------- */
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function exportHTML() {
    var rep = DC.buildReport(S.answers);
    var css = 'body{font-family:"Atkinson Hyperlegible","Segoe UI",system-ui,sans-serif;color:#18221f;background:#fff;max-width:44rem;margin:0 auto;padding:24px 16px 48px;line-height:1.55;font-size:16px}' +
      'h1,h2,h3{font-family:"Bricolage Grotesque","Segoe UI",system-ui,sans-serif;line-height:1.2}h1{font-size:1.8rem;margin:.2em 0 .6em}h2{font-size:1.25rem;margin:0 0 8px}' +
      'section{border-top:1px solid #d3d9d1;padding:18px 0}.secnum{color:#1d5c47;margin-right:6px}.muted,.disclaimer,.why{color:#56625d}.disclaimer{font-size:.88rem}' +
      '.label-said,.label-infer{display:inline-block;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:2px 8px;border-radius:4px}.label-said{background:#e2efe8;color:#1d5c47}.label-infer{border:1px dashed #56625d;color:#56625d}' +
      '.proposal{border:1.5px solid #1d5c47;border-radius:10px;padding:12px 16px;margin-bottom:10px}.kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px}.kv dd{margin:0;font-weight:700}.kv dt{color:#56625d}' +
      '.features li{margin-bottom:8px}.why{display:block;font-size:.9rem}.solidity{border:1.5px solid #56625d;border-radius:10px;padding:12px 16px;display:flex;gap:12px}.sym{font-weight:700;text-transform:uppercase;font-size:.75rem;border:1.5px solid currentColor;border-radius:4px;padding:2px 8px;height:fit-content;white-space:nowrap}' +
      '.ask{border-left:3px solid #1d5c47;padding-left:12px;font-weight:700}.answers{padding-left:1.1rem}.answers li{margin-bottom:8px}.answers .q{color:#56625d;font-size:.92rem}' +
      '.top{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px}.brand{font-family:"Bricolage Grotesque",system-ui,sans-serif;font-weight:700}' +
      'button{font:inherit;font-weight:700;padding:10px 18px;border-radius:8px;border:0;background:#1d5c47;color:#fff;cursor:pointer;margin:6px 0 10px}' +
      '@media print{.no-print{display:none}body{padding:0;font-size:11pt}section{break-inside:avoid}}';
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Informe orientativo · Dinerocorp</title><style>' + css + '</style></head><body>' +
      '<div class="top"><span class="brand">Dinerocorp</span><span class="muted">Informe orientativo · ' + today() + '</span></div>' +
      '<h1>Tu propuesta de ayuda</h1>' +
      '<button class="no-print" onclick="window.print()">Imprimir / guardar como PDF</button>' +
      reportBody(rep, { withAnswers: true }) + '</body></html>';
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
    var html = exportHTML();
    var filename = 'informe-dinerocorp-' + today() + '.html';
    getDownloads().then(function (dl) {
      if (dl) {
        return dl.save({ filename: filename, data: html }).then(function () {
          setMsg('Informe descargado. Al abrirlo encontrarás un botón para imprimirlo o guardarlo como PDF.');
        }, function (e) {
          if (e && e.code === 'declined') setMsg('Descarga cancelada.');
          else if (e && e.code === 'rate_limited') setMsg('Ya hay una descarga pendiente de confirmar.');
          else fallback();
        });
      }
      fallback();
    });
    function fallback() {
      try {
        var blob = new Blob([html], { type: 'text/html' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        setMsg('Descarga iniciada: ' + filename + '. Si no aparece, tu navegador la ha bloqueado.');
      } catch (e) { setMsg('No se ha podido descargar el informe en esta vista.'); }
    }
  }

  function doPrint() {
    if (inFrame()) {
      setMsg('Desde esta vista no se puede abrir el diálogo de impresión. Descarga el informe: al abrirlo encontrarás un botón para imprimirlo o guardarlo como PDF.');
      return;
    }
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
      inp.addEventListener('change', function () { S.draft.qc.v[inp.dataset.clar] = inp.value; render(false, inp.id); });
    });
    app.querySelectorAll('[data-text]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var q = inp.dataset.text, k = inp.dataset.key;
        if (k === '__v') S.draft[q].v = inp.value; else S.draft[q].texts[k] = inp.value;
        var c = document.getElementById(inp.id + '-c');
        if (c) c.textContent = inp.value.length + ' / ' + inp.maxLength + ' caracteres';
      });
    });
    app.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.dataset.act;
        if (act === 'start') { S.notice = null; goScreen(firstIncomplete() || 'q1', { focus: true }); }
        else if (act === 'back') { S.notice = null; onBack(); }
        else if (act === 'change-sit') { commitDraft(); S.notice = null; goScreen('q4', { focus: true }); }
        else if (act === 'toreport') { if (S.mode === 'q') { if (!validate()) { render(); return; } commitDraft(); } if (DC.isComplete(S.answers)) showReport(); else goScreen(firstIncomplete(), { focus: true }); }
        else if (act === 'review') { S.mode = 'review'; S.actionMsg = ''; render(true); }
        else if (act === 'download') doDownload();
        else if (act === 'print') doPrint();
        else if (act === 'reset') { S.confirmReset = true; render(false, null); var y = app.querySelector('[data-act="reset-yes"]'); if (y) y.focus(); }
        else if (act === 'reset-no') { S.confirmReset = false; render(false, null); }
        else if (act === 'reset-yes') { S.answers = {}; S.mode = 'intro'; S.confirmReset = false; S.actionMsg = ''; S.notice = null; render(true); announce('Respuestas borradas.'); }
      });
    });
    app.querySelectorAll('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { S.fromReview = true; S.notice = null; goScreen(b.dataset.goto, { focus: true }); });
    });
  }

  /* Para pruebas automatizadas: acceso de solo lectura al estado */
  window.DC_APP = { state: function () { return S; }, exportHTML: exportHTML };

  render(false);
})();
