// Расчёты раздела «Линзы»: вид линзы по названию, индекс/покрытие/бренд, сводки и маржа по видам. Перенос один в один из dev/base.html.
import { agg, dayList, inRange, rangeOf, type Bar, type Card, type Flt } from "../analytics/base";
import { checkKey, isFrame, isLens, type Ctx, type S } from "../analytics/cost";
import { dLong, fmt, fmtM, normS, pctF, pl } from "../analytics/util";

export const LKINDS = ["Essilor", "Seiko", "Miyosmart (Hoya)", "Тио", "Прогрессивные", "Бифокальные", "Хамелеон", "1.74", "1.67", "4в1", "Блок (блю-блок)", "Star", "Steel", "ET", "Для чтения", "Для зрения", "Тип не указан"];
export function lensKind(s: S): string {
  const t = normS(s.product || "");
  if (/essilor|stellest/.test(t)) return "Essilor"; if (/seiko|сейко/.test(t)) return "Seiko"; if (/miyo|hoya/.test(t)) return "Miyosmart (Hoya)"; if (/тио|\btio\b/.test(t)) return "Тио";
  if (/прогресс|progress/.test(t)) return "Прогрессивные"; if (/бифок/.test(t)) return "Бифокальные"; if (/хамел|фотохр/.test(t)) return "Хамелеон";
  if (/1[.,]74/.test(t)) return "1.74"; if (/1[.,]67/.test(t)) return "1.67"; if (/4\s*в\s*1/.test(t)) return "4в1"; if (/блок|blue/.test(t)) return "Блок (блю-блок)";
  if (/star|\(стар\)|(^|[^а-я])стар([^а-я]|$)/.test(t)) return "Star"; if (/steel/.test(t)) return "Steel"; if (/(^|[^a-zа-я])et([^a-zа-я]|$)/.test(t)) return "ET";
  if (/для чтен/.test(t)) return "Для чтения"; if (/для зрен/.test(t)) return "Для зрения"; return "Тип не указан";
}
export function lensInfo(s: S) {
  const l = s.lens || {}; const t = normS((s.product || "") + " " + (s.cat || ""));
  const type = l.type || (/прогресс|мультифок|progress/.test(t) ? "Прогрессивные" : /бифок/.test(t) ? "Бифокальные" : /офис/.test(t) ? "Офисные" : /замен/.test(t) ? "Замена линз" : "Однофокальные");
  let idx = l.index || ""; if (!idx) { const m = t.match(/1[.,](49|50|53|56|59|60|61|67|74|5|6)(?!\d)/); if (m) { idx = "1." + m[1]; if (idx === "1.5" || idx === "1.49") idx = "1.50"; if (idx === "1.6") idx = "1.60"; } }
  let coat = l.coat || ""; if (!coat) { const fc = /хамел|фотохр|transit|photo/.test(t), bb = /блок|blue|\bbb\b/.test(t); coat = fc && bb ? "Фотохром + блю-блок" : fc ? "Фотохром" : bb ? "Блю-блок" : /4\s*в\s*1/.test(t) ? "4в1" : /поляр/.test(t) ? "Поляризация" : /тонир/.test(t) ? "Тонированные" : /антиблик|\bar\b|мультипокр/.test(t) ? "Антиблик" : "не указано"; }
  const bm = t.match(/zeiss|essilor|hoya|rodenstock|nikon|kodak|bbgr|seiko|shamir|varilux|crizal|chemi|kodak/);
  const brand = l.brand || (bm ? bm[0].replace(/\b\w/g, (ch) => ch.toUpperCase()) : "");
  return { type, idx: idx || "не указан", coat, brand };
}
export const LTYPES = ["Однофокальные", "Прогрессивные", "Бифокальные", "Офисные", "Замена линз"];
export const LIDX = ["1.50", "1.56", "1.59", "1.60", "1.61", "1.67", "1.74"];
export const LCOAT = ["Без покрытия", "Антиблик", "Блю-блок", "Фотохром", "Фотохром + блю-блок", "4в1", "Тонированные", "Поляризация"];

export interface LRow { s: S; kind: string; type: string; idx: string; coat: string; brand: string }
export function lensData(c: Ctx, F: Flt) {
  const all = c.sales.filter((s) => inRange(s, F.from, F.to) && (F.point === "all" || s.point === F.point));
  const list = all.filter((s) => isLens(s) && (F.lk === "all" || lensKind(s) === F.lk)), a = agg(all);
  const rows: LRow[] = list.map((s) => Object.assign({ s, kind: lensKind(s) }, lensInfo(s)));
  return { all, list, rows, a };
}
/** виды линз за период (для списка «Вид линзы» в фильтре) */
export function lensKinds(c: Ctx, F: Flt) {
  const ks = [...new Set(c.sales.filter((s) => isLens(s) && inRange(s, F.from, F.to) && (F.point === "all" || s.point === F.point)).map(lensKind))];
  ks.sort((a, b) => LKINDS.indexOf(a) - LKINDS.indexOf(b)); if (F.lk !== "all" && !ks.includes(F.lk)) ks.push(F.lk);
  return ks;
}

export interface LG { k: string; u: number; r: number; n: number }
export function lensView(c: Ctx, F: Flt) {
  const { all, list, rows, a } = lensData(c, F), r = rangeOf(F, all);
  const la = agg(list);
  const chk: Record<string, { f: number; l: number }> = {};
  all.forEach((s) => { const o = chk[checkKey(s)] || (chk[checkKey(s)] = { f: 0, l: 0 }); if (isFrame(s)) o.f = 1; if (isLens(s)) o.l = 1; });
  const fr = Object.values(chk).filter((o) => o.f), both = fr.filter((o) => o.l).length;
  const g = (key: "type" | "idx" | "coat" | "brand" | "kind") => { const m: Record<string, LG> = {}; rows.forEach((x) => { const k: string = x[key] || "—"; const o = m[k] || (m[k] = { k, u: 0, r: 0, n: 0 }); o.u += +(x.s.qty || 0); o.r += +x.s.sum || 0; o.n++; }); return Object.values(m).sort((p, q) => q.u - p.u || q.r - p.r); };
  const byType = g("type"), byIdx = g("idx"), byCoat = g("coat"), byBrand = g("brand").filter((o) => o.k && o.k !== "—"), byKind = g("kind");
  const prog = byType.find((o) => o.k === "Прогрессивные");
  const lnSp = (l: S[], f: ((s: S) => number) | null, avg?: boolean) => {
    const rr = rangeOf(F, l), ds = dayList(rr); if (ds.length < 2) return undefined;
    const m: Record<string, number> = {}, u: Record<string, number> = {};
    l.forEach((s) => { m[s.date] = (m[s.date] || 0) + (f ? f(s) : +s.sum || 0); u[s.date] = (u[s.date] || 0) + (+(s.qty || 0)); });
    return { vals: ds.map((d) => (avg ? (u[d] ? m[d] / u[d] : 0) : m[d] || 0)), color: "var(--chart-3)" };
  };
  const cards: Card[] = [
    { id: 0, label: "Очковых линз продано", v: fmt(la.units) + " шт", d: `${la.n} ${pl(la.n, "позиция", "позиции", "позиций")} в ${la.checks} ${pl(la.checks, "чеке", "чеках", "чеках")}`, spark: lnSp(list, (s) => +(s.qty || 0)), main: true },
    { id: 0, label: "Выручка с линз", v: fmt(la.rev) + " сум", d: `${pctF(a.rev ? la.rev / a.rev : 0)} всей выручки`, ring: { p: a.rev ? la.rev / a.rev : 0 } },
    { id: 0, label: "Средняя цена линзы", v: fmt(la.unitPrice) + " сум", d: "за 1 шт · линия — средняя цена по дням", spark: lnSp(list, null, true) },
    { id: 0, label: "Чеки с оправой и линзами", v: fr.length ? pctF(both / fr.length) : "—", d: `${both} из ${fr.length} чеков с оправой`, ring: fr.length ? { p: both / fr.length, color: "var(--chart-3)" } : undefined },
    { id: 0, label: "Прогрессивные", v: prog ? fmt(prog.u) + " шт" : "0", d: prog ? `${fmt(prog.r)} сум · ${pctF(prog.u / la.units)} линз` : "не продавались" },
    { id: 0, label: "Скидки на линзы", v: fmt(la.disc) + " сум", d: `${la.discN} ${pl(la.discN, "позиция", "позиции", "позиций")} со скидкой` },
  ];
  const TC: Record<string, string> = { "Однофокальные": "var(--chart-2)", "Прогрессивные": "var(--chart-4)", "Бифокальные": "var(--chart-3)", "Офисные": "var(--chart-5)", "Замена линз": "var(--chart-1)" };
  const kindBars: Bar[] = byKind.map((o) => ({ label: o.k, value: o.u, valTxt: o.u + " шт", color: o.k === "Тип не указан" ? "var(--border)" : "var(--chart-1)", sub: `${fmtM(o.r)} · ср. ${fmtM(o.u ? o.r / o.u : 0)}` }));
  const types = byType.map((o) => ({ label: o.k, value: o.u, valTxt: o.u + " шт", color: TC[o.k] || "var(--muted-foreground)" }));
  const idxBars: Bar[] = byIdx.map((o) => ({ label: o.k, value: o.u, valTxt: o.u + " шт", color: o.k === "не указан" ? "var(--border)" : "var(--chart-3)", sub: fmtM(o.r) }));
  const coatBars: Bar[] = byCoat.map((o) => ({ label: o.k, value: o.u, valTxt: o.u + " шт", color: o.k === "не указано" ? "var(--border)" : "var(--chart-4)", sub: fmtM(o.r) }));
  const pt: Record<string, { u: number; r: number }> = {}; rows.forEach((x) => { const o = pt[x.s.point] || (pt[x.s.point] = { u: 0, r: 0 }); o.u += +(x.s.qty || 0); o.r += +x.s.sum || 0; });
  const ptEntries = Object.entries(pt).sort((p, q) => q[1].u - p[1].u);
  const avgType: Bar[] = byType.map((o) => ({ label: o.k, value: o.u ? o.r / o.u : 0, color: TC[o.k] || "var(--muted-foreground)", sub: o.u + " шт" }));
  const brandBars: Bar[] = byBrand.map((o) => ({ label: o.k, value: o.u, valTxt: o.u + " шт", color: "var(--chart-5)", sub: fmtM(o.r) }));
  const days = dayList(r), dm: Record<string, number> = {}; rows.forEach((x) => (dm[x.s.date] = (dm[x.s.date] || 0) + (+(x.s.qty || 0))));
  const byDay = { days, vals: days.map((d) => dm[d] || 0) };
  // таблица «вид × индекс × покрытие»
  const m: Record<string, { t: string; i: string; c: string; u: number; r: number; pts: Record<string, number> }> = {};
  rows.forEach((x) => { const k = x.kind + "|" + x.idx + "|" + x.coat; const o = m[k] || (m[k] = { t: x.kind, i: x.idx, c: x.coat, u: 0, r: 0, pts: {} }); o.u += +(x.s.qty || 0); o.r += +x.s.sum || 0; o.pts[x.s.point] = (o.pts[x.s.point] || 0) + (+(x.s.qty || 0)); });
  const table = Object.values(m).sort((p, q) => q.u - p.u || q.r - p.r);
  const ptTotals = Object.fromEntries(c.points.map((p) => [p, rows.filter((x) => x.s.point === p).reduce((q, x) => q + (+(x.s.qty || 0)), 0)]));
  return { all, list, rows, a, la, r, empty: !list.length, period: all.length ? `Период ${dLong(r.from)} — ${dLong(r.to)}` : "Виды, индексы, покрытия, бренды и точки", cards, kindBars, types, idxBars, coatBars, ptEntries, avgType, brandBars, byDay, table, ptTotals, byType, byIdx, byCoat, byKind, fr: fr.length, both };
}

// ---------- маржа по видам линз и цены пары (settings/lensCost) ----------
export function lensCostView(c: Ctx, rows: LRow[]) {
  if (!c.lensRules.length) return null;
  const m: Record<string, { k: string; u: number; r: number; c: number; kr: number; has: boolean }> = {}; let revAll = 0, revC = 0, cogs = 0;
  rows.forEach((x) => {
    const s = x.s, q = +(s.qty || 0), r = +s.sum || 0; revAll += r;
    const lr = c.lensRule(s), lb = c.lensBand(s);
    const k = s.point === "Сергели" && c.lensCfg && c.lensCfg.sergeli === "journal" ? "Сергели (по журналу)" : lr && (lr.pair as number) > 0 ? lr.k : lb ? "≈ " + lb.k + " (по цене)" : lr ? lr.k : "Тип не указан";
    const cc = c.lensCostOf(s), o = m[k] || (m[k] = { k, u: 0, r: 0, c: 0, kr: 0, has: false });
    o.u += q; o.r += r; if (cc != null && cc > 0) { o.c += cc * q; o.kr += r; o.has = true; revC += r; cogs += cc * q; }
  });
  const list = Object.values(m).sort((a, b) => b.r - a.r), gp = revC - cogs;
  return { list, gp, revC, cogs, revAll, margin: revC ? pctF(gp / revC) : "—", cover: pctF(revAll ? revC / revAll : 0), rules: (c.lensCfg && c.lensCfg.rules) || [] };
}
