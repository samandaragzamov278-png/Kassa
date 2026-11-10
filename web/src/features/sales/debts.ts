// Долги из пометок продаж: возникновение — «долг N не записан», погашение — строка cat «Погашения долгов». Чистые функции, без React.
import type { SaleX } from "./logic";

export interface DebtPay { date: string; sum: number }
export interface Debt {
  key: string; date: string; point: string; product: string;
  full: number; paid: number; debt: number; pays: DebtPay[]; repaid: number;
  closedAt: string | null; rest: number; old: boolean;
}
export interface Orphan { id: string; date: string; point: string; product: string; sum: number }
export interface DebtsInfo { rows: Debt[]; orphans: Orphan[]; openCount: number; openSum: number; closedCount: number }

// число с пробелами-разрядами (в т. ч. неразрывными) между «долг» и «не записан»
const RE_DEBT = /долг\s+(\d[\d\s  ]*?)\s*не\s+записан/i;
const RE_SALE = /\(\s*продажа\s+(\d{1,2})\.(\d{1,2})\s*\)/i;
const RE_FROM = /долг\s+(\d[\d\s  ]*?)\s*от(?![а-яёa-z])/i; // не \b: после кириллицы граница слова в JS не срабатывает
const RE_CLOSED = /долг\s+закрыт/i;
const num = (s: string) => parseInt(s.replace(/\D/g, ""), 10) || 0;

export const isRepay = (s: SaleX) => s.cat === "Погашения долгов" || String(s.product || "").startsWith("Погашение долга");

// дата продажи по «(продажа DD.MM)»: ближайшая не позже даты погашения
function saleDate(product: string, repayDate: string): string | null {
  const m = RE_SALE.exec(product);
  if (!m) return null;
  const mm = ("0" + m[2]).slice(-2), dd = ("0" + m[1]).slice(-2);
  let y = +repayDate.slice(0, 4);
  if (`${y}-${mm}-${dd}` > repayDate) y--;
  return `${y}-${mm}-${dd}`;
}

export function debtsOf(sales: SaleX[], from: string, to: string, point = "all"): DebtsInfo {
  if (point && point !== "all") sales = sales.filter((s) => s.point === point);
  const groups = new Map<string, SaleX[]>(), repays: SaleX[] = [];
  for (const s of sales) {
    if (isRepay(s)) { repays.push(s); continue; }
    const k = s.date + "|" + s.point + "|" + (s.check ? String(s.check) : "_" + s.id);
    const g = groups.get(k);
    if (g) g.push(s); else groups.set(k, [s]);
  }
  const all: Debt[] = [];
  for (const [key, rs] of groups) {
    const withNote = rs.find((s) => RE_DEBT.test(String(s.note || "")));
    if (!withNote) continue;
    const debt = num(RE_DEBT.exec(String(withNote.note))![1]);
    if (!debt) continue;
    const paid = rs.reduce((x, s) => x + (+s.sum || 0), 0);
    const prods = [...new Set(rs.map((s) => String(s.product || "").trim()).filter(Boolean))];
    all.push({ key, date: withNote.date, point: withNote.point, product: prods.join(" + "), full: paid + debt, paid, debt, pays: [], repaid: 0, closedAt: null, rest: debt, old: false });
  }
  const orphans: Orphan[] = [];
  repays.sort((a, b) => a.date.localeCompare(b.date));
  for (const r of repays) {
    const sd = saleDate(String(r.product || ""), r.date), note = String(r.note || "");
    const cands = sd ? all.filter((d) => d.point === r.point && d.date === sd) : [];
    const fm = RE_FROM.exec(note), want = fm ? num(fm[1]) : 0;
    const hit = cands.find((d) => want && d.debt === want) || cands.find((d) => !d.closedAt) || null;
    const sum = +r.sum || 0;
    if (!hit) { orphans.push({ id: r.id, date: r.date, point: r.point, product: String(r.product || ""), sum }); continue; }
    hit.pays.push({ date: r.date, sum });
    hit.repaid += sum;
    if (!hit.closedAt && (hit.repaid >= hit.debt || RE_CLOSED.test(note))) hit.closedAt = r.date;
  }
  for (const d of all) d.rest = d.closedAt ? 0 : Math.max(0, d.debt - d.repaid);
  const inP = (x: string) => x >= from && x <= to;
  // показываем: продажа в периоде, или погашение в периоде, или долг ещё открыт
  const rows = all.filter((d) => inP(d.date) || d.pays.some((p) => inP(p.date)) || !d.closedAt).sort((a, b) => a.date.localeCompare(b.date) || a.point.localeCompare(b.point));
  for (const d of rows) d.old = d.date < from;
  const open = rows.filter((d) => !d.closedAt);
  return {
    rows, orphans: orphans.filter((o) => inP(o.date)),
    openCount: open.length, openSum: open.reduce((x, d) => x + d.rest, 0),
    closedCount: all.filter((d) => d.closedAt && inP(d.closedAt)).length,
  };
}
