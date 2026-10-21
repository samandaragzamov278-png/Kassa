/* Касса · данные Billz: «Сверка», «Остатки Billz», «Перемещения». Только чтение из таблиц bz_*. */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const fmt=n=>(n<0?"−":"")+Math.round(Math.abs(+n||0)).toLocaleString("ru-RU").replace(/[\s  ,]/g," ");
  const fq=n=>{n=+n||0;const r=Math.round(n*10)/10;return (r<0?"−":"")+String(Math.abs(r)).replace(".",",")};
  const sgn=n=>(n>0?"+":"")+fmt(n);
  const sgq=n=>(n>0?"+":"")+fq(n);
  const pl=(n,a,b,c)=>{n=Math.abs(n)%100;const d=n%10;return n>10&&n<20?c:d===1?a:d>=2&&d<=4?b:c};
  const tashNow=()=>new Date(Date.now()+5*3600e3);
  const today=()=>tashNow().toISOString().slice(0,10);
  const addD=(s,n)=>new Date(Date.parse(s+"T00:00:00Z")+n*864e5).toISOString().slice(0,10);
  const dS=s=>s?s.slice(8,10)+"."+s.slice(5,7):"—";
  const dL=s=>s?s.slice(8,10)+"."+s.slice(5,7)+"."+s.slice(0,4):"—";
  const WD=["вс","пн","вт","ср","чт","пт","сб"];
  const wd=s=>WD[new Date(s+"T12:00:00Z").getUTCDay()];
  const hm=t=>t?new Date(t).toLocaleTimeString("ru-RU",{timeZone:"Asia/Tashkent",hour:"2-digit",minute:"2-digit"}):"";
  const dtm=t=>t?new Date(t).toLocaleString("ru-RU",{timeZone:"Asia/Tashkent",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).replace(",",""):"—";
  const POINTS=["Премиум","Яшнабад","Сергели","C1"];
  const PLACES=["Склад","Премиум","Яшнабад","Сергели","C1"];
  const AUTO=new Set(["Сергели"]);           // точки, чьи продажи Касса берёт из Billz сама
  const isLens=c=>/линз/i.test(c||"");
  const isRet=t=>/возврат|return/i.test(t||"");
  const S=()=>window.__S;
  const sb=()=>window.__sb;
  const ls={get(k,d){try{const v=localStorage.getItem("kassa.bz."+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("kassa.bz."+k,JSON.stringify(v))}catch(e){}}};

  // ---------- загрузка из базы ----------
  const cache={checks:new Map(),stockDates:null,stock:new Map(),products:null,transfers:null,collect:null};
  async function q(table,build){
    const out=[];for(let from=0;;from+=1000){let r=build(sb().from(table).select("*")).range(from,from+999);const {data,error}=await r;if(error)throw error;out.push(...data);if(data.length<1000)break}return out;
  }
  async function loadChecks(f,t){
    const k=f+"|"+t;if(cache.checks.has(k))return cache.checks.get(k);
    const p=q("bz_check",x=>x.gte("d",f).lte("d",t).order("t"));cache.checks.set(k,p);
    try{return await p}catch(e){cache.checks.delete(k);throw e}
  }
  async function loadStockDates(){
    if(cache.stockDates)return cache.stockDates;
    const {data,error}=await sb().rpc("bz_stock_dates");
    if(!error&&data){cache.stockDates=data.map(r=>({d:r.d,at:r.at}));return cache.stockDates}
    const rows=await q("bz_stock",x=>x.select("d,at").eq("point","Склад").order("d"));
    const m=new Map();rows.forEach(r=>{if(!m.has(r.d))m.set(r.d,r.at)});cache.stockDates=[...m].map(([d,at])=>({d,at}));return cache.stockDates;
  }
  async function loadStock(d){if(!cache.stock.has(d))cache.stock.set(d,q("bz_stock",x=>x.eq("d",d)));return cache.stock.get(d)}
  async function loadProducts(){if(!cache.products)cache.products=q("bz_product",x=>x).then(r=>{const m=new Map();r.forEach(p=>m.set(p.sku,p));return m});return cache.products}
  async function loadTransfers(){if(!cache.transfers)cache.transfers=q("bz_transfer",x=>x.order("created",{ascending:false}));return cache.transfers}
  function resetCache(){cache.checks.clear();cache.stockDates=null;cache.stock.clear();cache.products=null;cache.transfers=null;document.dispatchEvent(new CustomEvent("bz-cache-reset"))}
  window.addEventListener("bz-refreshed",()=>{resetCache();rerender()});

  // ---------- обновление из Billz ----------
  let busy=false;
  async function refresh(btn){
    if(busy)return;busy=true;const old=btn&&btn.textContent;if(btn){btn.disabled=true;btn.textContent="Загружаю из Billz…"}
    try{
      const a=await sb().functions.invoke("billz-collect",{body:{}});
      if(a.error)throw new Error(a.error.message||String(a.error));
      try{await sb().functions.invoke("billz-sync",{body:{}})}catch(e){}
      resetCache();toast("Данные Billz обновлены");
    }catch(e){toast("Billz: не удалось обновить — "+(e.message||e),true)}
    finally{busy=false;if(btn){btn.disabled=false;btn.textContent=old}rerender()}
  }
  function toast(t,bad){let el=$("bzToast");if(!el){el=document.createElement("div");el.id="bzToast";el.className="bz-toast";document.body.appendChild(el)}el.textContent=t;el.classList.toggle("bad",!!bad);el.classList.add("on");clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove("on"),3200)}
  function collectState(){
    let s=null;try{s=S()&&S().bzCollect&&S().bzCollect()}catch(e){}
    if(!s)return '<span class="bz-pill wait">Выгрузка из Billz ещё не запускалась</span>';
    const last=s.ok?s:s.lastOk;
    return (s.ok?`<span class="bz-pill ok">Billz выгружен ${dtm(s.at)}</span>`:`<span class="bz-pill err">Ошибка выгрузки ${dtm(s.at)}: ${esc(s.error||"")}</span>`)+(last&&!s.ok?` <span class="srcs">последняя удачная ${dtm(last.at)}</span>`:"");
  }

  // ---------- общие элементы ----------
  const seg=(id,opts,cur)=>`<div class="seg" role="group" id="${id}">${opts.map(([v,l])=>`<button type="button" data-v="${esc(v)}" aria-pressed="${String(v)===String(cur)}">${esc(l)}</button>`).join("")}</div>`;
  const kpi=(l,v,d,cls)=>`<div class="kpi ${cls||""}"><span class="eyebrow">${l}</span><div class="kv2"><span class="v">${v}</span></div><span class="d">${d||"&nbsp;"}</span></div>`;
  function periodOf(p,f,t){
    const T=today();
    if(p==="today")return [T,T];if(p==="yday")return [addD(T,-1),addD(T,-1)];if(p==="7d")return [addD(T,-6),T];
    if(p==="month")return [T.slice(0,8)+"01",T];
    if(p==="prev"){const d=new Date(Date.parse(T.slice(0,8)+"01T00:00:00Z"));d.setUTCMonth(d.getUTCMonth()-1);const s=d.toISOString().slice(0,10);const e=addD(T.slice(0,8)+"01",-1);return [s,e]}
    return [f||T,t||T];
  }
  const PER=[["today","Сегодня"],["yday","Вчера"],["7d","7 дней"],["month","Этот месяц"],["prev","Прошлый месяц"],["custom","Свои даты"]];

  // ================= СВЕРКА =================
  const R={per:ls.get("rPer","7d"),f:"",t:"",pt:ls.get("rPt","all"),only:ls.get("rOnly",false),sel:null,iq:"",iview:ls.get("rIv","list"),lim:200};
  function kassaRows(f,t){
    const all=(S()&&S().sales)||[];
    return all.filter(s=>s.date>=f&&s.date<=t&&POINTS.includes(s.point)&&s.cat!=="Погашения долгов");
  }
  const kSum=s=>(+s.sum||0)+(+s.debt||0);
  const bzQty=c=>{const sign=isRet(c.type)?-1:1;return (c.items||[]).reduce((a,i)=>{if(i.ret&&!isRet(c.type))return a;const q=(+i.q||0)||(+i.rq||0);return a+(isLens(i.c)?q/2:q)},0)*sign};
  const bzSum=c=>(isRet(c.type)?-1:1)*Math.abs(+c.total||0);
  function dayTable(checks,ks){
    const m=new Map();const key=(d,p)=>d+"|"+p;
    const get=(d,p)=>{const k=key(d,p);let o=m.get(k);if(!o)m.set(k,o={d,p,bn:0,bq:0,bs:0,kn:0,kq:0,ks:0,nodet:false,debt:0});return o};
    checks.forEach(c=>{if(!POINTS.includes(c.point))return;const o=get(c.d,c.point);o.bn++;o.bq+=bzQty(c);o.bs+=bzSum(c)});
    ks.forEach(s=>{const o=get(s.date,s.point);o.kn++;o.kq+=+s.qty||0;o.ks+=kSum(s);o.debt+=+s.debt||0;if(s.cat==="Без детализации")o.nodet=true});
    return [...m.values()].map(o=>Object.assign(o,{ds:o.ks-o.bs,dq:o.nodet?null:o.kq-o.bq,ok:Math.abs(o.ks-o.bs)<1&&(o.nodet||Math.abs(o.kq-o.bq)<0.01)})).sort((a,b)=>b.d.localeCompare(a.d)||POINTS.indexOf(a.p)-POINTS.indexOf(b.p));
  }
  function matchDay(checks,ks){
    // группы Кассы: по чеку Billz, иначе по номеру чека листа, иначе каждая запись отдельно
    const groups=new Map();
    ks.forEach(s=>{const k=s.billz?"b:"+s.billz:(s.check?"c:"+s.check+"|"+(s.photo||""):"r:"+s.id);let g=groups.get(k);if(!g)groups.set(k,g={k,billz:s.billz||null,check:s.check||"",rows:[],sum:0,q:0,t:+s.createdAt||0});g.rows.push(s);g.sum+=kSum(s);g.q+=+s.qty||0});
    const G=[...groups.values()],B=checks.map(c=>({c,sum:bzSum(c),q:bzQty(c),m:null}));
    const bById=new Map(B.map(b=>[b.c.order_id,b]));
    G.forEach(g=>{if(g.billz&&bById.has(g.billz)){const b=bById.get(g.billz);b.m=g;g.m=b}});
    // по сумме, ближайшее время
    G.filter(g=>!g.m).forEach(g=>{let best=null;B.forEach(b=>{if(b.m||Math.abs(b.sum-g.sum)>=1)return;const dt=Math.abs((Date.parse(b.c.t)||0)-g.t);if(!best||dt<best.dt)best={b,dt}});if(best){best.b.m=g;g.m=best.b}});
    return {G,B};
  }
  function renderRecon(){
    const el=$("reconBody");if(!el)return;
    const [f,t]=periodOf(R.per,R.f,R.t);R.f=f;R.t=t;
    $("reconCtl").innerHTML=`<div class="fb-row">${seg("rPer",PER,R.per)}<div class="fb-dates"${R.per==="custom"?"":" hidden"}><label class="f">С<input type="date" id="rFrom" value="${f}"></label><label class="f">По<input type="date" id="rTo" value="${t}"></label></div></div>
      <div class="fb-row">${seg("rPt",[["all","Все точки"]].concat(POINTS.map(p=>[p,p])),R.pt)}<label class="bz-chk"><input type="checkbox" id="rOnly"${R.only?" checked":""}> Только расхождения</label></div>`;
    bindSeg("rPer",v=>{R.per=v;ls.set("rPer",v);R.sel=null;renderRecon()});
    bindSeg("rPt",v=>{R.pt=v;ls.set("rPt",v);R.sel=null;renderRecon()});
    $("rOnly").onchange=e=>{R.only=e.target.checked;ls.set("rOnly",R.only);renderRecon()};
    if($("rFrom")){$("rFrom").onchange=e=>{R.f=e.target.value;renderRecon()};$("rTo").onchange=e=>{R.t=e.target.value;renderRecon()}}
    $("reconState").innerHTML=collectState();
    el.innerHTML='<div class="empty">Загружаю чеки Billz…</div>';
    loadChecks(f,t).then(checks=>{
      const pt=R.pt;const ch=checks.filter(c=>POINTS.includes(c.point)&&(pt==="all"||c.point===pt));
      const ks=kassaRows(f,t).filter(s=>pt==="all"||s.point===pt);
      const days=dayTable(ch,ks);const bad=days.filter(d=>!d.ok);
      const B={n:ch.length,q:ch.reduce((a,c)=>a+bzQty(c),0),s:ch.reduce((a,c)=>a+bzSum(c),0)};
      const K={q:ks.reduce((a,s)=>a+(+s.qty||0),0),s:ks.reduce((a,s)=>a+kSum(s),0),nodet:ks.some(s=>s.cat==="Без детализации")};
      const list=R.only?bad:days;
      let h=`<section class="kpis">${kpi("Billz · продано",fmt(B.s)+" сум",`${B.n} ${pl(B.n,"чек","чека","чеков")} · ${fq(B.q)} шт`)}${kpi("Касса · записано",fmt(K.s)+" сум",`${fq(K.q)} шт${K.nodet?" · есть дни без детализации":""}`)}${kpi("Разница",`<span class="${Math.abs(K.s-B.s)<1?"up":"down"}">${sgn(K.s-B.s)} сум</span>`,"Касса минус Billz")}${kpi("Дни с расхождением",String(bad.length),bad.length?"отмечены цветом в таблице":"всё сходится ✓",bad.length?"bz-kbad":"")}</section>`;
      h+=`<section class="panel"><div class="head" style="margin-bottom:8px"><div><h2>По дням и точкам</h2><p class="note">Красным — суммы не совпали, оранжевым — продажи есть только в одной системе. Нажмите строку, чтобы увидеть чеки Billz и записи Кассы за этот день. В Кассе продажи считаются вместе с отмеченными долгами, погашения долгов не входят. Линзы считаются парами.</p></div></div>
        <div class="tbl"><table class="bz-days"><thead><tr><th>День</th><th>Точка</th><th class="r">Billz чеков</th><th class="r">Billz шт</th><th class="r">Billz сумма</th><th class="r">Касса шт</th><th class="r">Касса сумма</th><th class="r">Разница шт</th><th class="r">Разница сумма</th><th></th></tr></thead><tbody>${list.map(o=>{const k=o.d+"|"+o.p,sel=R.sel===k;const kind=o.ok?"":!o.bn?" bz-warn":!o.kn?" bz-warn":" bz-bad";const flag=o.ok?'<span class="up">✓</span>':!o.bn?'<span class="bz-flag w">нет в Billz</span>':!o.kn?'<span class="bz-flag w">нет в Кассе</span>':'<span class="bz-flag">≠</span>';return `<tr class="tap${kind}${sel?" bz-sel":""}" data-day="${k}"><td>${dS(o.d)} <span class="srcs">${wd(o.d)}</span></td><td>${esc(o.p)}${AUTO.has(o.p)?' <span class="bz-tag">авто</span>':""}</td><td class="r num">${o.bn||'<span class="srcs">—</span>'}</td><td class="r num">${o.bn?fq(o.bq):'<span class="srcs">—</span>'}</td><td class="r num">${o.bn?fmt(o.bs):'<span class="srcs">—</span>'}</td><td class="r num">${o.kn?(o.nodet?'<span class="srcs" title="есть строки без детализации">—</span>':fq(o.kq)):'<span class="srcs">—</span>'}</td><td class="r num">${o.kn?fmt(o.ks):'<span class="srcs">—</span>'}${o.debt?`<br><span class="srcs">в т.ч. долг ${fmt(o.debt)}</span>`:""}</td><td class="r num">${o.dq==null?'<span class="srcs">—</span>':Math.abs(o.dq)<0.01?"0":`<b class="down">${sgq(o.dq)}</b>`}</td><td class="r num">${Math.abs(o.ds)<1?"0":`<b class="down">${sgn(o.ds)}</b>`}</td><td>${flag}</td></tr>`+(sel?`<tr class="bz-det"><td colspan="10" id="bzDet"></td></tr>`:"")}).join("")||`<tr><td colspan="10" class="srcs" style="text-align:center;padding:16px">${R.only?"Расхождений нет ✓":"Продаж за период нет"}</td></tr>`}</tbody></table></div></section>`;
      // что продалось
      h+=itemsPanel(ch);
      el.innerHTML=h;
      el.querySelectorAll("tr[data-day]").forEach(tr=>tr.onclick=()=>{R.sel=R.sel===tr.dataset.day?null:tr.dataset.day;renderRecon()});
      if(R.sel){const [d,p]=R.sel.split("|");renderDet(ch.filter(c=>c.d===d&&c.point===p),ks.filter(s=>s.date===d&&s.point===p),d,p)}
      bindItems(ch);
    }).catch(e=>{el.innerHTML=`<div class="empty">Не удалось загрузить данные Billz: ${esc(e.message||e)}</div>`});
  }
  function renderDet(ch,ks,d,p){
    const td=$("bzDet");if(!td)return;
    const {G,B}=matchDay(ch,ks);
    const items=c=>(c.items||[]).filter(i=>!i.ret||isRet(c.type)).map(i=>`${esc(i.n)} <span class="srcs">${esc(i.sku)}</span> × ${fq(isLens(i.c)?(+i.q||+i.rq)/2:(+i.q||+i.rq))}${isLens(i.c)?" пар":""} — ${fmt(i.sum)}${i.disc?` <span class="srcs">(скидка ${fmt(i.disc)})</span>`:""}`).join("<br>");
    const bRows=B.map(b=>`<tr class="${b.m?"":"bz-bad"}"><td class="num">${hm(b.c.t)}</td><td class="num">${esc(String(b.c.num).slice(-3))}<br><span class="srcs">${esc(b.c.type||"")}</span></td><td>${items(b.c)}</td><td class="r num"><b>${fmt(b.sum)}</b>${+b.c.debt?`<br><span class="down">долг ${fmt(b.c.debt)}</span>`:""}</td><td class="srcs">${(b.c.pays||[]).map(x=>esc(x.n)+" "+fmt(x.s)).join("<br>")}</td><td>${b.m?'<span class="up">✓ есть в Кассе</span>':'<span class="bz-flag">нет в Кассе</span>'}</td></tr>`).join("")||'<tr><td colspan="6" class="srcs">Чеков в Billz нет</td></tr>';
    const kRows=G.map(g=>`<tr class="${g.m?"":"bz-bad"}"><td class="num">${esc(g.check||"")}</td><td>${g.rows.map(s=>`${esc(s.product||s.cat)} × ${fq(s.qty)} — ${fmt(kSum(s))}${+s.debt?` <span class="down">(долг ${fmt(s.debt)})</span>`:""}<span class="srcs"> · ${esc(s.pay||"")}</span>`).join("<br>")}</td><td class="r num"><b>${fmt(g.sum)}</b></td><td>${g.m?'<span class="up">✓ есть в Billz</span>':'<span class="bz-flag">нет в Billz</span>'}</td></tr>`).join("")||'<tr><td colspan="4" class="srcs">Записей в Кассе нет</td></tr>';
    td.innerHTML=`<div class="bz-detw"><div><h3>Billz · ${esc(p)} · ${dL(d)}</h3><div class="tbl"><table><thead><tr><th>Время</th><th>Чек</th><th>Товары</th><th class="r">Сумма</th><th>Оплата</th><th></th></tr></thead><tbody>${bRows}</tbody></table></div></div>
      <div><h3>Касса · ${esc(p)} · ${dL(d)}</h3><div class="tbl"><table><thead><tr><th>Чек</th><th>Записи</th><th class="r">Сумма</th><th></th></tr></thead><tbody>${kRows}</tbody></table></div></div></div>
      <p class="note" style="margin-top:6px">Чеки сопоставляются по номеру из Billz (для автозагрузки), иначе по одинаковой сумме. Красным — то, чему не нашлась пара.</p>`;
  }
  function itemsPanel(ch){
    return `<section class="panel" id="bzItemsP"><div class="head" style="margin-bottom:8px"><div><h2>Что продалось по Billz</h2><p class="note" id="bzItemsNote"></p></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">${seg("rIv",[["list","По чекам"],["prod","По товарам"]],R.iview)}<label class="f" style="min-width:200px">Поиск<input id="bzIq" placeholder="Товар или артикул" value="${esc(R.iq)}"></label></div></div>
      <div class="tbl"><table id="bzItems"></table></div><div style="text-align:center;margin-top:10px"><button type="button" class="sec" id="bzItemsMore" hidden>Показать ещё</button></div></section>`;
  }
  function flatItems(ch){
    const out=[];ch.forEach(c=>(c.items||[]).forEach(i=>{if(i.ret&&!isRet(c.type))return;const sign=isRet(c.type)?-1:1;const q=(+i.q||+i.rq||0);out.push({t:c.t,d:c.d,p:c.point,num:c.num,type:c.type,n:i.n,sku:i.sku,c:i.c,q:sign*q,pairs:isLens(i.c),sum:sign*(+i.sum||0),seller:c.seller})}));return out;
  }
  function bindItems(ch){
    const all=flatItems(ch);
    bindSeg("rIv",v=>{R.iview=v;ls.set("rIv",v);R.lim=200;draw()});
    const inp=$("bzIq");if(inp)inp.oninput=()=>{R.iq=inp.value;R.lim=200;draw()};
    const more=$("bzItemsMore");if(more)more.onclick=()=>{R.lim+=300;draw()};
    function draw(){
      const qy=R.iq.trim().toLowerCase();const L=all.filter(i=>!qy||(i.n+" "+i.sku).toLowerCase().includes(qy));
      const tb=$("bzItems");if(!tb)return;
      if(R.iview==="prod"){
        const m=new Map();L.forEach(i=>{const k=i.sku||i.n;let o=m.get(k);if(!o)m.set(k,o={n:i.n,sku:i.sku,c:i.c,q:0,s:0,pts:{},last:""});o.q+=i.q;o.s+=i.sum;o.pts[i.p]=(o.pts[i.p]||0)+i.q;if(!o.last||i.t>o.last)o.last=i.t});
        const rows=[...m.values()].sort((a,b)=>b.q-a.q||b.s-a.s);
        tb.innerHTML=`<thead><tr><th>Товар</th><th>Категория</th>${POINTS.map(p=>`<th class="r">${esc(p)}</th>`).join("")}<th class="r">Всего, шт</th><th class="r">Сумма</th><th class="r">Последняя продажа</th></tr></thead><tbody>${rows.slice(0,R.lim).map(o=>`<tr><td>${esc(o.n)}<br><span class="srcs">${esc(o.sku)}</span></td><td class="srcs">${esc(o.c)}</td>${POINTS.map(p=>`<td class="r num">${o.pts[p]?fq(o.pts[p]):'<span class="srcs">—</span>'}</td>`).join("")}<td class="r num"><b>${fq(o.q)}</b></td><td class="r num">${fmt(o.s)}</td><td class="r num">${dtm(o.last)}</td></tr>`).join("")||'<tr><td colspan="9" class="srcs" style="text-align:center">Нет продаж</td></tr>'}</tbody>`;
        $("bzItemsNote").textContent=`${rows.length} ${pl(rows.length,"товар","товара","товаров")}, ${fq(L.reduce((a,i)=>a+i.q,0))} шт (линзы — в штуках линз)`;
        more.hidden=rows.length<=R.lim;
      }else{
        const rows=L.slice().sort((a,b)=>String(b.t).localeCompare(String(a.t)));
        tb.innerHTML=`<thead><tr><th>Когда</th><th>Точка</th><th>Чек</th><th>Товар</th><th class="r">Кол-во</th><th class="r">Сумма</th><th>Продавец</th></tr></thead><tbody>${rows.slice(0,R.lim).map(i=>`<tr${i.q<0?' class="bz-ret"':""}><td class="num">${dtm(i.t)}</td><td>${esc(i.p)}</td><td class="num">${esc(String(i.num).slice(-3))}${isRet(i.type)?' <span class="down">возврат</span>':""}</td><td>${esc(i.n)}<br><span class="srcs">${esc(i.sku)} · ${esc(i.c)}</span></td><td class="r num">${fq(i.q)}</td><td class="r num">${fmt(i.sum)}</td><td class="srcs">${esc(i.seller||"")}</td></tr>`).join("")||'<tr><td colspan="7" class="srcs" style="text-align:center">Нет продаж</td></tr>'}</tbody>`;
        $("bzItemsNote").textContent=`${rows.length} ${pl(rows.length,"строка","строки","строк")} из чеков Billz за период`;
        more.hidden=rows.length<=R.lim;
      }
    }
    draw();
  }

  // ================= ОСТАТКИ BILLZ =================
  const ST={d:"",cmp:"",pt:ls.get("sPt","all"),cat:"all",qy:"",only:false,lim:200};
  async function stockData(){
    const dates=await loadStockDates();if(!dates.length)return null;
    if(!ST.d||!dates.find(x=>x.d===ST.d))ST.d=dates[dates.length-1].d;
    const i=dates.findIndex(x=>x.d===ST.d);const prev=i>0?dates[i-1]:null;
    if(ST.cmp&&!dates.find(x=>x.d===ST.cmp&&x.d<ST.d))ST.cmp="";
    const cmp=ST.cmp?dates.find(x=>x.d===ST.cmp):prev;
    const cur=dates[i];
    const [rows,prods,prevRows,trs]=await Promise.all([loadStock(cur.d),loadProducts(),cmp?loadStock(cmp.d):Promise.resolve([]),loadTransfers()]);
    let checks=[];if(cmp)checks=await loadChecks(cmp.d,cur.d);
    return {dates,cur,cmp,rows,prods,prevRows,trs,checks};
  }
  function movements(D){
    // движение между снимками: продано по чекам Billz, пришло/ушло по перемещениям
    const mv=new Map();const g=(p,s)=>{const k=p+"|"+s;let o=mv.get(k);if(!o)mv.set(k,o={sold:0,tin:0,tout:0});return o};
    if(!D.cmp)return mv;
    const a=Date.parse(D.cmp.at)||0,b=Date.parse(D.cur.at)||Infinity;
    D.checks.forEach(c=>{const t=Date.parse(c.t)||0;if(t<=a||t>b)return;const sign=isRet(c.type)?-1:1;(c.items||[]).forEach(i=>{if(i.ret&&!isRet(c.type))return;g(c.point,i.sku).sold+=sign*(+i.q||+i.rq||0)})});
    D.trs.forEach(tr=>{
      const ts=Date.parse(tr.created)||0,ta=Date.parse(tr.accepted)||0;
      (tr.items||[]).forEach(i=>{if(tr.status!=="черновик"&&ts>a&&ts<=b)g(tr.from_point,i.sku).tout+=+i.sent||0;if(ta&&ta>a&&ta<=b)g(tr.to_point,i.sku).tin+=+i.arr||0});
    });
    return mv;
  }
  function renderStock(){
    const el=$("stBzBody");if(!el)return;
    $("stBzState").innerHTML=collectState();
    el.innerHTML='<div class="empty">Загружаю остатки Billz…</div>';
    stockData().then(D=>{
      if(!D){el.innerHTML='<div class="empty">Остатков Billz ещё нет — нажмите «Обновить из Billz».</div>';return}
      const mv=movements(D);
      const pm=new Map();D.prevRows.forEach(r=>pm.set(r.point+"|"+r.sku,+r.q));
      const cm=new Map();D.rows.forEach(r=>cm.set(r.point+"|"+r.sku,+r.q));
      const keys=new Set([...cm.keys(),...pm.keys(),...mv.keys()]);
      const lines=[];keys.forEach(k=>{const i=k.indexOf("|"),p=k.slice(0,i),s=k.slice(i+1);const now=cm.get(k)||0,was=D.cmp?(pm.get(k)||0):null,m=mv.get(k)||{sold:0,tin:0,tout:0};const pr=D.prods.get(s)||{};
        const delta=was==null?null:now-was;const exp=was==null?null:was-m.sold+m.tin-m.tout;const un=exp==null?null:now-exp;
        lines.push({p,s,n:pr.name||s,c:pr.cat||"",price:(pr.prices&&pr.prices[p])||0,cp:+pr.cp||0,now,was,delta,sold:m.sold,tin:m.tin,tout:m.tout,un})});
      const cats=[...new Set(lines.map(l=>l.c).filter(Boolean))].sort();
      $("stBzCtl").innerHTML=`<div class="fb-row"><label class="f">Остатки на<select id="sbzD">${D.dates.slice().reverse().map(x=>`<option value="${x.d}"${x.d===D.cur.d?" selected":""}>${dL(x.d)} · ${hm(x.at)}</option>`).join("")}</select></label>
        <label class="f">Сравнить с<select id="sbzC"><option value="">${D.dates.length>1?"предыдущей выгрузкой":"—"}</option>${D.dates.filter(x=>x.d<D.cur.d).reverse().map(x=>`<option value="${x.d}"${D.cmp&&x.d===D.cmp.d&&ST.cmp?" selected":""}>${dL(x.d)}</option>`).join("")}</select></label>
        <label class="f">Категория<select id="sbzCat"><option value="all">Все</option>${cats.map(c=>`<option${ST.cat===c?" selected":""}>${esc(c)}</option>`).join("")}</select></label>
        <label class="f" style="min-width:200px">Поиск<input id="sbzQ" placeholder="Товар или артикул" value="${esc(ST.qy)}"></label></div>
        <div class="fb-row">${seg("sbzPt",[["all","Все места"]].concat(PLACES.map(p=>[p,p])),ST.pt)}<label class="bz-chk"><input type="checkbox" id="sbzOnly"${ST.only?" checked":""}> Только с движением или расхождением</label></div>`;
      $("sbzD").onchange=e=>{ST.d=e.target.value;ST.cmp="";renderStock()};$("sbzC").onchange=e=>{ST.cmp=e.target.value;renderStock()};
      $("sbzCat").onchange=e=>{ST.cat=e.target.value;ST.lim=200;draw()};$("sbzQ").oninput=e=>{ST.qy=e.target.value;ST.lim=200;draw()};
      $("sbzOnly").onchange=e=>{ST.only=e.target.checked;draw()};
      bindSeg("sbzPt",v=>{ST.pt=v;ls.set("sPt",v);ST.lim=200;draw()});
      function draw(){
        const qy=ST.qy.trim().toLowerCase();
        const L=lines.filter(l=>(ST.pt==="all"||l.p===ST.pt)&&(ST.cat==="all"||l.c===ST.cat)&&(!qy||(l.n+" "+l.s).toLowerCase().includes(qy)));
        const sum=(a,f)=>a.reduce((x,l)=>x+(f(l)||0),0);
        const Q=sum(L,l=>l.now),V=sum(L,l=>l.now*l.price),C=sum(L,l=>l.now*l.cp),unN=L.filter(l=>l.un&&Math.abs(l.un)>0.001);
        const cmpTxt=D.cmp?`с ${dS(D.cmp.d)} ${hm(D.cmp.at)}`:"";
        let h=`<section class="kpis">${kpi(ST.pt==="all"?"Всего на остатке":"Остаток · "+esc(ST.pt),fmt(Q)+" шт",`${L.filter(l=>l.now).length} позиций · ${dL(D.cur.d)} ${hm(D.cur.at)}`)}${kpi("В розничных ценах",fmt(V)+" сум",C?`закупка ≈ ${fmt(C)} сум`:"закупочные цены Billz не отдаёт")}${kpi("Изменение "+cmpTxt,D.cmp?`<span class="${sum(L,l=>l.delta)<0?"down":"up"}">${sgn(sum(L,l=>l.delta))} шт</span>`:"—",D.cmp?`продано ${fq(sum(L,l=>l.sold))} · пришло ${fq(sum(L,l=>l.tin))} · ушло ${fq(sum(L,l=>l.tout))}`:"история копится с первой выгрузки")}${kpi("Без объяснения",D.cmp?String(unN.length):"—",D.cmp?(unN.length?"позиций: изменилось без продажи и перемещения":"всё объяснено продажами и перемещениями ✓"):"",unN.length?"bz-kbad":"")}</section>`;
        // по местам
        if(ST.pt==="all"){
          const rows=PLACES.map(p=>{const a=lines.filter(l=>l.p===p&&(ST.cat==="all"||l.c===ST.cat));return {p,pos:a.filter(l=>l.now).length,q:sum(a,l=>l.now),v:sum(a,l=>l.now*l.price),d:sum(a,l=>l.delta),s:sum(a,l=>l.sold),i:sum(a,l=>l.tin),o:sum(a,l=>l.tout),u:sum(a,l=>l.un),un:a.filter(l=>l.un&&Math.abs(l.un)>0.001).length}});
          h+=`<section class="panel"><h2>По местам</h2><p class="note">Было − продано + пришло − ушло = должно быть. Если в Billz другое число — строка отмечена. Продажи берутся из чеков Billz, движение — из перемещений Billz.</p><div class="tbl" style="margin-top:10px"><table><thead><tr><th>Место</th><th class="r">Позиций</th><th class="r">Штук</th><th class="r">В розничных ценах</th><th class="r">Изменение</th><th class="r">Продано</th><th class="r">Пришло</th><th class="r">Ушло</th><th class="r">Без объяснения</th></tr></thead><tbody>${rows.map(o=>`<tr class="tap${o.un?" bz-bad":""}" data-pt="${esc(o.p)}"><td><b>${esc(o.p)}</b>${AUTO.has(o.p)?' <span class="bz-tag">в Кассе</span>':""}</td><td class="r num">${fmt(o.pos)}</td><td class="r num">${fmt(o.q)}</td><td class="r num">${fmt(o.v)}</td><td class="r num">${D.cmp?sgq(o.d):"—"}</td><td class="r num">${D.cmp?fq(o.s):"—"}</td><td class="r num">${D.cmp?fq(o.i):"—"}</td><td class="r num">${D.cmp?fq(o.o):"—"}</td><td class="r num">${D.cmp?(o.un?`<b class="down">${sgq(o.u)}</b> <span class="srcs">${o.un} поз.</span>`:'<span class="up">0 ✓</span>'):"—"}</td></tr>`).join("")}</tbody></table></div></section>`;
        }
        // товары
        let it=L.filter(l=>!ST.only||(l.delta||l.sold||l.tin||l.tout||(l.un&&Math.abs(l.un)>0.001)));
        it.sort((a,b)=>(Math.abs(b.un||0)>0.001)-(Math.abs(a.un||0)>0.001)||Math.abs(b.delta||0)-Math.abs(a.delta||0)||b.now-a.now||a.n.localeCompare(b.n));
        h+=`<section class="panel"><div class="head" style="margin-bottom:8px"><div><h2>Товары</h2><p class="note">${it.length} ${pl(it.length,"строка","строки","строк")}. Сначала — с расхождением, затем с движением.</p></div></div><div class="tbl"><table><thead><tr>${ST.pt==="all"?"<th>Место</th>":""}<th>Товар</th><th>Категория</th><th class="r">Цена</th><th class="r">Было</th><th class="r">Продано</th><th class="r">Пришло</th><th class="r">Ушло</th><th class="r">Сейчас</th><th class="r">Расхождение</th></tr></thead><tbody>${it.slice(0,ST.lim).map(l=>{const bad=l.un&&Math.abs(l.un)>0.001;return `<tr class="${bad?"bz-bad":""}">${ST.pt==="all"?`<td>${esc(l.p)}</td>`:""}<td>${esc(l.n)}<br><span class="srcs">${esc(l.s)}</span></td><td class="srcs">${esc(l.c)}</td><td class="r num">${l.price>1?fmt(l.price):"—"}</td><td class="r num">${l.was==null?"—":fq(l.was)}</td><td class="r num">${l.sold?fq(l.sold):'<span class="srcs">—</span>'}</td><td class="r num">${l.tin?`<span class="up">+${fq(l.tin)}</span>`:'<span class="srcs">—</span>'}</td><td class="r num">${l.tout?`<span class="down">−${fq(l.tout)}</span>`:'<span class="srcs">—</span>'}</td><td class="r num"><b>${fq(l.now)}</b></td><td class="r num">${l.un==null?"—":bad?`<b class="down">${sgq(l.un)}</b>`:'<span class="up">✓</span>'}</td></tr>`}).join("")||'<tr><td colspan="10" class="srcs" style="text-align:center;padding:14px">Нет позиций под фильтр</td></tr>'}</tbody></table></div><div style="text-align:center;margin-top:10px"><button type="button" class="sec" id="sbzMore"${it.length>ST.lim?"":" hidden"}>Показать ещё</button></div></section>`;
        $("stBzList").innerHTML=h;
        const mb=$("sbzMore");if(mb)mb.onclick=()=>{ST.lim+=300;draw()};
        $("stBzList").querySelectorAll("tr[data-pt]").forEach(tr=>tr.onclick=()=>{ST.pt=tr.dataset.pt;ls.set("sPt",ST.pt);renderStock()});
        lastStock={L:it,D};
      }
      el.innerHTML='<div id="stBzList" class="stack"></div>';draw();
    }).catch(e=>{el.innerHTML=`<div class="empty">Не удалось загрузить остатки: ${esc(e.message||e)}</div>`});
  }
  let lastStock=null,lastTr=null;

  // ================= ПЕРЕМЕЩЕНИЯ =================
  const TR={per:ls.get("tPer","month"),f:"",t:"",pt:"all",open:null};
  function renderTransfers(){
    const el=$("stTrBody");if(!el)return;
    const [f,t]=TR.per==="all"?["2000-01-01","2999-12-31"]:periodOf(TR.per,TR.f,TR.t);TR.f=f;TR.t=t;
    $("stTrCtl").innerHTML=`<div class="fb-row">${seg("trPer",PER.filter(p=>p[0]!=="today"&&p[0]!=="yday").concat([["all","Все"]]),TR.per)}<div class="fb-dates"${TR.per==="custom"?"":" hidden"}><label class="f">С<input type="date" id="trFrom" value="${f}"></label><label class="f">По<input type="date" id="trTo" value="${t}"></label></div></div><div class="fb-row">${seg("trPt",[["all","Все места"]].concat(PLACES.map(p=>[p,p])),TR.pt)}</div>`;
    bindSeg("trPer",v=>{TR.per=v;ls.set("tPer",v);renderTransfers()});bindSeg("trPt",v=>{TR.pt=v;renderTransfers()});
    if($("trFrom")){$("trFrom").onchange=e=>{TR.f=e.target.value;renderTransfers()};$("trTo").onchange=e=>{TR.t=e.target.value;renderTransfers()}}
    $("stTrState").innerHTML=collectState();
    el.innerHTML='<div class="empty">Загружаю перемещения…</div>';
    loadTransfers().then(all=>{
      const L=all.filter(x=>x.d>=f&&x.d<=t&&(TR.pt==="all"||x.from_point===TR.pt||x.to_point===TR.pt));
      lastTr=L;
      const sent=L.reduce((a,x)=>a+(+x.sent||0),0),arr=L.reduce((a,x)=>a+(+x.arrived||0),0),way=L.filter(x=>x.status==="в пути"),bad=L.filter(x=>x.status==="принят"&&+x.sent!==+x.arrived);
      let h=`<section class="kpis">${kpi("Перемещений",String(L.length),`${dS(f)} — ${dS(t)}`)}${kpi("Отправлено",fmt(sent)+" шт",`принято ${fmt(arr)} шт`)}${kpi("В пути",String(way.length),way.length?"ещё не приняты на точке":"всё принято",way.length?"bz-kwarn":"")}${kpi("С расхождением",String(bad.length),bad.length?"принято не столько, сколько отправлено":"отправлено = принято ✓",bad.length?"bz-kbad":"")}</section>`;
      h+=`<section class="panel"><h2>Перемещения между точками</h2><p class="note">Из Billz, обновляются каждый день. Нажмите строку, чтобы увидеть товары.</p><div class="tbl" style="margin-top:10px"><table><thead><tr><th>Дата</th><th>№</th><th>Откуда</th><th>Куда</th><th>Статус</th><th class="r">Отправлено</th><th class="r">Принято</th><th class="r">В розничных ценах</th><th>Кто</th></tr></thead><tbody>${L.map(x=>{const diff=x.status==="принят"&&+x.sent!==+x.arrived;const op=TR.open===x.id;return `<tr class="tap${diff?" bz-bad":x.status==="в пути"?" bz-warn":""}" data-tr="${esc(x.id)}"><td class="num">${dtm(x.accepted||x.created)}</td><td class="num">${esc(x.num)}</td><td>${esc(x.from_point)}</td><td>${esc(x.to_point)}</td><td>${x.status==="принят"?'<span class="up">принят</span>':x.status==="в пути"?'<span class="bz-flag w">в пути</span>':'<span class="srcs">черновик</span>'}</td><td class="r num">${fmt(x.sent)}</td><td class="r num">${diff?`<b class="down">${fmt(x.arrived)}</b>`:fmt(x.arrived)}</td><td class="r num">${fmt(x.retail)}</td><td class="srcs">${esc(x.by_name||"")}</td></tr>`+(op?`<tr class="bz-det"><td colspan="9"><div class="tbl"><table><thead><tr><th>Товар</th><th class="r">Отправлено</th><th class="r">Принято</th><th class="r">Цена</th></tr></thead><tbody>${(x.items||[]).map(i=>`<tr class="${+i.sent!==+i.arr&&x.status==="принят"?"bz-bad":""}"><td>${esc(i.n)}<br><span class="srcs">${esc(i.sku)}</span></td><td class="r num">${fq(i.sent)}</td><td class="r num">${fq(i.arr)}</td><td class="r num">${i.price?fmt(i.price):"—"}</td></tr>`).join("")||'<tr><td colspan="4" class="srcs">Товаров нет</td></tr>'}</tbody></table></div></td></tr>`:"")}).join("")||'<tr><td colspan="9" class="srcs" style="text-align:center;padding:14px">Перемещений за период нет</td></tr>'}</tbody></table></div></section>`;
      el.innerHTML=h;
      el.querySelectorAll("tr[data-tr]").forEach(tr=>tr.onclick=()=>{TR.open=TR.open===tr.dataset.tr?null:tr.dataset.tr;renderTransfers()});
    }).catch(e=>{el.innerHTML=`<div class="empty">Не удалось загрузить перемещения: ${esc(e.message||e)}</div>`});
  }

  // ---------- Excel ----------
  async function xlsx(view,btn){
    if(typeof XLSX==="undefined")return toast("Модуль Excel не загрузился",true);
    let rows=[],name="";
    if(view==="bzst"&&lastStock){name="Остатки Billz "+lastStock.D.cur.d;rows=lastStock.L.map(l=>({"Место":l.p,"Товар":l.n,"Артикул":l.s,"Категория":l.c,"Цена":l.price,"Было":l.was,"Продано":l.sold,"Пришло":l.tin,"Ушло":l.tout,"Сейчас":l.now,"Расхождение":l.un}))}
    else if(view==="bztr"&&lastTr){name="Перемещения Billz";lastTr.forEach(x=>(x.items||[]).forEach(i=>rows.push({"Дата":dtm(x.accepted||x.created),"№":x.num,"Откуда":x.from_point,"Куда":x.to_point,"Статус":x.status,"Товар":i.n,"Артикул":i.sku,"Отправлено":i.sent,"Принято":i.arr,"Цена":i.price})))}
    else if(view==="recon"){const ch=await loadChecks(R.f,R.t);name=`Сверка ${R.f}—${R.t}`;const ks=kassaRows(R.f,R.t);rows=dayTable(ch.filter(c=>R.pt==="all"||c.point===R.pt),ks.filter(s=>R.pt==="all"||s.point===R.pt)).map(o=>({"День":o.d,"Точка":o.p,"Billz чеков":o.bn,"Billz шт":o.bq,"Billz сумма":o.bs,"Касса шт":o.nodet?null:o.kq,"Касса сумма":o.ks,"Разница сумма":o.ds,"Сходится":o.ok?"да":"нет"}));
      const ws2=XLSX.utils.json_to_sheet(flatItems(ch.filter(c=>R.pt==="all"||c.point===R.pt)).map(i=>({"Когда":dtm(i.t),"Точка":i.p,"Чек":i.num,"Товар":i.n,"Артикул":i.sku,"Категория":i.c,"Кол-во":i.q,"Сумма":i.sum,"Продавец":i.seller})));
      const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"По дням");XLSX.utils.book_append_sheet(wb,ws2,"Что продалось");return save(wb,name)}
    if(!rows.length)return toast("Нечего выгружать",true);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"Лист1");save(wb,name);
  }
  async function save(wb,name){const out=XLSX.write(wb,{type:"array",bookType:"xlsx"});const blob=new Blob([out],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});const dl=await window.claude.use("downloads");await dl.save({filename:name+".xlsx",data:blob});toast("Файл скачан")}

  function bindSeg(id,fn){const s=$(id);if(!s)return;s.querySelectorAll("button[data-v]").forEach(b=>b.onclick=()=>fn(b.dataset.v))}
  let curView=null;
  function rerender(){if(curView==="recon")renderRecon();else if(curView==="bzst")renderStock();else if(curView==="bztr")renderTransfers()}
  function render(view){curView=view;rerender()}
  // для телефона
  async function mobileRecon(f,t,pt){const ch=await loadChecks(f,t);const c2=ch.filter(c=>POINTS.includes(c.point)&&(pt==="all"||c.point===pt));const ks=kassaRows(f,t).filter(s=>pt==="all"||s.point===pt);return {days:dayTable(c2,ks),checks:c2,ks,match:(d,p)=>matchDay(c2.filter(c=>c.d===d&&c.point===p),ks.filter(s=>s.date===d&&s.point===p))}}
  async function mobileStock(){const D=await stockData();if(!D)return null;const mv=movements(D);return {D,mv}}
  window.__BZ={render,refresh,xlsx,collectState,periodOf,mobileRecon,mobileStock,loadTransfers,bzQty,bzSum,kSum,isLens,isRet,POINTS,PLACES,resetCache};
})();
