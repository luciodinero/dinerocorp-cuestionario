/* =====================================================================
   GENERACIÓN DEL INFORME (reglas explícitas, sin servicios externos)
   ---------------------------------------------------------------------
   DC.buildReport(answers) → objeto con las seis secciones del informe.
   No usa inteligencia artificial: todo sale de las reglas de abajo.

   Para ampliar en el futuro (p. ej. con un modelo de lenguaje), sustituye
   o complementa DC.buildReport manteniendo la misma forma de objeto:
     { kind, identified:{summary, facts[], inferences[], evidence[]},
       proposal:{text, format, formatNote, limited}, firstVersion[],
       checks[], question, measure[], solidity:{level,label,reason} }

   Dónde tocar:
     CATALOG        → propuesta concreta por situación y tarea
     MEASURES       → comprobación sugerida por situación
     OBSTACLE_*     → interpretación de cada obstáculo
     decide()       → orden de las reglas de decisión
   ===================================================================== */
window.DC = window.DC || {};

(function () {
  var val = DC.val, has = DC.has, hasAny = DC.hasAny, text = DC.text;

  /* existingFirst: ya existen herramientas comunes para esto, así que
     lo prudente es explorarlas antes de construir nada. */
  var CATALOG = {
    A: {
      archivo: {
        idea: 'Un índice sencillo que recoja dónde guardas cada tipo de archivo, nota o mensaje importante, para ir directamente al sitio correcto en lugar de buscar en varios.',
        features: [
          ['Lista de tipos de información con el lugar donde se guarda cada uno', 'task'],
          ['Búsqueda por palabra dentro de ese índice', 'obstacle'],
          ['Añadir una entrada nueva en pocos segundos, sin campos obligatorios', 'maintenance']
        ]
      },
      reunir: {
        idea: 'Una vista que reúna en un solo sitio la información de esa tarea que ahora está repartida, indicando de dónde sale cada dato.',
        features: [
          ['Una sola página por tema con los datos o enlaces agrupados', 'task'],
          ['Indicación del origen de cada dato, para poder comprobarlo', 'data'],
          ['Búsqueda por palabra dentro de la vista', 'obstacle']
        ]
      },
      acuerdo: {
        idea: 'Un registro de acuerdos, instrucciones y fechas, con cuándo y dónde se dijo cada uno, para no tener que recuperarlos entre mensajes.',
        features: [
          ['Anotar cada acuerdo en una línea, con fecha y origen', 'task'],
          ['Lista ordenada por fecha', 'obstacle'],
          ['Búsqueda por palabra', 'obstacle']
        ]
      },
      actualizada: {
        idea: 'Una ficha por tema que muestre la versión vigente de la información y la fecha en que se revisó por última vez.',
        features: [
          ['Fecha de última revisión visible en cada ficha', 'task'],
          ['Marcar una versión antigua como sustituida, sin borrarla', 'review'],
          ['Señal visual en la propia ficha cuando lleva tiempo sin revisarse', 'obstacle']
        ]
      },
      otra: {
        idea: 'Un lugar único donde guardar y buscar la información que necesitas para esa tarea.',
        features: [
          ['Guardar la información de esa tarea en un solo sitio', 'task'],
          ['Búsqueda por palabra', 'obstacle']
        ]
      }
    },
    B: {
      mismosdatos: {
        idea: 'Una ficha con los datos que introduces una y otra vez, desde la que copiarlos de uno en uno o de golpe, revisándolos antes de usarlos.',
        features: [
          ['Ficha con tus datos habituales para esa tarea', 'task'],
          ['Copiar cada dato con un solo clic', 'obstacle'],
          ['Revisar y corregir los datos antes de usarlos', 'review']
        ]
      },
      mensajes: {
        idea: 'Plantillas de mensajes o documentos con huecos solo para lo que cambia cada vez.',
        features: [
          ['Biblioteca con tus plantillas habituales', 'task'],
          ['Rellenar los huecos y ver el resultado antes de usarlo', 'review'],
          ['Copiar o descargar el texto final', 'obstacle']
        ]
      },
      ordenar: {
        idea: 'Unas reglas fijas de nombres y carpetas, con una ayuda que proponga dónde va cada elemento y te deje confirmarlo antes de moverlo.',
        features: [
          ['Convención de nombres y carpetas acordada una vez', 'task'],
          ['Propuesta de ubicación que confirmas tú', 'review'],
          ['Lista de elementos pendientes de ordenar', 'obstacle']
        ]
      },
      calculos: {
        idea: 'Una plantilla de cálculo o una pequeña web donde introduces solo los datos que cambian y obtienes el cálculo o el resumen siempre con el mismo formato.',
        features: [
          ['Introducir únicamente los datos que cambian cada vez', 'obstacle'],
          ['Cálculo automático que puedes revisar paso a paso', 'review'],
          ['Resumen listo para copiar o descargar', 'task']
        ]
      },
      otra: {
        idea: 'Una plantilla que reduzca los pasos repetidos de esa tarea, con revisión antes de usar el resultado.',
        features: [
          ['Guardar una vez lo que se repite', 'obstacle'],
          ['Revisar el resultado antes de usarlo', 'review']
        ]
      }
    },
    C: {
      fecha: {
        existingFirst: true,
        idea: 'Una página donde cada persona marca su disponibilidad, para ver de un vistazo qué fecha encaja sin una cadena de mensajes.',
        features: [
          ['Proponer varias fechas en una sola página', 'task'],
          ['Que cada persona marque las que le encajan', 'obstacle'],
          ['Ver la fecha con más coincidencias', 'measure']
        ]
      },
      repartir: {
        idea: 'Una lista compartida de tareas que indique quién se encarga de cada una y en qué estado está.',
        features: [
          ['Lista de tareas con una persona responsable por tarea', 'task'],
          ['Estado de cada tarea visible para todos', 'obstacle'],
          ['Sin cuentas: acceso mediante un enlace compartido', 'maintenance']
        ]
      },
      recoger: {
        existingFirst: true,
        idea: 'Un formulario breve con la lista de respuestas a la vista, para saber quién ha confirmado y quién falta.',
        features: [
          ['Formulario de una o dos preguntas', 'task'],
          ['Lista de quién ha respondido y quién falta', 'obstacle'],
          ['Copiar el listado final', 'measure']
        ]
      },
      consultar: {
        idea: 'Una vista que reúna los acuerdos y pendientes de la actividad, para que no tengas que recuperarlos entre mensajes.',
        features: [
          ['Página única de la actividad con los acuerdos tomados', 'task'],
          ['Estado actual y siguientes pasos', 'obstacle'],
          ['Fecha de la última actualización visible', 'review']
        ]
      },
      otra: {
        idea: 'Un registro compartido de lo acordado en esa actividad, para reducir los mensajes de ida y vuelta.',
        features: [
          ['Lugar único con lo acordado', 'task'],
          ['Visible para todas las personas implicadas', 'obstacle']
        ]
      }
    },
    D: {
      fechas: {
        existingFirst: true,
        idea: 'Una lista única de fechas y compromisos, ordenada por cercanía, que puedas consultar de un vistazo.',
        features: [
          ['Lista única de fechas y compromisos', 'task'],
          ['Orden por cercanía', 'obstacle'],
          ['Añadir una fecha en pocos segundos', 'maintenance']
        ]
      },
      reunir: {
        idea: 'Una lista única donde llevar los pendientes que ahora están en varios sitios, indicando de dónde viene cada uno.',
        features: [
          ['Lista única de pendientes', 'task'],
          ['Origen de cada pendiente', 'data'],
          ['Marcar como hecho con un clic', 'maintenance']
        ]
      },
      elegir: {
        idea: 'Una forma rápida de ordenar los pendientes según dos criterios sencillos (por ejemplo, urgencia y esfuerzo) para decidir qué hacer primero.',
        features: [
          ['Valorar cada pendiente con dos criterios', 'task'],
          ['Orden sugerido que puedes cambiar', 'review'],
          ['Mostrar solo el siguiente pendiente', 'obstacle']
        ]
      },
      dividir: {
        idea: 'Una guía breve que ayude a dividir una tarea en pasos pequeños y deje visible solo el primero.',
        features: [
          ['Escribir la tarea y dividirla en pasos cortos', 'task'],
          ['Mostrar solo el primer paso pendiente', 'obstacle'],
          ['Marcar pasos hechos', 'measure']
        ]
      },
      otra: {
        idea: 'Una lista única de pendientes de esa tarea, con el siguiente paso visible.',
        features: [
          ['Lista única de pendientes', 'task'],
          ['Siguiente paso visible', 'obstacle']
        ]
      }
    },
    E: {
      compras: {
        idea: 'Una tabla de comparación con los criterios que te importan en filas y las opciones en columnas.',
        features: [
          ['Definir tus criterios una vez', 'task'],
          ['Añadir opciones y rellenar sus datos', 'obstacle'],
          ['Anotar el origen de cada dato y la fecha', 'data']
        ]
      },
      elegir: {
        idea: 'Una tabla para comparar actividades, formaciones u oportunidades según los criterios que te importan, con tus notas al lado.',
        features: [
          ['Criterios propios definidos una vez', 'task'],
          ['Notas por opción', 'obstacle'],
          ['Enlace a la fuente de cada dato', 'data']
        ]
      },
      requisitos: {
        idea: 'Una lista de comprobación de requisitos para marcar cuáles cumple cada opción.',
        features: [
          ['Lista de requisitos', 'task'],
          ['Marcar cumple / no cumple / pendiente de comprobar en cada opción', 'obstacle'],
          ['Dato de origen de cada comprobación', 'data']
        ]
      },
      organizar: {
        idea: 'Un lugar donde guardar las opciones que vas encontrando, con notas y criterios, para no tener que volver a buscarlas.',
        features: [
          ['Guardar cada opción con enlace y nota', 'task'],
          ['Agrupar por decisión', 'obstacle'],
          ['Búsqueda por palabra', 'obstacle']
        ]
      },
      otra: {
        idea: 'Una tabla sencilla de opciones y criterios para esa decisión.',
        features: [
          ['Opciones y criterios en una tabla', 'task'],
          ['Notas por opción', 'obstacle']
        ]
      }
    },
    F: {
      aprender: {
        idea: 'Un plan de práctica en pasos pequeños con un registro de lo hecho, para retomar donde lo dejaste sin pensar por dónde seguir.',
        features: [
          ['Siguiente paso visible al abrirlo', 'obstacle'],
          ['Registro breve de lo practicado', 'task'],
          ['Pasos que caben en poco tiempo', 'maintenance']
        ]
      },
      proyecto: {
        idea: 'Una lista de siguientes pasos del proyecto con el último avance anotado, para retomarlo sin reconstruir dónde estabas.',
        features: [
          ['Nota del último avance', 'task'],
          ['Siguiente paso visible', 'obstacle'],
          ['Lista de ideas apartadas para no perderlas', 'maintenance']
        ]
      },
      rutina: {
        existingFirst: true,
        idea: 'Un registro sencillo de la rutina, con el paso del día visible y sin exigir constancia perfecta.',
        features: [
          ['Marcar el día hecho con un toque', 'task'],
          ['Ver el paso de hoy', 'obstacle'],
          ['Retomar sin penalizar los días saltados', 'maintenance']
        ]
      },
      organizar: {
        idea: 'Una página de la actividad con lo que hay que preparar y quién participa.',
        features: [
          ['Lista de lo que hay que preparar', 'task'],
          ['Quién participa o se encarga', 'obstacle'],
          ['Compartible mediante un enlace', 'maintenance']
        ]
      },
      gestion: {
        idea: 'Una lista de comprobación con los pasos y documentos necesarios para esa gestión o siguiente paso.',
        features: [
          ['Pasos en orden', 'task'],
          ['Documentos necesarios por paso', 'obstacle'],
          ['Marcar lo que ya está hecho', 'measure']
        ]
      },
      otra: {
        idea: 'Una lista de pasos pequeños para esa actividad, con el siguiente paso visible.',
        features: [
          ['Pasos pequeños', 'task'],
          ['Siguiente paso visible', 'obstacle']
        ]
      }
    }
  };

  var MEASURES = {
    A: 'La próxima vez que necesites esa información, anota si la encuentras en el primer sitio que miras y en cuántos sitios has tenido que buscar.',
    B: 'Haz la tarea una vez con la ayuda y cuenta los pasos manuales, comparándolos con la última vez que la hiciste sin ella.',
    C: 'En la próxima actividad, cuenta cuántos mensajes hacen falta para cerrar el acuerdo y compáralo con la anterior.',
    D: 'Durante una semana, anota si sabes qué te toca sin tener que reunir los pendientes de varios sitios.',
    E: 'En la próxima decisión, comprueba si puedes elegir sin volver a buscar información que ya habías visto.',
    F: 'En las próximas dos semanas, anota si consigues empezar o retomar la actividad, y en qué paso te quedas.'
  };

  var OBSTACLE_INFER = {
    dispersa: 'Esto sugiere que el problema principal está en dónde se encuentra la información, algo en lo que una herramienta puede ayudar si se puede acceder a ella.',
    manual: 'Esto sugiere que una parte de la tarea se repite de forma mecánica y podría simplificarse con una plantilla o una automatización que revises tú.',
    claro: 'Esto sugiere que falta una guía o un primer paso claro, más que una herramienta compleja.',
    tercero: 'Esto sugiere que la tarea depende de otras personas; una herramienta puede facilitar el seguimiento, pero no garantiza que respondan.',
    herramienta: 'Esto sugiere que la herramienta actual no encaja con la tarea; conviene comprobar primero si permite hacerlo de otra forma o si existe otra que sí lo haga.',
    tiempo: 'Esto sugiere que el freno principal es la falta de tiempo disponible, algo que una herramienta no resuelve por sí sola.',
    recursos: 'Esto sugiere que el freno principal es la falta de dinero, materiales u otros recursos, algo que una herramienta no resuelve.',
    energia: 'Esto sugiere que el freno principal es la falta de energía o ganas en ese momento, algo que una herramienta no resuelve por sí sola.',
    ninguno: 'Esto sugiere que no hay un obstáculo claro que una herramienta pudiera eliminar.',
    otro: 'El obstáculo no encaja en las categorías previstas, así que la interpretación es más tentativa.',
    nolose: 'Como no está claro qué dificultó la tarea, cualquier propuesta es provisional.'
  };

  var FORMATS = {
    feature: 'Una funcionalidad dentro de una herramienta existente',
    web: 'Una web sencilla',
    app: 'Una aplicación',
    process: 'Un cambio de proceso',
    existing: 'Explorar primero una herramienta existente',
    moreinfo: 'Obtener más información antes de proponer algo',
    none: 'Ninguna intervención por ahora'
  };

  var SOLIDITY = {
    ok: 'Hay información suficiente para proponer una primera prueba',
    provisional: 'La propuesta es provisional: faltan detalles',
    none: 'No se ha identificado una oportunidad tecnológica clara'
  };

  var ALT_PHRASE = {
    aprender: 'aprender o practicar algo',
    hobby: 'avanzar en un hobby o proyecto personal',
    coordinar: 'participar en actividades o coordinarte con otras personas',
    rutina: 'mantener una rutina personal',
    siguiente: 'preparar un siguiente paso de estudios o trabajo',
    otra: 'hacer otra actividad'
  };

  var RELEVANT = ['tiempo', 'cansancio', 'errores', 'gasto', 'oportunidad', 'ayuda', 'impide', 'otra'];
  var STRONG = ['errores', 'gasto', 'oportunidad', 'impide'];
  var TECHABLE = ['dispersa', 'manual', 'claro', 'herramienta'];
  var NONTECH = ['tiempo', 'recursos', 'energia'];

  function L(q, id, a, d) { return DC.labelOf(q, id, a, d); }
  function lc(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function quote(s) { return '«' + s + '»'; }
  function list(q, a, d) {
    var v = val(a, q); if (!v) return '';
    return (Array.isArray(v) ? v : [v]).map(function (id) { return lc(L(q, id, a, d)); }).join(', ');
  }
  function freqLabel(a, s) {
    var o = DC.SCALE.filter(function (x) { return x.id === val(a, 'q2' + s); })[0];
    return o ? lc(o.label) : '';
  }

  /* ---------- Hechos declarados ---------- */
  function facts(a, d) {
    var f = {};
    var s = d.situation;
    if (d.source === 'alt') {
      f.situation = 'Has indicado que en el último mes quisiste ' + ALT_PHRASE[d.alt] + ' y no pudiste empezar o mantenerlo.';
    } else {
      f.situation = 'Has indicado que ' + freqLabel(a, s) + ' de las últimas dos semanas ' + DC.SITUATIONS[s].fact + '.';
    }
    if (val(a, 'q5')) {
      var amb = val(a, 'q5');
      f.context = amb === 'varios' ? 'Has indicado que te ocurre en varios ámbitos.' :
        amb === 'otro' ? 'Has indicado que te ocurre en un ámbito distinto de los que mencionaste.' :
          'Has indicado que te ocurre principalmente en: ' + lc(L('q5', amb, a, d)) + '.';
    }
    if (val(a, 'q6')) {
      var t = val(a, 'q6');
      var tt = text(a, 'q6', t);
      f.task = t === 'otra'
        ? (tt ? 'Has descrito la tarea así: ' + quote(tt) + '.' : 'Has indicado una tarea distinta de las propuestas, sin más detalle.')
        : 'Has indicado que la tarea que más se parece es: ' + lc(L('q6', t, a, d)) + '.';
    }
    if (val(a, 'q7')) {
      var o = val(a, 'q7');
      var ot = text(a, 'q7', o);
      f.obstacle = o === 'otro'
        ? (ot ? 'Has descrito lo que más la dificultó así: ' + quote(ot) + '.' : 'Has indicado otro obstáculo, sin más detalle.')
        : 'Has indicado que lo que más la dificultó fue: ' + lc(L('q7', o, a, d)) + '.';
    }
    if (val(a, 'q8')) {
      if (has(a, 'q8', 'nointentado')) f.method = 'Has indicado que todavía no has intentado resolverla.';
      else {
        var tool = text(a, 'q8', 'tool');
        f.method = 'Has indicado que ahora la resuelves así: ' + list('q8', a, d) + (tool ? ' (herramienta: ' + quote(tool) + ')' : '') + '.';
        if (val(a, 'q9')) f.method += ' Sobre cómo te funciona: ' + lc(L('q9', val(a, 'q9'), a, d)) + '.';
      }
    }
    if (val(a, 'q10a')) f.frequency = 'Has indicado que te encuentras con ella: ' + lc(L('q10a', val(a, 'q10a'), a, d)) + '.';
    if (val(a, 'q10b')) {
      f.consequence = 'Has indicado esta consecuencia: ' + list('q10b', a, d) + '.';
      if (val(a, 'q10c')) f.consequence += ' Tiempo aproximado en los pasos difíciles: ' + lc(L('q10c', val(a, 'q10c'), a, d)) + '.';
    }
    if (val(a, 'q11a')) f.data = 'Has indicado sobre la información necesaria: ' + lc(L('q11a', val(a, 'q11a'), a, d)) + '.';
    if (val(a, 'q11b')) f.maintenance = 'Sobre mantenerla al día: ' + lc(L('q11b', val(a, 'q11b'), a, d)) + '.';
    if (val(a, 'q12')) f.conditions = 'Condiciones para usar una ayuda: ' + list('q12', a, d) + '.';
    if (val(a, 'q13')) f.detail = 'Detalle añadido: ' + quote(val(a, 'q13')) + '.';
    return f;
  }

  /* ---------- Señales derivadas ---------- */
  function signals(a, d) {
    var s = {};
    var c1 = DC.clarification(a, 'c_metodo');
    var c2 = DC.clarification(a, 'c_consecuencia');
    var c3 = DC.clarification(a, 'c_cambio');
    var contr = DC.contradictions(a, d);
    s.unresolved = contr.filter(function (c) { var v = DC.clarification(a, c.id); return !v || v === 'nodecir'; });

    s.task = val(a, 'q6');
    s.taskVague = s.task === 'otra' && !text(a, 'q6', 'otra');
    s.obstacle = val(a, 'q7');
    s.obstacleVague = s.obstacle === 'nolose' || (s.obstacle === 'otro' && !text(a, 'q7', 'otro'));

    if (c2 === 'relevante') s.relevant = true;
    else if (c2 === 'norelevante') s.relevant = false;
    else if (hasAny(a, 'q10b', RELEVANT)) s.relevant = true;
    else if (has(a, 'q10b', 'ninguna')) s.relevant = false;
    else s.relevant = null; /* No lo sé */

    s.strong = hasAny(a, 'q10b', STRONG);
    s.works = val(a, 'q9') === 'bien' && c1 !== 'parcial';
    s.notTried = has(a, 'q8', 'nointentado');
    s.keepAsIs = has(a, 'q12', 'continuar') && c3 !== 'abierto';
    s.noMaintain = val(a, 'q11b') === 'noquiero';
    s.integration = ['app', 'dispersa'].indexOf(val(a, 'q11a')) !== -1 || val(a, 'q11b') === 'aprovechar' || has(a, 'q12', 'encaje');
    s.dataThird = val(a, 'q11a') === 'tercero';
    s.dataUnknown = val(a, 'q11a') === 'nolose';
    s.usesApp = has(a, 'q8', 'app');
    s.frequent = ['diario', 'variassemana'].indexOf(val(a, 'q10a')) !== -1;
    return s;
  }

  function featureWhy(kind, a, d) {
    switch (kind) {
      case 'task': return 'Responde a la tarea que has indicado.';
      case 'obstacle': return val(a, 'q7') && TECHABLE.indexOf(val(a, 'q7')) !== -1
        ? 'Responde al obstáculo: ' + lc(L('q7', val(a, 'q7'), a, d)) + '.'
        : 'Reduce los pasos de la tarea.';
      case 'data': return val(a, 'q11a') ? 'Tiene en cuenta dónde está la información: ' + lc(L('q11a', val(a, 'q11a'), a, d)) + '.' : 'Permite comprobar de dónde sale cada dato.';
      case 'review': return has(a, 'q12', 'revisar') ? 'Indicaste que necesitas revisar y confirmar lo que hace.' : 'Mantiene el control en tus manos antes de usar el resultado.';
      case 'maintenance': return val(a, 'q11b') ? 'Tiene en cuenta lo que indicaste sobre mantenerla: ' + lc(L('q11b', val(a, 'q11b'), a, d)) + '.' : 'Busca el menor esfuerzo de mantenimiento.';
      case 'measure': return 'Permite comprobar si la ayuda funciona.';
    }
    return '';
  }

  function chooseFormat(entry, a, d, s) {
    if (s.obstacle === 'herramienta') return 'existing';
    if (entry.existingFirst) return 'existing';
    if (s.noMaintain) return s.usesApp ? 'feature' : 'process';
    if (has(a, 'q12', 'encaje') || (s.usesApp && ['esfuerzo', 'parte'].indexOf(val(a, 'q9')) !== -1)) return 'feature';
    if (has(a, 'q12', 'movil') && !has(a, 'q12', 'ordenador') && s.frequent) return 'app';
    return 'web';
  }

  /* ---------- Decisión principal ---------- */
  function decide(a, d, s) {
    var sit = d.situation;
    var entry = (CATALOG[sit] && CATALOG[sit][s.task]) || (CATALOG[sit] && CATALOG[sit].otra);
    var r = { kind: 'proposal', entry: entry, format: null, limited: false, notes: [], reasons: [] };

    /* 1. La forma actual funciona y no hay consecuencias relevantes */
    if (s.works && s.relevant !== true) {
      r.kind = 'keep'; r.format = 'none';
      r.text = 'Tu forma actual de hacerlo parece cumplir su función y no has indicado consecuencias relevantes. No proponemos cambiarla.';
      r.solidity = 'none'; r.reason = 'Has indicado que tu método funciona bien y sin consecuencias relevantes.';
      return r;
    }
    /* 2. No hay consecuencias relevantes y no hay obstáculo concreto */
    if (s.relevant === false) {
      r.kind = 'keep'; r.format = 'none';
      r.text = 'Has indicado que esta tarea no tiene consecuencias relevantes para ti. Aunque ocurra a menudo, eso no basta para proponer una ayuda, así que no proponemos ninguna por ahora.';
      r.solidity = 'none'; r.reason = 'Sin consecuencias relevantes, una herramienta añadiría trabajo sin una ganancia clara.';
      return r;
    }
    /* 3. Prefiere continuar como ahora */
    if (s.keepAsIs) {
      r.kind = 'keep';
      r.format = s.strong ? 'moreinfo' : 'none';
      r.text = s.strong
        ? 'Prefieres continuar como ahora, aunque la tarea tiene consecuencias que has señalado. No proponemos una herramienta; si en algún momento quieres revisarlo, convendría entender primero qué parte de la tarea las provoca.'
        : 'Prefieres continuar como ahora. No proponemos ninguna herramienta.';
      r.solidity = s.strong ? 'provisional' : 'none';
      r.reason = s.strong ? 'Hay consecuencias relevantes, pero has indicado que prefieres no cambiar tu forma de hacerlo.' : 'Has indicado que prefieres continuar como ahora.';
      return r;
    }
    /* 4. Falta concreción esencial */
    if (s.taskVague && s.obstacleVague) {
      r.kind = 'moreinfo'; r.format = 'moreinfo';
      r.text = 'Con la información disponible no podemos describir una ayuda concreta sin inventar detalles. Antes conviene conocer mejor la tarea y qué la dificulta.';
      r.solidity = 'provisional'; r.reason = 'No sabemos con precisión ni la tarea ni el obstáculo.';
      return r;
    }
    /* 5. Obstáculos que el software no resuelve */
    if (NONTECH.indexOf(s.obstacle) !== -1) {
      var supported = s.obstacle === 'tiempo' && s.relevant === true && entry && !s.taskVague &&
        ['B', 'A', 'D'].indexOf(sit) !== -1 && !s.noMaintain && !s.works;
      if (supported) {
        r.kind = 'proposal'; r.limited = true;
        r.format = chooseFormat(entry, a, d, s);
        r.text = 'Una herramienta no te dará más tiempo disponible. Como contribución limitada, se podría reducir el tiempo de los pasos de esta tarea con esto: ' + lc(entry.idea);
        r.solidity = 'provisional'; r.reason = 'El freno principal es el tiempo disponible, y no está claro cuánto de él se va en pasos que una herramienta pueda acortar.';
        return r;
      }
      r.kind = 'process'; r.format = 'process';
      if (s.obstacle === 'tiempo') r.text = 'Más que una herramienta, podría ayudar un cambio de proceso: reservar un momento concreto y breve para esta tarea, o reducirla a la parte imprescindible.';
      if (s.obstacle === 'recursos') r.text = 'Una herramienta no resolverá la falta de dinero, materiales u otros recursos. Antes de pensar en tecnología, conviene identificar qué recurso concreto falta y si hay alternativas gratuitas, prestadas o compartidas.';
      if (s.obstacle === 'energia') r.text = 'Una herramienta no aporta energía ni ganas. Puede ayudar un cambio de proceso: reducir el primer paso a algo que cueste pocos minutos y dejarlo preparado de antemano.';
      r.solidity = 'none'; r.reason = 'El obstáculo principal no es algo que una herramienta pueda resolver por sí sola.';
      return r;
    }
    /* 6. Depende de otras personas */
    if (s.obstacle === 'tercero') {
      if (sit === 'C' && entry) {
        r.kind = 'proposal'; r.limited = true;
        r.format = chooseFormat(entry, a, d, s);
        r.text = entry.idea + ' Puede reducir los mensajes necesarios, pero no garantiza que las demás personas respondan.';
        r.solidity = 'provisional'; r.reason = 'El resultado depende de que otras personas usen la misma herramienta.';
        return r;
      }
      r.kind = 'process'; r.format = 'process';
      r.text = 'La tarea depende de la respuesta de otra persona. Puede ayudar más acordar con ella un canal y un plazo de respuesta que añadir una herramienta.';
      r.solidity = 'provisional'; r.reason = 'El obstáculo está en la respuesta de otras personas, no en la herramienta.';
      return r;
    }
    /* 7. Sin obstáculo concreto pero con consecuencias */
    if (s.obstacle === 'ninguno') {
      r.kind = 'moreinfo'; r.format = 'moreinfo';
      r.text = 'Has señalado consecuencias, pero ningún obstáculo concreto. Sin saber qué paso cuesta, no proponemos una herramienta todavía.';
      r.solidity = 'provisional'; r.reason = 'Falta saber en qué paso de la tarea está la dificultad.';
      return r;
    }
    /* 8. Propuesta tecnológica */
    r.kind = 'proposal';
    r.format = chooseFormat(entry, a, d, s);
    r.text = entry.idea;
    if (r.format === 'process') r.text += ' Para no añadir otra herramienta que mantener, se plantearía como una forma de organizarlo dentro de lo que ya usas.';
    if (r.format === 'existing' && s.obstacle !== 'herramienta') r.text += ' Ya existen herramientas habituales que hacen algo parecido; conviene probar alguna antes de construir nada.';
    if (r.format === 'existing' && s.obstacle === 'herramienta') r.text += ' Como la herramienta actual es parte del problema, el primer paso sería comprobar si permite hacerlo de otra forma o si otra existente lo resuelve.';

    var missing = [];
    if (s.taskVague) missing.push('la tarea concreta');
    if (s.obstacleVague) missing.push('qué dificulta la tarea');
    if (s.relevant !== true) missing.push('qué consecuencia tiene');
    if (s.works) missing.push('por qué cambiar un método que funciona');
    if (s.noMaintain || val(a, 'q11b') === 'probar') missing.push('si estarías dispuesto/a a mantenerla');
    if (s.dataUnknown || s.dataThird) missing.push('dónde está la información necesaria');
    if (s.unresolved.length) missing.push('una aparente contradicción en tus respuestas');
    if (d.uncertain) missing.push('si esta situación es realmente la que más te importa');
    if (val(a, 'q10a') === 'nolose') missing.push('con qué frecuencia ocurre');
    if (missing.length === 0) {
      r.solidity = 'ok';
      r.reason = 'La tarea, el obstáculo, sus consecuencias y la disposición a mantener la ayuda están definidos.';
    } else {
      r.solidity = 'provisional';
      r.reason = 'Falta confirmar ' + missing.slice(0, 2).join(' y ') + '.';
    }
    return r;
  }

  function formatNote(r, s) {
    if (r.format === 'none' || !r.format) return '';
    if (r.solidity === 'ok' && !s.integration) return 'Es el formato que mejor encaja con tus respuestas, aunque se confirmaría con la primera prueba.';
    return 'Formato orientativo: no es definitivo mientras falten los datos indicados en «Qué necesitamos comprobar».';
  }

  function firstVersion(r, a, d, s) {
    if (r.kind !== 'proposal' || !r.entry) return [];
    var feats = r.entry.features.slice(0, 3).map(function (f) { return { text: f[0], why: featureWhy(f[1], a, d) }; });
    return feats;
  }

  function checks(r, a, d, s) {
    var c = [];
    if (s.integration && r.kind === 'proposal') c.push('Acceso a datos e integraciones: comprobar si se puede acceder a la información donde está ahora. No damos por hecho que se pueda conectar con otras aplicaciones.');
    if (s.dataThird) c.push('Acceso a datos: la información la tiene otra persona u organización; habría que confirmar si es posible y adecuado usarla.');
    if (s.dataUnknown) c.push('Dónde está la información necesaria para la tarea.');
    if (s.obstacleVague || NONTECH.indexOf(s.obstacle) !== -1 || s.obstacle === 'ninguno') c.push('Causa del problema: qué paso concreto de la tarea genera la dificultad.');
    if (val(a, 'q11b') === 'probar' || s.noMaintain) c.push('Disposición a mantener la herramienta: probarla una o dos semanas antes de decidir.');
    if (s.taskVague) c.push('Precisión de la tarea: no sabemos con detalle en qué consiste.');
    if (s.notTried) c.push('No hay datos sobre una solución actual, porque todavía no has intentado resolverla.');
    if (d.uncertain) c.push('No estabas seguro/a de que esta situación tuviera consecuencias relevantes.');
    if (s.unresolved.length) c.push('Hay respuestas que parecen contradictorias y no se han aclarado.');
    if (has(a, 'q12', 'ejemplo')) c.push('Indicaste que necesitarías ver un ejemplo antes de usarla.');
    if (val(a, 'q10c') === 'varia' || val(a, 'q10c') === 'nolose') c.push('El tiempo que se va en los pasos difíciles no está claro.');
    return c;
  }

  function oneQuestion(r, a, d, s) {
    if (r.kind === 'keep' && !s.strong) return null;
    if (s.taskVague) return '¿Qué intentabas hacer exactamente la última vez que te ocurrió?';
    if (s.obstacleVague || s.obstacle === 'ninguno') return 'La última vez que ocurrió, ¿en qué paso concreto te quedaste parado/a o perdiste más tiempo?';
    if (s.dataUnknown) return '¿Dónde guardas ahora la información que usas para esta tarea?';
    if (s.relevant === null) return '¿Qué pasa cuando esta tarea sale mal o tarda más de la cuenta?';
    if (s.unresolved.length) return 'La forma en que lo haces ahora, ¿te resuelve la tarea por completo o solo en parte?';
    if (s.integration && r.kind === 'proposal') return '¿Qué aplicación o archivo concreto tendría que consultar la ayuda para servirte?';
    if (s.keepAsIs && s.strong) return '¿Qué parte de la tarea provoca la consecuencia que señalaste?';
    return null;
  }

  function measures(r, a, d, s) {
    if (r.kind === 'keep' && r.format === 'none') return [];
    var m = [];
    if (r.kind === 'process') {
      m.push('Después del cambio, anota durante dos semanas si consigues hacer la tarea cuando lo tenías previsto.');
    } else {
      m.push(MEASURES[d.situation]);
    }
    if (has(a, 'q10b', 'errores')) m.push('Anota cuántas veces tienes que rehacer algo, antes y durante la prueba.');
    if (has(a, 'q10b', 'tiempo')) m.push('Si quieres medir tiempo, anótalo en algunas ocasiones antes y durante la prueba. No damos por hecho un ahorro concreto.');
    return m.slice(0, 3);
  }

  function evidence(f, s) {
    var order = ['situation', 'task', 'obstacle', 'method', 'consequence', 'frequency', 'data'];
    return order.filter(function (k) { return f[k]; }).map(function (k) { return f[k]; }).slice(0, 5);
  }

  function inferences(r, a, d, s) {
    var out = [];
    if (s.obstacle && OBSTACLE_INFER[s.obstacle]) out.push(OBSTACLE_INFER[s.obstacle]);
    if (s.works) out.push('Esto sugiere que tu forma actual ya cumple buena parte de su función.');
    else if (['esfuerzo', 'parte', 'noterminar'].indexOf(val(a, 'q9')) !== -1) out.push('Esto sugiere que tu forma actual cumple solo en parte o con un esfuerzo que quisieras reducir.');
    if (s.notTried) out.push('No hay información sobre cómo funcionaría una solución, porque todavía no has intentado resolverla.');
    if (d.uncertain) out.push('No estabas seguro/a de que esta situación tuviera consecuencias, así que esta interpretación es más tentativa.');
    if (d.source === 'freq') out.push('Exploramos esta situación porque indicaste que era la más frecuente; eso no significa que sea la más importante.');
    s.unresolved.forEach(function (c) { out.push('Algunas respuestas parecen contradictorias y no se han aclarado, por lo que no las hemos corregido ni elegido entre ellas.'); });
    return out.filter(function (x, i, arr) { return arr.indexOf(x) === i; });
  }

  function summaryText(a, d, s) {
    var parts = [];
    if (d.source === 'alt') parts.push('Querías ' + ALT_PHRASE[d.alt] + ' y no has podido empezar o mantenerlo.');
    else parts.push('La situación explorada es ' + DC.SITUATIONS[d.situation].theme + '.');
    if (s.task) parts.push('La tarea: ' + (s.task === 'otra' ? (text(a, 'q6', 'otra') ? quote(text(a, 'q6', 'otra')) : 'una tarea distinta de las propuestas') : lc(L('q6', s.task, a, d))) + '.');
    if (s.obstacle) parts.push('El obstáculo principal: ' + (s.obstacle === 'otro' && text(a, 'q7', 'otro') ? quote(text(a, 'q7', 'otro')) : lc(L('q7', s.obstacle, a, d))) + '.');
    if (val(a, 'q8')) parts.push(s.notTried ? 'Todavía no has intentado resolverla.' : 'Ahora la resuelves: ' + list('q8', a, d) + '.');
    return parts.join(' ');
  }

  /* ---------- Informe cuando no hay nada que explorar ---------- */
  function noneReport(a, d) {
    var facts = [];
    if (d.altReason === 'sin-situaciones') facts.push('Has indicado que en las últimas dos semanas no te ocurrió ninguna de las situaciones exploradas, o que no te aplicaban.');
    if (d.altReason === 'sin-consecuencias') facts.push('Has indicado que las situaciones que te ocurrieron no tuvieron consecuencias relevantes.');
    if (d.altReason === 'no-explorar') facts.push('Has preferido no explorar ninguna de las situaciones que te ocurrieron.');
    facts.push('Has indicado que, pensando en el último mes, no hay nada que quieras explorar ahora.');
    return {
      kind: 'none',
      identified: {
        summary: 'No se ha identificado una dificultad concreta ni una actividad que quieras impulsar ahora.',
        facts: facts, evidence: facts,
        inferences: ['Esto sugiere que, por ahora, no hay una situación que justifique una ayuda tecnológica.']
      },
      proposal: { text: 'No proponemos ninguna herramienta. No tiene sentido diseñar una ayuda sin una necesidad concreta.', format: FORMATS.none, formatNote: '', limited: false },
      firstVersion: [],
      checks: ['Si más adelante aparece una tarea que te quite tiempo o te impida avanzar, puedes repetir el cuestionario pensando en ella.'],
      question: null,
      measure: [],
      solidity: { level: 'none', label: SOLIDITY.none, reason: 'Tus respuestas no señalan ninguna dificultad ni actividad que explorar.' }
    };
  }

  DC.buildReport = function (a) {
    var d = DC.derive(a);
    if (d.route === 'none') return noneReport(a, d);
    var s = signals(a, d);
    var f = facts(a, d);
    var r = decide(a, d, s);
    return {
      kind: r.kind,
      situation: d.situation,
      identified: {
        summary: summaryText(a, d, s),
        facts: f,
        evidence: evidence(f, s),
        inferences: inferences(r, a, d, s)
      },
      proposal: {
        text: r.text,
        format: FORMATS[r.format] || FORMATS.none,
        formatNote: formatNote(r, s),
        limited: r.limited
      },
      firstVersion: firstVersion(r, a, d, s),
      checks: checks(r, a, d, s),
      question: oneQuestion(r, a, d, s),
      measure: measures(r, a, d, s),
      solidity: { level: r.solidity, label: SOLIDITY[r.solidity], reason: r.reason }
    };
  };

  DC.FORMATS = FORMATS;
  DC.SOLIDITY = SOLIDITY;
})();
