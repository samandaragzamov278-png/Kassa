// Себестоимость и общие данные продаж — перенос один в один из dev/base.html (costOf, lensCostOf, sgLensDay, itemCostOf, marginOf, сопоставление со складом).
// Отсюда берут расчёты Аналитика, Линзы и Склад.
import type { Data, Entry, Sale } from "../../lib/types";
import { normS, reEsc } from "./util";

export interface S extends Sale {
  cat?: string; product?: string; qty?: number; price?: number; check?: string | number;
  lens?: { type?: string; index?: string; coat?: string; brand?: string } | null;
  cost?: number; batchKey?: string; batchId?: string;
}
/** позиция склада или партии */
export interface BItem { k?: string; m?: string; n?: string; s?: string; g?: string; c?: string; col?: string; pt?: string; q: number; p?: number; cp?: number; note?: string }
export interface Batch { id: string; name?: string; date?: string; file?: string; createdAt?: number; items?: BItem[] }
export interface StockPart { id: string; part?: number; parts?: number; file?: string; date?: string; uploadedAt?: number; total?: number; items?: BItem[]; soldFrom?: string; src?: Record<string, string> }
export interface LensRuleCfg { k: string; re: string; pair?: number | null; src?: string }
export interface LensCfg { rules?: LensRuleCfg[]; bands?: { k: string; pair: number; max?: number | null }[]; sergeli?: string; updatedAt?: number }
export interface ItemRule { cat: string; name: string; cost?: number; ratio?: number; pack?: { from: number; cost: number }; month?: string }
export interface FinCfg { months?: string[]; taxPct?: number; mgr?: { points?: string[]; share?: number }; extra?: Record<string, { n?: string; a?: number; b?: string; f?: string }[]> }
export interface PlanCfg { months: Record<string, { total?: number; shares?: Record<string, number> }>; sellers: Record<string, string>; off: number[] }

export const DEF_POINTS = ["Премиум", "Яшнабад", "Сергели", "C1"];
export const KASSA_POINTS = ["Премиум", "Яшнабад", "C1"];
export const DEF_CATS = ["Оправы", "Детские оправы", "Очковые линзы", "Солнцезащитные очки", "Контактные линзы", "Растворы и капли", "Аксессуары", "Ремонт и услуги"];
export const PAYS = ["Наличные", "Терминал", "QR/Payme", "Перечисление"];
export const NODET = "Без детализации";

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
export const payOf = (s: S): Record<string, number> => {
  if (s.pays && typeof s.pays === "object") { const o: Record<string, number> = {}; Object.entries(s.pays).forEach(([k, v]) => { const n = normPay(k); o[n] = (o[n] || 0) + (+v || 0); }); return o; }
  return { [normPay(s.pay)]: +s.sum || 0 };
};
export const discOf = (s: S) => Math.max(0, (+(s.qty || 0)) * (+(s.price || 0)) - (+s.sum || 0));
export const checkKey = (s: S) => s.date + "|" + s.point + "|" + (s.check ? String(s.check) : "_" + s.id);
export const isFrame = (s: S) => /оправ/i.test(s.cat || "") || /оправ/i.test(s.product || "");
export const isContact = (s: S) => /контакт/i.test(s.cat || "") || /контакт|к\/л|однодн|acuvue|air optix|biotrue|dailies/i.test(s.product || "");
export const isLens = (s: S) => /очков.*линз|^линзы$/i.test(s.cat || "") && !isContact(s);
export const unitPrice = (s: S) => +(s.price || 0) || Math.round((+s.sum || 0) / (+(s.qty || 0) || 1));
export const entAmt = (e: Entry) => (typeof e.fact === "number" ? e.fact : +(e.amount || 0));

export interface Margin { rev: number; cogs: number; gross: number; m: number | null; cover: number }
type Match = { b: Batch | null; it: BItem; pri: number; len: number; re: RegExp };

export interface Ctx {
  d: Data;
  sales: S[];
  dayExp: Entry[];
  batches: Batch[];
  stockParts: StockPart[];
  points: string[];
  cats: string[];
  planCfg: PlanCfg;
  lensCfg: LensCfg | null;
  finCfg: FinCfg;
  analyticsOff: number[] | null;
  stockItems: BItem[];
  stockMeta: StockPart | null;
  costOf(s: S): number;
  lensCostOf(s: S): number | null;
  lensRule(s: S): { k: string; pair: number | null; src: string } | null;
  lensBand(s: S): { k: string; pair: number } | null;
  lensRules: { k: string; re: RegExp; pair: number | null; src: string }[];
  hasItemRules: boolean;
  marginOf(l: S[]): Margin;
  matcher(prod: string, price: number, pt: string): Match | null;
}

const docs = <T,>(d: Data, col: string): (T & { id: string })[] => Object.entries(d.rows[col] || {}).map(([id, v]) => ({ ...(v as T), id }));
const one = <T,>(d: Data, id: string): T | null => ((d.rows.settings || {})[id] as T) || null;

const cache = new WeakMap<Data, Ctx>();
export function makeCtx(d: Data): Ctx {
  const hit = cache.get(d); if (hit) return hit;
  const sales = d.sales as S[];
  const dayExp = d.entries.filter((e) => e.source === "day" && e.type !== "inc");
  const batches = docs<Batch>(d, "batches");
  const stockParts = docs<StockPart>(d, "stock");
  const sg = one<{ points?: string[]; cats?: string[] }>(d, "sales");
  const points = d.points.slice();
  const cats = (sg && Array.isArray(sg.cats) && sg.cats.length ? sg.cats : DEF_CATS).slice();
  const pc = one<{ months?: PlanCfg["months"]; sellers?: Record<string, string>; off?: number[] }>(d, "plan");
  const planCfg: PlanCfg = { months: pc?.months || {}, sellers: Object.assign({ "Премиум": "Нодира", "Яшнабад": "Севара", "Сергели": "Зарнигор" }, pc?.sellers || {}), off: Array.isArray(pc?.off) ? (pc!.off as number[]) : [0] };
  const lensCfg = one<LensCfg>(d, "lensCost");
  const finCfg = one<FinCfg>(d, "finance") || {};
  const an = one<{ off?: number[] }>(d, "analytics3");
  const analyticsOff = an && Array.isArray(an.off) ? an.off : null;

  // склад: последняя загрузка (все части с одним uploadedAt)
  const stockGroup = (() => {
    if (!stockParts.length) return [] as StockPart[];
    const up = Math.max(...stockParts.map((p) => p.uploadedAt || 0));
    return stockParts.filter((p) => (p.uploadedAt || 0) === up).sort((a, b) => (a.part || 0) - (b.part || 0));
  })();
  const stockItems = stockGroup.flatMap((p) => p.items || []);
  const stockMeta = stockGroup[0] || null;

  // правила цены линз
  const lensRules = ((lensCfg && lensCfg.rules) || []).map((r) => {
    try { return { k: r.k, re: new RegExp(r.re, "i"), pair: r.pair == null ? null : +r.pair, src: r.src || "" }; } catch { return null; }
  }).filter(Boolean) as Ctx["lensRules"];
  const lensBands = ((lensCfg && lensCfg.bands) || []).filter((b) => b && +b.pair > 0);
  const lensRule = (s: S) => { const t = String(s.product || "").toLowerCase(); return lensRules.find((r) => r.re.test(t)) || null; };
  // вид неизвестен или у вида нет цены — оценка по цене продажи пары
  const lensBand = (s: S) => { const r = lensRule(s); if (r && (r.pair as number) > 0) return null; const p = unitPrice(s); return lensBands.find((b) => b.max == null || p <= +b.max) || null; };
  let dayCache: { ex: Record<string, number>; n: Record<string, number> } | null = null;
  const sgLensDay = (dt: string) => {
    if (!dayCache) {
      const ex: Record<string, number> = {}, n: Record<string, number> = {};
      dayExp.forEach((e) => { if (e.branch === "Сергели" && /линз/i.test(e.name || "") && !/доставк/i.test(e.name || "")) ex[e.date] = (ex[e.date] || 0) + entAmt(e); });
      sales.forEach((s) => { if (s.point === "Сергели" && s.cat === "Очковые линзы" && (+(s.qty || 0)) > 0) n[s.date] = (n[s.date] || 0) + (+(s.qty || 0)); });
      dayCache = { ex, n };
    }
    const c = dayCache; return c.n[dt] && c.ex[dt] ? c.ex[dt] / c.n[dt] : null;
  };
  const lensCostOf = (s: S): number | null => {
    if (s.cat !== "Очковые линзы") return null;
    if (s.point === "Сергели" && lensCfg && lensCfg.sergeli === "journal") return sgLensDay(s.date);
    const r = lensRule(s); if (r && (r.pair as number) > 0) return r.pair;
    const b = lensBand(s); return b ? +b.pair : null;
  };

  // товары без цены закупки на складе: settings/itemCost
  const itemRules = ((one<{ rules?: ItemRule[] }>(d, "itemCost")?.rules) || []);
  const itemMap = new Map<string, ItemRule>(); itemRules.forEach((r) => itemMap.set(r.cat + "|" + r.name, r));
  const itemCostOf = (s: S) => {
    const r = itemMap.get((s.cat || "") + "|" + normS(s.product || "")); if (!r || (r.month && !(s.date || "").startsWith(r.month))) return 0;
    const p = unitPrice(s);
    if (r.pack && p >= +r.pack.from) return +r.pack.cost; if (r.ratio) return Math.round(p * r.ratio); return +(r.cost || 0);
  };

  // сопоставление названия в продаже со складом и партиями: среди совпадений одной длины — с самой близкой ценой продажи
  let matcherFn: Ctx["matcher"] | null = null;
  const getMatcher = (): Ctx["matcher"] => {
    if (matcherFn) return matcherFn;
    const res: Match[] = [];
    const add = (b: Batch | null, it: BItem, pri: number) => [it.m, it.s, it.n].forEach((v) => { const t = normS(v); if (t.length >= 3) res.push({ b, it, pri, len: t.length, re: new RegExp("(^|[^a-zа-я0-9])" + reEsc(t) + "($|[^a-zа-я0-9])", "i") }); });
    stockItems.forEach((it) => add(null, it, 0));
    batches.forEach((b) => (b.items || []).forEach((it) => add(b, it, 1)));
    res.sort((x, y) => y.len - x.len || x.pri - y.pri);
    const memo: Record<string, Match | null> = {};
    matcherFn = (prod, price, pt) => {
      const p = normS(prod), ck = p + "|" + (price || "") + "|" + (pt || ""); if (ck in memo) return memo[ck];
      let best: Match | null = null, bl = 0, bs = Infinity;
      for (const r of res) {
        if (best && r.len < bl) break; if (!r.re.test(p)) continue;
        const sc = r.pri * 1e13 + (+(r.it.cp || 0) > 0 ? 0 : 1e12) + (price && +(r.it.p || 0) ? Math.abs(+(r.it.p || 0) - price) : 1e9) + (pt && r.it.pt && r.it.pt !== pt ? 1e8 : 0);
        if (sc < bs) { bs = sc; best = r; bl = r.len; }
      }
      return (memo[ck] = best);
    };
    return matcherFn;
  };
  const costOf = (s: S): number => {
    if (+(s.cost || 0) > 0) return +(s.cost as number);
    { const lc = lensCostOf(s); if (lc != null) return lc; }
    const m = getMatcher()(s.product || "", unitPrice(s), s.point);
    return m && +(m.it.cp || 0) > 0 ? +(m.it.cp as number) : itemCostOf(s);
  };
  const marginOf = (l: S[]): Margin => {
    let rev = 0, cogs = 0, all = 0;
    l.forEach((s) => { all += +s.sum || 0; const c = costOf(s); if (c) { rev += +s.sum || 0; cogs += c * (+(s.qty || 0)); } });
    return { rev, cogs, gross: rev - cogs, m: rev ? (rev - cogs) / rev : null, cover: all ? rev / all : 0 };
  };

  const ctx: Ctx = { d, sales, dayExp, batches, stockParts, points, cats, planCfg, lensCfg, finCfg, analyticsOff, stockItems, stockMeta, costOf, lensCostOf, lensRule, lensBand, lensRules, hasItemRules: itemMap.size > 0, marginOf, matcher: (a, b, c) => getMatcher()(a, b, c) };
  cache.set(d, ctx);
  return ctx;
}
