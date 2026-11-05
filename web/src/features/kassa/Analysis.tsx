// Анализ расходов месяца и Б/Ч по дням (Recharts).
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { dShort, fmt, type BcDay, type Kassa, analysis } from "./logic";

export function Split({ c }: { c: Kassa }) {
  const tot = c.sOp + c.sOth || 1;
  return (
    <div className="flex flex-col gap-2 text-[13.5px]">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted"><i className="block bg-primary" style={{ width: `${(c.sOp / tot) * 100}%` }} /><i className="block bg-warn" style={{ width: `${(c.sOth / tot) * 100}%` }} /></div>
      <div className="flex justify-between"><span className="flex items-center gap-2"><i className="size-2.5 rounded-sm bg-primary" />Операционные · {c.op.length} зап.</span><span className="num">{fmt(c.sOp)} · {Math.round((c.sOp / tot) * 100)}%</span></div>
      <div className="flex justify-between"><span className="flex items-center gap-2"><i className="size-2.5 rounded-sm bg-warn" />Прочие · {c.oth.length} зап.</span><span className="num">{fmt(c.sOth)} · {Math.round((c.sOth / tot) * 100)}%</span></div>
      <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Всего расходов</span><span className="num">{fmt(c.sOp + c.sOth)}</span></div>
    </div>
  );
}

export function Articles({ a }: { a: ReturnType<typeof analysis> }) {
  const [all, setAll] = useState(false);
  if (!a.arts.length) return <p className="text-[13px] text-muted-foreground">Нет мелких расходов</p>;
  const max = a.arts[0][1].v || 1, L = all ? a.arts : a.arts.slice(0, 6);
  return (
    <div className="flex flex-col gap-2.5 text-[13px]">
      {L.map(([k, o]) => (
        <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1"><span className="truncate">{k} <span className="text-muted-foreground">· {o.n} раз</span></span><b className="num">{fmt(o.v)}</b>
          <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted"><i className={o.cat === "op" ? "block h-full bg-primary" : "block h-full bg-warn"} style={{ width: `${(o.v / max) * 100}%` }} /></span></div>))}
      {a.arts.length > 6 && <Button variant="ghost" size="sm" onClick={() => setAll(!all)}>{all ? "Свернуть статьи" : `Показать все статьи · ${a.arts.length}`}</Button>}
      <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Итого с Б/Ч</span><span className="num">{fmt(a.sSmall)}</span></div>
      <h4 className="mt-2 font-semibold">По точкам</h4>
      {a.byPoint.map(([k, v]) => <div key={k} className="flex justify-between"><span>{k}</span><span className="num">{fmt(v)} · {Math.round((v / (a.sSmall || 1)) * 100)}%</span></div>)}
      {a.byDay.length > 0 && <><h4 className="mt-2 font-semibold">По дням</h4>
        <div className="flex justify-between"><span>Самый затратный день</span><span className="num">{dShort(a.byDay[0][0])} · {fmt(a.byDay[0][1])}</span></div>
        <div className="flex justify-between"><span>В среднем за день с расходами</span><span className="num">{fmt(a.sSmall / (a.ndays || 1))}</span></div>
        <div className="flex justify-between"><span>Дней с расходами</span><span className="num">{a.ndays}</span></div></>}
    </div>
  );
}

export function Insights({ items }: { items: string[] }) {
  const md = (t: string) => t.split(/\*\*(.+?)\*\*/g).map((x, i) => (i % 2 ? <b key={i}>{x}</b> : x));
  return <ul className="flex list-disc flex-col gap-2 pl-5 text-[13.5px] leading-relaxed">{(items.length ? items : ["Добавьте расходы, чтобы увидеть выводы."]).map((t, i) => <li key={i}>{md(t)}</li>)}</ul>;
}

export function DayChart({ days }: { days: BcDay[] }) {
  const data = days.map((d) => ({ d: dShort(d.d), Премиум: d.p, Яшнабад: d.y, C1: d.c || 0 }));
  if (!data.length) return <p className="text-[13px] text-muted-foreground">В этом месяце продаж наличными ещё нет.</p>;
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -10, right: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="d" fontSize={11} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" />
          <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" tickFormatter={(v) => (v / 1e6).toFixed(1).replace(".", ",") + " млн"} />
          <Tooltip cursor={{ fill: "var(--muted)" }} formatter={(v) => fmt(Number(v))} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)" }} />
          <Bar dataKey="Премиум" stackId="a" fill="var(--chart-1)" /><Bar dataKey="Яшнабад" stackId="a" fill="var(--chart-2)" /><Bar dataKey="C1" stackId="a" fill="#30b0c7" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
