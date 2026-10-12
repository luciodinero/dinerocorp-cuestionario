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

`DC.buildReport(respuestas)` en `src/report.js` devuelve un objeto con las seis secciones. La interfaz solo lo pinta. Para ampliarlo (por ejemplo, con un modelo de lenguaje) basta con sustituir o complementar esa función manteniendo la misma forma del objeto.

Reglas principales (ver `decide()`):

1. Método actual que funciona y sin consecuencias relevantes → no se propone nada.
2. Sin consecuencias relevantes → no se propone nada, aunque la situación sea frecuente.
3. Prefiere continuar como ahora → no se propone herramienta.
4. Tarea y obstáculo sin concretar → pedir más información.
5. Falta de tiempo, recursos o energía → cambio de proceso; solo contribución tecnológica limitada si otras respuestas la respaldan.
6. Depende de otras personas → registro compartido limitado (coordinación) o cambio de proceso.
7. Resto → propuesta del catálogo; formato según método actual, condiciones de uso y mantenimiento. Las integraciones siempre quedan como pendientes de comprobar.

### Contradicciones detectadas (aclaración opcional antes del informe)

- Método «funciona bien» + suele posponerla o provoca errores, plazos perdidos o impide una actividad.
- La situación se marcó con consecuencias en la pregunta 3, pero luego «Ninguna relevante».
- «Prefiero continuar como ahora» + consecuencias como errores, gasto, plazos perdidos o actividad impedida.

## Pruebas

```
pip install playwright && python3 -m playwright install chromium
python3 build.py && python3 tests/test_rutas.py
```

Cubren: varias dificultades, empate de frecuencia, una sola dificultad, ruta sin dificultades con actividad deseada, ruta sin necesidad, sin consecuencias, método actual satisfactorio, obstáculo que el software no resuelve, «Otra» sin texto, cambios de respuesta y limpieza de ramificaciones, máximos y opciones excluyentes, móvil (375 px), teclado, descarga, impresión y escapado de texto libre.

Estas pruebas comprueban que la lógica funciona; **no** sustituyen la prueba con usuarios.

## Limitaciones conocidas

- Dentro de la vista de artifact de claude.ai no se puede abrir el diálogo de impresión: la app lo explica y remite a descargar el informe, que incluye su propio botón de imprimir / guardar como PDF.
- La duración de 5–10 minutos es un objetivo sin medir.
- El catálogo de propuestas es limitado y conservador por diseño.
