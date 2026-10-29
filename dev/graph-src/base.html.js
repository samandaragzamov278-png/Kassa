













































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































window.__uiZ=1;try{const z=localStorage.getItem("kassa.size");if(z==="s"||z==="l"){document.documentElement.setAttribute("data-size",z);window.__uiZ=z==="s"?.9:1.1}}catch(e){}
window.__zr=function(el){const r=el.getBoundingClientRect(),z=window.__uiZ||1;return {left:r.left/z,right:r.right/z,top:r.top/z,bottom:r.bottom/z,width:r.width/z,height:r.height/z}};
window.__zw=function(){return innerWidth/(window.__uiZ||1)};window.__zh=function(){return innerHeight/(window.__uiZ||1)};













































































































































































































































































































































































































































































































































































































































































































































































/* Общая выгрузка в Excel с оформлением Saif-Optics (ExcelJS грузится по первому клику) */
window.SaifXL=(function(){
  let lib=null, dl;
  function load(){
    if(window.ExcelJS)return Promise.resolve();
    if(lib)return lib;
    lib=new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";s.onload=res;s.onerror=()=>{lib=null;rej(new Error("load"))};document.head.appendChild(s)});
    return lib;
  }
  const PURPLE="FF6B3FA0",SOFT="FFEFE8F8",ZEBRA="FFF8F6FB",LINE="FFE4DFEC",MUTED="FF6C6580";
  const FMT={money:'#,##0;[Red]-#,##0',int:'#,##0;[Red]-#,##0',pct:'0%',dec:'#,##0.0'};
  const right=c=>c.type&&c.type!=="text";
  async function build(spec){
    await load();
    const wb=new ExcelJS.Workbook();wb.creator="Saif-Optics";wb.created=new Date();
    spec.sheets.forEach(sh=>{
      const n=sh.columns.length;
      const ws=wb.addWorksheet(String(sh.name).slice(0,31),{views:[{state:"frozen",ySplit:4}]});
      sh.columns.forEach((c,i)=>{ws.getColumn(i+1).width=c.width||(right(c)?15:24)});
      ws.mergeCells(1,1,1,Math.max(n,2));const t=ws.getCell(1,1);t.value=sh.title;t.font={name:"Calibri",size:15,bold:true,color:{argb:PURPLE}};ws.getRow(1).height=26;
      ws.mergeCells(2,1,2,Math.max(n,2));const st=ws.getCell(2,1);st.value=sh.subtitle||"";st.font={name:"Calibri",size:10,italic:true,color:{argb:MUTED}};
      const hr=ws.getRow(4);hr.height=32;
      sh.columns.forEach((c,i)=>{const cell=hr.getCell(i+1);cell.value=c.header;cell.font={name:"Calibri",size:11,bold:true,color:{argb:"FFFFFFFF"}};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:PURPLE}};cell.alignment={vertical:"middle",horizontal:right(c)?"right":"left",wrapText:true}});
      const style=(row,isTotal,zebra)=>{sh.columns.forEach((c,i)=>{const cell=row.getCell(i+1);if(right(c)&&FMT[c.type])cell.numFmt=FMT[c.type];cell.alignment={vertical:"middle",horizontal:right(c)?"right":"left",wrapText:!!c.wrap};
        if(isTotal){cell.font={name:"Calibri",bold:true};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:SOFT}};cell.border={top:{style:"medium",color:{argb:PURPLE}}}}
        else{cell.font=Object.assign({name:"Calibri"},row._bold?{bold:true}:{});cell.border={bottom:{style:"thin",color:{argb:LINE}}};if(zebra)cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:ZEBRA}}}})};
      (sh.rows||[]).forEach((r,ri)=>{const row=ws.addRow(sh.columns.map(c=>r[c.key]==null?null:r[c.key]));row._bold=!!r._bold;style(row,false,ri%2===1)});
      if(sh.total){const tr=ws.addRow(sh.columns.map(c=>sh.total[c.key]==null?null:sh.total[c.key]));style(tr,true,false)}
      if(sh.rows&&sh.rows.length&&sh.filter!==false)ws.autoFilter={from:{row:4,column:1},to:{row:4+sh.rows.length,column:n}};
      if(sh.note){ws.addRow([]);const nr=ws.addRow([sh.note]);nr.getCell(1).font={name:"Calibri",size:10,italic:true,color:{argb:MUTED}}}
      ws.pageSetup={orientation:n>6?"landscape":"portrait",fitToPage:true,fitToWidth:1,fitToHeight:0,paperSize:9};
    });
    return await wb.xlsx.writeBuffer();
  }
  async function save(spec,filename,msg){
    msg=msg||function(){};
    try{
      if(dl===undefined){try{dl=window.claude&&window.claude.use?await window.claude.use("downloads"):null}catch(e){dl=null}}
      if(!dl){msg("Выгрузка недоступна в этом окне.",true);return}
      msg("Готовлю файл…");
      const buf=await build(spec);
      const r=await dl.save({filename,data:new Blob([buf])});
      msg(r&&r.status==="saved"?"Файл сохранён: "+filename:"");
    }catch(e){
      if(e&&e.code==="declined"){msg("");return}
      msg(e&&e.message==="load"?"Не загрузился модуль Excel. Проверьте интернет и повторите.":e&&e.code==="rate_limited"?"Окно сохранения уже открыто.":"Не удалось выгрузить файл.",true);
    }
  }
  const today=()=>{const d=new Date();return String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0")+"."+d.getFullYear()};
  return {save,today};
})();



(function(){
  // Б/Ч берём из уточнённого отчёта Excel (коллекция bc); за дни, которых нет в отчёте, — из наличных продаж Премиума и Яшнабада. Сергели в кассу не идёт.
  const KASSA_POINTS=["Премиум","Яшнабад"], KFROM="2026-10-02";
  let sales=[], bcDocs=[], kMonth="";
  const MN=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const monthName=m=>MN[+m.slice(5,7)-1]+" "+m.slice(0,4);
  function kMonths(){const s=new Set();bcDocs.forEach(d=>d.date&&s.add(d.date.slice(0,7)));entries.forEach(e=>e.date&&e.date>="2026-09"&&s.add(e.date.slice(0,7)));sales.forEach(x=>{if(x.date&&KASSA_POINTS.includes(x.point))s.add(x.date.slice(0,7))});return [...s].sort()}
  const curM=()=>{const m=kMonths();return kMonth&&m.includes(kMonth)?kMonth:(m[m.length-1]||new Date().toISOString().slice(0,7))};
  const isLastM=()=>{const m=kMonths();return !m.length||curM()===m[m.length-1]};
  const payOf=s=>(s.pays&&typeof s.pays==="object")?s.pays:{[s.pay||"Наличные"]:+s.sum||0};
  const cashOf=s=>+(payOf(s)["Наличные"]||0);
  const lastM=()=>{const m=kMonths();return m[m.length-1]||new Date().toISOString().slice(0,7)};
  function bcDays(M){
    const m={};
    M=M||curM();
    sales.forEach(s=>{if(!s.date||s.date.slice(0,7)!==M||s.date<KFROM&&M===KFROM.slice(0,7)||!KASSA_POINTS.includes(s.point))return;const o=m[s.date]||(m[s.date]={d:s.date,p:0,y:0,src:"Продажи"});if(s.point==="Премиум")o.p+=cashOf(s);else o.y+=cashOf(s)});
    bcDocs.forEach(d=>{if(d.date&&d.date.slice(0,7)===M)m[d.date]={d:d.date,p:+d.p||0,y:+d.y||0,src:"Excel"}});
    return Object.values(m).sort((a,b)=>a.d.localeCompare(b.d));
  }
  const kAll=()=>entries.filter(e=>!(e.source==="day"&&!KASSA_POINTS.includes(e.branch)));
  const kEntries=M=>{M=M||curM();return kAll().filter(e=>(e.date||"").slice(0,7)===M)};

  const $=id=>document.getElementById(id);
  const fmt=n=>(n<0?"−":"")+Math.round(Math.abs(n)).toLocaleString("ru-RU").replace(/[  ,]/g," ");
  const parseAmt=s=>{const v=String(s||"").replace(/[^\d]/g,"");return v?parseInt(v,10):NaN};
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const dShort=iso=>{if(!iso)return"—";const p=iso.split("-");return p[2]+"."+p[1]};
  const CAT={op:"Операционный",oth:"Прочий"};
  const hasFact=e=>typeof e.fact==="number";
  // приход «остаток Б/Ч дня»: показывается в журнале, но в расчёт не идёт — эти деньги уже в Б/Ч из продаж
  const isBc=e=>e.type==="inc"&&e.kind==="bc";
  const val=e=>hasFact(e)?e.fact:(+e.amount||0);

  let entries=[], templates=[], cash=null, filter="all", editingId=null;
  const kOpenSt=new Set(), kOpenM=new Set(), kAllM=new Set();
  const pl=(n,a,b,c)=>{n=Math.abs(n)%100;const d=n%10;return n>10&&n<20?c:d===1?a:d>=2&&d<=4?b:c};
  let db=null, mode="loading";

  // нормализация названия статьи: «Премиум за такси» → «Такси»
  function article(name){
    let s=String(name).toLowerCase().replace(/^(премиум|яшнабад|сергел[иы])\s+(за|на)\s+/,"").trim();
    if(/доставк[уа]\s+линз/.test(s))return"Доставка линз";
    if(/доставк/.test(s))return"Доставка";
    if(/такси/.test(s))return"Такси";
    if(/вод/.test(s))return"Вода";
    if(/шоколад/.test(s))return"Шоколад";
    if(/персонал/.test(s))return"Подбор персонала";
    if(/моющ/.test(s))return"Моющие средства";
    return s.charAt(0).toUpperCase()+s.slice(1);
  }

  function compute(M){
    const days=bcDays(M), bcT=days.reduce((a,d)=>a+d.p+d.y,0), bcP=days.reduce((a,d)=>a+d.p,0), bcY=days.reduce((a,d)=>a+d.y,0);
    const ke=kEntries(M);
    const bcIn=ke.filter(isBc), inc=ke.filter(e=>e.type==="inc"&&!isBc(e)), op=ke.filter(e=>e.type!=="inc"&&e.cat==="op"), oth=ke.filter(e=>e.type!=="inc"&&e.cat!=="op");
    const sum=a=>a.reduce((x,e)=>x+val(e),0);
    const sInc=sum(inc), sOp=sum(op), sOth=sum(oth);
    const saved=[...op,...oth].reduce((x,e)=>x+(hasFact(e)?(+e.amount||0)-e.fact:0),0);
    return {days,bcT,bcP,bcY,bcIn,inc,op,oth,sInc,sOp,sOth,saved,expected:bcT+sInc-sOp-sOth};
  }
  const byDate=(a,b)=>(a.date||"").localeCompare(b.date||"")||(a.createdAt||0)-(b.createdAt||0);
  const amtCell=e=>hasFact(e)&&e.fact!==+e.amount?`<s class="plan">${fmt(e.amount)}</s> ${fmt(e.fact)}`:fmt(val(e));
  const itemList=arr=>arr.length?`<ul class="items">${[...arr].sort(byDate).map(e=>`<li><span>${dShort(e.date)} · ${esc(e.name)}</span><span class="num">${amtCell(e)}</span></li>`).join("")}</ul>`:"";

  function render(){
    const ms=kMonths(), M=curM(), isLast=isLastM();
    $("kMonthSeg").hidden=ms.length<2;
    $("kMonthSeg").innerHTML=ms.map(m=>`<button type="button" data-km="${m}" aria-pressed="${m===M}">${monthName(m)}</button>`).join("");
    $("kMonthSeg").querySelectorAll("[data-km]").forEach(b=>b.onclick=()=>{kMonth=b.dataset.km;kOpenM.clear();kOpenM.add(kMonth);render()});
    $("tileActual").hidden=!isLast;$("tileDiff").hidden=!isLast;$("addPanel").hidden=!isLast;
    const c=compute();
    let run=c.bcT;
    const nX=c.days.filter(d=>d.src==="Excel").length, nS=c.days.length-nX;
    const last=c.days.length?c.days[c.days.length-1].d:"";
    const stp=(key,sign,cls,title,sub,amt,items,n)=>{const open=kOpenSt.has(key)&&n>0;return `<div class="step${n?" tog":""}${open?" open":""}"${n?` data-st="${key}" role="button" tabindex="0" aria-expanded="${open}"`:""}><span class="sign ${cls}">${sign}</span><div class="lbl"><b>${title}${n?` <span class="chev">${open?"▾":"▸"}</span>`:""}</b><div>${sub}${n?` · <span class="srcs">${open?"свернуть":`показать ${n} ${pl(n,"запись","записи","записей")}`}</span>`:""}</div>${open?items:""}</div><div class="amt">${amt}</div></div>`};
    const dayItems=`<ul class="items">${c.days.map(d=>`<li><span>${dShort(d.d)} · Премиум ${fmt(d.p)} · Яшнабад ${fmt(d.y)} <span class="srcs">(${d.src==="Excel"?"отчёт":"продажи"})</span></span><span class="num">${fmt(d.p+d.y)}</span></li>`).join("")}</ul>`;
    let h=stp("bc","=","s",`Б/Ч Премиума и Яшнабада${c.days.length?" с "+dShort(c.days[0].d):""}${last?" по "+dShort(last):""}`,`Премиум ${fmt(c.bcP)} + Яшнабад ${fmt(c.bcY)} · ${nS?`из продаж: ${nS} дн.`:""}${nS&&nX?", ":""}${nX?`из отчёта: ${nX} дн.`:""}`,`<span class="num">${fmt(c.bcT)}</span><span class="run num">остаток ${fmt(run)}</span>`,dayItems,c.days.length);
    run+=c.sInc;
    h+=stp("inc","+","p","Приходы",c.inc.length?"добавлено к Б/Ч":"пока нет",`<span class="num">+${fmt(c.sInc)}</span><span class="run num">остаток ${fmt(run)}</span>`,itemList(c.inc),c.inc.length);
    run-=c.sOp;
    h+=stp("op","−","op","Операционные расходы","расходы дня Премиума и Яшнабада",`<span class="num">−${fmt(c.sOp)}</span><span class="run num">остаток ${fmt(run)}</span>`,itemList(c.op),c.op.length);
    run-=c.sOth;
    h+=stp("oth","−","oth","Прочие расходы","крупные платежи: поставщики, бухгалтер, мастера",`<span class="num">−${fmt(c.sOth)}</span><span class="run num">остаток ${fmt(run)}</span>`,itemList(c.oth),c.oth.length);
    h+=`<div class="step total"><span class="sign s">=</span><div class="lbl"><b>Должно быть наличными</b></div><div class="amt num">${fmt(c.expected)}</div></div>`;
    $("steps").innerHTML=h;
    $("steps").querySelectorAll("[data-st]").forEach(el=>{const t=()=>{const k=el.dataset.st;kOpenSt.has(k)?kOpenSt.delete(k):kOpenSt.add(k);render()};el.onclick=ev=>{if(ev.target.closest(".items"))return;t()};el.onkeydown=ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();t()}}});

    $("tExpected").textContent=fmt(c.expected)+" сум";
    document.querySelector("#page-kassa .tile.hero .eyebrow").textContent=isLast?"Должно быть на руках":`Остаток Б/Ч за ${monthName(M).toLowerCase()}`;
    $("tExpectedSub").textContent=(isLast?"":"месяц закрыт, пересчёт налички ведётся в текущем месяце · ")+`расходы: операционные ${fmt(c.sOp)} · прочие ${fmt(c.sOth)}`+(c.saved?` · ${c.saved>0?"сэкономили":"перерасход"} ${fmt(Math.abs(c.saved))}`:"");

    const chip=$("tDiffChip");
    if(isLast&&cash&&typeof cash.amount==="number"){
      // записи, сделанные после пересчёта, двигают и «должно быть», и фактическую наличку — излишек не меняется
      const st=cashState(c);const afterExp=st.afterExp, afterInc=st.afterInc, actual=st.actual;
      $("tActual").textContent=fmt(actual)+" сум";
      const when=cash.updatedAt?new Date(cash.updatedAt).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"";
      let meta=`Пересчёт ${when}: ${fmt(cash.amount)}`;
      if(afterExp) meta+=` · после него расходы −${fmt(afterExp)}`;
      if(afterInc) meta+=` · приходы +${fmt(afterInc)}`;
      const diff=c.expected-actual;
      if(diff>0){$("tDiff").textContent=fmt(diff)+" сум";chip.className="chip bad";chip.textContent="Недостача"}
      else if(diff<0){$("tDiff").textContent=fmt(-diff)+" сум";chip.className="chip over";chip.textContent="Излишек"}
      else{$("tDiff").textContent="0 сум";chip.className="chip ok";chip.textContent="Касса сходится"}
      $("cashMeta").textContent=meta;
    }else{$("tActual").textContent="—";$("tDiff").textContent="—";chip.className="chip none";chip.textContent="Пересчитайте кассу";$("cashMeta").textContent="ещё не пересчитывали"}

    renderAnalysis(c); renderJournal(c); renderTemplates(); renderChart(c);
    const cl=isLast?c:compute(lastM());
    const cs=cash&&typeof cash.amount==="number"?cashState(cl):null;
    window.__kassa={month:lastM(),expected:cl.expected,actual:cs?cs.actual:null,diff:cs?cs.actual-cl.expected:null,days:cl.days,sOp:cl.sOp,sOth:cl.sOth};
    window.__kassaFor=m=>{const x=compute(m);return {month:m,closed:m<lastM(),expected:x.expected,bcT:x.bcT,sOp:x.sOp,sOth:x.sOth,sInc:x.sInc,days:x.days.length}};
    document.dispatchEvent(new CustomEvent("kassa-updated"));
  }
  // после пересчёта: новые записи (расходы и приходы), внесённые позже пересчёта и датированные днём пересчёта или позже, двигают и «должно быть», и фактическую наличку
  function cashState(c){
    const cd=cash.updatedAt?new Date(cash.updatedAt):new Date(0);const cday=cd.getFullYear()+"-"+String(cd.getMonth()+1).padStart(2,"0")+"-"+String(cd.getDate()).padStart(2,"0");
    const isAfter=x=>(x.createdAt||0)>(cash.updatedAt||0)&&(!x.date||x.date>=cday);
    const after=kEntries(lastM()).filter(isAfter);
    const afterExp=after.filter(e=>e.type!=="inc").reduce((a,e)=>a+val(e),0);
    const afterInc=after.filter(e=>e.type==="inc"&&!isBc(e)).reduce((a,e)=>a+val(e),0);
    return {afterExp,afterInc,actual:cash.amount-afterExp+afterInc};
  }

  function renderAnalysis(c){
    const tot=c.sOp+c.sOth||1;
    $("splitBar").innerHTML=`<span style="width:${c.sOp/tot*100}%;background:var(--op)"></span><span style="width:${c.sOth/tot*100}%;background:var(--oth)"></span>`;
    $("splitKv").innerHTML=`<div class="kv"><span><i style="background:var(--op)"></i>Операционные · ${c.op.length} зап.</span><span class="num">${fmt(c.sOp)} · ${Math.round(c.sOp/tot*100)}%</span></div><div class="kv"><span><i style="background:var(--oth)"></i>Прочие · ${c.oth.length} зап.</span><span class="num">${fmt(c.sOth)} · ${Math.round(c.sOth/tot*100)}%</span></div><div class="kv" style="border-top:1px solid var(--line);margin-top:4px;padding-top:6px"><b>Всего расходов</b><b class="num">${fmt(c.sOp+c.sOth)}</b></div>`;

    // статьи — только расходы с Б/Ч (источник Excel или мелкие ручные, кроме крупных прочих)
    const small=kEntries().filter(e=>e.type!=="inc"&&e.source!=="nal"&&(e.source==="excel"||e.source==="day"||(e.source!=="photo"&&(+e.amount)<1000000)));
    const map={};small.forEach(e=>{const k=article(e.name);(map[k]=map[k]||{v:0,n:0,cat:e.cat});map[k].v+=val(e);map[k].n++});
    const arts=Object.entries(map).sort((a,b)=>b[1].v-a[1].v);
    const max=arts.length?arts[0][1].v:1, sSmall=small.reduce((a,e)=>a+val(e),0);
    $("articles").innerHTML=arts.length?arts.map(([k,o],i)=>`<div class="hb${i>=6?" art-more":""}"><span class="name">${esc(k)} <span class="srcs">· ${o.n} раз</span></span><span class="val num">${fmt(o.v)}</span><div class="track"><span style="width:${o.v/max*100}%;background:var(--${o.cat==="op"?"op":"oth"})"></span></div></div>`).join("")+
      (arts.length>6?`<button type="button" class="art-tg" aria-expanded="false"><span class="o">Показать все статьи · ${arts.length}</span><span class="c">Свернуть статьи</span><i>⌄</i></button>`:"")+`<div class="kv" style="border-top:1px solid var(--line);margin-top:14px;padding-top:8px"><b>Итого с Б/Ч</b><b class="num">${fmt(sSmall)}</b></div>`+(()=>{const bp={},bd={};small.forEach(e=>{const b=e.branch&&e.branch!=="Общее"?e.branch:"Общее";bp[b]=(bp[b]||0)+val(e);if(e.date)bd[e.date]=(bd[e.date]||0)+val(e)});const pe=Object.entries(bp).sort((a,b)=>b[1]-a[1]),de=Object.entries(bd).sort((a,b)=>b[1]-a[1]),nd=Object.keys(bd).length;
        return `<h3 style="margin-top:16px">По точкам</h3>`+pe.map(([k,v])=>`<div class="kv"><span>${esc(k)}</span><span class="num">${fmt(v)} · ${Math.round(v/(sSmall||1)*100)}%</span></div>`).join("")+
        (de.length?`<h3 style="margin-top:14px">По дням</h3><div class="kv"><span>Самый затратный день</span><span class="num">${dShort(de[0][0])} · ${fmt(de[0][1])}</span></div><div class="kv"><span>В среднем за день с расходами</span><span class="num">${fmt(sSmall/(nd||1))}</span></div><div class="kv"><span>Дней с расходами</span><span class="num">${nd}</span></div>`:"")})():`<div class="empty">Нет мелких расходов</div>`;

    // выводы
    const ins=[];
    if(arts.length){const t=arts[0];ins.push(`Самая крупная статья с Б/Ч: <b>${esc(t[0])}</b>, ${fmt(t[1].v)} сум (${Math.round(t[1].v/sSmall*100)}% мелких расходов).`)}
    const smallOp=small.filter(e=>e.cat==="op").reduce((a,e)=>a+val(e),0);
    if(c.saved>0) ins.push(`По факту потратили на <b>${fmt(c.saved)} сум меньше плана</b>, эти деньги остаются в кассе.`);
    if(smallOp) ins.push(`Операционные расходы точек: ${fmt(smallOp)} сум, это <b>${(smallOp/(c.bcT||1)*100).toFixed(1).replace(".",",")}% от Б/Ч</b>, в среднем ${fmt(smallOp/Math.max(1,c.days.length))} в рабочий день.`);
    const taxi=map["Такси"], dlv=(map["Доставка"]?.v||0)+(map["Доставка линз"]?.v||0);
    if(taxi&&dlv) ins.push(`Такси (${fmt(taxi.v)}) и доставка (${fmt(dlv)}) вместе дают ${fmt(taxi.v+dlv)}. Если это развоз заказов, выгоднее договориться с одним курьером на фиксированную ставку.`);
    const yash=small.filter(e=>e.branch==="Яшнабад").length;
    if(!yash) ins.push(`У Яшнабада пока нет ни одного расхода с Б/Ч. Все мелкие расходы приходятся на Премиум.`);
    const big=c.oth.filter(e=>(+e.amount)>=1000000).reduce((a,e)=>a+val(e),0);
    if(big) ins.push(`Крупные прочие платежи (${fmt(big)}) съедают ${Math.round(big/((c.bcT+c.sInc)||1)*100)}% налички месяца. Основная нагрузка не в мелочах, а в них.`);
    $("insights").innerHTML=ins.map(t=>`<li>${t}</li>`).join("")||"<li>Добавьте расходы, чтобы увидеть выводы.</li>";
  }

  function renderJournal(c){
    let list=[...kAll()].sort((a,b)=>-byDate(a,b));
    if(filter==="op")list=list.filter(e=>e.type!=="inc"&&e.cat==="op");
    if(filter==="oth")list=list.filter(e=>e.type!=="inc"&&e.cat!=="op");
    if(filter==="inc")list=list.filter(e=>e.type==="inc");
    const M=curM();if(!kOpenM.size)kOpenM.add(M);
    const row=e=>{
      const pill=isBc(e)?`<span class="pill inc" title="Остаток Б/Ч дня: уже учтён в строке Б/Ч, второй раз не прибавляется">приход · Б/Ч дня</span>`:e.type==="inc"?`<span class="pill inc">приход</span>`:`<span class="pill ${e.cat==="op"?"op":"oth"}">${e.cat==="op"?"операционный":"прочий"}</span>`;
      const isExp=e.type!=="inc", d=hasFact(e)?(+e.amount||0)-e.fact:0;
      const factCell=isExp?`<input class="factin num" data-fact="${esc(e.id)}" inputmode="numeric" value="${hasFact(e)?fmt(e.fact):""}" placeholder="${fmt(e.amount)}" aria-label="Фактически потрачено: ${esc(e.name)}">`:`<span class="srcs">—</span>`;
      const diffCell=isExp&&d?`<span class="${d>0?"save":"over"} num">${d>0?"−":"+"}${fmt(Math.abs(d))}</span>`:"";
      return `<tr class="${e.id===editingId?"editing":""}"><td class="num">${dShort(e.date)}</td><td>${esc(e.name)}${e.source==="excel"?' <span class="srcs">· Excel</span>':e.source==="photo"?' <span class="srcs">· записка</span>':e.source==="nal"?' <span class="srcs">· расходы с налички</span>':e.source==="day"?' <span class="srcs">· отчёт дня</span>':""}</td><td>${pill}</td><td>${esc(e.branch||"—")}</td><td class="r num">${isBc(e)?`<span class="srcs" title="уже учтено в Б/Ч">+${fmt(e.amount)}</span>`:(e.type==="inc"?"+":"−")+fmt(e.amount)}</td><td class="r">${factCell}</td><td class="r">${diffCell}</td><td class="acts"><button class="ghost" type="button" data-edit="${esc(e.id)}">Изменить</button><button class="ghost del" type="button" data-del="${esc(e.id)}">Удалить</button></td></tr>`};
    const byM={};list.forEach(e=>{const m=(e.date||"").slice(0,7)||"—";(byM[m]=byM[m]||[]).push(e)});
    const months=Object.keys(byM).sort().reverse();
    const LIM=10;
    $("entriesBody").innerHTML=months.map(m=>{const arr=byM[m],open=kOpenM.has(m),all=kAllM.has(m);
      const exp=arr.filter(e=>e.type!=="inc").reduce((a,e)=>a+val(e),0),inc=arr.filter(e=>e.type==="inc"&&!isBc(e)).reduce((a,e)=>a+val(e),0);
      const head=`<tr class="mrow${open?" open":""}" data-mo="${m}" tabindex="0" role="button" aria-expanded="${open}"><td colspan="8"><span class="chev">${open?"▾":"▸"}</span> <b>${m==="—"?"Без даты":monthName(m)}</b> <span class="srcs">· ${arr.length} ${pl(arr.length,"запись","записи","записей")} · расходы −${fmt(exp)}${inc?` · приходы +${fmt(inc)}`:""}</span></td></tr>`;
      if(!open)return head;
      const shown=all?arr:arr.slice(0,LIM);
      return head+shown.map(row).join("")+(arr.length>LIM?`<tr><td colspan="8" style="padding:4px 0"><button type="button" class="jmore" style="width:100%;margin:0" data-mall="${m}">${all?"Свернуть":`Показать все (${arr.length})`}</button></td></tr>`:"");
    }).join("");
    const cur=byM[M]||[];
    const s=cur.filter(e=>!isBc(e)).reduce((a,e)=>a+(e.type==="inc"?1:-1)*(+e.amount),0);
    const sf=cur.filter(e=>!isBc(e)).reduce((a,e)=>a+(e.type==="inc"?1:-1)*val(e),0);
    const sd=cur.reduce((a,e)=>a+(e.type!=="inc"&&hasFact(e)?(+e.amount||0)-e.fact:0),0);
    $("entriesFoot").innerHTML=cur.length?`<tr><td colspan="4"><b>Итого за ${monthName(M).toLowerCase()}</b></td><td class="r num"><b>${fmt(s)}</b></td><td class="r num"><b>${fmt(sf)}</b></td><td class="r num">${sd?`<b class="${sd>0?"save":"over"}">${sd>0?"−":"+"}${fmt(Math.abs(sd))}</b>`:""}</td><td></td></tr>`:"";
    $("entriesBody").querySelectorAll("[data-mo]").forEach(r=>{const t=()=>{const m=r.dataset.mo;kOpenM.has(m)?kOpenM.delete(m):kOpenM.add(m);if(!kOpenM.size)kOpenM.add("__none");renderJournal(c)};r.onclick=t;r.onkeydown=ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();t()}}});
    $("entriesBody").querySelectorAll("[data-mall]").forEach(b=>b.onclick=()=>{const m=b.dataset.mall;kAllM.has(m)?kAllM.delete(m):kAllM.add(m);renderJournal(c)});
    $("entriesBody").querySelectorAll("[data-fact]").forEach(inp=>{
      inp.addEventListener("input",()=>{const v=parseAmt(inp.value);inp.value=isNaN(v)?"":fmt(v)});
      const commit=()=>saveFact(inp.dataset.fact,inp.value);
      inp.addEventListener("change",commit);
      inp.addEventListener("keydown",ev=>{if(ev.key==="Enter"){ev.preventDefault();inp.blur()}});
    });
    $("entriesEmpty").hidden=list.length>0;
    $("entriesBody").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>startEdit(b.dataset.edit));
    $("entriesBody").querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>askDelete(b));
  }

  function renderTemplates(){
    if(!templates.length){$("tplWrap").innerHTML=`<p class="note" style="margin-bottom:14px">Шаблонов пока нет. Отметьте «сохранить как шаблон» при добавлении расхода.</p>`;return}
    const grp=k=>templates.filter(t=>(t.type==="inc"?"inc":t.cat)===k).sort((a,b)=>(a.order||99)-(b.order||99)||a.name.localeCompare(b.name));
    const chip=t=>`<span class="tpl" role="button" tabindex="0" data-tpl="${esc(t.id)}"><span class="dot" style="background:var(--${t.type==="inc"?"plus":t.cat==="op"?"op":"oth"})"></span>${esc(t.name)}${t.amount?` <span class="num">${fmt(t.amount)}</span>`:""}<button class="x" type="button" data-tdel="${esc(t.id)}" aria-label="Удалить шаблон">×</button></span>`;
    const blocks=[["op","Операционные"],["oth","Прочие"],["inc","Приходы"]].map(([k,n])=>{const g=grp(k);return g.length?`<div class="tplgroup"><span class="eyebrow">${n}</span><div class="tpls" style="margin-bottom:6px">${g.map(chip).join("")}</div></div>`:""}).join("");
    $("tplWrap").innerHTML=`<div style="margin-bottom:12px">${blocks}</div>`;
    $("tplWrap").querySelectorAll("[data-tpl]").forEach(el=>{
      const go=()=>applyTpl(el.dataset.tpl);
      el.addEventListener("click",ev=>{if(ev.target.closest("[data-tdel]"))return;go()});
      el.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();go()}});
    });
    $("tplWrap").querySelectorAll("[data-tdel]").forEach(b=>b.onclick=ev=>{ev.stopPropagation();removeTpl(b.dataset.tdel)});
  }

  function renderChart(c){
    const days=c.days, n=Math.max(days.length,1);
    const fw=(()=>{const p=$("dayChart").parentElement;return p&&p.offsetParent!==null?p.clientWidth:0})();
    const W=Math.max(620,60+n*44,fw),H=240,L=40,R=8,T=20,B=28,ch=H-T-B,cw=W-L-R,gap=cw/n,bw=Math.min(gap*0.56,40);
    const mx=Math.max(1,...days.map(d=>(d.p+d.y)/1e6));const step=mx>12?4:mx>6?2:1;const max=Math.ceil(mx/step)*step;
    let s="";
    for(let v=0;v<=max;v+=step){const y=T+ch-(v/max)*ch;s+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${L-8}" y="${y+4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono,monospace">${v}</text>`}
    days.forEach((d,i)=>{const x=L+i*gap+(gap-bw)/2;let y0=T+ch;const op=d.src==="Excel"?' opacity=".55"':'';
      [["p","var(--b1)","Премиум"],["y","var(--b2)","Яшнабад"]].forEach(([k,col,nm])=>{const h=d[k]/1e6/max*ch;if(h>0){y0-=h;s+=`<rect x="${x}" y="${y0}" width="${bw}" height="${h}" fill="${col}"${op}><title>${nm} ${dShort(d.d)}: ${fmt(d[k])} (${d.src})</title></rect>`}});
      s+=`<text x="${x+bw/2}" y="${y0-5}" text-anchor="middle" font-size="10" fill="var(--ink)" font-family="IBM Plex Mono,monospace">${((d.p+d.y)/1e6).toFixed(1).replace(".",",")}</text><text x="${x+bw/2}" y="${H-9}" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="IBM Plex Mono,monospace">${dShort(d.d)}</text>`});
    const svg=$("dayChart");svg.setAttribute("viewBox",`0 0 ${W} ${H}`);svg.style.minWidth=W>700?W+"px":"";svg.innerHTML=s;
  }

  // ---------- форма ----------
  function showMsg(t,bad){const m=$("formMsg");m.textContent=t;m.style.color=bad?"var(--minus)":"var(--plus)";clearTimeout(showMsg._t);showMsg._t=setTimeout(()=>m.textContent="",4500)}
  function syncCatVis(){$("fCatWrap").style.visibility=$("fType").value==="inc"?"hidden":"visible"}
  $("fType").addEventListener("change",syncCatVis);
  function resetForm(){editingId=null;$("fName").value="";$("fAmount").value="";$("fSaveTpl").checked=false;$("fSubmit").textContent="Добавить";$("fCancel").hidden=true;$("formTitle").textContent="Добавить расход";$("fDate").value=new Date().toISOString().slice(0,10);render()}
  function applyTpl(id){const t=templates.find(x=>x.id===id);if(!t)return;
    $("fType").value=t.type||"exp";$("fName").value=t.name;$("fAmount").value=t.amount?fmt(t.amount):"";$("fCat").value=t.cat||"op";$("fBranch").value=t.branch||"Премиум";syncCatVis();
    $("fAmount").focus();$("fAmount").select();}
  function startEdit(id){const e=entries.find(x=>x.id===id);if(!e)return;editingId=id;
    $("fType").value=e.type||"exp";$("fName").value=e.name;$("fAmount").value=fmt(e.amount);$("fCat").value=e.cat||"op";$("fBranch").value=e.branch||"Общее";$("fDate").value=e.date||"";syncCatVis();
    $("fSubmit").textContent="Сохранить изменения";$("fCancel").hidden=false;$("formTitle").textContent="Изменить запись";
    render();$("addPanel").scrollIntoView({behavior:"smooth",block:"start"});}
  $("fCancel").onclick=resetForm;
  [$("fAmount"),$("cashInput")].forEach(inp=>inp.addEventListener("input",()=>{const v=parseAmt(inp.value);inp.value=isNaN(v)?"":fmt(v)}));

  $("addForm").addEventListener("submit",async ev=>{
    ev.preventDefault();
    const name=$("fName").value.trim(), amount=parseAmt($("fAmount").value);
    if(!name){showMsg("Впишите название.",true);$("fName").focus();return}
    if(!amount||amount<=0){showMsg("Сумма должна быть больше нуля.",true);$("fAmount").focus();return}
    const type=$("fType").value;
    const e={type,name,amount,cat:type==="inc"?"":$("fCat").value,branch:$("fBranch").value,date:$("fDate").value||""};
    $("fSubmit").disabled=true;
    try{
      if(editingId){const old=entries.find(x=>x.id===editingId)||{};await put("entries",editingId,Object.assign({},old,e,{id:undefined}));showMsg("Запись обновлена");}
      else{await put("entries",newId(),Object.assign(e,{source:"manual",createdAt:Date.now()}));showMsg((type==="inc"?"Приход":"Расход")+" добавлен: "+fmt(amount)+" сум");}
      if($("fSaveTpl").checked&&!templates.some(t=>t.name.toLowerCase()===name.toLowerCase()&&(t.type||"exp")===type)){
        await put("templates",newId(),{type,name,amount,cat:e.cat,branch:e.branch,order:50});
      }
      const keepDate=$("fDate").value;resetForm();$("fDate").value=keepDate;
    }catch(err){showMsg(err&&err.code==="quota_exceeded"?"Хранилище заполнено, удалите старые записи.":"Не удалось сохранить. Попробуйте ещё раз.",true)}
    finally{$("fSubmit").disabled=false}
  });

  function askDelete(btn){
    if(btn.dataset.confirm){removeEntry(btn.dataset.del);return}
    btn.dataset.confirm="1";btn.textContent="Точно удалить?";btn.style.color="var(--minus)";
    setTimeout(()=>{if(btn.isConnected){delete btn.dataset.confirm;btn.textContent="Удалить";btn.style.color=""}},3000);
  }

  $("cashSave").addEventListener("click",async()=>{
    const v=parseAmt($("cashInput").value);
    if(isNaN(v)){$("cashMeta").textContent="Введите сумму цифрами";return}
    const now=Date.now(), exp=compute().expected;
    try{await put("cash","current",{amount:v,updatedAt:now});$("cashInput").value="";
      if(mode==="db"){try{await db.doc("cashlog/"+newId()).set({amount:v,expected:exp,at:now})}catch(e){}}
    }catch(e){$("cashMeta").textContent="Не удалось сохранить, попробуйте ещё раз"}
  });

  document.querySelectorAll(".filters button").forEach(b=>b.onclick=()=>{filter=b.dataset.f;document.querySelectorAll(".filters button").forEach(x=>x.setAttribute("aria-pressed",x===b?"true":"false"));render()});

  // ---------- хранение ----------
  const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  function lsGet(k,d){try{const v=localStorage.getItem("kassa2."+k);return v?JSON.parse(v):d}catch(e){return d}}
  function lsSet(k,v){try{localStorage.setItem("kassa2."+k,JSON.stringify(v))}catch(e){}}
  function toLocal(note){
    mode="local";entries=lsGet("entries",[]);templates=lsGet("templates",[]);cash=lsGet("cash",null);
    $("syncStatus").textContent=note||"Сохраняется только в этом браузере";render();
  }
  function applyLocal(col,id,data,del){
    if(col==="cash"){cash=del?null:data;lsSet("cash",cash)}
    else{const arr=col==="entries"?entries:templates;const i=arr.findIndex(x=>x.id===id);
      if(del){if(i>=0)arr.splice(i,1)}else{const v=Object.assign({},data,{id});if(i>=0)arr[i]=v;else arr.push(v)}
      lsSet(col,arr)}
    render();
  }
  async function put(col,id,data){
    const clean=JSON.parse(JSON.stringify(data));delete clean.id;
    if(mode==="db"){
      try{await db.doc(col+"/"+id).set(clean);return}
      catch(err){if(err&&(err.code==="invalid_argument"||err.code==="not_granted"||err.code==="revoked"||err.code==="capability_disabled")){toLocal("Нет доступа к общему хранилищу — сохраняю в этом браузере")}else throw err}
    }
    applyLocal(col,id,clean,false);
  }
  async function del(col,id){
    if(mode==="db"){try{await db.doc(col+"/"+id).delete();return}catch(err){showMsg("Не удалось удалить. Попробуйте ещё раз.",true);return}}
    applyLocal(col,id,null,true);
  }
  async function saveFact(id,raw){
    const e=entries.find(x=>x.id===id);if(!e)return;
    const v=parseAmt(raw);
    const next=Object.assign({},e);
    if(isNaN(v)||v===+e.amount){delete next.fact}else{next.fact=v}
    if((hasFact(e)?e.fact:null)===(typeof next.fact==="number"?next.fact:null))return;
    try{await put("entries",id,next)}catch(err){showMsg("Не удалось сохранить факт. Попробуйте ещё раз.",true)}
  }
  const removeEntry=id=>{if(id===editingId)resetForm();del("entries",id)};
  const removeTpl=id=>del("templates",id);

  // ---------- выгрузка кассы в Excel ----------
  function kMsg(t,bad){const m=$("kMsg");m.textContent=t;m.style.color=bad?"var(--minus)":"var(--plus)";clearTimeout(kMsg._t);if(t&&!/Готовлю/.test(t))kMsg._t=setTimeout(()=>m.textContent="",6000)}
  $("kXlsx").onclick=()=>{
    const c=compute();
    let actual=null,diff=null,when="";
    if(cash&&typeof cash.amount==="number"){
      actual=cashState(c).actual;
      diff=actual-c.expected;
      when=cash.updatedAt?new Date(cash.updatedAt).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"";
    }
    const sub="Премиум и Яшнабад · выгружено "+SaifXL.today();
    const sum=[
      {a:"Б/Ч Премиум",b:c.bcP},{a:"Б/Ч Яшнабад",b:c.bcY},{a:"Б/Ч всего"+(c.days.length?" с "+dShort(c.days[0].d):""),b:c.bcT,_bold:true},
      {a:"+ Приходы",b:c.sInc},
      {a:"− Операционные расходы (расходы дня точек)",b:-c.sOp},
      {a:"− Прочие расходы (крупные платежи)",b:-c.sOth},
      {a:"Должно быть на руках",b:c.expected,_bold:true},
      {a:"Фактическая наличка сейчас"+(when?" (пересчёт "+when+")":""),b:actual},
      {a:diff==null?"Излишек / недостача":diff>=0?"Излишек":"Недостача",b:diff,_bold:true},
      {a:"Сэкономлено против плана",b:c.saved}
    ];
    const sorted=[...kEntries()].sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.createdAt||0)-(b.createdAt||0));
    const jr=sorted.map(e=>{const inc=e.type==="inc";return {d:e.date?e.date.slice(8,10)+"."+e.date.slice(5,7)+"."+e.date.slice(0,4):"",t:inc?(isBc(e)?"Приход · Б/Ч дня (уже в Б/Ч)":"Приход"):"Расход",n:e.name,g:inc?"—":(e.cat==="op"?"Операционный":"Прочий"),p:e.branch||"",src:e.source==="excel"?"Excel-отчёт":e.source==="photo"?"Записка":e.source==="nal"?"Расходы с налички":e.source==="day"?"Отчёт дня":"Вручную",pl:(inc?1:-1)*(+e.amount||0),f:(inc?1:-1)*val(e),df:!inc&&hasFact(e)?(+e.amount||0)-e.fact:null}});
    const sumKey=k=>jr.reduce((a,r)=>a+(r[k]||0),0);
    const dayExp={};kEntries().filter(e=>e.source==="day"&&e.type!=="inc").forEach(e=>{dayExp[e.date]=(dayExp[e.date]||0)+val(e)});
    const bc=c.days.map(d=>({d:d.d.slice(8,10)+"."+d.d.slice(5,7)+"."+d.d.slice(0,4),src:d.src,p:d.p,y:d.y,t:d.p+d.y,e:dayExp[d.d]||0,a:d.p+d.y-(dayExp[d.d]||0)}));
    SaifXL.save({sheets:[
      {name:"Итог",title:"Касса Оптики — итог",subtitle:sub,filter:false,columns:[{header:"Показатель",key:"a",type:"text",width:54},{header:"Сумма, сум",key:"b",type:"money",width:20}],rows:sum},
      {name:"Журнал",title:"Касса Оптики — приходы и расходы",subtitle:sub+" · расходы со знаком минус",columns:[{header:"Дата",key:"d",type:"text",width:12},{header:"Тип",key:"t",type:"text",width:10},{header:"Название",key:"n",type:"text",width:40},{header:"Группа",key:"g",type:"text",width:14},{header:"Точка",key:"p",type:"text",width:12},{header:"Источник",key:"src",type:"text",width:13},{header:"План, сум",key:"pl",type:"money"},{header:"Факт, сум",key:"f",type:"money"},{header:"Экономия, сум",key:"df",type:"money"}],rows:jr,total:{d:"Итого",pl:sumKey("pl"),f:sumKey("f"),df:sumKey("df")}},
      {name:"Б-Ч по дням",title:"Наличная выручка (Б/Ч) по дням",subtitle:sub,columns:[{header:"Дата",key:"d",type:"text",width:12},{header:"Источник",key:"src",type:"text",width:11},{header:"Премиум, сум",key:"p",type:"money"},{header:"Яшнабад, сум",key:"y",type:"money"},{header:"Б/Ч итого, сум",key:"t",type:"money"},{header:"Расходы дня, сум",key:"e",type:"money"},{header:"После расходов, сум",key:"a",type:"money",width:17}],rows:bc,total:{d:"Итого",p:c.bcP,y:c.bcY,t:c.bcT,e:bc.reduce((x,r)=>x+r.e,0),a:bc.reduce((x,r)=>x+r.a,0)}}
    ]},"kassa_optiki_"+new Date().toISOString().slice(0,10)+".xlsx",kMsg);
  };

  async function init(){
    $("fDate").value=new Date().toISOString().slice(0,10);syncCatVis();render();
    const c=window.claude;
    if(!c||!c.use){toLocal();return}
    try{db=await c.use("db")}catch(e){db=null}
    if(!db){toLocal();return}
    mode="db";$("syncStatus").textContent="Сохраняется автоматически";
    const fail=()=>{$("syncStatus").textContent="Нет связи с хранилищем"};
    db.collection("entries").onSnapshot(s=>{if(mode!=="db")return;entries=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},fail);
    db.collection("templates").onSnapshot(s=>{if(mode!=="db")return;templates=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},fail);
    db.doc("cash/current").onSnapshot(s=>{if(mode!=="db")return;cash=s.exists?s.data():null;render()},()=>{});
    db.collection("sales").onSnapshot(s=>{if(mode!=="db")return;sales=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},()=>{});
    db.collection("bc").onSnapshot(s=>{if(mode!=="db")return;bcDocs=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));render()},()=>{});
  }
  init();
})();



/* Модуль Excel (~900 КБ) нужен только для загрузки и выгрузки файлов — грузим его, когда страница уже открыта и браузер свободен */
(function(){
  function go(){const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";s.async=true;document.head.appendChild(s)}
  function idle(){window.requestIdleCallback?requestIdleCallback(go,{timeout:3000}):setTimeout(go,1000)}
  document.readyState==="complete"?idle():window.addEventListener("load",idle,{once:true});
})();


(function(){
  // ===================== утилиты =====================
  const $=id=>document.getElementById(id);
  const fmt=n=>(n<0?"−":"")+Math.round(Math.abs(n||0)).toLocaleString("ru-RU").replace(/[  ,]/g," ");
  const fmtM=n=>{const a=Math.abs(n);if(a>=1e6)return (n/1e6).toFixed(a>=1e7?0:1).replace(".",",")+" млн";if(a>=1e3)return Math.round(n/1e3)+" тыс";return String(Math.round(n))};
  const pctF=x=>x==null||!isFinite(x)?"—":Math.round(x*100)+"%";
  const parseAmt=s=>{const v=String(s??"").replace(/[^\d]/g,"");return v?parseInt(v,10):NaN};
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const pad=n=>String(n).padStart(2,"0");
  const iso=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
  const pd=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
  const addD=(s,n)=>{const d=pd(s);d.setDate(d.getDate()+n);return iso(d)};
  const dShort=s=>s?s.slice(8,10)+"."+s.slice(5,7):"—";
  const dLong=s=>s?s.slice(8,10)+"."+s.slice(5,7)+"."+s.slice(0,4):"";
  const daysBetween=(a,b)=>Math.round((pd(b)-pd(a))/864e5)+1;
  const weekStart=s=>{const d=pd(s);const w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return iso(d)};
  const MONTHS=["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
  const WD=["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
  const wdIdx=s=>(pd(s).getDay()+6)%7;
  const pctTxt=(cur,prev)=>{if(!prev)return"";const p=(cur-prev)/prev*100;if(Math.abs(p)<0.5)return `<span class="srcs">≈ 0%</span>`;const cls=p>=0?"up":"down";return `<span class="${cls}">${p>=0?"▲":"▼"} ${Math.abs(p).toFixed(0)}%</span>`};
  const cmp=(c,p)=>{if(p==null)return"";const t=p?pctTxt(c,p):"";return t?t+" к прошлому периоду":"в прошлом периоде продаж не было"};
  function pl(n,a,b,c){const m10=n%10,m100=n%100;if(m10===1&&m100!==11)return a;if(m10>=2&&m10<=4&&(m100<10||m100>=20))return b;return c}
  function niceStep(x){if(x<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(x)));const n=x/p;return (n<=1?1:n<=2?2:n<=5?5:10)*p}
  const normS=s=>String(s==null?"":s).toLowerCase().replace(/ё/g,"е").replace(/\s+/g," ").trim();
  const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);

  // ===================== справочники =====================
  const DEF_POINTS=["Премиум","Яшнабад","Сергели","C1"];
  const KASSA_POINTS=["Премиум","Яшнабад"];
  const DEF_CATS=["Оправы","Детские оправы","Очковые линзы","Солнцезащитные очки","Контактные линзы","Растворы и капли","Аксессуары","Ремонт и услуги"];
  const PAYS=["Наличные","Терминал","QR/Payme","Перечисление"];
  const PAYCOL={"Наличные":"var(--p1)","Терминал":"var(--p3)","QR/Payme":"var(--p4)","Перечисление":"var(--p5)"};
  const PCOL=["var(--p1)","var(--p2)","var(--p3)","var(--p4)","var(--p5)"];
  const CATCOL=["var(--p1)","var(--p3)","var(--p4)","var(--p2)","var(--p5)","var(--op)","var(--oth)","var(--warn)"];
  const LTYPES=["Однофокальные","Прогрессивные","Бифокальные","Офисные","Замена линз"];
  const LIDX=["1.50","1.56","1.59","1.60","1.61","1.67","1.74"];
  const LCOAT=["Без покрытия","Антиблик","Блю-блок","Фотохром","Фотохром + блю-блок","4в1","Тонированные","Поляризация"];
  const normPay=p=>{const t=normS(p);if(!t)return"Наличные";if(/терм|карт|uzcard|humo|хумо/.test(t))return"Терминал";if(/переч|безнал/.test(t))return"Перечисление";if(/нал|б\/ч|cash/.test(t))return"Наличные";if(/qr|payme|пейми|click|клик/.test(t))return"QR/Payme";if(/переч|счет|счёт|безнал/.test(t))return"Перечисление";return PAYS.includes(p)?p:"Наличные"};
  const payOf=s=>{if(s.pays&&typeof s.pays==="object"){const o={};Object.entries(s.pays).forEach(([k,v])=>{const n=normPay(k);o[n]=(o[n]||0)+(+v||0)});return o}return {[normPay(s.pay)]:+s.sum||0}};
  const payLabel=s=>{const o=payOf(s);const ks=Object.keys(o).filter(k=>o[k]);return ks.length>1?ks.map(k=>k+" "+fmtM(o[k])).join(" + "):(ks[0]||"Наличные")};
  const discOf=s=>Math.max(0,(+s.qty||0)*(+s.price||0)-(+s.sum||0));
  const checkKey=s=>s.date+"|"+s.point+"|"+(s.check?String(s.check):"_"+s.id);
  const isFrame=s=>/оправ/i.test(s.cat||"")||/оправ/i.test(s.product||"");
  const isContact=s=>/контакт/i.test(s.cat||"")||/контакт|к\/л|однодн|acuvue|air optix|biotrue|dailies/i.test(s.product||"");
  const isLens=s=>/очков.*линз|^линзы$/i.test(s.cat||"")&&!isContact(s);
  const LKINDS=["Essilor","Seiko","Miyosmart (Hoya)","Тио","Прогрессивные","Бифокальные","Хамелеон","1.74","1.67","4в1","Блок (блю-блок)","Star","Steel","ET","Для чтения","Для зрения","Тип не указан"];
  function lensKind(s){const t=normS(s.product||"");
    if(/essilor|stellest/.test(t))return"Essilor";if(/seiko|сейко/.test(t))return"Seiko";if(/miyo|hoya/.test(t))return"Miyosmart (Hoya)";if(/тио|\btio\b/.test(t))return"Тио";
    if(/прогресс|progress/.test(t))return"Прогрессивные";if(/бифок/.test(t))return"Бифокальные";if(/хамел|фотохр/.test(t))return"Хамелеон";
    if(/1[.,]74/.test(t))return"1.74";if(/1[.,]67/.test(t))return"1.67";if(/4\s*в\s*1/.test(t))return"4в1";if(/блок|blue/.test(t))return"Блок (блю-блок)";
    if(/star|\(стар\)|(^|[^а-я])стар([^а-я]|$)/.test(t))return"Star";if(/steel/.test(t))return"Steel";if(/(^|[^a-zа-я])et([^a-zа-я]|$)/.test(t))return"ET";
    if(/для чтен/.test(t))return"Для чтения";if(/для зрен/.test(t))return"Для зрения";return"Тип не указан"}
  function lensInfo(s){
    const l=s.lens||{};const t=normS((s.product||"")+" "+(s.cat||""));
    const type=l.type||(/прогресс|мультифок|progress/.test(t)?"Прогрессивные":/бифок/.test(t)?"Бифокальные":/офис/.test(t)?"Офисные":/замен/.test(t)?"Замена линз":"Однофокальные");
    let idx=l.index||"";if(!idx){const m=t.match(/1[.,](49|50|53|56|59|60|61|67|74|5|6)(?!\d)/);if(m){idx="1."+m[1];if(idx==="1.5"||idx==="1.49")idx="1.50";if(idx==="1.6")idx="1.60"}}
    let coat=l.coat||"";if(!coat){const fc=/хамел|фотохр|transit|photo/.test(t),bb=/блок|blue|\bbb\b/.test(t);coat=fc&&bb?"Фотохром + блю-блок":fc?"Фотохром":bb?"Блю-блок":/4\s*в\s*1/.test(t)?"4в1":/поляр/.test(t)?"Поляризация":/тонир/.test(t)?"Тонированные":/антиблик|\bar\b|мультипокр/.test(t)?"Антиблик":"не указано"}
    const bm=t.match(/zeiss|essilor|hoya|rodenstock|nikon|kodak|bbgr|seiko|shamir|varilux|crizal|chemi|kodak/);
    const brand=l.brand||(bm?bm[0].replace(/\b\w/g,c=>c.toUpperCase()):"");
    return {type,idx:idx||"не указан",coat,brand};
  }

  // ===================== состояние =====================
  let sales=[], dayExp=[], batches=[], photos=[], cashlog=[];
  let settings={points:DEF_POINTS.slice(),cats:DEF_CATS.slice(),plan:0};
  let db=null, mode="loading", editId=null, curPoint=null, sumTouched=false, listLimit=100, jDay="", stView="margin", mSort="gp", sLimit=150, stPending=null, stockParts=[], sPlace="all", dxOpen=false, stAll=false, anPgCat="Оправы", dl=null, assets=null;
  const F={from:"",to:"",point:"all",cat:"all",lk:"all",group:"day",preset:"month"};
  const dcOpen=new Set(), stF={from:"",to:"",wd:new Set()};
  let tab="kassa";
  const pointColor=p=>{const i=settings.points.indexOf(p);return PCOL[(i<0?settings.points.length:i)%PCOL.length]};

  // ===================== пояснения к плиткам =====================
  const HINT={
    "Выручка":"Сколько денег принесли все продажи за выбранный период, с учётом скидок. Линия — как выручка менялась по дням.",
    "Рост к прошлому периоду":"На сколько процентов выручка выше или ниже, чем за такой же по длине период до этого. Плюс — растём, минус — проседаем.",
    "Выручка в среднем за день":"Выручка периода, делённая на число календарных дней. Помогает сравнивать недели и месяцы разной длины.",
    "Прогноз на конец месяца":"Сколько выйдет за весь месяц, если продавать дальше в нынешнем темпе.",
    "План месяца":"Сколько уже продано относительно плана месяца и какой процент плана выйдет при нынешнем темпе.",
    "План за период":"Выручка за выбранный период против плана на эти же дни: план месяца делится на рабочие дни (пн–сб) и суммируется за период.",
    "Итог месяца":"Итоговая выручка закрытого месяца.",
    "Продаж (позиций)":"Сколько строк продаж внесено. Одна строка — один товар в чеке: оправа и линзы в одном чеке — это 2 позиции.",
    "Проданных единиц":"Сколько штук товара продано всего, с учётом количества в каждой позиции (например, 2 линзы = 2 шт).",
    "Средний чек":"Сколько в среднем тратит один покупатель за визит: выручка ÷ число чеков. Растёт, когда к оправе докупают линзы, футляр, раствор.",
    "Средняя цена единицы":"Средняя цена одной проданной штуки: выручка ÷ проданные единицы. Показывает, дорогое или дешёвое продаём.",
    "Единиц в одном чеке":"Сколько штук товара в среднем в одном чеке. Больше 2 — продавцы хорошо допродают.",
    "Лучший день":"День с самой большой выручкой за период, и для сравнения — самый слабый.",
    "Дней без продаж":"Сколько дней в периоде не было ни одной продажи — проверьте, выходной это или продажи не внесены.",
    "Выручка по дням":"Выручка каждого дня. Пунктир — тот же период раньше, чтобы видеть, лучше или хуже идём.",
    "Выручка нарастающим итогом":"Как набирается выручка с начала периода: каждая точка — сумма всех дней до неё.",
    "Выручка точек по дням":"Выручка каждой точки по дням на одном графике — видно, какая точка тянет, а какая проседает.",
    "Доля точек в выручке":"Какую часть общей выручки дала каждая точка.",
    "Точки: сейчас и раньше":"Выручка каждой точки сейчас и в прошлом таком же периоде, и рост в процентах.",
    "Средний чек по точкам":"Средняя сумма одного чека в каждой точке. Разница подсказывает, где продавцы лучше допродают.",
    "Рейтинг точек":"Точки по выручке от большей к меньшей, с числом чеков и средним чеком.",
    "Выручка на рабочий день":"Выручка точки, делённая на дни, когда в ней были продажи. Честно сравнивает точки с разным числом рабочих дней.",
    "Б/Ч по точкам":"Б/Ч — наличные деньги (без чека в терминале). Сколько наличных принесла каждая точка.",
    "Доля наличных":"Какая часть выручки пришла наличными, а какая — картой, переводом, QR.",
    "Способы оплаты":"Как платят покупатели: наличные, терминал, QR/Payme, перевод — суммы и доли.",
    "Расходы дня":"Мелкие расходы точек из кассы за день: такси, вода, мастер и т.п.",
    "Расходы дня от выручки":"Какой процент выручки ушёл на мелкие расходы точек. Норма — несколько процентов.",
    "Б/Ч в кассу после расходов":"Как наличные уменьшаются шаг за шагом: Б/Ч точек минус их расходы дня — то, что должно дойти до кассы.",
    "Должно быть на руках":"Сколько наличных должно быть в кассе по расчёту: Б/Ч Премиума и Яшнабада + приходы − все расходы.",
    "Б/Ч − расходы дня":"Наличные за период минус мелкие расходы точек — сколько наличных осталось.",
    "Излишек / недостача по пересчётам":"История пересчётов кассы: на сколько фактическая наличка расходилась с расчётной.",
    "Выручка по категориям":"Сколько принесла каждая группа товаров: оправы, очковые линзы, контактные линзы, солнцезащитные и т.д.",
    "Доля категорий":"Какую часть выручки даёт каждая группа товаров.",
    "Средняя цена по категориям":"Средняя цена одной штуки в каждой группе и разброс цен от минимальной до максимальной.",
    "Топ-10 товаров по выручке":"10 моделей, которые принесли больше всего денег.",
    "Топ-10 товаров по количеству":"10 моделей, которых продали больше всего штук.",
    "ABC-анализ товаров":"A — товары, дающие ~80% выручки (главные), B — следующие ~15%, C — последние ~5%: кандидаты на уценку или исключение из закупки.",
    "Перестали продаваться":"Модели, которые продавались раньше, а в этом периоде — ни разу. Проверьте наличие или выкладку.",
    "Оправа + линзы в одном чеке":"Из чеков с оправой — в скольких купили ещё и линзы. Чем выше, тем лучше продавцы предлагают полный комплект.",
    "Чеки с оправой и линзами":"Из чеков с оправой — в скольких купили ещё и линзы.",
    "Самые продаваемые по ценовым группам":"В каком ценовом диапазоне покупают чаще всего и какие модели лидируют в каждом — подсказка для закупки.",
    "Валовая прибыль":"Выручка минус закупочная цена проданного товара. Аренда, зарплаты и прочие расходы здесь не вычитаются.",
    "Маржа":"Какая доля выручки остаётся после закупочной цены товара. Считается только по продажам, где известна закупочная цена.",
    "Маржа по категориям":"Маржа и прибыль по каждой группе товаров — что выгоднее всего продавать.",
    "Маржа по точкам":"Маржа и прибыль каждой точки и самая прибыльная группа товаров в ней.",
    "Без цены покупки":"Продажи, у которых неизвестна закупочная цена — они не участвуют в расчёте маржи.",
    "Скидки":"Сколько денег отдали скидками: (цена × количество) − фактически оплаченная сумма.",
    "Скидка от выручки":"Скидки в процентах от суммы до скидки. Рост — сигнал проверить, кто и почему даёт скидки.",
    "Продаж со скидкой":"Какая доля позиций продана со скидкой.",
    "По дням недели":"Средняя выручка в каждый день недели — когда больше всего покупателей и когда ставить больше продавцов.",
    "По неделям":"Выручка по календарным неделям — видна динамика без шума отдельных дней.",
    "По месяцам":"Выручка по месяцам для сравнения месяц к месяцу.",
    "Точки × дни недели":"Тепловая карта: чем ярче клетка, тем больше выручка этой точки в этот день недели.",
    "Лучший день недели каждой точки":"В какой день недели каждая точка продаёт больше всего.",
    "Новая партия":"Сколько товара из новой поставки уже продано, сколько осталось и на какую сумму.",
    "Продано из партии":"Сколько штук новой партии продано за выбранный период и какой это процент от всей поставки.",
    "Осталось из партии":"Сколько штук партии лежит на сегодня и на какую сумму по цене продажи — не зависит от фильтра.",
    "Продажи партии по точкам":"Где продаётся новая партия — по точкам.",
    "Партия: продажи по точкам":"Где продаётся новая партия — по точкам.",
    "Партия: продажи по группам":"Какие группы товара из партии уходят лучше.",
    "Группы: какая уходит быстрее":"Какая доля каждой группы товара уже продана — что берут охотнее.",
    "Темп продаж партии":"Сколько штук партии продаётся в среднем за день — считается за всё время с прихода, не зависит от фильтра.",
    "Продажи партии по дням":"Сколько штук партии продавали каждый день.",
    "Прогноз распродажи":"Через сколько дней закончится остаток партии, если продавать в нынешнем темпе.",
    "Остаток и прогноз распродажи":"Сколько товара осталось и когда он закончится при нынешнем темпе.",
    "Модели без продаж":"Модели из партии, которые не продались ни разу — кандидаты на перемещение в другую точку или уценку.",
    "Без единой продажи":"Модели из партии, которые не продались ни разу.",
    "Партия: на дозаказ":"Модели, которые почти закончились (осталось 20% и меньше) — их стоит дозаказать.",
    "На дозаказ":"Сколько моделей почти закончилось и требует дозаказа.",
    "Выручка с партии":"Сколько денег принесла новая партия за выбранный период, сколько прибыли и какая маржа.",
    "Доля партии в продажах":"Какую часть всей выручки за выбранный период дала новая партия.",
    "Топ-10 моделей партии":"Самые продаваемые модели из новой партии."
  };
  const MHINT={1:"Сколько денег принесли продажи и как менялись по дням",2:"Лучше или хуже, чем в прошлом таком же периоде",3:"Выручка ÷ дни периода",4:"Сколько выйдет за месяц при нынешнем темпе",5:"Выручка периода против плана на эти дни",6:"Как набирается выручка с начала периода",7:"Сколько строк продаж (товаров в чеках)",8:"Сколько штук товара продано",9:"Сколько в среднем тратит покупатель за визит",10:"Средняя цена одной проданной штуки",11:"Сколько штук в среднем в одном чеке",12:"Самый сильный и слабый день",13:"Дни без продаж — выходной или не внесли",14:"Выручка каждой точки по дням",15:"Какую часть выручки даёт каждая точка",16:"Точки сейчас и в прошлом периоде",17:"Средний чек в каждой точке",18:"Точки от лучшей к худшей",19:"Выручка точки за день работы",20:"Наличные (Б/Ч) по точкам",21:"Наличные против карты и переводов",22:"Как платят покупатели",23:"Мелкие расходы точек из кассы",24:"Какой % выручки ушёл на расходы",25:"Как наличные уменьшаются после расходов",26:"Расчётная и фактическая наличка в кассе",27:"История расхождений при пересчётах",28:"Сколько принесла каждая группа товаров",29:"Доли групп товаров в выручке",30:"Средняя цена и разброс в каждой группе",31:"Модели, принёсшие больше всего денег",32:"Модели, проданные больше всего штук",33:"Главные (A), средние (B) и слабые (C) товары",34:"Продавались раньше, а сейчас нет",35:"Сколько чеков с оправой включают линзы",36:"Выручка минус закупочная цена",37:"Доля выручки после закупочной цены",38:"Что выгоднее продавать",39:"Прибыльность каждой точки",40:"Сколько отдали скидками",41:"Скидки в % от суммы до скидки",42:"Какая часть продаж со скидкой",43:"Какие дни недели сильнее",44:"Выручка по неделям",45:"Выручка по месяцам",46:"Сила точек по дням недели",47:"Лучший день недели каждой точки",48:"Сколько продано из новой партии",49:"Сколько партии осталось",50:"Где продаётся партия",51:"Какие группы партии уходят лучше",52:"Штук партии в день",53:"Когда закончится остаток",54:"Модели партии без продаж",55:"Что пора дозаказать",56:"Выручка и прибыль с партии",57:"Доля партии во всей выручке",58:"Ходовые ценовые диапазоны и модели"};
  let hintsOn=true;try{hintsOn=localStorage.getItem("an.hints")!=="0"}catch(e){}
  const hintOf=t=>{if(tab!=="analytics")return "";const k=String(t).replace(/<[^>]*>/g,"").trim();const h=HINT[k]||(k.startsWith("Касса за ")?"Сдана ли касса закрытого месяца и итог по наличным.":k.startsWith("Продано с ")?"Сколько штук новой партии продано с даты поставки.":/^(Излишек|Недостача) в кассе/.test(k)?"Разница между пересчитанной наличкой и тем, что должно быть по расчёту.":"");return h?`<p class="hint">${h}</p>`:""};
  // ===================== главная =====================
  const MN_=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const ICONS={
    trophy:'<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 6h2.5a.5.5 0 0 1 .5.5V7a3 3 0 0 1-3 3M7 6H4.5a.5.5 0 0 0-.5.5V7a3 3 0 0 0 3 3"/>',
    receipt:'<path d="M6 3h12v18l-2.5-1.6L13 21l-1-.7-1 .7-2.5-1.6L6 21z"/><path d="M9 8h6M9 12h6M9 16h3.5"/>',
    flame:'<path d="M12 3c.8 3 4.5 4.8 4.5 9.6A4.5 4.5 0 0 1 12 17.1a4.5 4.5 0 0 1-4.5-4.5c0-2.2 1.2-3.6 2.2-4.6.3 1.6 1.2 2.6 2.2 2.8C12.4 8.4 11.3 5.7 12 3z"/><path d="M8 21h8"/>',
    bag:'<path d="M5.5 8h13l-1 12.2a1 1 0 0 1-1 .8h-9a1 1 0 0 1-1-.8z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
    cash:'<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
    chart:'<path d="M3 20h18"/><rect x="5" y="11" width="3" height="6.5" rx="1"/><rect x="10.5" y="6" width="3" height="11.5" rx="1"/><rect x="16" y="9" width="3" height="8.5" rx="1"/>',
    target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    glasses:'<circle cx="6.5" cy="14" r="3.6"/><circle cx="17.5" cy="14" r="3.6"/><path d="M10.1 14c1.2-1 2.6-1 3.8 0M2.9 13.3 4.6 7.5H6.5M21.1 13.3 19.4 7.5H17.5"/>',
    tag:'<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-7.1 7.1a1 1 0 0 1-1.4 0z"/><circle cx="8" cy="8" r="1.4"/>'
  };
  const GI=(n,c)=>`<span class="gi" style="--c:${c}" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONS[n]||""}</svg></span>`;
  function renderHome(){
    const t=iso(new Date()),m=t.slice(0,7),WDL=["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"],MG=["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
    const d0=new Date();$("hmDate").textContent=`${WDL[d0.getDay()][0].toUpperCase()+WDL[d0.getDay()].slice(1)}, ${d0.getDate()} ${MG[d0.getMonth()]} ${d0.getFullYear()}`;
    const sum=l=>l.reduce((a,s)=>a+(+s.sum||0),0);
    const today=sales.filter(s=>s.date===t),month=sales.filter(s=>(s.date||"").startsWith(m));
    const lastDay=today.length?t:[...new Set(sales.map(s=>s.date).filter(Boolean))].sort().pop()||t;
    const dayList=sales.filter(s=>s.date===lastDay),dayRev=sum(dayList),dayChecks=new Set(dayList.map(checkKey)).size;
    const mRev=sum(month),mChecks=new Set(month.map(checkKey)).size;
    const K=plCalc(m),pt=K.c.total,S=pt?plStats(pt,K.fact,K.factBefore,K.work,K.done,K.left,K.past):null;
    const k=window.__kassa;
    const lbl=lastDay===t?"сегодня":dShort(lastDay);
    // по дням месяца: средний день и последние 14 дней
    const byDay={};month.forEach(s=>{byDay[s.date]=(byDay[s.date]||0)+(+s.sum||0)});
    const mDays=Object.keys(byDay).length,avgDay=mDays?mRev/mDays:0;
    const dDelta=avgDay?Math.round((dayRev-avgDay)/avgDay*100):null;
    const d14=[];{const e=pd(lastDay);for(let i=13;i>=0;i--){const d=new Date(e);d.setDate(d.getDate()-i);d14.push(iso(d))}}
    const allByDay={};sales.forEach(s=>{if(s.date>=d14[0]&&s.date<=d14[13])allByDay[s.date]=(allByDay[s.date]||0)+(+s.sum||0)});
    const v14=d14.map(d=>allByDay[d]||0);
    const TAG=(v,good)=>`<span class="hm-tag ${good?"up":"down"}">${v}</span>`;
    $("hmHero").innerHTML=
      CARD(`Выручка ${lbl}`,fmt(dayRev)+" сум",`${dayChecks} ${pl(dayChecks,"чек","чека","чеков")}`+(dDelta!=null?" · "+TAG((dDelta>=0?"+":"−")+Math.abs(dDelta)+"% к среднему дню",dDelta>=0):"")+(lastDay!==t?" · сегодня продаж ещё нет":""),C.spark(v14,"var(--accent)"),"main")+
      CARD("Выручка за месяц",fmt(mRev)+" сум",`${mChecks} ${pl(mChecks,"чек","чека","чеков")}`+(pt&&S&&!K.past?` · прогноз ${fmtM(S.forecast)}`:""),pt?C.ring(Math.min(1,mRev/pt),S.fpct>=1?"var(--plus)":S.fpct>=.85?"var(--warn)":"var(--minus)"):"")+
      CARD("Нужно в день",S&&!K.past?fmt(S.needDay)+" сум":"—",S?(K.past?"месяц закрыт":`сейчас в среднем ${fmtM(S.pace)} · осталось ${K.left.length} раб. дн.`):"план месяца не задан")+
      CARD(k&&k.actual!=null?(k.diff>=0?"Излишек в кассе":"Недостача в кассе"):"Должно быть на руках",k?(k.actual!=null?fmt(Math.abs(k.diff)):fmt(k.expected))+" сум":"—",k?(k.actual!=null?`должно ${fmt(k.expected)} · факт ${fmt(k.actual)}`:"касса ещё не пересчитана"):"",k&&k.actual!=null?"":"",k&&k.actual!=null&&k.diff<0?"warnc":"");
    // разделы
    const bb=curBatch();let bS=0,bL=0;if(bb&&(bb.items||[]).length){const {items}=batchStats(bb,"all");bS=items.reduce((a,i)=>a+i.sold,0);bL=items.reduce((a,i)=>a+i.left,0)}
    const lensM=month.filter(isLens),lensU=lensM.reduce((a,s)=>a+(+s.qty||0),0);
    const mg=marginOf(month);
    const prevM=(()=>{const d=pd(m+"-01");d.setDate(0);const pm=iso(d).slice(0,7);const el=+t.slice(8);return sum(sales.filter(s=>(s.date||"").startsWith(pm)&&+s.date.slice(8)<=el))})();
    const gr=prevM?Math.round((mRev-prevM)/prevM*100):null;
    const N=(v,l)=>`<div><b>${v}</b><span>${l}</span></div>`;
    const cards=[
      ["kassa","cash","Касса","Наличные Премиума и Яшнабада, расходы и пересчёт","#0a84ff",N(k?fmtM(k.expected):"—","должно быть")+N(k&&k.actual!=null?(k.diff>=0?"+":"−")+fmtM(Math.abs(k.diff)):"—",k&&k.actual!=null?(k.diff>=0?"излишек":"недостача"):"не пересчитано")],
      ["sales","receipt","Продажи","Внести продажу или расход дня, касса дня по точкам","#34c759",N(fmtM(dayRev),"выручка "+lbl)+N(String(dayList.length),"позиций "+lbl)],
      ["analytics","chart","Аналитика","58 показателей и графиков за любой период","#5e5ce6",N(fmtM(mRev),"за месяц")+N(gr==null?"—":(gr>=0?"+":"")+gr+"%","к прошлому месяцу")],
      ["plan","target","План","План месяца, точки и продавцы","#ff9f0a",N(pt?pctF(mRev/pt):"—","выполнено")+N(S&&!K.past?fmtM(S.needDay):"—","нужно в день")],
      ["lens","glasses","Линзы","Очковые линзы: виды, индексы, покрытия","#bf5af2",N(fmt(lensU)+" шт","за месяц")+N(fmtM(sum(lensM)),"выручка")],
      ["batch","tag","Склад","Маржа, остатки по местам и новая партия","#ff375f",N(mg.m!=null?pctF(mg.m):"—","маржа месяца")+N(bb?fmt(bS)+" / "+fmt(bL):"—","партия: продано / осталось")],
    ];
    $("hmGrid").innerHTML=cards.map(([id,ic,tt,s,col,nums])=>`<button type="button" class="hm-card" data-go="${id}"><div class="top">${GI(ic,col)}<span class="t">${tt}</span><span class="go">›</span></div><div class="s">${s}</div><div class="nums">${nums}</div></button>`).join("");
    // коротко о месяце
    const byPt={};month.forEach(s=>{byPt[s.point]=(byPt[s.point]||0)+(+s.sum||0)});
    const lead=Object.entries(byPt).sort((a,b)=>b[1]-a[1])[0];
    const avgCk=mChecks?mRev/mChecks:0;
    const pmL=(()=>{const d=pd(m+"-01");d.setDate(0);const pm=iso(d).slice(0,7);return sales.filter(s=>(s.date||"").startsWith(pm))})();
    const pmCk=new Set(pmL.map(checkKey)).size,pmAvg=pmCk?sum(pmL)/pmCk:0,ckD=pmAvg?Math.round((avgCk-pmAvg)/pmAvg*100):null;
    const bestD=Object.entries(byDay).sort((a,b)=>b[1]-a[1])[0];
    const byCat={};month.forEach(s=>{const c=s.cat||"Другое";byCat[c]=(byCat[c]||0)+(+s.sum||0)});const topCat=Object.entries(byCat).sort((a,b)=>b[1]-a[1])[0];
    const BI=(ic,col,t,v,d)=>`<div class="hm-bi">${GI(ic,col)}<div><span class="t">${t}</span><b>${v}</b><span class="d">${d}</span></div></div>`;
    $("hmBriefNote").textContent=MN_[+m.slice(5,7)-1]+" "+m.slice(0,4)+(pt&&S&&!K.past?` · план выполнен на ${pctF(mRev/pt)}`:"");
    $("hmBrief").innerHTML=month.length?[
      lead?BI("trophy","#ff9f0a","Лидер месяца",esc(lead[0]),`${fmtM(lead[1])} · ${pctF(lead[1]/(mRev||1))} выручки`):"",
      BI("receipt","#34c759","Средний чек",fmt(avgCk)+" сум",ckD==null?"за этот месяц":`${ckD>=0?"+":"−"}${Math.abs(ckD)}% к прошлому месяцу`),
      bestD?BI("flame","#ff375f","Лучший день",dShort(bestD[0])+" · "+fmtM(bestD[1]),`в среднем за день ${fmtM(avgDay)}`):"",
      topCat?BI("bag","#5e5ce6","Больше всего продают",esc(topCat[0]),`${fmtM(topCat[1])} · ${pctF(topCat[1]/(mRev||1))} выручки`):""
    ].join(""):`<div class="empty">Продаж в этом месяце пока нет</div>`;
    const wkSum=v14.slice(7).reduce((a,b)=>a+b,0),wkPrev=v14.slice(0,7).reduce((a,b)=>a+b,0),wkD=wkPrev?Math.round((wkSum-wkPrev)/wkPrev*100):null;
    $("hmWkNote").innerHTML=`последние 7 дней ${fmtM(wkSum)}`+(wkD!=null?` · ${TAG((wkD>=0?"+":"−")+Math.abs(wkD)+"% к неделе раньше",wkD>=0)}`:"");
    {const mx=Math.max(1,...v14),best=v14.indexOf(Math.max(...v14)),WD2=["вс","пн","вт","ср","чт","пт","сб"];
      const nf=v=>v>=1e6?(v/1e6).toFixed(v>=1e7?0:1).replace(".",","):v?(v/1e3).toFixed(0)+"к":"";
      $("hmWeek").innerHTML=`<div class="wk" role="img" aria-label="Выручка по дням за 14 дней">${d14.map((d,i)=>{const v=v14[i],dt=pd(d),sun=dt.getDay()===0;
        return `<div class="wk-c${i===best?" best":""}${v?"":" zero"}${sun?" sun":""}" title="${dLong(d)}: ${fmt(v)} сум"><div class="wk-t"><span class="wk-v">${nf(v)}</span><div class="wk-b" style="height:${v?Math.max(4,v/mx*100):0}%"></div></div><span class="wk-d"><b>${dt.getDate()}</b><i>${WD2[dt.getDay()]}</i></span></div>`}).join("")}</div><div class="wk-u">млн сум</div>`}
    // точки
    const pts=settings.points.map(p=>{const l=dayList.filter(s=>s.point===p);return {p,r:sum(l),n:new Set(l.map(checkKey)).size}}).filter(o=>o.r||K.shares[o.p]);
    const mx=Math.max(1,...pts.map(o=>o.r));
    $("hmPtNote").textContent=lastDay===t?"Выручка за сегодня":`Последний день с продажами — ${dLong(lastDay)}`;
    $("hmPoints").innerHTML=pts.map(o=>`<div class="hb"><span class="name"><span class="sw" style="background:${pointColor(o.p)}"></span>${esc(o.p)} <span class="srcs">${o.n} ${pl(o.n,"чек","чека","чеков")}${planCfg.sellers[o.p]?" · "+esc(planCfg.sellers[o.p]):""}</span></span><span class="val num">${fmt(o.r)}</span><div class="track"><span style="width:${o.r/mx*100}%;background:${pointColor(o.p)}"></span></div><div class="hm-sub">за месяц ${fmt(sum(month.filter(s=>s.point===o.p)))}${pt&&K.shares[o.p]?` · ${pctF(sum(month.filter(s=>s.point===o.p))/(pt*K.shares[o.p]/100))} плана точки`:""}</div></div>`).join("")+(pts.length?`<div class="kv" style="border-top:1px solid var(--line);margin-top:10px;padding-top:8px"><b>Итого за ${lastDay===t?"сегодня":dShort(lastDay)}</b><b class="num">${fmt(dayRev)}</b></div>`:"")||`<div class="empty">Продаж пока нет</div>`;
    const last=[...sales].sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.createdAt||0)-(a.createdAt||0)).slice(0,6);
    $("hmLast").innerHTML=last.map(s=>`<div class="hm-row"><span class="sw" style="background:${pointColor(s.point)}"></span><span class="n">${esc(s.product||"—")}</span><span class="m">${dShort(s.date)} · ${esc(s.point)}</span><b class="num">${fmt(+s.sum||0)}</b></div>`).join("")||`<div class="empty">Продаж пока нет</div>`;
  }
  document.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(!b||!b.closest("#page-home"))return;setTab(b.dataset.go);window.scrollTo({top:0,behavior:"smooth"});const f=b.dataset.focus;if(f)setTimeout(()=>{const el=$(f);if(el){el.scrollIntoView({block:"center",behavior:"smooth"});el.focus({preventScroll:true})}},350)});
  document.addEventListener("kassa-updated",()=>{if(tab==="home")renderHome()});

  // ===================== план =====================
  const PL_DEF_SELLERS={"Премиум":"Нодира","Яшнабад":"Севара","Сергели":"Зарнигор"};
  let planCfg={months:{},sellers:Object.assign({},PL_DEF_SELLERS),off:[0]};
  let plMonth="";
  const plOff=d=>(planCfg.off||[0]).includes(pd(d).getDay());
  const plDays=m=>{const out=[];const e=+monthEnd(m).slice(8);for(let i=1;i<=e;i++)out.push(m+"-"+pad(i));return out};
  const plRev=l=>l.reduce((a,s)=>a+(+s.sum||0),0);
  function plPrevShares(m){
    const d=pd(m+"-01");d.setDate(0);const pm=iso(d).slice(0,7);
    const by={};sales.filter(s=>(s.date||"").startsWith(pm)).forEach(s=>{by[s.point]=(by[s.point]||0)+(+s.sum||0)});
    const tot=Object.values(by).reduce((a,b)=>a+b,0);const out={};
    settings.points.forEach(p=>{out[p]=tot?Math.round((by[p]||0)/tot*1000)/10:0});return out;
  }
  function plConf(m){const c=planCfg.months&&planCfg.months[m];return c?{total:+c.total||0,shares:Object.assign({},c.shares||{})}:{total:0,shares:{}}}
  function plCalc(m){
    const c=plConf(m),days=plDays(m),today=iso(new Date());
    const work=days.filter(d=>!plOff(d));
    const list=sales.filter(s=>(s.date||"").startsWith(m));
    const past=today>monthEnd(m),future=today<m+"-01";
    const done=work.filter(d=>d<today),left=work.filter(d=>d>=today);
    const fact=plRev(list),factBefore=plRev(list.filter(s=>s.date<today));
    const shares=Object.assign(plPrevShares(m),c.shares);
    return {c,days,work,list,past,future,today,done,left,fact,factBefore,shares};
  }
  function plStats(total,fact,factBefore,work,done,left,past){
    const pace=done.length?factBefore/done.length:0;
    const need=Math.max(0,total-fact);
    const needDay=past?0:(left.length?need/left.length:need);
    const forecast=past?fact:factBefore+pace*(work.length-done.length);
    const sched=total*Math.min(work.length,done.length)/(work.length||1);
    const pct=total?fact/total:0,fpct=total?forecast/total:0;
    return {pace,need,needDay,needWeek:needDay*Math.min(6,7-(planCfg.off||[0]).length),forecast,sched,gap:fact-sched,pct,fpct};
  }
  const plCls=f=>f>=1?"ok":f>=0.85?"mid":"bad";
  const plCol=f=>f>=1?"var(--plus)":f>=0.85?"var(--warn)":"var(--minus)";
  const plBar=(v,mk,col)=>`<div class="pl-bar"><div class="f" style="width:${Math.min(100,Math.max(0,v*100)).toFixed(1)}%;background:${col}"></div>${mk!=null?`<div class="mk" style="left:${Math.min(100,mk*100).toFixed(1)}%"></div>`:""}</div>`;
  function plRing(p,col){const R=62,L=2*Math.PI*R,len=Math.max(0,Math.min(1,p))*L;
    return `<svg class="pl-ring" viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="75" r="${R}" fill="none" stroke="var(--wash)" stroke-width="14"/><circle class="arc" cx="75" cy="75" r="${R}" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${len.toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 75 75)"/><text x="75" y="80" text-anchor="middle" font-size="28" font-weight="700" fill="var(--ink)">${Math.round(p*100)}%</text><text x="75" y="100" text-anchor="middle" font-size="11" fill="var(--muted)">плана</text></svg>`}
  function renderPlan(){
    const ms=[...new Set(sales.map(s=>(s.date||"").slice(0,7)).filter(Boolean).concat(Object.keys(planCfg.months||{})).concat([iso(new Date()).slice(0,7)]))].sort();
    if(!plMonth||!ms.includes(plMonth))plMonth=iso(new Date()).slice(0,7);
    $("plMonthSeg").innerHTML=ms.map(m=>`<button type="button" data-pm="${m}" aria-pressed="${m===plMonth}">${MONTHS[+m.slice(5,7)-1]} ${m.slice(0,4)}</button>`).join("");
    const K=plCalc(plMonth),total=K.c.total;
    $("plPeriod").textContent=`${dLong(plMonth+"-01")} — ${dLong(monthEnd(plMonth))} · ${K.work.length} рабочих ${pl(K.work.length,"день","дня","дней")} (воскресенье — выходной)`+(K.past?" · месяц закрыт":K.future?"":` · осталось ${K.left.length} ${pl(K.left.length,"рабочий день","рабочих дня","рабочих дней")}`);
    if(document.activeElement!==$("plTotal"))$("plTotal").value=total?fmt(total):"";
    $("plShares").innerHTML=settings.points.map(p=>`<div class="row"><label class="f">${esc(p)} · продавец<input data-ps="${esc(p)}" value="${esc(planCfg.sellers[p]||"")}" placeholder="Имя"></label><label class="f">Доля, %<input data-psh="${esc(p)}" inputmode="decimal" value="${K.shares[p]!=null?String(K.shares[p]).replace(".",","):0}"></label></div>`).join("");
    if(!total){$("plHero").innerHTML=`<div class="empty">План на ${MONTHS[+plMonth.slice(5,7)-1]} не задан — откройте «Настроить план» внизу и впишите сумму.</div>`;$("plDays").innerHTML="";$("plWeeks").innerHTML="";$("plPoints").innerHTML="";return}
    const S=plStats(total,K.fact,K.factBefore,K.work,K.done,K.left,K.past);
    const fcol=plCol(K.past?S.pct:S.fpct);
    const status=K.past?(S.pct>=1?"План выполнен":"План не выполнен"):K.future?"Месяц ещё не начался":S.fpct>=1?"Идём с запасом":S.fpct>=0.85?"Почти в графике":"Отстаём от плана";
    $("plHero").innerHTML=`<div class="pl-hero">
      <div class="tile"><div class="pl-main">${plRing(S.pct,fcol)}<div style="display:flex;flex-direction:column;gap:6px;min-width:0"><span class="eyebrow">Продано за месяц</span><span class="big num">${fmt(K.fact)}</span><small>из ${fmt(total)} сум · осталось ${fmt(S.need)}</small><span class="pl-status ${plCls(K.past?S.pct:S.fpct)}">${status}</span></div></div>
        <div style="margin-top:10px">${plBar(S.pct,K.past||K.future?null:S.sched/total,fcol)}<small style="display:block;margin-top:6px">${K.past||K.future?"":`Черта — где нужно быть сегодня по графику: ${fmt(S.sched)} · ${S.gap>=0?"впереди на":"отставание"} ${fmt(Math.abs(S.gap))}`}</small></div></div>
      <div class="pl-need">
        ${CARD("Нужно в день",K.past?"—":fmt(S.needDay)+" сум",K.past?"месяц закрыт":`на ${K.left.length} ${pl(K.left.length,"рабочий день","рабочих дня","рабочих дней")} до конца месяца`,"","main")}
        ${CARD("Нужно в неделю",K.past?"—":fmt(S.needWeek)+" сум","6 рабочих дней, пн–сб")}
        ${CARD("Текущий темп",fmt(S.pace)+" сум",`в рабочий день · ${K.done.length} ${pl(K.done.length,"день","дня","дней")} прошло · линия — выручка по рабочим дням`,K.done.length>1?C.spark(K.done.map(d=>plRev(K.list.filter(s=>s.date===d))),"var(--p3)"):"")}
        ${CARD("Прогноз на конец месяца",fmt(S.forecast)+" сум",`${pctF(S.fpct)} плана при текущем темпе`,C.ring(Math.min(1,S.fpct),fcol))}
      </div></div>`;
    // дни
    const byD={};K.list.forEach(s=>{byD[s.date]=(byD[s.date]||0)+(+s.sum||0)});
    const tgt=total/(K.work.length||1),W=Math.max(980,($("plDays").clientWidth||0)-4),H=230,L=46,R=10,T=14,B=26,cw=W-L-R,ch=H-T-B,n=K.days.length,bw=cw/n;
    const top=Math.max(tgt*1.25,...Object.values(byD),1);const y=v=>T+ch-v/top*ch;
    let g=C.axisY(top,top/4,L,W,R,T,ch);
    K.days.forEach((d,i)=>{const v=byD[d]||0,x=L+i*bw,off=plOff(d),h=ch-(y(v)-T);
      g+=off?`<rect x="${(x+1).toFixed(1)}" y="${T}" width="${(bw-2).toFixed(1)}" height="${ch}" fill="var(--wash)" rx="4"/>`:"";
      if(v)g+=`<rect class="plb" style="animation-delay:${(i*0.02).toFixed(2)}s" x="${(x+bw*0.18).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw*0.64).toFixed(1)}" height="${Math.max(1,h).toFixed(1)}" rx="4" fill="${v>=tgt?"var(--plus)":"var(--accent)"}"><title>${dLong(d)}: ${fmt(v)} сум</title></rect>`;
      g+=`<text x="${(x+bw/2).toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="10" fill="${d===K.today?"var(--accent)":"var(--muted)"}" font-weight="${d===K.today?700:400}">${+d.slice(8)}</text>`});
    g+=`<line x1="${L}" x2="${W-R}" y1="${y(tgt).toFixed(1)}" y2="${y(tgt).toFixed(1)}" stroke="var(--ink)" stroke-dasharray="5 5" opacity=".6"/><text x="${W-R}" y="${(y(tgt)-5).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--ink)">план в день ${fmtM(tgt)}</text>`;
    if(!K.past&&!K.future&&S.needDay>tgt)g+=`<line x1="${L}" x2="${W-R}" y1="${y(Math.min(top,S.needDay)).toFixed(1)}" y2="${y(Math.min(top,S.needDay)).toFixed(1)}" stroke="var(--minus)" stroke-dasharray="2 4"/><text x="${L+4}" y="${(y(Math.min(top,S.needDay))-5).toFixed(1)}" font-size="11" fill="var(--minus)">нужно теперь ${fmtM(S.needDay)}</text>`;
    $("plDays").innerHTML=`<div class="pl-days" id="plDaysBox"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Выручка по дням и план">${g}</svg></div>`;requestAnimationFrame(()=>plScrollToday());
    // недели
    const wk=[];K.days.forEach(d=>{const ws=weekStart(d);let w=wk.find(x=>x.ws===ws);if(!w){w={ws,days:[]};wk.push(w)}w.days.push(d)});
    $("plWeeks").innerHTML=`<div style="overflow-x:auto"><table class="pl-wk"><thead><tr><th>Неделя</th><th>Раб. дней</th><th>План</th><th>Факт</th><th>Разница</th><th></th></tr></thead><tbody>${wk.map(w=>{const wd=w.days.filter(d=>!plOff(d)).length,pv=tgt*wd,fv=w.days.reduce((a,d)=>a+(byD[d]||0),0),cur=w.days.includes(K.today),fut=w.days[0]>K.today,diff=fv-pv;
      return `<tr class="${cur?"now":""}"><td>${dShort(w.days[0])} — ${dShort(w.days[w.days.length-1])}${cur?" · сейчас":""}</td><td>${wd}</td><td class="num">${fmt(pv)}</td><td class="num">${fut?"—":fmt(fv)}</td><td class="num" style="color:${fut?"var(--muted)":diff>=0?"var(--plus)":"var(--minus)"}">${fut?"—":(diff>=0?"+":"")+fmt(diff)}</td><td class="bar">${plBar(pv?fv/pv:0,null,pv&&fv>=pv?"var(--plus)":"var(--accent)")}</td></tr>`}).join("")}</tbody></table></div>`;
    // точки
    const pts=settings.points.filter(p=>(K.shares[p]||0)>0||K.list.some(s=>s.point===p));
    const rows=pts.map(p=>{const pl_=K.list.filter(s=>s.point===p),pt=total*(K.shares[p]||0)/100,f=plRev(pl_),fb=plRev(pl_.filter(s=>s.date<K.today)),st=plStats(pt,f,fb,K.work,K.done,K.left,K.past);
      const chk={};pl_.forEach(s=>{const o=chk[checkKey(s)]||(chk[checkKey(s)]={f:0,l:0,sum:0});o.sum+=+s.sum||0;if(isFrame(s))o.f=1;if(isLens(s))o.l=1});
      const cs=Object.values(chk),fr=cs.filter(o=>o.f),both=fr.filter(o=>o.l).length,disc=pl_.reduce((a,s)=>a+discOf(s),0),gross=f+disc;
      return {p,pt,f,st,n:cs.length,avg:cs.length?f/cs.length:0,fl:fr.length?both/fr.length:null,disc,dp:gross?disc/gross:0}});
    const ranked=rows.filter(r=>r.pt).slice().sort((a,b)=>(b.f/b.pt)-(a.f/a.pt));
    $("plPoints").innerHTML=rows.map(r=>{const sel=planCfg.sellers[r.p]||"",col=pointColor(r.p),fc=r.pt?plCol(K.past?r.st.pct:r.st.fpct):"var(--accent)",rk=ranked.indexOf(r);
      return `<div class="kpi pl-pt"><div class="top"><div class="who"><span class="pl-av" style="background:${col}">${esc((sel||r.p).charAt(0))}</span><div><div class="nm">${esc(sel||"Продавец не указан")}</div><div class="sl">${esc(r.p)}</div></div></div>${rk>=0&&ranked.length>1?`<span class="rank">${rk+1} место</span>`:""}</div>
        <div><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><b class="num" style="font-size:20px">${fmt(r.f)}</b><span class="num" style="font-size:13px;color:var(--muted)">${r.pt?"из "+fmt(r.pt):"план не задан"}</span></div>
        <div style="margin-top:6px">${plBar(r.pt?r.st.pct:0,r.pt&&!K.past&&!K.future?r.st.sched/r.pt:null,fc)}</div></div>
        <div class="pl-grid"><div><span>Выполнено</span><b style="color:${fc}">${r.pt?pctF(r.st.pct):"—"}</b></div><div><span>Прогноз</span><b>${r.pt?pctF(r.st.fpct):"—"}</b></div>
        <div><span>Нужно в день</span><b>${r.pt&&!K.past?fmt(r.st.needDay):"—"}</b></div><div><span>Нужно в неделю</span><b>${r.pt&&!K.past?fmt(r.st.needWeek):"—"}</b></div>
        <div><span>Чеков · средний чек</span><b>${r.n} · ${fmt(r.avg)}</b></div><div><span>Оправа + линзы</span><b>${r.fl==null?"—":pctF(r.fl)}</b></div>
        <div><span>Скидки</span><b>${fmt(r.disc)}</b></div><div><span>Доля скидок</span><b>${pctF(r.dp)}</b></div></div></div>`}).join("")||`<div class="empty">Нет точек с планом</div>`;
  }
  const plScrollToday=()=>{const b=$("plDaysBox");if(b&&b.scrollWidth>b.clientWidth){const d=+iso(new Date()).slice(8),n=+monthEnd(plMonth).slice(8);b.scrollLeft=Math.max(0,b.scrollWidth*(d/n)-b.clientWidth*0.7)}};
  const hintOpen=new Set();
  const tileKey=el=>{const t=el.querySelector(".eyebrow,h2");return t?t.textContent.trim():""};
  const applyHintOpen=()=>document.querySelectorAll("#anCards .kpi,#anWidgets .panel.w").forEach(el=>{el.classList.toggle("hint-open",hintOpen.has(tileKey(el)))});
  ["anCards","anWidgets"].forEach(id=>new MutationObserver(applyHintOpen).observe($(id),{childList:true}));
  $("page-analytics").addEventListener("click",e=>{if(hintsOn)return;const el=e.target.closest("#anCards .kpi,#anWidgets .panel.w");if(!el||e.target.closest("button,a,input,select,label,[data-pg],summary,.tbl"))return;if(el.classList.contains("w")&&!e.target.closest("h2,.hint"))return;const k=tileKey(el);hintOpen.has(k)?hintOpen.delete(k):hintOpen.add(k);el.classList.toggle("hint-open",hintOpen.has(k));requestAnimationFrame(()=>window.dispatchEvent(new Event("resize")))});
  $("anHints").checked=hintsOn;$("page-analytics").classList.toggle("nohint",!hintsOn);
  $("anHints").onchange=()=>{hintsOn=$("anHints").checked;try{localStorage.setItem("an.hints",hintsOn?"1":"0")}catch(e){}$("page-analytics").classList.toggle("nohint",!hintsOn);window.dispatchEvent(new Event("resize"))};
  $("plMonthSeg").addEventListener("click",e=>{const b=e.target.closest("[data-pm]");if(!b)return;plMonth=b.dataset.pm;renderPlan()});
  async function plStore(v){planCfg=v;if(mode==="db"){await db.doc("settings/plan").set(v)}else{lsSet("plan",v);renderPlan()}}
  $("plAuto").onclick=()=>{const sh=plPrevShares(plMonth);document.querySelectorAll("[data-psh]").forEach(i=>i.value=String(sh[i.dataset.psh]||0).replace(".",","));$("plMsg").textContent="Доли подставлены — нажмите «Сохранить план»"};
  $("plSave").onclick=async()=>{
    const total=parseAmt($("plTotal").value)||0,shares={},sellers=Object.assign({},planCfg.sellers);let sum=0;
    document.querySelectorAll("[data-psh]").forEach(i=>{const v=parseFloat(String(i.value).replace(",","."))||0;shares[i.dataset.psh]=v;sum+=v});
    document.querySelectorAll("[data-ps]").forEach(i=>{sellers[i.dataset.ps]=i.value.trim()});
    if(total&&Math.abs(sum-100)>0.5){$("plMsg").textContent=`Сумма долей ${String(Math.round(sum*10)/10).replace(".",",")}% — должна быть 100%`;return}
    const v=JSON.parse(JSON.stringify(planCfg));v.months=v.months||{};v.months[plMonth]={total,shares};v.sellers=sellers;
    try{await plStore(v);$("plMsg").textContent="Сохранено"}catch(e){$("plMsg").textContent="Не удалось сохранить"}
  };

  // ===================== вкладки =====================
  const PAGES=["home","kassa","report","sales","analytics","plan","lens","batch","help"];
  function setTab(t){
    tab=t;
    document.querySelectorAll(".tab").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===t?"true":"false"));
    PAGES.forEach(p=>$("page-"+p).hidden=t!==p);
    const withFilter=t==="sales"||t==="analytics"||t==="lens"||(t==="batch"&&stView==="margin");
    $("salesFilter").hidden=!withFilter;
    if(withFilter){const hdr=$("page-"+t).querySelector("header");hdr.after($("salesFilter"));fillCatSel()}
    try{history.replaceState(null,"","#"+t)}catch(e){}
    renderAll();
  }
  document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>setTab(b.dataset.tab));

  // ===================== фильтры =====================
  function applyPreset(p){
    const t=iso(new Date());F.preset=p;
    if(p==="today"){F.from=t;F.to=t}
    else if(p==="7d"){F.from=addD(t,-6);F.to=t}
    else if(p==="month"){F.from=t.slice(0,8)+"01";F.to=t}
    else if(p==="prev"){const d=pd(t.slice(0,8)+"01");d.setDate(0);F.to=iso(d);F.from=F.to.slice(0,8)+"01"}
    else {F.from="";F.to=""}
    $("fFrom").value=F.from;$("fTo").value=F.to;
    document.querySelectorAll("#presetSeg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.p===p?"true":"false"));
  }
  document.querySelectorAll("#presetSeg button").forEach(b=>b.onclick=()=>{applyPreset(b.dataset.p);jDay="";stF.from="";stF.to="";renderAll()});
  ["fFrom","fTo"].forEach(id=>$(id).addEventListener("change",()=>{F.from=$("fFrom").value;F.to=$("fTo").value;F.preset="custom";document.querySelectorAll("#presetSeg button").forEach(b=>b.setAttribute("aria-pressed","false"));jDay="";stF.from="";stF.to="";renderAll()}));
  $("fPoint").onchange=()=>{F.point=$("fPoint").value;jDay="";stF.from="";stF.to="";renderAll()};
  const monthEnd=m=>{const d=new Date(+m.slice(0,4),+m.slice(5,7),0);return m+"-"+String(d.getDate()).padStart(2,"0")};
  function fillMonths(){
    const ms=[...new Set(sales.map(x=>(x.date||"").slice(0,7)).filter(Boolean))].sort().reverse();
    const cur=F.from&&F.to&&F.from.endsWith("-01")&&F.from.slice(0,7)===F.to.slice(0,7)&&(F.to===monthEnd(F.from.slice(0,7))||F.to===iso(new Date()))?F.from.slice(0,7):"";
    $("fMonth").innerHTML=`<option value="">Свой период</option>`+ms.map(m=>`<option value="${m}"${m===cur?" selected":""}>${["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"][+m.slice(5,7)-1]} ${m.slice(0,4)}</option>`).join("");
  }
  $("fMonth").onchange=()=>{const m=$("fMonth").value;if(!m)return;F.from=m+"-01";F.to=monthEnd(m);if(F.to>iso(new Date()))F.to=iso(new Date());F.preset="custom";$("fFrom").value=F.from;$("fTo").value=F.to;document.querySelectorAll("#presetSeg button").forEach(b=>b.setAttribute("aria-pressed","false"));jDay="";stF.from="";stF.to="";renderAll()};
  $("fCatS").onchange=()=>{if(tab==="lens")F.lk=$("fCatS").value;else F.cat=$("fCatS").value;renderAll()};
  function fillCatSel(){
    if(tab==="lens"){
      const ks=[...new Set(sales.filter(s=>isLens(s)&&inRange(s,F.from,F.to)&&(F.point==="all"||s.point===F.point)).map(lensKind))];ks.sort((a,b)=>LKINDS.indexOf(a)-LKINDS.indexOf(b));
      if(F.lk!=="all"&&!ks.includes(F.lk))ks.push(F.lk);
      $("fCatLbl").textContent="Вид линзы";
      $("fCatS").innerHTML=`<option value="all">Все виды линз</option>`+ks.map(c=>`<option${c===F.lk?" selected":""}>${esc(c)}</option>`).join("");
    }else{
      $("fCatLbl").textContent="Категория";
      $("fCatS").innerHTML=`<option value="all">Все категории</option>`+settings.cats.map(c=>`<option${c===F.cat?" selected":""}>${esc(c)}</option>`).join("");
    }
  }
  document.querySelectorAll("#groupSeg button").forEach(b=>b.onclick=()=>{F.group=b.dataset.g;document.querySelectorAll("#groupSeg button").forEach(x=>x.setAttribute("aria-pressed",x===b?"true":"false"));renderSales()});

  const inRange=(s,from,to)=>(!from||s.date>=from)&&(!to||s.date<=to);
  const match=s=>(F.point==="all"||s.point===F.point)&&(F.cat==="all"||s.cat===F.cat);
  const filtered=()=>sales.filter(s=>inRange(s,F.from,F.to)&&match(s));
  const expFiltered=()=>dayExp.filter(e=>inRange(e,F.from,F.to)&&(F.point==="all"||e.branch===F.point));
  function rangeOf(list){
    let from=F.from,to=F.to;
    if(!from||!to){const ds=list.map(s=>s.date).sort();if(!from)from=ds[0]||iso(new Date());if(!to)to=ds[ds.length-1]||iso(new Date())}
    return {from,to,days:Math.max(1,daysBetween(from,to))};
  }
  function prevList(){
    if(!F.from||!F.to)return null;
    const n=daysBetween(F.from,F.to);const pto=addD(F.from,-1),pfrom=addD(F.from,-n);
    return {list:sales.filter(s=>inRange(s,pfrom,pto)&&match(s)),from:pfrom,to:pto};
  }
  const agg=l=>{let rev=0,units=0,disc=0,discN=0,cash=0;const ch=new Set();
    l.forEach(s=>{rev+=+s.sum||0;units+=+s.qty||0;const d=discOf(s);if(d>0){disc+=d;discN++}cash+=+(payOf(s)["Наличные"]||0);ch.add(checkKey(s))});
    const checks=ch.size;return {rev,n:l.length,units,checks,avg:checks?rev/checks:0,unitPrice:units?rev/units:0,upc:checks?units/checks:0,disc,discN,cash}};
  const dayList=r=>{const out=[];let d=r.from,g=0;while(d<=r.to&&g++<1500){out.push(d);d=addD(d,1)}return out};

  // ===================== формы =====================
  const opt=(arr,sel)=>arr.map(v=>`<option${v===sel?" selected":""}>${esc(v)}</option>`).join("");
  function fillSelects(){
    $("fPoint").innerHTML=`<option value="all">Все точки</option>`+settings.points.map(p=>`<option${p===F.point?" selected":""}>${esc(p)}</option>`).join("");
    fillCatSel();
    $("sCat").innerHTML=opt(settings.cats,$("sCat").value||settings.cats[0]);
    $("sPay").innerHTML=opt(PAYS.concat(["Смешанная"]),$("sPay").value||PAYS[0]);
    $("lType").innerHTML=`<option value="">определить по названию</option>`+opt(LTYPES,$("lType").value);
    $("lIndex").innerHTML=`<option value="">определить по названию</option>`+opt(LIDX,$("lIndex").value);
    $("lCoat").innerHTML=`<option value="">определить по названию</option>`+opt(LCOAT,$("lCoat").value);
    if(!curPoint||!settings.points.includes(curPoint))curPoint=settings.points[0];
    $("sPointSeg").innerHTML=settings.points.map(p=>`<button type="button" role="radio" aria-checked="${p===curPoint}" data-pt="${esc(p)}"><span class="sw" style="background:${pointColor(p)}"></span>${esc(p)}</button>`).join("");
    $("sPointSeg").querySelectorAll("button").forEach(b=>b.onclick=()=>{curPoint=b.dataset.pt;$("sPointSeg").querySelectorAll("button").forEach(x=>x.setAttribute("aria-checked",x===b?"true":"false"))});
    $("dxPoint").innerHTML=opt(settings.points,$("dxPoint").value||settings.points[0]);
    fillPhPoint();
    $("setPoints").value=settings.points.join(", ");$("setCats").value=settings.cats.join(", ");$("setPlan").value=settings.plan?fmt(settings.plan):"";
    syncFormParts();
  }
  function syncFormParts(){$("sMixed").hidden=$("sPay").value!=="Смешанная";$("sLens").hidden=!/очков.*линз/i.test($("sCat").value)}
  $("sPay").addEventListener("change",syncFormParts);$("sCat").addEventListener("change",syncFormParts);
  function updateDatalist(){const names=[...new Set(sales.map(s=>s.product).filter(Boolean))].sort();$("productList").innerHTML=names.slice(0,400).map(n=>`<option value="${esc(n)}">`).join("")}
  const fmtInput=inp=>inp.addEventListener("input",()=>{const v=parseAmt(inp.value);inp.value=isNaN(v)?"":fmt(v)});
  ["sPrice","sSum","mx0","mx1","mx2","mx3","dxAmount","setPlan"].forEach(id=>fmtInput($(id)));
  $("sQty").addEventListener("input",()=>{const v=parseAmt($("sQty").value);$("sQty").value=isNaN(v)?"":String(v)});
  function autoSum(){if(sumTouched)return;const q=parseAmt($("sQty").value),p=parseAmt($("sPrice").value);$("sSum").value=(q&&p)?fmt(q*p):""}
  $("sQty").addEventListener("input",autoSum);$("sPrice").addEventListener("input",autoSum);
  $("sSum").addEventListener("input",()=>{sumTouched=$("sSum").value!==""});
  $("sProduct").addEventListener("change",()=>{const n=normS($("sProduct").value);if(!n)return;const last=[...sales].filter(s=>normS(s.product)===n).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0];if(last){if(!$("sPrice").value)$("sPrice").value=fmt(last.price||0);if(settings.cats.includes(last.cat))$("sCat").value=last.cat;syncFormParts();autoSum()}});
  function flash(id,t,bad){const m=$(id);m.textContent=t;m.style.color=bad?"var(--minus)":"var(--plus)";clearTimeout(m._t);if(t&&!/Готовлю/.test(t))m._t=setTimeout(()=>m.textContent="",5000)}
  const sMsg=(t,b)=>flash("sMsg",t,b);
  function resetSaleForm(keep){
    editId=null;["sProduct","sPrice","sSum","mx0","mx1","mx2","mx3"].forEach(id=>$(id).value="");$("sQty").value="1";sumTouched=false;
    ["lType","lIndex","lCoat"].forEach(id=>$(id).value="");
    $("sSubmit").textContent="Добавить продажу";$("sCancel").hidden=true;$("saleFormTitle").textContent="Новая продажа";
    if(!keep){$("sDate").value=iso(new Date());$("sCheck").value=""}
  }
  $("sCancel").onclick=()=>{resetSaleForm();renderSales()};
  $("saleForm").addEventListener("submit",async ev=>{
    ev.preventDefault();
    const product=$("sProduct").value.trim(), qty=parseAmt($("sQty").value)||0, price=parseAmt($("sPrice").value)||0;
    let sum=parseAmt($("sSum").value); if(isNaN(sum))sum=qty*price;
    if(!$("sDate").value){sMsg("Укажите дату.",true);return}
    if(!product){sMsg("Впишите товар.",true);$("sProduct").focus();return}
    if(!qty){sMsg("Количество должно быть больше нуля.",true);$("sQty").focus();return}
    if(!sum){sMsg("Укажите цену или сумму.",true);$("sPrice").focus();return}
    const rec={date:$("sDate").value,point:curPoint,cat:$("sCat").value,product,qty,price:price||Math.round(sum/qty),sum,check:$("sCheck").value.trim()};
    if($("sPay").value==="Смешанная"){
      const pays={};PAYS.forEach((p,i)=>{const v=parseAmt($("mx"+i).value);if(v)pays[p]=v});
      const tot=Object.values(pays).reduce((a,v)=>a+v,0);
      if(!tot){sMsg("Впишите, сколько оплачено каждым способом.",true);return}
      if(tot!==sum){sMsg(`Сумма частей (${fmt(tot)}) не равна оплаченному (${fmt(sum)}).`,true);return}
      rec.pays=pays;rec.pay="Смешанная";
    }else{rec.pay=$("sPay").value;rec.pays=null}
    if(/очков.*линз/i.test(rec.cat)){const l={};if($("lType").value)l.type=$("lType").value;if($("lIndex").value)l.index=$("lIndex").value;if($("lCoat").value)l.coat=$("lCoat").value;rec.lens=Object.keys(l).length?l:null}
    jDay=rec.date;
    $("sSubmit").disabled=true;
    try{
      if(editId){const old=sales.find(s=>s.id===editId)||{};await putSale(editId,Object.assign({},old,rec));sMsg("Продажа обновлена")}
      else{await putSale(newId(),Object.assign(rec,{createdAt:Date.now()}));sMsg(`Добавлено: ${product}, ${fmt(sum)} сум`)}
      resetSaleForm(true);$("sProduct").focus();
    }catch(err){sMsg(err&&err.code==="quota_exceeded"?"Хранилище заполнено.":"Не удалось сохранить. Попробуйте ещё раз.",true)}
    finally{$("sSubmit").disabled=false}
  });
  function startEditSale(id){const s=sales.find(x=>x.id===id);if(!s)return;editId=id;
    $("sDate").value=s.date;curPoint=s.point;fillSelects();$("sCat").value=s.cat;$("sProduct").value=s.product;$("sQty").value=String(s.qty);$("sPrice").value=fmt(s.price||0);$("sSum").value=fmt(s.sum);sumTouched=true;$("sCheck").value=s.check||"";
    if(s.pays&&Object.keys(s.pays).length>1){$("sPay").value="Смешанная";const o=payOf(s);PAYS.forEach((p,i)=>$("mx"+i).value=o[p]?fmt(o[p]):"")}else{$("sPay").value=normPay(s.pay)}
    const l=s.lens||{};$("lType").value=l.type||"";$("lIndex").value=l.index||"";$("lCoat").value=l.coat||"";
    syncFormParts();
    $("sSubmit").textContent="Сохранить изменения";$("sCancel").hidden=false;$("saleFormTitle").textContent="Изменить продажу";
    $("saleFormPanel").scrollIntoView({behavior:"smooth",block:"start"});}

  // расход дня
  $("dxForm").addEventListener("submit",async ev=>{
    ev.preventDefault();
    const name=$("dxName").value.trim(),amount=parseAmt($("dxAmount").value),point=$("dxPoint").value,date=$("dxDate").value||iso(new Date());
    if(!name){flash("dxMsg","Впишите статью расхода.",true);return}
    if(!amount){flash("dxMsg","Укажите сумму.",true);return}
    if(mode!=="db"){flash("dxMsg","Расходы сохраняются только в опубликованной странице.",true);return}
    $("dxSubmit").disabled=true;
    try{await db.doc("entries/"+newId()).set({type:"exp",name:`${point} за ${name.charAt(0).toLowerCase()+name.slice(1)}`,amount,cat:"op",branch:point,date,source:"day",createdAt:Date.now()});
      $("dxName").value="";$("dxAmount").value="";flash("dxMsg",`Расход добавлен${KASSA_POINTS.includes(point)?" и учтён в кассе":""}`)}
    catch(e){flash("dxMsg","Не удалось сохранить расход.",true)}
    finally{$("dxSubmit").disabled=false}
  });

  $("setSave").onclick=async()=>{
    const pts=$("setPoints").value.split(",").map(s=>s.trim()).filter(Boolean), cts=$("setCats").value.split(",").map(s=>s.trim()).filter(Boolean);
    if(!pts.length||!cts.length){$("setMsg").textContent="Нужна хотя бы одна точка и одна категория";return}
    const plan=parseAmt($("setPlan").value)||0;
    const v={points:[...new Set(pts)],cats:[...new Set(cts)],plan};
    try{if(mode==="db")await db.doc("settings/sales").set(v);else{settings=v;lsSet("settings",v);fillSelects();renderAll()}$("setMsg").textContent="Сохранено"}catch(e){$("setMsg").textContent="Не удалось сохранить"}
  };

  // ===================== хранение =====================
  function lsGet(k,d){try{const v=localStorage.getItem("sales."+k);return v?JSON.parse(v):d}catch(e){return d}}
  function lsSet(k,v){try{localStorage.setItem("sales."+k,JSON.stringify(v))}catch(e){}}
  function toLocal(note){mode="local";$("photoPanel").hidden=true;sales=lsGet("list",[]);repDocs=lsGet("report",{});{const pc=lsGet("plan",null);if(pc)planCfg=Object.assign({months:{},sellers:Object.assign({},PL_DEF_SELLERS),off:[0]},pc)}const st=lsGet("settings",null);if(st)settings=Object.assign({plan:0},st);$("salesStatus").textContent=note||"Сохраняется только в этом браузере";fillSelects();updateDatalist();renderAll()}
  async function putSale(id,data){
    const clean=JSON.parse(JSON.stringify(data));delete clean.id;
    if(mode==="db"){try{await db.doc("sales/"+id).set(clean);return}catch(err){if(err&&["invalid_argument","not_granted","revoked","capability_disabled"].includes(err.code)){toLocal("Нет доступа к общему хранилищу — сохраняю в этом браузере")}else throw err}}
    const i=sales.findIndex(s=>s.id===id);const v=Object.assign(clean,{id});if(i>=0)sales[i]=v;else sales.push(v);lsSet("list",sales);updateDatalist();renderAll();
  }
  async function delSale(id){
    if(mode==="db"){try{await db.doc("sales/"+id).delete()}catch(e){sMsg("Не удалось удалить.",true)}return}
    sales=sales.filter(s=>s.id!==id);lsSet("list",sales);renderAll();
  }
  function confirmBtn(b,go){if(b.dataset.c){go();return}b.dataset.c="1";const t=b.textContent;b.textContent="Точно удалить?";b.style.color="var(--minus)";setTimeout(()=>{if(b.isConnected){delete b.dataset.c;b.textContent=t;b.style.color=""}},3000)}

  // ===================== графики (SVG) =====================
  const C={};
  const mono='font-family="IBM Plex Mono,monospace"';
  C.axisY=(top,step,L,W,R,T,ch,f)=>{let s="";for(let v=0;v<=top+1e-9;v+=step){const y=T+ch-(v/top)*ch;s+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${L-6}" y="${y+4}" text-anchor="end" font-size="10" fill="var(--muted)" ${mono}>${(f||fmtM)(v)}</text>`}return s};
  C.line=(labels,series,o={})=>{
    const n=labels.length;if(!n)return C.none();
    const W=o.w||Math.max(640,n*16,C.fitW||0),H=o.h||230,L=54,R=16,T=18,B=28,cw=W-L-R,ch=H-T-B;
    const mx=Math.max(1,...series.flatMap(s=>s.vals));const step=niceStep(mx/4),top=Math.ceil(mx/step)*step;
    const X=i=>L+(n<=1?cw/2:i/(n-1)*cw),Y=v=>T+ch-v/top*ch;
    let s=C.axisY(top,step,L,W,R,T,ch,o.yf);
    series.forEach(se=>{const p=se.vals.map((v,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1)).join(" ");
      if(se.area)s+=`<path d="${p} L${X(n-1).toFixed(1)} ${Y(0)} L${X(0).toFixed(1)} ${Y(0)} Z" fill="${se.color}" opacity=".12"/>`;
      s+=`<path d="${p}" fill="none" stroke="${se.color}" stroke-width="${se.dash?2:2.5}"${se.dash?' stroke-dasharray="5 4"':""} stroke-linejoin="round" stroke-linecap="round"/>`;
      if(!se.dash){s+=`<circle cx="${X(n-1)}" cy="${Y(se.vals[n-1])}" r="3.5" fill="${se.color}"/>`;
        if(n<=62)se.vals.forEach((v,i)=>{s+=`<circle cx="${X(i)}" cy="${Y(v)}" r="6" fill="transparent"><title>${esc(se.name)} · ${labels[i]}: ${fmt(v)}</title></circle>`})}});
    const every=Math.ceil(n/12);labels.forEach((l,i)=>{if(i%every===0)s+=`<text x="${X(i)}" y="${H-8}" text-anchor="middle" font-size="10" fill="var(--muted)" ${mono}>${l}</text>`});
    return `<div class="chartbox"><svg class="chart" viewBox="0 0 ${W} ${H}" style="${W>720?`min-width:${W}px`:""}" role="img">${s}</svg></div>`+(o.legend!==false&&series.length>1?C.legend(series.map(x=>({label:x.name,color:x.color,dash:x.dash}))):"");
  };
  C.legend=items=>`<div class="legend">${items.map(i=>`<span><i style="background:${i.color}${i.dash?";opacity:.55":""}"></i>${esc(i.label)}</span>`).join("")}</div>`;
  C.bars=(labels,vals,o={})=>{
    const n=labels.length;if(!n)return C.none();
    const W=o.w||Math.max(600,n*48),H=o.h||220,L=o.noAxis?8:50,R=10,T=22,B=26,cw=W-L-R,ch=H-T-B,slot=cw/n,bw=Math.min(slot*0.62,54);
    const mx=Math.max(1,...vals.map(Math.abs));const step=niceStep(mx/4),top=Math.ceil(mx/step)*step;
    const best=vals.indexOf(Math.max(...vals));
    let s=o.noAxis?"":C.axisY(top,step,L,W,R,T,ch);
    vals.forEach((v,i)=>{const h=Math.abs(v)/top*ch,x=L+i*slot+(slot-bw)/2,y=T+ch-h;const col=o.colors?o.colors[i]:(o.hl&&i===best?"var(--accent)":(o.color||"var(--p2)"));
      s+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h,v?1:0).toFixed(1)}" rx="4" fill="${col}"><title>${esc(labels[i])}: ${(o.vf||fmt)(v)}</title></rect>`;
      if(v&&n<=16)s+=`<text x="${x+bw/2}" y="${y-6}" text-anchor="middle" font-size="10" fill="var(--ink)" ${mono}>${(o.lf||fmtM)(v)}</text>`;
      const every=Math.ceil(n/14);if(i%every===0)s+=`<text x="${x+bw/2}" y="${H-8}" text-anchor="middle" font-size="10" fill="var(--muted)">${esc(labels[i])}</text>`});
    return `<div class="chartbox"><svg class="chart" viewBox="0 0 ${W} ${H}" style="${W>720?`min-width:${W}px`:""}" role="img">${s}</svg></div>`;
  };
  C.groupBars=(labels,series)=>{
    const n=labels.length;if(!n)return C.none();
    const W=Math.max(420,n*90),H=220,L=50,R=10,T=22,B=26,cw=W-L-R,ch=H-T-B,slot=cw/n,gw=Math.min(slot*0.7,90),bw=gw/series.length;
    const mx=Math.max(1,...series.flatMap(s=>s.vals));const step=niceStep(mx/4),top=Math.ceil(mx/step)*step;
    let s=C.axisY(top,step,L,W,R,T,ch);
    labels.forEach((l,i)=>{const x0=L+i*slot+(slot-gw)/2;series.forEach((se,j)=>{const v=se.vals[i]||0,h=v/top*ch,x=x0+j*bw,y=T+ch-h;s+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw-3).toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${se.color}"${se.dash?' opacity=".45"':""}><title>${esc(se.name)} · ${esc(l)}: ${fmt(v)}</title></rect>`;if(v)s+=`<text x="${x+(bw-3)/2}" y="${y-5}" text-anchor="middle" font-size="9" fill="var(--ink)" ${mono}>${fmtM(v)}</text>`});
      s+=`<text x="${L+i*slot+slot/2}" y="${H-8}" text-anchor="middle" font-size="11" fill="var(--muted)">${esc(l)}</text>`});
    return `<div class="chartbox"><svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${s}</svg></div>`+C.legend(series.map(x=>({label:x.name,color:x.color,dash:x.dash})));
  };
  C.hbars=(items,o={})=>{
    if(!items.length)return C.none();
    const max=Math.max(1,...items.map(i=>Math.abs(i.value)));
    return items.map((i,k)=>`<div class="hb"><span class="name">${o.rank?`<span class="rk">${k+1}</span>`:""}${i.color&&o.dot?`<span class="sw" style="background:${i.color}"></span>`:""}${esc(i.label)}${i.sub?` <span class="srcs">${i.sub}</span>`:""}</span><span class="val num">${i.valTxt!=null?i.valTxt:fmt(i.value)}</span><div class="track"><span style="width:${Math.max(0,i.value)/max*100}%;background:${i.color||"var(--accent)"}"></span></div></div>`).join("");
  };
  C.donut=(items,center,sub)=>{
    items=items.filter(i=>i.value>0);if(!items.length)return C.none();
    const tot=items.reduce((a,i)=>a+i.value,0),R=46,Cc=2*Math.PI*R;let off=0,s="";
    items.forEach(i=>{const len=i.value/tot*Cc;s+=`<circle cx="60" cy="60" r="${R}" fill="none" stroke="${i.color}" stroke-width="16" stroke-dasharray="${len.toFixed(2)} ${(Cc-len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 60 60)"><title>${esc(i.label)}: ${fmt(i.value)} (${Math.round(i.value/tot*100)}%)</title></circle>`;off+=len});
    s+=`<text x="60" y="${sub?58:64}" text-anchor="middle" font-size="${String(center).length>7?12:15}" font-weight="600" fill="var(--ink)" ${mono}>${esc(center)}</text>`+(sub?`<text x="60" y="74" text-anchor="middle" font-size="9" fill="var(--muted)">${esc(sub)}</text>`:"");
    return `<div class="donut"><svg viewBox="0 0 120 120" role="img">${s}</svg><div class="dleg">${items.map(i=>`<div class="kv"><span><i style="background:${i.color}"></i>${esc(i.label)}</span><span class="num">${i.valTxt!=null?i.valTxt:fmtM(i.value)} · ${Math.round(i.value/tot*100)}%</span></div>`).join("")}</div></div>`;
  };
  C.spark=(vals,color)=>{if(!vals||vals.length<2)return"";const W=120,H=30,mx=Math.max(1,...vals);const p=vals.map((v,i)=>`${(i/(vals.length-1)*W).toFixed(1)},${(H-2-v/mx*(H-4)).toFixed(1)}`).join(" ");return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${p}" fill="none" stroke="${color||"var(--accent)"}" stroke-width="2" stroke-linejoin="round"/></svg>`};
  C.ring=(p,color)=>{const R=26,Cc=2*Math.PI*R,len=Math.max(0,Math.min(1,p))*Cc;return `<svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${R}" fill="none" stroke="var(--line)" stroke-width="7"/><circle cx="32" cy="32" r="${R}" fill="none" stroke="${color||"var(--accent)"}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${len.toFixed(1)} ${Cc.toFixed(1)}" transform="rotate(-90 32 32)"/><text x="32" y="36" text-anchor="middle" font-size="12" font-weight="600" fill="var(--ink)" ${mono}>${Math.round(p*100)}%</text></svg>`};
  C.waterfall=steps=>{
    const W=520,H=230,L=56,R=10,T=24,B=30,cw=W-L-R,ch=H-T-B,n=steps.length,slot=cw/n,bw=Math.min(slot*0.55,70);
    const mx=Math.max(1,...steps.map(s=>Math.abs(s.value)),steps.reduce((a,s)=>s.type==="total"||s.type==="start"?Math.max(a,s.value):a,0));const step=niceStep(mx/4),top=Math.ceil(mx/step)*step;
    const Y=v=>T+ch-v/top*ch;let s=C.axisY(top,step,L,W,R,T,ch),run=0;
    steps.forEach((st,i)=>{let y1,y2,col;if(st.type==="start"||st.type==="total"){y1=Y(st.value);y2=Y(0);run=st.value;col=st.type==="total"?"var(--accent)":"var(--p2)"}else{const nr=run+st.value;y1=Y(Math.max(run,nr));y2=Y(Math.min(run,nr));run=nr;col=st.value<0?"var(--minus)":"var(--plus)"}
      const x=L+i*slot+(slot-bw)/2;s+=`<rect x="${x}" y="${y1}" width="${bw}" height="${Math.max(1,y2-y1)}" rx="4" fill="${col}"><title>${esc(st.label)}: ${fmt(st.value)}</title></rect><text x="${x+bw/2}" y="${y1-6}" text-anchor="middle" font-size="10" fill="var(--ink)" ${mono}>${st.value<0?"−":""}${fmtM(Math.abs(st.value))}</text><text x="${x+bw/2}" y="${H-10}" text-anchor="middle" font-size="11" fill="var(--muted)">${esc(st.label)}</text>`;
      if(i<n-1&&st.type!=="total"){const xe=x+bw;s+=`<line x1="${xe}" x2="${xe+slot-bw}" y1="${Y(run)}" y2="${Y(run)}" stroke="var(--muted)" stroke-dasharray="3 3"/>`}});
    return `<div class="chartbox"><svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${s}</svg></div>`;
  };
  C.pareto=items=>{
    const n=Math.min(items.length,30);if(!n)return C.none();items=items.slice(0,n);
    const W=Math.max(560,n*26,C.fitW||0),H=230,L=50,R=40,T=18,B=30,cw=W-L-R,ch=H-T-B,slot=cw/n,bw=slot*0.7;
    const mx=Math.max(1,...items.map(i=>i.r));const step=niceStep(mx/4),top=Math.ceil(mx/step)*step;
    let s=C.axisY(top,step,L,W,R,T,ch);
    const Yp=p=>T+ch-p*ch;s+=`<line x1="${L}" x2="${W-R}" y1="${Yp(.8)}" y2="${Yp(.8)}" stroke="var(--minus)" stroke-dasharray="4 4"/><text x="${W-R+4}" y="${Yp(.8)+4}" font-size="10" fill="var(--minus)" ${mono}>80%</text>`;
    let pth="";items.forEach((it,i)=>{const h=it.r/top*ch,x=L+i*slot+(slot-bw)/2;const col=it.abc==="A"?"var(--accent)":it.abc==="B"?"var(--p2)":"var(--line)";
      s+=`<rect x="${x}" y="${T+ch-h}" width="${bw}" height="${h}" rx="2" fill="${col}"><title>${i+1}. ${esc(it.k)}: ${fmt(it.r)} · накоплено ${Math.round(it.cs*100)}% · класс ${it.abc}</title></rect>`;pth+=(i?"L":"M")+(x+bw/2).toFixed(1)+" "+Yp(it.cs).toFixed(1)});
    s+=`<path d="${pth}" fill="none" stroke="var(--ink)" stroke-width="1.6"/>`;
    return `<div class="chartbox"><svg class="chart" viewBox="0 0 ${W} ${H}" style="${W>720?`min-width:${W}px`:""}" role="img">${s}</svg></div>`+C.legend([{label:"A — 80% выручки",color:"var(--accent)"},{label:"B — следующие 15%",color:"var(--p2)"},{label:"C — остальные 5%",color:"var(--line)"},{label:"накопленная доля",color:"var(--ink)"}]);
  };
  C.none=()=>`<p class="note" style="padding:12px 0">Нет данных за период</p>`;
  const W_=(title,note,body,wide)=>`<div class="panel w${wide?" w-wide":""}"><h2>${title}</h2>${hintOf(title)}${note&&!(hintOf(title)&&!/\d/.test(String(note).replace(/<[^>]*>/g,"")))?`<p class="note">${note}</p>`:""}<div class="wbody">${body}</div></div>`;
  const CARD=(lbl,v,d,extra,cls)=>`<div class="kpi ${cls||""}"><span class="eyebrow">${lbl}</span>${hintOf(lbl)}<div class="kv2"><span class="v">${v}</span>${extra||""}</div><span class="d">${d||"&nbsp;"}</span></div>`;

  // ===================== вкладка «Продажи» =====================
  function periodKey(s,g){g=g||F.group;return g==="day"?s:g==="week"?weekStart(s):s.slice(0,7)}
  function periodLabel(k,g){g=g||F.group;if(g==="day")return dShort(k);if(g==="week")return dShort(k)+"–"+dShort(addD(k,6));const [y,m]=k.split("-");return MONTHS[+m-1]+" "+y}
  function periodsIn(from,to,g){const out=[];if(!from||!to)return out;let d=from;const seen=new Set();let guard=0;while(d<=to&&guard++<1500){const k=periodKey(d,g);if(!seen.has(k)){seen.add(k);out.push(k)}d=addD(d,1)}return out}
  function dayCashRows(list,ex){
    const m={};
    const row=(d,p)=>m[d+"|"+p]||(m[d+"|"+p]={d,p,pay:{},tot:0,exp:0,n:0});
    list.forEach(s=>{const o=row(s.date,s.point);const py=payOf(s);Object.entries(py).forEach(([k,v])=>o.pay[k]=(o.pay[k]||0)+v);o.tot+=+s.sum||0;o.n++});
    ex.forEach(e=>{const o=row(e.date,e.branch);o.exp+=(typeof e.fact==="number"?e.fact:+e.amount||0)});
    return Object.values(m).map(o=>Object.assign(o,{cash:o.pay["Наличные"]||0,after:(o.pay["Наличные"]||0)-o.exp,kassa:KASSA_POINTS.includes(o.p)})).sort((a,b)=>b.d.localeCompare(a.d)||settings.points.indexOf(a.p)-settings.points.indexOf(b.p));
  }

  // ===================== календарь продаж =====================
  let calM="",calSel="",calDir=0;
  const CAL_MF=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const CAL_WD=["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];
  const calShort=v=>{if(!v)return "—";if(v>=1e6)return (v/1e6).toFixed(v>=1e7?1:2).replace(/\.?0+$/,"").replace(".",",")+" млн";return Math.round(v/1e3)+" тыс"};
  const calPay=s=>{const o={c:0,t:0,q:0,e:0};const add=(p,v)=>{const k=p==="Наличные"?"c":p==="Терминал"?"t":p==="Перечисление"?"e":"q";o[k]+=v};if(s.pay==="Смешанная"&&s.pays)Object.entries(s.pays).forEach(([k,v])=>add(k,+v||0));else add(s.pay,+s.sum||0);return o};
  function renderCal(){
    if(tab!=="sales")return;
    const base=sales.filter(match),today=iso(new Date());
    const months=[...new Set(base.map(s=>(s.date||"").slice(0,7)).filter(Boolean).concat([today.slice(0,7)]))].sort();
    if(!calM||calM<months[0]||calM>months[months.length-1])calM=(jDay||today).slice(0,7);
    if(!months.includes(calM))calM=months[months.length-1];
    const list=base.filter(s=>(s.date||"").startsWith(calM)),byD={};
    list.forEach(s=>{const o=byD[s.date]||(byD[s.date]={rev:0,pts:{},ck:new Set()});const v=+s.sum||0;o.rev+=v;o.pts[s.point]=(o.pts[s.point]||0)+v;o.ck.add(checkKey(s))});
    const vals=Object.values(byD).map(o=>o.rev),mx=Math.max(1,...vals),best=Object.entries(byD).sort((a,b)=>b[1].rev-a[1].rev)[0];
    const total=vals.reduce((a,b)=>a+b,0),wd=Object.keys(byD).length;
    let tgt=0,P=null;const byP={};
    try{const K=plCalc(calM),sh=F.point==="all"?1:(K.shares[F.point]||0)/100,tot=K.c.total*sh;
      if(tot&&K.work.length){const pl_=sales.filter(s=>(s.date||"").startsWith(calM)&&(F.point==="all"||s.point===F.point));pl_.forEach(s=>byP[s.date]=(byP[s.date]||0)+(+s.sum||0));
        const fact=plRev(pl_),fb=plRev(pl_.filter(s=>s.date<K.today));tgt=tot/K.work.length;P={tot,fact,K,S:plStats(tot,fact,fb,K.work,K.done,K.left,K.past)}}}catch(e){}
    const mS=v=>(v<0?"−":"+")+calShort(Math.abs(v));
    if(!calSel||!calSel.startsWith(calM))calSel=byD[jDay]&&jDay.startsWith(calM)?jDay:(Object.keys(byD).sort().pop()||"");
    $("sCalTitle").textContent=CAL_MF[+calM.slice(5,7)-1]+" "+calM.slice(0,4);
    $("sCalPrev").disabled=calM<=months[0];$("sCalNext").disabled=calM>=months[months.length-1];
    $("sCalSum").innerHTML=`<div>Выручка за месяц<b>${fmt(total)}</b></div><div>Дней с продажами<b>${wd}</b></div><div>В среднем за день<b>${fmt(wd?total/wd:0)}</b></div>`+(best?`<div>Лучший день<b>${+best[0].slice(8)} ${CAL_MF[+calM.slice(5,7)-1].toLowerCase().replace(/ь$|й$/,"я").replace(/т$/,"та")} · ${calShort(best[1].rev)}</b></div>`:"")+(F.point!=="all"?`<div>Точка<b>${esc(F.point)}</b></div>`:"")
      +(P?(()=>{const pct=P.fact/P.tot,ok=P.fact>=P.tot,S=P.S,K=P.K;
        return `<div class="scal-plan"><div class="sp-t"><span>План ${F.point==="all"?"месяца":esc(F.point)}: <b>${fmt(P.tot)}</b></span><span class="sp-c ${ok?"ok":pct>=(K.done.length/K.work.length)*0.95?"mid":"bad"}">${Math.round(pct*100)}% выполнено</span></div>
          <div class="sp-b"><i style="width:${Math.min(100,pct*100).toFixed(1)}%"></i>${!K.past&&!K.future?`<s style="left:${Math.min(100,K.done.length/K.work.length*100).toFixed(1)}%" title="Где нужно быть сегодня по графику"></s>`:""}</div>
          <div class="sp-g"><div>Сделано<b>${fmt(P.fact)}</b></div><div>${ok?"Перевыполнено":"Осталось"}<b class="${ok?"g":""}">${fmt(Math.abs(P.tot-P.fact))}</b></div>
          <div>План в день<b>${fmt(tgt)}</b></div><div>${K.past?"Месяц закрыт":ok?"Нужно в день":"Нужно теперь в день"}<b class="${!K.past&&!ok&&S.needDay>tgt?"r":""}">${K.past||ok?"—":fmt(S.needDay)}</b><small>${K.past||ok?"":`на ${K.left.length} ${pl(K.left.length,"рабочий день","рабочих дня","рабочих дней")}`}</small></div></div></div>`})():"");
    const first=pd(calM+"-01"),lead=(first.getDay()+6)%7,n=+monthEnd(calM).slice(8),cells=[];
    for(let i=0;i<lead;i++)cells.push(null);for(let d=1;d<=n;d++)cells.push(calM+"-"+String(d).padStart(2,"0"));while(cells.length%7)cells.push(null);
    const wl=[];
    let h=`<div class="scal-wd">${["Пн","Вт","Ср","Чт","Пт","Сб","Вс","Неделя"].map(x=>`<span>${x}</span>`).join("")}</div><div class="scal-grid${calDir<0?" l":""}">`;
    for(let w=0;w<cells.length;w+=7){let wsum=0;
      cells.slice(w,w+7).forEach(d=>{if(!d){h+=`<div class="scal-c out" aria-hidden="true"></div>`;return}
        const o=byD[d],v=o?o.rev:0,sun=pd(d).getDay()===0,fut=d>today,isTop=best&&best[0]===d;wsum+=v;
        const cls=["scal-c",o?"":"empty",sun?"sun":"",fut?"fut":"",d===today?"tod":"",isTop?"top":""].filter(Boolean).join(" ");
        const st=o?Object.entries(o.pts).sort((a,b)=>b[1]-a[1]).map(([p,x])=>`<i style="width:${(x/v*100).toFixed(1)}%;background:${pointColor(p)}"></i>`).join(""):"";
        h+=`<button type="button" class="${cls}" data-cd="${d}" aria-pressed="${d===calSel}" style="--h:${(v/mx).toFixed(3)}" title="${dLong(d)}${o?": "+fmt(v)+" сум":""}"${fut?" disabled":""}><span class="n">${+d.slice(8)}</span>${tgt&&v>=tgt?'<span class="pk" title="План дня выполнен"></span>':""}<span class="bt"><span class="v">${o?calShort(v):sun?"выходной":fut?"":"—"}</span><span class="vs">${o?(v>=1e6?(v/1e6).toFixed(1).replace(".",","):Math.round(v/1e3)+"к"):sun||fut?"":"—"}</span>${P&&!sun&&!plOff(d)?(fut||(d===today&&!o)?`<span class="pd need">нужно ${((P.S.needDay||tgt)/1e6).toFixed(1).replace(".",",")}</span>`:`<span class="pd ${(byP[d]||0)>=tgt?"up":"dn"}"><span class="pl">${mS((byP[d]||0)-tgt)}</span><span class="ps">${((byP[d]||0)-tgt<0?"−":"+")+(Math.abs((byP[d]||0)-tgt)/1e6).toFixed(1).replace(".",",")}</span></span>`):""}${st?`<span class="cbar">${st}</span>`:""}</span></button>`});
      {const wk=cells.slice(w,w+7).filter(Boolean);let wp="";
        if(P){const wd=wk.filter(d=>!plOff(d)),wPlan=tgt*wd.length,wF=wk.reduce((a,d)=>a+(byP[d]||0),0),past=wk.every(d=>d<today),fut=wk.every(d=>d>today),left=wPlan-wF;
          wp=`<small>план ${calShort(wPlan)}</small>`+(fut?`<em class="need">нужно ${calShort(wPlan)}</em>`:past?`<em class="${wF>=wPlan?"up":"dn"}">${mS(wF-wPlan)}</em>`:`<em class="${left<=0?"up":"need"}">${left<=0?mS(-left):"ост. "+calShort(left)}</em>`)}
        h+=`<div class="scal-w"><span>Неделя</span><b>${wsum?calShort(wsum):"—"}</b>${wp}</div>`;
        wl.push(`<div><span>${+wk[0].slice(8)}–${+wk[wk.length-1].slice(8)}</span><b>${wsum?calShort(wsum):"—"}</b>${wp}</div>`)}}
    h+=`</div>${wl.length?`<div class="scal-wl"><h4>По неделям</h4>${wl.join("")}</div>`:""}<div class="scal-leg"><span>меньше<span class="grad"></span>больше</span>${[...new Set(list.map(s=>s.point))].map(p=>`<span><i style="background:${pointColor(p)}"></i>${esc(p)}</span>`).join("")}${tgt?'<span><i style="background:var(--plus)"></i>план дня выполнен</span>':""}</div>`;
    $("sCalGrid").innerHTML=h;calDir=0;
    renderCalDay(calSel,base);
  }
  function renderCalDay(d,base){
    const box=$("sCalDay");
    if(!d){box.innerHTML=`<div class="dt">Выберите день</div><div class="sub">В этом месяце продаж пока нет.</div>`;return}
    const l=(base||sales.filter(match)).filter(s=>s.date===d),rev=l.reduce((a,s)=>a+(+s.sum||0),0),ck=new Set(l.map(checkKey)).size;
    const pts={},pay={c:0,t:0,q:0,e:0},prod={};
    l.forEach(s=>{pts[s.point]=(pts[s.point]||0)+(+s.sum||0);const x=calPay(s);Object.keys(pay).forEach(k=>pay[k]+=x[k]);const k=s.product||s.cat||"—";prod[k]=(prod[k]||0)+(+s.sum||0)});
    const dt=pd(d);
    const ex=dayExp.filter(e=>e.date===d&&(F.point==="all"||e.branch===F.point)).reduce((a,e)=>a+(typeof e.fact==="number"?e.fact:+e.amount||0),0);
    box.innerHTML=`<div><div class="dt">${dt.getDate()} ${CAL_MF[dt.getMonth()].toLowerCase().replace(/ь$|й$/,"я").replace(/т$/,"та")} · ${CAL_WD[dt.getDay()]}</div><div class="big">${fmt(rev)}</div><div class="sub">${ck} ${pl(ck,"чек","чека","чеков")} · средний ${fmt(ck?rev/ck:0)}${ex?` · расходы ${fmt(ex)}`:""}</div></div>`
      +(rev?`<div class="rows">${Object.entries(pts).sort((a,b)=>b[1]-a[1]).map(([p,v])=>`<div class="r"><div class="top"><span>${esc(p)}</span><b>${fmt(v)}</b></div><div class="bar"><i style="width:${(v/rev*100).toFixed(1)}%;background:${pointColor(p)}"></i></div></div>`).join("")}</div>
      <div class="pays"><div>Нал<b>${calShort(pay.c)}</b></div><div>Терминал<b>${calShort(pay.t)}</b></div><div>QR<b>${calShort(pay.q)}</b></div></div>
      <div><h4>Больше всего</h4><div class="tops" style="margin-top:6px">${Object.entries(prod).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`<div><span title="${esc(k)}">${esc(k)}</span><b>${fmt(v)}</b></div>`).join("")}</div></div>
      <button type="button" class="go" id="sCalGo">Открыть журнал дня</button>`:`<div class="sub">${pd(d).getDay()===0?"Воскресенье — выходной.":"В этот день продаж нет."}</div>`);
  }
  $("sCalGrid").addEventListener("click",e=>{const b=e.target.closest("[data-cd]");if(!b||b.disabled)return;calSel=b.dataset.cd;$("sCalGrid").querySelectorAll("[data-cd]").forEach(x=>x.setAttribute("aria-pressed",x===b?"true":"false"));renderCalDay(calSel)});
  $("sCalDay").addEventListener("click",e=>{if(!e.target.closest("#sCalGo"))return;jDay=calSel;renderSales();const j=$("jGrid").closest("section");if(j)j.scrollIntoView({behavior:"smooth",block:"start"})});
  const calShift=k=>{const d=pd(calM+"-01");d.setMonth(d.getMonth()+k);calM=iso(d).slice(0,7);calDir=k;calSel="";renderCal()};
  $("sCalPrev").onclick=()=>calShift(-1);$("sCalNext").onclick=()=>calShift(1);
  $("sCalToday").onclick=()=>{const t=iso(new Date());calDir=t.slice(0,7)<calM?-1:1;calM=t.slice(0,7);calSel=t;renderCal()};

  function renderSales(){
    if(tab!=="sales")return;
    try{renderCal()}catch(err){console.error(err)}
    const list=filtered(), a=agg(list), pv=prevList(), pa=pv?agg(pv.list):null, r=rangeOf(list), ex=expFiltered();
    const expSum=ex.reduce((x,e)=>x+(typeof e.fact==="number"?e.fact:+e.amount||0),0);
    $("salesKpis").innerHTML=CARD("Выручка",fmt(a.rev)+" сум",cmp(a.rev,pa&&pa.rev),"","main")+CARD("Чеков / позиций",`${fmt(a.checks)} / ${fmt(a.n)}`,cmp(a.checks,pa&&pa.checks))+CARD("Средний чек",fmt(a.avg)+" сум",cmp(a.avg,pa&&pa.avg))+CARD("Б/Ч − расходы дня",fmt(a.cash-expSum)+" сум",`наличные ${fmt(a.cash)} · расходы ${fmt(expSum)}`);

    // касса дня
    const rows=dayCashRows(list,ex);
    $("dayCashEmpty").hidden=rows.length>0;
    $("dayCashWrap").innerHTML=settings.points.concat([...new Set(rows.map(o=>o.p))].filter(p=>!settings.points.includes(p))).map(pt=>{
      const rs=rows.filter(o=>o.p===pt);if(!rs.length)return "";
      const T=k=>rs.reduce((x,o)=>x+(typeof k==="function"?k(o):o[k]),0);const kas=KASSA_POINTS.includes(pt);const open=dcOpen.has(pt);
      const head=`<button type="button" class="dchead" data-dc="${esc(pt)}" aria-expanded="${open}"><span class="l"><span class="chev">${open?"▾":"▸"}</span><span class="sw" style="background:${pointColor(pt)}"></span>${esc(pt)} ${kas?'<span class="pill op">Б/Ч в кассу</span>':'<span class="pill oth">Б/Ч на точке</span>'}</span><span class="r2"><span>${rs.length} ${pl(rs.length,"день","дня","дней")}</span><span>выручка <b class="num">${fmt(T("tot"))}</b></span><span>наличные <b class="num">${fmt(T("cash"))}</b></span><span>расходы <b class="num">−${fmt(T("exp"))}</b></span><span>Б/Ч после расходов <b class="num">${fmt(T("after"))}</b></span></span></button>`;
      if(!open)return `<div class="dcblk">${head}</div>`;
      return `<div class="dcblk">${head}<div class="tbl"><table><thead><tr><th>Дата</th>${PAYS.map(p=>`<th class="r">${p}</th>`).join("")}<th class="r">Итого</th><th class="r">Расходы дня</th><th class="r">Б/Ч после расходов</th></tr></thead><tbody>`+
      rs.map(o=>`<tr><td class="num">${dShort(o.d)} <span class="srcs">${WD[wdIdx(o.d)]}</span></td>${PAYS.map(p=>`<td class="r num">${o.pay[p]?fmt(o.pay[p]):'<span class="srcs">—</span>'}</td>`).join("")}<td class="r num"><b>${fmt(o.tot)}</b></td><td class="r num">${o.exp?'<span class="down">−'+fmt(o.exp)+"</span>":'<span class="srcs">—</span>'}</td><td class="r num"><b>${fmt(o.after)}</b></td></tr>`).join("")+
      `</tbody><tfoot><tr><td><b>Итого</b></td>${PAYS.map(p=>`<td class="r num"><b>${fmt(T(o=>o.pay[p]||0))}</b></td>`).join("")}<td class="r num"><b>${fmt(T("tot"))}</b></td><td class="r num"><b>−${fmt(T("exp"))}</b></td><td class="r num"><b>${fmt(T("after"))}</b></td></tr></tfoot></table></div></div>`}).join("");
    $("dayCashWrap").querySelectorAll("[data-dc]").forEach(b=>b.onclick=()=>{const p=b.dataset.dc;dcOpen.has(p)?dcOpen.delete(p):dcOpen.add(p);renderSales()});

    // расходы дня — список
    const exAll=[...ex].sort((x,y)=>(y.date||"").localeCompare(x.date||"")||(y.createdAt||0)-(x.createdAt||0));const exs=exAll;
    $("dxToggle").innerHTML=exAll.length?(dxOpen?`▾ Свернуть список расходов`:`▸ Показать расходы за период (${exAll.length}) · −${fmt(expSum)} сум`):"Расходов дня за период нет";
    $("dxToggle").disabled=!exAll.length;$("dxWrap").hidden=!dxOpen||!exAll.length;
    {const v=e=>typeof e.fact==="number"?e.fact:+e.amount||0;const bp={};exAll.forEach(e=>bp[e.branch]=(bp[e.branch]||0)+v(e));const mx=Math.max(1,...Object.values(bp));
     $("dxSum").innerHTML=exAll.length&&!dxOpen?`<h3 class="wsub" style="margin-top:16px">Расходы за период по точкам</h3>`+Object.entries(bp).sort((a,b)=>b[1]-a[1]).map(([k,x])=>`<div class="hb"><span class="name"><span class="sw" style="background:${pointColor(k)}"></span>${esc(k)}</span><span class="val num">${fmt(x)}</span><div class="track"><span style="width:${x/mx*100}%;background:${pointColor(k)}"></span></div></div>`).join("")+
       `<h3 class="wsub" style="margin-top:14px">Последние расходы</h3><div class="dx-last">`+exAll.slice(0,4).map(e=>`<div class="kv"><span>${dShort(e.date)} · ${esc(String(e.name||"").replace(/^\S+\s+(за|на)\s+/i,""))} <span class="srcs">${esc(e.branch||"")}</span></span><span class="num">−${fmt(v(e))}</span></div>`).join("")+`</div>`:"";}
    $("dxTable").innerHTML=exs.length?`<thead><tr><th>Дата</th><th>Точка</th><th>Статья</th><th class="r">Сумма</th><th></th></tr></thead><tbody>`+exs.map(e=>`<tr><td class="num">${dShort(e.date)}</td><td>${esc(e.branch)}</td><td>${esc(String(e.name).replace(/^\S+\s+(за|на)\s+/i,""))}</td><td class="r num">${fmt(typeof e.fact==="number"?e.fact:e.amount)}</td><td class="acts"><button class="ghost del" type="button" data-xd="${esc(e.id)}">Удалить</button></td></tr>`).join("")+`</tbody>`:`<tbody><tr><td class="srcs">Расходов дня за период нет</td></tr></tbody>`;
    $("dxTable").querySelectorAll("[data-xd]").forEach(b=>b.onclick=()=>confirmBtn(b,async()=>{try{await db.doc("entries/"+b.dataset.xd).delete()}catch(e){flash("dxMsg","Не удалось удалить.",true)}}));

    // статистика по периодам
    if(!stF.from||stF.from<r.from||stF.from>r.to)stF.from=r.from;if(!stF.to||stF.to>r.to||stF.to<r.from)stF.to=r.to;
    $("stFrom").value=stF.from||"";$("stTo").value=stF.to||"";$("stFrom").min=$("stTo").min=r.from||"";$("stFrom").max=$("stTo").max=r.to||"";
    $("stWd").innerHTML=WD.map((d,i)=>`<button type="button" data-wd="${i}" aria-pressed="${!stF.wd.has(i)}">${d}</button>`).join("");
    $("stWd").querySelectorAll("[data-wd]").forEach(b=>b.onclick=()=>{const i=+b.dataset.wd;stF.wd.has(i)?stF.wd.delete(i):stF.wd.add(i);if(stF.wd.size===7)stF.wd.clear();renderSales()});
    const sl=list.filter(s=>s.date>=stF.from&&s.date<=stF.to&&!stF.wd.has(wdIdx(s.date)));
    const keys=sl.length?periodsIn(stF.from,stF.to).filter(k=>F.group!=="day"||!stF.wd.has(wdIdx(k))):[];
    const pts=settings.points.filter(p=>F.point==="all"||p===F.point);
    const byK={};keys.forEach(k=>byK[k]={tot:0,n:0,ch:new Set()});
    sl.forEach(s=>{const k=periodKey(s.date);const o=byK[k]||(byK[k]={tot:0,n:0,ch:new Set()});o[s.point]=(o[s.point]||0)+(+s.sum||0);o.tot+=+s.sum||0;o.n++;o.ch.add(checkKey(s))});
    const ks=Object.keys(byK).sort();
    drawStack(ks,byK,pts);
    $("salesLegend").innerHTML=pts.map(p=>`<span><i style="background:${pointColor(p)}"></i>${esc(p)}</span>`).join("");
    const sa=agg(sl);const STL=7;const ksr=[...ks].reverse();
    $("stMore").hidden=ksr.length<=STL;$("stMore").textContent=stAll?"Свернуть":`Показать все (${ksr.length})`;
    $("periodTable").innerHTML=ks.length?`<thead><tr><th>${F.group==="day"?"День":F.group==="week"?"Неделя":"Месяц"}</th>${pts.map(p=>`<th class="r">${esc(p)}</th>`).join("")}<th class="r">Итого</th><th class="r">Чеков</th><th class="r">Ср. чек</th></tr></thead><tbody>`+
      (stAll?ksr:ksr.slice(0,STL)).map(k=>{const o=byK[k];return `<tr><td class="num">${periodLabel(k)}${F.group==="day"?` <span class="srcs">${WD[wdIdx(k)]}</span>`:""}</td>${pts.map(p=>`<td class="r num">${o[p]?fmt(o[p]):'<span class="srcs">—</span>'}</td>`).join("")}<td class="r num"><b>${fmt(o.tot)}</b></td><td class="r num">${o.ch.size}</td><td class="r num">${o.ch.size?fmt(o.tot/o.ch.size):"—"}</td></tr>`}).join("")+
      `</tbody><tfoot><tr><td><b>Всего</b></td>${pts.map(p=>`<td class="r num"><b>${fmt(sl.filter(s=>s.point===p).reduce((x,s)=>x+(+s.sum||0),0))}</b></td>`).join("")}<td class="r num"><b>${fmt(sa.rev)}</b></td><td class="r num"><b>${sa.checks}</b></td><td class="r num"><b>${sa.checks?fmt(sa.avg):"—"}</b></td></tr></tfoot>`:`<tbody><tr><td class="srcs">Нет продаж в выбранные дни</td></tr></tbody>`;

    renderJournal(list);
  }
  $("dxToggle").onclick=()=>{dxOpen=!dxOpen;renderSales()};
  $("stMore").onclick=()=>{stAll=!stAll;renderSales()};
  $("stFrom").addEventListener("change",()=>{stF.from=$("stFrom").value;renderSales()});
  $("stTo").addEventListener("change",()=>{stF.to=$("stTo").value;renderSales()});
  $("stReset").onclick=()=>{stF.from="";stF.to="";stF.wd.clear();renderSales()};
  // журнал по дням: выбранная дата, колонка на каждую точку, позиции одного чека вместе
  const PAYSHORT={"Наличные":"Нал","Терминал":"Тер","QR/Payme":"QR","Перечисление":"Пер"};
  const payTags=s=>{const p=payOf(s);return Object.keys(p).filter(k=>p[k]).map(k=>`<span class="pt pt-${PAYS.indexOf(k)}" title="${esc(k)}: ${fmt(p[k])}">${PAYSHORT[k]||esc(k)}</span>`).join("")};
  const jOpen=new Set();const J_MAX=24;
  function renderJournal(list){
    const days=[...new Set(sales.filter(match).map(s=>s.date).filter(Boolean))].sort();
    const inP=[...new Set(list.map(s=>s.date))].sort();
    const jSet=jDay;if(!jDay)jDay=inP.length?inP[inP.length-1]:(days.length?days[days.length-1]:iso(new Date()));
    $("jDate").value=jDay;
    $("jPrev").disabled=!days.some(d=>d<jDay);$("jNext").disabled=!days.some(d=>d>jDay);
    const dayList=sales.filter(s=>s.date===jDay&&match(s));
    const dex=dayExp.filter(e=>e.date===jDay&&(F.point==="all"||e.branch===F.point));
    const base=["Премиум","Яшнабад","Сергели"].filter(p=>settings.points.includes(p));
    let pts=settings.points.filter(p=>base.includes(p)||dayList.some(s=>s.point===p));
    dayList.forEach(s=>{if(!pts.includes(s.point))pts.push(s.point)});
    if(F.point!=="all")pts=pts.filter(p=>p===F.point);
    const tot=dayList.reduce((x,s)=>x+(+s.sum||0),0);
    $("jInfo").textContent=`${WD[wdIdx(jDay)]} · ${dayList.length} ${pl(dayList.length,"позиция","позиции","позиций")} · ${fmt(tot)} сум`;
    $("salesCount").textContent=`Стрелки листают дни с продажами. Выгрузка CSV и Excel берёт все записи за период фильтра (${list.length} ${pl(list.length,"позиция","позиции","позиций")}).`;
    $("salesEmpty").hidden=dayList.length>0;
    const row=s=>{const d=discOf(s);const extra=(s.qty>1?` <small>${s.qty}×${fmt(s.price||0)}</small>`:"")+(d?` <small>−${fmt(d)}</small>`:"");
      return `<div class="jr${s.id===editId?" editing":""}"><span class="jn" title="${esc(s.cat)} · ${esc(s.product)}${s.qty>1?` · ${s.qty} шт`:""}${d?` · скидка ${fmt(d)}`:""}">${esc(s.product)}${extra}</span><span>${payTags(s)}</span><b class="num">${fmt(s.sum)}</b><span class="ja"><button type="button" data-se="${esc(s.id)}" title="Изменить" aria-label="Изменить">✎</button><button type="button" class="del" data-sd="${esc(s.id)}" title="Удалить" aria-label="Удалить">✕</button></span></div>`};
    $("jGrid").innerHTML=dayList.length?pts.map(pt=>{
      const it=dayList.filter(s=>s.point===pt).sort((x,y)=>(!x.check)-(!y.check)||String(x.check||"").localeCompare(String(y.check||""),undefined,{numeric:true})||(x.createdAt||0)-(y.createdAt||0));
      const pay={};it.forEach(s=>Object.entries(payOf(s)).forEach(([k,v])=>pay[k]=(pay[k]||0)+v));
      const sum=it.reduce((x,s)=>x+(+s.sum||0),0), ex=dex.filter(e=>e.branch===pt).reduce((x,e)=>x+(typeof e.fact==="number"?e.fact:+e.amount||0),0);
      // группы по чеку
      const groups=[];const byCk={};it.forEach(s=>{const c=String(s.check||"").trim();if(c){if(!byCk[c]){byCk[c]={c,items:[]};groups.push(byCk[c])}byCk[c].items.push(s)}else groups.push({c:"",items:[s]})});
      const open=jOpen.has(pt);let shown=0,html="",nG=0;
      for(const g of groups){if(!open&&shown>=J_MAX)break;shown+=g.items.length;nG++;
        if(g.items.length>1)html+=`<li class="jck"><div class="jck-h"><span>Чек №${esc(g.c)}</span><span class="num">${fmt(g.items.reduce((x,s)=>x+(+s.sum||0),0))}</span></div>${g.items.map(row).join("")}</li>`;
        else html+=`<li>${row(g.items[0]).replace('<span class="jn"',g.c?`<span class="jn" data-ck="${esc(g.c)}"`:'<span class="jn"')}</li>`}
      const hiddenN=it.length-Math.min(it.length,shown);
      const kas=KASSA_POINTS.includes(pt);
      return `<div class="jcol"><div class="jh"><span class="jp"><span class="sw" style="background:${pointColor(pt)}"></span>${esc(pt)} <span class="srcs">${it.length} поз.</span></span><b class="num">${fmt(sum)}</b></div>
      <div class="jpay">${PAYS.filter(p=>pay[p]).map(p=>`<span>${PAYSHORT[p]} <b class="num">${fmt(pay[p])}</b></span>`).join("")||'<span>продаж нет</span>'}</div>
      ${it.length?`<ol class="jl" style="--jn:${nG}">${html}</ol>`:`<div class="jnone">Продаж нет</div>`}
      ${hiddenN>0?`<button type="button" class="jmore" data-jo="${esc(pt)}">Показать все (${it.length})</button>`:open&&it.length>J_MAX?`<button type="button" class="jmore" data-jo="${esc(pt)}">Свернуть</button>`:""}
      ${ex||pay["Наличные"]?`<div class="jft">${ex?`<div><span>Расходы дня</span><span class="num down">−${fmt(ex)}</span></div>`:""}<div><span>Б/Ч после расходов ${kas?"→ в кассу":"· на точке"}</span><b class="num">${fmt((pay["Наличные"]||0)-ex)}</b></div></div>`:""}</div>`}).join(""):"";
    $("jGrid").querySelectorAll("[data-ck]").forEach(e=>{e.insertAdjacentHTML("afterbegin",`<small>№${esc(e.dataset.ck)} </small>`)});
    $("jGrid").querySelectorAll("[data-jo]").forEach(b=>b.onclick=()=>{const p=b.dataset.jo;jOpen.has(p)?jOpen.delete(p):jOpen.add(p);renderSales()});
    $("jGrid").querySelectorAll("[data-se]").forEach(b=>b.onclick=()=>startEditSale(b.dataset.se));
    if(!jSet)jDay="";
    $("jGrid").querySelectorAll("[data-sd]").forEach(b=>b.onclick=()=>{if(!b.dataset.c){b.dataset.c="1";b.textContent="удалить?";setTimeout(()=>{if(b.isConnected){delete b.dataset.c;b.textContent="✕"}},3000);return}delSale(b.dataset.sd)});
  }
  $("jDate").addEventListener("change",()=>{if($("jDate").value){jDay=$("jDate").value;renderSales()}});
  $("jPrev").onclick=()=>{const cur=$("jDate").value;const d=[...new Set(sales.filter(match).map(s=>s.date))].sort().filter(x=>x<cur).pop();if(d){jDay=d;renderSales()}};
  $("jNext").onclick=()=>{const cur=$("jDate").value;const d=[...new Set(sales.filter(match).map(s=>s.date))].sort().find(x=>x>cur);if(d){jDay=d;renderSales()}};
  function drawStack(ks,byK,pts){
    const svg=$("salesChart");
    if(!ks.length){svg.setAttribute("viewBox","0 0 640 120");svg.style.minWidth="";svg.innerHTML=`<text x="320" y="64" text-anchor="middle" font-size="13" fill="var(--muted)">Нет продаж за период</text>`;return}
    const fw=svg.parentElement&&svg.parentElement.offsetParent!==null?svg.parentElement.clientWidth:0,slot=ks.length>24?26:Math.max(26,Math.max(600,fw-56)/ks.length), L=48,R=8,T=20,B=34, W=Math.max(640,L+R+slot*ks.length), H=250, ch=H-T-B;
    const max=Math.max(...ks.map(k=>byK[k].tot),1); const step=niceStep(max/4); const top=Math.ceil(max/step)*step||1;
    let s=C.axisY(top,step,L,W,R,T,ch);
    const bw=Math.min(slot*0.62,46), every=Math.ceil(ks.length/24);
    ks.forEach((k,i)=>{const x=L+i*slot+(slot-bw)/2;let y0=T+ch;const o=byK[k];
      pts.forEach(p=>{const v=o[p]||0;if(!v)return;const h=v/top*ch;y0-=h;s+=`<rect x="${x}" y="${y0}" width="${bw}" height="${h}" fill="${pointColor(p)}"><title>${esc(p)} · ${periodLabel(k)}: ${fmt(v)} сум</title></rect>`});
      if(o.tot&&ks.length<=16)s+=`<text x="${x+bw/2}" y="${y0-5}" text-anchor="middle" font-size="10" fill="var(--ink)" ${mono}>${fmtM(o.tot)}</text>`;
      if(i%every===0)s+=`<text x="${x+bw/2}" y="${H-12}" text-anchor="middle" font-size="10" fill="var(--muted)" ${mono}>${F.group==="week"?dShort(k):periodLabel(k)}</text>`});
    svg.setAttribute("viewBox",`0 0 ${W} ${H}`);svg.style.minWidth=W>700?W+"px":"";svg.innerHTML=s;
  }

  // ===================== себестоимость: из строки продажи, со склада или из списка партии =====================
  let matcherCache=null;
  function batchMatcher(){
    if(matcherCache)return matcherCache;
    const res=[];const add=(b,it,pri)=>[it.m,it.s,it.n].forEach(v=>{const t=normS(v);if(t.length>=3)res.push({b,it,pri,len:t.length,re:new RegExp("(^|[^a-zа-я0-9])"+reEsc(t)+"($|[^a-zа-я0-9])","i")})});
    stockItems().forEach(it=>add(null,it,0));
    batches.forEach(b=>(b.items||[]).forEach(it=>add(b,it,1)));
    res.sort((x,y)=>y.len-x.len||x.pri-y.pri);
    const cache={};
    // среди совпадений одной длины берём позицию с самой близкой ценой продажи, при равенстве — с той же точки
    matcherCache=(prod,price,pt)=>{const p=normS(prod);const ck=p+"|"+(price||"")+"|"+(pt||"");if(ck in cache)return cache[ck];
      let best=null,bl=0,bs=Infinity;
      for(const r of res){if(best&&r.len<bl)break;if(!r.re.test(p))continue;
        const sc=r.pri*1e13+(+r.it.cp>0?0:1e12)+(price&&+r.it.p?Math.abs(+r.it.p-price):1e9)+(pt&&r.it.pt&&r.it.pt!==pt?1e8:0);
        if(sc<bs){bs=sc;best=r;bl=r.len}}
      return cache[ck]=best};
    return matcherCache;
  }
  const unitPrice=s=>+s.price||Math.round((+s.sum||0)/(+s.qty||1));
  const costOf=s=>{if(+s.cost>0)return +s.cost;const m=batchMatcher()(s.product,unitPrice(s),s.point);return m&&+m.it.cp>0?+m.it.cp:0};
  function marginOf(l){let rev=0,cogs=0,all=0;l.forEach(s=>{all+=+s.sum||0;const c=costOf(s);if(c){rev+=+s.sum||0;cogs+=c*(+s.qty||0)}});return {rev,cogs,gross:rev-cogs,m:rev?(rev-cogs)/rev:null,cover:all?rev/all:0}}

  // ===================== вкладка «Аналитика» =====================
  const METRICS=[
    ["Выручка и продажи",[[1,"Выручка за период + график по дням"],[2,"Рост выручки к прошлому периоду"],[3,"Выручка в среднем за день"],[4,"Прогноз выручки на конец месяца"],[5,"Выполнение плана месяца"],[6,"Выручка нарастающим итогом"],[7,"Количество продаж (позиций)"],[8,"Проданных единиц"],[9,"Средний чек"],[10,"Средняя цена единицы"],[11,"Единиц в одном чеке"],[12,"Лучший и худший день"],[13,"Дни без продаж"]]],
    ["Точки",[[14,"Выручка каждой точки по дням"],[15,"Доля точек в выручке"],[16,"Рост точек к прошлому периоду"],[17,"Средний чек по точкам"],[18,"Рейтинг точек"],[19,"Выручка точки на рабочий день"]]],
    ["Касса и деньги",[[20,"Б/Ч по точкам"],[21,"Доля наличных и безнала"],[22,"Способы оплаты"],[23,"Расходы дня по точкам"],[24,"Расходы в % от выручки"],[25,"Б/Ч после расходов (водопад)"],[26,"Должно быть на руках и факт"],[27,"Излишек / недостача по пересчётам"]]],
    ["Товары и категории",[[28,"Выручка по категориям"],[29,"Доля категорий"],[30,"Средняя цена по категориям"],[31,"Топ-10 товаров по выручке"],[32,"Топ-10 товаров по количеству"],[33,"ABC-анализ"],[34,"Перестали продаваться"],[35,"Оправа + линзы в одном чеке"],[58,"Самые продаваемые по ценовым группам"]]],
    ["Прибыль",[[36,"Валовая прибыль"],[37,"Маржа"],[38,"Маржа по категориям"],[39,"Маржа по точкам"]]],
    ["Скидки",[[40,"Сумма скидок"],[41,"Скидка в % от выручки"],[42,"Доля продаж со скидкой"]]],
    ["Время",[[43,"По дням недели"],[44,"По неделям"],[45,"По месяцам"],[46,"Тепловая карта точка × день недели"],[47,"Лучший день недели каждой точки"]]],
    ["Новая партия",[[48,"Продано из партии, шт и %"],[49,"Осталось, шт и сумма"],[50,"Продажи партии по точкам"],[51,"Продажи партии по группам"],[52,"Темп продаж партии в день"],[53,"Прогноз распродажи остатка"],[54,"Модели без единой продажи"],[55,"Модели на дозаказ"],[56,"Выручка и маржа по партии"],[57,"Доля партии в общих продажах"]]]
  ];
  const ALL_IDS=METRICS.flatMap(g=>g[1].map(x=>x[0]));
  let anSel=null;
  // храним выключенные показатели: всё новое по умолчанию включено
  const selSet=()=>{const off=new Set(anSel||lsGet("anOff",null)||[]);return new Set(ALL_IDS.filter(i=>!off.has(i)))};
  function renderPicker(){
    const sel=selSet();
    $("anPickCount").textContent=`· включено ${sel.size} из ${ALL_IDS.length}`;
    $("anPickList").innerHTML=METRICS.map(([g,items])=>`<div class="pk-group"><span class="eyebrow">${g}</span><div class="pk-items">${items.map(([id,nm])=>`<label class="tgl"><input type="checkbox" role="switch" data-mid="${id}"${sel.has(id)?" checked":""}><span class="tg" aria-hidden="true"></span><span>${esc(nm)}${MHINT[id]?`<small class="pk-hint">${MHINT[id]}</small>`:""}</span></label>`).join("")}</div></div>`).join("");
    $("anPickList").querySelectorAll("[data-mid]").forEach(c=>c.onchange=()=>{const s=selSet();const id=+c.dataset.mid;c.checked?s.add(id):s.delete(id);saveSel([...s].sort((a,b)=>a-b))});
  }
  async function saveSel(arr){const on=new Set(arr);const off=ALL_IDS.filter(i=>!on.has(i));anSel=off;lsSet("anOff",off);renderAnalytics();if(mode==="db"){try{await db.doc("settings/analytics3").set({off})}catch(e){}}}
  $("anPickAll").onclick=()=>saveSel(ALL_IDS.slice());
  $("anPickDef").onclick=()=>saveSel([]);

  function renderAnPointSeg(){
    const seg=$("anPointSeg");if(!seg)return;
    seg.innerHTML=[["all","Общий"]].concat(settings.points.map(p=>[p,p])).map(([v,l])=>`<button type="button" data-ap="${esc(v)}" aria-pressed="${F.point===v}">${esc(l)}</button>`).join("");
    seg.querySelectorAll("[data-ap]").forEach(b=>b.onclick=()=>{F.point=b.dataset.ap;$("fPoint").value=F.point;jDay="";stF.from="";stF.to="";renderAll()});
  }
  function renderAnalytics(){
    renderAnPointSeg();
    if(tab!=="analytics")return;
    C.fitW=Math.max(0,($("anWidgets").clientWidth||0)-44);
    renderPicker();
    const sel=selSet(), on=id=>sel.has(id);
    const list=filtered(), a=agg(list), pv=prevList(), pa=pv?agg(pv.list):null, r=rangeOf(list), ex=expFiltered();
    $("anPeriod").textContent=list.length?`Период ${dLong(r.from)} — ${dLong(r.to)} · ${r.days} ${pl(r.days,"день","дня","дней")}`+(pv?` · сравнение с ${dLong(pv.from)} — ${dLong(pv.to)}`:" · сравнение появится, когда выбраны даты"):"";
    const empty=!list.length;$("anEmpty").hidden=!empty;$("anCards").hidden=empty;$("anWidgets").hidden=empty;
    if(!empty&&!sel.size){$("anCards").innerHTML="";$("anWidgets").innerHTML=`<div class="empty w-wide">Все показатели выключены. Включите нужные в списке выше.</div>`;return}
    if(empty)return;
    const days=dayList(r), byDay={};list.forEach(s=>byDay[s.date]=(byDay[s.date]||0)+(+s.sum||0));
    const dv=days.map(d=>byDay[d]||0);
    const prevByDay={};if(pv)pv.list.forEach(s=>prevByDay[s.date]=(prevByDay[s.date]||0)+(+s.sum||0));
    const pvv=pv?days.map((d,i)=>prevByDay[addD(pv.from,i)]||0):null;
    const grp=(key,l)=>{const m={};l.forEach(s=>{const k=(typeof key==="function"?key(s):s[key])||"—";const o=m[k]||(m[k]={k,r:0,n:0,u:0,ch:new Set(),days:new Set()});o.r+=+s.sum||0;o.n++;o.u+=+s.qty||0;o.ch.add(checkKey(s));o.days.add(s.date)});return m};
    const gp=grp("point",list), gpp=pa?grp("point",pv.list):{};
    const ptsAll=settings.points.filter(p=>F.point==="all"||p===F.point);
    const expSum=ex.reduce((x,e)=>x+(typeof e.fact==="number"?e.fact:+e.amount||0),0);
    const mg=marginOf(list);
    let cards="",w="";

    // ----- карточки -----
    if(on(1))cards+=CARD("Выручка",fmt(a.rev)+" сум",cmp(a.rev,pa&&pa.rev),C.spark(dv),"main");
    if(on(2))cards+=CARD("Рост к прошлому периоду",pa&&pa.rev?(Math.round((a.rev-pa.rev)/pa.rev*100)===0?"≈ 0%":`${a.rev>=pa.rev?"+":"−"}${Math.abs(Math.round((a.rev-pa.rev)/pa.rev*100))}%`):"—",pa?(pa.rev?`было ${fmt(pa.rev)} сум за ${dShort(pv.from)}–${dShort(pv.to)}`:`за ${dShort(pv.from)}–${dShort(pv.to)} продаж нет — сравнивать не с чем`):"выберите период с датами");
    if(on(3))cards+=CARD("Выручка в среднем за день",fmt(a.rev/r.days)+" сум",`по ${r.days} календарным дням`,C.spark(dv,"var(--p3)"));
    const t=iso(new Date()), mStart=t.slice(0,8)+"01", dim=new Date(+t.slice(0,4),+t.slice(5,7),0).getDate(), el=+t.slice(8,10);
    const monthRev=sales.filter(s=>s.date>=mStart&&s.date<=t&&(F.point==="all"||s.point===F.point)).reduce((x,s)=>x+(+s.sum||0),0);
    if(on(4)&&r.to&&r.to<mStart){const tm=r.to.slice(0,7),mt=sales.filter(s=>(s.date||"").startsWith(tm)&&(F.point==="all"||s.point===F.point)).reduce((x,s)=>x+(+s.sum||0),0);cards+=CARD("Итог месяца",fmt(mt)+" сум",`${MONTHS[+tm.slice(5,7)-1]} ${tm.slice(0,4)} завершён — прогноз не нужен`)}
    else if(on(4))cards+=CARD("Прогноз на конец месяца",fmt(monthRev/el*dim)+" сум",`за ${MONTHS[+t.slice(5,7)-1]}: продано ${fmtM(monthRev)} за ${el} из ${dim} дн.`);
    if(on(5)){let pp=0,d=r.from;const shc={};
      while(d<=r.to){const m=d.slice(0,7),c=plConf(m);if(c.total&&!plOff(d)){if(!shc[m])shc[m]={w:plDays(m).filter(x=>!plOff(x)).length,sh:Object.assign(plPrevShares(m),c.shares)};const k=shc[m];pp+=c.total/(k.w||1)*(F.point==="all"?1:(k.sh[F.point]||0)/100)}d=addD(d,1)}
      const pmOk=m=>plConf(m).total>0,pf=sales.filter(s=>s.date>=r.from&&s.date<=r.to&&pmOk((s.date||"").slice(0,7))&&(F.point==="all"||s.point===F.point)).reduce((x,s)=>x+(+s.sum||0),0),noPlanM=[...new Set(dayList(r).map(x=>x.slice(0,7)))].some(m=>!pmOk(m));
      cards+=pp?CARD("План за период",fmt(pf)+" сум",`из ${fmt(pp)} по плану за ${r.from===r.to?dLong(r.from):dShort(r.from)+"–"+dShort(r.to)} · ${pctF(pf/pp)}`+(F.point!=="all"?` · ${esc(F.point)}`:"")+(noPlanM?" · месяцы без плана не учтены":""),C.ring(Math.min(1,pf/pp),pf>=pp?"var(--plus)":pf>=pp*0.85?"var(--warn)":"var(--minus)")):CARD("План за период","не задан","задайте план на вкладке «План»")}
    if(on(7))cards+=CARD("Продаж (позиций)",fmt(a.n),cmp(a.n,pa&&pa.n));
    if(on(8))cards+=CARD("Проданных единиц",fmt(a.units),cmp(a.units,pa&&pa.units));
    if(on(9))cards+=CARD("Средний чек",fmt(a.avg)+" сум",`${fmt(a.checks)} ${pl(a.checks,"чек","чека","чеков")} · `+(cmp(a.avg,pa&&pa.avg)||""));
    if(on(10))cards+=CARD("Средняя цена единицы",fmt(a.unitPrice)+" сум",cmp(a.unitPrice,pa&&pa.unitPrice));
    if(on(11))cards+=CARD("Единиц в одном чеке",a.upc.toFixed(2).replace(".",","),pa?`было ${pa.upc.toFixed(2).replace(".",",")}`:"");
    if(on(12)){const ds=Object.entries(byDay).sort((x,y)=>y[1]-x[1]);const b=ds[0],wst=ds[ds.length-1];cards+=CARD("Лучший день",b?fmt(b[1])+" сум":"—",b?`${dLong(b[0])}, ${WD[wdIdx(b[0])]} · худший: ${dShort(wst[0])} — ${fmt(wst[1])}`:"")}
    if(on(13)){const z=days.filter(d=>!byDay[d]);cards+=CARD("Дней без продаж",String(z.length),z.length?z.slice(0,6).map(dShort).join(", ")+(z.length>6?"…":""):"продажи были каждый день")}
    if(on(21)){const sh=a.rev?a.cash/a.rev:0;cards+=CARD("Доля наличных",pctF(sh),`безнал ${pctF(1-sh)}`+(pa&&pa.rev?` · было ${pctF(pa.cash/pa.rev)}`:""),C.ring(sh,"var(--p1)"))}
    if(on(24))cards+=CARD("Расходы дня от выручки",a.rev?(expSum/a.rev*100).toFixed(1).replace(".",",")+"%":"—",`расходы ${fmt(expSum)} сум`);
    if(on(26)&&window.__kassa&&window.__kassaFor&&(r.to||"").slice(0,7)<window.__kassa.month){const pm=r.to.slice(0,7),x=window.__kassaFor(pm);cards+=CARD("Касса за "+["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"][+pm.slice(5,7)-1],"сдана ✓",`Б/Ч ${fmt(x.bcT)} − расходы ${fmt(x.sOp+x.sOth)} = ${fmt(x.expected)} сум`,"","")}
    else if(on(26)){const k=window.__kassa;const km=k&&k.month?MONTHS[+k.month.slice(5,7)-1]:"";cards+=k&&k.actual!=null?CARD(k.diff>=0?"Излишек в кассе":"Недостача в кассе",fmt(Math.abs(k.diff))+" сум",`за ${km}, на сегодня · должно ${fmt(k.expected)} · факт ${fmt(k.actual)}`,"",k.diff>=0?"":"warnc"):CARD("Должно быть на руках",k?fmt(k.expected)+" сум":"—",`касса за ${km}, на сегодня · пересчитайте кассу на вкладке «Касса»`)}
    if(on(35)){const chk={};list.forEach(s=>{const o=chk[checkKey(s)]||(chk[checkKey(s)]={f:0,l:0});if(isFrame(s))o.f=1;if(isLens(s))o.l=1});const fr=Object.values(chk).filter(o=>o.f),both=fr.filter(o=>o.l).length;cards+=CARD("Оправа + линзы в одном чеке",fr.length?pctF(both/fr.length):"—",`${both} из ${fr.length} ${pl(fr.length,"чека","чеков","чеков")} с оправой`,fr.length?C.ring(both/fr.length,"var(--p3)"):"")}
    if(on(36))cards+=CARD("Валовая прибыль",mg.rev?fmt(mg.gross)+" сум":"—",mg.rev?`посчитано по ${pctF(mg.cover)} выручки, где известна цена покупки`:"нет цен покупки: пришлите список «Все товары»");
    if(on(37))cards+=CARD("Маржа",mg.m!=null?pctF(mg.m):"—",mg.rev?`выручка ${fmtM(mg.rev)} · себестоимость ${fmtM(mg.cogs)}`:"нет цен покупки",mg.m!=null?C.ring(mg.m,"var(--plus)"):"");
    if(on(40))cards+=CARD("Скидки",fmt(a.disc)+" сум",cmp(a.disc,pa&&pa.disc));
    if(on(41))cards+=CARD("Скидка от выручки",a.rev?((a.disc/(a.rev+a.disc))*100).toFixed(1).replace(".",",")+"%":"—","от суммы без скидок");
    if(on(42))cards+=CARD("Продаж со скидкой",pctF(a.n?a.discN/a.n:0),`${a.discN} из ${a.n} позиций`);
    $("anCards").innerHTML=cards;

    // ----- графики -----
    const lbl=days.map(dShort);
    if(on(1))w+=W_("Выручка по дням",pv?"Сплошная линия — текущий период, пунктир — прошлый такой же длины":"Выручка за каждый день периода",C.line(lbl,[{name:"Текущий период",color:"var(--accent)",vals:dv,area:true}].concat(pvv?[{name:"Прошлый период",color:"var(--muted)",vals:pvv,dash:true}]:[])),true);
    if(on(6)){let c1=0,c0=0;const cv=dv.map(v=>c1+=v),pc=pvv?pvv.map(v=>c0+=v):null;w+=W_("Выручка нарастающим итогом","Как набирается выручка за период",C.line(lbl,[{name:"Текущий",color:"var(--accent)",vals:cv,area:true}].concat(pc?[{name:"Прошлый",color:"var(--muted)",vals:pc,dash:true}]:[])),true)}
    if(on(14)){const ser=ptsAll.filter(p=>gp[p]).map(p=>({name:p,color:pointColor(p),vals:days.map(d=>list.filter(s=>s.point===p&&s.date===d).reduce((x,s)=>x+(+s.sum||0),0))}));w+=W_("Выручка точек по дням","Каждая линия — своя точка",C.line(lbl,ser),true)}
    const ptItems=Object.values(gp).sort((x,y)=>y.r-x.r);
    if(on(15))w+=W_("Доля точек в выручке","",C.donut(ptItems.map(o=>({label:o.k,value:o.r,color:pointColor(o.k)})),fmtM(a.rev),"выручка"));
    if(on(16))w+=W_("Точки: сейчас и раньше",pa?"Яркие столбцы — текущий период, бледные — прошлый":"Сравнение появится, когда выбран период с датами",C.groupBars(ptItems.map(o=>o.k),[{name:"Текущий",color:"var(--accent)",vals:ptItems.map(o=>o.r)}].concat(pa?[{name:"Прошлый",color:"var(--accent)",dash:true,vals:ptItems.map(o=>gpp[o.k]?gpp[o.k].r:0)}]:[])));
    if(on(17))w+=W_("Средний чек по точкам","",C.hbars(ptItems.map(o=>({label:o.k,value:o.r/o.ch.size,color:pointColor(o.k),sub:`${o.ch.size} чеков`}))));
    if(on(18))w+=W_("Рейтинг точек","По выручке, в скобках — изменение к прошлому периоду",C.hbars(ptItems.map(o=>({label:o.k,value:o.r,color:pointColor(o.k),sub:gpp[o.k]?pctTxt(o.r,gpp[o.k].r):""})),{rank:true}));
    if(on(19))w+=W_("Выручка на рабочий день","Выручка точки, делённая на дни, когда у неё были продажи",C.hbars(ptItems.map(o=>({label:o.k,value:o.r/o.days.size,color:pointColor(o.k),sub:`${o.days.size} дн.`})).sort((x,y)=>y.value-x.value)));
    const cashBy={};list.forEach(s=>cashBy[s.point]=(cashBy[s.point]||0)+(+(payOf(s)["Наличные"]||0)));
    if(on(20))w+=W_("Б/Ч по точкам","Наличные: Премиум и Яшнабад идут в кассу, Сергели и C1 остаются на точке",C.hbars(Object.entries(cashBy).sort((x,y)=>y[1]-x[1]).map(([k,v])=>({label:k,value:v,color:pointColor(k),sub:KASSA_POINTS.includes(k)?"· в кассу":"· на точке"}))));
    if(on(22)){const py={};list.forEach(s=>Object.entries(payOf(s)).forEach(([k,v])=>py[k]=(py[k]||0)+v));w+=W_("Способы оплаты","",C.donut(PAYS.filter(p=>py[p]).map(p=>({label:p,value:py[p],color:PAYCOL[p]})),fmtM(a.rev),"всего"))}
    if(on(23)){const eb={},ea={};ex.forEach(e=>{const v=typeof e.fact==="number"?e.fact:+e.amount||0;eb[e.branch]=(eb[e.branch]||0)+v;const k=String(e.name).replace(/^\S+\s+(за|на)\s+/i,"");const kk=k.charAt(0).toUpperCase()+k.slice(1);ea[kk]=(ea[kk]||0)+v});
      w+=W_("Расходы дня",`Всего ${fmt(expSum)} сум`,`<h3 class="wsub">По точкам</h3>`+C.hbars(Object.entries(eb).sort((x,y)=>y[1]-x[1]).map(([k,v])=>({label:k,value:v,color:pointColor(k)})))+`<h3 class="wsub">По статьям</h3>`+C.hbars(Object.entries(ea).sort((x,y)=>y[1]-x[1]).slice(0,7).map(([k,v])=>({label:k,value:v,color:"var(--op)"}))))}
    if(on(25)){const kc=KASSA_POINTS.filter(p=>F.point==="all"||p===F.point);const bc=kc.reduce((x,p)=>x+(cashBy[p]||0),0);const ke=ex.filter(e=>kc.includes(e.branch)).reduce((x,e)=>x+(typeof e.fact==="number"?e.fact:+e.amount||0),0);
      w+=W_("Б/Ч в кассу после расходов","Премиум и Яшнабад: наличные минус расходы дня",kc.length?C.waterfall([{label:"Б/Ч",value:bc,type:"start"},{label:"Расходы дня",value:-ke,type:"minus"},{label:"Остаётся",value:bc-ke,type:"total"}]):C.none())}
    if(on(27)){const cl=[...cashlog].filter(c=>{const d=iso(new Date(c.at||0));return d>=r.from&&d<=r.to}).sort((x,y)=>(x.at||0)-(y.at||0)).slice(-30);w+=W_("Излишек / недостача по пересчётам",`Пересчёты кассы за ${r.from===r.to?dLong(r.from):dShort(r.from)+"–"+dShort(r.to)}: зелёный — излишек, красный — недостача`,cl.length?C.bars(cl.map(c=>{const d=new Date(c.at);return pad(d.getDate())+"."+pad(d.getMonth()+1)}),cl.map(c=>(+c.amount||0)-(+c.expected||0)),{colors:cl.map(c=>(+c.amount||0)>=(+c.expected||0)?"var(--plus)":"var(--minus)"),lf:v=>(v<0?"−":"+")+fmtM(Math.abs(v)),vf:v=>(v<0?"недостача ":"излишек ")+fmt(Math.abs(v))}):(cashlog.length?`<p class="note">За выбранный период пересчётов не было. Всего пересчётов: ${cashlog.length}, последний — ${dLong(iso(new Date(Math.max(...cashlog.map(c=>c.at||0)))))}.</p>`:`<p class="note">Пересчётов пока нет. История начнётся со следующего нажатия «Пересчитал» на вкладке «Касса».</p>`))}
    const gc=Object.values(grp("cat",list)).sort((x,y)=>y.r-x.r);
    if(on(28))w+=W_("Выручка по категориям","",C.donut(gc.map((o,i)=>({label:o.k,value:o.r,color:CATCOL[i%CATCOL.length]})),fmtM(a.rev),"выручка"));
    if(on(29))w+=W_("Доля категорий","Сколько процентов выручки даёт каждая категория",C.hbars(gc.map((o,i)=>({label:o.k,value:o.r,color:CATCOL[i%CATCOL.length],valTxt:pctF(o.r/a.rev),sub:fmtM(o.r)}))));
    if(on(30)){const rows=gc.filter(o=>o.u>0&&!/без детализации|погашени/i.test(o.k)).map(o=>{const ps=list.filter(s=>(s.cat||"—")===o.k&&+s.qty>0).map(s=>(+s.sum||0)/(+s.qty||1));return {k:o.k,avg:o.r/o.u,min:Math.min(...ps),max:Math.max(...ps),u:o.u,r:o.r}}).sort((x,y)=>y.avg-x.avg);const mx=Math.max(1,...rows.map(o=>o.avg));
      w+=W_("Средняя цена по категориям","Сколько в среднем платят за одну единицу. Полоса — средняя цена, серая зона — от самой дешёвой до самой дорогой продажи.",rows.length?`<div class="rl">${rows.map((o,i)=>`<div class="rlr"><div class="rlh"><span class="rlname"><span class="sw" style="background:${CATCOL[gc.findIndex(g=>g.k===o.k)%CATCOL.length]}"></span>${esc(o.k)}</span><b class="num rlv">${fmt(o.avg)}</b></div><div class="rlbar"><span class="rng" style="left:${o.min/mx*100}%;width:${Math.max(.5,(Math.min(o.max,mx)-o.min)/mx*100)}%"></span><span class="avg" style="left:${o.avg/mx*100}%"></span></div><div class="rlsub">${fmt(o.u)} ед. · от ${fmt(o.min)} до ${fmt(o.max)} · выручка ${fmtM(o.r)}</div></div>`).join("")}</div>`:C.none())}
    const gt=Object.values(grp("product",list));
    const catOf={};list.forEach(s=>{if(!catOf[s.product])catOf[s.product]=s.cat||""});
    const topList=(arr,by)=>{const tot=by==="r"?a.rev:a.units;const mx=Math.max(1,...arr.map(o=>o[by]));return `<div class="rl">${arr.map((o,i)=>`<div class="rlr"><div class="rlh"><span class="rlname"><span class="rk${i<3?" top":""}">${i+1}</span>${esc(o.k)}${catOf[o.k]?` <span class="chipc">${esc(catOf[o.k])}</span>`:""}</span><b class="num rlv">${by==="r"?fmt(o.r):fmt(o.u)+" шт"}</b></div><div class="rlbar"><span class="fill" style="width:${o[by]/mx*100}%;background:${by==="r"?"var(--accent)":"var(--p3)"}"></span></div><div class="rlsub">${by==="r"?`${fmt(o.u)} шт · ср. цена ${fmt(o.u?o.r/o.u:0)}`:`выручка ${fmt(o.r)} · ср. цена ${fmt(o.u?o.r/o.u:0)}`} · ${pctF(tot?o[by]/tot:0)} ${by==="r"?"выручки":"всех единиц"}</div></div>`).join("")}</div>`};
    const gtN=gt.filter(o=>o.k!=="Продажи за день (без детализации)"&&!/без детализации|погашени/i.test(o.k));
    if(on(31))w+=W_("Топ-10 товаров по выручке","Какие товары принесли больше всего денег",gtN.length?topList([...gtN].sort((x,y)=>y.r-x.r).slice(0,10),"r"):C.none());
    if(on(32))w+=W_("Топ-10 товаров по количеству","Какие товары покупают чаще всего",gtN.length?topList([...gtN].sort((x,y)=>y.u-x.u||y.r-x.r).slice(0,10),"u"):C.none());
    if(on(58)){
      const BANDS=[[0,100000,"до 100 тыс"],[100000,200000,"100–200 тыс"],[200000,300000,"200–300 тыс"],[300000,500000,"300–500 тыс"],[500000,1000000,"500 тыс – 1 млн"],[1000000,2000000,"1–2 млн"],[2000000,1e15,"от 2 млн"]];
      const cats=gc.map(o=>o.k).filter(k=>!/без детализации|погашени/i.test(k));
      if(anPgCat!=="all"&&!cats.includes(anPgCat))anPgCat=cats.includes("Оправы")?"Оправы":"all";
      const pl2=list.filter(s=>+s.qty>0&&!/без детализации|погашени/i.test(s.cat||"")&&(anPgCat==="all"||s.cat===anPgCat));
      const bd=BANDS.map(b=>({lbl:b[2],u:0,r:0,pr:{}}));
      pl2.forEach(s=>{const up=(+s.sum||0)/(+s.qty||1);const i=BANDS.findIndex(b=>up>=b[0]&&up<b[1]);if(i<0)return;const o=bd[i];o.u+=+s.qty||0;o.r+=+s.sum||0;o.pr[s.product]=(o.pr[s.product]||0)+(+s.qty||0)});
      const U=bd.reduce((x,o)=>x+o.u,0),mxu=Math.max(1,...bd.map(o=>o.u)),best=bd.reduce((m,o)=>o.u>m.u?o:m,bd[0]);
      const chips=`<div class="seg pgseg" role="group" aria-label="Категория">${[["all","Все"]].concat(cats.map(c=>[c,c])).map(([v,l])=>`<button type="button" data-pg="${esc(v)}" aria-pressed="${anPgCat===v}">${esc(l)}</button>`).join("")}</div>`;
      const body=U?`<p class="note" style="margin:8px 0 10px">Больше всего покупают в группе <b>${best.lbl}</b>: ${fmt(best.u)} шт (${pctF(best.u/U)}) на ${fmt(best.r)} сум. Цена — за одну единицу после скидки.</p><div class="tbl"><table class="pgt"><thead><tr><th>Ценовая группа</th><th class="r">Шт</th><th style="min-width:120px">Доля в штуках</th><th class="r">Выручка</th><th>Чаще всего покупают</th></tr></thead><tbody>${bd.map(o=>{const top=Object.entries(o.pr).sort((x,y)=>y[1]-x[1]).slice(0,3);return `<tr${o===best?' class="pgbest"':""}><td><b>${o.lbl}</b></td><td class="r num">${o.u?fmt(o.u):'<span class="srcs">—</span>'}</td><td><div style="display:flex;gap:8px;align-items:center"><div class="mbar" style="flex:1"><span style="width:${o.u/mxu*100}%"></span></div><span class="num srcs">${o.u?pctF(o.u/U):""}</span></div></td><td class="r num">${o.r?fmt(o.r):'<span class="srcs">—</span>'}</td><td class="srcs">${top.map(([k,v])=>`${esc(k)} <b>×${v}</b>`).join(", ")||"—"}</td></tr>`}).join("")}</tbody></table></div>`:C.none();
      w+=W_("Самые продаваемые по ценовым группам","В каком ценовом диапазоне покупают чаще всего и какие товары лидируют в каждой группе",chips+body,true)}
    if(on(33)){let cum=0;const pr=[...gt].sort((x,y)=>y.r-x.r).map(o=>{cum+=o.r;const cs=cum/a.rev;return Object.assign({},o,{cs,abc:cs<=0.8001?"A":cs<=0.95?"B":"C"})});const nA=pr.filter(x=>x.abc==="A").length;
      w+=W_("ABC-анализ товаров",`${nA} ${pl(nA,"товар даёт","товара дают","товаров дают")} 80% выручки из ${pr.length}`,C.pareto(pr),true)}
    if(on(34)){const from30=addD(r.from,-30),cur=new Set(list.map(s=>normS(s.product)));const before={};sales.filter(s=>s.date>=from30&&s.date<r.from&&match(s)).forEach(s=>{const k=normS(s.product);if(cur.has(k))return;const o=before[k]||(before[k]={k:s.product,u:0,r:0,last:""});o.u+=+s.qty||0;o.r+=+s.sum||0;if(s.date>o.last)o.last=s.date});
      const st=Object.values(before).sort((x,y)=>y.r-x.r).slice(0,12);
      w+=W_("Перестали продаваться","Продавались за 30 дней до периода, а в периоде — ни разу",st.length?`<div class="tbl"><table><thead><tr><th>Товар</th><th class="r">Было ед.</th><th class="r">Было выручки</th><th class="r">Последняя продажа</th></tr></thead><tbody>${st.map(o=>`<tr><td>${esc(o.k)}</td><td class="r num">${o.u}</td><td class="r num">${fmt(o.r)}</td><td class="r num">${dShort(o.last)}</td></tr>`).join("")}</tbody></table></div>`:`<p class="note">Таких товаров нет${sales.some(s=>s.date<r.from)?"":": нужна история продаж до периода"}.</p>`)}
    if(on(38)){const mc=gc.map((o,i)=>{const m=marginOf(list.filter(s=>(s.cat||"—")===o.k));return {label:o.k,value:m.m!=null?m.m*100:0,valTxt:m.m!=null?pctF(m.m):"—",color:CATCOL[i%CATCOL.length],sub:m.rev?`прибыль ${fmtM(m.gross)}`:"нет цен покупки"}});w+=W_("Маржа по категориям","Там, где известна цена покупки",mg.rev?C.hbars(mc):`<p class="note">Нет цен покупки. Пришлите список «Все товары» с ценами покупки.</p>`)}
    if(on(39)){
      const rows=ptItems.map(o=>{const pl3=list.filter(s=>s.point===o.k);const m=marginOf(pl3);const bc={};pl3.forEach(s=>{const c=costOf(s);if(!c)return;const k=s.cat||"—";const x=bc[k]||(bc[k]={k,gp:0,r:0});x.gp+=(+s.sum||0)-c*(+s.qty||0);x.r+=+s.sum||0});const tc=Object.values(bc).sort((x,y)=>y.gp-x.gp)[0];return {k:o.k,all:o.r,rev:m.rev,cogs:m.cogs,gp:m.gross,m:m.m,cov:m.cover,tc}});
      const T={all:rows.reduce((x,o)=>x+o.all,0),rev:rows.reduce((x,o)=>x+o.rev,0),cogs:rows.reduce((x,o)=>x+o.cogs,0)};T.gp=T.rev-T.cogs;
      const cell=v=>v==null?'<span class="srcs">—</span>':`<div style="display:flex;gap:8px;align-items:center;justify-content:flex-end"><div class="mbar" style="width:70px"><span style="width:${Math.max(0,Math.min(100,v*100))}%;background:var(--plus)"></span></div><b class="num">${pctF(v)}</b></div>`;
      w+=W_("Маржа по точкам","Прибыль = выручка − цена покупки × количество. Считаются продажи с известной ценой покупки; «покрытие» — какая доля выручки точки посчитана.",mg.rev?`<div class="tbl"><table><thead><tr><th>Точка</th><th class="r">Выручка</th><th class="r">Посчитано</th><th class="r">Себестоимость</th><th class="r">Прибыль</th><th class="r" style="min-width:130px">Маржа</th><th class="r">Покрытие</th><th>Самая прибыльная категория</th></tr></thead><tbody>${rows.map(o=>`<tr><td><span class="sw" style="background:${pointColor(o.k)}"></span><b>${esc(o.k)}</b></td><td class="r num">${fmt(o.all)}</td><td class="r num">${fmt(o.rev)}</td><td class="r num">${fmt(o.cogs)}</td><td class="r num"><b>${fmt(o.gp)}</b></td><td class="r">${cell(o.m)}</td><td class="r num srcs">${pctF(o.cov)}</td><td>${o.tc?`${esc(o.tc.k)} <span class="srcs">· ${fmtM(o.tc.gp)} прибыли</span>`:'<span class="srcs">нет цен покупки</span>'}</td></tr>`).join("")}</tbody><tfoot><tr><td><b>Итого</b></td><td class="r num"><b>${fmt(T.all)}</b></td><td class="r num"><b>${fmt(T.rev)}</b></td><td class="r num"><b>${fmt(T.cogs)}</b></td><td class="r num"><b>${fmt(T.gp)}</b></td><td class="r num"><b>${pctF(T.rev?T.gp/T.rev:null)}</b></td><td class="r num"><b>${pctF(T.all?T.rev/T.all:0)}</b></td><td></td></tr></tfoot></table></div>`+C.hbars(rows.filter(o=>o.rev).map(o=>({label:o.k,value:o.gp,valTxt:fmt(o.gp)+" · "+pctF(o.m),color:pointColor(o.k),sub:`прибыль`})),{dot:true}):`<p class="note">Нет цен покупки.</p>`,true)}
    const wdCount=[0,0,0,0,0,0,0];days.forEach(d=>wdCount[wdIdx(d)]++);
    const wdSum=[0,0,0,0,0,0,0];list.forEach(s=>wdSum[wdIdx(s.date)]+=+s.sum||0);
    let trio="";
    if(on(43)){const av=wdSum.map((v,i)=>wdCount[i]?v/wdCount[i]:0),bi=av.indexOf(Math.max(...av));trio+=W_("По дням недели",`<span class="tsum">Сильнее всего — <b>${WD[bi]}</b>: ${fmtM(av[bi])} в среднем</span>`,C.bars(WD,av,{hl:true,w:380,h:190}))}
    if(on(44)){const ks=periodsIn(r.from,r.to,"week");const m={};list.forEach(s=>{const k=periodKey(s.date,"week");m[k]=(m[k]||0)+(+s.sum||0)});const vv=ks.map(k=>m[k]||0),bi=vv.indexOf(Math.max(...vv));trio+=W_("По неделям",ks.length?`<span class="tsum">Лучшая неделя — <b>с ${dShort(ks[bi])}</b>: ${fmtM(vv[bi])}</span>`:"",C.bars(ks.map(k=>dShort(k)),vv,{hl:true,w:Math.max(380,ks.length*34),h:190}))}
    if(on(45)){const ks=periodsIn(r.from,r.to,"month");const m={};list.forEach(s=>{const k=periodKey(s.date,"month");m[k]=(m[k]||0)+(+s.sum||0)});const vv=ks.map(k=>m[k]||0),bi=vv.indexOf(Math.max(...vv));trio+=W_("По месяцам",ks.length?`<span class="tsum">Лучший месяц — <b>${periodLabel(ks[bi],"month")}</b>: ${fmtM(vv[bi])}</span>`:"",C.bars(ks.map(k=>periodLabel(k,"month")),vv,{hl:true,w:Math.max(380,ks.length*60),h:190}))}
    if(trio)w+=`<div class="trio w-wide">${trio}</div>`;
    if(on(46)||on(47)){
      const pts=ptItems.map(o=>o.k);const hm={};let hmax=1;list.forEach(s=>{const k=s.point+"|"+wdIdx(s.date);hm[k]=(hm[k]||0)+(+s.sum||0)});
      const avg=(p,i)=>wdCount[i]?(hm[p+"|"+i]||0)/wdCount[i]:0;pts.forEach(p=>WD.forEach((x,i)=>hmax=Math.max(hmax,avg(p,i))));
      const best={};pts.forEach(p=>{let bi=0;WD.forEach((x,i)=>{if(avg(p,i)>avg(p,bi))bi=i});best[p]=bi});
      const heat=`<div class="tbl"><table class="heat"><thead><tr><th>Точка</th>${WD.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>`+pts.map(p=>`<tr><td>${esc(p)}</td>${WD.map((x,i)=>{const v=avg(p,i);const o=v?0.12+0.78*(v/hmax):0;const b=on(47)&&best[p]===i&&v;return `<td style="background:color-mix(in srgb, var(--accent) ${Math.round(o*100)}%, var(--bg));color:${o>0.55?"var(--surface)":"var(--ink)"};${b?"outline:2px solid var(--warn);outline-offset:-2px;":""}" title="${esc(p)}, ${x}: в среднем ${fmt(v)} сум">${v?fmtM(v):"—"}</td>`}).join("")}</tr>`).join("")+`</tbody></table></div>`;
      const bestTxt=on(47)?`<div class="bestwd">${pts.map(p=>`<span><span class="sw" style="background:${pointColor(p)}"></span>${esc(p)}: <b>${WD[best[p]]}</b> · ${fmtM(avg(p,best[p]))} в среднем</span>`).join("")}</div>`:"";
      w+=W_(on(46)?"Точки × дни недели":"Лучший день недели каждой точки","Средняя выручка за один такой день. Чем темнее, тем больше"+(on(47)?"; лучший день точки обведён":""),heat+bestTxt,true);
    }
    // ----- новая партия -----
    const bb=curBatch();
    if(bb&&(bb.items||[]).length&&[48,49,50,51,52,53,54,55,56,57].some(on)){
      const {items}=batchStats(bb,F.point,r.from,r.to);
      const Q=items.reduce((x,i)=>x+i.q,0),S=items.reduce((x,i)=>x+i.sold,0),L=items.reduce((x,i)=>x+i.left,0);
      const PS=items.reduce((x,i)=>x+i.pSold,0),PR=items.reduce((x,i)=>x+i.pRev,0),pFrom=bb.date&&r.from<bb.date?bb.date:r.from,perTxt=pFrom===r.to?dLong(r.to):`${dShort(pFrom)}–${dShort(r.to)}`;
      const start=bb.date||t,bd=Math.max(1,daysBetween(start,t)),rate=S/bd,fc=rate>0&&L>0?Math.ceil(L/rate):null;
      const vl=items.reduce((x,i)=>x+i.left*(+i.p||0),0);
      const wc=items.filter(i=>+i.cp>0&&i.pSold),cg=wc.reduce((x,i)=>x+i.pSold*i.cp,0),rc=wc.reduce((x,i)=>x+i.pRev,0);
      const totPer=sales.filter(x=>x.date>=pFrom&&x.date<=r.to&&(F.point==="all"||x.point===F.point)).reduce((q,x)=>q+(+x.sum||0),0);
      const ro=reorderList(items),uns=items.filter(i=>!i.sold).length;
      const nm=`«${bb.name||"Партия"}»`;
      let bc="";
      if(on(48))bc+=CARD("Продано из партии",fmt(PS)+" шт",`за ${perTxt} · ${nm}: из ${fmt(Q)} шт`,C.ring(Q?PS/Q:0));
      if(on(49))bc+=CARD("Осталось из партии",fmt(L)+" шт",`на сегодня`+(vl?` · на ${fmt(vl)} сум по цене продажи`:""));
      if(on(52))bc+=CARD("Темп продаж партии",(rate>=10?fmt(rate):rate.toFixed(1).replace(".",","))+" шт/день",`на сегодня: в среднем за ${bd} дн. с ${dShort(start)}`);
      if(on(53))bc+=CARD("Прогноз распродажи",L===0?"распродано":fc!=null?`~${fmt(fc)} дн.`:"—",fc!=null?`примерно к ${dLong(addD(t,fc))}`:"");
      if(on(54))bc+=CARD("Модели без продаж",fmt(uns),`на сегодня · из ${items.length} моделей партии`);
      if(on(56))bc+=CARD("Выручка с партии",fmt(PR)+" сум",`за ${perTxt}`+(rc?` · маржа ${pctF((rc-cg)/rc)} · прибыль ${fmt(rc-cg)}`:""));
      if(on(57))bc+=CARD("Доля партии в продажах",pctF(totPer?PR/totPer:0),`от всей выручки за ${perTxt}`);
      $("anCards").innerHTML+=bc;
      let bw="";
      if(on(50)){const bp={};items.forEach(i=>Object.entries(i.pByPt).forEach(([k,v])=>bp[k]=(bp[k]||0)+v));bw+=W_("Партия: продажи по точкам",`${nm} · за ${perTxt}`,!Object.keys(bp).length?`<div class="empty">За этот период продаж из партии нет</div>`:C.hbars(Object.entries(bp).sort((x,y)=>y[1]-x[1]).map(([k,v])=>({label:k,value:v,valTxt:v+" шт",color:pointColor(k)}))))}
      if(on(51)){const gm={};items.forEach(i=>{const k=i.g||i.c||"Без группы";const o=gm[k]||(gm[k]={k,q:0,s:0});o.q+=i.q;o.s+=Math.min(i.pSold,i.q)});bw+=W_("Партия: продажи по группам",`Процент от пришедшего, проданный за ${perTxt}`,C.hbars(Object.values(gm).sort((x,y)=>(y.s/(y.q||1))-(x.s/(x.q||1))).slice(0,12).map(o=>({label:o.k,value:o.q?o.s/o.q*100:0,valTxt:pctF(o.q?o.s/o.q:0),color:"var(--p3)",sub:`${o.s} из ${o.q} шт`}))))}
      if(on(55))bw+=W_("Партия: на дозаказ","Закончились или осталось 20% и меньше",ro.length?`<div class="tbl"><table><thead><tr><th>Модель</th><th class="r">Пришло</th><th class="r">Продано</th><th class="r">Осталось</th></tr></thead><tbody>${ro.slice(0,15).map(i=>`<tr><td>${esc(itemLabel(i))}</td><td class="r num">${i.q}</td><td class="r num"><b>${i.sold}</b></td><td class="r num">${i.left===0?'<span class="down">0</span>':i.left}</td></tr>`).join("")}</tbody></table></div>`:`<p class="note">Пока ничего не заканчивается.</p>`);
      w+=bw;
    }else if([48,49,50,51,52,53,54,55,56,57].some(on)){
      w+=W_("Новая партия","",`<p class="note">Список партии ещё не загружен. Загрузите его на вкладке «Склад» → «Проданные из новой партии», и здесь появятся показатели 48–57.</p>`);
    }
    $("anWidgets").innerHTML=w;
    $("anWidgets").querySelectorAll("[data-pg]").forEach(b=>b.onclick=()=>{anPgCat=b.dataset.pg;renderAnalytics()});
  }

  // ===================== вкладка «Линзы» =====================
  function lensData(){
    const all=sales.filter(s=>inRange(s,F.from,F.to)&&(F.point==="all"||s.point===F.point)), list=all.filter(s=>isLens(s)&&(F.lk==="all"||lensKind(s)===F.lk)), a=agg(all);
    const rows=list.map(s=>Object.assign({s,kind:lensKind(s)},lensInfo(s)));
    return {all,list,rows,a};
  }
  function renderLens(){
    C.fitW=Math.max(0,(($("lnWidgets")||{}).clientWidth||0)-44);
    if(tab!=="lens")return;
    const {all,list,rows,a}=lensData(), r=rangeOf(all);
    const empty=!list.length;$("lnEmpty").hidden=!empty;["lnCards","lnWidgets","lnTablePanel"].forEach(id=>$(id).hidden=empty);
    $("lnPeriod").textContent=all.length?`Период ${dLong(r.from)} — ${dLong(r.to)}`:"Виды, индексы, покрытия, бренды и точки";
    if(empty)return;
    const la=agg(list);
    const chk={};all.forEach(s=>{const o=chk[checkKey(s)]||(chk[checkKey(s)]={f:0,l:0});if(isFrame(s))o.f=1;if(isLens(s))o.l=1});
    const fr=Object.values(chk).filter(o=>o.f),both=fr.filter(o=>o.l).length;
    const g=(key)=>{const m={};rows.forEach(x=>{const k=x[key]||"—";const o=m[k]||(m[k]={k,u:0,r:0,n:0});o.u+=+x.s.qty||0;o.r+=+x.s.sum||0;o.n++});return Object.values(m).sort((p,q)=>q.u-p.u||q.r-p.r)};
    const byType=g("type"),byIdx=g("idx"),byCoat=g("coat"),byBrand=g("brand").filter(o=>o.k&&o.k!=="—"),byKind=g("kind");
    const prog=byType.find(o=>o.k==="Прогрессивные");
    const lnSp=(l,f,avg)=>{const rr=rangeOf(l),ds=dayList(rr);if(ds.length<2)return "";const m={},u={};l.forEach(s=>{m[s.date]=(m[s.date]||0)+(f?f(s):+s.sum||0);u[s.date]=(u[s.date]||0)+(+s.qty||0)});return C.spark(ds.map(d=>avg?(u[d]?m[d]/u[d]:0):(m[d]||0)),"var(--p3)")};
    $("lnCards").innerHTML=
      CARD("Очковых линз продано",fmt(la.units)+" шт",`${la.n} ${pl(la.n,"позиция","позиции","позиций")} в ${la.checks} ${pl(la.checks,"чеке","чеках","чеках")}`,lnSp(list,s=>+s.qty||0),"main")+
      CARD("Выручка с линз",fmt(la.rev)+" сум",`${pctF(a.rev?la.rev/a.rev:0)} всей выручки`,C.ring(a.rev?la.rev/a.rev:0))+
      CARD("Средняя цена линзы",fmt(la.unitPrice)+" сум","за 1 шт · линия — средняя цена по дням",lnSp(list,null,true))+
      CARD("Чеки с оправой и линзами",fr.length?pctF(both/fr.length):"—",`${both} из ${fr.length} чеков с оправой`,fr.length?C.ring(both/fr.length,"var(--p3)"):"")+
      CARD("Прогрессивные",prog?fmt(prog.u)+" шт":"0",prog?`${fmt(prog.r)} сум · ${pctF(prog.u/la.units)} линз`:"не продавались")+
      CARD("Скидки на линзы",fmt(la.disc)+" сум",`${la.discN} ${pl(la.discN,"позиция","позиции","позиций")} со скидкой`);
    const TC={"Однофокальные":"var(--p1)","Прогрессивные":"var(--p4)","Бифокальные":"var(--p3)","Офисные":"var(--p5)","Замена линз":"var(--op)"};
    let w="";
    w+=W_("Наши линзы по видам","ET, Блок, 4в1, Star, Essilor, Seiko и другие — по количеству",C.hbars(byKind.map(o=>({label:o.k,value:o.u,valTxt:o.u+" шт",color:o.k==="Тип не указан"?"var(--line)":"var(--accent)",sub:`${fmtM(o.r)} · ср. ${fmtM(o.u?o.r/o.u:0)}`}))),true);
    w+=W_("Виды линз","По количеству",C.donut(byType.map(o=>({label:o.k,value:o.u,valTxt:o.u+" шт",color:TC[o.k]||"var(--muted)"})),fmt(la.units),"шт"));
    w+=W_("Индекс (толщина)","1.50 — стандарт, 1.67 и 1.74 — тонкие для сильных диоптрий",C.hbars(byIdx.map(o=>({label:o.k,value:o.u,valTxt:o.u+" шт",color:o.k==="не указан"?"var(--line)":"var(--p3)",sub:fmtM(o.r)}))));
    w+=W_("Покрытия","",C.hbars(byCoat.map(o=>({label:o.k,value:o.u,valTxt:o.u+" шт",color:o.k==="не указано"?"var(--line)":"var(--p4)",sub:fmtM(o.r)}))));
    const pt={};rows.forEach(x=>{const o=pt[x.s.point]||(pt[x.s.point]={u:0,r:0});o.u+=+x.s.qty||0;o.r+=+x.s.sum||0});
    w+=W_("Линзы по точкам","",C.hbars(Object.entries(pt).sort((p,q)=>q[1].u-p[1].u).map(([k,o])=>({label:k,value:o.u,valTxt:o.u+" шт",color:pointColor(k),sub:fmtM(o.r)}))));
    w+=W_("Средняя цена по видам","",C.hbars(byType.map(o=>({label:o.k,value:o.u?o.r/o.u:0,color:TC[o.k]||"var(--muted)",sub:o.u+" шт"}))));
    if(byBrand.length)w+=W_("Бренды","",C.hbars(byBrand.map(o=>({label:o.k,value:o.u,valTxt:o.u+" шт",color:"var(--p5)",sub:fmtM(o.r)}))));
    const days=dayList(r),dm={};rows.forEach(x=>dm[x.s.date]=(dm[x.s.date]||0)+(+x.s.qty||0));
    w+=W_("Линзы по дням","Сколько штук продано каждый день",C.bars(days.map(dShort),days.map(d=>dm[d]||0),{color:"var(--p3)",lf:v=>String(v),vf:v=>v+" шт"}),true);
    $("lnWidgets").innerHTML=w;
    const m={};rows.forEach(x=>{const k=x.kind+"|"+x.idx+"|"+x.coat;const o=m[k]||(m[k]={t:x.kind,i:x.idx,c:x.coat,u:0,r:0,pts:{}});o.u+=+x.s.qty||0;o.r+=+x.s.sum||0;o.pts[x.s.point]=(o.pts[x.s.point]||0)+(+x.s.qty||0)});
    const tl=Object.values(m).sort((p,q)=>q.u-p.u||q.r-p.r);
    $("lnTable").innerHTML=`<thead><tr><th>Вид</th><th>Индекс</th><th>Покрытие</th>${settings.points.map(p=>`<th class="r">${esc(p)}</th>`).join("")}<th class="r">Всего, шт</th><th class="r">Выручка</th><th class="r">Ср. цена</th></tr></thead><tbody>`+
      tl.map(o=>`<tr><td>${esc(o.t)}</td><td class="num">${esc(o.i)}</td><td>${esc(o.c)}</td>${settings.points.map(p=>`<td class="r num">${o.pts[p]||'<span class="srcs">—</span>'}</td>`).join("")}<td class="r num"><b>${o.u}</b></td><td class="r num">${fmt(o.r)}</td><td class="r num">${fmt(o.u?o.r/o.u:0)}</td></tr>`).join("")+
      `</tbody><tfoot><tr><td colspan="3"><b>Итого</b></td>${settings.points.map(p=>`<td class="r num"><b>${rows.filter(x=>x.s.point===p).reduce((q,x)=>q+(+x.s.qty||0),0)||""}</b></td>`).join("")}<td class="r num"><b>${la.units}</b></td><td class="r num"><b>${fmt(la.rev)}</b></td><td class="r num"><b>${fmt(la.unitPrice)}</b></td></tr></tfoot>`;
  }

  // ===================== вкладка «Новая партия» =====================
  let bSelId=null, bView="all", bPt="all", bLimit=150, bPending=null;
  function bMsg(t,bad){const m=$("bMsg");m.textContent=t;m.style.color=bad?"var(--minus)":"var(--plus)"}
  const bxMsg=(t,b)=>flash("bxMsg",t,b);
  function curBatch(){const s=[...batches].sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.createdAt||0)-(a.createdAt||0));return s.find(b=>b.id===bSelId)||s[0]||null}
  const itemLabel=it=>[it.m||it.n||it.s,it.col].filter(Boolean).join(" · ");
  function batchStats(b,ptFilter,pf,pt){
    const items=(b.items||[]).map(it=>Object.assign({},it,{sold:0,rev:0,byPt:{},last:"",pSold:0,pRev:0,pByPt:{}}));
    const byKey={};items.forEach((it,i)=>byKey[it.k]=i);
    const res=[];items.forEach((it,i)=>{[it.m,it.s,it.n].forEach(v=>{const t=normS(v);if(t.length>=3)res.push({i,len:t.length,re:new RegExp("(^|[^a-zа-я0-9])"+reEsc(t)+"($|[^a-zа-я0-9])","i")})})});
    res.sort((x,y)=>y.len-x.len);
    const used=[],byDay={};
    sales.forEach(s=>{
      if(b.date&&s.date<b.date)return;
      if(ptFilter!=="all"&&s.point!==ptFilter)return;
      let idx=(s.batchKey&&s.batchId===b.id&&byKey[s.batchKey]!=null)?byKey[s.batchKey]:-1;
      if(idx<0){const p=normS(s.product);for(const r of res){if(r.re.test(p)){idx=r.i;break}}}
      if(idx<0)return;
      const it=items[idx],q=+s.qty||0;if((!pf||s.date>=pf)&&(!pt||s.date<=pt)){it.pSold+=q;it.pRev+=+s.sum||0;it.pByPt[s.point]=(it.pByPt[s.point]||0)+q}it.sold+=q;it.rev+=+s.sum||0;it.byPt[s.point]=(it.byPt[s.point]||0)+q;if(s.date>it.last)it.last=s.date;used.push(s);byDay[s.date]=(byDay[s.date]||0)+q;
    });
    items.forEach(it=>{it.q=+it.q||0;it.left=Math.max(0,it.q-it.sold);it.pct=it.q?Math.min(1,it.sold/it.q):0});
    return {items,used,byDay};
  }
  function fillBatchSelects(){
    const s=[...batches].sort((a,b)=>(b.date||"").localeCompare(a.date||""));const cb=curBatch();
    $("bSel").innerHTML=s.map(b=>`<option value="${esc(b.id)}"${cb&&b.id===cb.id?" selected":""}>${esc(b.name||"Партия")} · ${dLong(b.date)}</option>`).join("")||`<option>Нет загруженных партий</option>`;
    $("bPoint").innerHTML=`<option value="all">Все точки</option>`+settings.points.map(p=>`<option${p===bPt?" selected":""}>${esc(p)}</option>`).join("");
  }
  $("bSel").onchange=()=>{bSelId=$("bSel").value;bLimit=150;renderBatch()};
  $("bPoint").onchange=()=>{bPt=$("bPoint").value;renderBatch()};
  $("bSearch").addEventListener("input",()=>{bLimit=150;renderBatch()});
  document.querySelectorAll("#bViewSeg button").forEach(b=>b.onclick=()=>{bView=b.dataset.v;document.querySelectorAll("#bViewSeg button").forEach(x=>x.setAttribute("aria-pressed",x===b?"true":"false"));bLimit=150;renderBatch()});
  $("bMore").onclick=()=>{bLimit+=300;renderBatch()};
  const reorderList=items=>items.filter(i=>i.sold>0&&(i.left===0||i.left/i.q<=0.2)).sort((x,y)=>x.left-y.left||y.sold-x.sold);

  function renderBatch(){
    if(tab!=="batch")return;
    fillBatchSelects();
    const b=curBatch();
    const has=!!(b&&(b.items||[]).length);
    ["bBar","bKpis","bWidgets","bReorderPanel","bItemsPanel"].forEach(id=>$(id).hidden=!has);
    $("bEmpty").hidden=has;$("bXlsx").disabled=!has;
    if(!has)return;
    const {items,used,byDay}=batchStats(b,bPt);
    const Q=items.reduce((a,i)=>a+i.q,0),S=items.reduce((a,i)=>a+i.sold,0),R=items.reduce((a,i)=>a+i.rev,0),L=items.reduce((a,i)=>a+i.left,0),SC=Q-L;
    const withCost=items.filter(i=>+i.cp>0&&i.sold);const cogs=withCost.reduce((a,i)=>a+i.sold*i.cp,0),revC=withCost.reduce((a,i)=>a+i.rev,0);
    const today=iso(new Date()), start=b.date||today, days=Math.max(1,daysBetween(start,today));
    const rate=S/days, fc=rate>0&&L>0?Math.ceil(L/rate):null;
    const valueLeft=items.reduce((a,i)=>a+i.left*(+i.p||0),0);
    const totalSince=sales.filter(s=>s.date>=start&&(bPt==="all"||s.point===bPt)).reduce((a,s)=>a+(+s.sum||0),0);
    const unsold=items.filter(i=>!i.sold).length, ro=reorderList(items);
    $("bKpis").innerHTML=
      CARD("Продано из партии",fmt(S)+" шт",`из ${fmt(Q)} шт`+(S>SC?` · ${fmt(S-SC)} шт сверх прихода: проверьте названия`:""),C.ring(Q?SC/Q:0),"main")+
      CARD("Осталось",fmt(L)+" шт",valueLeft?`на ${fmt(valueLeft)} сум по цене продажи`:"")+
      CARD("Темп продаж",(rate>=10?fmt(rate):rate.toFixed(1).replace(".",","))+" шт/день",`за ${days} ${pl(days,"день","дня","дней")} с прихода`)+
      CARD("Прогноз распродажи",L===0?"распродано":fc!=null?`~${fmt(fc)} дн.`:"—",L===0?"остатка нет":fc!=null?`остаток уйдёт примерно к ${dLong(addD(today,fc))}`:"пока нет продаж")+
      CARD("Без единой продажи",fmt(unsold)+" "+pl(unsold,"модель","модели","моделей"),`${pctF(items.length?unsold/items.length:0)} позиций партии`)+
      CARD("На дозаказ",fmt(ro.length)+" "+pl(ro.length,"модель","модели","моделей"),"закончились или осталось ≤20%")+
      CARD("Выручка с партии",fmt(R)+" сум",revC?`маржа ${pctF((revC-cogs)/revC)} · прибыль ${fmt(revC-cogs)}`:"нет цен покупки в списке")+
      CARD("Доля партии в продажах",pctF(totalSince?R/totalSince:0),`от всей выручки с ${dShort(start)}`);
    $("bMatchInfo").textContent=`${b.name||"Партия"}: ${fmt(items.length)} позиций, ${fmt(Q)} шт, приход ${dLong(b.date)}. Найдено продаж из партии: ${used.length}`+(bPt!=="all"?` (${bPt})`:"")+".";

    let w="";
    w+=W_("Продано и осталось","",C.donut([{label:"Продано",value:SC,valTxt:fmt(SC)+" шт",color:"var(--accent)"},{label:"Осталось",value:L,valTxt:fmt(L)+" шт",color:"var(--line)"}],pctF(Q?SC/Q:0),"продано"));
    const byP={};items.forEach(i=>Object.entries(i.byPt).forEach(([k,v])=>byP[k]=(byP[k]||0)+v));
    w+=W_("Продажи партии по точкам","",C.hbars(Object.entries(byP).sort((x,y)=>y[1]-x[1]).map(([k,v])=>({label:k,value:v,valTxt:v+" шт",color:pointColor(k)}))));
    const gm={};items.forEach(i=>{const k=i.g||i.c||"Без группы";const o=gm[k]||(gm[k]={k,n:0,q:0,s:0,r:0});o.n++;o.q+=i.q;o.s+=Math.min(i.sold,i.q);o.r+=i.rev});
    const gl=Object.values(gm).sort((x,y)=>(y.s/(y.q||1))-(x.s/(x.q||1))||y.s-x.s);
    w+=W_("Группы: какая уходит быстрее","Процент проданного от пришедшего",C.hbars(gl.slice(0,14).map(o=>({label:o.k,value:o.q?o.s/o.q*100:0,valTxt:pctF(o.q?o.s/o.q:0),color:"var(--p3)",sub:`${o.s} из ${o.q} шт`}))));
    const dl2=[];let d=start,gd=0;while(d<=today&&gd++<400){dl2.push(d);d=addD(d,1)}
    let cum=0;const cumV=dl2.map(x=>cum+=byDay[x]||0);
    w+=W_("Продажи партии по дням","Столбцы — штук за день",C.bars(dl2.map(dShort),dl2.map(x=>byDay[x]||0),{color:"var(--p2)",lf:v=>String(v),vf:v=>v+" шт"}),true);
    // остаток во времени + прогноз
    const restV=cumV.map(c=>Math.max(0,Q-c));let lbl=dl2.map(dShort),proj=null;
    if(rate>0&&L>0){const ext=Math.min(fc,180),step=Math.max(1,Math.ceil(ext/30));const pl2=[],pv2=[];for(let k=step;k<=ext+step-1;k+=step){pl2.push(dShort(addD(today,Math.min(k,ext))));pv2.push(Math.max(0,L-rate*Math.min(k,ext)))}
      lbl=lbl.concat(pl2);proj=restV.map(()=>null);proj[proj.length-1]=L;proj=proj.concat(pv2)}
    const restFull=restV.concat(proj?new Array(lbl.length-restV.length).fill(null):[]);
    const fix=a=>a.map(v=>v==null?NaN:v);
    w+=W_("Остаток и прогноз распродажи","Сплошная — фактический остаток, пунктир — прогноз при текущем темпе",lineGaps(lbl,[{name:"Остаток",color:"var(--accent)",vals:fix(restFull)}].concat(proj?[{name:"Прогноз",color:"var(--muted)",vals:fix(proj),dash:true}]:[])),true);
    w+=W_("Топ-10 моделей партии","По проданным штукам",C.hbars([...items].filter(i=>i.sold).sort((x,y)=>y.sold-x.sold).slice(0,10).map(i=>({label:itemLabel(i),value:i.sold,valTxt:i.sold+" шт",sub:`из ${i.q}`})),{rank:true}));
    $("bWidgets").innerHTML=w;

    $("bReorder").innerHTML=ro.length?`<thead><tr><th>Модель</th><th>Группа</th><th class="r">Пришло</th><th class="r">Продано</th><th class="r">Осталось</th><th class="r">Последняя продажа</th></tr></thead><tbody>`+ro.slice(0,40).map(i=>`<tr><td>${esc(itemLabel(i))}</td><td>${esc(i.g||i.c||"")}</td><td class="r num">${i.q}</td><td class="r num"><b>${i.sold}</b></td><td class="r num">${i.left===0?'<span class="down">0</span>':i.left}</td><td class="r num">${dShort(i.last)}</td></tr>`).join("")+`</tbody>`:`<tbody><tr><td class="srcs">Пока ничего не заканчивается</td></tr></tbody>`;

    const qy=normS($("bSearch").value);
    let list=items.filter(i=>!qy||normS([i.m,i.n,i.s,i.g,i.col].join(" ")).includes(qy));
    if(bView==="selling")list=list.filter(i=>i.sold>0&&i.left>0);
    if(bView==="none")list=list.filter(i=>!i.sold);
    if(bView==="out")list=list.filter(i=>i.q&&i.left===0);
    list.sort((x,y)=>y.sold-x.sold||y.pct-x.pct||String(itemLabel(x)).localeCompare(itemLabel(y)));
    const pts=bPt==="all"?settings.points:[bPt];
    const bar=p=>`<div class="bar" style="height:8px;background:var(--wash);border-radius:5px;overflow:hidden;min-width:70px"><span style="display:block;height:100%;width:${Math.round(p*100)}%;background:var(--accent);border-radius:5px"></span></div>`;
    $("bItemsHead").innerHTML=`<tr><th>Модель</th><th>Группа</th><th class="r">Цена</th><th class="r">Пришло</th>${pts.map(p=>`<th class="r">${esc(p)}</th>`).join("")}<th class="r">Продано</th><th class="r">Осталось</th><th style="min-width:110px">Продано, %</th><th class="r">Последняя продажа</th></tr>`;
    $("bItems").innerHTML=list.slice(0,bLimit).map(i=>`<tr><td>${esc(itemLabel(i))}${i.s&&i.s!==i.m?` <span class="srcs">${esc(i.s)}</span>`:""}</td><td>${esc(i.g||i.c||"")}</td><td class="r num">${+i.p?fmt(i.p):"—"}</td><td class="r num">${fmt(i.q)}</td>${pts.map(p=>`<td class="r num">${i.byPt[p]?fmt(i.byPt[p]):'<span class="srcs">—</span>'}</td>`).join("")}<td class="r num"><b>${fmt(i.sold)}</b></td><td class="r num">${i.left===0&&i.q?'<span class="down">0</span>':fmt(i.left)}</td><td><div style="display:flex;gap:8px;align-items:center">${bar(i.pct)}<span class="num srcs">${Math.round(i.pct*100)}%</span></div></td><td class="r num">${i.last?dShort(i.last):'<span class="srcs">—</span>'}</td></tr>`).join("")||`<tr><td colspan="${8+pts.length}" class="srcs" style="text-align:center;padding:16px">Нет позиций под этот фильтр</td></tr>`;
    $("bMore").hidden=list.length<=bLimit;
  }
  // ===================== вкладка «Склад» =====================
  const stockGroup=()=>{if(!stockParts.length)return [];const up=Math.max(...stockParts.map(p=>p.uploadedAt||0));return stockParts.filter(p=>(p.uploadedAt||0)===up).sort((a,b)=>(a.part||0)-(b.part||0))};
  const stockItems=()=>stockGroup().flatMap(p=>p.items||[]);
  const stockMeta=()=>stockGroup()[0]||null;
  const sMsg2=(t,b)=>{const m=$("sMsg");m.textContent=t;m.style.color=b?"var(--minus)":"var(--plus)"};
  const stxMsg=(t,b)=>flash("stxMsg",t,b);
  const NODET="Без детализации";
  function setStView(v){stView=v;document.querySelectorAll("#stViewSeg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.sv===v?"true":"false"));setTab("batch")}
  document.querySelectorAll("#stViewSeg button").forEach(b=>b.onclick=()=>setStView(b.dataset.sv));
  document.querySelectorAll("#mProdSeg button").forEach(b=>b.onclick=()=>{mSort=b.dataset.ms;document.querySelectorAll("#mProdSeg button").forEach(x=>x.setAttribute("aria-pressed",x===b?"true":"false"));renderMargin()});
  $("sSearch").addEventListener("input",()=>{sLimit=150;renderStockList()});
  $("sMore").onclick=()=>{sLimit+=300;renderStockList()};

  function renderStockTab(){
    if(tab!=="batch")return;
    $("stMargin").hidden=stView!=="margin";$("stList").hidden=stView!=="stock";$("stBatch").hidden=stView!=="batch";
    $("stXlsx").hidden=stView==="batch"||!dl;
    if(stView==="margin")renderMargin();else if(stView==="stock")renderStockList();else renderBatch();
  }
  function mGroup(list,keyFn){
    const m={};
    list.forEach(s=>{const k=keyFn(s);const o=m[k]||(m[k]={k,rev:0,revC:0,cogs:0,n:0,u:0,uC:0});const sum=+s.sum||0,q=+s.qty||0;o.rev+=sum;o.n++;o.u+=q;const c=costOf(s);if(c){o.revC+=sum;o.cogs+=c*q;o.uC+=q;o.cp=c}});
    return Object.values(m).map(o=>Object.assign(o,{gp:o.revC-o.cogs,mg:o.revC?(o.revC-o.cogs)/o.revC:null,cov:o.rev?o.revC/o.rev:0}));
  }
  function marginData(){
    const all=filtered(), list=all.filter(s=>s.cat!==NODET&&s.cat!=="Погашения долгов");
    const tot=mGroup(list,()=>"all")[0]||{rev:0,revC:0,cogs:0,gp:0,mg:null,cov:0,n:0};
    const pts=mGroup(list,s=>s.point);const ptsOrd=settings.points.map(p=>pts.find(o=>o.k===p)).filter(Boolean).concat(pts.filter(o=>!settings.points.includes(o.k)));
    const cats=mGroup(list,s=>s.cat||"Без категории").sort((a,b)=>b.gp-a.gp||b.rev-a.rev);
    const prods=mGroup(list.filter(s=>costOf(s)),s=>s.product);
    const miss=mGroup(list.filter(s=>!costOf(s)),s=>s.product).sort((a,b)=>b.rev-a.rev);
    const nodet=all.filter(s=>s.cat===NODET||s.cat==="Погашения долгов").reduce((x,s)=>x+(+s.sum||0),0);
    return {tot,pts:ptsOrd,cats,prods,miss,nodet};
  }
  const mgCell=o=>o.mg==null?'<span class="srcs">—</span>':`<div style="display:flex;gap:8px;align-items:center;justify-content:flex-end"><div class="mbar" style="width:70px"><span style="width:${Math.max(0,Math.min(100,o.mg*100))}%"></span></div><b class="num">${pctF(o.mg)}</b></div>`;
  function renderMargin(){
    const d=marginData(), hasCost=stockItems().some(i=>+i.cp>0)||batches.some(b=>(b.items||[]).some(i=>+i.cp>0));
    const t=d.tot;
    $("mEmpty").hidden=hasCost;
    ["mPointsPanel","mCatsPanel","mProdsPanel"].forEach(id=>$(id).hidden=!hasCost);
    const meta=stockMeta();
    $("stInfo").textContent=meta?`Склад загружен ${dLong(meta.date)}: ${fmt(stockItems().length)} позиций. Маржа считается за период фильтра.`:"Склад ещё не загружен — маржа считается только по ценам покупки из новой партии.";
    $("mKpis").innerHTML=CARD("Валовая прибыль",fmt(t.gp)+" сум",`выручка ${fmt(t.revC)} − себестоимость ${fmt(t.cogs)}`,"","main")+
      CARD("Маржа",pctF(t.mg),"по продажам с известной ценой покупки")+
      CARD("Покрытие",pctF(t.cov),`посчитано ${fmt(t.revC)} из ${fmt(t.rev)} сум`,C.ring(t.cov))+
      CARD("Без цены покупки",fmt(d.miss.length)+" "+pl(d.miss.length,"товар","товара","товаров"),`${fmt(t.rev-t.revC)} сум выручки`+(d.nodet?` · без детализации ещё ${fmt(d.nodet)}`:""));
    const head=f=>`<thead><tr><th>${f}</th><th class="r">Выручка</th><th class="r">Посчитано</th><th class="r">Себестоимость</th><th class="r">Прибыль</th><th class="r" style="min-width:130px">Маржа</th><th class="r">Покрытие</th></tr></thead>`;
    const tr=(o,lbl)=>`<tr><td>${lbl}</td><td class="r num">${fmt(o.rev)}</td><td class="r num">${fmt(o.revC)}</td><td class="r num">${fmt(o.cogs)}</td><td class="r num"><b>${fmt(o.gp)}</b></td><td class="r">${mgCell(o)}</td><td class="r num srcs">${pctF(o.cov)}</td></tr>`;
    const foot=`<tfoot><tr><td><b>Итого</b></td><td class="r num"><b>${fmt(t.rev)}</b></td><td class="r num"><b>${fmt(t.revC)}</b></td><td class="r num"><b>${fmt(t.cogs)}</b></td><td class="r num"><b>${fmt(t.gp)}</b></td><td class="r num"><b>${pctF(t.mg)}</b></td><td class="r num"><b>${pctF(t.cov)}</b></td></tr></tfoot>`;
    $("mPoints").innerHTML=d.pts.length?head("Точка")+`<tbody>${d.pts.map(o=>tr(o,`<span class="sw" style="background:${pointColor(o.k)}"></span>${esc(o.k)}`)).join("")}</tbody>`+foot:`<tbody><tr><td class="srcs">Нет продаж за период</td></tr></tbody>`;
    const bars=d.pts.filter(o=>o.mg!=null);
    $("mPointsChart").innerHTML=bars.length?C.hbars(bars.map(o=>({label:o.k,value:o.gp,valTxt:fmt(o.gp)+" · "+pctF(o.mg),color:pointColor(o.k),sub:`покрытие ${pctF(o.cov)}`}))):"";
    $("mCats").innerHTML=d.cats.length?head("Категория")+`<tbody>${d.cats.map(o=>tr(o,esc(o.k))).join("")}</tbody>`+foot:"";
    const pr=[...d.prods].sort(mSort==="low"?(a,b)=>(a.mg??9)-(b.mg??9)||b.rev-a.rev:(a,b)=>b.gp-a.gp).slice(0,25);
    $("mProds").innerHTML=pr.length?`<thead><tr><th>#</th><th>Товар</th><th class="r">Шт</th><th class="r">Выручка</th><th class="r">Цена покупки</th><th class="r">Прибыль</th><th class="r" style="min-width:130px">Маржа</th></tr></thead><tbody>${pr.map((o,i)=>`<tr><td class="num srcs">${i+1}</td><td>${esc(o.k)}</td><td class="r num">${fmt(o.u)}</td><td class="r num">${fmt(o.rev)}</td><td class="r num">${fmt(o.cp||0)}</td><td class="r num"><b>${fmt(o.gp)}</b></td><td class="r">${mgCell(o)}</td></tr>`).join("")}</tbody>`:`<tbody><tr><td class="srcs">Пока ни одна продажа не сопоставилась со складом</td></tr></tbody>`;
    $("mMissNote").textContent=`Не нашлись на складе: ${d.miss.length} ${pl(d.miss.length,"товар","товара","товаров")} на ${fmt(t.rev-t.revC)} сум. Проверьте, совпадает ли модель или артикул в продаже с файлом склада. Показаны первые 30 по выручке.`;
    $("mMiss").innerHTML=d.miss.length?`<thead><tr><th>Товар в продаже</th><th class="r">Продаж</th><th class="r">Шт</th><th class="r">Выручка</th></tr></thead><tbody>${d.miss.slice(0,30).map(o=>`<tr><td>${esc(o.k)}</td><td class="r num">${o.n}</td><td class="r num">${fmt(o.u)}</td><td class="r num">${fmt(o.rev)}</td></tr>`).join("")}</tbody>`:`<tbody><tr><td class="srcs">Все продажи периода нашлись на складе</td></tr></tbody>`;
  }
  function stockSold(){
    const meta=stockMeta();const m=new Map();if(!meta)return m;const mt=batchMatcher();const from=meta.soldFrom||meta.date;
    sales.forEach(s=>{if(from&&s.date<from)return;const r=mt(s.product,unitPrice(s),s.point);if(r&&r.b===null)m.set(r.it,(m.get(r.it)||0)+(+s.qty||0))});
    return m;
  }
  const PLACE_ORDER=["Склад","Премиум","Яшнабад","Сергели","C1"];
  const placesOf=items=>{const s=[...new Set(items.map(i=>i.pt||"Без места"))];return s.sort((a,b)=>(PLACE_ORDER.indexOf(a)+1||99)-(PLACE_ORDER.indexOf(b)+1||99))};
  function renderStockList(){
    const all=stockItems(), meta=stockMeta(), has=all.length>0;
    ["sKpis","sPlacesPanel","sCatsPanel","sGroupsPanel","sItemsPanel","sPlaceSeg"].forEach(id=>$(id).hidden=!has);$("sEmpty").hidden=has;
    $("stInfo").textContent=meta?`Склад загружен из «${meta.file||"файла"}»: ${fmt(all.length)} позиций`:"Склад ещё не загружен";
    if(!has){$("sNote").textContent="Склад ещё не загружен.";return}
    const places=placesOf(all), src=meta.src||{}, from=meta.soldFrom||meta.date;
    $("sNote").innerHTML=`Остатки взяты из файла как есть: ${places.map(p=>`<b>${esc(p)}</b>${src[p]?` — ${esc(src[p])}`:""}`).join("; ")}. Продажи после этих дат в файле не вычтены, поэтому рядом показано, сколько продано с ${dShort(from)}, и примерный остаток сейчас. После инвентаризации загрузите точные остатки.`;
    if(sPlace!=="all"&&!places.includes(sPlace))sPlace="all";
    $("sPlaceSeg").innerHTML=[["all","Все места"]].concat(places.map(p=>[p,p])).map(([v,l])=>`<button type="button" data-sp="${esc(v)}" aria-pressed="${sPlace===v}">${esc(l)}</button>`).join("");
    $("sPlaceSeg").querySelectorAll("[data-sp]").forEach(b=>b.onclick=()=>{sPlace=b.dataset.sp;sLimit=150;renderStockList()});
    const sold=stockSold();
    const items=sPlace==="all"?all:all.filter(i=>(i.pt||"Без места")===sPlace);
    const sum=(arr,f)=>arr.reduce((a,i)=>a+f(i),0), q=i=>+i.q||0;
    const Q=sum(items,q), vC=sum(items,i=>q(i)*(+i.cp||0)), vP=sum(items,i=>q(i)*(+i.p||0)), soldQ=sum(items,i=>sold.get(i)||0);
    $("sKpis").innerHTML=CARD(sPlace==="all"?"Товаров всего":"Товаров: "+esc(sPlace),fmt(Q)+" шт",`${fmt(items.length)} позиций по файлу`,"","main")+CARD("Сумма закупки",fmt(vC)+" сум",items.some(i=>!+i.cp)?`без цены покупки: ${items.filter(i=>!+i.cp).length} поз.`:"у всех есть цена покупки")+CARD("Сумма продажи",fmt(vP)+" сум",vC&&vP?`наценка ${pctF((vP-vC)/vC)} · маржа ${pctF((vP-vC)/vP)}`:"")+CARD(`Продано с ${dShort(from)}`,fmt(soldQ)+" шт",`примерно сейчас: ${fmt(Q-soldQ)} шт`);
    // по местам
    const pr=places.map(p=>{const it=all.filter(i=>(i.pt||"Без места")===p);const c=sum(it,i=>q(i)*(+i.cp||0)),v=sum(it,i=>q(i)*(+i.p||0)),n=sum(it,q),s=sum(it,i=>sold.get(i)||0);return {p,src:src[p]||"",pos:it.length,n,c,v,mk:c?(v-c)/c:null,s}});
    const QA=sum(all,q);
    $("sPlaces").innerHTML=`<thead><tr><th>Место</th><th>Источник</th><th class="r">Позиций</th><th class="r">Штук</th><th class="r">Доля</th><th class="r">Сумма закупки</th><th class="r">Сумма продажи</th><th class="r">Наценка</th><th class="r">Продано с ${dShort(from)}</th></tr></thead><tbody>${pr.map(o=>`<tr${sPlace===o.p?' class="editing"':""}><td><b>${esc(o.p)}</b></td><td class="srcs">${esc(o.src)}</td><td class="r num">${fmt(o.pos)}</td><td class="r num">${fmt(o.n)}</td><td class="r num">${pctF(QA?o.n/QA:0)}</td><td class="r num">${fmt(o.c)}</td><td class="r num">${fmt(o.v)}</td><td class="r num">${pctF(o.mk)}</td><td class="r num">${o.s?fmt(o.s):'<span class="srcs">—</span>'}</td></tr>`).join("")}</tbody><tfoot><tr><td colspan="2"><b>Итого</b></td><td class="r num"><b>${fmt(all.length)}</b></td><td class="r num"><b>${fmt(QA)}</b></td><td class="r num"><b>100%</b></td><td class="r num"><b>${fmt(sum(pr,o=>o.c))}</b></td><td class="r num"><b>${fmt(sum(pr,o=>o.v))}</b></td><td class="r num"><b>${pctF(sum(pr,o=>o.c)?(sum(pr,o=>o.v)-sum(pr,o=>o.c))/sum(pr,o=>o.c):null)}</b></td><td class="r num"><b>${fmt(sum(pr,o=>o.s))}</b></td></tr></tfoot>`;
    // категории × места
    const cats=[...new Set(all.map(i=>i.c||"Без категории"))].sort();
    const cell=(c,p)=>sum(all.filter(i=>(i.c||"Без категории")===c&&(!p||(i.pt||"Без места")===p)),q);
    $("sCats").innerHTML=`<thead><tr><th>Категория</th>${places.map(p=>`<th class="r">${esc(p)}, шт</th>`).join("")}<th class="r">Всего, шт</th><th class="r">Сумма продажи</th></tr></thead><tbody>${cats.map(c=>`<tr><td>${esc(c)}</td>${places.map(p=>{const v=cell(c,p);return `<td class="r num">${v?fmt(v):'<span class="srcs">—</span>'}</td>`}).join("")}<td class="r num"><b>${fmt(cell(c))}</b></td><td class="r num">${fmt(sum(all.filter(i=>(i.c||"Без категории")===c),i=>q(i)*(+i.p||0)))}</td></tr>`).join("")}</tbody><tfoot><tr><td><b>Итого</b></td>${places.map(p=>`<td class="r num"><b>${fmt(sum(all.filter(i=>(i.pt||"Без места")===p),q))}</b></td>`).join("")}<td class="r num"><b>${fmt(QA)}</b></td><td class="r num"><b>${fmt(sum(all,i=>q(i)*(+i.p||0)))}</b></td></tr></tfoot>`;
    // группы
    const gm={};items.forEach(i=>{const k=i.g||i.c||"Без группы";const o=gm[k]||(gm[k]={k,n:0,q:0,vc:0,vp:0,s:0});o.n++;o.q+=q(i);o.vc+=q(i)*(+i.cp||0);o.vp+=q(i)*(+i.p||0);o.s+=sold.get(i)||0});
    const gl=Object.values(gm).sort((a,b)=>b.vc-a.vc||b.q-a.q);
    $("sGroupsTitle").textContent="По группам"+(sPlace==="all"?"":" · "+sPlace);
    $("sGroups").innerHTML=`<thead><tr><th>Группа</th><th class="r">Позиций</th><th class="r">Штук</th><th class="r">Сумма закупки</th><th class="r">Сумма продажи</th><th class="r">Маржа в цене</th><th class="r">Продано с ${dShort(from)}</th></tr></thead><tbody>${gl.map(o=>`<tr><td>${esc(o.k)}</td><td class="r num">${fmt(o.n)}</td><td class="r num">${fmt(o.q)}</td><td class="r num">${fmt(o.vc)}</td><td class="r num">${fmt(o.vp)}</td><td class="r num">${o.vp&&o.vc?pctF((o.vp-o.vc)/o.vp):"—"}</td><td class="r num">${o.s?fmt(o.s):'<span class="srcs">—</span>'}</td></tr>`).join("")}</tbody><tfoot><tr><td><b>Итого</b></td><td class="r num"><b>${fmt(items.length)}</b></td><td class="r num"><b>${fmt(Q)}</b></td><td class="r num"><b>${fmt(vC)}</b></td><td class="r num"><b>${fmt(vP)}</b></td><td class="r num"><b>${vP&&vC?pctF((vP-vC)/vP):"—"}</b></td><td class="r num"><b>${fmt(soldQ)}</b></td></tr></tfoot>`;
    // товары
    const qy=normS($("sSearch").value);
    const list=items.filter(i=>!qy||normS([i.m,i.n,i.s,i.g,i.c,i.col,i.pt].join(" ")).includes(qy)).sort((a,b)=>(sold.get(b)||0)-(sold.get(a)||0)||(PLACE_ORDER.indexOf(a.pt)-PLACE_ORDER.indexOf(b.pt))||String(a.g||"").localeCompare(String(b.g||""))||String(a.m||a.n||"").localeCompare(String(b.m||b.n||""),undefined,{numeric:true}));
    $("sItemsNote").textContent=`${fmt(list.length)} из ${fmt(items.length)} позиций. Сначала — те, что продавались с ${dShort(from)}.`;
    const showPt=sPlace==="all";
    $("sItems").innerHTML=`<thead><tr>${showPt?"<th>Место</th>":""}<th>Модель / наименование</th><th>Артикул</th><th>Группа</th><th class="r">Кол-во по файлу</th><th class="r">Продано с ${dShort(from)}</th><th class="r">≈ Сейчас</th><th class="r">Цена покупки</th><th class="r">Цена продажи</th><th class="r">Маржа в цене</th></tr></thead><tbody>`+list.slice(0,sLimit).map(i=>{const sd=sold.get(i)||0;return `<tr>${showPt?`<td>${esc(i.pt||"")}</td>`:""}<td>${esc([i.m||i.n||i.s,i.col].filter(Boolean).join(" · "))}${i.note?`<br><span class="srcs">${esc(i.note)}</span>`:""}</td><td class="srcs">${esc(i.s&&i.s!==i.m?i.s:"")}</td><td>${esc(i.g||i.c||"")}</td><td class="r num">${fmt(q(i))}</td><td class="r num">${sd?`<b>${fmt(sd)}</b>`:'<span class="srcs">—</span>'}</td><td class="r num">${q(i)-sd<0?`<span class="down">${fmt(q(i)-sd)}</span>`:fmt(q(i)-sd)}</td><td class="r num">${+i.cp?fmt(i.cp):"—"}</td><td class="r num">${+i.p?fmt(i.p):"—"}</td><td class="r num">${+i.cp&&+i.p?pctF((i.p-i.cp)/i.p):"—"}</td></tr>`}).join("")+`</tbody>`;
    $("sMore").hidden=list.length<=sLimit;
  }
  function mergeStock(items){
    const m=new Map();
    items.forEach(it=>{const key=[it.pt,it.s,it.m,it.n,it.col].map(normS).join("|");const o=m.get(key);if(o){o.q=(+o.q||0)+(+it.q||0);if(!o.cp&&it.cp)o.cp=it.cp;if(!o.p&&it.p)o.p=it.p;if(!o.g&&it.g)o.g=it.g;if(!o.c&&it.c)o.c=it.c}else{const c=Object.assign({},it);m.set(key,c)}});
    return [...m.values()].map((it,i)=>Object.assign(it,{k:"s"+i}));
  }
  $("sFile").addEventListener("change",async()=>{
    const f=$("sFile").files[0];$("sFile").value="";if(!f)return;
    if(typeof XLSX==="undefined"){sMsg2("Модуль Excel не загрузился. Обновите страницу.",true);return}
    try{
      const wb=XLSX.read(await f.arrayBuffer(),{type:"array"});
      let best=null;wb.SheetNames.forEach(n=>{const r=parseSheet(wb.Sheets[n],{zero:true});if(!best||r.items.length>best.items.length)best=Object.assign(r,{sheet:n})});
      if(!best||!best.items.length){sMsg2(best&&best.err?best.err:"В файле не нашлось товаров.",true);$("sPrev").hidden=true;return}
      const raw=best.items.length, items=mergeStock(best.items);
      stPending={items,raw,file:f.name,sheet:best.sheet};
      const Q=items.reduce((a,i)=>a+(+i.q||0),0), nc=items.filter(i=>+i.cp>0).length;
      $("sPrev").hidden=false;
      $("sPrev").innerHTML=`<p class="note" style="margin:10px 0">Файл «${esc(f.name)}», лист «${esc(best.sheet)}»: <b>${fmt(items.length)} позиций, ${fmt(Q)} шт</b>${raw>items.length?` (${fmt(raw)} строк, повторы по точкам сложены)`:""}. Цена покупки есть у ${fmt(nc)} позиций.</p>
        <div class="tbl"><table><thead><tr><th>Модель / наименование</th><th>Артикул</th><th>Группа</th><th class="r">Кол-во</th><th class="r">Цена покупки</th><th class="r">Цена продажи</th></tr></thead><tbody>${items.slice(0,6).map(i=>`<tr><td>${esc(i.m||i.n||i.s)}</td><td>${esc(i.s||"")}</td><td>${esc(i.g||i.c||"")}</td><td class="r num">${fmt(+i.q||0)}</td><td class="r num">${i.cp?fmt(i.cp):"—"}</td><td class="r num">${i.p?fmt(i.p):"—"}</td></tr>`).join("")}</tbody></table></div>
        <div class="actions" style="margin-top:12px"><button type="button" id="sSave">Сохранить склад</button><button type="button" class="sec" id="sCancel">Отмена</button></div>`;
      $("sCancel").onclick=()=>{stPending=null;$("sPrev").hidden=true;sMsg2("")};
      $("sSave").onclick=saveStock;sMsg2("");
    }catch(e){sMsg2("Не удалось прочитать файл. Сохраните его как .xlsx и попробуйте снова.",true)}
  });
  async function saveStock(){
    const p=stPending;if(!p)return;
    if(mode!=="db"){sMsg2("Сохранение склада доступно только в опубликованной странице.",true);return}
    $("sSave").disabled=true;
    const up=Date.now(), date=$("sDateIn").value||iso(new Date()), N=400, parts=Math.ceil(p.items.length/N), ids=[];
    try{
      for(let i=0;i<parts;i++){const id="p"+i;ids.push(id);await db.doc("stock/"+id).set({part:i,parts,file:p.file,date,uploadedAt:up,total:p.items.length,items:p.items.slice(i*N,(i+1)*N)})}
      for(const o of stockParts){if(!ids.includes(o.id)){try{await db.doc("stock/"+o.id).delete()}catch(e){}}}
      stPending=null;$("sPrev").hidden=true;sMsg2(`Склад сохранён: ${fmt(p.items.length)} позиций.`);
    }catch(e){sMsg2("Не удалось сохранить склад. Попробуйте ещё раз.",true);$("sSave").disabled=false}
  }
  $("stXlsx").onclick=()=>{
    const sub=periodTxt();
    if(stView==="stock"){
      const items=stockItems();if(!items.length){stxMsg("Склад ещё не загружен.",true);return}
      const sold=stockSold();const meta=stockMeta();
      const rows=items.map(i=>({pt:i.pt||"",m:[i.m||i.n||i.s,i.col].filter(Boolean).join(" · "),n:i.n&&i.m?i.n:"",s:i.s&&i.s!==i.m?i.s:"",g:i.g||i.c||"",q:+i.q||0,cp:+i.cp||null,p:+i.p||null,mg:+i.cp&&+i.p?(i.p-i.cp)/i.p:null,vc:(+i.q||0)*(+i.cp||0),sold:sold.get(i)||0,now:(+i.q||0)-(sold.get(i)||0)}));
      const T=k=>rows.reduce((a,r)=>a+(+r[k]||0),0);
      SaifXL.save({sheets:[{name:"Склад",title:"Товары по складу и точкам",subtitle:`Файл «${meta.file||""}» · продано считается с ${dLong(meta.soldFrom||meta.date)} · выгружено ${SaifXL.today()}`,columns:[{header:"Место",key:"pt",type:"text",width:11},{header:"Модель / наименование",key:"m",type:"text",width:28},{header:"Наименование",key:"n",type:"text",width:26},{header:"Артикул",key:"s",type:"text",width:14},{header:"Группа",key:"g",type:"text",width:18},{header:"Кол-во по файлу",key:"q",type:"int",width:11},{header:"Цена покупки",key:"cp",type:"money",width:13},{header:"Цена продажи",key:"p",type:"money",width:13},{header:"Маржа в цене",key:"mg",type:"pct",width:10},{header:"Стоимость по закупке",key:"vc",type:"money",width:16},{header:"Продано",key:"sold",type:"int",width:10},{header:"≈ Сейчас",key:"now",type:"int",width:10}],rows,total:{pt:"Итого",q:T("q"),vc:T("vc"),sold:T("sold"),now:T("now")}}]},"sklad_"+(meta.date||"")+".xlsx",stxMsg);
      return;
    }
    const d=marginData();if(!d.tot.rev){stxMsg("Нет продаж за выбранный период.",true);return}
    const cols=f=>[{header:f,key:"k",type:"text",width:26},{header:"Выручка, сум",key:"rev",type:"money",width:15},{header:"Посчитано, сум",key:"revC",type:"money",width:15},{header:"Себестоимость, сум",key:"cogs",type:"money",width:15},{header:"Прибыль, сум",key:"gp",type:"money",width:15},{header:"Маржа",key:"mg",type:"pct",width:9},{header:"Покрытие",key:"cov",type:"pct",width:10}];
    const tot=Object.assign({k:"Итого"},d.tot);
    SaifXL.save({sheets:[
      {name:"Маржа по точкам",title:"Маржинальность точек",subtitle:sub,columns:cols("Точка"),rows:d.pts,total:tot,note:"Считаются продажи с найденной ценой покупки. Покрытие — доля выручки, для которой цена покупки нашлась. Строки «без детализации» не входят."},
      {name:"Маржа по категориям",title:"Маржа по категориям",subtitle:sub,columns:cols("Категория"),rows:d.cats,total:tot},
      {name:"Товары",title:"Прибыль и маржа по товарам",subtitle:sub,columns:[{header:"Товар",key:"k",type:"text",width:36},{header:"Шт",key:"u",type:"int",width:8},{header:"Выручка, сум",key:"rev",type:"money",width:15},{header:"Цена покупки, сум",key:"cp",type:"money",width:15},{header:"Себестоимость, сум",key:"cogs",type:"money",width:15},{header:"Прибыль, сум",key:"gp",type:"money",width:15},{header:"Маржа",key:"mg",type:"pct",width:9}],rows:[...d.prods].sort((a,b)=>b.gp-a.gp)},
      {name:"Без цены покупки",title:"Продажи без цены покупки",subtitle:sub,columns:[{header:"Товар в продаже",key:"k",type:"text",width:40},{header:"Продаж",key:"n",type:"int",width:9},{header:"Шт",key:"u",type:"int",width:8},{header:"Выручка, сум",key:"rev",type:"money",width:15}],rows:d.miss}
    ]},fname("marzha","xlsx"),stxMsg);
  };

  // линия с разрывами (NaN — пропуск)
  function lineGaps(labels,series){
    const n=labels.length;if(!n)return C.none();
    const W=Math.max(640,n*14),H=230,L=54,R=16,T=18,B=28,cw=W-L-R,ch=H-T-B;
    const mx=Math.max(1,...series.flatMap(s=>s.vals.filter(v=>!isNaN(v))));const step=niceStep(mx/4),top=Math.ceil(mx/step)*step;
    const X=i=>L+(n<=1?cw/2:i/(n-1)*cw),Y=v=>T+ch-v/top*ch;
    let s=C.axisY(top,step,L,W,R,T,ch,v=>fmt(v));
    series.forEach(se=>{let p="",pen=false;se.vals.forEach((v,i)=>{if(isNaN(v)){pen=false;return}p+=(pen?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1);pen=true});
      s+=`<path d="${p}" fill="none" stroke="${se.color}" stroke-width="2.5"${se.dash?' stroke-dasharray="5 4"':""} stroke-linejoin="round"/>`});
    const every=Math.ceil(n/12);labels.forEach((l,i)=>{if(i%every===0)s+=`<text x="${X(i)}" y="${H-8}" text-anchor="middle" font-size="10" fill="var(--muted)" ${mono}>${l}</text>`});
    return `<div class="chartbox"><svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${s}</svg></div>`+C.legend(series.map(x=>({label:x.name,color:x.color,dash:x.dash})));
  }


  // ===================== ОТЧЁТ ОПТИКА =====================
  let repDocs={},rpMonth="",rpDay="",rpBank=null,rpBankFor="",rpSavedT=0,rpScrolled="",rpPicked=false,rpEditing=false;
  const RP_PTS=["Премиум","Яшнабад","Сергели"];
  const RP_MF=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const RP_WD=["вс","пн","вт","ср","чт","пт","сб"];
  const rpNum=v=>{if(v==null)return null;let t=String(v).replace(/[\s  ]/g,"").replace(/[−–]/g,"-").replace(/,/g,".");t=t.replace(/[^\d.\-]/g,"");if(!t||t==="-"||t===".")return null;const parts=t.split(".");if(parts.length>2)t=parts.slice(0,-1).join("")+"."+parts[parts.length-1];const x=parseFloat(t);return isFinite(x)?Math.round(x*100)/100:null};
  const fmt2=n=>{if(n==null||!isFinite(n))return "";const r=Math.round(Math.abs(n)*100),i=Math.floor(r/100),f=r%100;return (n<0?"−":"")+fmt(i)+(f?","+String(f).padStart(2,"0"):"")};
  const rpExpAmt=e=>typeof e.fact==="number"?e.fact:(+e.amount||0);
  const rpExpName=e=>{const n=String(e.name||"").trim(),b=String(e.branch||"").trim();if(!n)return b;const w=n.split(/\s+/)[0];return b&&!(w.length>=5&&normS(w)[0]===normS(b)[0])?b+" "+n:n};
  // гросс безнал считается сам: вчерашний гросс + терминал и QR всех точек за день
  const RP_GN_FROM="2026-10-16";
  let rpGNc=null,rpGNk="";
  function rpTQ(d){let t=0,q=0;sales.forEach(s=>{if(s.date!==d)return;const add=(p,v)=>{if(p==="Терминал")t+=v;else if(p==="QR/Payme"||p==="QR"||p==="Payme")q+=v};if(s.pay==="Смешанная"&&s.pays)Object.entries(s.pays).forEach(([k,v])=>add(k,+v||0));else add(s.pay,+s.sum||0)});
    const adj=(repDocs[d]||{}).adj;if(adj)Object.values(adj).forEach(v=>{t+=+(v&&v.t)||0;q+=+(v&&v.q)||0});return {t,q}}
  function rpGNmap(){const key=sales.length+"|"+Object.keys(repDocs).length+"|"+JSON.stringify(Object.values(repDocs).map(x=>x.grossNon));if(rpGNc&&rpGNk===key)return rpGNc;
    const t=iso(new Date()),ds=new Set(Object.keys(repDocs));sales.forEach(s=>{if(s.date&&s.date>=RP_GN_FROM&&s.date<=t)ds.add(s.date)});
    const m={};let prev=null;[...ds].sort().forEach(d=>{if(d<RP_GN_FROM){const v=(repDocs[d]||{}).grossNon;if(v!=null)prev=v;m[d]={v:v==null?null:v,auto:false};return}
      const x=rpTQ(d);if(prev==null){m[d]={v:null,auto:true,t:x.t,q:x.q};return}const v=prev+x.t+x.q;m[d]={v,auto:true,prev,t:x.t,q:x.q};prev=v});
    rpGNc=m;rpGNk=key;return m}
  const rpGN=d=>{const x=rpGNmap()[d];return x?x.v:null};
  const rpReady=r=>["rsStart","rsEnd","grossCash","grossNon"].filter(k=>r&&(k==="grossNon"?(r.date>=RP_GN_FROM?rpGN(r.date):r[k])!=null:r[k]!=null)).length;
  const rpStat=r=>{const n=rpReady(r);return n===4?"ok":n?"part":"none"};
  function rpAdd(o,pay,v){const k=pay==="Наличные"?"c":pay==="Терминал"?"t":pay==="Перечисление"?"e":"q";o[k]+=v}
  function rpMonthDays(m,withToday){const t=iso(new Date()),set=new Set();
    sales.forEach(s=>{if((s.date||"").startsWith(m)&&s.date<=t)set.add(s.date)});
    dayExp.forEach(e=>{if((e.date||"").startsWith(m)&&e.date<=t)set.add(e.date)});
    Object.keys(repDocs).forEach(d=>{if(d.startsWith(m))set.add(d)});
    if(withToday&&t.startsWith(m)&&pd(t).getDay()!==0)set.add(t);
    return [...set].sort()}
  function rpCalc(m,withToday){
    const days=rpMonthDays(m,withToday),dset=new Set(days),extra=new Set();
    const byDay={};days.forEach(d=>byDay[d]={pts:{},bc:[]});
    sales.forEach(s=>{if(!dset.has(s.date))return;const p=s.point||"—";if(!RP_PTS.includes(p))extra.add(p);const o=byDay[s.date].pts[p]||(byDay[s.date].pts[p]={c:0,t:0,q:0,e:0});
      if(s.pay==="Смешанная"&&s.pays)Object.entries(s.pays).forEach(([k,v])=>rpAdd(o,k,+v||0));else rpAdd(o,s.pay,+s.sum||0)});
    // долги: деньги учитываются в день оплаты, а не в день продажи
    days.forEach(d=>{const adj=(repDocs[d]||{}).adj;if(!adj)return;Object.entries(adj).forEach(([p,v])=>{if(!RP_PTS.includes(p))extra.add(p);const o=byDay[d].pts[p]||(byDay[d].pts[p]={c:0,t:0,q:0,e:0});["c","t","q","e"].forEach(k=>{o[k]+=+(v&&v[k])||0})})});
    dayExp.forEach(e=>{if(!dset.has(e.date))return;const a=rpExpAmt(e);if(a)byDay[e.date].bc.push({n:rpExpName(e),a,p:e.branch||""})});
    const pts=RP_PTS.concat([...extra]);
    const cum={c:0,t:0,q:0,e:0,bank:0,bc:0,pts:{}};
    const rows=days.map(d=>{const x=byDay[d],r=repDocs[d]||{},tot={c:0,t:0,q:0,e:0};
      pts.forEach(p=>{const o=x.pts[p]||(x.pts[p]={c:0,t:0,q:0,e:0});o.sum=o.c+o.t+o.q+o.e;["c","t","q","e"].forEach(k=>tot[k]+=o[k]);cum.pts[p]=(cum.pts[p]||0)+o.sum});
      tot.sum=tot.c+tot.t+tot.q+tot.e;["c","t","q","e"].forEach(k=>cum[k]+=tot[k]);
      const bank=(Array.isArray(r.bank)?r.bank:[]).filter(b=>b&&(b.n||b.a)),bankSum=bank.reduce((a,b)=>a+(+b.a||0),0),bcSum=x.bc.reduce((a,b)=>a+b.a,0);
      cum.bank+=bankSum;cum.bc+=bcSum;
      return {d,pts:x.pts,bc:x.bc,r,tot,bank,bankSum,bcSum,cum:{c:cum.c,t:cum.t,q:cum.q,e:cum.e,sum:cum.c+cum.t+cum.q+cum.e,bank:cum.bank,bc:cum.bc,pts:Object.assign({},cum.pts)}}});
    return {days,pts,rows}}
  function rpPrevDoc(d,k){const ds=Object.keys(repDocs).filter(x=>x<d&&repDocs[x]&&repDocs[x][k]!=null).sort();const x=ds[ds.length-1];return x?{d:x,v:repDocs[x][k]}:null}
  const rpMonths=()=>{const t=iso(new Date()).slice(0,7);return [...new Set(sales.map(s=>(s.date||"").slice(0,7)).filter(Boolean).concat(Object.keys(repDocs).map(d=>d.slice(0,7))).concat([t]))].filter(m=>m<=t).sort()};
  function renderReport(opt){
    const ms=rpMonths();if(!rpMonth||!ms.includes(rpMonth))rpMonth=ms[ms.length-1];
    $("rpMonthSeg").innerHTML=ms.map(m=>`<button type="button" data-rm="${m}" aria-pressed="${m===rpMonth}">${RP_MF[+m.slice(5,7)-1]} ${m.slice(0,4)}</button>`).join("");
    const M=rpCalc(rpMonth,true),mName=RP_MF[+rpMonth.slice(5,7)-1]+" "+rpMonth.slice(0,4);
    const ex=rpMonthDays(rpMonth,false),saleDays=new Set(sales.map(s=>s.date));
    if(!rpPicked||!M.days.includes(rpDay)){const withS=M.days.filter(d=>saleDays.has(d));rpDay=withS[withS.length-1]||M.days[M.days.length-1]||""}
    const ready=ex.filter(d=>rpStat(repDocs[d])==="ok").length;
    $("rpPeriod").textContent=ex.length?`${mName} · ${ex.length} ${pl(ex.length,"день","дня","дней")} в отчёте · выручка и расходы с Б/Ч подставляются сами`:`${mName} · дней с продажами пока нет`;
    {const all=rpAllDays();const ms2=[...new Set(all.map(d=>d.slice(0,7)))];
      $("rpDlSub").textContent=all.length?`${ms2.length>1?RP_MF[+ms2[0].slice(5,7)-1].toLowerCase()+" – "+RP_MF[+ms2[ms2.length-1].slice(5,7)-1].toLowerCase()+" "+ms2[ms2.length-1].slice(0,4):RP_MF[+ms2[0].slice(5,7)-1]+" "+ms2[0].slice(0,4)} · ${all.length} ${pl(all.length,"лист","листа","листов")}`:"";
      $("rpXlsx").disabled=!all.length;if(!$("rpPick").hidden)rpRenderPick()}
    $("rpProg").innerHTML=ex.length?`<span>Р/с и гросс заполнены: <b>${ready} из ${ex.length}</b></span><span class="bar"><i style="width:${(ready/ex.length*100).toFixed(1)}%"></i></span>`:"";
    $("rpDays").innerHTML=M.days.map(d=>{const st=rpStat(repDocs[d]);return `<button type="button" class="rp-day" data-rd="${d}" aria-pressed="${d===rpDay}" title="${dLong(d)} · ${st==="ok"?"заполнено":st==="part"?"заполнено частично":"р/с и гросс не заполнены"}"><small>${RP_WD[pd(d).getDay()]}</small><b>${+d.slice(8)}</b><i class="${st}"></i></button>`}).join("");
    requestAnimationFrame(()=>{const b=$("rpDays").querySelector('[aria-pressed="true"]');if(b&&rpScrolled!==rpDay&&b.offsetParent){rpScrolled=rpDay;const box=$("rpDays");box.scrollLeft=Math.max(0,b.offsetLeft-box.offsetLeft-(box.clientWidth-b.offsetWidth)/2)}});
    const show=!!rpDay;["rpHero","rpRevPanel","rpRsPanel","rpGrPanel","rpBcPanel"].forEach(id=>$(id).hidden=!show);
    if(!show){$("rpHero").innerHTML="";return}
    const i=M.days.indexOf(rpDay),R=M.rows[i],r=R.r;
    // плитки
    const T=(cls,lab,big,small)=>`<div class="tile${cls?" "+cls:""}"><div class="eyebrow">${lab}</div><div class="big num">${big}</div><small>${small}</small></div>`;
    $("rpHero").innerHTML=T("hero","Выручка "+dShort(rpDay),fmt(R.tot.sum),[["нал",R.tot.c],["терминал",R.tot.t],["QR",R.tot.q]].concat(R.tot.e?[["переч.",R.tot.e]]:[]).map(([a,b])=>`<span class="nw">${a} ${fmt(b)}</span>`).join(" · "))
      +T("","С начала месяца",fmt(R.cum.sum),`<span class="nw">${i+1} ${pl(i+1,"день","дня","дней")}</span> · <span class="nw">по ${dShort(rpDay)} включительно</span>`)
      +T("","Расходы дня",fmt(R.bankSum+R.bcSum),`<span class="nw">с р/с ${fmt(R.bankSum)}</span> · <span class="nw">с Б/Ч ${fmt(R.bcSum)}</span>`)
      +(r.rsEnd!=null?T("","Р/с на конец дня",fmt2(r.rsEnd),r.rsStart!=null?`на начало ${fmt2(r.rsStart)}`:"начало дня не заполнено"):`<div class="tile"><div class="eyebrow">Р/с на конец дня</div><div class="big num" style="color:var(--muted)">—</div><span class="chip over">Не заполнено</span></div>`);
    // выручка
    const cell=v=>`<td class="${v?"":"z"}">${fmt(v)}</td>`;
    $("rpRev").innerHTML=(r.adjNote?`<div class="rp-adj">${esc(r.adjNote)}</div>`:"")+`<div class="rp-tbl"><table><thead><tr><th>Точка</th><th>Б/Ч</th><th>Терминал</th><th>QR</th><th>Перечисления</th><th>Итого</th><th>С начала месяца</th></tr></thead><tbody>${
      M.pts.map(p=>{const o=R.pts[p];return `<tr><td><span class="dot" style="background:${pointColor(p)}"></span>${esc(p)}</td>${cell(o.c)}${cell(o.t)}${cell(o.q)}${cell(o.e)}<td class="it${o.sum?"":" z"}">${fmt(o.sum)}</td><td class="mon">${fmt(R.cum.pts[p]||0)}</td></tr>`}).join("")
    }<tr class="tot"><td>Итого</td><td>${fmt(R.tot.c)}</td><td>${fmt(R.tot.t)}</td><td>${fmt(R.tot.q)}</td><td>${fmt(R.tot.e)}</td><td>${fmt(R.tot.sum)}</td><td class="mon">${fmt(R.cum.sum)}</td></tr>
      <tr class="cum"><td>С начала месяца</td><td>${fmt(R.cum.c)}</td><td>${fmt(R.cum.t)}</td><td>${fmt(R.cum.q)}</td><td>${fmt(R.cum.e)}</td><td class="it">${fmt(R.cum.sum)}</td><td></td></tr></tbody></table></div>`;
    // расходы с Б/Ч
    $("rpBc").innerHTML=(R.bc.length?`<div class="rp-bcl">${R.bc.map(b=>`<div class="rp-bci"><span class="dot" style="background:${pointColor(b.p)}"></span><span class="n" title="${esc(b.n)}">${esc(b.n)}</span><span class="num">${fmt(b.a)}</span></div>`).join("")}</div>`:`<div class="empty" style="margin-top:0">Расходов с Б/Ч в этот день нет</div>`)
      +`<div class="rp-sum"><div><span>За день</span><b>${fmt(R.bcSum)}</b></div><div><span>За месяц</span><b>${fmt(R.cum.bc)}</b></div></div>`;
    renderReportManual(R,opt);
  }
  function rpField(k,label,prev,ph){const r=repDocs[rpDay]||{},v=r[k];
    return `<label class="rp-fld"><span>${label}</span><input class="rp-in${v==null?" empty":""}" data-rpf="${k}" inputmode="decimal" autocomplete="off" placeholder="${ph||"0"}" value="${v==null?"":fmt2(v)}">
      <span class="rp-hint">${prev?`${prev.label} <span class="num">${fmt2(prev.v)}</span>${v==null||Math.abs(v-prev.v)>0.004?`<button type="button" class="rp-link" data-rpfill="${k}" data-v="${prev.v}">Подставить</button>`:""}`:""}</span></label>`}
  function renderReportManual(R,opt){
    opt=opt||{};
    if(!opt.force&&rpEditing&&rpBankFor===rpDay)return;
    const r=repDocs[rpDay]||{};
    if(!opt.keep||rpBankFor!==rpDay||!rpBank)rpBank=(Array.isArray(r.bank)?r.bank:[]).map(b=>({n:b.n||"",a:b.a==null?null:+b.a}));
    rpBankFor=rpDay;
    const pe=rpPrevDoc(rpDay,"rsEnd"),pgc=rpPrevDoc(rpDay,"grossCash"),pgn=rpPrevDoc(rpDay,"grossNon");
    const lab=x=>x?`Конец ${dShort(x.d)}:`:"";
    let h=`<div class="rp-fields">${rpField("rsStart","Р/с на начало дня",pe?{label:lab(pe),v:pe.v}:null)}${rpField("rsEnd","Р/с на конец дня",null)}</div>`;
    if(r.rsStart!=null&&r.rsEnd!=null){const dlt=r.rsEnd-r.rsStart;h+=`<div class="rp-delta"><span>Изменение за день</span><b style="color:${dlt>=0?"var(--plus)":"var(--minus)"}">${dlt>=0?"+":""}${fmt2(dlt)}</b></div>`}
    if(pe&&r.rsStart!=null&&Math.abs(r.rsStart-pe.v)>0.004)h+=`<div class="rp-warn">Начало дня не совпадает с концом ${dShort(pe.d)} (<span class="nw">${fmt2(pe.v)}</span>) — разница <span class="nw">${fmt2(r.rsStart-pe.v)}</span>. Проверьте выписку.</div>`;
    const freq={};Object.values(repDocs).forEach(x=>(Array.isArray(x.bank)?x.bank:[]).forEach(b=>{const n=String(b.n||"").trim();if(!n)return;const k=normS(n);(freq[k]||(freq[k]={n:n.charAt(0).toUpperCase()+n.slice(1),c:0})).c++}));
    const used=new Set(rpBank.map(b=>normS(b.n)));
    const chips=Object.entries(freq).filter(([k])=>!used.has(k)).sort((a,b)=>b[1].c-a[1].c).slice(0,5).map(([,v])=>v.n);
    const bankSum=rpBank.reduce((a,b)=>a+(+b.a||0),0);
    h+=`<div class="rp-sub"><h3>Расходы с р/с</h3><span class="rp-saved" id="rpSaved">Сохранено</span></div>
      <div class="rp-rows" id="rpRows">${rpBank.map((b,j)=>`<div class="rp-row"><input data-bn="${j}" value="${esc(b.n)}" placeholder="Название, например: комиссия банка" autocomplete="off" aria-label="Название расхода"><input class="rp-in" data-ba="${j}" inputmode="decimal" value="${b.a==null?"":fmt2(b.a)}" placeholder="Сумма" autocomplete="off" aria-label="Сумма"><button type="button" class="rp-x" data-bdel="${j}" title="Удалить" aria-label="Удалить расход">×</button></div>`).join("")||`<div class="empty" style="margin-top:0">Расходов со счёта в этот день нет</div>`}</div>
      <div class="rp-adds"><button type="button" class="sec rp-add" data-badd="">+ Добавить расход</button>${chips.map(n=>`<button type="button" class="rp-chip" data-badd="${esc(n)}">${esc(n)}</button>`).join("")}</div>
      <div class="rp-sum"><div><span>Итого за день</span><b>${fmt2(bankSum)||"0"}</b></div><div><span>За месяц</span><b>${fmt2((R?R.cum.bank-R.bankSum:0)+bankSum)||"0"}</b></div></div>`;
    $("rpRs").innerHTML=h;
    const gx=rpGNmap()[rpDay];const gAuto=rpDay>=RP_GN_FROM;
    const gnBox=gAuto?`<div class="rp-fld"><span>Итог гросс безнал <em class="rp-autotag">считается сам</em></span><div class="rp-in rp-ro">${gx&&gx.v!=null?fmt2(gx.v):"—"}</div><span class="rp-hint">${gx&&gx.prev!=null?`вчера <span class="num">${fmt2(gx.prev)}</span> + терминал <span class="num">${fmt(gx.t)}</span> + QR <span class="num">${fmt(gx.q)}</span>`:"нет гросса за прошлый день"}</span></div>`:rpField("grossNon","Итог гросс безнал",pgn?{label:lab(pgn),v:pgn.v}:null);
    let g=`<div class="rp-fields">${rpField("grossCash","Итог гросс нал",pgc?{label:lab(pgc),v:pgc.v}:null)}${gnBox}</div>`;
    const dc=r.grossCash!=null&&pgc?r.grossCash-pgc.v:null,dn=gAuto?(gx&&gx.prev!=null?gx.t+gx.q:null):(r.grossNon!=null&&pgn?r.grossNon-pgn.v:null);
    if(dc!=null||dn!=null)g+=`<div class="rp-sum"><div><span>Нал за день</span><b>${dc==null?"—":(dc>0?"+":"")+(fmt2(dc)||"0")}</b></div><div><span>Безнал за день</span><b>${dn==null?"—":(dn>0?"+":"")+(fmt2(dn)||"0")}</b></div></div>`;
    $("rpGr").innerHTML=g;
  }
  function rpFlash(t,bad){const el=$("rpSaved");if(el){el.textContent=t||"Сохранено";el.style.color=bad?"var(--minus)":"";el.classList.add("on");clearTimeout(rpSavedT);rpSavedT=setTimeout(()=>el.classList.remove("on"),1800)}if(bad)rpMsg(t,true)}
  function rpMsg(t,bad){const m=$("rpMsg");m.textContent=t||"";m.style.color=bad?"var(--minus)":"var(--plus)";clearTimeout(rpMsg._t);if(t)rpMsg._t=setTimeout(()=>m.textContent="",7000)}
  async function rpSave(d,patch){
    const cur=Object.assign({date:d,rsStart:null,rsEnd:null,grossCash:null,grossNon:null,bank:[],tr:{}},repDocs[d]||{},patch,{updatedAt:Date.now()});delete cur.id;
    repDocs[d]=cur;
    try{if(mode==="db")await db.doc("report/"+d).set(cur);else lsSet("report",repDocs);rpFlash("Сохранено")}
    catch(e){rpFlash("Не сохранилось — проверьте связь",true)}
  }
  const rpBankClean=()=>rpBank.filter(b=>String(b.n||"").trim()||b.a).map(b=>({n:String(b.n||"").trim(),a:b.a==null?0:b.a}));
  $("page-report").addEventListener("click",e=>{
    const m=e.target.closest("[data-rm]");if(m){rpMonth=m.dataset.rm;rpDay="";rpPicked=false;rpScrolled="";renderReport();return}
    const d=e.target.closest("[data-rd]");if(d){rpDay=d.dataset.rd;rpPicked=true;renderReport();return}
    const f=e.target.closest("[data-rpfill]");if(f){rpSave(rpDay,{[f.dataset.rpfill]:+f.dataset.v}).then(()=>renderReport({force:1,keep:1}));return}
    const a=e.target.closest("[data-badd]");if(a){if(!rpBank||rpBankFor!==rpDay)rpBank=[];rpBank.push({n:a.dataset.badd,a:null});const j=rpBank.length-1;
      renderReportManual(rpCalc(rpMonth,true).rows.find(x=>x.d===rpDay),{force:1,keep:1});
      const inp=$("rpRs").querySelector(a.dataset.badd?`[data-ba="${j}"]`:`[data-bn="${j}"]`);if(inp)inp.focus();return}
    const x=e.target.closest("[data-bdel]");if(x){rpBank.splice(+x.dataset.bdel,1);rpSave(rpDay,{bank:rpBankClean()}).then(()=>renderReport({force:1,keep:1}));return}
  });
  $("page-report").addEventListener("change",e=>{
    const t=e.target;
    if(t.dataset.rpf){const v=rpNum(t.value);t.value=v==null?"":fmt2(v);rpSave(rpDay,{[t.dataset.rpf]:v}).then(()=>renderReport());return}
    if(t.dataset.bn!=null){rpBank[+t.dataset.bn].n=t.value.trim();rpSave(rpDay,{bank:rpBankClean()});return}
    if(t.dataset.ba!=null){const v=rpNum(t.value);t.value=v==null?"":fmt2(v);rpBank[+t.dataset.ba].a=v;rpSave(rpDay,{bank:rpBankClean()}).then(()=>renderReport());return}
  });
  $("page-report").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.matches(".rp-man input")){e.preventDefault();e.target.blur()}});
  $("page-report").addEventListener("focusin",e=>{if(e.target.closest&&e.target.closest(".rp-man"))rpEditing=true});
  $("page-report").addEventListener("focusout",e=>{if(!e.target.closest||!e.target.closest(".rp-man"))return;const to=e.relatedTarget;if(to&&to.closest&&to.closest(".rp-man"))return;rpEditing=false;setTimeout(()=>{if(!rpEditing)renderReport({force:1})},150)});
  // ---------- выгрузка в формате «Отчёт оптика» ----------
  let rpXL=null;
  function rpLoadXL(){if(window.ExcelJS)return Promise.resolve();if(rpXL)return rpXL;rpXL=new Promise((res,rej)=>{const sc=document.createElement("script");sc.src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";sc.onload=res;sc.onerror=()=>{rpXL=null;rej(new Error("load"))};document.head.appendChild(sc)});return rpXL}
  const rpAllDays=()=>rpMonths().flatMap(m=>rpMonthDays(m,false));
  let rpSel=null;
  async function rpBuildDays(list){
    await rpLoadXL();
    const sel=new Set(list),days=[...sel].sort(),Mc={};
    [...new Set(days.map(d=>d.slice(0,7)))].forEach(m=>Mc[m]=rpCalc(m,false));
    const wb=new ExcelJS.Workbook();wb.creator="Saif-Optics";wb.created=new Date();wb.calcProperties.fullCalcOnLoad=true;
    const F={name:"Calibri",size:10},FB={name:"Calibri",size:10,bold:true},TH={style:"thin",color:{argb:"FF000000"}},BOX={top:TH,left:TH,bottom:TH,right:TH};
    const FILL={type:"pattern",pattern:"solid",fgColor:{argb:"FFD9E2F3"}},N0="#,##0",N2="#,##0.00";
    const cols=["B","C","D","E"],keys=["c","t","q","e"];
    const num=v=>String(Math.round((+v||0)*100)/100);
    const fit=list=>list.length<=13?list:list.slice(0,12).concat([{n:`Прочие расходы (${list.length-12})`,a:list.slice(12).reduce((x,y)=>x+(+y.a||0),0)}]);
    let made=0;
    for(let di=days.length-1;di>=0;di--){
      const d=days[di],M=Mc[d.slice(0,7)],i=M.days.indexOf(d);if(i<0)continue;
      const R=M.rows[i],r=R.r,P=i>0?M.rows[i-1]:null,linked=P&&sel.has(P.d);
      // если прошлый день месяца тоже в файле — ссылка на его лист, иначе — готовая сумма прошлых дней
      const ref=(cell,prevVal)=>linked?`'${dLong(P.d)}'!${cell}+`:P?`${num(prevVal)}+`:"";
      const n=M.pts.length,o=n-3,rT=5+n,rC=rT+1,rH1=11+o,rS1=25+o,rR1=27+o,rR2=28+o,rH2=30+o,rS2=44+o,rG1=46+o,rG2=47+o,last=4+n;
      const ws=wb.addWorksheet(dLong(d),{properties:{defaultRowHeight:15.75},pageSetup:{paperSize:9,orientation:"portrait",fitToPage:true,fitToWidth:1,fitToHeight:0}});
      ws.getColumn(1).width=28.38;for(let k=2;k<=7;k++)ws.getColumn(k).width=k===7?15:k===3?16:13.5;
      const put=(addr,v,o2)=>{o2=o2||{};const cl=ws.getCell(addr);if(v!==undefined)cl.value=v;cl.font=o2.b?FB:F;if(o2.f)cl.numFmt=o2.f;if(o2.al)cl.alignment={horizontal:o2.al,vertical:"middle"};if(o2.box!==false)cl.border=BOX;if(o2.fill)cl.fill=FILL;return cl};
      put("A2","Дата",{b:1,al:"center",box:false});
      const [yy,mm,dd]=d.split("-").map(Number);put("B2",new Date(Date.UTC(yy,mm-1,dd)),{f:"dd.mm.yyyy",al:"right",box:false});
      ["наим-е отд","Б/Ч","Терминал","QR","Перечисления","Итого","с начала месяца"].forEach((t,k)=>put(String.fromCharCode(65+k)+"4",t,{b:1,al:"center"}));
      M.pts.forEach((pt,j)=>{const rr=5+j,x=R.pts[pt];put("A"+rr,pt,{al:"center"});
        cols.forEach((cc,k)=>put(cc+rr,x[keys[k]],{f:N0,al:"right"}));
        put("F"+rr,{formula:`SUM(B${rr}:E${rr})`,result:x.sum},{b:1,f:N0,al:"right"});
        put("G"+rr,{formula:`${ref("G"+rr,P?P.cum.pts[pt]||0:0)}F${rr}`,result:R.cum.pts[pt]||0},{b:1,f:N0,al:"right"})});
      put("A"+rT,"Итого:",{b:1,al:"center"});
      cols.forEach((cc,k)=>put(cc+rT,{formula:`SUM(${cc}5:${cc}${last})`,result:R.tot[keys[k]]},{b:1,f:N0,al:"right"}));
      put("F"+rT,{formula:`SUM(F5:F${last})`,result:R.tot.sum},{b:1,f:N0,al:"right"});put("G"+rT,null,{fill:1});
      put("A"+rC,"c начала месяца",{b:1,al:"center"});
      cols.forEach((cc,k)=>put(cc+rC,{formula:`${ref(cc+rC,P?P.cum[keys[k]]:0)}${cc}${rT}`,result:R.cum[keys[k]]},{b:1,f:N0,al:"right"}));
      put("F"+rC,{formula:`SUM(B${rC}:E${rC})`,result:R.cum.sum},{b:1,f:N0,al:"right"});
      put("G"+rC,{formula:`SUM(G5:G${last})`,result:R.cum.sum},{b:1,f:N0,al:"right",fill:1});
      const block=(rh,rs,title,list,sum,mon,prevMon)=>{
        put("A"+rh,"наименование",{b:1,al:"center"});put("B"+rh,title,{b:1,al:"center"});put("C"+rh,"расходы за месяц",{b:1,al:"center"});
        const L=fit(list);for(let k=0;k<13;k++){const rr=rh+1+k,it=L[k];put("A"+rr,it?it.n:null,{al:"left"});put("B"+rr,it?(+it.a||0):null,{f:N2,al:"right"});put("C"+rr,null,{f:N2})}
        put("A"+rs,"Итого расходы",{b:1});put("B"+rs,{formula:`SUM(B${rh+1}:B${rh+13})`,result:sum},{b:1,f:N2,al:"right"});
        put("C"+rs,{formula:`${ref("C"+rs,prevMon)}B${rs}`,result:mon},{b:1,f:N2,al:"right"})};
      block(rH1,rS1,"расходы",R.bank,R.bankSum,R.cum.bank,P?P.cum.bank:0);
      put("A"+rR1,"р/с на начало дня",{b:1});put("B"+rR1,r.rsStart==null?null:r.rsStart,{b:1,f:N2,al:"right"});
      put("A"+rR2,"р/с на конец дня",{b:1});put("B"+rR2,r.rsEnd==null?null:r.rsEnd,{b:1,f:N2,al:"right"});
      block(rH2,rS2,"расходы с Б/Ч",R.bc,R.bcSum,R.cum.bc,P?P.cum.bc:0);
      put("A"+rG1,"итог гросс нал",{b:1});put("B"+rG1,r.grossCash==null?null:r.grossCash,{b:1,f:N2,al:"right"});
      put("A"+rG2,"итог гросс безнал",{b:1});{const gv=d>=RP_GN_FROM?rpGN(d):r.grossNon;put("B"+rG2,gv==null?null:gv,{b:1,f:N2,al:"right"})}
      for(let k=1;k<=rG2;k++)ws.getRow(k).height=15.75;
      made++;
    }
    return {buf:await wb.xlsx.writeBuffer(),count:made,first:days[0],last:days[days.length-1]};
  }
  async function rpExport(list,btn,allMode){
    if(!list.length){rpMsg("Не выбрано ни одного дня.",true);return}
    if(!dl){rpMsg("Скачивание недоступно в этом окне.",true);return}
    btn.disabled=true;btn.classList.add("busy");rpMsg("Собираю файл…");
    try{const x=await rpBuildDays(list);
      const fn=`Отчёт оптика ${allMode?"(все дни) ":""}${dShort(x.first)}–${dLong(x.last)}.xlsx`;
      const res=await dl.save({filename:fn,data:new Blob([x.buf])});
      rpMsg(res&&res.status==="saved"?`Файл сохранён: ${x.count} ${pl(x.count,"лист","листа","листов")}`:"")}
    catch(e){if(e&&e.code==="declined")rpMsg("");else rpMsg(e&&e.message==="load"?"Не загрузился модуль Excel. Проверьте интернет и повторите.":e&&e.code==="rate_limited"?"Окно сохранения уже открыто.":"Не удалось собрать файл.",true)}
    finally{btn.disabled=false;btn.classList.remove("busy");rpRenderPickInfo()}
  }
  $("rpXlsx").onclick=()=>rpExport(rpAllDays(),$("rpXlsx"),true);
  // ---------- выбор дней ----------
  function rpRenderPickInfo(){if(!rpSel)return;const n=rpSel.size;$("rpPickInfo").innerHTML=n?`Выбрано: <b>${n} ${pl(n,"день","дня","дней")}</b> · в файле будет ${n} ${pl(n,"лист","листа","листов")}`:"Ничего не выбрано";$("rpPickGo").disabled=!n}
  function rpRenderPick(){
    const all=rpAllDays();if(!rpSel)rpSel=new Set(all.filter(d=>d.startsWith(rpMonth)));
    [...rpSel].forEach(d=>{if(!all.includes(d))rpSel.delete(d)});
    const ms=[...new Set(all.map(d=>d.slice(0,7)))].reverse();
    $("rpPickBody").innerHTML=ms.map(m=>{const ds=all.filter(d=>d.startsWith(m)),on=ds.filter(d=>rpSel.has(d)).length;
      return `<div class="rp-pm"><div class="rp-pmh"><b>${RP_MF[+m.slice(5,7)-1]} ${m.slice(0,4)}</b><span class="cnt">${on} из ${ds.length}</span><span class="sp"></span><button type="button" class="rp-lnk" data-pkm="${m}" data-v="1">весь месяц</button><button type="button" class="rp-lnk" data-pkm="${m}" data-v="0">убрать месяц</button></div>
        <div class="rp-pchips">${ds.map(d=>`<button type="button" class="rp-pc" data-pkd="${d}" aria-pressed="${rpSel.has(d)}" title="${dLong(d)}"><b>${+d.slice(8)}</b><small>${RP_WD[pd(d).getDay()]}</small></button>`).join("")}</div></div>`}).join("")||`<div class="empty" style="margin-top:0">Дней с продажами пока нет</div>`;
    rpRenderPickInfo();
  }
  function rpPickOpen(open){const p=$("rpPick"),b=$("rpPickBtn");b.setAttribute("aria-expanded",open?"true":"false");
    if(open){p.classList.remove("closing");p.hidden=false;rpRenderPick()}
    else if(!p.hidden){const calm=matchMedia("(prefers-reduced-motion: reduce)").matches;if(calm){p.hidden=true;return}p.classList.add("closing");setTimeout(()=>{if(p.classList.contains("closing")){p.hidden=true;p.classList.remove("closing")}},240)}}
  $("rpPickBtn").onclick=()=>rpPickOpen($("rpPick").hidden||$("rpPick").classList.contains("closing"));
  $("rpPickClose").onclick=()=>rpPickOpen(false);
  $("rpPick").addEventListener("click",e=>{
    const d=e.target.closest("[data-pkd]");if(d){const k=d.dataset.pkd;rpSel.has(k)?rpSel.delete(k):rpSel.add(k);d.setAttribute("aria-pressed",rpSel.has(k));const m=k.slice(0,7),all=rpAllDays().filter(x=>x.startsWith(m));d.closest(".rp-pm").querySelector(".cnt").textContent=`${all.filter(x=>rpSel.has(x)).length} из ${all.length}`;rpRenderPickInfo();return}
    const m=e.target.closest("[data-pkm]");if(m){rpAllDays().filter(x=>x.startsWith(m.dataset.pkm)).forEach(x=>m.dataset.v==="1"?rpSel.add(x):rpSel.delete(x));rpRenderPick();return}
    const a=e.target.closest("[data-pk]");if(a){if(a.dataset.pk==="all")rpAllDays().forEach(x=>rpSel.add(x));else rpSel.clear();rpRenderPick();return}
  });
  $("rpPickGo").onclick=()=>rpExport([...rpSel],$("rpPickGo"),false);

  function renderAll(){
    C.fitW=0;
    if(tab==="kassa"||tab==="help")return;
    fillMonths();
    const r=rangeOf(filtered());
    $("filterInfo").textContent=(F.from||F.to)?`Показано: ${dLong(F.from||r.from)} — ${dLong(F.to||r.to)}`+(F.point!=="all"?` · ${F.point}`:"")+(F.cat!=="all"?` · ${F.cat}`:""):"Показаны все продажи";
    if(tab==="batch"){renderStockTab();return}
    if(tab==="plan"){renderPlan();return}
    if(tab==="home"){renderHome();return}
    if(tab==="report"){renderReport();return}
    renderSales();renderAnalytics();renderLens();
  }
  document.addEventListener("kassa-updated",()=>{if(tab==="analytics")renderAnalytics()});
  // ---------- фото кассы ----------
  function phMsg(t,bad){const m=$("phMsg");m.textContent=t;m.style.color=bad?"var(--minus)":"var(--plus)";clearTimeout(phMsg._t);phMsg._t=setTimeout(()=>m.textContent="",6000)}
  const AUTO="__auto";
  function fillPhPoint(){const v=$("phPoint").value||AUTO;$("phPoint").innerHTML=`<option value="${AUTO}"${v===AUTO?" selected":""}>Определит Claude</option>`+settings.points.map(p=>`<option${p===v?" selected":""}>${esc(p)}</option>`).join("")}
  async function compress(file){
    const bmp=await createImageBitmap(file,{imageOrientation:"from-image"});
    const k=Math.min(1,2400/Math.max(bmp.width,bmp.height));
    const cv=document.createElement("canvas");cv.width=Math.round(bmp.width*k);cv.height=Math.round(bmp.height*k);
    cv.getContext("2d").drawImage(bmp,0,0,cv.width,cv.height);
    return await new Promise((res,rej)=>cv.toBlob(b=>b?res(b):rej(new Error("toBlob")),"image/jpeg",0.88));
  }
  function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
  const ext=n=>(String(n).match(/\.([a-z0-9]+)$/i)||[,""])[1].toLowerCase();
  function kindOf(f){const e=ext(f.name);
    if(/^image\//.test(f.type)||["jpg","jpeg","png","webp","gif","heic","heif"].includes(e))return"image";
    if(e==="pdf"||f.type==="application/pdf")return"pdf";
    if(["xlsx","xls","xlsm"].includes(e))return"excel";
    if(e==="docx")return"word";
    if(e==="doc")return"doc";
    if(e==="csv")return"csv";
    if(e==="txt")return"text";
    return"";}
  // Excel и Word хранилище не принимает как есть: переводим в текст прямо в браузере, ничего не теряя из таблиц
  async function prepare(f,kind){
    if(kind==="image"){
      try{return{blob:await compress(f),type:"image/jpeg"}}catch(e){}
      // HEIC с iPhone: большинство браузеров не открывает его сами — переводим в JPG в браузере
      if(/hei[cf]$/i.test(f.name)||/hei[cf]/i.test(f.type)){
        try{
          let j;
          try{const m=await import("https://cdn.jsdelivr.net/npm/heic-to@1.5.2/dist/csp/heic-to.js");j=await m.heicTo({blob:f,type:"image/jpeg",quality:0.9})}
          catch(eM){if(typeof HeicTo==="undefined")await loadScript("https://cdn.jsdelivr.net/npm/heic-to@1.5.2/dist/iife/heic-to.js");j=await HeicTo({blob:f,type:"image/jpeg",quality:0.9})}
          try{return{blob:await compress(j),type:"image/jpeg"}}catch(e2){return{blob:j,type:"image/jpeg"}}
        }catch(e3){throw new Error("heic")}
      }
      if(["image/jpeg","image/png","image/webp","image/gif"].includes(f.type))return{blob:f,type:f.type};
      throw new Error("heic");
    }
    if(kind==="pdf")return{blob:f,type:"application/pdf"};
    if(kind==="csv")return{blob:new Blob([await f.text()],{type:"text/csv"}),type:"text/csv"};
    if(kind==="text")return{blob:new Blob([await f.text()],{type:"text/plain"}),type:"text/plain"};
    if(kind==="excel"){
      if(typeof XLSX==="undefined")throw new Error("xlsx");
      const wb=XLSX.read(await f.arrayBuffer(),{type:"array",cellDates:true});
      const txt=`Файл: ${f.name}\n`+wb.SheetNames.map(n=>`\n=== Лист: ${n} ===\n`+XLSX.utils.sheet_to_csv(wb.Sheets[n],{FS:";",blankrows:false})).join("\n");
      return{blob:new Blob([txt],{type:"text/plain"}),type:"text/plain"};
    }
    if(kind==="word"){
      if(typeof mammoth==="undefined")await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
      const r=await mammoth.extractRawText({arrayBuffer:await f.arrayBuffer()});
      return{blob:new Blob([`Файл: ${f.name}\n\n`+r.value],{type:"text/plain"}),type:"text/plain"};
    }
    throw new Error("type");
  }
  async function uploadFiles(files){
    if(!assets||mode!=="db"){phMsg("Загрузка файлов здесь недоступна.",true);return}
    const all=[...files];if(!all.length)return;
    const point=$("phPoint").value, date=$("phDate").value||iso(new Date()), note=$("phNote").value.trim();
    let ok=0;
    for(const f of all){
      const kind=kindOf(f);
      if(kind==="doc"){phMsg(`«${f.name}»: старый формат .doc не читается. Сохраните в Word как .docx или PDF.`,true);continue}
      if(!kind){phMsg(`«${f.name}»: такой формат не поддерживается. Подойдут фото, PDF, Excel, Word (.docx), CSV.`,true);continue}
      phMsg(`Загружаю ${ok+1} из ${all.length}: ${f.name}…`);
      let prep;
      try{prep=await prepare(f,kind)}
      catch(e){phMsg(e&&e.message==="heic"?`«${f.name}» не удалось перевести из HEIC. Попробуйте ещё раз или сохраните фото как JPG.`:`«${f.name}» не удалось прочитать.`,true);continue}
      try{
        const r=await assets.upload(prep.blob,{type:prep.type});
        await db.doc("photos/"+newId()).set({asset:r.id,name:f.name,kind,contentType:prep.type,point:point===AUTO?"":point,date,note,status:"new",uploadedAt:Date.now(),sizeBytes:r.sizeBytes});
        ok++;
      }catch(e){phMsg(e&&e.code==="quota_exceeded"?"Место для файлов закончилось. Удалите обработанные.":`Не удалось загрузить «${f.name}».`,true);return}
    }
    if(ok){phMsg(`Загружено файлов: ${ok}. Напишите Claude «внеси продажи с файлов».`);$("phNote").value=""}
  }
  $("phFile").addEventListener("change",()=>{uploadFiles($("phFile").files);$("phFile").value=""});
  const dz=$("phDrop");
  ["dragenter","dragover"].forEach(t=>dz.addEventListener(t,e=>{e.preventDefault();dz.classList.add("over")}));
  ["dragleave","drop"].forEach(t=>dz.addEventListener(t,e=>{e.preventDefault();dz.classList.remove("over")}));
  dz.addEventListener("drop",e=>{if(e.dataTransfer&&e.dataTransfer.files)uploadFiles(e.dataTransfer.files)});
  const KLBL={pdf:"PDF",excel:"Excel",word:"Word",csv:"CSV",text:"Текст"};
  function renderPhotos(){
    const list=[...photos].sort((a,b)=>(b.uploadedAt||0)-(a.uploadedAt||0));
    $("phEmpty").hidden=list.length>0;
    $("phList").innerHTML=list.length?`<ul class="phrows">`+list.map(p=>{
      const k=p.kind||"image", src="/_blob/"+esc(p.asset);
      const mine=sales.filter(x=>x.photo===p.id);const byP={};mine.forEach(x=>byP[x.point]=(byP[x.point]||0)+(+x.sum||0));
      const ptSum=Object.keys(byP).length?Object.entries(byP).map(([k,v])=>esc(k)+": "+fmt(v)).join(" · "):"";
      const pt=p.point||p.detectedPoint||Object.keys(byP).join(", ");
      return `<li><span class="kind">${k==="image"?"Фото":KLBL[k]||"Файл"}</span><span class="grow"><b>${pt?esc(pt):"точку определит Claude"} · ${dShort(p.date)}</b> <span class="srcs">${esc(p.name||"")}${ptSum?" · "+ptSum:""}</span></span>
      <span class="st ${p.status==="done"?"done":"new"}">${p.status==="done"?`Внесено${p.salesCount?": "+p.salesCount+" прод.":""}`:"Ждёт Claude"}</span>
      <a href="${src}" target="_blank" rel="noopener" class="srcs">открыть</a>${assets?`<button class="ghost del" type="button" data-pd="${esc(p.id)}">Удалить</button>`:""}</li>`}).join("")+`</ul>`:"";
    $("phList").querySelectorAll("[data-pd]").forEach(b=>b.onclick=async()=>{
      if(!b.dataset.c){b.dataset.c="1";b.textContent="Точно удалить?";b.style.color="var(--minus)";setTimeout(()=>{if(b.isConnected){delete b.dataset.c;b.textContent="Удалить";b.style.color=""}},3000);return}
      const p=photos.find(x=>x.id===b.dataset.pd);if(!p)return;
      try{await assets.delete(p.asset)}catch(e){}
      try{await db.doc("photos/"+p.id).delete()}catch(e){phMsg("Не удалось удалить файл.",true)}
    });
  }

  // импорт списка партии из Excel/CSV
  const COLRULES=[["cp",/покуп|постав|закуп|себест|вход|закупоч/],["p",/продаж|розн|цена/],["q",/кол-?во|колич|шт\b|^шт|остат|кол\./],["m",/модел/],["s",/артикул|sku|^код|штрих|баркод/],["n",/наимен|товар|назван|позици/],["g",/групп/],["c",/катег|^тип|вид товар/],["col",/цвет/],["pt",/^место|магазин|точк|филиал|локац/]];
  function mapHeader(row){const map={};row.forEach((v,i)=>{const t=normS(v);if(!t)return;for(const [k,re] of COLRULES){if(map[k]==null&&re.test(t)){map[k]=i;break}}});return map}
  function parseSheet(ws,opt){opt=opt||{};
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,blankrows:false,defval:null});
    let hi=-1,map=null;
    for(let i=0;i<Math.min(rows.length,25);i++){const m=mapHeader(rows[i]||[]);if(m.q!=null&&(m.m!=null||m.n!=null||m.s!=null)){hi=i;map=m;break}}
    if(hi<0)return {items:[],err:"Не нашёл строку заголовков: нужны столбцы с количеством и моделью, артикулом или наименованием."};
    const num=v=>{if(typeof v==="number")return v;const n=parseFloat(String(v==null?"":v).replace(/\s/g,"").replace(",","."));return isNaN(n)?0:n};
    const items=[];
    for(let i=hi+1;i<rows.length;i++){const r=rows[i]||[];const g=k=>map[k]!=null?r[map[k]]:null;
      const q=Math.round(num(g("q")));const m=g("m"),n=g("n"),s=g("s");
      if(q<0||!(m||n||s))continue;
      if(!q&&!(opt.zero&&(num(g("cp"))||num(g("p")))))continue;
      if(/^итог|^всего/i.test(String(n||m||s)))continue;
      const it={k:"i"+items.length,q};
      if(m!=null&&m!=="")it.m=String(m).trim();if(n!=null&&n!=="")it.n=String(n).trim();if(s!=null&&s!=="")it.s=String(s).trim();
      ["g","c","col","pt"].forEach(k=>{const v=g(k);if(v!=null&&v!=="")it[k]=String(v).trim()});
      const p=Math.round(num(g("p"))),cp=Math.round(num(g("cp")));if(p)it.p=p;if(cp)it.cp=cp;
      items.push(it);
    }
    return {items,map};
  }
  $("bFile").addEventListener("change",async()=>{
    const f=$("bFile").files[0];$("bFile").value="";if(!f)return;
    if(typeof XLSX==="undefined"){bMsg("Модуль Excel не загрузился. Обновите страницу.",true);return}
    try{
      const wb=XLSX.read(await f.arrayBuffer(),{type:"array"});
      let best=null;wb.SheetNames.forEach(n=>{const r=parseSheet(wb.Sheets[n]);if(!best||r.items.length>best.items.length)best=Object.assign(r,{sheet:n})});
      if(!best||!best.items.length){bMsg(best&&best.err?best.err:"В файле не нашлось позиций с количеством.",true);$("bPrev").hidden=true;return}
      bPending={items:best.items,file:f.name,sheet:best.sheet,sheets:wb.SheetNames,wb};
      showPreview();
    }catch(e){bMsg("Не удалось прочитать файл. Сохраните его как .xlsx и попробуйте снова.",true)}
  });
  function showPreview(){
    const p=bPending;const Q=p.items.reduce((a,i)=>a+i.q,0);
    const sheetSel=p.sheets.length>1?`<label class="f" style="max-width:260px">Лист<select id="bSheet">${p.sheets.map(n=>`<option${n===p.sheet?" selected":""}>${esc(n)}</option>`).join("")}</select></label>`:"";
    $("bPrev").hidden=false;
    $("bPrev").innerHTML=`${sheetSel}<p class="note" style="margin:10px 0">Файл «${esc(p.file)}», лист «${esc(p.sheet)}»: <b>${fmt(p.items.length)} позиций, ${fmt(Q)} шт.</b> Первые строки:</p>
      <div class="tbl"><table><thead><tr><th>Модель / наименование</th><th>Цвет</th><th>Группа</th><th class="r">Кол-во</th><th class="r">Цена продажи</th><th class="r">Цена покупки</th></tr></thead><tbody>${p.items.slice(0,6).map(i=>`<tr><td>${esc(i.m||i.n||i.s)}</td><td>${esc(i.col||"")}</td><td>${esc(i.g||i.c||"")}</td><td class="r num">${fmt(i.q)}</td><td class="r num">${i.p?fmt(i.p):"—"}</td><td class="r num">${i.cp?fmt(i.cp):"—"}</td></tr>`).join("")}</tbody></table></div>
      <div class="actions" style="margin-top:12px"><button type="button" id="bSave">Сохранить партию</button><button type="button" class="sec" id="bCancel">Отмена</button></div>`;
    if($("bSheet"))$("bSheet").onchange=()=>{const r=parseSheet(p.wb.Sheets[$("bSheet").value]);if(!r.items.length){bMsg(r.err||"На этом листе нет позиций.",true);return}p.items=r.items;p.sheet=$("bSheet").value;showPreview()};
    $("bCancel").onclick=()=>{bPending=null;$("bPrev").hidden=true;bMsg("")};
    $("bSave").onclick=saveBatch;
    bMsg("");
  }
  async function saveBatch(){
    const p=bPending;if(!p)return;
    if(mode!=="db"){bMsg("Сохранение партии доступно только в опубликованной странице.",true);return}
    const doc={name:$("bName").value.trim()||p.file.replace(/\.[^.]+$/,""),date:$("bDate").value||iso(new Date()),file:p.file,createdAt:Date.now(),items:p.items};
    if(JSON.stringify(doc).length>240000){bMsg("Список слишком большой для одной партии. Разделите файл на 2 части и загрузите по очереди.",true);return}
    $("bSave").disabled=true;
    try{const id=newId();await db.doc("batches/"+id).set(doc);bSelId=id;bPending=null;$("bPrev").hidden=true;$("bName").value="";bMsg(`Партия сохранена: ${fmt(doc.items.length)} позиций.`)}
    catch(e){bMsg("Не удалось сохранить партию. Попробуйте ещё раз.",true);$("bSave").disabled=false}
  }


  // ===================== выгрузка =====================
  const expMsg=(t,b)=>flash("expMsg",t,b), anMsg=(t,b)=>flash("anMsg",t,b), lnMsg=(t,b)=>flash("lnMsg",t,b);
  const periodTxt=()=>{const r=rangeOf(filtered());return `Период ${dLong(r.from)} — ${dLong(r.to)}`+(F.point!=="all"?` · ${F.point}`:"")+(F.cat!=="all"?` · ${F.cat}`:"")+` · выгружено ${SaifXL.today()}`};
  const fname=(pre,ext)=>{const r=rangeOf(filtered());return `${pre}_${r.from}_${r.to}${F.point!=="all"?"_"+F.point:""}.${ext}`};
  const saleRow=s=>{const py=payOf(s);const r={d:dLong(s.date),wd:WD[wdIdx(s.date)],p:s.point,ch:s.check||"",c:s.cat,pr:s.product,q:+s.qty||0,pc:+s.price||0,ds:discOf(s),sm:+s.sum||0,src:s.photo?"С файла":"Вручную"};PAYS.forEach((p,i)=>r["y"+i]=py[p]||0);return r};
  const sortedFiltered=()=>[...filtered()].sort((x,y)=>x.date.localeCompare(y.date)||settings.points.indexOf(x.point)-settings.points.indexOf(y.point)||String(x.check||"").localeCompare(String(y.check||""),undefined,{numeric:true})||(x.createdAt||0)-(y.createdAt||0));
  $("expCsv").onclick=async()=>{
    const list=sortedFiltered();if(!list.length){expMsg("Нет данных за выбранный период.",true);return}
    const head=["Дата","День","Точка","Чек","Категория","Товар","Кол-во","Цена","Скидка","Оплачено"].concat(PAYS).concat(["Источник"]);
    const q=v=>{const s=String(v);return /[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
    const rows=list.map(saleRow).map(r=>[r.d,r.wd,r.p,r.ch,r.c,r.pr,r.q,r.pc,r.ds,r.sm].concat(PAYS.map((p,i)=>r["y"+i])).concat([r.src]));
    const csv="﻿"+[head.join(";")].concat(rows.map(r=>r.map(q).join(";"))).join("\r\n");
    if(!dl){expMsg("Выгрузка недоступна в этом окне.",true);return}
    try{const res=await dl.save({filename:fname("prodazhi","csv"),data:csv});if(res&&res.status==="saved")expMsg("Файл сохранён")}catch(e){if(!(e&&e.code==="declined"))expMsg("Не удалось выгрузить файл.",true)}
  };
  function periodSheet(g,list){
    const m={};
    list.forEach(s=>{const k=periodKey(s.date,g);const o=m[k]||(m[k]={tot:0,n:0,u:0,ch:new Set()});o[s.point]=(o[s.point]||0)+(+s.sum||0);o.tot+=+s.sum||0;o.n++;o.u+=+s.qty||0;o.ch.add(checkKey(s))});
    const pts=settings.points;
    const rows=Object.keys(m).sort().map(k=>{const r={per:periodLabel(k,g)+(g==="day"?" ("+WD[wdIdx(k)]+")":"")};pts.forEach((p,i)=>r["p"+i]=m[k][p]||0);r.tot=m[k].tot;r.ck=m[k].ch.size;r.u=m[k].u;r.avg=Math.round(m[k].tot/m[k].ch.size);return r});
    const total={per:"Итого",tot:rows.reduce((a,r)=>a+r.tot,0),ck:rows.reduce((a,r)=>a+r.ck,0),u:rows.reduce((a,r)=>a+r.u,0)};pts.forEach((p,i)=>total["p"+i]=rows.reduce((a,r)=>a+r["p"+i],0));total.avg=total.ck?Math.round(total.tot/total.ck):0;
    const nm=g==="day"?"По дням":g==="week"?"По неделям":"По месяцам";
    return {name:nm,title:"Выручка "+nm.toLowerCase(),subtitle:periodTxt(),columns:[{header:g==="day"?"День":g==="week"?"Неделя":"Месяц",key:"per",type:"text",width:18}].concat(pts.map((p,i)=>({header:p+", сум",key:"p"+i,type:"money"}))).concat([{header:"Итого, сум",key:"tot",type:"money"},{header:"Чеков",key:"ck",type:"int",width:9},{header:"Единиц",key:"u",type:"int",width:9},{header:"Ср. чек, сум",key:"avg",type:"money"}]),rows,total};
  }
  $("expXlsx").onclick=()=>{
    const list=sortedFiltered();if(!list.length){expMsg("Нет данных за выбранный период.",true);return}
    const rows=list.map(saleRow);const tot=rows.reduce((a,r)=>a+r.sm,0);
    const ex=expFiltered(), dc=dayCashRows(list,ex).reverse();
    const dcRows=dc.map(o=>{const r={d:dLong(o.d),p:o.p,tot:o.tot,e:o.exp,c:o.cash,a:o.after,k:o.kassa?"в кассу":"на точке"};PAYS.forEach((p,i)=>r["y"+i]=o.pay[p]||0);return r});
    const T=(arr,k)=>arr.reduce((a,r)=>a+(+r[k]||0),0);
    const gm={};list.forEach(s=>{const k=s.cat+"|"+s.product;const o=gm[k]||(gm[k]={c:s.cat,pr:s.product,u:0,r:0,n:0});o.u+=+s.qty||0;o.r+=+s.sum||0;o.n++});
    const prod=Object.values(gm).sort((a,b)=>b.r-a.r).map(o=>Object.assign(o,{avg:o.u?Math.round(o.r/o.u):0}));
    const payCols=PAYS.map((p,i)=>({header:p+", сум",key:"y"+i,type:"money",width:14}));
    const dcTotal={d:"Итого",tot:T(dcRows,"tot"),e:T(dcRows,"e"),a:T(dcRows,"a")};PAYS.forEach((p,i)=>dcTotal["y"+i]=T(dcRows,"y"+i));
    const exRows=[...ex].sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(e=>({d:dLong(e.date),p:e.branch,n:String(e.name).replace(/^\S+\s+(за|на)\s+/i,""),a:typeof e.fact==="number"?e.fact:+e.amount||0,k:KASSA_POINTS.includes(e.branch)?"да":"нет"}));
    const rT={d:"Итого",q:T(rows,"q"),ds:T(rows,"ds"),sm:tot};PAYS.forEach((p,i)=>rT["y"+i]=T(rows,"y"+i));
    SaifXL.save({sheets:[
      {name:"Продажи",title:"Журнал продаж",subtitle:periodTxt(),columns:[{header:"Дата",key:"d",type:"text",width:12},{header:"День",key:"wd",type:"text",width:6},{header:"Точка",key:"p",type:"text",width:11},{header:"Чек",key:"ch",type:"text",width:7},{header:"Категория",key:"c",type:"text",width:18},{header:"Товар",key:"pr",type:"text",width:34},{header:"Кол-во",key:"q",type:"int",width:8},{header:"Цена, сум",key:"pc",type:"money",width:13},{header:"Скидка, сум",key:"ds",type:"money",width:12},{header:"Оплачено, сум",key:"sm",type:"money",width:14}].concat(payCols).concat([{header:"Источник",key:"src",type:"text",width:10}]),rows,total:rT},
      {name:"Касса дня",title:"Касса дня по точкам",subtitle:periodTxt()+" · Б/Ч Премиума и Яшнабада идёт в кассу",columns:[{header:"Дата",key:"d",type:"text",width:12},{header:"Точка",key:"p",type:"text",width:11}].concat(payCols).concat([{header:"Итого, сум",key:"tot",type:"money"},{header:"Расходы дня, сум",key:"e",type:"money",width:15},{header:"Б/Ч после расходов, сум",key:"a",type:"money",width:18},{header:"Куда Б/Ч",key:"k",type:"text",width:10}]),rows:dcRows,total:dcTotal},
      {name:"Расходы дня",title:"Расходы дня",subtitle:periodTxt(),columns:[{header:"Дата",key:"d",type:"text",width:12},{header:"Точка",key:"p",type:"text",width:11},{header:"Статья",key:"n",type:"text",width:28},{header:"Сумма, сум",key:"a",type:"money"},{header:"В кассе",key:"k",type:"text",width:9}],rows:exRows,total:{d:"Итого",a:T(exRows,"a")}},
      periodSheet("day",list),periodSheet("week",list),periodSheet("month",list),
      {name:"По товарам",title:"Продажи по товарам",subtitle:periodTxt(),columns:[{header:"Категория",key:"c",type:"text",width:18},{header:"Товар",key:"pr",type:"text",width:38},{header:"Единиц",key:"u",type:"int",width:9},{header:"Выручка, сум",key:"r",type:"money",width:16},{header:"Позиций",key:"n",type:"int",width:9},{header:"Ср. цена ед., сум",key:"avg",type:"money",width:16}],rows:prod,total:{c:"Итого",u:T(prod,"u"),r:tot,n:list.length}}
    ]},fname("prodazhi","xlsx"),expMsg);
  };
  $("anXlsx").onclick=()=>{
    const list=filtered();if(!list.length){anMsg("Нет данных за выбранный период.",true);return}
    const a=agg(list), pv=prevList(), pa=pv?agg(pv.list):null, r=rangeOf(list), ex=expFiltered(), mg=marginOf(list), pm=pv?marginOf(pv.list):null;
    const ch=(c,p)=>p?(c-p)/p:null;const k=(n,c,p)=>({n,c,p:p==null?null:p,d:p==null?null:ch(c,p)});
    const expS=ex.reduce((x,e)=>x+(typeof e.fact==="number"?e.fact:+e.amount||0),0);
    const kp=[k("Выручка, сум",a.rev,pa&&pa.rev),k("Выручка в среднем за день, сум",Math.round(a.rev/r.days),pa?Math.round(pa.rev/r.days):null),k("Продаж (позиций)",a.n,pa&&pa.n),k("Чеков",a.checks,pa&&pa.checks),k("Проданных единиц",a.units,pa&&pa.units),k("Средний чек, сум",Math.round(a.avg),pa&&Math.round(pa.avg)),k("Средняя цена единицы, сум",Math.round(a.unitPrice),pa&&Math.round(pa.unitPrice)),k("Наличные (Б/Ч), сум",a.cash,pa&&pa.cash),k("Расходы дня, сум",expS,null),k("Скидки, сум",a.disc,pa&&pa.disc),k("Валовая прибыль, сум",mg.rev?Math.round(mg.gross):null,pm&&pm.rev?Math.round(pm.gross):null)];
    const grp=(key,l)=>{const m={};l.forEach(s=>{const kk=(typeof key==="function"?key(s):s[key])||"—";const o=m[kk]||(m[kk]={k:kk,r:0,n:0,u:0,ch:new Set()});o.r+=+s.sum||0;o.n++;o.u+=+s.qty||0;o.ch.add(checkKey(s))});return m};
    const withPrev=key=>{const g=grp(key,list),gp=pa?grp(key,pv.list):{};return Object.values(g).sort((x,y)=>y.r-x.r).map(o=>({k:o.k,r:o.r,n:o.n,u:o.u,ck:o.ch.size,sh:o.r/a.rev,avg:Math.round(o.r/o.ch.size),up:o.u?Math.round(o.r/o.u):0,pr:gp[o.k]?gp[o.k].r:null,d:gp[o.k]?ch(o.r,gp[o.k].r):null,m:marginOf(list.filter(s=>((typeof key==="function"?key(s):s[key])||"—")===o.k)).m}))};
    const pts=withPrev("point"),cats=withPrev("cat");
    const py={};list.forEach(s=>Object.entries(payOf(s)).forEach(([kk,v])=>py[kk]=(py[kk]||0)+v));const pays=PAYS.filter(p=>py[p]).map(p=>({k:p,r:py[p],sh:py[p]/a.rev}));
    let cum=0;const prods=Object.values(grp("product",list)).sort((x,y)=>y.r-x.r).map((o,i)=>{cum+=o.r;const sh=cum/a.rev;return {i:i+1,k:o.k,u:o.u,r:o.r,sh:o.r/a.rev,cs:sh,abc:sh<=0.8001?"A":sh<=0.95?"B":"C"}});
    const days=dayList(r),wdCount=[0,0,0,0,0,0,0];days.forEach(d=>wdCount[wdIdx(d)]++);
    const wdS=[0,0,0,0,0,0,0],wdN=[0,0,0,0,0,0,0];list.forEach(s=>{wdS[wdIdx(s.date)]+=+s.sum||0;wdN[wdIdx(s.date)]++});
    const wd=WD.map((w,i)=>({w,days:wdCount[i],r:wdS[i],n:wdN[i],avg:wdCount[i]?Math.round(wdS[i]/wdCount[i]):0}));
    const sub=periodTxt()+(pv?` · сравнение с ${dLong(pv.from)} — ${dLong(pv.to)}`:"");
    const cmpCols=[{header:"Прошлый период, сум",key:"pr",type:"money",width:18},{header:"Изменение",key:"d",type:"pct",width:11}];
    SaifXL.save({sheets:[
      {name:"Показатели",title:"Аналитика продаж — ключевые показатели",subtitle:sub,filter:false,columns:[{header:"Показатель",key:"n",type:"text",width:36},{header:"Текущий период",key:"c",type:"money",width:18},{header:"Прошлый период",key:"p",type:"money",width:18},{header:"Изменение",key:"d",type:"pct",width:12}],rows:kp,note:"Изменение: рост или падение к прошлому периоду такой же длины."},
      {name:"По точкам",title:"Точки",subtitle:sub,columns:[{header:"Точка",key:"k",type:"text",width:14},{header:"Выручка, сум",key:"r",type:"money",width:16},{header:"Доля",key:"sh",type:"pct",width:8},{header:"Чеков",key:"ck",type:"int",width:8},{header:"Единиц",key:"u",type:"int",width:8},{header:"Ср. чек, сум",key:"avg",type:"money"},{header:"Маржа",key:"m",type:"pct",width:8}].concat(cmpCols),rows:pts,total:{k:"Итого",r:a.rev,sh:1,ck:a.checks,u:a.units,avg:Math.round(a.avg),m:mg.m,pr:pa?pa.rev:null,d:pa?ch(a.rev,pa.rev):null}},
      {name:"По категориям",title:"Категории товаров",subtitle:sub,columns:[{header:"Категория",key:"k",type:"text",width:22},{header:"Выручка, сум",key:"r",type:"money",width:16},{header:"Доля",key:"sh",type:"pct",width:8},{header:"Единиц",key:"u",type:"int",width:8},{header:"Ср. цена ед., сум",key:"up",type:"money",width:16},{header:"Маржа",key:"m",type:"pct",width:8}].concat(cmpCols),rows:cats,total:{k:"Итого",r:a.rev,sh:1,u:a.units}},
      {name:"Товары ABC",title:"Товары по выручке и ABC-анализ",subtitle:sub,columns:[{header:"#",key:"i",type:"int",width:6},{header:"Товар",key:"k",type:"text",width:40},{header:"Единиц",key:"u",type:"int",width:9},{header:"Выручка, сум",key:"r",type:"money",width:16},{header:"Доля",key:"sh",type:"pct",width:8},{header:"Накопленная доля",key:"cs",type:"pct",width:12},{header:"Класс",key:"abc",type:"text",width:8}],rows:prods,total:{k:"Итого",u:a.units,r:a.rev,sh:1},note:"A — товары, дающие первые 80% выручки; B — следующие 15%; C — последние 5%."},
      {name:"Дни недели",title:"Выручка по дням недели",subtitle:sub,columns:[{header:"День",key:"w",type:"text",width:8},{header:"Таких дней",key:"days",type:"int",width:11},{header:"Выручка, сум",key:"r",type:"money",width:16},{header:"Позиций",key:"n",type:"int",width:9},{header:"В среднем за день, сум",key:"avg",type:"money",width:20}],rows:wd,total:{w:"Итого",days:r.days,r:a.rev,n:a.n}},
      {name:"Оплата",title:"Способы оплаты",subtitle:sub,columns:[{header:"Способ",key:"k",type:"text",width:16},{header:"Сумма, сум",key:"r",type:"money",width:16},{header:"Доля",key:"sh",type:"pct",width:8}],rows:pays,total:{k:"Итого",r:a.rev,sh:1}}
    ]},fname("analitika","xlsx"),anMsg);
  };
  $("lnXlsx").onclick=()=>{
    const {rows,list}=lensData();if(!list.length){lnMsg("Нет продаж линз за период.",true);return}
    const det=rows.sort((x,y)=>x.s.date.localeCompare(y.s.date)).map(x=>({d:dLong(x.s.date),p:x.s.point,pr:x.s.product,t:x.type,i:x.idx,c:x.coat,b:x.brand,q:+x.s.qty||0,pc:+x.s.price||0,sm:+x.s.sum||0}));
    const m={};rows.forEach(x=>{const k=x.kind+"|"+x.idx+"|"+x.coat;const o=m[k]||(m[k]={t:x.kind,i:x.idx,c:x.coat,u:0,r:0});o.u+=+x.s.qty||0;o.r+=+x.s.sum||0});
    const sum=Object.values(m).sort((a,b)=>b.u-a.u).map(o=>Object.assign(o,{avg:o.u?Math.round(o.r/o.u):0}));
    const T=(arr,k)=>arr.reduce((a,r)=>a+(+r[k]||0),0);
    const by=key=>{const g={};rows.forEach(x=>{const k=x[key]||"—";const o=g[k]||(g[k]={k,u:0,r:0});o.u+=+x.s.qty||0;o.r+=+x.s.sum||0});return Object.values(g).sort((a,b)=>b.u-a.u)};
    const simple=(name,title,key)=>({name,title,subtitle:periodTxt(),columns:[{header:title,key:"k",type:"text",width:22},{header:"Штук",key:"u",type:"int",width:9},{header:"Выручка, сум",key:"r",type:"money",width:16}],rows:by(key),total:{k:"Итого",u:T(det,"q"),r:T(det,"sm")}});
    SaifXL.save({sheets:[
      {name:"Виды линз",title:"Проданные линзы по видам",subtitle:periodTxt(),columns:[{header:"Вид",key:"t",type:"text",width:16},{header:"Индекс",key:"i",type:"text",width:10},{header:"Покрытие",key:"c",type:"text",width:20},{header:"Штук",key:"u",type:"int",width:8},{header:"Выручка, сум",key:"r",type:"money",width:16},{header:"Ср. цена, сум",key:"avg",type:"money",width:14}],rows:sum,total:{t:"Итого",u:T(sum,"u"),r:T(sum,"r")}},
      simple("По индексу","Индекс","idx"),simple("По покрытию","Покрытие","coat"),
      {name:"Все продажи линз",title:"Все продажи линз",subtitle:periodTxt(),columns:[{header:"Дата",key:"d",type:"text",width:12},{header:"Точка",key:"p",type:"text",width:11},{header:"Товар",key:"pr",type:"text",width:30},{header:"Вид",key:"t",type:"text",width:15},{header:"Индекс",key:"i",type:"text",width:9},{header:"Покрытие",key:"c",type:"text",width:18},{header:"Бренд",key:"b",type:"text",width:11},{header:"Штук",key:"q",type:"int",width:7},{header:"Цена, сум",key:"pc",type:"money",width:13},{header:"Оплачено, сум",key:"sm",type:"money",width:14}],rows:det,total:{d:"Итого",q:T(det,"q"),sm:T(det,"sm")}}
    ]},fname("linzy","xlsx"),lnMsg);
  };
  $("bXlsx").onclick=()=>{
    const b=curBatch();if(!b)return;
    const {items}=batchStats(b,bPt);const pts=bPt==="all"?settings.points:[bPt];
    const sub=`${b.name||"Партия"} · приход ${dLong(b.date)}`+(bPt!=="all"?` · ${bPt}`:"")+` · выгружено ${SaifXL.today()}`;
    const mk=i=>{const r={m:i.m||i.n||i.s,col:i.col||"",s:i.s&&i.s!==i.m?i.s:"",g:i.g||i.c||"",p:+i.p||null,cp:+i.cp||null,q:i.q,sold:i.sold,left:i.left,pct:i.pct,rev:i.rev,last:i.last?dLong(i.last):""};pts.forEach((p,k)=>r["p"+k]=i.byPt[p]||0);return r};
    const rows=[...items].sort((x,y)=>y.sold-x.sold).map(mk);
    const Tt=k=>rows.reduce((a,r)=>a+(+r[k]||0),0);
    const total={m:"Итого",q:Tt("q"),sold:Tt("sold"),left:Tt("left"),rev:Tt("rev"),pct:Tt("q")?Tt("sold")/Tt("q"):0};pts.forEach((p,k)=>total["p"+k]=Tt("p"+k));
    const gm={};items.forEach(i=>{const k=i.g||i.c||"Без группы";const o=gm[k]||(gm[k]={k,n:0,q:0,s:0,r:0});o.n++;o.q+=i.q;o.s+=i.sold;o.r+=i.rev});
    const groups=Object.values(gm).sort((x,y)=>y.s-x.s).map(o=>Object.assign(o,{l:o.q-o.s,pct:o.q?o.s/o.q:0}));
    const cols=[{header:"Модель / наименование",key:"m",type:"text",width:26},{header:"Цвет",key:"col",type:"text",width:9},{header:"Артикул",key:"s",type:"text",width:13},{header:"Группа",key:"g",type:"text",width:18},{header:"Цена продажи",key:"p",type:"money",width:13},{header:"Цена покупки",key:"cp",type:"money",width:13},{header:"Пришло, шт",key:"q",type:"int",width:10}].concat(pts.map((p,k)=>({header:"Продано "+p,key:"p"+k,type:"int",width:11}))).concat([{header:"Продано всего",key:"sold",type:"int",width:11},{header:"Осталось, шт",key:"left",type:"int",width:11},{header:"Продано, %",key:"pct",type:"pct",width:10},{header:"Выручка, сум",key:"rev",type:"money",width:15},{header:"Последняя продажа",key:"last",type:"text",width:13}]);
    SaifXL.save({sheets:[
      {name:"Товары партии",title:"Продажи товаров из новой партии",subtitle:sub,columns:cols,rows,total},
      {name:"На дозаказ",title:"Новая партия — на дозаказ",subtitle:sub+" · закончились или осталось ≤20%",columns:cols,rows:reorderList(items).map(mk)},
      {name:"По группам",title:"Новая партия по группам",subtitle:sub,columns:[{header:"Группа",key:"k",type:"text",width:26},{header:"Моделей",key:"n",type:"int",width:10},{header:"Пришло, шт",key:"q",type:"int",width:11},{header:"Продано, шт",key:"s",type:"int",width:11},{header:"Осталось, шт",key:"l",type:"int",width:11},{header:"Продано, %",key:"pct",type:"pct",width:10},{header:"Выручка, сум",key:"r",type:"money",width:15}],rows:groups,total:{k:"Итого",n:items.length,q:total.q,s:total.sold,l:total.left,pct:total.pct,r:total.rev}}
    ]},"partiya_"+(b.date||"")+".xlsx",bxMsg);
  };

  // ===================== старт =====================
  async function init(){
    ["phDate","dxDate","bDate","sDate","sDateIn"].forEach(id=>$(id).value=iso(new Date()));
    applyPreset("month");fillSelects();
    const h=(location.hash||"").replace("#","");setTab(PAGES.includes(h)?h:"home");
    const c=window.claude;
    if(c&&c.use){try{dl=await c.use("downloads")}catch(e){dl=null}}
    if(!dl){["exportBtns","anXlsx","lnXlsx","bXlsx","stXlsx","rpDlBox"].forEach(id=>$(id).hidden=true)}
    if(!c||!c.use){toLocal();return}
    try{db=await c.use("db")}catch(e){db=null}
    if(!db){toLocal();return}
    mode="db";$("salesStatus").textContent="Сохраняется автоматически";
    try{assets=await c.use("assets")}catch(e){assets=null}
    if(!assets){$("phUploader").hidden=true;phMsg("Загружать файлы может только владелец или редактор страницы.",true)}
    const docs=s=>s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));
    db.collection("photos").onSnapshot(s=>{photos=docs(s);renderPhotos()},()=>{});
    db.collection("sales").onSnapshot(s=>{if(mode!=="db")return;sales=docs(s);updateDatalist();renderAll();renderPhotos()},()=>{$("salesStatus").textContent="Нет связи с хранилищем"});
    db.collection("entries").onSnapshot(s=>{dayExp=docs(s).filter(e=>e.source==="day"&&e.type!=="inc");renderAll()},()=>{});
    db.collection("batches").onSnapshot(s=>{batches=docs(s);matcherCache=null;renderAll()},()=>{});
    db.collection("stock").onSnapshot(s=>{stockParts=docs(s);matcherCache=null;renderAll()},()=>{});
    db.collection("report").onSnapshot(s=>{repDocs={};s.docs.forEach(d=>{repDocs[d.id]=Object.assign({},d.data())});if(tab==="report")renderReport()},()=>{});
    db.collection("cashlog").onSnapshot(s=>{cashlog=docs(s);if(tab==="analytics")renderAnalytics()},()=>{});
    db.doc("settings/sales").onSnapshot(s=>{if(mode!=="db")return;if(s.exists){const d=s.data();if(Array.isArray(d.points)&&d.points.length)settings={points:d.points.slice(),cats:(Array.isArray(d.cats)&&d.cats.length?d.cats:DEF_CATS).slice(),plan:+d.plan||0}}fillSelects();renderAll()},()=>{});
    db.doc("settings/plan").onSnapshot(s=>{if(s.exists){const d=s.data();planCfg={months:d.months||{},sellers:Object.assign({},PL_DEF_SELLERS,d.sellers||{}),off:Array.isArray(d.off)?d.off:[0]}}if(tab==="plan")renderPlan();if(tab==="home")renderHome();if(tab==="sales")renderCal()},()=>{});
    db.doc("settings/analytics3").onSnapshot(s=>{if(s.exists&&Array.isArray(s.data().off)){anSel=s.data().off;if(tab==="analytics")renderAnalytics()}},()=>{});
  }
  init();
})();


/* плотная укладка плиток: каждая плитка занимает ровно столько строк сетки, сколько её высота */
(function(){
  const ROW=4,GAP=16;let MID=0;
  function lay(g){
    if(!g.offsetParent)return;
    const kids=[...g.children].filter(c=>!c.hidden);
    const tracks=Math.max(1,getComputedStyle(g).gridTemplateColumns.split(" ").filter(Boolean).length);
    const cols=Math.max(1,Math.min(tracks,kids.filter(c=>!c.classList.contains("w-wide")).length||1));
    // раскладку по колонкам считаем заново только когда поменялся набор плиток или число колонок;
    // если плитка просто выросла (например, открылось пояснение), она остаётся на своём месте
    const sig=cols+"|"+kids.map(c=>c._mid||(c._mid=++MID)).join(",");const keep=g._sig===sig&&kids.every(c=>c._col!=null||c._full);g._sig=sig;
    // при перерасчёте страница не должна «схлопываться» и прокручиваться вверх
    const sy=window.scrollY;if(!keep)g.style.minHeight=g.offsetHeight+"px";
    const before=new Map();kids.forEach(c=>{if(c._col!=null||c._full){before.set(c,{x:c.offsetLeft,y:c.offsetTop})}});
    kids.forEach(c=>{if(!keep){c.style.gridRow="";c.style.gridColumn="";c.classList.remove("mas-full")}c.style.alignSelf="start"});
    const gapOf=c=>parseFloat(getComputedStyle(c).marginBottom)||GAP;
    const span=c=>Math.max(1,Math.ceil((c.offsetHeight+gapOf(c))/ROW));
    const isW=c=>c.classList.contains("panel")&&c.classList.contains("w");
    const wide=c=>cols===1||c.classList.contains("w-wide");
    let info=kids.map((c,i)=>({c,i,s:span(c),w:wide(c)||(keep&&!!c._full)}));
    // небольшие группы виджетов, которые не уравнять по высоте, ставим на всю ширину
    if(cols>1&&!keep){let seg=[];const chk=()=>{if(seg.length&&seg.length<=3&&seg.every(it=>isW(it.c))){const best=part(seg).diff,mx=Math.max(...seg.map(x=>x.s));if(seg.length===1||best*ROW>Math.max(48,mx*ROW*0.2))seg.forEach(it=>{it.w=true;it.c.classList.add("mas-full")})}seg=[]};
      info.forEach(it=>{if(it.w)chk();else seg.push(it)});chk();
      info.filter(it=>it.c.classList.contains("mas-full")).forEach(it=>{it.c.style.gridColumn="1 / -1";it.s=span(it.c)});}
    if(keep)info.filter(it=>it.c._full).forEach(it=>{it.c.style.gridColumn="1 / -1";it.s=span(it.c)});
    info.forEach(it=>{it.c._full=it.c.classList.contains("mas-full")});
    let y=1,seg=[];
    function part(items){ // раскладка по колонкам с минимальной разницей высот
      const n=items.length;
      if(cols===2&&n<=18){let best=null;const tot=items.reduce((a,x)=>a+x.s,0);
        for(let m=0;m<(1<<n);m++){let a=0;for(let i=0;i<n;i++)if(m>>i&1)a+=items[i].s;const d=Math.abs(tot-2*a);if(!best||d<best.d||(d===best.d&&m<best.m))best={d,m}}
        const colOf=items.map((x,i)=>(best.m>>i&1)?1:0);return {colOf,diff:best.d}}
      const h=new Array(cols).fill(0),colOf=new Array(n);
      items.map((x,i)=>i).sort((a,b)=>items[b].s-items[a].s).forEach(i=>{let k=0;for(let j=1;j<cols;j++)if(h[j]<h[k])k=j;colOf[i]=k;h[k]+=items[i].s});
      // улучшение: обмены между самой высокой и самой низкой колонкой
      for(let it=0;it<200;it++){let hi=0,lo=0;for(let j=1;j<cols;j++){if(h[j]>h[hi])hi=j;if(h[j]<h[lo])lo=j}const D=h[hi]-h[lo];if(D<=1)break;let best=null;
        for(let a=0;a<n;a++){if(colOf[a]!==hi)continue;if(items[a].s<D&&(!best||Math.abs(D-2*items[a].s)<best.g))best={a,b:-1,g:Math.abs(D-2*items[a].s)};for(let b=0;b<n;b++){if(colOf[b]!==lo)continue;const t=items[a].s-items[b].s;if(t>0&&t<D){const gg=Math.abs(D-2*t);if(!best||gg<best.g)best={a,b,g:gg}}}}
        if(!best||best.g>=D)break;colOf[best.a]=lo;h[hi]-=items[best.a].s;h[lo]+=items[best.a].s;if(best.b>=0){colOf[best.b]=hi;h[lo]-=items[best.b].s;h[hi]+=items[best.b].s}}
      return {colOf,diff:Math.max(...h)-Math.min(...h)}}
    const flush=()=>{
      if(!seg.length)return;
      const colOf=keep?seg.map(it=>Math.min(cols-1,it.c._col||0)):part(seg).colOf;const h=new Array(cols).fill(0),byCol=[...Array(cols)].map(()=>[]);
      seg.forEach((it,i)=>{const k=colOf[i];it.col=k;it.c._col=k;it.row=y+h[k];h[k]+=it.s;byCol[k].push(it)});
      let mx=Math.max(...h);
      // остаток делим поровну между плитками колонки, а не отдаём одной
      // свободное место колонки делим поровну между развёрнутыми плитками (свёрнутые не растягиваются)
      const spread=(arr,d,save)=>{const gr=arr.filter(it=>!it.c.classList.contains("cl-off"));if(d>0&&gr.length){const per=Math.floor(d/gr.length);gr.forEach((it,j)=>{const ex=per+(j===gr.length-1?d-per*gr.length:0);it.s+=ex;if(save)it.c._ex=ex})}let row=y;arr.forEach(it=>{it.row=row;row+=it.s})};
      if(!keep)byCol.forEach((arr,k)=>{arr.forEach(it=>it.c._ex=0);spread(arr,mx-h[k],true)});
      else{ // плитки остаются где были: каждая сохраняет свою колонку и строку, свёрнутые не растягиваются
        byCol.forEach(arr=>arr.forEach(it=>{it.s+=it.c.classList.contains("cl-off")?0:(it.c._ex||0)}));
        const hh=byCol.map(arr=>arr.reduce((a,it)=>a+it.s,0));mx=Math.max(...hh);
        // если плитку свернули — соседи по колонке равномерно вырастают и закрывают пустое место
        byCol.forEach((arr,k)=>spread(arr,mx-hh[k],false))}
      seg.forEach(it=>{it.c.style.gridColumn=(it.col+1)+" / span 1";it.c.style.gridRow=it.row+" / span "+it.s;it.c.style.alignSelf="stretch"});
      y+=mx;seg=[];
    };
    info.forEach(it=>{if(it.w){flush();it.c._col=-1;it.c.style.gridColumn="1 / -1";it.c.style.gridRow=y+" / span "+it.s;it.c.style.alignSelf="stretch";y+=it.s}else seg.push(it)});
    flush();
    g.style.minHeight="";
    if(Math.abs(window.scrollY-sy)>1)window.scrollTo(0,sy);
    // плавный переезд: плитки, сменившие место, доезжают анимацией
    if(before.size&&!matchMedia("(prefers-reduced-motion: reduce)").matches)kids.forEach(c=>{const b=before.get(c);if(!b)return;const r={left:c.offsetLeft,top:c.offsetTop};if(c._skipFlip)return;const dx=b.x-r.left,dy=b.y-r.top;if(Math.abs(dx)>3||Math.abs(dy)>3){c.getAnimations().forEach(a=>{if(a.id==="flip")a.cancel()});const a=c.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:"none"}],{duration:480,easing:"cubic-bezier(.22,1,.36,1)"});a.id="flip"}});
    kids.forEach(c=>{c._lh=c.offsetHeight});
    g._t=Date.now();
  }
  const pending=new Set();let raf=0;
  const queue=g=>{pending.add(g);if(!raf)raf=requestAnimationFrame(()=>{raf=0;pending.forEach(lay);pending.clear()})};
  const ro=new ResizeObserver(es=>es.forEach(e=>{const g=e.target.closest(".wgrid,.hx-cards,#anCards");if(!g)return;if(e.target._lh!=null&&Math.abs(e.target.offsetHeight-e.target._lh)<2)return;const w=Date.now()-(g._t||0);if(w>250)queue(g);else{clearTimeout(g._rt);g._rt=setTimeout(()=>queue(g),260-w)}}));
  function watch(g){
    if(g._mas)return;g._mas=1;
    new MutationObserver(()=>{[...g.children].forEach(c=>{if(!c._ro){c._ro=1;ro.observe(c)}});queue(g);clearTimeout(g._st);g._st=setTimeout(()=>{queue(g);g._st=setTimeout(()=>queue(g),500)},900)}).observe(g,{childList:true});
    [...g.children].forEach(c=>{c._ro=1;ro.observe(c)});queue(g);
  }
  function scan(){document.querySelectorAll(".wgrid,.hx-cards,#anCards").forEach(watch)}
  window.__relay=g=>{g._sig=null;queue(g)};
  window.__layNow=g=>lay(g);
  scan();
  new MutationObserver(()=>{document.querySelectorAll(".wgrid,.hx-cards,#anCards").forEach(g=>{if(!g._mas)watch(g);else queue(g)})}).observe(document.body,{attributes:true,attributeFilter:["hidden"],subtree:true});
  window.addEventListener("resize",()=>document.querySelectorAll(".wgrid,.hx-cards,#anCards").forEach(queue));
})();


(function(){
  const r=document.documentElement,sw=document.getElementById("themeSw"),mq=window.matchMedia("(prefers-color-scheme: dark)");
  let t=null;try{t=localStorage.getItem("kassaTheme")}catch(e){}
  function apply(){if(t)r.setAttribute("data-theme",t);else r.removeAttribute("data-theme");sw.checked=t?t==="dark":mq.matches}
  apply();
  sw.addEventListener("change",()=>{t=sw.checked?"dark":"light";try{localStorage.setItem("kassaTheme",t)}catch(e){}apply();window.dispatchEvent(new Event("resize"))});
  mq.addEventListener&&mq.addEventListener("change",()=>{if(!t)apply()});
})();
(function(){
  const r=document.documentElement,box=document.getElementById("sizeSw");if(!box)return;
  const Z={s:.9,m:1,l:1.1},ORD=["s","m","l"];
  let cur=r.getAttribute("data-size")||"m";
  const mark=()=>{box.style.setProperty("--i",ORD.indexOf(cur));box.querySelectorAll("[data-sz]").forEach(b=>b.setAttribute("aria-checked",b.dataset.sz===cur?"true":"false"))};
  function relayout(){window.dispatchEvent(new Event("resize"));document.querySelectorAll(".wgrid,.hx-cards,#anCards").forEach(g=>{if(window.__relay)window.__relay(g)})}
  function apply(v){if(v===cur)return;cur=v;try{localStorage.setItem("kassa.size",v)}catch(e){}
    const set=()=>{if(v==="m")r.removeAttribute("data-size");else r.setAttribute("data-size",v);window.__uiZ=Z[v];relayout()};
    mark();
    const calm=matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(document.startViewTransition&&!calm){r.classList.add("sz-vt");const vt=document.startViewTransition(set);vt.finished.finally(()=>{r.classList.remove("sz-vt");relayout()})}
    else{set()}
    setTimeout(relayout,450);
  }
  mark();
  box.addEventListener("click",e=>{const b=e.target.closest("[data-sz]");if(b)apply(b.dataset.sz)});
  box.addEventListener("keydown",e=>{const k=e.key;if(k!=="ArrowLeft"&&k!=="ArrowRight")return;e.preventDefault();const i=Math.max(0,Math.min(2,ORD.indexOf(cur)+(k==="ArrowRight"?1:-1)));apply(ORD[i]);const b=box.querySelector(`[data-sz="${ORD[i]}"]`);b&&b.focus()});
})();


(function(){
  const RM=window.matchMedia("(prefers-reduced-motion: reduce)");
  const calm=()=>RM.matches;
  /* 1. капля под активной вкладкой */
  const nav=document.querySelector(".tabs");
  if(nav){
    const pill=document.createElement("span");pill.className="tab-pill";pill.setAttribute("aria-hidden","true");nav.prepend(pill);nav.classList.add("pill-on");
    let last=null;
    const place=(anim)=>{const t=nav.querySelector('.tab[aria-selected="true"]');if(!t)return;
      if(!anim||calm())pill.style.transition="none";
      pill.style.width=t.offsetWidth+"px";pill.style.height=t.offsetHeight+"px";pill.style.transform=`translate(${t.offsetLeft}px,${t.offsetTop}px)`;
      if(!anim||calm()){pill.offsetWidth;pill.style.transition=""}
      else if(last!==t){pill.classList.remove("squish");void pill.offsetWidth;pill.classList.add("squish")}
      last=t;
      if(nav.scrollWidth>nav.clientWidth){const l=t.offsetLeft-nav.clientWidth/2+t.offsetWidth/2;nav.scrollTo({left:l,behavior:calm()?"auto":"smooth"})}};
    new MutationObserver(()=>place(true)).observe(nav,{attributes:true,subtree:true,attributeFilter:["aria-selected"]});
    window.addEventListener("resize",()=>place(false));
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>place(false));
    requestAnimationFrame(()=>place(false));setTimeout(()=>place(false),400);
  }
  /* 2. смена темы — круг от рубильника */
  const sw=document.getElementById("themeSw");
  if(sw&&document.startViewTransition){
    sw.addEventListener("click",e=>{
      if(calm())return;
      e.preventDefault();
      const want=sw.checked, r=sw.closest(".themesw").getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
      const R=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
      const vt=document.startViewTransition(()=>{sw.checked=want;sw.dispatchEvent(new Event("change"))});
      vt.ready.then(()=>{document.documentElement.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${R}px at ${x}px ${y}px)`]},{duration:650,easing:"cubic-bezier(.4,0,.2,1)",pseudoElement:"::view-transition-new(root)"})}).catch(()=>{});
    },true);
  }
  /* 3. плавное раскрытие блоков */
  let expT=0;
  document.addEventListener("click",e=>{if(e.target.closest('[aria-expanded],.tog,[data-st],[data-mo],[data-dc],summary')){document.documentElement.classList.add("ios-expanding");clearTimeout(expT);expT=setTimeout(()=>document.documentElement.classList.remove("ios-expanding"),600)}},true);
  document.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.closest&&e.target.closest('[aria-expanded]')){document.documentElement.classList.add("ios-expanding");clearTimeout(expT);expT=setTimeout(()=>document.documentElement.classList.remove("ios-expanding"),600)}},true);
  /* 4. карточки ниже экрана проявляются при прокрутке */
  const SEL=".page .panel,.page .tile,.page .kpi,.wgrid>*,.hx-cards>*";
  const seen=new WeakSet();
  const io="IntersectionObserver" in window?new IntersectionObserver(es=>{let i=0;es.forEach(en=>{if(en.isIntersecting){const el=en.target;io.unobserve(el);el.style.setProperty("--d",(Math.min(i++,6)*0.06)+"s");el.classList.remove("ios-pre");el.classList.add("ios-in");setTimeout(()=>{el.classList.remove("ios-in");el.style.removeProperty("--d")},1200)}})},{rootMargin:"0px 0px -6% 0px",threshold:.05}):null;
  const scan=()=>{if(!io||calm())return;const pg=document.querySelector(".page:not([hidden])");if(!pg)return;pg.querySelectorAll(SEL.replace(/\.page /g,"")).forEach(el=>{if(seen.has(el))return;seen.add(el);if(el.closest("[hidden]"))return;
    if(el.parentElement&&el.parentElement.closest(".panel,.tile,.kpi")&&!el.parentElement.matches(".wgrid,.hx-cards,#anCards"))return;
    const r=el.getBoundingClientRect();if(r.height&&r.top>innerHeight*0.92){el.classList.add("ios-pre");io.observe(el)}})};
  /* 5. счётчики */
  const prev=new Map();
  const NUM=/^(\D*?)([+\-−]?)(\d{1,3}(?:[   ]\d{3})+|\d+)(?![\d,.])(.*)$/s;
  const keyOf=el=>{if(el.id)return "#"+el.id;const box=el.closest(".tile,.kpi");if(!box)return null;const lab=box.querySelector(".eyebrow,.l,.k,small,div");const seg=document.querySelector(".page:not([hidden])");return (seg?seg.id:"")+"|"+(lab&&lab!==el?lab.textContent.trim().slice(0,60):"")};
  function count(el){
    if(el._iosBusy||el.childElementCount)return;const txt=el.textContent;if(el._iosLast===txt)return;
    const m=txt.match(NUM);const k=keyOf(el);if(!m||!k){el._iosLast=txt;return}
    const sep=(m[3].match(/[   ]/)||[" "])[0];const to=+m[3].replace(/\D/g,"");const from=prev.has(k)?prev.get(k):0;prev.set(k,to);el._iosLast=txt;
    if(calm()||from===to||el.closest("[hidden]"))return;
    const r=el.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;
    const fmt=v=>String(v).replace(/\B(?=(\d{3})+(?!\d))/g,sep);
    const t0=performance.now(),D=Math.min(900,350+Math.log10(Math.abs(to-from)+1)*90);el._iosBusy=true;el.classList.add("ios-count");
    const step=now=>{const p=Math.min(1,(now-t0)/D),e=1-Math.pow(1-p,3),v=Math.round(from+(to-from)*e);
      if(el.textContent!==el._iosShown&&el._iosShown!==undefined&&p>0){el._iosBusy=false;el._iosShown=undefined;count(el);return}
      el._iosShown=m[1]+m[2]+fmt(v)+m[4];el.textContent=el._iosShown;
      if(p<1)requestAnimationFrame(step);else{el._iosBusy=false;el._iosShown=undefined;el._iosLast=el.textContent}};
    el._iosShown=undefined;requestAnimationFrame(step)}
  const nums=()=>{const pg=document.querySelector(".page:not([hidden])");if(pg)pg.querySelectorAll(".tile .big,.kpi .v").forEach(count)};
  let q=0,lastT=0;const tick=()=>{q=0;lastT=performance.now();scan();nums()};
  new MutationObserver(ms=>{if(q)return;for(const m of ms){const t=m.target;if(t.nodeType===1&&t._iosBusy)continue;if(t.parentElement&&t.parentElement._iosBusy)continue;const wait=Math.max(0,450-(performance.now()-lastT));q=setTimeout(()=>requestAnimationFrame(tick),wait);return}}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden"]});
  setTimeout(tick,300);
})();


(function(){
  /* Свои поля в стиле iOS поверх системных select и input[type=date].
     Системные элементы остаются в странице (скрыты) — весь код и события работают как раньше. */
  try{
  const MS=["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
  const MS3=["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
  const MSg=["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const pad=n=>String(n).padStart(2,"0"),iso=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
  const phone=()=>window.matchMedia("(max-width:640px)").matches;
  const CHEV='<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 6.2 8 9.7l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CAL='<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 6.5h12M5.5 1.8v2.6M10.5 1.8v2.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  const escH=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  function hook(el,cb){const pr=Object.getPrototypeOf(el);["value","selectedIndex"].forEach(k=>{const d=Object.getOwnPropertyDescriptor(pr,k);if(!d||!d.set)return;
    Object.defineProperty(el,k,{configurable:true,get(){return d.get.call(this)},set(v){d.set.call(this,v);cb()}})})}
  const fire=el=>{el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}))};
  /* --- общее всплывающее окно --- */
  let pop=null,scrim=null,owner=null,onKey=null,repos=null;
  function closePop(focusBack){if(!pop)return;const p=pop,s=scrim,o=owner;pop=null;scrim=null;owner=null;
    document.removeEventListener("keydown",onKey,true);window.removeEventListener("scroll",repos,true);window.removeEventListener("resize",closeNow);
    if(o){o.setAttribute("aria-expanded","false");if(focusBack)o.focus({preventScroll:true})}
    p.classList.add("out");if(s)s.classList.add("out");setTimeout(()=>{p.remove();s&&s.remove()},200)}
  const closeNow=()=>closePop(false);
  function openPop(btn,cls,build,keys){
    closePop(false);owner=btn;btn.setAttribute("aria-expanded","true");
    pop=document.createElement("div");pop.className="ios-pop "+cls;pop.setAttribute("role",cls.includes("ios-cal")?"dialog":"listbox");
    const sheet=phone();if(sheet){pop.classList.add("sheet");scrim=document.createElement("div");scrim.className="ios-scrim";scrim.onclick=()=>closePop(true);document.body.appendChild(scrim)}
    build(pop);document.body.appendChild(pop);
    repos=()=>{if(!pop||sheet)return;const r=__zr(btn),IW=__zw(),IH=__zh(),w=Math.max(pop.offsetWidth,cls.includes("ios-cal")?300:r.width),h=pop.offsetHeight;
      let left=Math.min(Math.max(8,r.left),IW-w-8),top=r.bottom+8,up=false;if(top+h>IH-8&&r.top-h-8>8){top=r.top-h-8;up=true}
      pop.style.left=left+"px";pop.style.top=Math.max(8,top)+"px";if(!cls.includes("ios-cal"))pop.style.minWidth=r.width+"px";pop.classList.toggle("up",up)};
    repos();
    onKey=e=>{if(e.key==="Escape"){e.preventDefault();closePop(true);return}keys&&keys(e)};
    document.addEventListener("keydown",onKey,true);window.addEventListener("scroll",repos,{capture:true,passive:true});window.addEventListener("resize",closeNow);
  }
  document.addEventListener("pointerdown",e=>{if(pop&&!pop.contains(e.target)&&e.target!==owner&&!owner.contains(e.target)&&!(scrim&&e.target===scrim))closePop(false)},true);
  /* --- выпадающие списки --- */
  function enhanceSelect(sel){
    sel.dataset.ios="1";
    const b=document.createElement("button");b.type="button";b.className="ios-f ios-sel";b.setAttribute("aria-haspopup","listbox");b.setAttribute("aria-expanded","false");
    const lab=sel.getAttribute("aria-label")||(sel.closest("label")?sel.closest("label").childNodes[0].textContent.trim():"");if(lab)b.setAttribute("aria-label",lab);
    if(!sel.closest("label.f"))b.classList.add("inl");
    sel.after(b);sel.classList.add("ios-native");sel.tabIndex=-1;
    const sync=()=>{const o=sel.options[sel.selectedIndex];b.innerHTML=`<span class="t">${escH(o?o.textContent:"—")}</span>${CHEV}`;b.disabled=sel.disabled;b.hidden=sel.hidden};
    hook(sel,sync);sel.addEventListener("change",sync);new MutationObserver(sync).observe(sel,{childList:true,subtree:true,attributes:true,attributeFilter:["disabled","hidden","selected"]});sync();
    sel.addEventListener("invalid",()=>{b.classList.remove("bad");void b.offsetWidth;b.classList.add("bad");b.focus();setTimeout(()=>b.classList.remove("bad"),1600)});
    b.onclick=()=>{if(owner===b){closePop(true);return}
      openPop(b,"ios-menu",p=>{let h="",cur=null;[...sel.children].forEach(n=>{
          if(n.tagName==="OPTGROUP"){h+=`<div class="ios-og">${escH(n.label)}</div>`;[...n.children].forEach(o=>h+=optH(o))}else h+=optH(n)});
        function optH(o){const i=[...sel.options].indexOf(o),on=i===sel.selectedIndex;return `<button type="button" class="ios-opt" role="option" data-i="${i}" aria-selected="${on}"${o.disabled?" disabled":""}><span class="ck">${on?"✓":""}</span><span>${escH(o.textContent)}</span></button>`}
        p.innerHTML=h;
        p.onclick=e=>{const o=e.target.closest(".ios-opt");if(!o||o.disabled)return;const i=+o.dataset.i;if(i!==sel.selectedIndex){sel.selectedIndex=i;fire(sel)}closePop(true)};
        requestAnimationFrame(()=>{const s=p.querySelector('[aria-selected="true"]')||p.querySelector(".ios-opt");if(s){s.scrollIntoView({block:"nearest"});s.focus({preventScroll:true})}})},
      e=>{const os=[...pop.querySelectorAll(".ios-opt:not([disabled])")],i=os.indexOf(document.activeElement);
        if(e.key==="ArrowDown"){e.preventDefault();(os[i+1]||os[0]).focus()}else if(e.key==="ArrowUp"){e.preventDefault();(os[i-1]||os[os.length-1]).focus()}
        else if(e.key==="Tab")closePop(false)})};
    b.addEventListener("keydown",e=>{if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();b.click()}});
  }
  /* --- календарь --- */
  const fmtD=v=>{if(!v)return "";const [y,m,d]=v.split("-").map(Number);return `${d} ${MS3[m-1]} ${y}`};
  function enhanceDate(inp){
    inp.dataset.ios="1";
    const b=document.createElement("button");b.type="button";b.className="ios-f ios-date";b.setAttribute("aria-haspopup","dialog");b.setAttribute("aria-expanded","false");
    const lab=inp.getAttribute("aria-label")||(inp.closest("label")?inp.closest("label").childNodes[0].textContent.trim():"Дата");b.setAttribute("aria-label",lab);
    if(!inp.closest("label.f"))b.classList.add("inl");
    inp.after(b);inp.classList.add("ios-native");inp.tabIndex=-1;
    const sync=()=>{const v=inp.value;b.innerHTML=`<span class="t${v?"":" ph"}">${v?fmtD(v):"Выберите дату"}</span>${CAL}`;b.disabled=inp.disabled;b.hidden=inp.hidden;b.title=v?(()=>{const [y,m,d]=v.split("-").map(Number);return `${d} ${MSg[m-1]} ${y}`})():""};
    hook(inp,sync);inp.addEventListener("change",sync);inp.addEventListener("input",sync);new MutationObserver(sync).observe(inp,{attributes:true,attributeFilter:["disabled","hidden","min","max"]});sync();
    inp.addEventListener("invalid",()=>{b.classList.remove("bad");void b.offsetWidth;b.classList.add("bad");b.focus();setTimeout(()=>b.classList.remove("bad"),1600)});
    b.onclick=()=>{if(owner===b){closePop(true);return}
      const t=iso(new Date());let base=(inp.value||t).slice(0,7),mode="d";
      openPop(b,"ios-cal",p=>{
        const draw=()=>{const [Y,M]=base.split("-").map(Number),sel=inp.value,mn=inp.min||"",mx=inp.max||"";
          if(mode==="m"){p.innerHTML=`<div class="hd"><button type="button" class="ttl" aria-expanded="true">${Y}<span class="ch">›</span></button></div><div class="yr"><button type="button" class="nb" data-y="-1" aria-label="Предыдущий год">‹</button><span>${Y}</span><button type="button" class="nb" data-y="1" aria-label="Следующий год">›</button></div><div class="my">${MS3.map((m,i)=>`<button type="button" class="m${i+1===M?" sel":""}" data-m="${i+1}">${m}</button>`).join("")}</div>`;return}
          const first=new Date(Y,M-1,1),off=(first.getDay()+6)%7,start=new Date(Y,M-1,1-off);let g="";
          for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const v=iso(d),out=d.getMonth()!==M-1,dis=(mn&&v<mn)||(mx&&v>mx);
            g+=`<button type="button" class="d${out?" o":""}${d.getDay()===0?" sun":""}${v===t?" tod":""}${v===sel?" sel":""}" data-v="${v}"${dis?" disabled":""} aria-label="${d.getDate()} ${MSg[d.getMonth()]} ${d.getFullYear()}"${v===sel?' aria-current="date"':""}>${d.getDate()}</button>`}
          p.innerHTML=`<div class="hd"><button type="button" class="ttl" aria-expanded="false">${MS[M-1][0].toUpperCase()+MS[M-1].slice(1)} ${Y}<span class="ch">›</span></button><div class="nav"><button type="button" class="nb" data-mv="-1" aria-label="Предыдущий месяц">‹</button><button type="button" class="nb" data-mv="1" aria-label="Следующий месяц">›</button></div></div>
            <div class="wd">${["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(x=>`<span>${x}</span>`).join("")}</div><div class="gd">${g}</div>
            <div class="ft"><button type="button" class="lk" data-a="clear"${inp.required?" hidden":""}>Сбросить</button><button type="button" class="lk" data-a="today">Сегодня</button></div>`;
          if(!pop||!pop.classList.contains("sheet"))repos&&repos()};
        const shift=n=>{const [Y,M]=base.split("-").map(Number);const d=new Date(Y,M-1+n,1);base=d.getFullYear()+"-"+pad(d.getMonth()+1);draw()};
        const set=v=>{if(inp.value!==v){inp.value=v;fire(inp)}closePop(true)};
        p.onclick=e=>{const x=e.target.closest("button");if(!x||x.disabled)return;
          if(x.dataset.v)set(x.dataset.v);else if(x.dataset.mv)shift(+x.dataset.mv);else if(x.classList.contains("ttl")){mode=mode==="d"?"m":"d";draw()}
          else if(x.dataset.y){const [Y,M]=base.split("-").map(Number);base=(Y+ +x.dataset.y)+"-"+pad(M);draw()}
          else if(x.dataset.m){base=base.slice(0,4)+"-"+pad(+x.dataset.m);mode="d";draw()}
          else if(x.dataset.a==="today")set(t);else if(x.dataset.a==="clear")set("")};
        draw();requestAnimationFrame(()=>{const s=p.querySelector(".d.sel")||p.querySelector(".d.tod")||p.querySelector(".d:not(.o)");s&&s.focus({preventScroll:true})});
        p._shift=shift;},
      e=>{const a=document.activeElement;if(!a||!a.classList||!a.classList.contains("d"))return;const mv={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];if(!mv)return;e.preventDefault();
        const ds=[...pop.querySelectorAll(".d")],i=ds.indexOf(a),n=ds[i+mv];if(n&&!n.classList.contains("o"))n.focus();else{const d=new Date(a.dataset.v);d.setDate(d.getDate()+mv);const v=iso(d);pop._shift(mv>0?1:-1);const f=pop.querySelector(`.d[data-v="${v}"]`);f&&f.focus()}})};
  }
  /* --- поиск новых полей (страница дорисовывает их сама) --- */
  function scan(){document.querySelectorAll('select:not([data-ios]):not([multiple])').forEach(s=>{try{enhanceSelect(s)}catch(e){s.dataset.ios="x";s.classList.remove("ios-native")}});
    document.querySelectorAll('input[type="date"]:not([data-ios])').forEach(i=>{try{enhanceDate(i)}catch(e){i.dataset.ios="x";i.classList.remove("ios-native")}})}
  scan();let t=0;new MutationObserver(()=>{if(t)return;t=setTimeout(()=>{t=0;scan()},250)}).observe(document.body,{childList:true,subtree:true});
  }catch(err){/* при любой ошибке остаются обычные поля браузера */}
})();


/* сворачивание больших плиток */
(function(){
  const KEY="kassa.collapsed";let st={};try{st=JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch(e){}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}};
  const SKIP="#addPanel,#saleFormPanel,#sImport,#bImport,#rpPick,.filterbar,.hx-sec,.kpi";
  const ICON='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>';
  function keyOf(p){const h=p.querySelector(".cl-t")||p.querySelector("h2");const pg=p.closest("[id^=page-]");return (pg?pg.id:"")+"|"+(h?h.textContent.trim().slice(0,80):"")}
  function deco(p){
    if(p._cl||p.matches(SKIP)||p.querySelector("form"))return;
    let keep=[...p.children].find(c=>c.tagName==="H2"),t=keep;
    if(!keep){keep=[...p.children].find(c=>c.tagName!=="BUTTON"&&c.querySelector&&c.querySelector("h2")&&!c.matches(".wbody,.wgrid,.hx-cards"));if(!keep)return;t=[...keep.children].find(c=>c.tagName==="H2"||c.querySelector("h2"))}
    if(!t)return;p._cl=1;keep.classList.add("cl-keep");t.classList.add("cl-t");p.classList.add("cl-has");
    const b=document.createElement("button");b.type="button";b.className="cl-btn";b.innerHTML=ICON;p.appendChild(b);
    const k=keyOf(p),off=!!st[k];p.classList.toggle("cl-off",off);b.setAttribute("aria-expanded",off?"false":"true");b.title=off?"Развернуть":"Свернуть";
  }
  function scan(){document.querySelectorAll(".panel").forEach(deco)}
  document.addEventListener("click",e=>{
    const tg=e.target.closest(".art-tg");if(tg){const a=tg.closest("#articles");const on=a.classList.toggle("all");tg.setAttribute("aria-expanded",on);return}
    const b=e.target.closest(".cl-btn");if(!b)return;e.stopPropagation();
    const p=b.parentElement,off=!p.classList.contains("cl-off");
    const g=p.parentElement&&p.parentElement.closest(".wgrid,.hx-cards,#anCards");
    const h0=p.offsetHeight;
    if(g)g._t=Date.now()+700; // пока идёт анимация, кладка не пересчитывается сама
    p.classList.toggle("cl-off",off);
    p.classList.remove("cl-anim");if(!off){void p.offsetWidth;p.classList.add("cl-anim");setTimeout(()=>p.classList.remove("cl-anim"),500)}
    const k=keyOf(p);if(off)st[k]=1;else delete st[k];save();
    b.setAttribute("aria-expanded",off?"false":"true");b.title=off?"Развернуть":"Свернуть";
    if(g&&window.__layNow){p._skipFlip=1;window.__layNow(g);window.__layNow(g);p._skipFlip=0}
    const h1=p.offsetHeight;
    if(Math.abs(h1-h0)>2&&!matchMedia("(prefers-reduced-motion: reduce)").matches){
      const a=p.animate([{height:h0+"px",overflow:"hidden"},{height:h1+"px",overflow:"hidden"}],{duration:420,easing:"cubic-bezier(.22,1,.36,1)"});
      a.onfinish=()=>{if(g&&window.__layNow){const hA=p.offsetHeight;g._t=0;window.__layNow(g);const hB=p.offsetHeight;if(Math.abs(hB-hA)>1)p.animate([{height:hA+"px",overflow:"hidden"},{height:hB+"px",overflow:"hidden"}],{duration:260,easing:"cubic-bezier(.22,1,.36,1)"})}};
    }
  },true);
  let q=0;new MutationObserver(()=>{if(!q)q=requestAnimationFrame(()=>{q=0;scan()})}).observe(document.body,{childList:true,subtree:true});
  scan();
})();


/* подсказки при вводе: свой список в стиле iOS вместо системного datalist */
(function(){
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  function attach(inp){
    if(inp._ac)return;const id=inp.getAttribute("list");if(!id)return;inp._ac=1;inp.removeAttribute("list");inp.setAttribute("autocomplete","off");
    let pop=null,idx=-1,items=[],picking=false;
    const all=()=>{const dl=document.getElementById(id);return dl?[...new Set([...dl.options].map(o=>o.value).filter(Boolean))]:[]};
    function close(){if(!pop)return;const p=pop;pop=null;idx=-1;p.classList.add("out");setTimeout(()=>p.remove(),160)}
    function place(){if(!pop)return;const r=__zr(inp),IW=__zw(),IH=__zh();const below=IH-r.bottom-12,above=r.top-12;const up=below<200&&above>below;
      pop.classList.toggle("up",up);pop.style.left=Math.max(8,Math.min(r.left,IW-r.width-8))+"px";pop.style.width=r.width+"px";
      pop.style.maxHeight=Math.min(340,(up?above:below)-6)+"px";if(up){pop.style.top="";pop.style.bottom=(IH-r.top+6)+"px"}else{pop.style.bottom="";pop.style.top=(r.bottom+6)+"px"}}
    function render(){
      const q=inp.value.trim().toLowerCase();let a=all();
      items=q?a.filter(v=>v.toLowerCase().includes(q)).sort((x,y)=>(x.toLowerCase().startsWith(q)?0:1)-(y.toLowerCase().startsWith(q)?0:1)):a;
      if(!items.length||(items.length===1&&items[0].toLowerCase()===q)){close();return}
      const n=items.length;items=items.slice(0,80);
      if(!pop){pop=document.createElement("div");pop.className="ios-pop ios-ac";pop.setAttribute("role","listbox");document.body.appendChild(pop);
        pop.addEventListener("mousedown",e=>e.preventDefault());
        pop.addEventListener("click",e=>{const o=e.target.closest(".ios-opt");if(o)pick(items[+o.dataset.i])})}
      const hl=v=>{if(!q)return esc(v);const i=v.toLowerCase().indexOf(q);return i<0?esc(v):esc(v.slice(0,i))+"<mark>"+esc(v.slice(i,i+q.length))+"</mark>"+esc(v.slice(i+q.length))};
      pop.innerHTML=(q?`<div class="ac-n">Найдено: ${n}</div>`:"")+items.map((v,i)=>`<button type="button" class="ios-opt${i===idx?" act":""}" role="option" data-i="${i}"><span class="t">${hl(v)}</span></button>`).join("");
      place();
    }
    function pick(v){if(v==null)return;picking=true;inp.value=v;inp.dispatchEvent(new Event("input",{bubbles:true}));inp.dispatchEvent(new Event("change",{bubbles:true}));picking=false;close()}
    function mark(){if(!pop)return;pop.querySelectorAll(".ios-opt").forEach((o,i)=>o.classList.toggle("act",i===idx));const a=pop.querySelector(".ios-opt.act");a&&a.scrollIntoView({block:"nearest"})}
    inp.addEventListener("focus",()=>{if(!picking)render()});
    inp.addEventListener("input",()=>{if(!picking){idx=-1;render()}});
    inp.addEventListener("blur",()=>setTimeout(close,120));
    inp.addEventListener("keydown",e=>{
      if(!pop){if(e.key==="ArrowDown"){render();e.preventDefault()}return}
      if(e.key==="ArrowDown"){idx=Math.min(items.length-1,idx+1);mark();e.preventDefault()}
      else if(e.key==="ArrowUp"){idx=Math.max(0,idx-1);mark();e.preventDefault()}
      else if(e.key==="Enter"&&idx>=0){pick(items[idx]);e.preventDefault()}
      else if(e.key==="Escape"){close();e.preventDefault()}
    });
    addEventListener("scroll",place,{passive:true,capture:true});addEventListener("resize",place);
  }
  const scan=()=>document.querySelectorAll("input[list]").forEach(attach);
  let q=0;new MutationObserver(()=>{if(!q)q=requestAnimationFrame(()=>{q=0;scan()})}).observe(document.body,{childList:true,subtree:true});
  scan();
})();


document.addEventListener("click",e=>{const b=e.target.closest("[data-tab-go]");if(!b)return;const t=document.querySelector('.tab[data-tab="'+b.dataset.tabGo+'"]');if(t){t.click();window.scrollTo({top:0,behavior:"smooth"})}});


/* страховка: карточка, попавшая на экран, всегда проявляется */
(function(){let t=0;function chk(){t=0;document.querySelectorAll(".ios-pre").forEach(el=>{if(el.closest("[hidden]"))return;const r=el.getBoundingClientRect();if(r.height&&r.top<innerHeight*0.97&&r.bottom>0){el.classList.remove("ios-pre");el.classList.add("ios-in");setTimeout(()=>el.classList.remove("ios-in"),1200)}})}
addEventListener("scroll",()=>{if(!t)t=requestAnimationFrame(chk)},{passive:true});addEventListener("resize",()=>{if(!t)t=requestAnimationFrame(chk)});setInterval(chk,1200)})();



/* ===== адаптивность: иконки вкладок, лист «Ещё», таблицы-карточки на телефоне ===== */
(function(){
  const nav=document.querySelector(".tabs");if(!nav)return;
  const IC={
    home:'<path d="M3.5 10.5 12 3.5l8.5 7V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19z"/>',
    kassa:'<rect x="3" y="6.5" width="18" height="13" rx="3"/><path d="M3 10h18M16.5 14.5h1.5M6 6.5 15.5 3.6a1.5 1.5 0 0 1 1.9 1.2l.3 1.7"/>',
    report:'<path d="M14 3H7.5A1.5 1.5 0 0 0 6 4.5v15A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    sales:'<path d="M5 8h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
    analytics:'<path d="M4 20V11M10 20V5M16 20v-6M21 20H3"/>',
    plan:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    lens:'<circle cx="7" cy="14" r="3.6"/><circle cx="17" cy="14" r="3.6"/><path d="M10.6 14h2.8M3.4 13 5 7.5M20.6 13 19 7.5"/>',
    batch:'<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
    help:'<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.1-2.4 3.6M12 17h.01"/>',
    more:'<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>'
  };
  const svg=k=>`<svg class="tab-ic" viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
  const EXTRA=["analytics","plan","lens","batch","help"];
  const LBL={analytics:"Аналитика",plan:"План",lens:"Линзы",batch:"Склад",help:"Инструкция"};
  nav.querySelectorAll(".tab[data-tab]").forEach(b=>{if(!b.querySelector(".tab-ic"))b.insertAdjacentHTML("afterbegin",svg(b.dataset.tab))});
  // кнопка «Ещё» — сразу после «Продаж», чтобы капля вставала на неё раньше скрытых вкладок
  const more=document.createElement("button");more.type="button";more.className="tab-more";more.setAttribute("aria-haspopup","dialog");more.setAttribute("aria-selected","false");
  more.innerHTML=svg("more")+"<span>Ещё</span>";
  const after=nav.querySelector('.tab[data-tab="sales"]');after.after(more);
  const phone=matchMedia("(max-width:640px)");
  const cur=()=>{const t=nav.querySelector(".tab[data-tab][aria-selected='true']");return t?t.dataset.tab:""};
  function sync(){
    const on=phone.matches&&EXTRA.includes(cur());
    more.classList.toggle("tab",phone.matches);
    if(more.getAttribute("aria-selected")!==(on?"true":"false"))more.setAttribute("aria-selected",on?"true":"false");
  }
  new MutationObserver(sync).observe(nav,{attributes:true,subtree:true,attributeFilter:["aria-selected"]});
  phone.addEventListener&&phone.addEventListener("change",()=>{sync();window.dispatchEvent(new Event("resize"))});
  sync();

  let ov=null,sh=null;
  function close(){if(!sh)return;const a=sh,b=ov;sh=ov=null;a.classList.remove("on");b.classList.remove("on");setTimeout(()=>{a.remove();b.remove()},340);more.focus()}
  function open(){
    if(sh){close();return}
    ov=document.createElement("div");ov.className="more-ov";
    sh=document.createElement("div");sh.className="more-sh";sh.setAttribute("role","dialog");sh.setAttribute("aria-label","Другие разделы");
    const c=cur();
    sh.innerHTML='<h3>Разделы</h3><div class="more-grid">'+EXTRA.map(k=>`<button type="button" class="more-it" data-go="${k}"${c===k?' aria-current="page"':''}>${svg(k).replace('class="tab-ic"','')}<span>${LBL[k]}</span></button>`).join("")+'</div>'+
      (window.__sbEmail?`<div class="more-acc"><span>${window.__sbEmail.replace(/[<>&"]/g,"")}</span><button type="button" data-out>Выйти</button></div>`:"");
    document.body.append(ov,sh);
    requestAnimationFrame(()=>{ov.classList.add("on");sh.classList.add("on")});
    ov.onclick=close;
    sh.addEventListener("click",e=>{const g=e.target.closest("[data-go]");if(g){const t=nav.querySelector(`.tab[data-tab="${g.dataset.go}"]`);close();if(t){t.click();window.scrollTo({top:0})}return}
      if(e.target.closest("[data-out]")&&window.__sbSignOut)window.__sbSignOut()});
    const f=sh.querySelector(".more-it");f&&f.focus();
  }
  more.addEventListener("click",open);
  document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
  phone.addEventListener&&phone.addEventListener("change",()=>{if(!phone.matches)close()});

  /* таблицы → карточки: подписи столбцов в каждой ячейке */
  function label(){
    document.querySelectorAll(".tbl table,.rp-tbl table,table.pl-wk").forEach(tb=>{
      if(tb.classList.contains("heat"))return;
      const hr=tb.tHead&&tb.tHead.rows[tb.tHead.rows.length-1];if(!hr)return;
      const ths=[];[...hr.cells].forEach(th=>{for(let i=0;i<(th.colSpan||1);i++)ths.push(th.textContent.trim())});
      if(ths.length<4){tb.classList.remove("tcards");return}
      tb.classList.add("tcards");
      const titleCol=(ths[0]===""||ths[0]==="#")?1:0;
      [...tb.tBodies].concat(tb.tFoot?[tb.tFoot]:[]).forEach(sec=>[...sec.rows].forEach(tr=>{
        const cells=[...tr.cells];
        if(cells.length===1&&(cells[0].colSpan||1)>1){tr.classList.add("t-group");return}
        tr.classList.remove("t-group");
        let ci=0;cells.forEach((td,j)=>{const l=ths[ci]||"";if(td.getAttribute("data-l")!==l)td.setAttribute("data-l",l);
          td.classList.toggle("t-title",ci===titleCol);td.classList.toggle("t-hide",titleCol===1&&ci===0);ci+=td.colSpan||1});
        if(/^итог|^всего/i.test((cells[0]&&cells[0].textContent||"").trim()))tr.classList.add("t-total");
      }));
    });
  }
  let lt=0;const q=()=>{if(lt)return;lt=requestAnimationFrame(()=>{lt=0;label()})};
  new MutationObserver(q).observe(document.body,{childList:true,subtree:true});
  label();
})();

