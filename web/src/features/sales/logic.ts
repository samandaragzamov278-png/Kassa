// Расчёты раздела «Продажи» — перенос один в один из скрипта продаж в dev/base.html рабочего сайта.
// Чистые функции: данные и «сегодня» приходят снаружи, ничего не читается из страницы.
import type { Data, Entry, Sale } from "../../lib/types";
import { fmt } from "../pay/logic";

export { fmt };
export const todayTash = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);

// ===================== утилиты (как на рабочем сайте) =====================
export const fmtM = (n: number) => { const a = Math.abs(n); if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(".", ",") + " млн"; if (a >= 1e3) return Math.round(n / 1e3) + " тыс"; return String(Math.round(n)); };
export const parseAmt = (s: unknown) => { const v = String(s ?? "").replace(/[^\d]/g, ""); return v ? parseInt(v, 10) : NaN; };
const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const pd = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const addD = (s: string, n: number) => { const d = pd(s); d.setDate(d.getDate() + n); return iso(d); };
export const dShort = (s?: string) => (s ? s.slice(8, 10) + "." + s.slice(5, 7) : "—");
export const dLong = (s?: string) => (s ? s.slice(8, 10) + "." + s.slice(5, 7) + "." + s.slice(0, 4) : "");
export const daysBetween = (a: string, b: string) => Math.round((pd(b).getTime() - pd(a).getTime()) / 864e5) + 1;
export const weekStart = (s: string) => { const d = pd(s); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return iso(d); };
export const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
export const MONTHS_F = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
export const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export const WD_FULL = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
export const wdIdx = (s: string) => (pd(s).getDay() + 6) % 7;
export const monthEnd = (m: string) => { const d = new Date(+m.slice(0, 4), +m.slice(5, 7), 0); return m + "-" + String(d.getDate()).padStart(2, "0"); };
export const plural = (n: number, a: string, b: string, c: string) => { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return a; if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return b; return c; };
export const niceStep = (x: number) => { if (x <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(x))); const n = x / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
export const normS = (s: unknown) => String(s == null ? "" : s).toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ===================== справочники =====================
export const DEF_POINTS = ["Премиум", "Яшнабад", "Сергели", "C1"];
export const KASSA_POINTS = ["Премиум", "Яшнабад"];
export const DEF_CATS = ["Оправы", "Детские оправы", "Очковые линзы", "Солнцезащитные очки", "Контактные линзы", "Растворы и капли", "Аксессуары", "Ремонт и услуги"];
export const PAYS = ["Наличные", "Терминал", "QR/Payme", "Перечисление"];
export const PAYSHORT: Record<string, string> = { "Наличные": "Нал", "Терминал": "Тер", "QR/Payme": "QR", "Перечисление": "Пер" };
export const LTYPES = ["Однофокальные", "Прогрессивные", "Бифокальные", "Офисные", "Замена линз"];
export const LIDX = ["1.50", "1.56", "1.59", "1.60", "1.61", "1.67", "1.74"];
export const LCOAT = ["Без покрытия", "Антиблик", "Блю-блок", "Фотохром", "Фотохром + блю-блок", "4в1", "Тонированные", "Поляризация"];
export const LKINDS = ["Essilor", "Seiko", "Miyosmart (Hoya)", "Тио", "Прогрессивные", "Бифокальные", "Хамелеон", "1.74", "1.67", "4в1", "Блок (блю-блок)", "Star", "Steel", "ET", "Для чтения", "Для зрения", "Тип не указан"];
export const PCOL = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
export const PAYCOL: Record<string, string> = { "Наличные": "var(--chart-3)", "Терминал": "var(--chart-1)", "QR/Payme": "var(--chart-2)", "Перечисление": "var(--chart-4)" };

export interface Lens { type?: string; index?: string; coat?: string; brand?: string }
/** продажа с полями, которых нет в общем типе Sale */
export interface SaleX extends Sale { cat?: string; product?: string; qty?: number; price?: number; check?: string; lens?: Lens | null; photo?: string; note?: string; debt?: number }
export interface Settings { points: string[]; cats: string[]; plan: number }
export interface PlanCfg { months: Record<string, { total?: number; shares?: Record<string, number> }>; sellers: Record<string, string>; off: number[] }
export interface DayExp extends Entry { fact?: number }

export const normPay = (p: unknown) => {
  const t = normS(p);
  if (!t) return "Наличные";
  if (/терм|карт|uzcard|humo|хумо/.test(t)) return "Терминал";
  if (/переч|безнал/.test(t)) return "Перечисление";
  if (/нал|б\/ч|cash/.test(t)) return "Наличные";
  if (/qr|payme|пейми|click|клик/.test(t)) return "QR/Payme";
  if (/переч|счет|счёт|безнал/.test(t)) return "Перечисление";
  return PAYS.includes(p as string) ? (p as string) : "Наличные";
};
export const payOf = (s: SaleX): Record<string, number> => {
  if (s.pays && typeof s.pays === "object") { const o: Record<string, number> = {}; Object.entries(s.pays).forEach(([k, v]) => { const n = normPay(k); o[n] = (o[n] || 0) + (+v || 0); }); return o; }
  return { [normPay(s.pay)]: +s.sum || 0 };
};
export const discOf = (s: SaleX) => Math.max(0, (+(s.qty as number) || 0) * (+(s.price as number) || 0) - (+s.sum || 0));
export const checkKey = (s: SaleX) => s.date + "|" + s.point + "|" + (s.check ? String(s.check) : "_" + s.id);
export const expVal = (e: DayExp) => (typeof e.fact === "number" ? e.fact : +(e.amount as number) || 0);
export const lowerFirst = (n: string) => n.charAt(0).toLowerCase() + n.slice(1);
export const expTitle = (e: DayExp) => String(e.name).replace(/^\S+\s+(за|на)\s+/i, "");

// ===================== настройки и данные =====================
export function settingsOf(d: Data): Settings {
  const r = (d.rows.settings?.sales || null) as { points?: string[]; cats?: string[]; plan?: number } | null;
  if (r && Array.isArray(r.points) && r.points.length) return { points: r.points.slice(), cats: (Array.isArray(r.cats) && r.cats.length ? r.cats : DEF_CATS).slice(), plan: +(r.plan as number) || 0 };
  return { points: DEF_POINTS.slice(), cats: DEF_CATS.slice(), plan: 0 };
}
export function planCfgOf(d: Data): PlanCfg {
  const p = (d.rows.settings?.plan || null) as Partial<PlanCfg> | null;
  return { months: p?.months || {}, sellers: p?.sellers || {}, off: Array.isArray(p?.off) ? (p!.off as number[]) : [0] };
}
/** расходы дня: записи Кассы с источником «day», кроме приходов */
export const dayExpOf = (d: Data): DayExp[] => d.entries.filter((e) => e.source === "day" && e.type !== "inc") as DayExp[];
export const salesOf = (d: Data): SaleX[] => d.sales as SaleX[];

export interface Ctx { sales: SaleX[]; exp: DayExp[]; settings: Settings; plan: PlanCfg; today: string }
export const ctxOf = (d: Data): Ctx => ({ sales: salesOf(d), exp: dayExpOf(d), settings: settingsOf(d), plan: planCfgOf(d), today: todayTash() });

export const pointColor = (p: string, points: string[]) => { const i = points.indexOf(p); return PCOL[(i < 0 ? points.length : i) % PCOL.length]; };

// ===================== фильтр =====================
export interface Filter { from: string; to: string; point: string; cat: string; lk: string; preset: string }
export const defaultFilter = (today = todayTash()): Filter => ({ from: today.slice(0, 8) + "01", to: today, point: "all", cat: "all", lk: "all", preset: "month" });
export function presetRange(p: string, t: string): { from: string; to: string } {
  if (p === "today") return { from: t, to: t };
  if (p === "7d") return { from: addD(t, -6), to: t };
  if (p === "month") return { from: t.slice(0, 8) + "01", to: t };
  if (p === "prev") { const d = pd(t.slice(0, 8) + "01"); d.setDate(0); const to = iso(d); return { from: to.slice(0, 8) + "01", to }; }
  return { from: "", to: "" };
}
export const inRange = (s: { date: string }, from: string, to: string) => (!from || s.date >= from) && (!to || s.date <= to);
export const matchOf = (F: Filter) => (s: SaleX) => (F.point === "all" || s.point === F.point) && (F.cat === "all" || s.cat === F.cat);
export const filtered = (c: Ctx, F: Filter) => c.sales.filter((s) => inRange(s, F.from, F.to) && matchOf(F)(s));
export const expFiltered = (c: Ctx, F: Filter) => c.exp.filter((e) => inRange(e, F.from, F.to) && (F.point === "all" || e.branch === F.point));
export function rangeOf(F: Filter, list: SaleX[], today: string) {
  let from = F.from, to = F.to;
  if (!from || !to) { const ds = list.map((s) => s.date).sort(); if (!from) from = ds[0] || today; if (!to) to = ds[ds.length - 1] || today; }
  return { from, to, days: Math.max(1, daysBetween(from, to)) };
}
export function prevList(c: Ctx, F: Filter) {
  if (!F.from || !F.to) return null;
  const n = daysBetween(F.from, F.to), pto = addD(F.from, -1), pfrom = addD(F.from, -n);
  return { list: c.sales.filter((s) => inRange(s, pfrom, pto) && matchOf(F)(s)), from: pfrom, to: pto };
}
export function monthsOf(sales: SaleX[]) { return [...new Set(sales.map((x) => (x.date || "").slice(0, 7)).filter(Boolean))].sort().reverse(); }
/** выбранный «Месяц» в фильтре: если период — ровно один месяц (до конца или до сегодня) */
export function curMonth(F: Filter, today: string) {
  return F.from && F.to && F.from.endsWith("-01") && F.from.slice(0, 7) === F.to.slice(0, 7) && (F.to === monthEnd(F.from.slice(0, 7)) || F.to === today) ? F.from.slice(0, 7) : "";
}

export interface Agg { rev: number; n: number; units: number; checks: number; avg: number; unitPrice: number; upc: number; disc: number; discN: number; cash: number }
export function agg(l: SaleX[]): Agg {
  let rev = 0, units = 0, disc = 0, discN = 0, cash = 0; const ch = new Set<string>();
  l.forEach((s) => { rev += +s.sum || 0; units += +(s.qty as number) || 0; const d = discOf(s); if (d > 0) { disc += d; discN++; } cash += +(payOf(s)["Наличные"] || 0); ch.add(checkKey(s)); });
  const checks = ch.size;
  return { rev, n: l.length, units, checks, avg: checks ? rev / checks : 0, unitPrice: units ? rev / units : 0, upc: checks ? units / checks : 0, disc, discN, cash };
}

/** «▲ 12% к прошлому периоду» для плиток */
export function cmpText(cur: number, prev: number | null | undefined): { kind: "none" | "flat" | "up" | "down" | "nodata"; text: string } {
  if (prev == null) return { kind: "none", text: "" };
  if (!prev) return { kind: "nodata", text: "в прошлом периоде продаж не было" };
  const p = (cur - prev) / prev * 100;
  if (Math.abs(p) < 0.5) return { kind: "flat", text: "≈ 0% к прошлому периоду" };
  return { kind: p >= 0 ? "up" : "down", text: `${p >= 0 ? "▲" : "▼"} ${Math.abs(p).toFixed(0)}% к прошлому периоду` };
}

// ===================== касса дня по точкам =====================
export interface DayCashRow { d: string; p: string; pay: Record<string, number>; tot: number; exp: number; n: number; cash: number; after: number; kassa: boolean }
export function dayCashRows(list: SaleX[], ex: DayExp[], points: string[]): DayCashRow[] {
  const m: Record<string, { d: string; p: string; pay: Record<string, number>; tot: number; exp: number; n: number }> = {};
  const row = (d: string, p: string) => m[d + "|" + p] || (m[d + "|" + p] = { d, p, pay: {}, tot: 0, exp: 0, n: 0 });
  list.forEach((s) => { const o = row(s.date, s.point); const py = payOf(s); Object.entries(py).forEach(([k, v]) => (o.pay[k] = (o.pay[k] || 0) + v)); o.tot += +s.sum || 0; o.n++; });
  ex.forEach((e) => { const o = row(e.date, e.branch as string); o.exp += expVal(e); });
  return Object.values(m).map((o) => ({ ...o, cash: o.pay["Наличные"] || 0, after: (o.pay["Наличные"] || 0) - o.exp, kassa: KASSA_POINTS.includes(o.p) }))
    .sort((a, b) => b.d.localeCompare(a.d) || points.indexOf(a.p) - points.indexOf(b.p));
}
/** блоки «по точкам»: строки точки или признак «нет продаж» (для Сергели и C1 — «в Billz нет ни одного чека») */
export function dayCashBlocks(rows: DayCashRow[], points: string[], F: Filter) {
  const all = points.concat([...new Set(rows.map((o) => o.p))].filter((p) => !points.includes(p)));
  const out: { pt: string; rows: DayCashRow[]; empty?: "billz" | "none"; kassa: boolean; tot: number; cash: number; exp: number; after: number; pay: Record<string, number> }[] = [];
  for (const pt of all) {
    const rs = rows.filter((o) => o.p === pt);
    const kassa = KASSA_POINTS.includes(pt);
    if (!rs.length) { if (F.point !== "all" && F.point !== pt) continue; out.push({ pt, rows: [], empty: pt === "Сергели" || pt === "C1" ? "billz" : "none", kassa, tot: 0, cash: 0, exp: 0, after: 0, pay: {} }); continue; }
    const T = (f: (o: DayCashRow) => number) => rs.reduce((x, o) => x + f(o), 0);
    const pay: Record<string, number> = {}; PAYS.forEach((p) => (pay[p] = T((o) => o.pay[p] || 0)));
    out.push({ pt, rows: rs, kassa, tot: T((o) => o.tot), cash: T((o) => o.cash), exp: T((o) => o.exp), after: T((o) => o.after), pay });
  }
  return out;
}

// ===================== статистика по периодам =====================
export type Group = "day" | "week" | "month";
export const periodKey = (s: string, g: Group) => (g === "day" ? s : g === "week" ? weekStart(s) : s.slice(0, 7));
export function periodLabel(k: string, g: Group) { if (g === "day") return dShort(k); if (g === "week") return dShort(k) + "–" + dShort(addD(k, 6)); const [y, m] = k.split("-"); return MONTHS[+m - 1] + " " + y; }
export function periodsIn(from: string, to: string, g: Group) { const out: string[] = []; if (!from || !to) return out; let d = from; const seen = new Set<string>(); let guard = 0; while (d <= to && guard++ < 1500) { const k = periodKey(d, g); if (!seen.has(k)) { seen.add(k); out.push(k); } d = addD(d, 1); } return out; }
export interface StF { from: string; to: string; wd: number[] }
export interface PRow { k: string; tot: number; n: number; ch: number; by: Record<string, number> }
export function statsOf(c: Ctx, F: Filter, list: SaleX[], g: Group, stF: StF) {
  const r = rangeOf(F, list, c.today);
  let from = stF.from, to = stF.to;
  if (!from || from < r.from || from > r.to) from = r.from;
  if (!to || to > r.to || to < r.from) to = r.to;
  const wd = new Set(stF.wd);
  const sl = list.filter((s) => s.date >= from && s.date <= to && !wd.has(wdIdx(s.date)));
  const keys = sl.length ? periodsIn(from, to, g).filter((k) => g !== "day" || !wd.has(wdIdx(k))) : [];
  const pts = c.settings.points.filter((p) => F.point === "all" || p === F.point);
  const byK: Record<string, { tot: number; n: number; ch: Set<string>; by: Record<string, number> }> = {};
  keys.forEach((k) => (byK[k] = { tot: 0, n: 0, ch: new Set(), by: {} }));
  sl.forEach((s) => { const k = periodKey(s.date, g); const o = byK[k] || (byK[k] = { tot: 0, n: 0, ch: new Set(), by: {} }); o.by[s.point] = (o.by[s.point] || 0) + (+s.sum || 0); o.tot += +s.sum || 0; o.n++; o.ch.add(checkKey(s)); });
  const ks = Object.keys(byK).sort();
  const rows: PRow[] = ks.map((k) => ({ k, tot: byK[k].tot, n: byK[k].n, ch: byK[k].ch.size, by: byK[k].by }));
  const sa = agg(sl);
  const ptTot: Record<string, number> = {}; pts.forEach((p) => (ptTot[p] = sl.filter((s) => s.point === p).reduce((x, s) => x + (+s.sum || 0), 0)));
  return { range: r, from, to, sl, pts, rows, asc: rows, desc: [...rows].reverse(), sa, ptTot };
}

// ===================== журнал по дням =====================
export function journalOf(c: Ctx, F: Filter, list: SaleX[], jDay: string) {
  const match = matchOf(F);
  const days = [...new Set(c.sales.filter(match).map((s) => s.date).filter(Boolean))].sort();
  const inP = [...new Set(list.map((s) => s.date))].sort();
  const day = jDay || (inP.length ? inP[inP.length - 1] : days.length ? days[days.length - 1] : c.today);
  const dayList = c.sales.filter((s) => s.date === day && match(s));
  const dex = c.exp.filter((e) => e.date === day && (F.point === "all" || e.branch === F.point));
  const base = DEF_POINTS.filter((p) => c.settings.points.includes(p));
  let pts = c.settings.points.filter((p) => base.includes(p) || dayList.some((s) => s.point === p));
  dayList.forEach((s) => { if (!pts.includes(s.point)) pts.push(s.point); });
  if (F.point !== "all") pts = pts.filter((p) => p === F.point);
  const tot = dayList.reduce((x, s) => x + (+s.sum || 0), 0);
  const prev = days.filter((x) => x < day).pop() || "", next = days.find((x) => x > day) || "";
  const cols = pts.map((pt) => {
    const it = dayList.filter((s) => s.point === pt).sort((x, y) => (!x.check ? 1 : 0) - (!y.check ? 1 : 0) || String(x.check || "").localeCompare(String(y.check || ""), undefined, { numeric: true }) || (x.createdAt || 0) - (y.createdAt || 0));
    const pay: Record<string, number> = {}; it.forEach((s) => Object.entries(payOf(s)).forEach(([k, v]) => (pay[k] = (pay[k] || 0) + v)));
    const sum = it.reduce((x, s) => x + (+s.sum || 0), 0), ex = dex.filter((e) => e.branch === pt).reduce((x, e) => x + expVal(e), 0);
    const groups: { c: string; items: SaleX[] }[] = []; const byCk: Record<string, { c: string; items: SaleX[] }> = {};
    it.forEach((s) => { const ck = String(s.check || "").trim(); if (ck) { if (!byCk[ck]) { byCk[ck] = { c: ck, items: [] }; groups.push(byCk[ck]); } byCk[ck].items.push(s); } else groups.push({ c: "", items: [s] }); });
    return { pt, items: it, pay, sum, ex, groups, kassa: KASSA_POINTS.includes(pt) };
  });
  return { day, days, dayList, dex, cols, tot, prev, next };
}

// ===================== календарь продаж =====================
export const calShort = (v: number) => { if (!v) return "—"; if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 1 : 2).replace(/\.?0+$/, "").replace(".", ",") + " млн"; return Math.round(v / 1e3) + " тыс"; };
export const calPay = (s: SaleX) => {
  const o = { c: 0, t: 0, q: 0, e: 0 };
  const add = (p: string, v: number) => { const k = p === "Наличные" ? "c" : p === "Терминал" ? "t" : p === "Перечисление" ? "e" : "q"; o[k] += v; };
  if (s.pay === "Смешанная" && s.pays) Object.entries(s.pays).forEach(([k, v]) => add(k, +v || 0)); else add(s.pay, +s.sum || 0);
  return o;
};
export const monthGen = (m: string) => MONTHS_F[+m.slice(5, 7) - 1].toLowerCase().replace(/ь$|й$/, "я").replace(/т$/, "та");

// план месяца (раздел «План»): нужен календарю
const plOff = (c: Ctx, d: string) => (c.plan.off || [0]).includes(pd(d).getDay());
export const plRev = (l: SaleX[]) => l.reduce((a, s) => a + (+s.sum || 0), 0);
const plDays = (m: string) => { const out: string[] = []; const e = +monthEnd(m).slice(8); for (let i = 1; i <= e; i++) out.push(m + "-" + pad(i)); return out; };
function plPrevShares(c: Ctx, m: string) {
  const d = pd(m + "-01"); d.setDate(0); const pm = iso(d).slice(0, 7);
  const by: Record<string, number> = {}; c.sales.filter((s) => (s.date || "").startsWith(pm)).forEach((s) => { by[s.point] = (by[s.point] || 0) + (+s.sum || 0); });
  const tot = Object.values(by).reduce((a, b) => a + b, 0); const out: Record<string, number> = {};
  c.settings.points.forEach((p) => { out[p] = tot ? Math.round((by[p] || 0) / tot * 1000) / 10 : 0; });
  return out;
}
export function plCalc(c: Ctx, m: string) {
  const cf = c.plan.months && c.plan.months[m]; const conf = cf ? { total: +(cf.total as number) || 0, shares: { ...(cf.shares || {}) } } : { total: 0, shares: {} as Record<string, number> };
  const days = plDays(m), today = c.today;
  const work = days.filter((d) => !plOff(c, d));
  const list = c.sales.filter((s) => (s.date || "").startsWith(m));
  const past = today > monthEnd(m), future = today < m + "-01";
  const done = work.filter((d) => d < today), left = work.filter((d) => d >= today);
  const fact = plRev(list), factBefore = plRev(list.filter((s) => s.date < today));
  const shares = { ...plPrevShares(c, m), ...conf.shares };
  return { c: conf, days, work, list, past, future, today, done, left, fact, factBefore, shares };
}
// прогноз остатка месяца: индекс дня недели × уровень продаж текущего месяца (как в разделе «План»)
function plFcast(c: Ctx, pt: string | null, done: string[], left: string[], factBefore: number) {
  const today = c.today, own = c.sales.filter((s) => s.date && (!pt || s.point === pt));
  let from = addD(today, -56); const first = own.reduce((m, s) => (!m || s.date < m ? s.date : m), ""); if (first > from) from = first;
  const byD: Record<string, SaleX[]> = {}; own.forEach((s) => { if (s.date >= from && s.date < today) (byD[s.date] = byD[s.date] || []).push(s); });
  const hist: { w: number; v: number }[] = []; for (let d = from; d && d < today; d = addD(d, 1)) { if (!plOff(c, d)) hist.push({ w: pd(d).getDay(), v: plRev(byD[d] || []) }); }
  const mean = hist.length ? hist.reduce((a, x) => a + x.v, 0) / hist.length : 0, idx: Record<number, number> = {};
  if (mean > 0) for (let w = 0; w < 7; w++) { const xs = hist.filter((x) => x.w === w); if (xs.length >= 2) idx[w] = xs.reduce((a, x) => a + x.v, 0) / xs.length / mean; }
  const ix = (d: string) => idx[pd(d).getDay()] || 1;
  const base = done.reduce((a, d) => a + ix(d), 0), lvlM = base ? factBefore / base : mean, k = Math.min(1, done.length / 12), lvl = mean > 0 ? k * lvlM + (1 - k) * mean : lvlM;
  const exp = left.map((d) => lvl * ix(d)), fc = factBefore + exp.reduce((a, b) => a + b, 0);
  const res = mean > 0 ? hist.map((x) => x.v / (mean * (idx[x.w] || 1)) - 1) : [], sd = res.length > 2 ? Math.sqrt(res.reduce((a, r) => a + r * r, 0) / (res.length - 1)) : 0;
  const band = 1.28 * sd * Math.sqrt(exp.reduce((a, e) => a + e * e, 0));
  return { fc, lo: Math.max(factBefore, fc - band), hi: fc + band };
}
export function plStats(c: Ctx, total: number, fact: number, factBefore: number, work: string[], done: string[], left: string[], past: boolean, pt: string | null) {
  const pace = done.length ? factBefore / done.length : 0, need = Math.max(0, total - fact);
  const needDay = past ? 0 : left.length ? need / left.length : need;
  const fx = past ? { fc: fact, lo: fact, hi: fact } : plFcast(c, pt, done, left, factBefore), forecast = fx.fc;
  return { pace, need, needDay, forecast, pct: total ? fact / total : 0, fpct: total ? forecast / total : 0 };
}

export interface CalDay { rev: number; pts: Record<string, number>; ck: number }
export function calOf(c: Ctx, F: Filter, calM: string, jDay: string) {
  const base = c.sales.filter(matchOf(F)), today = c.today;
  const months = [...new Set(base.map((s) => (s.date || "").slice(0, 7)).filter(Boolean).concat([today.slice(0, 7)]))].sort();
  let M = calM;
  if (!M || M < months[0] || M > months[months.length - 1]) M = (jDay || today).slice(0, 7);
  if (!months.includes(M)) M = months[months.length - 1];
  const list = base.filter((s) => (s.date || "").startsWith(M)), byD: Record<string, { rev: number; pts: Record<string, number>; ck: Set<string> }> = {};
  list.forEach((s) => { const o = byD[s.date] || (byD[s.date] = { rev: 0, pts: {}, ck: new Set() }); const v = +s.sum || 0; o.rev += v; o.pts[s.point] = (o.pts[s.point] || 0) + v; o.ck.add(checkKey(s)); });
  const vals = Object.values(byD).map((o) => o.rev), mx = Math.max(1, ...vals), best = Object.entries(byD).sort((a, b) => b[1].rev - a[1].rev)[0];
  const total = vals.reduce((a, b) => a + b, 0), wd = Object.keys(byD).length;
  let tgt = 0, P: null | { tot: number; fact: number; K: ReturnType<typeof plCalc>; S: ReturnType<typeof plStats> } = null; const byP: Record<string, number> = {};
  try {
    const K = plCalc(c, M), sh = F.point === "all" ? 1 : (K.shares[F.point] || 0) / 100, tot = K.c.total * sh;
    if (tot && K.work.length) {
      const pl_ = c.sales.filter((s) => (s.date || "").startsWith(M) && (F.point === "all" || s.point === F.point)); pl_.forEach((s) => (byP[s.date] = (byP[s.date] || 0) + (+s.sum || 0)));
      const fact = plRev(pl_), fb = plRev(pl_.filter((s) => s.date < K.today)); tgt = tot / K.work.length;
      P = { tot, fact, K, S: plStats(c, tot, fact, fb, K.work, K.done, K.left, K.past, F.point === "all" ? null : F.point) };
    }
  } catch { /* плана нет — календарь без него */ }
  return { M, months, base, byD, mx, best, total, wd, tgt, P, byP, list };
}
export function calDefaultSel(calM: string, byD: Record<string, unknown>, jDay: string) { return byD[jDay] && jDay.startsWith(calM) ? jDay : Object.keys(byD).sort().pop() || ""; }
export function calDayOf(c: Ctx, F: Filter, base: SaleX[], d: string) {
  const l = base.filter((s) => s.date === d), rev = l.reduce((a, s) => a + (+s.sum || 0), 0), ck = new Set(l.map(checkKey)).size;
  const pts: Record<string, number> = {}, pay = { c: 0, t: 0, q: 0, e: 0 }, prod: Record<string, number> = {};
  l.forEach((s) => { pts[s.point] = (pts[s.point] || 0) + (+s.sum || 0); const x = calPay(s); (Object.keys(pay) as (keyof typeof pay)[]).forEach((k) => (pay[k] += x[k])); const k = s.product || s.cat || "—"; prod[k] = (prod[k] || 0) + (+s.sum || 0); });
  const ex = c.exp.filter((e) => e.date === d && (F.point === "all" || e.branch === F.point)).reduce((a, e) => a + expVal(e), 0);
  return { rev, ck, pts, pay, prod, ex };
}

// ===================== выгрузка =====================
export const saleRow = (s: SaleX) => {
  const py = payOf(s); const r: Record<string, string | number> = { d: dLong(s.date), wd: WD[wdIdx(s.date)], p: s.point, ch: s.check || "", c: s.cat || "", pr: s.product || "", q: +(s.qty as number) || 0, pc: +(s.price as number) || 0, ds: discOf(s), sm: +s.sum || 0, src: s.photo ? "С файла" : "Вручную" };
  PAYS.forEach((p, i) => (r["y" + i] = py[p] || 0)); return r;
};
export const sortedFiltered = (c: Ctx, F: Filter) => [...filtered(c, F)].sort((x, y) => x.date.localeCompare(y.date) || c.settings.points.indexOf(x.point) - c.settings.points.indexOf(y.point) || String(x.check || "").localeCompare(String(y.check || ""), undefined, { numeric: true }) || (x.createdAt || 0) - (y.createdAt || 0));
export const periodTxt = (c: Ctx, F: Filter, today: string) => { const r = rangeOf(F, filtered(c, F), today); return `Период ${dLong(r.from)} — ${dLong(r.to)}` + (F.point !== "all" ? ` · ${F.point}` : "") + (F.cat !== "all" ? ` · ${F.cat}` : "") + ` · выгружено ${dLong(today).replace(/^(\d+)\.(\d+)\.(\d+)$/, "$1.$2.$3")}`; };
export const fname = (c: Ctx, F: Filter, pre: string, ext: string) => { const r = rangeOf(F, filtered(c, F), c.today); return `${pre}_${r.from}_${r.to}${F.point !== "all" ? "_" + F.point : ""}.${ext}`; };

export function csvOf(c: Ctx, F: Filter) {
  const list = sortedFiltered(c, F);
  const head = ["Дата", "День", "Точка", "Чек", "Категория", "Товар", "Кол-во", "Цена", "Скидка", "Оплачено"].concat(PAYS).concat(["Источник"]);
  const q = (v: unknown) => { const s = String(v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const rows = list.map(saleRow).map((r) => [r.d, r.wd, r.p, r.ch, r.c, r.pr, r.q, r.pc, r.ds, r.sm].concat(PAYS.map((_, i) => r["y" + i])).concat([r.src]));
  return { n: list.length, text: "﻿" + [head.join(";")].concat(rows.map((r) => r.map(q).join(";"))).join("\r\n") };
}

export interface Sheet { name: string; title: string; subtitle: string; head: string[]; rows: (string | number)[][]; total?: (string | number)[] }
function periodSheet(c: Ctx, F: Filter, g: Group, list: SaleX[]): Sheet {
  const m: Record<string, { tot: number; n: number; u: number; ch: Set<string>; by: Record<string, number> }> = {};
  list.forEach((s) => { const k = periodKey(s.date, g); const o = m[k] || (m[k] = { tot: 0, n: 0, u: 0, ch: new Set(), by: {} }); o.by[s.point] = (o.by[s.point] || 0) + (+s.sum || 0); o.tot += +s.sum || 0; o.n++; o.u += +(s.qty as number) || 0; o.ch.add(checkKey(s)); });
  const pts = c.settings.points;
  const keys = Object.keys(m).sort();
  const rows = keys.map((k) => ({ per: periodLabel(k, g) + (g === "day" ? " (" + WD[wdIdx(k)] + ")" : ""), by: pts.map((p) => m[k].by[p] || 0), tot: m[k].tot, ck: m[k].ch.size, u: m[k].u, avg: Math.round(m[k].tot / m[k].ch.size) }));
  const T = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
  const totCk = T((r) => r.ck), totSum = T((r) => r.tot);
  const nm = g === "day" ? "По дням" : g === "week" ? "По неделям" : "По месяцам";
  return { name: nm, title: "Выручка " + nm.toLowerCase(), subtitle: periodTxt(c, F, c.today),
    head: [g === "day" ? "День" : g === "week" ? "Неделя" : "Месяц", ...pts.map((p) => p + ", сум"), "Итого, сум", "Чеков", "Единиц", "Ср. чек, сум"],
    rows: rows.map((r) => [r.per, ...r.by, r.tot, r.ck, r.u, r.avg]),
    total: ["Итого", ...pts.map((_, i) => T((r) => r.by[i])), totSum, totCk, T((r) => r.u), totCk ? Math.round(totSum / totCk) : 0] };
}
/** листы Excel: те же, что на рабочем сайте */
export function sheetsOf(c: Ctx, F: Filter): Sheet[] {
  const list = sortedFiltered(c, F), rows = list.map(saleRow);
  const tot = rows.reduce((a, r) => a + (r.sm as number), 0);
  const ex = expFiltered(c, F), dc = dayCashRows(list, ex, c.settings.points).reverse();
  const T = (arr: Record<string, string | number>[], k: string) => arr.reduce((a, r) => a + (+r[k] || 0), 0);
  const gm: Record<string, { c: string; pr: string; u: number; r: number; n: number }> = {};
  list.forEach((s) => { const k = s.cat + "|" + s.product; const o = gm[k] || (gm[k] = { c: s.cat as string, pr: s.product as string, u: 0, r: 0, n: 0 }); o.u += +(s.qty as number) || 0; o.r += +s.sum || 0; o.n++; });
  const prod = Object.values(gm).sort((a, b) => b.r - a.r).map((o) => ({ ...o, avg: o.u ? Math.round(o.r / o.u) : 0 }));
  const dcRows = dc.map((o) => { const r: Record<string, string | number> = { d: dLong(o.d), p: o.p, tot: o.tot, e: o.exp, c: o.cash, a: o.after, k: o.kassa ? "в кассу" : "на точке" }; PAYS.forEach((p, i) => (r["y" + i] = o.pay[p] || 0)); return r; });
  const exRows = [...ex].sort((a, b) => (a.date || "").localeCompare(b.date || "")).map((e) => ({ d: dLong(e.date), p: e.branch as string, n: expTitle(e), a: expVal(e), k: KASSA_POINTS.includes(e.branch as string) ? "да" : "нет" }));
  const sub = periodTxt(c, F, c.today);
  return [
    { name: "Продажи", title: "Журнал продаж", subtitle: sub,
      head: ["Дата", "День", "Точка", "Чек", "Категория", "Товар", "Кол-во", "Цена, сум", "Скидка, сум", "Оплачено, сум", ...PAYS.map((p) => p + ", сум"), "Источник"],
      rows: rows.map((r) => [r.d, r.wd, r.p, r.ch, r.c, r.pr, r.q, r.pc, r.ds, r.sm, ...PAYS.map((_, i) => r["y" + i]), r.src]),
      total: ["Итого", "", "", "", "", "", T(rows, "q"), "", T(rows, "ds"), tot, ...PAYS.map((_, i) => T(rows, "y" + i)), ""] },
    { name: "Касса дня", title: "Касса дня по точкам", subtitle: sub + " · Б/Ч Премиума и Яшнабада идёт в кассу",
      head: ["Дата", "Точка", ...PAYS.map((p) => p + ", сум"), "Итого, сум", "Расходы дня, сум", "Б/Ч после расходов, сум", "Куда Б/Ч"],
      rows: dcRows.map((r) => [r.d, r.p, ...PAYS.map((_, i) => r["y" + i]), r.tot, r.e, r.a, r.k]),
      total: ["Итого", "", ...PAYS.map((_, i) => T(dcRows, "y" + i)), T(dcRows, "tot"), T(dcRows, "e"), T(dcRows, "a"), ""] },
    { name: "Расходы дня", title: "Расходы дня", subtitle: sub, head: ["Дата", "Точка", "Статья", "Сумма, сум", "В кассе"], rows: exRows.map((r) => [r.d, r.p, r.n, r.a, r.k]), total: ["Итого", "", "", exRows.reduce((a, r) => a + r.a, 0), ""] },
    periodSheet(c, F, "day", list), periodSheet(c, F, "week", list), periodSheet(c, F, "month", list),
    { name: "По товарам", title: "Продажи по товарам", subtitle: sub, head: ["Категория", "Товар", "Единиц", "Выручка, сум", "Позиций", "Ср. цена ед., сум"], rows: prod.map((o) => [o.c, o.pr, o.u, o.r, o.n, o.avg]), total: ["Итого", "", prod.reduce((a, o) => a + o.u, 0), tot, list.length, ""] },
  ];
}

// ===================== линзы (для фильтра раздела «Линзы») =====================
export const isContact = (s: SaleX) => /контакт/i.test(s.cat || "") || /контакт|к\/л|однодн|acuvue|air optix|biotrue|dailies/i.test(s.product || "");
export const isLens = (s: SaleX) => /очков.*линз|^линзы$/i.test(s.cat || "") && !isContact(s);
export function lensKind(s: SaleX) {
  const t = normS(s.product || "");
  if (/essilor|stellest/.test(t)) return "Essilor"; if (/seiko|сейко/.test(t)) return "Seiko"; if (/miyo|hoya/.test(t)) return "Miyosmart (Hoya)"; if (/тио|\btio\b/.test(t)) return "Тио";
  if (/прогресс|progress/.test(t)) return "Прогрессивные"; if (/бифок/.test(t)) return "Бифокальные"; if (/хамел|фотохр/.test(t)) return "Хамелеон";
  if (/1[.,]74/.test(t)) return "1.74"; if (/1[.,]67/.test(t)) return "1.67"; if (/4\s*в\s*1/.test(t)) return "4в1"; if (/блок|blue/.test(t)) return "Блок (блю-блок)";
  if (/star|\(стар\)|(^|[^а-я])стар([^а-я]|$)/.test(t)) return "Star"; if (/steel/.test(t)) return "Steel"; if (/(^|[^a-zа-я])et([^a-zа-я]|$)/.test(t)) return "ET";
  if (/для чтен/.test(t)) return "Для чтения"; if (/для зрен/.test(t)) return "Для зрения"; return "Тип не указан";
}
/** виды линз для выпадающего списка фильтра «Вид линзы» */
export function lensKindsIn(c: Ctx, F: Filter) {
  const ks: string[] = [...new Set(c.sales.filter((s) => isLens(s) && inRange(s, F.from, F.to) && (F.point === "all" || s.point === F.point)).map(lensKind))];
  ks.sort((a, b) => LKINDS.indexOf(a) - LKINDS.indexOf(b));
  if (F.lk !== "all" && !ks.includes(F.lk)) ks.push(F.lk);
  return ks;
}
