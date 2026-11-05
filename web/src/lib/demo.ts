// Демо-данные: выдуманные продажи, расходы, выписка и платежи за последние ~2 месяца.
// Нужны, чтобы проверять раздел без настоящей базы. Реальных сумм здесь нет.
import type { Row } from "./source";

const iso = (d: Date) => d.toISOString().slice(0, 10);
function rnd(seed: number) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function demoRows(): Row[] {
  const r = rnd(7), out: Row[] = [], now = Date.now(), today = new Date(now + 5 * 3600e3);
  const start = new Date(today); start.setUTCDate(1); start.setUTCMonth(start.getUTCMonth() - 2);
  const pays = ["Наличные", "Терминал", "QR/Payme"];
  let n = 0;
  for (let d = new Date(start); iso(d) < iso(today); d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0) continue;
    const day = iso(d);
    for (const p of ["Премиум", "Яшнабад", "Сергели"]) {
      const k = 2 + Math.floor(r() * 6);
      for (let i = 0; i < k; i++) out.push({ col: "sales", id: "s" + ++n, data: { date: day, point: p, sum: 50000 * (2 + Math.floor(r() * 18)), pay: pays[Math.floor(r() * 3)], createdAt: now - 864e5 } });
    }
    const bank: { a: number; n: string }[] = [{ a: 9000, n: "Комиссия банка" }];
    const dd = d.getUTCDate();
    if (dd === 2) bank.push({ a: 6000000, n: "Оплата кредита 500$" }, { a: 8000000, n: "Зарплата за прошлый месяц" });
    if (dd === 3) bank.push({ a: 900000, n: "Оплата Billz" });
    if (dd === 12) bank.push({ a: 4300000, n: "Налог с оборота" });
    if (dd === 16) bank.push({ a: 10000000, n: "Оплата за аренду" });
    out.push({ col: "report", id: day, data: { date: day, bank } });
    if (dd === 10) out.push({ col: "entries", id: "e" + day, data: { date: day, name: "Бухгалтеру за месяц", type: "exp", cat: "oth", branch: "Общее", amount: 2500000 } });
    if (dd === 15) out.push({ col: "entries", id: "r" + day, data: { date: day, name: "За аренду Яшнабад", type: "exp", cat: "op", branch: "Общее", amount: 6000000 } });
  }
  const P = (id: string, data: object) => out.push({ col: "payments", id, data: { ...data, on: true, createdAt: now - 9e5 + id.length } });
  const from = iso(start).slice(0, 7);
  P("pay_credit", { name: "Кредит", kind: "debt", cat: "credit", usd: 500, rate: 12000, day: 2, freq: "month", src: "bank", point: "Общее", match: "кредит", totalUsd: 50000, from });
  P("pay_rent_p", { name: "Аренда Премиум", kind: "fixed", cat: "rent", amount: 10000000, day: 15, freq: "month", src: "bank", point: "Премиум", match: "аренд,-ндфл", from });
  P("pay_rent_y", { name: "Аренда Яшнабад", kind: "fixed", cat: "rent", usd: 500, rate: 12000, day: 15, freq: "month", src: "cash", point: "Яшнабад", match: "аренд,-ндфл", from });
  P("pay_tax", { name: "Налог с оборота", kind: "fixed", cat: "tax", auto: "tax", pct: 4, day: 10, freq: "month", src: "bank", point: "Общее", match: "налог с оборота", from });
  P("pay_billz", { name: "Billz", kind: "fixed", cat: "service", amount: 900000, day: 3, freq: "month", src: "bank", point: "Общее", match: "billz", from });
  P("pay_zp", { name: "Зарплаты через банк", kind: "fixed", cat: "salary", amount: 8000000, day: 2, freq: "month", src: "bank", point: "Общее", match: "зарплат", from });
  P("pay_buh", { name: "Бухгалтер", kind: "fixed", cat: "salary", amount: 2500000, day: 10, freq: "month", src: "cash", point: "Общее", match: "бухгалт", from });
  P("pay_jek", { name: "ЖЭК", kind: "fixed", cat: "utility", amount: 1500000, day: 3, freq: "year", mon: 9, src: "bank", point: "Общее", match: "жэк", from });
  P("pay_debt", { name: "Долг поставщику линз", kind: "debt", cat: "debt", total: 15000000, src: "cash", point: "Общее" });
  const nx = new Date(today); nx.setUTCDate(20);
  P("pay_plan", { name: "Предоплата за линзы", kind: "plan", cat: "other", amount: 12000000, date: iso(nx), src: "bank", point: "Общее" });
  out.push({ col: "settings", id: "sales", data: { points: ["Премиум", "Яшнабад", "Сергели", "C1"] } });
  return out;
}
