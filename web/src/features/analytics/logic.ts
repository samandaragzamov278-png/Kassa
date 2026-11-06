// Расчёты «Аналитики» — перенос один в один из renderAnalytics в dev/base.html.
// buildAnalytics собирает плитки и данные графиков для включённых показателей; рисует их AnalyticsPage.
import type { Data } from "../../lib/types";
import { agg, CATCOL, dayList, expFiltered, filtered, inRange, matchOf, PAYCOL, pointColor, prevList, rangeOf, type Bar, type Card, type Flt } from "./base";
import { checkKey, entAmt, isFrame, isLens, KASSA_POINTS, PAYS, payOf, type Ctx, type S } from "./cost";
import { addD, daysBetween, dLong, dow, dShort, fmt, fmtM, MONTHS, monthEnd, normS, pctF, pl, today, WD, weekStart, wdIdx } from "./util";
import { batchStats, curBatch, itemLabel, reorderList } from "../stock-margin/logic";
import { cashState, compute, lastM, recFor } from "../kassa/logic";

// ---------- план: нужен для показателей 4 и 5 ----------
const prevMonth = (m: string) => addD(m + "-01", -1).slice(0, 7);
export const plOff = (c: Ctx, d: string) => (c.planCfg.off || [0]).includes(dow(d));
export const plDays = (m: string) => { const out: string[] = []; const e = +monthEnd(m).slice(8); for (let i = 1; i <= e; i++) out.push(m + "-" + String(i).padStart(2, "0")); return out; };
const plRev = (l: S[]) => l.reduce((a, s) => a + (+s.sum || 0), 0);
export function plPrevShares(c: Ctx, m: string) {
  const pm = prevMonth(m), by: Record<string, number> = {};
  c.sales.filter((s) => (s.date || "").startsWith(pm)).forEach((s) => { by[s.point] = (by[s.point] || 0) + (+s.sum || 0); });
  const tot = Object.values(by).reduce((a, b) => a + b, 0), out: Record<string, number> = {};
  c.points.forEach((p) => { out[p] = tot ? Math.round(((by[p] || 0) / tot) * 1000) / 10 : 0; }); return out;
}
export function plConf(c: Ctx, m: string) { const x = c.planCfg.months && c.planCfg.months[m]; return x ? { total: +(x.total || 0), shares: Object.assign({}, x.shares || {}) } : { total: 0, shares: {} as Record<string, number> }; }
// прогноз остатка месяца: индекс дня недели × уровень продаж месяца, с вилкой (как на рабочем сайте)
export function plFcast(c: Ctx, pt: string | null, done: string[], left: string[], factBefore: number) {
  const td = today(), own = c.sales.filter((s) => s.date && (!pt || s.point === pt));
  let from = addD(td, -56); const first = own.reduce((m, s) => (!m || s.date < m ? s.date : m), ""); if (first > from) from = first;
  const byD: Record<string, S[]> = {}; own.forEach((s) => { if (s.date >= from && s.date < td) (byD[s.date] = byD[s.date] || []).push(s); });
  const hist: { w: number; v: number }[] = []; for (let d = from; d && d < td; d = addD(d, 1)) { if (!plOff(c, d)) hist.push({ w: dow(d), v: plRev(byD[d] || []) }); }
  const mean = hist.length ? hist.reduce((a, x) => a + x.v, 0) / hist.length : 0, idx: Record<number, number> = {};
  if (mean > 0) for (let w = 0; w < 7; w++) { const xs = hist.filter((x) => x.w === w); if (xs.length >= 2) idx[w] = xs.reduce((a, x) => a + x.v, 0) / xs.length / mean; }
  const ix = (d: string) => idx[dow(d)] || 1;
  const base = done.reduce((a, d) => a + ix(d), 0), lvlM = base ? factBefore / base : mean, k = Math.min(1, done.length / 12), lvl = mean > 0 ? k * lvlM + (1 - k) * mean : lvlM;
  const exp = left.map((d) => lvl * ix(d)), fc = factBefore + exp.reduce((a, b) => a + b, 0);
  const res = mean > 0 ? hist.map((x) => x.v / (mean * (idx[x.w] || 1)) - 1) : [], sd = res.length > 2 ? Math.sqrt(res.reduce((a, r) => a + r * r, 0) / (res.length - 1)) : 0;
  const band = 1.28 * sd * Math.sqrt(exp.reduce((a, e) => a + e * e, 0));
  return { fc, lo: Math.max(factBefore, fc - band), hi: fc + band };
}

// ---------- прибыль собственнику за месяц (settings/finance) ----------
const FIN_INV = /ц1|c1|с1|мебел|кондиционер|строй|дизайн|обналич|корп карт/i;
const FIN_GOODS = /линз|товар|раствор|капл|аклюдор|микрофибр|авизор|картонн|покупка стола|оптикал|абу сахий/i;
const FIN_MOVE = /межбанк|сдач|размен|пополнение резерв/i;
const FIN_CREDIT = /кредит/i, FIN_TAX = /налог с оборота|налог на оборот/i, FIN_MGR = /менеджер/i, FIN_CARGO = /китай|карго/i;
export interface FinLine { d: string; n: string; a: number; b: string; f: string; tag: string; k: string }
export function finLines(c: Ctx, M: string): FinLine[] {
  const out: FinLine[] = [];
  c.d.entries.forEach((e) => { if (e.type !== "exp" || e.kind === "bc" || !(e.date || "").startsWith(M)) return; out.push({ d: e.date, n: String(e.name || ""), a: entAmt(e), b: e.branch || "Общее", f: e.fund === "reserve" ? "резерв" : "касса", tag: e.tag || "", k: "" }); });
  Object.keys(c.d.report).forEach((d) => { if (!d.startsWith(M)) return; ((c.d.report[d] || {}).bank || []).forEach((x) => out.push({ d, n: String(x.n || ""), a: +x.a || 0, b: "Общее", f: "р/с", tag: "", k: "" })); });
  (((c.finCfg.extra || {})[M]) || []).forEach((x) => out.push({ d: M + "-28", n: String(x.n || ""), a: +(x.a || 0), b: x.b || "Общее", f: x.f || "вне кассы", tag: "", k: "" }));
  out.forEach((x) => { const n = x.n; x.k = FIN_CREDIT.test(n) ? "credit" : FIN_TAX.test(n) ? "tax" : FIN_MGR.test(n) ? "mgr" : FIN_MOVE.test(n) ? "move" : x.tag === "C1" || FIN_INV.test(n) ? "inv" : FIN_CARGO.test(n) ? "cargo" : FIN_GOODS.test(n) || x.tag === "Закуп линз" ? "goods" : "op"; });
  return out;
}
export function ownerProfit(c: Ctx, M: string) {
  const all = c.sales.filter((s) => (s.date || "").startsWith(M)); if (!all.length) return null;
  const gpOf = (l: S[]) => { const m = c.marginOf(l), rev = l.reduce((x, s) => x + (+s.sum || 0), 0); return { rev, gp: m.m != null ? m.gross + (rev - m.rev) * m.m : 0, cover: m.cover }; };
  const cl = (l: S[]) => l.reduce((x, s) => x + Object.entries(payOf(s)).reduce((y, [k, v]) => y + (k === "Наличные" ? 0 : +v || 0), 0), 0);
  const g = gpOf(all), L = finLines(c, M), sm = (k: string) => L.filter((x) => x.k === k).reduce((y, x) => y + x.a, 0);
  const op = sm("op") + sm("cargo"), credit = sm("credit"), taxPaid = sm("tax"), inv = sm("inv"), goods = sm("goods");
  const tp = +(c.finCfg.taxPct || 0), tax = Math.round((cl(all) * tp) / 100);
  const before = g.gp - op - credit - tax;
  const mc = c.finCfg.mgr || {}, mp = Array.isArray(mc.points) ? mc.points : [], share = +(mc.share || 0);
  let mgr: { base: number; share: number; pts: string[]; a: number; adv: number } | null = null;
  if (share && mp.length) {
    const ml = all.filter((s) => mp.includes(s.point)), mg = gpOf(ml);
    const mop = L.filter((x) => x.k === "op" && (x.b === "Общее" || mp.includes(x.b))).reduce((y, x) => y + x.a, 0);
    const base = mg.gp - mop - Math.round((cl(ml) * tp) / 100);
    mgr = { base, share, pts: mp, a: Math.max(0, Math.round((base * share) / 100)), adv: L.filter((x) => x.k === "mgr").reduce((y, x) => y + x.a, 0) };
  }
  const top = L.filter((x) => x.k === "op" || x.k === "cargo").sort((x, y) => y.a - x.a);
  return { M, rev: g.rev, gp: g.gp, cover: g.cover, op, credit, tax, tp, taxPaid, inv, goods, before, mgr, owner: before - (mgr ? mgr.a : 0), top, n: top.length };
}
export type Owner = NonNullable<ReturnType<typeof ownerProfit>>;

// ---------- подписи сравнения ----------
const pctTxt = (cur: number, prev: number) => { if (!prev) return ""; const p = ((cur - prev) / prev) * 100; if (Math.abs(p) < 0.5) return "≈ 0%"; return `${p >= 0 ? "▲" : "▼"} ${Math.abs(p).toFixed(0)}%`; };
const cmp = (c: number, p: number | null | undefined) => { if (p == null) return ""; const t = p ? pctTxt(c, p) : ""; return t ? t + " к прошлому периоду" : "в прошлом периоде продаж не было"; };
export { pctTxt };

// ---------- виджеты ----------
export interface Line { name: string; color: string; vals: number[]; area?: boolean; dash?: boolean }
export type Widget = { ids: number[]; title: string; note?: string; wide?: boolean; group?: "trio" } & (
  | { kind: "line"; labels: string[]; series: Line[] }
  | { kind: "donut"; items: { label: string; value: number; color: string; valTxt?: string }[]; center: string; sub?: string }
  | { kind: "groupBars"; labels: string[]; series: { name: string; color: string; vals: number[]; dash?: boolean }[] }
  | { kind: "hbars"; items: Bar[]; rank?: boolean; dot?: boolean }
  | { kind: "expenses"; total: number; byPoint: Bar[]; byArt: Bar[] }
  | { kind: "waterfall"; steps: { label: string; value: number; type: "start" | "minus" | "total" }[] | null }
  | { kind: "bars"; labels: string[]; vals: number[]; colors?: string[]; color?: string; hl?: boolean; vk: "money" | "qty" | "signed" }
  | { kind: "ranges"; rows: { k: string; avg: number; min: number; max: number; u: number; r: number; color: string }[] }
  | { kind: "top"; by: "r" | "u"; rows: { k: string; r: number; u: number; cat: string }[]; tot: number }
  | { kind: "pg"; cats: string[]; cat: string; bands: { lbl: string; u: number; r: number; top: [string, number][] }[]; U: number; best: number }
  | { kind: "pareto"; items: { k: string; r: number; cs: number; abc: "A" | "B" | "C" }[] }
  | { kind: "lost"; rows: { k: string; u: number; r: number; last: string }[]; hist: boolean }
  | { kind: "marginPts"; rows: { k: string; all: number; rev: number; cogs: number; gp: number; m: number | null; cov: number; tc: { k: string; gp: number } | undefined }[]; T: { all: number; rev: number; cogs: number; gp: number }; has: boolean }
  | { kind: "owner"; o: Owner | null; months: string[]; live: boolean }
  | { kind: "heat"; pts: string[]; avg: number[][]; hmax: number; best: number[] | null; showBest: boolean }
  | { kind: "reorder"; rows: ReturnType<typeof reorderList> }
  | { kind: "text"; text: string }
);
export interface AnalyticsModel {
  empty: boolean; period: string; list: S[]; a: ReturnType<typeof agg>; pa: ReturnType<typeof agg> | null; r: { from: string; to: string; days: number };
  mg: ReturnType<Ctx["marginOf"]>; cards: Card[]; widgets: Widget[]; exp: number;
}

export function kassaNow(d: Data) {
  const M = lastM(d), cl = compute(d, M), rl = recFor(d, M), cs = rl ? cashState(d, rl, M) : null;
  return { month: M, expected: cl.expected, actual: cs ? cs.actual : null, diff: cs ? cs.actual - cl.expected : null };
}

export function buildAnalytics(c: Ctx, F: Flt, on: (id: number) => boolean, pgCat: string): AnalyticsModel {
  const list = filtered(c, F), a = agg(list), pv = prevList(c, F), pa = pv ? agg(pv.list) : null, r = rangeOf(F, list), ex = expFiltered(c, F);
  const base = { list, a, pa, r, ex };
  const period = list.length ? `Период ${dLong(r.from)} — ${dLong(r.to)} · ${r.days} ${pl(r.days, "день", "дня", "дней")}` + (pv ? ` · сравнение с ${dLong(pv.from)} — ${dLong(pv.to)}` : " · сравнение появится, когда выбраны даты") : "";
  const mg0 = c.marginOf(list), expSum0 = ex.reduce((x, e) => x + entAmt(e), 0);
  if (!list.length) return { empty: true, period, ...base, mg: mg0, cards: [], widgets: [], exp: expSum0 };
  const days = dayList(r), byDay: Record<string, number> = {}; list.forEach((s) => (byDay[s.date] = (byDay[s.date] || 0) + (+s.sum || 0)));
  const dv = days.map((d) => byDay[d] || 0);
  const prevByDay: Record<string, number> = {}; if (pv) pv.list.forEach((s) => (prevByDay[s.date] = (prevByDay[s.date] || 0) + (+s.sum || 0)));
  const pvv = pv ? days.map((_, i) => prevByDay[addD(pv.from, i)] || 0) : null;
  interface G { k: string; r: number; n: number; u: number; ch: Set<string>; days: Set<string> }
  const grp = (key: "point" | "cat" | "product", l: S[]) => { const m: Record<string, G> = {}; l.forEach((s) => { const k = (s[key] as string) || "—"; const o = m[k] || (m[k] = { k, r: 0, n: 0, u: 0, ch: new Set(), days: new Set() }); o.r += +s.sum || 0; o.n++; o.u += +(s.qty || 0); o.ch.add(checkKey(s)); o.days.add(s.date); }); return m; };
  const gp = grp("point", list), gpp = pv ? grp("point", pv.list) : ({} as Record<string, G>);
  const ptsAll = c.points.filter((p) => F.point === "all" || p === F.point);
  const expSum = expSum0, mg = mg0;
  const PC = (p: string) => pointColor(c.points, p);
  const cards: Card[] = [], widgets: Widget[] = [];
  const C = (x: Omit<Card, "id"> & { id: number }) => { cards.push(x); };
  const sp = (vals: number[], color?: string) => ({ vals, color });

  // ----- карточки -----
  if (on(1)) C({ id: 1, label: "Выручка", v: fmt(a.rev) + " сум", d: cmp(a.rev, pa && pa.rev), spark: sp(dv, "var(--primary)"), main: true });
  if (on(2)) C({ id: 2, label: "Рост к прошлому периоду", v: pa && pa.rev ? (Math.round(((a.rev - pa.rev) / pa.rev) * 100) === 0 ? "≈ 0%" : `${a.rev >= pa.rev ? "+" : "−"}${Math.abs(Math.round(((a.rev - pa.rev) / pa.rev) * 100))}%`) : "—", d: pa ? (pa.rev ? `было ${fmt(pa.rev)} сум за ${dShort(pv!.from)}–${dShort(pv!.to)}` : `за ${dShort(pv!.from)}–${dShort(pv!.to)} продаж нет — сравнивать не с чем`) : "выберите период с датами" });
  if (on(3)) C({ id: 3, label: "Выручка в среднем за день", v: fmt(a.rev / r.days) + " сум", d: `по ${r.days} календарным дням`, spark: sp(dv, "var(--chart-3)") });
  const t = today(), mStart = t.slice(0, 8) + "01", dim = new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7), 0)).getUTCDate(), el = +t.slice(8, 10);
  const ptOk = (s: S) => F.point === "all" || s.point === F.point;
  const monthRev = c.sales.filter((s) => s.date >= mStart && s.date <= t && ptOk(s)).reduce((x, s) => x + (+s.sum || 0), 0);
  if (on(4) && r.to && r.to < mStart) {
    const tm = r.to.slice(0, 7), mt = c.sales.filter((s) => (s.date || "").startsWith(tm) && ptOk(s)).reduce((x, s) => x + (+s.sum || 0), 0);
    C({ id: 4, label: "Итог месяца", v: fmt(mt) + " сум", d: `${MONTHS[+tm.slice(5, 7) - 1]} ${tm.slice(0, 4)} завершён — прогноз не нужен` });
  } else if (on(4)) {
    const done: string[] = [], left: string[] = []; for (let d = mStart; d.slice(0, 7) === t.slice(0, 7); d = addD(d, 1)) { if (plOff(c, d)) continue; (d < t ? done : left).push(d); }
    const before = c.sales.filter((s) => s.date >= mStart && s.date < t && ptOk(s)).reduce((x, s) => x + (+s.sum || 0), 0);
    const fx = plFcast(c, F.point === "all" ? null : F.point, done, left, before);
    C({ id: 4, label: "Прогноз на конец месяца", v: fmt(Math.max(fx.fc, monthRev)) + " сум", d: `скорее всего ${fmtM(fx.lo)}–${fmtM(fx.hi)} · продано ${fmtM(monthRev)} за ${el} из ${dim} дн.` });
  }
  if (on(5)) {
    let pp = 0, d = r.from; const shc: Record<string, { w: number; sh: Record<string, number> }> = {};
    while (d <= r.to) { const m = d.slice(0, 7), cf = plConf(c, m); if (cf.total && !plOff(c, d)) { if (!shc[m]) shc[m] = { w: plDays(m).filter((x) => !plOff(c, x)).length, sh: Object.assign(plPrevShares(c, m), cf.shares) }; const k = shc[m]; pp += (cf.total / (k.w || 1)) * (F.point === "all" ? 1 : (k.sh[F.point] || 0) / 100); } d = addD(d, 1); }
    const pmOk = (m: string) => plConf(c, m).total > 0, pf = c.sales.filter((s) => s.date >= r.from && s.date <= r.to && pmOk((s.date || "").slice(0, 7)) && ptOk(s)).reduce((x, s) => x + (+s.sum || 0), 0), noPlanM = [...new Set(dayList(r).map((x) => x.slice(0, 7)))].some((m) => !pmOk(m));
    C(pp ? { id: 5, label: "План за период", v: fmt(pf) + " сум", d: `из ${fmt(pp)} по плану за ${r.from === r.to ? dLong(r.from) : dShort(r.from) + "–" + dShort(r.to)} · ${pctF(pf / pp)}` + (F.point !== "all" ? ` · ${F.point}` : "") + (noPlanM ? " · месяцы без плана не учтены" : ""), ring: { p: Math.min(1, pf / pp), color: pf >= pp ? "var(--plus)" : pf >= pp * 0.85 ? "var(--warn)" : "var(--minus)" } }
      : { id: 5, label: "План за период", v: "не задан", d: "задайте план на вкладке «План»" });
  }
  if (on(7)) C({ id: 7, label: "Продаж (позиций)", v: fmt(a.n), d: cmp(a.n, pa && pa.n) });
  if (on(8)) C({ id: 8, label: "Проданных единиц", v: fmt(a.units), d: cmp(a.units, pa && pa.units) });
  if (on(9)) C({ id: 9, label: "Средний чек", v: fmt(a.avg) + " сум", d: `${fmt(a.checks)} ${pl(a.checks, "чек", "чека", "чеков")} · ` + (cmp(a.avg, pa && pa.avg) || "") });
  if (on(10)) C({ id: 10, label: "Средняя цена единицы", v: fmt(a.unitPrice) + " сум", d: cmp(a.unitPrice, pa && pa.unitPrice) });
  if (on(11)) C({ id: 11, label: "Единиц в одном чеке", v: a.upc.toFixed(2).replace(".", ","), d: pa ? `было ${pa.upc.toFixed(2).replace(".", ",")}` : "" });
  if (on(12)) { const ds = Object.entries(byDay).sort((x, y) => y[1] - x[1]); const b = ds[0], wst = ds[ds.length - 1]; C({ id: 12, label: "Лучший день", v: b ? fmt(b[1]) + " сум" : "—", d: b ? `${dLong(b[0])}, ${WD[wdIdx(b[0])]} · худший: ${dShort(wst[0])} — ${fmt(wst[1])}` : "" }); }
  if (on(13)) { const z = days.filter((d) => !byDay[d]); C({ id: 13, label: "Дней без продаж", v: String(z.length), d: z.length ? z.slice(0, 6).map(dShort).join(", ") + (z.length > 6 ? "…" : "") : "продажи были каждый день" }); }
  if (on(21)) { const sh = a.rev ? a.cash / a.rev : 0; C({ id: 21, label: "Доля наличных", v: pctF(sh), d: `безнал ${pctF(1 - sh)}` + (pa && pa.rev ? ` · было ${pctF(pa.cash / pa.rev)}` : ""), ring: { p: sh, color: "var(--chart-2)" } }); }
  if (on(24)) C({ id: 24, label: "Расходы дня от выручки", v: a.rev ? ((expSum / a.rev) * 100).toFixed(1).replace(".", ",") + "%" : "—", d: `расходы ${fmt(expSum)} сум` });
  if (on(26)) {
    const k = kassaNow(c.d), MN = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
    if ((r.to || "").slice(0, 7) < k.month) {
      const pm = r.to.slice(0, 7), x = compute(c.d, pm);
      C({ id: 26, label: "Касса за " + MN[+pm.slice(5, 7) - 1], v: "сдана ✓", d: `Б/Ч ${fmt(x.bcT)} − расходы ${fmt(x.sOp + x.sOth)} = ${fmt(x.expected)} сум` });
    } else {
      const km = k.month ? MONTHS[+k.month.slice(5, 7) - 1] : "";
      C(k.actual != null ? { id: 26, label: k.diff! >= 0 ? "Излишек в кассе" : "Недостача в кассе", v: fmt(Math.abs(k.diff!)) + " сум", d: `за ${km}, на сегодня · должно ${fmt(k.expected)} · факт ${fmt(k.actual)}`, warn: k.diff! < 0 }
        : { id: 26, label: "Должно быть на руках", v: fmt(k.expected) + " сум", d: `касса за ${km}, на сегодня · пересчитайте кассу на вкладке «Касса»` });
    }
  }
  if (on(35)) { const chk: Record<string, { f: number; l: number }> = {}; list.forEach((s) => { const o = chk[checkKey(s)] || (chk[checkKey(s)] = { f: 0, l: 0 }); if (isFrame(s)) o.f = 1; if (isLens(s)) o.l = 1; }); const fr = Object.values(chk).filter((o) => o.f), both = fr.filter((o) => o.l).length; C({ id: 35, label: "Оправа + линзы в одном чеке", v: fr.length ? pctF(both / fr.length) : "—", d: `${both} из ${fr.length} ${pl(fr.length, "чека", "чеков", "чеков")} с оправой`, ring: fr.length ? { p: both / fr.length, color: "var(--chart-3)" } : undefined }); }
  if (on(36)) C({ id: 36, label: "Валовая прибыль", v: mg.rev ? fmt(mg.gross) + " сум" : "—", d: mg.rev ? `посчитано по ${pctF(mg.cover)} выручки, где известна цена покупки${c.lensRules.length || c.hasItemRules ? " · часть себестоимости — оценка, расчёт идёт" : ""}` : "нет цен покупки: пришлите список «Все товары»" });
  if (on(37)) C({ id: 37, label: "Маржа", v: mg.m != null ? pctF(mg.m) : "—", d: mg.rev ? `выручка ${fmtM(mg.rev)} · себестоимость ${fmtM(mg.cogs)}` : "нет цен покупки", ring: mg.m != null ? { p: mg.m, color: "var(--plus)" } : undefined });
  if (on(40)) C({ id: 40, label: "Скидки", v: fmt(a.disc) + " сум", d: cmp(a.disc, pa && pa.disc) });
  if (on(41)) C({ id: 41, label: "Скидка от выручки", v: a.rev ? ((a.disc / (a.rev + a.disc)) * 100).toFixed(1).replace(".", ",") + "%" : "—", d: "от суммы без скидок" });
  if (on(42)) C({ id: 42, label: "Продаж со скидкой", v: pctF(a.n ? a.discN / a.n : 0), d: `${a.discN} из ${a.n} позиций` });

  // ----- графики -----
  const lbl = days.map(dShort);
  const W = (ids: number[], title: string, note: string | undefined, rest: object, wide?: boolean) => { widgets.push({ ids, title, note, wide, ...rest } as Widget); };
  if (on(1)) W([1], "Выручка по дням", pv ? "Сплошная линия — текущий период, пунктир — прошлый такой же длины" : "Выручка за каждый день периода", { kind: "line", labels: lbl, series: [{ name: "Текущий период", color: "var(--primary)", vals: dv, area: true }].concat(pvv ? [{ name: "Прошлый период", color: "var(--muted-foreground)", vals: pvv, dash: true } as never] : []) }, true);
  if (on(6)) { let c1 = 0, c0 = 0; const cv = dv.map((v) => (c1 += v)), pc = pvv ? pvv.map((v) => (c0 += v)) : null; W([6], "Выручка нарастающим итогом", "Как набирается выручка за период", { kind: "line", labels: lbl, series: [{ name: "Текущий", color: "var(--primary)", vals: cv, area: true }].concat(pc ? [{ name: "Прошлый", color: "var(--muted-foreground)", vals: pc, dash: true } as never] : []) }, true); }
  if (on(14)) { const ser = ptsAll.filter((p) => gp[p]).map((p) => ({ name: p, color: PC(p), vals: days.map((d) => list.filter((s) => s.point === p && s.date === d).reduce((x, s) => x + (+s.sum || 0), 0)) })); W([14], "Выручка точек по дням", "Каждая линия — своя точка", { kind: "line", labels: lbl, series: ser }, true); }
  const ptItems = Object.values(gp).sort((x, y) => y.r - x.r);
  if (on(15)) W([15], "Доля точек в выручке", "", { kind: "donut", items: ptItems.map((o) => ({ label: o.k, value: o.r, color: PC(o.k) })), center: fmtM(a.rev), sub: "выручка" });
  if (on(16)) W([16], "Точки: сейчас и раньше", pa ? "Яркие столбцы — текущий период, бледные — прошлый" : "Сравнение появится, когда выбран период с датами", { kind: "groupBars", labels: ptItems.map((o) => o.k), series: [{ name: "Текущий", color: "var(--primary)", vals: ptItems.map((o) => o.r) }].concat(pa ? [{ name: "Прошлый", color: "var(--primary)", dash: true, vals: ptItems.map((o) => (gpp[o.k] ? gpp[o.k].r : 0)) } as never] : []) });
  if (on(17)) W([17], "Средний чек по точкам", "", { kind: "hbars", items: ptItems.map((o) => ({ label: o.k, value: o.r / o.ch.size, color: PC(o.k), sub: `${o.ch.size} чеков` })) });
  if (on(18)) W([18], "Рейтинг точек", "По выручке, в скобках — изменение к прошлому периоду", { kind: "hbars", rank: true, items: ptItems.map((o) => ({ label: o.k, value: o.r, color: PC(o.k), sub: gpp[o.k] ? pctTxt(o.r, gpp[o.k].r) : "" })) });
  if (on(19)) W([19], "Выручка на рабочий день", "Выручка точки, делённая на дни, когда у неё были продажи", { kind: "hbars", items: ptItems.map((o) => ({ label: o.k, value: o.r / o.days.size, color: PC(o.k), sub: `${o.days.size} дн.` })).sort((x, y) => y.value - x.value) });
  const cashBy: Record<string, number> = {}; list.forEach((s) => (cashBy[s.point] = (cashBy[s.point] || 0) + +(payOf(s)["Наличные"] || 0)));
  if (on(20)) W([20], "Б/Ч по точкам", "Наличные: Премиум, Яшнабад и C1 идут в кассу, Сергели остаётся на точке", { kind: "hbars", items: Object.entries(cashBy).sort((x, y) => y[1] - x[1]).map(([k, v]) => ({ label: k, value: v, color: PC(k), sub: KASSA_POINTS.includes(k) ? "· в кассу" : "· на точке" })) });
  if (on(22)) { const py: Record<string, number> = {}; list.forEach((s) => Object.entries(payOf(s)).forEach(([k, v]) => (py[k] = (py[k] || 0) + v))); W([22], "Способы оплаты", "", { kind: "donut", items: PAYS.filter((p) => py[p]).map((p) => ({ label: p, value: py[p], color: PAYCOL[p] })), center: fmtM(a.rev), sub: "всего" }); }
  if (on(23)) {
    const eb: Record<string, number> = {}, ea: Record<string, number> = {};
    ex.forEach((e) => { const v = entAmt(e); eb[e.branch || ""] = (eb[e.branch || ""] || 0) + v; const k = String(e.name).replace(/^\S+\s+(за|на)\s+/i, ""); const kk = k.charAt(0).toUpperCase() + k.slice(1); ea[kk] = (ea[kk] || 0) + v; });
    W([23], "Расходы дня", `Всего ${fmt(expSum)} сум`, { kind: "expenses", total: expSum, byPoint: Object.entries(eb).sort((x, y) => y[1] - x[1]).map(([k, v]) => ({ label: k, value: v, color: PC(k) })), byArt: Object.entries(ea).sort((x, y) => y[1] - x[1]).slice(0, 7).map(([k, v]) => ({ label: k, value: v, color: "var(--chart-1)" })) });
  }
  if (on(25)) {
    const kc = KASSA_POINTS.filter((p) => F.point === "all" || p === F.point), bc = kc.reduce((x, p) => x + (cashBy[p] || 0), 0), ke = ex.filter((e) => kc.includes(e.branch || "")).reduce((x, e) => x + entAmt(e), 0);
    W([25], "Б/Ч в кассу после расходов", "Премиум, Яшнабад и C1: наличные минус расходы дня", { kind: "waterfall", steps: kc.length ? [{ label: "Б/Ч", value: bc, type: "start" }, { label: "Расходы дня", value: -ke, type: "minus" }, { label: "Остаётся", value: bc - ke, type: "total" }] : null });
  }
  if (on(27)) {
    const cl = [...c.d.cashlog].filter((x) => { const d = new Date((x.at || 0) + 5 * 3600e3).toISOString().slice(0, 10); return d >= r.from && d <= r.to; }).sort((x, y) => (x.at || 0) - (y.at || 0)).slice(-30);
    const nt = `Пересчёты кассы за ${r.from === r.to ? dLong(r.from) : dShort(r.from) + "–" + dShort(r.to)}: зелёный — излишек, красный — недостача`;
    if (cl.length) W([27], "Излишек / недостача по пересчётам", nt, { kind: "bars", labels: cl.map((x) => { const d = new Date((x.at || 0) + 5 * 3600e3); return String(d.getUTCDate()).padStart(2, "0") + "." + String(d.getUTCMonth() + 1).padStart(2, "0"); }), vals: cl.map((x) => (+x.amount || 0) - (+(x.expected || 0))), colors: cl.map((x) => ((+x.amount || 0) >= (+(x.expected || 0)) ? "var(--plus)" : "var(--minus)")), vk: "signed" });
    else W([27], "Излишек / недостача по пересчётам", nt, { kind: "text", text: c.d.cashlog.length ? `За выбранный период пересчётов не было. Всего пересчётов: ${c.d.cashlog.length}, последний — ${dLong(new Date(Math.max(...c.d.cashlog.map((x) => x.at || 0)) + 5 * 3600e3).toISOString().slice(0, 10))}.` : "Пересчётов пока нет. История начнётся со следующего нажатия «Пересчитал» на вкладке «Касса»." });
  }
  const gc = Object.values(grp("cat", list)).sort((x, y) => y.r - x.r);
  if (on(28)) W([28], "Выручка по категориям", "", { kind: "donut", items: gc.map((o, i) => ({ label: o.k, value: o.r, color: CATCOL[i % CATCOL.length] })), center: fmtM(a.rev), sub: "выручка" });
  if (on(29)) W([29], "Доля категорий", "Сколько процентов выручки даёт каждая категория", { kind: "hbars", items: gc.map((o, i) => ({ label: o.k, value: o.r, color: CATCOL[i % CATCOL.length], valTxt: pctF(o.r / a.rev), sub: fmtM(o.r) })) });
  if (on(30)) {
    const rows = gc.filter((o) => o.u > 0 && !/без детализации|погашени/i.test(o.k)).map((o) => { const ps = list.filter((s) => (s.cat || "—") === o.k && +(s.qty || 0) > 0).map((s) => (+s.sum || 0) / (+(s.qty || 0) || 1)); return { k: o.k, avg: o.r / o.u, min: Math.min(...ps), max: Math.max(...ps), u: o.u, r: o.r, color: CATCOL[gc.findIndex((g) => g.k === o.k) % CATCOL.length] }; }).sort((x, y) => y.avg - x.avg);
    W([30], "Средняя цена по категориям", "Сколько в среднем платят за одну единицу. Полоса — средняя цена, серая зона — от самой дешёвой до самой дорогой продажи.", { kind: "ranges", rows });
  }
  const gt = Object.values(grp("product", list));
  const catOf: Record<string, string> = {}; list.forEach((s) => { if (!catOf[s.product || ""]) catOf[s.product || ""] = s.cat || ""; });
  const gtN = gt.filter((o) => o.k !== "Продажи за день (без детализации)" && !/без детализации|погашени/i.test(o.k));
  if (on(31)) W([31], "Топ-10 товаров по выручке", "Какие товары принесли больше всего денег", { kind: "top", by: "r", tot: a.rev, rows: [...gtN].sort((x, y) => y.r - x.r).slice(0, 10).map((o) => ({ k: o.k, r: o.r, u: o.u, cat: catOf[o.k] || "" })) });
  if (on(32)) W([32], "Топ-10 товаров по количеству", "Какие товары покупают чаще всего", { kind: "top", by: "u", tot: a.units, rows: [...gtN].sort((x, y) => y.u - x.u || y.r - x.r).slice(0, 10).map((o) => ({ k: o.k, r: o.r, u: o.u, cat: catOf[o.k] || "" })) });
  if (on(58)) {
    const BANDS: [number, number, string][] = [[0, 100000, "до 100 тыс"], [100000, 200000, "100–200 тыс"], [200000, 300000, "200–300 тыс"], [300000, 500000, "300–500 тыс"], [500000, 1000000, "500 тыс – 1 млн"], [1000000, 2000000, "1–2 млн"], [2000000, 1e15, "от 2 млн"]];
    const cats = gc.map((o) => o.k).filter((k) => !/без детализации|погашени/i.test(k));
    let cat = pgCat; if (cat !== "all" && !cats.includes(cat)) cat = cats.includes("Оправы") ? "Оправы" : "all";
    const pl2 = list.filter((s) => +(s.qty || 0) > 0 && !/без детализации|погашени/i.test(s.cat || "") && (cat === "all" || s.cat === cat));
    const bd = BANDS.map((b) => ({ lbl: b[2], u: 0, r: 0, pr: {} as Record<string, number> }));
    pl2.forEach((s) => { const up = (+s.sum || 0) / (+(s.qty || 0) || 1); const i = BANDS.findIndex((b) => up >= b[0] && up < b[1]); if (i < 0) return; const o = bd[i]; o.u += +(s.qty || 0); o.r += +s.sum || 0; o.pr[s.product || ""] = (o.pr[s.product || ""] || 0) + +(s.qty || 0); });
    const U = bd.reduce((x, o) => x + o.u, 0), best = bd.reduce((m, o) => (o.u > m.u ? o : m), bd[0]);
    W([58], "Самые продаваемые по ценовым группам", "В каком ценовом диапазоне покупают чаще всего и какие товары лидируют в каждой группе", { kind: "pg", cats, cat, U, best: bd.indexOf(best), bands: bd.map((o) => ({ lbl: o.lbl, u: o.u, r: o.r, top: Object.entries(o.pr).sort((x, y) => y[1] - x[1]).slice(0, 3) })) }, true);
  }
  if (on(33)) {
    let cum = 0; const pr = [...gt].sort((x, y) => y.r - x.r).map((o) => { cum += o.r; const cs = cum / a.rev; return { k: o.k, r: o.r, cs, abc: (cs <= 0.8001 ? "A" : cs <= 0.95 ? "B" : "C") as "A" | "B" | "C" }; });
    const nA = pr.filter((x) => x.abc === "A").length;
    W([33], "ABC-анализ товаров", `${nA} ${pl(nA, "товар даёт", "товара дают", "товаров дают")} 80% выручки из ${pr.length}`, { kind: "pareto", items: pr }, true);
  }
  if (on(34)) {
    const from30 = addD(r.from, -30), cur = new Set(list.map((s) => normS(s.product))), m = matchOf(F); const before: Record<string, { k: string; u: number; r: number; last: string }> = {};
    c.sales.filter((s) => s.date >= from30 && s.date < r.from && m(s)).forEach((s) => { const k = normS(s.product); if (cur.has(k)) return; const o = before[k] || (before[k] = { k: s.product || "", u: 0, r: 0, last: "" }); o.u += +(s.qty || 0); o.r += +s.sum || 0; if (s.date > o.last) o.last = s.date; });
    W([34], "Перестали продаваться", "Продавались за 30 дней до периода, а в периоде — ни разу", { kind: "lost", rows: Object.values(before).sort((x, y) => y.r - x.r).slice(0, 12), hist: c.sales.some((s) => s.date < r.from) });
  }
  if (on(38)) {
    const rows: Bar[] = gc.map((o, i) => { const m = c.marginOf(list.filter((s) => (s.cat || "—") === o.k)); return { label: o.k, value: m.m != null ? m.m * 100 : 0, valTxt: m.m != null ? pctF(m.m) : "—", color: CATCOL[i % CATCOL.length], sub: m.rev ? `прибыль ${fmtM(m.gross)}` : "нет цен покупки" }; });
    W([38], "Маржа по категориям", "Там, где известна цена покупки", mg.rev ? { kind: "hbars", items: rows } : { kind: "text", text: "Нет цен покупки. Пришлите список «Все товары» с ценами покупки." });
  }
  if (on(39)) {
    const rows = ptItems.map((o) => {
      const pl3 = list.filter((s) => s.point === o.k), m = c.marginOf(pl3); const bc: Record<string, { k: string; gp: number; r: number }> = {};
      pl3.forEach((s) => { const cc = c.costOf(s); if (!cc) return; const k = s.cat || "—"; const x = bc[k] || (bc[k] = { k, gp: 0, r: 0 }); x.gp += (+s.sum || 0) - cc * +(s.qty || 0); x.r += +s.sum || 0; });
      const tc = Object.values(bc).sort((x, y) => y.gp - x.gp)[0];
      return { k: o.k, all: o.r, rev: m.rev, cogs: m.cogs, gp: m.gross, m: m.m, cov: m.cover, tc };
    });
    const T = { all: rows.reduce((x, o) => x + o.all, 0), rev: rows.reduce((x, o) => x + o.rev, 0), cogs: rows.reduce((x, o) => x + o.cogs, 0), gp: 0 }; T.gp = T.rev - T.cogs;
    W([39], "Маржа по точкам", "Прибыль = выручка − цена покупки × количество. Считаются продажи с известной ценой покупки; «покрытие» — какая доля выручки точки посчитана.", { kind: "marginPts", rows, T, has: !!mg.rev }, true);
  }
  if (on(59)) {
    const M = (r.to || t).slice(0, 7), fm = Array.isArray(c.finCfg.months) ? c.finCfg.months : [], o = fm.includes(M) ? ownerProfit(c, M) : null;
    W([59], "Прибыль собственнику", o ? `По отчёту за ${MONTHS[+M.slice(5, 7) - 1].toLowerCase()} ${M.slice(0, 4)}${M === t.slice(0, 7) ? " · на сегодня, месяц не закончен" : ""} · оценка: часть себестоимости ещё рассчитывается` : "", { kind: "owner", o, months: fm, live: M === t.slice(0, 7) }, true);
  }
  const wdCount = [0, 0, 0, 0, 0, 0, 0]; days.forEach((d) => wdCount[wdIdx(d)]++);
  const wdSum = [0, 0, 0, 0, 0, 0, 0]; list.forEach((s) => (wdSum[wdIdx(s.date)] += +s.sum || 0));
  if (on(43)) { const av = wdSum.map((v, i) => (wdCount[i] ? v / wdCount[i] : 0)), bi = av.indexOf(Math.max(...av)); W([43], "По дням недели", `Сильнее всего — ${WD[bi]}: ${fmtM(av[bi])} в среднем`, { kind: "bars", labels: WD, vals: av, hl: true, vk: "money", group: "trio" }); widgets[widgets.length - 1].group = "trio"; }
  const periodKey = (s: string, g: "week" | "month") => (g === "week" ? weekStart(s) : s.slice(0, 7));
  const periodsIn = (from: string, to: string, g: "week" | "month") => { const out: string[] = []; const seen = new Set<string>(); let d = from, guard = 0; while (d <= to && guard++ < 1500) { const k = periodKey(d, g); if (!seen.has(k)) { seen.add(k); out.push(k); } d = addD(d, 1); } return out; };
  if (on(44)) { const ks = periodsIn(r.from, r.to, "week"), m: Record<string, number> = {}; list.forEach((s) => { const k = periodKey(s.date, "week"); m[k] = (m[k] || 0) + (+s.sum || 0); }); const vv = ks.map((k) => m[k] || 0), bi = vv.indexOf(Math.max(...vv)); W([44], "По неделям", ks.length ? `Лучшая неделя — с ${dShort(ks[bi])}: ${fmtM(vv[bi])}` : "", { kind: "bars", labels: ks.map((k) => dShort(k)), vals: vv, hl: true, vk: "money" }); widgets[widgets.length - 1].group = "trio"; }
  if (on(45)) { const ks = periodsIn(r.from, r.to, "month"), m: Record<string, number> = {}; list.forEach((s) => { const k = periodKey(s.date, "month"); m[k] = (m[k] || 0) + (+s.sum || 0); }); const vv = ks.map((k) => m[k] || 0), bi = vv.indexOf(Math.max(...vv)); const ml = (k: string) => MONTHS[+k.slice(5, 7) - 1] + " " + k.slice(0, 4); W([45], "По месяцам", ks.length ? `Лучший месяц — ${ml(ks[bi])}: ${fmtM(vv[bi])}` : "", { kind: "bars", labels: ks.map(ml), vals: vv, hl: true, vk: "money" }); widgets[widgets.length - 1].group = "trio"; }
  if (on(46) || on(47)) {
    const pts = ptItems.map((o) => o.k), hm: Record<string, number> = {}; let hmax = 1; list.forEach((s) => { const k = s.point + "|" + wdIdx(s.date); hm[k] = (hm[k] || 0) + (+s.sum || 0); });
    const avg = (p: string, i: number) => (wdCount[i] ? (hm[p + "|" + i] || 0) / wdCount[i] : 0); pts.forEach((p) => WD.forEach((_, i) => (hmax = Math.max(hmax, avg(p, i)))));
    const best = pts.map((p) => { let bi = 0; WD.forEach((_, i) => { if (avg(p, i) > avg(p, bi)) bi = i; }); return bi; });
    W([46, 47], on(46) ? "Точки × дни недели" : "Лучший день недели каждой точки", "Средняя выручка за один такой день. Чем темнее, тем больше" + (on(47) ? "; лучший день точки обведён" : ""), { kind: "heat", pts, avg: pts.map((p) => WD.map((_, i) => avg(p, i))), hmax, best: on(47) ? best : null, showBest: on(47) }, true);
  }
  // ----- новая партия -----
  const bb = curBatch(c), BIDS = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57];
  if (bb && (bb.items || []).length && BIDS.some(on)) {
    const { items } = batchStats(c, bb, F.point, r.from, r.to);
    const Q = items.reduce((x, i) => x + i.q, 0), S = items.reduce((x, i) => x + i.sold, 0), L = items.reduce((x, i) => x + i.left, 0);
    const PS = items.reduce((x, i) => x + i.pSold, 0), PR = items.reduce((x, i) => x + i.pRev, 0), pFrom = bb.date && r.from < bb.date ? bb.date : r.from, perTxt = pFrom === r.to ? dLong(r.to) : `${dShort(pFrom)}–${dShort(r.to)}`;
    const start = bb.date || t, bd = Math.max(1, daysBetween(start, t)), rate = S / bd, fc = rate > 0 && L > 0 ? Math.ceil(L / rate) : null;
    const vl = items.reduce((x, i) => x + i.left * (+(i.p || 0)), 0);
    const wc = items.filter((i) => +(i.cp || 0) > 0 && i.pSold), cg = wc.reduce((x, i) => x + i.pSold * (i.cp as number), 0), rc = wc.reduce((x, i) => x + i.pRev, 0);
    const totPer = c.sales.filter((x) => x.date >= pFrom && x.date <= r.to && (F.point === "all" || x.point === F.point)).reduce((q, x) => q + (+x.sum || 0), 0);
    const ro = reorderList(items), uns = items.filter((i) => !i.sold).length, nm = `«${bb.name || "Партия"}»`;
    if (on(48)) C({ id: 48, label: "Продано из партии", v: fmt(PS) + " шт", d: `за ${perTxt} · ${nm}: из ${fmt(Q)} шт`, ring: { p: Q ? PS / Q : 0 } });
    if (on(49)) C({ id: 49, label: "Осталось из партии", v: fmt(L) + " шт", d: `на сегодня` + (vl ? ` · на ${fmt(vl)} сум по цене продажи` : "") });
    if (on(52)) C({ id: 52, label: "Темп продаж партии", v: (rate >= 10 ? fmt(rate) : rate.toFixed(1).replace(".", ",")) + " шт/день", d: `на сегодня: в среднем за ${bd} дн. с ${dShort(start)}` });
    if (on(53)) C({ id: 53, label: "Прогноз распродажи", v: L === 0 ? "распродано" : fc != null ? `~${fmt(fc)} дн.` : "—", d: fc != null ? `примерно к ${dLong(addD(t, fc))}` : "" });
    if (on(54)) C({ id: 54, label: "Модели без продаж", v: fmt(uns), d: `на сегодня · из ${items.length} моделей партии` });
    if (on(56)) C({ id: 56, label: "Выручка с партии", v: fmt(PR) + " сум", d: `за ${perTxt}` + (rc ? ` · маржа ${pctF((rc - cg) / rc)} · прибыль ${fmt(rc - cg)}` : "") });
    if (on(57)) C({ id: 57, label: "Доля партии в продажах", v: pctF(totPer ? PR / totPer : 0), d: `от всей выручки за ${perTxt}` });
    if (on(50)) { const bp: Record<string, number> = {}; items.forEach((i) => Object.entries(i.pByPt).forEach(([k, v]) => (bp[k] = (bp[k] || 0) + v))); W([50], "Партия: продажи по точкам", `${nm} · за ${perTxt}`, Object.keys(bp).length ? { kind: "hbars", items: Object.entries(bp).sort((x, y) => y[1] - x[1]).map(([k, v]) => ({ label: k, value: v, valTxt: v + " шт", color: PC(k) })) } : { kind: "text", text: "За этот период продаж из партии нет" }); }
    if (on(51)) { const gm: Record<string, { k: string; q: number; s: number }> = {}; items.forEach((i) => { const k = i.g || i.c || "Без группы"; const o = gm[k] || (gm[k] = { k, q: 0, s: 0 }); o.q += i.q; o.s += Math.min(i.pSold, i.q); }); W([51], "Партия: продажи по группам", `Процент от пришедшего, проданный за ${perTxt}`, { kind: "hbars", items: Object.values(gm).sort((x, y) => y.s / (y.q || 1) - x.s / (x.q || 1)).slice(0, 12).map((o) => ({ label: o.k, value: o.q ? (o.s / o.q) * 100 : 0, valTxt: pctF(o.q ? o.s / o.q : 0), color: "var(--chart-3)", sub: `${o.s} из ${o.q} шт` })) }); }
    if (on(55)) W([55], "Партия: на дозаказ", "Закончились или осталось 20% и меньше", ro.length ? { kind: "reorder", rows: ro.slice(0, 15) } : { kind: "text", text: "Пока ничего не заканчивается." });
  } else if (BIDS.some(on)) {
    W(BIDS, "Новая партия", "", { kind: "text", text: "Список партии ещё не загружен. Загрузите его на вкладке «Склад» → «Проданные из новой партии», и здесь появятся показатели 48–57." });
  }
  void itemLabel; void inRange;
  return { empty: false, period, ...base, mg, cards, widgets, exp: expSum };
}
