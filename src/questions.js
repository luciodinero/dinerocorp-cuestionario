/* =====================================================================
   PREGUNTAS DEL CUESTIONARIO
   ---------------------------------------------------------------------
   Aquí se definen los textos, las opciones y las condiciones de cada
   pantalla. Para cambiar una pregunta, edita su objeto en DC.QUESTIONS.
   Para cambiar el orden o cuándo aparece una pantalla, edita DC.SCREENS.

   Tipos:
     single  → una sola respuesta (botones de opción)
     multi   → varias respuestas (casillas). "max" limita el número.
     text    → campo de texto libre, siempre opcional.
   Opciones:
     exclusive: true   → al marcarla se desmarcan las demás (p. ej. "Ninguna")
     textField: {...}  → campo opcional que aparece al marcar la opción
   La lógica de ramificación (qué situación se explora) está en flow.js.
   ===================================================================== */
window.DC = window.DC || {};

DC.SCALE = [
  { id: 'nunca', label: 'Nunca' },
  { id: 'd12', label: 'En 1–2 días', occurred: true, rank: 1 },
  { id: 'd35', label: 'En 3–5 días', occurred: true, rank: 2 },
  { id: 'd6', label: 'En 6 días o más', occurred: true, rank: 3 },
  { id: 'na', label: 'No me aplica' },
  { id: 'nr', label: 'No lo recuerdo' }
];

/* Situaciones de la sección 2.
   q     → texto de la pregunta (continúa el encabezado común)
   short → texto breve usado en las preguntas 3 y 4
   fact  → frase para el informe ("En 3–5 días … tuviste que …") */
DC.SITUATIONS = {
  A: {
    q: '…has tenido que buscar en varios sitios para recuperar información que necesitabas?',
    short: 'Buscar en varios sitios la información que necesitaba',
    fact: 'tuviste que buscar en varios sitios para recuperar información que necesitabas',
    theme: 'recuperar información'
  },
  B: {
    q: '…has repetido pasos o introducido la misma información en más de un sitio?',
    short: 'Repetir pasos o introducir los mismos datos en varios sitios',
    fact: 'repetiste pasos o introdujiste la misma información en más de un sitio',
    theme: 'repetir pasos'
  },
  C: {
    q: '…has necesitado varios intercambios de mensajes para coordinar una actividad con otras personas?',
    short: 'Necesitar muchos mensajes para coordinarme con otras personas',
    fact: 'necesitaste varios intercambios de mensajes para coordinar una actividad con otras personas',
    theme: 'coordinarte con otras personas'
  },
  D: {
    q: '…has tenido dificultad para saber qué tenías pendiente o por dónde empezar?',
    short: 'No saber bien qué tenía pendiente o por dónde empezar',
    fact: 'tuviste dificultad para saber qué tenías pendiente o por dónde empezar',
    theme: 'gestionar pendientes'
  },
  E: {
    q: '…has vuelto a revisar información para comparar opciones o tomar una decisión?',
    short: 'Volver a revisar información para comparar o decidir',
    fact: 'volviste a revisar información para comparar opciones o tomar una decisión',
    theme: 'comparar o decidir'
  },
  F: {
    q: '…has querido avanzar en una actividad, pero la has pospuesto o dejado a medias?',
    short: 'Posponer o dejar a medias una actividad en la que quería avanzar',
    fact: 'quisiste avanzar en una actividad, pero la pospusiste o la dejaste a medias',
    theme: 'avanzar en una actividad'
  }
};
DC.SIT_IDS = ['A', 'B', 'C', 'D', 'E', 'F'];

DC.CONTEXTS = [
  { id: 'estudios', label: 'Estudios o formación' },
  { id: 'ajena', label: 'Trabajo por cuenta ajena' },
  { id: 'propio', label: 'Negocio propio o trabajo autónomo' },
  { id: 'empleo', label: 'Búsqueda de empleo' },
  { id: 'hogar', label: 'Hogar o cuidados' },
  { id: 'hobbies', label: 'Hobbies o proyectos personales' },
  { id: 'social', label: 'Actividades sociales o voluntariado' },
  { id: 'descanso', label: 'Descanso y ocio' },
  { id: 'otra', label: 'Otra actividad' }
];

const OTRA_TAREA = { id: 'otra', label: 'Otra tarea', textField: { max: 180, label: 'Describe la tarea (opcional)' } };

DC.TASKS = {
  A: [
    { id: 'archivo', label: 'Encontrar un archivo, una nota o un mensaje' },
    { id: 'reunir', label: 'Reunir información repartida entre varios sitios' },
    { id: 'acuerdo', label: 'Recuperar un acuerdo, una instrucción o una fecha' },
    { id: 'actualizada', label: 'Comprobar qué información estaba actualizada' },
    OTRA_TAREA
  ],
  B: [
    { id: 'mismosdatos', label: 'Introducir los mismos datos en varios sitios' },
    { id: 'mensajes', label: 'Preparar mensajes o documentos parecidos' },
    { id: 'ordenar', label: 'Ordenar o clasificar archivos, fotos o notas' },
    { id: 'calculos', label: 'Hacer cálculos o preparar resúmenes periódicos' },
    OTRA_TAREA
  ],
  C: [
    { id: 'fecha', label: 'Acordar una fecha o un horario' },
    { id: 'repartir', label: 'Repartir tareas o responsabilidades' },
    { id: 'recoger', label: 'Recoger respuestas o confirmar asistencia' },
    { id: 'consultar', label: 'Consultar acuerdos o el estado de una actividad' },
    OTRA_TAREA
  ],
  D: [
    { id: 'fechas', label: 'Recordar fechas o compromisos' },
    { id: 'reunir', label: 'Reunir pendientes de diferentes sitios' },
    { id: 'elegir', label: 'Elegir qué hacer primero' },
    { id: 'dividir', label: 'Dividir una tarea en pasos para empezar' },
    OTRA_TAREA
  ],
  E: [
    { id: 'compras', label: 'Comparar compras o servicios' },
    { id: 'elegir', label: 'Elegir una actividad, formación u oportunidad' },
    { id: 'requisitos', label: 'Comprobar requisitos o compatibilidad' },
    { id: 'organizar', label: 'Organizar información que había guardado' },
    OTRA_TAREA
  ],
  F: [
    { id: 'aprender', label: 'Aprender o practicar algo' },
    { id: 'proyecto', label: 'Crear o desarrollar un proyecto' },
    { id: 'rutina', label: 'Mantener una rutina' },
    { id: 'organizar', label: 'Organizar o participar en una actividad' },
    { id: 'gestion', label: 'Preparar una gestión o un siguiente paso' },
    OTRA_TAREA
  ]
};

/* Para la ruta de actividades deseadas, la actividad elegida
   sugiere la tarea equivalente de la rama F (solo como preselección). */
DC.ALT_TO_TASK = { aprender: 'aprender', hobby: 'proyecto', coordinar: 'organizar', rutina: 'rutina', siguiente: 'gestion', otra: 'otra' };

DC.QUESTIONS = {
  q1: {
    type: 'multi', section: 'Contexto',
    title: '¿A qué has dedicado tiempo durante las últimas dos semanas?',
    options: DC.CONTEXTS
  },

  /* q2A … q2F se generan más abajo a partir de DC.SITUATIONS */

  q3: {
    type: 'multi', section: 'Consecuencias',
    title: '¿Cuáles de estas situaciones te quitaron tiempo que querías dedicar a otra cosa, te dificultaron avanzar o tuvieron alguna consecuencia que te importara?',
    options: function (a, d) {
      return d.occurred.map(function (s) { return { id: s, label: DC.SITUATIONS[s].short }; })
        .concat([
          { id: 'ninguna', label: 'Ninguna tuvo consecuencias relevantes', exclusive: true },
          { id: 'noseguro', label: 'No estoy seguro/a', exclusive: true }
        ]);
    }
  },

  q4: {
    type: 'single', section: 'Elegir una situación',
    title: function (a, d) {
      return d.uncertain ? 'Si quieres, elige una situación para explorarla un poco más' : '¿Cuál prefieres que exploremos un poco más?';
    },
    options: function (a, d) {
      var opts = d.candidates.map(function (s) { return { id: s, label: DC.SITUATIONS[s].short }; });
      if (d.candidates.length > 1) opts.push({ id: 'nopref', label: 'No tengo preferencia' });
      if (d.uncertain) opts.push({ id: 'ninguna', label: 'Prefiero no explorar ninguna de estas' });
      return opts;
    }
  },

  q4b: {
    type: 'single', section: 'Elegir una situación',
    title: 'Varias situaciones ocurren con la misma frecuencia. ¿Cuál exploramos?',
    help: 'No queremos decidir por ti cuál es más importante.',
    options: function (a, d) {
      return d.tied.map(function (s) { return { id: s, label: DC.SITUATIONS[s].short }; });
    }
  },

  qalt: {
    type: 'single', section: 'Algo que quieras hacer',
    title: 'Pensando en el último mes, ¿hay algo que hayas querido hacer y que no hayas podido empezar o mantener?',
    options: [
      { id: 'aprender', label: 'Aprender o practicar algo' },
      { id: 'hobby', label: 'Avanzar en un hobby o proyecto personal' },
      { id: 'coordinar', label: 'Participar en actividades o coordinarme con otras personas' },
      { id: 'rutina', label: 'Mantener una rutina personal' },
      { id: 'siguiente', label: 'Preparar un siguiente paso de estudios o trabajo' },
      { id: 'otra', label: 'Otra actividad' },
      { id: 'nada', label: 'No hay nada que quiera explorar ahora' }
    ]
  },

  q5: {
    type: 'single', section: 'La situación elegida',
    title: '¿En qué ámbito te ocurre principalmente?',
    options: function (a) {
      var sel = (a.q1 && a.q1.v) || [];
      return DC.CONTEXTS.filter(function (c) { return sel.indexOf(c.id) !== -1; })
        .map(function (c) { return { id: c.id, label: c.id === 'otra' ? 'La otra actividad que mencionaste' : c.label }; })
        .concat([
          { id: 'varios', label: 'En varios ámbitos' },
          { id: 'otro', label: 'En otro ámbito' }
        ]);
    }
  },

  q6: {
    type: 'single', section: 'La tarea concreta',
    title: '¿Cuál de estas tareas se parece más a lo que estabas haciendo?',
    options: function (a, d) { return DC.TASKS[d.situation] || []; }
  },

  q7: {
    type: 'single', section: 'Qué lo dificultó',
    title: '¿Qué fue lo que más dificultó esa tarea?',
    options: [
      { id: 'dispersa', label: 'La información estaba dispersa o era difícil de encontrar' },
      { id: 'manual', label: 'Había demasiados pasos manuales o repetidos' },
      { id: 'claro', label: 'No estaba claro cómo hacerlo o por dónde empezar' },
      { id: 'tercero', label: 'Dependía de una respuesta o acción de otra persona' },
      { id: 'herramienta', label: 'La herramienta que usaba era difícil o no me permitía hacerlo' },
      { id: 'tiempo', label: 'Me faltaba tiempo disponible' },
      { id: 'recursos', label: 'Me faltaban dinero, materiales u otros recursos' },
      { id: 'energia', label: 'Me faltaban energía o ganas en ese momento' },
      { id: 'ninguno', label: 'Ningún obstáculo concreto' },
      { id: 'otro', label: 'Otro', textField: { max: 180, label: 'Describe el obstáculo (opcional)' } },
      { id: 'nolose', label: 'No lo sé' }
    ]
  },

  q8: {
    type: 'multi', max: 3, section: 'Cómo lo haces ahora',
    title: '¿Cómo resuelves actualmente esa tarea?',
    options: [
      { id: 'app', label: 'Con una aplicación o web específica' },
      { id: 'notas', label: 'Con notas, papel o de memoria' },
      { id: 'hoja', label: 'Con una hoja de cálculo o un documento' },
      { id: 'mensajes', label: 'Con mensajes o correos' },
      { id: 'ayuda', label: 'Pidiendo ayuda a otra persona' },
      { id: 'combinando', label: 'Combinando varias herramientas' },
      { id: 'pospongo', label: 'Suelo posponerla o dejarla sin resolver' },
      { id: 'nointentado', label: 'Todavía no he intentado resolverla', exclusive: true },
      { id: 'otra', label: 'Otra forma' }
    ],
    extraText: { key: 'tool', max: 100, label: 'Si utilizas alguna herramienta, puedes indicar cuál (opcional)', hideIf: ['nointentado'] }
  },

  q9: {
    type: 'single', section: 'Cómo lo haces ahora',
    title: '¿Cómo te funciona esa forma de hacerlo?',
    options: [
      { id: 'bien', label: 'Me funciona bien y requiere poco esfuerzo' },
      { id: 'esfuerzo', label: 'Consigo resolverlo, pero requiere más esfuerzo del que quisiera' },
      { id: 'parte', label: 'Solo resuelve una parte' },
      { id: 'noterminar', label: 'A menudo no consigo terminarlo' },
      { id: 'depende', label: 'Depende de la ocasión' },
      { id: 'nolose', label: 'No lo sé' }
    ]
  },

  q10a: {
    type: 'single', section: 'Frecuencia e impacto',
    title: '¿Con qué frecuencia te encuentras con esta tarea o situación?',
    options: [
      { id: 'diario', label: 'Casi todos los días' },
      { id: 'variassemana', label: 'Varias veces por semana' },
      { id: 'semanal', label: 'Aproximadamente una vez por semana' },
      { id: 'variasmes', label: 'Varias veces al mes' },
      { id: 'menos', label: 'Con menos frecuencia o en ocasiones puntuales' },
      { id: 'nolose', label: 'No lo sé' }
    ]
  },

  q10b: {
    type: 'multi', max: 2, section: 'Frecuencia e impacto',
    title: '¿Qué consecuencia tiene para ti?',
    options: [
      { id: 'ninguna', label: 'Ninguna relevante', exclusive: true },
      { id: 'tiempo', label: 'Me ocupa tiempo que quería dedicar a otra cosa' },
      { id: 'cansancio', label: 'Me genera cansancio o frustración' },
      { id: 'errores', label: 'Provoca errores o que tenga que rehacer cosas' },
      { id: 'gasto', label: 'Me supone un gasto' },
      { id: 'oportunidad', label: 'Hace que pierda una oportunidad o un plazo' },
      { id: 'ayuda', label: 'Hace que necesite ayuda de alguien' },
      { id: 'impide', label: 'Impide que haga una actividad que me importa' },
      { id: 'otra', label: 'Otra' },
      { id: 'nolose', label: 'No lo sé', exclusive: true }
    ]
  },

  q10c: {
    type: 'single', section: 'Frecuencia e impacto',
    title: 'Cuando ocurre, ¿cuánto tiempo aproximado se va en los pasos que te resultan difíciles?',
    options: [
      { id: 'm5', label: 'Menos de 5 minutos' },
      { id: 'm15', label: 'Entre 5 y 15 minutos' },
      { id: 'm30', label: 'Entre 16 y 30 minutos' },
      { id: 'm30mas', label: 'Más de 30 minutos' },
      { id: 'varia', label: 'Varía mucho' },
      { id: 'nolose', label: 'No lo sé' }
    ]
  },

  q11a: {
    type: 'single', section: 'Información y mantenimiento',
    title: '¿Dónde está la información que habría que utilizar para ayudarte con esa tarea?',
    options: [
      { id: 'app', label: 'Principalmente en una aplicación o web' },
      { id: 'dispersa', label: 'Repartida entre varias aplicaciones, archivos o mensajes' },
      { id: 'papel', label: 'Principalmente en papel' },
      { id: 'introducir', label: 'Tendría que introducirla yo' },
      { id: 'tercero', label: 'La tiene otra persona u organización' },
      { id: 'nodatos', label: 'La tarea no requiere información guardada' },
      { id: 'nolose', label: 'No lo sé' }
    ]
  },

  q11b: {
    type: 'single', section: 'Información y mantenimiento',
    title: 'Si una ayuda te pidiera actualizar información con frecuencia, ¿qué encajaría contigo?',
    options: [
      { id: 'minutos', label: 'Podría dedicarle unos minutos si me compensa' },
      { id: 'pocos', label: 'Solo introduciría unos pocos datos de vez en cuando' },
      { id: 'aprovechar', label: 'Necesitaría que aprovechara información que ya tengo' },
      { id: 'noquiero', label: 'No quiero mantener otra herramienta' },
      { id: 'probar', label: 'Necesitaría probarla para saberlo' }
    ]
  },

  q12: {
    type: 'multi', max: 3, section: 'Condiciones de uso',
    title: '¿Qué tendría que cumplir una ayuda para que pudieras usarla?',
    options: [
      { id: 'movil', label: 'Funcionar desde el móvil' },
      { id: 'ordenador', label: 'Funcionar desde el ordenador' },
      { id: 'encaje', label: 'Encajar con una herramienta que ya utilizo' },
      { id: 'pococonfig', label: 'Requerir poca configuración' },
      { id: 'gratis', label: 'Ser gratuita o de coste bajo' },
      { id: 'revisar', label: 'Permitir revisar y confirmar lo que hace' },
      { id: 'privado', label: 'No exigir información personal o privada' },
      { id: 'accesible', label: 'Adaptarse a mis necesidades de accesibilidad' },
      { id: 'continuar', label: 'Prefiero continuar como ahora', exclusive: true },
      { id: 'ejemplo', label: 'Necesitaría ver un ejemplo' }
    ]
  },

  /* Aclaraciones opcionales: solo aparecen si flow.js detecta
     respuestas que parecen contradictorias (ver DC.CONTRADICTIONS). */
  qc: { type: 'clarify', section: 'Una aclaración', title: 'Antes del informe, una aclaración opcional' },

  q13: {
    type: 'text', max: 240, section: 'Último detalle',
    title: '¿Qué detalle nos falta para entender esta situación?',
    help: 'Opcional. No incluyas nombres, datos de contacto ni información privada.'
  }
};

DC.SIT_IDS.forEach(function (s, i) {
  DC.QUESTIONS['q2' + s] = {
    type: 'single', section: 'Situaciones', sectionStep: (i + 1) + ' de 6',
    lead: 'Durante las últimas dos semanas, ¿en cuántos días…',
    title: DC.SITUATIONS[s].q,
    options: DC.SCALE,
    compact: true
  };
});
