"""Pruebas de rutas del cuestionario con Playwright (Chromium sin interfaz).
Uso:  python3 build.py && python3 tests/test_rutas.py
"""
import os, re, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist', 'dinerocorp-cuestionario-standalone.html')
RESULTS = []


def check(name, cond, detail=''):
    RESULTS.append((name, bool(cond), detail))
    print(('OK   ' if cond else 'FALLO') + ' ' + name + ('' if cond else '  → ' + str(detail)[:300]))


class Q:
    def __init__(self, page):
        self.p = page

    def start(self):
        self.p.goto(URL)
        self.p.click('text=Empezar')

    def inp(self, text):
        rx = re.compile('^' + re.escape(text) + r'\s*(Si la marcas.*)?$')
        loc = self.p.get_by_role('radio', name=rx)
        if loc.count() == 0:
            loc = self.p.get_by_role('checkbox', name=rx)
        if loc.count() == 0:
            raise AssertionError('Opción no encontrada: ' + text + ' en ' + self.title())
        return loc.first

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

    def scale(self, a, b, c, d, e, f):
        for v in (a, b, c, d, e, f):
            self.answer(v)


def ruta_varias(q):
    q.start()
    q.answer('Trabajo por cuenta ajena', 'Hobbies o proyectos personales')
    q.scale('En 3–5 días', 'En 1–2 días', 'En 6 días o más', 'Nunca', 'No me aplica', 'No lo recuerdo')
    t = q.text()
    check('Varias: q3 solo muestra situaciones ocurridas', 'Buscar en varios sitios' in t and 'Repetir pasos' in t and 'No saber bien qué tenía pendiente' not in t, t)
    q.answer('Buscar en varios sitios la información que necesitaba', 'Necesitar muchos mensajes para coordinarme con otras personas')
    check('Varias: aparece la pregunta 4', 'exploremos' in q.title(), q.title())
    q.answer('No tengo preferencia')
    t = q.text()
    check('Varias: sin preferencia elige la más frecuente y lo explica', 'ocurre con más frecuencia' in t and 'coordinarme' in t, t)
    check('Varias: ámbito muestra contextos de la pregunta 1', 'Trabajo por cuenta ajena' in t and 'En varios ámbitos' in t and 'Estudios o formación' not in t, t)
    q.answer('Trabajo por cuenta ajena')
    q.answer('Consultar acuerdos o el estado de una actividad')
    q.answer('La información estaba dispersa o era difícil de encontrar')
    q.answer('Con mensajes o correos', 'Con notas, papel o de memoria')
    q.answer('Consigo resolverlo, pero requiere más esfuerzo del que quisiera')
    q.answer('Varias veces por semana')
    q.answer('Me ocupa tiempo que quería dedicar a otra cosa', 'Provoca errores o que tenga que rehacer cosas')
    check('Varias: pregunta de tiempo tras marcar pérdida de tiempo', 'cuánto tiempo' in q.title(), q.title())
    q.answer('Entre 5 y 15 minutos')
    q.pick('Repartida entre varias aplicaciones, archivos o mensajes', 'Podría dedicarle unos minutos si me compensa')
    q.cont()
    q.answer('Funcionar desde el móvil', 'Funcionar desde el ordenador', 'Permitir revisar y confirmar lo que hace')
    q.p.fill('textarea', 'Los acuerdos se pierden en el grupo <img src=x onerror=alert(1)>')
    q.cont()
    t = q.text()
    check('Varias: informe con las seis secciones', all(s in t for s in ['Lo que hemos identificado', 'Una posible ayuda', 'Primera versión', 'Qué necesitamos comprobar', 'Cómo sabríamos si ayuda', 'Solidez de la propuesta']), t[:500])
    check('Varias: propuesta concreta de coordinación', 'reúna los acuerdos y pendientes' in t, t)
    check('Varias: distingue hechos e inferencias', 'HAS INDICADO' in t.upper() and 'ESTO SUGIERE' in t.upper(), '')
    check('Varias: solidez suficiente', 'Hay información suficiente para proponer una primera prueba' in t, t[-800:])
    check('Varias: integración pendiente, sin darla por hecha', 'No damos por hecho que se pueda conectar' in t, '')
    check('Varias: máximo tres funciones', q.p.locator('.features li').count() <= 3, q.p.locator('.features li').count())
    check('Varias: sin porcentajes', not re.search(r'\d+\s?%', t), re.findall(r'\d+\s?%', t))
    html = q.p.evaluate('DC_APP.exportHTML()')
    check('Exportación: incluye propuesta y respuestas', 'Tus respuestas' in html and 'reúna los acuerdos' in html and 'Trabajo por cuenta ajena' in html, '')
    check('Exportación: texto libre escapado', '<img src=x' not in html and '&lt;img src=x' in html, '')
    check('Informe: texto libre no se interpreta como HTML', q.p.locator('main img').count() == 0, '')


def ruta_empate(q):
    q.start()
    q.answer('Estudios o formación')
    q.scale('En 3–5 días', 'En 3–5 días', 'Nunca', 'Nunca', 'Nunca', 'Nunca')
    q.answer('Buscar en varios sitios la información que necesitaba', 'Repetir pasos o introducir los mismos datos en varios sitios')
    q.answer('No tengo preferencia')
    check('Empate: pide elegir en lugar de inventar prioridad', 'misma frecuencia' in q.title(), q.title())


def ruta_una(q):
    q.start()
    q.answer('Negocio propio o trabajo autónomo')
    q.scale('Nunca', 'En 6 días o más', 'Nunca', 'Nunca', 'Nunca', 'Nunca')
    q.answer('Repetir pasos o introducir los mismos datos en varios sitios')
    check('Una: salta la pregunta 4', 'ámbito' in q.title(), q.title())
    q.answer('Negocio propio o trabajo autónomo')
    q.answer('Preparar mensajes o documentos parecidos')
    q.answer('Había demasiados pasos manuales o repetidos')
    q.answer('Con una hoja de cálculo o un documento')
    q.answer('Solo resuelve una parte')
    q.answer('Casi todos los días')
    q.answer('Me genera cansancio o frustración')
    check('Una: sin pregunta de tiempo si no marcó pérdida de tiempo', 'cuánto tiempo' not in q.title(), q.title())
    q.pick('Tendría que introducirla yo', 'Solo introduciría unos pocos datos de vez en cuando'); q.cont()
    q.answer('Funcionar desde el ordenador')
    q.cont()
    t = q.text()
    check('Una: propone plantillas', 'Plantillas de mensajes' in t, t)
    check('Una: formato web sencilla', 'Una web sencilla' in t, t)


def ruta_actividad(q):
    q.start()
    q.answer('Hobbies o proyectos personales')
    q.scale('Nunca', 'Nunca', 'No me aplica', 'Nunca', 'Nunca', 'Nunca')
    check('Actividad: sin situaciones va a la ruta alternativa', 'último mes' in q.title(), q.title())
    q.answer('Aprender o practicar algo')
    q.answer('Hobbies o proyectos personales')
    check('Actividad: tarea preseleccionada desde la actividad', q.inp('Aprender o practicar algo').is_checked(), '')
    q.cont()
    q.answer('No estaba claro cómo hacerlo o por dónde empezar')
    q.answer('Todavía no he intentado resolverla')
    check('Actividad: omite pregunta 9 si no lo ha intentado', 'frecuencia' in q.title(), q.title())
    q.answer('Varias veces al mes')
    q.answer('Impide que haga una actividad que me importa')
    q.pick('La tarea no requiere información guardada', 'Podría dedicarle unos minutos si me compensa'); q.cont()
    q.answer('Funcionar desde el móvil')
    q.cont()
    t = q.text()
    check('Actividad: propuesta de plan de práctica', 'plan de práctica' in t, t)
    check('Actividad: registra que no hay solución actual', 'todavía no has intentado' in t, t)


def ruta_ninguna(q):
    q.start()
    q.answer('Descanso y ocio')
    q.scale('Nunca', 'Nunca', 'Nunca', 'Nunca', 'Nunca', 'Nunca')
    q.answer('No hay nada que quiera explorar ahora')
    t = q.text()
    check('Ninguna: informe breve sin aplicación ficticia', 'No se ha identificado una oportunidad tecnológica clara' in t and 'No proponemos ninguna herramienta' in t, t)
    check('Ninguna: sin funciones propuestas', q.p.locator('.features li').count() == 0, '')


def ruta_sin_consecuencias(q):
    q.start()
    q.answer('Estudios o formación')
    q.scale('En 1–2 días', 'Nunca', 'Nunca', 'Nunca', 'Nunca', 'Nunca')
    q.answer('Ninguna tuvo consecuencias relevantes')
    check('Sin consecuencias: no fuerza un problema, va a ruta alternativa', 'último mes' in q.title(), q.title())


def ruta_metodo_ok(q):
    q.start()
    q.answer('Hogar o cuidados')
    q.scale('Nunca', 'Nunca', 'Nunca', 'En 3–5 días', 'Nunca', 'Nunca')
    q.answer('No saber bien qué tenía pendiente o por dónde empezar')
    q.answer('Hogar o cuidados')
    q.answer('Recordar fechas o compromisos')
    q.answer('La información estaba dispersa o era difícil de encontrar')
    q.answer('Con una aplicación o web específica')
    q.answer('Me funciona bien y requiere poco esfuerzo')
    q.answer('Aproximadamente una vez por semana')
    q.answer('Ninguna relevante')
    q.pick('Principalmente en una aplicación o web', 'Podría dedicarle unos minutos si me compensa'); q.cont()
    q.answer('Funcionar desde el móvil')
    check('Método OK: aparece aclaración por contradicción', 'aclaración' in q.title(), q.title())
    q.cont()  # la aclaración es opcional
    q.cont()
    t = q.text()
    check('Método OK: indica que no hay oportunidad clara', 'No se ha identificado una oportunidad tecnológica clara' in t, t)
    check('Método OK: refleja contradicción sin corregirla', 'no las hemos corregido' in t or 'contradictorias' in t, t)


def ruta_no_software(q):
    q.start()
    q.answer('Hobbies o proyectos personales')
    q.scale('Nunca', 'Nunca', 'Nunca', 'Nunca', 'Nunca', 'En 6 días o más')
    q.answer('Posponer o dejar a medias una actividad en la que quería avanzar')
    q.answer('Hobbies o proyectos personales')
    q.answer('Crear o desarrollar un proyecto')
    q.answer('Me faltaban dinero, materiales u otros recursos')
    q.answer('Suelo posponerla o dejarla sin resolver')
    q.answer('A menudo no consigo terminarlo')
    q.answer('Varias veces por semana')
    q.answer('Impide que haga una actividad que me importa')
    q.pick('Tendría que introducirla yo', 'Necesitaría probarla para saberlo'); q.cont()
    q.answer('Ser gratuita o de coste bajo')
    q.cont()
    t = q.text()
    check('No software: no promete que una app lo resuelva', 'no resolverá la falta de dinero' in t, t)
    check('No software: formato cambio de proceso', 'Un cambio de proceso' in t, t)
    check('No software: sin funciones de app', q.p.locator('.features li').count() == 0, '')


def ruta_otra_vacia(q):
    q.start()
    q.answer('Otra actividad')
    q.scale('En 1–2 días', 'Nunca', 'Nunca', 'Nunca', 'Nunca', 'Nunca')
    q.answer('Buscar en varios sitios la información que necesitaba')
    q.answer('La otra actividad que mencionaste')
    q.pick('Otra tarea')
    check('Otra: aparece campo opcional de 180', q.p.locator('#txt-q6-otra').get_attribute('maxlength') == '180', '')
    q.cont()
    q.pick('Otro')
    q.cont()
    q.answer('Otra forma')
    q.answer('Depende de la ocasión')
    q.answer('No lo sé')
    q.answer('Me ocupa tiempo que quería dedicar a otra cosa')
    q.answer('No lo sé')
    q.pick('No lo sé', 'Necesitaría probarla para saberlo'); q.cont()
    q.answer('Necesitaría ver un ejemplo')
    q.cont()
    t = q.text()
    check('Otra vacía: conserva categoría y refleja falta de detalle', 'sin más detalle' in t or 'distinta de las propuestas' in t, t)
    check('Otra vacía: propuesta provisional', 'La propuesta es provisional' in t, t)
    check('Otra vacía: una sola pregunta específica', q.p.locator('.ask').count() == 1, '')


def ruta_cambios(q):
    p = q.p
    q.start()
    # Validación
    q.cont()
    check('Validación: error visible y textual', p.locator('.error:not([hidden])').count() == 1 and 'Falta una respuesta' in q.text(), '')
    q.answer('Trabajo por cuenta ajena')
    q.scale('En 3–5 días', 'En 1–2 días', 'Nunca', 'Nunca', 'Nunca', 'Nunca')
    # Exclusividad
    q.pick('Buscar en varios sitios la información que necesitaba')
    q.pick('Ninguna tuvo consecuencias relevantes')
    check('Exclusiva: "Ninguna" desmarca las demás', not q.inp('Buscar en varios sitios la información que necesitaba').is_checked(), '')
    q.pick('Buscar en varios sitios la información que necesitaba')
    check('Exclusiva: marcar otra desmarca "Ninguna"', not q.inp('Ninguna tuvo consecuencias relevantes').is_checked(), '')
    q.cont()
    q.answer('Trabajo por cuenta ajena')
    q.answer('Encontrar un archivo, una nota o un mensaje')
    q.answer('La información estaba dispersa o era difícil de encontrar')
    # Máximo 3
    q.pick('Con una aplicación o web específica', 'Con notas, papel o de memoria', 'Con mensajes o correos')
    check('Máximo: cuarta opción deshabilitada', q.inp('Con una hoja de cálculo o un documento').is_disabled(), '')
    q.cont()
    q.back()
    check('Atrás: conserva respuestas', q.inp('Con mensajes o correos').is_checked(), '')
    q.cont()
    q.answer('Solo resuelve una parte')
    q.answer('Varias veces por semana')
    q.answer('Me genera cansancio o frustración')
    q.pick('Repartida entre varias aplicaciones, archivos o mensajes', 'Podría dedicarle unos minutos si me compensa'); q.cont()
    q.answer('Funcionar desde el ordenador')
    q.cont()
    check('Cambios: llega al informe', 'Lo que hemos identificado' in q.text(), '')
    # Revisar y cambiar una respuesta que determina la ramificación
    p.click('[data-act=review]')
    p.click('[data-goto=q2A]')
    q.answer('Nunca')
    t = q.text()
    check('Cambios: avisa de respuestas eliminadas', 'Hemos quitado' in t, t)
    st = p.evaluate('Object.keys(DC_APP.state().answers)')
    check('Cambios: elimina respuestas posteriores no aplicables', 'q3' not in st and 'q6' not in st and 'q7' not in st, st)
    # Volver a ruta y comprobar progreso coherente
    pt = p.inner_text('#progress-text')
    check('Progreso: indicador visible y textual', re.match(r'Pantalla \d+ de \d+', pt) is not None, pt)


def ruta_movil_teclado(browser):
    ctx = browser.new_context(viewport={'width': 375, 'height': 740}, is_mobile=True, has_touch=True)
    p = ctx.new_page()
    q = Q(p)
    q.start()
    overflow = []
    def ov():
        w = p.evaluate('document.documentElement.scrollWidth - window.innerWidth')
        if w > 0: overflow.append((q.title(), w))
    ov(); q.answer('Estudios o formación'); ov()
    for i in range(6): ov(); q.answer('En 1–2 días' if i == 0 else 'Nunca')
    ov()
    check('Móvil: sin desplazamiento horizontal', not overflow, overflow)
    ctx.close()

    p = browser.new_page()
    p.goto(URL)
    p.keyboard.press('Tab')  # enlace "Saltar"
    p.keyboard.press('Tab')
    check('Teclado: foco llega al botón Empezar', p.evaluate('document.activeElement.textContent') == 'Empezar', p.evaluate('document.activeElement.outerHTML'))
    p.keyboard.press('Enter')
    check('Teclado: foco en el título de la pregunta', p.evaluate('document.activeElement.tagName') == 'H1', '')
    p.keyboard.press('Tab')
    p.keyboard.press('Space')
    checked = p.evaluate("document.querySelector('#opt-q1-estudios').checked")
    check('Teclado: espacio marca la opción enfocada', checked, '')
    focus_ok = p.evaluate("getComputedStyle(document.activeElement.closest('label')).outlineStyle")
    check('Teclado: foco visible en la opción', focus_ok != 'none', focus_ok)
    p.keyboard.press('Enter')
    check('Teclado: Enter continúa', 'en cuántos días' in p.inner_text('main'), p.inner_text('main')[:200])
    p.close()


def exportar_imprimir(browser):
    ctx = browser.new_context(accept_downloads=True)
    p = ctx.new_page()
    q = Q(p)
    q.start()
    q.answer('Descanso y ocio')
    q.scale('Nunca', 'Nunca', 'Nunca', 'Nunca', 'Nunca', 'Nunca')
    q.answer('No hay nada que quiera explorar ahora')
    with p.expect_download() as dl:
        p.click('[data-act=download]')
    path = dl.value.path()
    html = open(path, encoding='utf-8').read()
    check('Descarga: archivo HTML legible con el informe', dl.value.suggested_filename.endswith('.html') and 'Solidez de la propuesta' in html and 'Imprimir / guardar como PDF' in html, dl.value.suggested_filename)
    p.evaluate('window.__printed = false; window.print = function(){ window.__printed = true; }')
    p.click('[data-act=print]')
    check('Imprimir: abre el diálogo en página independiente', p.evaluate('window.__printed'), '')
    p.emulate_media(media='print')
    check('Imprimir: oculta botones en la vista de impresión', not p.locator('.actions').is_visible(), '')
    p.emulate_media(media='screen')
    p.click('[data-act=reset]')
    p.click('[data-act=reset-yes]')
    check('Empezar de nuevo: borra respuestas', p.evaluate('Object.keys(DC_APP.state().answers).length') == 0, '')
    ctx.close()
    # Dentro de un marco (como en la vista de artifact) imprimir no es posible: debe explicarlo
    p = browser.new_page()
    wrapper = os.path.join(ROOT, 'dist', '_marco_prueba.html')
    open(wrapper, 'w').write('<iframe id="f" src="dinerocorp-cuestionario-standalone.html" style="width:800px;height:900px"></iframe>')
    p.goto('file://' + wrapper)
    f = p.frame_locator('#f')
    f.locator('text=Empezar').click()
    fr = p.frames[1]
    q = Q(fr)
    q.p = fr
    q.answer('Descanso y ocio')
    q.scale('Nunca', 'Nunca', 'Nunca', 'Nunca', 'Nunca', 'Nunca')
    q.answer('No hay nada que quiera explorar ahora')
    fr.click('[data-act=print]')
    check('Imprimir en marco: explica la alternativa', 'no se puede abrir el diálogo de impresión' in fr.inner_text('main'), '')
    p.close()
    os.remove(wrapper)


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for fn in [ruta_varias, ruta_empate, ruta_una, ruta_actividad, ruta_ninguna, ruta_sin_consecuencias,
                   ruta_metodo_ok, ruta_no_software, ruta_otra_vacia, ruta_cambios]:
            page = browser.new_page()
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            try:
                fn(Q(page))
            except Exception as e:
                check(fn.__name__ + ' (sin excepción)', False, repr(e))
            check(fn.__name__ + ': sin errores de JavaScript', not errs, errs)
            page.close()
        for fn in [ruta_movil_teclado, exportar_imprimir]:
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
