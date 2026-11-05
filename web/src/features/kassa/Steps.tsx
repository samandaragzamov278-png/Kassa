// Расчёт по шагам: Б/Ч → приходы → операционные → прочие → в резерв → расходы из резерва → должно быть.
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Entry } from "@/lib/types";
import { dShort, fmt, val, type Kassa } from "./logic";
import { pl } from "../pay/logic";

const byDate = (a: Entry, b: Entry) => (a.date || "").localeCompare(b.date || "") || (a.createdAt || 0) - (b.createdAt || 0);
const Items = ({ arr }: { arr: Entry[] }) => (
  <ul className="mt-2 flex flex-col">{[...arr].sort(byDate).map((e) => (
    <li key={e.id} className="flex justify-between gap-3 border-b border-border py-1.5 text-[13px] last:border-0"><span className="min-w-0 truncate">{dShort(e.date)} · {e.name}</span>
      <span className="num whitespace-nowrap">{typeof e.fact === "number" && e.fact !== +(e.amount || 0) ? <><s className="text-muted-foreground">{fmt(e.amount || 0)}</s> {fmt(e.fact)}</> : fmt(val(e))}</span></li>))}</ul>
);

export function Steps({ c, rsvBal }: { c: Kassa; rsvBal: number }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const tog = (k: string) => setOpen((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  let run = c.bcT;
  const last = c.days.length ? c.days[c.days.length - 1].d : "", nX = c.days.filter((d) => d.src === "Excel").length, nS = c.days.length - nX;
  type S = { k: string; sign: string; tone: string; title: string; sub: string; amt: string; run: string; n: number; body: React.ReactNode };
  const steps: S[] = [];
  steps.push({ k: "bc", sign: "=", tone: "bg-primary/15 text-primary", title: `Б/Ч ${c.bcC ? "Премиума, Яшнабада и C1" : "Премиума и Яшнабада"}${c.days.length ? " с " + dShort(c.days[0].d) : ""}${last ? " по " + dShort(last) : ""}`,
    sub: `Премиум ${fmt(c.bcP)} + Яшнабад ${fmt(c.bcY)}${c.bcC ? ` + C1 ${fmt(c.bcC)}` : ""}${nS ? ` · из продаж: ${nS} дн.` : ""}${nX ? ` · из отчёта: ${nX} дн.` : ""}`, amt: fmt(c.bcT), run: fmt(run), n: c.days.length,
    body: <ul className="mt-2 flex flex-col">{c.days.map((d) => <li key={d.d} className="flex justify-between gap-3 border-b border-border py-1.5 text-[13px] last:border-0"><span className="min-w-0 truncate">{dShort(d.d)} · Премиум {fmt(d.p)} · Яшнабад {fmt(d.y)}{d.c ? ` · C1 ${fmt(d.c)}` : ""} <span className="text-muted-foreground">({d.src === "Excel" ? "отчёт" : "продажи"})</span></span><span className="num">{fmt(d.p + d.y + (d.c || 0))}</span></li>)}</ul> });
  run += c.sInc; steps.push({ k: "inc", sign: "+", tone: "bg-plus-soft text-plus", title: "Приходы", sub: c.inc.length ? "добавлено к Б/Ч" : "пока нет", amt: "+" + fmt(c.sInc), run: fmt(run), n: c.inc.length, body: <Items arr={c.inc} /> });
  run -= c.sOp; steps.push({ k: "op", sign: "−", tone: "bg-primary/12 text-primary", title: "Операционные расходы", sub: "расходы дня Премиума, Яшнабада и C1", amt: "−" + fmt(c.sOp), run: fmt(run), n: c.op.length, body: <Items arr={c.op} /> });
  run -= c.sOth; steps.push({ k: "oth", sign: "−", tone: "bg-warn-soft text-warn", title: "Прочие расходы", sub: "крупные платежи: поставщики, бухгалтер, мастера", amt: "−" + fmt(c.sOth), run: fmt(run), n: c.oth.length, body: <Items arr={c.oth} /> });
  if (c.rsvMove.length) { run -= c.sRsvMove; steps.push({ k: "rsv", sign: "−", tone: "bg-warn-soft text-warn", title: "Переведено в резерв", sub: "из кассы в резерв", amt: "−" + fmt(c.sRsvMove), run: fmt(run), n: c.rsvMove.length, body: <Items arr={c.rsvMove} /> }); }
  steps.push({ k: "rsvx", sign: "·", tone: "bg-muted text-muted-foreground", title: "Расходы из резерва", sub: c.rsvExp.length ? "оплачены резервом, касса не меняется" : "в этом месяце не было", amt: "−" + fmt(c.sRsvExp), run: "в резерве " + fmt(rsvBal), n: c.rsvExp.length, body: <Items arr={c.rsvExp} /> });
  return (
    <div className="flex flex-col">
      {steps.map((s) => { const on = open.has(s.k) && s.n > 0; return (
        <div key={s.k} className="border-b border-border py-3">
          <button type="button" disabled={!s.n} onClick={() => tog(s.k)} aria-expanded={on} className="grid w-full grid-cols-[34px_minmax(0,1fr)_auto] items-start gap-3 text-left disabled:cursor-default">
            <span className={cn("grid size-[30px] place-items-center rounded-full text-[15px] font-bold", s.tone)}>{s.sign}</span>
            <span className="min-w-0"><b className="flex items-center gap-1 font-semibold">{s.title}{s.n > 0 && <ChevronRight className={cn("size-4 transition-transform", on && "rotate-90")} />}</b>
              <span className="block text-[12.5px] text-muted-foreground">{s.sub}{s.n > 0 && <> · <span className="text-primary">{on ? "свернуть" : `показать ${s.n} ${pl(s.n, "запись", "записи", "записей")}`}</span></>}</span></span>
            <span className="flex flex-col items-end"><b className="num">{s.amt}</b><small className="num text-xs text-muted-foreground">{s.k === "rsvx" ? s.run : "остаток " + s.run}</small></span>
          </button>
          <AnimatePresence initial={false}>{on && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pl-[46px]">{s.body}</motion.div>}</AnimatePresence>
        </div>); })}
      <div className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 pt-3"><span className="grid size-[30px] place-items-center rounded-full bg-primary text-[15px] font-bold text-white">=</span><b>Должно быть наличными</b><b className="num text-lg">{fmt(c.expected)}</b></div>
    </div>
  );
}
