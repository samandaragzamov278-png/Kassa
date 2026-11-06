// Расчёты раздела «Отчёт р/с» — перенос один в один из рабочего сайта:
// отчёт оптика (rpCalc, rpGN — dev/base.html), отчёт по расчётному счёту (dev/rs/rs.js), фискальные модули (dev/fm/fm.js).
// Чистые функции: на вход данные и «сегодня», на выход готовые цифры.
import type { Data, Sale } from "../../lib/types";
import { fmt, todayTash } from "../pay/logic";

export { fmt, pl, MN, MNg, WD, todayTash, dLong } from "../pay/logic";

/** продажа Кассы со всеми полями, которые пишет рабочий сайт (в общем типе их нет) */
export type KSale = Sale & { qty?: number; debt?: number; cat?: string; product?: string; check?: string; billz?: string; photo?: string; branch?: string };
export interface BankRow { n: string; a: number | null; c?: string }
export interface Adj { c?: number; t?: number; q?: number; e?: number }
/** report/<день>: остатки р/с, гросс, расходы с р/с, поправки по долгам */
export interface RepDoc {
  date?: string; rsStart?: number | null; rsEnd?: number | null; grossCash?: number | null; grossNon?: number | null;
  bank?: BankRow[]; adj?: Record<string, Adj>; adjNote?: string; tr?: Record<string, unknown>; updatedAt?: number;
}
export const repDocs = (d: Data): Record<string, RepDoc> => (d.rows.report || {}) as Record<string, RepDoc>;
export const kSales = (d: Data) => d.sales as KSale[];
/** расходы дня с налички точек: «Касса» → источник «day» */
export const dayExp = (d: Data) => d.entries.filter((e) => e.source === "day" && e.type !== "inc");

export const RP_PTS = ["Премиум", "Яшнабад", "Сергели"];
export const RP_MF = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
export const RP_WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
export const RP_GN_FROM = "2026-10-16";
export const normS = (s: unknown) => String(s == null ? "" : s).toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
export const wdOf = (d: string) => RP_WD[new Date(d + "T12:00:00Z").getUTCDay()];
export const dShort = (s: string) => (s ? s.slice(8, 10) + "." + s.slice(5, 7) : "—");
export const dFull = (s: string) => (s ? s.slice(8, 10) + "." + s.slice(5, 7) + "." + s.slice(0, 4) : "");
export const monthLabel = (m: string) => RP_MF[+m.slice(5, 7) - 1] + " " + m.slice(0, 4);

/** число из поля ввода: пробелы, запятая, минус — как на рабочем сайте (до сотых) */
export const rpNum = (v: unknown): number | null => {
  if (v == null) return null;
  let t = String(v).replace(/[\s  ]/g, "").replace(/[−–]/g, "-").replace(/,/g, "."); t = t.replace(/[^\d.-]/g, "");
  if (!t || t === "-" || t === ".") return null;
  const parts = t.split("."); if (parts.length > 2) t = parts.slice(0, -1).join("") + "." + parts[parts.length - 1];
  const x = parseFloat(t); return isFinite(x) ? Math.round(x * 100) / 100 : null;
};
export const fmt2 = (n: number | null | undefined) => {
  if (n == null || !isFinite(n)) return "";
  const r = Math.round(Math.abs(n) * 100), i = Math.floor(r / 100), f = r % 100;
  return (n < 0 ? "−" : "") + fmt(i) + (f ? "," + String(f).padStart(2, "0") : "");
};
const expAmt = (e: { fact?: number; amount?: number }) => (typeof e.fact === "number" ? e.fact : +(e.amount || 0));
const expName = (e: { name?: string; branch?: string }) => {
  const n = String(e.name || "").trim(), b = String(e.branch || "").trim();
  if (!n) return b; const w = n.split(/\s+/)[0];
  return b && !(w.length >= 5 && normS(w)[0] === normS(b)[0]) ? b + " " + n : n;
};

// ---------- гросс безнал: вчерашний гросс + терминал и QR всех точек за день ----------
export interface GNx { v: number | null; auto: boolean; prev?: number; t?: number; q?: number }
function rpTQ(d: Data, day: string) {
  let t = 0, q = 0;
  kSales(d).forEach((s) => {
    if (s.date !== day) return;
    const add = (p: string, v: number) => { if (p === "Терминал") t += v; else if (p === "QR/Payme" || p === "QR" || p === "Payme") q += v; };
    if (s.pay === "Смешанная" && s.pays) Object.entries(s.pays).forEach(([k, v]) => add(k, +v || 0)); else add(s.pay, +s.sum || 0);
  });
  const adj = repDocs(d)[day]?.adj; if (adj) Object.values(adj).forEach((v) => { t += Number(v?.t) || 0; q += Number(v?.q) || 0; });
  return { t, q };
}
const gnCache = new WeakMap<Data, { T: string; m: Record<string, GNx> }>();
export function rpGNmap(d: Data, T = todayTash()): Record<string, GNx> {
  const c = gnCache.get(d); if (c && c.T === T) return c.m;
  const R = repDocs(d), ds = new Set(Object.keys(R));
  kSales(d).forEach((s) => { if (s.date && s.date >= RP_GN_FROM && s.date <= T) ds.add(s.date); });
  const m: Record<string, GNx> = {}; let prev: number | null = null;
  [...ds].sort().forEach((day) => {
    if (day < RP_GN_FROM) { const v = R[day]?.grossNon; if (v != null) prev = v; m[day] = { v: v == null ? null : v, auto: false }; return; }
    const x = rpTQ(d, day);
    if (prev == null) { m[day] = { v: null, auto: true, t: x.t, q: x.q }; return; }
    const v: number = prev + x.t + x.q; m[day] = { v, auto: true, prev, t: x.t, q: x.q }; prev = v;
  });
  gnCache.set(d, { T, m }); return m;
}
export const rpGN = (d: Data, day: string, T = todayTash()) => { const x = rpGNmap(d, T)[day]; return x ? x.v : null; };
export function rpReady(d: Data, r: RepDoc | undefined, T = todayTash()) {
  if (!r) return 0;
  // как на рабочем сайте: гросс безнал считается сам для документов с датой с RP_GN_FROM
  const gn = (r.date as string) >= RP_GN_FROM ? rpGN(d, r.date as string, T) : r.grossNon;
  return [r.rsStart, r.rsEnd, r.grossCash, gn].filter((v) => v != null).length;
}
export const rpStat = (d: Data, day: string, T = todayTash()): "ok" | "part" | "none" => { const n = rpReady(d, repDocs(d)[day], T); return n === 4 ? "ok" : n ? "part" : "none"; };

// ---------- отчёт оптика по месяцу ----------
export interface Cell { c: number; t: number; q: number; e: number; sum?: number }
export interface BcItem { n: string; a: number; p: string }
export interface RpRow {
  d: string; pts: Record<string, Cell>; bc: BcItem[]; r: RepDoc; tot: Cell & { sum: number }; bank: BankRow[]; bankSum: number; bcSum: number;
  cum: { c: number; t: number; q: number; e: number; sum: number; bank: number; bc: number; pts: Record<string, number> };
}
const K4 = ["c", "t", "q", "e"] as const;
function rpAdd(o: Cell, pay: string, v: number) { const k = pay === "Наличные" ? "c" : pay === "Терминал" ? "t" : pay === "Перечисление" ? "e" : "q"; o[k] += v; }
export function rpMonthDays(d: Data, m: string, withToday: boolean, T = todayTash()) {
  const set = new Set<string>();
  kSales(d).forEach((s) => { if ((s.date || "").startsWith(m) && s.date <= T) set.add(s.date); });
  dayExp(d).forEach((e) => { if ((e.date || "").startsWith(m) && e.date <= T) set.add(e.date); });
  Object.keys(repDocs(d)).forEach((x) => { if (x.startsWith(m)) set.add(x); });
  if (withToday && T.startsWith(m) && new Date(T + "T12:00:00Z").getUTCDay() !== 0) set.add(T);
  return [...set].sort();
}
export function rpCalc(d: Data, m: string, withToday: boolean, T = todayTash()) {
  const days = rpMonthDays(d, m, withToday, T), dset = new Set(days), extra = new Set<string>(), R = repDocs(d);
  const byDay: Record<string, { pts: Record<string, Cell>; bc: BcItem[] }> = {}; days.forEach((x) => (byDay[x] = { pts: {}, bc: [] }));
  const cellOf = (x: string, p: string) => byDay[x].pts[p] || (byDay[x].pts[p] = { c: 0, t: 0, q: 0, e: 0 });
  kSales(d).forEach((s) => {
    if (!dset.has(s.date)) return; const p = s.point || "—"; if (!RP_PTS.includes(p)) extra.add(p); const o = cellOf(s.date, p);
    if (s.pay === "Смешанная" && s.pays) Object.entries(s.pays).forEach(([k, v]) => rpAdd(o, k, +v || 0)); else rpAdd(o, s.pay, +s.sum || 0);
  });
  // долги: деньги учитываются в день оплаты, а не в день продажи
  days.forEach((x) => { const adj = R[x]?.adj; if (!adj) return; Object.entries(adj).forEach(([p, v]) => { if (!RP_PTS.includes(p)) extra.add(p); const o = cellOf(x, p); K4.forEach((k) => { o[k] += Number(v?.[k]) || 0; }); }); });
  dayExp(d).forEach((e) => { if (!dset.has(e.date)) return; const a = expAmt(e); if (a) byDay[e.date].bc.push({ n: expName(e), a, p: e.branch || "" }); });
  const pts = RP_PTS.concat([...extra]);
  const cum = { c: 0, t: 0, q: 0, e: 0, bank: 0, bc: 0, pts: {} as Record<string, number> };
  const rows: RpRow[] = days.map((x) => {
    const b = byDay[x], r = R[x] || {}, tot = { c: 0, t: 0, q: 0, e: 0, sum: 0 };
    pts.forEach((p) => { const o = cellOf(x, p); o.sum = o.c + o.t + o.q + o.e; K4.forEach((k) => (tot[k] += o[k])); cum.pts[p] = (cum.pts[p] || 0) + o.sum; });
    tot.sum = tot.c + tot.t + tot.q + tot.e; K4.forEach((k) => (cum[k] += tot[k]));
    const bank = (Array.isArray(r.bank) ? r.bank : []).filter((q) => q && (q.n || q.a)), bankSum = bank.reduce((a, q) => a + (+(q.a as number) || 0), 0), bcSum = b.bc.reduce((a, q) => a + q.a, 0);
    cum.bank += bankSum; cum.bc += bcSum;
    return { d: x, pts: b.pts, bc: b.bc, r, tot, bank, bankSum, bcSum, cum: { c: cum.c, t: cum.t, q: cum.q, e: cum.e, sum: cum.c + cum.t + cum.q + cum.e, bank: cum.bank, bc: cum.bc, pts: { ...cum.pts } } };
  });
  return { days, pts, rows };
}
export type RpMonth = ReturnType<typeof rpCalc>;
/** последний предыдущий день, где поле заполнено (подсказка «Конец 12.10») */
export function rpPrevDoc(d: Data, day: string, k: "rsEnd" | "grossCash" | "grossNon") {
  const R = repDocs(d), ds = Object.keys(R).filter((x) => x < day && R[x] && R[x][k] != null).sort(), x = ds[ds.length - 1];
  return x ? { d: x, v: R[x][k] as number } : null;
}
export function rpMonths(d: Data, T = todayTash()) {
  const t = T.slice(0, 7);
  return [...new Set(kSales(d).map((s) => (s.date || "").slice(0, 7)).filter(Boolean).concat(Object.keys(repDocs(d)).map((x) => x.slice(0, 7))).concat([t]))].filter((m) => m <= t).sort();
}
export const rpAllDays = (d: Data, T = todayTash()) => rpMonths(d, T).flatMap((m) => rpMonthDays(d, m, false, T));
/** подсказки для расходов с р/с: самые частые названия */
export function bankChips(d: Data, used: string[]) {
  const freq: Record<string, { n: string; c: number }> = {};
  Object.values(repDocs(d)).forEach((x) => (Array.isArray(x.bank) ? x.bank : []).forEach((b) => { const n = String(b.n || "").trim(); if (!n) return; const k = normS(n); (freq[k] ||= { n: n.charAt(0).toUpperCase() + n.slice(1), c: 0 }).c++; }));
  const u = new Set(used.map(normS));
  return Object.entries(freq).filter(([k]) => !u.has(k)).sort((a, b) => b[1].c - a[1].c).slice(0, 5).map(([, v]) => v.n);
}

// ---------- отчёт по расчётному счёту (rs.js) ----------
export const RS_CATS: [string, RegExp][] = [["Налоги", /налог|ндфл|инпс|пен[яи]|соц\.? ?сбор/i], ["Пополнение корп. карты", /корп/i], ["Кредит", /кредит/i], ["Аренда и ЖЭК", /аренд|жэк|коммунал/i], ["Линзы (товар)", /линз/i], ["Обналичка", /обнал/i], ["С1: мебель, дизайн", /ц1|с1|мебел|дизайн|ремонт/i], ["Billz, кассы, терминалы", /billz|билз|касс|терминал|фискал/i], ["Зарплата", /зарпл|зараб|заплат|аванс/i], ["Межбанк", /межбанк/i], ["Комиссия банка", /комисс/i]];
export const CAT_NAMES = RS_CATS.map((c) => c[0]).concat(["Прочее"]);
export const catOf = (b: { n?: string; c?: string }) => (b.c && CAT_NAMES.includes(b.c) ? b.c : (RS_CATS.find((c) => c[1].test(String(b.n || ""))) || ["Прочее"])[0]);
const nn = (v: unknown) => (v == null || v === "" ? null : +(v as number));
export interface RsDay { d: string; s: number | null; e: number | null; bank: BankRow[]; out: number; in: number | null }
export function rsDays(d: Data): RsDay[] {
  const R = repDocs(d);
  return Object.keys(R).filter((x) => /^\d{4}-\d\d-\d\d$/.test(x)).sort().map((x) => {
    const r = R[x] || {}, bank = (r.bank || []).filter((b) => +(b.a as number)), out = bank.reduce((a, b) => a + (+(b.a as number) || 0), 0), s = nn(r.rsStart), e = nn(r.rsEnd);
    return { d: x, s, e, bank, out, in: s != null && e != null ? e - s + out : null };
  }).filter((x) => x.s != null || x.e != null || x.bank.length);
}
export const rsMonths = (d: Data) => [...new Set(rsDays(d).map((x) => x.d.slice(0, 7)))].sort();
export function rsCalc(d: Data, m: string) {
  const all = rsDays(d), L = m === "all" ? all : all.filter((x) => x.d.startsWith(m));
  const withS = L.filter((x) => x.s != null), withE = L.filter((x) => x.e != null);
  const cat: Record<string, number> = {}; L.forEach((x) => x.bank.forEach((b) => { const c = catOf(b); cat[c] = (cat[c] || 0) + (+(b.a as number) || 0); }));
  return { m, days: L, start: withS.length ? withS[0].s : null, startD: withS.length ? withS[0].d : null, end: withE.length ? withE[withE.length - 1].e : null, endD: withE.length ? withE[withE.length - 1].d : null,
    in: L.reduce((a, x) => a + ((x.in ?? 0) > 0 ? (x.in as number) : 0), 0), out: L.reduce((a, x) => a + x.out, 0), cat, outDays: L.filter((x) => x.out).length };
}
export function rsByMonth(d: Data) { const ms = rsMonths(d), rows: Record<string, ReturnType<typeof rsCalc>> = {}; ms.forEach((m) => (rows[m] = rsCalc(d, m))); return { ms, rows }; }

// ---------- фискальные модули (fm.js) ----------
export interface FmMod { kassa?: string; fm?: string; tp?: string; on?: boolean; c0?: number; n0?: number }
export interface FmCfg { mods: Record<string, FmMod> }
export interface FmDay { date?: string; pts?: Record<string, { c: number; n: number; k: number }>; updatedAt?: number }
export const fmCfg = (d: Data): FmCfg => { const x = d.rows.settings?.fiscal as Partial<FmCfg> | undefined; return { mods: {}, ...(x || {}) }; };
export const fmDays = (d: Data): Record<string, FmDay> => { const o: Record<string, FmDay> = {}; Object.entries(d.rows.fiscal || {}).forEach(([k, v]) => { if (/^\d{4}-\d\d-\d\d$/.test(k)) o[k] = v as FmDay; }); return o; };
export const fmMod = (d: Data, p: string): FmMod | null => fmCfg(d).mods[p] || null;
export const fmIsOn = (d: Data, p: string) => { const m = fmMod(d, p); return !!(m && m.on !== false && (m.fm || m.kassa)); };
export const fmDay = (d: Data, day: string, p: string) => { const x = fmDays(d)[day]?.pts?.[p]; return x ? { c: +x.c || 0, n: +x.n || 0, k: +x.k || 0 } : null; };
/** выручка Кассы: нал — «Наличные», безнал — терминал и QR (перечисления идут через р/с, фискальный чек на них не пробивают) */
export function fmKassa(d: Data, day: string, p: string) {
  const o = { c: 0, n: 0, e: 0, k: 0, rows: [] as KSale[] };
  kSales(d).forEach((s) => {
    if (s.date !== day || s.point !== p) return; o.rows.push(s);
    const add = (pay: string, v: number) => { if (pay === "Наличные") o.c += v; else if (pay === "Перечисление") o.e += v; else o.n += v; };
    if (s.pay === "Смешанная" && s.pays) Object.entries(s.pays).forEach(([k, v]) => add(k, +v || 0)); else add(s.pay, +s.sum || 0);
  });
  o.k = new Set(o.rows.map((s) => s.check || s.id)).size; return o;
}
export function fmGross(d: Data, p: string, upTo?: string) {
  const m = fmMod(d, p) || {}; let c = +(m.c0 || 0), n = +(m.n0 || 0);
  Object.keys(fmDays(d)).forEach((x) => { if (upTo && x > upTo) return; const v = fmDay(d, x, p); if (v) { c += v.c; n += v.n; } });
  return { c, n };
}
export function fiscalDayList(d: Data, T = todayTash()) {
  const s = new Set(Object.keys(fmDays(d))); kSales(d).forEach((x) => { if (x.date && x.date <= T) s.add(x.date); }); return [...s].sort();
}
export function fmDayStat(d: Data, day: string): "ok" | "part" | "none" {
  const on = d.points.filter((p) => fmIsOn(d, p)); if (!on.length) return "none";
  const n = on.filter((p) => fmDay(d, day, p)).length; return n === on.length ? "ok" : n ? "part" : "none";
}
export const fmAnyOn = (d: Data) => d.points.some((p) => fmIsOn(d, p));

// сверка фискальных модулей ↔ Касса
export const addD = (s: string, n: number) => new Date(Date.parse(s + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
export type FmStatus = "ok" | "short" | "over" | "nofm" | "off";
export function fmReconRows(d: Data, f: string, t: string, pt: string) {
  const out: { d: string; p: string; on: boolean; k: ReturnType<typeof fmKassa>; x: ReturnType<typeof fmDay>; dc: number | null; dn: number | null; st: FmStatus }[] = [];
  const P = d.points.filter((p) => pt === "all" || p === pt);
  for (let day = f; day <= t; day = addD(day, 1)) P.forEach((p) => {
    const k = fmKassa(d, day, p), x = fmDay(d, day, p), on = fmIsOn(d, p); if (!k.rows.length && !x) return;
    const dc = x ? x.c - k.c : null, dn = x ? x.n - k.n : null;
    const st: FmStatus = !on ? "off" : !x ? "nofm" : Math.abs(dc as number) < 1 && Math.abs(dn as number) < 1 ? "ok" : (dc as number) < 0 || (dn as number) < 0 ? "short" : "over";
    out.push({ d: day, p, on, k, x, dc, dn, st });
  });
  return out.sort((a, b) => b.d.localeCompare(a.d) || d.points.indexOf(a.p) - d.points.indexOf(b.p));
}
/** число из выгрузки: до целых (как num в fm.js) */
export const fmNum = (v: unknown): number | null => {
  if (v == null) return null; const t = String(v).replace(/[\s  ]/g, "").replace(/[−–]/g, "-").replace(/,/g, ".").replace(/[^\d.-]/g, "");
  if (!t || t === "-") return null; const x = parseFloat(t); return isFinite(x) ? Math.round(x) : null;
};
/** «Отчёт по чекам» из Rahmat: zip с одним xlsx; лист «Чеки» и те же чеки ещё раз по каждому модулю — повторы отбрасываем */
export async function parseRahmat(buf: ArrayBuffer, name: string, mods: Record<string, FmMod>) {
  const XLSX = await import("xlsx");
  let data: Uint8Array = new Uint8Array(buf);
  if (data[0] === 0x50 && data[1] === 0x4b) {
    const z = XLSX.CFB.read(data, { type: "array" }); const e = z.FileIndex.find((f: { name: string }) => /\.xlsx?$/i.test(f.name));
    if (e) data = e.content as Uint8Array; else if (/\.zip$/i.test(name || "")) throw new Error("в архиве нет Excel-файла");
  }
  const wb = XLSX.read(data, { type: "array", cellDates: true });
  const fm2p: Record<string, string> = {}, tp2p: Record<string, string> = {};
  Object.entries(mods || {}).forEach(([p, m]) => { if (m && m.fm) fm2p[String(m.fm).trim().toUpperCase()] = p; if (m && m.tp) tp2p[String(m.tp).trim().toLowerCase()] = p; });
  const acc: Record<string, Record<string, { c: number; n: number; k: number }>> = {}, seen = new Set<string>(), unknown = new Set<string>(); let n = 0;
  wb.SheetNames.forEach((sn: string) => {
    const A = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, raw: true, defval: null });
    const hi = A.findIndex((r) => r && r.some((c) => /тип операц/i.test(String(c || ""))) && r.some((c) => /налич/i.test(String(c || "")))); if (hi < 0) return;
    const H = (A[hi] as unknown[]).map((c) => String(c || "").toLowerCase().trim()); const col = (re: RegExp) => H.findIndex((c) => re.test(c));
    const iT = col(/тип операц/), iP = col(/торгов/), iF = col(/фискальн/), iC = col(/^налич/), iN = col(/безнал|^карт/), iD = col(/дата/), iK = col(/номер чека/);
    A.slice(hi + 1).forEach((r0) => {
      const r = r0 as unknown[]; if (!r) return; const ty = String(r[iT] || "").toLowerCase(); if (!/продаж|возврат/.test(ty)) return;
      const dv = r[iD]; let day = "";
      if (dv instanceof Date) day = new Date(dv.getTime() + 5 * 3600e3).toISOString().slice(0, 10);
      else { const s = String(dv || ""); let m = s.match(/(\d{4})-(\d\d)-(\d\d)/); if (m) day = `${m[1]}-${m[2]}-${m[3]}`; else if ((m = s.match(/(\d\d)\.(\d\d)\.(\d{4})/))) day = `${m[3]}-${m[2]}-${m[1]}`; }
      const fmn = iF >= 0 ? String(r[iF] || "").trim().toUpperCase() : "", tp = iP >= 0 ? String(r[iP] || "").trim() : "";
      const key = [fmn || tp, String(dv), ty, iK >= 0 ? r[iK] : ""].join("|"); if (seen.has(key)) return; seen.add(key);
      const p = fm2p[fmn] || tp2p[tp.toLowerCase()]; if (!day || !p) { unknown.add(fmn || tp || "?"); return; }
      const sg = /возврат/.test(ty) ? -1 : 1; const o = ((acc[day] ||= {})[p] ||= { c: 0, n: 0, k: 0 });
      o.c += sg * (fmNum(r[iC]) || 0); o.n += sg * (fmNum(r[iN]) || 0); o.k++; n++;
    });
  });
  return { acc, n, unknown: [...unknown] };
}
