// Сверка «Плана» и «Главной»: новый расчёт (features/plan/logic.ts, features/home/logic.ts) против старого сайта.
// 1) npx tsx scripts/plan-parity.ts rows [a|b]  — пишет scripts/.out/plan-rows.json и plan-new.json (вариант a — выходной только воскресенье, b — вс и сб, будущий месяц)
// 2) python scripts/plan_old.py                 — открывает собранный ../index.html на этих данных, пишет plan-old.json
// 3) npx tsx scripts/plan-parity.ts cmp         — сравнивает: «совпало N из N»
import fs from "node:fs";
import path from "node:path";
import { demoRows } from "../src/lib/demo";
import { demoExtra as planDemo } from "../src/features/plan/demo";
import { demoExtra as homeDemo } from "../src/features/home/demo";
import { toData, type Row } from "../src/lib/source";
import { todayTash } from "../src/features/kassa/logic";
import * as P from "../src/features/plan/logic";
import { homeData, dateTitle, partsText } from "../src/features/home/logic";

const OUT = path.resolve(import.meta.dirname, ".out"); fs.mkdirSync(OUT, { recursive: true });
const mode = process.argv[2], variant = process.argv[3] || "a";

function rows(): Row[] {
  let r = [...demoRows(), ...homeDemo(), ...planDemo()];
  if (variant === "b") {
    const T = todayTash(), key = (k: number) => new Date(Date.UTC(+T.slice(0, 4), +T.slice(5, 7) - 1 + k, 1)).toISOString().slice(0, 7);
    r = r.filter((x) => !(x.col === "settings" && x.id === "plan"));
    r.push({ col: "settings", id: "plan", data: {
      months: { [key(-2)]: { total: 150000000, shares: { "Премиум": 50, "Яшнабад": 30, "Сергели": 20 } }, [key(-1)]: { total: 0, shares: {} },
        [key(0)]: { total: 200000000, shares: { "Премиум": 45.5, "Яшнабад": 30, "Сергели": 24.5, "C1": 0 } }, [key(1)]: { total: 180000000, shares: { "Премиум": 60, "Яшнабад": 40 } } },
      sellers: { "Премиум": "Нодира", "Яшнабад": "" }, off: [0, 6] } });
  }
  return r;
}

const nz = (x: number) => (Object.is(x, -0) ? 0 : x);
function planView(env: P.PlanEnv, m: string) {
  const { K, total, S } = P.planMonth(env, m);
  const o: Record<string, unknown> = { period: P.planPeriod(K, m), total, fact: K.fact, factBefore: K.factBefore, workN: K.work.length, doneN: K.done.length, leftN: K.left.length, past: K.past, future: K.future, shares: K.shares };
  o.S = S ? Object.fromEntries(Object.entries(S).map(([k, v]) => [k, nz(v)])) : null;
  if (!S) return o;
  const { byD, tgt } = P.planDayBars(env, K, total), left = K.left.length;
  o.hero = { ring: Math.round(S.pct * 100) + "%", big: P.fmt(K.fact), small: `из ${P.fmt(total)} сум · осталось ${P.fmt(S.need)}`, status: P.planStatus(K, S),
    need: [["Нужно в день", K.past ? "—" : P.fmt(S.needDay) + " сум", K.past ? "месяц закрыт" : `на ${left} ${P.plural(left, "рабочий день", "рабочих дня", "рабочих дней")} до конца месяца`],
      ["Нужно в неделю", K.past ? "—" : P.fmt(S.needWeek) + " сум", "6 рабочих дней, пн–сб"],
      ["Текущий темп", P.fmt(S.pace) + " сум", `в рабочий день · ${K.done.length} ${P.plural(K.done.length, "день", "дня", "дней")} прошло`],
      ["Прогноз на конец месяца", P.fmt(S.forecast) + " сум", `${P.pctF(S.fpct)} плана · вилка ${P.fmtM(S.fLo)}–${P.fmtM(S.fHi)}`]] };
  o.weeks = P.planWeeks(env, K, byD, tgt).map((w) => [`${P.dShort(w.from)} — ${P.dShort(w.to)}${w.cur ? " · сейчас" : ""}`, String(w.wd), P.fmt(w.plan), w.fut ? "—" : P.fmt(w.fact), w.fut ? "—" : (w.diff >= 0 ? "+" : "") + P.fmt(w.diff)]);
  const pts = P.planPoints(env, K, total), ranked = pts.filter((r) => r.pt).length;
  o.points = pts.map((r) => ({ nm: r.seller || "Продавец не указан", sl: r.p, rank: r.rank >= 0 && ranked > 1 ? `${r.rank + 1} место` : "", amount: [P.fmt(r.f), r.pt ? "из " + P.fmt(r.pt) : "план не задан"],
    grid: [["Выполнено", r.pt ? P.pctF(r.st.pct) : "—"], ["Прогноз", r.pt ? P.pctF(r.st.fpct) : "—"], ["Нужно в день", r.pt && !K.past ? P.fmt(r.st.needDay) : "—"], ["Нужно в неделю", r.pt && !K.past ? P.fmt(r.st.needWeek) : "—"],
      ["Чеков · средний чек", `${r.n} · ${P.fmt(r.avg)}`], ["Оправа + линзы", r.fl == null ? "—" : P.pctF(r.fl)], ["Скидки", P.fmt(r.disc)], ["Доля скидок", P.pctF(r.dp)]] }));
  o.pointStats = Object.fromEntries(pts.map((r) => [r.p, { pt: r.pt, f: r.f, ...Object.fromEntries(Object.entries(r.st).map(([k, v]) => [k, nz(v)])) }]));
  return o;
}

function homeView(d: ReturnType<typeof toData>, today: string) {
  const h = homeData(d, today), w = h.week;
  return {
    date: dateTitle(today),
    hero: h.hero.map((c) => [c.label, c.value, partsText(c.sub)]),
    briefNote: h.briefNote, brief: h.brief.map((b) => [b.title, b.value, b.sub]),
    wkNote: w.note + (w.delta != null ? ` · ${(w.delta >= 0 ? "+" : "−") + Math.abs(w.delta)}% к неделе раньше` : ""),
    bars: w.bars.map((b) => [b.title, b.label, String(b.n) + b.wd]),
    cards: h.cards.map((c) => [c.title, c.hint, c.nums]),
    ptNote: h.ptNote, pts: h.pts.map((o) => [`${o.p} ${o.checks}${o.seller ? " · " + o.seller : ""}`, P.fmt(o.r), `за месяц ${P.fmt(o.month)}${o.planPct ? ` · ${o.planPct} плана точки` : ""}`]),
    ptTotal: h.pts.length ? [h.ptTotalLabel, P.fmt(h.dayRev)] : null,
    last: h.last.map((s) => [s.product, `${s.when} · ${s.point}`, P.fmt(s.sum)]),
  };
}

if (mode === "rows") {
  const R = rows(); fs.writeFileSync(path.join(OUT, "plan-rows.json"), JSON.stringify(R));
  const d = toData(R), today = todayTash(), env = P.planEnv(d, today), ms = P.planMonths(env), res: Record<string, unknown> = { months: ms, today };
  for (const m of ms) res["plan " + m] = planView(env, m);
  res.home = homeView(d, today);
  fs.writeFileSync(path.join(OUT, "plan-new.json"), JSON.stringify(res, null, 1)); console.log("вариант", variant, "· месяцев", ms.length, "· строк", R.length);
} else {
  const a = JSON.parse(fs.readFileSync(path.join(OUT, "plan-old.json"), "utf8")), b = JSON.parse(fs.readFileSync(path.join(OUT, "plan-new.json"), "utf8"));
  let ok = 0, n = 0; const bad: string[] = [];
  const same = (x: unknown, y: unknown): boolean => {
    if (typeof x === "number" && typeof y === "number") return Math.abs(x - y) <= 1e-6 * Math.max(1, Math.abs(x));
    if (Array.isArray(x) && Array.isArray(y)) return x.length === y.length && x.every((v, i) => same(v, y[i]));
    if (x && y && typeof x === "object" && typeof y === "object") { const kx = Object.keys(x as object), ky = Object.keys(y as object); return kx.length === ky.length && kx.every((k) => same((x as Record<string, unknown>)[k], (y as Record<string, unknown>)[k])); }
    return x === y;
  };
  const cmp = (k: string, x: unknown, y: unknown) => { n++; if (same(x, y)) ok++; else bad.push(`${k}: было ${JSON.stringify(x)} · стало ${JSON.stringify(y)}`); };
  const flat = (pre: string, x: Record<string, unknown>, y: Record<string, unknown>) => { for (const k of new Set([...Object.keys(x || {}), ...Object.keys(y || {})])) cmp(`${pre} ${k}`, (x || {})[k], (y || {})[k]); };
  cmp("месяцы", a.months, b.months);
  for (const m of b.months as string[]) {
    const x = a["plan " + m], y = b["plan " + m];
    for (const k of Object.keys(y)) {
      if (k === "points" && x[k] && y[k]) { cmp(`${m} точек`, x[k].length, y[k].length); y[k].forEach((p: Record<string, unknown>, i: number) => flat(`${m} точка ${p.sl}`, x[k][i], p)); }
      else if (k === "hero" && x[k] && y[k]) flat(`${m} hero`, x[k], y[k]);
      else if (k === "pointStats" || k === "S" || k === "shares") flat(`${m} ${k}`, x[k], y[k]);
      else cmp(`${m} ${k}`, x[k], y[k]);
    }
  }
  const hx = a.home, hy = b.home;
  for (const k of Object.keys(hy)) {
    if (Array.isArray(hy[k]) && Array.isArray(hx[k])) { cmp(`главная ${k}: число`, hx[k].length, hy[k].length); hy[k].forEach((v: unknown, i: number) => cmp(`главная ${k}[${i}]`, hx[k][i], v)); }
    else cmp(`главная ${k}`, hx[k], hy[k]);
  }
  console.log(`совпало ${ok} из ${n}`); bad.forEach((x) => console.log(" ✗ " + x)); process.exit(bad.length ? 1 : 0);
}
