// Расчёты раздела «Касса» — перенос один в один из скрипта Кассы в dev/base.html рабочего сайта.
// Касса = наличные (Б/Ч) Премиума и Яшнабада + приходы − расходы − переводы в резерв.
// Сергели и C1 в кассу не идут (C1 выключена решением владельца 09.11.2026; вернуть — добавить "C1" в KASSA_POINTS). Остаток Б/Ч дня (kind bc) показывается в журнале, но второй раз не прибавляется.
import type { CashRec, Data, Entry, Sale } from "../../lib/types";

export const KASSA_POINTS = ["Премиум", "Яшнабад"];
// C1 выключена решением владельца 09.11.2026: ветка в inKassa мёртвая, пока C1 нет в KASSA_POINTS
const KFROM = "2026-10-02", C1_FROM = "2026-11-01";
export const MN = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
export const monthName = (m: string) => MN[+m.slice(5, 7) - 1] + " " + m.slice(0, 4);
export const inKassa = (pt: string, date: string) => KASSA_POINTS.includes(pt) && (pt !== "C1" || (date || "") >= C1_FROM);
const payOf = (s: Sale) => (s.pays && typeof s.pays === "object" ? s.pays : { [s.pay || "Наличные"]: +s.sum || 0 });
const cashOf = (s: Sale) => +(payOf(s)["Наличные"] || 0);

export const hasFact = (e: Entry) => typeof e.fact === "number";
export const val = (e: Entry) => (hasFact(e) ? (e.fact as number) : +(e.amount || 0));
export const isBc = (e: Entry) => e.type === "inc" && e.kind === "bc";
export const isRsvIn = (e: Entry) => e.type === "inc" && e.kind === "rsv";
export const fromRsv = (e: Entry) => e.type !== "inc" && e.fund === "reserve";
export const toRsv = (e: Entry) => isRsvIn(e) && e.from === "kassa";

// теги расходов: по названию, если тег не выбран вручную
export const TAGS: [string, RegExp][] = [["Такси", /такси|taxi/], ["Доставка", /доставк|карго/], ["Закуп линз", /линз|абу сахий|оптикал|seiko|сейко|закуп/], ["Зарплата и мастера", /зп|зарплат|аванс|мастер|бонус|персонал/],
  ["Аренда и коммуналка", /аренд|коммун|вод[аы]|сувге/], ["Реклама", /реклам|блогер|шар[ыов]|лототрон|бокс/], ["C1", /ц1|c1|с1|мебел|стол|кондиционер|строй|чеков/],
  ["Товар и аксессуары", /китай|товар|раствор|капл|аклюдор|микрофибр|авизор|картонн|коробк/], ["Хозтовары", /салфет|стакан|моющ|хоз|шоколад|краск|замазк/], ["Бухгалтер", /бухгалт/], ["Возвраты", /возврат/], ["Размен", /сдач/]];
export const tagAuto = (name: string) => { const n = String(name || "").toLowerCase(); const t = TAGS.find(([, r]) => r.test(n)); return t ? t[0] : "Прочее"; };
export const tagOf = (e: Entry) => e.tag || tagAuto(e.name);

/** нормализация названия статьи: «Премиум за такси» → «Такси» */
export function article(name: string) {
  const s = String(name).toLowerCase().replace(/^(премиум|яшнабад|сергел[иы])\s+(за|на)\s+/, "").trim();
  if (/доставк[уа]\s+линз/.test(s)) return "Доставка линз"; if (/доставк/.test(s)) return "Доставка"; if (/такси/.test(s)) return "Такси"; if (/вод/.test(s)) return "Вода";
  if (/шоколад/.test(s)) return "Шоколад"; if (/персонал/.test(s)) return "Подбор персонала"; if (/моющ/.test(s)) return "Моющие средства";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** записи Кассы: расходы дня Сергели и C1 в кассу не идут */
export const kAll = (d: Data) => d.entries.filter((e) => !(e.source === "day" && !inKassa(e.branch || "", e.date)));
export const kEntries = (d: Data, M: string) => kAll(d).filter((e) => (e.date || "").slice(0, 7) === M);

export function kMonths(d: Data) {
  const s = new Set<string>();
  d.bc.forEach((x) => x.date && s.add(x.date.slice(0, 7)));
  d.entries.forEach((e) => e.date && e.date >= "2026-09" && s.add(e.date.slice(0, 7)));
  d.sales.forEach((x) => { if (x.date && inKassa(x.point, x.date)) s.add(x.date.slice(0, 7)); });
  return [...s].sort();
}
export const lastM = (d: Data) => { const m = kMonths(d); return m[m.length - 1] || new Date().toISOString().slice(0, 7); };

export interface BcDay { d: string; p: number; y: number; c: number; src: "Продажи" | "Excel" }
/** Б/Ч по дням: из наличных продаж; где есть уточнённый отчёт (bc) — из него */
export function bcDays(d: Data, M: string): BcDay[] {
  const m: Record<string, BcDay> = {};
  d.sales.forEach((s) => {
    if (!s.date || s.date.slice(0, 7) !== M || (s.date < KFROM && M === KFROM.slice(0, 7)) || !inKassa(s.point, s.date)) return;
    const o = m[s.date] || (m[s.date] = { d: s.date, p: 0, y: 0, c: 0, src: "Продажи" });
    if (s.point === "Премиум") o.p += cashOf(s); else if (s.point === "C1") o.c += cashOf(s); else o.y += cashOf(s);
  });
  d.bc.forEach((x) => { if (x.date && x.date.slice(0, 7) === M) m[x.date] = { d: x.date, p: +(x.p || 0), y: +(x.y || 0), c: m[x.date]?.c || 0, src: "Excel" }; });
  return Object.values(m).sort((a, b) => a.d.localeCompare(b.d));
}

export function compute(d: Data, M: string) {
  const days = bcDays(d, M), bcT = days.reduce((a, x) => a + x.p + x.y + (x.c || 0), 0), bcP = days.reduce((a, x) => a + x.p, 0), bcY = days.reduce((a, x) => a + x.y, 0), bcC = days.reduce((a, x) => a + (x.c || 0), 0);
  const ke = kEntries(d, M);
  const bcIn = ke.filter(isBc), inc = ke.filter((e) => e.type === "inc" && !isBc(e) && !isRsvIn(e));
  const op = ke.filter((e) => e.type !== "inc" && e.cat === "op" && !fromRsv(e)), oth = ke.filter((e) => e.type !== "inc" && e.cat !== "op" && !fromRsv(e));
  const rsvMove = ke.filter(toRsv), rsvExp = ke.filter(fromRsv);
  const sum = (a: Entry[]) => a.reduce((x, e) => x + val(e), 0);
  const sInc = sum(inc), sOp = sum(op), sOth = sum(oth), sRsvMove = sum(rsvMove), sRsvExp = sum(rsvExp);
  const saved = [...op, ...oth].reduce((x, e) => x + (hasFact(e) ? (+(e.amount || 0)) - (e.fact as number) : 0), 0);
  return { days, bcT, bcP, bcY, bcC, bcIn, inc, op, oth, rsvMove, rsvExp, sInc, sOp, sOth, sRsvMove, sRsvExp, saved, expected: bcT + sInc - sOp - sOth - sRsvMove };
}
export type Kassa = ReturnType<typeof compute>;

/** остаток резерва; с месяцем M — на конец этого месяца и движение за месяц */
export function reserve(d: Data, M?: string | null) {
  const all = M ? kAll(d).filter((e) => (e.date || "").slice(0, 7) <= M) : kAll(d);
  const inn = all.filter(isRsvIn).reduce((a, e) => a + val(e), 0), out = all.filter(fromRsv).reduce((a, e) => a + val(e), 0);
  const inM = M ? all.filter((e) => (e.date || "").startsWith(M)) : [];
  return { inn, out, bal: inn - out, n: all.filter((e) => isRsvIn(e) || fromRsv(e)).length,
    mIn: inM.filter(isRsvIn).reduce((a, e) => a + val(e), 0), mOut: inM.filter(fromRsv).reduce((a, e) => a + val(e), 0) };
}

/** месяц пересчёта: указан в записи, иначе — месяц самой поздней записи, внесённой до пересчёта */
export function recM(d: Data, r: CashRec) {
  if (r.month) return r.month;
  let m = ""; const chk = (x: { createdAt?: number; date?: string }) => { const ca = +(x.createdAt || 0); if (ca >= 1e12 && ca <= r.at && x.date) { const k = x.date.slice(0, 7); if (k > m) m = k; } };
  d.sales.forEach((x) => { if (inKassa(x.point, x.date)) chk(x); }); kAll(d).forEach((x) => { if ((x.date || "") >= "2026-09") chk(x); });
  return m || new Date(r.at || 0).toISOString().slice(0, 7);
}
/** последний пересчёт, относящийся к месяцу M (журнал пересчётов + текущий) */
export function recFor(d: Data, M: string): CashRec | null {
  const all: CashRec[] = d.cashlog.map((r) => ({ amount: +r.amount, at: +r.at || 0, month: r.month }));
  if (d.cash && typeof d.cash.amount === "number") all.push({ amount: d.cash.amount, at: +d.cash.updatedAt || 0, month: d.cash.month });
  let best: CashRec | null = null;
  all.forEach((r) => { if (isNaN(r.amount) || recM(d, r) !== M) return; if (!best || r.at > best.at) best = r; });
  return best;
}
/** день по Ташкенту (UTC+5) — так считает рабочий сайт у владельца */
const tashDay = (ms: number) => new Date(ms + 5 * 3600e3).toISOString().slice(0, 10);
/** после пересчёта: записи, внесённые позже и датированные днём пересчёта или позже, двигают и «должно быть», и факт */
export function cashState(d: Data, r: CashRec, M: string) {
  const cday = tashDay(r.at || 0);
  const after = kEntries(d, M).filter((x) => (x.createdAt || 0) > (r.at || 0) && (!x.date || x.date >= cday));
  const afterExp = after.filter((e) => (e.type !== "inc" && !fromRsv(e)) || toRsv(e)).reduce((a, e) => a + val(e), 0);
  const afterInc = after.filter((e) => e.type === "inc" && !isBc(e) && !isRsvIn(e)).reduce((a, e) => a + val(e), 0);
  return { afterExp, afterInc, actual: r.amount - afterExp + afterInc, at: r.at };
}

/** анализ расходов месяца: статьи с Б/Ч, по точкам, по дням, выводы */
export function analysis(d: Data, M: string, c: Kassa) {
  const small = kEntries(d, M).filter((e) => e.type !== "inc" && e.source !== "nal" && (e.source === "excel" || e.source === "day" || (e.source !== "photo" && +(e.amount || 0) < 1000000)));
  const map: Record<string, { v: number; n: number; cat?: string }> = {};
  small.forEach((e) => { const k = article(e.name); (map[k] ||= { v: 0, n: 0, cat: e.cat }); map[k].v += val(e); map[k].n++; });
  const arts = Object.entries(map).sort((a, b) => b[1].v - a[1].v), sSmall = small.reduce((a, e) => a + val(e), 0);
  const bp: Record<string, number> = {}, bd: Record<string, number> = {};
  small.forEach((e) => { const b = e.branch && e.branch !== "Общее" ? e.branch : "Общее"; bp[b] = (bp[b] || 0) + val(e); if (e.date) bd[e.date] = (bd[e.date] || 0) + val(e); });
  const byPoint = Object.entries(bp).sort((a, b) => b[1] - a[1]), byDay = Object.entries(bd).sort((a, b) => b[1] - a[1]);
  const ins: string[] = [];
  if (arts.length) { const t = arts[0]; ins.push(`Самая крупная статья с Б/Ч: **${t[0]}**, ${fmt(t[1].v)} сум (${Math.round((t[1].v / sSmall) * 100)}% мелких расходов).`); }
  const smallOp = small.filter((e) => e.cat === "op").reduce((a, e) => a + val(e), 0);
  if (c.saved > 0) ins.push(`По факту потратили на **${fmt(c.saved)} сум меньше плана**, эти деньги остаются в кассе.`);
  if (smallOp) ins.push(`Операционные расходы точек: ${fmt(smallOp)} сум, это **${((smallOp / (c.bcT || 1)) * 100).toFixed(1).replace(".", ",")}% от Б/Ч**, в среднем ${fmt(smallOp / Math.max(1, c.days.length))} в рабочий день.`);
  const taxi = map["Такси"], dlv = (map["Доставка"]?.v || 0) + (map["Доставка линз"]?.v || 0);
  if (taxi && dlv) ins.push(`Такси (${fmt(taxi.v)}) и доставка (${fmt(dlv)}) вместе дают ${fmt(taxi.v + dlv)}. Если это развоз заказов, выгоднее договориться с одним курьером на фиксированную ставку.`);
  if (!small.some((e) => e.branch === "Яшнабад")) ins.push("У Яшнабада пока нет ни одного расхода с Б/Ч. Все мелкие расходы приходятся на Премиум.");
  const big = c.oth.filter((e) => +(e.amount || 0) >= 1000000).reduce((a, e) => a + val(e), 0);
  if (big) ins.push(`Крупные прочие платежи (${fmt(big)}) съедают ${Math.round((big / ((c.bcT + c.sInc) || 1)) * 100)}% налички месяца. Основная нагрузка не в мелочах, а в них.`);
  return { arts, sSmall, byPoint, byDay, ndays: Object.keys(bd).length, insights: ins };
}

export const fmt = (n: number) => (n < 0 ? "−" : "") + Math.round(Math.abs(n)).toLocaleString("ru-RU").replace(/[\s  ,]/g, " ");
export const dShort = (iso?: string) => { if (!iso) return "—"; const p = iso.split("-"); return p[2] + "." + p[1]; };
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const todayTash = () => tashDay(Date.now());
