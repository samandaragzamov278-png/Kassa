// Расчёты «Остатки Billz» и «Перемещения» — перенос один в один из dev/bz/bz.js (stockData, movements, renderStock, renderTransfers).
// Только чтение из таблиц bz_stock, bz_product, bz_transfer, bz_check.
import { bzSelect, client, isDemo } from "../../lib/source";
import { isRet, loadChecks, type BzCheck } from "../recon/logic";

export { fmt, pl } from "../pay/logic";
export { dS, dL, hm, dtm, fq, sgq, sgn, periodOf, PER, today, addD } from "../recon/logic";

export const PLACES = ["Склад", "Сергели", "C1"];
export const AUTO = new Set(["Сергели"]); // точки, чьи продажи Касса берёт из Billz сама

export interface StockRow { d: string; point: string; sku: string; q: number; at?: string }
export interface Product { sku: string; name?: string; cat?: string; prices?: Record<string, number>; cp?: number }
export interface TrItem { n: string; sku: string; sent?: number; arr?: number; price?: number }
export interface Transfer {
  id: string; num: string | number; name?: string; created?: string; accepted?: string | null; d: string; from_point: string; to_point: string;
  status: string; sent?: number; arrived?: number; retail?: number; items?: TrItem[]; by_name?: string;
}
export interface StockDate { d: string; at: string }

export async function loadStockDates(): Promise<StockDate[]> {
  if (!isDemo) {
    const { data, error } = await client().rpc("bz_stock_dates");
    if (!error && data) return (data as { d: string; at: string }[]).map((r) => ({ d: r.d, at: r.at }));
  }
  const rows = (await bzSelect<StockRow>("bz_stock", (q) => q.select("d,at").eq("point", "Склад").order("d"))).filter((r) => r.point === "Склад");
  const m = new Map<string, string>(); rows.forEach((r) => { if (!m.has(r.d)) m.set(r.d, r.at || ""); });
  return [...m].map(([d, at]) => ({ d, at })).sort((a, b) => a.d.localeCompare(b.d));
}
export const loadStock = async (d: string) => (await bzSelect<StockRow>("bz_stock", (q) => q.eq("d", d))).filter((r) => r.d === d);
export const loadProducts = async () => { const m = new Map<string, Product>(); (await bzSelect<Product>("bz_product")).forEach((p) => m.set(p.sku, p)); return m; };
export const loadTransfers = async () => (await bzSelect<Transfer>("bz_transfer", (q) => q.order("created", { ascending: false }))).slice().sort((a, b) => String(b.created || "").localeCompare(String(a.created || "")));

export interface StockData { dates: StockDate[]; cur: StockDate; cmp: StockDate | null; rows: StockRow[]; prods: Map<string, Product>; prevRows: StockRow[]; trs: Transfer[]; checks: BzCheck[] }
/** выгрузка на дату d, сравнение — с cmpD или с предыдущей выгрузкой */
export async function stockData(d: string, cmpD: string): Promise<{ D: StockData | null; d: string; cmp: string }> {
  const dates = await loadStockDates(); if (!dates.length) return { D: null, d, cmp: cmpD };
  if (!d || !dates.find((x) => x.d === d)) d = dates[dates.length - 1].d;
  const i = dates.findIndex((x) => x.d === d), prev = i > 0 ? dates[i - 1] : null;
  if (cmpD && !dates.find((x) => x.d === cmpD && x.d < d)) cmpD = "";
  const cmp = cmpD ? dates.find((x) => x.d === cmpD) || null : prev, cur = dates[i];
  const [rows, prods, prevRows, trs] = await Promise.all([loadStock(cur.d), loadProducts(), cmp ? loadStock(cmp.d) : Promise.resolve([] as StockRow[]), loadTransfers()]);
  const checks = cmp ? await loadChecks(cmp.d, cur.d) : [];
  return { D: { dates, cur, cmp, rows, prods, prevRows, trs, checks }, d, cmp: cmpD };
}

export interface Mv { sold: number; tin: number; tout: number }
/** движение между снимками: продано по чекам Billz, пришло/ушло по перемещениям */
export function movements(D: StockData) {
  const mv = new Map<string, Mv>(), g = (p: string, s: string) => { const k = p + "|" + s; let o = mv.get(k); if (!o) mv.set(k, (o = { sold: 0, tin: 0, tout: 0 })); return o; };
  if (!D.cmp) return mv;
  const a = Date.parse(D.cmp.at) || 0, b = Date.parse(D.cur.at) || Infinity;
  D.checks.forEach((c) => { const t = Date.parse(c.t) || 0; if (t <= a || t > b) return; const sign = isRet(c.type) ? -1 : 1; (c.items || []).forEach((i) => { if (i.ret && !isRet(c.type)) return; g(c.point, i.sku).sold += sign * ((+(i.q || 0)) || (+(i.rq || 0))); }); });
  D.trs.forEach((tr) => {
    const ts = Date.parse(tr.created || "") || 0, ta = Date.parse(tr.accepted || "") || 0;
    (tr.items || []).forEach((i) => { if (tr.status !== "черновик" && ts > a && ts <= b) g(tr.from_point, i.sku).tout += +(i.sent || 0); if (ta && ta > a && ta <= b) g(tr.to_point, i.sku).tin += +(i.arr || 0); });
  });
  return mv;
}

export interface Line { p: string; s: string; n: string; c: string; price: number; cp: number; now: number; was: number | null; delta: number | null; sold: number; tin: number; tout: number; un: number | null }
export function stockLines(D: StockData): Line[] {
  const mv = movements(D), pm = new Map<string, number>(), cm = new Map<string, number>();
  D.prevRows.forEach((r) => pm.set(r.point + "|" + r.sku, +r.q)); D.rows.forEach((r) => cm.set(r.point + "|" + r.sku, +r.q));
  const keys = new Set([...cm.keys(), ...pm.keys(), ...mv.keys()]), lines: Line[] = [];
  keys.forEach((k) => {
    const i = k.indexOf("|"), p = k.slice(0, i), s = k.slice(i + 1), now = cm.get(k) || 0, was = D.cmp ? pm.get(k) || 0 : null, m = mv.get(k) || { sold: 0, tin: 0, tout: 0 }, pr = D.prods.get(s) || ({} as Product);
    const delta = was == null ? null : now - was, exp = was == null ? null : was - m.sold + m.tin - m.tout, un = exp == null ? null : now - exp;
    lines.push({ p, s, n: pr.name || s, c: pr.cat || "", price: (pr.prices && pr.prices[p]) || 0, cp: +(pr.cp || 0), now, was, delta, sold: m.sold, tin: m.tin, tout: m.tout, un });
  });
  return lines;
}
export const hasUn = (l: Line) => !!l.un && Math.abs(l.un) > 0.001;
export const sumBy = (a: Line[], f: (l: Line) => number | null | undefined) => a.reduce((x, l) => x + (f(l) || 0), 0);
export interface PlaceRow { p: string; pos: number; q: number; v: number; d: number; s: number; i: number; o: number; u: number; un: number }
export const placeRows = (lines: Line[], cat: string): PlaceRow[] => PLACES.map((p) => {
  const a = lines.filter((l) => l.p === p && (cat === "all" || l.c === cat));
  return { p, pos: a.filter((l) => l.now).length, q: sumBy(a, (l) => l.now), v: sumBy(a, (l) => l.now * l.price), d: sumBy(a, (l) => l.delta), s: sumBy(a, (l) => l.sold), i: sumBy(a, (l) => l.tin), o: sumBy(a, (l) => l.tout), u: sumBy(a, (l) => l.un), un: a.filter(hasUn).length };
});
/** строки таблицы «Товары»: сначала с расхождением, затем с движением */
export function sortItems(L: Line[], only: boolean) {
  const it = L.filter((l) => !only || l.delta || l.sold || l.tin || l.tout || hasUn(l));
  it.sort((a, b) => Number(hasUn(b)) - Number(hasUn(a)) || Math.abs(b.delta || 0) - Math.abs(a.delta || 0) || b.now - a.now || a.n.localeCompare(b.n));
  return it;
}
