// Тестовые данные для Аналитики, Линз и Склада: продажи с товарами, цены линз, склад, новая партия, финансовые правила.
// Всё выдумано, id начинаются с an_. Подмешиваются в ?demo через src/lib/demoAll.ts.
import type { Row } from "../../lib/source";

const iso = (d: Date) => d.toISOString().slice(0, 10);
function rnd(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const FRAMES: [string, string, number][] = [["Оправа Ray-Ban RB3025", "Оправы", 1250000], ["Оправа Polar PL112", "Оправы", 540000], ["Оправа Vogue VO5051", "Оправы", 780000], ["Оправа Tiger TG204", "Оправы", 320000], ["Оправа Carrera CA8801", "Оправы", 1490000], ["Оправа Kids KD77", "Детские оправы", 260000], ["Оправа Flex FX310", "Оправы", 410000], ["Оправа Lumia LM900", "Оправы", 2150000]];
const SUN: [string, string, number][] = [["Очки Ray-Ban RB4171", "Солнцезащитные очки", 1650000], ["Очки Polar PS880", "Солнцезащитные очки", 720000]];
const LENS: [string, number][] = [["Линза Essilor 1.60 антиблик", 980000], ["Линза Seiko 1.67 блок", 1350000], ["Линза ET 1.56", 340000], ["Линза Star 1.50", 220000], ["Линза Тио 1.56 блок", 410000], ["Линза прогрессивные Essilor 1.60", 2300000], ["Линза хамелеон 1.56", 520000], ["Линза 1.74 для зрения", 3100000]];
const OTHER: [string, string, number][] = [["Контактные линзы Acuvue Oasys", "Контактные линзы", 380000], ["Раствор Biotrue 120 мл", "Растворы и капли", 95000], ["Футляр для очков", "Аксессуары", 35000], ["Ремонт оправы", "Ремонт и услуги", 60000]];
const PAYS = ["Наличные", "Терминал", "QR/Payme", "Перечисление"];

export function demoExtra(): Row[] {
  const r = rnd(41), out: Row[] = [], now = Date.now(), today = new Date(now + 5 * 3600e3);
  const start = new Date(today); start.setUTCDate(1); start.setUTCMonth(start.getUTCMonth() - 2);
  const pts = ["Премиум", "Яшнабад", "Сергели"], pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  let n = 0;
  const S = (data: Record<string, unknown>) => out.push({ col: "sales", id: "an_s" + ++n, data: { createdAt: now - 864e5 * 2 + n, ...data } });
  for (let d = new Date(start); iso(d) < iso(today); d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0) continue;
    const day = iso(d);
    for (const p of pts) {
      const visits = 2 + Math.floor(r() * 4);
      for (let v = 0; v < visits; v++) {
        const check = `${day.slice(5)}-${p[0]}${v + 1}`, pay = pick(PAYS), roll = r();
        const row = (product: string, cat: string, price: number, qty = 1, extra: Record<string, unknown> = {}) => {
          const disc = r() < 0.15 ? Math.round(price * qty * 0.08 / 1000) * 1000 : 0, sum = price * qty - disc;
          S({ date: day, point: p, cat, product, qty, price, sum, pay, pays: null, check, ...extra });
        };
        if (roll < 0.62) {
          const f = pick(FRAMES), l = pick(LENS);
          row(f[0], f[1], f[2]);
          row(l[0], "Очковые линзы", l[1], r() < 0.85 ? 2 : 1, r() < 0.2 ? { lens: { type: "Прогрессивные", index: "1.60", coat: "Антиблик" } } : {});
        } else if (roll < 0.74) { const s = pick(SUN); row(s[0], s[1], s[2]); }
        else if (roll < 0.86) { const l = pick(LENS); row(l[0], "Очковые линзы", l[1], 2); }
        else { const o = pick(OTHER); row(o[0], o[1], o[2], 1 + Math.floor(r() * 2)); }
      }
    }
  }
  // смешанная оплата и продажа без детализации
  S({ date: iso(new Date(today.getTime() - 864e5 * 3)), point: "Премиум", cat: "Оправы", product: "Оправа Polar PL112", qty: 1, price: 540000, sum: 540000, pay: "Смешанная", pays: { "Наличные": 240000, "Терминал": 300000 }, check: "mix1" });
  S({ date: iso(new Date(today.getTime() - 864e5 * 4)), point: "Яшнабад", cat: "Без детализации", product: "Продажи за день (без детализации)", qty: 1, price: 1800000, sum: 1800000, pay: "Наличные", check: "nd1" });

  const set = (id: string, data: Record<string, unknown>) => out.push({ col: "settings", id, data });
  set("lensCost", {
    rules: [{ k: "Essilor", re: "essilor", pair: 420000, src: "прайс поставщика" }, { k: "Seiko", re: "seiko", pair: 560000, src: "прайс поставщика" }, { k: "ET", re: "(^|[^a-zа-я])et([^a-zа-я]|$)", pair: 150000, src: "накладная" }, { k: "Star", re: "star", pair: 90000, src: "накладная" }, { k: "Тио", re: "тио", pair: 170000, src: "накладная" }, { k: "Прогрессивные", re: "прогресс", pair: null, src: "" }],
    bands: [{ k: "до 400 тыс", pair: 120000, max: 400000 }, { k: "до 1 млн", pair: 330000, max: 1000000 }, { k: "дороже", pair: 900000, max: null }], sergeli: "journal", updatedAt: now,
  });
  set("itemCost", { rules: [{ cat: "Растворы и капли", name: "раствор biotrue 120 мл", cost: 62000 }, { cat: "Аксессуары", name: "футляр для очков", cost: 12000 }, { cat: "Ремонт и услуги", name: "ремонт оправы", ratio: 0.3 }] });
  const M0 = iso(today).slice(0, 7);
  set("finance", { months: [M0], taxPct: 4, mgr: { points: ["Премиум"], share: 10 }, extra: { [M0]: [{ n: "Интернет и связь", a: 450000, b: "Общее", f: "р/с" }] } });
  // расходы Сергели «за линзы» (по журналу дня считается цена пары)
  for (let d = new Date(start); iso(d) < iso(today); d.setUTCDate(d.getUTCDate() + 3)) {
    if (d.getUTCDay() === 0) continue;
    out.push({ col: "entries", id: "an_e" + iso(d), data: { date: iso(d), name: "Сергели за линзы", type: "exp", cat: "op", branch: "Сергели", amount: 600000 + Math.floor(r() * 4) * 100000, source: "day", createdAt: now - 864e5 } });
  }

  // склад из файла
  const bd = (i: number) => iso(new Date(today.getTime() - 864e5 * i));
  const st: Record<string, unknown>[] = [];
  const stk: [string, string, string, number, number, number, string][] = [["RB3025", "Ray-Ban", "Оправы", 1250000, 700000, 6, "Склад"], ["PL112", "Polar", "Оправы", 540000, 260000, 14, "Склад"], ["VO5051", "Vogue", "Оправы", 780000, 410000, 5, "Премиум"], ["TG204", "Tiger", "Оправы", 320000, 150000, 22, "Склад"], ["CA8801", "Carrera", "Оправы", 1490000, 820000, 4, "Яшнабад"], ["FX310", "Flex", "Оправы", 410000, 0, 9, "Яшнабад"], ["RB4171", "Ray-Ban", "Солнцезащитные очки", 1650000, 900000, 7, "Премиум"], ["PS880", "Polar", "Солнцезащитные очки", 720000, 330000, 8, "Склад"]];
  stk.forEach(([m, g, c, p, cp, q, pt], i) => { const it: Record<string, unknown> = { k: "s" + i, m, s: "A" + (1000 + i), g, c, pt, q, p }; if (cp) it.cp = cp; st.push(it); });
  out.push({ col: "stock", id: "an_p0", data: { part: 0, parts: 1, file: "demo-sklad.xlsx", date: bd(25), uploadedAt: now - 864e5 * 25, total: st.length, items: st, soldFrom: bd(25), src: { "Склад": "ведомость склада", "Премиум": "пересчёт точки", "Яшнабад": "пересчёт точки" } } });
  // новая партия
  const bt: Record<string, unknown>[] = [];
  const bp: [string, string, number, number, number][] = [["LM900", "Lumia", 2150000, 1100000, 6], ["KD77", "Kids", 260000, 120000, 20], ["PL112", "Polar", 540000, 250000, 10], ["VO5051", "Vogue", 780000, 400000, 3], ["TG204", "Tiger", 320000, 140000, 12], ["XX555", "Nova", 450000, 200000, 8]];
  bp.forEach(([m, g, p, cp, q], i) => bt.push({ k: "i" + i, m, g, c: "Оправы", col: i % 2 ? "чёрный" : "коричневый", q, p, cp }));
  out.push({ col: "batches", id: "an_b1", data: { name: "Тестовая партия оправ", date: bd(18), file: "demo-partiya.xlsx", createdAt: now - 864e5 * 18, items: bt } });
  return out;
}
