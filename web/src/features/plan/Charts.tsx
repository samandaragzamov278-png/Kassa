// График «Темп по дням» (Recharts) и таблица «По неделям».
import { Bar as RBar, BarChart, CartesianGrid, Cell, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { Bar } from "./parts";
import { dLong, dShort, fmt, fmtM, type DayBar, type WeekRow } from "./logic";

function Tip({ active, payload }: { active?: boolean; payload?: { payload: DayBar }[] }) {
  const b = active && payload?.[0]?.payload; if (!b) return null;
  return <div className="glass rounded-xl px-3 py-2 text-xs"><b>{dLong(b.d)}</b><div className="num mt-0.5">{b.off ? "выходной" : fmt(b.v) + " сум"}</div></div>;
}

export function DaysChart({ bars, tgt, need }: { bars: DayBar[]; tgt: number; need: number | null }) {
  const top = Math.max(tgt * 1.25, ...bars.map((b) => b.v), 1);
  return (
    <div className="h-[250px] w-full" role="img" aria-label="Выручка по дням и план">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bars} margin={{ top: 16, right: 6, left: 0, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
          {bars.filter((b) => b.off).map((b) => <ReferenceArea key={b.d} x1={b.d} x2={b.d} fill="var(--muted)" fillOpacity={0.7} ifOverflow="visible" />)}
          <XAxis dataKey="d" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={10} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(d: string) => String(+d.slice(8))} />
          <YAxis domain={[0, top]} width={56} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => fmtM(v).replace(" ", " ")} tickCount={5} />
          <Tooltip content={<Tip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
          <ReferenceLine y={tgt} stroke="var(--foreground)" strokeDasharray="5 5" strokeOpacity={0.6} label={{ value: `план в день ${fmtM(tgt)}`, position: "insideTopRight", fontSize: 11, fill: "var(--foreground)" }} />
          {need != null && need > tgt && <ReferenceLine y={Math.min(top, need)} stroke="var(--minus)" strokeDasharray="2 4" label={{ value: `нужно теперь ${fmtM(need)}`, position: "insideTopLeft", fontSize: 11, fill: "var(--minus)" }} />}
          <RBar dataKey="v" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700}>
            {bars.map((b) => <Cell key={b.d} fill={b.ok ? "var(--plus)" : "var(--primary)"} />)}
          </RBar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeeksTable({ weeks }: { weeks: WeekRow[] }) {
  return (
    <div className="-mx-1 px-1">
      <table className="w-full border-separate border-spacing-0 text-[12.5px] sm:text-sm">
        <thead><tr className="text-left text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase sm:text-[11px]">
          <th className="pb-2 font-semibold">Неделя</th><th className="hidden pb-2 text-right font-semibold sm:table-cell">Раб. дней</th><th className="pb-2 text-right font-semibold">План</th><th className="pb-2 text-right font-semibold">Факт</th><th className="pb-2 text-right font-semibold">Разница</th><th className="hidden w-[110px] pb-2 sm:table-cell" />
        </tr></thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.from} className={cn(w.cur && "bg-accent")}>
              <td className="rounded-l-xl border-t border-border px-1.5 py-2.5 whitespace-nowrap sm:px-2">{dShort(w.from)} — {dShort(w.to)}{w.cur ? <span className="block text-[11px] text-primary sm:ml-1 sm:inline sm:text-inherit"> · сейчас</span> : ""}</td>
              <td className="num hidden border-t border-border px-2 py-2.5 text-right sm:table-cell">{w.wd}</td>
              <td className="num border-t border-border px-1.5 py-2.5 text-right whitespace-nowrap sm:px-2">{fmt(w.plan)}</td>
              <td className="num border-t border-border px-1.5 py-2.5 text-right whitespace-nowrap sm:px-2">{w.fut ? "—" : fmt(w.fact)}</td>
              <td className={cn("num border-t border-border px-1.5 py-2.5 text-right whitespace-nowrap sm:px-2", w.fut ? "text-muted-foreground" : w.diff >= 0 ? "text-plus" : "text-minus")}>{w.fut ? "—" : (w.diff >= 0 ? "+" : "") + fmt(w.diff)}</td>
              <td className="hidden rounded-r-xl border-t border-border px-2 py-2.5 sm:table-cell"><Bar v={w.ratio} color={w.plan && w.fact >= w.plan ? "var(--plus)" : "var(--primary)"} h={8} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
