// Тестовые данные «Отчёта р/с»: остатки р/с по дням, гросс, поправка по долгу, фискальные модули. Всё выдуманное, id с префиксом rp_.
// Дни report/<дата> уже есть в общем демо (расходы со счёта) — здесь они дополняются остатками (тот же id, поэтому последний побеждает).
import type { Row } from "../../lib/source";
import { demoRows } from "../../lib/demo";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const FROM = "2026-10-16"; // с этого дня гросс безнал считается сам

export function demoExtra(): Row[] {
  const base = demoRows(), out: Row[] = [];
  const sales = base.filter((r) => r.col === "sales").map((r) => r.data as { date: string; point: string; sum: number; pay: string });
  const days = base.filter((r) => r.col === "report").map((r) => ({ id: r.id, bank: (r.data as { bank: { a: number; n: string }[] }).bank })).sort((a, b) => a.id.localeCompare(b.id));
  const nonCash = (d: string) => sales.filter((s) => s.date === d && s.pay !== "Наличные").reduce((a, s) => a + s.sum, 0);
  const cash = (d: string) => sales.filter((s) => s.date === d && s.pay === "Наличные").reduce((a, s) => a + s.sum, 0);
  let bal = 41_250_000, gc = 612_400_000, gn = 733_900_000;
  days.forEach((x, i) => {
    const out_ = x.bank.reduce((a, b) => a + b.a, 0), nc = nonCash(x.id), start = bal;
    bal = Math.round(start + nc * 0.99 - out_ + (i % 9 === 4 ? 1_800_000 : 0)); // перечисления раз в несколько дней
    gc += cash(x.id);
    if (x.id < FROM) gn += nc;
    const last = i === days.length - 1;
    const doc: Record<string, unknown> = { date: x.id, bank: x.bank, rsStart: start, rsEnd: last ? null : bal, grossCash: last ? null : gc, updatedAt: Date.parse(x.id + "T15:00:00Z") };
    if (x.id < FROM) doc.grossNon = gn;
    else if (x.id === FROM) doc.grossNon = gn; // последний вручную внесённый — от него считается дальше
    // один день выписка внесена с ошибкой: начало не равно концу вчерашнего дня (проверка предупреждения)
    if (i === days.length - 4) doc.rsStart = (doc.rsStart as number) + 15_000;
    out.push({ col: "report", id: x.id, data: doc });
  });
  // поправка по долгу: деньги учтены в день оплаты, а не в день продажи
  const dd = days[Math.max(0, days.length - 6)]?.id;
  if (dd) {
    const r = out.find((o) => o.id === dd && o.col === "report");
    if (r) Object.assign(r.data, { adj: { "Яшнабад": { c: 350_000, t: 0, q: 0, e: 0 } }, adjNote: "Яшнабад: клиент закрыл долг за линзы (продано в августе)" });
  }
  // фискальные модули: Премиум и Сергели подключены, Яшнабад и C1 — нет
  out.push({ col: "settings", id: "fiscal", data: { mods: {
    "Премиум": { kassa: "P3B-DEMO-0101", fm: "VG-DEMO-0001", tp: "Saif Optics Премиум", on: true, c0: 20_000_000, n0: 31_000_000 },
    "Сергели": { kassa: "P3B-DEMO-0102", fm: "VG-DEMO-0002", tp: "Saif Optics Сергели", on: true, c0: 0, n0: 0 },
    "Яшнабад": { kassa: "", fm: "", tp: "", on: false },
  } } });
  const T = iso(new Date(Date.now() + 5 * 3600e3));
  days.filter((x) => x.id < T).slice(-12).forEach((x, i) => {
    const pts: Record<string, { c: number; n: number; k: number }> = {};
    (["Премиум", "Сергели"] as const).forEach((p) => {
      const mine = sales.filter((s) => s.date === x.id && s.point === p), c = mine.filter((s) => s.pay === "Наличные").reduce((a, s) => a + s.sum, 0), n = mine.filter((s) => s.pay !== "Наличные").reduce((a, s) => a + s.sum, 0);
      if (p === "Сергели" && i === 6) return; // не внесено
      pts[p] = { c: p === "Премиум" && i === 3 ? c - 100_000 : c, n: p === "Сергели" && i === 8 ? n + 50_000 : n, k: mine.length };
    });
    out.push({ col: "fiscal", id: x.id, data: { date: x.id, pts, updatedAt: Date.parse(x.id + "T16:00:00Z") } });
  });
  return out;
}
