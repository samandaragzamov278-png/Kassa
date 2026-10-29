# Делает зеркало встроенного JS из base.html для Graphify: строки совпадают с base.html
import re, pathlib
src = pathlib.Path(__file__).with_name('base.html').read_text(encoding='utf-8')
out, inside = [], False
for line in src.split('\n'):
    o = ''
    s = line
    while True:
        if not inside:
            m = re.search(r'<script(?![^>]*\bsrc=)[^>]*>', s, re.I)
            if not m: break
            inside, s = True, s[m.end():]
        else:
            m = re.search(r'</script>', s, re.I)
            if not m: o += s; break
            o += s[:m.start()]; inside, s = False, s[m.end():]
    out.append(o)
d = pathlib.Path(__file__).with_name('graph-src'); d.mkdir(exist_ok=True)
(d / 'base.html.js').write_text('\n'.join(out), encoding='utf-8')
