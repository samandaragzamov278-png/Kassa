// Выручка за 14 дней (Recharts): столбики с подписью в млн / тысячах, лучший день выделен, воскресенье приглушено.
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { DayBar } from "./logic";
import { dLong, fmt } from "../plan/logic";

function Tick({ x, y, payload, bars }: { x?: number; y?: number; payload?: { value: string }; bars: DayBar[] }) {
  const b = bars.find((z) => z.d === payload?.value); if (!b) return null;
  return <g transform={`translate(${x},${y})`}><text textAnchor="middle" dy={12} fontSize={11} fontWeight={700} className="fill-foreground">{b.n}</text><text textAnchor="middle" dy={25} fontSize={10} className={b.sun ? "fill-minus" : "fill-muted-foreground"}>{b.wd}</text></g>;
}
function Tip({ active, payload }: { active?: boolean; payload?: { payload: DayBar }[] }) {
  const b = active && payload?.[0]?.payload; if (!b) return null;
  return <div className="glass rounded-xl px-3 py-2 text-xs"><b>{dLong(b.d)}</b><div className="num mt-0.5">{fmt(b.v)} сум</div></div>;
}

export function WeekChart({ bars }: { bars: DayBar[] }) {
  return (
    <div className="h-[210px] w-full" role="img" aria-label="Выручка по дням за 14 дней">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bars} margin={{ top: 18, right: 2, left: 2, bottom: 0 }} barCategoryGap="14%">
          <XAxis dataKey="d" tickLine={false} axisLine={false} interval={0} tick={<Tick bars={bars} />} height={34} />
          <Tooltip content={<Tip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
          <Bar dataKey="v" radius={[5, 5, 0, 0]} minPointSize={3} animationDuration={700}>
            {bars.map((b) => <Cell key={b.d} fill={b.best ? "var(--primary)" : "var(--chart-1)"} fillOpacity={b.best ? 1 : b.sun || !b.v ? 0.25 : 0.55} />)}
            <LabelList dataKey="label" position="top" fontSize={9.5} className="fill-muted-foreground" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
