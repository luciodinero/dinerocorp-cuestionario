"""Pruebas de rutas del cuestionario con Playwright (Chromium sin interfaz).
Uso:  python3 build.py && python3 tests/test_rutas.py
"""
import os, re, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist', 'dinerocorp-cuestionario-standalone.html')
RESULTS = []
NUNCA = 'Nunca'
SIT_ORDER = ['A', 'B', 'C', 'D', 'P', 'E', 'F', 'G']
SHORT = {
    'A': 'Buscar en varios sitios algo que necesitaba', 'B': 'Repetir pasos o datos en varios sitios',
    'C': 'Necesitar muchos mensajes para ponerme de acuerdo', 'D': 'Recordar o localizar mis pendientes',
    'P': 'Elegir por dónde empezar', 'E': 'Volver a revisar información para comparar o decidir',
    'F': 'Posponer o dejar a medias una actividad', 'G': 'Preparar o usar materiales para aprender'}
FORBIDDEN = ['No existe una oportunidad', 'No hay información sobre cómo funcionaría', 'díashas']


def check(name, cond, detail=''):
    RESULTS.append((name, bool(cond), detail))
    print(('OK   ' if cond else 'FALLO') + ' ' + name + ('' if cond else '  → ' + str(detail)[:400]))


class Q:
    def __init__(self, page):
        self.p = page

    def start(self):
        self.p.goto(URL)
        self.p.click('text=Empezar')

    def inp(self, text):
        rx = re.compile('^' + re.escape(text) + r'\s*(Si la marcas.*)?$')
        for role in ('radio', 'checkbox'):
            loc = self.p.get_by_role(role, name=rx)
            if loc.count():
                return loc.first
        raise AssertionError('Opción no encontrada: «' + text + '» en «' + self.title() + '»')

    def pick(self, *texts):
        for t in texts:
            self.inp(t).check()

    def cont(self):
        self.p.locator('#qform button[type=submit]').click()

    def back(self):
        self.p.click('[data-act=back]')

    def title(self):
        return self.p.locator('main h1').first.inner_text()

    def text(self):
        return self.p.inner_text('main')

    def answer(self, *texts):
        self.pick(*texts)
        self.cont()

    def freq(self, **kw):
        """Responde las 8 preguntas de frecuencia; por defecto «Nunca»."""
        for s in SIT_ORDER:
            self.answer(kw.get(s, NUNCA))

    def keys(self):
        return self.p.evaluate('Object.keys(DC_APP.state().answers)')


def report_checks(q, prefix):
    t = q.text()
    for f in FORBIDDEN:
        check(prefix + ': no contiene «' + f + '»', f not in t, '')
    check(prefix + ': sin porcentajes', not re.search(r'\d+\s?%', t), re.findall(r'\d+\s?%', t))
    check(prefix + ': indica que se refiere solo a lo explorado', 'solo a lo explorado' in t, '')
    return t


# ---------------------------------------------------------------- rutas
def ruta_varias(q):
    q.start()
    check('Ayuda: q1 con explicación', 'Solo sirve para situar' in q.text(), '')
    q.answer('Trabajo por cuenta ajena', 'Hobbies o proyectos personales')
    t = q.text()
    check('Ejemplos: visibles en frecuencia A', 'ejemplos' in t.lower() and 'recuperar una receta' in t and 'Son solo ejemplos' in t, t[:600])
    check('Ejemplos: sin mencionar aplicaciones', not re.search(r'\bapp\b|aplicaci', q.p.inner_text('.qhelp')), q.p.inner_text('.qhelp'))
    q.freq(A='En 3–5 días', B='En 1–2 días', C='En 6 días o más', E='No me aplica', F='No lo recuerdo')
    t = q.text()
    check('q3: título simplificado y solo situaciones ocurridas', 'causaron una dificultad' in t and SHORT['A'] in t and SHORT['D'] not in t, t[:500])
    q.answer(SHORT['A'], SHORT['C'])
    check('q4: pregunta qué explorar', 'quieres explorar' in q.title(), q.title())
    q.answer('No tengo preferencia')
    check('q4b: pregunta cuál ha tenido más consecuencias', 'más consecuencias' in q.title(), q.title())
    q.answer('Han tenido consecuencias parecidas')
    t = q.text()
    check('q4c: propone la más frecuente como criterio provisional', 'más frecuente' in t and 'criterio provisional' in t and 'Sí, explorar «' + SHORT['C'] + '»' in t, t[:600])
    q.answer('Sí, explorar «' + SHORT['C'] + '»')
    t = q.text()
    check('q5: aviso de criterio provisional con opción de cambiar', 'criterio provisional' in t and 'Elegir otra' in t, t[:400])
    q.answer('Trabajo por cuenta ajena')
    q.answer('Consultar acuerdos o el estado de una actividad')
    q.answer('La información estaba dispersa o era difícil de encontrar')
    q.answer('Me cuesta encontrar lo que necesito')
    q.answer('Utilizo mensajes o correos', 'Utilizo notas, papel, documentos o una hoja de cálculo')
    check('q9: pareja «cómo funciona» + «has probado algo»', '¿Has probado algo' in q.text(), q.text()[:300])
    q.pick('Lo consigo, pero con más esfuerzo del que quisiera', 'No'); q.cont()
    check('Frecuencia de la tarea omitida (ya respondida)', 'frecuencia' not in q.title().lower(), q.title())
    q.answer('Me quita tiempo que quería dedicar a otra cosa', 'Provoca errores o tengo que rehacer cosas')
    q.answer('Entre 5 y 15 minutos')
    check('Materiales: nueva pregunta', 'qué utilizas o consultas' in q.title(), q.title())
    q.answer('Mensajes o correos')
    q.answer('Repartidos entre varios sitios')
    q.answer('Funcionar desde el ordenador', 'Permitir revisar y confirmar lo que hace')
    check('Confirmación de la situación antes del informe', 'representa lo que más' in q.title(), q.title())
    q.answer('Sí')
    q.cont()  # comentario vacío
    t = report_checks(q, 'Varias')
    for sec in ['Situación explorada', 'Evidencia', 'Posible ayuda', 'Primera prueba', 'Pregunta pendiente más importante', 'Cómo comprobar si ayuda', 'Estado de la propuesta']:
        check('Varias: sección «' + sec + '»', sec in t, '')
    check('Varias: hipótesis de recuperar información', 'Recuperar información' in t, t)
    check('Varias: otras situaciones pendientes', 'Otras situaciones pendientes' in t and SHORT['A'] in t, '')
    check('Varias: evidencia entre 3 y 5', 3 <= q.p.locator('section:has(h2:text("Evidencia")) li').count() <= 5, q.p.locator('section:has(h2:text("Evidencia")) li').count())
    check('Varias: «No has indicado haber probado una mejora»', 'No has indicado haber probado una mejora' in t, '')
    check('Varias: máximo tres funciones', q.p.locator('.features li').count() <= 3, '')
    html = q.p.evaluate('DC_APP.exportHTML()')
    check('Exportación: sin «díashas» y con respuestas', 'díashas' not in html and 'Tus respuestas' in html and 'En las últimas dos semanas, ¿en cuántos días has' in html, '')


def ruta_consecuencias(q):
    q.start()
    q.answer('Estudios o formación')
    q.freq(A='En 3–5 días', B='En 3–5 días')
    q.answer(SHORT['A'], SHORT['B'])
    q.answer('No tengo preferencia')
    q.answer(SHORT['B'])
    check('q4b: elegir por consecuencias va directo a la situación', 'ámbito' in q.title(), q.title())


def ruta_empate(q):
    q.start()
    q.answer('Estudios o formación')
    q.freq(A='En 3–5 días', B='En 3–5 días')
    q.answer(SHORT['A'], SHORT['B'])
    q.answer('No tengo preferencia')
    q.answer('No lo sé')
    check('Empate: pide elegir sin inventar prioridad', 'misma frecuencia' in q.title(), q.title())


def ruta_aprendizaje(q):
    q.start()
    q.answer('Trabajo por cuenta ajena')
    q.freq(G='En 1–2 días')
    q.answer(SHORT['G'])
    q.answer('Trabajo por cuenta ajena')
    check('Aprendizaje: pregunta «¿Qué parte te cuesta más?»', q.title() == '¿Qué parte te cuesta más?', q.title())
    q.answer('Encontrar otra vez una parte concreta')
    q.answer('La información estaba dispersa o era difícil de encontrar')
    q.answer('Me cuesta encontrar lo que necesito')
    q.answer('Utilizo notas, papel, documentos o una hoja de cálculo')
    q.pick('Solo resuelve una parte', 'Sí, pero solo parcialmente'); q.cont()
    q.answer('Me cansa o me frustra')
    q.answer('Vídeos o grabaciones de audio', 'Archivos o documentos')
    check('Aprendizaje: pregunta dónde están los materiales (sin presuponer acceso)', 'Dónde tienes esos materiales' in q.title() and 'No damos por hecho' in q.text(), q.title())
    q.answer('En una plataforma o aplicación a la que entro con mi cuenta')
    q.answer('Funcionar desde el ordenador')
    q.answer('Sí'); q.cont()
    t = report_checks(q, 'Aprendizaje')
    check('Aprendizaje: hipótesis de recuperar información', 'Recuperar información' in t, t)
    check('Aprendizaje: no presupone acceso al vídeo', 'No damos por hecho que se pueda acceder al vídeo' in t, t)
    check('Aprendizaje: pregunta pendiente sobre acceso a grabaciones', 'grabaciones' in q.p.inner_text('.ask'), q.p.inner_text('.ask'))


def ruta_estudiante(q, explorar):
    tag = 'Estudiante (' + ('explora comentario' if explorar else 'comentario pendiente') + ')'
    q.start()
    q.answer('Estudios o formación')
    q.freq(P='En 6 días o más')
    q.answer(SHORT['P'])
    q.answer('Estudios o formación')
    q.answer('Elegir entre varias tareas o gestiones pendientes')
    q.answer('En ese momento me faltaban energía o ganas para hacerlo')
    check(tag + ': seguimiento de energía', 'describe mejor' in q.title(), q.title())
    q.answer('No lo sé')
    q.answer('La hago sin un método concreto')
    q.pick('A menudo no consigo terminarla', 'No'); q.cont()
    q.answer('Pierdo un plazo o una oportunidad', 'Dejo sin hacer algo que me importa')
    q.answer('Vídeos o grabaciones de audio')
    q.answer('Ser gratuita o de coste bajo', 'Requerir poca configuración', 'Funcionar desde el ordenador')
    check(tag + ': pregunta qué acabó haciendo (sin otro seguimiento más útil)', 'qué acabaste haciendo' in q.title(), q.title())
    q.answer('Hice otra actividad')
    q.answer('Sí')
    q.p.fill('textarea', 'Estudio con clases grabadas, son mi único material de estudio. Me gustaría sacar apuntes automáticamente.')
    q.cont()
    check(tag + ': pregunta si el comentario describe otra situación', 'misma situación' in q.title(), q.title())
    q.pick('Otra situación, y quiero explorarla ahora' if explorar else 'Otra situación, pero prefiero dejarla pendiente')
    q.pick('Una dificultad o algo que quiero hacer', 'Una idea de cómo podría resolverse')
    q.cont()
    check(tag + ': clasifica con las categorías del cuestionario', 'se parece más' in q.title() and 'No interpretamos tu texto' in q.text(), q.title())
    q.answer(SHORT['G'])
    if explorar:
        check(tag + ': no repite preguntas generales (va al ámbito)', 'ámbito' in q.title(), q.title())
        q.answer('Estudios o formación')
        check(tag + ': ruta de aprendizaje', q.title() == '¿Qué parte te cuesta más?', q.title())
        q.answer('Tomar apuntes mientras escucho o veo una explicación')
        q.answer('Había demasiados pasos manuales o repetidos')
        q.answer('Utilizo notas, papel, documentos o una hoja de cálculo')
        q.pick('Solo resuelve una parte', 'No'); q.cont()
        check(tag + ': pregunta frecuencia (la situación no tenía dato previo)', 'frecuencia' in q.title().lower(), q.title())
        q.answer('Varias veces por semana')
        q.answer('Me quita tiempo que quería dedicar a otra cosa')
        q.answer('Más de 30 minutos')
        q.answer('Vídeos o grabaciones de audio')
        q.answer('En una plataforma o aplicación a la que entro con mi cuenta')
    t = report_checks(q, tag)
    html = q.p.evaluate('DC_APP.exportHTML()')
    check(tag + ': muestra el comentario como evidencia', 'clases grabadas' in t, '')
    check(tag + ': separa experiencia, solución imaginada y comprobación', all(x in t for x in ['La experiencia que describes', 'La solución que imaginas', 'Lo que falta comprobar']), t[-1500:])
    check(tag + ': trata la idea como pista', 'pista' in t, '')
    check(tag + ': no presupone acceso a vídeo/audio/transcripción', 'transcripción' in t, '')
    check(tag + ': no promete exactitud ni ahorro', 'no damos por hecho' in t.lower() and 'exacto' in t, '')
    check(tag + ': mantiene incertidumbre sobre priorización', 'elegir entre varias tareas' in t and 'Falta confirmarlo' in t, '')
    check(tag + ': usa «No tenemos información suficiente» (no descarte global)', 'No tenemos información suficiente para proponer una ayuda tecnológica para esta dificultad' in t, '')
    check(tag + ': exportación coherente', 'clases grabadas' in html and 'La solución que imaginas' in html, '')
    if explorar:
        check(tag + ': informe principal sobre aprendizaje y resumen de la anterior', 'Situación explorada antes' in t and 'Preparar o usar materiales para aprender' in t, '')
        check(tag + ': primera prueba tras aclarar el problema', q.p.locator('.features li').count() >= 1, '')
        check(tag + ': advierte que lo automático debe revisarse', 'tendría que revisarse' in t, '')
    else:
        check(tag + ': información adicional pendiente de explorar', 'Información adicional pendiente de explorar' in t, '')
        check(tag + ': pregunta qué cuesta más al aprender con esos materiales', 'qué parte te cuesta más' in t, '')
        check(tag + ': sin primera prueba antes de aclarar', q.p.locator('.features li').count() == 0, '')


def ruta_energia_grande(q):
    q.start()
    q.answer('Hogar o cuidados')
    q.freq(F='En 3–5 días')
    q.answer(SHORT['F'])
    q.answer('Hogar o cuidados')
    q.answer('Preparar una gestión o un siguiente paso')
    q.answer('En ese momento me faltaban energía o ganas para hacerlo')
    q.answer('Me costaba empezar porque la tarea parecía demasiado grande')
    q.answer('Suelo posponerla o dejarla sin terminar')
    q.pick('A menudo no consigo terminarla', 'No'); q.cont()
    q.answer('Pierdo un plazo o una oportunidad')
    q.answer('Papel')
    q.answer('Funcionar desde el móvil')
    q.answer('Sí'); q.cont()
    t = report_checks(q, 'Energía (tarea grande)')
    check('Energía (tarea grande): no descarta la ayuda', 'dividir la tarea en pasos cortos' in t and q.p.locator('.features li').count() >= 1, t)


def ruta_energia_sin(q):
    q.start()
    q.answer('Hobbies o proyectos personales')
    q.freq(F='En 3–5 días')
    q.answer(SHORT['F'])
    q.answer('Hobbies o proyectos personales')
    q.answer('Crear o desarrollar un proyecto')
    q.answer('En ese momento me faltaban energía o ganas para hacerlo')
    q.answer('Sabía qué hacer, pero no tenía energía para hacerlo')
    q.answer('Suelo posponerla o dejarla sin terminar')
    q.pick('A menudo no consigo terminarla', 'No'); q.cont()
    q.answer('Dejo sin hacer algo que me importa')
    q.answer('No necesito consultar materiales')
    q.answer('Funcionar desde el móvil')
    q.answer('Sí'); q.cont()
    t = report_checks(q, 'Energía (sin energía)')
    check('Energía (sin energía): frase exacta de información insuficiente', 'No tenemos información suficiente para proponer una ayuda tecnológica para esta dificultad.' in t, t)
    check('Energía (sin energía): sin prueba de software', q.p.locator('.features li').count() == 0, '')


def ruta_metodo_ok(q):
    q.start()
    q.answer('Hogar o cuidados')
    q.freq(D='En 3–5 días')
    q.answer(SHORT['D'])
    q.answer('Hogar o cuidados')
    q.answer('Recordar una fecha, una cita o una entrega')
    q.answer('La información estaba dispersa o era difícil de encontrar')
    q.answer('Me cuesta encontrar lo que necesito')
    q.answer('Utilizo una aplicación o web')
    q.pick('Me funciona bien y requiere poco esfuerzo', 'Sí, y me ha servido'); q.cont()
    q.pick('Cambiar el momento o las condiciones', 'No, ahora me funciona suficientemente bien'); q.cont()
    q.answer('Ninguna relevante')
    q.answer('Una aplicación o plataforma')
    q.answer('En una plataforma o aplicación a la que entro con mi cuenta')
    q.answer('Funcionar desde el móvil')
    check('Método OK: aclaración por contradicción', 'aclaración' in q.title(), q.title())
    q.cont()
    q.answer('Sí'); q.cont()
    t = report_checks(q, 'Método OK')
    check('Método OK: «La solución actual parece adecuada»', 'La solución actual parece adecuada' in t, t)


def ruta_sin_necesidad(q):
    q.start()
    q.answer('Descanso y ocio')
    q.freq()
    check('Sin necesidad: ruta de actividad deseada', 'último mes' in q.title(), q.title())
    q.answer('No hay nada que quiera explorar ahora')
    check('Sin necesidad: ofrece comentario antes de concluir', 'detalle nos falta' in q.title(), q.title())
    q.cont()
    t = report_checks(q, 'Sin necesidad')
    check('Sin necesidad: estado limitado a lo explorado', 'No se ha identificado una necesidad relevante en lo explorado' in t, t)


def ruta_sin_necesidad_comentario(q):
    q.start()
    q.answer('Negocio propio o trabajo autónomo')
    q.freq()
    q.answer('No hay nada que quiera explorar ahora')
    q.p.fill('textarea', 'Cada mes copio las facturas a una hoja a mano')
    q.cont()
    check('Comentario sin ruta: no ofrece «la misma situación»', 'La misma situación' not in q.text(), '')
    q.pick('Otra situación, y quiero explorarla ahora'); q.cont()
    q.answer(SHORT['B'])
    check('Comentario sin ruta: explora la situación del comentario', 'ámbito' in q.title(), q.title())
    q.answer('Negocio propio o trabajo autónomo')
    q.answer('Hacer cálculos o preparar resúmenes periódicos')
    q.answer('Había demasiados pasos manuales o repetidos')
    q.answer('Utilizo notas, papel, documentos o una hoja de cálculo')
    q.pick('Lo consigo, pero con más esfuerzo del que quisiera', 'No'); q.cont()
    check('Comentario sin ruta: pregunta frecuencia (no hay dato previo)', 'frecuencia' in q.title().lower(), q.title())
    q.answer('Varias veces al mes')
    q.answer('Provoca errores o tengo que rehacer cosas')
    q.answer('Archivos o documentos')
    q.answer('En mi dispositivo o en una carpeta mía')
    q.answer('Funcionar desde el ordenador')
    t = report_checks(q, 'Comentario sin ruta')
    check('Comentario sin ruta: propuesta de plantilla de cálculo', 'plantilla de cálculo' in t, t)


def ruta_otra_vacia(q):
    q.start()
    q.answer('Otra actividad')
    q.freq(A='En 1–2 días')
    q.answer(SHORT['A'])
    q.answer('La otra actividad que mencionaste')
    q.pick('Otra tarea')
    check('Otra: campo opcional de 180', q.p.locator('#txt-1_q6-otra').get_attribute('maxlength') == '180', '')
    q.cont()
    q.pick('Otro'); q.cont()
    q.answer('Otra forma')
    q.pick('Depende de la ocasión', 'No lo recuerdo'); q.cont()
    q.answer('No lo sé')
    q.answer('No lo sé')
    q.answer('Necesitaría ver un ejemplo')
    q.answer('Solo en parte'); q.cont()
    t = report_checks(q, 'Otra vacía')
    check('Otra vacía: refleja falta de detalle', 'sin más detalle' in t, t)
    check('Otra vacía: «No tenemos información suficiente»', 'No tenemos información suficiente' in t, t)
    check('Otra vacía: una sola pregunta pendiente', q.p.locator('.ask').count() == 1, '')
    check('Otra vacía: registra «solo en parte»', 'solo en parte' in t, '')


def ruta_cambio_situacion(q):
    q.start()
    q.answer('Trabajo por cuenta ajena', 'Hogar o cuidados')
    q.freq(B='En 3–5 días', C='En 1–2 días')
    q.answer(SHORT['B'], SHORT['C'])
    q.answer(SHORT['B'])
    q.answer('Trabajo por cuenta ajena')
    q.answer('Preparar mensajes o documentos parecidos')
    q.answer('Había demasiados pasos manuales o repetidos')
    q.answer('Utilizo notas, papel, documentos o una hoja de cálculo')
    q.pick('Solo resuelve una parte', 'No'); q.cont()
    q.answer('Me cansa o me frustra')
    q.answer('Archivos o documentos')
    q.answer('En mi dispositivo o en una carpeta mía')
    q.answer('Funcionar desde el ordenador')
    q.answer('No, prefiero explorar otra')
    check('Cambio: lista otras situaciones', SHORT['C'] in q.text(), '')
    q.answer(SHORT['C'])
    check('Cambio: no repite preguntas generales', 'ámbito' in q.title(), q.title())
    q.answer('Hogar o cuidados')
    q.answer('Repartir tareas o responsabilidades')
    q.answer('Dependía de una respuesta o acción de otra persona')
    q.answer('Utilizo mensajes o correos')
    q.pick('Solo resuelve una parte', 'No'); q.cont()
    q.answer('Me quita tiempo que quería dedicar a otra cosa')
    q.answer('Menos de 5 minutos')
    q.answer('Mensajes o correos')
    check('Cambio: no vuelve a preguntar condiciones de uso', 'cumplir una ayuda' not in q.title(), q.title())
    q.cont()
    t = report_checks(q, 'Cambio de situación')
    check('Cambio: resumen de la situación anterior', 'Situación explorada antes' in t and SHORT['B'] in t, '')
    keys = q.keys()
    check('Cambio: conserva contexto, frecuencias y condiciones', all(k in keys for k in ['q1', 'q2B', 'q3', 'q12', '1.q6', '2.q6']), keys)
    q.p.click('[data-act=review]')
    q.p.click('[data-goto=qswitch]')
    q.answer(SHORT['A'] + ' (no la marcaste como frecuente)')
    keys = q.keys()
    check('Cambio: limpia solo las respuestas de la segunda situación', '2.q6' not in keys and '1.q6' in keys and 'q12' in keys, keys)


def ruta_cambios(q):
    p = q.p
    q.start()
    q.cont()
    check('Validación: error visible y textual', p.locator('.error:not([hidden])').count() == 1 and 'Falta una respuesta' in q.text(), '')
    q.answer('Trabajo por cuenta ajena')
    q.freq(A='En 3–5 días', B='En 1–2 días')
    q.pick(SHORT['A'])
    q.pick('Ninguna')
    check('Exclusiva: «Ninguna» desmarca las demás', not q.inp(SHORT['A']).is_checked(), '')
    q.pick(SHORT['A'])
    check('Exclusiva: marcar otra desmarca «Ninguna»', not q.inp('Ninguna').is_checked(), '')
    q.cont()
    q.answer('Trabajo por cuenta ajena')
    q.answer('Encontrar un archivo, una nota o un mensaje')
    q.answer('La información estaba dispersa o era difícil de encontrar')
    q.answer('Me cuesta encontrar lo que necesito')
    q.pick('Utilizo notas, papel, documentos o una hoja de cálculo')
    q.pick('La hago sin un método concreto')
    check('Incompatibles: «sin método» desmarca «notas»', not q.inp('Utilizo notas, papel, documentos o una hoja de cálculo').is_checked(), '')
    q.pick('Utilizo mensajes o correos', 'Pido ayuda a alguien')
    check('Máximo: cuarta opción deshabilitada', q.inp('Otra forma').is_disabled(), '')
    q.cont()
    q.back()
    check('Atrás: conserva respuestas', q.inp('Pido ayuda a alguien').is_checked(), '')
    q.cont()
    q.pick('Solo resuelve una parte', 'No'); q.cont()
    q.answer('Me cansa o me frustra')
    q.answer('Mensajes o correos')
    q.answer('No lo sé')
    q.answer('Funcionar desde el ordenador')
    q.answer('Sí'); q.cont()
    check('Cambios: llega al informe', 'Situación explorada' in q.text(), '')
    p.click('[data-act=review]')
    p.click('[data-goto=q2A]')
    q.answer('Nunca')
    t = q.text()
    check('Cambios: avisa de respuestas quitadas', 'Hemos quitado' in t, t[:300])
    keys = q.keys()
    check('Cambios: elimina respuestas no aplicables y conserva generales', 'q3' not in keys and '1.q6' not in keys and 'q1' in keys and 'q12' in keys, keys)
    check('Progreso: indicador textual', re.match(r'Pantalla \d+ de ', p.inner_text('#progress-text')) is not None, p.inner_text('#progress-text'))


def universitaria(q, completa, describe=False):
    tag = 'Universitaria (' + ('completa' if completa else 'datos pendientes') + (', describe consecuencia' if describe else '') + ')'
    seen = []
    def ans(*t):
        seen.append(q.title()); q.answer(*t)
    q.start()
    ans('Estudios o formación')
    for s_ in SIT_ORDER:
        ans({'C': 'En 6 días o más', 'F': 'En 1–2 días'}.get(s_, NUNCA))
    ans(SHORT['F'])
    check(tag + ': respeta la situación elegida aunque otra sea más frecuente', 'ámbito' in q.title(), q.title())
    ans('Estudios o formación')
    ans('Aprender o practicar algo')
    check(tag + ': concreta la actividad de aprendizaje', q.title() == '¿Qué estabas intentando hacer?', q.title())
    hx = q.p.inner_text('.qhelp')
    check(tag + ': ejemplos de aprendizaje académico, laboral y personal', 'curso' in hx and 'trabajo' in hx and 'idioma' in hx, hx)
    ans('Comprender una explicación' if completa else 'No lo sé')
    ans('En ese momento me faltaban energía o ganas para hacerlo')
    ans('No lo sé')
    ans('Utilizo notas, papel, documentos o una hoja de cálculo')
    q.pick('Depende de la ocasión', 'Sí, y me ha servido'); q.cont()
    check(tag + ': pregunta qué le ayudó', 'te ayudó' in q.title() and 'queda algo' in q.text(), q.title())
    if completa:
        q.pick('Cambiar cómo organizo o divido la tarea', 'Solo en algunas ocasiones')
        q.p.fill('#txt-1_q9c-detalle', 'Dividir en bloques de 20 minutos')
        q.cont()
        check(tag + ': identifica lo que queda con opciones de la ruta', 'facilitar todavía' in q.title(), q.title())
        ans('Aprender o practicar algo')
    else:
        q.pick('Cambiar cómo organizo o divido la tarea')
        q.pick('No lo recuerdo')
        check(tag + ': «No lo recuerdo» es excluyente', not q.inp('Cambiar cómo organizo o divido la tarea').is_checked(), '')
        q.pick('No lo sé'); q.cont()
    ans('Ninguna relevante')
    ans('Papel')
    q.pick('Adaptarse a mis necesidades de accesibilidad', 'Funcionar desde el ordenador'); q.cont()
    check(tag + ': seguimiento voluntario de accesibilidad', 'cómodamente' in q.title() and '(opcional)' in q.text(), q.title())
    if completa:
        q.pick('Leer con mayor facilidad')
    else:
        q.pick('Leer con mayor facilidad'); q.pick('Prefiero no especificarlo')
        check(tag + ': «Prefiero no especificarlo» es excluyente', not q.inp('Leer con mayor facilidad').is_checked(), '')
    q.cont()
    check(tag + ': comprobación de consecuencias', 'aclaración' in q.title(), q.title())
    q.pick('Sí tiene consecuencias, pero no encajaban en la lista'); q.cont()
    check(tag + ': pregunta en qué nota la consecuencia (opcional)', 'En qué notas esa consecuencia' in q.title(), q.title())
    if describe:
        q.p.fill('textarea', 'Llego con retraso a las entregas')
    q.cont()
    check(tag + ': no pregunta qué acabó haciendo (hay seguimientos más útiles)', 'qué acabaste haciendo' not in q.title(), q.title())
    ans('Sí')
    q.cont()
    t = report_checks(q, tag)
    seen_q7b = sum(1 for x in seen if 'describe mejor' in x)
    check(tag + ': las causas de energía se preguntan una sola vez', seen_q7b == 1, seen)
    check(tag + ': el informe no vuelve a pedir elegir causas', 'demasiado grande' not in q.p.inner_text('.ask'), q.p.inner_text('.ask'))
    if describe:
        check(tag + ': usa la consecuencia descrita', 'Llego con retraso a las entregas' in t, '')
    else:
        check(tag + ': reconoce consecuencias sin describir', 'Has indicado que esta situación tiene consecuencias relevantes, pero todavía no sabemos cuáles.' in t, t[:1500])
        check(tag + ': estado de necesidad por describir', 'Hay una necesidad, pero todavía no está bien descrita' in t, '')
    check(tag + ': no muestra «Ninguna relevante» como conclusión', 'Ninguna relevante' not in t, '')
    check(tag + ': no recomienda una aplicación', 'Una aplicación' not in t and 'Una web sencilla' not in t and q.p.locator('.features li').count() == 0, '')
    check(tag + ': mantiene la mejora que funciona', 'Mantén' in t and 'te ha servido' in t, '')
    check(tag + ': no se desvía a coordinación', SHORT['C'] not in t, '')
    check(tag + ': no atribuye el problema a la etapa universitaria', not re.search(r'universi|carrera', t, re.I), '')
    if completa:
        check(tag + ': accesibilidad como condición de la ayuda', 'Accesibilidad: permitirte leer con mayor facilidad' in t, '')
        check(tag + ': registra lo que ayudó y lo que queda', 'cambiar cómo organizo o divido la tarea' in t and 'Dividir en bloques' in t and 'Aún queda algo por facilitar en algunas ocasiones' in t, '')
    else:
        check(tag + ': accesibilidad sin concretar', 'La ayuda tendría que adaptarse a tus necesidades de accesibilidad; falta concretar qué ajustes necesitas.' in t, '')
        check(tag + ': reconoce datos pendientes sin inventarlos', 'Qué fue exactamente lo que te ayudó' in t and 'Qué queda por facilitar' in t, '')
        check(tag + ': no repite «¿Qué estabas intentando hacer?»', '¿Qué estabas intentando hacer?' not in q.p.inner_text('.ask'), '')
    html = q.p.evaluate('DC_APP.exportHTML()')
    check(tag + ': exportación con respuesta inicial y aclaración', 'Respuesta inicial: Ninguna relevante. Aclaración posterior: Sí tiene consecuencias, pero no encajaban en la lista' in html, '')
    return q


def mejora_suficiente(q):
    q.start()
    q.answer('Hogar o cuidados')
    q.freq(B='En 3–5 días')
    q.answer(SHORT['B'])
    q.answer('Hogar o cuidados')
    q.answer('Introducir los mismos datos en varios sitios')
    q.answer('Había demasiados pasos manuales o repetidos')
    q.answer('Utilizo notas, papel, documentos o una hoja de cálculo')
    q.pick('Lo consigo, pero con más esfuerzo del que quisiera', 'Sí, y me ha servido'); q.cont()
    q.pick('Utilizar una herramienta o un material', 'No, ahora me funciona suficientemente bien'); q.cont()
    q.answer('Me cansa o me frustra')
    q.answer('Papel')
    q.answer('Funcionar desde el móvil')
    q.answer('Sí'); q.cont()
    t = report_checks(q, 'Mejora suficiente')
    check('Mejora suficiente: termina sin nueva herramienta', 'La solución actual parece adecuada' in t and 'Mantener lo que ya te funciona' in t and q.p.locator('.features li').count() == 0, t)
    q.p.click('[data-act=review]')
    q.p.click('[data-goto="1.q9"]')
    q.pick('No'); q.cont()
    keys = q.keys()
    check('Limpieza: cambiar «me ha servido» quita solo sus seguimientos', '1.q9c' not in keys and '1.q9d' not in keys and '1.q10b' in keys and '1.q11' in keys, keys)


def limpieza_aclaraciones(q):
    universitaria(q, True)
    q.p.click('[data-act=review]')
    q.p.click('[data-goto="q12"]')
    q.inp('Adaptarse a mis necesidades de accesibilidad').uncheck(); q.cont()
    keys = q.keys()
    check('Limpieza: quitar accesibilidad elimina su seguimiento', 'qacc' not in keys and '1.qc' in keys, keys)


NEG = {'q1': ['ajena', 'propio', 'hobbies', 'descanso']}


def negocio(q, variante):
    """Caso del negocio propio. variante: 'reunir' | 'colabora' | 'nolose' | 'otrapersona'"""
    tag = 'Negocio (' + variante + ')'
    q.start()
    q.answer('Trabajo por cuenta ajena', 'Negocio propio o trabajo autónomo', 'Hobbies o proyectos personales', 'Descanso y ocio')
    q.freq(P='En 3–5 días')
    q.answer(SHORT['P'])
    q.answer('Negocio propio o trabajo autónomo')
    check(tag + ': opción vaga sustituida', 'Ordenar cosas de ámbitos distintos' not in q.text() and 'Ordenar varias cosas pendientes' in q.text(), '')
    q.answer('Ordenar varias cosas pendientes')
    check(tag + ': pregunta qué intenta ordenar', 'intentando ordenar' in q.title(), q.title())
    q.answer('Responsabilidades de trabajo y personales')
    q.answer('La información estaba dispersa o era difícil de encontrar')
    check(tag + ': aclara qué significa la dispersión, con ejemplos', 'qué ocurre' in q.title() and 'Son solo ejemplos' in q.text(), q.title())
    disp = {'reunir': 'Sé dónde está, pero tengo que reunirla para decidir', 'colabora': 'Sé dónde está, pero tengo que reunirla para decidir',
            'nolose': 'No lo sé', 'otrapersona': 'Necesito información que tiene otra persona'}[variante]
    q.answer(disp)
    if disp.startswith('Sé dónde'):
        check(tag + ': pregunta qué necesita saber para elegir', 'elegir qué hacer primero' in q.title(), q.title())
        q.pick('Cuándo debe estar terminado', 'Si otra persona está esperando'); q.cont()
    q.answer('Pido ayuda a alguien', 'La hago sin un método concreto')
    q.pick('Solo resuelve una parte', 'No'); q.cont()
    q.answer('Necesito ayuda de alguien', 'Dejo sin hacer algo que me importa')
    check(tag + ': distingue colaboración de dependencia', 'necesitar esa ayuda' in q.title() and 'no es un problema por sí mismo' in q.text(), q.title())
    if variante == 'colabora':
        q.pick('Tengo que esperar para avanzar'); q.pick('No me causa una dificultad; simplemente colaboramos')
        check(tag + ': «colaboramos» es excluyente', not q.inp('Tengo que esperar para avanzar').is_checked(), '')
        q.cont()
    elif variante == 'otrapersona':
        q.answer('Tengo que esperar para avanzar')
    else:
        q.answer('Necesito su criterio o conocimientos para decidir')
    q.answer('No lo sé')
    q.answer('Funcionar desde el ordenador', 'Ser gratuita o de coste bajo')
    q.answer('Sí'); q.cont()
    t = report_checks(q, tag)
    check(tag + ': no declara contradicción por «nunca busca en varios sitios»', 'contradictorias' not in t and 'no contradice que esté dispersa' in t, '')
    check(tag + ': no recomienda un gestor de tareas', 'gestor de tareas' not in t.lower(), '')
    check(tag + ': formato no definitivo', 'Se decidirá después de una primera prueba' in t and 'Formato\nUna web sencilla' not in t, '')
    for li in q.p.locator('.features > li').all_inner_texts():
        if 'priorid' in li.lower() or 'elegir' in li.lower():
            check(tag + ': la función de decidir no se justifica por la dispersión', 'dispersión' not in li, li)
    status = q.p.inner_text('.status .st-reason').lower()
    ask = q.p.inner_text('.ask') if q.p.locator('.ask').count() else ''
    if variante == 'reunir':
        check(tag + ': hipótesis reunir + decidir + criterio experto', all(x in t for x in ['Reunir información', 'Decidir entre pendientes', 'Necesitar el criterio de otra persona']), t[:2000])
        check(tag + ': decidir usa solo los datos indicados', 'cuándo debe estar terminado; si otra persona está esperando' in t.lower(), '')
        check(tag + ': cada función con base, alivio y comprobación', q.p.locator('.fn-just').count() >= 1 and q.p.locator('.fn-just').count() == q.p.locator('.features > li').count(), '')
        check(tag + ': no promete sustituir conocimientos', 'No sustituye su criterio' in t, '')
        check(tag + ': prueba manual con 3–5 pendientes reales', 'entre tres y cinco pendientes reales' in t and 'explicar por qué' in t, '')
        check(tag + ': estado provisional coherente con la pregunta (fuentes)', 'dónde está la información' in status and 'Dónde está ahora esa información' in ask, (status, ask))
        check(tag + ': comprobación observable', 'Identificar un siguiente paso y explicar por qué' in t and 'más esfuerzo del que evita' in t, '')
    if variante == 'colabora':
        check(tag + ': colaboración no es dificultad', 'colaboración normal' in t, '')
        check(tag + ': conserva la otra consecuencia', 'dejo sin hacer algo que me importa' in t.lower(), '')
        check(tag + ': sin hipótesis de espera por la ayuda', 'Esperar información o acciones' not in t, '')
    if variante == 'nolose':
        check(tag + ': distingue hipótesis posibles sin elegir', all(x in t for x in ['Reunir información', 'Decidir entre pendientes', 'Encajaría']), t[:2500])
        check(tag + ': sin funciones mientras se desconoce el significado', q.p.locator('.features > li').count() == 0, '')
        check(tag + ': no repite la pregunta respondida con «No lo sé»', 'Cuando dices que la información está dispersa' not in ask and 'qué información te faltaba' in ask, ask)
        check(tag + ': estado coherente con la pregunta', 'qué significa' in status, status)
    if variante == 'otrapersona':
        check(tag + ': hipótesis de esperar', 'Esperar información o acciones' in t and 'de quién depende' in t, '')
        check(tag + ': pregunta qué necesita de la otra persona', 'necesitas exactamente de esa persona' in ask, ask)
        check(tag + ': estado coherente', 'de la otra persona' in status, status)


def negocio_antiguo(q):
    """Respuestas de la versión anterior (sin los seguimientos nuevos): el informe no las inventa."""
    q.p.goto(URL)
    old = {'q1': ['ajena', 'propio', 'hobbies', 'descanso'], 'q2A': 'nunca', 'q2B': 'nunca', 'q2C': 'nunca', 'q2D': 'nunca', 'q2P': 'd35',
           'q2E': 'nunca', 'q2F': 'nunca', 'q2G': 'nunca', 'q3': ['P'], '1.q5': 'propio', '1.q6': 'ambitos', '1.q7': 'dispersa',
           '1.q8': ['ayuda', 'sinmetodo'], '1.q9': 'parte', '1.q9b': 'no', '1.q10b': ['ayuda', 'impide'], '1.q11': ['nolose'],
           'q12': ['ordenador', 'gratis'], 'qconfirm': 'si'}
    html = q.p.evaluate("""(old) => { const a = DC_APP.state().answers; Object.keys(old).forEach(k => DC.commit(a, k, old[k], {})); return DC_APP.exportHTML(); }""", old)
    rep = q.p.evaluate("() => DC.buildReport(DC_APP.state().answers)")
    m = rep['main']
    tag = 'Negocio (respuestas antiguas)'
    check(tag + ': propuesta provisional', m['status']['level'] == 'plausible', m['status'])
    check(tag + ': motivo y pregunta sobre la dispersión, coherentes', 'dispersa' in m['status']['reason'] and 'información está dispersa' in (m['question'] or ''), (m['status']['reason'], m['question']))
    check(tag + ': hipótesis reunir, decidir y esperar sin elegir', [c['label'] for c in (m['candidates'] or [])] == ['Reunir información', 'Decidir entre pendientes', 'Esperar información o acciones'], m['candidates'])
    check(tag + ': sin funciones inventadas', not m['firstTest'], m['firstTest'])
    check(tag + ': pendientes: qué ordena y la ayuda', any('ordenar' in x for x in m['pendingPoints']) and any('ayuda' in x for x in m['pendingPoints']), m['pendingPoints'])
    check(tag + ': formato no definitivo', m['format'] == 'Se decidirá después de una primera prueba', m['format'])
    check(tag + ': no declara contradicción', 'contradictorias' not in html, '')
    check(tag + ': sin gestor de tareas ni criterios impuestos', 'gestor de tareas' not in html.lower() and 'criterios sencillos' not in html, '')


def limpieza_negocio(q):
    negocio(q, 'reunir')
    q.p.click('[data-act=review]')
    q.p.click('[data-goto="1.q7"]')
    q.answer('Había demasiados pasos manuales o repetidos')
    keys = q.keys()
    check('Limpieza: cambiar el obstáculo quita sus seguimientos', '1.q7d' not in keys and '1.q7e' not in keys and '1.q6o' in keys and '1.q10d' in keys, keys)
    q.p.goto(URL)
    q.start()
    q.answer('Negocio propio o trabajo autónomo')
    q.freq(P='En 3–5 días')
    q.answer(SHORT['P']); q.answer('Negocio propio o trabajo autónomo'); q.answer('Ordenar varias cosas pendientes'); q.answer('Otra cosa')
    q.answer('La información estaba dispersa o era difícil de encontrar'); q.answer('Sé dónde está, pero tengo que reunirla para decidir')
    q.pick('Cuándo debe estar terminado'); q.pick('No lo sé')
    check('Exclusiva: «No lo sé» en criterios', not q.inp('Cuándo debe estar terminado').is_checked(), '')
    q.cont()
    q.answer('Pido ayuda a alguien'); q.pick('Solo resuelve una parte', 'No'); q.cont()
    q.answer('Necesito ayuda de alguien')
    q.pick('Tengo que esperar para avanzar'); q.pick('No lo sé')
    check('Exclusiva: «No lo sé» en ayuda', not q.inp('Tengo que esperar para avanzar').is_checked(), '')
    q.cont()
    q.back(); q.back()
    q.pick('Me cansa o me frustra'); q.inp('Necesito ayuda de alguien').uncheck(); q.cont()
    keys = q.keys()
    check('Limpieza: quitar «necesito ayuda» elimina su seguimiento', '1.q10d' not in keys and '1.q7e' in keys, keys)


def layout(browser):
    p = browser.new_page(viewport={'width': 1280, 'height': 900})
    q = Q(p); q.start(); q.answer('Estudios o formación')
    h = p.locator('main h1').bounding_box(); a = p.locator('.qhelp').bounding_box()
    check('Ordenador: ayuda en columna lateral', a['x'] > h['x'] + h['width'] - 5, (h, a))
    p.close()
    ctx = browser.new_context(viewport={'width': 375, 'height': 760}, is_mobile=True, has_touch=True)
    p = ctx.new_page(); q = Q(p); q.start(); q.answer('Estudios o formación')
    h = p.locator('main h1').bounding_box(); a = p.locator('.qhelp').bounding_box(); o = p.locator('.opt').first.bounding_box()
    check('Móvil: ayuda debajo de la pregunta y antes de las opciones', h['y'] < a['y'] < o['y'], (h, a, o))
    over = []
    for v in ['En 1–2 días'] + ['Nunca'] * 7:
        w = p.evaluate('document.documentElement.scrollWidth - window.innerWidth')
        if w > 0: over.append((q.title(), w))
        q.answer(v)
    check('Móvil: sin desplazamiento horizontal', not over, over)
    ctx.close()


def teclado(browser):
    p = browser.new_page()
    p.goto(URL)
    p.keyboard.press('Tab'); p.keyboard.press('Tab')
    check('Teclado: foco en «Empezar»', p.evaluate('document.activeElement.textContent') == 'Empezar', '')
    p.keyboard.press('Enter')
    check('Teclado: foco en el título', p.evaluate('document.activeElement.tagName') == 'H1', '')
    p.keyboard.press('Tab'); p.keyboard.press('Space')
    check('Teclado: espacio marca la opción', p.evaluate("document.querySelector('#opt-q1-estudios').checked"), '')
    check('Teclado: foco visible', p.evaluate("getComputedStyle(document.activeElement.closest('label')).outlineStyle") != 'none', '')
    p.keyboard.press('Enter')
    check('Teclado: Enter continúa', 'cuántos días' in p.inner_text('main'), '')
    p.close()


def exportar_imprimir(browser):
    ctx = browser.new_context(accept_downloads=True)
    p = ctx.new_page(); q = Q(p)
    q.start(); q.answer('Descanso y ocio'); q.freq(); q.answer('No hay nada que quiera explorar ahora'); q.cont()
    with p.expect_download() as dl:
        p.click('[data-act=download]')
    html = open(dl.value.path(), encoding='utf-8').read()
    check('Descarga: HTML legible con estado y botón de imprimir', dl.value.suggested_filename.endswith('.html') and 'en lo explorado' in html and 'Imprimir / guardar como PDF' in html, dl.value.suggested_filename)
    p.evaluate('window.__printed=false; window.print=function(){window.__printed=true}')
    p.click('[data-act=print]')
    check('Imprimir: abre el diálogo en página independiente', p.evaluate('window.__printed'), '')
    p.emulate_media(media='print')
    check('Imprimir: oculta botones', not p.locator('.actions').is_visible(), '')
    p.emulate_media(media='screen')
    p.click('[data-act=reset]'); p.click('[data-act=reset-yes]')
    check('Empezar de nuevo: borra respuestas', p.evaluate('Object.keys(DC_APP.state().answers).length') == 0, '')
    ctx.close()
    p = browser.new_page()
    wrapper = os.path.join(ROOT, 'dist', '_marco_prueba.html')
    open(wrapper, 'w').write('<iframe id="f" src="dinerocorp-cuestionario-standalone.html" style="width:800px;height:900px"></iframe>')
    p.goto('file://' + wrapper)
    p.frame_locator('#f').locator('text=Empezar').click()
    q = Q(p.frames[1])
    q.answer('Descanso y ocio'); q.freq(); q.answer('No hay nada que quiera explorar ahora'); q.cont()
    q.p.click('[data-act=print]')
    check('Imprimir en marco: explica la alternativa', 'no se puede abrir el diálogo de impresión' in q.p.inner_text('main'), '')
    p.close(); os.remove(wrapper)


def main():
    page_tests = [ruta_varias, ruta_consecuencias, ruta_empate, ruta_aprendizaje,
                  lambda q: ruta_estudiante(q, False), lambda q: ruta_estudiante(q, True),
                  ruta_energia_grande, ruta_energia_sin, ruta_metodo_ok, ruta_sin_necesidad,
                  ruta_sin_necesidad_comentario, ruta_otra_vacia, ruta_cambio_situacion, ruta_cambios,
                  lambda q: universitaria(q, True), lambda q: universitaria(q, False), lambda q: universitaria(q, False, True),
                  mejora_suficiente, limpieza_aclaraciones,
                  lambda q: negocio(q, 'reunir'), lambda q: negocio(q, 'colabora'), lambda q: negocio(q, 'nolose'), lambda q: negocio(q, 'otrapersona'),
                  negocio_antiguo, limpieza_negocio]
    names = ['varias', 'consecuencias', 'empate', 'aprendizaje', 'estudiante-pendiente', 'estudiante-explora',
             'energía-grande', 'energía-sin', 'método-ok', 'sin-necesidad', 'sin-necesidad-comentario', 'otra-vacía',
             'cambio-situación', 'cambios', 'universitaria-completa', 'universitaria-pendiente', 'universitaria-describe',
             'mejora-suficiente', 'limpieza-aclaraciones', 'negocio-reunir', 'negocio-colabora', 'negocio-nolose', 'negocio-otrapersona',
             'negocio-antiguo', 'limpieza-negocio']
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for name, fn in zip(names, page_tests):
            page = browser.new_page(viewport={'width': 1280, 'height': 900})
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            try:
                fn(Q(page))
            except Exception as e:
                check(name + ' (sin excepción)', False, repr(e))
            check(name + ': sin errores de JavaScript', not errs, errs)
            page.close()
        for fn in [layout, teclado, exportar_imprimir]:
            try:
                fn(browser)
            except Exception as e:
                check(fn.__name__ + ' (sin excepción)', False, repr(e))
        browser.close()
    bad = [r for r in RESULTS if not r[1]]
    print('\n%d comprobaciones, %d fallos' % (len(RESULTS), len(bad)))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
