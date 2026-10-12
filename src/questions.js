/* =====================================================================
   PREGUNTAS DEL CUESTIONARIO
   ---------------------------------------------------------------------
   Textos, opciones, ayudas y ejemplos de cada pregunta.
   - Orden de pantallas y ramificación: flow.js
   - Reglas del informe: report.js

   Tipos: single (una respuesta), multi (varias; "max" limita),
          text (texto libre, siempre opcional).
   Opciones:
     exclusive: true        → al marcarla se desmarcan las demás
     incompatible: [ids]    → no puede combinarse con esas opciones
     textField: {...}       → campo opcional al marcar la opción
   Ayuda (columna lateral en ordenador, debajo de la pregunta en móvil):
     help: { explain, examples, note }
   Criterio de ejemplos: situaciones cotidianas de ámbitos distintos,
   sin mencionar aplicaciones ni soluciones.
   Las preguntas marcadas como "por situación" (route) se repiten si se
   explora una segunda situación; sus funciones reciben (a, d, ctx).
   ===================================================================== */
window.DC = window.DC || {};

DC.EXAMPLE_NOTE = 'Son solo ejemplos; puede haberte ocurrido en otra situación.';

DC.SCALE = [
  { id: 'nunca', label: 'Nunca' },
  { id: 'd12', label: 'En 1–2 días', occurred: true, rank: 1 },
  { id: 'd35', label: 'En 3–5 días', occurred: true, rank: 2 },
  { id: 'd6', label: 'En 6 días o más', occurred: true, rank: 3 },
  { id: 'na', label: 'No me aplica' },
  { id: 'nr', label: 'No lo recuerdo' }
];

/* Situaciones exploradas.
   q        → pregunta completa de frecuencia
   help     → explicación y ejemplos (generales, de ámbitos distintos)
   short    → texto breve para las preguntas de selección y el informe
   fact     → frase para la evidencia del informe */
DC.SITUATIONS = {
  A: {
    q: 'En las últimas dos semanas, ¿en cuántos días has tenido que buscar en varios sitios para encontrar algo que necesitabas?',
    help: { examples: 'Buscar una fecha entre mensajes, encontrar un documento o recuperar una receta que habías guardado.' },
    short: 'Buscar en varios sitios algo que necesitaba',
    fact: 'tuviste que buscar en varios sitios algo que necesitabas',
    theme: 'buscar información en varios sitios'
  },
  B: {
    q: 'En las últimas dos semanas, ¿en cuántos días has repetido los mismos pasos o introducido los mismos datos en varios sitios?',
    help: {
      examples: 'Escribir tus datos en varios formularios, copiar una lista de un sitio a otro o enviar la misma información a varias personas.',
      note: 'Cuenta aunque lo hayas resuelto fácilmente. Después preguntaremos si te causó alguna dificultad.'
    },
    short: 'Repetir pasos o datos en varios sitios',
    fact: 'repetiste los mismos pasos o datos en varios sitios',
    theme: 'repetir pasos o datos'
  },
  C: {
    q: 'En las últimas dos semanas, ¿en cuántos días has necesitado varios mensajes para ponerte de acuerdo con otras personas?',
    help: { examples: 'Acordar una cita, repartir tareas de casa u organizar una actividad con otras personas.' },
    short: 'Necesitar muchos mensajes para ponerme de acuerdo',
    fact: 'necesitaste varios mensajes para ponerte de acuerdo con otras personas',
    theme: 'coordinarte con otras personas'
  },
  D: {
    q: 'En las últimas dos semanas, ¿en cuántos días te ha costado recordar o localizar las cosas que tenías pendientes?',
    help: { examples: 'Una entrega, una cita, una gestión o un encargo que alguien te había hecho.' },
    short: 'Recordar o localizar mis pendientes',
    fact: 'te costó recordar o localizar las cosas que tenías pendientes',
    theme: 'recordar o localizar pendientes'
  },
  P: {
    q: 'En las últimas dos semanas, ¿en cuántos días sabías qué tenías que hacer, pero te ha costado elegir por dónde empezar?',
    help: { examples: 'Tener varias gestiones pendientes, tareas que terminar o cosas que preparar.' },
    short: 'Elegir por dónde empezar',
    fact: 'sabías qué tenías que hacer, pero te costó elegir por dónde empezar',
    theme: 'elegir por dónde empezar'
  },
  E: {
    q: 'En las últimas dos semanas, ¿en cuántos días has vuelto a revisar información para comparar opciones o decidir?',
    help: { examples: 'Comparar una compra, elegir una formación o revisar alternativas para un viaje o un proyecto.' },
    short: 'Volver a revisar información para comparar o decidir',
    fact: 'volviste a revisar información para comparar opciones o decidir',
    theme: 'comparar opciones o decidir'
  },
  F: {
    q: 'En las últimas dos semanas, ¿en cuántos días has querido avanzar en una actividad, pero la has pospuesto o dejado a medias?',
    help: { examples: 'Dejar un trámite a medias, no empezar una sesión de estudio o posponer un hobby.' },
    short: 'Posponer o dejar a medias una actividad',
    fact: 'quisiste avanzar en una actividad, pero la pospusiste o la dejaste a medias',
    theme: 'avanzar en una actividad'
  },
  G: {
    q: 'En las últimas dos semanas, ¿en cuántos días te ha costado preparar o utilizar materiales para aprender algo?',
    help: {
      examples: 'Tomar apuntes de una clase o un curso, volver a encontrar una explicación en un vídeo o preparar material para repasar.',
      note: 'Cuenta cualquier aprendizaje: estudios, formación para el trabajo o algo personal, como un idioma, una receta o un instrumento.'
    },
    short: 'Preparar o usar materiales para aprender',
    fact: 'te costó preparar o utilizar materiales para aprender algo',
    theme: 'preparar o usar materiales para aprender'
  }
};
DC.SIT_IDS = ['A', 'B', 'C', 'D', 'P', 'E', 'F', 'G'];

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

function otra(label) { return { id: 'otra', label: label || 'Otra tarea', textField: { max: 180, label: 'Descríbela en pocas palabras (opcional)' } }; }

DC.TASKS = {
  A: [
    { id: 'archivo', label: 'Encontrar un archivo, una nota o un mensaje' },
    { id: 'reunir', label: 'Reunir información repartida entre varios sitios' },
    { id: 'acuerdo', label: 'Recuperar un acuerdo, una instrucción o una fecha' },
    { id: 'actualizada', label: 'Comprobar qué información estaba actualizada' },
    otra()
  ],
  B: [
    { id: 'mismosdatos', label: 'Introducir los mismos datos en varios sitios' },
    { id: 'mensajes', label: 'Preparar mensajes o documentos parecidos' },
    { id: 'ordenar', label: 'Ordenar o clasificar archivos, fotos o notas' },
    { id: 'calculos', label: 'Hacer cálculos o preparar resúmenes periódicos' },
    otra()
  ],
  C: [
    { id: 'fecha', label: 'Acordar una fecha o un horario' },
    { id: 'repartir', label: 'Repartir tareas o responsabilidades' },
    { id: 'recoger', label: 'Recoger respuestas o confirmar asistencia' },
    { id: 'consultar', label: 'Consultar acuerdos o el estado de una actividad' },
    otra()
  ],
  D: [
    { id: 'fechas', label: 'Recordar una fecha, una cita o una entrega' },
    { id: 'reunir', label: 'Reunir pendientes anotados en sitios distintos' },
    { id: 'encargo', label: 'Acordarme de algo que me pidió otra persona' },
    { id: 'localizar', label: 'Encontrar dónde había anotado una gestión' },
    otra()
  ],
  P: [
    { id: 'varias', label: 'Elegir entre varias tareas o gestiones pendientes' },
    { id: 'ambitos', label: 'Ordenar cosas de ámbitos distintos' },
    { id: 'grande', label: 'Empezar algo grande o con muchas partes' },
    { id: 'retomar', label: 'Retomar algo que había dejado a medias' },
    otra()
  ],
  E: [
    { id: 'compras', label: 'Comparar compras o servicios' },
    { id: 'elegir', label: 'Elegir una actividad, formación u oportunidad' },
    { id: 'requisitos', label: 'Comprobar requisitos o compatibilidad' },
    { id: 'organizar', label: 'Organizar información que había guardado' },
    otra()
  ],
  F: [
    { id: 'aprender', label: 'Aprender o practicar algo' },
    { id: 'proyecto', label: 'Crear o desarrollar un proyecto' },
    { id: 'rutina', label: 'Mantener una rutina' },
    { id: 'organizar', label: 'Organizar o participar en una actividad' },
    { id: 'gestion', label: 'Preparar una gestión o un siguiente paso' },
    otra()
  ],
  G: [
    { id: 'apuntes', label: 'Tomar apuntes mientras escucho o veo una explicación' },
    { id: 'encontrar', label: 'Encontrar otra vez una parte concreta' },
    { id: 'ideas', label: 'Identificar las ideas principales' },
    { id: 'entender', label: 'Entender una explicación' },
    { id: 'repasar', label: 'Preparar material para repasar' },
    { id: 'organizar', label: 'Organizar los materiales' },
    otra('Otra'),
    { id: 'nolose', label: 'No lo sé' }
  ]
};

/* Ruta de actividades deseadas: preselección de la tarea equivalente */
DC.ALT_TO_TASK = { aprender: 'aprender', hobby: 'proyecto', coordinar: 'organizar', rutina: 'rutina', siguiente: 'gestion' };

function sitOption(s, suffix) { return { id: s, label: DC.SITUATIONS[s].short + (suffix || '') }; }

DC.QUESTIONS = {
  q1: {
    type: 'multi', section: 'Contexto',
    title: '¿A qué has dedicado tiempo durante las últimas dos semanas?',
    help: { explain: 'Marca todo lo que corresponda. Solo sirve para situar tus respuestas; no saca conclusiones por sí mismo.' },
    options: DC.CONTEXTS
  },

  /* q2A … q2G se generan al final a partir de DC.SITUATIONS */

  q3: {
    type: 'multi', section: 'Dificultades',
    title: '¿Cuáles de estas situaciones te causaron una dificultad que te importara?',
    help: { explain: 'Por ejemplo, te quitaron tiempo, provocaron un error o hicieron que dejaras algo sin hacer.', note: 'Que algo ocurra a menudo no significa que sea un problema. Marca solo lo que te causó una dificultad.' },
    options: function (a, d) {
      return d.occurred.map(function (s) { return sitOption(s); }).concat([
        { id: 'ninguna', label: 'Ninguna', exclusive: true },
        { id: 'noseguro', label: 'No estoy seguro/a', exclusive: true }
      ]);
    }
  },

  q4: {
    type: 'single', section: 'Elegir qué explorar',
    title: function (a, d) { return d.uncertain ? 'Si quieres, elige una situación para explorarla un poco más' : '¿Cuál de estas situaciones quieres explorar?'; },
    help: { explain: 'Exploraremos una con más detalle. Las demás quedarán anotadas como pendientes en el informe.' },
    options: function (a, d) {
      var o = d.candidates.map(function (s) { return sitOption(s); });
      o.push({ id: 'nopref', label: 'No tengo preferencia' });
      if (d.uncertain) o.push({ id: 'ninguna', label: 'Prefiero no explorar ninguna de estas' });
      return o;
    }
  },

  q4b: {
    type: 'single', section: 'Elegir qué explorar',
    title: '¿Cuál ha tenido más consecuencias para ti?',
    options: function (a, d) {
      return d.candidates.map(function (s) { return sitOption(s); }).concat([
        { id: 'parecidas', label: 'Han tenido consecuencias parecidas' },
        { id: 'nolose', label: 'No lo sé' }
      ]);
    }
  },

  q4c: {
    type: 'single', section: 'Elegir qué explorar',
    title: function (a, d) {
      return d.top ? 'Te proponemos explorar la que indicaste como más frecuente. ¿Te parece bien?' : 'Varias ocurren con la misma frecuencia. ¿Cuál exploramos?';
    },
    help: function (a, d) {
      return d.top ? { explain: 'La frecuencia se usa solo como criterio provisional; no significa que sea la más importante. Puedes elegir otra.' } : { explain: 'No queremos decidir por ti cuál es más importante.' };
    },
    options: function (a, d) {
      var o = [];
      if (d.top) o.push({ id: d.top, label: 'Sí, explorar «' + DC.SITUATIONS[d.top].short + '»' });
      d.candidates.forEach(function (s) { if (s !== d.top) o.push({ id: s, label: (d.top ? 'Prefiero explorar «' : 'Explorar «') + DC.SITUATIONS[s].short + '»' }); });
      return o;
    }
  },

  qalt: {
    type: 'single', section: 'Algo que quieras hacer',
    title: 'Pensando en el último mes, ¿hay algo que hayas querido hacer y que no hayas podido empezar o mantener?',
    help: { examples: 'Retomar un idioma, organizar una salida con amigos o preparar los papeles de una gestión.', note: DC.EXAMPLE_NOTE },
    options: [
      { id: 'aprender', label: 'Aprender o practicar algo' },
      { id: 'hobby', label: 'Avanzar en un hobby o proyecto personal' },
      { id: 'coordinar', label: 'Participar en actividades o quedar con otras personas' },
      { id: 'rutina', label: 'Mantener una rutina personal' },
      { id: 'siguiente', label: 'Preparar un siguiente paso de estudios o trabajo' },
      { id: 'otra', label: 'Otra actividad' },
      { id: 'nada', label: 'No hay nada que quiera explorar ahora' }
    ]
  },

  /* ---------- Preguntas por situación (route) ---------- */
  q5: {
    route: true, type: 'single', section: 'La situación elegida',
    title: '¿En qué ámbito te ocurre principalmente?',
    options: function (a) {
      var sel = DC.val(a, 'q1') || [];
      return DC.CONTEXTS.filter(function (c) { return sel.indexOf(c.id) !== -1; })
        .map(function (c) { return { id: c.id, label: c.id === 'otra' ? 'La otra actividad que mencionaste' : c.label }; })
        .concat([{ id: 'varios', label: 'En varios ámbitos' }, { id: 'otro', label: 'En otro ámbito' }]);
    }
  },

  q6: {
    route: true, type: 'single', section: 'La tarea concreta',
    title: function (a, d, ctx) { return ctx.r.situation === 'G' ? '¿Qué parte te cuesta más?' : '¿Cuál de estas tareas se parece más a lo que estabas haciendo?'; },
    help: function (a, d, ctx) {
      return ctx.r.situation === 'G' ? { explain: 'Piensa en la última vez que intentaste aprender algo con esos materiales.' } : { explain: 'Piensa en la última vez que te ocurrió.' };
    },
    options: function (a, d, ctx) { return DC.TASKS[ctx.r.situation] || []; }
  },

  q7: {
    route: true, type: 'single', section: 'Qué lo dificultó',
    title: '¿Qué fue lo que más dificultó esa tarea?',
    options: [
      { id: 'dispersa', label: 'La información estaba dispersa o era difícil de encontrar' },
      { id: 'manual', label: 'Había demasiados pasos manuales o repetidos' },
      { id: 'claro', label: 'No estaba claro cómo hacerlo o por dónde empezar' },
      { id: 'tercero', label: 'Dependía de una respuesta o acción de otra persona' },
      { id: 'herramienta', label: 'La herramienta que usaba era difícil o no me permitía hacerlo' },
      { id: 'tiempo', label: 'Me faltaba tiempo disponible' },
      { id: 'recursos', label: 'Me faltaban dinero, materiales u otros recursos' },
      { id: 'energia', label: 'En ese momento me faltaban energía o ganas para hacerlo' },
      { id: 'ninguno', label: 'Ningún obstáculo concreto' },
      { id: 'otro', label: 'Otro', textField: { max: 180, label: 'Descríbelo en pocas palabras (opcional)' } },
      { id: 'nolose', label: 'No lo sé' }
    ]
  },

  q7b: {
    route: true, type: 'single', section: 'Qué lo dificultó',
    title: '¿Qué describe mejor lo que te pasaba?',
    help: { explain: 'Elige lo que más se parezca. No hay respuestas mejores ni peores.' },
    options: [
      { id: 'sinenergia', label: 'Sabía qué hacer, pero no tenía energía para hacerlo' },
      { id: 'grande', label: 'Me costaba empezar porque la tarea parecía demasiado grande' },
      { id: 'varias', label: 'Tenía varias cosas y me costaba elegir' },
      { id: 'siguiente', label: 'No tenía claro el siguiente paso' },
      { id: 'nointeres', label: 'La actividad no me interesaba en ese momento' },
      { id: 'otra', label: 'Otra situación' },
      { id: 'nolose', label: 'No lo sé' }
    ]
  },

  q8: {
    route: true, type: 'multi', max: 3, section: 'Cómo lo haces ahora',
    title: '¿Cómo haces actualmente esa tarea?',
    help: { explain: 'Indica cómo la haces, aunque no sea un método especial. Después preguntaremos si has probado algo para facilitarla.' },
    options: [
      { id: 'app', label: 'Utilizo una aplicación o web' },
      { id: 'notas', label: 'Utilizo notas, papel, documentos o una hoja de cálculo' },
      { id: 'mensajes', label: 'Utilizo mensajes o correos' },
      { id: 'ayuda', label: 'Pido ayuda a alguien' },
      { id: 'sinmetodo', label: 'La hago sin un método concreto', incompatible: ['app', 'notas'] },
      { id: 'pospongo', label: 'Suelo posponerla o dejarla sin terminar' },
      { id: 'nointentado', label: 'Todavía no he intentado hacer esa tarea', exclusive: true },
      { id: 'otra', label: 'Otra forma' }
    ],
    extraText: { key: 'tool', max: 100, label: 'Si quieres, indica qué aplicación o web (opcional)', showIf: ['app'] }
  },

  q9: {
    route: true, type: 'single', section: 'Cómo lo haces ahora',
    title: '¿Cómo te funciona esa forma de hacerlo?',
    options: [
      { id: 'bien', label: 'Me funciona bien y requiere poco esfuerzo' },
      { id: 'esfuerzo', label: 'Lo consigo, pero con más esfuerzo del que quisiera' },
      { id: 'parte', label: 'Solo resuelve una parte' },
      { id: 'noterminar', label: 'A menudo no consigo terminarla' },
      { id: 'depende', label: 'Depende de la ocasión' },
      { id: 'nolose', label: 'No lo sé' }
    ]
  },

  q9b: {
    route: true, type: 'single', section: 'Cómo lo haces ahora',
    title: '¿Has probado algo para hacerla más fácil?',
    options: [
      { id: 'sirve', label: 'Sí, y me ha servido' },
      { id: 'parcial', label: 'Sí, pero solo parcialmente' },
      { id: 'noservido', label: 'Sí, pero no me ha servido' },
      { id: 'no', label: 'No' },
      { id: 'norecuerdo', label: 'No lo recuerdo' }
    ]
  },

  q10a: {
    route: true, type: 'single', section: 'Frecuencia e impacto',
    title: '¿Con qué frecuencia te encuentras con esta tarea?',
    options: [
      { id: 'diario', label: 'Casi todos los días' },
      { id: 'variassemana', label: 'Varias veces por semana' },
      { id: 'semanal', label: 'Aproximadamente una vez por semana' },
      { id: 'variasmes', label: 'Varias veces al mes' },
      { id: 'menos', label: 'Con menos frecuencia' },
      { id: 'nolose', label: 'No lo sé' }
    ]
  },

  q10b: {
    route: true, type: 'multi', max: 2, section: 'Frecuencia e impacto',
    title: '¿Qué consecuencia tiene para ti?',
    options: [
      { id: 'ninguna', label: 'Ninguna relevante', exclusive: true },
      { id: 'tiempo', label: 'Me quita tiempo que quería dedicar a otra cosa' },
      { id: 'cansancio', label: 'Me cansa o me frustra' },
      { id: 'errores', label: 'Provoca errores o tengo que rehacer cosas' },
      { id: 'gasto', label: 'Me supone un gasto' },
      { id: 'oportunidad', label: 'Pierdo un plazo o una oportunidad' },
      { id: 'ayuda', label: 'Necesito ayuda de alguien' },
      { id: 'impide', label: 'Dejo sin hacer algo que me importa' },
      { id: 'otra', label: 'Otra' },
      { id: 'nolose', label: 'No lo sé', exclusive: true }
    ]
  },

  q10c: {
    route: true, type: 'single', section: 'Frecuencia e impacto',
    title: 'Cuando ocurre, ¿cuánto tiempo se va aproximadamente en los pasos que te cuestan?',
    options: [
      { id: 'm5', label: 'Menos de 5 minutos' },
      { id: 'm15', label: 'Entre 5 y 15 minutos' },
      { id: 'm30', label: 'Entre 16 y 30 minutos' },
      { id: 'm30mas', label: 'Más de 30 minutos' },
      { id: 'varia', label: 'Varía mucho' },
      { id: 'nolose', label: 'No lo sé' }
    ]
  },

  q11: {
    route: true, type: 'multi', section: 'Materiales',
    title: 'Para hacer esta tarea, ¿qué utilizas o consultas?',
    help: { explain: 'Piensa en lo que miras o usas mientras la haces.' },
    options: [
      { id: 'archivos', label: 'Archivos o documentos' },
      { id: 'videos', label: 'Vídeos o grabaciones de audio' },
      { id: 'mensajes', label: 'Mensajes o correos' },
      { id: 'app', label: 'Una aplicación o plataforma' },
      { id: 'papel', label: 'Papel' },
      { id: 'persona', label: 'Información que tiene otra persona' },
      { id: 'nonecesito', label: 'No necesito consultar materiales', exclusive: true },
      { id: 'otra', label: 'Otra cosa' },
      { id: 'nolose', label: 'No lo sé', exclusive: true }
    ]
  },

  q11c: {
    route: true, type: 'single', section: 'Materiales',
    title: '¿Dónde tienes esos materiales?',
    help: { explain: 'Solo para saber qué habría que comprobar. No damos por hecho que se puedan descargar ni usar en otra herramienta.' },
    options: [
      { id: 'propios', label: 'En mi dispositivo o en una carpeta mía' },
      { id: 'plataforma', label: 'En una plataforma o aplicación a la que entro con mi cuenta' },
      { id: 'varios', label: 'Repartidos entre varios sitios' },
      { id: 'otrapersona', label: 'Los tiene otra persona u organización' },
      { id: 'nolose', label: 'No lo sé' }
    ]
  },

  /* ---------- Seguimientos (solo aparecen si se activan) ---------- */
  q6b: {
    route: true, type: 'single', section: 'La tarea concreta',
    title: '¿Qué estabas intentando hacer?',
    help: { examples: 'Entender un tema de un curso, recordar los pasos de un procedimiento del trabajo o practicar un idioma o un instrumento.', note: DC.EXAMPLE_NOTE },
    options: [
      { id: 'comprender', label: 'Comprender una explicación' },
      { id: 'recordar', label: 'Recordar información' },
      { id: 'ejercicios', label: 'Resolver ejercicios o practicar una habilidad' },
      { id: 'entrega', label: 'Preparar una entrega o un resultado' },
      { id: 'otra', label: 'Otra actividad', textField: { max: 140, label: 'Descríbela en pocas palabras (opcional)' } },
      { id: 'nolose', label: 'No lo sé' }
    ]
  },

  q7c: {
    route: true, type: 'single', section: 'Qué lo dificultó',
    title: 'La última vez, ¿qué acabaste haciendo?',
    help: { explain: 'Solo describe lo que pasó; no saca conclusiones sobre el motivo.' },
    options: [
      { id: 'tarde', label: 'Empecé más tarde' },
      { id: 'otraact', label: 'Hice otra actividad' },
      { id: 'descanse', label: 'Descansé' },
      { id: 'ayuda', label: 'Pedí ayuda' },
      { id: 'sinterminar', label: 'Lo dejé sin terminar' },
      { id: 'otra', label: 'Otra cosa' },
      { id: 'norecuerdo', label: 'No lo recuerdo' }
    ]
  },

  q9c: {
    route: true, type: 'multi', max: 2, section: 'Lo que ya te funciona',
    title: '¿Qué fue lo que te ayudó?',
    options: [
      { id: 'organizar', label: 'Cambiar cómo organizo o divido la tarea' },
      { id: 'herramienta', label: 'Utilizar una herramienta o un material' },
      { id: 'alguien', label: 'Hacerlo con ayuda de alguien' },
      { id: 'momento', label: 'Cambiar el momento o las condiciones' },
      { id: 'otra', label: 'Otra cosa' },
      { id: 'norecuerdo', label: 'No lo recuerdo', exclusive: true }
    ],
    extraText: { key: 'detalle', max: 120, label: 'Si quieres, indica qué cambiaste o utilizaste (opcional)', showIf: ['organizar', 'herramienta', 'alguien', 'momento', 'otra'] }
  },

  q9d: {
    route: true, type: 'single', section: 'Lo que ya te funciona',
    title: 'Con esa mejora, ¿queda algo que te gustaría facilitar?',
    options: [
      { id: 'si', label: 'Sí' },
      { id: 'ocasiones', label: 'Solo en algunas ocasiones' },
      { id: 'no', label: 'No, ahora me funciona suficientemente bien' },
      { id: 'nolose', label: 'No lo sé' }
    ]
  },

  q9e: {
    route: true, type: 'single', section: 'Lo que ya te funciona',
    title: '¿Qué te gustaría facilitar todavía?',
    help: { explain: 'Elige lo que más se parezca a lo que queda pendiente.' },
    options: function (a, d, ctx) {
      return (DC.TASKS[ctx.r.situation] || []).filter(function (o) { return o.id !== 'nolose'; }).concat([{ id: 'nolose', label: 'No lo sé' }]);
    }
  },

  qconsec: {
    route: true, type: 'text', max: 140, section: 'Una aclaración',
    title: '¿En qué notas esa consecuencia?',
    help: { explain: 'Opcional. Por ejemplo, qué cambia para ti cuando ocurre. Puedes continuar sin escribir.', note: 'No incluyas datos personales ni de otras personas.' }
  },

  qacc: {
    type: 'multi', section: 'Condiciones de uso',
    title: '¿Qué tendría que permitirte hacer cómodamente?',
    help: { explain: 'Es voluntario. Solo sirve para que cualquier propuesta tenga en cuenta estos ajustes. No necesitas explicar el motivo.' },
    options: [
      { id: 'leer', label: 'Leer con mayor facilidad' },
      { id: 'escuchar', label: 'Escuchar o disponer de una alternativa al audio' },
      { id: 'movimientos', label: 'Manejarlo sin depender de movimientos precisos' },
      { id: 'entender', label: 'Entender instrucciones y pasos con facilidad' },
      { id: 'apoyo', label: 'Utilizarlo con mis herramientas de apoyo' },
      { id: 'otra', label: 'Otra necesidad' },
      { id: 'noespecificar', label: 'Prefiero no especificarlo', exclusive: true }
    ],
    extraText: { key: 'detalle', max: 120, label: 'Si quieres, concreta una necesidad (opcional)', showIf: ['leer', 'escuchar', 'movimientos', 'entender', 'apoyo', 'otra'] }
  },

  /* ---------- Preguntas comunes finales ---------- */
  q12: {
    type: 'multi', max: 3, section: 'Condiciones de uso',
    title: '¿Qué tendría que cumplir una ayuda para que pudieras usarla?',
    help: { explain: 'Elige lo imprescindible, hasta tres.' },
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

  qc: { route: true, type: 'clarify', section: 'Una aclaración', title: 'Antes del informe, una aclaración opcional' },

  qconfirm: {
    type: 'single', section: 'Confirmación',
    title: '¿La situación que hemos explorado representa lo que más te interesaría facilitar?',
    help: function (a, d) { return { explain: 'Hemos explorado: «' + DC.SITUATIONS[d.r1.situation].short + '».' }; },
    options: [
      { id: 'si', label: 'Sí' },
      { id: 'parte', label: 'Solo en parte' },
      { id: 'otra', label: 'No, prefiero explorar otra' }
    ]
  },

  qswitch: {
    type: 'single', section: 'Otra situación',
    title: '¿Qué situación prefieres explorar?',
    help: { explain: 'No repetiremos las preguntas generales. Las respuestas sobre la situación anterior se conservan en un resumen.' },
    options: function (a, d) {
      var r1 = d.r1.situation;
      var order = d.candidates.concat(d.occurred).concat(DC.SIT_IDS);
      var seen = {}, o = [];
      order.forEach(function (s) {
        if (s === r1 || seen[s]) return; seen[s] = 1;
        o.push(sitOption(s, d.occurred.indexOf(s) === -1 ? ' (no la marcaste como frecuente)' : ''));
      });
      return o;
    }
  },

  q13: {
    type: 'text', max: 240, section: 'Último detalle',
    title: '¿Qué detalle nos falta para entender tu situación?',
    help: { explain: 'Opcional. Puede ser algo que no aparecía en las preguntas o algo que te gustaría poder hacer.', note: 'No incluyas nombres, datos de contacto ni información privada.' }
  },

  qcomment: {
    type: 'single', section: 'Tu comentario',
    title: 'Tu comentario, ¿describe la misma situación que hemos explorado u otra?',
    help: function (a) { return { explain: 'Tu comentario: «' + DC.val(a, 'q13') + '»' }; },
    options: function (a, d) {
      var o = [];
      if (d.lastRoute) o.push({ id: 'misma', label: 'La misma situación' });
      if (d.canExplore) o.push({ id: 'explorar', label: 'Otra situación, y quiero explorarla ahora' });
      o.push({ id: 'pendiente', label: d.canExplore ? 'Otra situación, pero prefiero dejarla pendiente' : 'Otra situación; queda anotada como pendiente' });
      o.push({ id: 'nodecir', label: 'Prefiero no indicarlo' });
      return o;
    }
  },

  qcomment2: {
    type: 'multi', section: 'Tu comentario',
    title: '¿Qué incluye tu comentario?',
    options: [
      { id: 'experiencia', label: 'Una dificultad o algo que quiero hacer' },
      { id: 'idea', label: 'Una idea de cómo podría resolverse' },
      { id: 'otro', label: 'Otra información' }
    ]
  },

  qcclass: {
    type: 'single', section: 'Tu comentario',
    title: '¿A cuál de estas situaciones se parece más lo que describes?',
    help: { explain: 'Usamos las mismas categorías del cuestionario. No interpretamos tu texto de forma automática.' },
    options: function () { return DC.SIT_IDS.map(function (s) { return sitOption(s); }).concat([{ id: 'ninguna', label: 'A ninguna de estas' }]); }
  }
};

DC.SIT_IDS.forEach(function (s, i) {
  DC.QUESTIONS['q2' + s] = {
    type: 'single', section: 'Situaciones', sectionStep: (i + 1) + ' de ' + DC.SIT_IDS.length,
    title: DC.SITUATIONS[s].q,
    help: { explain: DC.SITUATIONS[s].help.explain, examples: DC.SITUATIONS[s].help.examples, note: DC.SITUATIONS[s].help.note || DC.EXAMPLE_NOTE },
    options: DC.SCALE,
    compact: true
  };
});
