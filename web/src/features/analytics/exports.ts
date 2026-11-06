// Листы выгрузок в Excel (anXlsx, lnXlsx, stXlsx, bXlsx рабочего сайта): те же листы, столбцы и итоги.
import { agg, dayList, expFiltered, filtered, periodTxt, prevList, rangeOf, type Flt } from "./base";
import { checkKey, discOf, entAmt, PAYS, payOf, type Ctx, type S } from "./cost";
import { dLong, WD, wdIdx } from "./util";
import { xlToday, type XSheet } from "./xl";
import { lensData, type LRow } from "../lens/logic";
import { batchStats, itemLabel, marginData, reorderList, stockSold } from "../stock-margin/logic";
import type { Batch } from "./cost";

export const fname = (c: Ctx, F: Flt, pre: string, ext: string) => { const r = rangeOf(F, filtered(c, F)); return `${pre}_${r.from}_${r.to}${F.point !== "all" ? "_" + F.point : ""}.${ext}`; };

export function analyticsSheets(c: Ctx, F: Flt): XSheet[] | null {
  const list = filtered(c, F); if (!list.length) return null;
  const a = agg(list), pv = prevList(c, F), pa = pv ? agg(pv.list) : null, r = rangeOf(F, list), ex = expFiltered(c, F), mg = c.marginOf(list), pm = pv ? c.marginOf(pv.list) : null;
  const ch = (x: number, p: number) => (p ? (x - p) / p : null);
  const k = (n: string, x: number, p: number | null | undefined) => ({ n, c: x, p: p == null ? null : p, d: p == null ? null : ch(x, p) });
  const expS = ex.reduce((x, e) => x + entAmt(e), 0);
  const kp = [k("Выручка, сум", a.rev, pa && pa.rev), k("Выручка в среднем за день, сум", Math.round(a.rev / r.days), pa ? Math.round(pa.rev / r.days) : null), k("Продаж (позиций)", a.n, pa && pa.n), k("Чеков", a.checks, pa && pa.checks), k("Проданных единиц", a.units, pa && pa.units), k("Средний чек, сум", Math.round(a.avg), pa && Math.round(pa.avg)), k("Средняя цена единицы, сум", Math.round(a.unitPrice), pa && Math.round(pa.unitPrice)), k("Наличные (Б/Ч), сум", a.cash, pa && pa.cash), k("Расходы дня, сум", expS, null), k("Скидки, сум", a.disc, pa && pa.disc), k("Валовая прибыль, сум", mg.rev ? Math.round(mg.gross) : (null as never), pm && pm.rev ? Math.round(pm.gross) : null)];
  interface G { k: string; r: number; n: number; u: number; ch: Set<string> }
  const grp = (key: "point" | "cat" | "product", l: S[]) => { const m: Record<string, G> = {}; l.forEach((s) => { const kk = (s[key] as string) || "—"; const o = m[kk] || (m[kk] = { k: kk, r: 0, n: 0, u: 0, ch: new Set() }); o.r += +s.sum || 0; o.n++; o.u += +(s.qty || 0); o.ch.add(checkKey(s)); }); return m; };
  const withPrev = (key: "point" | "cat") => { const g = grp(key, list), gp = pa ? grp(key, pv!.list) : ({} as Record<string, G>); return Object.values(g).sort((x, y) => y.r - x.r).map((o) => ({ k: o.k, r: o.r, n: o.n, u: o.u, ck: o.ch.size, sh: o.r / a.rev, avg: Math.round(o.r / o.ch.size), up: o.u ? Math.round(o.r / o.u) : 0, pr: gp[o.k] ? gp[o.k].r : null, d: gp[o.k] ? ch(o.r, gp[o.k].r) : null, m: c.marginOf(list.filter((s) => (s[key] || "—") === o.k)).m })); };
  const pts = withPrev("point"), cats = withPrev("cat");
  const py: Record<string, number> = {}; list.forEach((s) => Object.entries(payOf(s)).forEach(([kk, v]) => (py[kk] = (py[kk] || 0) + v)));
  const pays = PAYS.filter((p) => py[p]).map((p) => ({ k: p, r: py[p], sh: py[p] / a.rev }));
  let cum = 0; const prods = Object.values(grp("product", list)).sort((x, y) => y.r - x.r).map((o, i) => { cum += o.r; const sh = cum / a.rev; return { i: i + 1, k: o.k, u: o.u, r: o.r, sh: o.r / a.rev, cs: sh, abc: sh <= 0.8001 ? "A" : sh <= 0.95 ? "B" : "C" }; });
  const days = dayList(r), wdCount = [0, 0, 0, 0, 0, 0, 0]; days.forEach((d) => wdCount[wdIdx(d)]++);
  const wdS = [0, 0, 0, 0, 0, 0, 0], wdN = [0, 0, 0, 0, 0, 0, 0]; list.forEach((s) => { wdS[wdIdx(s.date)] += +s.sum || 0; wdN[wdIdx(s.date)]++; });
  const wd = WD.map((w, i) => ({ w, days: wdCount[i], r: wdS[i], n: wdN[i], avg: wdCount[i] ? Math.round(wdS[i] / wdCount[i]) : 0 }));
  const sub = periodTxt(F, list, ` · выгружено ${xlToday()}`) + (pv ? ` · сравнение с ${dLong(pv.from)} — ${dLong(pv.to)}` : "");
  const cmpCols = [{ header: "Прошлый период, сум", key: "pr", type: "money" as const, width: 18 }, { header: "Изменение", key: "d", type: "pct" as const, width: 11 }];
  return [
    { name: "Показатели", title: "Аналитика продаж — ключевые показатели", subtitle: sub, columns: [{ header: "Показатель", key: "n", type: "text", width: 36 }, { header: "Текущий период", key: "c", type: "money", width: 18 }, { header: "Прошлый период", key: "p", type: "money", width: 18 }, { header: "Изменение", key: "d", type: "pct", width: 12 }], rows: kp, note: "Изменение: рост или падение к прошлому периоду такой же длины." },
    { name: "По точкам", title: "Точки", subtitle: sub, columns: [{ header: "Точка", key: "k", type: "text", width: 14 }, { header: "Выручка, сум", key: "r", type: "money", width: 16 }, { header: "Доля", key: "sh", type: "pct", width: 8 }, { header: "Чеков", key: "ck", type: "int", width: 8 }, { header: "Единиц", key: "u", type: "int", width: 8 }, { header: "Ср. чек, сум", key: "avg", type: "money", width: 15 }, { header: "Маржа", key: "m", type: "pct", width: 8 }, ...cmpCols], rows: pts, total: { k: "Итого", r: a.rev, sh: 1, ck: a.checks, u: a.units, avg: Math.round(a.avg), m: mg.m, pr: pa ? pa.rev : null, d: pa ? ch(a.rev, pa.rev) : null } },
    { name: "По категориям", title: "Категории товаров", subtitle: sub, columns: [{ header: "Категория", key: "k", type: "text", width: 22 }, { header: "Выручка, сум", key: "r", type: "money", width: 16 }, { header: "Доля", key: "sh", type: "pct", width: 8 }, { header: "Единиц", key: "u", type: "int", width: 8 }, { header: "Ср. цена ед., сум", key: "up", type: "money", width: 16 }, { header: "Маржа", key: "m", type: "pct", width: 8 }, ...cmpCols], rows: cats, total: { k: "Итого", r: a.rev, sh: 1, u: a.units } },
    { name: "Товары ABC", title: "Товары по выручке и ABC-анализ", subtitle: sub, columns: [{ header: "#", key: "i", type: "int", width: 6 }, { header: "Товар", key: "k", type: "text", width: 40 }, { header: "Единиц", key: "u", type: "int", width: 9 }, { header: "Выручка, сум", key: "r", type: "money", width: 16 }, { header: "Доля", key: "sh", type: "pct", width: 8 }, { header: "Накопленная доля", key: "cs", type: "pct", width: 12 }, { header: "Класс", key: "abc", type: "text", width: 8 }], rows: prods, total: { k: "Итого", u: a.units, r: a.rev, sh: 1 }, note: "A — товары, дающие первые 80% выручки; B — следующие 15%; C — последние 5%." },
    { name: "Дни недели", title: "Выручка по дням недели", subtitle: sub, columns: [{ header: "День", key: "w", type: "text", width: 8 }, { header: "Таких дней", key: "days", type: "int", width: 11 }, { header: "Выручка, сум", key: "r", type: "money", width: 16 }, { header: "Позиций", key: "n", type: "int", width: 9 }, { header: "В среднем за день, сум", key: "avg", type: "money", width: 20 }], rows: wd, total: { w: "Итого", days: r.days, r: a.rev, n: a.n } },
    { name: "Оплата", title: "Способы оплаты", subtitle: sub, columns: [{ header: "Способ", key: "k", type: "text", width: 16 }, { header: "Сумма, сум", key: "r", type: "money", width: 16 }, { header: "Доля", key: "sh", type: "pct", width: 8 }], rows: pays, total: { k: "Итого", r: a.rev, sh: 1 } },
  ];
}

export function lensSheets(c: Ctx, F: Flt): XSheet[] | null {
  const { rows, list, all } = lensData(c, F); if (!list.length) return null;
  const sub = periodTxt(F, all, ` · выгружено ${xlToday()}`);
  const det = [...rows].sort((x, y) => x.s.date.localeCompare(y.s.date)).map((x: LRow) => ({ d: dLong(x.s.date), p: x.s.point, pr: x.s.product, t: x.type, i: x.idx, c: x.coat, b: x.brand, q: +(x.s.qty || 0), pc: +(x.s.price || 0), sm: +x.s.sum || 0 }));
  const m: Record<string, { t: string; i: string; c: string; u: number; r: number; avg?: number }> = {};
  rows.forEach((x) => { const k = x.kind + "|" + x.idx + "|" + x.coat; const o = m[k] || (m[k] = { t: x.kind, i: x.idx, c: x.coat, u: 0, r: 0 }); o.u += +(x.s.qty || 0); o.r += +x.s.sum || 0; });
  const sum = Object.values(m).sort((a, b) => b.u - a.u).map((o) => Object.assign(o, { avg: o.u ? Math.round(o.r / o.u) : 0 }));
  const T = (arr: Record<string, unknown>[], k: string) => arr.reduce((a, r) => a + (+(r[k] as number) || 0), 0);
  const by = (key: "idx" | "coat") => { const g: Record<string, { k: string; u: number; r: number }> = {}; rows.forEach((x) => { const k = x[key] || "—"; const o = g[k] || (g[k] = { k, u: 0, r: 0 }); o.u += +(x.s.qty || 0); o.r += +x.s.sum || 0; }); return Object.values(g).sort((a, b) => b.u - a.u); };
  const simple = (name: string, title: string, key: "idx" | "coat"): XSheet => ({ name, title: name, subtitle: sub, columns: [{ header: title, key: "k", type: "text", width: 22 }, { header: "Штук", key: "u", type: "int", width: 9 }, { header: "Выручка, сум", key: "r", type: "money", width: 16 }], rows: by(key), total: { k: "Итого", u: T(det, "q"), r: T(det, "sm") } });
  return [
    { name: "Виды линз", title: "Проданные линзы по видам", subtitle: sub, columns: [{ header: "Вид", key: "t", type: "text", width: 16 }, { header: "Индекс", key: "i", type: "text", width: 10 }, { header: "Покрытие", key: "c", type: "text", width: 20 }, { header: "Штук", key: "u", type: "int", width: 8 }, { header: "Выручка, сум", key: "r", type: "money", width: 16 }, { header: "Ср. цена, сум", key: "avg", type: "money", width: 14 }], rows: sum, total: { t: "Итого", u: T(sum, "u"), r: T(sum, "r") } },
    simple("По индексу", "Индекс", "idx"), simple("По покрытию", "Покрытие", "coat"),
    { name: "Все продажи линз", title: "Все продажи линз", subtitle: sub, columns: [{ header: "Дата", key: "d", type: "text", width: 12 }, { header: "Точка", key: "p", type: "text", width: 11 }, { header: "Товар", key: "pr", type: "text", width: 30 }, { header: "Вид", key: "t", type: "text", width: 15 }, { header: "Индекс", key: "i", type: "text", width: 9 }, { header: "Покрытие", key: "c", type: "text", width: 18 }, { header: "Бренд", key: "b", type: "text", width: 11 }, { header: "Штук", key: "q", type: "int", width: 7 }, { header: "Цена, сум", key: "pc", type: "money", width: 13 }, { header: "Оплачено, сум", key: "sm", type: "money", width: 14 }], rows: det, total: { d: "Итого", q: T(det, "q"), sm: T(det, "sm") } },
  ];
}

export function marginSheets(c: Ctx, F: Flt): XSheet[] | null {
  const d = marginData(c, F); if (!d.tot.rev) return null;
  const sub = periodTxt(F, filtered(c, F), ` · выгружено ${xlToday()}`);
  const cols = (f: string) => [{ header: f, key: "k", type: "text" as const, width: 26 }, { header: "Выручка, сум", key: "rev", type: "money" as const, width: 15 }, { header: "Посчитано, сум", key: "revC", type: "money" as const, width: 15 }, { header: "Себестоимость, сум", key: "cogs", type: "money" as const, width: 15 }, { header: "Прибыль, сум", key: "gp", type: "money" as const, width: 15 }, { header: "Маржа", key: "mg", type: "pct" as const, width: 9 }, { header: "Покрытие", key: "cov", type: "pct" as const, width: 10 }];
  const tot = Object.assign({ k: "Итого" }, d.tot) as unknown as Record<string, unknown>;
  return [
    { name: "Маржа по точкам", title: "Маржинальность точек", subtitle: sub, columns: cols("Точка"), rows: d.pts as never, total: tot, note: "Считаются продажи с найденной ценой покупки. Покрытие — доля выручки, для которой цена покупки нашлась. Строки «без детализации» не входят." },
    { name: "Маржа по категориям", title: "Маржа по категориям", subtitle: sub, columns: cols("Категория"), rows: d.cats as never, total: tot },
    { name: "Товары", title: "Прибыль и маржа по товарам", subtitle: sub, columns: [{ header: "Товар", key: "k", type: "text", width: 36 }, { header: "Шт", key: "u", type: "int", width: 8 }, { header: "Выручка, сум", key: "rev", type: "money", width: 15 }, { header: "Цена покупки, сум", key: "cp", type: "money", width: 15 }, { header: "Себестоимость, сум", key: "cogs", type: "money", width: 15 }, { header: "Прибыль, сум", key: "gp", type: "money", width: 15 }, { header: "Маржа", key: "mg", type: "pct", width: 9 }], rows: [...d.prods].sort((a, b) => b.gp - a.gp) as never },
    { name: "Без цены покупки", title: "Продажи без цены покупки", subtitle: sub, columns: [{ header: "Товар в продаже", key: "k", type: "text", width: 40 }, { header: "Продаж", key: "n", type: "int", width: 9 }, { header: "Шт", key: "u", type: "int", width: 8 }, { header: "Выручка, сум", key: "rev", type: "money", width: 15 }], rows: d.miss as never },
  ];
}

export function stockSheets(c: Ctx): XSheet[] | null {
  const items = c.stockItems, meta = c.stockMeta; if (!items.length || !meta) return null;
  const sold = stockSold(c);
  const rows = items.map((i) => ({ pt: i.pt || "", m: [i.m || i.n || i.s, i.col].filter(Boolean).join(" · "), n: i.n && i.m ? i.n : "", s: i.s && i.s !== i.m ? i.s : "", g: i.g || i.c || "", q: +i.q || 0, cp: +(i.cp || 0) || null, p: +(i.p || 0) || null, mg: +(i.cp || 0) && +(i.p || 0) ? ((i.p as number) - (i.cp as number)) / (i.p as number) : null, vc: (+i.q || 0) * (+(i.cp || 0)), sold: sold.get(i) || 0, now: (+i.q || 0) - (sold.get(i) || 0) }));
  const T = (k: string) => rows.reduce((a, r) => a + (+((r as Record<string, unknown>)[k] as number) || 0), 0);
  return [{ name: "Склад", title: "Товары по складу и точкам", subtitle: `Файл «${meta.file || ""}» · продано считается с ${dLong(meta.soldFrom || meta.date)} · выгружено ${xlToday()}`, columns: [{ header: "Место", key: "pt", type: "text", width: 11 }, { header: "Модель / наименование", key: "m", type: "text", width: 28 }, { header: "Наименование", key: "n", type: "text", width: 26 }, { header: "Артикул", key: "s", type: "text", width: 14 }, { header: "Группа", key: "g", type: "text", width: 18 }, { header: "Кол-во по файлу", key: "q", type: "int", width: 11 }, { header: "Цена покупки", key: "cp", type: "money", width: 13 }, { header: "Цена продажи", key: "p", type: "money", width: 13 }, { header: "Маржа в цене", key: "mg", type: "pct", width: 10 }, { header: "Стоимость по закупке", key: "vc", type: "money", width: 16 }, { header: "Продано", key: "sold", type: "int", width: 10 }, { header: "≈ Сейчас", key: "now", type: "int", width: 10 }], rows, total: { pt: "Итого", q: T("q"), vc: T("vc"), sold: T("sold"), now: T("now") } }];
}

export function batchSheets(c: Ctx, b: Batch, bPt: string): XSheet[] {
  const { items } = batchStats(c, b, bPt); const pts = bPt === "all" ? c.points : [bPt];
  const sub = `${b.name || "Партия"} · приход ${dLong(b.date)}` + (bPt !== "all" ? ` · ${bPt}` : "") + ` · выгружено ${xlToday()}`;
  const mk = (i: (typeof items)[number]) => { const r: Record<string, unknown> = { m: i.m || i.n || i.s, col: i.col || "", s: i.s && i.s !== i.m ? i.s : "", g: i.g || i.c || "", p: +(i.p || 0) || null, cp: +(i.cp || 0) || null, q: i.q, sold: i.sold, left: i.left, pct: i.pct, rev: i.rev, last: i.last ? dLong(i.last) : "" }; pts.forEach((p, k) => (r["p" + k] = i.byPt[p] || 0)); return r; };
  const rows = [...items].sort((x, y) => y.sold - x.sold).map(mk);
  const Tt = (k: string) => rows.reduce((a, r) => a + (+(r[k] as number) || 0), 0);
  const total: Record<string, unknown> = { m: "Итого", q: Tt("q"), sold: Tt("sold"), left: Tt("left"), rev: Tt("rev"), pct: Tt("q") ? Tt("sold") / Tt("q") : 0 }; pts.forEach((_, k) => (total["p" + k] = Tt("p" + k)));
  const gm: Record<string, { k: string; n: number; q: number; s: number; r: number; l?: number; pct?: number }> = {};
  items.forEach((i) => { const k = i.g || i.c || "Без группы"; const o = gm[k] || (gm[k] = { k, n: 0, q: 0, s: 0, r: 0 }); o.n++; o.q += i.q; o.s += i.sold; o.r += i.rev; });
  const groups = Object.values(gm).sort((x, y) => y.s - x.s).map((o) => Object.assign(o, { l: o.q - o.s, pct: o.q ? o.s / o.q : 0 }));
  const cols = [{ header: "Модель / наименование", key: "m", type: "text" as const, width: 26 }, { header: "Цвет", key: "col", type: "text" as const, width: 9 }, { header: "Артикул", key: "s", type: "text" as const, width: 13 }, { header: "Группа", key: "g", type: "text" as const, width: 18 }, { header: "Цена продажи", key: "p", type: "money" as const, width: 13 }, { header: "Цена покупки", key: "cp", type: "money" as const, width: 13 }, { header: "Пришло, шт", key: "q", type: "int" as const, width: 10 },
    ...pts.map((p, k) => ({ header: "Продано " + p, key: "p" + k, type: "int" as const, width: 11 })),
    { header: "Продано всего", key: "sold", type: "int" as const, width: 11 }, { header: "Осталось, шт", key: "left", type: "int" as const, width: 11 }, { header: "Продано, %", key: "pct", type: "pct" as const, width: 10 }, { header: "Выручка, сум", key: "rev", type: "money" as const, width: 15 }, { header: "Последняя продажа", key: "last", type: "text" as const, width: 13 }];
  return [
    { name: "Товары партии", title: "Продажи товаров из новой партии", subtitle: sub, columns: cols, rows, total },
    { name: "На дозаказ", title: "Новая партия — на дозаказ", subtitle: sub + " · закончились или осталось ≤20%", columns: cols, rows: reorderList(items).map(mk) },
    { name: "По группам", title: "Новая партия по группам", subtitle: sub, columns: [{ header: "Группа", key: "k", type: "text", width: 26 }, { header: "Моделей", key: "n", type: "int", width: 10 }, { header: "Пришло, шт", key: "q", type: "int", width: 11 }, { header: "Продано, шт", key: "s", type: "int", width: 11 }, { header: "Осталось, шт", key: "l", type: "int", width: 11 }, { header: "Продано, %", key: "pct", type: "pct", width: 10 }, { header: "Выручка, сум", key: "r", type: "money", width: 15 }], rows: groups, total: { k: "Итого", n: items.length, q: total.q, s: total.sold, l: total.left, pct: total.pct, r: total.rev } },
  ];
}
void itemLabel; void discOf;
