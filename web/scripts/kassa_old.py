"""Старая Касса на тех же данных: собранный index.html рабочего сайта + подставная база из scripts/.out/rows.json.
Запуск: uv run --no-project --with playwright python -X utf8 scripts/kassa_old.py"""
import json, os
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
rows = json.load(open(os.path.join(HERE, ".out", "rows.json"), encoding="utf-8"))
src = open(os.path.join(ROOT, "dev", "test", "fakesb_synth.js"), encoding="utf-8").read()
i = src.index("const SEED=") + len("const SEED="); _, end = json.JSONDecoder().raw_decode(src[i:])
fake = src[:i] + json.dumps(rows, ensure_ascii=False) + src[i + end:]
fake = fake.replace('let session=localStorage.getItem("fsess")?{user:{email:"o@x.uz"}}:null;', 'let session={user:{email:"t@x.uz"}};')
fake = fake.replace("eq(k,v){filters.push([k,v]);return api},", "eq(k,v){filters.push([k,v]);return api},gte(){return api},lte(){return api},in(){return api},")
fake = fake.replace("const tab=T[t];", "const tab=T[t]||(T[t]=[]);")
JS = """()=>{const K=window.__K;const ms=K.kMonths();const o={months:ms};
  ms.forEach(m=>{const c=K.compute(m);const st=K.cashState(c,m);o[m]={expected:c.expected,bcT:c.bcT,bcP:c.bcP,bcY:c.bcY,bcC:c.bcC,sInc:c.sInc,sOp:c.sOp,sOth:c.sOth,sRsvMove:c.sRsvMove,sRsvExp:c.sRsvExp,saved:c.saved,days:c.days.length,actual:st?st.actual:null}});
  const t=(document.getElementById('tRsv')||{}).textContent||'';o.reserve=+t.replace(/[^0-9−-]/g,'').replace('−','-');return o}"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(timezone_id="Asia/Tashkent"); p = ctx.new_page()
    p.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    p.route("**/supabase.js", lambda r: r.fulfill(body=fake, content_type="application/javascript"))
    p.goto("file:///" + os.path.join(ROOT, "index.html").replace("\\", "/")); p.wait_for_timeout(4500)
    p.evaluate("document.querySelector('.tab[data-tab=kassa]').click()"); p.wait_for_timeout(1200)
    res = p.evaluate(JS); b.close()
json.dump(res, open(os.path.join(HERE, ".out", "old.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("месяцев", len(res["months"]))
