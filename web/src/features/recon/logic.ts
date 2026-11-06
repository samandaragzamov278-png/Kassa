// Расчёты раздела «Сверка» — перенос один в один из dev/bz/bz.js (чеки Billz против записей Кассы)
// и dev/patch_billz.py (статус автозагрузки Billz). Фискальные модули ↔ Касса считаются в features/report/logic.ts.
import type { Data } from "../../lib/types";
import { bzSelect, client, isDemo } from "../../lib/source";
import { kSales, type KSale } from "../report/logic";

import { fmt } from "../pay/logic";
export { fmt, pl } from "../pay/logic";
export type { KSale };

export interface BzItem { n: string; sku: string; c?: string; q?: number; rq?: number; price?: number; sum?: number; disc?: number; ret?: boolean }
export interface BzCheck {
  order_id: string; point: string; d: string; t: string; num: string | number; type?: string; total?: number; paid?: number; debt?: number;
  pays?: { n: string; s: number }[]; items?: BzItem[]; seller?: string;
}

// Премиум и Яшнабад — после инвентаризации; пока сверяются только точки, чьи продажи приходят из Billz
export const POINTS = ["Сергели", "C1"];
export const AUTO = new Set(["Сергели"]); // точки, чьи продажи Касса берёт из Billz сама
export const isLens = (c?: string) => /линз/i.test(c || "");
export const isRet = (t?: string) => /возврат|return/i.test(t || "");

export const fq = (n: unknown) => { const x = +(n as number) || 0, r = Math.round(x * 10) / 10; return (r < 0 ? "−" : "") + String(Math.abs(r)).replace(".", ","); };
export const sgn = (n: number) => (n > 0 ? "+" : "") + fmt(n);
export const sgq = (n: number) => (n > 0 ? "+" : "") + fq(n);
export const tashNow = () => new Date(Date.now() + 5 * 3600e3);
export const today = () => tashNow().toISOString().slice(0, 10);
export const addD = (s: string, n: number) => new Date(Date.parse(s + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
export const dS = (s?: string) => (s ? s.slice(8, 10) + "." + s.slice(5, 7) : "—");
export const dL = (s?: string) => (s ? s.slice(8, 10) + "." + s.slice(5, 7) + "." + s.slice(0, 4) : "—");
const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
export const wd = (s: string) => WD[new Date(s + "T12:00:00Z").getUTCDay()];
export const hm = (t?: string | null) => (t ? new Date(t).toLocaleTimeString("ru-RU", { timeZone: "Asia/Tashkent", hour: "2-digit", minute: "2-digit" }) : "");
export const dtm = (t?: string | number | null) => (t ? new Date(t).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", "") : "—");

export const PER: [string, string][] = [["today", "Сегодня"], ["yday", "Вчера"], ["7d", "7 дней"], ["month", "Этот месяц"], ["prev", "Прошлый месяц"], ["custom", "Свои даты"]];
export function periodOf(p: string, f: string, t: string): [string, string] {
  const T = today();
  if (p === "today") return [T, T]; if (p === "yday") return [addD(T, -1), addD(T, -1)]; if (p === "7d") return [addD(T, -6), T];
  if (p === "month") return [T.slice(0, 8) + "01", T];
  if (p === "prev") { const d = new Date(Date.parse(T.slice(0, 8) + "01T00:00:00Z")); d.setUTCMonth(d.getUTCMonth() - 1); return [d.toISOString().slice(0, 10), addD(T.slice(0, 8) + "01", -1)]; }
  return [f || T, t || T];
}

// ---------- сверка по дням и точкам ----------
export const kassaRows = (d: Data, f: string, t: string) => kSales(d).filter((s) => s.date >= f && s.date <= t && POINTS.includes(s.point) && s.cat !== "Погашения долгов");
export const kSum = (s: KSale) => (+s.sum || 0) + (+(s.debt || 0));
export const bzQty = (c: BzCheck) => { const sign = isRet(c.type) ? -1 : 1; return (c.items || []).reduce((a, i) => { if (i.ret && !isRet(c.type)) return a; const q = (+(i.q || 0)) || (+(i.rq || 0)); return a + (isLens(i.c) ? q / 2 : q); }, 0) * sign; };
export const bzSum = (c: BzCheck) => (isRet(c.type) ? -1 : 1) * Math.abs(+(c.total || 0));

export interface DayRow { d: string; p: string; bn: number; bq: number; bs: number; kn: number; kq: number; ks: number; nodet: boolean; debt: number; ds: number; dq: number | null; ok: boolean }
export function dayTable(checks: BzCheck[], ks: KSale[]): DayRow[] {
  const m = new Map<string, DayRow>();
  const get = (d: string, p: string) => { const k = d + "|" + p; let o = m.get(k); if (!o) m.set(k, (o = { d, p, bn: 0, bq: 0, bs: 0, kn: 0, kq: 0, ks: 0, nodet: false, debt: 0, ds: 0, dq: 0, ok: true })); return o; };
  checks.forEach((c) => { if (!POINTS.includes(c.point)) return; const o = get(c.d, c.point); o.bn++; o.bq += bzQty(c); o.bs += bzSum(c); });
  ks.forEach((s) => { const o = get(s.date, s.point); o.kn++; o.kq += +(s.qty || 0); o.ks += kSum(s); o.debt += +(s.debt || 0); if (s.cat === "Без детализации") o.nodet = true; });
  return [...m.values()].map((o) => Object.assign(o, { ds: o.ks - o.bs, dq: o.nodet ? null : o.kq - o.bq, ok: Math.abs(o.ks - o.bs) < 1 && (o.nodet || Math.abs(o.kq - o.bq) < 0.01) }))
    .sort((a, b) => b.d.localeCompare(a.d) || POINTS.indexOf(a.p) - POINTS.indexOf(b.p));
}

export interface KGroup { k: string; billz: string | null; check: string; rows: KSale[]; sum: number; q: number; t: number; m?: BGroup }
export interface BGroup { c: BzCheck; sum: number; q: number; m: KGroup | null }
/** чеки Billz ↔ записи Кассы за день: по номеру из Billz, иначе по одинаковой сумме и ближайшему времени */
export function matchDay(checks: BzCheck[], ks: KSale[]) {
  const groups = new Map<string, KGroup>();
  ks.forEach((s) => {
    const k = s.billz ? "b:" + s.billz : s.check ? "c:" + s.check + "|" + (s.photo || "") : "r:" + s.id; let g = groups.get(k);
    if (!g) groups.set(k, (g = { k, billz: s.billz || null, check: s.check || "", rows: [], sum: 0, q: 0, t: +(s.createdAt || 0) }));
    g.rows.push(s); g.sum += kSum(s); g.q += +(s.qty || 0);
  });
  const G = [...groups.values()], B: BGroup[] = checks.map((c) => ({ c, sum: bzSum(c), q: bzQty(c), m: null }));
  const bById = new Map(B.map((b) => [b.c.order_id, b]));
  G.forEach((g) => { if (g.billz && bById.has(g.billz)) { const b = bById.get(g.billz)!; b.m = g; g.m = b; } });
  G.filter((g) => !g.m).forEach((g) => {
    let best: { b: BGroup; dt: number } | null = null;
    B.forEach((b) => { if (b.m || Math.abs(b.sum - g.sum) >= 1) return; const dt = Math.abs((Date.parse(b.c.t) || 0) - g.t); if (!best || dt < best.dt) best = { b, dt }; });
    if (best) { (best as { b: BGroup }).b.m = g; g.m = (best as { b: BGroup }).b; }
  });
  return { G, B };
}
export interface FlatItem { t: string; d: string; p: string; num: string | number; type?: string; n: string; sku: string; c?: string; q: number; pairs: boolean; sum: number; seller?: string }
export function flatItems(ch: BzCheck[]): FlatItem[] {
  const out: FlatItem[] = [];
  ch.forEach((c) => (c.items || []).forEach((i) => { if (i.ret && !isRet(c.type)) return; const sign = isRet(c.type) ? -1 : 1, q = +(i.q || 0) || +(i.rq || 0) || 0; out.push({ t: c.t, d: c.d, p: c.point, num: c.num, type: c.type, n: i.n, sku: i.sku, c: i.c, q: sign * q, pairs: isLens(i.c), sum: sign * (+(i.sum || 0)), seller: c.seller }); }));
  return out;
}

// ---------- загрузка чеков ----------
export const loadChecks = async (f: string, t: string) => (await bzSelect<BzCheck>("bz_check", (q) => q.gte("d", f).lte("d", t).order("t"))).filter((c) => c.d >= f && c.d <= t);

// ---------- автозагрузка Billz → Касса: статусы и кнопки ----------
export interface BzSync {
  ok?: boolean; at?: number; error?: string; to?: string; lastOk?: BzSync;
  salesCheck?: { d: string; billz: number; kassa: number; ok: boolean }[]; attention?: string[];
  stock?: { items: number; qty: number; baseline?: boolean; diffCount?: number; diffs?: { n: string; s: string; prev: number; sold: number; exp: number; now: number; d: number }[] } | null;
  sales?: { checks?: number; sum: number; debts?: { d: string; debt: number }[] } | null;
}
export const BZP: Record<string, { h: number; m: number }> = { "Сергели": { h: 20, m: 0 }, "C1": { h: 20, m: 0 } };
export const syncDoc = (d: Data, name: string) => ((d.rows.sync || {})[name] as BzSync | undefined) || null;
export const bzOf = (d: Data, p: string) => syncDoc(d, p === "C1" ? "billz-c1" : "billz-sergeli");
export function bzNext(p: string) {
  const c = BZP[p || "Сергели"], n = tashNow(); let x = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), c.h, c.m));
  if (n >= x) x = new Date(x.getTime() + 864e5); const s = x.toISOString(); return s.slice(8, 10) + "." + s.slice(5, 7) + " в " + s.slice(11, 16);
}
export function bzState(d: Data, p: string): { cls: "ok" | "warn" | "err" | "wait"; t: string } {
  const s = bzOf(d, p || "Сергели"); if (!s) return { cls: "wait", t: "Ещё не запускалась" };
  const T = today();
  if (!s.ok) return { cls: "err", t: "Ошибка " + dtm(s.at) + ": " + (s.error || "") };
  const bad = (s.salesCheck || []).filter((x) => !x.ok).length + (s.attention || []).length;
  if (bad) return { cls: "warn", t: "Загружено " + dtm(s.at) + " · есть расхождения" };
  return { cls: "ok", t: "Загружено " + dtm(s.at) + (s.to === T ? "" : " (сегодня ещё не было)") };
}
/** состояние выгрузки из Billz (sync/billz-collect) */
export function collectState(d: Data): { cls: "ok" | "err" | "wait"; t: string; last?: string } {
  const s = syncDoc(d, "billz-collect"); if (!s) return { cls: "wait", t: "Выгрузка из Billz ещё не запускалась" };
  const last = s.ok ? s : s.lastOk;
  return s.ok ? { cls: "ok", t: "Billz выгружен " + dtm(s.at) } : { cls: "err", t: "Ошибка выгрузки " + dtm(s.at) + ": " + (s.error || ""), last: last ? "последняя удачная " + dtm(last.at) : undefined };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Res = { err?: string; data?: { ok?: boolean; error?: string } };
async function invoke(name: string, body: object): Promise<Res> {
  // в демо настоящие функции не вызываются
  if (isDemo) { await sleep(700); return { data: { ok: true } }; }
  try { const r = await client().functions.invoke(name, { body }); if (r.error) return { err: String(r.error.message || r.error) }; return { data: (r.data as Res["data"]) || { ok: true } }; }
  catch (e) { return { err: String((e as Error)?.message || e) }; }
}
/** «Обновить сейчас» в блоке «Billz → Касса»: загрузка чеков и остатков одной точки (функция billz-sync) */
export async function bzRun(p: string): Promise<{ ok?: boolean; error?: string }> { const r = await invoke("billz-sync", { point: p || "Сергели" }); return r.err ? { ok: false, error: r.err } : r.data || { ok: true }; }
/** «Обновить из Billz»: сначала выгрузка (billz-collect), затем сверка и загрузка продаж (billz-sync) */
export async function bzRefresh(): Promise<{ ok: boolean; error?: string }> {
  const a = await invoke("billz-collect", {}); if (a.err) return { ok: false, error: a.err };
  await invoke("billz-sync", {}); // как на рабочем сайте: ошибка второго шага не мешает
  return { ok: true };
}
