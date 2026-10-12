# Cuestionario Dinerocorp

Cuestionario exploratorio que ayuda a identificar si una persona podría beneficiarse de una aplicación, una web, una funcionalidad sencilla, un cambio de proceso o ninguna intervención. Genera un informe orientativo con reglas fijas, sin servicios externos ni inteligencia artificial.

> **Estado:** prototipo funcional **no validado**. Antes de usarlo con personas reales hay que probarlo con personas de distintos perfiles (edad, nivel digital, contextos de estudio, trabajo, hogar…) para comprobar que entienden las preguntas, que la duración real está entre 5 y 10 minutos y que los informes les resultan útiles. Ni el cuestionario ni el informe son un diagnóstico ni un instrumento validado científicamente.

## Cómo abrirlo

- **Sin instalar nada:** abre `index.html` (o `dist/dinerocorp-cuestionario-standalone.html`) en el navegador.
- **Archivo único:** `dist/dinerocorp-cuestionario-standalone.html` contiene todo (estilos y código) en un solo archivo, útil para enviarlo o alojarlo.
- **Alojamiento:** cualquier hosting estático sirve (por ejemplo GitHub Pages apuntando a la raíz del repositorio). No necesita servidor.

Solo carga dos tipografías de Google Fonts; si no hay conexión, usa las tipografías del sistema.

## Privacidad

Las respuestas solo existen en la memoria de la página: no se envían a ningún servidor ni se guardan en el navegador. Al cerrar o recargar se pierden. El informe solo sale del navegador si la persona pulsa «Descargar informe». No se pide nombre, correo, edad, ingresos ni datos sensibles. El texto libre se trata siempre como datos (se muestra escapado, nunca se ejecuta).

## Dónde modificar cosas

| Quiero cambiar… | Archivo |
|---|---|
| Textos, opciones, máximos, opciones excluyentes, campos de texto | `src/questions.js` |
| Orden de pantallas, ramificación, limpieza de respuestas, reglas de contradicción | `src/flow.js` |
| Propuestas por situación y tarea, formatos, solidez, comprobaciones | `src/report.js` (`CATALOG`, `MEASURES`, `decide()`) |
| Interfaz, navegación, exportación e impresión | `src/app.js` |
| Diseño | `src/styles.css` |

Después de editar, ejecuta `python3 build.py` para regenerar `index.html` y los archivos de `dist/`.

### Generación del informe

`DC.buildReport(respuestas)` en `src/report.js` devuelve el informe de la situación explorada (y un resumen de la anterior si se exploró una segunda), las situaciones pendientes y el comentario final. La interfaz solo lo pinta. Para ampliarlo (por ejemplo, con un modelo de lenguaje) basta con sustituir o complementar esa función manteniendo la forma del objeto.

Estados posibles: «Hay información suficiente para proponer una primera prueba», «Hay una necesidad, pero todavía no está bien descrita», «Hay una oportunidad plausible, pero faltan detalles», «No tenemos información suficiente», «La solución actual parece adecuada», «No se ha identificado una necesidad relevante en lo explorado». Ninguna conclusión se presenta como global: el informe indica que se refiere solo a lo explorado.

Reglas principales (`decide()`):

1. Método actual que funciona y sin consecuencias relevantes → «La solución actual parece adecuada».
2. Sin consecuencias relevantes → sin propuesta, aunque la situación sea frecuente.
3. Prefiere continuar como ahora → sin herramienta.
4. Tarea y obstáculo sin concretar → falta información.
5. Falta de energía o ganas → según el seguimiento: tarea demasiado grande (pasos claros), varias cosas (criterios de prioridad), siguiente paso poco claro (instrucciones concretas). Sin energía o sin interés, sin más datos → «No tenemos información suficiente para proponer una ayuda tecnológica para esta dificultad».
6. Falta de tiempo o recursos → cambio en la forma de hacerlo; contribución limitada solo si otras respuestas la respaldan.
7. Depende de otras personas → registro compartido limitado o cambio en la forma de hacerlo.
8. Resto → propuesta del catálogo. El acceso a materiales e integraciones queda siempre pendiente de comprobar.

### Rutas

- 8 situaciones de frecuencia (incluye recordar pendientes y elegir por dónde empezar por separado, y aprendizaje).
- Selección: si hay varias → qué explorar → si no hay preferencia, cuál tuvo más consecuencias → si tampoco, se propone la más frecuente como criterio provisional.
- Antes del informe: «¿La situación explorada representa lo que más te interesaría facilitar?». Si no, se puede explorar otra **una sola vez** sin repetir las preguntas generales (contexto, frecuencias, dificultades, condiciones de uso).
- Comentario final: si hay texto, se pregunta si describe la misma situación u otra, y qué incluye (dificultad, idea de solución). Si es otra, se clasifica con las categorías del cuestionario y se puede explorar (si queda la exploración adicional) o dejar como «Información adicional pendiente de explorar». El texto nunca se interpreta automáticamente.

### Seguimientos (solo se activan por su disparador)

| Seguimiento | Disparador |
|---|---|
| ¿Qué estabas intentando hacer? | Tarea «Aprender o practicar algo» |
| ¿Qué te ayudó? / ¿Queda algo por facilitar? / ¿Qué todavía? | «Sí, y me ha servido» / «Sí» o «Solo en algunas ocasiones» |
| ¿Qué tendría que permitirte hacer cómodamente? (voluntario) | Condición «Adaptarse a mis necesidades de accesibilidad» |
| ¿En qué notas esa consecuencia? (texto opcional) | Aclaración «Sí tiene consecuencias, pero no encajaban» |
| La última vez, ¿qué acabaste haciendo? | Energía o ganas con causa «No lo sé» u «Otra», y solo si no se ha activado ningún otro seguimiento en esa situación |

Las aclaraciones posteriores sustituyen a la respuesta inicial para la conclusión del informe. La respuesta inicial se conserva en «Revisar mis respuestas» y en la exportación («Respuesta inicial… Aclaración posterior…»). Estados de consecuencias: sin consecuencias relevantes, identificadas, relevantes sin describir, no está claro. Lo que se omite queda en «Otros puntos pendientes» del informe, y la pregunta pendiente nunca repite una pregunta ya respondida con «No lo sé».

### Contradicciones detectadas (aclaración opcional)

- Método «funciona bien» + suele posponerla o provoca errores, plazos perdidos o actividades sin hacer.
- La situación se marcó como dificultad en la pregunta de dificultades, pero luego «Ninguna relevante».
- «Prefiero continuar como ahora» + errores, gasto, plazos perdidos o actividades sin hacer.

## Pruebas

```
pip install playwright && python3 -m playwright install chromium
python3 build.py && python3 tests/test_rutas.py
```

Cubren: selección con varias dificultades (preferencia, consecuencias, frecuencia provisional y empate), aprendizaje, el caso de prueba de la estudiante (comentario pendiente y comentario explorado), energía con y sin descarte, método satisfactorio, ausencia de necesidad (con y sin comentario), «Otra» sin texto, cambio de situación y limpieza de respuestas, opciones excluyentes e incompatibles, máximos, ayuda lateral en ordenador y debajo en móvil, teclado, descarga, impresión y frases prohibidas.

Estas pruebas comprueban que la lógica funciona; **no** sustituyen la prueba con usuarios.

## Limitaciones conocidas

- Dentro de la vista de artifact de claude.ai no se puede abrir el diálogo de impresión: la app lo explica y remite a descargar el informe, que incluye su propio botón de imprimir / guardar como PDF.
- La duración de unos 10 minutos es un objetivo sin medir. Una ruta típica tiene 23–25 pantallas (8 de ellas de frecuencia, de un clic); una que active casi todos los seguimientos llega a unas 26.
- El catálogo de propuestas es limitado y conservador por diseño.
