/* ===================== МОБИЛЬНАЯ ВЕРСИЯ: отдельный интерфейс для телефона на тех же данных ===================== */
(function(){
  const app=document.getElementById("mApp");if(!app)return;
  const phone=matchMedia("(max-width:640px)");
  const H=document.documentElement;
  try{if(localStorage.getItem("kassa.mfull")==="1")H.classList.add("m-full")}catch(e){}

  // ---------- утилиты ----------
  const MG=["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const MN=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const WD=["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"];
  const WS=["вс","пн","вт","ср","чт","пт","сб"];
  const pad=n=>String(n).padStart(2,"0");
  const iso=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
  const pd=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
  const today=()=>iso(new Date());
  const addD=(s,n)=>{const d=pd(s);d.setDate(d.getDate()+n);return iso(d)};
  const fmt=n=>(n<0?"−":"")+Math.round(Math.abs(+n||0)).toLocaleString("ru-RU").replace(/[\s  ,]/g," ");
  const mln=n=>{const a=Math.abs(n)/1e6;let t=a>=100?a.toFixed(0):a>=10?a.toFixed(1):a.toFixed(2);if(t.includes("."))t=t.replace(/0+$/,"").replace(/\.$/,"");return (n<0?"−":"")+t.replace(".",",")+" млн"};
  const short=n=>Math.abs(n)>=1e6?mln(n):fmt(n);
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const parseAmt=s=>{const v=String(s||"").replace(/[^\d]/g,"");return v?parseInt(v,10):NaN};
  const dLong=s=>{const d=pd(s);return d.getDate()+" "+MG[d.getMonth()]};
  const dWd=s=>{const d=pd(s);return WS[d.getDay()]};
  const dFull=s=>{const d=pd(s);return WD[d.getDay()]+", "+d.getDate()+" "+MG[d.getMonth()]};
  const pl=(n,a,b,c)=>{n=Math.abs(n)%100;const d=n%10;return n>10&&n<20?c:d===1?a:d>=2&&d<=4?b:c};
  const monthEnd=m=>{const d=pd(m+"-01");d.setMonth(d.getMonth()+1);d.setDate(0);return iso(d)};
  const PCOL={"Премиум":"#0a84ff","Яшнабад":"#af52de","Сергели":"#34c759","C1":"#ff9f0a","С1":"#ff9f0a"};
  const pcol=p=>PCOL[p]||"#8e8e93";
  const PAYS=["Наличные","Терминал","QR/Payme","Перечисление"];
  const payOf=s=>(s.pays&&typeof s.pays==="object")?s.pays:{[s.pay||"Наличные"]:+s.sum||0};
  const checkKey=s=>s.date+"|"+s.point+"|"+(s.check?String(s.check):"_"+s.id);
  const S=()=>window.__S, K=()=>window.__K;
  const IC={
    home:'<path d="M3.5 10.5 12 3.5l8.5 7V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19z"/>',
    kassa:'<rect x="3" y="6.5" width="18" height="13" rx="3"/><path d="M3 10h18M16.5 14.5h1.5"/>',
    report:'<path d="M14 3H7.5A1.5 1.5 0 0 0 6 4.5v15A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    sales:'<path d="M5 8h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
    more:'<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
    analytics:'<path d="M4 20V11M10 20V5M16 20v-6M21 20H3"/>',
    plan:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    lens:'<circle cx="7" cy="14" r="3.6"/><circle cx="17" cy="14" r="3.6"/><path d="M10.6 14h2.8M3.4 13 5 7.5M20.6 13 19 7.5"/>',
    batch:'<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
    recon:'<path d="M4 7h11M4 12h7M4 17h9"/><path d="m14 15 2.5 2.5L21 13"/>',
    billz:'<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5"/>',
    help:'<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.1-2.4 3.6M12 17h.01"/>',
    moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    full:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    back:'<path d="M15 5l-7 7 7 7"/>',
    dl:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'
  };
  const svg=(k,c)=>`<svg class="${c||"m-ic"}" viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
  const ring=(p,col,lab)=>{const r=38,L=2*Math.PI*r,len=Math.max(0,Math.min(1,p))*L;return `<svg class="m-ring" viewBox="0 0 92 92" aria-hidden="true"><circle cx="46" cy="46" r="${r}" stroke="var(--line)" stroke-width="9" fill="none"/><circle cx="46" cy="46" r="${r}" stroke="${col}" stroke-width="9" fill="none" stroke-linecap="round" stroke-dasharray="${len.toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 46 46)"/><text x="46" y="52" text-anchor="middle" font-size="19" font-weight="700" fill="var(--ink)">${lab}</text></svg>`};
  const bars=(vals,hl,labels)=>{const m=Math.max(1,...vals),n=vals.length,w=100/n;
    return `<svg class="m-spark" viewBox="0 0 100 76" preserveAspectRatio="none" aria-hidden="true">${vals.map((v,i)=>{const h=v/m*62;return `<rect x="${(i*w+w*.16).toFixed(2)}" y="${(64-h).toFixed(1)}" width="${(w*.68).toFixed(2)}" height="${Math.max(h,v?1.5:0).toFixed(1)}" rx="1.2" fill="${i===hl?"var(--accent)":"color-mix(in srgb,var(--accent) 35%,transparent)"}"/>`}).join("")}</svg>`+(labels?`<div class="m-row m-sm" style="margin-top:4px;font-size:11px">${labels.map(l=>`<span style="flex:1;text-align:center">${l}</span>`).join("")}</div>`:"")};

  const PAYC={"Наличные":"#34c759","Терминал":"#0a84ff","QR/Payme":"#af52de","Перечисление":"#ff9f0a"};
  const CATC=["#0a84ff","#34c759","#ff9f0a","#af52de","#ff375f","#5ac8fa","#ffd60a","#8e8e93","#30b0c7","#a2845e"];
  const pct=(v,t)=>t?Math.round(v/t*100)+"%":"—";
  function donut(items,cTop,cSub){const tot=items.reduce((a,o)=>a+o.value,0)||1;const R=46,L=2*Math.PI*R;let off=0;
    const arcs=items.map(o=>{const len=o.value/tot*L;const g=items.length>1?Math.min(2,len*.25):0;const a=`<circle cx="59" cy="59" r="${R}" fill="none" stroke="${o.color}" stroke-width="16" stroke-dasharray="${Math.max(0,len-g).toFixed(2)} ${L.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 59 59)"/>`;off+=len;return a}).join("");
    return `<div class="m-donut"><svg viewBox="0 0 118 118" aria-hidden="true"><circle cx="59" cy="59" r="${R}" fill="none" stroke="var(--wash)" stroke-width="16"/>${arcs}<text x="59" y="58" text-anchor="middle" font-size="15" font-weight="700" fill="var(--ink)">${cTop}</text><text x="59" y="74" text-anchor="middle" font-size="10" fill="var(--muted)">${cSub||""}</text></svg>
      <div class="m-legend">${items.map(o=>`<div><span><span class="m-dot" style="background:${o.color}"></span>${esc(o.label)}</span><b>${pct(o.value,tot)}</b></div>`).join("")}</div></div>`}
  function hbars(items){const mx=Math.max(1,...items.map(o=>o.value));return items.map(o=>`<div class="m-hb"><div class="m-row"><span>${o.dot?`<span class="m-dot" style="background:${o.color}"></span>`:""}${esc(o.label)}</span><b>${o.valTxt!=null?o.valTxt:mln(o.value)}</b></div><div class="m-bar"><b style="width:${(o.value/mx*100).toFixed(1)}%;background:${o.color}"></b></div>${o.sub?`<small>${o.sub}</small>`:""}</div>`).join("")}
  const W=(title,sub,body)=>`<div class="m-card"><div class="m-wtitle"><b>${title}</b>${sub?`<span class="m-sm">${sub}</span>`:""}</div>${body}</div>`;
  const NODET=s=>/без детализации|погашени/i.test(s.cat||"");
  // ---------- данные ----------
  const sales=()=>(S()&&S().sales)||[];
  const points=()=>{const st=S()&&S().settings;return (st&&st.points&&st.points.length?st.points:["Премиум","Яшнабад","Сергели","C1"])};
  const cats=()=>{const st=S()&&S().settings;return (st&&st.cats&&st.cats.length?st.cats:["Оправы","Детские оправы","Очковые линзы","Солнцезащитные очки","Контактные линзы","Растворы и капли","Аксессуары","Ремонт и услуги"])};
  const inR=(s,f,t)=>s.date&&s.date>=f&&s.date<=t;
  function agg(list){const o={sum:0,n:0,checks:new Set(),pts:{},pay:{},cats:{},days:{}};
    list.forEach(s=>{const v=+s.sum||0;o.sum+=v;o.n++;o.checks.add(checkKey(s));o.pts[s.point]=(o.pts[s.point]||0)+v;o.cats[s.cat||"—"]=(o.cats[s.cat||"—"]||0)+v;o.days[s.date]=(o.days[s.date]||0)+v;
      Object.entries(payOf(s)).forEach(([k,x])=>{o.pay[k]=(o.pay[k]||0)+(+x||0)})});
    o.nc=o.checks.size;o.avg=o.nc?o.sum/o.nc:0;return o}
  const lastSaleDay=()=>{let d="";sales().forEach(s=>{if(s.date&&s.date>d&&s.date<=today())d=s.date});return d};
  const ptsOrder=o=>{const ps=points().filter(p=>o[p]);Object.keys(o).forEach(p=>{if(!ps.includes(p))ps.push(p)});return ps};

  // ---------- состояние и навигация ----------
  const st={tab:"today",stack:[],period:"month",pt:"all",kM:"",rM:"",rD:"",aPeriod:"month"};
  try{const t=sessionStorage.getItem("m.tab");if(t)st.tab=t}catch(e){}
  app.innerHTML=`<div class="m-scr" id="mScr"></div><button type="button" class="m-fab" id="mFab" hidden aria-label="Добавить">＋</button><nav class="m-tb" id="mTb"></nav><div class="m-toast" id="mToast" role="status"></div>`;
  document.body.insertAdjacentHTML("beforeend",`<button type="button" id="mBack">${svg("back","m-ic")}<span>Мобильная версия</span></button>`);
  document.getElementById("mBack").onclick=()=>{H.classList.remove("m-full");try{localStorage.removeItem("kassa.mfull")}catch(e){}scrollTo(0,0);render()};
  const scr=document.getElementById("mScr"),fab=document.getElementById("mFab"),tb=document.getElementById("mTb");
  const TABS=[["today","Сегодня","home"],["kassa","Касса","kassa"],["sales","Продажи","sales"],["report","Отчёт","report"],["more","Ещё","more"]];
  function go(tab){st.tab=tab;st.stack=[];try{sessionStorage.setItem("m.tab",tab)}catch(e){}scrollTo(0,0);render()}
  function push(v){st.stack.push(v);scrollTo(0,0);render()}
  function pop(){st.stack.pop();scrollTo(0,0);render()}
  function toast(t){const el=document.getElementById("mToast");el.textContent=t;el.classList.add("on");clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove("on"),2600)}
  const top=(title,sub,right)=>`<div class="m-top"><div style="min-width:0">${sub?`<small>${sub}</small>`:""}<h1>${title}</h1></div>${right||""}</div>`;
  const backBtn=lbl=>`<button type="button" class="m-back" data-back>${svg("back","")}${lbl}</button>`;

  // ---------- лист снизу ----------
  let sheet=null;
  function openSheet(html,mount){closeSheet(true);
    const ov=document.createElement("div");ov.className="m-ov";const sh=document.createElement("div");sh.className="m-sheet";sh.setAttribute("role","dialog");
    sh.innerHTML=`<div class="m-grab"></div>`+html;document.body.append(ov,sh);sheet={ov,sh};
    requestAnimationFrame(()=>{ov.classList.add("on");sh.classList.add("on")});
    ov.onclick=()=>closeSheet();sh.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeSheet());
    if(mount)mount(sh);return sh}
  function closeSheet(now){if(!sheet)return;const {ov,sh}=sheet;sheet=null;if(now){ov.remove();sh.remove();return}ov.classList.remove("on");sh.classList.remove("on");setTimeout(()=>{ov.remove();sh.remove()},320)}
  const segH=(name,opts,val)=>`<div class="m-seg" data-seg="${name}">${opts.map(([v,l])=>`<button type="button" data-v="${esc(v)}" class="${v===val?"on":""}">${esc(l)}</button>`).join("")}</div>`;
  const segBind=(root,name,cb)=>{const box=root.querySelector(`[data-seg="${name}"]`);if(!box)return;box.querySelectorAll("button").forEach(b=>b.onclick=()=>{box.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));cb&&cb(b.dataset.v)})};
  const segVal=(root,name)=>{const b=root.querySelector(`[data-seg="${name}"] button.on`);return b?b.dataset.v:""};
  const amtInput=inp=>inp.addEventListener("input",()=>{const v=parseAmt(inp.value);inp.value=isNaN(v)?"":fmt(v)});

  // ---------- формы ----------
  function sheetExpense(){
    const KK=K();if(!KK){toast("Касса ещё загружается");return}
    const tpls=(KK.templates||[]).slice().sort((a,b)=>(a.order||99)-(b.order||99));
    const sh=openSheet(`<div class="m-sh-h"><b>Новая запись</b><button type="button" data-close>Отмена</button></div>
      ${tpls.length?`<div class="m-sec" style="margin-top:0">Шаблоны</div><div class="m-chips" style="flex-wrap:wrap;margin:0 0 12px;padding:0">${tpls.map(t=>`<button type="button" class="m-chip" data-tpl="${esc(t.id)}">${esc(t.name)}${t.amount?" · "+fmt(t.amount):""}</button>`).join("")}</div>`:""}
      ${segH("type",[["op","Операционный"],["oth","Прочий"],["inc","Приход"]],"op")}
      <div class="m-fld"><label>Сумма, сум</label><input class="m-in amt" id="eAmt" inputmode="numeric" placeholder="0" data-ios="x"></div>
      <div class="m-fld"><label>Название</label><input class="m-in" id="eName" placeholder="Например: Премиум за такси" data-ios="x"></div>
      <div class="m-g2"><div class="m-fld" style="margin:0"><label>Точка</label><select class="m-in" id="eBranch" data-ios="x">${["Премиум","Яшнабад","Сергели","C1","Общее"].map(p=>`<option>${p}</option>`).join("")}</select></div>
      <div class="m-fld" style="margin:0"><label>Дата</label><input class="m-in" type="date" id="eDate" value="${today()}" data-ios="x"></div></div>
      <div class="m-msg" id="eMsg"></div><button type="button" class="m-btn pri" id="eGo" style="height:54px">Добавить</button>`,sh=>{
        amtInput(sh.querySelector("#eAmt"));segBind(sh,"type");
        sh.querySelectorAll("[data-tpl]").forEach(b=>b.onclick=()=>{const t=tpls.find(x=>x.id===b.dataset.tpl);if(!t)return;
          sh.querySelector("#eName").value=t.name;sh.querySelector("#eAmt").value=t.amount?fmt(t.amount):"";sh.querySelector("#eBranch").value=t.branch||"Премиум";
          const ty=t.type==="inc"?"inc":(t.cat||"op");sh.querySelectorAll('[data-seg="type"] button').forEach(x=>x.classList.toggle("on",x.dataset.v===ty));sh.querySelector("#eAmt").focus()});
        sh.querySelector("#eGo").onclick=async()=>{const amount=parseAmt(sh.querySelector("#eAmt").value),name=sh.querySelector("#eName").value.trim(),ty=segVal(sh,"type"),msg=sh.querySelector("#eMsg");
          if(!amount){msg.textContent="Впишите сумму";return}if(!name){msg.textContent="Впишите название";return}
          const e={type:ty==="inc"?"inc":"exp",name,amount,cat:ty==="inc"?"":ty,branch:sh.querySelector("#eBranch").value,date:sh.querySelector("#eDate").value||today(),source:"manual",createdAt:Date.now()};
          const b=sh.querySelector("#eGo");b.disabled=true;
          try{await K().put("entries",K().newId(),e);closeSheet();toast((e.type==="inc"?"Приход":"Расход")+" добавлен: "+fmt(amount))}catch(err){msg.textContent="Не сохранилось, проверьте интернет";b.disabled=false}};
      });
    setTimeout(()=>{const i=sh.querySelector("#eAmt");i&&i.focus()},350);
  }
  function sheetCash(){
    const KK=K();if(!KK)return;
    const sh=openSheet(`<div class="m-sh-h"><b>Пересчёт кассы</b><button type="button" data-close>Отмена</button></div>
      <p class="m-sm" style="margin:0 4px 12px">Посчитайте наличные в кассе и впишите сумму. Должно быть: <b style="color:var(--ink)">${fmt((window.__kassa||{}).expected||0)}</b></p>
      <div class="m-fld"><label>Наличных в кассе, сум</label><input class="m-in amt" id="cAmt" inputmode="numeric" placeholder="0" data-ios="x"></div>
      <div class="m-msg" id="cMsg"></div><button type="button" class="m-btn pri" id="cGo" style="height:54px">Сохранить пересчёт</button>`,sh=>{
        amtInput(sh.querySelector("#cAmt"));
        sh.querySelector("#cGo").onclick=async()=>{const v=parseAmt(sh.querySelector("#cAmt").value);if(isNaN(v)){sh.querySelector("#cMsg").textContent="Впишите сумму цифрами";return}
          sh.querySelector("#cGo").disabled=true;try{await K().saveCash(v);closeSheet();toast("Пересчёт сохранён")}catch(e){sh.querySelector("#cMsg").textContent="Не сохранилось";sh.querySelector("#cGo").disabled=false}};
      });
    setTimeout(()=>{const i=sh.querySelector("#cAmt");i&&i.focus()},350);
  }
  function sheetSale(pre){
    const SS=S();if(!SS){toast("Продажи ещё загружаются");return}
    const prods=[...new Set(sales().slice(-1500).map(s=>s.product).filter(Boolean))].slice(-400);
    const pts=points();const p0=pre&&pre.point||(st.pt!=="all"?st.pt:pts[0]);
    const sh=openSheet(`<div class="m-sh-h"><b>Новая продажа</b><button type="button" data-close>Отмена</button></div>
      ${segH("pt",pts.map(p=>[p,p]),p0)}
      <div class="m-fld"><label>Товар</label><input class="m-in" id="sProd" list="mProdList" placeholder="Например: Оправа Bagozza" autocomplete="off" data-ios="x"><datalist id="mProdList">${prods.map(p=>`<option value="${esc(p)}">`).join("")}</datalist></div>
      <div class="m-fld"><label>Категория</label><select class="m-in" id="sCatM" data-ios="x">${cats().map(c=>`<option>${esc(c)}</option>`).join("")}</select></div>
      <div class="m-g2"><div class="m-fld" style="margin:0"><label>Сумма, сум</label><input class="m-in" id="sSumM" inputmode="numeric" placeholder="0" data-ios="x" style="font-weight:700;font-size:19px"></div>
      <div class="m-fld" style="margin:0"><label>Кол-во</label><input class="m-in" id="sQtyM" inputmode="numeric" value="1" data-ios="x"></div></div>
      <div class="m-sec" style="margin-top:4px">Оплата</div>
      ${segH("pay",[["Наличные","Нал"],["Терминал","Терминал"],["QR/Payme","QR"],["Перечисление","Перечисл."]],"Наличные")}
      <div class="m-g2"><div class="m-fld" style="margin:0"><label>Дата</label><input class="m-in" type="date" id="sDateM" value="${pre&&pre.date||today()}" data-ios="x"></div>
      <div class="m-fld" style="margin:0"><label>Чек №</label><input class="m-in" id="sChkM" inputmode="numeric" placeholder="необяз." data-ios="x"></div></div>
      <div class="m-msg" id="sMsgM"></div><button type="button" class="m-btn pri" id="sGo" style="height:54px">Добавить продажу</button>`,sh=>{
        segBind(sh,"pt");segBind(sh,"pay");amtInput(sh.querySelector("#sSumM"));
        sh.querySelector("#sProd").addEventListener("change",()=>{const n=sh.querySelector("#sProd").value.trim().toLowerCase();const last=[...sales()].filter(s=>(s.product||"").toLowerCase()===n).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0];
          if(last){if(cats().includes(last.cat))sh.querySelector("#sCatM").value=last.cat;if(!sh.querySelector("#sSumM").value&&last.price)sh.querySelector("#sSumM").value=fmt(last.price)}});
        sh.querySelector("#sGo").onclick=async()=>{const msg=sh.querySelector("#sMsgM");const product=sh.querySelector("#sProd").value.trim(),sum=parseAmt(sh.querySelector("#sSumM").value),qty=parseAmt(sh.querySelector("#sQtyM").value)||1;
          if(!product){msg.textContent="Впишите товар";return}if(!sum){msg.textContent="Впишите сумму";return}
          const rec={date:sh.querySelector("#sDateM").value||today(),point:segVal(sh,"pt"),cat:sh.querySelector("#sCatM").value,product,qty,price:Math.round(sum/qty),sum,check:sh.querySelector("#sChkM").value.trim(),pay:segVal(sh,"pay"),pays:null,createdAt:Date.now()};
          const b=sh.querySelector("#sGo");b.disabled=true;
          try{await S().putSale(S().newId(),rec);closeSheet();toast("Добавлено: "+product+", "+fmt(sum))}catch(e){msg.textContent="Не сохранилось, проверьте интернет";b.disabled=false}};
      });
  }
  function sheetSaleActs(s){
    openSheet(`<div class="m-sh-h"><b style="font-size:18px">${esc(s.product||"Продажа")}</b><button type="button" data-close>Закрыть</button></div>
      <div class="m-card m-list" style="background:var(--m-bg);border:0">
        <div class="m-it"><div class="l">Сумма</div><div class="r">${fmt(s.sum)}</div></div>
        <div class="m-it"><div class="l">Точка · дата</div><div class="r">${esc(s.point)} · ${dLong(s.date)}</div></div>
        <div class="m-it"><div class="l">Категория</div><div class="r">${esc(s.cat||"—")}</div></div>
        <div class="m-it"><div class="l">Оплата</div><div class="r">${esc(s.pay==="Смешанная"&&s.pays?Object.entries(s.pays).map(([k,v])=>k+" "+short(v)).join(" · "):s.pay||"—")}</div></div>
        ${s.qty>1?`<div class="m-it"><div class="l">Количество</div><div class="r">${s.qty} шт</div></div>`:""}
        ${s.check?`<div class="m-it"><div class="l">Чек</div><div class="r">№ ${esc(s.check)}</div></div>`:""}
        ${s.note?`<div class="m-it"><div class="l m-sm" style="color:var(--ink)">${esc(s.note)}</div></div>`:""}
      </div>
      <button type="button" class="m-btn red" id="sDel">Удалить продажу</button>`,sh=>{
        const b=sh.querySelector("#sDel");b.onclick=async()=>{if(!b.dataset.c){b.dataset.c=1;b.textContent="Точно удалить?";return}b.disabled=true;try{await S().delSale(s.id);closeSheet();toast("Продажа удалена")}catch(e){b.disabled=false}}});
  }
  function sheetEntryActs(e){
    const isInc=e.type==="inc";
    openSheet(`<div class="m-sh-h"><b style="font-size:18px">${esc(e.name)}</b><button type="button" data-close>Закрыть</button></div>
      <div class="m-card m-list" style="background:var(--m-bg);border:0">
        <div class="m-it"><div class="l">Сумма</div><div class="r ${isInc?"m-up":"m-dn"}">${isInc?"+":"−"}${fmt(typeof e.fact==="number"?e.fact:e.amount)}</div></div>
        <div class="m-it"><div class="l">Тип</div><div class="r">${isInc?"Приход":e.cat==="op"?"Операционный":"Прочий"}</div></div>
        <div class="m-it"><div class="l">Точка · дата</div><div class="r">${esc(e.branch||"—")} · ${e.date?dLong(e.date):"—"}</div></div>
      </div>
      <button type="button" class="m-btn red" id="eDel">Удалить запись</button>`,sh=>{
        const b=sh.querySelector("#eDel");b.onclick=async()=>{if(!b.dataset.c){b.dataset.c=1;b.textContent="Точно удалить?";return}b.disabled=true;try{await K().del("entries",e.id);closeSheet();toast("Запись удалена")}catch(err){b.disabled=false}}});
  }
  function sheetReport(d,r){
    const v=k=>r&&r[k]!=null?fmt(r[k]):"";
    openSheet(`<div class="m-sh-h"><b>Отчёт за ${dLong(d)}</b><button type="button" data-close>Отмена</button></div>
      <div class="m-fld"><label>Р/с на начало дня</label><input class="m-in" id="rS" inputmode="numeric" value="${v("rsStart")}" data-ios="x"></div>
      <div class="m-fld"><label>Р/с на конец дня</label><input class="m-in" id="rE" inputmode="numeric" value="${v("rsEnd")}" data-ios="x"></div>
      <div class="m-fld"><label>Итог гросс нал</label><input class="m-in" id="rC" inputmode="numeric" value="${v("grossCash")}" data-ios="x"></div>
      <p class="m-sm" style="margin:0 4px 12px">Гросс безнал считается сам. Банковские строки и тийины удобнее вносить в полной версии.</p>
      <div class="m-msg" id="rMsg"></div><button type="button" class="m-btn pri" id="rGo" style="height:54px">Сохранить</button>`,sh=>{
        ["rS","rE","rC"].forEach(id=>amtInput(sh.querySelector("#"+id)));
        sh.querySelector("#rGo").onclick=async()=>{const n=id=>{const x=parseAmt(sh.querySelector("#"+id).value);return isNaN(x)?null:x};
          const patch={};const a=n("rS"),b=n("rE"),c=n("rC");
          // тийины не теряем: если сумма совпадает в целых, оставляем прежнее значение
          const keep=(k,x)=>{if(x==null)return null;const o=r&&r[k];return o!=null&&Math.round(o)===x?o:x};
          patch.rsStart=keep("rsStart",a);patch.rsEnd=keep("rsEnd",b);patch.grossCash=keep("grossCash",c);
          sh.querySelector("#rGo").disabled=true;try{await S().rpSave(d,patch);closeSheet();toast("Отчёт сохранён")}catch(e){sh.querySelector("#rMsg").textContent="Не сохранилось";sh.querySelector("#rGo").disabled=false}};
      });
  }

  // ---------- экраны ----------
  function scrToday(){
    const t=today(),all=sales(),ld=lastSaleDay();
    const tl=all.filter(s=>s.date===t),a=agg(tl);
    const showD=tl.length?t:ld, sl=all.filter(s=>s.date===showD), sa=agg(sl);
    // средний день месяца
    const m=t.slice(0,7),ml=all.filter(s=>(s.date||"").startsWith(m)&&s.date<t),ma=agg(ml),nd=Object.keys(ma.days).length,avgDay=nd?ma.sum/nd:0;
    const vs=a.sum&&avgDay?Math.round((a.sum/avgDay-1)*100):null;
    const kx=window.__kassa||{};
    let plan="";const SS=S();
    if(SS&&SS.plCalc){try{const P=SS.plCalc(m),tot=P.c.total;if(tot){const X=SS.plStats(tot,P.fact,P.factBefore,P.work,P.done,P.left,P.past);
      plan=`<div class="m-card"><div class="m-row"><div style="min-width:0"><div class="m-lb">План ${MN[+m.slice(5,7)-1].toLowerCase()}а</div><div class="m-mid">${mln(P.fact)} из ${mln(tot)}</div><div class="m-sm">${P.past?"месяц закрыт":`нужно ${mln(X.needDay)} в день · ${P.left.length} ${pl(P.left.length,"раб. день","раб. дня","раб. дней")}`}</div></div>${ring(X.pct,X.fpct>=1?"var(--plus)":X.fpct>=.85?"#ff9f0a":"var(--minus)",Math.round(X.pct*100)+"%")}</div></div>`}}catch(e){}}
    const ptRows=list=>{const ag=agg(list),ps=ptsOrder(ag.pts);return ps.length?ps.map(p=>`<div><div class="m-row m-sm" style="color:#fff;margin-bottom:5px"><span>${esc(p)}</span><b>${fmt(ag.pts[p])}</b></div><div class="m-bar"><b style="width:${(ag.pts[p]/(ag.sum||1)*100).toFixed(1)}%;background:#fff"></b></div></div>`).join(""):""};
    const last14=[];for(let i=13;i>=0;i--){last14.push(addD(t,-i))}
    const vals=last14.map(d=>all.filter(s=>s.date===d).reduce((x,s)=>x+(+s.sum||0),0));
    return top("Сегодня",dFull(t),`<div class="m-av">${esc(((window.__sbEmail||"С")[0]||"С").toUpperCase())}</div>`)+
      `<div class="m-card m-hero"><div class="m-lb">${tl.length?"Выручка за день":"Сегодня продаж пока нет"}</div><div class="m-big">${fmt(a.sum)}</div>
       <div class="m-sm">${tl.length?`${a.nc} ${pl(a.nc,"чек","чека","чеков")}${vs!=null?` · <b>${vs>0?"+":""}${vs}%</b> к среднему дню`:""}`:showD?`последний день с продажами: ${dLong(showD)} · ${fmt(sa.sum)}`:""}</div>
       ${sl.length?`<div style="margin-top:14px;display:flex;flex-direction:column;gap:9px">${ptRows(sl)}</div>`:""}</div>
      <div class="m-btns"><button type="button" class="m-btn pri" data-act="sale">＋ Продажа</button><button type="button" class="m-btn" data-act="exp">＋ Расход</button></div>
      <div class="m-g2"><div class="m-card" data-go="kassa"><div class="m-lb">На руках</div><div class="m-mid">${kx.expected!=null?mln(kx.expected):"—"}</div><div class="m-sm">должно быть</div></div>
      <div class="m-card" data-act="cash"><div class="m-lb">Пересчёт</div><div class="m-mid ${kx.diff>0?"m-up":kx.diff<0?"m-dn":""}">${kx.diff==null?"—":(kx.diff>0?"+":"")+mln(kx.diff)}</div><div class="m-sm">${kx.diff==null?"нажмите, чтобы пересчитать":kx.diff>0?"излишек":kx.diff<0?"недостача":"касса сходится"}</div></div></div>
      ${plan}
      <div class="m-card"><div class="m-row"><div class="m-lb">Выручка за 14 дней</div><span class="m-sm">${mln(vals.reduce((a,b)=>a+b,0))}</span></div><div style="margin-top:10px">${bars(vals,13,last14.map((d,i)=>i%2===1?"":String(+d.slice(8))))}</div></div>`;
  }
  function scrKassa(){
    const KK=K();if(!KK)return top("Касса")+`<div class="m-empty">Загрузка…</div>`;
    const ms=KK.kMonths();if(!st.kM||!ms.includes(st.kM))st.kM=ms[ms.length-1];
    const M=st.kM,isLast=M===ms[ms.length-1],c=KK.compute(M),cs=isLast?KK.cashState(c):null;
    const diff=cs?cs.actual-c.expected:null;
    const ents=KK.entries.filter(e=>(e.date||"").slice(0,7)===M&&!(e.source==="day"&&!["Премиум","Яшнабад"].includes(e.branch))).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.createdAt||0)-(a.createdAt||0));
    const isBc=e=>e.type==="inc"&&e.kind==="bc";
    const val=e=>typeof e.fact==="number"?e.fact:(+e.amount||0);
    const cash=KK.cash;
    return top("Касса","Наличные · Премиум и Яшнабад")+
      (ms.length>1?segH("km",ms.slice(-3).map(m=>[m,MN[+m.slice(5,7)-1]]),M):"")+
      `<div class="m-card m-hero"><div class="m-lb">${isLast?"Должно быть на руках":"Остаток за "+MN[+M.slice(5,7)-1].toLowerCase()}</div><div class="m-big">${fmt(c.expected)}</div>
       ${cs?`<div class="m-row" style="margin-top:12px;background:rgba(255,255,255,.16);border-radius:14px;padding:10px 12px"><div><div class="m-sm">Факт${cash&&cash.updatedAt?" · пересчёт "+new Date(cash.updatedAt).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):""}</div><b style="font-size:18px">${fmt(cs.actual)}</b></div><span class="m-pill ${diff>=0?"g":"r"}">${diff>0?"излишек +":diff<0?"недостача −":"сходится "}${diff?fmt(Math.abs(diff)):""}</span></div>`:isLast?`<div class="m-sm" style="margin-top:8px">кассу ещё не пересчитывали</div>`:`<div class="m-sm" style="margin-top:8px">месяц закрыт</div>`}</div>
      ${isLast?`<div class="m-btns"><button type="button" class="m-btn" data-act="cash">Пересчитать</button><button type="button" class="m-btn pri" data-act="exp">＋ Расход</button></div>`:""}
      <div class="m-sec">Как получилось</div>
      <div class="m-card m-list">
        <div class="m-it"><div class="l">Б/Ч${c.days.length?" с "+dLong(c.days[0].d):""}<small>Премиум ${mln(c.bcP)} · Яшнабад ${mln(c.bcY)}</small></div><div class="r">${fmt(c.bcT)}</div></div>
        <div class="m-it"><div class="l">Приходы<small>${c.inc.length} ${pl(c.inc.length,"запись","записи","записей")}</small></div><div class="r m-up">+${fmt(c.sInc)}</div></div>
        <div class="m-it"><div class="l">Операционные<small>${c.op.length} ${pl(c.op.length,"запись","записи","записей")}</small></div><div class="r m-dn">−${fmt(c.sOp)}</div></div>
        <div class="m-it"><div class="l">Прочие<small>поставщики, мастера, зарплата</small></div><div class="r m-dn">−${fmt(c.sOth)}</div></div>
        <div class="m-it" style="font-weight:700"><div class="l">Должно быть</div><div class="r">${fmt(c.expected)}</div></div></div>
      <div class="m-sec">Записи · ${MN[+M.slice(5,7)-1].toLowerCase()}</div>
      <div class="m-card m-list">${ents.length?ents.slice(0,st.kAll?999:25).map(e=>`<div class="m-it tap" data-ent="${esc(e.id)}"><div class="l">${esc(e.name)}<small>${e.date?dLong(e.date):"без даты"} · ${isBc(e)?"Б/Ч дня, уже в расчёте":e.type==="inc"?"приход":e.cat==="op"?"операционный":"прочий"}${e.branch?" · "+esc(e.branch):""}</small></div><div class="r ${e.type==="inc"?(isBc(e)?"":"m-up"):""}">${e.type==="inc"?"+":"−"}${fmt(val(e))}</div></div>`).join(""):`<div class="m-empty">Записей нет</div>`}</div>
      ${ents.length>25&&!st.kAll?`<button type="button" class="m-btn" data-act="kall">Показать все ${ents.length}</button>`:""}`;
  }
  function periodRange(p){const t=today(),m=t.slice(0,7);
    if(p==="today")return [t,t,"Сегодня"];if(p==="7d")return [addD(t,-6),t,"7 дней"];
    if(p==="prev"){const d=pd(m+"-01");d.setDate(0);const pm=iso(d).slice(0,7);return [pm+"-01",monthEnd(pm),MN[+pm.slice(5,7)-1]]}
    if(p==="all")return ["0000-00-00","9999-99-99","Всё время"];
    return [m+"-01",t,MN[+m.slice(5,7)-1]]}
  const prevRange=(f,t)=>{if(f<"1000")return null;const n=Math.round((pd(t)-pd(f))/864e5)+1;return [addD(f,-n),addD(f,-1)]};
  function calHTML(){
    const t=today(),cm=t.slice(0,7);if(!st.cM)st.cM=cm;const m=st.cM;
    const months=[...new Set(sales().map(s=>(s.date||"").slice(0,7)).filter(Boolean))].sort();const minM=months[0]||cm;
    const first=pd(m+"-01"),end=+monthEnd(m).slice(8);
    let list=sales().filter(s=>(s.date||"").startsWith(m));if(st.pt!=="all")list=list.filter(s=>s.point===st.pt);
    const by={},byP={};list.forEach(s=>{const v=+s.sum||0;by[s.date]=(by[s.date]||0)+v;const o=byP[s.date]||(byP[s.date]={});o[s.point]=(o[s.point]||0)+v});
    let tgt=0,off=[0];try{off=(S().planCfg&&S().planCfg.off)||[0];const P=S().plCalc(m);if(P.c.total){let tot=P.c.total;if(st.pt!=="all")tot=tot*(+P.shares[st.pt]||0)/100;tgt=tot/(P.work.length||1)}}catch(e){}
    const vals=Object.values(by),mx=Math.max(1,...vals),total=vals.reduce((a,b)=>a+b,0);
    const best=Object.keys(by).reduce((b,d)=>!b||by[d]>by[b]?d:b,"");
    const lead=(first.getDay()+6)%7;let cells="";
    for(let i=0;i<lead;i++)cells+=`<span class="m-cd empty"></span>`;
    for(let i=1;i<=end;i++){const d=m+"-"+pad(i),v=by[d]||0,wd=pd(d).getDay(),fut=d>t,isOff=off.includes(wd)&&!v;
      const k=v?.14+.86*(v/mx):0;const cls=["m-cd",fut?"fut":"",isOff?"off":"",d===t?"tod":"",v&&tgt&&v>=tgt?"ok":"",k>.58?"hot":""].join(" ");
      const bg=v?`background:color-mix(in srgb,var(--accent) ${Math.round(k*100)}%,var(--wash))`:"";
      const ps=byP[d]?ptsOrder(byP[d]):[];
      cells+=`<button type="button" class="${cls}" ${v?`data-day="${d}"`:"disabled"} style="${bg}" aria-label="${dLong(d)}${v?": "+fmt(v):""}"><span class="n">${i}</span><span class="v">${v?(v/1e6).toFixed(1).replace(".",","):fut&&tgt&&!off.includes(wd)?'<span style="font-size:10px;font-weight:500;color:var(--accent)">план</span>':""}</span>${ps.length?`<span class="pb">${ps.map(p=>`<i style="flex:${byP[d][p]};background:${k>.58?"rgba(255,255,255,.85)":pcol(p)}"></i>`).join("")}</span>`:"<span></span>"}</button>`}
    // недели пн–вс
    const wk=[];let cur=null;for(let i=1;i<=end;i++){const d=m+"-"+pad(i),wd=pd(d).getDay();if(!cur||wd===1){cur={from:d,to:d,work:0,fact:0};wk.push(cur)}cur.to=d;if(!off.includes(wd))cur.work++;cur.fact+=by[d]||0}
    const nm=MN[+m.slice(5,7)-1]+" "+m.slice(0,4);
    return `<div class="m-card"><div class="m-cal-h"><button type="button" class="m-cal-nb" data-act="calp" ${m<=minM?"disabled":""} aria-label="Предыдущий месяц">‹</button><b>${nm}</b><button type="button" class="m-cal-nb" data-act="caln" ${m>=cm?"disabled":""} aria-label="Следующий месяц">›</button></div>
      <div class="m-cal-sum"><div><small>Выручка</small><b>${mln(total)}</b></div><div><small>Дней с продажами</small><b>${Object.keys(by).length}</b></div><div><small>Лучший день</small><b>${best?+best.slice(8)+" · "+(by[best]/1e6).toFixed(1).replace(".",","):"—"}</b></div></div>
      <div class="m-cal-wd">${["пн","вт","ср","чт","пт","сб","вс"].map(x=>`<span>${x}</span>`).join("")}</div>
      <div class="m-cal">${cells}</div>
      <div class="m-cal-leg"><span>меньше<span class="m-cal-scale"></span>больше</span>${tgt?`<span><i style="background:var(--plus)"></i>план дня ${mln(tgt)} выполнен</span>`:""}<span>в млн сум · нажмите на день</span></div>
      ${tgt?`<div style="margin-top:12px">${wk.filter(w=>w.work).map(w=>{const pln=tgt*w.work,fut=t<w.from,r=pln?w.fact/pln:0;return `<div class="m-wk"><span class="m-sm">${+w.from.slice(8)}–${+w.to.slice(8)}</span><div class="m-bar"><b style="width:${Math.min(100,r*100).toFixed(1)}%;background:${r>=1?"var(--plus)":"var(--accent)"}"></b></div><b class="num ${fut?"m-sm":r>=1?"m-up":""}">${fut?"план "+mln(pln):mln(w.fact)+" / "+mln(pln)}</b></div>`}).join("")}</div>`:""}
    </div>`;
  }
  function scrSales(){
    const [f,t]=periodRange(st.period);
    let list=sales().filter(s=>inR(s,f,t));if(st.pt!=="all")list=list.filter(s=>s.point===st.pt);
    const a=agg(list),pr=prevRange(f,t);let ch=null;
    if(pr){let pl2=sales().filter(s=>inR(s,pr[0],pr[1]));if(st.pt!=="all")pl2=pl2.filter(s=>s.point===st.pt);const pa=agg(pl2);if(pa.sum)ch=Math.round((a.sum/pa.sum-1)*100)}
    const days=Object.keys(a.days).sort().reverse();
    const P=[["today","Сегодня"],["7d","7 дней"],["month","Этот месяц"],["prev","Прошлый месяц"],["all","Всё время"]];
    return top("Продажи",st.pt==="all"?"Все точки":st.pt)+
      `<div class="m-chips">${P.map(([k,l])=>`<button type="button" class="m-chip${st.period===k?" on":""}" data-per="${k}">${l}</button>`).join("")}</div>
      <div class="m-chips">${[["all","Все точки"]].concat(points().map(p=>[p,p])).map(([k,l])=>`<button type="button" class="m-chip${st.pt===k?" on":""}" data-pt="${esc(k)}">${k!=="all"?`<span class="m-dot" style="background:${pcol(k)}"></span>`:""}${esc(l)}</button>`).join("")}</div>
      <div class="m-g2"><div class="m-card"><div class="m-lb">Выручка</div><div class="m-mid">${mln(a.sum)}</div><div class="m-sm ${ch>0?"m-up":ch<0?"m-dn":""}">${ch==null?"&nbsp;":(ch>0?"▲ ":ch<0?"▼ ":"")+Math.abs(ch)+"% к прошлому периоду"}</div></div>
      <div class="m-card"><div class="m-lb">Средний чек</div><div class="m-mid">${fmt(a.avg)}</div><div class="m-sm">${a.nc} ${pl(a.nc,"чек","чека","чеков")} · ${a.n} поз.</div></div></div>
      <div class="m-sec">Календарь</div>${calHTML()}
      <div class="m-sec">По дням</div>`+
      (days.length?days.slice(0,st.sAll?400:40).map(d=>{const dl=list.filter(s=>s.date===d),da=agg(dl),ps=ptsOrder(da.pts);
        return `<div class="m-card" data-day="${d}" style="padding:14px 16px;cursor:pointer"><div class="m-row"><b style="font-size:17px">${dWd(d)}, ${dLong(d)}</b><b style="font-size:17px" class="num">${fmt(da.sum)}</b></div>
        <div class="m-sm" style="margin-top:6px">${ps.map(p=>`<span class="m-dot" style="background:${pcol(p)};width:7px;height:7px;margin-right:4px"></span>${esc(p)} ${short(da.pts[p])}`).join(" &nbsp; ")} · ${da.nc} ${pl(da.nc,"чек","чека","чеков")}</div></div>`}).join("")+
        (days.length>40&&!st.sAll?`<button type="button" class="m-btn" data-act="sall">Показать все дни (${days.length})</button>`:"")
      :`<div class="m-card m-empty">За этот период продаж нет</div>`);
  }
  function scrDay(d){
    let list=sales().filter(s=>s.date===d);const a=agg(list),ps=ptsOrder(a.pts);
    if(!st.dPt||!ps.includes(st.dPt))st.dPt=ps[0]||"";
    const pl2=list.filter(s=>s.point===st.dPt).sort((x,y)=>(x.createdAt||0)-(y.createdAt||0));
    const pa=agg(pl2);
    return backBtn("Продажи")+top(dLong(d),WD[pd(d).getDay()])+
      `<div class="m-card m-hero"><div class="m-lb">Выручка дня</div><div class="m-big">${fmt(a.sum)}</div><div class="m-g3" style="margin-top:10px">
        <div><div class="m-sm">Терминал</div><b>${short(a.pay["Терминал"]||0)}</b></div><div><div class="m-sm">QR</div><b>${short(a.pay["QR/Payme"]||0)}</b></div><div><div class="m-sm">Наличные</div><b>${short(a.pay["Наличные"]||0)}</b></div></div>
        ${a.pay["Перечисление"]?`<div class="m-sm" style="margin-top:8px">перечисления ${fmt(a.pay["Перечисление"])}</div>`:""}</div>`+
      (ps.length>1?segH("dpt",ps.map(p=>[p,p]),st.dPt):"")+
      `<div class="m-row" style="margin:4px 4px 8px"><span class="m-sec" style="margin:0">${esc(st.dPt)} · ${pa.nc} ${pl(pa.nc,"чек","чека","чеков")}</span><b class="num">${fmt(pa.sum)}</b></div>
      <div class="m-card m-list">${pl2.map(s=>`<div class="m-it tap" data-sale="${esc(s.id)}"><div class="l">${esc(s.product||"—")}<small>${esc(s.cat||"")}${s.qty>1?" · "+s.qty+" шт":""} · ${esc(s.pay==="QR/Payme"?"QR":s.pay||"")}${s.check?" · чек "+esc(s.check):""}${s.note?" · "+esc(s.note):""}</small></div><div class="r">${fmt(s.sum)}</div></div>`).join("")||`<div class="m-empty">Нет продаж</div>`}</div>`;
  }
  function scrReport(){
    const SS=S();if(!SS||!SS.rpCalc)return top("Отчёт")+`<div class="m-empty">Загрузка…</div>`;
    const t=today(),ms=[...new Set(sales().map(s=>(s.date||"").slice(0,7)).filter(Boolean).concat(Object.keys(SS.repDocs||{}).map(d=>d.slice(0,7))))].filter(m=>m<=t.slice(0,7)).sort();
    if(!st.rM||!ms.includes(st.rM))st.rM=ms[ms.length-1]||t.slice(0,7);
    const R=SS.rpCalc(st.rM,true),rows=R.rows;
    if(!rows.length)return top("Отчёт")+`<div class="m-empty">Нет дней с продажами</div>`;
    const days=rows.map(r=>r.d);if(!st.rD||!days.includes(st.rD)){const ws=rows.filter(r=>r.tot.sum||r.r.rsEnd!=null);st.rD=(ws[ws.length-1]||rows[rows.length-1]).d}
    const row=rows.find(r=>r.d===st.rD),r=row.r||{};
    const ready=rows.filter(x=>x.r&&x.r.rsEnd!=null&&x.r.grossCash!=null).length;
    const gn=SS.rpGN&&st.rD>=SS.RP_GN_FROM?SS.rpGN(st.rD):r.grossNon;
    const ps=R.pts.filter(p=>row.pts[p]&&(row.pts[p].sum||row.cum.pts[p]));
    return top("Отчёт",`${MN[+st.rM.slice(5,7)-1]} · заполнено ${ready} из ${rows.length}`)+
      (ms.length>1?segH("rm",ms.slice(-3).map(m=>[m,MN[+m.slice(5,7)-1]]),st.rM):"")+
      `<div class="m-chips" id="rpDaysM">${rows.map(x=>`<button type="button" class="m-chip${x.d===st.rD?" on":""}" data-rd="${x.d}">${dWd(x.d)} ${+x.d.slice(8)}${x.r&&x.r.rsEnd!=null?"":" ·"}</button>`).join("")}</div>
      <div class="m-g2"><div class="m-card m-hero"><div class="m-lb">Выручка ${st.rD.slice(8)}.${st.rD.slice(5,7)}</div><div class="m-mid">${fmt(row.tot.sum)}</div></div>
        <div class="m-card"><div class="m-lb">С начала мес.</div><div class="m-mid">${mln(row.cum.sum)}</div></div>
        <div class="m-card"><div class="m-lb">Р/с на конец</div><div class="m-mid" style="font-size:18px">${r.rsEnd!=null?fmt(r.rsEnd):"—"}</div><div class="m-sm">${r.rsStart!=null?"на начало "+fmt(r.rsStart):"не заполнено"}</div></div>
        <div class="m-card"><div class="m-lb">Гросс</div><div class="m-sm" style="margin-top:6px">нал <b style="color:var(--ink)">${r.grossCash!=null?fmt(r.grossCash):"—"}</b></div><div class="m-sm">безнал <b style="color:var(--ink)">${gn!=null?fmt(gn):"—"}</b></div></div></div>
      <button type="button" class="m-btn" data-act="rpedit" style="margin-bottom:12px">Заполнить р/с и гросс нал</button>
      <div class="m-sec">По точкам</div>
      <div class="m-card m-list">${ps.map(p=>{const o=row.pts[p];return `<div class="m-it"><div class="l"><span class="m-dot" style="background:${pcol(p)}"></span>${esc(p)}<small>${o.sum?`Б/Ч ${short(o.c)} · терм. ${short(o.t)} · QR ${short(o.q)}${o.e?" · перечисл. "+short(o.e):""}`:"продаж не было"}</small></div><div class="r">${fmt(o.sum)}<small>${mln(row.cum.pts[p]||0)} за мес.</small></div></div>`}).join("")}</div>
      ${row.bc.length?`<div class="m-sec">Расходы с Б/Ч</div><div class="m-card m-list">${row.bc.map(b=>`<div class="m-it"><div class="l">${esc(b.n)}</div><div class="r m-dn">−${fmt(b.a)}</div></div>`).join("")}</div>`:""}
      ${row.bank.length?`<div class="m-sec">Расходы с р/с</div><div class="m-card m-list">${row.bank.map(b=>`<div class="m-it"><div class="l">${esc(b.n||"—")}</div><div class="r m-dn">−${fmt(b.a)}</div></div>`).join("")}</div>`:""}
      <button type="button" class="m-btn pri" data-act="rpxl" style="margin-top:4px">${svg("dl","")} Скачать Excel · все дни</button>`;
  }
  function scrMore(){
    const kx=window.__kassa||{};let pct="";try{const P=S().plCalc(today().slice(0,7));if(P.c.total)pct=Math.round(P.fact/P.c.total*100)+"%"}catch(e){}
    const dark=H.getAttribute("data-theme")==="dark"||(!H.getAttribute("data-theme")&&matchMedia("(prefers-color-scheme: dark)").matches);
    const item=(k,n,v,c)=>`<div class="m-it tap" data-sub="${k}"><div class="l" style="display:flex;align-items:center"><span class="m-icb" style="background:${c}">${svg(k,"")}</span>${n}</div><div class="r m-sm" style="font-weight:500">${v||""}<span class="chev">›</span></div></div>`;
    return top("Ещё")+`<div class="m-card m-list">${item("analytics","Аналитика",mln(agg(sales().filter(s=>(s.date||"").startsWith(today().slice(0,7)))).sum),"#5e5ce6")}${item("plan","План",pct,"#ff9500")}${item("recon","Сверка с Billz","","#34c759")}${item("lens","Линзы","","#af52de")}${item("batch","Склад","","#ff2d55")}${(()=>{let x=null;try{x=S().bzState()}catch(e){}return item("billz","Billz · Сергели",x?`<span class="m-bzdot ${x.cls}"></span>`:"","#30b0c7")})()}${item("help","Инструкция","","#8e8e93")}</div>
      <div class="m-sec">Вид</div><div class="m-card m-list"><div class="m-it tap" data-act="theme"><div class="l">Тёмная тема</div><span class="m-tog${dark?" on":""}"></span></div>
      <div class="m-it tap" data-act="full"><div class="l">Полная версия сайта<small>как на компьютере</small></div><span class="chev m-sm">›</span></div></div>
      ${window.__sbEmail?`<div class="m-sec">Аккаунт</div><div class="m-card m-list"><div class="m-it"><div class="l" style="overflow:hidden;text-overflow:ellipsis">${esc(window.__sbEmail)}</div></div><div class="m-it tap" data-act="out"><div class="l m-dn">Выйти</div></div></div>`:""}`;
  }
  function withRange(f,t,fn){const F=S().F,o=Object.assign({},F);Object.assign(F,{from:f<"1000"?"":f,to:t>"9000"?"":t,point:"all",cat:"all",lk:"all"});try{return fn()}finally{Object.assign(F,o)}}
  function anWidgets(list,a,pr){
    const tot=a.sum||1,ps=ptsOrder(a.pts);let h="";
    // доля точек
    h+=W("Доля точек в выручке","",donut(ps.map(p=>({label:p,value:a.pts[p],color:pcol(p)})),mln(a.sum).replace(" млн",""),"млн сум"));
    // точки сейчас и раньше
    if(pr){const pa=agg(sales().filter(s=>inR(s,pr[0],pr[1])));const mx=Math.max(1,...ps.map(p=>Math.max(a.pts[p]||0,pa.pts[p]||0)));
      h+=W("Точки: сейчас и раньше","яркие — сейчас, бледные — прошлый период",`<div class="m-gb" style="--n:${ps.length}">${ps.map(p=>{const c=a.pts[p]||0,o=pa.pts[p]||0,g=o?Math.round((c/o-1)*100):null;return `<div class="col"><span class="gr ${g>0?"m-up":g<0?"m-dn":"m-sm"}">${g==null?"новая":(g>0?"+":"")+g+"%"}</span><div class="bars"><i style="height:${(o/mx*100).toFixed(1)}%;background:${pcol(p)};opacity:.32"></i><i style="height:${(c/mx*100).toFixed(1)}%;background:${pcol(p)}"></i></div><span class="lbl">${esc(p)}</span><span class="m-sm" style="font-size:11px">${mln(c)}</span></div>`}).join("")}</div>`)}
    // средний чек по точкам
    const chk={};list.forEach(s=>{(chk[s.point]=chk[s.point]||new Set()).add(checkKey(s))});
    h+=W("Средний чек по точкам","",hbars(ps.map(p=>({label:p,value:a.pts[p]/(chk[p]?chk[p].size:1),valTxt:fmt(a.pts[p]/(chk[p]?chk[p].size:1)),color:pcol(p),dot:1,sub:(chk[p]?chk[p].size:0)+" "+pl(chk[p]?chk[p].size:0,"чек","чека","чеков")}))));
    // способы оплаты
    const pays=PAYS.filter(p=>a.pay[p]).map(p=>({label:p==="QR/Payme"?"QR / Payme":p,value:a.pay[p],color:PAYC[p]}));
    h+=W("Способы оплаты","",donut(pays,mln(a.sum).replace(" млн",""),"млн сум")+`<div style="margin-top:12px">${pays.map(o=>`<div class="m-row m-sm" style="padding:3px 0"><span><span class="m-dot" style="background:${o.color}"></span>${o.label}</span><b style="color:var(--ink)">${fmt(o.value)}</b></div>`).join("")}</div>`);
    // выручка по категориям
    const cs=Object.entries(a.cats).sort((x,y)=>y[1]-x[1]);
    h+=W("Выручка по категориям","",donut(cs.slice(0,6).map(([k,v],i)=>({label:k,value:v,color:CATC[i]})).concat(cs.length>6?[{label:"Остальное",value:cs.slice(6).reduce((x,o)=>x+o[1],0),color:"#c7c7cc"}]:[]),mln(a.sum).replace(" млн",""),"млн сум")+`<div style="margin-top:14px">${hbars(cs.slice(0,8).map(([k,v],i)=>({label:k,value:v,color:CATC[i%CATC.length],sub:pct(v,tot)+" выручки"})))}</div>`);
    // самые продаваемые товары
    const prod=(arr)=>{const m={};arr.forEach(s=>{const k=(s.product||"—").trim();const o=m[k]||(m[k]={k,u:0,r:0,pts:{}});o.u+=+s.qty||0;o.r+=+s.sum||0;o.pts[s.point]=(o.pts[s.point]||0)+(+s.qty||0)});return Object.values(m)};
    const rank=(rows,by)=>rows.map((o,i)=>`<div class="m-rank"><span class="no${i<3?" g":""}">${i+1}</span><div class="l"><b>${esc(o.k)}</b><small>${ptsOrder(o.pts).map(p=>esc(p)+" "+o.pts[p]).join(" · ")}</small></div><div class="r">${by==="u"?o.u+" шт":short(o.r)}<small>${by==="u"?short(o.r):o.u+" шт"}</small></div></div>`).join("")||`<div class="m-empty">Нет продаж</div>`;
    const by=st.topBy||"u";const all=prod(list.filter(s=>!NODET(s)&&+s.qty>0)).sort((x,y)=>by==="u"?y.u-x.u||y.r-x.r:y.r-x.r);
    h+=W("Самые продаваемые товары","",segH("topby",[["u","По штукам"],["r","По выручке"]],by)+rank(all.slice(0,10),by));
    const fr=prod(list.filter(s=>s.cat==="Оправы"&&+s.qty>0)).sort((x,y)=>y.u-x.u||y.r-x.r);
    const fu=fr.reduce((x,o)=>x+o.u,0);
    h+=W("Самые продаваемые оправы",fu?fu+" шт всего":"",rank(fr.slice(0,10),"u"));
    // ценовые группы по точкам
    const BANDS=[[0,100000,"до 100 тыс"],[100000,200000,"100–200 тыс"],[200000,300000,"200–300 тыс"],[300000,500000,"300–500 тыс"],[500000,1e6,"500 тыс – 1 млн"],[1e6,2e6,"1–2 млн"],[2e6,1e15,"от 2 млн"]];
    const pgCats=["Оправы","Очковые линзы","Солнцезащитные очки","Детские оправы","all"].filter(c=>c==="all"||a.cats[c]);
    if(!st.pgCat||!pgCats.includes(st.pgCat))st.pgCat=pgCats[0]||"all";if(!st.pgPt)st.pgPt="all";
    const pl2=list.filter(s=>+s.qty>0&&!NODET(s)&&(st.pgCat==="all"||s.cat===st.pgCat)&&(st.pgPt==="all"||s.point===st.pgPt));
    const bd=BANDS.map(b=>({lbl:b[2],u:0,r:0,pr:{}}));pl2.forEach(s=>{const up=(+s.sum||0)/(+s.qty||1);const i=BANDS.findIndex(b=>up>=b[0]&&up<b[1]);if(i<0)return;const o=bd[i];o.u+=+s.qty||0;o.r+=+s.sum||0;o.pr[s.product]=(o.pr[s.product]||0)+(+s.qty||0)});
    const U=bd.reduce((x,o)=>x+o.u,0),mxu=Math.max(1,...bd.map(o=>o.u)),bb=bd.reduce((m,o)=>o.u>m.u?o:m,bd[0]);
    h+=W("Ценовые группы","цена за 1 шт после скидки",`<div class="m-chips" style="margin:0 -16px 8px">${pgCats.map(c=>`<button type="button" class="m-chip${st.pgCat===c?" on":""}" data-pgc="${esc(c)}">${c==="all"?"Все товары":esc(c)}</button>`).join("")}</div>
      <div class="m-chips" style="margin:0 -16px 10px">${["all"].concat(points().filter(p=>sales().some(s=>s.point===p))).map(p=>`<button type="button" class="m-chip${st.pgPt===p?" on":""}" data-pgp="${esc(p)}">${p!=="all"?`<span class="m-dot" style="background:${pcol(p)}"></span>`:""}${p==="all"?"Все точки":esc(p)}</button>`).join("")}</div>
      ${U?`<p class="m-sm" style="margin:0 0 8px">Чаще всего берут в группе <b style="color:var(--ink)">${bb.lbl}</b>: ${bb.u} шт (${pct(bb.u,U)}).</p>`+bd.filter(o=>o.u).map(o=>{const tp=Object.entries(o.pr).sort((x,y)=>y[1]-x[1]).slice(0,3);return `<div class="m-pg${o===bb?" best":""}"><div class="m-row" style="font-size:14px;margin-bottom:5px"><b>${o.lbl}</b><span class="num"><b>${o.u} шт</b> · ${short(o.r)}</span></div><div class="m-bar"><b style="width:${(o.u/mxu*100).toFixed(1)}%;background:${st.pgPt!=="all"?pcol(st.pgPt):"var(--accent)"}"></b></div><small>${tp.map(([k,v])=>esc(k)+" ×"+v).join(", ")}</small></div>`}).join(""):`<div class="m-empty">Нет продаж в этой группе</div>`}`);
    return h;
  }
  function scrAnalytics(){
    const [f,t,lab]=periodRange(st.aPeriod);const list=sales().filter(s=>inR(s,f,t)),a=agg(list),pr=prevRange(f,t);
    let ch=null;if(pr){const pa=agg(sales().filter(s=>inR(s,pr[0],pr[1])));if(pa.sum)ch=Math.round((a.sum/pa.sum-1)*100)}
    const days=Object.keys(a.days).sort(),vals=days.map(d=>a.days[d]);const best=days.reduce((b,d)=>!b||a.days[d]>a.days[b]?d:b,"");
    const cs=Object.entries(a.cats).sort((x,y)=>y[1]-x[1]).slice(0,6),cmax=cs.length?cs[0][1]:1;
    const ps=ptsOrder(a.pts);
    const pays=PAYS.filter(p=>a.pay[p]).map(p=>[p,a.pay[p]]);
    const P=[["7d","7 дней"],["month","Этот месяц"],["prev","Прошлый месяц"],["all","Всё время"]];
    return backBtn("Ещё")+top("Аналитика",lab+" · все точки")+
      `<div class="m-chips">${P.map(([k,l])=>`<button type="button" class="m-chip${st.aPeriod===k?" on":""}" data-aper="${k}">${l}</button>`).join("")}</div>
      <div class="m-g2"><div class="m-card"><div class="m-lb">Выручка</div><div class="m-mid">${mln(a.sum)}</div><div class="m-sm ${ch>0?"m-up":ch<0?"m-dn":""}">${ch==null?"&nbsp;":(ch>0?"▲ ":ch<0?"▼ ":"")+Math.abs(ch)+"% к прошлому периоду"}</div></div>
      <div class="m-card"><div class="m-lb">Средний чек</div><div class="m-mid">${fmt(a.avg)}</div><div class="m-sm">${a.nc} ${pl(a.nc,"чек","чека","чеков")}</div></div>
      <div class="m-card"><div class="m-lb">Лучший день</div><div class="m-mid">${best?mln(a.days[best]):"—"}</div><div class="m-sm">${best?dLong(best):""}</div></div>
      <div class="m-card"><div class="m-lb">В среднем в день</div><div class="m-mid">${days.length?mln(a.sum/days.length):"—"}</div><div class="m-sm">${days.length} ${pl(days.length,"день","дня","дней")} с продажами</div></div></div>
      ${vals.length>1?`<div class="m-card"><div class="m-lb">Выручка по дням</div><div style="margin-top:10px">${bars(vals.slice(-31),days.slice(-31).indexOf(best))}</div></div>`:""}
`+anWidgets(list,a,pr)+`
      <p class="m-sm" style="text-align:center;margin:6px 0">Все 58 показателей — в полной версии (Ещё → Полная версия сайта)</p>`;
  }
  function scrPlan(){
    const SS=S(),m=today().slice(0,7);let P,tot=0;try{P=SS.plCalc(m);tot=P.c.total}catch(e){}
    if(!tot)return backBtn("Ещё")+top("План")+`<div class="m-card m-empty">План на этот месяц не задан. Задайте его в полной версии.</div>`;
    const X=SS.plStats(tot,P.fact,P.factBefore,P.work,P.done,P.left,P.past);
    const col=X.fpct>=1?"var(--plus)":X.fpct>=.85?"#ff9f0a":"var(--minus)";
    const sellers=(SS.planCfg&&SS.planCfg.sellers)||{};
    const byP={};P.list.forEach(s=>byP[s.point]=(byP[s.point]||0)+(+s.sum||0));
    const pts=Object.keys(P.shares).filter(p=>+P.shares[p]>0||byP[p]);
    // недели пн–вс
    const wk=[];let cur=null;P.days.forEach(d=>{const wd=pd(d).getDay();if(!cur||wd===1){cur={from:d,to:d,work:0,fact:0};wk.push(cur)}cur.to=d;if(!(SS.planCfg.off||[0]).includes(wd))cur.work++;});
    wk.forEach(w=>{w.fact=P.list.filter(s=>s.date>=w.from&&s.date<=w.to).reduce((a,s)=>a+(+s.sum||0),0);w.plan=tot*w.work/(P.work.length||1)});
    const t=today();
    return backBtn("Ещё")+top("План",`${MN[+m.slice(5,7)-1]} · ${P.work.length} рабочих дней`)+
      `<div class="m-card"><div class="m-row"><div style="min-width:0"><div class="m-lb">Сделано</div><div class="m-big" style="font-size:28px">${mln(P.fact)}</div><div class="m-sm">из ${mln(tot)} · осталось ${mln(X.need)}</div>
        ${P.past?"":`<span class="m-pill ${X.gap>=0?"g":"r"}" style="margin-top:8px">${X.gap>=0?"впереди на ":"отстаём на "}${mln(Math.abs(X.gap))}</span>`}</div>${ring(X.pct,col,Math.round(X.pct*100)+"%")}</div>
        <div class="m-bar" style="margin-top:12px;height:8px"><b style="width:${Math.min(100,X.pct*100).toFixed(1)}%;background:${col}"></b></div></div>
      <div class="m-g2"><div class="m-card"><div class="m-lb">Нужно в день</div><div class="m-mid">${P.past?"—":mln(X.needDay)}</div><div class="m-sm">${P.left.length} ${pl(P.left.length,"раб. день","раб. дня","раб. дней")}</div></div>
      <div class="m-card"><div class="m-lb">Сейчас в день</div><div class="m-mid">${mln(X.pace)}</div><div class="m-sm">в среднем</div></div>
      <div class="m-card"><div class="m-lb">Прогноз</div><div class="m-mid">${mln(X.forecast)}</div><div class="m-sm">${Math.round(X.fpct*100)}% плана</div></div>
      <div class="m-card"><div class="m-lb">Нужно в неделю</div><div class="m-mid">${P.past?"—":mln(X.needWeek)}</div><div class="m-sm">пн–сб</div></div></div>
      <div class="m-sec">Точки и продавцы</div><div class="m-card">${pts.map(p=>{const pp=tot*(+P.shares[p]||0)/100,f=byP[p]||0,r=pp?f/pp:0;return `<div style="margin-bottom:12px"><div class="m-row" style="font-size:14px;margin-bottom:5px"><span><span class="m-dot" style="background:${pcol(p)}"></span><b>${esc(p)}</b>${sellers[p]?" · "+esc(sellers[p]):""}</span><span class="num">${mln(f)} / ${mln(pp)}</span></div><div class="m-bar"><b style="width:${Math.min(100,r*100).toFixed(1)}%;background:${pcol(p)}"></b></div></div>`}).join("")}</div>
      <div class="m-sec">По неделям</div><div class="m-card m-list">${wk.filter(w=>w.work).map(w=>{const now=t>=w.from&&t<=w.to,fut=t<w.from;return `<div class="m-it"${now?' style="font-weight:600"':""}><div class="l">${+w.from.slice(8)}–${+w.to.slice(8)} ${MG[+w.to.slice(5,7)-1].slice(0,3)}<small>план ${mln(w.plan)}${now?" · эта неделя":""}</small></div><div class="r ${fut?"":w.fact>=w.plan?"m-up":"m-dn"}">${fut?"—":mln(w.fact)}</div></div>`}).join("")}</div>`;
  }
  function scrLens(){
    const [f,t,lab]=periodRange(st.aPeriod);let d;try{d=withRange(f,t,()=>S().lensData())}catch(e){d=null}
    const list=d?d.list:sales().filter(s=>inR(s,f,t)&&/линз/i.test(s.cat||""));
    const u=list.reduce((a,s)=>a+(+s.qty||0),0),r=list.reduce((a,s)=>a+(+s.sum||0),0);
    const by={};list.forEach(s=>{const k=(d&&S().lensKind?S().lensKind(s):s.product)||"Без вида";const o=by[k]||(by[k]={u:0,r:0});o.u+=+s.qty||0;o.r+=+s.sum||0});
    const rows=Object.entries(by).sort((a,b)=>b[1].r-a[1].r);
    const bp={};list.forEach(s=>bp[s.point]=(bp[s.point]||0)+(+s.qty||0));
    const P=[["7d","7 дней"],["month","Этот месяц"],["prev","Прошлый месяц"],["all","Всё время"]];
    return backBtn("Ещё")+top("Линзы",lab+" · очковые линзы")+
      `<div class="m-chips">${P.map(([k,l])=>`<button type="button" class="m-chip${st.aPeriod===k?" on":""}" data-aper="${k}">${l}</button>`).join("")}</div>
      <div class="m-g2"><div class="m-card"><div class="m-lb">Продано</div><div class="m-mid">${fmt(u)} шт</div><div class="m-sm">${ptsOrder(bp).map(p=>esc(p)+" "+bp[p]).join(" · ")}</div></div><div class="m-card"><div class="m-lb">Выручка</div><div class="m-mid">${mln(r)}</div><div class="m-sm">ср. ${u?fmt(r/u):"—"} за шт</div></div></div>
      <div class="m-sec">По видам</div><div class="m-card m-list">${rows.map(([k,o])=>`<div class="m-it"><div class="l">${esc(k)}<small>${o.u} шт · ср. ${o.u?short(o.r/o.u):"—"}</small></div><div class="r">${short(o.r)}</div></div>`).join("")||`<div class="m-empty">Нет продаж линз</div>`}</div>`;
  }
  function scrBatch(){
    const SS=S();const [f,t,lab]=periodRange("month");let md=null;try{md=withRange(f,t,()=>SS.marginData())}catch(e){}
    let items=[];try{items=SS.stockItems()}catch(e){}
    const byPt={};items.forEach(i=>{const o=byPt[i.pt]||(byPt[i.pt]={q:0,c:{}});o.q+=+i.q||0;o.c[i.c]=(o.c[i.c]||0)+(+i.q||0)});
    let meta=null;try{meta=SS.stockMeta()}catch(e){}
    let bt=null;try{const b=(SS.batches||[])[0];if(b){const x=SS.batchStats(b,"all");const q=x.items.reduce((a,i)=>a+i.q,0),sold=x.items.reduce((a,i)=>a+i.sold,0);bt={name:b.name||"Партия",q,sold,low:x.items.filter(i=>i.q&&i.left<=Math.max(1,Math.round(i.q*.2))&&i.sold).length}}}catch(e){}
    const mg=md&&md.tot&&md.tot.mg!=null?Math.round(md.tot.mg*100)+"%":"—";
    return backBtn("Ещё")+top("Склад",meta?"Остатки на "+dLong(meta.date)+" + продажи":"Склад")+
      `<div class="m-g2"><div class="m-card"><div class="m-lb">Маржа · ${lab.toLowerCase()}</div><div class="m-mid m-up">${mg}</div><div class="m-sm">где известна цена покупки</div></div>
      <div class="m-card"><div class="m-lb">${bt?esc(bt.name):"Партия"}</div><div class="m-mid">${bt?fmt(bt.sold):"—"}</div><div class="m-sm">${bt?"продано из "+fmt(bt.q):"партий нет"}</div></div></div>
      ${md&&md.pts&&md.pts.length?`<div class="m-sec">Маржа по точкам</div><div class="m-card m-list">${md.pts.map(o=>`<div class="m-it"><div class="l"><span class="m-dot" style="background:${pcol(o.k)}"></span>${esc(o.k)}<small>прибыль ${short(o.gp)} · посчитано ${Math.round((o.cov||0)*100)}%</small></div><div class="r">${o.mg==null?"—":Math.round(o.mg*100)+"%"}</div></div>`).join("")}</div>`:""}
      ${bzStockCard()}
      <div class="m-sec">Остатки по местам (файл), шт</div><div class="m-card m-list">${Object.entries(byPt).sort((a,b)=>b[1].q-a[1].q).map(([p,o])=>`<div class="m-it"><div class="l">${p!=="Склад"?`<span class="m-dot" style="background:${pcol(p)}"></span>`:""}${esc(p)}<small>${Object.entries(o.c).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([c,q])=>esc(c.toLowerCase())+" "+fmt(q)).join(" · ")}</small></div><div class="r">${fmt(o.q)}</div></div>`).join("")||`<div class="m-empty">Склад не загружен</div>`}</div>
      <p class="m-sm" style="text-align:center;margin:6px 0">Загрузка склада и партий — в полной версии</p>`;
  }
  function scrBillz(){
    const SS=S();let s=null,stt=null,busy=false,next="";try{s=SS.bzSync();stt=SS.bzState();busy=SS.bzBusy();next=SS.bzNext()}catch(e){}
    const last=s&&(s.ok?s:s.lastOk),T=ms=>{try{return SS.bzTime(ms)}catch(e){return ""}};
    const sc=(last&&last.salesCheck)||[],sk=last&&last.stock,sl=last&&last.sales,att=(last&&last.attention)||[];
    return backBtn("Ещё")+top("Billz · Сергели","каждый день в 17:00 · следующая "+esc(next))+
      `<div class="m-card"><div class="m-bzst ${stt?stt.cls:"wait"}">${esc(stt?stt.t:"Загрузка…")}</div>
        <button type="button" class="m-btn pri" data-act="bzrun"${busy?" disabled":""} style="width:100%;margin-top:10px">${busy?"Загружаю…":"Обновить сейчас"}</button></div>
      ${last?`<div class="m-sec">Продажи</div><div class="m-card m-list"><div class="m-it"><div class="l">Добавлено в последний раз<small>${sl&&sl.debts&&sl.debts.length?"долги: "+sl.debts.map(d=>dShortM(d.d)+" "+fmt(d.debt)).join(", "):"без долгов"}</small></div><div class="r">${sl&&sl.checks?sl.checks+" "+pl(sl.checks,"чек","чека","чеков"):"—"}</div></div>
        ${sc.slice(-7).reverse().map(x=>`<div class="m-it"><div class="l">${dShortM(x.d)}<small>Billz ${fmt(x.billz)} · Касса ${fmt(x.kassa)}</small></div><div class="r ${x.ok?"m-up":"m-dn"}">${x.ok?"✓":"≠ "+fmt(x.kassa-x.billz)}</div></div>`).join("")}</div>
      <div class="m-sec">Склад</div><div class="m-card m-list"><div class="m-it"><div class="l">По Billz<small>${sk&&sk.baseline?"первый снимок — сверка со следующей загрузки":"расхождений: "+((sk&&sk.diffCount)||0)}</small></div><div class="r">${sk?fmt(sk.qty)+" шт":"—"}</div></div>
        ${sk&&sk.diffs?sk.diffs.slice(0,20).map(d=>`<div class="m-it"><div class="l">${esc(d.n)}<small>было ${d.prev} · продано ${d.sold} · в Billz ${d.now}</small></div><div class="r ${d.d>0?"m-up":"m-dn"}">${d.d>0?"+":""}${d.d}</div></div>`).join(""):""}</div>
      ${att.length?`<div class="m-card"><div class="m-bzst warn">Требует внимания</div><div class="m-sm" style="margin-top:6px">${att.map(esc).join("<br>")}</div></div>`:""}`:""}
      <p class="m-sm" style="text-align:center;margin:6px 0">Плюс на складе — товар пришёл, минус — ушёл без продажи в Кассе</p>`;
  }
  const dShortM=d=>d?d.slice(8,10)+"."+d.slice(5,7):"—";

  // ---------- Сверка с Billz ----------
  const fq=n=>{n=+n||0;const r=Math.round(n*10)/10;return (r<0?"−":"")+String(Math.abs(r)).replace(".",",")};
  const sg=n=>(n>0?"+":"")+fmt(n);
  const hmT=t=>t?new Date(t).toLocaleTimeString("ru-RU",{timeZone:"Asia/Tashkent",hour:"2-digit",minute:"2-digit"}):"";
  document.addEventListener("bz-cache-reset",()=>{st.rc=null;st.bzs=null;st.trs=null});
  function bzLoad(slot,key,fn){
    const cur=st[slot];if(cur&&cur.key===key)return cur;
    st[slot]={key,loading:true};fn().then(r=>{if(st[slot]&&st[slot].key===key){st[slot]={key,r};render()}}).catch(e=>{if(st[slot]&&st[slot].key===key){st[slot]={key,err:String(e&&e.message||e)};render()}});
    return st[slot];
  }
  function bzStateLine(){let h="";try{h=window.__BZ.collectState()}catch(e){}return `<div class="m-bzline">${h.replace(/bz-pill/g,"m-bzst")}</div>`}
  function scrRecon(){
    const BZ=window.__BZ;if(!BZ)return backBtn("Ещё")+top("Сверка")+`<div class="m-empty">Загрузка…</div>`;
    st.rcPer=st.rcPer||"7d";st.rcPt=st.rcPt||"all";
    const [f,t]=BZ.periodOf(st.rcPer);const key=f+t+st.rcPt;
    const L=bzLoad("rc",key,()=>BZ.mobileRecon(f,t,st.rcPt));
    const P=[["today","Сегодня"],["yday","Вчера"],["7d","7 дней"],["month","Месяц"],["prev","Прошлый"]];
    let h=backBtn("Ещё")+top("Сверка с Billz",dShortM(f)+" — "+dShortM(t))+bzStateLine()+
      `<div class="m-chips">${P.map(([k,l])=>`<button type="button" class="m-chip${st.rcPer===k?" on":""}" data-rcper="${k}">${l}</button>`).join("")}</div>
      <div class="m-chips">${[["all","Все"]].concat(BZ.POINTS.map(p=>[p,p])).map(([k,l])=>`<button type="button" class="m-chip${st.rcPt===k?" on":""}" data-rcpt="${esc(k)}">${esc(l)}</button>`).join("")}</div>`;
    if(L.loading)return h+`<div class="m-empty">Загружаю чеки Billz…</div>`;
    if(L.err)return h+`<div class="m-empty">Ошибка: ${esc(L.err)}</div>`;
    const days=L.r.days,bad=days.filter(d=>!d.ok);
    const bs=days.reduce((a,o)=>a+o.bs,0),ks=days.reduce((a,o)=>a+o.ks,0);
    h+=`<div class="m-g2"><div class="m-card"><div class="m-lb">Billz</div><div class="m-mid">${short(bs)}</div><div class="m-sm">${days.reduce((a,o)=>a+o.bn,0)} чеков</div></div><div class="m-card"><div class="m-lb">Касса</div><div class="m-mid">${short(ks)}</div><div class="m-sm ${Math.abs(ks-bs)<1?"m-up":"m-dn"}">${Math.abs(ks-bs)<1?"сходится ✓":"разница "+sg(ks-bs)}</div></div></div>
      <div class="m-sec">По дням${bad.length?` · <span class="m-dn">${bad.length} с расхождением</span>`:""}</div><div class="m-card m-list">${days.map(o=>`<div class="m-it tap${o.ok?"":(!o.bn||!o.kn)?" m-bzwarn":" m-bzbad"}" data-rcday="${o.d}|${esc(o.p)}"><div class="l">${dShortM(o.d)} · ${esc(o.p)}<small>Billz ${fmt(o.bs)} (${o.bn} ч.) · Касса ${fmt(o.ks)}</small></div><div class="r ${o.ok?"m-up":"m-dn"}">${o.ok?"✓":sg(o.ds)}<span class="chev">›</span></div></div>`).join("")||`<div class="m-empty">Продаж нет</div>`}</div>
      <button type="button" class="m-btn" data-act="bzref" style="margin-top:8px">Обновить из Billz</button>`;
    return h;
  }
  function scrReconDay(k){
    const [d,p]=k.split("|");const L=st.rc&&st.rc.r;if(!L)return backBtn("Сверка")+top(p)+`<div class="m-empty">Загрузка…</div>`;
    const BZ=window.__BZ;const {G,B}=L.match(d,p);
    const it=c=>(c.items||[]).filter(i=>!i.ret||BZ.isRet(c.type)).map(i=>`${esc(i.n)} × ${fq(BZ.isLens(i.c)?(+i.q||+i.rq)/2:(+i.q||+i.rq))}`).join(", ");
    return backBtn("Сверка")+top(p,dShortM(d))+
      `<div class="m-sec">Billz · ${B.length} чеков</div><div class="m-card m-list">${B.map(b=>`<div class="m-it${b.m?"":" m-bzbad"}"><div class="l">${hmT(b.c.t)} · чек ${esc(String(b.c.num).slice(-3))}<small>${it(b.c)}</small><small>${(b.c.pays||[]).map(x=>esc(x.n)+" "+fmt(x.s)).join(" · ")}</small></div><div class="r">${fmt(b.sum)}<small class="${b.m?"m-up":"m-dn"}">${b.m?"✓ в Кассе":"нет в Кассе"}</small></div></div>`).join("")||`<div class="m-empty">Чеков нет</div>`}</div>
      <div class="m-sec">Касса · ${G.length} записей</div><div class="m-card m-list">${G.map(g=>`<div class="m-it${g.m?"":" m-bzbad"}"><div class="l">${g.check?"чек "+esc(g.check):"запись"}<small>${g.rows.map(s=>esc(s.product||s.cat)+" × "+fq(s.qty)).join(", ")}</small></div><div class="r">${fmt(g.sum)}<small class="${g.m?"m-up":"m-dn"}">${g.m?"✓ в Billz":"нет в Billz"}</small></div></div>`).join("")||`<div class="m-empty">Записей нет</div>`}</div>`;
  }
  function bzStockCard(){
    const BZ=window.__BZ;if(!BZ)return "";
    const L=bzLoad("bzs","s",()=>BZ.mobileStock());
    if(L.loading)return `<div class="m-sec">Остатки Billz</div><div class="m-card"><div class="m-empty">Загружаю…</div></div>`;
    if(L.err||!L.r)return `<div class="m-sec">Остатки Billz</div><div class="m-card"><div class="m-empty">${L.err?esc(L.err):"Остатков ещё нет"}</div></div>`;
    const {D,mv}=L.r;const pm=new Map();D.prevRows.forEach(r=>pm.set(r.point+"|"+r.sku,+r.q));
    const per={};BZ.PLACES.forEach(p=>per[p]={q:0,d:0,un:0,items:[]});
    const keys=new Set([...D.rows.map(r=>r.point+"|"+r.sku),...pm.keys(),...mv.keys()]);
    const cm=new Map();D.rows.forEach(r=>cm.set(r.point+"|"+r.sku,+r.q));
    keys.forEach(k=>{const i=k.indexOf("|"),p=k.slice(0,i),s=k.slice(i+1);if(!per[p])return;const now=cm.get(k)||0;per[p].q+=now;if(!D.cmp)return;const was=pm.get(k)||0,m=mv.get(k)||{sold:0,tin:0,tout:0};const un=now-(was-m.sold+m.tin-m.tout);per[p].d+=now-was;if(Math.abs(un)>0.001){per[p].un++;const pr=D.prods.get(s)||{};per[p].items.push({n:pr.name||s,un,now,was})}});
    return `<div class="m-sec">Остатки Billz · ${dShortM(D.cur.d)} ${hmT(D.cur.at)}</div><div class="m-card m-list">${BZ.PLACES.map(p=>{const o=per[p];const op=st.bzPt===p;return `<div class="m-it tap${o.un?" m-bzbad":""}" data-bzpt="${esc(p)}"><div class="l">${p!=="Склад"?`<span class="m-dot" style="background:${pcol(p)}"></span>`:""}${esc(p)}<small>${D.cmp?`за день ${o.d>0?"+":""}${fq(o.d)} шт${o.un?` · ${o.un} без объяснения`:" · всё объяснено ✓"}`:"история с первой выгрузки"}</small></div><div class="r">${fmt(o.q)} шт</div></div>`+(op&&o.items.length?o.items.slice(0,15).map(x=>`<div class="m-it m-sub"><div class="l">${esc(x.n)}<small>было ${fq(x.was)} · сейчас ${fq(x.now)}</small></div><div class="r m-dn">${x.un>0?"+":""}${fq(x.un)}</div></div>`).join(""):"")}).join("")}</div>
      <div class="m-card m-list"><div class="m-it tap" data-sub="trs"><div class="l">Перемещения между точками</div><div class="r"><span class="chev">›</span></div></div></div>`;
  }
  function scrTransfers(){
    const BZ=window.__BZ;const L=BZ?bzLoad("trs","t",()=>BZ.loadTransfers()):{loading:true};
    let h=backBtn("Склад")+top("Перемещения","из Billz");
    if(L.loading)return h+`<div class="m-empty">Загружаю…</div>`;if(L.err)return h+`<div class="m-empty">${esc(L.err)}</div>`;
    return h+`<div class="m-card m-list">${L.r.map(x=>{const diff=x.status==="принят"&&+x.sent!==+x.arrived;const op=st.trOpen===x.id;return `<div class="m-it tap${diff?" m-bzbad":""}" data-trid="${esc(x.id)}"><div class="l">${esc(x.from_point)} → ${esc(x.to_point)}<small>${dShortM(String(x.accepted||x.created||"").slice(0,10))} · №${esc(x.num)} · ${esc(x.status)}</small></div><div class="r">${fmt(x.arrived||x.sent)} шт${diff?`<small class="m-dn">отпр. ${fmt(x.sent)}</small>`:""}</div></div>`+(op?(x.items||[]).map(i=>`<div class="m-it m-sub"><div class="l">${esc(i.n)}<small>${esc(i.sku)}</small></div><div class="r${+i.sent!==+i.arr&&x.status==="принят"?" m-dn":""}">${fq(i.arr||i.sent)}</div></div>`).join(""):"")}).join("")||`<div class="m-empty">Перемещений нет</div>`}</div>`;
  }
  function scrHelp(){
    const Q=[["Как внести продажу","На вкладке «Продажи» нажмите «＋» внизу справа или «＋ Продажа» на экране «Сегодня». Выберите точку, впишите товар и сумму, отметьте способ оплаты. Обычно проще прислать фото листа в чат Claude со словом «делай» — продажи появятся сами."],
      ["Как добавить расход","«＋ Расход» на экране «Сегодня» или на вкладке «Касса». Можно нажать на шаблон — название и сумма подставятся. Операционный — мелкие расходы точек, прочий — крупные платежи, приход — деньги, внесённые в кассу."],
      ["Как пересчитать кассу","«Касса» → «Пересчитать». Посчитайте наличные и впишите сумму. Сайт сравнит её с тем, что должно быть, и покажет излишек или недостачу."],
      ["Что значит «должно быть на руках»","Наличная выручка (Б/Ч) Премиума и Яшнабада с начала месяца плюс приходы минус все расходы. Сергели в кассу не входит."],
      ["Как заполнить и скачать отчёт","«Отчёт» → выберите день → «Заполнить р/с и гросс нал». Выручка по точкам, расходы и гросс безнал считаются сами. Кнопка внизу скачивает Excel со всеми днями."],
      ["Как работает план","План месяца делится между точками по долям. «Нужно в день» — сколько надо продавать каждый оставшийся рабочий день, чтобы выполнить план. Воскресенье — выходной."],
      ["Как удалить ошибочную запись","Нажмите на продажу в дне или на запись в «Кассе» — откроется карточка с кнопкой «Удалить». Нажмите ещё раз для подтверждения."],
      ["Где всё остальное","Ещё → Полная версия сайта: все таблицы, графики и настройки как на компьютере. Вернуться — кнопкой «Мобильная версия» сверху."]];
    return backBtn("Ещё")+top("Инструкция")+`<div class="m-card m-help" style="padding:0 16px">${Q.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>
      <div class="m-card" style="background:var(--accent-soft);border:0"><b>Совет</b><div class="m-sm" style="color:var(--ink);margin-top:4px">Сфотографируйте лист дня и отправьте в чат Claude со словом «делай» — продажи и расходы появятся здесь сами.</div></div>`;
  }

  // ---------- отрисовка ----------
  let raf=0;
  function render(){
    if(!phone.matches||H.classList.contains("m-full"))return;
    const v=st.stack[st.stack.length-1];
    let h="";
    try{
      if(st.tab==="today")h=scrToday();
      else if(st.tab==="kassa")h=scrKassa();
      else if(st.tab==="sales")h=v&&v.day?scrDay(v.day):scrSales();
      else if(st.tab==="report")h=scrReport();
      else if(st.tab==="more")h=!v?scrMore():v.sub==="analytics"?scrAnalytics():v.sub==="plan"?scrPlan():v.sub==="lens"?scrLens():v.sub==="batch"?scrBatch():v.sub==="billz"?scrBillz():v.sub==="recon"?(v.rday?scrReconDay(v.rday):scrRecon()):v.sub==="trs"?scrTransfers():scrHelp();
    }catch(e){console.error(e);h=`<div class="m-empty">Не удалось показать экран. Обновите страницу.</div>`}
    const y=scrollY;scr.innerHTML=h;
    tb.innerHTML=TABS.map(([k,n,ic])=>`<button type="button" data-tab="${k}" class="${st.tab===k?"on":""}">${svg(ic)}<span>${n}</span></button>`).join("");
    fab.hidden=!((st.tab==="sales"&&!v)||(st.tab==="sales"&&v&&v.day));
    window.scrollTo(0,y);
    const dc=document.getElementById("rpDaysM");if(dc){const on=dc.querySelector(".on");if(on)dc.scrollLeft=on.offsetLeft-dc.clientWidth/2+on.offsetWidth/2}
  }
  const queue=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;render()})};

  // ---------- нажатия ----------
  tb.addEventListener("click",e=>{const b=e.target.closest("[data-tab]");if(b)go(b.dataset.tab)});
  fab.onclick=()=>{const v=st.stack[st.stack.length-1];sheetSale(v&&v.day?{date:v.day,point:st.dPt}:null)};
  scr.addEventListener("click",e=>{
    const q=s=>e.target.closest(s);let el;
    if(q("[data-back]")){pop();return}
    if(el=q("[data-act]")){const a=el.dataset.act;
      if(a==="sale")sheetSale();else if(a==="exp")sheetExpense();else if(a==="cash")sheetCash();
      else if(a==="calp"||a==="caln"){const d=pd((st.cM||today().slice(0,7))+"-01");d.setMonth(d.getMonth()+(a==="caln"?1:-1));st.cM=iso(d).slice(0,7);render()}
      else if(a==="kall"){st.kAll=1;render()}else if(a==="sall"){st.sAll=1;render()}
      else if(a==="rpedit"){const R=S().rpCalc(st.rM,true).rows.find(x=>x.d===st.rD);sheetReport(st.rD,R&&R.r)}
      else if(a==="rpxl"){toast("Готовлю файл…");Promise.resolve().then(()=>S().rpExportAll(el)).then(()=>toast("Готово: файл Excel скачан")).catch(()=>toast("Не удалось собрать файл"))}
      else if(a==="theme"){const sw=document.getElementById("themeSw");if(sw){sw.click()}setTimeout(render,450)}
      else if(a==="full"){H.classList.add("m-full");try{localStorage.setItem("kassa.mfull","1")}catch(err){}scrollTo(0,0)}
      else if(a==="bzrun"){const SS=S();if(!SS||!SS.bzRun)return;toast("Загружаю из Billz…");setTimeout(render,50);SS.bzRun().then(r=>{toast(r&&r.ok===false?"Billz: ошибка — "+(r.error||""):"Готово: данные из Billz обновлены");render()})}
      else if(a==="bzref"){const BZ=window.__BZ;if(!BZ)return;toast("Загружаю из Billz…");BZ.refresh(null).then(()=>{st.rc=null;st.bzs=null;st.trs=null;render()})}
      else if(a==="out"){window.__sbSignOut&&window.__sbSignOut()}
      return}
    if(el=q("[data-go]")){go(el.dataset.go);return}
    if(el=q("[data-sub]")){push({sub:el.dataset.sub});return}
    if(el=q("[data-day]")){st.dPt="";push({day:el.dataset.day});return}
    if(el=q("[data-sale]")){const s=sales().find(x=>x.id===el.dataset.sale);if(s)sheetSaleActs(s);return}
    if(el=q("[data-ent]")){const x=K().entries.find(y=>y.id===el.dataset.ent);if(x)sheetEntryActs(x);return}
    if(el=q("[data-per]")){st.period=el.dataset.per;st.sAll=0;render();return}
    if(el=q("[data-rcper]")){st.rcPer=el.dataset.rcper;render();return}
    if(el=q("[data-rcpt]")){st.rcPt=el.dataset.rcpt;render();return}
    if(el=q("[data-rcday]")){push({sub:"recon",rday:el.dataset.rcday});return}
    if(el=q("[data-bzpt]")){st.bzPt=st.bzPt===el.dataset.bzpt?"":el.dataset.bzpt;render();return}
    if(el=q("[data-trid]")){st.trOpen=st.trOpen===el.dataset.trid?"":el.dataset.trid;render();return}
    if(el=q("[data-aper]")){st.aPeriod=el.dataset.aper;render();return}
    if(el=q("[data-pt]")){st.pt=el.dataset.pt;render();return}
    if(el=q("[data-rd]")){st.rD=el.dataset.rd;render();return}
    if(el=q('[data-seg="km"] button')){st.kM=el.dataset.v;st.kAll=0;render();return}
    if(el=q('[data-seg="rm"] button')){st.rM=el.dataset.v;st.rD="";render();return}
    if(el=q('[data-seg="dpt"] button')){st.dPt=el.dataset.v;render();return}
    if(el=q('[data-seg="topby"] button')){st.topBy=el.dataset.v;render();return}
    if(el=q("[data-pgc]")){st.pgCat=el.dataset.pgc;render();return}
    if(el=q("[data-pgp]")){st.pgPt=el.dataset.pgp;render();return}
  });
  document.addEventListener("sales-updated",queue);
  document.addEventListener("kassa-updated",queue);
  phone.addEventListener&&phone.addEventListener("change",queue);
  new MutationObserver(queue).observe(H,{attributes:true,attributeFilter:["class","data-theme"]});
  setTimeout(render,0);setTimeout(queue,1200);
})();
