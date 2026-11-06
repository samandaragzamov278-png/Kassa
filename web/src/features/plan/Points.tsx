// «Точки и продавцы»: план точки, выполнение, прогноз, чеки, оправа + линзы, скидки.
import { cn } from "@/lib/utils";
import { Tile, Bar } from "./parts";
import { fmt, pctF, plColor, type PlanCalc, type PointRow } from "./logic";

const PCOL = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-2)", "var(--chart-5)"];
export const pointColor = (points: string[], p: string) => { const i = points.indexOf(p); return PCOL[(i < 0 ? points.length : i) % PCOL.length]; };

const Cell = ({ k, v, color }: { k: string; v: string; color?: string }) => (
  <div className="glass-inner min-w-0 rounded-2xl px-3 py-2"><span className="block truncate text-[11px] text-muted-foreground">{k}</span><b className="num block truncate text-[14.5px]" style={color ? { color } : undefined}>{v}</b></div>
);

export function Points({ rows, K, points }: { rows: PointRow[]; K: PlanCalc; points: string[] }) {
  if (!rows.length) return <div className="glass rounded-3xl p-6 text-center text-muted-foreground">Нет точек с планом</div>;
  const ranked = rows.filter((r) => r.pt).length;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((r, i) => {
        const fc = r.pt ? plColor(K.past ? r.st.pct : r.st.fpct) : "var(--primary)", col = pointColor(points, r.p);
        return (
          <Tile key={r.p} i={i} className="gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full text-base font-bold text-white" style={{ background: col }}>{(r.seller || r.p).charAt(0)}</span>
                <div className="min-w-0"><div className="truncate font-semibold">{r.seller || "Продавец не указан"}</div><div className="truncate text-xs text-muted-foreground">{r.p}</div></div>
              </div>
              {r.rank >= 0 && ranked > 1 && <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", r.rank === 0 ? "bg-plus-soft text-plus" : "bg-muted text-muted-foreground")}>{r.rank + 1} место</span>}
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-2"><b className="num text-xl">{fmt(r.f)}</b><span className="num text-[13px] text-muted-foreground">{r.pt ? "из " + fmt(r.pt) : "план не задан"}</span></div>
              <div className="mt-2"><Bar v={r.pt ? r.st.pct : 0} mk={r.pt && !K.past && !K.future ? r.st.sched / r.pt : null} color={fc} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Cell k="Выполнено" v={r.pt ? pctF(r.st.pct) : "—"} color={r.pt ? fc : undefined} />
              <Cell k="Прогноз" v={r.pt ? pctF(r.st.fpct) : "—"} />
              <Cell k="Нужно в день" v={r.pt && !K.past ? fmt(r.st.needDay) : "—"} />
              <Cell k="Нужно в неделю" v={r.pt && !K.past ? fmt(r.st.needWeek) : "—"} />
              <Cell k="Чеков · средний чек" v={`${r.n} · ${fmt(r.avg)}`} />
              <Cell k="Оправа + линзы" v={r.fl == null ? "—" : pctF(r.fl)} />
              <Cell k="Скидки" v={fmt(r.disc)} />
              <Cell k="Доля скидок" v={pctF(r.dp)} />
            </div>
          </Tile>
        );
      })}
    </div>
  );
}
