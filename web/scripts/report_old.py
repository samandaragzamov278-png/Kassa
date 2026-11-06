"""Старый сайт на тех же данных: собранный index.html + подставная база из scripts/.out/rp_rows.json и rp_bz.json.
Запуск: uv run --no-project --with playwright python -X utf8 scripts/report_old.py  (после `report-parity.ts rows`)"""
import json, os
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(HERE, ".out")
rows = json.load(open(os.path.join(OUT, "rp_rows.json"), encoding="utf-8"))
bz = json.load(open(os.path.join(OUT, "rp_bz.json"), encoding="utf-8"))
new = json.load(open(os.path.join(OUT, "rp_new.json"), encoding="utf-8"))
src = open(os.path.join(ROOT, "dev", "test", "fakesb_synth.js"), encoding="utf-8").read()
i = src.index("const SEED=") + len("const SEED="); _, end = json.JSONDecoder().raw_decode(src[i:])
fake = src[:i] + json.dumps(rows, ensure_ascii=False) + src[i + end:]
fake = fake.replace('let session=localStorage.getItem("fsess")?{user:{email:"o@x.uz"}}:null;', 'let session={user:{email:"t@x.uz"}};')
fake = fake.replace("eq(k,v){filters.push([k,v]);return api},", "eq(k,v){filters.push([k,v]);return api},gte(){return api},lte(){return api},in(){return api},")
fake = fake.replace("const tab=T[t];", "const tab=T[t]||(T[t]=[]);")
STUB = """(checks)=>{const orig=window.__sb.from.bind(window.__sb);
 window.__sb.from=function(t){if(t!=="bz_check")return orig(t);let rows=checks.slice();const api={select(){return api},gte(k,v){rows=rows.filter(r=>r[k]>=v);return api},lte(k,v){rows=rows.filter(r=>r[k]<=v);return api},eq(k,v){rows=rows.filter(r=>r[k]===v);return api},order(){return api},range(a,b){return Promise.resolve({data:rows.slice(a,b+1),error:null})}};return api};}"""
JS = """async ([months,days,rsMonths,T,f,pts])=>{const S=window.__S,o={months,days,rsMonths};
  months.forEach(m=>{const c=S.rpCalc(m,true);o["rp "+m]={days:c.days,pts:c.pts,rows:c.rows.map(x=>({d:x.d,tot:x.tot,cum:x.cum,bankSum:Math.round(x.bankSum*100)/100,bcSum:x.bcSum,bank:x.bank.map(b=>[b.n,b.a]),bc:x.bc.map(b=>[b.n,b.a,b.p]),pts:Object.fromEntries(c.pts.map(p=>[p,x.pts[p]]))}))}});
  o.gn=Object.fromEntries(days.map(d=>[d,S.rpGN(d)]));
  o.stat={};days.forEach(d=>{const r=S.repDocs[d];const n=["rsStart","rsEnd","grossCash","grossNon"].filter(k=>r&&(k==="grossNon"?(r.date>=S.RP_GN_FROM?S.rpGN(r.date):r[k])!=null:r[k]!=null)).length;o.stat[d]=n===4?"ok":n?"part":"none"});
  const r2=x=>x==null?null:Math.round(x*100)/100;
  [...rsMonths,"all"].forEach(m=>{const c=window.__RS.calc(m);o["rs "+m]={n:c.days.length,start:c.start,startD:c.startD,end:c.end,endD:c.endD,in:r2(c.in),out:r2(c.out),cat:c.cat,outDays:c.outDays}});
  const rc=await window.__BZ.mobileRecon(f,T,"all");
  o.recon=rc.days.map(x=>({d:x.d,p:x.p,bn:x.bn,bq:x.bq,bs:x.bs,kn:x.kn,kq:x.kq,ks:x.ks,nodet:x.nodet,debt:x.debt,ds:x.ds,dq:x.dq,ok:x.ok}));
  o.fm={};days.slice(-30).forEach(d=>pts.forEach(p=>{const k=window.__FM.kassa(d,p),x=window.__FM.fDay(d,p);o.fm[d+"|"+p]={c:k.c,n:k.n,e:k.e,k:k.k,x,on:window.__FM.isOn(p),g:window.__FM.gross(p,d)}}));
  return o}"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(timezone_id="Asia/Tashkent"); p = ctx.new_page()
    p.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    p.route("**/supabase.js", lambda r: r.fulfill(body=fake, content_type="application/javascript"))
    p.goto("file:///" + os.path.join(ROOT, "index.html").replace("\\", "/")); p.wait_for_timeout(4500)
    p.evaluate(STUB, bz)
    p.evaluate("document.querySelector('.tab[data-tab=report]').click()"); p.wait_for_timeout(1200)
    f = (__import__("datetime").date.fromisoformat(new["T"]) - __import__("datetime").timedelta(days=60)).isoformat()
    res = p.evaluate(JS, [new["months"], new["days"], new["rsMonths"], new["T"], f, ["Премиум", "Яшнабад", "Сергели", "C1"]]); b.close()
json.dump(res, open(os.path.join(OUT, "rp_old.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("месяцев", len(res["months"]))
