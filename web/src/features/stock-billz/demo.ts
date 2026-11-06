// Тестовые данные «Остатков Billz» и «Перемещений»: bz_stock, bz_product, bz_transfer. Всё выдуманное, id с префиксом bz_.
// «Продано» берётся из тех же чеков Billz, что и в сверке (features/recon/demo.ts), поэтому остатки сходятся с продажами, кроме двух позиций.
import { setDemoTable, type Row } from "../../lib/source";
import { bzChecks, bzProducts } from "../recon/demo";

const tash = () => new Date(Date.now() + 5 * 3600e3);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const day = (k: number) => iso(new Date(Date.parse(iso(tash()) + "T00:00:00Z") - k * 864e5));
const EXTRA: [string, string, string, number][] = [["Оправа женская «Лето»", "BZ-WM-707", "Оправы", 220000], ["Очки для чтения +1.5", "BZ-RD-808", "Очки и оправы", 90000], ["Жидкость для линз", "BZ-LQ-909", "Аксессуары", 45000], ["Линзы цветные", "BZ-LC-010", "Линзы", 140000], ["Шнурок для очков", "BZ-SH-111", "Аксессуары", 25000], ["Оправа спорт", "BZ-SP-212", "Оправы", 270000]];
const SKUS = [...bzProducts, ...EXTRA];
const PTS = ["Склад", "Сергели", "C1"];

const D = [day(2), day(1), day(0)], at = (d: string) => d + "T15:00:00Z";
// перемещения: привезли на Сергели, отправили на C1 (в пути), Сергели → C1 принято с недосдачей, черновик
const trf = (id: string, num: number, from: string, to: string, created: string, accepted: string | null, status: string, sku: string, sent: number, arr: number) => {
  const p = SKUS.find((x) => x[1] === sku)!;
  return { id, num: String(1000000 + num), name: "Трансфер", created, accepted, d: created.slice(0, 10), from_point: from, to_point: to, status, sent, arrived: arr, retail: sent * p[3], by_name: "Диёрбек",
    items: [{ n: p[0], sku, sent, arr, price: p[3] }] };
};
const TR = [
  trf("bz_tr1", 7, "Склад", "Сергели", D[1] + "T04:00:00Z", D[1] + "T06:00:00Z", "принят", "BZ-TR-303", 6, 6),
  trf("bz_tr2", 8, "Склад", "C1", D[1] + "T09:00:00Z", null, "в пути", "BZ-MK-202", 10, 0),
  trf("bz_tr3", 9, "Сергели", "C1", D[1] + "T07:00:00Z", D[1] + "T08:30:00Z", "принят", "BZ-DM-101", 3, 2),
  trf("bz_tr4", 10, "Склад", "Сергели", D[2] + "T02:00:00Z", null, "черновик", "BZ-LN-404", 8, 0),
  trf("bz_tr5", 4, "Склад", "C1", day(12) + "T05:00:00Z", day(12) + "T07:00:00Z", "принят", "BZ-SG-505", 5, 5),
  trf("bz_tr6", 3, "Склад", "Сергели", day(20) + "T05:00:00Z", day(20) + "T09:00:00Z", "принят", "BZ-FT-606", 30, 30),
];

function stock() {
  const rows: Record<string, unknown>[] = [], cur = new Map<string, number>();
  SKUS.forEach((s, i) => { PTS.forEach((p, j) => cur.set(p + "|" + s[1], p === "Склад" ? 90 + ((i * 17) % 60) : p === "Сергели" ? 12 + ((i * 3 + j) % 22) : 6 + ((i * 2) % 12))); });
  const sold = (p: string, sku: string, a: string, b: string) => bzChecks.filter((c) => c.point === p && c.t > a && c.t <= b).reduce((t, c) => t + c.items.filter((x) => x.sku === sku).reduce((u, x) => u + x.q, 0), 0);
  D.forEach((d, k) => {
    if (k > 0) {
      const a = at(D[k - 1]), b = at(d);
      SKUS.forEach((s) => {
        const sku = s[1];
        PTS.forEach((p) => { const key = p + "|" + sku; let v = cur.get(key) || 0; if (p !== "Склад") v -= sold(p, sku, a, b);
          TR.forEach((t) => { const ts = Date.parse(t.created), ta = Date.parse(t.accepted || ""), ia = Date.parse(a), ib = Date.parse(b);
            t.items.forEach((i) => { if (i.sku !== sku) return;
              if (t.status !== "черновик" && t.from_point === p && ts > ia && ts <= ib) v -= i.sent;
              if (t.to_point === p && ta && ta > ia && ta <= ib) v += i.arr; }); });
          cur.set(key, v); });
      });
      if (k === 1) cur.set("Сергели|BZ-TR-303", (cur.get("Сергели|BZ-TR-303") || 0) + 1); // нашлась лишняя оправа без документа
      if (k === 2) cur.set("Сергели|BZ-FT-606", (cur.get("Сергели|BZ-FT-606") || 0) - 4); // ушло без продажи и перемещения
    }
    SKUS.forEach((s) => PTS.forEach((p) => { const q = cur.get(p + "|" + s[1]) || 0; if (q > 0) rows.push({ d, point: p, sku: s[1], q, at: at(d) }); }));
  });
  return rows;
}

const ROWS = stock();
setDemoTable("bz_stock", ROWS);
setDemoTable("bz_product", SKUS.map((s, i) => ({ sku: s[1], name: s[0], cat: s[2], prices: { "Склад": s[3], "Сергели": s[3], "C1": s[3] }, cp: Math.round(s[3] * (0.42 + (i % 3) * 0.04)) })));
setDemoTable("bz_transfer", TR);

export function demoExtra(): Row[] { return []; }
