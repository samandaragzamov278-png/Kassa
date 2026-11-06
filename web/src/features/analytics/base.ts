// Фильтр периода, точки и категории и общие свёртки продаж (agg, rangeOf, prevList) — один в один с рабочим сайтом.
// Свой простой фильтр: когда появится общий (sales/filter.tsx), его значения просто подставляются в Flt.
import { checkKey, discOf, payOf, type Ctx, type S } from "./cost";
import { addD, daysBetween, monthEnd, today } from "./util";

export interface Flt { from: string; to: string; preset: string; point: string; cat: string; lk: string }

export function presetRange(p: string): { from: string; to: string } {
  const t = today();
  if (p === "today") return { from: t, to: t };
  if (p === "7d") return { from: addD(t, -6), to: t };
  if (p === "month") return { from: t.slice(0, 8) + "01", to: t };
  if (p === "prev") { const to = addD(t.slice(0, 8) + "01", -1); return { from: to.slice(0, 8) + "01", to }; }
  return { from: "", to: "" };
}
export const defaultFlt = (preset = "month"): Flt => ({ ...presetRange(preset), preset, point: "all", cat: "all", lk: "all" });
/** месяц целиком или «с 1-го по сегодня» — тогда в списке месяцев он выбран */
export function monthOf(F: Flt): string {
  return F.from && F.to && F.from.endsWith("-01") && F.from.slice(0, 7) === F.to.slice(0, 7) && (F.to === monthEnd(F.from.slice(0, 7)) || F.to === today()) ? F.from.slice(0, 7) : "";
}
export function monthRange(m: string): { from: string; to: string } {
  const from = m + "-01"; let to = monthEnd(m); if (to > today()) to = today(); return { from, to };
}

export const inRange = (s: { date: string }, from: string, to: string) => (!from || s.date >= from) && (!to || s.date <= to);
export const matchOf = (F: Flt) => (s: S) => (F.point === "all" || s.point === F.point) && (F.cat === "all" || s.cat === F.cat);
export const filtered = (c: Ctx, F: Flt) => { const m = matchOf(F); return c.sales.filter((s) => inRange(s, F.from, F.to) && m(s)); };
export const expFiltered = (c: Ctx, F: Flt) => c.dayExp.filter((e) => inRange(e, F.from, F.to) && (F.point === "all" || e.branch === F.point));

export function rangeOf(F: Flt, list: { date: string }[]) {
  let from = F.from, to = F.to;
  if (!from || !to) { const ds = list.map((s) => s.date).sort(); if (!from) from = ds[0] || today(); if (!to) to = ds[ds.length - 1] || today(); }
  return { from, to, days: Math.max(1, daysBetween(from, to)) };
}
export function prevList(c: Ctx, F: Flt) {
  if (!F.from || !F.to) return null;
  const n = daysBetween(F.from, F.to), pto = addD(F.from, -1), pfrom = addD(F.from, -n), m = matchOf(F);
  return { list: c.sales.filter((s) => inRange(s, pfrom, pto) && m(s)), from: pfrom, to: pto };
}
export interface Agg { rev: number; n: number; units: number; checks: number; avg: number; unitPrice: number; upc: number; disc: number; discN: number; cash: number }
export function agg(l: S[]): Agg {
  let rev = 0, units = 0, disc = 0, discN = 0, cash = 0; const ch = new Set<string>();
  l.forEach((s) => { rev += +s.sum || 0; units += +(s.qty || 0); const d = discOf(s); if (d > 0) { disc += d; discN++; } cash += +(payOf(s)["Наличные"] || 0); ch.add(checkKey(s)); });
  const checks = ch.size;
  return { rev, n: l.length, units, checks, avg: checks ? rev / checks : 0, unitPrice: units ? rev / units : 0, upc: checks ? units / checks : 0, disc, discN, cash };
}
export function dayList(r: { from: string; to: string }) { const out: string[] = []; let d = r.from, g = 0; while (d <= r.to && g++ < 1500) { out.push(d); d = addD(d, 1); } return out; }
export const periodTxt = (F: Flt, list: S[], extra = "") => {
  const r = rangeOf(F, list);
  return `Период ${r.from.slice(8, 10)}.${r.from.slice(5, 7)}.${r.from.slice(0, 4)} — ${r.to.slice(8, 10)}.${r.to.slice(5, 7)}.${r.to.slice(0, 4)}` + (F.point !== "all" ? ` · ${F.point}` : "") + (F.cat !== "all" ? ` · ${F.cat}` : "") + extra;
};

// ===== цвета =====
const PCOL = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
export const pointColor = (points: string[], p: string) => { const i = points.indexOf(p); return PCOL[(i < 0 ? points.length : i) % PCOL.length]; };
export const PAYCOL: Record<string, string> = { "Наличные": "var(--chart-3)", "Терминал": "var(--chart-1)", "QR/Payme": "var(--chart-2)", "Перечисление": "var(--chart-4)" };
export const CATCOL = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-2)", "var(--chart-5)",
  "color-mix(in srgb, var(--chart-1) 55%, var(--foreground))", "color-mix(in srgb, var(--chart-3) 55%, var(--foreground))", "color-mix(in srgb, var(--chart-4) 55%, var(--foreground))"];

/** плитка показателя: подпись, значение, пояснение под ним; id — номер показателя из списка */
export interface Card { id: number; label: string; v: string; d: string; main?: boolean; warn?: boolean; spark?: { vals: number[]; color?: string }; ring?: { p: number; color?: string } }
export interface Bar { label: string; value: number; valTxt?: string; color?: string; sub?: string }
