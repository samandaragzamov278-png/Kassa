#!/usr/bin/env python3
"""Касса: блок «Billz · Сергели» (статус загрузки, сверка, кнопка), склад Сергели с даты снимка."""
import sys, io
SRC = sys.argv[1]
h = io.open(SRC, encoding="utf-8").read()

def rep(old, new, cnt=1):
    global h
    n = h.count(old)
    assert n == cnt, (old[:80], n)
    h = h.replace(old, new)

# 1. место под блок в «Товары на складе»
rep('<div id="stList" class="stack" hidden>\n      <div class="stnote">',
    '<div id="stList" class="stack" hidden>\n      <section class="panel bz-panel" id="bzPanel" hidden></section>\n      <div class="stnote">')

# 2. продажи Сергели вычитаются только после снимка Billz
rep('const meta=stockMeta();const m=new Map();if(!meta)return m;const mt=batchMatcher();const from=meta.soldFrom||meta.date;\n    sales.forEach(s=>{if(from&&s.date<from)return;const r=mt(s.product,unitPrice(s),s.point);if(r&&r.b===null)m.set(r.it,(m.get(r.it)||0)+(+s.qty||0))});',
    'const meta=stockMeta();const m=new Map();if(!meta)return m;const mt=batchMatcher();const from=meta.soldFrom||meta.date;const fPt=meta.soldFromPt||{},tPt=meta.soldFromTs||{};\n    sales.forEach(s=>{if(from&&s.date<from)return;const r=mt(s.product,unitPrice(s),s.point);if(!r||r.b!==null)return;const pt=r.it.pt;if(fPt[pt]&&(s.date<fPt[pt]||(s.date===fPt[pt]&&(+s.createdAt||0)<=(+tPt[pt]||0))))return;m.set(r.it,(m.get(r.it)||0)+(+s.qty||0))});')

# 3. логика блока
BZ = r'''
  // ===================== Billz · Сергели =====================
  let bzSync=null,bzBusy=false;
  const bzTime=ms=>ms?new Date(ms).toLocaleString("ru-RU",{timeZone:"Asia/Tashkent",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).replace(",",""):"—";
  function bzNext(){const n=new Date(Date.now()+5*3600e3);let d=new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate(),17));if(n>=d)d=new Date(d.getTime()+864e5);return d.toISOString().slice(8,10)+"."+d.toISOString().slice(5,7)+" в 17:00"}
  async function bzRun(){
    if(bzBusy)return {ok:false,error:"уже идёт"};bzBusy=true;renderBz();
    try{const r=await window.__sb.functions.invoke("billz-sync",{body:{}});bzBusy=false;renderBz();if(r.error)return {ok:false,error:String(r.error.message||r.error)};return r.data||{ok:true}}
    catch(e){bzBusy=false;renderBz();return {ok:false,error:String(e&&e.message||e)}}
  }
  function bzState(){
    const s=bzSync;if(!s)return {cls:"wait",t:"Ещё не запускалась"};
    const last=s.ok?s:s.lastOk;const today=new Date(Date.now()+5*3600e3).toISOString().slice(0,10);
    if(!s.ok)return {cls:"err",t:"Ошибка "+bzTime(s.at)+": "+(s.error||"")};
    const bad=(s.salesCheck||[]).filter(x=>!x.ok).length+((s.attention||[]).length);
    if(bad)return {cls:"warn",t:"Загружено "+bzTime(s.at)+" · есть расхождения"};
    return {cls:"ok",t:"Загружено "+bzTime(s.at)+(s.to===today?"":" (сегодня ещё не было)")};
  }
  function renderBz(){
    const el=$("bzPanel");if(!el)return;el.hidden=false;
    const s=bzSync, st=bzState(), last=s&&(s.ok?s:s.lastOk);
    const sc=(last&&last.salesCheck)||[], att=(last&&last.attention)||[], sk=(last&&last.stock)||null, sl=(last&&last.sales)||null;
    el.innerHTML=`<div class="head" style="margin-bottom:8px;align-items:center"><div><h2>Billz → Касса · Сергели</h2><p class="note">Каждый день в 17:00 сами загружаются чеки и остатки. Следующая загрузка: ${bzNext()}.</p></div>
      <button type="button" id="bzRunBtn" ${bzBusy?"disabled":""}>${bzBusy?"Загружаю…":"Обновить сейчас"}</button></div>
      <div class="bz-st ${st.cls}">${esc(st.t)}</div>
      ${last?`<div class="bz-grid">
        <div><b>Продажи</b><div class="note">${sl&&sl.checks?`добавлено ${sl.checks} ${pl(sl.checks,"чек","чека","чеков")} на ${fmt(sl.sum)} сум`:"новых чеков не было"}${sl&&sl.debts&&sl.debts.length?` · долги: ${sl.debts.map(d=>dShort(d.d)+" "+fmt(d.debt)).join(", ")}`:""}</div>
          <div class="tbl" style="margin-top:8px"><table><thead><tr><th>День</th><th class="r">Billz</th><th class="r">Касса</th><th></th></tr></thead><tbody>${sc.slice(-7).reverse().map(x=>`<tr><td>${dShort(x.d)}</td><td class="r num">${fmt(x.billz)}</td><td class="r num">${fmt(x.kassa)}</td><td>${x.ok?'<span class="up">✓</span>':`<span class="down">≠ ${fmt(x.kassa-x.billz)}</span>`}</td></tr>`).join("")||'<tr><td colspan="4" class="srcs">Продаж за неделю нет</td></tr>'}</tbody></table></div>
          <p class="note" style="margin-top:6px">В «Кассе» учитываются продажи вместе с отмеченными долгами.</p></div>
        <div><b>Склад</b><div class="note">${sk?`${fmt(sk.items)} позиций, ${fmt(sk.qty)} шт по Billz`:"—"}${sk&&sk.baseline?" · первый снимок, сверка начнётся со следующей загрузки":sk?` · расхождений: ${sk.diffCount||0}`:""}</div>
          ${sk&&sk.diffs&&sk.diffs.length?`<div class="tbl" style="margin-top:8px"><table><thead><tr><th>Товар</th><th class="r">Было</th><th class="r">Продано</th><th class="r">Должно</th><th class="r">В Billz</th><th class="r">Разница</th></tr></thead><tbody>${sk.diffs.slice(0,30).map(d=>`<tr><td>${esc(d.n)}<br><span class="srcs">${esc(d.s)}</span></td><td class="r num">${fmt(d.prev)}</td><td class="r num">${fmt(d.sold)}</td><td class="r num">${fmt(d.exp)}</td><td class="r num">${fmt(d.now)}</td><td class="r num"><b class="${d.d>0?"up":"down"}">${d.d>0?"+":""}${fmt(d.d)}</b></td></tr>`).join("")}</tbody></table></div><p class="note" style="margin-top:6px">Плюс — товар пришёл (перемещение, поставка). Минус — ушёл без продажи в Кассе (перемещение, списание, недостача).</p>`:sk&&!sk.baseline?'<p class="note" style="margin-top:8px">Остатки сходятся с продажами ✓</p>':""}</div>
      </div>`:""}
      ${att.length?`<div class="bz-st warn" style="margin-top:10px">Требует внимания: ${att.map(esc).join("; ")}</div>`:""}`;
    const b=$("bzRunBtn");if(b)b.onclick=async()=>{const r=await bzRun();if(r&&r.ok===false)alertMsg("Billz: "+r.error);};
  }
  function alertMsg(t){const m=$("sMsg");if(m){m.textContent=t;m.style.color="var(--minus)"}}
'''
rep('  const PLACE_ORDER=["Склад","Премиум","Яшнабад","Сергели","C1"];',
    BZ + '  const PLACE_ORDER=["Склад","Премиум","Яшнабад","Сергели","C1"];')

# 4. перерисовка блока со списком склада
rep('  function renderStockList(){\n    const all=stockItems(), meta=stockMeta(), has=all.length>0;',
    '  function renderStockList(){\n    renderBz();\n    const all=stockItems(), meta=stockMeta(), has=all.length>0;')

# 5. подписка
rep('    db.collection("stock").onSnapshot(s=>{stockParts=docs(s);matcherCache=null;renderAll()},()=>{});',
    '    db.collection("stock").onSnapshot(s=>{stockParts=docs(s);matcherCache=null;renderAll()},()=>{});\n    db.doc("sync/billz-sergeli").onSnapshot(s=>{bzSync=s.exists?s.data():null;renderBz();setTimeout(()=>document.dispatchEvent(new CustomEvent("sales-updated")),0)},()=>{});')

# 6. для телефона
rep('stockItems:()=>stockItems(),stockMeta:()=>stockMeta(),',
    'stockItems:()=>stockItems(),stockMeta:()=>stockMeta(),bzSync:()=>bzSync,bzState:()=>bzState(),bzRun:()=>bzRun(),bzBusy:()=>bzBusy,bzNext:()=>bzNext(),bzTime:ms=>bzTime(ms),')

# 7. стили
CSS = '''
.bz-st{border-radius:10px;padding:8px 12px;font-size:13px;font-weight:600;margin:4px 0 12px}
.bz-st.ok{background:var(--plus-soft);color:var(--plus)}
.bz-st.warn{background:#fff4e0;color:#a35f00}
.bz-st.err{background:var(--minus-soft,#fde8e8);color:var(--minus)}
.bz-st.wait{background:var(--wash);color:var(--muted,#888)}
:root[data-theme="dark"] .bz-st.warn{background:#3a2a10;color:#ffb340}
.bz-grid{display:grid;grid-template-columns:1fr 1.4fr;gap:18px}
@media (max-width:900px){.bz-grid{grid-template-columns:1fr}}
'''
rep('</style>', CSS + '</style>', h.count('</style>'))
io.open(SRC, "w", encoding="utf-8").write(h)
print("ok")
