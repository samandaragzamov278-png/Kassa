/* Касса · общий показ больших таблиц: «Показывать 10 · 20 · 30 · 40 · 50» и листание страниц.
   Работает для любой таблицы .tbl / .rp-tbl, где больше 10 строк. Выбор размера запоминается для каждой таблицы. */
(function(){
  "use strict";
  const SIZES=[10,20,30,40,50];
  const ls={get(k,d){try{const v=localStorage.getItem("kassa.pg."+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("kassa.pg."+k,JSON.stringify(v))}catch(e){}}};
  const pages=new Map();
  // строки-подробности (раскрытый день, чеки) идут вместе со своей строкой
  const isSub=tr=>/(^|\s)(\S+-det\S*|pay-detr|t-group)(\s|$)/.test(tr.className||"");
  const skip=tb=>tb.classList.contains("heat")||tb.classList.contains("pgt")||!!tb.querySelector("tr.mrow")||!!tb.closest("#payEd,.kpis,.pg-off");
  function keyOf(tb){
    const page=tb.closest(".page");const box=tb.closest(".panel,.dcblk,section");const h=box&&box.querySelector("h2,h3,.dchead");
    return (page?page.id:"")+"|"+(tb.id||"")+"|"+(h?h.textContent.replace(/\s+/g," ").trim().slice(0,40):"");
  }
  const fmt=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g," ");
  function apply(tb){
    const body=tb.tBodies[0];const wrap=tb.closest(".tbl,.rp-tbl")||tb;
    let bar=wrap.nextElementSibling&&wrap.nextElementSibling.classList.contains("pgbar")?wrap.nextElementSibling:null;
    if(!body||skip(tb)){if(bar)bar.remove();return}
    const groups=[];[...body.rows].forEach(tr=>{if(isSub(tr)&&groups.length)groups[groups.length-1].push(tr);else groups.push([tr])});
    const n=groups.length;
    if(n<=SIZES[0]){groups.forEach(g=>g.forEach(tr=>{if(tr.style.display==="none")tr.style.display=""}));if(bar)bar.remove();return}
    const key=keyOf(tb),size=ls.get(key,SIZES[0]),pc=Math.ceil(n/size);
    let pg=Math.min(pages.get(key)||0,pc-1);
    // раскрытая строка-подробность — показываем страницу, где она
    const openIdx=groups.findIndex(g=>g.length>1);if(openIdx>=0&&tb._pgOpen!==openIdx){pg=Math.floor(openIdx/size);tb._pgOpen=openIdx}
    pages.set(key,pg);
    groups.forEach((g,i)=>{const on=i>=pg*size&&i<(pg+1)*size;g.forEach(tr=>{const d=on?"":"none";if(tr.style.display!==d)tr.style.display=d})});
    const sig=[size,pg,n].join("|");
    if(bar&&bar.dataset.sig===sig)return;
    if(!bar){bar=document.createElement("div");bar.className="pgbar";wrap.after(bar)}
    bar.dataset.sig=sig;bar._tb=tb;bar._key=key;
    bar.innerHTML=`<div class="pg-size"><span>Показывать</span><div class="seg" role="group" aria-label="Строк на странице">${SIZES.map(s=>`<button type="button" data-pgs="${s}" aria-pressed="${s===size}">${s}</button>`).join("")}</div></div>
      <div class="pg-nav"><button type="button" class="pg-btn" data-pgp="-1" aria-label="Назад"${pg?"":" disabled"}>‹</button><span class="pg-info">${fmt(pg*size+1)}–${fmt(Math.min(n,(pg+1)*size))} из ${fmt(n)}</span><button type="button" class="pg-btn" data-pgp="1" aria-label="Вперёд"${pg<pc-1?"":" disabled"}>›</button></div>`;
  }
  function scan(){document.querySelectorAll(".tbl table,.rp-tbl table").forEach(tb=>{try{apply(tb)}catch(e){}})}
  let raf=0;const q=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;scan()})};
  new MutationObserver(ms=>{if(ms.some(m=>!(m.target.closest&&m.target.closest(".pgbar"))))q()}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener("click",e=>{const b=e.target.closest(".pgbar button");if(!b)return;const bar=b.closest(".pgbar"),tb=bar._tb,key=bar._key;if(!tb)return;
    if(b.dataset.pgs){ls.set(key,+b.dataset.pgs);pages.set(key,0)}else{pages.set(key,Math.max(0,(pages.get(key)||0)+(+b.dataset.pgp)))}
    tb._pgOpen=-1;apply(tb);const top=(tb.closest(".tbl,.rp-tbl")||tb).getBoundingClientRect().top;if(top<0)(tb.closest(".panel")||tb).scrollIntoView({behavior:"smooth",block:"start"})});
  document.addEventListener("DOMContentLoaded",q);q();
  window.__PG={scan};
})();
