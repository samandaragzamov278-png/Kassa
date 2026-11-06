// Скачивание файлов: CSV (текст) и Excel (SheetJS подгружается только по нажатию).
import type { Sheet } from "./logic";

function save(blob: Blob, name: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
export function downloadCsv(text: string, name: string) { save(new Blob([text], { type: "text/csv;charset=utf-8" }), name); }

export async function downloadXlsx(sheets: Sheet[], name: string) {
  const X = await import("xlsx"), wb = X.utils.book_new();
  for (const sh of sheets) {
    const aoa: (string | number)[][] = [[sh.title], [sh.subtitle], [], sh.head, ...sh.rows];
    if (sh.total) aoa.push(sh.total);
    const ws = X.utils.aoa_to_sheet(aoa);
    ws["!cols"] = sh.head.map((h, i) => ({ wch: Math.min(40, Math.max(h.length + 2, ...sh.rows.slice(0, 200).map((r) => String(r[i] ?? "").length + 2), 10)) }));
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(sh.head.length - 1, 1) } }, { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(sh.head.length - 1, 1) } }];
    X.utils.book_append_sheet(wb, ws, sh.name.slice(0, 31));
  }
  const out = X.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  save(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), name);
}
