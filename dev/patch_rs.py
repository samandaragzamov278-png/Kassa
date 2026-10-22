#!/usr/bin/env python3
"""Касса: раздел «Отчёт» → «Отчёт по расчётному счёту». Применять после patch_bz.py."""
import sys, io, os
SRC = sys.argv[1]
D = os.path.dirname(os.path.abspath(__file__)) + '/rs/'
h = io.open(SRC, encoding="utf-8").read()
def rep(old, new, cnt=1):
    global h
    n = h.count(old); assert n == cnt, (old[:90], n); h = h.replace(old, new)

i = h.index('<div class="page" id="page-report" hidden>')
a = h.index('<header class="head">', i); b = h.index('</header>', a) + len('</header>')
old_head = h[a:b]
dl_a = old_head.index('<div class="rp-dlbox" id="rpDlBox">'); dl_b = old_head.rindex('</div>') + 6
dlbox = old_head[dl_a:dl_b]
NEW = '''<header class="head">
      <div>
        <div class="eyebrow">Saif-Optics · расчётный счёт</div>
        <h1>Отчёт по расчётному счёту</h1>
        <p>Остаток, поступления и расходы со счёта — по дням и месяцам</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end"><button type="button" class="sec" id="rsXlsx">Выгрузить Excel</button><button type="button" id="rsAdd">＋ Внести выписку за день</button></div>
    </header>
    <div class="seg big" role="group" aria-label="Месяц" id="rsSeg"></div>
    <div id="rsBody" class="stack"></div>
    <section class="panel" id="rsOld" style="margin-top:16px">
      <div class="rs-oldh"><div><h2>Выписка за день и ежедневный отчёт оптика</h2><p class="note">Ввод остатков и расходов по р/с, выручка по точкам, гросс нал/безнал, расходы с Б/Ч и Excel «Отчёт оптика»</p></div><button type="button" class="sec rs-tg" id="rsOldTg" aria-expanded="false"><span>Развернуть</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg></button></div>
      <div id="rsOldBody" hidden>
      <div class="head" style="margin:0 0 12px;align-items:flex-start"><p id="rpPeriod" class="note"></p>''' + dlbox + '''</div>'''
h = h[:a] + NEW + h[b:]
rep('''<p class="note rp-foot">''', '''<p class="note rp-foot">''')
j = h.index('<p class="note rp-foot">'); k = h.index('</p>', j) + 4
h = h[:k] + '\n      </div>\n    </section>' + h[k:]
rep('const SKIP="#addPanel,','const SKIP="#rsOld,#addPanel,')
rep('data-tab="report" aria-selected="false">Отчёт</button>', 'data-tab="report" aria-selected="false">Отчёт р/с</button>')
rep('    if(tab==="report"){renderReport();return}', '    if(tab==="report"){renderReport();window.__RS&&window.__RS.render();return}')
rep('if(tab==="report")renderReport()},()=>{});', 'if(tab==="report"){renderReport();window.__RS&&window.__RS.render()}},()=>{});')
css = io.open(D + 'rs.css', encoding='utf-8').read(); js = io.open(D + 'rs.js', encoding='utf-8').read()
rep('</style>', css + '</style>')
rep('<div id="mApp" aria-label="Касса — мобильная версия"></div>', '<script>\n' + js + '\n</script>\n<div id="mApp" aria-label="Касса — мобильная версия"></div>')
io.open(SRC, "w", encoding="utf-8").write(h); print("ok")
