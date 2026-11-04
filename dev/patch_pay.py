#!/usr/bin/env python3
"""Касса: раздел «Платежи» — постоянные и разовые платежи, долги. Применять после patch_fm.py."""
import sys, io, os
SRC = sys.argv[1]
D = os.path.dirname(os.path.abspath(__file__)) + '/pay/'
h = io.open(SRC, encoding="utf-8").read()
def rep(old, new, cnt=1):
    global h
    n = h.count(old); assert n == cnt, (old[:90], n); h = h.replace(old, new)

# --- вкладка после «Отчёта р/с»
rep('data-tab="report" aria-selected="false">Отчёт р/с</button>',
    'data-tab="report" aria-selected="false">Отчёт р/с</button>\n    <button type="button" role="tab" class="tab" data-tab="pay" aria-selected="false">Платежи</button>')
rep('const PAGES=["home","kassa","report","sales","recon",', 'const PAGES=["home","kassa","report","pay","sales","recon",')
rep('const EXTRA=["recon",', 'const EXTRA=["pay","recon",')
rep('const LBL={recon:"Сверка",', 'const LBL={pay:"Платежи",recon:"Сверка",')
RC = "    recon:'<path d=\"M4 7h11M4 12h7M4 17h9\"/><path d=\"m14 15 2.5 2.5L21 13\"/>',\n    more:"
rep(RC, "    pay:'<rect x=\"3.5\" y=\"5\" width=\"17\" height=\"15.5\" rx=\"2.5\"/><path d=\"M3.5 9.5h17M8 3v4M16 3v4\"/><path d=\"m9 14.6 2 2 4-4\"/>',\n" + RC)
# на телефоне — в листе «Ещё»
rep('.tabs .tab[data-tab="analytics"],.tabs .tab[data-tab="plan"]', '.tabs .tab[data-tab="pay"],.tabs .tab[data-tab="analytics"],.tabs .tab[data-tab="plan"]')

PAGE = '''  <div class="page" id="page-pay" hidden>
    <header class="head">
      <div>
        <div class="eyebrow">Saif-Optics · обязательные платежи</div>
        <h1>Платежи</h1>
        <p>Кредит, аренда, налоги, зарплаты и долги — что уже оплачено и что впереди</p>
      </div>
      <div class="pay-hact"><button type="button" class="sec" id="payXlsx">Выгрузить Excel</button><button type="button" id="payAdd">＋ Добавить платёж</button></div>
    </header>
    <div id="payBody" class="stack"></div>
  </div>
'''
rep('  <div class="page" id="page-analytics" hidden>', PAGE + '  <div class="page" id="page-analytics" hidden>')
rep('    if(tab==="recon"){', '    if(tab==="pay"){window.__PAY&&window.__PAY.render();return}\n    if(tab==="recon"){')

css = io.open(D + 'pay.css', encoding='utf-8').read(); js = io.open(D + 'pay.js', encoding='utf-8').read()
rep('</style>', css + '</style>')
rep('<div id="mApp" aria-label="Касса — мобильная версия"></div>', '<script>\n' + js + '\n</script>\n<div id="mApp" aria-label="Касса — мобильная версия"></div>')
io.open(SRC, "w", encoding="utf-8").write(h); print("ok")
