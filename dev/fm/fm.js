/* Касса · фискальные модули: «Отчёт р/с» → «Фискальные модули» и «Сверка» → «Фискальные модули ↔ Касса».
   Данные: fiscal/<день> {date, pts:{точка:{c,n,k}}} и settings/fiscal {mods:{точка:{kassa,fm,tp,on,c0,n0}}}. */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const fmt=n=>(n<0?"−":"")+Math.round(Math.abs(+n||0)).toLocaleString("ru-RU").replace(/[\s  ,]/g," ");
  const sgn=n=>Math.abs(n)<1?"0":(n>0?"+":"")+fmt(n);
  const num=v=>{if(v==null)return null;const t=String(v).replace(/[\s  ]/g,"").replace(/[−–]/g,"-").replace(/,/g,".").replace(/[^\d.\-]/g,"");if(!t||t==="-")return null;const x=parseFloat(t);return isFinite(x)?Math.round(x):null};
  const pl=(n,a,b,c)=>{n=Math.abs(n)%100;const d=n%10;return n>10&&n<20?c:d===1?a:d>=2&&d<=4?b:c};
  const MN=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const MNg=["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const WD=["вс","пн","вт","ср","чт","пт","сб"];
  const wd=d=>WD[new Date(d+"T12:00:00Z").getUTCDay()];
  const dS=d=>d.slice(8,10)+"."+d.slice(5,7);
  const dLong=d=>+d.slice(8)+" "+MNg[+d.slice(5,7)-1];
  const today=()=>new Date(Date.now()+5*3600e3).toISOString().slice(0,10);
  const addD=(s,n)=>new Date(Date.parse(s+"T00:00:00Z")+n*864e5).toISOString().slice(0,10);
  const S=()=>window.__S;
  const ls={get(k,d){try{const v=localStorage.getItem("kassa.fm."+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("kassa.fm."+k,JSON.stringify(v))}catch(e){}}};
  const POINTS=()=>{const p=S()&&S().settings&&S().settings.points;return Array.isArray(p)&&p.length?p:["Премиум","Яшнабад","Сергели","C1"]};
  const color=p=>{try{return S().pointColor(p)}catch(e){return "var(--accent)"}};

  // ---------- данные ----------
  let days={},cfg={mods:{}},db=null;
  (async()=>{try{db=await window.claude.use("db");if(!db)return;
    db.collection("fiscal").onSnapshot(s=>{const o={};s.forEach(d=>{const x=d.data();if(/^\d{4}-\d\d-\d\d$/.test(d.id))o[d.id]=x});days=o;rerender()},()=>{});
    db.doc("settings/fiscal").onSnapshot(s=>{cfg=s.exists?Object.assign({mods:{}},s.data()):{mods:{}};rerender()},()=>{});
  }catch(e){}})();
  const mod=p=>cfg.mods[p]||null;
  const isOn=p=>{const m=mod(p);return !!(m&&m.on!==false&&(m.fm||m.kassa))};
  const fDay=(d,p)=>{const x=days[d]&&days[d].pts&&days[d].pts[p];return x?{c:+x.c||0,n:+x.n||0,k:+x.k||0}:null};
  // выручка Кассы: нал — «Наличные», безнал — терминал и QR (перечисления идут через р/с, фискальный чек на них не пробивают)
  function kassa(d,p){const o={c:0,n:0,e:0,k:0,rows:[]};(S()&&S().sales||[]).forEach(s=>{if(s.date!==d||s.point!==p)return;o.rows.push(s);
    const add=(pay,v)=>{if(pay==="Наличные")o.c+=v;else if(pay==="Перечисление")o.e+=v;else o.n+=v};
    if(s.pay==="Смешанная"&&s.pays)Object.entries(s.pays).forEach(([k,v])=>add(k,+v||0));else add(s.pay,+s.sum||0)});
    o.k=new Set(o.rows.map(s=>s.check||s.id)).size;return o}
  function gross(p,upTo){const m=mod(p)||{};let c=+m.c0||0,n=+m.n0||0;Object.keys(days).forEach(d=>{if(upTo&&d>upTo)return;const x=fDay(d,p);if(x){c+=x.c;n+=x.n}});return {c,n}}
  function fiscalDays(){const s=new Set(Object.keys(days));(S()&&S().sales||[]).forEach(x=>{if(x.date&&x.date<=today())s.add(x.date)});return [...s].sort()}
  function dayStat(d){const on=POINTS().filter(isOn);if(!on.length)return "none";const n=on.filter(p=>fDay(d,p)).length;return n===on.length?"ok":n?"part":"none"}
  async function saveDay(d,pts){const cur=Object.assign({date:d,pts:{}},days[d]||{});cur.pts=Object.assign({},cur.pts,pts);cur.updatedAt=Date.now();days[d]=cur;if(db)await db.doc("fiscal/"+d).set(cur)}
  async function saveCfg(p,patch){const c=JSON.parse(JSON.stringify(cfg));c.mods[p]=Object.assign({},c.mods[p]||{},patch);cfg=c;if(db)await db.doc("settings/fiscal").set(c)}

  // ---------- общие элементы ----------
  const kpi=(l,v,d,cls)=>`<div class="kpi ${cls||""}"><span class="eyebrow">${l}</span><div class="kv2"><span class="v">${v}</span></div><span class="d">${d||"&nbsp;"}</span></div>`;
  const seg=(attr,opts,cur,big)=>`<div class="seg${big?" big":""}" role="group">${opts.map(([v,l])=>`<button type="button" ${attr}="${esc(v)}" aria-pressed="${String(v)===String(cur)}">${l}</button>`).join("")}</div>`;
  const pill=(cls,t)=>`<span class="fm-pill ${cls}">${t}</span>`;
  // пока ни один модуль не включён — раздел в подготовке
  const prep=()=>POINTS().some(isOn)?"":`<div class="fm-prep"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5l3 2"/></svg><div><b>Раздел в подготовке</b><span>Фискальные модули пока не подключены, цифры не считаются. Когда подключим выгрузку из Rahmat, модуль точки включается в карточке → «Данные модуля» → «Модуль работает».</span></div></div>`;
  function toast(t,bad){let el=$("bzToast");if(!el){el=document.createElement("div");el.id="bzToast";el.className="bz-toast";document.body.appendChild(el)}el.textContent=t;el.classList.toggle("bad",!!bad);el.classList.add("on");clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove("on"),3200)}

  // ================= ОТЧЁТ Р/С → ФИСКАЛЬНЫЕ МОДУЛИ =================
  const F={view:ls.get("view","rs"),m:"",d:"",open:null,edit:null};
  const RS_HEAD={rs:["Saif-Optics · расчётный счёт","Отчёт по расчётному счёту","Остаток, поступления и расходы со счёта — по дням и месяцам"],fm:["Saif-Optics · фискальные модули","Фискальные модули","Гросс нал и безнал по кассам точек — за день и за всё время"]};
  function rsChrome(){
    const pg=$("page-report");if(!pg)return;const fm=F.view==="fm";
    $("fmRsView").innerHTML=seg("data-fmv",[["rs","Расчётный счёт"],["fm","Фискальные модули"]],F.view,true);
    const h=pg.querySelector(".head");const [e,t,p]=RS_HEAD[F.view];h.querySelector(".eyebrow").textContent=e;h.querySelector("h1").textContent=t;h.querySelector("p").textContent=p;
    ["rsXlsx","rsAdd"].forEach(id=>{const b=$(id);if(b)b.hidden=fm});["fmImport","fmAdd"].forEach(id=>{const b=$(id);if(b)b.hidden=!fm});
    ["rsSeg","rsBody","rsOld"].forEach(id=>{const b=$(id);if(b)b.hidden=fm});$("fmBody").hidden=!fm;
  }
  function renderFm(){
    rsChrome();if(F.view!=="fm")return;
    const el=$("fmBody"),P=POINTS(),all=fiscalDays(),T=today();
    const ms=[...new Set(all.map(d=>d.slice(0,7)).concat([T.slice(0,7)]))].sort();
    if(!ms.includes(F.m))F.m=ms[ms.length-1];
    const md=all.filter(d=>d.startsWith(F.m));
    if(!md.includes(F.d)){const w=md.filter(d=>days[d]);F.d=(w[w.length-1]||md[md.length-1]||T)}
    const d=F.d;
    let h=prep()+`<div class="fm-bar">${seg("data-fmm",ms.map(m=>[m,MN[+m.slice(5,7)-1]+" "+m.slice(0,4)]),F.m)}<span class="fm-legend"><i class="ok"></i>все модули внесены<i class="part"></i>частично<i class="none"></i>нет данных</span></div>
      <div class="rp-days" id="fmDays" role="group" aria-label="День">${md.map(x=>`<button type="button" class="rp-day" data-fmd="${x}" aria-pressed="${x===d}" title="${dLong(x)}"><small>${wd(x)}</small><b>${+x.slice(8)}</b><i class="${dayStat(x)}"></i></button>`).join("")}</div>`;
    // итоги
    const day={c:0,n:0},tot={c:0,n:0};P.forEach(p=>{const x=fDay(d,p);if(x){day.c+=x.c;day.n+=x.n}const g=gross(p,d);tot.c+=g.c;tot.n+=g.n});
    const on=P.filter(isOn).length;
    h+=`<section class="kpis">${kpi("Гросс нал · "+dS(d),fmt(day.c)+" сум",`по ${on} ${pl(on,"модулю","модулям","модулям")} за ${dLong(d)}`)}${kpi("Гросс безнал · "+dS(d),fmt(day.n)+" сум","карты и QR через фискальный модуль")}${kpi("Гросс нал · всё время",fmt(tot.c)+" сум","нарастающим итогом по "+dS(d),"fm-kacc")}${kpi("Гросс безнал · всё время",fmt(tot.n)+" сум","нарастающим итогом по "+dS(d),"fm-kacc")}</section>`;
    // карточки точек
    h+=`<section class="panel"><div class="rp-ph"><div><h2>Точки и фискальные модули</h2><p class="note">Нажмите карточку, чтобы внести гросс за ${dLong(d)} или изменить данные модуля</p></div><span class="rp-badge man">${on} из ${P.length} подключено</span></div><div class="fm-cards">${P.map(p=>card(p,d)).join("")}</div></section>`;
    if(F.open)h+=editor(F.open,d);
    // по дням
    const L=md.slice().reverse().filter(x=>x<=T);
    h+=`<section class="panel"><h2>По дням · ${MN[+F.m.slice(5,7)-1].toLowerCase()}</h2><p class="note">Нал / безнал по фискальным модулям. Нажмите день, чтобы открыть его.</p>
      <div class="rp-tbl fm-tbl" style="margin-top:10px"><table><thead><tr><th>День</th>${P.map(p=>`<th><span class="dot" style="background:${color(p)}"></span>${esc(p)}</th>`).join("")}<th>Итого нал</th><th>Итого безнал</th><th>Гросс всего</th></tr></thead><tbody>${L.map(x=>{let c=0,n=0;const cells=P.map(p=>{const v=fDay(x,p);if(v){c+=v.c;n+=v.n}return !isOn(p)?'<td class="z">—</td>':v?`<td><span class="fm-cn">${fmt(v.c)}</span><span class="fm-cn n">${fmt(v.n)}</span></td>`:'<td><span class="fm-miss">не внесено</span></td>'}).join("");const g=P.reduce((a,p)=>{const q=gross(p,x);return a+q.c+q.n},0);return `<tr class="tap${x===d?" fm-sel":""}" data-fmd="${x}"><td>${dS(x)} <span class="srcs">${wd(x)}</span></td>${cells}<td class="it">${fmt(c)}</td><td class="it">${fmt(n)}</td><td class="mon">${fmt(g)}</td></tr>`}).join("")||`<tr><td colspan="${P.length+4}" class="z" style="text-align:center">Дней пока нет</td></tr>`}</tbody></table></div>
      <p class="note fm-foot">В ячейке точки: сверху нал, снизу безнал. «Гросс всего» — нарастающий итог нал + безнал по всем модулям на конец дня.</p></section>`;
    el.innerHTML=h;
    requestAnimationFrame(()=>{const b=$("fmDays")&&$("fmDays").querySelector('[aria-pressed="true"]');if(b&&b.offsetParent){const box=$("fmDays");box.scrollLeft=Math.max(0,b.offsetLeft-box.offsetLeft-(box.clientWidth-b.offsetWidth)/2)}});
  }
  function card(p,d){
    const m=mod(p)||{},on=isOn(p),x=fDay(d,p),g=gross(p,d),k=kassa(d,p),sel=F.open===p;
    const st=!on?pill("off","Не подключён"):x?pill("ok","Внесено"):(k.c||k.n)?pill("warn","Нет данных за день"):pill("idle","Продаж не было");
    const row=(l,v)=>`<div class="fm-kv"><span>${l}</span><b class="${v?"":"z"}">${v?esc(v):"не указано"}</b></div>`;
    return `<button type="button" class="fm-card${on?"":" off"}${sel?" on":""}" data-fmp="${esc(p)}" aria-expanded="${sel}" style="--pc:${color(p)}">
      <div class="fm-ch"><span class="fm-name"><span class="dot"></span>${esc(p)}</span>${st}</div>
      ${row("Касса (серийный №)",m.kassa)}${row("Фискальный модуль",m.fm)}${row("Торговый пункт",m.tp)}
      <div class="fm-nums"><div><span>За ${dS(d)}</span><p><em>нал</em><b>${x?fmt(x.c):"—"}</b></p><p><em>безнал</em><b>${x?fmt(x.n):"—"}</b></p></div><div><span>За всё время</span><p><em>нал</em><b>${on?fmt(g.c):"—"}</b></p><p><em>безнал</em><b>${on?fmt(g.n):"—"}</b></p></div></div>
      <span class="fm-more">${on?(x?"Изменить":"Внести гросс"):"Подключить модуль"}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg></span></button>`;
  }
  function editor(p,d){
    const m=mod(p)||{},x=fDay(d,p)||{},k=kassa(d,p),on=isOn(p);
    const fld=(id,l,v,hint,ph)=>`<label class="rp-fld"><span>${l}</span><input class="rp-in" id="${id}" inputmode="${/^fmE(k|f|t)/.test(id)?"text":"decimal"}" autocomplete="off" value="${v==null||v===""?"":esc(/^fmE(k|f|t)/.test(id)?v:fmt(v))}" placeholder="${ph||"0"}"><span class="rp-hint">${hint||""}</span></label>`;
    const tab=F.edit||(on?"day":"mod");
    return `<section class="panel fm-ed" id="fmEd" style="--pc:${color(p)}"><div class="rp-ph"><div><h2><span class="dot"></span>${esc(p)} · ${tab==="day"?dLong(d):"данные модуля"}</h2><p class="note">${tab==="day"?"Цифры из Z-отчёта или выгрузки Rahmat за день":"Номера из кабинета Rahmat → Касса → Кассы"}</p></div><button type="button" class="ghost fm-x" data-fmclose aria-label="Закрыть">✕</button></div>
      ${on?seg("data-fmtab",[["day","Гросс за день"],["mod","Данные модуля"]],tab):""}
      ${tab==="day"?`<div class="rp-fields fm-f3">${fld("fmEc","Гросс нал за день",x.c,`в Кассе нал ${fmt(k.c)}`)}${fld("fmEn","Гросс безнал за день",x.n,`в Кассе терминал и QR ${fmt(k.n)}`)}${fld("fmEq","Чеков",x.k,`в Кассе ${k.k} ${pl(k.k,"чек","чека","чеков")}`)}</div>
        <div class="fm-acts"><button type="button" data-fmsave="day">Сохранить</button><button type="button" class="sec" data-fmfill>Подставить из Кассы</button>${days[d]&&days[d].pts&&days[d].pts[p]?'<button type="button" class="ghost del" data-fmclear>Очистить день</button>':""}</div>`
      :`<div class="rp-fields fm-f3">${fld("fmEkassa","Серийный номер кассы",m.kassa,"","P3B…")}${fld("fmEfm","Фискальный модуль",m.fm,"","VG…")}${fld("fmEtp","Торговый пункт в Rahmat",m.tp,"","Название точки")}</div>
        <div class="rp-fields fm-f3">${fld("fmEc0","Гросс нал до учёта",m.c0,"накоплено до первого внесённого дня")}${fld("fmEn0","Гросс безнал до учёта",m.n0,"накоплено до первого внесённого дня")}<label class="tgl fm-tgl"><input type="checkbox" role="switch" id="fmEon"${m.on===false?"":" checked"}><span class="tg" aria-hidden="true"></span><span>Модуль работает</span></label></div>
        <div class="fm-acts"><button type="button" data-fmsave="mod">Сохранить</button></div>`}
    </section>`;
  }

  // ================= СВЕРКА → ФИСКАЛЬНЫЕ МОДУЛИ ↔ КАССА =================
  const R={view:ls.get("rview","bz"),per:ls.get("rPer","7d"),f:"",t:"",pt:ls.get("rPt","all"),only:ls.get("rOnly",false),sel:null};
  const PER=[["today","Сегодня"],["yday","Вчера"],["7d","7 дней"],["month","Этот месяц"],["prev","Прошлый месяц"],["custom","Свои даты"]];
  function periodOf(p,f,t){const T=today();if(p==="today")return [T,T];if(p==="yday")return [addD(T,-1),addD(T,-1)];if(p==="7d")return [addD(T,-6),T];if(p==="month")return [T.slice(0,8)+"01",T];
    if(p==="prev"){const d=new Date(Date.parse(T.slice(0,8)+"01T00:00:00Z"));d.setUTCMonth(d.getUTCMonth()-1);return [d.toISOString().slice(0,10),addD(T.slice(0,8)+"01",-1)]}return [f||T,t||T]}
  const RC_HEAD={bz:["Saif-Optics · Billz и Касса","Сверка","Что, когда и в каком количестве продано по Billz — и сходится ли это с Кассой"],fm:["Saif-Optics · фискальные модули и Касса","Сверка","Сколько нала и безнала пробито через фискальные модули — и сходится ли это с продажами Кассы"]};
  function reconChrome(){
    const pg=$("page-recon");if(!pg)return;const fm=R.view==="fm";
    $("fmRcView").innerHTML=seg("data-fmrv",[["bz","Billz ↔ Касса"],["fm","Фискальные модули ↔ Касса"]],R.view,true);
    const h=pg.querySelector(".head");const [e,t,p]=RC_HEAD[R.view];h.querySelector(".eyebrow").textContent=e;h.querySelector("h1").textContent=t;h.querySelector("p").textContent=p;
    ["reconXlsx","reconRefresh","reconState","reconCtl","reconBody"].forEach(id=>{const b=$(id);if(b)b.hidden=fm});if(fm&&$("bzPanel"))$("bzPanel").hidden=true;
    $("fmRecon").hidden=!fm;$("fmRcXlsx").hidden=!fm;
  }
  function reconRows(f,t,pt){
    const out=[];const P=POINTS().filter(p=>pt==="all"||p===pt);
    for(let d=f;d<=t;d=addD(d,1))P.forEach(p=>{const k=kassa(d,p),x=fDay(d,p),on=isOn(p);if(!k.rows.length&&!x)return;
      const o={d,p,on,k,x,dc:x?x.c-k.c:null,dn:x?x.n-k.n:null};
      o.st=!on?"off":!x?"nofm":Math.abs(o.dc)<1&&Math.abs(o.dn)<1?"ok":(o.dc<0||o.dn<0)?"short":"over";out.push(o)});
    return out.sort((a,b)=>b.d.localeCompare(a.d)||POINTS().indexOf(a.p)-POINTS().indexOf(b.p));
  }
  const ST={ok:["ok","Сходится"],short:["bad","Не пробито"],over:["warn","В ФМ больше"],nofm:["warn","Нет отчёта ФМ"],off:["off","Модуль не подключён"]};
  function renderRecon(){
    reconChrome();if(R.view!=="fm")return;
    const [f,t]=periodOf(R.per,R.f,R.t);R.f=f;R.t=t;
    $("fmRcCtl").innerHTML=`<div class="fb-row">${seg("data-fmper",PER,R.per)}<div class="fb-dates"${R.per==="custom"?"":" hidden"}><label class="f">С<input type="date" id="fmFrom" value="${f}"></label><label class="f">По<input type="date" id="fmTo" value="${t}"></label></div></div>
      <div class="fb-row">${seg("data-fmpt",[["all","Все точки"]].concat(POINTS().map(p=>[p,esc(p)])),R.pt)}<label class="tgl bz-tgl"><input type="checkbox" role="switch" id="fmOnly"${R.only?" checked":""}><span class="tg" aria-hidden="true"></span><span>Только расхождения</span></label></div>`;
    const rows=reconRows(f,t,R.pt),bad=rows.filter(o=>o.st!=="ok"&&o.st!=="off");
    const A={kc:0,kn:0,fc:0,fn:0,sc:0,sn:0};rows.forEach(o=>{if(!o.on)return;A.kc+=o.k.c;A.kn+=o.k.n;if(o.x){A.fc+=o.x.c;A.fn+=o.x.n}});
    const dc=A.fc-A.kc,dn=A.fn-A.kn;
    let h=prep()+`<section class="kpis">${kpi("Нал · Касса / ФМ",`${fmt(A.kc)} <small class="fm-vs">/ ${fmt(A.fc)}</small>`,`разница <b class="${Math.abs(dc)<1?"up":"down"}">${sgn(dc)}</b>`)}${kpi("Безнал · Касса / ФМ",`${fmt(A.kn)} <small class="fm-vs">/ ${fmt(A.fn)}</small>`,`разница <b class="${Math.abs(dn)<1?"up":"down"}">${sgn(dn)}</b>`)}${kpi("Не пробито через ФМ",fmt(Math.max(0,-dc)+Math.max(0,-dn))+" сум",`нал ${fmt(Math.max(0,-dc))} · безнал ${fmt(Math.max(0,-dn))}`,(dc<-1||dn<-1)?"bz-kbad":"")}${kpi("Дни с расхождением",String(bad.length),bad.length?"отмечены цветом в таблице":"всё сходится ✓",bad.length?"bz-kbad":"")}</section>`;
    const list=R.only?bad:rows;
    const cell=(v,miss)=>miss?'<span class="srcs">—</span>':fmt(v);
    const dcell=v=>v==null?'<span class="srcs">—</span>':Math.abs(v)<1?'<span class="up">0</span>':`<b class="down">${sgn(v)}</b>`;
    h+=`<section class="panel"><div class="head" style="margin-bottom:8px"><div><h2>По дням и точкам</h2><p class="note">Касса: нал — «Наличные», безнал — терминал и QR. Перечисления на р/с в сверку не входят. Нажмите строку, чтобы увидеть продажи Кассы за день рядом с цифрами модуля.</p></div></div>
      <div class="tbl"><table class="bz-days fm-rc"><thead><tr><th>День</th><th>Точка</th><th class="r">Нал · Касса</th><th class="r">Нал · ФМ</th><th class="r">Разница</th><th class="r">Безнал · Касса</th><th class="r">Безнал · ФМ</th><th class="r">Разница</th><th></th></tr></thead><tbody>${list.map(o=>{const k=o.d+"|"+o.p,sel=R.sel===k,[cls,lab]=ST[o.st];
        return `<tr class="tap${o.st==="short"?" bz-bad":o.st==="nofm"||o.st==="over"?" bz-warn":""}${o.st==="off"?" fm-dim":""}${sel?" bz-sel":""}" data-fmrow="${esc(k)}"><td>${dS(o.d)} <span class="srcs">${wd(o.d)}</span></td><td><span class="dot" style="background:${color(o.p)}"></span>${esc(o.p)}</td><td class="r num">${fmt(o.k.c)}</td><td class="r num">${cell(o.x&&o.x.c,!o.x)}</td><td class="r num">${dcell(o.dc)}</td><td class="r num">${fmt(o.k.n)}</td><td class="r num">${cell(o.x&&o.x.n,!o.x)}</td><td class="r num">${dcell(o.dn)}</td><td>${pill(cls,lab)}</td></tr>`+(sel?`<tr class="bz-det"><td colspan="9">${det(o)}</td></tr>`:"")}).join("")||`<tr><td colspan="9" class="srcs" style="text-align:center;padding:16px">${R.only?"Расхождений нет ✓":"Продаж за период нет"}</td></tr>`}</tbody></table></div></section>`;
    $("fmRcBody").innerHTML=h;
  }
  function det(o){
    const by={};o.k.rows.forEach(s=>{const parts=s.pay==="Смешанная"&&s.pays?Object.entries(s.pays):[[s.pay,+s.sum||0]];parts.forEach(([pay,v])=>{(by[pay]||(by[pay]=[])).push({s,v:+v||0})})});
    const grp=Object.entries(by).map(([pay,L])=>`<div class="fm-dg"><h4>${esc(pay)} <span class="srcs">${L.length} ${pl(L.length,"запись","записи","записей")} · ${fmt(L.reduce((a,b)=>a+b.v,0))}</span></h4>${L.map(({s,v})=>`<div class="fm-dl"><span>${s.check?`<span class="srcs">чек ${esc(s.check)}</span> `:""}${esc(s.product||s.cat||"")}</span><b class="num">${fmt(v)}</b></div>`).join("")}</div>`).join("")||'<p class="note">Продаж в Кассе нет.</p>';
    const x=o.x;
    return `<div class="bz-detw"><div><h3>Касса · ${esc(o.p)} · ${dLong(o.d)}</h3>${grp}</div><div><h3>Фискальный модуль${mod(o.p)&&mod(o.p).fm?` · <span class="srcs">${esc(mod(o.p).fm)}</span>`:""}</h3>
      ${!o.on?'<p class="note">Для этой точки модуль не подключён — добавьте его в «Отчёт р/с → Фискальные модули».</p>':x?`<div class="fm-dl"><span>Нал</span><b class="num">${fmt(x.c)}</b></div><div class="fm-dl"><span>Безнал</span><b class="num">${fmt(x.n)}</b></div><div class="fm-dl"><span>Чеков</span><b class="num">${x.k||"—"}</b></div>`:'<p class="note">Гросс за этот день ещё не внесён.</p>'}
      <div class="fm-acts"><button type="button" class="sec" data-fmgo="${esc(o.d)}|${esc(o.p)}">${x?"Открыть день":"Внести гросс"} в «Фискальных модулях»</button></div></div></div>`;
  }

  // ---------- импорт «Отчёта по чекам» из Rahmat ----------
  // Rahmat отдаёт zip с одним xlsx; в нём лист «Чеки» и те же чеки ещё раз по каждому модулю — повторы отбрасываем
  function parseRahmat(buf,name,mods){
    let data=new Uint8Array(buf);
    if(data[0]===0x50&&data[1]===0x4b){const z=XLSX.CFB.read(data,{type:"array"});const e=z.FileIndex.find(f=>/\.xlsx?$/i.test(f.name));
      if(e)data=e.content;else if(/\.zip$/i.test(name||""))throw new Error("в архиве нет Excel-файла")}
    const wb=XLSX.read(data,{type:"array",cellDates:true});
    const fm2p={},tp2p={};Object.entries(mods||{}).forEach(([p,m])=>{if(m&&m.fm)fm2p[String(m.fm).trim().toUpperCase()]=p;if(m&&m.tp)tp2p[String(m.tp).trim().toLowerCase()]=p});
    const acc={},seen=new Set(),unknown=new Set();let n=0;
    wb.SheetNames.forEach(sn=>{const A=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:null});
      const hi=A.findIndex(r=>r&&r.some(c=>/тип операц/i.test(String(c||"")))&&r.some(c=>/налич/i.test(String(c||""))));if(hi<0)return;
      const H=A[hi].map(c=>String(c||"").toLowerCase().trim());const col=re=>H.findIndex(c=>re.test(c));
      const iT=col(/тип операц/),iP=col(/торгов/),iF=col(/фискальн/),iC=col(/^налич/),iN=col(/безнал|^карт/),iD=col(/дата/),iK=col(/номер чека/);
      A.slice(hi+1).forEach(r=>{if(!r)return;const ty=String(r[iT]||"").toLowerCase();if(!/продаж|возврат/.test(ty))return;
        const dv=r[iD];let d="";if(dv instanceof Date)d=new Date(dv.getTime()+5*3600e3).toISOString().slice(0,10);else{const s=String(dv||"");let m=s.match(/(\d{4})-(\d\d)-(\d\d)/);if(m)d=`${m[1]}-${m[2]}-${m[3]}`;else if((m=s.match(/(\d\d)\.(\d\d)\.(\d{4})/)))d=`${m[3]}-${m[2]}-${m[1]}`}
        const fmn=iF>=0?String(r[iF]||"").trim().toUpperCase():"",tp=iP>=0?String(r[iP]||"").trim():"";
        const key=[fmn||tp,String(dv),ty,iK>=0?r[iK]:""].join("|");if(seen.has(key))return;seen.add(key);
        const p=fm2p[fmn]||tp2p[tp.toLowerCase()];if(!d||!p){unknown.add(fmn||tp||"?");return}
        const sg=/возврат/.test(ty)?-1:1;const o=(acc[d]||(acc[d]={}))[p]||(acc[d][p]={c:0,n:0,k:0});o.c+=sg*(num(r[iC])||0);o.n+=sg*(num(r[iN])||0);o.k++;n++})});
    return {acc,n,unknown:[...unknown]};
  }
  async function importRahmat(file){
    if(typeof XLSX==="undefined"){toast("Excel ещё загружается — попробуйте через пару секунд",true);return}
    const {acc,n,unknown}=parseRahmat(await file.arrayBuffer(),file.name,cfg.mods);
    // модули, которые ещё не включены, не трогаем — раздел пока в подготовке
    const off=new Set();let saved=0;const ds=Object.keys(acc).sort();
    for(const d of ds){const pts={};Object.entries(acc[d]).forEach(([p,v])=>{if(isOn(p)){pts[p]=v;saved+=v.k}else off.add(p)});if(Object.keys(pts).length)await saveDay(d,pts)}
    if(!n){toast(unknown.length?"Чеки есть, но модуль не привязан к точке: "+unknown.join(", "):"В файле не нашлось чеков продаж",true);return}
    toast(saved?`Загружено ${saved} ${pl(saved,"чек","чека","чеков")}${off.size?` · выключенные модули пропущены: ${[...off].join(", ")}`:""}`:`В файле ${n} ${pl(n,"чек","чека","чеков")} (${[...off].join(", ")}), но модули выключены — ничего не записано`,!saved);
    if(saved){F.d=ds[ds.length-1];F.m=F.d.slice(0,7)}renderFm();
  }
  async function xlsx(){
    if(typeof XLSX==="undefined")return;const rows=reconRows(R.f,R.t,R.pt);
    const ws=XLSX.utils.json_to_sheet(rows.map(o=>({"День":o.d,"Точка":o.p,"Нал Касса":o.k.c,"Нал ФМ":o.x?o.x.c:null,"Разница нал":o.dc,"Безнал Касса":o.k.n,"Безнал ФМ":o.x?o.x.n:null,"Разница безнал":o.dn,"Статус":ST[o.st][1]})));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Сверка ФМ");const out=XLSX.write(wb,{type:"array",bookType:"xlsx"});
    const dl=await window.claude.use("downloads");await dl.save({filename:`Сверка фискальных модулей ${R.f}—${R.t}.xlsx`,data:new Blob([out],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})});toast("Файл скачан");
  }

  // ---------- события ----------
  const curTab=()=>{const t=document.querySelector('.tabs .tab[aria-selected="true"]');return t&&t.dataset.tab};
  function rerender(){const t=curTab();if(t==="report")renderFm();else if(t==="recon")renderRecon()}
  document.addEventListener("sales-updated",()=>setTimeout(rerender,0));
  document.addEventListener("click",async e=>{
    const T=e.target;let b;
    if((b=T.closest("[data-fmv]"))){F.view=b.dataset.fmv;ls.set("view",F.view);if(F.view==="rs"){rsChrome();window.__RS&&window.__RS.render()}else renderFm();return}
    if((b=T.closest("[data-fmrv]"))){R.view=b.dataset.fmrv;ls.set("rview",R.view);if(R.view==="bz"){reconChrome();window.__BZ&&window.__BZ.render("recon")}else renderRecon();return}
    if((b=T.closest("[data-fmm]"))){F.m=b.dataset.fmm;F.d="";F.open=null;renderFm();return}
    if((b=T.closest("[data-fmd]"))){F.d=b.dataset.fmd;F.m=F.d.slice(0,7);renderFm();return}
    if((b=T.closest("[data-fmp]"))){const p=b.dataset.fmp;F.open=F.open===p?null:p;F.edit=null;renderFm();if(F.open)setTimeout(()=>{const x=$("fmEd");if(x)x.scrollIntoView({behavior:"smooth",block:"nearest"})},40);return}
    if(T.closest("[data-fmclose]")){F.open=null;renderFm();return}
    if((b=T.closest("[data-fmtab]"))){F.edit=b.dataset.fmtab;renderFm();return}
    if(T.closest("[data-fmfill]")){const k=kassa(F.d,F.open);$("fmEc").value=fmt(k.c);$("fmEn").value=fmt(k.n);$("fmEq").value=k.k;return}
    if(T.closest("[data-fmclear]")){const cur=Object.assign({},days[F.d]);cur.pts=Object.assign({},cur.pts);delete cur.pts[F.open];days[F.d]=cur;if(db)await db.doc("fiscal/"+F.d).set(cur);toast("День очищен");renderFm();return}
    if((b=T.closest("[data-fmsave]"))){const p=F.open;b.disabled=true;
      try{if(b.dataset.fmsave==="day"){await saveDay(F.d,{[p]:{c:num($("fmEc").value)||0,n:num($("fmEn").value)||0,k:num($("fmEq").value)||0}});toast(`${p} · ${dLong(F.d)} сохранено`)}
        else{await saveCfg(p,{kassa:$("fmEkassa").value.trim(),fm:$("fmEfm").value.trim(),tp:$("fmEtp").value.trim(),c0:num($("fmEc0").value)||0,n0:num($("fmEn0").value)||0,on:$("fmEon").checked});F.edit="day";toast(`${p} · данные модуля сохранены`)}
      }catch(x){toast("Не сохранилось — проверьте связь",true)}renderFm();return}
    if(T.closest("#fmAdd")){const P=POINTS().filter(isOn);F.d=today();F.m=F.d.slice(0,7);F.open=P.find(p=>!fDay(F.d,p))||P[0]||POINTS()[0];F.edit=null;renderFm();setTimeout(()=>{const x=$("fmEd");if(x)x.scrollIntoView({behavior:"smooth",block:"start"})},40);return}
    if(T.closest("#fmImport")){$("fmFile").click();return}
    if((b=T.closest("[data-fmper]"))){R.per=b.dataset.fmper;ls.set("rPer",R.per);R.sel=null;renderRecon();return}
    if((b=T.closest("[data-fmpt]"))){R.pt=b.dataset.fmpt;ls.set("rPt",R.pt);R.sel=null;renderRecon();return}
    if((b=T.closest("tr[data-fmrow]"))){R.sel=R.sel===b.dataset.fmrow?null:b.dataset.fmrow;renderRecon();return}
    if((b=T.closest("[data-fmgo]"))){const [d,p]=b.dataset.fmgo.split("|");F.view="fm";ls.set("view","fm");F.d=d;F.m=d.slice(0,7);F.open=p;F.edit=isOn(p)?"day":"mod";const t=document.querySelector('.tab[data-tab="report"]');if(t)t.click();setTimeout(()=>{renderFm();const x=$("fmEd");if(x)x.scrollIntoView({behavior:"smooth",block:"start"})},60);return}
    if(T.closest("#fmRcXlsx")){xlsx();return}
  });
  document.addEventListener("change",e=>{
    if(e.target.id==="fmOnly"){R.only=e.target.checked;ls.set("rOnly",R.only);renderRecon()}
    else if(e.target.id==="fmFrom"){R.f=e.target.value;renderRecon()}else if(e.target.id==="fmTo"){R.t=e.target.value;renderRecon()}
    else if(e.target.id==="fmFile"){const f=e.target.files&&e.target.files[0];e.target.value="";if(f)importRahmat(f).catch(x=>toast("Не удалось прочитать файл: "+(x.message||x),true))}
  });
  document.addEventListener("focusout",e=>{const i=e.target;if(i&&/^fmE(c|n|c0|n0)$/.test(i.id)){const v=num(i.value);i.value=v==null?"":fmt(v)}});
  // встраиваемся в отрисовку вкладок
  const wrap=()=>{
    if(window.__RS&&!window.__RS.__fm){const o=window.__RS.render;window.__RS.render=function(){if(F.view==="fm"){renderFm();return}rsChrome();return o.apply(this,arguments)};window.__RS.__fm=1}
    if(window.__BZ&&!window.__BZ.__fm){const o=window.__BZ.render;window.__BZ.render=function(v){if(v==="recon"&&R.view==="fm"){renderRecon();return}if(v==="recon")reconChrome();return o.apply(this,arguments)};window.__BZ.__fm=1}
  };
  wrap();document.addEventListener("DOMContentLoaded",wrap);
  window.__FM={renderFm,renderRecon,kassa,fDay,gross,isOn,parseRahmat,get days(){return days},get cfg(){return cfg}};
})();
