#!/usr/bin/env python3
"""Касса: раздел «Сверка», «Остатки Billz» и «Перемещения» в Складе. Применять после patch_billz.py."""
import sys, io
SRC = sys.argv[1]
D = ''+__import__('os').path.dirname(__import__('os').path.abspath(__file__))+'/bz/'
h = io.open(SRC, encoding="utf-8").read()

def rep(old, new, cnt=1):
    global h
    n = h.count(old)
    assert n == cnt, (old[:90], n)
    h = h.replace(old, new)

# --- вкладка
rep('<button type="button" role="tab" class="tab" data-tab="sales" aria-selected="false">Продажи</button>',
    '<button type="button" role="tab" class="tab" data-tab="sales" aria-selected="false">Продажи</button>\n    <button type="button" role="tab" class="tab" data-tab="recon" aria-selected="false">Сверка</button>')
rep('const PAGES=["home","kassa","report","sales","analytics","plan","lens","batch","help"];',
    'const PAGES=["home","kassa","report","sales","recon","analytics","plan","lens","batch","help"];')
rep('const EXTRA=["analytics","plan","lens","batch","help"];', 'const EXTRA=["recon","analytics","plan","lens","batch","help"];')
rep('const LBL={analytics:"Аналитика",', 'const LBL={recon:"Сверка",analytics:"Аналитика",')
rep("    help:'<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M9.6 9.4a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.1-2.4 3.6M12 17h.01\"/>',\n    more:",
    "    help:'<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M9.6 9.4a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.1-2.4 3.6M12 17h.01\"/>',\n    recon:'<path d=\"M4 7h11M4 12h7M4 17h9\"/><path d=\"m14 15 2.5 2.5L21 13\"/>',\n    more:")

# --- страница «Сверка» (перед «Аналитикой»)
PAGE = '''  <div class="page" id="page-recon" hidden>
    <header class="head">
      <div>
        <div class="eyebrow">Saif-Optics · Billz и Касса</div>
        <h1>Сверка</h1>
        <p>Что, когда и в каком количестве продано по Billz — и сходится ли это с Кассой</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end"><button type="button" class="sec" id="reconXlsx">Выгрузить Excel</button><button type="button" id="reconRefresh">Обновить из Billz</button></div>
    </header>
    <div class="bz-state" id="reconState"></div>
    <section class="panel filterbar" id="reconCtl"></section>
    <div id="reconBody" class="stack"></div>
    <section class="panel bz-panel" id="bzPanel" hidden></section>
  </div>
'''
rep('  <div class="page" id="page-analytics" hidden>', PAGE + '  <div class="page" id="page-analytics" hidden>')
# блок автозагрузки Сергели переезжает в «Сверку»
rep('      <section class="panel bz-panel" id="bzPanel" hidden></section>\n      <div class="stnote">', '      <div class="stnote">')

# --- склад: новые виды
rep('''      <button type="button" data-sv="margin" aria-pressed="true">Маржа</button>
      <button type="button" data-sv="stock" aria-pressed="false">Товары на складе</button>''',
'''      <button type="button" data-sv="bzst" aria-pressed="true">Остатки Billz</button>
      <button type="button" data-sv="bztr" aria-pressed="false">Перемещения</button>
      <button type="button" data-sv="margin" aria-pressed="false">Маржа</button>
      <button type="button" data-sv="stock" aria-pressed="false">Склад из файла</button>''')
rep('    <div id="stMargin" class="stack">',
'''    <div id="stBz" class="stack" hidden>
      <div class="bz-state"><span id="stBzState"></span><button type="button" class="sec bz-ref" data-bzref>Обновить из Billz</button></div>
      <section class="panel filterbar" id="stBzCtl"></section>
      <div id="stBzBody" class="stack"></div>
    </div>
    <div id="stTr" class="stack" hidden>
      <div class="bz-state"><span id="stTrState"></span><button type="button" class="sec bz-ref" data-bzref>Обновить из Billz</button></div>
      <section class="panel filterbar" id="stTrCtl"></section>
      <div id="stTrBody" class="stack"></div>
    </div>
    <div id="stMargin" class="stack" hidden>''')
rep('stView="margin", mSort=', 'stView="bzst", mSort=')
rep('''    $("stMargin").hidden=stView!=="margin";$("stList").hidden=stView!=="stock";$("stBatch").hidden=stView!=="batch";
    $("stXlsx").hidden=stView==="batch"||!dl;
    if(stView==="margin")renderMargin();else if(stView==="stock")renderStockList();else renderBatch();''',
'''    $("stMargin").hidden=stView!=="margin";$("stList").hidden=stView!=="stock";$("stBatch").hidden=stView!=="batch";$("stBz").hidden=stView!=="bzst";$("stTr").hidden=stView!=="bztr";
    $("stXlsx").hidden=stView==="batch"||!dl;
    if(stView==="bzst"||stView==="bztr"){window.__BZ&&window.__BZ.render(stView);return}
    if(stView==="margin")renderMargin();else if(stView==="stock")renderStockList();else renderBatch();''')
rep('''  $("stXlsx").onclick=()=>{
    const sub=periodTxt();''', '''  $("stXlsx").onclick=()=>{
    if(stView==="bzst"||stView==="bztr"){window.__BZ&&window.__BZ.xlsx(stView);return}
    const sub=periodTxt();''')

# --- renderAll / подписка / API
rep('    if(tab==="batch"){renderStockTab();return}\n    if(tab==="plan"){renderPlan();return}',
    '    if(tab==="recon"){renderBz();window.__BZ&&window.__BZ.render("recon");return}\n    if(tab==="batch"){renderStockTab();return}\n    if(tab==="plan"){renderPlan();return}')
rep('  let bzSync=null,bzBusy=false;', '  let bzSync=null,bzBusy=false,bzCollect=null;')
rep('    db.doc("sync/billz-sergeli").onSnapshot(',
    '    db.doc("sync/billz-collect").onSnapshot(s=>{const n=s.exists?s.data():null;const ch=!bzCollect||!n||n.at!==bzCollect.at;bzCollect=n;if(ch&&window.__BZ){window.__BZ.resetCache();if(tab==="recon"||(tab==="batch"&&(stView==="bzst"||stView==="bztr")))renderAll()}setTimeout(()=>document.dispatchEvent(new CustomEvent("sales-updated")),0)},()=>{});\n    db.doc("sync/billz-sergeli").onSnapshot(')
rep('bzSync:()=>bzSync,', 'bzSync:()=>bzSync,bzCollect:()=>bzCollect,')
# кнопки
rep('  function alertMsg(t){', '''  document.addEventListener("click",e=>{const b=e.target.closest("#reconRefresh,[data-bzref]");if(b&&window.__BZ)window.__BZ.refresh(b);const x=e.target.closest("#reconXlsx");if(x&&window.__BZ)window.__BZ.xlsx("recon")});
  function alertMsg(t){''')

css = io.open(D + 'bz.css', encoding='utf-8').read()
js = io.open(D + 'bz.js', encoding='utf-8').read()
rep('</style>', css + '</style>')
# скрипт данных Billz — перед мобильным приложением
rep('<div id="mApp" aria-label="Касса — мобильная версия"></div>', '<script>\n' + js + '\n</script>\n<div id="mApp" aria-label="Касса — мобильная версия"></div>')
io.open(SRC, "w", encoding="utf-8").write(h)
print("ok")
