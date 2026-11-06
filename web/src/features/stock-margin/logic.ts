// Расчёты «Склада»: маржа (marginData), склад из файла (stockSold, список), новая партия (batchStats, reorderList) и разбор файлов Excel.
// Перенос один в один из dev/base.html.
import { NODET, unitPrice, type BItem, type Batch, type Ctx, type S } from "../analytics/cost";
import { filtered, type Card, type Flt } from "../analytics/base";
import { addD, daysBetween, dLong, dShort, fmt, fmtM, normS, pctF, pl, reEsc, sum, today } from "../analytics/util";

// ---------- какая партия выбрана (общая для Склада и Аналитики, как на рабочем сайте) ----------
let bSelId: string | null = null;
export const getBatchSel = () => bSelId;
export const setBatchSel = (id: string | null) => { bSelId = id; };
export function curBatch(c: Ctx): Batch | null {
  const s = [...c.batches].sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0));
  return s.find((b) => b.id === bSelId) || s[0] || null;
}
export const itemLabel = (it: BItem) => [it.m || it.n || it.s, it.col].filter(Boolean).join(" · ");

// ---------- новая партия ----------
export interface BStat extends BItem { sold: number; rev: number; byPt: Record<string, number>; last: string; pSold: number; pRev: number; pByPt: Record<string, number>; left: number; pct: number }
export function batchStats(c: Ctx, b: Batch, ptFilter: string, pf?: string, pt?: string) {
  const items = (b.items || []).map((it) => Object.assign({}, it, { sold: 0, rev: 0, byPt: {} as Record<string, number>, last: "", pSold: 0, pRev: 0, pByPt: {} as Record<string, number> })) as BStat[];
  const byKey: Record<string, number> = {}; items.forEach((it, i) => { if (it.k != null) byKey[it.k] = i; });
  const res: { i: number; len: number; re: RegExp }[] = [];
  items.forEach((it, i) => { [it.m, it.s, it.n].forEach((v) => { const t = normS(v); if (t.length >= 3) res.push({ i, len: t.length, re: new RegExp("(^|[^a-zа-я0-9])" + reEsc(t) + "($|[^a-zа-я0-9])", "i") }); }); });
  res.sort((x, y) => y.len - x.len);
  const used: S[] = [], byDay: Record<string, number> = {};
  c.sales.forEach((s) => {
    if (b.date && s.date < b.date) return;
    if (ptFilter !== "all" && s.point !== ptFilter) return;
    let idx = s.batchKey && s.batchId === b.id && byKey[s.batchKey] != null ? byKey[s.batchKey] : -1;
    if (idx < 0) { const p = normS(s.product); for (const r of res) { if (r.re.test(p)) { idx = r.i; break; } } }
    if (idx < 0) return;
    const it = items[idx], q = +(s.qty || 0);
    if ((!pf || s.date >= pf) && (!pt || s.date <= pt)) { it.pSold += q; it.pRev += +s.sum || 0; it.pByPt[s.point] = (it.pByPt[s.point] || 0) + q; }
    it.sold += q; it.rev += +s.sum || 0; it.byPt[s.point] = (it.byPt[s.point] || 0) + q; if (s.date > it.last) it.last = s.date; used.push(s); byDay[s.date] = (byDay[s.date] || 0) + q;
  });
  items.forEach((it) => { it.q = +it.q || 0; it.left = Math.max(0, it.q - it.sold); it.pct = it.q ? Math.min(1, it.sold / it.q) : 0; });
  return { items, used, byDay };
}
export const reorderList = (items: BStat[]) => items.filter((i) => i.sold > 0 && (i.left === 0 || i.left / i.q <= 0.2)).sort((x, y) => x.left - y.left || y.sold - x.sold);

export type BatchView = ReturnType<typeof batchView>;
/** вкладка «Проданные из новой партии»: итоги и плитки (renderBatch) */
export function batchView(c: Ctx, b: Batch, bPt: string) {
  const { items, used, byDay } = batchStats(c, b, bPt);
  const Q = sum(items, (i) => i.q), S = sum(items, (i) => i.sold), R = sum(items, (i) => i.rev), L = sum(items, (i) => i.left), SC = Q - L;
  const withCost = items.filter((i) => +(i.cp || 0) > 0 && i.sold), cogs = sum(withCost, (i) => i.sold * (i.cp as number)), revC = sum(withCost, (i) => i.rev);
  const t = today(), start = b.date || t, days = Math.max(1, daysBetween(start, t));
  const rate = S / days, fc = rate > 0 && L > 0 ? Math.ceil(L / rate) : null;
  const valueLeft = sum(items, (i) => i.left * (+(i.p || 0)));
  const totalSince = sum(c.sales.filter((s) => s.date >= start && (bPt === "all" || s.point === bPt)), (s) => +s.sum || 0);
  const unsold = items.filter((i) => !i.sold).length, ro = reorderList(items);
  const cards: Card[] = [
    { id: 48, label: "Продано из партии", v: fmt(S) + " шт", d: `из ${fmt(Q)} шт` + (S > SC ? ` · ${fmt(S - SC)} шт сверх прихода: проверьте названия` : ""), ring: { p: Q ? SC / Q : 0 }, main: true },
    { id: 49, label: "Осталось", v: fmt(L) + " шт", d: valueLeft ? `на ${fmt(valueLeft)} сум по цене продажи` : "" },
    { id: 52, label: "Темп продаж", v: (rate >= 10 ? fmt(rate) : rate.toFixed(1).replace(".", ",")) + " шт/день", d: `за ${days} ${pl(days, "день", "дня", "дней")} с прихода` },
    { id: 53, label: "Прогноз распродажи", v: L === 0 ? "распродано" : fc != null ? `~${fmt(fc)} дн.` : "—", d: L === 0 ? "остатка нет" : fc != null ? `остаток уйдёт примерно к ${dLong(addD(t, fc))}` : "пока нет продаж" },
    { id: 54, label: "Без единой продажи", v: fmt(unsold) + " " + pl(unsold, "модель", "модели", "моделей"), d: `${pctF(items.length ? unsold / items.length : 0)} позиций партии` },
    { id: 55, label: "На дозаказ", v: fmt(ro.length) + " " + pl(ro.length, "модель", "модели", "моделей"), d: "закончились или осталось ≤20%" },
    { id: 56, label: "Выручка с партии", v: fmt(R) + " сум", d: revC ? `маржа ${pctF((revC - cogs) / revC)} · прибыль ${fmt(revC - cogs)}` : "нет цен покупки в списке" },
    { id: 57, label: "Доля партии в продажах", v: pctF(totalSince ? R / totalSince : 0), d: `от всей выручки с ${dShort(start)}` },
  ];
  const info = `${b.name || "Партия"}: ${fmt(items.length)} позиций, ${fmt(Q)} шт, приход ${dLong(b.date)}. Найдено продаж из партии: ${used.length}` + (bPt !== "all" ? ` (${bPt})` : "") + ".";
  return { items, used, byDay, Q, S, R, L, SC, cogs, revC, days, rate, fc, valueLeft, totalSince, unsold, ro, start, today: t, cards, info };
}
/** график «остаток и прогноз»: подписи и два ряда (null — разрыв) */
export function batchRest(v: BatchView) {
  const dl: string[] = []; let d = v.start, g = 0; while (d <= v.today && g++ < 400) { dl.push(d); d = addD(d, 1); }
  let cum = 0; const cumV = dl.map((x) => (cum += v.byDay[x] || 0));
  const restV = cumV.map((x) => Math.max(0, v.Q - x)); let lbl = dl.map(dShort), proj: (number | null)[] | null = null;
  if (v.rate > 0 && v.L > 0) {
    const ext = Math.min(v.fc as number, 180), step = Math.max(1, Math.ceil(ext / 30)); const pl2: string[] = [], pv2: number[] = [];
    for (let k = step; k <= ext + step - 1; k += step) { pl2.push(dShort(addD(v.today, Math.min(k, ext)))); pv2.push(Math.max(0, v.L - v.rate * Math.min(k, ext))); }
    lbl = lbl.concat(pl2); proj = restV.map(() => null); proj[proj.length - 1] = v.L; proj = proj.concat(pv2);
  }
  const rest: (number | null)[] = restV.concat(proj ? new Array(lbl.length - restV.length).fill(null) : []);
  return { days: dl, labels: lbl, rest, proj };
}

// ---------- маржа ----------
export interface MGroup { k: string; rev: number; revC: number; cogs: number; n: number; u: number; uC: number; cp?: number; gp: number; mg: number | null; cov: number }
export function mGroup(c: Ctx, list: S[], keyFn: (s: S) => string): MGroup[] {
  const m: Record<string, MGroup> = {};
  list.forEach((s) => {
    const k = keyFn(s); const o = m[k] || (m[k] = { k, rev: 0, revC: 0, cogs: 0, n: 0, u: 0, uC: 0, gp: 0, mg: null, cov: 0 });
    const sm = +s.sum || 0, q = +(s.qty || 0); o.rev += sm; o.n++; o.u += q; const cc = c.costOf(s); if (cc) { o.revC += sm; o.cogs += cc * q; o.uC += q; o.cp = cc; }
  });
  return Object.values(m).map((o) => Object.assign(o, { gp: o.revC - o.cogs, mg: o.revC ? (o.revC - o.cogs) / o.revC : null, cov: o.rev ? o.revC / o.rev : 0 }));
}
export function marginData(c: Ctx, F: Flt) {
  const all = filtered(c, F), list = all.filter((s) => s.cat !== NODET && s.cat !== "Погашения долгов");
  const tot = mGroup(c, list, () => "all")[0] || { k: "all", rev: 0, revC: 0, cogs: 0, gp: 0, mg: null, cov: 0, n: 0, u: 0, uC: 0 };
  const pts = mGroup(c, list, (s) => s.point);
  const ptsOrd = c.points.map((p) => pts.find((o) => o.k === p)).filter(Boolean).concat(pts.filter((o) => !c.points.includes(o.k))) as MGroup[];
  const cats = mGroup(c, list, (s) => s.cat || "Без категории").sort((a, b) => b.gp - a.gp || b.rev - a.rev);
  const prods = mGroup(c, list.filter((s) => c.costOf(s)), (s) => s.product || "");
  const miss = mGroup(c, list.filter((s) => !c.costOf(s)), (s) => s.product || "").sort((a, b) => b.rev - a.rev);
  const nodet = sum(all.filter((s) => s.cat === NODET || s.cat === "Погашения долгов"), (s) => +s.sum || 0);
  return { tot, pts: ptsOrd, cats, prods, miss, nodet };
}
export const hasCosts = (c: Ctx) => c.stockItems.some((i) => +(i.cp || 0) > 0) || c.batches.some((b) => (b.items || []).some((i) => +(i.cp || 0) > 0));

// ---------- склад из файла ----------
export const PLACE_ORDER = ["Склад", "Премиум", "Яшнабад", "Сергели", "C1"];
export const placesOf = (items: BItem[]) => [...new Set(items.map((i) => i.pt || "Без места"))].sort((a, b) => (PLACE_ORDER.indexOf(a) + 1 || 99) - (PLACE_ORDER.indexOf(b) + 1 || 99));
export function stockSold(c: Ctx) {
  const meta = c.stockMeta, m = new Map<BItem, number>(); if (!meta) return m;
  const from = meta.soldFrom || meta.date;
  c.sales.forEach((s) => { if (from && s.date < from) return; const r = c.matcher(s.product || "", unitPrice(s), s.point); if (r && r.b === null) m.set(r.it, (m.get(r.it) || 0) + (+(s.qty || 0))); });
  return m;
}
export function stockView(c: Ctx, place: string) {
  const all = c.stockItems, meta = c.stockMeta!;
  const places = placesOf(all), src = meta.src || {}, from = meta.soldFrom || meta.date || "";
  const sold = stockSold(c);
  const items = place === "all" ? all : all.filter((i) => (i.pt || "Без места") === place);
  const q = (i: BItem) => +i.q || 0;
  const Q = sum(items, q), vC = sum(items, (i) => q(i) * (+(i.cp || 0))), vP = sum(items, (i) => q(i) * (+(i.p || 0))), soldQ = sum(items, (i) => sold.get(i) || 0);
  const pr = places.map((p) => { const it = all.filter((i) => (i.pt || "Без места") === p); const cc = sum(it, (i) => q(i) * (+(i.cp || 0))), v = sum(it, (i) => q(i) * (+(i.p || 0))), n = sum(it, q), s = sum(it, (i) => sold.get(i) || 0); return { p, src: src[p] || "", pos: it.length, n, c: cc, v, mk: cc ? (v - cc) / cc : null, s }; });
  const QA = sum(all, q);
  const cats = [...new Set(all.map((i) => i.c || "Без категории"))].sort();
  const cell = (cat: string, p?: string) => sum(all.filter((i) => (i.c || "Без категории") === cat && (!p || (i.pt || "Без места") === p)), q);
  const gm: Record<string, { k: string; n: number; q: number; vc: number; vp: number; s: number }> = {};
  items.forEach((i) => { const k = i.g || i.c || "Без группы"; const o = gm[k] || (gm[k] = { k, n: 0, q: 0, vc: 0, vp: 0, s: 0 }); o.n++; o.q += q(i); o.vc += q(i) * (+(i.cp || 0)); o.vp += q(i) * (+(i.p || 0)); o.s += sold.get(i) || 0; });
  const groups = Object.values(gm).sort((a, b) => b.vc - a.vc || b.q - a.q);
  const sorted = [...items].sort((a, b) => (sold.get(b) || 0) - (sold.get(a) || 0) || (PLACE_ORDER.indexOf(a.pt || "") - PLACE_ORDER.indexOf(b.pt || "")) || String(a.g || "").localeCompare(String(b.g || "")) || String(a.m || a.n || "").localeCompare(String(b.m || b.n || ""), undefined, { numeric: true }));
  const cards: Card[] = [
    { id: 0, label: place === "all" ? "Товаров всего" : "Товаров: " + place, v: fmt(Q) + " шт", d: `${fmt(items.length)} позиций по файлу`, main: true },
    { id: 0, label: "Сумма закупки", v: fmt(vC) + " сум", d: items.some((i) => !+(i.cp || 0)) ? `без цены покупки: ${items.filter((i) => !+(i.cp || 0)).length} поз.` : "у всех есть цена покупки" },
    { id: 0, label: "Сумма продажи", v: fmt(vP) + " сум", d: vC && vP ? `наценка ${pctF((vP - vC) / vC)} · маржа ${pctF((vP - vC) / vP)}` : "" },
    { id: 0, label: `Продано с ${dShort(from)}`, v: fmt(soldQ) + " шт", d: `примерно сейчас: ${fmt(Q - soldQ)} шт` },
  ];
  return { places, src, from, sold, items, sorted, Q, vC, vP, soldQ, pr, QA, cats, cell, groups, cards, meta, all };
}
export const stockSearch = (items: BItem[], qy: string) => { const q = normS(qy); return items.filter((i) => !q || normS([i.m, i.n, i.s, i.g, i.c, i.col, i.pt].join(" ")).includes(q)); };
export const batchSearch = (items: BStat[], qy: string, view: string) => {
  const q = normS(qy); let list = items.filter((i) => !q || normS([i.m, i.n, i.s, i.g, i.col].join(" ")).includes(q));
  if (view === "selling") list = list.filter((i) => i.sold > 0 && i.left > 0);
  if (view === "none") list = list.filter((i) => !i.sold);
  if (view === "out") list = list.filter((i) => i.q && i.left === 0);
  return list.sort((x, y) => y.sold - x.sold || y.pct - x.pct || String(itemLabel(x)).localeCompare(itemLabel(y)));
};

// ---------- разбор файлов Excel ----------
const COLRULES: [string, RegExp][] = [["cp", /покуп|постав|закуп|себест|вход|закупоч/], ["p", /продаж|розн|цена/], ["q", /кол-?во|колич|шт\b|^шт|остат|кол\./], ["m", /модел/], ["s", /артикул|sku|^код|штрих|баркод/], ["n", /наимен|товар|назван|позици/], ["g", /групп/], ["c", /катег|^тип|вид товар/], ["col", /цвет/], ["pt", /^место|магазин|точк|филиал|локац/]];
function mapHeader(row: unknown[]) {
  const map: Record<string, number> = {};
  row.forEach((v, i) => { const t = normS(v); if (!t) return; for (const [k, re] of COLRULES) { if (map[k] == null && re.test(t)) { map[k] = i; break; } } });
  return map;
}
/** лист Excel → позиции; X — модуль xlsx (подключается по требованию) */
export function parseSheet(X: { utils: { sheet_to_json: (ws: unknown, o: unknown) => unknown[][] } }, ws: unknown, opt?: { zero?: boolean }): { items: BItem[]; err?: string } {
  opt = opt || {};
  const rows = X.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: false, defval: null });
  let hi = -1, map: Record<string, number> | null = null;
  for (let i = 0; i < Math.min(rows.length, 25); i++) { const m = mapHeader(rows[i] || []); if (m.q != null && (m.m != null || m.n != null || m.s != null)) { hi = i; map = m; break; } }
  if (hi < 0 || !map) return { items: [], err: "Не нашёл строку заголовков: нужны столбцы с количеством и моделью, артикулом или наименованием." };
  const num = (v: unknown) => { if (typeof v === "number") return v; const n = parseFloat(String(v == null ? "" : v).replace(/\s/g, "").replace(",", ".")); return isNaN(n) ? 0 : n; };
  const items: BItem[] = [];
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] || []; const g = (k: string) => (map![k] != null ? r[map![k]] : null);
    const q = Math.round(num(g("q"))); const m = g("m"), n = g("n"), s = g("s");
    if (q < 0 || !(m || n || s)) continue;
    if (!q && !(opt.zero && (num(g("cp")) || num(g("p"))))) continue;
    if (/^итог|^всего/i.test(String(n || m || s))) continue;
    const it: BItem = { k: "i" + items.length, q };
    if (m != null && m !== "") it.m = String(m).trim(); if (n != null && n !== "") it.n = String(n).trim(); if (s != null && s !== "") it.s = String(s).trim();
    (["g", "c", "col", "pt"] as const).forEach((k) => { const v = g(k); if (v != null && v !== "") it[k] = String(v).trim(); });
    const p = Math.round(num(g("p"))), cp = Math.round(num(g("cp"))); if (p) it.p = p; if (cp) it.cp = cp;
    items.push(it);
  }
  return { items };
}
export function mergeStock(items: BItem[]): BItem[] {
  const m = new Map<string, BItem>();
  items.forEach((it) => {
    const key = [it.pt, it.s, it.m, it.n, it.col].map(normS).join("|"); const o = m.get(key);
    if (o) { o.q = (+o.q || 0) + (+it.q || 0); if (!o.cp && it.cp) o.cp = it.cp; if (!o.p && it.p) o.p = it.p; if (!o.g && it.g) o.g = it.g; if (!o.c && it.c) o.c = it.c; }
    else m.set(key, Object.assign({}, it));
  });
  return [...m.values()].map((it, i) => Object.assign(it, { k: "s" + i }));
}
export { fmtM };
