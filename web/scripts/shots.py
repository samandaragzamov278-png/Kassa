# Скриншоты всех разделов новой версии (1440 тёмная, 390 светлая) + ошибки консоли + горизонтальная прокрутка.
# Запуск: uv run --no-project -q --with playwright python -X utf8 -I scripts/shots.py http://localhost:5173
# Картинки кладёт рядом со скриптом в scripts/.out/shots (в .gitignore).
import json, os, sys
from playwright.sync_api import sync_playwright
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".out", "shots"); os.makedirs(OUT, exist_ok=True); BASE = sys.argv[1]
tabs = ["home","kassa","report","pay","sales","recon","analytics","plan","lens","batch"]
res = {}
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w, scheme in [(1440,"dark"),(390,"light")]:
        p = b.new_page(viewport={"width": w, "height": 900}, color_scheme=scheme); errs=[]
        p.on("pageerror", lambda e: errs.append(str(e)[:200])); p.on("console", lambda m: m.type=="error" and errs.append(m.text[:200]))
        for t in tabs:
            errs.clear(); p.goto(f"{BASE}/?demo#{t}"); p.wait_for_timeout(1800)
            ov = p.evaluate("document.documentElement.scrollWidth > innerWidth + 1")
            p.screenshot(path=os.path.join(OUT, f"{t}_{w}.png"))
            res[f"{t}_{w}"] = {"errors": list(errs), "hscroll": ov, "h": p.evaluate("document.body.scrollHeight")}
        p.close()
    # быстрые кнопки Главной
    p = b.new_page(viewport={"width":1440,"height":900})
    for btn, lab in [("Продажа","Товар"),("Расход",None),("Пересчитать кассу","Сколько наличных в кассе")]:
        p.goto(f"{BASE}/?demo#home"); p.wait_for_timeout(1500)
        p.get_by_role("button", name=btn, exact=True).first.click(); p.wait_for_timeout(1500)
        res["btn "+btn] = p.evaluate("[location.hash, document.activeElement && (document.activeElement.getAttribute('aria-label')||document.activeElement.placeholder)]")
    res["help button"] = p.goto(f"{BASE}/?demo#home") and p.wait_for_timeout(1200) or p.get_by_text("Инструкция").count()
    b.close()
print(json.dumps(res, ensure_ascii=False, indent=1))
