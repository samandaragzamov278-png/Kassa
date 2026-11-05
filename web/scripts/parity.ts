// Сверка: старый раздел «Платежи» (dev/pay/pay.js) и новый (src/features/pay/logic.ts) на одних данных.
// Запуск: npx tsx scripts/parity.ts — печатает «совпало N из N» или список расхождений.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { demoRows } from "../src/lib/demo";
import { toData } from "../src/lib/source";
import * as L from "../src/features/pay/logic";

const rows = demoRows();
// пара ручных отметок и своя сумма на месяц, чтобы проверить и их
const T = L.todayTash(), M0 = T.slice(0, 7);
rows.push({ col: "paymarks", id: "pay_buh_" + M0, data: { amount: 1000000, date: T, at: Date.now() - 1000 } });
rows.push({ col: "paymarks", id: "pay_billz_" + L.addM(M0, -1), data: { plan: 1200000, at: Date.now() - 1000 } });
rows.push({ col: "paymarks", id: "pay_debt_" + M0, data: { amount: 3000000, date: T, at: Date.now() - 1000 } });
const data = toData(rows);

// старый код — в песочнице с подставными window/document
const src = fs.readFileSync(path.resolve(import.meta.dirname, "../../dev/pay/pay.js"), "utf8");
const byCol = (c: string) => rows.filter((r) => r.col === c);
const snap = (c: string) => ({ forEach: (f: (d: { id: string; data: () => unknown }) => void) => byCol(c).forEach((r) => f({ id: r.id, data: () => JSON.parse(JSON.stringify(r.data)) })) });
const db = { collection: (c: string) => ({ onSnapshot: (cb: (s: unknown) => void) => { cb(snap(c)); } }), doc: () => ({ set: async () => {}, delete: async () => {} }) };
const repDocs: Record<string, unknown> = {}; byCol("report").forEach((r) => (repDocs[r.id] = r.data));
const win: Record<string, unknown> = {
  claude: { use: async () => db },
  __S: { sales: data.sales, repDocs, settings: { points: data.points }, pointColor: () => "#000" },
  __K: { entries: data.entries },
};
const ctx = vm.createContext({ window: win, document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] }, localStorage: { getItem: () => null, setItem() {} }, setTimeout, requestAnimationFrame: () => 0, console, Date, Math, JSON, Object, Array, String, Number, Promise, isFinite, parseFloat });
vm.runInContext(src, ctx);

setTimeout(() => {
  const P = win.__PAY as { monthRows: (M: string) => L.MonthRow[]; debtOf: (it: unknown) => { total: number; paid: number; left: number | null } };
  let ok = 0, n = 0; const bad: string[] = [];
  for (let k = -2; k <= 1; k++) {
    const M = L.addM(M0, k), a = P.monthRows(M), b = L.monthRows(data, M, T);
    n++; if (a.length !== b.length) { bad.push(`${M}: строк ${a.length} и ${b.length}`); continue; } ok++;
    a.forEach((x, i) => { const y = b[i]; n++;
      const f = (r: L.MonthRow) => [r.it.id, r.due, r.am.a, r.paid, r.left, r.st].join("|");
      if (f(x) === f(y)) ok++; else bad.push(`${M}: было ${f(x)} · стало ${f(y)}`); });
  }
  L.list(data).filter((it) => it.kind === "debt").forEach((it) => { n++; const a = P.debtOf((win as never as { __PAY: { items: Record<string, unknown> } }).__PAY.items[it.id]), b = L.debtOf(data, it, T);
    const f = (r: { total: number; paid: number; left: number | null }) => [r.total, r.paid, r.left].join("|"); if (f(a) === f(b)) ok++; else bad.push(`долг ${it.id}: было ${f(a)} · стало ${f(b)}`); });
  console.log(`совпало ${ok} из ${n}`); bad.forEach((x) => console.log(" ✗ " + x));
  process.exit(bad.length ? 1 : 0);
}, 50);
