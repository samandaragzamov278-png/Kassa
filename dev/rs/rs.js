/* Касса · «Отчёт по расчётному счёту»: остаток, поступления и расходы со счёта по дням и месяцам. Данные — report/<день> (rsStart, rsEnd, bank[]). */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const fmt=n=>(n<0?"−":"")+Math.round(Math.abs(+n||0)).toLocaleString("ru-RU").replace(/[\s  ,]/g," ");
  const fm=v=>Math.abs(v)>=1e6?(v/1e6).toFixed(1).replace(".",",")+" млн":fmt(v);
  const MN=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const MNg=["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const dS=d=>d.slice(8,10)+"."+d.slice(5,7);
  const WD=["вс","пн","вт","ср","чт","пт","сб"];
  const S=()=>window.__S;
  const CATS=[["Налоги",/налог|ндфл|инпс|пен[яи]|соц\.? ?сбор/i],["Пополнение корп. карты",/корп/i],["Кредит",/кредит/i],["Аренда и ЖЭК",/аренд|жэк|коммунал/i],["Линзы (товар)",/линз/i],["Обналичка",/обнал/i],["С1: мебель, дизайн",/ц1|с1|мебел|дизайн|ремонт/i],["Billz, кассы, терминалы",/billz|билз|касс|терминал|фискал/i],["Зарплата",/зарпл|зараб|заплат|аванс/i],["Межбанк",/межбанк/i],["Комиссия банка",/комисс/i]];
  const CAT_NAMES=CATS.map(c=>c[0]).concat(["Прочее"]);
  const catOf=b=>b.c&&CAT_NAMES.includes(b.c)?b.c:((CATS.find(c=>c[1].test(String(b.n||"")))||["Прочее"])[0]);
  const num=v=>v==null||v===""?null:+v;

  function days(){
    const R=(S()&&S().repDocs)||{};
    return Object.keys(R).filter(d=>/^\d{4}-\d\d-\d\d$/.test(d)).sort().map(d=>{const r=R[d]||{};const bank=(r.bank||[]).filter(b=>+b.a);const out=bank.reduce((a,b)=>a+(+b.a||0),0);const s=num(r.rsStart),e=num(r.rsEnd);return {d,s,e,bank,out,in:s!=null&&e!=null?e-s+out:null}}).filter(x=>x.s!=null||x.e!=null||x.bank.length);
  }
  function months(){return [...new Set(days().map(x=>x.d.slice(0,7)))].sort()}
  function calc(m){
    const all=days(),L=m==="all"?all:all.filter(x=>x.d.startsWith(m));
    const withS=L.filter(x=>x.s!=null),withE=L.filter(x=>x.e!=null);
    const cat={};L.forEach(x=>x.bank.forEach(b=>{const c=catOf(b);cat[c]=(cat[c]||0)+(+b.a||0)}));
    return {m,days:L,start:withS.length?withS[0].s:null,startD:withS.length?withS[0].d:null,end:withE.length?withE[withE.length-1].e:null,endD:withE.length?withE[withE.length-1].d:null,
      in:L.reduce((a,x)=>a+(x.in>0?x.in:0),0),out:L.reduce((a,x)=>a+x.out,0),cat,outDays:L.filter(x=>x.out).length};
  }
  function byMonth(){const ms=months();const rows={};ms.forEach(m=>{rows[m]=calc(m)});return {ms,rows}}

  // ---------- состояние ----------
  let st={m:"",open:null,ed:false};try{st.m=localStorage.getItem("kassa.rs.m")||""}catch(e){}
  const kpi=(l,v,d,c)=>`<div class="kpi"><span class="eyebrow">${l}</span><div class="kv2"><span class="v ${c||""}">${v}</span></div><span class="d">${d||"&nbsp;"}</span></div>`;
  function chart(L){
    const rows=L.filter(x=>x.e!=null||x.out||x.in);if(rows.length<2)return '<p class="note">Для графика нужно хотя бы два дня с выпиской.</p>';
    const W=Math.max(1000,rows.length*46),H=230,bw=W/rows.length;
    const mx=Math.max(1,...rows.map(x=>Math.max(x.in>0?x.in:0,x.out)));const em=Math.max(1,...rows.map(x=>x.e||0));
    let g="",pts=[];
    rows.forEach((x,i)=>{const cx=i*bw+bw/2,w=bw*.56;const hi=(x.in>0?x.in:0)/mx*92,ho=x.out/mx*92;
      g+=`<rect x="${(cx-w/2).toFixed(1)}" y="${(112-hi).toFixed(1)}" width="${w.toFixed(1)}" height="${hi.toFixed(1)}" rx="3" class="rs-in"><title>${dS(x.d)}: поступило ${fmt(x.in||0)}</title></rect>`;
      g+=`<rect x="${(cx-w/2).toFixed(1)}" y="112" width="${w.toFixed(1)}" height="${ho.toFixed(1)}" rx="3" class="rs-out"><title>${dS(x.d)}: списано ${fmt(x.out)}</title></rect>`;
      g+=`<text x="${cx.toFixed(1)}" y="${H-4}" class="rs-lbl" text-anchor="middle">${x.d.slice(8)}</text>`;
      if(x.e!=null)pts.push(`${cx.toFixed(1)},${(206-x.e/em*196).toFixed(1)}`)});
    return `<div class="chartbox rs-chart"><svg viewBox="0 0 ${W} ${H}" style="width:100%;min-width:${Math.min(W,560)}px;height:240px" role="img" aria-label="Движение по счёту"><line x1="0" y1="112" x2="${W}" y2="112" class="rs-axis"/>${g}<polyline points="${pts.join(" ")}" class="rs-line"/></svg></div>`;
  }
  function render(){
    const el=$("rsBody");if(!el||!S())return;
    const ms=months();
    if(!ms.length){el.innerHTML='<div class="empty">Выписок по счёту ещё нет — нажмите «Внести выписку за день».</div>';$("rsSeg").innerHTML="";return}
    if(st.m!=="all"&&!ms.includes(st.m))st.m=ms[ms.length-1];
    $("rsSeg").innerHTML=ms.map(m=>`<button type="button" data-rsm="${m}" aria-pressed="${st.m===m}">${MN[+m.slice(5,7)-1]}</button>`).join("")+(ms.length>1?`<button type="button" data-rsm="all" aria-pressed="${st.m==="all"}">Все месяцы</button>`:"");
    const C=calc(st.m),BM=byMonth();
    const lbl=st.m==="all"?"за всё время":"за "+MN[+st.m.slice(5,7)-1].toLowerCase();
    let h=`<section class="kpis">${kpi("Остаток на "+(C.startD?dS(C.startD):"начало"),C.start!=null?fmt(C.start)+" сум":"—","утро первого дня с выпиской")}${kpi("Поступило "+lbl,"+"+fmt(C.in)+" сум","терминал, Payme, перечисления","up")}${kpi("Списано "+lbl,"−"+fmt(C.out)+" сум",`${C.outDays} ${C.outDays%10===1&&C.outDays%100!==11?"день":(C.outDays%10>=2&&C.outDays%10<=4&&(C.outDays%100<10||C.outDays%100>=20))?"дня":"дней"} со списаниями`,"down")}${kpi("Остаток на "+(C.endD?dS(C.endD):"конец"),C.end!=null?fmt(C.end)+" сум":"—","по последней выписке")}</section>`;
    h+=`<section class="panel"><h2>Движение по дням${st.m==="all"?"":" · "+MN[+st.m.slice(5,7)-1].toLowerCase()}</h2><p class="note">Зелёное — поступило на счёт, красное — списано, линия — остаток вечером</p>${chart(C.days)}</section>`;
    // по месяцам
    const cats=CAT_NAMES.filter(c=>BM.ms.some(m=>BM.rows[m].cat[c])).sort((a,b)=>BM.ms.reduce((s,m)=>s+(BM.rows[m].cat[b]||0),0)-BM.ms.reduce((s,m)=>s+(BM.rows[m].cat[a]||0),0));
    const tot=c=>BM.ms.reduce((s,m)=>s+(BM.rows[m].cat[c]||0),0);const mx=Math.max(1,...cats.map(tot));
    h+=`<section class="panel"><h2>Расходы по месяцам</h2><p class="note">Все списания со счёта по статьям. Статья определяется по названию расхода; поменять её можно в раскрытом дне ниже.</p>
      <div class="tbl" style="margin-top:10px"><table><thead><tr><th>Статья</th>${BM.ms.map(m=>`<th class="r">${MN[+m.slice(5,7)-1]}</th>`).join("")}<th class="r">Итого</th><th style="min-width:110px"></th></tr></thead><tbody>${cats.map(c=>`<tr><td>${esc(c)}</td>${BM.ms.map(m=>`<td class="r num">${BM.rows[m].cat[c]?fmt(BM.rows[m].cat[c]):'<span class="srcs">—</span>'}</td>`).join("")}<td class="r num"><b>${fmt(tot(c))}</b></td><td><div class="rs-bar"><span style="width:${(tot(c)/mx*100).toFixed(1)}%"></span></div></td></tr>`).join("")}</tbody>
      <tfoot><tr><td><b>Итого списано</b></td>${BM.ms.map(m=>`<td class="r num"><b>${fmt(BM.rows[m].out)}</b></td>`).join("")}<td class="r num"><b>${fmt(BM.ms.reduce((s,m)=>s+BM.rows[m].out,0))}</b></td><td></td></tr></tfoot></table></div>
      <div class="tbl" style="margin-top:16px"><table><thead><tr><th>Месяц</th><th class="r">Остаток на начало</th><th class="r">Поступило</th><th class="r">Списано</th><th class="r">Остаток на конец</th></tr></thead><tbody>${BM.ms.map(m=>{const r=BM.rows[m];return `<tr><td><b>${MN[+m.slice(5,7)-1]}</b></td><td class="r num">${r.start!=null?fmt(r.start):"—"}</td><td class="r num up">+${fmt(r.in)}</td><td class="r num down">−${fmt(r.out)}</td><td class="r num"><b>${r.end!=null?fmt(r.end):"—"}</b></td></tr>`}).join("")}</tbody></table></div></section>`;
    // по дням
    const L=C.days.slice().reverse();
    h+=`<section class="panel"><h2>Расходы по дням${st.m==="all"?"":" · "+MN[+st.m.slice(5,7)-1].toLowerCase()}</h2><p class="note">Нажмите на день, чтобы увидеть все списания, поменять статью или исправить выписку.</p>
      <div class="tbl" style="margin-top:10px"><table class="rs-days"><thead><tr><th>День</th><th class="r">Утром</th><th class="r">Поступило</th><th class="r">Списано</th><th>Расходы</th><th class="r">Вечером</th></tr></thead><tbody>${L.map(x=>{const op=st.open===x.d;return `<tr class="tap${op?" rs-sel":""}" data-rsd="${x.d}"><td>${dS(x.d)} <span class="srcs">${WD[new Date(x.d+"T12:00:00Z").getUTCDay()]}</span></td><td class="r num">${x.s!=null?fmt(x.s):"—"}</td><td class="r num">${x.in>0.5?`<span class="up">+${fmt(x.in)}</span>`:'<span class="srcs">—</span>'}</td><td class="r num">${x.out?`<span class="down">−${fmt(x.out)}</span>`:'<span class="srcs">—</span>'}</td><td class="srcs">${esc(x.bank.slice(0,3).map(b=>b.n).join(", "))}${x.bank.length>3?" …":""}</td><td class="r num"><b>${x.e!=null?fmt(x.e):"—"}</b></td></tr>`+(op?`<tr class="rs-det"><td colspan="6">${x.bank.length?`<div class="tbl"><table><thead><tr><th>Расход</th><th>Статья</th><th class="r">Сумма</th></tr></thead><tbody>${x.bank.map((b,i)=>`<tr><td>${esc(b.n)}</td><td><select class="rs-cat" data-rsi="${i}">${CAT_NAMES.map(c=>`<option${catOf(b)===c?" selected":""}>${esc(c)}</option>`).join("")}</select>${b.c?' <span class="srcs">вручную</span>':""}</td><td class="r num">${fmt(b.a)}</td></tr>`).join("")}</tbody></table></div>`:'<p class="note">Списаний в этот день не было.</p>'}<div style="margin-top:10px"><button type="button" class="sec" data-rsedit="${x.d}">Исправить выписку за ${dS(x.d)}</button></div></td></tr>`:"")}).join("")||'<tr><td colspan="6" class="srcs" style="text-align:center;padding:14px">Нет выписок за период</td></tr>'}</tbody></table></div></section>`;
    el.innerHTML=h;
  }
  // ---------- действия ----------
  function openEditor(day){
    const b=$("rsOldBody"),t=$("rsOldTg");if(!b)return;b.hidden=false;if(t){t.setAttribute("aria-expanded","true");t.querySelector("span").textContent="Свернуть"}
    if(day){const btn=document.querySelector(`#rpDays [data-rd="${day}"]`);if(btn)btn.click()}
    setTimeout(()=>{const p=$("rpRsPanel")||$("rsOld");if(p)p.scrollIntoView({behavior:"smooth",block:"start"})},60);
  }
  document.addEventListener("click",e=>{
    const m=e.target.closest("[data-rsm]");if(m){st.m=m.dataset.rsm;st.open=null;try{localStorage.setItem("kassa.rs.m",st.m)}catch(x){}render();return}
    const d=e.target.closest("tr[data-rsd]");if(d&&!e.target.closest("select")){st.open=st.open===d.dataset.rsd?null:d.dataset.rsd;render();return}
    const ed=e.target.closest("[data-rsedit]");if(ed){openEditor(ed.dataset.rsedit);return}
    if(e.target.closest("#rsAdd")){openEditor(null);return}
    const tg=e.target.closest("#rsOldTg");if(tg){const b=$("rsOldBody");b.hidden=!b.hidden;tg.setAttribute("aria-expanded",String(!b.hidden));tg.querySelector("span").textContent=b.hidden?"Развернуть":"Свернуть";return}
    if(e.target.closest("#rsXlsx"))xlsx();
  });
  document.addEventListener("change",async e=>{
    const s=e.target.closest(".rs-cat");if(!s||!st.open)return;
    const R=S().repDocs[st.open]||{};const bank=(R.bank||[]).slice();const vis=bank.filter(b=>+b.a);const it=vis[+s.dataset.rsi];if(!it)return;
    const idx=bank.indexOf(it);bank[idx]=Object.assign({},it,{c:s.value});
    await S().rpSave(st.open,{bank});render();
  });
  async function xlsx(){
    if(typeof XLSX==="undefined")return;
    const BM=byMonth(),wb=XLSX.utils.book_new();
    const all=days();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["Месяц","Остаток на начало","Поступило","Списано","Остаток на конец"]].concat(BM.ms.map(m=>{const r=BM.rows[m];return [MN[+m.slice(5,7)-1]+" "+m.slice(0,4),r.start,Math.round(r.in),Math.round(r.out),r.end]}))),"По месяцам");
    const cats=CAT_NAMES.filter(c=>BM.ms.some(m=>BM.rows[m].cat[c]));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["Статья"].concat(BM.ms.map(m=>MN[+m.slice(5,7)-1]),["Итого"])].concat(cats.map(c=>[c].concat(BM.ms.map(m=>Math.round(BM.rows[m].cat[c]||0)),[Math.round(BM.ms.reduce((s,m)=>s+(BM.rows[m].cat[c]||0),0))])))),"Статьи");
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["День","Утром","Поступило","Списано","Вечером"]].concat(all.map(x=>[x.d,x.s,x.in==null?null:Math.round(x.in),Math.round(x.out),x.e]))),"По дням");
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["День","Расход","Статья","Сумма"]].concat(all.flatMap(x=>x.bank.map(b=>[x.d,b.n,catOf(b),+b.a])))),"Расходы");
    const out=XLSX.write(wb,{type:"array",bookType:"xlsx"});const blob=new Blob([out],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const dl=await window.claude.use("downloads");await dl.save({filename:"Отчёт по расчётному счёту.xlsx",data:blob});
  }
  window.__RS={render,calc,months,catOf,CAT_NAMES,MN,MNg,openEditor};
})();
