// Тестовые данные Главной (выдуманные): продажи с товарами и чеками, новая партия, правила себестоимости линз.
import type { Row } from "@/lib/source";

function rnd(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const FRAMES: [string, number, number][] = [["Оправа Классика М-12", 450000, 180000], ["Оправа Лайт Т-7", 380000, 150000], ["Оправа Ретро К-33", 520000, 210000], ["Оправа Детская Д-5", 300000, 120000]];
const LENSES: [string, number][] = [["Линзы Seiko 1.60 антиблик", 780000], ["Линзы Тио 1.56 блю-блок", 420000], ["Линзы Хамелеон 1.56", 560000]];
const OTHER: [string, string, number][] = [["Контактные линзы Дневные 30 шт", "Контактные линзы", 260000], ["Раствор для линз 360 мл", "Растворы и капли", 70000], ["Салфетка микрофибра", "Аксессуары", 15000]];

export function demoExtra(): Row[] {
  const r = rnd(11), out: Row[] = [], now = Date.now(), today = new Date(now + 5 * 3600e3), iso = (d: Date) => d.toISOString().slice(0, 10);
  const pays = ["Наличные", "Терминал", "QR/Payme"];
  let n = 0;
  for (let back = 40; back >= 0; back--) {
    const dt = new Date(today); dt.setUTCDate(dt.getUTCDate() - back);
    if (dt.getUTCDay() === 0) continue;
    const day = iso(dt);
    for (const p of ["Премиум", "Яшнабад", "Сергели"]) {
      const checks = 1 + Math.floor(r() * 3);
      for (let c = 0; c < checks; c++) {
        const check = `${day.slice(5)}-${p[0]}${c}`, pay = pays[Math.floor(r() * 3)];
        const base = { date: day, point: p, check, pay, createdAt: now - back * 864e5 - c * 1000 };
        const f = FRAMES[Math.floor(r() * FRAMES.length)], disc = r() < 0.3 ? 0.9 : 1;
        out.push({ col: "sales", id: `home_s${++n}`, data: { ...base, cat: f[0].includes("Детск") ? "Детские оправы" : "Оправы", product: f[0], qty: 1, price: f[1], sum: Math.round(f[1] * disc / 1000) * 1000, cost: f[2] } });
        if (r() < 0.7) { const l = LENSES[Math.floor(r() * LENSES.length)]; out.push({ col: "sales", id: `home_s${++n}`, data: { ...base, cat: "Очковые линзы", product: l[0], qty: 2, price: l[1], sum: l[1] * 2 } }); }
        if (r() < 0.25) { const o = OTHER[Math.floor(r() * OTHER.length)]; out.push({ col: "sales", id: `home_s${++n}`, data: { ...base, cat: o[1], product: o[0], qty: 1, price: o[2], sum: o[2] } }); }
      }
    }
  }
  // новая партия: модели совпадают с названиями оправ в продажах
  const bd = new Date(today); bd.setUTCDate(bd.getUTCDate() - 25);
  out.push({ col: "batches", id: "home_b1", data: { name: "Поставка оправ (тест)", date: iso(bd), createdAt: now - 25 * 864e5, items: [
    { k: "a1", m: "М-12", g: "Оправы", q: 90, p: 450000, cp: 180000 }, { k: "a2", m: "Т-7", g: "Оправы", q: 70, p: 380000, cp: 150000 },
    { k: "a3", m: "К-33", g: "Оправы", q: 60, p: 520000, cp: 210000 }, { k: "a4", m: "Д-5", g: "Детские оправы", q: 50, p: 300000, cp: 120000 }] } });
  // себестоимость очковых линз: правила по названию и интервалы по цене
  out.push({ col: "settings", id: "lensCost", data: { rules: [{ k: "Seiko", re: "seiko|сейко", pair: 300000 }, { k: "Тио", re: "тио", pair: 110000 }], bands: [{ max: 700000, pair: 150000 }, { max: null, pair: 250000 }] } });
  return out;
}
