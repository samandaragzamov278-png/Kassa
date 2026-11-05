// Сверка Кассы: новый расчёт (src/features/kassa/logic.ts) против старого (рабочий сайт, window.__K).
// 1) npx tsx scripts/kassa-parity.ts rows   — пишет scripts/.out/rows.json и new.json
// 2) python scripts/kassa_old.py            — открывает собранный index.html на этих данных, пишет old.json
// 3) npx tsx scripts/kassa-parity.ts cmp    — сравнивает: «совпало N из N»
import fs from "node:fs";
import path from "node:path";
import { demoRows } from "../src/lib/demo";
import { toData, type Row } from "../src/lib/source";
import * as K from "../src/features/kassa/logic";

const OUT = path.resolve(import.meta.dirname, ".out"); fs.mkdirSync(OUT, { recursive: true });
const mode = process.argv[2];

function rows(): Row[] {
  const r = demoRows(), now = Date.now(), T = K.todayTash(), M0 = T.slice(0, 7);
  const d = (k: number, day: number) => { const x = new Date(Date.UTC(+M0.slice(0, 4), +M0.slice(5, 7) - 1 + k, day)); return x.toISOString().slice(0, 10); };
  const E = (id: string, data: object, ago = 864e5 * 3) => r.push({ col: "entries", id, data: { branch: "Общее", source: "manual", createdAt: now - ago, ...data } });
  for (const k of [-2, -1, 0]) {
    E("op1" + k, { date: d(k, 2), name: "Премиум за такси", type: "exp", cat: "op", amount: 45000, branch: "Премиум", source: "day" });
    E("op2" + k, { date: d(k, 3), name: "Яшнабад за доставку линз", type: "exp", cat: "op", amount: 60000, fact: 50000, branch: "Яшнабад", source: "day" });
    E("sg" + k, { date: d(k, 3), name: "Сергели за мастера", type: "exp", cat: "op", amount: 40000, branch: "Сергели", source: "day" });
    E("oth" + k, { date: d(k, 4), name: "Мастерам на C1", type: "exp", cat: "oth", amount: 2500000 });
    E("inc" + k, { date: d(k, 1), name: "Остаток прошлого месяца", type: "inc", amount: 1500000 });
    E("bc" + k, { date: d(k, 2), name: "Остаток Б/Ч Премиум", type: "inc", kind: "bc", amount: 900000, source: "bc", createdAt: 370 });
    E("rk" + k, { date: d(k, 5), name: "Пополнение резерва из кассы", type: "inc", kind: "rsv", from: "kassa", amount: 3000000 });
    E("ro" + k, { date: d(k, 5), name: "Пополнение резерва со стороны", type: "inc", kind: "rsv", from: "out", amount: 5000000 });
    E("rx" + k, { date: d(k, 6), name: "Закуп линз из резерва", type: "exp", cat: "oth", fund: "reserve", amount: 1800000 });
  }
  // пересчёты: прошлый месяц — с месяцем в записи, позапрошлый — без (месяц ищется по записям), текущий — cash/current, и расход после пересчёта
  r.push({ col: "cashlog", id: "cl1", data: { amount: 4200000, expected: 0, at: Date.parse(d(-1, 27) + "T14:00:00Z"), month: d(-1, 1).slice(0, 7) } });
  r.push({ col: "cashlog", id: "cl2", data: { amount: 3100000, expected: 0, at: Date.parse(d(-2, 26) + "T13:00:00Z") } });
  const at = now - 3 * 3600e3;
  r.push({ col: "cash", id: "current", data: { amount: 2700000, updatedAt: at, month: M0 } });
  E("after", { date: T, name: "Премиум за воду", type: "exp", cat: "op", amount: 30000, branch: "Премиум", source: "manual" }, 3600e3);
  r.push({ col: "bc", id: "bcx", data: { date: d(-1, 10), p: 1234000, y: 567000 } });
  r.push({ col: "templates", id: "t1", data: { type: "exp", name: "Премиум за доставку линз", amount: 45000, cat: "op", branch: "Премиум", order: 3 } });
  return r;
}
const pick = (c: K.Kassa) => ({ expected: c.expected, bcT: c.bcT, bcP: c.bcP, bcY: c.bcY, bcC: c.bcC, sInc: c.sInc, sOp: c.sOp, sOth: c.sOth, sRsvMove: c.sRsvMove, sRsvExp: c.sRsvExp, saved: c.saved, days: c.days.length });

if (mode === "rows") {
  const R = rows(); fs.writeFileSync(path.join(OUT, "rows.json"), JSON.stringify(R));
  const data = toData(R), res: Record<string, unknown> = {};
  for (const M of K.kMonths(data)) { const c = K.compute(data, M), rec = K.recFor(data, M); res[M] = { ...pick(c), actual: rec ? K.cashState(data, rec, M).actual : null }; }
  res.reserve = K.reserve(data).bal; res.months = K.kMonths(data);
  fs.writeFileSync(path.join(OUT, "new.json"), JSON.stringify(res, null, 1)); console.log("месяцев", (res.months as string[]).length);
} else {
  const a = JSON.parse(fs.readFileSync(path.join(OUT, "old.json"), "utf8")), b = JSON.parse(fs.readFileSync(path.join(OUT, "new.json"), "utf8"));
  let ok = 0, n = 0; const bad: string[] = [];
  const cmp = (k: string, x: unknown, y: unknown) => { n++; if (JSON.stringify(x) === JSON.stringify(y)) ok++; else bad.push(`${k}: было ${JSON.stringify(x)} · стало ${JSON.stringify(y)}`); };
  cmp("месяцы", a.months, b.months); cmp("резерв", a.reserve, b.reserve);
  for (const M of b.months as string[]) for (const k of Object.keys(b[M])) cmp(`${M} ${k}`, a[M]?.[k], b[M][k]);
  console.log(`совпало ${ok} из ${n}`); bad.forEach((x) => console.log(" ✗ " + x)); process.exit(bad.length ? 1 : 0);
}
