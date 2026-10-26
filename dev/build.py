import sys
src,out=sys.argv[1],sys.argv[2]
URL="https://qvblxhyftwivkzxucfak.supabase.co";KEY="sb_publishable_-ceoJkpmAZ7Y8osbPHaOlg_3nqUsdB7"
body=open(src,encoding='utf-8').read()
shim=open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'shim.html'),encoding='utf-8').read().replace('__SB_URL__',URL).replace('__SB_KEY__',KEY)
# заставка SAIF-OPTICS — первой в <head>, чтобы закрыть страницу до первой отрисовки
splash=open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'splash','saif-splash.js'),encoding='utf-8').read()
# заголовок, ссылки и стили страницы остаются первыми; шим ставим перед первым <script> страницы
i=body.find('<script')
html='<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ctext y=%22.9em%22 font-size=%2290%22%3E%F0%9F%91%93%3C/text%3E%3C/svg%3E"><script>'+splash+'</script></head><body>'+body[:i]+shim+body[i:]+'</body></html>'
open(out,'w',encoding='utf-8').write(html);print(len(html))
