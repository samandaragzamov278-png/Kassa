// Общий фильтр периода: «Сегодня / 7 дней / месяц / прошлый месяц / всё время», даты, месяц, точка, категория.
// Состояние общее для всех разделов, где он подключён (Продажи, Аналитика, Линзы), как на рабочем сайте.
// Использование: const { F, pick } = useSalesFilter(); <SalesFilter d={d} />  (в «Линзах» — <SalesFilter d={d} lens />)
import { useSyncExternalStore } from "react";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/kit";
import type { Data } from "@/lib/types";
import { Field, Sel, Seg } from "./parts";
import { MONTHS_F, curMonth, ctxOf, dLong, defaultFilter, filtered, lensKindsIn, matchOf, monthEnd, monthsOf, presetRange, rangeOf, todayTash, type Ctx, type Filter, type SaleX } from "./logic";

let state: Filter = defaultFilter();
const subs = new Set<() => void>();
const get = () => state;
const sub = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const put = (p: Partial<Filter>) => { state = { ...state, ...p }; subs.forEach((f) => f()); };

export const PRESETS: [string, string][] = [["today", "Сегодня"], ["7d", "7 дней"], ["month", "Этот месяц"], ["prev", "Прошлый месяц"], ["all", "Всё время"]];

/** состояние фильтра и действия над ним */
export function useSalesFilter() {
  const F = useSyncExternalStore(sub, get, get);
  return {
    F,
    set: put,
    setPreset: (p: string) => put({ preset: p, ...presetRange(p, todayTash()) }),
    setRange: (from: string, to: string) => put({ from, to, preset: "custom" }),
    setMonth: (m: string) => { if (!m) return; const t = todayTash(); let to = monthEnd(m); if (to > t) to = t; put({ from: m + "-01", to, preset: "custom" }); },
    setPoint: (point: string) => put({ point }),
    setCat: (cat: string) => put({ cat }),
    setLens: (lk: string) => put({ lk }),
    /** продажи, прошедшие фильтр (период, точка, категория) */
    pick: (c: Ctx): SaleX[] => filtered(c, F),
    match: matchOf(F),
  };
}

export function SalesFilter({ d, lens, className }: { d: Data; lens?: boolean; className?: string }) {
  const f = useSalesFilter(), { F } = f, c = ctxOf(d), months = monthsOf(c.sales), cm = curMonth(F, c.today);
  const r = rangeOf(F, filtered(c, F), c.today);
  const info = F.from || F.to ? `Показано: ${dLong(F.from || r.from)} — ${dLong(F.to || r.to)}` + (F.point !== "all" ? ` · ${F.point}` : "") + (F.cat !== "all" ? ` · ${F.cat}` : "") : "Показаны все продажи";
  const lk = lens ? lensKindsIn(c, F) : [];
  return (
    <Panel title="Период" className={className}>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <Seg value={F.preset === "custom" ? "" : F.preset} onChange={f.setPreset} options={PRESETS} label="Период" />
        <div className="flex items-end gap-2">
          <Field label="С"><Input type="date" value={F.from} onChange={(e) => f.setRange(e.target.value, F.to)} aria-label="С" className="num w-[9.5rem] max-sm:w-[calc(50vw-3.3rem)]" /></Field>
          <Field label="По"><Input type="date" value={F.to} onChange={(e) => f.setRange(F.from, e.target.value)} aria-label="По" className="num w-[9.5rem] max-sm:w-[calc(50vw-3.3rem)]" /></Field>
        </div>
        <Field label="Месяц" className="w-44 max-sm:w-[calc(50%-.5rem)]"><Sel label="Месяц" value={cm} onChange={f.setMonth} options={[{ v: "", l: "Свой период" }, ...months.map((m) => ({ v: m, l: MONTHS_F[+m.slice(5, 7) - 1] + " " + m.slice(0, 4) }))]} /></Field>
        <Field label="Точка" className="w-44 max-sm:w-[calc(50%-.5rem)]"><Sel label="Точка" value={F.point} onChange={f.setPoint} options={[{ v: "all", l: "Все точки" }, ...c.settings.points]} /></Field>
        {lens
          ? <Field label="Вид линзы" className="w-52 max-sm:w-full"><Sel label="Вид линзы" value={F.lk} onChange={f.setLens} options={[{ v: "all", l: "Все виды линз" }, ...lk]} /></Field>
          : <Field label="Категория" className="w-52 max-sm:w-full"><Sel label="Категория" value={F.cat} onChange={f.setCat} options={[{ v: "all", l: "Все категории" }, ...c.settings.cats]} /></Field>}
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground">{info}</p>
    </Panel>
  );
}
