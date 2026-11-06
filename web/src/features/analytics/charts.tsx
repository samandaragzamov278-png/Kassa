// Графики Аналитики, Линз и Склада на Recharts: линия, столбцы, группы столбцов, кольцо, водопад, Парето, мини-линия и полосы.
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import type { Bar as HBar } from "./base";
import { fmt, fmtM, niceStep } from "./util";

const TICK = { fontSize: 10.5, fill: "var(--muted-foreground)" };
const GRID = "var(--border)";
const TT = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12.5, boxShadow: "var(--shadow)" }, labelStyle: { color: "var(--muted-foreground)", fontSize: 11.5 }, itemStyle: { color: "var(--popover-foreground)" } };
const top = (mx: number) => { const step = niceStep(Math.max(1, mx) / 4); return Math.ceil(Math.max(1, mx) / step) * step; };

export function None({ text = "Нет данных за период" }: { text?: string }) { return <p className="py-3 text-[13px] text-muted-foreground">{text}</p>; }

export function Legend({ items }: { items: { label: string; color: string; dash?: boolean }[] }) {
  return <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">{items.map((i) => <span key={i.label} className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-[3px]" style={{ background: i.color, opacity: i.dash ? 0.55 : 1 }} />{i.label}</span>)}</div>;
}

export function Spark({ vals, color = "var(--primary)", light }: { vals: number[]; color?: string; light?: boolean }) {
  if (!vals || vals.length < 2) return null;
  const data = vals.map((v, i) => ({ i, v }));
  return <div className="h-8 w-28 shrink-0" aria-hidden><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 3, bottom: 3, left: 1, right: 1 }}><Line type="monotone" dataKey="v" stroke={light ? "rgb(255 255 255 / 0.95)" : color} strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>;
}
export function MiniRing({ p, color = "var(--primary)", light }: { p: number; color?: string; light?: boolean }) {
  const R = 20, C = 2 * Math.PI * R, v = Math.max(0, Math.min(1, p));
  return (
    <svg viewBox="0 0 52 52" className="size-12 shrink-0" aria-hidden>
      <circle cx="26" cy="26" r={R} fill="none" strokeWidth="6" stroke={light ? "rgb(255 255 255 / 0.3)" : "var(--border)"} />
      <circle cx="26" cy="26" r={R} fill="none" strokeWidth="6" strokeLinecap="round" stroke={light ? "#fff" : color} strokeDasharray={`${C * v} ${C}`} transform="rotate(-90 26 26)" />
      <text x="26" y="29.5" textAnchor="middle" fontSize="10.5" fontWeight="600" fill={light ? "#fff" : "currentColor"}>{Math.round(p * 100)}%</text>
    </svg>
  );
}

export function LineC({ labels, series, h = 240 }: { labels: string[]; series: { name: string; color: string; vals: (number | null)[]; area?: boolean; dash?: boolean }[]; h?: number }) {
  if (!labels.length) return <None />;
  const data = labels.map((l, i) => { const o: Record<string, unknown> = { l }; series.forEach((s, k) => (o["s" + k] = s.vals[i])); return o; });
  const mx = Math.max(1, ...series.flatMap((s) => s.vals.filter((v): v is number => v != null && !isNaN(v)))), T = top(mx);
  return (
    <>
      <div style={{ height: h }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="l" tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} width={48} domain={[0, T]} tickFormatter={(v: number) => fmtM(v)} />
            <Tooltip {...TT} formatter={(v: unknown, n: unknown) => [fmt(+(v as number)), String(n)]} />
            {series.map((s, k) => s.area
              ? <Area key={k} type="monotone" name={s.name} dataKey={"s" + k} stroke={s.color} strokeWidth={2.5} fill={s.color} fillOpacity={0.12} dot={false} isAnimationActive={false} connectNulls={false} />
              : <Line key={k} type="monotone" name={s.name} dataKey={"s" + k} stroke={s.color} strokeWidth={s.dash ? 2 : 2.5} strokeDasharray={s.dash ? "5 4" : undefined} dot={false} isAnimationActive={false} connectNulls={false} />)}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {series.length > 1 && <Legend items={series.map((s) => ({ label: s.name, color: s.color, dash: s.dash }))} />}
    </>
  );
}

export function BarsC({ labels, vals, colors, color = "var(--chart-2)", hl, fmtV = fmt, lblV, h = 200 }: { labels: string[]; vals: number[]; colors?: string[]; color?: string; hl?: boolean; fmtV?: (v: number) => string; lblV?: (v: number) => string; h?: number }) {
  if (!labels.length) return <None />;
  const best = vals.indexOf(Math.max(...vals));
  const data = labels.map((l, i) => ({ l, v: vals[i] }));
  const small = labels.length <= 8;
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 18, right: 6, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="l" tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={10} />
          <YAxis tick={TICK} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => (lblV ? lblV(v) : fmtM(v))} />
          <Tooltip {...TT} cursor={{ fill: "var(--muted)" }} formatter={(v: unknown) => [fmtV(+(v as number)), ""]} separator="" />
          <Bar dataKey="v" radius={[5, 5, 0, 0]} maxBarSize={44} isAnimationActive={false} label={small ? { position: "top", fontSize: 10, fill: "var(--foreground)", formatter: (v: unknown) => (+(v as number) ? (lblV || fmtM)(+(v as number)) : "") } : undefined}>
            {data.map((_, i) => <Cell key={i} fill={colors ? colors[i] : hl && i === best ? "var(--primary)" : color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GroupBarsC({ labels, series }: { labels: string[]; series: { name: string; color: string; vals: number[]; dash?: boolean }[] }) {
  if (!labels.length) return <None />;
  const data = labels.map((l, i) => { const o: Record<string, unknown> = { l }; series.forEach((s, k) => (o["s" + k] = s.vals[i] || 0)); return o; });
  return (
    <>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 6, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="l" tick={TICK} tickLine={false} axisLine={false} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => fmtM(v)} />
            <Tooltip {...TT} cursor={{ fill: "var(--muted)" }} formatter={(v: unknown, n: unknown) => [fmt(+(v as number)), String(n)]} />
            {series.map((s, k) => <Bar key={k} name={s.name} dataKey={"s" + k} fill={s.color} fillOpacity={s.dash ? 0.4 : 1} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Legend items={series.map((s) => ({ label: s.name, color: s.color, dash: s.dash }))} />
    </>
  );
}

export function DonutC({ items, center, sub }: { items: { label: string; value: number; color: string; valTxt?: string }[]; center: string; sub?: string }) {
  const it = items.filter((i) => i.value > 0); if (!it.length) return <None />;
  const tot = it.reduce((a, i) => a + i.value, 0);
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="relative size-[132px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={it} dataKey="value" nameKey="label" innerRadius={44} outerRadius={64} paddingAngle={it.length > 1 ? 1.5 : 0} stroke="none" isAnimationActive={false}>
              {it.map((i, k) => <Cell key={k} fill={i.color} />)}
            </Pie>
            <Tooltip {...TT} formatter={(v: unknown, n: unknown) => [`${fmt(+(v as number))} (${Math.round((+(v as number) / tot) * 100)}%)`, String(n)]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center leading-tight">
          <b className={cn("num font-semibold", center.length > 7 ? "text-[13px]" : "text-[16px]")}>{center}</b>{sub && <small className="text-[10px] text-muted-foreground">{sub}</small>}
        </div>
      </div>
      <div className="flex min-w-[150px] flex-1 flex-col gap-1.5 text-[13px]">
        {it.map((i) => <div key={i.label} className="flex items-center justify-between gap-3"><span className="inline-flex min-w-0 items-center gap-2"><i className="size-2.5 shrink-0 rounded-[3px]" style={{ background: i.color }} /><span className="truncate">{i.label}</span></span><span className="num shrink-0 text-muted-foreground">{i.valTxt != null ? i.valTxt : fmtM(i.value)} · {Math.round((i.value / tot) * 100)}%</span></div>)}
      </div>
    </div>
  );
}

export function HBars({ items, rank, dot }: { items: HBar[]; rank?: boolean; dot?: boolean }) {
  if (!items.length) return <None />;
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  return (
    <div className="flex flex-col gap-3">
      {items.map((i, k) => (
        <div key={i.label + k} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5">
          <span className="flex min-w-0 items-baseline gap-2 text-[13.5px]">
            {rank && <span className="num grid size-5 shrink-0 place-items-center self-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">{k + 1}</span>}
            {dot && i.color && <i className="size-2.5 shrink-0 self-center rounded-full" style={{ background: i.color }} />}
            <span className="truncate">{i.label}</span>{i.sub && <span className="truncate text-[12px] text-muted-foreground">{i.sub}</span>}
          </span>
          <span className="num text-[13.5px] font-semibold">{i.valTxt != null ? i.valTxt : fmt(i.value)}</span>
          <div className="col-span-2 h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full" style={{ width: Math.max(0, i.value) / max * 100 + "%", background: i.color || "var(--primary)" }} /></div>
        </div>
      ))}
    </div>
  );
}

export function WaterfallC({ steps }: { steps: { label: string; value: number; type: "start" | "minus" | "total" }[] }) {
  let run = 0;
  const data = steps.map((s) => {
    let lo: number, hi: number, col: string;
    if (s.type === "start" || s.type === "total") { lo = 0; hi = s.value; run = s.value; col = s.type === "total" ? "var(--primary)" : "var(--chart-2)"; }
    else { const nr = run + s.value; lo = Math.min(run, nr); hi = Math.max(run, nr); run = nr; col = s.value < 0 ? "var(--minus)" : "var(--plus)"; }
    return { l: s.label, base: lo, d: hi - lo, v: s.value, col };
  });
  return (
    <div className="h-[230px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 22, right: 6, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="l" tick={{ ...TICK, fontSize: 11.5 }} tickLine={false} axisLine={false} />
          <YAxis tick={TICK} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => fmtM(v)} />
          <Tooltip {...TT} cursor={{ fill: "var(--muted)" }} formatter={(_: unknown, __: unknown, p: { payload?: { v: number } }) => [fmt(p.payload?.v || 0), ""]} separator="" />
          <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="d" stackId="w" radius={[5, 5, 0, 0]} maxBarSize={70} isAnimationActive={false} label={{ position: "top", fontSize: 10.5, fill: "var(--foreground)", formatter: (_: unknown) => "" }}>
            {data.map((x, i) => <Cell key={i} fill={x.col} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="-mt-1 flex justify-around text-[12px] font-semibold num">{steps.map((s) => <span key={s.label}>{s.value < 0 ? "−" : ""}{fmtM(Math.abs(s.value))}</span>)}</div>
    </div>
  );
}

export function ParetoC({ items }: { items: { k: string; r: number; cs: number; abc: "A" | "B" | "C" }[] }) {
  const it = items.slice(0, 30); if (!it.length) return <None />;
  const col = (a: string) => (a === "A" ? "var(--primary)" : a === "B" ? "var(--chart-2)" : "var(--border)");
  const data = it.map((x, i) => ({ l: String(i + 1), name: x.k, r: x.r, cs: Math.round(x.cs * 100), abc: x.abc }));
  return (
    <>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="l" tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
            <YAxis yAxisId="a" tick={TICK} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => fmtM(v)} />
            <YAxis yAxisId="b" orientation="right" domain={[0, 100]} tick={TICK} tickLine={false} axisLine={false} width={34} tickFormatter={(v: number) => v + "%"} />
            <Tooltip {...TT} cursor={{ fill: "var(--muted)" }} labelFormatter={(_, p) => { const x = (p as unknown as { payload?: { name?: string } }[])?.[0]?.payload; return x?.name || ""; }} formatter={(v: unknown, n: unknown, p: { payload?: { abc?: string } }) => (n === "cs" ? [v + "%", "накоплено"] : [fmt(+(v as number)) + " · класс " + (p.payload?.abc || ""), "выручка"])} />
            <Bar yAxisId="a" dataKey="r" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false}>{data.map((x, i) => <Cell key={i} fill={col(x.abc)} />)}</Bar>
            <Line yAxisId="b" dataKey="cs" stroke="var(--foreground)" strokeWidth={1.6} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Legend items={[{ label: "A — 80% выручки", color: "var(--primary)" }, { label: "B — следующие 15%", color: "var(--chart-2)" }, { label: "C — остальные 5%", color: "var(--border)" }, { label: "накопленная доля", color: "var(--foreground)" }]} />
    </>
  );
}
