/* =====================================================================
   GENERACIÓN DEL INFORME (reglas explícitas, sin servicios externos)
   ---------------------------------------------------------------------
   DC.buildReport(respuestas) devuelve:
     { main, previous, pending[], comment, scopeNote, empty }
   main / previous: informe de una situación explorada:
     { n, situationLabel, summary, evidence[], hypothesis, format,
       formatNote, inferences[], checks[], firstTest[], question,
       measure, status:{level,label,reason} }
   Para ampliarlo (p. ej. con un modelo de lenguaje), sustituye o
   complementa DC.buildReport manteniendo esa forma.

   Dónde tocar:
     CATALOG / ENERGY   → propuestas por situación, tarea y tipo de bloqueo
     MEASURES           → comprobación sugerida por situación
     PENDING_Q          → pregunta para situaciones pendientes
     decide()           → orden de las reglas de decisión
   El texto libre nunca se interpreta: solo se muestra como evidencia.
   ===================================================================== */
window.DC = window.DC || {};

(function () {
  var val = DC.val, has = DC.has, hasAny = DC.hasAny;

  var STATUS = {
    ok: 'Hay información suficiente para proponer una primera prueba',
    plausible: 'Hay una oportunidad plausible, pero faltan detalles',
    insuficiente: 'No tenemos información suficiente',
    actual: 'La solución actual parece adecuada',
    norelevante: 'No se ha identificado una necesidad relevante en lo explorado',
    sindescribir: 'Hay una necesidad, pero todavía no está bien descrita'
  };
  var SYMBOL = { ok: 'Lista para probar', plausible: 'Plausible', insuficiente: 'Faltan datos', actual: 'Adecuada', norelevante: 'Sin necesidad', sindescribir: 'Por describir' };

  var FORMATS = {
    feature: 'Una funcionalidad dentro de una herramienta que ya usas',
    web: 'Una web sencilla',
    app: 'Una aplicación',
    process: 'Un cambio en la forma de hacerlo',
    existing: 'Explorar primero una herramienta existente',
    moreinfo: 'Obtener más información antes de proponer algo',
    none: 'Ninguna intervención por ahora',
    keep: 'Mantener lo que ya te funciona',
    complement: 'Mantener lo que te funciona y complementarlo solo si hace falta',
    trial: 'Se decidirá después de una primera prueba'
  };

  /* f: [texto, motivo]  → motivo: task | obstacle | data | review | effort | measure */
  var CATALOG = {
    A: {
      archivo: { idea: 'Un índice sencillo de dónde guardas cada tipo de archivo, nota o mensaje importante, para ir directamente al sitio correcto.', f: [['Lista de tipos de información con el lugar donde se guarda cada uno', 'task'], ['Búsqueda por palabra dentro de ese índice', 'obstacle'], ['Añadir una entrada en pocos segundos, sin campos obligatorios', 'effort']] },
      reunir: { idea: 'Una vista que reúna en un solo sitio la información de esa tarea que ahora está repartida, indicando de dónde sale cada dato.', f: [['Una página por tema con los datos o enlaces agrupados', 'task'], ['Origen de cada dato, para poder comprobarlo', 'data'], ['Búsqueda por palabra dentro de la vista', 'obstacle']] },
      acuerdo: { idea: 'Un registro de acuerdos, instrucciones y fechas, con cuándo y dónde se dijo cada uno, para no tener que recuperarlos entre mensajes.', f: [['Anotar cada acuerdo en una línea, con fecha y origen', 'task'], ['Lista ordenada por fecha', 'obstacle'], ['Búsqueda por palabra', 'obstacle']] },
      actualizada: { idea: 'Una ficha por tema con la versión vigente de la información y la fecha en que se revisó por última vez.', f: [['Fecha de última revisión visible en cada ficha', 'task'], ['Marcar una versión antigua como sustituida, sin borrarla', 'review'], ['Señal visual cuando lleva tiempo sin revisarse', 'obstacle']] },
      otra: { idea: 'Un lugar único donde guardar y buscar la información que necesitas para esa tarea.', f: [['Guardar la información de esa tarea en un solo sitio', 'task'], ['Búsqueda por palabra', 'obstacle']] }
    },
    B: {
      mismosdatos: { idea: 'Una ficha con los datos que escribes una y otra vez, desde la que copiarlos rápidamente y revisarlos antes de usarlos.', f: [['Ficha con tus datos habituales para esa tarea', 'task'], ['Copiar cada dato con un solo clic', 'obstacle'], ['Revisar y corregir antes de usarlos', 'review']] },
      mensajes: { idea: 'Plantillas de mensajes o documentos con huecos solo para lo que cambia cada vez.', f: [['Tus plantillas habituales en un solo sitio', 'task'], ['Rellenar los huecos y ver el resultado antes de usarlo', 'review'], ['Copiar el texto final', 'obstacle']] },
      ordenar: { idea: 'Unas reglas fijas de nombres y carpetas, con una propuesta de dónde va cada elemento que tú confirmas antes de moverlo.', f: [['Convención de nombres y carpetas acordada una vez', 'task'], ['Propuesta de ubicación que confirmas tú', 'review'], ['Lista de elementos pendientes de ordenar', 'obstacle']] },
      calculos: { idea: 'Una plantilla de cálculo donde introduces solo los datos que cambian y obtienes el resultado siempre con el mismo formato.', f: [['Introducir únicamente los datos que cambian', 'obstacle'], ['Cálculo que puedes revisar paso a paso', 'review'], ['Resumen listo para copiar', 'task']] },
      otra: { idea: 'Una plantilla que reduzca los pasos repetidos de esa tarea, con revisión antes de usar el resultado.', f: [['Guardar una vez lo que se repite', 'obstacle'], ['Revisar el resultado antes de usarlo', 'review']] }
    },
    C: {
      fecha: { existingFirst: true, idea: 'Una página donde cada persona marca su disponibilidad, para ver qué fecha encaja sin una cadena de mensajes.', f: [['Proponer varias fechas en una sola página', 'task'], ['Que cada persona marque las que le encajan', 'obstacle'], ['Ver la fecha con más coincidencias', 'measure']] },
      repartir: { idea: 'Una lista compartida de tareas con quién se encarga de cada una y en qué estado está.', f: [['Una persona responsable por tarea', 'task'], ['Estado de cada tarea visible para todos', 'obstacle'], ['Acceso mediante un enlace, sin cuentas', 'effort']] },
      recoger: { existingFirst: true, idea: 'Un formulario breve con la lista de respuestas a la vista, para saber quién ha confirmado y quién falta.', f: [['Formulario de una o dos preguntas', 'task'], ['Lista de quién ha respondido y quién falta', 'obstacle']] },
      consultar: { idea: 'Una vista que reúna los acuerdos y pendientes de una actividad, para que no tengas que recuperarlos entre mensajes.', f: [['Página única de la actividad con los acuerdos tomados', 'task'], ['Estado actual y siguientes pasos', 'obstacle'], ['Fecha de la última actualización visible', 'review']] },
      otra: { idea: 'Un registro compartido de lo acordado, para reducir los mensajes de ida y vuelta.', f: [['Lugar único con lo acordado', 'task'], ['Visible para todas las personas implicadas', 'obstacle']] }
    },
    D: {
      fechas: { existingFirst: true, idea: 'Una lista única de fechas y compromisos ordenada por cercanía, que puedas consultar de un vistazo.', f: [['Lista única de fechas y compromisos', 'task'], ['Orden por cercanía', 'obstacle'], ['Añadir una fecha en pocos segundos', 'effort']] },
      reunir: { idea: 'Una lista única para los pendientes que ahora están anotados en sitios distintos, indicando de dónde viene cada uno.', f: [['Lista única de pendientes', 'task'], ['Origen de cada pendiente', 'data'], ['Marcar como hecho con un clic', 'effort']] },
      encargo: { idea: 'Un lugar donde anotar en el momento lo que te piden otras personas, con quién lo pidió y para cuándo.', f: [['Anotar un encargo en una línea', 'task'], ['Quién lo pidió y para cuándo', 'obstacle'], ['Marcar como hecho', 'effort']] },
      localizar: { idea: 'Un índice de dónde anotas cada tipo de gestión, para encontrarla sin revisar todos los sitios.', f: [['Lista de gestiones con el sitio donde están anotadas', 'task'], ['Búsqueda por palabra', 'obstacle']] },
      otra: { idea: 'Una lista única de pendientes de esa tarea, con lo siguiente visible.', f: [['Lista única de pendientes', 'task'], ['Lo siguiente, visible', 'obstacle']] }
    },
    P: {
      varias: { idea: 'Una lista con los pendientes entre los que eliges y, junto a cada uno, solo los datos que tú necesitas para decidir.', f: [['Ver juntos los pendientes entre los que eliges', 'task'], ['Decidir tú el orden y poder cambiarlo', 'review']] },
      ambitos: { idea: 'Una vista con lo que intentas ordenar, mostrando solo los datos que te ayudan a decidir.', f: [['Reunir en un sitio lo que intentas ordenar', 'task'], ['Decidir tú el orden y poder cambiarlo', 'review']] },
      grande: { idea: 'Una guía para dividir algo grande en pasos cortos y dejar visible solo el primero.', f: [['Dividir la tarea en pasos cortos', 'task'], ['Mostrar solo el primer paso pendiente', 'obstacle'], ['Marcar pasos hechos', 'measure']] },
      retomar: { idea: 'Una nota del punto donde lo dejaste y del siguiente paso, para retomarlo sin reconstruir dónde estabas.', f: [['Nota del último avance', 'task'], ['Siguiente paso visible al volver', 'obstacle']] },
      otra: { idea: 'Ver juntas las cosas entre las que eliges, con los datos que necesitas para decidir.', f: [['Ver juntas las opciones', 'task']] }
    },
    E: {
      compras: { idea: 'Una tabla de comparación con los criterios que te importan en filas y las opciones en columnas.', f: [['Definir tus criterios una vez', 'task'], ['Añadir opciones y rellenar sus datos', 'obstacle'], ['Anotar el origen y la fecha de cada dato', 'data']] },
      elegir: { idea: 'Una tabla para comparar actividades, formaciones u oportunidades según los criterios que te importan, con tus notas al lado.', f: [['Criterios propios definidos una vez', 'task'], ['Notas por opción', 'obstacle'], ['Enlace a la fuente de cada dato', 'data']] },
      requisitos: { idea: 'Una lista de requisitos para marcar cuáles cumple cada opción.', f: [['Lista de requisitos', 'task'], ['Cumple / no cumple / pendiente por opción', 'obstacle'], ['Origen de cada comprobación', 'data']] },
      organizar: { idea: 'Un lugar donde guardar las opciones que vas encontrando, con notas y criterios, para no tener que volver a buscarlas.', f: [['Guardar cada opción con enlace y nota', 'task'], ['Agrupar por decisión', 'obstacle']] },
      otra: { idea: 'Una tabla sencilla de opciones y criterios para esa decisión.', f: [['Opciones y criterios en una tabla', 'task'], ['Notas por opción', 'obstacle']] }
    },
    F: {
      aprender: { idea: 'Un plan de práctica en pasos pequeños con un registro de lo hecho, para retomar donde lo dejaste.', f: [['Siguiente paso visible al abrirlo', 'obstacle'], ['Registro breve de lo practicado', 'task']] },
      proyecto: { idea: 'Una lista de siguientes pasos del proyecto con el último avance anotado, para retomarlo sin reconstruir dónde estabas.', f: [['Nota del último avance', 'task'], ['Siguiente paso visible', 'obstacle']] },
      rutina: { existingFirst: true, idea: 'Un registro sencillo de la rutina, con el paso del día visible y sin exigir constancia perfecta.', f: [['Marcar el día hecho con un toque', 'task'], ['Retomar sin penalizar los días saltados', 'effort']] },
      organizar: { idea: 'Una página de la actividad con lo que hay que preparar y quién participa.', f: [['Lista de lo que hay que preparar', 'task'], ['Quién se encarga de cada cosa', 'obstacle']] },
      gestion: { idea: 'Una lista de comprobación con los pasos y documentos necesarios para esa gestión.', f: [['Pasos en orden', 'task'], ['Documentos necesarios por paso', 'obstacle'], ['Marcar lo que ya está hecho', 'measure']] },
      otra: { idea: 'Una lista de pasos pequeños para esa actividad, con el siguiente paso visible.', f: [['Pasos pequeños', 'task'], ['Siguiente paso visible', 'obstacle']] }
    },
    G: {
      apuntes: { idea: 'Una forma de marcar momentos y escribir notas breves mientras ves o escuchas una explicación, para completarlas después con calma.', f: [['Marcar un momento con un clic y una nota corta', 'task'], ['Lista de marcas de cada material', 'obstacle'], ['Repasar y completar las notas después', 'review']] },
      encontrar: { idea: 'Un índice propio de cada material con los momentos o páginas importantes, para volver a una parte concreta sin recorrerlo entero.', f: [['Anotar el momento o la página de cada parte importante', 'task'], ['Buscar por palabra en ese índice', 'obstacle']] },
      ideas: { idea: 'Una plantilla para anotar las ideas principales de cada material, con un espacio para lo que no quedó claro.', f: [['Plantilla breve por material', 'task'], ['Espacio para dudas', 'obstacle']] },
      entender: { idea: 'Una lista de dudas por material, con dónde aparece cada una, para preguntarlas o volver a ellas después.', f: [['Anotar la duda y dónde aparece', 'task'], ['Marcar las dudas resueltas', 'measure']] },
      repasar: { idea: 'Fichas de repaso que preparas a partir de tus notas, con preguntas y respuestas breves.', f: [['Crear una ficha a partir de una nota', 'task'], ['Repasar las fichas pendientes', 'obstacle']] },
      organizar: { idea: 'Una lista única de tus materiales de aprendizaje, por tema, con lo que ya has revisado.', f: [['Materiales agrupados por tema', 'task'], ['Marcar lo que ya has revisado', 'obstacle']] },
      otra: { idea: 'Una forma sencilla de organizar lo que necesitas de esos materiales.', f: [['Notas por material', 'task']] }
    }
  };

  /* Bloqueo de energía o ganas: solo algunos casos justifican una ayuda */
  var ENERGY = {
    grande: { idea: 'Una guía para dividir la tarea en pasos cortos y dejar visible solo el primero, para que empezar cueste menos.', f: [['Dividir la tarea en pasos cortos', 'task'], ['Mostrar solo el primer paso', 'obstacle'], ['Marcar pasos hechos', 'measure']] },
    varias: { idea: 'Ver juntas las cosas entre las que eliges, con los datos que necesitas para decidir, y decidir tú el orden.', f: [['Ver juntas las opciones entre las que eliges', 'obstacle'], ['Decidir tú el orden y poder cambiarlo', 'review']] },
    siguiente: { idea: 'Instrucciones concretas del siguiente paso, escritas cuando lo tienes claro, para encontrarlas cuando vuelvas a la tarea.', f: [['Escribir el siguiente paso en una línea', 'task'], ['Verlo nada más volver a la tarea', 'obstacle'], ['Marcarlo como hecho', 'measure']] }
  };

  var MEASURES = {
    A: 'Encontrar la información necesaria sin repetir búsquedas.',
    B: 'Completar la tarea con menos pasos repetidos que la última vez.',
    C: 'Cerrar el acuerdo con menos mensajes que en la actividad anterior.',
    D: 'Tener localizados todos los pendientes sin reconstruirlos de memoria.',
    P: 'Identificar un siguiente paso y explicar por qué.',
    E: 'Decidir sin volver a buscar información que ya habías visto.',
    F: 'Identificar el siguiente paso de la actividad y llegar a darlo.',
    G: 'Encontrar o repasar lo que necesitas de un material sin recorrerlo entero.'
  };

  var PENDING_Q = {
    A: '¿Qué necesitas encontrar y dónde suele estar?',
    B: '¿Qué pasos o datos se repiten y en qué sitios?',
    C: '¿Con quién te coordinas y qué es lo que lleva más mensajes acordar?',
    D: '¿Te cuesta recordarlos, encontrarlos o ambas cosas?',
    P: 'Cuando eliges por dónde empezar, ¿qué necesitas saber de cada cosa?',
    E: '¿Qué comparas y qué información vuelves a revisar?',
    F: '¿Qué actividad quieres avanzar y en qué punto se queda?',
    G: 'Al aprender con esos materiales, ¿qué parte te cuesta más: tomar apuntes, encontrar otra vez una parte concreta, identificar las ideas principales o preparar el repaso?'
  };

  var OBSTACLE_INFER = {
    dispersa: 'El problema parece estar en dónde se encuentra la información; una herramienta podría ayudar si se puede acceder a ella.',
    manual: 'Una parte de la tarea parece repetirse de forma mecánica y podría simplificarse con una plantilla que revises tú.',
    claro: 'Parece faltar una guía o un primer paso claro, más que una herramienta compleja.',
    tercero: 'La tarea depende de otras personas; una herramienta puede facilitar el seguimiento, pero no garantiza que respondan.',
    herramienta: 'La herramienta actual no parece encajar con la tarea; conviene comprobar primero si permite hacerlo de otra forma o si existe otra que sí lo haga.',
    tiempo: 'El freno principal parece ser el tiempo disponible, algo que una herramienta no resuelve por sí sola.',
    recursos: 'El freno principal parece ser la falta de dinero, materiales u otros recursos, algo que una herramienta no resuelve.',
    ninguno: 'No hay un obstáculo concreto que una herramienta pudiera eliminar.',
    otro: 'El obstáculo no encaja en las categorías previstas, así que la interpretación es más tentativa.',
    nolose: 'Como no está claro qué dificultó la tarea, cualquier propuesta es provisional.'
  };
  var ENERGY_INFER = {
    sinenergia: 'Sabías qué hacer, pero faltaba energía; eso por sí solo no justifica una propuesta de software.',
    grande: 'La tarea parecía demasiado grande; unos pasos más claros podrían facilitar empezar.',
    varias: 'Había varias cosas y costaba elegir; unos criterios de prioridad podrían ayudar.',
    siguiente: 'No estaba claro el siguiente paso; unas instrucciones concretas podrían ayudar.',
    nointeres: 'La actividad no interesaba en ese momento; eso no es algo que una herramienta deba resolver.',
    otra: 'Lo que pasaba no encaja en las opciones previstas, así que no sabemos qué tipo de ayuda encajaría.',
    nolose: 'No está claro qué pasaba, así que no sabemos qué tipo de ayuda encajaría.'
  };

  var RELEVANT = ['tiempo', 'cansancio', 'errores', 'gasto', 'oportunidad', 'ayuda', 'impide', 'otra'];
  var STRONG = ['errores', 'gasto', 'oportunidad', 'impide'];

  function lc(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function quote(s) { return '«' + s + '»'; }

  /* ---------- Señales de una situación explorada ----------
     Las aclaraciones posteriores (qc, qconsec) prevalecen sobre la
     respuesta inicial para la interpretación vigente; la respuesta
     inicial se conserva en el historial y en la exportación. */
  function signals(a, d, n) {
    var K = function (b) { return DC.K(n, b); };
    var r = DC.routeObj(d, n);
    var s = { n: n, r: r, K: K };
    s.situation = r.situation;
    s.task = val(a, K('q6'));
    s.learn = val(a, K('q6b'));
    s.taskVague = (s.task === 'otra' && !DC.text(a, K('q6'), 'otra')) || s.task === 'nolose' ||
      s.learn === 'nolose' || (s.learn === 'otra' && !DC.text(a, K('q6b'), 'otra'));
    s.obstacle = val(a, K('q7'));
    s.obstacleVague = s.obstacle === 'nolose' || (s.obstacle === 'otro' && !DC.text(a, K('q7'), 'otro'));
    s.energy = s.obstacle === 'energia' ? val(a, K('q7b')) : null;
    s.energyAmbiguous = s.obstacle === 'energia' && ['otra', 'nolose'].indexOf(s.energy) !== -1;
    s.energyBehavior = val(a, K('q7c'));
    s.energySkipped = s.energyAmbiguous && !s.energyBehavior;

    s.disp = s.obstacle === 'dispersa' ? val(a, K('q7d')) : null;
    s.dispUnknown = s.obstacle === 'dispersa' && (!s.disp || s.disp === 'nolose' || (s.disp === 'otra' && !DC.text(a, K('q7d'), 'otra')));
    var crit = val(a, K('q7e')) || [];
    s.criteriaNolose = crit.indexOf('nolose') !== -1;
    s.criteria = crit.filter(function (x) { return x !== 'nolose' && x !== 'otra'; });
    s.orderWhat = val(a, K('q6o'));
    var hd = val(a, K('q10d')) || [];
    s.collab = hd.indexOf('colabora') !== -1;
    s.helpDep = hd.filter(function (x) { return ['esperar', 'disponible', 'recordar', 'criterio'].indexOf(x) !== -1; });
    s.helpConsequence = has(a, K('q10b'), 'ayuda') && !s.collab;
    var relSet = s.collab ? RELEVANT.filter(function (x) { return x !== 'ayuda'; }) : RELEVANT;
    var q10list = val(a, K('q10b')) || [];
    var onlyCollab = s.collab && q10list.length > 0 && q10list.every(function (x) { return x === 'ayuda'; });
    var c1 = DC.clarification(a, n, 'c_metodo'), c2 = DC.clarification(a, n, 'c_consecuencia'), c3 = DC.clarification(a, n, 'c_cambio');
    s.unresolved = DC.contradictions(a, d, n).filter(function (c) { var v = DC.clarification(a, n, c.id); return !v || v === 'nodecir'; });
    s.consText = val(a, K('qconsec')) || '';
    var consContradiction = DC.contradictions(a, d, n).some(function (c) { return c.id === 'c_consecuencia'; });
    if (c2 === 'relevante') { s.consState = s.consText ? 'identificadas' : 'sindescribir'; s.relevant = true; s.consClarified = true; }
    else if (c2 === 'norelevante') { s.consState = 'ninguna'; s.relevant = false; }
    else if (onlyCollab) { s.consState = 'ninguna'; s.relevant = false; s.collabOnly = true; }
    else if (hasAny(a, K('q10b'), relSet)) { s.consState = 'identificadas'; s.relevant = true; }
    else if (has(a, K('q10b'), 'ninguna')) {
      if (consContradiction) { s.consState = 'noseguro'; s.relevant = null; }
      else { s.consState = 'ninguna'; s.relevant = false; }
    } else { s.consState = 'noseguro'; s.relevant = null; }

    s.strong = hasAny(a, K('q10b'), STRONG);
    s.works = val(a, K('q9')) === 'bien' && c1 !== 'parcial';
    s.notTried = has(a, K('q8'), 'nointentado');
    s.keepAsIs = has(a, 'q12', 'continuar') && c3 !== 'abierto';
    s.usesApp = has(a, K('q8'), 'app');

    s.improved = val(a, K('q9b')) === 'sirve';
    s.helped = val(a, K('q9c')) || [];
    s.helpedUnknown = s.improved && (!s.helped.length || s.helped.indexOf('norecuerdo') !== -1);
    var rem = val(a, K('q9d'));
    s.remaining = !s.improved ? null : rem === 'si' || rem === 'ocasiones' ? true : rem === 'no' ? false : null;
    s.remainingTask = val(a, K('q9e'));
    s.remainingUnknown = s.improved && (s.remaining === null || (s.remaining && (!s.remainingTask || s.remainingTask === 'nolose' || (s.remainingTask === 'otra' && !DC.text(a, K('q9e'), 'otra')))));

    s.acc = has(a, 'q12', 'accesible');
    s.accItems = (val(a, 'qacc') || []).filter(function (x) { return x !== 'noespecificar'; });
    s.accUnspecified = s.acc && !s.accItems.length && !DC.text(a, 'qacc', 'detalle');

    s.videos = has(a, K('q11'), 'videos');
    s.matsUnknown = has(a, K('q11'), 'nolose');
    s.access = val(a, K('q11c'));
    s.accessRelevant = DC.needsAccess(a, n, r);
    s.integration = ['plataforma', 'varios'].indexOf(s.access) !== -1 || has(a, 'q12', 'encaje');
    s.frequent = DC.scaleRank(val(a, 'q2' + r.situation)) === 3 || ['diario', 'variassemana'].indexOf(val(a, K('q10a'))) !== -1;
    return s;
  }

  /* ---------- Funciones justificadas una a una ----------
     Cada función lleva: en qué respuesta se basa, qué dificultad pretende
     aliviar y qué falta comprobar. Solo se incluyen funciones con una
     relación explícita con la evidencia. */
  function fnFromKind(text, kind, a, d, s) {
    var K = s.K;
    switch (kind) {
      case 'task':
        if (!s.task || s.taskVague) return null;
        return { text: text, evidence: 'Tarea: ' + lc(DC.labelOf(K('q6'), s.task, a, d)) + '.', relieves: 'La parte de la tarea que indicaste.', check: 'Que encaje con cómo haces la tarea ahora.' };
      case 'obstacle':
        if (s.energy && ENERGY[s.energy]) return { text: text, evidence: 'Lo que te pasaba: ' + lc(DC.labelOf(K('q7b'), s.energy, a, d)) + '.', relieves: 'Ese bloqueo al empezar.', check: 'Que en la prueba te ayude a empezar.' };
        if (!s.obstacle || ['manual', 'claro', 'herramienta', 'dispersa', 'tiempo'].indexOf(s.obstacle) === -1) return null;
        return { text: text, evidence: 'Obstáculo: ' + lc(DC.labelOf(K('q7'), s.obstacle, a, d)) + '.', relieves: 'Ese obstáculo.', check: 'Que en la prueba lo reduzca de verdad.' };
      case 'review':
        if (!has(a, 'q12', 'revisar')) return null;
        return { text: text, evidence: 'Condición: permitir revisar y confirmar lo que hace.', relieves: 'Usar un resultado sin poder revisarlo.', check: 'Que revisar no añada pasos innecesarios.' };
      case 'effort':
        if (!has(a, 'q12', 'pococonfig')) return null;
        return { text: text, evidence: 'Condición: requerir poca configuración.', relieves: 'El esfuerzo de usarla.', check: 'Que añadir datos cueste poco.' };
      case 'data':
        if (!val(a, K('q11')) || s.matsUnknown) return null;
        return { text: text, evidence: 'Materiales: ' + val(a, K('q11')).map(function (x) { return lc(DC.labelOf(K('q11'), x, a, d)); }).join(', ') + '.', relieves: 'No saber de dónde sale cada dato.', check: 'Que esas fuentes sean accesibles.' };
    }
    return null;
  }
  function entryFns(entry, a, d, s) {
    if (!entry) return [];
    return entry.f.map(function (x) { return fnFromKind(x[0], x[1], a, d, s); }).filter(Boolean).slice(0, 3);
  }

  function chooseFormat(entry, a, s) {
    if (s.obstacle === 'herramienta' || (entry && entry.existingFirst)) return 'existing';
    if (has(a, 'q12', 'encaje') || (s.usesApp && ['esfuerzo', 'parte'].indexOf(val(a, s.K('q9'))) !== -1)) return 'feature';
    if (has(a, 'q12', 'movil') && !has(a, 'q12', 'ordenador') && s.frequent) return 'app';
    return 'web';
  }

  var INSUF_ENERGY = 'No tenemos información suficiente para proponer una ayuda tecnológica para esta dificultad.';
  var Q_SOURCES = '¿Dónde está ahora esa información: en mensajes, documentos, papel, aplicaciones o en tu memoria?';

  /* ---------- Hipótesis: recuperar, reunir, capturar, decidir, esperar, experto ----------
     Son hipótesis condicionadas por las respuestas, no recomendaciones automáticas. */
  var HYP = {
    recuperar: { label: 'Recuperar información', idea: 'Una forma de localizar lo que necesitas (un índice o un buscador), si las fuentes son accesibles.', when: 'si te cuesta encontrar lo que necesitas',
      measure: 'Encontrar la información necesaria sin repetir búsquedas.', fields: ['qué es', 'dónde está'] },
    reunir: { label: 'Reunir información', idea: 'Una vista que reúna la información que necesitas, conservando de dónde sale cada dato.', when: 'si sabes dónde está la información, pero tienes que reunirla para decidir',
      measure: 'Tener a la vista lo necesario y detectar qué dato falta para decidir.', fields: ['dato', 'de dónde sale'] },
    capturar: { label: 'Capturar pendientes', idea: 'Una bandeja de entrada sencilla para anotar cada pendiente en cuanto aparece, si anotarlo cuesta poco.', when: 'si parte de lo pendiente solo está en tu memoria',
      measure: 'Comprobar que los pendientes nuevos quedan anotados sin depender de recordarlos.', fields: ['pendiente', 'de dónde viene'] },
    decidir: { label: 'Decidir entre pendientes', idea: 'Mostrar junto a cada pendiente los datos que tú necesitas para decidir, sin imponer criterios.', when: 'si lo que falta es saber qué hacer primero',
      measure: 'Identificar un siguiente paso y explicar por qué.' },
    esperar: { label: 'Esperar información o acciones', idea: 'Una vista de asuntos bloqueados: qué falta y de quién depende.', when: 'si dependes de que otra persona te dé información o haga algo',
      measure: 'Saber qué asunto está bloqueado y por quién.', fields: ['qué falta', 'de quién depende'] },
    experto: { label: 'Necesitar el criterio de otra persona', idea: 'Facilitar la preparación de la consulta: reunir antes la información que esa persona necesita para darte su criterio. No sustituye sus conocimientos.', when: 'si necesitas el criterio o los conocimientos de otra persona',
      measure: 'Llegar a la consulta con lo necesario y salir con una decisión, sin tener que repetirla.', fields: ['qué hay que decidir', 'qué necesita ver esa persona'] }
  };

  function hypotheses(a, d, s) {
    var ids = [], K = s.K;
    function add(id) { if (ids.indexOf(id) === -1) ids.push(id); }
    if (s.obstacle === 'dispersa' && !s.dispUnknown) {
      if (s.disp === 'encontrar') add('recuperar');
      if (s.disp === 'reunir') { add('reunir'); if (['P', 'E', 'D'].indexOf(s.situation) !== -1 || s.criteria.length) add('decidir'); }
      if (s.disp === 'memoria') add('capturar');
      if (s.disp === 'otrapersona') add('esperar');
      if (s.disp === 'otra') { /* descrito con texto: se muestra como evidencia, sin hipótesis automática */ }
    }
    if (s.obstacle === 'tercero') add('esperar');
    if (hasAny(a, K('q10d'), ['esperar', 'disponible'])) add('esperar');
    if (has(a, K('q10d'), 'recordar')) add('capturar');
    if (has(a, K('q10d'), 'criterio')) add('experto');
    if (s.situation === 'P' && s.criteria.length) add('decidir');
    return ids;
  }

  /* Interpretaciones posibles cuando todavía no sabemos qué significa «dispersa» */
  function candidateHyps(a, d, s) {
    var ids = ['reunir'];
    if (['P', 'E', 'D'].indexOf(s.situation) !== -1) ids.push('decidir');
    if (s.helpConsequence || s.obstacle === 'tercero') ids.push('esperar');
    if (s.situation === 'A') ids.unshift('recuperar');
    if (s.situation === 'D') ids.push('capturar');
    return ids;
  }

  function hypFn(id, a, d, s) {
    var K = s.K, h = HYP[id];
    var lbl = function (k, v) { return lc(DC.labelOf(K(k), v, a, d)); };
    switch (id) {
      case 'recuperar': return { text: 'Un índice de dónde está cada cosa que necesitas, con búsqueda por palabra.', evidence: 'Sobre la dispersión indicaste: ' + lbl('q7d', 'encontrar') + '.', relieves: 'Tener que buscar lo que necesitas en varios sitios.', check: 'Que las fuentes sean accesibles para localizarlas o buscar en ellas.' };
      case 'reunir': return { text: 'Una vista con la información que necesitas para decidir, indicando de dónde sale cada dato.', evidence: 'Sobre la dispersión indicaste: ' + lbl('q7d', 'reunir') + '.', relieves: 'Tener que reunir la información cada vez que decides.', check: 'Qué información exacta hay que reunir y si se puede consultar donde está.' };
      case 'capturar': return { text: 'Una bandeja sencilla donde anotar cada pendiente en cuanto aparece.', evidence: s.disp === 'memoria' ? 'Sobre la dispersión indicaste: ' + lbl('q7d', 'memoria') + '.' : 'Sobre la ayuda que necesitas: ' + lbl('q10d', 'recordar') + '.', relieves: 'Depender de recordar lo que no está anotado.', check: 'Que anotar cada pendiente te cueste menos que recordarlo.' };
      case 'decidir':
        if (!s.criteria.length) return null;
        return { text: 'Mostrar junto a cada pendiente solo estos datos: ' + s.criteria.map(function (x) { return lbl('q7e', x); }).join('; ') + '.', evidence: 'Indicaste que para elegir qué hacer primero necesitas saber eso.', relieves: 'Elegir sin tener a la vista lo que necesitas saber.', check: 'Que esos datos estén disponibles y que con ellos puedas elegir y explicar tu elección.' };
      case 'esperar': return { text: 'Una lista de asuntos bloqueados: qué falta y de quién depende.', evidence: s.disp === 'otrapersona' ? 'Sobre la dispersión indicaste: ' + lbl('q7d', 'otrapersona') + '.' : hasAny(a, K('q10d'), ['esperar', 'disponible']) ? 'Sobre la ayuda que necesitas: ' + val(a, K('q10d')).filter(function (x) { return x === 'esperar' || x === 'disponible'; }).map(function (x) { return lbl('q10d', x); }).join('; ') + '.' : 'Obstáculo: dependía de una respuesta o acción de otra persona.', relieves: 'No saber qué está pendiente de otra persona.', check: 'Que puedas actualizarla cuando algo cambie, sin depender de la otra persona.' };
      case 'experto': return { text: 'Una nota para preparar la consulta: qué necesitas decidir y qué información tendría que ver esa persona.', evidence: 'Sobre la ayuda que necesitas: ' + lbl('q10d', 'criterio') + '.', relieves: 'Llegar a la consulta sin lo necesario y tener que repetirla.', check: 'No sustituye su criterio ni sus conocimientos; solo prepara la consulta.' };
    }
    return null;
  }

  /* Huecos: cada uno con su motivo y la pregunta que lo resolvería.
     El primero define el estado provisional y la pregunta pendiente. */
  function engineGaps(a, d, s, ids) {
    var g = [], K = s.K;
    if (s.obstacle === 'dispersa' && s.dispUnknown) g.push({ core: true, reason: 'Todavía no sabemos qué significa en tu caso que la información esté dispersa.',
      q: s.disp === 'nolose' ? 'La última vez que tuviste que elegir, ¿qué información te faltaba y dónde estaba?' : s.disp === 'otra' ? 'Si puedes, describe en una frase qué ocurre cuando dices que la información está dispersa.'
        : 'Cuando dices que la información está dispersa, ¿qué ocurre: sabes dónde está y tienes que reunirla, no todo está anotado, la tiene otra persona o te cuesta encontrarla?' });
    if (s.situation === 'P' && s.task === 'ambitos' && (!s.orderWhat || s.orderWhat === 'nolose' || (s.orderWhat === 'otra' && !DC.text(a, K('q6o'), 'otra')))) g.push({ core: true, reason: 'Todavía no sabemos qué intentas ordenar.',
      q: s.orderWhat === 'nolose' ? 'La última vez, ¿entre qué cosas tenías que elegir?' : '¿Qué estás intentando ordenar principalmente: tareas de distintos proyectos, peticiones de otras personas, compromisos con fechas u otra cosa?' });
    if (s.helpConsequence && !val(a, K('q10d'))) g.push({ reason: 'No sabemos si necesitar ayuda te supone una dificultad o es colaboración normal.', q: '¿Qué parte de necesitar esa ayuda te dificulta la tarea, si alguna?' });
    if (has(a, K('q10d'), 'nolose')) g.push({ reason: 'No sabemos qué parte de necesitar ayuda te dificulta la tarea.', q: 'La última vez que necesitaste esa ayuda, ¿qué pasó mientras tanto?' });
    if (ids.indexOf('reunir') !== -1 && !s.criteria.length) g.push({ core: false, reason: 'No sabemos qué información necesitas tener reunida.', q: s.criteriaNolose ? 'La última vez que elegiste, ¿qué miraste antes de decidir?' : '¿Qué información necesitas tener reunida para decidir?' });
    if (ids.indexOf('decidir') !== -1 && !s.criteria.length && ids.indexOf('reunir') === -1) g.push({ reason: 'No sabemos qué datos necesitas para elegir qué hacer primero.', q: s.criteriaNolose ? 'La última vez que elegiste, ¿por qué empezaste por esa?' : '¿Qué necesitas saber de cada cosa para elegir qué hacer primero?' });
    if (ids.indexOf('esperar') !== -1) g.push({ reason: 'No sabemos qué necesitas exactamente de la otra persona.', q: '¿Qué necesitas exactamente de esa persona para avanzar?' });
    if (s.matsUnknown || s.access === 'nolose') g.push({ reason: 'No sabemos dónde está la información que habría que usar.', q: Q_SOURCES });
    else if (s.accessRelevant && ['propios'].indexOf(s.access) === -1) g.push({ reason: 'No sabemos si se puede usar la información donde está ahora.',
      q: s.videos ? '¿Puedes usar esas grabaciones fuera de donde las ves ahora, por ejemplo guardarlas o pausarlas para tomar notas?' : '¿Puedes usar esos materiales fuera del sitio donde están ahora, por ejemplo copiarlos o guardarlos?' });
    return g;
  }

  function baseDecision(a, d, s) {
    var sitCat = CATALOG[s.situation] || {};
    var entry = sitCat[s.task] || sitCat.otra;
    var r = { entry: entry, format: null, test: false, hyp: null, gaps: [], fns: [] };
    var described = function (lvl) { return s.relevant === true ? 'sindescribir' : lvl; };

    if (s.works && s.relevant !== true) {
      r.level = 'actual'; r.format = 'none';
      r.text = 'Tu forma actual de hacerlo parece adecuada y no has indicado consecuencias relevantes. No proponemos cambiarla.';
      r.reason = 'Indicaste que tu método funciona bien, sin consecuencias relevantes.';
      return r;
    }
    if (s.relevant === false) {
      r.level = 'norelevante'; r.format = 'none';
      r.text = 'Has indicado que esta tarea no tiene consecuencias relevantes para ti. Aunque ocurra a menudo, eso no basta para proponer una ayuda.';
      r.reason = 'En esta situación no has indicado consecuencias relevantes.';
      return r;
    }
    if (s.keepAsIs) {
      r.level = s.strong ? 'insuficiente' : 'actual'; r.format = s.strong ? 'moreinfo' : 'none';
      r.text = s.strong
        ? 'Prefieres continuar como ahora, aunque la tarea tiene consecuencias que has señalado. No proponemos una herramienta; antes convendría entender qué parte de la tarea las provoca.'
        : 'Prefieres continuar como ahora. No proponemos ninguna herramienta.';
      r.reason = s.strong ? 'Hay consecuencias relevantes, pero prefieres no cambiar tu forma de hacerlo.' : 'Indicaste que prefieres continuar como ahora.';
      return r;
    }
    if (s.taskVague && s.obstacleVague) {
      r.level = described('insuficiente'); r.format = 'moreinfo';
      r.text = 'Con la información disponible no podemos describir una ayuda concreta sin inventar detalles.';
      r.reason = 'Falta saber con precisión la tarea y qué la dificulta.';
      return r;
    }
    if (s.obstacle === 'energia') {
      if (ENERGY[s.energy]) { entry = ENERGY[s.energy]; r.entry = entry; }
      else {
        r.level = s.energyAmbiguous ? described('insuficiente') : 'insuficiente'; r.format = 'moreinfo';
        r.text = INSUF_ENERGY;
        if (s.energyAmbiguous && (s.situation === 'P' || s.situation === 'D')) {
          r.hyp = s.situation === 'P'
            ? 'Si la dificultad era elegir entre varias tareas, tener a la vista lo que necesitas saber de cada una podría ayudar. Falta confirmarlo.'
            : 'Si la dificultad era no tener los pendientes a la vista, una lista única podría ayudar. Falta confirmarlo.';
        }
        r.reason = s.energyAmbiguous ? (s.consState === 'sindescribir' ? 'Sabemos que hay consecuencias relevantes, pero todavía no cuáles, ni qué pasaba cuando te faltaban energía o ganas.' : 'No sabemos qué pasaba exactamente cuando te faltaban energía o ganas.') : 'La falta de energía o interés, sin más información, no justifica una propuesta de software.';
        return r;
      }
    }
    if (s.obstacle === 'tiempo' || s.obstacle === 'recursos') {
      var supported = s.obstacle === 'tiempo' && s.relevant === true && entry && !s.taskVague && ['A', 'B', 'D', 'G'].indexOf(s.situation) !== -1 && !s.works;
      if (supported) {
        r.level = 'plausible'; r.format = 'trial'; r.orient = chooseFormat(entry, a, s); r.test = true;
        r.fns = entryFns(entry, a, d, s);
        r.text = 'Una herramienta no te dará más tiempo. Como ayuda limitada, se podría acortar algún paso de la tarea: ' + lc(entry.idea);
        r.reason = 'El freno principal es el tiempo, y no sabemos cuánto se va en pasos que una herramienta pueda acortar.';
        r.gaps = [{ reason: r.reason, q: 'De lo que te lleva esta tarea, ¿qué paso es el que más tiempo se come?' }];
        return r;
      }
      r.level = 'insuficiente'; r.format = 'process';
      r.text = s.obstacle === 'tiempo'
        ? 'Una herramienta no resolverá la falta de tiempo. Podría ayudar reservar un momento concreto y breve para esta tarea, o reducirla a lo imprescindible.'
        : 'Una herramienta no resolverá la falta de dinero, materiales u otros recursos. Antes conviene identificar qué recurso falta y si hay alternativas gratuitas o compartidas.';
      r.reason = 'El obstáculo principal no es algo que una herramienta pueda resolver por sí sola.';
      return r;
    }
    if (s.obstacle === 'tercero' && s.situation === 'C' && entry) {
      r.level = 'plausible'; r.format = 'trial'; r.orient = chooseFormat(entry, a, s); r.test = true;
      r.fns = entryFns(entry, a, d, s);
      r.text = entry.idea + ' Puede reducir los mensajes necesarios, pero no garantiza que las demás personas respondan.';
      r.reason = 'El resultado depende de que otras personas participen.';
      r.gaps = [{ reason: r.reason, q: '¿Qué necesitas exactamente de esas personas para cerrar el acuerdo?' }];
      return r;
    }
    if (s.obstacle === 'ninguno') {
      r.level = described('insuficiente'); r.format = 'moreinfo';
      r.text = 'Has señalado consecuencias, pero ningún obstáculo concreto. Sin saber qué paso cuesta, no proponemos una herramienta todavía.';
      r.reason = 'Falta saber en qué paso de la tarea está la dificultad.';
      return r;
    }

    /* Información dispersa, dependencia de otra persona o necesidad de ayuda */
    if (s.obstacle === 'dispersa' || s.obstacle === 'tercero' || s.helpDep.length) {
      var ids = hypotheses(a, d, s);
      r.gaps = engineGaps(a, d, s, ids);
      r.format = 'trial'; r.orient = 'web';
      if (s.obstacle === 'dispersa' && s.dispUnknown) {
        r.candidates = candidateHyps(a, d, s).map(function (id) { return { label: HYP[id].label, idea: HYP[id].idea, when: HYP[id].when }; });
        r.extraIds = ids.filter(function (id) { return HYP[id]; });
        r.text = 'Todavía no sabemos qué significa en tu caso que la información esté dispersa. Según lo que signifique, la ayuda sería distinta, así que no proponemos una función concreta todavía.';
      } else if (s.obstacle === 'dispersa' && s.disp === 'otra' && !ids.length) {
        r.text = 'Has descrito la dispersión con tus palabras. No la interpretamos de forma automática; antes de proponer algo conviene comentarla.';
      } else {
        r.text = ids.length ? 'Hipótesis según tus respuestas, para comprobar con una prueba sencilla:' : 'Con lo que sabemos no podemos proponer una función concreta todavía.';
      }
      r.hyps = (r.candidates ? (r.extraIds || []).filter(function (id) { return id === 'experto' || id === 'capturar'; }) : ids).map(function (id) {
        return { id: id, label: HYP[id].label, idea: HYP[id].idea, measure: HYP[id].measure, fields: HYP[id].fields };
      });
      r.fns = r.hyps.map(function (h) { return hypFn(h.id, a, d, s); }).filter(Boolean).slice(0, 3);
      if (ids.indexOf('decidir') !== -1 && s.criteria.length) r.hyps.forEach(function (h) { if (h.id === 'decidir') h.fields = s.criteria.map(function (x) { return lc(DC.labelOf(s.K('q7e'), x, a, d)); }); });
      r.test = r.fns.length > 0 && !r.gaps.some(function (g) { return g.core; });
      if (s.consState === 'sindescribir') r.gaps.unshift({ reason: 'Todavía no sabemos cuáles son las consecuencias.', q: 'La última vez que ocurrió, ¿qué cambió para ti por no poder hacerlo como querías?' });
      r.level = r.gaps.length || !r.fns.length ? 'plausible' : 'ok';
      r.reason = r.gaps.length ? 'Es provisional: ' + lc(r.gaps[0].reason) : (r.fns.length ? 'La necesidad, lo que la dificulta y los datos que hay que tener a la vista están definidos.' : 'Faltan datos para concretar la ayuda.');
      return r;
    }

    /* Resto: propuesta del catálogo, con funciones justificadas */
    r.format = 'trial'; r.orient = chooseFormat(entry, a, s); r.test = true;
    r.text = entry.idea;
    if (r.orient === 'existing') r.text += s.obstacle === 'herramienta'
      ? ' Como la herramienta actual es parte del problema, el primer paso sería comprobar si permite hacerlo de otra forma o si otra existente lo resuelve.'
      : ' Ya existen herramientas habituales que hacen algo parecido; conviene probar alguna antes de construir nada.';
    r.fns = entryFns(entry, a, d, s);
    var g = [];
    if (s.consState === 'sindescribir') g.push({ reason: 'Todavía no sabemos cuáles son las consecuencias.', q: 'La última vez que ocurrió, ¿qué cambió para ti por no poder hacerlo como querías?' });
    if (s.taskVague) g.push({ core: true, reason: 'Todavía no sabemos con precisión la tarea.', q: (s.learn === 'nolose' || s.task === 'nolose') ? 'Piensa en la última vez: ¿qué tenías delante y qué querías conseguir?' : '¿Qué intentabas hacer exactamente la última vez que te ocurrió?' });
    if (s.obstacleVague) g.push({ core: true, reason: 'Todavía no sabemos qué dificulta la tarea.', q: s.obstacle === 'nolose' ? 'La última vez, ¿en qué momento concreto dejaste de avanzar?' : 'La última vez que ocurrió, ¿en qué paso concreto te quedaste parado/a o perdiste más tiempo?' });
    if (s.relevant !== true) g.push({ reason: 'Todavía no está claro qué consecuencia tiene.', q: has(a, s.K('q10b'), 'nolose') ? 'La última vez que salió peor de lo que querías, ¿qué pasó después?' : '¿Qué pasa cuando esta tarea sale mal o tarda más de la cuenta?' });
    if (s.matsUnknown) g.push({ reason: 'No sabemos qué materiales o información se usan.', q: Q_SOURCES });
    if (s.accessRelevant && (!s.access || s.access === 'nolose' || s.access === 'otrapersona')) g.push({ reason: 'No sabemos si se puede acceder a los materiales.', q: s.videos ? '¿Puedes usar esas grabaciones fuera de donde las ves ahora, por ejemplo guardarlas o pausarlas para tomar notas?' : '¿Puedes usar esos materiales fuera del sitio donde están ahora, por ejemplo copiarlos o guardarlos?' });
    if (s.unresolved.length) g.push({ reason: 'Hay una aparente contradicción en tus respuestas.', q: 'Tu forma actual de hacerlo, ¿te resuelve la tarea por completo o solo en parte?' });
    if (d.uncertain && s.n === 1) g.push({ reason: 'No estabas seguro/a de que esta situación te causara una dificultad.', q: 'Si pudieras facilitar solo una cosa de esta tarea, ¿cuál sería?' });
    r.gaps = g;
    r.level = g.length || !r.fns.length ? 'plausible' : 'ok';
    r.reason = g.length ? 'Es provisional: ' + lc(g[0].reason) : 'La tarea, el obstáculo y sus consecuencias están definidos.';
    if (s.taskVague || !r.fns.length || g.some(function (x) { return x.core; })) r.test = false;
    return r;
  }

  /* Una mejora que ya funciona: mantenerla, complementarla solo si queda
     algo por facilitar, y nunca proponer una aplicación nueva por defecto. */
  function decide(a, d, s) {
    var r = baseDecision(a, d, s);
    if (!s.improved) return r;
    var helped = s.helpedUnknown ? 'la mejora que probaste' : 'lo que te ayudó (' + s.helped.map(function (x) { return lc(DC.labelOf(s.K('q9c'), x, a, d)); }).join(', ') + ')';
    if (s.remaining === false) {
      return { level: 'actual', format: 'keep', test: false, entry: null, fns: [], gaps: [],
        text: 'La mejora que probaste te funciona suficientemente bien ahora. Lo razonable es mantener ' + helped + '; no proponemos una herramienta nueva.',
        reason: 'Indicaste que, con esa mejora, ahora te funciona suficientemente bien.' };
    }
    var keep = 'Mantén ' + helped + ', porque te ha servido.';
    var cat = CATALOG[s.situation] || {};
    var e2 = cat[s.remainingTask] || r.entry;
    if (s.remaining === true && !s.remainingUnknown && (r.level === 'ok' || r.level === 'plausible') && e2 && !r.hyps) {
      var fns = entryFns(e2, a, d, s);
      return { level: 'plausible', format: 'complement', test: fns.length > 0, entry: e2, hyp: r.hyp, fns: fns,
        gaps: [{ reason: 'Falta comprobar que el complemento aporta algo en lo que queda.', q: 'En lo que todavía queda por facilitar, ¿qué paso concreto te cuesta?' }],
        text: keep + ' Para lo que queda, se podría complementar con esto: ' + lc(e2.idea),
        reason: 'Es provisional: falta comprobar que el complemento aporta algo en lo que queda.' };
    }
    r.text = keep + ' ' + r.text;
    if (r.level === 'ok' || r.level === 'plausible') {
      r.level = 'plausible'; r.test = false; r.format = 'complement';
      r.gaps = [{ reason: 'Ya tienes una mejora que funciona y todavía no sabemos qué queda por facilitar.', q: 'Con la mejora que ya usas, ¿en qué momento sigue costándote?' }].concat(r.gaps || []);
      r.reason = 'Es provisional: ya tienes una mejora que funciona y todavía no sabemos qué queda por facilitar.';
    }
    return r;
  }

  /* Primera prueba manual antes de decidir el formato */
  function trialSteps(r, a, d, s) {
    if (!r.test) return [];
    var noun = ['P', 'D'].indexOf(s.situation) !== -1 ? 'pendientes' : 'ejemplos de esta tarea';
    var fields = [];
    (r.hyps || []).forEach(function (h) { if (h.id === 'experto' && r.hyps.length > 1) return; (h.fields || []).forEach(function (f) { if (fields.indexOf(f) === -1) fields.push(f); }); });
    var steps = ['Reúne entre tres y cinco ' + noun + ' reales en una tabla o un documento.'];
    steps.push(fields.length ? 'Añade solo estos campos: ' + fields.join(', ') + '.' : 'Añade solo los datos que realmente uses; no hace falta definir campos de antemano.');
    var main = (r.hyps && r.hyps[0]) ? r.hyps[0].id : null;
    if (main === 'decidir' || (r.hyps || []).some(function (h) { return h.id === 'decidir'; })) {
      steps.push('Comprueba si con eso puedes elegir un siguiente paso.');
      steps.push('Comprueba si puedes explicar por qué lo eliges.');
    } else if (main) steps.push('Úsalo la próxima vez y comprueba esto: ' + lc(HYP[main].measure));
    else steps.push('Úsalo la próxima vez que hagas la tarea.');
    steps.push('Anota qué información sigue faltando.');
    steps.push('Valora si mantenerlo al día te cuesta menos esfuerzo del que te ahorra.');
    return steps;
  }

  function checks(r, a, s) {
    var c = [];
    if (r.level !== 'ok' && r.level !== 'plausible') return c;
    if (s.videos) c.push('No damos por hecho que se pueda acceder al vídeo, al audio ni a una transcripción.');
    if (s.integration || s.accessRelevant) c.push('Si se puede usar la información donde está ahora. No damos por hecho que se pueda descargar, conectar ni procesar.');
    if (s.access === 'otrapersona') c.push('Los materiales los tiene otra persona u organización: habría que confirmar si es posible y adecuado usarlos.');
    if (s.situation === 'G' && ['apuntes', 'ideas', 'repasar'].indexOf(s.task) !== -1) c.push('Cualquier apunte o resumen preparado de forma automática tendría que revisarse: no damos por hecho que sea exacto ni que ahorre tiempo.');
    return c.slice(0, 3);
  }

  /* Pregunta pendiente: coincide con el motivo por el que la propuesta es
     provisional y nunca repite una pregunta ya respondida con «No lo sé». */
  function pendingQuestion(r, a, d, s) {
    if (r.level === 'actual' || r.level === 'norelevante') return null;
    if (r.gaps && r.gaps.length) return r.gaps[0].q;
    if (r.test) return 'Si tuvieras que mantener esa tabla al día, ¿cuánto esfuerzo te compensaría dedicarle cada semana?';
    if (s.consState === 'sindescribir') return 'La última vez que ocurrió, ¿qué cambió para ti por no poder hacerlo como querías?';
    if (s.taskVague) return (s.learn === 'nolose' || s.task === 'nolose') ? 'Piensa en la última vez: ¿qué tenías delante y qué querías conseguir?' : '¿Qué intentabas hacer exactamente la última vez que te ocurrió?';
    if (s.improved && s.remainingUnknown) return 'Con la mejora que ya usas, ¿en qué momento sigue costándote?';
    if (s.obstacle === 'energia' && s.energy === 'otra') return 'Si puedes, describe en una frase lo que te pasaba aquella vez.';
    if (s.obstacleVague || s.obstacle === 'ninguno') return s.obstacle === 'nolose' ? 'La última vez, ¿en qué momento concreto dejaste de avanzar?' : 'La última vez que ocurrió, ¿en qué paso concreto te quedaste parado/a o perdiste más tiempo?';
    if (s.relevant === null) return has(a, s.K('q10b'), 'nolose') ? 'La última vez que salió peor de lo que querías, ¿qué pasó después?' : '¿Qué pasa cuando esta tarea sale mal o tarda más de la cuenta?';
    if (s.unresolved.length) return 'Tu forma actual de hacerlo, ¿te resuelve la tarea por completo o solo en parte?';
    if (s.keepAsIs && s.strong) return '¿Qué parte de la tarea provoca la consecuencia que señalaste?';
    return null;
  }

  /* Otros puntos que siguen pendientes (incluye seguimientos omitidos
     para mantener el cuestionario breve). */
  function pendingPoints(r, a, d, s, question) {
    var p = [];
    if (s.consState === 'sindescribir' && question && question.indexOf('qué cambió para ti') === -1) p.push('Cuáles son las consecuencias de esta situación.');
    if (s.taskVague) p.push('Qué intentabas hacer exactamente: la tarea sigue siendo demasiado general.');
    if (s.helpedUnknown) p.push('Qué fue exactamente lo que te ayudó.');
    if (s.improved && s.remainingUnknown) p.push('Qué queda por facilitar con la mejora que ya usas.');
    if (s.energySkipped) p.push('Qué acabaste haciendo la última vez que te faltaron energía o ganas (no lo preguntamos porque había otros puntos más útiles y queríamos mantener el cuestionario breve).');
    if (s.accUnspecified) p.push('Si quieres concretarlo, qué ajustes de accesibilidad necesitas.');
    if (s.accessRelevant && (!s.access || s.access === 'nolose')) p.push('Si se puede acceder a los materiales que usas.');
    return p.filter(function (x) { return x !== question; });
  }

  function requirements(a, d, s) {
    var req = (val(a, 'q12') || []).filter(function (x) { return x !== 'continuar' && x !== 'accesible'; }).map(function (x) { return DC.labelOf('q12', x, a, d); });
    if (s.acc) {
      if (s.accUnspecified) req.push('La ayuda tendría que adaptarse a tus necesidades de accesibilidad; falta concretar qué ajustes necesitas.');
      else {
        var items = s.accItems.map(function (x) { return lc(DC.labelOf('qacc', x, a, d)); });
        var det = DC.text(a, 'qacc', 'detalle');
        req.push('Accesibilidad: permitirte ' + items.join(', ') + (det ? ' (' + quote(det) + ')' : '') + '.');
      }
    }
    return req;
  }

  function facts(a, d, s) {
    var K = s.K, f = {}, r = s.r;
    if (r.source === 'alt') f.situation = 'Indicaste que en el último mes no pudiste empezar o mantener esto: ' + lc(DC.labelOf('qalt', r.alt, a, d)) + '.';
    else {
      var fr = DC.SCALE.filter(function (x) { return x.id === val(a, 'q2' + s.situation); })[0];
      f.situation = fr && fr.rank
        ? 'Indicaste que ' + lc(fr.label) + ' de las últimas dos semanas ' + DC.SITUATIONS[s.situation].fact + (s.r.source === 'single' || s.r.source === 'chosen' || s.r.source === 'consequences' ? ', y que te causó una dificultad que te importa.' : '.')
        : 'Elegiste explorar esta situación: ' + lc(DC.SITUATIONS[s.situation].short) + '.';
    }
    var amb = val(a, K('q5'));
    var ambTxt = !amb ? '' : amb === 'varios' ? ' Te ocurre en varios ámbitos.' : amb === 'otro' ? ' Te ocurre en otro ámbito.' : ' Ámbito: ' + lc(DC.labelOf(K('q5'), amb, a, d)) + '.';
    if (s.task) {
      var tt = DC.text(a, K('q6'), 'otra');
      f.task = (s.task === 'otra' ? (tt ? 'Describiste la tarea así: ' + quote(tt) + '.' : 'Indicaste otra tarea, sin más detalle.')
        : (s.situation === 'G' ? 'Indicaste que lo que más te cuesta es: ' : 'Indicaste que la tarea más parecida es: ') + lc(DC.labelOf(K('q6'), s.task, a, d)) + '.');
      if (s.learn) {
        var lt = DC.text(a, K('q6b'), 'otra');
        f.task += s.learn === 'nolose' ? ' No sabes concretar más qué intentabas hacer.'
          : ' Concretamente: ' + (s.learn === 'otra' ? (lt ? quote(lt) : 'otra actividad, sin más detalle') : lc(DC.labelOf(K('q6b'), s.learn, a, d))) + '.';
      }
      if (s.orderWhat) {
        var ow = DC.text(a, K('q6o'), 'otra');
        f.task += s.orderWhat === 'nolose' ? ' No sabes concretar qué intentas ordenar.' : ' Lo que intentas ordenar: ' + (s.orderWhat === 'otra' ? (ow ? quote(ow) : 'otra cosa, sin más detalle') : lc(DC.labelOf(K('q6o'), s.orderWhat, a, d))) + '.';
      }
      f.task += ambTxt;
    }
    if (s.obstacle) {
      var ot = DC.text(a, K('q7'), 'otro');
      f.obstacle = s.obstacle === 'otro' ? (ot ? 'Describiste lo que la dificultó así: ' + quote(ot) + '.' : 'Indicaste otro obstáculo, sin más detalle.')
        : 'Indicaste que lo que más la dificultó fue: ' + lc(DC.labelOf(K('q7'), s.obstacle, a, d)) + '.';
      if (s.energy) f.obstacle += ' Lo que mejor lo describe: ' + lc(DC.labelOf(K('q7b'), s.energy, a, d)) + '.';
      if (s.energyBehavior) f.obstacle += ' La última vez: ' + lc(DC.labelOf(K('q7c'), s.energyBehavior, a, d)) + '.';
      if (s.obstacle === 'dispersa' && s.disp) {
        var dt = DC.text(a, K('q7d'), 'otra');
        f.obstacle += s.disp === 'nolose' ? ' No sabes concretar qué ocurre con esa información.' : ' Lo que ocurre: ' + (s.disp === 'otra' ? (dt ? quote(dt) : 'otra cosa, sin más detalle') : lc(DC.labelOf(K('q7d'), s.disp, a, d))) + '.';
      }
      if (s.criteria.length) f.obstacle += ' Para elegir qué hacer primero necesitas saber: ' + s.criteria.map(function (x) { return lc(DC.labelOf(K('q7e'), x, a, d)); }).join('; ') + '.';
    }
    if (s.consState === 'sindescribir') f.consequence = 'Has indicado que esta situación tiene consecuencias relevantes, pero todavía no sabemos cuáles.';
    else if (s.consState === 'identificadas' && s.consClarified) f.consequence = 'Has aclarado que sí tiene consecuencias relevantes: ' + quote(s.consText) + '.';
    else if (s.consState === 'identificadas') {
      f.consequence = 'Consecuencia: ' + val(a, K('q10b')).filter(function (x) { return RELEVANT.indexOf(x) !== -1 && !(s.collab && x === 'ayuda'); }).map(function (x) { return lc(DC.labelOf(K('q10b'), x, a, d)); }).join('; ') + '.';
      if (val(a, K('q10c'))) f.consequence += ' Tiempo en los pasos difíciles: ' + lc(DC.labelOf(K('q10c'), val(a, K('q10c')), a, d)) + '.';
    } else if (s.consState === 'noseguro') f.consequence = 'No está claro todavía si esta situación tiene consecuencias relevantes para ti.';
    else if (s.consState === 'ninguna') f.consequence = 'Has indicado que no tiene consecuencias relevantes.';
    if (val(a, K('q10d'))) f.consequence = (f.consequence ? f.consequence + ' ' : '') + (s.collab ? 'Necesitar ayuda no te supone una dificultad: es colaboración normal.'
      : 'Sobre la ayuda que necesitas: ' + val(a, K('q10d')).map(function (x) { return lc(DC.labelOf(K('q10d'), x, a, d)); }).join('; ') + '.');
    if (val(a, K('q8'))) {
      if (s.notTried) f.method = 'Indicaste que todavía no has intentado hacer esa tarea.';
      else {
        var tool = DC.text(a, K('q8'), 'tool');
        f.method = 'La haces así: ' + val(a, K('q8')).map(function (x) { return lc(DC.labelOf(K('q8'), x, a, d)); }).join(', ') + (tool ? ' (' + quote(tool) + ')' : '') + '.';
        if (val(a, K('q9'))) f.method += ' Te funciona: ' + lc(DC.labelOf(K('q9'), val(a, K('q9')), a, d)) + '.';
        if (s.improved) {
          var det = DC.text(a, K('q9c'), 'detalle');
          f.method += ' Probaste algo para facilitarla y te ha servido' + (s.helpedUnknown ? ' (no recuerdas qué fue)' : ': ' + s.helped.map(function (x) { return lc(DC.labelOf(K('q9c'), x, a, d)); }).join(', ')) + (det ? ' (' + quote(det) + ')' : '') + '.';
          if (s.remaining === false) f.method += ' Con esa mejora, ahora te funciona suficientemente bien.';
          else if (s.remaining === true) {
            var rt = s.remainingTask, rtt = DC.text(a, K('q9e'), 'otra');
            f.method += ' Aún queda algo por facilitar' + (val(a, K('q9d')) === 'ocasiones' ? ' en algunas ocasiones' : '') + ': ' +
              (!rt || rt === 'nolose' ? 'todavía no sabes qué.' : rt === 'otra' ? (rtt ? quote(rtt) + '.' : 'otra cosa, sin más detalle.') : lc(DC.labelOf(K('q9e'), rt, a, d)) + '.');
          } else f.method += ' No sabes si queda algo por facilitar.';
        } else if (val(a, K('q9b'))) f.method += ' ¿Has probado algo para facilitarla?: ' + lc(DC.labelOf(K('q9b'), val(a, K('q9b')), a, d)) + '.';
      }
    }
    if (val(a, K('q11'))) {
      f.materials = 'Utilizas o consultas: ' + val(a, K('q11')).map(function (x) { return lc(DC.labelOf(K('q11'), x, a, d)); }).join(', ') + '.';
      if (s.access) f.materials += ' Dónde están: ' + lc(DC.labelOf(K('q11c'), s.access, a, d)) + '.';
    }
    return f;
  }

  function inferences(r, a, d, s) {
    var out = [];
    if (s.energy && ENERGY_INFER[s.energy]) out.push(ENERGY_INFER[s.energy]);
    else if (s.obstacle && OBSTACLE_INFER[s.obstacle]) out.push(OBSTACLE_INFER[s.obstacle]);
    if (s.energyBehavior && s.energyBehavior !== 'norecuerdo') out.push('Lo que acabaste haciendo describe lo que pasó, no su causa.');
    if (s.improved) out.push('Ya tienes una mejora que te funciona; cualquier ayuda debería mantenerla o completarla, no sustituirla.');
    if (s.works) out.push('Tu forma actual parece cumplir buena parte de su función.');
    else if (['esfuerzo', 'parte', 'noterminar', 'depende'].indexOf(val(a, s.K('q9'))) !== -1 && !s.improved) out.push('Tu forma actual cumple solo en parte o con más esfuerzo del que quisieras.');
    if (s.notTried) out.push('No tenemos información sobre un método actual.');
    else if (val(a, s.K('q9b')) === 'no') out.push('No has indicado haber probado una mejora.');
    if (s.obstacle === 'dispersa' && val(a, 'q2A') === 'nunca') out.push('Que no busques información en varios sitios no contradice que esté dispersa: puede que sepas dónde está y necesites verla reunida.');
    if (s.collab) out.push('Recibir ayuda es, en tu caso, colaboración normal; no lo tratamos como una dificultad.');
    if (has(a, s.K('q10d'), 'criterio')) out.push('Necesitas el criterio o los conocimientos de otra persona: una lista de tareas no sustituiría esa ayuda.');
    if (s.consClarified) out.push('Tu aclaración posterior sobre las consecuencias sustituye a tu respuesta inicial en esta interpretación; la inicial se conserva en tus respuestas.');
    if (d.uncertain && s.n === 1) out.push('No estabas seguro/a de que esta situación te causara una dificultad, así que la interpretación es más tentativa.');
    if (s.r.source === 'freq') out.push('Exploramos esta situación por ser la más frecuente, como criterio provisional; eso no significa que sea la más importante.');
    if (s.n === 1 && val(a, 'qconfirm') === 'parte') out.push('Indicaste que esta situación representa solo en parte lo que más te interesaría facilitar.');
    if (s.unresolved.length) out.push('Algunas respuestas parecen contradictorias y no se han aclarado; no las hemos corregido ni elegido entre ellas.');
    return out;
  }

  function buildRoute(a, d, n, commentEvidence) {
    var s = signals(a, d, n);
    var r = decide(a, d, s);
    var f = facts(a, d, s);
    var evidence = ['situation', 'task', 'obstacle', 'consequence', 'method', 'materials'].filter(function (k) { return f[k]; }).map(function (k) { return f[k]; });
    evidence = evidence.slice(0, commentEvidence ? 4 : 5);
    if (commentEvidence) evidence.push(commentEvidence);
    var taskTxt = '';
    if (s.task) {
      taskTxt = (s.situation === 'G' ? 'Lo que más cuesta: ' : 'Tarea: ') + (s.task === 'otra' ? (DC.text(a, s.K('q6'), 'otra') ? quote(DC.text(a, s.K('q6'), 'otra')) : 'otra tarea, sin concretar') : lc(DC.labelOf(s.K('q6'), s.task, a, d)));
      var sub = s.learn ? { k: 'q6b', v: s.learn } : s.orderWhat ? { k: 'q6o', v: s.orderWhat } : null;
      if (sub) taskTxt += (sub.v === 'nolose' || (sub.v === 'otra' && !DC.text(a, s.K(sub.k), 'otra'))) ? ' (sin concretar)' : ' (' + (sub.v === 'otra' ? quote(DC.text(a, s.K(sub.k), 'otra')) : lc(DC.labelOf(s.K(sub.k), sub.v, a, d))) + ')';
      else if (s.situation === 'P' && s.task === 'ambitos') taskTxt += ' (sin concretar qué)';
      taskTxt += '.';
    }
    var summary = [
      'Situación: ' + lc(DC.SITUATIONS[s.situation].short) + '.', taskTxt,
      val(a, s.K('q5')) && ['varios', 'otro'].indexOf(val(a, s.K('q5'))) === -1 ? 'Contexto: ' + lc(DC.labelOf(s.K('q5'), val(a, s.K('q5')), a, d)) + '.' : '',
      s.obstacle ? 'Obstáculo: ' + (s.obstacle === 'otro' && DC.text(a, s.K('q7'), 'otro') ? quote(DC.text(a, s.K('q7'), 'otro')) : lc(DC.labelOf(s.K('q7'), s.obstacle, a, d))) + (s.obstacle === 'dispersa' && s.disp && !s.dispUnknown && s.disp !== 'otra' ? ' (' + lc(DC.labelOf(s.K('q7d'), s.disp, a, d)) + ')' : s.obstacle === 'dispersa' && s.dispUnknown ? ' (sin concretar qué significa)' : '') + '.' : '',
      val(a, s.K('q8')) ? (s.notTried ? 'Todavía no has intentado hacer esa tarea.' : 'Método actual: ' + val(a, s.K('q8')).map(function (x) { return lc(DC.labelOf(s.K('q8'), x, a, d)); }).join(', ') + (s.improved ? ', con una mejora que te ha servido' : '') + '.') : ''
    ].filter(Boolean).join(' ');

    var steps = trialSteps(r, a, d, s);
    var question = pendingQuestion(r, a, d, s);
    var points = (r.gaps || []).slice(1).map(function (g) { return g.reason; });
    pendingPoints(r, a, d, s, question).forEach(function (p) {
      var dup = points.concat([r.reason || '']).some(function (x) {
        return (/consecuencias/.test(x) && /consecuencias/.test(p)) || (/tarea/.test(x) && /intentabas/.test(p)) || (/acceder|dónde está/.test(x) && /acceder/.test(p)) || (/mejora/.test(x) && /mejora/.test(p));
      });
      if (!dup) points.push(p);
    });
    var measures = [];
    if (r.test) {
      (r.hyps && r.hyps.length ? r.hyps.map(function (h) { return h.measure; }) : [MEASURES[s.situation]]).forEach(function (m) { if (m && measures.indexOf(m) === -1) measures.push(m); });
      measures = measures.slice(0, 2);
      measures.push('Mantener la ayuda sin que requiera más esfuerzo del que evita.');
    } else if (r.format === 'process' && r.level === 'plausible') measures.push('La próxima vez que hagas la tarea con ese cambio, compárala con la anterior.');
    var trial = r.format === 'trial' || r.format === 'complement';
    return {
      n: n,
      situation: s.situation,
      situationLabel: DC.SITUATIONS[s.situation].short,
      summary: summary,
      evidence: evidence,
      hypothesis: r.text,
      extraHypothesis: r.hyp,
      hyps: (r.hyps || []).map(function (h) { return { label: h.label, idea: h.idea }; }),
      candidates: r.candidates || null,
      format: trial ? FORMATS.trial : (FORMATS[r.format] || FORMATS.none),
      formatNote: trial && (r.level === 'ok' || r.level === 'plausible')
        ? 'Orientación inicial: ' + lc(FORMATS[r.orient] || FORMATS.existing) + '. Después de la prueba se valoraría si conviene adaptar una herramienta existente, añadir una funcionalidad, crear una web o crear una aplicación.' : '',
      requirements: requirements(a, d, s),
      inferences: inferences(r, a, d, s),
      checks: checks(r, a, s),
      trialSteps: steps,
      firstTest: r.test ? (r.fns || []) : [],
      firstTestNote: r.test ? '' : (r.level === 'ok' || r.level === 'plausible' || r.level === 'sindescribir' ? 'Antes de proponer una prueba conviene aclarar la pregunta pendiente.' : 'No proponemos una prueba con lo explorado.'),
      question: question,
      pendingPoints: points,
      measures: measures,
      measure: measures.length ? measures.join(' ') : null,
      status: { level: r.level, label: STATUS[r.level], symbol: SYMBOL[r.level], reason: r.reason }
    };
  }

  function commentInfo(a, d) {
    var text = val(a, 'q13');
    if (!text) return null;
    var rel = val(a, 'qcomment');
    var cls = val(a, 'qcclass');
    var parts = val(a, 'qcomment2') || [];
    var exploredN = null;
    if (d.r2 && d.r2.trigger === 'comment') exploredN = 2;
    if (d.r1 && d.r1.source === 'comment') exploredN = 1;
    var info = {
      text: text, relation: rel, exploredN: exploredN,
      classification: cls && cls !== 'ninguna' ? DC.SITUATIONS[cls].short : (cls === 'ninguna' ? 'ninguna de las categorías del cuestionario' : null),
      hasIdea: parts.indexOf('idea') !== -1,
      hasExperience: parts.indexOf('experiencia') !== -1,
      pending: !exploredN && ['explorar', 'pendiente'].indexOf(rel) !== -1
    };
    info.question = info.pending ? (cls && PENDING_Q[cls] ? PENDING_Q[cls] : '¿Qué te gustaría poder hacer o facilitar con lo que describes?') : null;
    info.checks = [];
    if (cls === 'G' || (exploredN && DC.routeObj(d, exploredN).situation === 'G')) {
      info.checks.push('No damos por hecho acceso al vídeo, al audio ni a una transcripción, ni que un resultado automático sea exacto o ahorre tiempo.');
    }
    if (info.hasIdea) info.checks.push('Si la necesidad que describes se resuelve mejor con tu idea o con otra forma más sencilla.');
    return info;
  }

  DC.buildReport = function (a) {
    var d = DC.derive(a);
    var c = commentInfo(a, d);
    var ev = null;
    if (c) ev = 'Comentario final' + (c.relation === 'misma' ? ' (sobre esta situación)' : '') + ': ' + quote(c.text) + '.';
    var lastN = d.r2 ? 2 : d.r1 ? 1 : 0;
    var commentForMain = c && (c.relation === 'misma' || c.exploredN === lastN) ? ev : null;
    var main = lastN ? buildRoute(a, d, lastN, commentForMain) : null;
    var previous = lastN === 2 ? buildRoute(a, d, 1, null) : null;

    var explored = d.routes.map(function (r) { return r.situation; });
    var pending = d.candidates.filter(function (s) { return explored.indexOf(s) === -1; }).map(function (s) {
      return { short: DC.SITUATIONS[s].short, question: PENDING_Q[s] };
    });

    var limited = !main || ['insuficiente', 'actual', 'norelevante', 'sindescribir'].indexOf(main.status.level) !== -1;
    var scopeNote = 'Estas conclusiones se refieren solo a lo explorado en el cuestionario; no describen todas tus necesidades.';
    if (limited && (pending.length || (c && c.pending))) scopeNote += ' Quedan situaciones o información pendientes de explorar.';

    return {
      main: main, previous: previous, pending: pending, comment: c, scopeNote: scopeNote,
      empty: !main ? {
        text: d.altReason === 'sin-situaciones' ? 'No indicaste que te ocurriera ninguna de las situaciones exploradas en las últimas dos semanas, ni algo que quieras explorar ahora.'
          : d.altReason === 'no-explorar' ? 'Preferiste no explorar las situaciones que te ocurrieron y no indicaste otra actividad que quieras explorar ahora.'
            : 'Indicaste que las situaciones que te ocurrieron no te causaron una dificultad que te importara, y no hay otra actividad que quieras explorar ahora.',
        status: { level: 'norelevante', label: STATUS.norelevante, symbol: SYMBOL.norelevante, reason: 'Tus respuestas no señalan una dificultad ni una actividad que explorar.' }
      } : null
    };
  };

  DC.STATUS = STATUS;
  DC.FORMATS = FORMATS;
})();
