// Excel «Отчёт оптика»: отдельный лист на каждый день, новые дни сверху, формулы «с начала месяца» как в файле владельца.
// Рамки и заливка нужны, как в исходном файле, поэтому, как и на рабочем сайте, берём ExcelJS (подгружается только по нажатию).
import type { Data } from "../../lib/types";
import { RP_GN_FROM, dFull, rpCalc, rpGN, todayTash } from "./logic";

/* eslint-disable @typescript-eslint/no-explicit-any */
let loading: Promise<void> | null = null;
function loadExcelJS(): Promise<void> {
  const w = window as any; if (w.ExcelJS) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((res, rej) => {
    const sc = document.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
    sc.onload = () => res(); sc.onerror = () => { loading = null; rej(new Error("load")); }; document.head.appendChild(sc);
  });
  return loading;
}

export async function buildOpticDays(d: Data, list: string[], T = todayTash()) {
  await loadExcelJS();
  const EJ = (window as any).ExcelJS;
  const sel = new Set(list), days = [...sel].sort(), Mc: Record<string, ReturnType<typeof rpCalc>> = {};
  [...new Set(days.map((x) => x.slice(0, 7)))].forEach((m) => (Mc[m] = rpCalc(d, m, false, T)));
  const wb = new EJ.Workbook(); wb.creator = "Saif-Optics"; wb.created = new Date(); wb.calcProperties.fullCalcOnLoad = true;
  const F = { name: "Calibri", size: 10 }, FB = { name: "Calibri", size: 10, bold: true }, TH = { style: "thin", color: { argb: "FF000000" } }, BOX = { top: TH, left: TH, bottom: TH, right: TH };
  const FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E2F3" } }, N0 = "#,##0", N2 = "#,##0.00";
  const cols = ["B", "C", "D", "E"], keys = ["c", "t", "q", "e"] as const;
  const num = (v: unknown) => String(Math.round((+(v as number) || 0) * 100) / 100);
  const fit = (l: { n: string; a: number | null }[]) => (l.length <= 13 ? l : l.slice(0, 12).concat([{ n: `Прочие расходы (${l.length - 12})`, a: l.slice(12).reduce((x, y) => x + (+(y.a as number) || 0), 0) }]));
  let made = 0;
  for (let di = days.length - 1; di >= 0; di--) {
    const day = days[di], M = Mc[day.slice(0, 7)], i = M.days.indexOf(day); if (i < 0) continue;
    const row = M.rows[i], r = row.r, P = i > 0 ? M.rows[i - 1] : null, linked = !!P && sel.has(P.d);
    // если прошлый день месяца тоже в файле — ссылка на его лист, иначе — готовая сумма прошлых дней
    const ref = (cell: string, prevVal: number) => (linked ? `'${dFull(P!.d)}'!${cell}+` : P ? `${num(prevVal)}+` : "");
    const n = M.pts.length, o = n - 3, rT = 5 + n, rC = rT + 1, rH1 = 11 + o, rS1 = 25 + o, rR1 = 27 + o, rR2 = 28 + o, rH2 = 30 + o, rS2 = 44 + o, rG1 = 46 + o, rG2 = 47 + o, last = 4 + n;
    const ws = wb.addWorksheet(dFull(day), { properties: { defaultRowHeight: 15.75 }, pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    ws.getColumn(1).width = 28.38; for (let k = 2; k <= 7; k++) ws.getColumn(k).width = k === 7 ? 15 : k === 3 ? 16 : 13.5;
    const put = (addr: string, v: unknown, o2: { b?: number; f?: string; al?: string; box?: boolean; fill?: number } = {}) => {
      const cl = ws.getCell(addr); if (v !== undefined) cl.value = v; cl.font = o2.b ? FB : F; if (o2.f) cl.numFmt = o2.f;
      if (o2.al) cl.alignment = { horizontal: o2.al, vertical: "middle" }; if (o2.box !== false) cl.border = BOX; if (o2.fill) cl.fill = FILL; return cl;
    };
    put("A2", "Дата", { b: 1, al: "center", box: false });
    const [yy, mm, dd] = day.split("-").map(Number); put("B2", new Date(Date.UTC(yy, mm - 1, dd)), { f: "dd.mm.yyyy", al: "right", box: false });
    ["наим-е отд", "Б/Ч", "Терминал", "QR", "Перечисления", "Итого", "с начала месяца"].forEach((t, k) => put(String.fromCharCode(65 + k) + "4", t, { b: 1, al: "center" }));
    M.pts.forEach((pt, j) => {
      const rr = 5 + j, x = row.pts[pt]; put("A" + rr, pt, { al: "center" });
      cols.forEach((cc, k) => put(cc + rr, x[keys[k]], { f: N0, al: "right" }));
      put("F" + rr, { formula: `SUM(B${rr}:E${rr})`, result: x.sum }, { b: 1, f: N0, al: "right" });
      put("G" + rr, { formula: `${ref("G" + rr, P ? P.cum.pts[pt] || 0 : 0)}F${rr}`, result: row.cum.pts[pt] || 0 }, { b: 1, f: N0, al: "right" });
    });
    put("A" + rT, "Итого:", { b: 1, al: "center" });
    cols.forEach((cc, k) => put(cc + rT, { formula: `SUM(${cc}5:${cc}${last})`, result: row.tot[keys[k]] }, { b: 1, f: N0, al: "right" }));
    put("F" + rT, { formula: `SUM(F5:F${last})`, result: row.tot.sum }, { b: 1, f: N0, al: "right" }); put("G" + rT, null, { fill: 1 });
    put("A" + rC, "c начала месяца", { b: 1, al: "center" });
    cols.forEach((cc, k) => put(cc + rC, { formula: `${ref(cc + rC, P ? P.cum[keys[k]] : 0)}${cc}${rT}`, result: row.cum[keys[k]] }, { b: 1, f: N0, al: "right" }));
    put("F" + rC, { formula: `SUM(B${rC}:E${rC})`, result: row.cum.sum }, { b: 1, f: N0, al: "right" });
    put("G" + rC, { formula: `SUM(G5:G${last})`, result: row.cum.sum }, { b: 1, f: N0, al: "right", fill: 1 });
    const block = (rh: number, rs: number, title: string, lst: { n: string; a: number | null }[], sum: number, mon: number, prevMon: number) => {
      put("A" + rh, "наименование", { b: 1, al: "center" }); put("B" + rh, title, { b: 1, al: "center" }); put("C" + rh, "расходы за месяц", { b: 1, al: "center" });
      const L = fit(lst); for (let k = 0; k < 13; k++) { const rr = rh + 1 + k, it = L[k]; put("A" + rr, it ? it.n : null, { al: "left" }); put("B" + rr, it ? +(it.a as number) || 0 : null, { f: N2, al: "right" }); put("C" + rr, null, { f: N2 }); }
      put("A" + rs, "Итого расходы", { b: 1 }); put("B" + rs, { formula: `SUM(B${rh + 1}:B${rh + 13})`, result: sum }, { b: 1, f: N2, al: "right" });
      put("C" + rs, { formula: `${ref("C" + rs, prevMon)}B${rs}`, result: mon }, { b: 1, f: N2, al: "right" });
    };
    block(rH1, rS1, "расходы", row.bank, row.bankSum, row.cum.bank, P ? P.cum.bank : 0);
    put("A" + rR1, "р/с на начало дня", { b: 1 }); put("B" + rR1, r.rsStart == null ? null : r.rsStart, { b: 1, f: N2, al: "right" });
    put("A" + rR2, "р/с на конец дня", { b: 1 }); put("B" + rR2, r.rsEnd == null ? null : r.rsEnd, { b: 1, f: N2, al: "right" });
    block(rH2, rS2, "расходы с Б/Ч", row.bc, row.bcSum, row.cum.bc, P ? P.cum.bc : 0);
    put("A" + rG1, "итог гросс нал", { b: 1 }); put("B" + rG1, r.grossCash == null ? null : r.grossCash, { b: 1, f: N2, al: "right" });
    put("A" + rG2, "итог гросс безнал", { b: 1 }); { const gv = day >= RP_GN_FROM ? rpGN(d, day, T) : r.grossNon; put("B" + rG2, gv == null ? null : gv, { b: 1, f: N2, al: "right" }); }
    for (let k = 1; k <= rG2; k++) ws.getRow(k).height = 15.75;
    made++;
  }

  return { buf: (await wb.xlsx.writeBuffer()) as ArrayBuffer, count: made, first: days[0], last: days[days.length - 1] };
}
