/* Касса · «Платежи»: постоянные и разовые платежи, долги — что оплачено и что впереди.
   Данные: payments/<id> {name, kind:"fixed"|"plan"|"debt", cat, amount, usd, rate, auto:"tax", pct, day, freq:"month"|"year", mon,
             date, from, to, src:"bank"|"cash"|"founder", point, match:"слова через запятую", total, totalUsd, paid0, pays:[{date,amount,note}], note, on, createdAt}
           paymarks/<id>_<YYYY-MM> {amount, date, at} — ручная отметка оплаты за месяц (то, чего нет в выписке и Кассе).
   Оплата находится сама: строки выписки р/с (report.bank) и расходы Кассы (entries) месяца, где в названии есть слова из match. */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const fmt=n=>(n<0?"−":"")+Math.round(Math.abs(+n||0)).toLocaleString("ru-RU").replace(/[\s  ,]/g," ");
  const num=v=>{if(v==null)return null;const t=String(v).replace(/[\s  ]/g,"").replace(/[−–]/g,"-").replace(/,/g,".").replace(/[^\d.\-]/g,"");if(!t||t==="-")return null;const x=parseFloat(t);return isFinite(x)?x:null};
  const pl=(n,a,b,c)=>{n=Math.abs(n)%100;const d=n%10;return n>10&&n<20?c:d===1?a:d>=2&&d<=4?b:c};
  const MN=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const MNg=["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const MNp=["январе","феврале","марте","апреле","мае","июне","июле","августе","сентябре","октябре","ноябре","декабре"];
  const WD=["вс","пн","вт","ср","чт","пт","сб"];
  const wd=d=>WD[new Date(d+"T12:00:00Z").getUTCDay()];
  const dLong=d=>+d.slice(8)+" "+MNg[+d.slice(5,7)-1];
  const mName=m=>MN[+m.slice(5,7)-1]+" "+m.slice(0,4);
  const today=()=>new Date(Date.now()+5*3600e3).toISOString().slice(0,10);
  const addM=(m,n)=>{const d=new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7)-1+n,1));return d.toISOString().slice(0,7)};
  const dim=m=>new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7),0)).getUTCDate();
  const dDiff=(a,b)=>Math.round((Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/864e5);
  const K=()=>window.__K,S=()=>window.__S;
  const ls={get(k,d){try{const v=localStorage.getItem("kassa.pay."+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("kassa.pay."+k,JSON.stringify(v))}catch(e){}}};
  const POINTS=()=>{const p=S()&&S().settings&&S().settings.points;return Array.isArray(p)&&p.length?p:["Премиум","Яшнабад","Сергели","C1"]};
  const color=p=>{try{return S().pointColor(p)}catch(e){return "var(--accent)"}};

  const IC={
    credit:'<path d="M3 9.5h18L12 4z"/><path d="M5.5 9.5v8M10 9.5v8M14 9.5v8M18.5 9.5v8M3 20h18"/>',
    rent:'<path d="M4 11 12 4.5l8 6.5v9H4z"/><path d="M10 20v-5h4v5"/>',
    tax:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    salary:'<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.4"/><path d="M15.6 14.1A4.6 4.6 0 0 1 21 18.6"/>',
    service:'<rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="M8.5 12h7M12 8.5v7"/>',
    utility:'<path d="M13 3 5.5 13H11l-1 8 7.5-10H12z"/>',
    debt:'<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.3c-.5-.8-1.5-1.3-2.6-1.3-1.4 0-2.5.8-2.5 2s1.1 1.6 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1.1 0-2.1-.5-2.6-1.3M12 6.5V8M12 16v1.5"/>',
    other:'<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>'
  };
  const CATS={credit:["Кредит","var(--p1)"],rent:["Аренда","var(--p4)"],tax:["Налоги","var(--minus)"],salary:["Зарплаты","var(--p3)"],service:["Сервисы","var(--p2)"],utility:["Коммунальные","var(--p5)"],debt:["Долги","var(--warn)"],other:["Прочее","var(--muted)"]};
  const KINDS=[["fixed","Постоянный"],["plan","Разовый"],["debt","Долг"]];
  const SRC={bank:"Р/с",cash:"Касса",founder:"Учредитель"};
  const ic=(c,cls)=>`<span class="pay-ic ${cls||""}" style="--cc:${(CATS[c]||CATS.other)[1]}"><svg viewBox="0 0 24 24" aria-hidden="true">${IC[c]||IC.other}</svg></span>`;

  // ---------- данные ----------
  let items={},marks={},db=null;
  (async()=>{try{db=await window.claude.use("db");if(!db)return;
    db.collection("payments").onSnapshot(s=>{const o={};s.forEach(d=>{o[d.id]=Object.assign({id:d.id},d.data())});items=o;rerender()},()=>{});
    db.collection("paymarks").onSnapshot(s=>{const o={};s.forEach(d=>{o[d.id]=d.data()});marks=o;rerender()},()=>{});
  }catch(e){}})();
  const list=()=>Object.values(items).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  const isOn=it=>it.on!==false;
  const inRange=(it,M)=>(!it.from||M>=it.from)&&(!it.to||M<=it.to);

  // безнал месяца по Кассе — база налога с оборота (наличные не облагаются)
  function cashless(M){let t=0;(S()&&S().sales||[]).forEach(s=>{if(!s.date||!s.date.startsWith(M))return;
    if(s.pay==="Смешанная"&&s.pays&&typeof s.pays==="object")Object.entries(s.pays).forEach(([k,v])=>{if(k!=="Наличные")t+=+v||0});
    else if(s.pay&&s.pay!=="Наличные")t+=+s.sum||0});return t}
  const rateOf=it=>+it.rate||0;
  // сумма платежа за месяц M
  function amountOf(it,M){
    if(it.auto==="tax"){const base=cashless(addM(M,-1));return {a:Math.round(base*(+it.pct||0)/100),est:true,base}}
    if(+it.usd>0)return {a:Math.round(+it.usd*rateOf(it)),usd:+it.usd,est:!rateOf(it)};
    return {a:Math.round(+it.amount||0)};
  }
  // срок платежа в месяце M или null
  function dueOf(it,M){
    if(!isOn(it))return null;
    if(it.kind==="plan")return it.date&&it.date.startsWith(M)?it.date:null;
    if(!inRange(it,M))return null;
    if(it.kind==="debt"&&!(+it.amount>0||+it.usd>0))return null;
    if(it.freq==="year"&&+it.mon!==+M.slice(5,7))return null;
    const d=Math.min(Math.max(1,+it.day||1),dim(M));return M+"-"+String(d).padStart(2,"0");
  }
  const words=it=>String(it.match||"").split(/[,;|]/).map(s=>s.trim().toLowerCase()).filter(Boolean);
  // где нашлась оплата: выписка р/с и расходы Кассы за месяц
  function hitsOf(it,M){
    // слово с минусом впереди исключает строку: «зп, аванс, -менеджер»
    const all=words(it),w=all.filter(x=>x[0]!=="-"),no=all.filter(x=>x[0]==="-").map(x=>x.slice(1).trim()).filter(Boolean);if(!w.length)return [];
    const has=n=>{n=String(n||"").toLowerCase();return w.some(x=>n.includes(x))&&!no.some(x=>n.includes(x))};
    const out=[];
    if(it.src!=="cash"){const R=S()&&S().repDocs||{};Object.keys(R).forEach(d=>{if(!d.startsWith(M))return;(R[d].bank||[]).forEach(b=>{if(has(b.n))out.push({d,n:b.n,a:+b.a||0,f:"р/с"})})})}
    if(it.src!=="bank"){(K()&&K().entries||[]).forEach(e=>{if(e.type!=="exp"||e.kind==="bc"||!e.date||!e.date.startsWith(M))return;if(!has(e.name))return;
      out.push({d:e.date,n:e.name,a:typeof e.fact==="number"?e.fact:(+e.amount||0),f:e.fund==="reserve"?"резерв":"касса"})})}
    return out.sort((a,b)=>a.d.localeCompare(b.d));
  }
  const markOf=(it,M)=>marks[it.id+"_"+M]||null;
  function row(it,M){
    const due=dueOf(it,M);if(!due)return null;
    const am=amountOf(it,M),hits=hitsOf(it,M),mk=markOf(it,M);
    const paid=hits.reduce((s,h)=>s+h.a,0)+(mk?+mk.amount||0:0);
    const T=today(),left=Math.max(0,am.a-paid);
    let st;if(am.a>0&&paid>=am.a*0.98||(!am.a&&paid>0))st="ok";else if(paid>0)st="part";else if(due<T)st="late";else if(due===T)st="today";else st="soon";
    return {it,due,am,hits,mk,paid,left,st};
  }
  const monthRows=M=>list().map(it=>row(it,M)).filter(Boolean).sort((a,b)=>a.due.localeCompare(b.due)||(b.am.a-a.am.a));
  // долг: всего, погашено, осталось
  function debtOf(it){
    const rate=rateOf(it);const total=+it.totalUsd>0?Math.round(+it.totalUsd*(rate||0)):+it.total||0;
    let paid=+it.paid0||0;(it.pays||[]).forEach(p=>paid+=+p.amount||0);
    const first=it.from||"2026-01",last=addM(today().slice(0,7),0);
    for(let M=first;M<=last;M=addM(M,1)){hitsOf(it,M).forEach(h=>paid+=h.a);const mk=markOf(it,M);if(mk)paid+=+mk.amount||0}
    return {total,paid,left:total?Math.max(0,total-paid):null,pct:total?Math.min(1,paid/total):null};
  }

  // ---------- элементы ----------
  const kpi=(l,v,d,cls)=>`<div class="kpi ${cls||""}"><span class="eyebrow">${l}</span><div class="kv2"><span class="v">${v}</span></div><span class="d">${d||"&nbsp;"}</span></div>`;
  const seg=(attr,opts,cur,big)=>`<div class="seg${big?" big":""}" role="group">${opts.map(([v,l])=>`<button type="button" ${attr}="${esc(v)}" aria-pressed="${String(v)===String(cur)}">${l}</button>`).join("")}</div>`;
  const pill=(cls,t)=>`<span class="fm-pill ${cls}">${t}</span>`;
  function stPill(r){const T=today();
    if(r.st==="ok")return pill("ok","Оплачено");if(r.st==="part")return pill("warn","Частично");
    if(r.st==="late")return pill("bad","Просрочено на "+dDiff(r.due,T)+" "+pl(dDiff(r.due,T),"день","дня","дней"));
    if(r.st==="today")return pill("warn","Сегодня");const n=dDiff(T,r.due);return pill("idle",n===1?"Завтра":"Через "+n+" "+pl(n,"день","дня","дней"))}
  const when=it=>it.kind==="plan"?(it.date?dLong(it.date)+" "+it.date.slice(0,4):"дата не указана"):it.freq==="year"?`раз в год · ${+it.day||1} ${MNg[(+it.mon||1)-1]}`:`каждый месяц · ${+it.day||1}-го`;
  function toast(t,bad){let el=$("bzToast");if(!el){el=document.createElement("div");el.id="bzToast";el.className="bz-toast";document.body.appendChild(el)}el.textContent=t;el.classList.toggle("bad",!!bad);el.classList.add("on");clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove("on"),2600)}

  // ---------- страница ----------
  const P={m:"",open:null,row:null,del:false,form:null};
  function months(){const T=today().slice(0,7);let a=T;list().forEach(it=>{const f=it.kind==="plan"?(it.date||"").slice(0,7):it.from;if(f&&f<a)a=f});
    if(addM(T,-2)<a)a=addM(T,-2);const out=[];for(let M=a;M<=addM(T,2);M=addM(M,1))out.push(M);return out.slice(-8)}
  function render(){
    const el=$("payBody");if(!el)return;
    const ms=months(),T=today();if(!P.m||!ms.includes(P.m))P.m=ls.get("m","")&&ms.includes(ls.get("m",""))?ls.get("m",""):T.slice(0,7);
    const M=P.m,rows=monthRows(M);
    const tot=rows.reduce((s,r)=>s+r.am.a,0),paid=rows.reduce((s,r)=>s+Math.min(r.paid,r.am.a||r.paid),0),left=rows.reduce((s,r)=>s+r.left,0);
    const okN=rows.filter(r=>r.st==="ok").length,late=rows.filter(r=>r.st==="late"),next=rows.find(r=>r.st!=="ok"&&r.due>=T);
    const wk=rows.filter(r=>r.st!=="ok"&&r.due>=T&&dDiff(T,r.due)<=7);
    const debts=list().filter(it=>it.kind==="debt"&&isOn(it)).map(it=>({it,...debtOf(it)}));
    const dLeft=debts.reduce((s,d)=>s+(d.left||0),0);
    let h=`<div class="fm-prep"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5l3 2"/></svg><div><b>Демо-версия · раздел в доработке</b><span>Суммы и правила ещё уточняются: условия кредита, налог с оборота, зарплаты наличными. Платежи, отметки оплаты и изменения уже сохраняются.</span></div></div><div class="fm-bar">${seg("data-paym",ms.map(m=>[m,mName(m)]),M)}<span class="fm-legend"><i class="ok"></i>оплачено<i class="part"></i>частично<i class="none"></i>впереди<i class="late"></i>просрочено</span></div>`;
    h+=`<section class="kpis">${kpi("Платежи за "+MN[+M.slice(5,7)-1].toLowerCase(),fmt(tot)+" сум",`${rows.length} ${pl(rows.length,"платёж","платежа","платежей")}${rows.some(r=>r.am.est)?" · есть расчётные":""}`)}${kpi("Оплачено",fmt(paid)+" сум",`${okN} из ${rows.length}`,"pay-kok")}${kpi("Осталось оплатить",fmt(left)+" сум",late.length?`<b class="down">просрочено: ${late.length}</b>`:next?`ближайший — ${dLong(next.due)}, ${esc(next.it.name)}`:"всё оплачено",left?"pay-kleft":"")}${kpi("Остаток долгов",dLeft?fmt(dLeft)+" сум":"—",debts.length?`${debts.length} ${pl(debts.length,"долг","долга","долгов")}${debts.some(d=>d.left==null)?" · не у всех указана сумма":""}`:"долгов нет")}</section>`;
    if(P.open)h+=editor(P.open);
    // ближайшая неделя
    if(M===T.slice(0,7)&&(wk.length||late.length))h+=`<section class="panel pay-soon"><div class="rp-ph"><div><h2>Нужно оплатить в ближайшие 7 дней</h2><p class="note">${late.length?"И то, что уже просрочено":"Считая от сегодняшнего дня"}</p></div><span class="pay-sum">${fmt(late.concat(wk).reduce((s,r)=>s+r.left,0))} сум</span></div><div class="pay-chips">${late.concat(wk).map(r=>`<button type="button" class="pay-chip ${r.st}" data-payrow="${esc(r.it.id)}">${ic(r.it.cat)}<span><b>${esc(r.it.name)}</b><small>${dLong(r.due)} · ${fmt(r.left)} сум</small></span></button>`).join("")}</div></section>`;
    // календарь месяца
    const byDay={};rows.forEach(r=>{(byDay[r.due]||(byDay[r.due]=[])).push(r)});
    const days=[];for(let i=1;i<=dim(M);i++)days.push(M+"-"+String(i).padStart(2,"0"));
    const dSt=L=>L.every(r=>r.st==="ok")?"ok":L.some(r=>r.st==="late")?"late":L.some(r=>r.st==="part"||r.st==="ok")?"part":"none";
    h+=`<section class="panel"><div class="rp-ph"><div><h2>Календарь · ${MN[+M.slice(5,7)-1].toLowerCase()}</h2><p class="note">Оплата отмечается сама, когда платёж появляется в выписке р/с или в расходах Кассы. То, что платили иначе, отметьте вручную.</p></div><button type="button" class="sec" data-payadd>＋ Платёж</button></div>
      <div class="rp-days pay-days" role="group" aria-label="Дни месяца">${days.map(d=>{const L=byDay[d];return `<button type="button" class="rp-day${L?"":" pay-empty"}${d===T?" pay-today":""}" data-payday="${d}" ${L?"":"disabled"} title="${dLong(d)}${L?": "+esc(L.map(r=>r.it.name).join(", ")):""}"><small>${wd(d)}</small><b>${+d.slice(8)}</b>${L?`<i class="${dSt(L)}"></i>`:"<i></i>"}</button>`}).join("")}</div>
      ${rows.length?`<div class="tbl"><table class="pay-tbl"><thead><tr><th>День</th><th>Платёж</th><th>Откуда</th><th class="r">Сумма</th><th class="r">Оплачено</th><th>Статус</th></tr></thead><tbody>${rows.map(r=>{const sel=P.row===r.it.id;
        return `<tr class="tap${sel?" pay-sel":""}${r.st==="late"?" pay-late":""}" data-payrow="${esc(r.it.id)}" id="payr-${esc(r.it.id)}"><td><b class="num">${+r.due.slice(8)}</b> <span class="srcs">${wd(r.due)}</span></td><td><div class="pay-nm">${ic(r.it.cat,"sm")}<span><b>${esc(r.it.name)}</b><small>${esc((CATS[r.it.cat]||CATS.other)[0])}${r.it.point&&r.it.point!=="Общее"?" · "+esc(r.it.point):""}${r.it.kind==="plan"?" · разовый":r.it.kind==="debt"?" · погашение долга":""}</small></span></div></td><td>${esc(SRC[r.it.src]||"—")}</td><td class="r num">${fmt(r.am.a)}${r.am.est?'<small class="pay-est">расчётно</small>':""}${r.am.usd?`<small class="pay-est">${fmt(r.am.usd)} $</small>`:""}</td><td class="r num">${r.paid?fmt(r.paid):'<span class="srcs">—</span>'}</td><td>${stPill(r)}</td></tr>`+(sel?`<tr class="pay-detr"><td colspan="6">${detail(r)}</td></tr>`:"")}).join("")}</tbody><tfoot><tr><td></td><td>Итого за месяц</td><td></td><td class="r num">${fmt(tot)}</td><td class="r num">${fmt(paid)}</td><td>${left?`осталось ${fmt(left)}`:pill("ok","Всё оплачено")}</td></tr></tfoot></table></div>`
        :`<div class="pay-empty-st">${ic("other")}<div><b>В ${MNp[+M.slice(5,7)-1]} платежей нет</b><span>Добавьте кредит, аренду, налоги, зарплаты и другие обязательные платежи — они будут появляться каждый месяц сами.</span></div></div>`}</section>`;
    // постоянные платежи
    const fx=list().filter(it=>it.kind==="fixed").sort((a,b)=>(a.on===false)-(b.on===false)||(a.freq==="year")-(b.freq==="year")||(+a.day||1)-(+b.day||1)||String(a.name).localeCompare(String(b.name)));
    h+=`<section class="panel"><div class="rp-ph"><div><h2>Постоянные платежи</h2><p class="note">Повторяются каждый месяц или раз в год. Нажмите карточку, чтобы изменить сумму, день или слова для поиска в выписке.</p></div><span class="pay-sum">${fmt(fx.filter(it=>isOn(it)&&it.freq!=="year").reduce((s,it)=>s+amountOf(it,M).a,0))} сум в месяц</span></div>
      <div class="pay-cards">${fx.map(it=>card(it,M)).join("")}<button type="button" class="pay-card pay-new" data-payadd="fixed"><span class="pay-plus">＋</span><b>Постоянный платёж</b><small>аренда, налог, сервис, зарплата</small></button></div></section>`;
    // долги
    h+=`<section class="panel"><div class="rp-ph"><div><h2>Долги</h2><p class="note">Кредиты, долг учредителю, поставщикам. Погашения считаются по выписке, Кассе и ручным отметкам.</p></div>${dLeft?`<span class="pay-sum">осталось ${fmt(dLeft)} сум</span>`:""}</div>
      <div class="pay-cards">${debts.map(d=>debtCard(d,M)).join("")}<button type="button" class="pay-card pay-new" data-payadd="debt"><span class="pay-plus">＋</span><b>Долг</b><small>кредит, займ, поставщик</small></button></div></section>`;
    // разовые
    const pn=list().filter(it=>it.kind==="plan").sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    h+=`<section class="panel"><div class="rp-ph"><div><h2>Разовые платежи</h2><p class="note">Предоплаты, покупки, налоги за год — то, что нужно заплатить один раз в определённый день.</p></div><button type="button" class="sec" data-payadd="plan">＋ Разовый платёж</button></div>
      ${pn.length?`<div class="tbl"><table class="pay-tbl"><thead><tr><th>Дата</th><th>Платёж</th><th>Откуда</th><th class="r">Сумма</th><th>Статус</th></tr></thead><tbody>${pn.map(it=>{const M2=(it.date||"").slice(0,7),r=M2?row(it,M2):null;
        return `<tr class="tap${isOn(it)?"":" fm-dim"}" data-payedit="${esc(it.id)}"><td>${it.date?`<b class="num">${+it.date.slice(8)}</b> ${MNg[+it.date.slice(5,7)-1]}`:"—"}</td><td><div class="pay-nm">${ic(it.cat,"sm")}<span><b>${esc(it.name)}</b><small>${esc(it.note||(CATS[it.cat]||CATS.other)[0])}</small></span></div></td><td>${esc(SRC[it.src]||"—")}</td><td class="r num">${fmt(amountOf(it,M2||M).a)}</td><td>${r?stPill(r):pill("idle","Без даты")}</td></tr>`}).join("")}</tbody></table></div>`
        :`<p class="note pay-none">Пока нет разовых платежей.</p>`}</section>`;
    el.innerHTML=h;
    requestAnimationFrame(()=>{const box=el.querySelector(".pay-days"),b=box&&(box.querySelector(".pay-today")||box.querySelector(".rp-day:not(.pay-empty)"));if(b&&box.offsetParent)box.scrollLeft=Math.max(0,b.offsetLeft-box.offsetLeft-(box.clientWidth-b.offsetWidth)/2)});
  }
  function card(it,M){
    const r=row(it,M),am=amountOf(it,M);
    const st=!isOn(it)?pill("off","Выключен"):r?stPill(r):pill("idle",it.freq==="year"?"Не в этом месяце":"Не действует");
    return `<button type="button" class="pay-card${isOn(it)?"":" off"}${P.open===it.id?" on":""}" data-payedit="${esc(it.id)}" style="--cc:${(CATS[it.cat]||CATS.other)[1]}">
      <div class="pay-ch">${ic(it.cat)}${st}</div><b class="pay-cn">${esc(it.name)}</b>
      <div class="pay-cv"><span class="num">${fmt(am.a)}</span><small>сум${it.freq==="year"?" в год":" в месяц"}</small></div>
      <div class="pay-cm"><span>${when(it)}</span><span>${esc(SRC[it.src]||"")}${it.auto==="tax"?` · ${+it.pct||0}% безнала`:am.usd?` · ${fmt(am.usd)} $ × ${fmt(rateOf(it))}`:""}</span></div></button>`;
  }
  function debtCard(d,M){
    const it=d.it,r=row(it,M),am=amountOf(it,M);
    return `<button type="button" class="pay-card pay-debt${P.open===it.id?" on":""}" data-payedit="${esc(it.id)}" style="--cc:${(CATS[it.cat]||CATS.debt)[1]}">
      <div class="pay-ch">${ic(it.cat||"debt")}${d.left===0?pill("ok","Погашен"):r?(r.st==="ok"?pill("ok","За месяц оплачено"):stPill(r)):d.total?pill("idle",Math.round(d.pct*100)+"% погашено"):pill("warn","Сумма не указана")}</div><b class="pay-cn">${esc(it.name)}</b>
      <div class="pay-cv"><span class="num">${d.left==null?"—":fmt(d.left)}</span><small>${d.left==null?"остаток неизвестен":"сум осталось"}</small></div>
      ${d.total?`<div class="pay-bar" role="img" aria-label="Погашено ${Math.round(d.pct*100)}%"><i style="width:${(d.pct*100).toFixed(1)}%"></i></div>`:""}
      <div class="pay-cm"><span>${d.total?`всего ${fmt(d.total)}${+it.totalUsd>0?` (${fmt(it.totalUsd)} $)`:""}`:"общая сумма не указана"}</span><span>погашено ${fmt(d.paid)}</span>${am.a?`<span>платёж ${fmt(am.a)} · ${+it.day||1}-го${am.usd?` · ${fmt(am.usd)} $`:""}</span>`:""}</div></button>`;
  }
  function detail(r){
    const it=r.it;
    const hits=r.hits.map(h=>`<div class="fm-dl"><span>${dLong(h.d)} · <span class="srcs">${h.f}</span> ${esc(h.n)}</span><b class="num">${fmt(h.a)}</b></div>`).join("");
    return `<div class="pay-det"><div><h3>Где нашлась оплата</h3>${hits||`<p class="note">${words(it).length?`В выписке и Кассе за ${MN[+r.due.slice(5,7)-1].toLowerCase()} нет строк со словами «${esc(words(it).filter(x=>x[0]!=="-").join("», «"))}».`:"Слова для поиска не заданы — отметьте оплату вручную или добавьте слова в настройках платежа."}</p>`}
        ${r.mk?`<div class="fm-dl"><span>${dLong(r.mk.date||r.due)} · <span class="srcs">отмечено вручную</span></span><b class="num">${fmt(r.mk.amount)}</b></div>`:""}
        ${r.am.est&&it.auto==="tax"?`<p class="note">Расчёт: ${+it.pct||0}% с безналичной выручки за ${MN[+addM(r.due.slice(0,7),-1).slice(5,7)-1].toLowerCase()} — ${fmt(r.am.base)} сум (терминал, QR, перечисления и безналичная часть смешанных чеков).</p>`:""}
        ${it.note?`<p class="note">${esc(it.note)}</p>`:""}</div>
      <div class="pay-acts">${r.st!=="ok"&&!r.mk?`<label class="rp-fld"><span>Оплачено вручную</span><input class="rp-in" id="payMkA" inputmode="decimal" autocomplete="off" value="${fmt(r.left)}"></label><button type="button" data-paymark="${esc(it.id)}">Отметить оплату</button>`:""}
        ${r.mk?`<button type="button" class="sec" data-payunmark="${esc(it.id)}">Снять ручную отметку</button>`:""}<button type="button" class="sec" data-payedit="${esc(it.id)}">Изменить платёж</button></div></div>`;
  }
  function editor(id){
    const cur=id==="new"?null:items[id];const f=P.form||(P.form=Object.assign({kind:"fixed",cat:"other",src:"bank",freq:"month",day:1,point:"Общее",cur:"sum"},cur?JSON.parse(JSON.stringify(cur)):{},cur?{cur:+cur.usd>0?"usd":"sum"}:{}));
    const v=(k,d)=>f[k]==null?(d==null?"":d):f[k];
    const fld=(k,l,val,hint,o)=>`<label class="rp-fld"><span>${l}</span><input class="rp-in" data-payf="${k}" ${o&&o.type?`type="${o.type}"`:'inputmode="decimal"'} autocomplete="off" value="${esc(val)}" placeholder="${esc(o&&o.ph||"0")}"><span class="rp-hint">${hint||""}</span></label>`;
    const money=k=>f[k]==null||f[k]===""?"":fmt(f[k]);
    const kind=f.kind,usd=f.cur==="usd",tax=f.auto==="tax";
    const am=usd?Math.round((+f.usd||0)*(+f.rate||0)):0;
    let h=`<section class="panel pay-ed" id="payEd" style="--cc:${(CATS[f.cat]||CATS.other)[1]}"><div class="rp-ph"><div><h2>${ic(f.cat,"sm")}${cur?esc(cur.name):"Новый платёж"}</h2><p class="note">${kind==="debt"?"Долг: общая сумма и, если есть, ежемесячный платёж":kind==="plan"?"Разовый платёж в определённый день":"Повторяется каждый месяц или раз в год"}</p></div><button type="button" class="ghost fm-x" data-payclose aria-label="Закрыть">✕</button></div>
      <div class="pay-frow">${seg("data-paykind",KINDS,kind)}</div>
      <div class="pay-frow pay-cats">${Object.entries(CATS).map(([k,[l]])=>`<button type="button" class="pay-cat${f.cat===k?" on":""}" data-paycat="${k}" style="--cc:${CATS[k][1]}">${ic(k,"sm")}<span>${l}</span></button>`).join("")}</div>
      <div class="fm-f3">${fld("name","Название",v("name"),"",{type:"text",ph:"Например: Аренда Премиума"})}
        <label class="rp-fld"><span>Откуда платим</span>${seg("data-paysrc",Object.entries(SRC),f.src)}<span class="rp-hint">${f.src==="founder"?"из личных денег — в выписке не ищем, отметьте вручную":"там и ищем оплату"}</span></label>
        <label class="rp-fld"><span>Точка</span><select class="rp-in" data-payf="point">${["Общее"].concat(POINTS()).map(p=>`<option${p===f.point?" selected":""}>${esc(p)}</option>`).join("")}</select><span class="rp-hint"></span></label></div>`;
    // сумма
    h+=`<div class="fm-f3">`;
    if(f.cat==="tax")h+=`<label class="tgl fm-tgl pay-tgl"><input type="checkbox" role="switch" data-paytax${tax?" checked":""}><span class="tg" aria-hidden="true"></span><span>Считать сам: процент с безнала прошлого месяца</span></label>`;
    if(tax)h+=fld("pct","Процент с безналичной выручки",v("pct",4),`за ${MN[+addM(P.m||today().slice(0,7),-1).slice(5,7)-1].toLowerCase()}: ${fmt(cashless(addM(P.m||today().slice(0,7),-1)))} сум безнала → ${fmt(cashless(addM(P.m||today().slice(0,7),-1))*(+f.pct||0)/100)} сум`);
    else{h+=`<label class="rp-fld"><span>Валюта</span>${seg("data-paycur",[["sum","Сумы"],["usd","Доллары"]],f.cur)}<span class="rp-hint">${usd?"сумма в сумах = доллары × курс":""}</span></label>`;
      h+=usd?fld("usd",kind==="debt"?"Платёж в месяц, $":"Сумма, $",money("usd"),kind==="debt"?"пусто — без графика":"")+fld("rate","Курс, сум за $",money("rate"),am?`≈ ${fmt(am)} сум`:"")
        :fld("amount",kind==="debt"?"Платёж в месяц, сум":"Сумма, сум",money("amount"),kind==="debt"?"пусто — без графика платежей":"")}
    h+=`</div>`;
    // срок
    h+=`<div class="fm-f3">`;
    if(kind==="plan")h+=fld("date","Дата платежа",v("date"),"",{type:"date"});
    else{h+=`<label class="rp-fld"><span>Как часто</span>${seg("data-payfreq",[["month","Каждый месяц"],["year","Раз в год"]],f.freq||"month")}<span class="rp-hint"></span></label>`+fld("day","День месяца",v("day",1),"если в месяце нет такого дня — последний день",{ph:"1"});
      if(f.freq==="year")h+=`<label class="rp-fld"><span>Месяц</span><select class="rp-in" data-payf="mon">${MN.map((m,i)=>`<option value="${i+1}"${+f.mon===i+1?" selected":""}>${m}</option>`).join("")}</select><span class="rp-hint"></span></label>`}
    h+=`</div>`;
    if(kind!=="plan")h+=`<div class="fm-f3">${fld("from","Действует с",v("from"),"месяц первого платежа",{type:"month"})}${fld("to","Действует по",v("to"),"пусто — без конца",{type:"month"})}</div>`;
    if(kind==="debt")h+=`<div class="fm-f3">${usd?fld("totalUsd","Общая сумма долга, $",money("totalUsd"),f.totalUsd&&f.rate?`≈ ${fmt(f.totalUsd*f.rate)} сум`:""):fld("total","Общая сумма долга, сум",money("total"),"")}${fld("paid0","Погашено до учёта, сум",money("paid0"),"то, что отдали до начала учёта здесь")}</div>`;
    h+=`<div class="fm-f3">${fld("match","Слова для поиска в выписке и Кассе",v("match"),"через запятую: «кредит», «аренд»; слово с минусом исключает: «-ндфл»",{type:"text",ph:"например: кредит"})}${fld("note","Примечание",v("note"),"",{type:"text",ph:""})}
      <label class="tgl fm-tgl pay-tgl"><input type="checkbox" role="switch" data-payon${f.on===false?"":" checked"}><span class="tg" aria-hidden="true"></span><span>Платёж действует</span></label></div>`;
    if(kind==="debt"&&cur){const pays=(cur.pays||[]);h+=`<div class="pay-pays"><h3>Погашения вручную</h3>${pays.map((p,i)=>`<div class="fm-dl"><span>${p.date?dLong(p.date)+" "+p.date.slice(0,4):"—"}${p.note?` · ${esc(p.note)}`:""}</span><span><b class="num">${fmt(p.amount)}</b> <button type="button" class="ghost pay-xs" data-paydelpay="${i}" aria-label="Удалить погашение">✕</button></span></div>`).join("")||'<p class="note">Пока нет. Погашения из выписки и Кассы считаются сами по словам для поиска.</p>'}
      <div class="pay-addpay"><input class="rp-in" type="date" id="payPd" value="${today()}" aria-label="Дата погашения"><input class="rp-in" id="payPa" inputmode="decimal" placeholder="Сумма" aria-label="Сумма погашения"><input class="rp-in" id="payPn" placeholder="Примечание" aria-label="Примечание"><button type="button" class="sec" data-payaddpay>＋ Погашение</button></div></div>`}
    h+=`<div class="fm-acts"><button type="button" data-paysave>Сохранить</button><button type="button" class="sec" data-payclose>Отмена</button>${cur?`<button type="button" class="ghost del" data-paydel>${P.del?"Точно удалить?":"Удалить платёж"}</button>`:""}<span class="pay-msg" id="payMsg"></span></div></section>`;
    return h;
  }

  // ---------- запись ----------
  function readForm(){const f=P.form;document.querySelectorAll("#payEd [data-payf]").forEach(i=>{const k=i.dataset.payf;
    if(["amount","usd","rate","total","totalUsd","paid0","pct","day"].includes(k)){const x=num(i.value);f[k]=x==null?null:x}else f[k]=i.value});return f}
  async function save(){
    const f=readForm(),msg=$("payMsg");const name=String(f.name||"").trim();if(!name){msg.textContent="Укажите название";return}
    if(f.kind==="plan"&&!f.date){msg.textContent="Укажите дату платежа";return}
    const id=P.open==="new"?"pay_"+Date.now().toString(36):P.open;const old=items[id]||{};
    const o={name,kind:f.kind,cat:f.cat,src:f.src,point:f.point||"Общее",match:String(f.match||"").trim(),note:String(f.note||"").trim(),on:f.on!==false,createdAt:old.createdAt||Date.now()-1000,updatedAt:Date.now()-1000};
    if(f.cat==="tax"&&f.auto==="tax"){o.auto="tax";o.pct=+f.pct||0}
    else if(f.cur==="usd"){o.usd=+f.usd||0;o.rate=+f.rate||0}else o.amount=+f.amount||0;
    if(f.kind==="plan")o.date=f.date;else{o.freq=f.freq||"month";o.day=Math.min(31,Math.max(1,Math.round(+f.day||1)));if(o.freq==="year")o.mon=+f.mon||1;if(f.from)o.from=f.from;if(f.to)o.to=f.to}
    if(f.kind==="debt"){if(f.cur==="usd"&&+f.totalUsd>0)o.totalUsd=+f.totalUsd;else if(+f.total>0)o.total=+f.total;if(+f.paid0>0)o.paid0=+f.paid0;if(old.pays)o.pays=old.pays}
    try{items[id]=Object.assign({id},o);if(db)await db.doc("payments/"+id).set(o);P.open=null;P.form=null;P.del=false;toast("Платёж сохранён");render()}catch(e){msg.textContent="Не удалось сохранить"}
  }
  async function delItem(){const id=P.open;if(!P.del){P.del=true;readForm();render();return}
    try{if(db)await db.doc("payments/"+id).delete();delete items[id];P.open=null;P.form=null;P.del=false;toast("Платёж удалён");render()}catch(e){toast("Не удалось удалить",true)}}
  async function mark(id){const it=items[id];if(!it)return;const r=row(it,P.m);const a=num($("payMkA")&&$("payMkA").value);const amount=a==null?r.left:a;
    const T=today(),d=P.m===T.slice(0,7)?T:r.due;
    try{const k=id+"_"+P.m,o={amount,date:d,at:Date.now()-1000};marks[k]=o;if(db)await db.doc("paymarks/"+k).set(o);toast("Оплата отмечена");render()}catch(e){toast("Не удалось сохранить",true)}}
  async function unmark(id){const k=id+"_"+P.m;try{if(db)await db.doc("paymarks/"+k).delete();delete marks[k];render()}catch(e){toast("Не удалось снять отметку",true)}}
  async function addPay(){const id=P.open,it=items[id];if(!it)return;const a=num($("payPa").value);if(!a){toast("Укажите сумму погашения",true);return}
    const pays=(it.pays||[]).concat([{date:$("payPd").value||today(),amount:a,note:$("payPn").value.trim()}]);readForm();
    try{const o=Object.assign({},it,{pays});delete o.id;if(db)await db.doc("payments/"+id).set(o);items[id]=Object.assign({id},o);toast("Погашение добавлено");render()}catch(e){toast("Не удалось сохранить",true)}}
  async function delPay(i){const id=P.open,it=items[id];if(!it)return;const pays=(it.pays||[]).filter((_,j)=>j!==i);readForm();
    try{const o=Object.assign({},it,{pays});delete o.id;if(db)await db.doc("payments/"+id).set(o);items[id]=Object.assign({id},o);render()}catch(e){toast("Не удалось удалить",true)}}
  async function xlsx(){
    if(typeof XLSX==="undefined"){toast("Excel ещё загружается",true);return}const M=P.m;
    const ws=XLSX.utils.json_to_sheet(monthRows(M).map(r=>({"День":r.due,"Платёж":r.it.name,"Категория":(CATS[r.it.cat]||CATS.other)[0],"Вид":KINDS.find(k=>k[0]===r.it.kind)[1],"Откуда":SRC[r.it.src]||"","Точка":r.it.point||"","Сумма":r.am.a,"Оплачено":r.paid,"Осталось":r.left,"Статус":{ok:"Оплачено",part:"Частично",late:"Просрочено",today:"Сегодня",soon:"Впереди"}[r.st]})));
    const ws2=XLSX.utils.json_to_sheet(list().filter(it=>it.kind==="debt").map(it=>{const d=debtOf(it);return {"Долг":it.name,"Всего":d.total||null,"Погашено":d.paid,"Осталось":d.left,"Примечание":it.note||""}}));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Платежи "+M);XLSX.utils.book_append_sheet(wb,ws2,"Долги");
    const out=XLSX.write(wb,{type:"array",bookType:"xlsx"});const dl=await window.claude.use("downloads");
    await dl.save({filename:`Платежи ${mName(M)}.xlsx`,data:new Blob([out],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})});toast("Файл скачан");
  }

  // ---------- события ----------
  const open=(id,kind)=>{P.open=id;P.del=false;P.form=null;if(id==="new"){editor("new");if(kind)P.form.kind=kind;if(kind==="debt")P.form.cat="debt";P.form.from=P.m}render();requestAnimationFrame(()=>{const e=$("payEd");if(e)e.scrollIntoView({behavior:"smooth",block:"start"})})};
  document.addEventListener("click",e=>{
    if(!e.target.closest("#page-pay"))return;const t=e.target;let b;
    if((b=t.closest("[data-paym]"))){P.m=b.dataset.paym;ls.set("m",P.m);P.row=null;render();return}
    if((b=t.closest("[data-payadd]"))||t.closest("#payAdd")){open("new",b&&b.dataset.payadd);return}
    if((b=t.closest("[data-payedit]"))){open(b.dataset.payedit);return}
    if((b=t.closest("[data-paymark]"))){mark(b.dataset.paymark);return}
    if((b=t.closest("[data-payunmark]"))){unmark(b.dataset.payunmark);return}
    if(t.closest("#payXlsx")){xlsx().catch(()=>toast("Не удалось выгрузить",true));return}
    if((b=t.closest("[data-payday]"))){const r=monthRows(P.m).find(x=>x.due===b.dataset.payday);if(r){P.row=r.it.id;render();const tr=$("payr-"+r.it.id);tr&&tr.scrollIntoView({behavior:"smooth",block:"center"})}return}
    if((b=t.closest("[data-payrow]"))&&!t.closest(".pay-detr")){const id=b.dataset.payrow;P.row=P.row===id?null:id;if(b.classList.contains("pay-chip")&&P.m!==today().slice(0,7))P.m=today().slice(0,7);render();if(b.classList.contains("pay-chip")){const tr=$("payr-"+id);tr&&tr.scrollIntoView({behavior:"smooth",block:"center"})}return}
    if(!t.closest("#payEd"))return;
    if(t.closest("[data-payclose]")){P.open=null;P.form=null;P.del=false;render();return}
    if(t.closest("[data-paysave]")){save();return}
    if(t.closest("[data-paydel]")){delItem();return}
    if(t.closest("[data-payaddpay]")){addPay();return}
    if((b=t.closest("[data-paydelpay]"))){delPay(+b.dataset.paydelpay);return}
    const setF=(k,v)=>{readForm();P.form[k]=v;render()};
    if((b=t.closest("[data-paykind]"))){readForm();P.form.kind=b.dataset.paykind;if(P.form.kind==="debt"&&P.form.cat==="other")P.form.cat="debt";render();return}
    if((b=t.closest("[data-paycat]"))){readForm();P.form.cat=b.dataset.paycat;if(P.form.cat!=="tax")delete P.form.auto;render();return}
    if((b=t.closest("[data-paysrc]"))){setF("src",b.dataset.paysrc);return}
    if((b=t.closest("[data-paycur]"))){setF("cur",b.dataset.paycur);return}
    if((b=t.closest("[data-payfreq]"))){setF("freq",b.dataset.payfreq);return}
  });
  document.addEventListener("change",e=>{const t=e.target;if(!t.closest||!t.closest("#payEd"))return;
    if(t.matches("[data-paytax]")){readForm();P.form.auto=t.checked?"tax":null;if(t.checked&&P.form.pct==null)P.form.pct=4;render()}
    else if(t.matches("[data-payon]")){readForm();P.form.on=t.checked}
    else if(t.matches('[data-payf="mon"],[data-payf="point"]'))readForm();});
  document.addEventListener("focusout",e=>{const i=e.target;if(i&&i.matches&&i.matches('#payEd [data-payf="amount"],#payEd [data-payf="usd"],#payEd [data-payf="rate"],#payEd [data-payf="total"],#payEd [data-payf="totalUsd"],#payEd [data-payf="paid0"],#payPa,#payMkA')){const v=num(i.value);i.value=v==null?"":fmt(v);
      if(i.closest("#payEd")&&/usd|rate|totalUsd/.test(i.dataset.payf||"")){readForm();render()}}});
  document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.closest&&e.target.closest("#payEd")&&e.target.tagName==="INPUT"){e.preventDefault();save()}});
  const curTab=()=>{const t=document.querySelector('.tabs .tab[aria-selected="true"]');return t&&t.dataset.tab};
  function rerender(){if(curTab()==="pay"&&!P.open)render()}
  document.addEventListener("sales-updated",()=>setTimeout(rerender,0));
  document.addEventListener("kassa-updated",()=>setTimeout(rerender,0));
  window.__PAY={render,monthRows,amountOf,dueOf,hitsOf,debtOf,cashless,get items(){return items},get marks(){return marks}};
})();
