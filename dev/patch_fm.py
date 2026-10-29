#!/usr/bin/env python3
"""Касса: «Фискальные модули» в «Отчёте р/с» и сверка с ними в «Сверке». Применять после patch_rs.py."""
import sys, io, os
SRC = sys.argv[1]
D = os.path.dirname(os.path.abspath(__file__)) + '/fm/'
h = io.open(SRC, encoding="utf-8").read()
def rep(old, new, cnt=1):
    global h
    n = h.count(old); assert n == cnt, (old[:90], n); h = h.replace(old, new)

# --- «Отчёт р/с»: переключатель видов, кнопки и место под фискальные модули
rep('<button type="button" id="rsAdd">＋ Внести выписку за день</button></div>',
    '<button type="button" id="rsAdd">＋ Внести выписку за день</button><button type="button" class="sec" id="fmImport" hidden>Загрузить отчёт Rahmat</button><button type="button" id="fmAdd" hidden>＋ Внести гросс за день</button><input type="file" id="fmFile" accept=".xlsx,.xls" hidden></div>')
rep('<div class="seg big" role="group" aria-label="Месяц" id="rsSeg"></div>',
    '<div id="fmRsView"></div>\n    <div id="fmBody" class="stack" hidden></div>\n    <div class="seg big" role="group" aria-label="Месяц" id="rsSeg"></div>')
# --- «Сверка»: переключатель Billz / фискальные модули
rep('<button type="button" id="reconRefresh">Обновить из Billz</button></div>',
    '<button type="button" id="reconRefresh">Обновить из Billz</button><button type="button" class="sec" id="fmRcXlsx" hidden>Выгрузить Excel</button></div>')
rep('    <div class="bz-state" id="reconState"></div>',
    '    <div id="fmRcView"></div>\n    <div id="fmRecon" class="stack" hidden><section class="panel filterbar" id="fmRcCtl"></section><div id="fmRcBody" class="stack"></div></div>\n    <div class="bz-state" id="reconState"></div>')
# --- цвета точек для модуля
rep('rpExportAll:btn=>rpExport(rpAllDays(),btn,true)};', 'rpExportAll:btn=>rpExport(rpAllDays(),btn,true),pointColor:p=>pointColor(p)};')
css = io.open(D + 'fm.css', encoding='utf-8').read(); js = io.open(D + 'fm.js', encoding='utf-8').read()
rep('</style>', css + '</style>')
rep('<div id="mApp" aria-label="Касса — мобильная версия"></div>', '<script>\n' + js + '\n</script>\n<div id="mApp" aria-label="Касса — мобильная версия"></div>')
io.open(SRC, "w", encoding="utf-8").write(h); print("ok")
