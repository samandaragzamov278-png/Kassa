// Тестовые данные раздела «Продажи»: выдуманные позиции с товарами, чеками, смешанной оплатой, скидкой и долгом.
// Общие продажи (без товаров) лежат в lib/demo.ts; эти — для календаря, журнала и «По товарам». Реальных сумм здесь нет.
import type { Row } from "../../lib/source";

const iso = (d: Date) => d.toISOString().slice(0, 10);
function rnd(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function demoExtra(): Row[] {
  const r = rnd(11), out: Row[] = [], now = Date.now(), today = new Date(now + 5 * 3600e3);
  const start = new Date(today); start.setUTCDate(1); start.setUTCMonth(start.getUTCMonth() - 1);
  const CAT: [string, string, number][] = [
    ["Оправы", "Оправа 5801", 320000], ["Оправы", "Оправа 7708", 450000], ["Детские оправы", "Детская оправа 301", 180000], ["Очковые линзы", "Линзы 1.61 блю-блок", 380000],
    ["Очковые линзы", "Линзы Seiko 1.67", 760000], ["Солнцезащитные очки", "Солнцезащитные очки 9102", 520000], ["Контактные линзы", "Контактные линзы Acuvue", 250000],
    ["Растворы и капли", "Раствор 360 мл", 70000], ["Аксессуары", "Футляр", 30000], ["Ремонт и услуги", "Замена носоупора", 20000],
  ];
  const pays = ["Наличные", "Терминал", "QR/Payme", "Перечисление"];
  let n = 0;
  for (let d = new Date(start); iso(d) < iso(today); d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0) continue;
    const day = iso(d);
    for (const p of ["Премиум", "Яшнабад", "C1"]) {
      const checks = 1 + Math.floor(r() * 4);
      for (let c = 1; c <= checks; c++) {
        const items = 1 + Math.floor(r() * 2), pay = pays[Math.floor(r() * 4)];
        for (let i = 0; i < items; i++) {
          const [cat, product, price] = CAT[Math.floor(r() * CAT.length)], qty = r() < 0.12 ? 2 : 1, full = price * qty, disc = r() < 0.15 ? Math.round(full * 0.1 / 1000) * 1000 : 0, sum = full - disc;
          const mixed = !i && r() < 0.18 && sum >= 100000, data: Record<string, unknown> = { date: day, point: p, cat, product, qty, price, sum, check: String(c), createdAt: now - 864e5 + ++n };
          if (mixed) { const a = Math.round(sum / 2 / 1000) * 1000; data.pay = "Смешанная"; data.pays = { "Наличные": a, "Терминал": sum - a }; } else { data.pay = pay; data.pays = null; }
          if (!mixed && r() < 0.05) data.debt = 50000;
          if (cat === "Очковые линзы" && r() < 0.5) data.lens = { type: "Однофокальные", index: "1.61", coat: "Блю-блок" };
          out.push({ col: "sales", id: "sales_" + n, data });
        }
      }
    }
    if (d.getUTCDay() === 3) out.push({ col: "entries", id: "sales_exp_" + day, data: { date: day, name: "C1 за доставку линз", type: "exp", cat: "op", amount: 40000, branch: "C1", source: "day", createdAt: now - 864e5 } });
  }
  out.push({ col: "photos", id: "sales_ph1", data: { name: "лист_премиум.jpg", kind: "image", point: "Премиум", date: iso(start), status: "done", salesCount: 14, uploadedAt: now - 864e5 * 5 } });
  out.push({ col: "photos", id: "sales_ph2", data: { name: "тетрадь.pdf", kind: "pdf", point: "", date: iso(today), status: "new", uploadedAt: now - 864e5 } });
  return out;
}
