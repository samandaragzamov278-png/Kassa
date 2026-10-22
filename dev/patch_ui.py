#!/usr/bin/env python3
"""Касса: единый вид переключателей и стрелок. Применять последним."""
import sys, io
SRC = sys.argv[1]; h = io.open(SRC, encoding="utf-8").read()
def rep(old, new, cnt=1):
    global h
    n = h.count(old); assert n == cnt, (old[:90], n); h = h.replace(old, new)
rep('<label class="chk"><input type="checkbox" id="fSaveTpl"> сохранить как шаблон</label>',
    '<label class="tgl"><input type="checkbox" role="switch" id="fSaveTpl"><span class="tg" aria-hidden="true"></span><span>сохранить как шаблон</span></label>')
rep('<i>⌄</i>', '<i><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg></i>')
rep('.art-tg i{font-style:normal;transition:transform .3s}', '.art-tg i{font-style:normal;transition:transform .3s;display:inline-flex}')
io.open(SRC, "w", encoding="utf-8").write(h); print("ok")
