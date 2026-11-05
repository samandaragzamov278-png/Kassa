// Демо-данные: выдуманные продажи, расходы, выписка и платежи за последние ~2 месяца.
// Нужны, чтобы проверять раздел без настоящей базы. Реальных сумм здесь нет.
import type { Row } from "./source";

const iso = (d: Date) => d.toISOString().slice(0, 10);
function rnd(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

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
  // Касса: расходы дня, прочие, приходы, остаток Б/Ч, резерв, шаблоны, пересчёт
  const E = (id: string, data: Record<string, unknown>, ago = 864e5 * 2) => out.push({ col: "entries", id: "d" + id, data: { branch: "Общее", source: "manual", createdAt: now - ago, ...data } });
  for (let k = 0; k < 3; k++) {
    const m = new Date(start); m.setUTCMonth(m.getUTCMonth() + k); const d = (day: number) => iso(new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), Math.min(day, today.getUTCDate() > 0 && k === 2 ? Math.max(1, today.getUTCDate() - 1) : day))));
    E("tx" + k, { date: d(2), name: "Премиум за такси", type: "exp", cat: "op", amount: 45000, branch: "Премиум", source: "day" });
    E("dl" + k, { date: d(3), name: "Яшнабад за доставку линз", type: "exp", cat: "op", amount: 60000, fact: 50000, branch: "Яшнабад", source: "day" });
    E("wt" + k, { date: d(4), name: "Премиум за воду", type: "exp", cat: "op", amount: 30000, branch: "Премиум", source: "day" });
    E("ms" + k, { date: d(4), name: "Мастерам на C1", type: "exp", cat: "oth", amount: 2500000 });
    E("in" + k, { date: d(1), name: "Остаток прошлого месяца", type: "inc", amount: 1500000 });
    E("rk" + k, { date: d(5), name: "Пополнение резерва из кассы", type: "inc", kind: "rsv", from: "kassa", amount: 3000000 });
    E("rx" + k, { date: d(6), name: "Закуп линз из резерва", type: "exp", cat: "oth", fund: "reserve", amount: 1800000 });
  }
  const T = (id: string, data: Record<string, unknown>) => out.push({ col: "templates", id, data });
  T("t1", { type: "exp", name: "Премиум за доставку линз", amount: 45000, cat: "op", branch: "Премиум", order: 3 });
  T("t2", { type: "exp", name: "Яшнабад за доставку", amount: 40000, cat: "op", branch: "Яшнабад", order: 4 });
  T("t3", { type: "exp", name: "Мастерам на C1", amount: 0, cat: "oth", branch: "Общее", order: 3 });
  T("t4", { type: "inc", name: "Приход наличных", amount: 0, cat: "", branch: "Общее", order: 1 });
  out.push({ col: "cash", id: "current", data: { amount: 5200000, updatedAt: now - 6 * 3600e3, month: iso(today).slice(0, 7) } });
  return out;
}
