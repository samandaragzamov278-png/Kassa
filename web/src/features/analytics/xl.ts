// Выгрузка в Excel для Аналитики, Линз и Склада: те же листы и столбцы, что на рабочем сайте (SaifXL).
// Модуль xlsx подключается только при выгрузке.
import { today } from "./util";

export interface XCol { header: string; key: string; type: "text" | "money" | "int" | "pct" | "dec"; width?: number }
export interface XSheet { name: string; title: string; subtitle?: string; columns: XCol[]; rows: Record<string, unknown>[]; total?: Record<string, unknown>; note?: string }
const FMT: Record<string, string> = { money: "#,##0;[Red]-#,##0", int: "#,##0;[Red]-#,##0", pct: "0%", dec: "#,##0.0" };
export const xlToday = () => { const d = today(); return d.slice(8, 10) + "." + d.slice(5, 7) + "." + d.slice(0, 4); };

export async function saveXlsx(sheets: XSheet[], filename: string) {
  const X = await import("xlsx");
  const wb = X.utils.book_new();
  for (const sh of sheets) {
    const n = sh.columns.length;
    const aoa: unknown[][] = [[sh.title], [sh.subtitle || ""], [], sh.columns.map((c) => c.header)];
    const val = (r: Record<string, unknown>, c: XCol) => (r[c.key] == null ? null : r[c.key]);
    sh.rows.forEach((r) => aoa.push(sh.columns.map((c) => val(r, c))));
    if (sh.total) aoa.push(sh.columns.map((c) => val(sh.total!, c)));
    if (sh.note) { aoa.push([]); aoa.push([sh.note]); }
    const ws = X.utils.aoa_to_sheet(aoa);
    ws["!cols"] = sh.columns.map((c) => ({ wch: c.width || (c.type !== "text" ? 15 : 24) }));
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(n, 2) - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(n, 2) - 1 } }];
    const last = 3 + sh.rows.length + (sh.total ? 1 : 0);
    for (let r = 4; r <= last; r++) sh.columns.forEach((c, i) => { const cell = ws[X.utils.encode_cell({ r, c: i })]; if (cell && typeof cell.v === "number" && FMT[c.type]) cell.z = FMT[c.type]; });
    if (sh.rows.length) ws["!autofilter"] = { ref: X.utils.encode_range({ r: 3, c: 0 }, { r: 3 + sh.rows.length, c: n - 1 }) };
    X.utils.book_append_sheet(wb, ws, String(sh.name).slice(0, 31));
  }
  X.writeFile(wb, filename);
}
