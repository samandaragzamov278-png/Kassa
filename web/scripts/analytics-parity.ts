// Сверка Аналитики, Линз и Склада: новые расчёты (features/analytics, lens, stock-margin) против старого сайта (собранный index.html, window.__S).
// 1) npx tsx scripts/analytics-parity.ts rows   — пишет scripts/.out/an-rows.json, an-scen.json и an-new.json
// 2) uv run --no-project -q --with playwright python -X utf8 scripts/analytics_old.py   — открывает старый сайт на этих данных, пишет an-old.json
// 3) npx tsx scripts/analytics-parity.ts cmp    — сравнивает: «совпало N из N»
import fs from "node:fs";
import path from "node:path";
import { demoRows } from "../src/lib/demo";
import { demoExtra } from "../src/features/analytics/demo";
import { toData } from "../src/lib/source";
import { makeCtx } from "../src/features/analytics/cost";
import { defaultFlt, type Flt } from "../src/features/analytics/base";
import { buildAnalytics } from "../src/features/analytics/logic";
import { ownerProfit } from "../src/features/analytics/logic";
import { lensCostView, lensData, lensView } from "../src/features/lens/logic";
import { batchStats, batchView, curBatch, marginData, stockView } from "../src/features/stock-margin/logic";
import { addD, fmt, pctF, today } from "../src/features/analytics/util";

const OUT = path.resolve(import.meta.dirname, ".out"); fs.mkdirSync(OUT, { recursive: true });
const mode = process.argv[2];

const T = today(), M0 = T.slice(0, 7), prevM = addD(M0 + "-01", -1), start3 = addD(M0 + "-01", -1).slice(0, 7) === "" ? "" : (() => { const d = new Date(Date.UTC(+M0.slice(0, 4), +M0.slice(5, 7) - 3, 1)); return d.toISOString().slice(0, 10); })();
const F = (o: Partial<Flt>): Flt => ({ ...defaultFlt(), ...o });
const SCEN: Record<string, Flt> = {
  "месяц": F({ from: M0 + "-01", to: T }),
  "прошлый месяц": F({ from: prevM.slice(0, 8) + "01", to: prevM }),
  "всё время": F({ from: "", to: "" }),
  "три месяца": F({ from: start3, to: T }),
  "Премиум": F({ from: start3, to: T, point: "Премиум" }),
  "Сергели 7 дней": F({ from: addD(T, -6), to: T, point: "Сергели" }),
  "категория линзы": F({ from: start3, to: T, cat: "Очковые линзы" }),
  "категория оправы": F({ from: start3, to: T, cat: "Оправы" }),
  "вид Essilor": F({ from: start3, to: T, lk: "Essilor" }),
  "Яшнабад вид ET": F({ from: start3, to: T, point: "Яшнабад", lk: "ET" }),
  "сегодня (пусто)": F({ from: T, to: T }),
};
const norm = (s: string) => String(s ?? "").replace(/[   ]/g, " ").replace(/\s+/g, " ").trim();
const R = (x: number | null | undefined) => (x == null ? null : Math.round(x * 1e6) / 1e6);

function rows() {
  const r = [...demoRows(), ...demoExtra()]; return r;
}
const grpPick = (o: { k: string; rev: number; revC: number; cogs: number; gp: number; mg: number | null; cov: number; n: number; u: number }) => ({ k: o.k == null || o.k === "all" ? "" : o.k, rev: R(o.rev), revC: R(o.revC), cogs: R(o.cogs), gp: R(o.gp), mg: R(o.mg), cov: R(o.cov), n: o.n || 0, u: o.u || 0 });

if (mode === "rows") {
  const R0 = rows(); fs.writeFileSync(path.join(OUT, "an-rows.json"), JSON.stringify(R0));
  fs.writeFileSync(path.join(OUT, "an-scen.json"), JSON.stringify(SCEN));
  const d = toData(R0), c = makeCtx(d), res: Record<string, unknown> = {};
  const b = curBatch(c)!;
  for (const [name, f] of Object.entries(SCEN)) {
    const an = buildAnalytics(c, f, () => true, "Оправы");
    const md = marginData(c, f), ld = lensData(c, f), lv = lensView(c, f), lc = lensCostView(c, lv.rows);
    const kinds: Record<string, number> = {}; ld.rows.forEach((x) => { const k = [x.kind, x.type, x.idx, x.coat, x.brand].join("|"); kinds[k] = (kinds[k] || 0) + 1; });
    const o = ownerProfit(c, M0);
    const bs = batchStats(c, b, f.point, f.from, f.to), bv = batchView(c, b, "all");
    res[name] = {
      an: { empty: an.empty, cards: an.cards.map((x) => [norm(x.label), norm(x.v), norm(x.d)]), titles: an.widgets.map((w) => w.title) },
      margin: { tot: grpPick(md.tot), pts: md.pts.map(grpPick), cats: md.cats.map(grpPick), prods: md.prods.map(grpPick).sort((a, b) => a.k.localeCompare(b.k)), miss: md.miss.map(grpPick), nodet: R(md.nodet) },
      lens: { all: ld.all.length, list: ld.list.length, kinds, a: R(ld.a.rev), cards: lv.empty ? [] : lv.cards.map((x) => [norm(x.label), norm(x.v), norm(x.d)]), titles: lv.empty ? [] : ["Наши линзы по видам", "Виды линз", "Индекс (толщина)", "Покрытия", "Линзы по точкам", "Средняя цена по видам", ...(lv.brandBars.length ? ["Бренды"] : []), "Линзы по дням"],
        cost: lc && !lv.empty ? { kpi: [fmt(lc.gp) + " сум", lc.margin], rows: lc.list.map((x) => [x.k, fmt(x.u), fmt(x.r), x.has ? fmt(x.c) : "нет цены", x.has ? fmt(x.kr - x.c) : "—", x.has && x.kr ? pctF((x.kr - x.c) / x.kr) : "—"]) } : null },
      mgCards: [["Валовая прибыль", fmt(md.tot.gp) + " сум"], ["Маржа", pctF(md.tot.mg)], ["Покрытие", pctF(md.tot.cov)]],
      batch: { items: bs.items.map((i) => [i.k, i.sold, R(i.rev), i.left, i.pSold, R(i.pRev), i.last, JSON.stringify(i.byPt), JSON.stringify(i.pByPt)]), used: bs.used.length, byDay: bs.byDay, cards: bv.cards.map((x) => [norm(x.label), norm(x.v), norm(x.d)]) },
    };
    if (name === "месяц") (res[name] as Record<string, unknown>).owner = o ? [o.rev, -(o.rev - o.gp), o.gp, -o.op, ...(o.credit ? [-o.credit] : []), ...(o.tp ? [-o.tax] : []), o.before, ...(o.mgr ? [-o.mgr.a] : []), o.owner].map((x) => Math.round(x)) : null;
  }
  const sv = stockView(c, "all");
  res.__stock = { cards: sv.cards.map((x) => [norm(x.label), norm(x.v), norm(x.d)]), pr: sv.pr.map((p) => [p.p, p.pos, p.n, Math.round(p.c), Math.round(p.v), p.s]) };
  fs.writeFileSync(path.join(OUT, "an-new.json"), JSON.stringify(res, null, 1)); console.log("сценариев", Object.keys(SCEN).length);
} else {
  const a = JSON.parse(fs.readFileSync(path.join(OUT, "an-old.json"), "utf8")), b = JSON.parse(fs.readFileSync(path.join(OUT, "an-new.json"), "utf8"));
  let ok = 0, n = 0; const bad: string[] = [];
  const cmp = (k: string, x: unknown, y: unknown) => { n++; if (JSON.stringify(x) === JSON.stringify(y)) ok++; else bad.push(`${k}: было ${JSON.stringify(x)?.slice(0, 300)} · стало ${JSON.stringify(y)?.slice(0, 300)}`); };
  const walk = (k: string, x: unknown, y: unknown) => {
    if (y && typeof y === "object" && !Array.isArray(y)) { for (const kk of Object.keys(y as object)) walk(k + " / " + kk, (x as Record<string, unknown> | undefined)?.[kk], (y as Record<string, unknown>)[kk]); }
    else if (Array.isArray(y) && y.length && y.every((z) => Array.isArray(z) || (z && typeof z === "object"))) { cmp(k + " (число строк)", (x as unknown[] | undefined)?.length, y.length); y.forEach((z, i) => cmp(`${k} [${i}]`, (x as unknown[] | undefined)?.[i], z)); }
    else cmp(k, x, y);
  };
  for (const name of Object.keys(b)) walk(name, a[name], b[name]);
  console.log(`совпало ${ok} из ${n}`); bad.slice(0, 60).forEach((x) => console.log(" ✗ " + x)); if (bad.length > 60) console.log(` … ещё ${bad.length - 60}`); process.exit(bad.length ? 1 : 0);
}
