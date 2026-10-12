"""Genera dos versiones a partir de src/:
  index.html                 → página completa que carga src/*.css y src/*.js (para GitHub / uso local)
  dist/dinerocorp-cuestionario.html → archivo único autocontenido (para publicar o enviar)
Uso: python3 build.py
"""
from pathlib import Path
root = Path(__file__).parent
src = root / 'src'
JS = ['questions.js', 'flow.js', 'report.js', 'app.js']
FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&display=swap">'
TITLE = '<title>Cuestionario Dinerocorp</title>'
body = (src / 'body.html').read_text(encoding='utf-8')

index = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
         '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
         + TITLE + '\n' + FONTS + '\n<link rel="stylesheet" href="src/styles.css">\n</head>\n<body>\n'
         + body + '\n' + '\n'.join(f'<script src="src/{j}"></script>' for j in JS) + '\n</body>\n</html>\n')
(root / 'index.html').write_text(index, encoding='utf-8')

inline_js = '\n'.join(f'<script>\n{(src / j).read_text(encoding="utf-8")}\n</script>' for j in JS)
single = (TITLE + '\n' + FONTS + '\n<script>document.documentElement.lang="es";</script>\n<style>\n'
          + (src / 'styles.css').read_text(encoding='utf-8') + '\n</style>\n' + body + '\n' + inline_js + '\n')
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'dinerocorp-cuestionario.html').write_text(single, encoding='utf-8')
# Versión completa del archivo único, para abrir directamente en el navegador
(root / 'dist' / 'dinerocorp-cuestionario-standalone.html').write_text(
    '<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
    + single.replace('<script>document.documentElement.lang="es";</script>\n', '').replace(body, '</head><body>\n' + body, 1) + '</body></html>\n', encoding='utf-8')
print('ok')
