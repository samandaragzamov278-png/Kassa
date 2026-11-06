// Сверка «Отчёта р/с», «Сверки» и фискальных модулей: новые расчёты против старых (рабочий сайт, window.__S / __RS / __BZ / __FM).
// 1) npx tsx scripts/report-parity.ts rows   — пишет scripts/.out/rp_rows.json, rp_bz.json и rp_new.json
// 2) uv run --no-project --with playwright python -X utf8 scripts/report_old.py   — старый сайт на этих данных, пишет rp_old.json
// 3) npx tsx scripts/report-parity.ts cmp    — сравнение: «совпало N из N»
import fs from "node:fs";
import path from "node:path";
import { demoRows } from "../src/lib/demo";
import { toData, type Row } from "../src/lib/source";
import { demoExtra as repDemo } from "../src/features/report/demo";
import { demoExtra as bzDemo, bzChecks } from "../src/features/recon/demo";
import * as L from "../src/features/report/logic";
import * as Z from "../src/features/recon/logic";

const OUT = path.resolve(import.meta.dirname, ".out"); fs.mkdirSync(OUT, { recursive: true });
const mode = process.argv[2], T = L.todayTash();
const addD = (s: string, n: number) => new Date(Date.parse(s + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);

function rows(): Row[] {
  const r = [...demoRows(), ...repDemo(), ...bzDemo()], now = Date.now();
  const d1 = addD(T, -1), d2 = addD(T, -2), d3 = addD(T, -3);
  // смешанная оплата, продажа с долгом, погашение долга, запись без детализации, продажа другой точки (Яшнабад / C1), строка-«Перечисление»
  r.push({ col: "sales", id: "rp_mix", data: { date: d1, point: "Премиум", sum: 900000, pay: "Смешанная", pays: { "Наличные": 400000, "Терминал": 300000, "QR/Payme": 200000 }, createdAt: now - 5e5 } });
  r.push({ col: "sales", id: "rp_debt", data: { date: d2, point: "Сергели", sum: 600000, debt: 150000, pay: "Наличные", qty: 1, product: "Линзы мягкие", cat: "Линзы", check: "901", createdAt: now - 6e5 } });
  r.push({ col: "sales", id: "rp_paid", data: { date: d2, point: "Сергели", sum: 150000, pay: "Терминал", cat: "Погашения долгов", createdAt: now - 4e5 } });
  r.push({ col: "sales", id: "rp_nodet", data: { date: d3, point: "C1", sum: 700000, pay: "Наличные", cat: "Без детализации", createdAt: now - 7e5 } });
  r.push({ col: "sales", id: "rp_tr", data: { date: d3, point: "Яшнабад", sum: 2000000, pay: "Перечисление", createdAt: now - 8e5 } });
  r.push({ col: "sales", id: "rp_c1", data: { date: d1, point: "C1", sum: 450000, pay: "QR/Payme", qty: 1, product: "Оправа", cat: "Оправы", check: "902", createdAt: now - 9e5 } });
  // день с поправкой по долгам в другой точке (колонка «C1» в отчёте оптика) и день только с выпиской
  r.push({ col: "report", id: d3, data: { date: d3, rsStart: 1000000, rsEnd: 1500000, grossCash: 500, bank: [{ n: "Комиссия", a: 5000 }, { n: "Налог с оборота", a: 120000.5, c: "Прочее" }], adj: { "C1": { c: 100000, t: 50000, q: 20000, e: 0 } }, adjNote: "тест" } });
  r.push({ col: "entries", id: "rp_e1", data: { date: d1, name: "такси", type: "exp", cat: "op", amount: 40000, fact: 35000, branch: "Премиум", source: "day", createdAt: now } });
  r.push({ col: "entries", id: "rp_e2", data: { date: d1, name: "Яшнабад вода", type: "exp", cat: "op", amount: 20000, branch: "Яшнабад", source: "day", createdAt: now } });
  return r;
}
const bzAll = () => [
  ...bzChecks,
  { order_id: "bz_ret", point: "Сергели", d: addD(T, -1), t: addD(T, -1) + "T08:00:00Z", num: "010002099999", type: "Возврат", total: 100000, items: [{ n: "Оправа", sku: "X1", c: "Оправы", q: 1, sum: 100000 }] },
  { order_id: "bz_dbt", point: "C1", d: addD(T, -2), t: addD(T, -2) + "T08:00:00Z", num: "010002099998", type: "Продажа", total: 300000, debt: 100000, items: [{ n: "Линзы", sku: "L1", c: "Линзы", q: 4, sum: 300000 }, { n: "Оправа", sku: "O1", c: "Оправы", q: 1, ret: true, sum: 0 }] },
];
const r2 = (x: number | null | undefined) => (x == null ? null : Math.round(x * 100) / 100);

if (mode === "rows") {
  const R = rows(); fs.writeFileSync(path.join(OUT, "rp_rows.json"), JSON.stringify(R)); fs.writeFileSync(path.join(OUT, "rp_bz.json"), JSON.stringify(bzAll()));
  const d = toData(R), res: Record<string, unknown> = {}, ms = L.rpMonths(d, T), allDays = L.rpAllDays(d, T);
  res.months = ms; res.days = allDays; res.T = T;
  ms.forEach((m) => {
    const c = L.rpCalc(d, m, true, T);
    res["rp " + m] = { days: c.days, pts: c.pts, rows: c.rows.map((x) => ({ d: x.d, tot: x.tot, cum: x.cum, bankSum: r2(x.bankSum), bcSum: x.bcSum, bank: x.bank.map((b) => [b.n, b.a]), bc: x.bc.map((b) => [b.n, b.a, b.p]), pts: Object.fromEntries(c.pts.map((p) => [p, x.pts[p]])) })) };
  });
  res.gn = Object.fromEntries(allDays.map((x) => [x, L.rpGN(d, x, T)]));
  res.stat = Object.fromEntries(allDays.map((x) => [x, L.rpStat(d, x, T)]));
  res.rsMonths = L.rsMonths(d);
  [...L.rsMonths(d), "all"].forEach((m) => { const c = L.rsCalc(d, m); res["rs " + m] = { n: c.days.length, start: c.start, startD: c.startD, end: c.end, endD: c.endD, in: r2(c.in), out: r2(c.out), cat: c.cat, outDays: c.outDays }; });
  // сверка Billz ↔ Касса за 60 дней
  const f = addD(T, -60), checks = bzAll().filter((c) => c.d >= f && c.d <= T) as unknown as Z.BzCheck[], ks = Z.kassaRows(d, f, T);
  res.recon = Z.dayTable(checks, ks).map((o) => ({ d: o.d, p: o.p, bn: o.bn, bq: o.bq, bs: o.bs, kn: o.kn, kq: o.kq, ks: o.ks, nodet: o.nodet, debt: o.debt, ds: o.ds, dq: o.dq, ok: o.ok }));
  // фискальные модули: выручка Кассы за день по точкам и гросс
  const fmr: Record<string, unknown> = {};
  for (const day of allDays.slice(-30)) for (const p of d.points) { const k = L.fmKassa(d, day, p), x = L.fmDay(d, day, p); fmr[day + "|" + p] = { c: k.c, n: k.n, e: k.e, k: k.k, x, on: L.fmIsOn(d, p), g: L.fmGross(d, p, day) }; }
  res.fm = fmr;
  fs.writeFileSync(path.join(OUT, "rp_new.json"), JSON.stringify(res, null, 1)); console.log("месяцев", ms.length, "дней", allDays.length);
} else {
  const a = JSON.parse(fs.readFileSync(path.join(OUT, "rp_old.json"), "utf8")), b = JSON.parse(fs.readFileSync(path.join(OUT, "rp_new.json"), "utf8"));
  let ok = 0, n = 0; const bad: string[] = [];
  const cmp = (k: string, x: unknown, y: unknown) => { n++; if (JSON.stringify(x) === JSON.stringify(y)) ok++; else bad.push(`${k}: было ${JSON.stringify(x)?.slice(0, 160)} · стало ${JSON.stringify(y)?.slice(0, 160)}`); };
  cmp("месяцы", a.months, b.months); cmp("дни", a.days, b.days); cmp("месяцы р/с", a.rsMonths, b.rsMonths);
  for (const m of b.months) { const A = a["rp " + m], B = b["rp " + m]; cmp(`отчёт оптика ${m}: дни`, A?.days, B.days); cmp(`отчёт оптика ${m}: точки`, A?.pts, B.pts);
    B.rows.forEach((x: { d: string }, i: number) => cmp(`отчёт оптика ${x.d}`, A?.rows?.[i], x)); }
  for (const d of b.days) { cmp(`гросс безнал ${d}`, a.gn[d], b.gn[d]); cmp(`статус дня ${d}`, a.stat[d], b.stat[d]); }
  for (const m of [...b.rsMonths, "all"]) cmp(`р/с ${m}`, a["rs " + m], b["rs " + m]);
  cmp("сверка Billz: число строк", a.recon.length, b.recon.length);
  b.recon.forEach((x: { d: string; p: string }, i: number) => cmp(`сверка Billz ${x.d} ${x.p}`, a.recon[i], x));
  for (const k of Object.keys(b.fm)) cmp(`фискальные модули ${k}`, a.fm[k], b.fm[k]);
  console.log(`совпало ${ok} из ${n}`); bad.slice(0, 25).forEach((x) => console.log(" ✗ " + x)); process.exit(bad.length ? 1 : 0);
}
