"""Старые «План» и «Главная» на тех же данных: собранный index.html рабочего сайта + подставная база из scripts/.out/plan-rows.json.
Запуск: uv run --no-project -q --with playwright python -X utf8 scripts/plan_old.py"""
import json, os
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
rows = json.load(open(os.path.join(HERE, ".out", "plan-rows.json"), encoding="utf-8"))
src = open(os.path.join(ROOT, "dev", "test", "fakesb_synth.js"), encoding="utf-8").read()
i = src.index("const SEED=") + len("const SEED="); _, end = json.JSONDecoder().raw_decode(src[i:])
fake = src[:i] + json.dumps(rows, ensure_ascii=False) + src[i + end:]
fake = fake.replace('let session=localStorage.getItem("fsess")?{user:{email:"o@x.uz"}}:null;', 'let session={user:{email:"t@x.uz"}};')
fake = fake.replace("eq(k,v){filters.push([k,v]);return api},", "eq(k,v){filters.push([k,v]);return api},gte(){return api},lte(){return api},in(){return api},")
fake = fake.replace("const tab=T[t];", "const tab=T[t]||(T[t]=[]);")

HOME = """()=>{
const T=e=>e?e.textContent.replace(/[\\u00a0\\u202f\\u2009]/g,' ').replace(/\\s+/g,' ').trim():null;
const q=(r,s)=>[...r.querySelectorAll(s)];
const o={};
o.date=T(document.getElementById('hmDate'));
o.hero=q(document,'#hmHero .kpi').map(k=>[T(k.querySelector('.eyebrow')),T(k.querySelector('.v')),T(k.querySelector('.d'))]);
o.briefNote=T(document.getElementById('hmBriefNote'));
o.brief=q(document,'#hmBrief .hm-bi').map(k=>[T(k.querySelector('.t')),T(k.querySelector('b')),T(k.querySelector('.d'))]);
o.wkNote=T(document.getElementById('hmWkNote'));
o.bars=q(document,'#hmWeek .wk-c').map(k=>[k.getAttribute('title').replace(/[\\u00a0\\u202f]/g,' '),T(k.querySelector('.wk-v')),T(k.querySelector('.wk-d'))]);
o.cards=q(document,'#hmGrid .hm-card').map(k=>[T(k.querySelector('.t')),T(k.querySelector('.s')),q(k,'.nums > div').map(x=>[T(x.querySelector('b')),T(x.querySelector('span'))])]);
o.ptNote=T(document.getElementById('hmPtNote'));
o.pts=q(document,'#hmPoints .hb').map(k=>[T(k.querySelector('.name')),T(k.querySelector('.val')),T(k.querySelector('.hm-sub'))]);
const kv=document.querySelector('#hmPoints .kv');o.ptTotal=kv?q(kv,'b').map(T):null;
o.last=q(document,'#hmLast .hm-row').map(k=>[T(k.querySelector('.n')),T(k.querySelector('.m')),T(k.querySelector('b'))]);
return o}"""

PLAN = """(m)=>{
const T=e=>e?e.textContent.replace(/[\\u00a0\\u202f\\u2009]/g,' ').replace(/\\s+/g,' ').trim():null;
const q=(r,s)=>[...r.querySelectorAll(s)];
const S=window.__S,K=S.plCalc(m),total=K.c.total,o={};
o.period=T(document.getElementById('plPeriod'));
o.total=total;o.fact=K.fact;o.factBefore=K.factBefore;o.workN=K.work.length;o.doneN=K.done.length;o.leftN=K.left.length;o.past=K.past;o.future=K.future;o.shares=K.shares;
if(!total){o.S=null;return o}
const st=S.plStats(total,K.fact,K.factBefore,K.work,K.done,K.left,K.past);o.S=st;
const hero=document.querySelector('#plHero .pl-hero');
o.hero={ring:T(hero.querySelector('.pl-ring text')).replace(/ плана$/,''),big:T(hero.querySelector('.big')),small:T(hero.querySelector('.pl-main small')),status:T(hero.querySelector('.pl-status')),
  need:q(hero,'.pl-need .kpi').map(k=>[T(k.querySelector('.eyebrow')),T(k.querySelector('.v')),T(k.querySelector('.d')).replace(/ · линия — выручка по рабочим дням$/,'')])};
o.weeks=q(document,'#plWeeks tbody tr').map(r=>q(r,'td').slice(0,5).map(T));
o.points=q(document,'#plPoints .pl-pt').map(c=>({nm:T(c.querySelector('.nm')),sl:T(c.querySelector('.sl')),rank:T(c.querySelector('.rank'))||'',
  amount:[T(c.querySelector('b.num')),T(c.querySelector('b.num').nextElementSibling)],grid:q(c,'.pl-grid > div').map(x=>[T(x.querySelector('span')),T(x.querySelector('b'))])}));
o.pointStats={};
S.settings.points.forEach(p=>{const sh=K.shares[p]||0;if(!(sh>0||K.list.some(s=>s.point===p)))return;
  const l=K.list.filter(s=>s.point===p),pt=total*sh/100,f=l.reduce((a,s)=>a+(+s.sum||0),0),fb=l.filter(s=>s.date<K.today).reduce((a,s)=>a+(+s.sum||0),0);
  o.pointStats[p]=Object.assign({pt,f},S.plStats(pt,f,fb,K.work,K.done,K.left,K.past,p))});
return o}"""

with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(timezone_id="Asia/Tashkent"); p = ctx.new_page()
    p.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    p.route("**/supabase.js", lambda r: r.fulfill(body=fake, content_type="application/javascript"))
    p.goto("file:///" + os.path.join(ROOT, "index.html").replace("\\", "/")); p.wait_for_timeout(4500)
    p.evaluate("document.querySelector('.tab[data-tab=home]').click()"); p.wait_for_timeout(1200)
    res = {"home": p.evaluate(HOME)}
    p.evaluate("document.querySelector('.tab[data-tab=plan]').click()"); p.wait_for_timeout(800)
    months = p.evaluate("[...document.querySelectorAll('#plMonthSeg [data-pm]')].map(b=>b.dataset.pm)")
    res["months"] = months
    for m in months:
        p.evaluate("m=>document.querySelector('#plMonthSeg [data-pm=\"'+m+'\"]').click()", m); p.wait_for_timeout(1800)
        res["plan " + m] = p.evaluate(PLAN, m)
    b.close()
json.dump(res, open(os.path.join(HERE, ".out", "plan-old.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("месяцев", len(months))
