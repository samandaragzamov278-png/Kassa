"""Старые «Продажи» на тех же данных: собранный index.html рабочего сайта + подставная база из scripts/.out/sales-rows.json.
Значения берутся из DOM страницы «Продажи» (плитки, касса дня, таблица статистики, календарь, журнал) и из файлов выгрузки.
Запуск: uv run --no-project -q --with playwright --with openpyxl python -X utf8 scripts/sales_old.py"""
import json, os
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(HERE, ".out")
rows = json.load(open(os.path.join(OUT, "sales-rows.json"), encoding="utf-8"))
scn = json.load(open(os.path.join(OUT, "sales-scn.json"), encoding="utf-8"))
src = open(os.path.join(ROOT, "dev", "test", "fakesb_synth.js"), encoding="utf-8").read()
i = src.index("const SEED=") + len("const SEED="); _, end = json.JSONDecoder().raw_decode(src[i:])
fake = src[:i] + json.dumps(rows, ensure_ascii=False) + src[i + end:]
fake = fake.replace('let session=localStorage.getItem("fsess")?{user:{email:"o@x.uz"}}:null;', 'let session={user:{email:"t@x.uz"}};')
fake = fake.replace("eq(k,v){filters.push([k,v]);return api},", "eq(k,v){filters.push([k,v]);return api},gte(){return api},lte(){return api},in(){return api},")
fake = fake.replace("const tab=T[t];", "const tab=T[t]||(T[t]=[]);")

SET = """(sc)=>{
  const $=id=>document.getElementById(id), ch=el=>el.dispatchEvent(new Event('change',{bubbles:true}));
  if(sc.preset)document.querySelector('#presetSeg [data-p="'+sc.preset+'"]').click();
  else{$('fFrom').value=sc.from;$('fTo').value=sc.to;ch($('fFrom'))}
  $('fPoint').value=sc.point||'all';ch($('fPoint'));
  $('fCatS').value=sc.cat||'all';ch($('fCatS'));
  document.querySelector('#groupSeg [data-g="'+sc.group+'"]').click();
  $('stReset').click();
  (sc.wd||[]).forEach(i=>document.querySelector('#stWd [data-wd="'+i+'"]').click());
  document.querySelectorAll('#dayCashWrap [data-dc]').forEach(b=>{if(b.getAttribute('aria-expanded')!=='true')b.click()});
  for(let k=0;k<20;k++){const b=[...document.querySelectorAll('#dayCashWrap [data-dc]')].find(x=>x.getAttribute('aria-expanded')!=='true');if(!b)break;b.click()}
  $('sCalToday').click();
}"""

GET = """(sc)=>{
  const $=id=>document.getElementById(id);
  const N=t=>{t=String(t).replace(/[−–]/g,'-').replace(/[^\\d-]/g,'');return t&&t!=='-'?parseInt(t,10):0};
  const T=e=>e.textContent.replace(/\\s+/g,' ').trim();
  const kpi=[...document.querySelectorAll('#salesKpis .kpi')].map(k=>T(k.querySelector('.v')).split('/').map(N));
  const cmp=[...document.querySelectorAll('#salesKpis .kpi')].map((k,i)=>i===3?'':T(k.querySelector('.d')).replace(/\\u00a0/g,' ').trim());
  const dc={};
  document.querySelectorAll('#dayCashWrap .dcblk').forEach(b=>{
    const head=b.querySelector('.dchead .l');const pt=T(head).replace(/Б\\/Ч (в кассу|на точке)$/,'').replace(/^[▾▸]s*/,'').trim();
    if(b.querySelector('.dcempty')){dc[pt]={empty:T(b.querySelector('.dcempty .r2'))};return}
    const trs=[...b.querySelectorAll('tbody tr')].map(r=>{const c=[...r.children];return [T(c[0])].concat(c.slice(1).map(x=>N(x.textContent)))});
    const foot=[...b.querySelectorAll('tfoot tr td')].slice(1).map(x=>N(x.textContent));
    dc[pt]={rows:trs,foot:foot};
  });
  const pt=$('periodTable');const period={head:[],rows:[],foot:[]};
  period.head=[...pt.querySelectorAll('thead th')].map((x,i)=>i===0?'':T(x));
  [...pt.querySelectorAll('tbody tr')].forEach(r=>{const c=[...r.children];if(c.length<3)return;period.rows.push([T(c[0])].concat(c.slice(1).map(x=>N(x.textContent))))});
  period.foot=[...pt.querySelectorAll('tfoot td')].slice(1).map(x=>N(x.textContent));
  const calRead=(withToday)=>{
    const title=$('sCalTitle').textContent;
    const sum=[...$('sCalSum').querySelectorAll(':scope>div:not(.scal-plan)')];
    const g=l=>{const d=sum.find(x=>x.textContent.startsWith(l));return d?N(d.querySelector('b').textContent):0};
    const days=[...$('sCalGrid').querySelectorAll('[data-cd]')].filter(b=>/: /.test(b.title)).map(b=>b.dataset.cd+':'+N(b.title.split(': ')[1])).sort();
    let P=null;const pl=$('sCalSum').querySelector('.scal-plan');
    if(pl){const bs=[...pl.querySelectorAll('.sp-g div')].map(x=>N(x.querySelector('b').textContent));P=[N(pl.querySelector('.sp-t b').textContent),N(pl.querySelector('.sp-c').textContent),bs[0],bs[1],bs[2],bs[3]]}
    const o={M:null,total:g('Выручка за месяц'),wd:g('Дней с продажами'),avg:g('В среднем за день'),days:days,P:P,title:title,today:null};
    if(withToday){const dd=$('sCalDay');const big=dd.querySelector('.big');o.today={rev:big?N(big.textContent):0,ck:big?N(dd.querySelector('.sub').textContent.split('·')[0]):0}}
    return o};
  const MN=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const mk=o=>{const [mn,y]=o.title.split(' ');o.M=y+'-'+String(MN.indexOf(mn)+1).padStart(2,'0');delete o.title;return o};
  const cal=[];cal.push(mk(calRead(true)));
  if($('sCalPrev').disabled)cal.push(null);else{$('sCalPrev').click();cal.push(mk(calRead(false)));$('sCalNext').click()}
  const jd=$('jDate').value;
  const journal={day:jd,n:N($('jInfo').textContent.split('·')[1]),tot:N($('jInfo').textContent.split('·')[2]),cols:[...document.querySelectorAll('#jGrid .jcol')].map(c=>{
    const nm=T(c.querySelector('.jp')).replace(/\\s*\\d+ поз\\.$/,'').trim();const n=N(T(c.querySelector('.jp .srcs')));
    const sum=N(c.querySelector('.jh b').textContent);const pays=[...c.querySelectorAll('.jpay span b')].map(x=>N(x.textContent));
    let ex=0,bch=null;c.querySelectorAll('.jft div').forEach(d=>{const t=T(d);if(t.startsWith('Расходы дня'))ex=-N(d.querySelector('.num').textContent);else bch=N(d.querySelector('b').textContent)});
    return {pt:nm,n:n,sum:sum,pays:pays,ex:ex,bch:bch}})};
  return {kpi:kpi,cmp:cmp,dc:dc,period:period,cal:cal,journal:journal};
}"""

def sheets_of(path):
    import openpyxl
    wb = openpyxl.load_workbook(path, data_only=True); out = {}
    for ws in wb.worksheets:
        rs = []
        for r in ws.iter_rows(min_row=4, values_only=True):
            v = ["" if x is None else x for x in r]
            if any(x != "" for x in v): rs.append(v)
        out[ws.title] = rs
    return out

res = []
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(timezone_id="Asia/Tashkent", accept_downloads=True, viewport={"width": 1440, "height": 1000}); p = ctx.new_page()
    p.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    p.route("**/supabase.js", lambda r: r.fulfill(body=fake, content_type="application/javascript"))
    p.goto("file:///" + os.path.join(ROOT, "index.html").replace("\\", "/")); p.wait_for_timeout(4500)
    p.evaluate("document.querySelector('.tab[data-tab=sales]').click()"); p.wait_for_timeout(1500)
    for k, sc in enumerate(scn):
        p.evaluate(SET, sc); p.wait_for_timeout(1700)
        o = p.evaluate(GET, sc)
        try:
            with p.expect_download(timeout=5000) as d:
                p.evaluate("document.getElementById('expCsv').click()")
            o["csv"] = open(d.value.path(), encoding="utf-8", newline="").read()
        except Exception as e:
            o["csv"] = None
        if k in (0, 7, 9):
            try:
                with p.expect_download(timeout=25000) as d:
                    p.evaluate("document.getElementById('expXlsx').click()")
                xp = os.path.join(OUT, "old.xlsx"); d.value.save_as(xp); o["sheets"] = sheets_of(xp)
            except Exception as e:
                print("Excel не выгрузился:", str(e)[:80]); o["sheets"] = None
        res.append(o)
    b.close()
json.dump(res, open(os.path.join(OUT, "sales-old.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("сценариев", len(res))
