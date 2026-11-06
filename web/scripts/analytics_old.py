"""Старые Аналитика, Линзы и Склад на тех же данных: собранный index.html рабочего сайта + подставная база из scripts/.out/an-rows.json.
Запуск: uv run --no-project -q --with playwright python -X utf8 scripts/analytics_old.py"""
import json, os
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
rows = json.load(open(os.path.join(HERE, ".out", "an-rows.json"), encoding="utf-8"))
scen = json.load(open(os.path.join(HERE, ".out", "an-scen.json"), encoding="utf-8"))
src = open(os.path.join(ROOT, "dev", "test", "fakesb_synth.js"), encoding="utf-8").read()
i = src.index("const SEED=") + len("const SEED="); _, end = json.JSONDecoder().raw_decode(src[i:])
fake = src[:i] + json.dumps(rows, ensure_ascii=False) + src[i + end:]
fake = fake.replace('let session=localStorage.getItem("fsess")?{user:{email:"o@x.uz"}}:null;', 'let session={user:{email:"t@x.uz"}};')
fake = fake.replace("eq(k,v){filters.push([k,v]);return api},", "eq(k,v){filters.push([k,v]);return api},gte(){return api},lte(){return api},in(){return api},")
fake = fake.replace("const tab=T[t];", "const tab=T[t]||(T[t]=[]);")

HELP = """
const T=e=>e?e.textContent.replace(/[\\u00a0\\u202f\\u2009]/g,' ').replace(/\\s+/g,' ').trim():null;
const q=(r,s)=>[...r.querySelectorAll(s)];
const R=x=>x==null?null:Math.round(x*1e6)/1e6;
const num=s=>{const d=String(s||'').replace(/[^0-9]/g,'');return d?parseInt(d,10):0};
const G=o=>({k:(o.k==null||o.k==='all')?'':o.k,rev:R(o.rev),revC:R(o.revC),cogs:R(o.cogs),gp:R(o.gp),mg:R(o.mg),cov:R(o.cov),n:o.n||0,u:o.u||0});
const cards=sel=>q(document,sel).map(k=>[T(k.querySelector('.eyebrow')),T(k.querySelector('.v')),T(k.querySelector('.d'))]);
const click=s=>document.querySelector(s).click();
"""
SET = "(f)=>{" + HELP + """
const F=window.__S.F;F.from=f.from;F.to=f.to;F.point=f.point;F.cat=f.cat;F.lk=f.lk;
const S=window.__S,o={};
click('.tab[data-tab=analytics]');
const emp=!document.getElementById('anEmpty').hidden;
o.an={empty:emp,cards:emp?[]:cards('#anCards .kpi'),titles:emp?[]:q(document,'#anWidgets .panel.w > h2').map(T)};
o.ownerDom=null;if(!emp){const t=document.querySelector('#anWidgets .pf-tbl');if(t)o.ownerDom=q(t,'tr').map(r=>{const c=r.querySelectorAll('td');const x=T(c[1]);return (x.startsWith('−')?-1:1)*num(x)})}
click('.tab[data-tab=lens]');
const ld=S.lensData();const kinds={};ld.rows.forEach(x=>{const k=[x.kind,x.type,x.idx,x.coat,x.brand].join('|');kinds[k]=(kinds[k]||0)+1});
const le=!document.getElementById('lnEmpty').hidden;
const cp=document.getElementById('lnCostPanel');
let cost=null;if(!le&&!cp.hidden){const tb=cp.querySelector('table tbody');cost={kpi:q(cp,'.kpis .kpi .v').map(T),rows:q(tb,'tr').map(r=>q(r,'td').map(T))}}
o.lens={all:ld.all.length,list:ld.list.length,kinds,a:R(ld.a.rev),cards:le?[]:cards('#lnCards .kpi'),titles:le?[]:q(document,'#lnWidgets .panel.w > h2').map(T),cost};
click('.tab[data-tab=batch]');click('#stViewSeg button[data-sv=margin]');
const md=S.marginData();
o.margin={tot:G(md.tot),pts:md.pts.map(G),cats:md.cats.map(G),prods:md.prods.map(G).sort((a,b)=>a.k.localeCompare(b.k)),miss:md.miss.map(G),nodet:R(md.nodet)};
o.mgCards=cards('#mKpis .kpi').slice(0,3).map(c=>[c[0],c[1]]);
click('#stViewSeg button[data-sv=batch]');
const bs=[...S.batches].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||0)-(a.createdAt||0))[0];
const st=S.batchStats(bs,f.point,f.from,f.to);
o.batch={items:st.items.map(i=>[i.k,i.sold,R(i.rev),i.left,i.pSold,R(i.pRev),i.last,JSON.stringify(i.byPt),JSON.stringify(i.pByPt)]),used:st.used.length,byDay:st.byDay,cards:cards('#bKpis .kpi')};
return o}
"""
STOCK = "()=>{" + HELP + """
click('.tab[data-tab=batch]');click('#stViewSeg button[data-sv=stock]');
return {cards:cards('#sKpis .kpi'),pr:q(document,'#sPlaces tbody tr').map(r=>{const c=q(r,'td').map(T);return [c[0],num(c[2]),num(c[3]),num(c[5]),num(c[6]),num(c[8])]})}}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(timezone_id="Asia/Tashkent"); p = ctx.new_page()
    p.on("pageerror", lambda e: print("pageerror", e))
    p.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    p.route("**/supabase.js", lambda r: r.fulfill(body=fake, content_type="application/javascript"))
    p.goto("file:///" + os.path.join(ROOT, "index.html").replace("\\", "/")); p.wait_for_timeout(4500)
    res = {}
    for name, f in scen.items():
        res[name] = p.evaluate(SET, f); p.wait_for_timeout(50)
    res["__stock"] = p.evaluate(STOCK)
    b.close()
for k, v in res.items():
    if isinstance(v, dict) and "ownerDom" in v:
        own = v.pop("ownerDom")
        if k == "месяц": v["owner"] = own
json.dump(res, open(os.path.join(HERE, ".out", "an-old.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("сценариев", len(scen))
