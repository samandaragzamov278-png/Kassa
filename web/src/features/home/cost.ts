// Партии для Главной (плитка «Склад»): curBatch, batchStats. Себестоимость и маржа — в features/analytics/cost.ts.
import type { Data } from "../../lib/types";
import type { SaleRow } from "../plan/logic";

type R = Record<string, unknown>;
export const normS = (s: unknown) => String(s == null ? "" : s).toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface BatchItem { k?: string; m?: string; s?: string; n?: string; q?: number | string; p?: number | string; cp?: number | string; pt?: string; sold?: number; left?: number; rev?: number; pct?: number; [x: string]: unknown }
export interface Batch { id: string; name?: string; date?: string; createdAt?: number; items?: BatchItem[] }
const docsOf = (d: Data, col: string) => Object.entries(d.rows[col] || {}).map(([id, v]) => ({ ...(v as R), id }));

export const batchesOf = (d: Data) => docsOf(d, "batches") as unknown as Batch[];
/** текущая партия: самая свежая по дате (потом по времени создания) */
export function curBatch(batches: Batch[]): Batch | null {
  const s = [...batches].sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0));
  return s[0] || null;
}

/** сколько продано и осталось по позициям партии (по всем точкам) */
export function batchStats(sales: SaleRow[], b: Batch, ptFilter = "all") {
  const items = (b.items || []).map((it) => ({ ...it, sold: 0, rev: 0, left: 0, pct: 0, q: +(it.q as number) || 0 }));
  const byKey: Record<string, number> = {};
  items.forEach((it, i) => { if (it.k != null) byKey[it.k] = i; });
  const res: { i: number; len: number; re: RegExp }[] = [];
  items.forEach((it, i) => { [it.m, it.s, it.n].forEach((v) => { const t = normS(v); if (t.length >= 3) res.push({ i, len: t.length, re: new RegExp("(^|[^a-zа-я0-9])" + reEsc(t) + "($|[^a-zа-я0-9])", "i") }); }); });
  res.sort((x, y) => y.len - x.len);
  sales.forEach((s) => {
    if (b.date && s.date < b.date) return;
    if (ptFilter !== "all" && s.point !== ptFilter) return;
    let idx = s.batchKey && s.batchId === b.id && byKey[s.batchKey] != null ? byKey[s.batchKey] : -1;
    if (idx < 0) { const p = normS(s.product); for (const r of res) { if (r.re.test(p)) { idx = r.i; break; } } }
    if (idx < 0) return;
    const it = items[idx];
    it.sold += +(s.qty as number) || 0; it.rev += +s.sum || 0;
  });
  items.forEach((it) => { it.left = Math.max(0, it.q - it.sold); it.pct = it.q ? Math.min(1, it.sold / it.q) : 0; });
  return { items };
}

