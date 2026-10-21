import os,json
from playwright.sync_api import sync_playwright
D=os.path.dirname(os.path.abspath(__file__));STUB=open(D+'/bzstub.js').read()
CHECK='''()=>{
 const out=[];const W=document.documentElement.clientWidth;
 if(document.documentElement.scrollWidth>W+1)out.push("горизонтальная прокрутка "+document.documentElement.scrollWidth+">"+W);
 // соседние блоки без промежутка
 const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=="hidden"};
 document.querySelectorAll(".page:not([hidden]) .kpis, .page:not([hidden]) .panel, .page:not([hidden]) section").forEach(a=>{
   const b=a.nextElementSibling;if(!b||!vis(a)||!vis(b))return;
   if(!(b.matches(".panel,.kpis,section")))return;
   const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();
   if(rb.top>=ra.bottom-1&&rb.top-ra.bottom<4&&Math.abs(ra.left-rb.left)<40)out.push("нет отступа: "+(a.id||a.className).slice(0,40)+" → "+(b.id||b.className).slice(0,40)+" ("+Math.round(rb.top-ra.bottom)+"px)");
 });
 // элементы шире экрана
 document.querySelectorAll(".page:not([hidden]) *").forEach(e=>{if(!vis(e))return;const r=e.getBoundingClientRect();const clip=x=>{for(let q=x.parentElement;q&&q!==document.body;q=q.parentElement){if(getComputedStyle(q).overflowX!=="visible")return true}return false};if(r.right>W+2&&!e.closest(".tbl,.seg,.tabs,.m-chips,table")&&!clip(e))out.push("выходит за экран: "+e.tagName+"."+String(e.className).slice(0,30)+" "+Math.round(r.right))});
 return [...new Set(out)].slice(0,12)}'''
TABS=["home","kassa","report","sales","recon","analytics","plan","lens","batch","help"]
with sync_playwright() as pw:
    b=pw.chromium.launch();rep={}
    for name,vw in [("desk",(1440,950)),("lap",(1280,800)),("tab",(820,1180))]:
      for theme in ["light","dark"]:
        errs=[]
        ctx=b.new_context(viewport={'width':vw[0],'height':vw[1]},color_scheme=theme);p=ctx.new_page()
        p.on('pageerror',lambda e:errs.append(str(e)[:150]));p.on('console',lambda m:m.type=='error' and 'ERR_FAILED' not in m.text and errs.append(m.text[:150]))
        p.route("https://fonts.googleapis.com/**",lambda r:r.abort())
        p.route("**/supabase.js",lambda r:r.fulfill(path=D+"/fakesb_synth.js",content_type="application/javascript"))
        p.route("**/xlsx.full.min.js",lambda r:r.fulfill(path=D+"/xlsx.full.min.js"))
        p.goto("file://"+os.path.abspath(D+"/../../index.html"));p.wait_for_timeout(1000)
        p.fill('#sbEmail','o@x.uz');p.fill('#sbPass','pass12345');p.click('#sbGo');p.wait_for_timeout(2500)
        p.evaluate(STUB+';window.__installBz()');p.add_style_tag(content='.ios-pre{opacity:1!important;transform:none!important;filter:none!important}*{animation:none!important;transition:none!important}')
        for t in TABS:
            p.evaluate(f'document.querySelector(\'.tab[data-tab="{t}"]\').click()');p.wait_for_timeout(900)
            views=[None]
            if t=="batch":views=["bzst","bztr","margin","stock","batch"]
            for v in views:
                if v:p.evaluate(f'document.querySelector(\'#stViewSeg [data-sv="{v}"]\').click()');p.wait_for_timeout(900)
                r=p.evaluate(CHECK)
                if r:rep[f"{name}/{theme}/{t}{'/'+v if v else ''}"]=r
        if errs:rep[f"{name}/{theme}/ОШИБКИ"]=list(dict.fromkeys(errs))[:8]
        ctx.close()
    # телефон
    errs=[];ctx=b.new_context(viewport={'width':375,'height':812},is_mobile=True,has_touch=True);p=ctx.new_page()
    p.on('pageerror',lambda e:errs.append(str(e)[:150]))
    p.route("https://fonts.googleapis.com/**",lambda r:r.abort())
    p.route("**/supabase.js",lambda r:r.fulfill(path=D+"/fakesb_synth.js",content_type="application/javascript"))
    p.goto("file://"+os.path.abspath(D+"/../../index.html"));p.wait_for_timeout(1000)
    p.fill('#sbEmail','o@x.uz');p.fill('#sbPass','pass12345');p.click('#sbGo');p.wait_for_timeout(2500);p.evaluate(STUB+';window.__installBz()')
    for t in ["today","kassa","sales","report"]:
        p.evaluate(f'document.querySelector(\'#mApp [data-tab="{t}"]\').click()');p.wait_for_timeout(700)
        w=p.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')
        if w>1:rep["phone/"+t]=["горизонтальная прокрутка "+str(w)]
    for s in ["analytics","plan","lens","batch","billz","recon","help"]:
        p.evaluate('document.querySelector(\'#mApp [data-tab="more"]\').click()');p.wait_for_timeout(400)
        p.evaluate(f'document.querySelector(\'[data-sub="{s}"]\').click()');p.wait_for_timeout(1200)
        w=p.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')
        if w>1:rep["phone/"+s]=["горизонтальная прокрутка "+str(w)]
    if errs:rep["phone/ОШИБКИ"]=errs[:8]
    print(json.dumps(rep,ensure_ascii=False,indent=1));b.close()
