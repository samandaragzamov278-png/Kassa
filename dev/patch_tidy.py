#!/usr/bin/env python3
"""Касса: убрать «Инструкцию», пометить «Сверку» и «Склад» как «в доработке», показ больших таблиц по 10–50 строк.
Применять последним (после patch_ui.py)."""
import sys, io, os
SRC = sys.argv[1]
D = os.path.dirname(os.path.abspath(__file__)) + '/tidy/'
h = io.open(SRC, encoding="utf-8").read()
def rep(old, new, cnt=1):
    global h
    n = h.count(old); assert n == cnt, (old[:90], n); h = h.replace(old, new)

# --- «Инструкция» больше не нужна: вкладка, кнопка на Главной, переходы
rep('    <button type="button" role="tab" class="tab" data-tab="help" aria-selected="false">Инструкция</button>\n', '')
rep('        <button type="button" class="sec" data-go="help">Инструкция</button>\n', '')
rep('"lens","batch","help"]', '"lens","batch"]', 2)   # PAGES и лист «Ещё»
rep(',.tabs .tab[data-tab="help"]{', '{')
# страница «Инструкция» — последняя: закрывается «  </div>» перед закрытием общей обёртки
i = h.index('  <div class="page" id="page-help" hidden>'); j = h.index('\n  </div>\n</div>\n', i)
assert h.find('<div class="page"', i + 10, j) < 0; h = h[:i] + h[j + len('\n  </div>\n'):]

# --- «Сверка» и «Склад» — в доработке до инвентаризации Премиума и Яшнабада
WIP = ('<div class="wip"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5l3 2"/></svg>'
       '<div><b>Раздел в доработке</b><span>{t}</span></div></div>\n')
rep('    <div id="fmRcView"></div>',
    '    ' + WIP.format(t='Полностью заработает после инвентаризации Премиума и Яшнабада. Сейчас сверяются только Сергели и C1 — их продажи приходят из Billz.') + '    <div id="fmRcView"></div>')
i = h.index('<div class="page" id="page-batch" hidden>'); j = h.index('</header>', i) + len('</header>')
h = h[:j] + '\n    ' + WIP.format(t='Полностью заработает после инвентаризации Премиума и Яшнабада. Сейчас считаются остатки Склада, Сергели и C1.') + h[j:]

css = io.open(D + 'tidy.css', encoding='utf-8').read(); js = io.open(D + 'tidy.js', encoding='utf-8').read()
rep('</style>', css + '</style>')
rep('<div id="mApp" aria-label="Касса — мобильная версия"></div>', '<script>\n' + js + '\n</script>\n<div id="mApp" aria-label="Касса — мобильная версия"></div>')
io.open(SRC, "w", encoding="utf-8").write(h); print("ok")
