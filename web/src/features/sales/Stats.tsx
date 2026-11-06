// «Статистика»: две плитки — график выручки по точкам и таблица по периодам (дни / недели / месяцы).
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Panel } from "@/components/kit";
import { cn } from "@/lib/utils";
import { WD, fmt, fmtM, niceStep, periodLabel, pointColor, statsOf, wdIdx, type Ctx, type Filter, type Group, type SaleX, type StF } from "./logic";
import { Field, Pager, Seg, usePager } from "./parts";
import { useWidth } from "./useWidth";

const GROUPS: [Group, string][] = [["day", "Дни"], ["week", "Недели"], ["month", "Месяцы"]];
const Dash = () => <span className="text-muted-foreground">—</span>;

export function Stats({ c, F, list, resetKey }: { c: Ctx; F: Filter; list: SaleX[]; resetKey: string }) {
  const [g, setG] = useState<Group>("day"), [stF, setStF] = useState<StF>({ from: "", to: "", wd: [] });
  useEffect(() => setStF({ from: "", to: "", wd: [] }), [resetKey]);
  const S = statsOf(c, F, list, g, stF), pg = usePager(S.desc.length);
  const [ref, w] = useWidth<HTMLDivElement>();
  const n = S.asc.length, slot = n > 24 ? 26 : Math.max(26, Math.max(w - 56, 200) / Math.max(n, 1)), W = Math.max(w, 56 + slot * n);
  const data = S.asc.map((r) => ({ k: r.k, label: periodLabel(r.k, g), tot: r.tot, ...Object.fromEntries(S.pts.map((p) => [p, r.by[p] || 0])) }));
  const max = Math.max(1, ...S.asc.map((r) => r.tot)), step = niceStep(max / 4), top = Math.ceil(max / step) * step || 1;
  const wd = new Set(stF.wd);
  const toggleWd = (i: number) => setStF((x) => { const s = new Set(x.wd); s.has(i) ? s.delete(i) : s.add(i); return { ...x, wd: s.size === 7 ? [] : [...s] }; });

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Panel title="Выручка по точкам" note="Столбик — выручка периода, цвет — точка" action={<Seg value={g} onChange={setG} options={GROUPS} label="Группировка" />}>
        <div ref={ref} className="overflow-x-auto" role="img" aria-label="Выручка по периодам">
          {!n ? <p className="py-10 text-center text-[13px] text-muted-foreground">Нет продаж за период</p> : w > 0 && (
            <BarChart width={W} height={250} data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={Math.max(0, Math.ceil(n / Math.max(4, Math.floor(W / 56))) - 1)} />
              <YAxis width={58} tickLine={false} axisLine={false} domain={[0, top]} ticks={Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)} tickFormatter={(v: number) => fmtM(v).replace(" ", " ")} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip cursor={{ fill: "var(--muted)" }} content={({ active, payload, label }) => !active || !payload?.length ? null : (
                <div className="glass rounded-xl px-3 py-2 text-[12.5px]"><b>{label}</b>
                  {[...payload].reverse().filter((p) => +(p.value as number) > 0).map((p) => <div key={String(p.dataKey)} className="flex items-center justify-between gap-4"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: p.color }} />{p.name}</span><b className="num">{fmt(+(p.value as number))}</b></div>)}
                  <div className="mt-1 flex justify-between gap-4 border-t border-border pt-1"><span>Итого</span><b className="num">{fmt(payload.reduce((a, p) => a + (+(p.value as number) || 0), 0))}</b></div></div>)} />
              {S.pts.map((p, i) => <Bar key={p} dataKey={p} name={p} stackId="a" fill={pointColor(p, c.settings.points)} radius={i === S.pts.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false} />)}
            </BarChart>)}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">{S.pts.map((p) => <span key={p} className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: pointColor(p, c.settings.points) }} />{p}</span>)}</div>
      </Panel>

      <Panel title="Таблица по периодам" note="Выручка точек, чеки и средний чек">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
          <Field label="С"><Input type="date" aria-label="Таблица: с" value={S.from} min={S.range.from} max={S.range.to} onChange={(e) => setStF((x) => ({ ...x, from: e.target.value, to: S.to }))} className="num w-[9.5rem] max-sm:w-[calc(50vw-3.3rem)]" /></Field>
          <Field label="По"><Input type="date" aria-label="Таблица: по" value={S.to} min={S.range.from} max={S.range.to} onChange={(e) => setStF((x) => ({ ...x, to: e.target.value, from: S.from }))} className="num w-[9.5rem] max-sm:w-[calc(50vw-3.3rem)]" /></Field>
          <Field label="Дни недели"><div role="group" aria-label="Дни недели" className="inline-flex flex-wrap gap-0.5 rounded-xl bg-muted p-[3px]">
            {WD.map((d, i) => <button key={d} type="button" data-wd={i} aria-pressed={!wd.has(i)} onClick={() => toggleWd(i)} className={cn("rounded-[9px] px-2 py-1 text-[12.5px] font-medium", !wd.has(i) ? "bg-popover text-foreground shadow-sm" : "text-muted-foreground line-through")}>{d}</button>)}</div></Field>
          <Button type="button" variant="secondary" onClick={() => setStF({ from: "", to: "", wd: [] })}>Сбросить</Button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <Table id="sales-period-table">
            <TableHeader><TableRow><TableHead>{g === "day" ? "День" : g === "week" ? "Неделя" : "Месяц"}</TableHead>{S.pts.map((p) => <TableHead key={p} className="text-right">{p}</TableHead>)}<TableHead className="text-right">Итого</TableHead><TableHead className="text-right">Чеков</TableHead><TableHead className="text-right">Ср. чек</TableHead></TableRow></TableHeader>
            <TableBody>{!n ? <TableRow><TableCell colSpan={S.pts.length + 4} className="text-muted-foreground">Нет продаж в выбранные дни</TableCell></TableRow> : pg.slice(S.desc).map((r) => (
              <TableRow key={r.k}><TableCell className="num whitespace-nowrap">{periodLabel(r.k, g)}{g === "day" && <> <span className="text-xs text-muted-foreground">{WD[wdIdx(r.k)]}</span></>}</TableCell>
                {S.pts.map((p) => <TableCell key={p} className="num text-right">{r.by[p] ? fmt(r.by[p]) : <Dash />}</TableCell>)}
                <TableCell className="num text-right font-semibold">{fmt(r.tot)}</TableCell><TableCell className="num text-right">{r.ch}</TableCell><TableCell className="num text-right">{r.ch ? fmt(r.tot / r.ch) : "—"}</TableCell></TableRow>))}</TableBody>
            {n > 0 && <TableFooter><TableRow><TableCell className="font-semibold">Всего</TableCell>{S.pts.map((p) => <TableCell key={p} className="num text-right font-semibold">{fmt(S.ptTot[p])}</TableCell>)}
              <TableCell className="num text-right font-semibold">{fmt(S.sa.rev)}</TableCell><TableCell className="num text-right font-semibold">{S.sa.checks}</TableCell><TableCell className="num text-right font-semibold">{S.sa.checks ? fmt(S.sa.avg) : "—"}</TableCell></TableRow></TableFooter>}
          </Table>
        </div>
        <Pager pg={pg} />
      </Panel>
    </div>
  );
}
