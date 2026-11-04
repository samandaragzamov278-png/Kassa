/* Касса · «Платежи»: постоянные и разовые платежи, долги — что оплачено и что впереди.
   Данные: payments/<id> {name, kind:"fixed"|"plan"|"debt", cat, amount, usd, rate, auto:"tax", pct, day, freq:"month"|"year", mon,
             date, from, to, src:"bank"|"cash"|"founder", point, match:"слова через запятую, -слово исключает", total, totalUsd, paid0,
             pays:[{date,amount,note}], note, on, createdAt}
           paymarks/<id>_<YYYY-MM> {amount — оплачено вручную, plan — своя сумма на этот месяц, date, at}.
   Оплата находится сама: строки выписки р/с (report.bank) и расходы Кассы (entries) месяца со словами из match.
   Любую цифру можно поменять на месте: сумму месяца, оплачено, сумму и день платежа, откуда платим, вкл/выкл. */
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
  const CATS={credit:"Кредит",rent:"Аренда",tax:"Налоги",salary:"Зарплаты",service:"Сервисы",utility:"Коммунальные",debt:"Долги",other:"Прочее"};
  const KINDS=[["fixed","Постоянный"],["plan","Разовый"],["debt","Долг"]];
  const SRC={bank:"Р/с",cash:"Касса",founder:"Учредитель"};
  const ic=(c,cls)=>`<span class="py-ic ${cls||""}"><svg viewBox="0 0 24 24" aria-hidden="true">${IC[c]||IC.other}</svg></span>`;
  const ST={ok:["ok","Оплачено"],part:["part","Частично"],late:["late","Просрочено"],today:["today","Сегодня"],soon:["soon","Впереди"]};

  // ---------- данные ----------
  let items={},marks={},db=null;
  (async()=>{try{db=await window.claude.use("db");if(!db)return;
    db.collection("payments").onSnapshot(s=>{const o={};s.forEach(d=>{o[d.id]=Object.assign({id:d.id},d.data())});items=o;rerender()},()=>{});
    db.collection("paymarks").onSnapshot(s=>{const o={};s.forEach(d=>{o[d.id]=d.data()});marks=o;rerender()},()=>{});
  }catch(e){}})();
  const list=()=>Object.values(items).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  const isOn=it=>it.on!==false;
  const inRange=(it,M)=>(!it.from||M>=it.from)&&(!it.to||M<=it.to);
  const markOf=(it,M)=>marks[it.id+"_"+M]||null;

  function cashless(M){let t=0;(S()&&S().sales||[]).forEach(s=>{if(!s.date||!s.date.startsWith(M))return;
    if(s.pay==="Смешанная"&&s.pays&&typeof s.pays==="object")Object.entries(s.pays).forEach(([k,v])=>{if(k!=="Наличные")t+=+v||0});
    else if(s.pay&&s.pay!=="Наличные")t+=+s.sum||0});return t}
  const rateOf=it=>+it.rate||0;
  function baseAmount(it,M){
    if(it.auto==="tax"){const base=cashless(addM(M,-1));return {a:Math.round(base*(+it.pct||0)/100),est:true,base}}
    if(+it.usd>0)return {a:Math.round(+it.usd*rateOf(it)),usd:+it.usd};
    return {a:Math.round(+it.amount||0)};
  }
  // сумма за месяц: своя сумма на месяц важнее общей
  function amountOf(it,M){const b=baseAmount(it,M),mk=markOf(it,M);if(mk&&mk.plan!=null)return Object.assign({},b,{a:Math.round(+mk.plan||0),own:true,est:false});return b}
  function dueOf(it,M){
    if(!isOn(it))return null;
    if(it.kind==="plan")return it.date&&it.date.startsWith(M)?it.date:null;
    if(!inRange(it,M))return null;
    if(it.kind==="debt"&&!(+it.amount>0||+it.usd>0))return null;
    if(it.freq==="year"&&+it.mon!==+M.slice(5,7))return null;
    const d=Math.min(Math.max(1,+it.day||1),dim(M));return M+"-"+String(d).padStart(2,"0");
  }
  const words=it=>String(it.match||"").split(/[,;|]/).map(s=>s.trim().toLowerCase()).filter(Boolean);
  function hitsOf(it,M){
    const all=words(it),w=all.filter(x=>x[0]!=="-"),no=all.filter(x=>x[0]==="-").map(x=>x.slice(1).trim()).filter(Boolean);if(!w.length)return [];
    const has=n=>{n=String(n||"").toLowerCase();return w.some(x=>n.includes(x))&&!no.some(x=>n.includes(x))};
    const out=[];
    if(it.src!=="cash"){const R=S()&&S().repDocs||{};Object.keys(R).forEach(d=>{if(!d.startsWith(M))return;(R[d].bank||[]).forEach(b=>{if(has(b.n))out.push({d,n:b.n,a:+b.a||0,f:"р/с"})})})}
    if(it.src!=="bank"){(K()&&K().entries||[]).forEach(e=>{if(e.type!=="exp"||e.kind==="bc"||!e.date||!e.date.startsWith(M))return;if(!has(e.name))return;
      out.push({d:e.date,n:e.name,a:typeof e.fact==="number"?e.fact:(+e.amount||0),f:e.fund==="reserve"?"резерв":"касса"})})}
    return out.sort((a,b)=>a.d.localeCompare(b.d));
  }
  function row(it,M){
    const due=dueOf(it,M);if(!due)return null;
    const am=amountOf(it,M),hits=hitsOf(it,M),mk=markOf(it,M);
    const auto=hits.reduce((s,h)=>s+h.a,0),man=mk&&mk.amount!=null?+mk.amount||0:0,paid=auto+man;
    const T=today(),left=Math.max(0,am.a-paid);
    let st;if(am.a>0&&paid>=am.a*0.98||(!am.a&&paid>0))st="ok";else if(paid>0)st="part";else if(due<T)st="late";else if(due===T)st="today";else st="soon";
    return {it,due,am,hits,mk,auto,man,paid,left,st};
  }
  const monthRows=M=>list().map(it=>row(it,M)).filter(Boolean).sort((a,b)=>a.due.localeCompare(b.due)||(b.am.a-a.am.a));
  function debtOf(it){
    const rate=rateOf(it);const total=+it.totalUsd>0?Math.round(+it.totalUsd*(rate||0)):+it.total||0;
    let paid=+it.paid0||0;(it.pays||[]).forEach(p=>paid+=+p.amount||0);
    const first=it.from||"2026-01",last=today().slice(0,7);
    for(let M=first;M<=last;M=addM(M,1)){hitsOf(it,M).forEach(h=>paid+=h.a);const mk=markOf(it,M);if(mk&&mk.amount!=null)paid+=+mk.amount||0}
    return {total,paid,left:total?Math.max(0,total-paid):null,pct:total?Math.min(1,paid/total):null};
  }

  // ---------- элементы ----------
  const kpi=(l,v,d,cls,extra)=>`<div class="kpi ${cls||""}"><span class="eyebrow">${l}</span><div class="kv2"><span class="v">${v}</span>${extra||""}</div><span class="d">${d||"&nbsp;"}</span></div>`;
  const seg=(attr,opts,cur,cls)=>`<div class="seg ${cls||""}" role="group">${opts.map(([v,l])=>`<button type="button" ${attr}="${esc(v)}" aria-pressed="${String(v)===String(cur)}">${l}</button>`).join("")}</div>`;
  const ring=(p,col)=>{const r=15,c=2*Math.PI*r;return `<svg class="py-ring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="${r}" class="bg"/><circle cx="20" cy="20" r="${r}" class="fg" style="stroke:${col}" stroke-dasharray="${(c*Math.max(0,Math.min(1,p))).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 20 20)"/></svg>`};
  // число, которое правится на месте: выглядит как текст, по нажатию — поле ввода
  const inl=(key,val,opt)=>`<input class="py-inl${opt&&opt.cls?" "+opt.cls:""}" data-inl="${esc(key)}" inputmode="decimal" autocomplete="off" value="${val==null||val===""?"":esc(opt&&opt.raw?val:fmt(val))}" placeholder="${esc(opt&&opt.ph||"0")}" aria-label="${esc(opt&&opt.label||"Изменить")}" title="Нажмите, чтобы изменить">`;
  function chip(r){const T=today();const [c,l]=ST[r.st];let t=l;
    if(r.st==="late"){const n=dDiff(r.due,T);t=`Просрочено · ${n} ${pl(n,"день","дня","дней")}`}
    else if(r.st==="soon"){const n=dDiff(T,r.due);t=n===1?"Завтра":`Через ${n} ${pl(n,"день","дня","дней")}`}
    const act=r.st==="ok"?(r.man&&!r.auto?"Снять отметку":"Оплачено по выписке"):"Отметить оплату";
    return `<button type="button" class="py-chip ${c}" data-pytoggle="${esc(r.it.id)}" title="${act}"><i></i>${t}</button>`}
  function toast(t,bad){let el=$("bzToast");if(!el){el=document.createElement("div");el.id="bzToast";el.className="bz-toast";document.body.appendChild(el)}el.textContent=t;el.classList.toggle("bad",!!bad);el.classList.add("on");clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove("on"),2400)}

  // ---------- страница ----------
  const P={m:ls.get("m",""),open:null,row:null,del:false,form:null,tab:ls.get("tab","fixed")};
  function render(){
    const el=$("payBody");if(!el)return;
    const T=today();if(!P.m)P.m=T.slice(0,7);
    const M=P.m,rows=monthRows(M);
    const tot=rows.reduce((s,r)=>s+r.am.a,0),paid=rows.reduce((s,r)=>s+Math.min(r.paid,r.am.a||r.paid),0),left=rows.reduce((s,r)=>s+r.left,0);
    const okN=rows.filter(r=>r.st==="ok").length,late=rows.filter(r=>r.st==="late"),next=rows.find(r=>r.st!=="ok"&&r.due>=T);
    const debts=list().filter(it=>it.kind==="debt"&&isOn(it)).map(it=>({it,...debtOf(it)}));
    const dLeft=debts.reduce((s,d)=>s+(d.left||0),0);
    let h=`<div class="py-top"><div class="py-month"><button type="button" class="sec py-arw" data-pym="-1" aria-label="Прошлый месяц">‹</button><b>${mName(M)}</b><button type="button" class="sec py-arw" data-pym="1" aria-label="Следующий месяц">›</button>${M!==T.slice(0,7)?`<button type="button" class="sec py-now" data-pym="0">Сегодня</button>`:""}</div>
      <span class="py-demo">Демо · раздел в доработке: цифры можно менять, всё сохраняется</span></div>`;
    h+=`<section class="kpis py-kpis">${kpi("Платежи за "+MN[+M.slice(5,7)-1].toLowerCase(),fmt(tot)+" сум",`${rows.length} ${pl(rows.length,"платёж","платежа","платежей")}`)}${kpi("Оплачено",fmt(paid)+" сум",`${okN} из ${rows.length}`,"py-kok",ring(tot?paid/tot:0,"var(--plus)"))}${kpi("Осталось оплатить",fmt(left)+" сум",late.length?`<b class="down">просрочено: ${late.length}</b>`:next?`ближайший — ${dLong(next.due)}, ${esc(next.it.name)}`:"всё оплачено")}${kpi("Остаток долгов",dLeft?fmt(dLeft)+" сум":"—",debts.length?`${debts.length} ${pl(debts.length,"долг","долга","долгов")}`:"долгов нет")}</section>`;
    h+=`<div class="py-grid"><section class="panel py-main">${monthList(M,rows,tot,paid,left)}</section><aside class="py-side">${sideSoon(rows,M)}${sideDebts(debts)}${sideCats(rows)}</aside></div>`;
    h+=`<section class="panel py-set">${settings(M)}</section>`;
    el.innerHTML=h+(P.open?drawer(P.open):"");
    if(P.open)requestAnimationFrame(()=>{const d=$("pyDrawer");d&&d.classList.add("on")});
  }
  function monthList(M,rows,tot,paid,left){
    const T=today();
    let h=`<div class="rp-ph"><div><h2>Платежи · ${MN[+M.slice(5,7)-1].toLowerCase()}</h2><p class="note">Нажмите на сумму, чтобы поставить другую сумму только на этот месяц, на «Оплачено» — чтобы поправить, сколько уже заплатили. Статус — отметить оплату одним нажатием.</p></div><button type="button" class="sec" data-pyadd>＋ Платёж</button></div>`;
    if(!rows.length)return h+`<div class="py-empty">${ic("other")}<div><b>В ${MNp[+M.slice(5,7)-1]} платежей нет</b><span>Добавьте кредит, аренду, налоги и зарплаты — они будут появляться каждый месяц сами.</span></div></div>`;
    const wk=[[1,7],[8,14],[15,21],[22,28],[29,31]];
    h+=`<div class="py-list" role="table"><div class="py-hd" role="row"><span>День</span><span>Платёж</span><span class="r">Сумма</span><span class="r">Оплачено</span><span>Статус</span></div>`;
    wk.forEach(([a,b])=>{const L=rows.filter(r=>{const d=+r.due.slice(8);return d>=a&&d<=b});if(!L.length)return;
      const bb=Math.min(b,dim(M));
      h+=`<div class="py-wk"><span>${a}–${bb} ${MNg[+M.slice(5,7)-1]}</span><span>${fmt(L.reduce((s,r)=>s+r.am.a,0))} сум</span></div>`;
      L.forEach(r=>{const it=r.it,sel=P.row===it.id;
        h+=`<div class="py-row ${r.st}${sel?" sel":""}${r.due===T?" now":""}" role="row" id="pyr-${esc(it.id)}">
          <button type="button" class="py-day" data-pyrow="${esc(it.id)}" aria-expanded="${sel}"><b>${+r.due.slice(8)}</b><small>${wd(r.due)}</small></button>
          <button type="button" class="py-nm" data-pyrow="${esc(it.id)}" aria-expanded="${sel}">${ic(it.cat,"sm")}<span><b>${esc(it.name)}</b><small>${esc(CATS[it.cat]||CATS.other)} · ${esc(SRC[it.src]||"")}${it.point&&it.point!=="Общее"?" · "+esc(it.point):""}${it.kind==="plan"?" · разовый":it.kind==="debt"?" · погашение долга":""}</small></span></button>
          <span class="r py-am">${inl("plan|"+it.id,r.am.a,{label:"Сумма за месяц"})}${r.am.own?`<button type="button" class="py-reset" data-pyreset="${esc(it.id)}" title="Вернуть общую сумму ${fmt(baseAmount(it,M).a)}">своя сумма ↺</button>`:r.am.est?`<small>расчётно</small>`:r.am.usd?`<small>${fmt(r.am.usd)} $</small>`:""}</span>
          <span class="r py-pd">${inl("paid|"+it.id,r.paid||null,{label:"Оплачено",ph:"—"})}${r.auto?`<small>по выписке ${fmt(r.auto)}</small>`:""}</span>
          <span>${chip(r)}</span></div>`+(sel?detail(r):"")});
    });
    h+=`<div class="py-ft"><span>Итого за месяц</span><span class="r">${fmt(tot)}</span><span class="r">${fmt(paid)}</span><span>${left?`осталось ${fmt(left)}`:'<span class="py-chip ok"><i></i>Всё оплачено</span>'}</span></div></div>`;
    return h;
  }
  function detail(r){
    const it=r.it;
    const hits=r.hits.map(h=>`<div class="py-dl"><span>${dLong(h.d)} · <em>${h.f}</em> ${esc(h.n)}</span><b>${fmt(h.a)}</b></div>`).join("");
    return `<div class="py-det"><div><h4>Где нашлась оплата</h4>${hits||`<p class="note">${words(it).length?`В выписке и Кассе за ${MN[+r.due.slice(5,7)-1].toLowerCase()} строк со словами «${esc(words(it).filter(x=>x[0]!=="-").join("», «"))}» нет.`:"Слова для поиска не заданы — отмечайте оплату вручную."}</p>`}
      ${r.man?`<div class="py-dl"><span>${r.mk&&r.mk.date?dLong(r.mk.date):""} · <em>вручную</em></span><b>${fmt(r.man)}</b></div>`:""}
      ${it.auto==="tax"&&!r.am.own?`<p class="note">${+it.pct||0}% с безнала за ${MN[+addM(r.due.slice(0,7),-1).slice(5,7)-1].toLowerCase()}: ${fmt(r.am.base)} сум.</p>`:""}${it.note?`<p class="note">${esc(it.note)}</p>`:""}</div>
      <div class="py-dact"><button type="button" class="sec" data-pyedit="${esc(it.id)}">Все настройки платежа</button></div></div>`;
  }
  function sideSoon(rows,M){
    const T=today();if(M!==T.slice(0,7))return "";
    const L=rows.filter(r=>r.st!=="ok"&&(r.due<T||dDiff(T,r.due)<=7));
    return `<section class="panel py-card"><h3>Ближайшие 7 дней</h3>${L.length?`<div class="py-mini">${L.map(r=>`<button type="button" class="py-mi ${r.st}" data-pyrow="${esc(r.it.id)}"><span class="py-dot"></span><span><b>${esc(r.it.name)}</b><small>${dLong(r.due)}${r.st==="late"?" · просрочено":""}</small></span><b class="num">${fmt(r.left)}</b></button>`).join("")}</div><div class="py-sum"><span>Нужно</span><b>${fmt(L.reduce((s,r)=>s+r.left,0))} сум</b></div>`:`<p class="note">На неделю вперёд всё оплачено.</p>`}</section>`;
  }
  function sideDebts(debts){
    return `<section class="panel py-card"><h3>Долги</h3>${debts.length?debts.map(d=>`<button type="button" class="py-debt" data-pyedit="${esc(d.it.id)}"><span class="py-dh"><b>${esc(d.it.name)}</b><span class="num">${d.left==null?"сумма не указана":fmt(d.left)+" сум"}</span></span>${d.total?`<span class="py-bar"><i style="width:${(d.pct*100).toFixed(1)}%"></i></span><small>погашено ${fmt(d.paid)} из ${fmt(d.total)} · ${Math.round(d.pct*100)}%</small>`:`<small>погашено ${fmt(d.paid)}</small>`}</button>`).join(""):`<p class="note">Долгов нет.</p>`}<button type="button" class="sec py-wide" data-pyadd="debt">＋ Долг</button></section>`;
  }
  function sideCats(rows){
    const by={};rows.forEach(r=>{by[r.it.cat||"other"]=(by[r.it.cat||"other"]||0)+r.am.a});const E=Object.entries(by).sort((a,b)=>b[1]-a[1]);const mx=Math.max(1,...E.map(e=>e[1]));
    return E.length?`<section class="panel py-card"><h3>По статьям</h3><div class="py-cats">${E.map(([k,v])=>`<div class="py-cr"><span>${ic(k,"xs")}${esc(CATS[k]||CATS.other)}</span><b class="num">${fmt(v)}</b><span class="py-cb"><i style="width:${(v/mx*100).toFixed(1)}%"></i></span></div>`).join("")}</div></section>`:"";
  }
  // настройка платежей: сумма, день, откуда, вкл/выкл — правятся прямо в строке
  function settings(M){
    const L=list().filter(it=>it.kind===P.tab).sort((a,b)=>(a.on===false)-(b.on===false)||(a.kind==="plan"?String(a.date).localeCompare(String(b.date)):(+a.day||1)-(+b.day||1)));
    const cnt=k=>list().filter(it=>it.kind===k).length;
    let h=`<div class="rp-ph"><div><h2>Настройка платежей</h2><p class="note">Общие суммы и дни. Меняйте прямо в строке — сохраняется сразу. Остальное — «⋯».</p></div><div class="py-sh">${seg("data-pytab",KINDS.map(([k,l])=>[k,`${l} <span class="srcs">${cnt(k)}</span>`]),P.tab)}<button type="button" data-pyadd="${P.tab}">＋ Добавить</button></div></div>`;
    if(!L.length)return h+`<p class="note">Пока пусто.</p>`;
    const isPlan=P.tab==="plan",isDebt=P.tab==="debt";
    h+=`<div class="py-set-l"><div class="py-sr py-shd"><span>Платёж</span><span class="r">${isDebt?"Платёж в месяц":"Сумма"}</span><span>${isPlan?"Дата":"День"}</span><span>Откуда</span><span>Вкл.</span><span></span></div>`;
    L.forEach(it=>{const usd=+it.usd>0,tax=it.auto==="tax";
      h+=`<div class="py-sr${isOn(it)?"":" off"}"><span class="py-nm2">${ic(it.cat,"sm")}<input class="py-inl py-txt" data-inl="name|${esc(it.id)}" value="${esc(it.name)}" aria-label="Название"></span>
        <span class="r">${tax?`<span class="py-auto">${inl("pct|"+it.id,+it.pct||0,{raw:true,cls:"sm",label:"Процент"})}% безнала</span>`:usd?`<span class="py-usd">${inl("usd|"+it.id,it.usd,{cls:"sm",label:"Доллары"})} $ × ${inl("rate|"+it.id,it.rate,{cls:"sm",label:"Курс"})}</span>`:inl("amount|"+it.id,isDebt?it.amount||null:it.amount,{label:"Сумма",ph:isDebt?"без графика":"0"})}</span>
        <span>${isPlan?`<input class="py-inl py-date" type="date" data-inl="date|${esc(it.id)}" value="${esc(it.date||"")}" aria-label="Дата">`:`<span class="py-dd">${inl("day|"+it.id,+it.day||1,{raw:true,cls:"xs",label:"День месяца"})}${it.freq==="year"?` ${MNg[(+it.mon||1)-1]}`:"-го"}</span>`}</span>
        <span><select class="py-sel" data-inl="src|${esc(it.id)}" aria-label="Откуда платим">${Object.entries(SRC).map(([k,l])=>`<option value="${k}"${it.src===k?" selected":""}>${l}</option>`).join("")}</select></span>
        <span><label class="tgl"><input type="checkbox" role="switch" data-inl="on|${esc(it.id)}"${isOn(it)?" checked":""} aria-label="Платёж действует"><span class="tg" aria-hidden="true"></span></label></span>
        <span><button type="button" class="ghost py-more" data-pyedit="${esc(it.id)}" aria-label="Все настройки">⋯</button></span></div>`});
    return h+`</div>`;
  }
  // боковая панель со всеми настройками
  function drawer(id){
    const cur=id==="new"?null:items[id];const f=P.form||(P.form=Object.assign({kind:"fixed",cat:"other",src:"bank",freq:"month",day:1,point:"Общее",cur:"sum"},cur?JSON.parse(JSON.stringify(cur)):{},cur?{cur:+cur.usd>0?"usd":"sum"}:{}));
    const v=(k,d)=>f[k]==null?(d==null?"":d):f[k];const money=k=>f[k]==null||f[k]===""?"":fmt(f[k]);
    const fld=(k,l,val,hint,o)=>`<label class="py-f"><span>${l}</span><input class="rp-in" data-pyf="${k}" ${o&&o.type?`type="${o.type}"`:'inputmode="decimal"'} autocomplete="off" value="${esc(val)}" placeholder="${esc(o&&o.ph||"")}">${hint?`<small>${hint}</small>`:""}</label>`;
    const kind=f.kind,usd=f.cur==="usd",tax=f.auto==="tax",am=usd?Math.round((+f.usd||0)*(+f.rate||0)):0;
    let h=`<div class="py-ov" data-pyclose></div><aside class="py-drawer" id="pyDrawer" role="dialog" aria-label="Настройки платежа"><div class="py-dhd"><div>${ic(f.cat)}<div><h3>${cur?esc(cur.name):"Новый платёж"}</h3><small>${kind==="debt"?"Долг":kind==="plan"?"Разовый платёж":"Постоянный платёж"}</small></div></div><button type="button" class="ghost py-x" data-pyclose aria-label="Закрыть">✕</button></div><div class="py-dbody">`;
    h+=`<div class="py-f"><span>Вид</span>${seg("data-pykind",KINDS,kind)}</div>`;
    h+=`<div class="py-f"><span>Статья</span><div class="py-cats2">${Object.entries(CATS).map(([k,l])=>`<button type="button" class="py-cat${f.cat===k?" on":""}" data-pycat="${k}">${ic(k,"xs")}${l}</button>`).join("")}</div></div>`;
    h+=fld("name","Название",v("name"),"",{type:"text",ph:"Например: Аренда Премиума"});
    h+=`<div class="py-2"><div class="py-f"><span>Откуда платим</span>${seg("data-pysrc",Object.entries(SRC),f.src)}</div><label class="py-f"><span>Точка</span><select class="rp-in" data-pyf="point">${["Общее"].concat(POINTS()).map(p=>`<option${p===f.point?" selected":""}>${esc(p)}</option>`).join("")}</select></label></div>`;
    if(f.cat==="tax")h+=`<label class="tgl py-tgl"><input type="checkbox" role="switch" data-pytax${tax?" checked":""}><span class="tg" aria-hidden="true"></span><span>Считать сам: процент с безнала прошлого месяца</span></label>`;
    if(tax)h+=fld("pct","Процент с безнала",v("pct",4),`за ${MN[+addM(P.m,-1).slice(5,7)-1].toLowerCase()}: ${fmt(cashless(addM(P.m,-1)))} сум безнала`);
    else{h+=`<div class="py-f"><span>Валюта</span>${seg("data-pycur",[["sum","Сумы"],["usd","Доллары"]],f.cur)}</div>`;
      h+=usd?`<div class="py-2">${fld("usd",kind==="debt"?"Платёж в месяц, $":"Сумма, $",money("usd"))}${fld("rate","Курс",money("rate"),am?`≈ ${fmt(am)} сум`:"")}</div>`:fld("amount",kind==="debt"?"Платёж в месяц, сум":"Сумма, сум",money("amount"),kind==="debt"?"пусто — без графика платежей":"")}
    if(kind==="plan")h+=fld("date","Дата платежа",v("date"),"",{type:"date"});
    else{h+=`<div class="py-2"><div class="py-f"><span>Как часто</span>${seg("data-pyfreq",[["month","Каждый месяц"],["year","Раз в год"]],f.freq||"month")}</div>${fld("day","День месяца",v("day",1),"",{ph:"1"})}</div>`;
      if(f.freq==="year")h+=`<label class="py-f"><span>Месяц</span><select class="rp-in" data-pyf="mon">${MN.map((m,i)=>`<option value="${i+1}"${+f.mon===i+1?" selected":""}>${m}</option>`).join("")}</select></label>`;
      h+=`<div class="py-2">${fld("from","Действует с",v("from"),"",{type:"month"})}${fld("to","Действует по",v("to"),"пусто — без конца",{type:"month"})}</div>`}
    if(kind==="debt")h+=`<div class="py-2">${usd?fld("totalUsd","Сумма долга, $",money("totalUsd")):fld("total","Сумма долга, сум",money("total"))}${fld("paid0","Погашено до учёта",money("paid0"))}</div>`;
    h+=fld("match","Слова для поиска в выписке и Кассе",v("match"),"через запятую; «-ндфл» — исключить",{type:"text",ph:"например: кредит"});
    h+=fld("note","Примечание",v("note"),"",{type:"text"});
    h+=`<label class="tgl py-tgl"><input type="checkbox" role="switch" data-pyon${f.on===false?"":" checked"}><span class="tg" aria-hidden="true"></span><span>Платёж действует</span></label>`;
    if(kind==="debt"&&cur){const pays=cur.pays||[];h+=`<div class="py-pays"><h4>Погашения вручную</h4>${pays.map((p,i)=>`<div class="py-dl"><span>${p.date?dLong(p.date)+" "+p.date.slice(0,4):"—"}${p.note?` · ${esc(p.note)}`:""}</span><span><b>${fmt(p.amount)}</b> <button type="button" class="ghost py-xs" data-pydelpay="${i}" aria-label="Удалить">✕</button></span></div>`).join("")||'<p class="note">Пока нет.</p>'}
      <div class="py-addpay"><input class="rp-in" type="date" id="pyPd" value="${today()}" aria-label="Дата"><input class="rp-in" id="pyPa" inputmode="decimal" placeholder="Сумма" aria-label="Сумма"><button type="button" class="sec" data-pyaddpay>＋</button></div></div>`}
    h+=`</div><div class="py-dft"><button type="button" data-pysave>Сохранить</button><button type="button" class="sec" data-pyclose>Отмена</button>${cur?`<button type="button" class="ghost del" data-pydel>${P.del?"Точно удалить?":"Удалить"}</button>`:""}<span class="py-msg" id="pyMsg"></span></div></aside>`;
    return h;
  }

  // ---------- запись ----------
  const NUMF=["amount","usd","rate","total","totalUsd","paid0","pct","day"];
  function readForm(){const f=P.form;document.querySelectorAll("#pyDrawer [data-pyf]").forEach(i=>{const k=i.dataset.pyf;if(NUMF.includes(k)){const x=num(i.value);f[k]=x==null?null:x}else f[k]=i.value});return f}
  async function putItem(id,o){const x=Object.assign({},o);delete x.id;x.updatedAt=Date.now()-1000;items[id]=Object.assign({id},x);if(db)await db.doc("payments/"+id).set(x)}
  async function putMark(id,M,patch){const k=id+"_"+M,cur=Object.assign({},marks[k]||{},patch);Object.keys(cur).forEach(x=>{if(cur[x]==null)delete cur[x]});
    if(cur.amount==null&&cur.plan==null){delete marks[k];if(db)await db.doc("paymarks/"+k).delete().catch(()=>{});return}
    cur.at=Date.now()-1000;marks[k]=cur;if(db)await db.doc("paymarks/"+k).set(cur)}
  async function save(){
    const f=readForm(),msg=$("pyMsg");const name=String(f.name||"").trim();if(!name){msg.textContent="Укажите название";return}
    if(f.kind==="plan"&&!f.date){msg.textContent="Укажите дату";return}
    const id=P.open==="new"?"pay_"+Date.now().toString(36):P.open;const old=items[id]||{};
    const o={name,kind:f.kind,cat:f.cat,src:f.src,point:f.point||"Общее",match:String(f.match||"").trim(),note:String(f.note||"").trim(),on:f.on!==false,createdAt:old.createdAt||Date.now()-1000};
    if(f.cat==="tax"&&f.auto==="tax"){o.auto="tax";o.pct=+f.pct||0}else if(f.cur==="usd"){o.usd=+f.usd||0;o.rate=+f.rate||0}else o.amount=+f.amount||0;
    if(f.kind==="plan")o.date=f.date;else{o.freq=f.freq||"month";o.day=Math.min(31,Math.max(1,Math.round(+f.day||1)));if(o.freq==="year")o.mon=+f.mon||1;if(f.from)o.from=f.from;if(f.to)o.to=f.to}
    if(f.kind==="debt"){if(f.cur==="usd"&&+f.totalUsd>0)o.totalUsd=+f.totalUsd;else if(+f.total>0)o.total=+f.total;if(+f.paid0>0)o.paid0=+f.paid0;if(old.pays)o.pays=old.pays}
    try{await putItem(id,o);closeDrawer();toast("Сохранено")}catch(e){msg.textContent="Не удалось сохранить"}
  }
  // правка на месте
  async function inline(el){
    const [k,id]=el.dataset.inl.split("|");const it=items[id];if(!it)return;const M=P.m;
    try{
      if(k==="plan"){const v=num(el.value);const base=baseAmount(it,M).a;await putMark(id,M,{plan:v==null||Math.round(v)===base?null:Math.round(v)});toast(v==null?"Сумма месяца сброшена":"Сумма на "+MN[+M.slice(5,7)-1].toLowerCase()+" сохранена")}
      else if(k==="paid"){const v=num(el.value);const r=row(it,M);const man=v==null?null:Math.max(0,Math.round(v)-r.auto);await putMark(id,M,{amount:man||null,date:M===today().slice(0,7)?today():r.due});toast("Оплата сохранена")}
      else if(k==="on"){await putItem(id,Object.assign({},it,{on:el.checked}))}
      else if(k==="src"){await putItem(id,Object.assign({},it,{src:el.value}))}
      else if(k==="name"){const v=el.value.trim();if(!v||v===it.name){el.value=it.name;return}await putItem(id,Object.assign({},it,{name:v}))}
      else if(k==="date"){if(!el.value)return;await putItem(id,Object.assign({},it,{date:el.value}))}
      else{let v=num(el.value);if(v==null&&k!=="amount")return;if(k==="day")v=Math.min(31,Math.max(1,Math.round(v)));const o=Object.assign({},it,{[k]:v==null?0:v});await putItem(id,o)}
    }catch(e){toast("Не удалось сохранить",true)}
    render();
  }
  async function toggle(id){const it=items[id];if(!it)return;const r=row(it,P.m);if(!r)return;
    if(r.st==="ok"&&r.auto&&!r.man){P.row=id;render();return}
    // оплачено полностью и есть ручная часть — снять отметку; иначе — дописать до полной суммы
    const un=r.st==="ok"&&r.man>0,d=P.m===today().slice(0,7)?today():r.due;
    try{if(un)await putMark(id,P.m,{amount:null});else await putMark(id,P.m,{amount:Math.max(0,r.am.a-r.auto)||r.am.a,date:d});toast(un?"Отметка снята":"Оплата отмечена")}catch(e){toast("Не удалось сохранить",true)}render()}
  async function delItem(){const id=P.open;if(!P.del){P.del=true;readForm();render();return}
    try{if(db)await db.doc("payments/"+id).delete();delete items[id];closeDrawer();toast("Платёж удалён")}catch(e){toast("Не удалось удалить",true)}}
  async function addPay(){const it=items[P.open];if(!it)return;const a=num($("pyPa").value);if(!a){toast("Укажите сумму",true);return}readForm();
    try{await putItem(it.id,Object.assign({},it,{pays:(it.pays||[]).concat([{date:$("pyPd").value||today(),amount:a}])}));render()}catch(e){toast("Не удалось сохранить",true)}}
  async function delPay(i){const it=items[P.open];if(!it)return;readForm();try{await putItem(it.id,Object.assign({},it,{pays:(it.pays||[]).filter((_,j)=>j!==i)}));render()}catch(e){toast("Не удалось удалить",true)}}
  function closeDrawer(){const d=$("pyDrawer");P.open=null;P.form=null;P.del=false;if(d){d.classList.remove("on");setTimeout(render,220)}else render()}
  async function xlsx(){
    if(typeof XLSX==="undefined"){toast("Excel ещё загружается",true);return}const M=P.m;
    const ws=XLSX.utils.json_to_sheet(monthRows(M).map(r=>({"День":r.due,"Платёж":r.it.name,"Статья":CATS[r.it.cat]||"","Откуда":SRC[r.it.src]||"","Точка":r.it.point||"","Сумма":r.am.a,"Оплачено":r.paid,"Осталось":r.left,"Статус":ST[r.st][1]})));
    const ws2=XLSX.utils.json_to_sheet(list().filter(it=>it.kind==="debt").map(it=>{const d=debtOf(it);return {"Долг":it.name,"Всего":d.total||null,"Погашено":d.paid,"Осталось":d.left}}));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Платежи "+M);XLSX.utils.book_append_sheet(wb,ws2,"Долги");
    const out=XLSX.write(wb,{type:"array",bookType:"xlsx"});const dl=await window.claude.use("downloads");
    await dl.save({filename:`Платежи ${mName(M)}.xlsx`,data:new Blob([out],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})});toast("Файл скачан");
  }

  // ---------- события ----------
  const openDrawer=(id,kind)=>{P.open=id;P.del=false;P.form=null;if(id==="new"){drawer("new");if(kind)P.form.kind=kind;if(kind==="debt")P.form.cat="debt";P.form.from=P.m}render()};
  document.addEventListener("click",e=>{
    if(!e.target.closest("#page-pay"))return;const t=e.target;let b;
    if(t.closest("#payXlsx")){xlsx().catch(()=>toast("Не удалось выгрузить",true));return}
    if(t.closest("#payAdd")){openDrawer("new");return}
    if(t.closest("#pyDrawer")||t.closest(".py-ov")){
      if(t.closest("[data-pyclose]")){closeDrawer();return}
      if(t.closest("[data-pysave]")){save();return}
      if(t.closest("[data-pydel]")){delItem();return}
      if(t.closest("[data-pyaddpay]")){addPay();return}
      if((b=t.closest("[data-pydelpay]"))){delPay(+b.dataset.pydelpay);return}
      const setF=(k,v)=>{readForm();P.form[k]=v;render()};
      if((b=t.closest("[data-pykind]"))){readForm();P.form.kind=b.dataset.pykind;if(P.form.kind==="debt"&&P.form.cat==="other")P.form.cat="debt";render();return}
      if((b=t.closest("[data-pycat]"))){readForm();P.form.cat=b.dataset.pycat;if(P.form.cat!=="tax")delete P.form.auto;render();return}
      if((b=t.closest("[data-pysrc]"))){setF("src",b.dataset.pysrc);return}
      if((b=t.closest("[data-pycur]"))){setF("cur",b.dataset.pycur);return}
      if((b=t.closest("[data-pyfreq]"))){setF("freq",b.dataset.pyfreq);return}
      return}
    if((b=t.closest("[data-pym]"))){const k=+b.dataset.pym;P.m=k?addM(P.m,k):today().slice(0,7);ls.set("m",P.m===today().slice(0,7)?"":P.m);P.row=null;render();return}
    if((b=t.closest("[data-pytab]"))){P.tab=b.dataset.pytab;ls.set("tab",P.tab);render();return}
    if((b=t.closest("[data-pyadd]"))){openDrawer("new",b.dataset.pyadd||P.tab);return}
    if((b=t.closest("[data-pyedit]"))){openDrawer(b.dataset.pyedit);return}
    if((b=t.closest("[data-pytoggle]"))){toggle(b.dataset.pytoggle);return}
    if((b=t.closest("[data-pyreset]"))){putMark(b.dataset.pyreset,P.m,{plan:null}).then(render);return}
    if((b=t.closest("[data-pyrow]"))){const id=b.dataset.pyrow;P.row=P.row===id?null:id;render();const r=$("pyr-"+id);if(r&&b.classList.contains("py-mi"))r.scrollIntoView({behavior:"smooth",block:"center"});return}
  });
  // правка на месте: сохраняем, когда поле теряет фокус или по Enter
  document.addEventListener("focusin",e=>{const i=e.target;if(i&&i.matches&&i.matches("#page-pay .py-inl:not(.py-txt):not(.py-date)")){i.dataset.was=i.value;i.value=i.value.replace(/[\s  ]/g,"");setTimeout(()=>i.select&&i.select(),0)}});
  document.addEventListener("focusout",e=>{const i=e.target;if(!i||!i.matches)return;
    if(i.matches("#page-pay [data-inl]")&&i.type!=="checkbox"&&i.tagName!=="SELECT"&&i.type!=="date"){if(i.dataset.was!=null&&num(i.value)===num(i.dataset.was)&&!i.classList.contains("py-txt")){i.value=i.dataset.was;return}inline(i)}
    else if(i.matches('#pyDrawer [data-pyf="amount"],#pyDrawer [data-pyf="usd"],#pyDrawer [data-pyf="rate"],#pyDrawer [data-pyf="total"],#pyDrawer [data-pyf="totalUsd"],#pyDrawer [data-pyf="paid0"],#pyPa')){const v=num(i.value);i.value=v==null?"":fmt(v)}});
  document.addEventListener("change",e=>{const t=e.target;if(!t.closest)return;
    if(t.matches("#page-pay [data-inl]")&&(t.type==="checkbox"||t.tagName==="SELECT"||t.type==="date")){inline(t);return}
    if(!t.closest("#pyDrawer"))return;
    if(t.matches("[data-pytax]")){readForm();P.form.auto=t.checked?"tax":null;if(t.checked&&P.form.pct==null)P.form.pct=4;render()}
    else if(t.matches("[data-pyon]")){readForm();P.form.on=t.checked}});
  document.addEventListener("keydown",e=>{const t=e.target;if(!t||!t.closest)return;
    if(e.key==="Enter"&&t.matches("#page-pay .py-inl")){e.preventDefault();t.blur();return}
    if(e.key==="Escape"&&P.open){closeDrawer();return}
    if(e.key==="Enter"&&t.closest("#pyDrawer")&&t.tagName==="INPUT"){e.preventDefault();save()}});
  const curTab=()=>{const t=document.querySelector('.tabs .tab[aria-selected="true"]');return t&&t.dataset.tab};
  const editing=()=>{const a=document.activeElement;return a&&a.closest&&a.closest("#page-pay")&&(a.tagName==="INPUT"||a.tagName==="SELECT")};
  function rerender(){if(curTab()==="pay"&&!P.open&&!editing())render()}
  document.addEventListener("sales-updated",()=>setTimeout(rerender,0));
  document.addEventListener("kassa-updated",()=>setTimeout(rerender,0));
  window.__PAY={render,monthRows,amountOf,dueOf,hitsOf,debtOf,cashless,get items(){return items},get marks(){return marks}};
})();
