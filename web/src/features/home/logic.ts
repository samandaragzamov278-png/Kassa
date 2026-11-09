// Расчёты раздела «Главная» — перенос один в один из renderHome в dev/base.html.
// Возвращает готовые значения: плитки сверху, «коротко о месяце», 14 дней, карточки разделов, точки и последние продажи.
import type { Data } from "../../lib/types";
import { cashState, compute, lastM, recFor } from "../kassa/logic";
import {
  addD, checkKey, dLong, dShort, fmt, fmtM, isLens, monthTitle, pctF, plStats, plural, planEnv, plCalc, sumOf, MONTHS_FULL,
  type PlanCalc, type PlanStats, type SaleRow,
} from "../plan/logic";
import { batchStats, batchesOf, curBatch } from "./cost";
import { makeCtx, type S } from "../analytics/cost";

export type Part = string | { tag: string; good: boolean };
export const partsText = (p: Part[]) => p.map((x) => (typeof x === "string" ? x : x.tag)).join(" · ");

export interface HeroCard { label: string; value: string; sub: Part[]; kind: "main" | "month" | "need" | "cash"; warn?: boolean; ring?: { p: number; color: string }; spark?: number[] }
export interface SectionCard { id: string; icon: "cash" | "receipt" | "chart" | "target" | "glasses" | "tag"; title: string; hint: string; nums: [string, string][] }
export interface BriefItem { icon: "trophy" | "receipt" | "flame" | "bag"; title: string; value: string; sub: string }
export interface DayBar { d: string; n: number; wd: string; v: number; label: string; best: boolean; sun: boolean; title: string }
export interface PointToday { p: string; r: number; n: number; checks: string; seller: string; month: number; planPct: string | null }
export interface LastSale { id: string; point: string; product: string; when: string; sum: number }

const WDL = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const MG = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const WD2 = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

/** Дата заголовка: «Четверг, 5 ноября 2026» */
export function dateTitle(today: string) {
  const w = WDL[new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10))).getUTCDay()];
  return `${w[0].toUpperCase() + w.slice(1)}, ${+today.slice(8, 10)} ${MG[+today.slice(5, 7) - 1]} ${today.slice(0, 4)}`;
}

/** подпись столбика: млн с десятой / тысячи */
const barLabel = (v: number) => (v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(".", ",") : v ? (v / 1e3).toFixed(0) + "к" : "");

export function homeData(d: Data, today: string) {
  const env = planEnv(d, today), sales = env.sales, m = today.slice(0, 7);
  const sum = sumOf;
  const todayL = sales.filter((s) => s.date === today), month = sales.filter((s) => (s.date || "").startsWith(m));
  const lastDay = todayL.length ? today : [...new Set(sales.map((s) => s.date).filter(Boolean))].sort().pop() || today;
  const dayList = sales.filter((s) => s.date === lastDay), dayRev = sum(dayList), dayChecks = new Set(dayList.map(checkKey)).size;
  const mRev = sum(month), mChecks = new Set(month.map(checkKey)).size;
  const K: PlanCalc = plCalc(env, m), pt = K.c.total;
  const S: PlanStats | null = pt ? plStats(env, pt, K.fact, K.factBefore, K.work, K.done, K.left, K.past) : null;
  // касса последнего месяца (window.__kassa на рабочем сайте)
  const LM = lastM(d), cl = compute(d, LM), rl = recFor(d, LM), cs = rl ? cashState(d, rl, LM) : null;
  const k = { month: LM, expected: cl.expected, actual: cs ? cs.actual : null, diff: cs ? cs.actual - cl.expected : null };
  const lbl = lastDay === today ? "сегодня" : dShort(lastDay);
  const chk = (n: number) => `${n} ${plural(n, "чек", "чека", "чеков")}`;

  // по дням месяца: средний день и последние 14 дней
  const byDay: Record<string, number> = {};
  month.forEach((s) => { byDay[s.date] = (byDay[s.date] || 0) + (+s.sum || 0); });
  const mDays = Object.keys(byDay).length, avgDay = mDays ? mRev / mDays : 0;
  const dDelta = avgDay ? Math.round(((dayRev - avgDay) / avgDay) * 100) : null;
  const d14: string[] = []; for (let i = 13; i >= 0; i--) d14.push(addD(lastDay, -i));
  const allByDay: Record<string, number> = {};
  sales.forEach((s) => { if (s.date >= d14[0] && s.date <= d14[13]) allByDay[s.date] = (allByDay[s.date] || 0) + (+s.sum || 0); });
  const v14 = d14.map((x) => allByDay[x] || 0);

  const hero: HeroCard[] = [
    { kind: "main", label: `Выручка ${lbl}`, value: fmt(dayRev) + " сум", spark: v14,
      sub: [chk(dayChecks), ...(dDelta != null ? [{ tag: (dDelta >= 0 ? "+" : "−") + Math.abs(dDelta) + "% к среднему дню", good: dDelta >= 0 }] : []), ...(lastDay !== today ? ["сегодня продаж ещё нет"] : [])] },
    { kind: "month", label: "Выручка за месяц", value: fmt(mRev) + " сум", sub: [chk(mChecks), ...(pt && S && !K.past ? [`прогноз ${fmtM(S.forecast)}`] : [])],
      ring: pt && S ? { p: Math.min(1, mRev / pt), color: S.fpct >= 1 ? "var(--plus)" : S.fpct >= 0.85 ? "var(--warn)" : "var(--minus)" } : undefined },
    { kind: "need", label: "Нужно в день", value: S && !K.past ? fmt(S.needDay) + " сум" : "—",
      sub: S ? (K.past ? ["месяц закрыт"] : [`сейчас в среднем ${fmtM(S.pace)}`, `осталось ${K.left.length} раб. дн.`]) : ["план месяца не задан"] },
    { kind: "cash", label: k.actual != null ? (k.diff! >= 0 ? "Излишек в кассе" : "Недостача в кассе") : "Должно быть на руках",
      value: (k.actual != null ? fmt(Math.abs(k.diff!)) : fmt(k.expected)) + " сум",
      sub: k.actual != null ? [`должно ${fmt(k.expected)}`, `факт ${fmt(k.actual)}`] : ["касса ещё не пересчитана"], warn: k.actual != null && k.diff! < 0 },
  ];

  // карточки разделов
  const batches = batchesOf(d), bb = curBatch(batches);
  let bS = 0, bL = 0;
  if (bb && (bb.items || []).length) { const { items } = batchStats(sales, bb, "all"); bS = items.reduce((a, i) => a + (i.sold || 0), 0); bL = items.reduce((a, i) => a + (i.left || 0), 0); }
  const lensM = month.filter(isLens), lensU = lensM.reduce((a, s) => a + (+(s.qty as number) || 0), 0);
  const mg = makeCtx(d).marginOf(month as unknown as S[]);
  const pm = addD(m + "-01", -1).slice(0, 7), el = +today.slice(8);
  const prevM = sum(sales.filter((s) => (s.date || "").startsWith(pm) && +s.date.slice(8) <= el));
  const gr = prevM ? Math.round(((mRev - prevM) / prevM) * 100) : null;
  const kd = k.diff;
  const cards: SectionCard[] = [
    { id: "kassa", icon: "cash", title: "Касса", hint: "Наличные Премиума и Яшнабада, расходы и пересчёт",
      nums: [[fmtM(k.expected), "должно быть"], [k.actual != null ? (kd! >= 0 ? "+" : "−") + fmtM(Math.abs(kd!)) : "—", k.actual != null ? (kd! >= 0 ? "излишек" : "недостача") : "не пересчитано"]] },
    { id: "sales", icon: "receipt", title: "Продажи", hint: "Внести продажу или расход дня, касса дня по точкам", nums: [[fmtM(dayRev), "выручка " + lbl], [String(dayList.length), "позиций " + lbl]] },
    { id: "analytics", icon: "chart", title: "Аналитика", hint: "58 показателей и графиков за любой период", nums: [[fmtM(mRev), "за месяц"], [gr == null ? "—" : (gr >= 0 ? "+" : "") + gr + "%", "к прошлому месяцу"]] },
    { id: "plan", icon: "target", title: "План", hint: "План месяца, точки и продавцы", nums: [[pt ? pctF(mRev / pt) : "—", "выполнено"], [S && !K.past ? fmtM(S.needDay) : "—", "нужно в день"]] },
    { id: "lens", icon: "glasses", title: "Линзы", hint: "Очковые линзы: виды, индексы, покрытия", nums: [[fmt(lensU) + " шт", "за месяц"], [fmtM(sum(lensM)), "выручка"]] },
    { id: "batch", icon: "tag", title: "Склад", hint: "Маржа, остатки по местам и новая партия", nums: [[mg.m != null ? pctF(mg.m) : "—", "маржа месяца"], [bb ? fmt(bS) + " / " + fmt(bL) : "—", "партия: продано / осталось"]] },
  ];

  // коротко о месяце
  const byPt: Record<string, number> = {}; month.forEach((s) => { byPt[s.point] = (byPt[s.point] || 0) + (+s.sum || 0); });
  const lead = Object.entries(byPt).sort((a, b) => b[1] - a[1])[0];
  const avgCk = mChecks ? mRev / mChecks : 0;
  const pmL = sales.filter((s) => (s.date || "").startsWith(pm));
  const pmCk = new Set(pmL.map(checkKey)).size, pmAvg = pmCk ? sum(pmL) / pmCk : 0, ckD = pmAvg ? Math.round(((avgCk - pmAvg) / pmAvg) * 100) : null;
  const bestD = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  const byCat: Record<string, number> = {}; month.forEach((s) => { const c = s.cat || "Другое"; byCat[c] = (byCat[c] || 0) + (+s.sum || 0); });
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  const brief: BriefItem[] = month.length ? [
    ...(lead ? [{ icon: "trophy" as const, title: "Лидер месяца", value: lead[0], sub: `${fmtM(lead[1])} · ${pctF(lead[1] / (mRev || 1))} выручки` }] : []),
    { icon: "receipt" as const, title: "Средний чек", value: fmt(avgCk) + " сум", sub: ckD == null ? "за этот месяц" : `${ckD >= 0 ? "+" : "−"}${Math.abs(ckD)}% к прошлому месяцу` },
    ...(bestD ? [{ icon: "flame" as const, title: "Лучший день", value: dShort(bestD[0]) + " · " + fmtM(bestD[1]), sub: `в среднем за день ${fmtM(avgDay)}` }] : []),
    ...(topCat ? [{ icon: "bag" as const, title: "Больше всего продают", value: topCat[0], sub: `${fmtM(topCat[1])} · ${pctF(topCat[1] / (mRev || 1))} выручки` }] : []),
  ] : [];
  const briefNote = MONTHS_FULL[+m.slice(5, 7) - 1] + " " + m.slice(0, 4) + (pt && S && !K.past ? ` · план выполнен на ${pctF(mRev / pt)}` : "");

  // 14 дней
  const wkSum = v14.slice(7).reduce((a, b) => a + b, 0), wkPrev = v14.slice(0, 7).reduce((a, b) => a + b, 0), wkD = wkPrev ? Math.round(((wkSum - wkPrev) / wkPrev) * 100) : null;
  const best = v14.indexOf(Math.max(...v14));
  const bars: DayBar[] = d14.map((x, i) => {
    const w = new Date(Date.UTC(+x.slice(0, 4), +x.slice(5, 7) - 1, +x.slice(8, 10))).getUTCDay();
    return { d: x, n: +x.slice(8), wd: WD2[w], v: v14[i], label: barLabel(v14[i]), best: i === best, sun: w === 0, title: `${dLong(x)}: ${fmt(v14[i])} сум` };
  });
  const week = { bars, sum: wkSum, prev: wkPrev, delta: wkD, note: `последние 7 дней ${fmtM(wkSum)}` };

  // точки за последний день
  const pts: PointToday[] = env.points.map((p) => { const l = dayList.filter((s) => s.point === p); return { p, r: sum(l), n: new Set(l.map(checkKey)).size }; })
    .filter((o) => o.r || K.shares[o.p]).map((o) => {
      const mp = sum(month.filter((s) => s.point === o.p));
      return { ...o, checks: chk(o.n), seller: env.cfg.sellers[o.p] || "", month: mp, planPct: pt && K.shares[o.p] ? pctF(mp / ((pt * K.shares[o.p]) / 100)) : null };
    });
  const ptNote = lastDay === today ? "Выручка за сегодня" : `Последний день с продажами — ${dLong(lastDay)}`;
  const last: LastSale[] = [...sales].sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 6)
    .map((s) => ({ id: s.id, point: s.point, product: s.product || "—", when: dShort(s.date), sum: +s.sum || 0 }));

  return { today, m, lastDay, lbl, dayRev, dayList: dayList.length, dayChecks, mRev, mChecks, avgDay, hero, cards, brief, briefNote, week, pts, ptNote, ptTotalLabel: `Итого за ${lastDay === today ? "сегодня" : dShort(lastDay)}`, last, monthLabel: monthTitle(m), kassa: k, plan: { K, S, total: pt }, margin: mg };
}
export type HomeData = ReturnType<typeof homeData>;
