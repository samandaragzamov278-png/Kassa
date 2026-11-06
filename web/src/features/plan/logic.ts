// Расчёты раздела «План» — перенос один в один из скрипта продаж в dev/base.html (plCalc, plStats, plFcast, plPrevShares…).
// Все функции чистые: «сегодня» передаётся снаружи (в браузере — todayTash()), данные — в PlanEnv.
import type { Data, Sale } from "../../lib/types";

/** строка продажи со всеми полями, которые нужны плану и Главной */
export type SaleRow = Sale & { qty?: number; price?: number; cat?: string; product?: string; check?: string | number; cost?: number; batchKey?: string; batchId?: string };

export interface PlanMonth { total: number; shares: Record<string, number> }
export interface PlanCfg { months: Record<string, PlanMonth>; sellers: Record<string, string>; off: number[] }
export interface PlanEnv { sales: SaleRow[]; points: string[]; cfg: PlanCfg; today: string }

export const PL_DEF_SELLERS: Record<string, string> = { "Премиум": "Нодира", "Яшнабад": "Севара", "Сергели": "Зарнигор" };
export const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
export const MONTHS_FULL = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
export const monthTitle = (m: string) => MONTHS_SHORT[+m.slice(5, 7) - 1] + " " + m.slice(0, 4);

// ---------- даты (календарные строки YYYY-MM-DD, без часовых поясов) ----------
const pad = (n: number) => String(n).padStart(2, "0");
const utc = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
export const dow = (s: string) => new Date(utc(s)).getUTCDay();
export const addD = (s: string, n: number) => new Date(utc(s) + n * 864e5).toISOString().slice(0, 10);
export const monthEnd = (m: string) => m + "-" + pad(new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate());
export const weekStart = (s: string) => addD(s, -((dow(s) + 6) % 7));
export const dShort = (s?: string) => (s ? s.slice(8, 10) + "." + s.slice(5, 7) : "—");
export const dLong = (s?: string) => (s ? s.slice(8, 10) + "." + s.slice(5, 7) + "." + s.slice(0, 4) : "");

// ---------- форматы (как на рабочем сайте) ----------
export const fmt = (n: number) => (n < 0 ? "−" : "") + Math.round(Math.abs(n || 0)).toLocaleString("ru-RU").replace(/[\s  ,]/g, " ");
export const fmtM = (n: number) => { const a = Math.abs(n); if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(".", ",") + " млн"; if (a >= 1e3) return Math.round(n / 1e3) + " тыс"; return String(Math.round(n)); };
export const pctF = (x: number | null | undefined) => (x == null || !isFinite(x) ? "—" : Math.round(x * 100) + "%");
export const parseAmt = (s: string) => { const v = String(s ?? "").replace(/[^\d]/g, ""); return v ? parseInt(v, 10) : NaN; };
export const plural = (n: number, a: string, b: string, c: string) => { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return a; if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return b; return c; };

// ---------- признаки продаж ----------
export const sumOf = (l: { sum?: number }[]) => l.reduce((a, s) => a + (+(s.sum as number) || 0), 0);
export const discOf = (s: SaleRow) => Math.max(0, (+(s.qty as number) || 0) * (+(s.price as number) || 0) - (+s.sum || 0));
export const checkKey = (s: SaleRow) => s.date + "|" + s.point + "|" + (s.check ? String(s.check) : "_" + s.id);
export const isFrame = (s: SaleRow) => /оправ/i.test(s.cat || "") || /оправ/i.test(s.product || "");
export const isContact = (s: SaleRow) => /контакт/i.test(s.cat || "") || /контакт|к\/л|однодн|acuvue|air optix|biotrue|dailies/i.test(s.product || "");
export const isLens = (s: SaleRow) => /очков.*линз|^линзы$/i.test(s.cat || "") && !isContact(s);

// ---------- настройки плана ----------
export const defaultCfg = (): PlanCfg => ({ months: {}, sellers: { ...PL_DEF_SELLERS }, off: [0] });
/** settings/plan из базы → настройки (как onSnapshot на рабочем сайте) */
export function readPlanCfg(d: Data): PlanCfg {
  const raw = (d.rows.settings || {}).plan as Partial<PlanCfg> | undefined;
  if (!raw) return defaultCfg();
  return { months: (raw.months as PlanCfg["months"]) || {}, sellers: { ...PL_DEF_SELLERS, ...((raw.sellers as Record<string, string>) || {}) }, off: Array.isArray(raw.off) ? raw.off : [0] };
}
export const planEnv = (d: Data, today: string): PlanEnv => ({ sales: d.sales as SaleRow[], points: d.points, cfg: readPlanCfg(d), today });

export const plOff = (cfg: PlanCfg, d: string) => (cfg.off || [0]).includes(dow(d));
export const plDays = (m: string) => { const out: string[] = [], e = +monthEnd(m).slice(8); for (let i = 1; i <= e; i++) out.push(m + "-" + pad(i)); return out; };

/** доли точек по выручке прошлого месяца (в процентах, с десятыми) */
export function plPrevShares(env: PlanEnv, m: string): Record<string, number> {
  const pm = addD(m + "-01", -1).slice(0, 7), by: Record<string, number> = {};
  env.sales.filter((s) => (s.date || "").startsWith(pm)).forEach((s) => { by[s.point] = (by[s.point] || 0) + (+s.sum || 0); });
  const tot = Object.values(by).reduce((a, b) => a + b, 0), out: Record<string, number> = {};
  env.points.forEach((p) => { out[p] = tot ? Math.round(((by[p] || 0) / tot) * 1000) / 10 : 0; });
  return out;
}
export function plConf(cfg: PlanCfg, m: string): PlanMonth {
  const c = cfg.months && cfg.months[m];
  return c ? { total: +c.total || 0, shares: { ...(c.shares || {}) } } : { total: 0, shares: {} };
}

export function plCalc(env: PlanEnv, m: string) {
  const c = plConf(env.cfg, m), days = plDays(m), today = env.today;
  const work = days.filter((d) => !plOff(env.cfg, d));
  const list = env.sales.filter((s) => (s.date || "").startsWith(m));
  const past = today > monthEnd(m), future = today < m + "-01";
  const done = work.filter((d) => d < today), left = work.filter((d) => d >= today);
  const fact = sumOf(list), factBefore = sumOf(list.filter((s) => s.date < today));
  const shares = { ...plPrevShares(env, m), ...c.shares };
  return { c, days, work, list, past, future, today, done, left, fact, factBefore, shares };
}
export type PlanCalc = ReturnType<typeof plCalc>;

/** Прогноз остатка месяца: индекс дня недели (как день торгует относительно среднего, за 8 недель до сегодня)
 *  × уровень продаж текущего месяца; в начале месяца уровень сглаживается средним за 8 недель. Вилка ~80%. */
export function plFcast(env: PlanEnv, pt: string | null | undefined, done: string[], left: string[], factBefore: number) {
  const today = env.today, own = env.sales.filter((s) => s.date && (!pt || s.point === pt));
  let from = addD(today, -56);
  const first = own.reduce((m, s) => (!m || s.date < m ? s.date : m), "");
  if (first > from) from = first;
  const byD: Record<string, SaleRow[]> = {};
  own.forEach((s) => { if (s.date >= from && s.date < today) (byD[s.date] = byD[s.date] || []).push(s); });
  const hist: { w: number; v: number }[] = [];
  for (let d = from; d && d < today; d = addD(d, 1)) { if (!plOff(env.cfg, d)) hist.push({ w: dow(d), v: sumOf(byD[d] || []) }); }
  const mean = hist.length ? hist.reduce((a, x) => a + x.v, 0) / hist.length : 0, idx: Record<number, number> = {};
  if (mean > 0) for (let w = 0; w < 7; w++) { const xs = hist.filter((x) => x.w === w); if (xs.length >= 2) idx[w] = xs.reduce((a, x) => a + x.v, 0) / xs.length / mean; }
  const ix = (d: string) => idx[dow(d)] || 1;
  const base = done.reduce((a, d) => a + ix(d), 0), lvlM = base ? factBefore / base : mean, k = Math.min(1, done.length / 12), lvl = mean > 0 ? k * lvlM + (1 - k) * mean : lvlM;
  const exp = left.map((d) => lvl * ix(d)), fc = factBefore + exp.reduce((a, b) => a + b, 0);
  const res = mean > 0 ? hist.map((x) => x.v / (mean * (idx[x.w] || 1)) - 1) : [], sd = res.length > 2 ? Math.sqrt(res.reduce((a, r) => a + r * r, 0) / (res.length - 1)) : 0;
  const band = 1.28 * sd * Math.sqrt(exp.reduce((a, e) => a + e * e, 0));
  return { fc, lo: Math.max(factBefore, fc - band), hi: fc + band };
}

export function plStats(env: PlanEnv, total: number, fact: number, factBefore: number, work: string[], done: string[], left: string[], past: boolean, pt?: string | null) {
  const pace = done.length ? factBefore / done.length : 0;
  const need = Math.max(0, total - fact);
  const needDay = past ? 0 : left.length ? need / left.length : need;
  const fx = past ? { fc: fact, lo: fact, hi: fact } : plFcast(env, pt, done, left, factBefore), forecast = fx.fc;
  const sched = (total * Math.min(work.length, done.length)) / (work.length || 1);
  const pct = total ? fact / total : 0, fpct = total ? forecast / total : 0;
  return { pace, need, needDay, needWeek: needDay * Math.min(6, 7 - (env.cfg.off || [0]).length), forecast, fLo: fx.lo, fHi: fx.hi, sched, gap: fact - sched, pct, fpct };
}
export type PlanStats = ReturnType<typeof plStats>;

/** статус выполнения: ok — с запасом, mid — почти, bad — отстаём */
export const plCls = (f: number): "ok" | "mid" | "bad" => (f >= 1 ? "ok" : f >= 0.85 ? "mid" : "bad");
export const plColor = (f: number) => (f >= 1 ? "var(--plus)" : f >= 0.85 ? "var(--warn)" : "var(--minus)");

/** итог месяца по плану: общая статистика */
export function planMonth(env: PlanEnv, m: string) {
  const K = plCalc(env, m), total = K.c.total;
  const S = total ? plStats(env, total, K.fact, K.factBefore, K.work, K.done, K.left, K.past) : null;
  return { K, total, S };
}

export const planStatus = (K: PlanCalc, S: PlanStats) => (K.past ? (S.pct >= 1 ? "План выполнен" : "План не выполнен") : K.future ? "Месяц ещё не начался" : S.fpct >= 1 ? "Идём с запасом" : S.fpct >= 0.85 ? "Почти в графике" : "Отстаём от плана");

export function planPeriod(K: PlanCalc, m: string) {
  const w = K.work.length, l = K.left.length;
  return `${dLong(m + "-01")} — ${dLong(monthEnd(m))} · ${w} рабочих ${plural(w, "день", "дня", "дней")} (воскресенье — выходной)` + (K.past ? " · месяц закрыт" : K.future ? "" : ` · осталось ${l} ${plural(l, "рабочий день", "рабочих дня", "рабочих дней")}`);
}

/** месяцы для переключателя: с продажами, с планом и текущий */
export function planMonths(env: PlanEnv) {
  return [...new Set(env.sales.map((s) => (s.date || "").slice(0, 7)).filter(Boolean).concat(Object.keys(env.cfg.months || {})).concat([env.today.slice(0, 7)]))].sort();
}

export interface DayBar { d: string; n: number; v: number; off: boolean; ok: boolean; today: boolean }
/** выручка по дням месяца + дневной план */
export function planDayBars(env: PlanEnv, K: PlanCalc, total: number) {
  const byD: Record<string, number> = {};
  K.list.forEach((s) => { byD[s.date] = (byD[s.date] || 0) + (+s.sum || 0); });
  const tgt = total / (K.work.length || 1);
  const bars: DayBar[] = K.days.map((d) => ({ d, n: +d.slice(8), v: byD[d] || 0, off: plOff(env.cfg, d), ok: (byD[d] || 0) >= tgt, today: d === K.today }));
  return { byD, tgt, bars };
}

export interface WeekRow { from: string; to: string; wd: number; plan: number; fact: number; diff: number; cur: boolean; fut: boolean; ratio: number }
export function planWeeks(env: PlanEnv, K: PlanCalc, byD: Record<string, number>, tgt: number): WeekRow[] {
  const wk: { ws: string; days: string[] }[] = [];
  K.days.forEach((d) => { const ws = weekStart(d); let w = wk.find((x) => x.ws === ws); if (!w) { w = { ws, days: [] }; wk.push(w); } w.days.push(d); });
  return wk.map((w) => {
    const wd = w.days.filter((d) => !plOff(env.cfg, d)).length, pv = tgt * wd, fv = w.days.reduce((a, d) => a + (byD[d] || 0), 0);
    return { from: w.days[0], to: w.days[w.days.length - 1], wd, plan: pv, fact: fv, diff: fv - pv, cur: w.days.includes(K.today), fut: w.days[0] > K.today, ratio: pv ? fv / pv : 0 };
  });
}

export interface PointRow { p: string; pt: number; f: number; st: PlanStats; n: number; avg: number; fl: number | null; disc: number; dp: number; seller: string; rank: number }
/** точки и продавцы: план точки, выполнение, прогноз, чеки, «оправа + линзы», скидки */
export function planPoints(env: PlanEnv, K: PlanCalc, total: number): PointRow[] {
  const pts = env.points.filter((p) => (K.shares[p] || 0) > 0 || K.list.some((s) => s.point === p));
  const rows = pts.map((p) => {
    const l = K.list.filter((s) => s.point === p), pt = (total * (K.shares[p] || 0)) / 100, f = sumOf(l), fb = sumOf(l.filter((s) => s.date < K.today));
    const st = plStats(env, pt, f, fb, K.work, K.done, K.left, K.past, p);
    const chk: Record<string, { f: number; l: number; sum: number }> = {};
    l.forEach((s) => { const o = chk[checkKey(s)] || (chk[checkKey(s)] = { f: 0, l: 0, sum: 0 }); o.sum += +s.sum || 0; if (isFrame(s)) o.f = 1; if (isLens(s)) o.l = 1; });
    const cs = Object.values(chk), fr = cs.filter((o) => o.f), both = fr.filter((o) => o.l).length, disc = l.reduce((a, s) => a + discOf(s), 0), gross = f + disc;
    return { p, pt, f, st, n: cs.length, avg: cs.length ? f / cs.length : 0, fl: fr.length ? both / fr.length : null, disc, dp: gross ? disc / gross : 0, seller: env.cfg.sellers[p] || "", rank: -1 };
  });
  const ranked = rows.filter((r) => r.pt).slice().sort((a, b) => b.f / b.pt - a.f / a.pt);
  rows.forEach((r) => { r.rank = ranked.indexOf(r); });
  return rows;
}

// ---------- сохранение плана ----------
/** Проверка и сборка документа settings/plan: сумма долей должна быть 100%, если задан план месяца.
 *  Остальные месяцы и поля документа сохраняются как есть. */
export function buildPlanDoc(raw: Record<string, unknown> | undefined, cfg: PlanCfg, month: string, totalText: string, shareText: Record<string, string>, sellerText: Record<string, string>):
  { ok: true; doc: Record<string, unknown> } | { ok: false; msg: string } {
  const total = parseAmt(totalText) || 0, shares: Record<string, number> = {};
  let sum = 0;
  Object.entries(shareText).forEach(([p, t]) => { const v = parseFloat(String(t).replace(",", ".")) || 0; shares[p] = v; sum += v; });
  const sellers = { ...cfg.sellers };
  Object.entries(sellerText).forEach(([p, t]) => { sellers[p] = String(t).trim(); });
  if (total && Math.abs(sum - 100) > 0.5) return { ok: false, msg: `Сумма долей ${String(Math.round(sum * 10) / 10).replace(".", ",")}% — должна быть 100%` };
  const months = JSON.parse(JSON.stringify(cfg.months || {})) as PlanCfg["months"];
  months[month] = { total, shares };
  return { ok: true, doc: { ...(raw || {}), months, sellers, off: cfg.off || [0] } };
}
