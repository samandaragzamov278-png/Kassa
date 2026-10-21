import sys
p=sys.argv[1];s=open(p,encoding='utf-8').read()
def rep(a,b,cnt=1):
  global s;c=s.count(a);assert c==cnt,(a[:80],c);s=s.replace(a,b)
D=''+__import__('os').path.dirname(__import__('os').path.abspath(__file__))+'/mobile/'
# 1) касса: открыть расчёты и запись для мобильной версии
rep('''  async function init(){
    $("fDate").value=new Date().toISOString().slice(0,10);syncCatVis();render();''','''  window.__K={compute:m=>compute(m),cashState:c=>cash&&typeof cash.amount==="number"?cashState(c):null,get cash(){return cash},get entries(){return entries},get templates(){return templates},kMonths:()=>kMonths(),lastM:()=>lastM(),put,del,newId,
    saveCash:async v=>{const now=Date.now(),exp=compute(lastM()).expected;await put("cash","current",{amount:v,updatedAt:now});if(mode==="db"){try{await db.doc("cashlog/"+newId()).set({amount:v,expected:exp,at:now})}catch(e){}}}};
  async function init(){
    $("fDate").value=new Date().toISOString().slice(0,10);syncCatVis();render();''')
# 2) продажи: событие при каждом обновлении данных
rep('''  function renderAll(){
    C.fitW=0;''','''  function renderAll(){
    document.dispatchEvent(new CustomEvent("sales-updated"));
    C.fitW=0;''')
# 3) продажи: открыть расчёты для мобильной версии
rep('''  document.addEventListener("kassa-updated",()=>{if(tab==="analytics")renderAnalytics()});''','''  document.addEventListener("kassa-updated",()=>{if(tab==="analytics")renderAnalytics()});
  window.__S={get sales(){return sales},get settings(){return settings},get planCfg(){return planCfg},get repDocs(){return repDocs},get batches(){return batches},F,
    plCalc:m=>plCalc(m),plStats:(...a)=>plStats(...a),rpCalc:(m,w)=>rpCalc(m,w),rpGN:d=>rpGN(d),get RP_GN_FROM(){return RP_GN_FROM},rpSave:(d,p)=>rpSave(d,p),putSale:(i,d)=>putSale(i,d),delSale:i=>delSale(i),newId:()=>newId(),
    lensData:()=>lensData(),lensKind:x=>lensKind(x),marginData:()=>marginData(),batchStats:(...a)=>batchStats(...a),stockItems:()=>stockItems(),stockMeta:()=>stockMeta(),
    rpExportAll:btn=>rpExport(rpAllDays(),btn,true)};''')
rep('''db.doc("settings/analytics3").onSnapshot(''','''db.collection("report").onSnapshot(()=>setTimeout(()=>document.dispatchEvent(new CustomEvent("sales-updated")),0),()=>{});
    db.doc("settings/plan").onSnapshot(()=>setTimeout(()=>document.dispatchEvent(new CustomEvent("sales-updated")),0),()=>{});
    db.doc("settings/analytics3").onSnapshot(''')
# 4) разметка, стили, код
css=open(D+'mobile.css',encoding='utf-8').read();js=open(D+'mobile.js',encoding='utf-8').read()
rep('</style>',css+'</style>')
s=s.rstrip()+'\n<div id="mApp" aria-label="Касса — мобильная версия"></div>\n<script>\n'+js+'\n</script>\n'
open(p,'w',encoding='utf-8').write(s);print('ok')
