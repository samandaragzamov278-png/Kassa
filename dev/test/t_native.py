import os,json
from playwright.sync_api import sync_playwright
D=os.path.dirname(os.path.abspath(__file__));STUB=open(D+'/bzstub.js').read()
CHK='''()=>{const vis=e=>{const r=e.getBoundingClientRect();return r.width>2&&r.height>2&&getComputedStyle(e).visibility!=="hidden"&&getComputedStyle(e).opacity!=="0"};const out=[];
document.querySelectorAll('.page:not([hidden]) select, .page:not([hidden]) input[type=date], .page:not([hidden]) input[type=checkbox], .page:not([hidden]) input[type=radio], .ios-pop select').forEach(e=>{if(!vis(e))return;if(e.closest(".tgl"))return;out.push(e.tagName+"#"+(e.id||e.className||e.name))});
document.querySelectorAll('.page:not([hidden]) button').forEach(b=>{if(vis(b)&&/[⌄⌃]/.test(b.textContent))out.push("кнопка с символом-стрелкой: "+b.textContent.trim().slice(0,30))});
return out}'''
with sync_playwright() as pw:
    b=pw.chromium.launch();rep={}
    p=b.new_page(viewport={'width':1440,'height':950},color_scheme="dark")
    p.route("https://fonts.googleapis.com/**",lambda r:r.abort())
    p.route("**/supabase.js",lambda r:r.fulfill(path=D+"/fakesb_synth.js" if not os.environ.get("REAL") else os.environ["REAL"],content_type="application/javascript"))
    p.goto("file://"+os.path.abspath(D+"/../../index.html"));p.wait_for_timeout(1000)
    p.fill('#sbEmail','o@x.uz');p.fill('#sbPass','pass12345');p.click('#sbGo');p.wait_for_timeout(2500)
    p.evaluate(STUB+';window.__installBz()')
    def chk(name):
        p.wait_for_timeout(700);r=p.evaluate(CHK)
        if r:rep[name]=r
    for t in ["home","kassa","report","sales","recon","analytics","plan","lens","batch","help"]:
        p.evaluate(f'document.querySelector(\'.tab[data-tab="{t}"]\').click()');chk(t)
        if t=="report":
            p.evaluate('document.getElementById("rsAdd").click()');chk("report/открыт ввод")
            p.evaluate("const r=document.querySelector(\"tr[data-rsd]\");r&&r.click()");chk("report/день")
        if t=="kassa":
            for sel in ["#addPanel button","[data-st]"]:
                pass
        if t=="recon":
            p.evaluate('const r=document.querySelector("tr[data-day]");r&&r.click()');chk("recon/день")
        if t=="batch":
            for v in ["bzst","bztr","margin","stock","batch"]:
                p.evaluate(f'document.querySelector(\'#stViewSeg [data-sv="{v}"]\').click()');chk("batch/"+v)
    print(json.dumps(rep,ensure_ascii=False,indent=1));b.close()
