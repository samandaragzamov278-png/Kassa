// Сверка «Продаж»: новый расчёт (src/features/sales/logic.ts) против старого (рабочий сайт, DOM собранного index.html).
// 1) npx tsx scripts/sales-parity.ts rows   — пишет scripts/.out/sales-rows.json, sales-scn.json и sales-new.json
// 2) python scripts/sales_old.py            — открывает собранный index.html на этих данных, пишет sales-old.json
// 3) npx tsx scripts/sales-parity.ts cmp    — сравнивает: «совпало N из N»
import fs from "node:fs";
import path from "node:path";
import { demoRows } from "../src/lib/demo";
import { toData, type Row } from "../src/lib/source";
import { demoExtra } from "../src/features/sales/demo";
import * as L from "../src/features/sales/logic";

const OUT = path.resolve(import.meta.dirname, ".out"); fs.mkdirSync(OUT, { recursive: true });
const mode = process.argv[2];
const T = L.todayTash();

/** выдуманные данные: общие продажи, продажи с товарами, план, особые случаи (названия оплат, долг, ноль, скидка, факт расхода) */
function rows(): Row[] {
  const cut = L.addD(T, -12), now = Date.now();
  // у Сергели последние 12 дней продаж нет — проверяем строку «за период в Billz нет ни одного чека»
  const r = demoRows().filter((x) => !(x.col === "sales" && (x.data as { point?: string }).point === "Сергели" && String((x.data as { date?: string }).date) >= cut));
  // в общих тестовых продажах нет товара и категории — дополняем, как в настоящей базе (старый сайт печатает «undefined» для пустых полей)
  r.forEach((x, i) => { if (x.col === "sales" && !(x.data as { product?: string }).product) { const s = x.data as { sum: number; cat?: string; product?: string; qty?: number; price?: number }; s.cat = ["Оправы", "Очковые линзы", "Аксессуары"][i % 3]; s.product = "Позиция " + (i % 7); s.qty = 1; s.price = s.sum; } });
  r.push(...demoExtra());
  const M0 = T.slice(0, 7), pm = L.addD(M0 + "-01", -1).slice(0, 7);
  r.push({ col: "settings", id: "plan", data: { months: { [M0]: { total: 240000000, shares: { "Премиум": 50, "Яшнабад": 30, "Сергели": 10, "C1": 10 } }, [pm]: { total: 200000000, shares: {} } }, off: [0], sellers: {} } });
  const S = (id: string, data: object) => r.push({ col: "sales", id, data: { createdAt: now - 5000, ...data } });
  const d1 = L.addD(T, -3), d2 = L.addD(T, -20);
  S("sales_x1", { date: d1, point: "Яшнабад", cat: "Оправы", product: "Оправа 1111", qty: 1, price: 300000, sum: 300000, pay: "Карта Humo", pays: null, check: "9" });
  S("sales_x2", { date: d1, point: "Яшнабад", cat: "Аксессуары", product: "Футляр", qty: 2, price: 30000, sum: 50000, pay: "Смешанная", pays: { "нал": 20000, "Payme": 30000 }, check: "9" });
  S("sales_x3", { date: d1, point: "Премиум", cat: "Оправы", product: "Подарок", qty: 1, price: 100000, sum: 0, pay: "Наличные", pays: null, check: "" });
  S("sales_x4", { date: d2, point: "C1", cat: "Очковые линзы", product: "Линзы Essilor", qty: 1, price: 900000, sum: 800000, pay: "Перечисление", pays: null, check: "3", debt: 100000 });
  S("sales_x5", { date: d2, point: "Сергели", cat: "Оправы", product: "Оправа bz", qty: 1, price: 410000, sum: 410000, pay: "QR/Payme", pays: null, check: "1" });
  r.push({ col: "entries", id: "sales_xe1", data: { date: d1, name: "Яшнабад за такси", type: "exp", cat: "op", amount: 70000, fact: 55000, branch: "Яшнабад", source: "day", createdAt: now } });
  r.push({ col: "entries", id: "sales_xe2", data: { date: d2, name: "C1 за мастера", type: "exp", cat: "op", amount: 90000, branch: "C1", source: "day", createdAt: now } });
  r.push({ col: "entries", id: "sales_xe3", data: { date: d1, name: "Остаток Б/Ч", type: "inc", kind: "bc", amount: 5, branch: "Премиум", source: "day", createdAt: now } }); // приход — не расход дня
  return r;
}

export interface Scn { name: string; preset?: string; from?: string; to?: string; point?: string; cat?: string; group: "day" | "week" | "month"; wd?: number[] }
const scenarios = (): Scn[] => [
  { name: "всё время · дни", preset: "all", group: "day" },
  { name: "всё время · недели", preset: "all", group: "week" },
  { name: "всё время · месяцы", preset: "all", group: "month" },
  { name: "этот месяц · дни", preset: "month", group: "day" },
  { name: "прошлый месяц · недели", preset: "prev", group: "week" },
  { name: "7 дней · дни (у Сергели пусто)", preset: "7d", group: "day" },
  { name: "сегодня", preset: "today", group: "day" },
  { name: "всё время · Яшнабад", preset: "all", point: "Яшнабад", group: "day" },
  { name: "всё время · категория Оправы", preset: "all", cat: "Оправы", group: "day" },
  { name: "свои даты · без субботы", from: L.addD(T, -40), to: L.addD(T, -10), group: "day", wd: [5] },
  { name: "свои даты · C1 · месяцы", from: L.addD(T, -45), to: L.addD(T, -1), point: "C1", group: "month" },
  { name: "всё время · Сергели", preset: "all", point: "Сергели", group: "week" },
];

const num0 = (n: number) => Math.round(n) || 0;
function compute(c: L.Ctx, s: Scn) {
  const rg = s.preset ? L.presetRange(s.preset, T) : { from: s.from!, to: s.to! };
  const F: L.Filter = { ...L.defaultFilter(T), ...rg, preset: s.preset || "custom", point: s.point || "all", cat: s.cat || "all" };
  const list = L.filtered(c, F), a = L.agg(list), pv = L.prevList(c, F), pa = pv ? L.agg(pv.list) : null, ex = L.expFiltered(c, F);
  const expSum = ex.reduce((x, e) => x + L.expVal(e), 0);
  const kpi = [[a.rev], [a.checks, a.n], [a.avg], [a.cash - expSum]].map((v) => v.map(num0));
  const cmp = [pa && pa.rev, pa && pa.checks, pa && pa.avg, undefined].map((p, i) => (i === 3 ? "" : L.cmpText([a.rev, a.checks, a.avg][i], p).text));
  // касса дня
  const dc: Record<string, unknown> = {};
  for (const b of L.dayCashBlocks(L.dayCashRows(list, ex, c.settings.points), c.settings.points, F)) {
    dc[b.pt] = b.rows.length
      ? { rows: b.rows.map((o) => [L.dShort(o.d) + " " + L.WD[L.wdIdx(o.d)], ...L.PAYS.map((p) => num0(o.pay[p] || 0)), num0(o.tot), num0(-o.exp), num0(o.after)]), foot: [...L.PAYS.map((p) => num0(b.pay[p])), num0(b.tot), num0(-b.exp), num0(b.after)] }
      : { empty: b.empty === "billz" ? "за период в Billz нет ни одного чека" : "за период продаж нет" };
  }
  // таблица статистики
  const S = L.statsOf(c, F, list, s.group, { from: "", to: "", wd: s.wd || [] });
  const period = { head: S.rows.length ? ["", ...S.pts, "Итого", "Чеков", "Ср. чек"] : [], rows: S.desc.map((r) => [L.periodLabel(r.k, s.group) + (s.group === "day" ? " " + L.WD[L.wdIdx(r.k)] : ""), ...S.pts.map((p) => num0(r.by[p] || 0)), num0(r.tot), r.ch, num0(r.ch ? r.tot / r.ch : 0)]),
    foot: S.rows.length ? [...S.pts.map((p) => num0(S.ptTot[p])), num0(S.sa.rev), S.sa.checks, num0(S.sa.checks ? S.sa.avg : 0)] : [] };
  // календарь: месяц «сегодня» и предыдущий
  const cal = [0, 1].map((k) => {
    const M = k ? L.addD(T.slice(0, 7) + "-01", -1).slice(0, 7) : T.slice(0, 7);
    const o = L.calOf(c, F, M, "");
    if (o.M !== M) return null; // этого месяца в календаре нет
    const days = Object.entries(o.byD).sort().map(([d, x]) => d + ":" + num0(x.rev));
    const day = L.calDayOf(c, F, o.base, T.startsWith(M) ? T : o.M + "-01");
    const P = o.P ? [num0(o.P.tot), Math.round(o.P.fact / o.P.tot * 100), num0(o.P.fact), num0(Math.abs(o.P.tot - o.P.fact)), num0(o.tgt), o.P.K.past || o.P.fact >= o.P.tot ? 0 : num0(o.P.S.needDay)] : null;
    return { M, total: num0(o.total), wd: o.wd, avg: num0(o.wd ? o.total / o.wd : 0), days, P, today: k ? null : { rev: num0(day.rev), ck: day.ck } };
  });
  // журнал (день по умолчанию)
  const J = L.journalOf(c, F, list, "");
  const journal = { day: J.day, n: J.dayList.length, tot: num0(J.tot), cols: J.cols.map((o) => ({ pt: o.pt, n: o.items.length, sum: num0(o.sum), pays: L.PAYS.filter((p) => o.pay[p]).map((p) => num0(o.pay[p])), ex: num0(o.ex), bch: o.ex || o.pay["Наличные"] ? num0((o.pay["Наличные"] || 0) - o.ex) : null })) };
  return { kpi, cmp, dc, period, cal, journal, csv: L.csvOf(c, F).text, sheets: L.sheetsOf(c, F).map((sh) => ({ name: sh.name, rows: [sh.head, ...sh.rows, ...(sh.total ? [sh.total] : [])] })) };
}

if (mode === "rows") {
  const R = rows(); fs.writeFileSync(path.join(OUT, "sales-rows.json"), JSON.stringify(R));
  const sc = scenarios(); fs.writeFileSync(path.join(OUT, "sales-scn.json"), JSON.stringify(sc));
  const c = L.ctxOf(toData([...R].sort((a, b) => (a.col < b.col ? -1 : a.col > b.col ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0)))); // порядок как в базе: col, id
  fs.writeFileSync(path.join(OUT, "sales-new.json"), JSON.stringify(sc.map((s) => compute(c, s)), null, 1));
  console.log("строк", R.length, "· продаж", c.sales.length, "· сценариев", sc.length);
} else {
  const sc: Scn[] = JSON.parse(fs.readFileSync(path.join(OUT, "sales-scn.json"), "utf8"));
  const a = JSON.parse(fs.readFileSync(path.join(OUT, "sales-old.json"), "utf8")), b = JSON.parse(fs.readFileSync(path.join(OUT, "sales-new.json"), "utf8"));
  let ok = 0, n = 0; const bad: string[] = [];
  const cmp = (k: string, x: unknown, y: unknown) => { n++; if (JSON.stringify(x) === JSON.stringify(y)) ok++; else bad.push(`${k}: было ${JSON.stringify(x)} · стало ${JSON.stringify(y)}`.slice(0, 600)); };
  sc.forEach((s, i) => {
    const o = a[i], w = b[i], p = s.name + " · ";
    cmp(p + "плитки", o.kpi, w.kpi); cmp(p + "сравнение с прошлым периодом", o.cmp, w.cmp);
    cmp(p + "точки в кассе дня", Object.keys(o.dc), Object.keys(w.dc));
    for (const pt of Object.keys(w.dc)) cmp(`${p}касса дня ${pt}`, o.dc[pt], w.dc[pt]);
    cmp(p + "таблица статистики", o.period, w.period);
    w.cal.forEach((cw: unknown, k: number) => cmp(`${p}календарь ${k ? "прошлый" : "этот"} месяц`, o.cal[k], cw));
    cmp(p + "журнал дня", o.journal, w.journal);
    if (o.csv != null) cmp(p + "выгрузка CSV", o.csv, w.csv);
    if (o.sheets) for (const sh of w.sheets) cmp(`${p}Excel, лист «${sh.name}»`, o.sheets[sh.name], sh.rows);
  });
  console.log(`совпало ${ok} из ${n}`); bad.forEach((x) => console.log(" ✗ " + x)); process.exit(bad.length ? 1 : 0);
}
