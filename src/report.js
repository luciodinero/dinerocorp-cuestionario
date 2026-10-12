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
    norelevante: 'No se ha identificado una necesidad relevante en lo explorado'
  };
  var SYMBOL = { ok: 'Lista para probar', plausible: 'Plausible', insuficiente: 'Faltan datos', actual: 'Adecuada', norelevante: 'Sin necesidad' };

  var FORMATS = {
    feature: 'Una funcionalidad dentro de una herramienta que ya usas',
    web: 'Una web sencilla',
    app: 'Una aplicación',
    process: 'Un cambio en la forma de hacerlo',
    existing: 'Explorar primero una herramienta existente',
    moreinfo: 'Obtener más información antes de proponer algo',
    none: 'Ninguna intervención por ahora'
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
      varias: { idea: 'Unos criterios sencillos, como fecha límite y esfuerzo, para ordenar tus tareas y ver cuál va primero, con la decisión final en tus manos.', f: [['Valorar cada tarea con dos criterios que eliges tú', 'task'], ['Orden sugerido que puedes cambiar', 'review'], ['Mostrar solo la siguiente tarea', 'obstacle']] },
      ambitos: { idea: 'Una vista que reúna tareas de ámbitos distintos y te deje marcar cuál va primero según criterios que tú eliges.', f: [['Tareas de distintos ámbitos en una sola lista', 'task'], ['Criterios de prioridad propios', 'obstacle'], ['Orden final decidido por ti', 'review']] },
      grande: { idea: 'Una guía para dividir algo grande en pasos cortos y dejar visible solo el primero.', f: [['Dividir la tarea en pasos cortos', 'task'], ['Mostrar solo el primer paso pendiente', 'obstacle'], ['Marcar pasos hechos', 'measure']] },
      retomar: { idea: 'Una nota del punto donde lo dejaste y del siguiente paso, para retomarlo sin reconstruir dónde estabas.', f: [['Nota del último avance', 'task'], ['Siguiente paso visible al volver', 'obstacle']] },
      otra: { idea: 'Unos criterios sencillos para decidir por dónde empezar, con la decisión final en tus manos.', f: [['Criterios propios para ordenar', 'task'], ['Siguiente tarea visible', 'obstacle']] }
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
    varias: { idea: 'Unos criterios sencillos para decidir qué hacer primero entre varias cosas, con la decisión final en tus manos.', f: [['Valorar cada tarea con dos criterios que eliges tú', 'task'], ['Mostrar solo la siguiente', 'obstacle'], ['Cambiar el orden cuando quieras', 'review']] },
    siguiente: { idea: 'Instrucciones concretas del siguiente paso, escritas cuando lo tienes claro, para encontrarlas cuando vuelvas a la tarea.', f: [['Escribir el siguiente paso en una línea', 'task'], ['Verlo nada más volver a la tarea', 'obstacle'], ['Marcarlo como hecho', 'measure']] }
  };

  var MEASURES = {
    A: 'La próxima vez que necesites esa información, comprueba si la encuentras en el primer sitio que miras.',
    B: 'Haz la tarea una vez con la ayuda y compara los pasos repetidos con la última vez.',
    C: 'En la próxima actividad, compara cuántos mensajes hacen falta para cerrar el acuerdo con la anterior.',
    D: 'La próxima vez que revises tus pendientes, comprueba si los tienes todos sin reconstruirlos de varios sitios.',
    P: 'La próxima vez que tengas varias cosas, comprueba si eliges por dónde empezar con menos vueltas que la anterior.',
    E: 'En la próxima decisión, comprueba si puedes elegir sin volver a buscar información que ya habías visto.',
    F: 'La próxima vez que quieras avanzar, comprueba si consigues empezar o retomarla, y en qué paso te quedas.',
    G: 'Pruébalo con un solo material y compara con la vez anterior si encuentras o repasas lo que necesitas con menos esfuerzo.'
  };

  var PENDING_Q = {
    A: '¿Qué necesitas encontrar y dónde lo buscas ahora?',
    B: '¿Qué pasos o datos repites y en qué sitios?',
    C: '¿Con quién te coordinas y qué cuesta acordar?',
    D: '¿Qué pendientes se te olvidan y dónde los anotas ahora?',
    P: 'Cuando te cuesta elegir por dónde empezar, ¿qué te pasa exactamente?',
    E: '¿Qué comparas y qué información vuelves a revisar?',
    F: '¿Qué actividad quieres avanzar y en qué paso te quedas?',
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

  /* ---------- Señales de una situación explorada ---------- */
  function signals(a, d, n) {
    var K = function (b) { return DC.K(n, b); };
    var r = DC.routeObj(d, n);
    var s = { n: n, r: r, K: K };
    s.situation = r.situation;
    s.task = val(a, K('q6'));
    s.taskVague = (s.task === 'otra' && !DC.text(a, K('q6'), 'otra')) || s.task === 'nolose';
    s.obstacle = val(a, K('q7'));
    s.obstacleVague = s.obstacle === 'nolose' || (s.obstacle === 'otro' && !DC.text(a, K('q7'), 'otro'));
    s.energy = s.obstacle === 'energia' ? val(a, K('q7b')) : null;
    s.energyAmbiguous = s.obstacle === 'energia' && ['otra', 'nolose'].indexOf(s.energy) !== -1;

    var c1 = DC.clarification(a, n, 'c_metodo'), c2 = DC.clarification(a, n, 'c_consecuencia'), c3 = DC.clarification(a, n, 'c_cambio');
    s.unresolved = DC.contradictions(a, d, n).filter(function (c) { var v = DC.clarification(a, n, c.id); return !v || v === 'nodecir'; });
    if (c2 === 'relevante') s.relevant = true;
    else if (c2 === 'norelevante') s.relevant = false;
    else if (hasAny(a, K('q10b'), RELEVANT)) s.relevant = true;
    else if (has(a, K('q10b'), 'ninguna')) s.relevant = false;
    else s.relevant = null;
    s.strong = hasAny(a, K('q10b'), STRONG);
    s.works = val(a, K('q9')) === 'bien' && c1 !== 'parcial';
    s.notTried = has(a, K('q8'), 'nointentado');
    s.keepAsIs = has(a, 'q12', 'continuar') && c3 !== 'abierto';
    s.usesApp = has(a, K('q8'), 'app');
    s.videos = has(a, K('q11'), 'videos');
    s.matsUnknown = has(a, K('q11'), 'nolose');
    s.access = val(a, K('q11c'));
    s.accessRelevant = DC.needsAccess(a, n, r);
    s.integration = ['plataforma', 'varios'].indexOf(s.access) !== -1 || has(a, 'q12', 'encaje');
    s.frequent = DC.scaleRank(val(a, 'q2' + r.situation)) === 3 || ['diario', 'variassemana'].indexOf(val(a, K('q10a'))) !== -1;
    return s;
  }

  function whyText(kind, a, d, s) {
    switch (kind) {
      case 'task': return 'Responde a la tarea que has indicado.';
      case 'obstacle':
        if (s.energy && ENERGY[s.energy]) return 'Responde a lo que indicaste: ' + lc(DC.labelOf(s.K('q7b'), s.energy, a, d)) + '.';
        return s.obstacle && ['dispersa', 'manual', 'claro', 'herramienta', 'tercero'].indexOf(s.obstacle) !== -1
          ? 'Responde al obstáculo: ' + lc(DC.labelOf(s.K('q7'), s.obstacle, a, d)) + '.' : 'Reduce los pasos de la tarea.';
      case 'data': return 'Permite comprobar de dónde sale cada dato.';
      case 'review': return has(a, 'q12', 'revisar') ? 'Indicaste que necesitas revisar y confirmar lo que hace.' : 'Deja la decisión final en tus manos.';
      case 'effort': return has(a, 'q12', 'pococonfig') ? 'Indicaste que debe requerir poca configuración.' : 'Busca el menor esfuerzo de uso.';
      case 'measure': return 'Permite ver si la ayuda funciona.';
    }
    return '';
  }

  function chooseFormat(entry, a, s) {
    if (s.obstacle === 'herramienta' || entry.existingFirst) return 'existing';
    if (has(a, 'q12', 'encaje') || (s.usesApp && ['esfuerzo', 'parte'].indexOf(val(a, s.K('q9'))) !== -1)) return 'feature';
    if (has(a, 'q12', 'movil') && !has(a, 'q12', 'ordenador') && s.frequent) return 'app';
    return 'web';
  }

  var INSUF_ENERGY = 'No tenemos información suficiente para proponer una ayuda tecnológica para esta dificultad.';

  function decide(a, d, s) {
    var sitCat = CATALOG[s.situation] || {};
    var entry = sitCat[s.task] || sitCat.otra;
    var r = { entry: entry, format: null, test: false, hyp: null };

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
      r.level = 'insuficiente'; r.format = 'moreinfo';
      r.text = 'Con la información disponible no podemos describir una ayuda concreta sin inventar detalles.';
      r.reason = 'Falta saber con precisión la tarea y qué la dificulta.';
      return r;
    }
    if (s.obstacle === 'energia') {
      if (ENERGY[s.energy]) { entry = ENERGY[s.energy]; r.entry = entry; }
      else {
        r.level = 'insuficiente'; r.format = 'moreinfo';
        r.text = INSUF_ENERGY;
        if (s.energyAmbiguous && (s.situation === 'P' || s.situation === 'D')) {
          r.hyp = s.situation === 'P'
            ? 'Si la dificultad era elegir entre varias tareas, unos criterios sencillos de prioridad podrían ayudar. Falta confirmarlo.'
            : 'Si la dificultad era no tener los pendientes a la vista, una lista única podría ayudar. Falta confirmarlo.';
        }
        r.reason = s.energyAmbiguous ? 'No sabemos qué pasaba exactamente cuando te faltaban energía o ganas.' : 'La falta de energía o interés, sin más información, no justifica una propuesta de software.';
        return r;
      }
    }
    if (s.obstacle === 'tiempo' || s.obstacle === 'recursos') {
      var supported = s.obstacle === 'tiempo' && s.relevant === true && entry && !s.taskVague && ['A', 'B', 'D', 'G'].indexOf(s.situation) !== -1 && !s.works;
      if (supported) {
        r.level = 'plausible'; r.format = chooseFormat(entry, a, s); r.test = true;
        r.text = 'Una herramienta no te dará más tiempo. Como ayuda limitada, se podría acortar algún paso de la tarea: ' + lc(entry.idea);
        r.reason = 'El freno principal es el tiempo, y no sabemos cuánto se va en pasos que una herramienta pueda acortar.';
        return r;
      }
      r.level = 'insuficiente'; r.format = 'process';
      r.text = s.obstacle === 'tiempo'
        ? 'Una herramienta no resolverá la falta de tiempo. Podría ayudar reservar un momento concreto y breve para esta tarea, o reducirla a lo imprescindible.'
        : 'Una herramienta no resolverá la falta de dinero, materiales u otros recursos. Antes conviene identificar qué recurso falta y si hay alternativas gratuitas o compartidas.';
      r.reason = 'El obstáculo principal no es algo que una herramienta pueda resolver por sí sola.';
      return r;
    }
    if (s.obstacle === 'tercero') {
      if (s.situation === 'C' && entry) {
        r.level = 'plausible'; r.format = chooseFormat(entry, a, s); r.test = true;
        r.text = entry.idea + ' Puede reducir los mensajes necesarios, pero no garantiza que las demás personas respondan.';
        r.reason = 'El resultado depende de que otras personas participen.';
        return r;
      }
      r.level = 'plausible'; r.format = 'process';
      r.text = 'La tarea depende de la respuesta de otra persona. Puede ayudar más acordar con ella un canal y un plazo de respuesta que añadir una herramienta.';
      r.reason = 'El obstáculo está en la respuesta de otras personas, no en la herramienta.';
      return r;
    }
    if (s.obstacle === 'ninguno') {
      r.level = 'insuficiente'; r.format = 'moreinfo';
      r.text = 'Has señalado consecuencias, pero ningún obstáculo concreto. Sin saber qué paso cuesta, no proponemos una herramienta todavía.';
      r.reason = 'Falta saber en qué paso de la tarea está la dificultad.';
      return r;
    }
    /* Propuesta */
    r.format = chooseFormat(entry, a, s); r.test = true;
    r.text = entry.idea;
    if (r.format === 'existing') r.text += s.obstacle === 'herramienta'
      ? ' Como la herramienta actual es parte del problema, el primer paso sería comprobar si permite hacerlo de otra forma o si otra existente lo resuelve.'
      : ' Ya existen herramientas habituales que hacen algo parecido; conviene probar alguna antes de construir nada.';
    var missing = [];
    if (s.taskVague) missing.push('la tarea concreta');
    if (s.obstacleVague) missing.push('qué dificulta la tarea');
    if (s.relevant !== true) missing.push('qué consecuencia tiene');
    if (s.matsUnknown) missing.push('qué materiales se usan');
    if (s.accessRelevant && (!s.access || s.access === 'nolose' || s.access === 'otrapersona')) missing.push('si se puede acceder a los materiales');
    if (s.unresolved.length) missing.push('una aparente contradicción en tus respuestas');
    if (d.uncertain && s.n === 1) missing.push('si esta situación es la que más te importa');
    if (missing.length) { r.level = 'plausible'; r.reason = 'Falta confirmar ' + missing.slice(0, 2).join(' y ') + '.'; }
    else { r.level = 'ok'; r.reason = 'La tarea, el obstáculo y sus consecuencias están definidos.'; }
    if (s.taskVague) r.test = false;
    return r;
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

  function pendingQuestion(r, a, d, s) {
    if (r.level === 'actual' || r.level === 'norelevante') return null;
    if (s.taskVague) return s.situation === 'G' ? PENDING_Q.G : '¿Qué intentabas hacer exactamente la última vez que te ocurrió?';
    if (s.obstacle === 'energia' && !ENERGY[s.energy]) {
      return s.energyAmbiguous
        ? 'La última vez que te costó, ¿qué pasaba: la tarea parecía demasiado grande, tenías varias cosas y te costaba elegir, o no tenías claro el siguiente paso?'
        : null;
    }
    if (s.obstacleVague || s.obstacle === 'ninguno') return 'La última vez que ocurrió, ¿en qué paso concreto te quedaste parado/a o perdiste más tiempo?';
    if (s.relevant === null) return '¿Qué pasa cuando esta tarea sale mal o tarda más de la cuenta?';
    if (s.unresolved.length) return 'Tu forma actual de hacerlo, ¿te resuelve la tarea por completo o solo en parte?';
    if (s.keepAsIs && s.strong) return '¿Qué parte de la tarea provoca la consecuencia que señalaste?';
    if (r.test && (s.accessRelevant || s.integration)) return s.videos
      ? '¿Puedes usar esas grabaciones fuera de donde las ves ahora, por ejemplo guardarlas o pausarlas para tomar notas?'
      : '¿Puedes usar esos materiales fuera del sitio donde están ahora, por ejemplo copiarlos o guardarlos?';
    if (r.test && (r.format === 'web' || r.format === 'app')) return 'Si la ayuda te pidiera anotar algo cada vez que hagas la tarea, ¿te compensaría?';
    return null;
  }

  function facts(a, d, s) {
    var K = s.K, f = {}, r = s.r;
    if (r.source === 'alt') f.situation = 'Indicaste que en el último mes no pudiste empezar o mantener esto: ' + lc(DC.labelOf('qalt', r.alt, a, d)) + '.';
    else {
      var fr = DC.SCALE.filter(function (x) { return x.id === val(a, 'q2' + s.situation); })[0];
      f.situation = fr && fr.rank
        ? 'Indicaste que ' + lc(fr.label) + ' de las últimas dos semanas ' + DC.SITUATIONS[s.situation].fact + '.'
        : 'Elegiste explorar esta situación: ' + lc(DC.SITUATIONS[s.situation].short) + '.';
    }
    var amb = val(a, K('q5'));
    var ambTxt = !amb ? '' : amb === 'varios' ? ' Te ocurre en varios ámbitos.' : amb === 'otro' ? ' Te ocurre en otro ámbito.' : ' Ámbito: ' + lc(DC.labelOf(K('q5'), amb, a, d)) + '.';
    if (s.task) {
      var tt = DC.text(a, K('q6'), 'otra');
      f.task = (s.task === 'otra' ? (tt ? 'Describiste la tarea así: ' + quote(tt) + '.' : 'Indicaste otra tarea, sin más detalle.')
        : (s.situation === 'G' ? 'Indicaste que lo que más te cuesta es: ' : 'Indicaste que la tarea más parecida es: ') + lc(DC.labelOf(K('q6'), s.task, a, d)) + '.') + ambTxt;
    }
    if (s.obstacle) {
      var ot = DC.text(a, K('q7'), 'otro');
      f.obstacle = s.obstacle === 'otro' ? (ot ? 'Describiste lo que la dificultó así: ' + quote(ot) + '.' : 'Indicaste otro obstáculo, sin más detalle.')
        : 'Indicaste que lo que más la dificultó fue: ' + lc(DC.labelOf(K('q7'), s.obstacle, a, d)) + '.';
      if (s.energy) f.obstacle += ' Lo que mejor lo describe: ' + lc(DC.labelOf(K('q7b'), s.energy, a, d)) + '.';
    }
    if (val(a, K('q8'))) {
      if (s.notTried) f.method = 'Indicaste que todavía no has intentado hacer esa tarea.';
      else {
        var tool = DC.text(a, K('q8'), 'tool');
        f.method = 'La haces así: ' + val(a, K('q8')).map(function (x) { return lc(DC.labelOf(K('q8'), x, a, d)); }).join(', ') + (tool ? ' (' + quote(tool) + ')' : '') + '.';
        if (val(a, K('q9'))) f.method += ' Te funciona: ' + lc(DC.labelOf(K('q9'), val(a, K('q9')), a, d)) + '.';
        if (val(a, K('q9b'))) f.method += ' ¿Has probado algo para facilitarla?: ' + lc(DC.labelOf(K('q9b'), val(a, K('q9b')), a, d)) + '.';
      }
    }
    if (val(a, K('q10b'))) {
      f.consequence = 'Consecuencia: ' + val(a, K('q10b')).map(function (x) { return lc(DC.labelOf(K('q10b'), x, a, d)); }).join('; ') + '.';
      if (val(a, K('q10c'))) f.consequence += ' Tiempo en los pasos difíciles: ' + lc(DC.labelOf(K('q10c'), val(a, K('q10c')), a, d)) + '.';
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
    if (s.works) out.push('Tu forma actual parece cumplir buena parte de su función.');
    else if (['esfuerzo', 'parte', 'noterminar'].indexOf(val(a, s.K('q9'))) !== -1) out.push('Tu forma actual cumple solo en parte o con más esfuerzo del que quisieras.');
    if (s.notTried) out.push('No tenemos información sobre un método actual.');
    else if (val(a, s.K('q9b')) === 'no') out.push('No has indicado haber probado una mejora.');
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
    var evidence = ['situation', 'task', 'obstacle', 'method', 'consequence', 'materials'].filter(function (k) { return f[k]; }).map(function (k) { return f[k]; });
    evidence = evidence.slice(0, commentEvidence ? 4 : 5);
    if (commentEvidence) evidence.push(commentEvidence);
    var summary = [
      'Situación: ' + lc(DC.SITUATIONS[s.situation].short) + '.',
      s.task ? (s.situation === 'G' ? 'Lo que más cuesta: ' : 'Tarea: ') + (s.task === 'otra' ? (DC.text(a, s.K('q6'), 'otra') ? quote(DC.text(a, s.K('q6'), 'otra')) : 'otra tarea') : lc(DC.labelOf(s.K('q6'), s.task, a, d))) + '.' : '',
      s.obstacle ? 'Obstáculo: ' + (s.obstacle === 'otro' && DC.text(a, s.K('q7'), 'otro') ? quote(DC.text(a, s.K('q7'), 'otro')) : lc(DC.labelOf(s.K('q7'), s.obstacle, a, d))) + '.' : '',
      val(a, s.K('q8')) ? (s.notTried ? 'Todavía no has intentado hacer esa tarea.' : 'Método actual: ' + val(a, s.K('q8')).map(function (x) { return lc(DC.labelOf(s.K('q8'), x, a, d)); }).join(', ') + '.') : ''
    ].filter(Boolean).join(' ');
    var test = r.test && r.entry ? r.entry.f.slice(0, 3).map(function (x) { return { text: x[0], why: whyText(x[1], a, d, s) }; }) : [];
    return {
      n: n,
      situation: s.situation,
      situationLabel: DC.SITUATIONS[s.situation].short,
      summary: summary,
      evidence: evidence,
      hypothesis: r.text,
      extraHypothesis: r.hyp,
      format: FORMATS[r.format] || FORMATS.none,
      formatNote: (r.level === 'ok' || r.level === 'plausible') && r.format !== 'process' ? 'Formato orientativo: se confirmaría con la primera prueba.' : '',
      inferences: inferences(r, a, d, s),
      checks: checks(r, a, s),
      firstTest: test,
      firstTestNote: test.length ? '' : (r.level === 'ok' || r.level === 'plausible' ? 'Antes de proponer una prueba conviene aclarar la pregunta pendiente.' : 'No proponemos una prueba con lo explorado.'),
      question: pendingQuestion(r, a, d, s),
      measure: (r.level === 'ok' || r.level === 'plausible') ? (r.format === 'process' ? 'La próxima vez que hagas la tarea con ese cambio, compárala con la anterior.' : MEASURES[s.situation]) : null,
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

    var limited = !main || ['insuficiente', 'actual', 'norelevante'].indexOf(main.status.level) !== -1;
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
