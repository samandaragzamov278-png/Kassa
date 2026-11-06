// Раздел «План»: план месяца, темп по дням, недели, точки и продавцы, настройка плана.
import { useMemo, useState } from "react";
import type { Data } from "@/lib/types";
import { Panel } from "@/components/kit";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { todayTash } from "../kassa/logic";
import { Eyebrow, Bar, BigRing, MiniRing, Spark, Tile, Chip } from "./parts";
import { DaysChart, WeeksTable } from "./Charts";
import { Points } from "./Points";
import { PlanSettings } from "./Settings";
import { fmt, fmtM, monthTitle, pctF, plCls, plColor, plural, planDayBars, planMonth, planMonths, planPeriod, planPoints, planStatus, planWeeks, sumOf, planEnv } from "./logic";

export function PlanPage({ d }: { d: Data }) {
  const today = todayTash(), env = useMemo(() => planEnv(d, today), [d, today]);
  const ms = useMemo(() => planMonths(env), [env]);
  const [sel, setSel] = useState(""), month = sel && ms.includes(sel) ? sel : today.slice(0, 7);
  const { K, total, S } = useMemo(() => planMonth(env, month), [env, month]);
  const [open, setOpen] = useState(() => !planMonth(env, today.slice(0, 7)).total); // форма открыта сразу, если план текущего месяца ещё не задан
  const view = useMemo(() => {
    if (!total || !S) return null;
    const { byD, tgt, bars } = planDayBars(env, K, total);
    return { tgt, bars, weeks: planWeeks(env, K, byD, tgt), points: planPoints(env, K, total), pace: K.done.map((x) => sumOf(K.list.filter((s) => s.date === x))) };
  }, [env, K, total, S]);

  const fcol = S ? plColor(K.past ? S.pct : S.fpct) : "";
  const left = K.left.length;
  return (
    <div className="flex flex-col gap-5">
      <header>
        <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Saif-Optics · план продаж</div>
        <h1 className="text-[34px] leading-tight font-bold tracking-tight">План месяца</h1>
        <p className="text-[15px] text-muted-foreground">{planPeriod(K, month)}</p>
      </header>
      <Tabs value={month} onValueChange={setSel}><TabsList className="h-auto max-w-full flex-wrap">{ms.map((m) => <TabsTrigger key={m} value={m} className="px-4 py-1.5">{monthTitle(m)}</TabsTrigger>)}</TabsList></Tabs>

      {!total || !S || !view ? (
        <div className="glass rounded-3xl p-6 text-center text-muted-foreground">План на {monthTitle(month).split(" ")[0]} не задан — откройте «Настроить план» внизу и впишите сумму.</div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <Tile i={0}>
              <div className="flex items-center gap-4">
                <BigRing p={S.pct} color={fcol} />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Eyebrow>Продано за месяц</Eyebrow>
                  <span className="num truncate text-[28px] leading-tight font-semibold tracking-tight">{fmt(K.fact)}</span>
                  <small className="text-[12.5px] text-muted-foreground">из {fmt(total)} сум · осталось {fmt(S.need)}</small>
                  <Chip tone={plCls(K.past ? S.pct : S.fpct)}>{planStatus(K, S)}</Chip>
                </div>
              </div>
              <div className="mt-3">
                <Bar v={S.pct} mk={K.past || K.future ? null : S.sched / total} color={fcol} />
                {!K.past && !K.future && <small className="mt-2 block text-[12.5px] text-muted-foreground">Черта — где нужно быть сегодня по графику: {fmt(S.sched)} · {S.gap >= 0 ? "впереди на" : "отставание"} {fmt(Math.abs(S.gap))}</small>}
              </div>
            </Tile>
            <div className="grid gap-4 sm:grid-cols-2">
              <Tile i={1} hero>
                <Eyebrow light>Нужно в день</Eyebrow>
                <span className="num my-auto text-[28px] font-semibold tracking-tight">{K.past ? "—" : fmt(S.needDay) + " сум"}</span>
                <span className="text-[12.5px] text-white/85">{K.past ? "месяц закрыт" : `на ${left} ${plural(left, "рабочий день", "рабочих дня", "рабочих дней")} до конца месяца`}</span>
              </Tile>
              <Tile i={2}>
                <Eyebrow>Нужно в неделю</Eyebrow>
                <span className="num text-[24px] font-semibold tracking-tight">{K.past ? "—" : fmt(S.needWeek) + " сум"}</span>
                <span className="text-[12.5px] text-muted-foreground">6 рабочих дней, пн–сб</span>
              </Tile>
              <Tile i={3}>
                <Eyebrow>Текущий темп</Eyebrow>
                <div className="flex items-center justify-between gap-2"><span className="num truncate text-[24px] font-semibold tracking-tight">{fmt(S.pace)} сум</span>{K.done.length > 1 && <Spark data={view.pace} color="var(--chart-2)" />}</div>
                <span className="text-[12.5px] text-muted-foreground">в рабочий день · {K.done.length} {plural(K.done.length, "день", "дня", "дней")} прошло</span>
              </Tile>
              <Tile i={4}>
                <Eyebrow>Прогноз на конец месяца</Eyebrow>
                <div className="flex items-center justify-between gap-2"><span className="num truncate text-[24px] font-semibold tracking-tight">{fmt(S.forecast)} сум</span><MiniRing p={S.fpct} color={fcol} /></div>
                <span className="text-[12.5px] text-muted-foreground">{pctF(S.fpct)} плана · вилка {fmtM(S.fLo)}–{fmtM(S.fHi)}</span>
              </Tile>
            </div>
          </div>
          <Panel title="Темп по дням" note="Столбик — выручка дня, пунктир — сколько нужно в день по плану. Воскресенье — выходной."><DaysChart bars={view.bars} tgt={view.tgt} need={!K.past && !K.future ? S.needDay : null} /></Panel>
          <Panel title="По неделям" note="План недели делится по рабочим дням (пн–сб)."><WeeksTable weeks={view.weeks} /></Panel>
          <section className="flex flex-col gap-3">
            <div><h2 className="text-[17px] font-semibold tracking-tight">Точки и продавцы</h2><p className="mt-0.5 text-[13px] text-muted-foreground">План каждой точки, выполнение, прогноз и показатели продавца.</p></div>
            <Points rows={view.points} K={K} points={env.points} />
          </section>
        </>
      )}
      <PlanSettings key={month} d={d} env={env} cfg={env.cfg} month={month} K={K} open={open} setOpen={setOpen} />
    </div>
  );
}
