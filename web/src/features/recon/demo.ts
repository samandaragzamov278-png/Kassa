// Тестовые данные «Сверки»: чеки Billz (bz_check) и записи Кассы по Сергели и C1, статусы автозагрузки sync/*. Всё выдуманное, id с префиксом bz_.
// Продажи Сергели в общем демо уже есть — здесь они повторяются с тем же id и с деталями (чек, товар, количество), чтобы сверка имела что сверять.
import { setDemoTable, type Row } from "../../lib/source";
import { demoRows } from "../../lib/demo";

const tash = () => new Date(Date.now() + 5 * 3600e3);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const PRODUCTS: [string, string, string, number][] = [
  ["Оправа детская «Мишка»", "BZ-DM-101", "Оправы", 180000], ["Оправа металл «Классик»", "BZ-MK-202", "Оправы", 250000], ["Оправа пластик TR", "BZ-TR-303", "Оправы", 200000],
  ["Линзы мягкие, 1 пара", "BZ-LN-404", "Линзы", 100000], ["Солнечные очки «Авиатор»", "BZ-SG-505", "Очки и оправы", 320000], ["Футляр и салфетка", "BZ-FT-606", "Аксессуары", 30000],
];
const payName = (p: string) => (p === "Наличные" ? "Наличные" : p === "Терминал" ? "Карта" : "QR/Payme");

function build() {
  const sales: Row[] = [], checks: Record<string, unknown>[] = [];
  const base = demoRows().filter((r) => r.col === "sales");
  let i = 0;
  const check = (id: string, point: string, day: string, k: number, sum: number, pay: string, pr: [string, string, string, number], qty: number) => {
    const t = new Date(Date.parse(day + "T05:00:00Z") + (k % 40) * 600e3 + k * 7e3).toISOString();
    checks.push({ order_id: "bz_o_" + id, point, d: day, t, num: "0100020" + String(10000 + k), type: "Продажа", total: sum, paid: sum, debt: 0, pays: [{ n: payName(pay), s: sum }],
      items: [{ n: pr[0], sku: pr[1], c: pr[2], q: qty, rq: 0, price: Math.round(sum / qty), sum, disc: 0 }], seller: point === "C1" ? "Дилнора" : "Зарнигор" });
  };
  base.forEach((r) => {
    const x = r.data as { date: string; point: string; sum: number; pay: string; createdAt: number };
    if (x.point !== "Сергели") return;
    i++; const pr = PRODUCTS[i % PRODUCTS.length], qty = pr[2] === "Линзы" ? 2 : 1; // линзы считаются парами: в чеке 2 шт = 1 пара
    const own = i % 17 === 5 ? "" : "bz_o_" + r.id; // у части записей Кассы нет номера чека Billz — они сопоставятся по сумме
    sales.push({ col: "sales", id: r.id, data: { ...x, product: pr[0], cat: pr[2], qty: 1, check: String(100 + i), ...(own ? { billz: own } : {}) } });
    if (i % 29 === 3) return; // нет в Billz (запись Кассы без чека)
    check(r.id, "Сергели", x.date, i, i % 31 === 7 ? x.sum + 20000 : x.sum, x.pay, pr, qty); // один чек с другой суммой
  });
  // C1: записи Кассы вносятся вручную, поэтому расхождения чаще
  const T = iso(tash());
  for (let k = 1; k <= 18; k++) {
    const day = iso(new Date(Date.parse(T + "T00:00:00Z") - k * 864e5)); if (new Date(day + "T12:00:00Z").getUTCDay() === 0) continue;
    for (let j = 0; j < 2; j++) {
      const n = k * 3 + j, pr = PRODUCTS[n % PRODUCTS.length], sum = pr[3] * (1 + (n % 2)), qty = pr[2] === "Линзы" ? 2 : 1, pay = ["Наличные", "Терминал", "QR/Payme"][n % 3], id = "bz_c1_" + n;
      if (!(k % 5 === 0 && j === 1)) sales.push({ col: "sales", id, data: { date: day, point: "C1", sum: k === 4 ? sum + 10000 : sum, pay, product: pr[0], cat: pr[2], qty: 1, check: String(500 + n), createdAt: Date.parse(day + "T09:00:00Z") + j * 3600e3 } });
      if (!(k % 7 === 0 && j === 0)) check(id, "C1", day, 500 + n, sum, pay, pr, qty);
    }
  }
  return { sales, checks };
}

const B = build();
setDemoTable("bz_check", B.checks);
/** чеки Billz этого демо — по ним остатки Billz считают «продано» (features/stock-billz/demo.ts) */
export const bzChecks = B.checks as { point: string; t: string; items: { sku: string; q: number }[] }[];
export const bzProducts = PRODUCTS;

export function demoExtra(): Row[] {
  const out: Row[] = [...B.sales];
  const T = iso(tash()), now = Date.now();
  // сверка продаж по дням для блока «Billz → Касса»
  const byDay = (p: string) => { const m = new Map<string, { billz: number; kassa: number }>();
    B.checks.filter((c) => c.point === p).forEach((c) => { const o = m.get(c.d as string) || { billz: 0, kassa: 0 }; o.billz += c.total as number; m.set(c.d as string, o); });
    B.sales.filter((s) => (s.data as { point: string }).point === p).forEach((s) => { const d = s.data as { date: string; sum: number }; const o = m.get(d.date) || { billz: 0, kassa: 0 }; o.kassa += d.sum; m.set(d.date, o); });
    return [...m].filter(([d]) => d <= T).sort((a, b) => a[0].localeCompare(b[0])).slice(-7).map(([d, v]) => ({ d, billz: v.billz, kassa: v.kassa, ok: Math.abs(v.billz - v.kassa) < 1 })); };
  const mk = (p: string, ok: boolean) => {
    const sc = byDay(p), good = { ok: true, at: now - 3 * 3600e3, to: T, salesCheck: sc, attention: [] as string[],
      sales: { checks: 4, sum: 1_240_000, debts: [] as { d: string; debt: number }[] },
      stock: { items: 118, qty: 1432, diffCount: 2, diffs: [{ n: "Оправа пластик TR", s: "BZ-TR-303", prev: 21, sold: 2, exp: 19, now: 20, d: 1 }, { n: "Футляр и салфетка", s: "BZ-FT-606", prev: 60, sold: 4, exp: 56, now: 52, d: -4 }] } };
    return ok ? good : { ok: false, at: now - 20 * 3600e3, error: "Billz не ответил вовремя (таймаут)", lastOk: { ...good, at: now - 44 * 3600e3 } };
  };
  out.push({ col: "sync", id: "billz-sergeli", data: mk("Сергели", true) });
  out.push({ col: "sync", id: "billz-c1", data: mk("C1", false) });
  out.push({ col: "sync", id: "billz-collect", data: { ok: true, at: now - 5 * 3600e3 } });
  return out;
}
