// Расчёты раздела «Платежи» — перенос один в один из dev/pay/pay.js рабочего сайта.
// Чистые функции: на вход данные и «сегодня», на выход строки месяца и долги.
import type { Data, PayItem, PayMark } from "../../lib/types";

export const MN = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
export const MNg = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
export const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
export const CATS: Record<string, string> = { credit: "Кредит", rent: "Аренда", tax: "Налоги", salary: "Зарплаты", service: "Сервисы", utility: "Коммунальные", debt: "Долги", other: "Прочее" };
export const SRC: Record<string, string> = { bank: "Р/с", cash: "Касса", founder: "Учредитель" };
export const KINDS: [PayItem["kind"], string][] = [["fixed", "Постоянный"], ["plan", "Разовый"], ["debt", "Долг"]];

export const todayTash = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
export const addM = (m: string, n: number) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 7);
export const dim = (m: string) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
export const dDiff = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
export const wd = (d: string) => WD[new Date(d + "T12:00:00Z").getUTCDay()];
export const dLong = (d: string) => +d.slice(8) + " " + MNg[+d.slice(5, 7) - 1];
export const mName = (m: string) => MN[+m.slice(5, 7) - 1] + " " + m.slice(0, 4);
export const fmt = (n: number) => (n < 0 ? "−" : "") + Math.round(Math.abs(+n || 0)).toLocaleString("ru-RU").replace(/[\s  ,]/g, " ");
export const num = (v: unknown): number | null => { if (v == null) return null; const t = String(v).replace(/[\s  ]/g, "").replace(/[−–]/g, "-").replace(/,/g, ".").replace(/[^\d.-]/g, ""); if (!t || t === "-") return null; const x = parseFloat(t); return isFinite(x) ? x : null; };
export const pl = (n: number, a: string, b: string, c: string) => { n = Math.abs(n) % 100; const d = n % 10; return n > 10 && n < 20 ? c : d === 1 ? a : d >= 2 && d <= 4 ? b : c; };

export type Status = "ok" | "part" | "late" | "today" | "soon";
export interface Amount { a: number; est?: boolean; base?: number; usd?: number; own?: boolean }
export interface Hit { d: string; n: string; a: number; f: string }
export interface MonthRow { it: PayItem; due: string; am: Amount; hits: Hit[]; mk: PayMark | null; auto: number; man: number; paid: number; left: number; st: Status }

export const isOn = (it: PayItem) => it.on !== false;
const inRange = (it: PayItem, M: string) => (!it.from || M >= it.from) && (!it.to || M <= it.to);
export const list = (d: Data) => Object.values(d.items).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
export const markOf = (d: Data, it: PayItem, M: string) => d.marks[it.id + "_" + M] || null;

/** безнал месяца по Кассе — база налога с оборота (наличные не облагаются) */
export function cashless(d: Data, M: string) {
  let t = 0;
  for (const s of d.sales) {
    if (!s.date || !s.date.startsWith(M)) continue;
    if (s.pay === "Смешанная" && s.pays && typeof s.pays === "object") Object.entries(s.pays).forEach(([k, v]) => { if (k !== "Наличные") t += +v || 0; });
    else if (s.pay && s.pay !== "Наличные") t += +s.sum || 0;
  }
  return t;
}
const rateOf = (it: PayItem) => +(it.rate || 0);
export function baseAmount(d: Data, it: PayItem, M: string): Amount {
  if (it.auto === "tax") { const base = cashless(d, addM(M, -1)); return { a: Math.round(base * (+(it.pct || 0)) / 100), est: true, base }; }
  if (+(it.usd || 0) > 0) return { a: Math.round(+(it.usd || 0) * rateOf(it)), usd: +(it.usd || 0) };
  return { a: Math.round(+(it.amount || 0)) };
}
/** сумма за месяц: своя сумма на месяц важнее общей */
export function amountOf(d: Data, it: PayItem, M: string): Amount {
  const b = baseAmount(d, it, M), mk = markOf(d, it, M);
  if (mk && mk.plan != null) return { ...b, a: Math.round(+mk.plan || 0), own: true, est: false };
  return b;
}
export function dueOf(it: PayItem, M: string): string | null {
  if (!isOn(it)) return null;
  if (it.kind === "plan") return it.date && it.date.startsWith(M) ? it.date : null;
  if (!inRange(it, M)) return null;
  if (it.kind === "debt" && !(+(it.amount || 0) > 0 || +(it.usd || 0) > 0)) return null;
  if (it.freq === "year" && +(it.mon || 0) !== +M.slice(5, 7)) return null;
  const day = Math.min(Math.max(1, +(it.day || 1)), dim(M));
  return M + "-" + String(day).padStart(2, "0");
}
export const words = (it: PayItem) => String(it.match || "").split(/[,;|]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
/** где нашлась оплата: выписка р/с и расходы Кассы месяца (слово с минусом исключает) */
export function hitsOf(d: Data, it: PayItem, M: string): Hit[] {
  const all = words(it), w = all.filter((x) => x[0] !== "-"), no = all.filter((x) => x[0] === "-").map((x) => x.slice(1).trim()).filter(Boolean);
  if (!w.length) return [];
  const has = (n: string) => { n = String(n || "").toLowerCase(); return w.some((x) => n.includes(x)) && !no.some((x) => n.includes(x)); };
  const out: Hit[] = [];
  if (it.src !== "cash") Object.keys(d.report).forEach((day) => { if (!day.startsWith(M)) return; (d.report[day].bank || []).forEach((b) => { if (has(b.n)) out.push({ d: day, n: b.n, a: +b.a || 0, f: "р/с" }); }); });
  if (it.src !== "bank") d.entries.forEach((e) => {
    if (e.type !== "exp" || e.kind === "bc" || !e.date || !e.date.startsWith(M)) return; if (!has(e.name)) return;
    out.push({ d: e.date, n: e.name, a: typeof e.fact === "number" ? e.fact : +(e.amount || 0), f: e.fund === "reserve" ? "резерв" : "касса" });
  });
  return out.sort((a, b) => a.d.localeCompare(b.d));
}
export function row(d: Data, it: PayItem, M: string, T = todayTash()): MonthRow | null {
  const due = dueOf(it, M); if (!due) return null;
  const am = amountOf(d, it, M), hits = hitsOf(d, it, M), mk = markOf(d, it, M);
  const auto = hits.reduce((s, h) => s + h.a, 0), man = mk && mk.amount != null ? +mk.amount || 0 : 0, paid = auto + man;
  const left = Math.max(0, am.a - paid);
  let st: Status;
  if ((am.a > 0 && paid >= am.a * 0.98) || (!am.a && paid > 0)) st = "ok"; else if (paid > 0) st = "part"; else if (due < T) st = "late"; else if (due === T) st = "today"; else st = "soon";
  return { it, due, am, hits, mk, auto, man, paid, left, st };
}
export const monthRows = (d: Data, M: string, T = todayTash()) => list(d).map((it) => row(d, it, M, T)).filter((r): r is MonthRow => !!r).sort((a, b) => a.due.localeCompare(b.due) || b.am.a - a.am.a);
export function debtOf(d: Data, it: PayItem, T = todayTash()) {
  const total = +(it.totalUsd || 0) > 0 ? Math.round(+(it.totalUsd || 0) * (rateOf(it) || 0)) : +(it.total || 0);
  let paid = +(it.paid0 || 0); (it.pays || []).forEach((p) => (paid += +p.amount || 0));
  const first = it.from || "2026-01", last = T.slice(0, 7);
  for (let M = first; M <= last; M = addM(M, 1)) { hitsOf(d, it, M).forEach((h) => (paid += h.a)); const mk = markOf(d, it, M); if (mk && mk.amount != null) paid += +mk.amount || 0; }
  return { total, paid, left: total ? Math.max(0, total - paid) : null, pct: total ? Math.min(1, paid / total) : null };
}
/** итоги месяца для плиток */
export function totals(rows: MonthRow[]) {
  const tot = rows.reduce((s, r) => s + r.am.a, 0), paid = rows.reduce((s, r) => s + Math.min(r.paid, r.am.a || r.paid), 0), left = rows.reduce((s, r) => s + r.left, 0);
  return { tot, paid, left, okN: rows.filter((r) => r.st === "ok").length, late: rows.filter((r) => r.st === "late").length };
}
