// Платежи месяца по неделям: сумма и «оплачено» правятся на месте, статус — одним нажатием.
import { AnimatePresence, motion } from "motion/react";
import { RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineNumber } from "@/components/Inline";
import { cn } from "@/lib/utils";
import type { Data } from "@/lib/types";
import { CATS, MN, MNg, SRC, addM, baseAmount, dLong, dim, fmt, words, wd, type MonthRow } from "./logic";
import { CatIcon, StatusChip } from "./parts";

type Props = { d: Data; M: string; T: string; rows: MonthRow[]; open: string | null; setOpen: (id: string | null) => void;
  onPlan: (id: string, v: number | null) => void; onPaid: (r: MonthRow, v: number | null) => void; onToggle: (r: MonthRow) => void; onReset: (id: string) => void; onEdit: (id: string) => void };

const GRID = "grid grid-cols-[52px_minmax(0,1fr)_128px_128px_168px] items-center gap-2.5 max-lg:grid-cols-[46px_minmax(0,1fr)_minmax(0,1fr)] max-lg:gap-y-1.5";

export function MonthList({ d, M, T, rows, open, setOpen, onPlan, onPaid, onToggle, onReset, onEdit }: Props) {
  const weeks: [number, number][] = [[1, 7], [8, 14], [15, 21], [22, 28], [29, 31]];
  const tot = rows.reduce((s, r) => s + r.am.a, 0), paid = rows.reduce((s, r) => s + Math.min(r.paid, r.am.a || r.paid), 0), left = rows.reduce((s, r) => s + r.left, 0);
  return (
    <div className="flex flex-col">
      <div className={cn(GRID, "border-b border-border px-2 pb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase max-lg:hidden")}>
        <span>День</span><span>Платёж</span><span className="text-right">Сумма</span><span className="text-right">Оплачено</span><span>Статус</span>
      </div>
      {weeks.map(([a, b]) => {
        const L = rows.filter((r) => { const x = +r.due.slice(8); return x >= a && x <= b; }); if (!L.length) return null;
        return (
          <div key={a}>
            <div className="flex justify-between px-2 pt-4 pb-1.5 text-[12.5px] font-semibold text-muted-foreground"><span>{a}–{Math.min(b, dim(M))} {MNg[+M.slice(5, 7) - 1]}</span><span className="num">{fmt(L.reduce((s, r) => s + r.am.a, 0))} сум</span></div>
            {L.map((r) => {
              const it = r.it, sel = open === it.id;
              return (
                <div key={it.id}>
                  <motion.div layout className={cn(GRID, "rounded-2xl p-2 transition-colors hover:bg-muted/70", sel && "bg-accent", r.st === "ok" && "opacity-90")}>
                    <button type="button" onClick={() => setOpen(sel ? null : it.id)} aria-expanded={sel}
                      className={cn("glass-inner flex size-[46px] flex-col max-lg:row-span-3 max-lg:self-start items-center justify-center rounded-2xl leading-tight outline-none focus-visible:ring-3 focus-visible:ring-primary/30",
                        r.due === T && "ring-2 ring-primary", r.st === "late" && "border-minus/50")}>
                      <b className="num text-[17px]">{+r.due.slice(8)}</b><small className="text-[10.5px] text-muted-foreground">{wd(r.due)}</small>
                    </button>
                    <button type="button" onClick={() => setOpen(sel ? null : it.id)} aria-expanded={sel} className="flex min-w-0 items-center gap-2.5 text-left outline-none max-lg:col-span-2">
                      <CatIcon cat={it.cat} size="sm" />
                      <span className="flex min-w-0 flex-col leading-snug"><b className="truncate font-semibold">{it.name}</b>
                        <small className="truncate text-xs text-muted-foreground">{CATS[it.cat] || CATS.other} · {SRC[it.src]}{it.point && it.point !== "Общее" ? " · " + it.point : ""}{it.kind === "plan" ? " · разовый" : it.kind === "debt" ? " · погашение долга" : ""}</small></span>
                    </button>
                    <span className="flex flex-col items-end gap-0.5 max-lg:col-start-2 max-lg:row-start-2 max-lg:items-start">
                      <InlineNumber value={r.am.a} label="Сумма за месяц" onSave={(v) => onPlan(it.id, v)} className="max-lg:-ml-2 max-lg:text-left" />
                      {r.am.own ? <button type="button" onClick={() => onReset(it.id)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary" title={`Вернуть общую сумму ${fmt(baseAmount(d, it, M).a)}`}><RotateCcw className="size-3" />своя сумма</button>
                        : r.am.est ? <small className="text-[11px] text-muted-foreground">расчётно</small> : r.am.usd ? <small className="text-[11px] text-muted-foreground">{fmt(r.am.usd)} $</small> : null}
                    </span>
                    <span className="flex flex-col items-end gap-0.5 max-lg:col-start-3 max-lg:row-start-2">
                      <InlineNumber value={r.paid || null} placeholder="—" label="Оплачено" onSave={(v) => onPaid(r, v)} className={cn(r.st === "ok" && "text-plus")} />
                      {r.auto > 0 && <small className="text-[11px] text-muted-foreground">по выписке {fmt(r.auto)}</small>}
                    </span>
                    <span className="max-lg:col-span-2 max-lg:col-start-2 max-lg:row-start-3"><StatusChip r={r} T={T} onClick={() => onToggle(r)} /></span>
                  </motion.div>
                  <AnimatePresence initial={false}>
                    {sel && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                        <div className="glass-inner mx-2 mt-1 mb-2 grid gap-4 rounded-2xl p-4 lg:ml-[62px] lg:grid-cols-[1fr_auto]">
                          <div className="min-w-0">
                            <h4 className="mb-1.5 text-[13px] font-semibold">Где нашлась оплата</h4>
                            {r.hits.map((h, i) => <div key={i} className="flex justify-between gap-3 border-b border-border py-1.5 text-[13px] last:border-0"><span className="min-w-0 truncate">{dLong(h.d)} · <span className="text-muted-foreground">{h.f}</span> {h.n}</span><b className="num">{fmt(h.a)}</b></div>)}
                            {!r.hits.length && <p className="text-[13px] text-muted-foreground">{words(it).length ? `В выписке и Кассе за ${MN[+M.slice(5, 7) - 1].toLowerCase()} строк со словами «${words(it).filter((x) => x[0] !== "-").join("», «")}» нет.` : "Слова для поиска не заданы — отмечайте оплату вручную."}</p>}
                            {r.man > 0 && <div className="flex justify-between gap-3 py-1.5 text-[13px]"><span>{r.mk?.date ? dLong(r.mk.date) : ""} · <span className="text-muted-foreground">вручную</span></span><b className="num">{fmt(r.man)}</b></div>}
                            {it.auto === "tax" && !r.am.own && <p className="mt-1 text-[13px] text-muted-foreground">{it.pct || 0}% с безнала за {MN[+addM(M, -1).slice(5, 7) - 1].toLowerCase()}: {fmt(r.am.base || 0)} сум.</p>}
                            {it.note && <p className="mt-1 text-[13px] text-muted-foreground">{it.note}</p>}
                          </div>
                          <div><Button variant="outline" onClick={() => onEdit(it.id)}><Settings2 />Все настройки</Button></div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_128px_128px_168px] items-center gap-2.5 border-t border-border px-2 pt-3 font-semibold max-lg:grid-cols-[1fr_auto_auto]">
        <span>Итого за месяц</span><span className="num text-right">{fmt(tot)}</span><span className="num pr-2 text-right">{fmt(paid)}</span>
        <span className="max-lg:hidden">{left ? `осталось ${fmt(left)}` : <span className="rounded-full bg-plus-soft px-3 py-1 text-xs text-plus">Всё оплачено</span>}</span>
      </div>
    </div>
  );
}
