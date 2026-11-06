// Раздел «Сверка»: чеки Billz против записей Кассы по дням и точкам; фискальные модули против Кассы; блок автозагрузки Billz.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Kpi, Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Data } from "@/lib/types";
import { Wip } from "../report/parts";
import { Dash, Field, FIELD, Pill, Seg, Tbl, Td, Tr, saveBook, usePaging } from "../report/ui";
import { BillzPanel } from "./BillzPanel";
import { Controls, useFilters, type Filters } from "./Controls";
import { FmRecon, fmRcExport } from "./FmRecon";
import { AUTO, POINTS, bzQty, bzRefresh, bzSum, collectState, dL, dS, dayTable, dtm, flatItems, fmt, fq, hm, isLens, isRet, kSum, kassaRows, loadChecks, matchDay, pl, sgn, sgq, wd, type BzCheck, type DayRow, type KSale } from "./logic";

const HEAD = {
  bz: ["Saif-Optics · Billz и Касса", "Что, когда и в каком количестве продано по Billz — и сходится ли это с Кассой"],
  fm: ["Saif-Optics · фискальные модули и Касса", "Сколько нала и безнала пробито через фискальные модули — и сходится ли это с продажами Кассы"],
} as const;
const ls = { get: (k: string, d: string) => { try { return localStorage.getItem("kassa-web.recon." + k) ?? d; } catch { return d; } }, set: (k: string, v: string) => { try { localStorage.setItem("kassa-web.recon." + k, v); } catch { /* нет хранилища */ } } };

export function ReconPage({ d }: { d: Data }) {
  const [view, setView] = useState<"bz" | "fm">(() => (ls.get("view", "bz") === "fm" ? "fm" : "bz"));
  const bz = useFilters("bz"), fm = useFilters("fm"), qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const pick = (v: "bz" | "fm") => { setView(v); ls.set("view", v); };
  const refresh = async () => {
    setBusy(true); const r = await bzRefresh(); setBusy(false);
    if (r.ok) toast.success("Данные Billz обновлены"); else toast.error("Billz: не удалось обновить — " + r.error);
    qc.invalidateQueries({ queryKey: ["bz"] }); qc.invalidateQueries({ queryKey: ["kassa-data"] });
  };
  const xlsx = async () => {
    try {
      if (view === "fm") { await fmRcExport(d, fm); toast.success("Файл скачан"); return; }
      const ch = await loadChecks(bz.f, bz.t), pc = ch.filter((c) => bz.pt === "all" || c.point === bz.pt), ks = kassaRows(d, bz.f, bz.t).filter((s) => bz.pt === "all" || s.point === bz.pt);
      await saveBook(`Сверка ${bz.f}—${bz.t}`, [
        ["По дням", dayTable(pc, ks).map((o) => ({ "День": o.d, "Точка": o.p, "Billz чеков": o.bn, "Billz шт": o.bq, "Billz сумма": o.bs, "Касса шт": o.nodet ? null : o.kq, "Касса сумма": o.ks, "Разница сумма": o.ds, "Сходится": o.ok ? "да" : "нет" }))],
        ["Что продалось", flatItems(pc).map((i) => ({ "Когда": dtm(i.t), "Точка": i.p, "Чек": i.num, "Товар": i.n, "Артикул": i.sku, "Категория": i.c, "Кол-во": i.q, "Сумма": i.sum, "Продавец": i.seller }))],
      ]);
      toast.success("Файл скачан");
    } catch (e) { toast.error("Не удалось выгрузить: " + String(e)); }
  };
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{HEAD[view][0]}</div>
          <h1 className="text-[34px] leading-tight font-bold tracking-tight max-sm:text-[28px]">Сверка</h1>
          <p className="text-[15px] text-muted-foreground">{HEAD[view][1]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="lg" onClick={xlsx}><FileSpreadsheet />Выгрузить Excel</Button>
          {view === "bz" && <Button size="lg" disabled={busy} onClick={refresh}><RefreshCw className={cn(busy && "animate-spin")} />{busy ? "Загружаю из Billz…" : "Обновить из Billz"}</Button>}
        </div>
      </header>
      <Wip>Полностью заработает после инвентаризации Премиума и Яшнабада. Сейчас сверяются только Сергели и C1 — их продажи приходят из Billz.</Wip>
      <Seg value={view} onChange={pick} label="Сверка" options={[["bz", "Billz ↔ Касса"], ["fm", "Фискальные модули ↔ Касса"]]} />
      {view === "fm" ? <FmRecon d={d} F={fm} /> : <>
        <CollectState d={d} />
        <BzRecon d={d} F={bz} />
        <BillzPanel d={d} />
      </>}
    </div>
  );
}

function CollectState({ d }: { d: Data }) {
  const s = collectState(d);
  return <div className="flex flex-wrap items-center gap-2"><Pill tone={s.cls === "err" ? "bad" : s.cls}>{s.t}</Pill>{s.last && <span className="text-[12.5px] text-muted-foreground">{s.last}</span>}</div>;
}

const iv = { get: (): "list" | "prod" => { try { return localStorage.getItem("kassa-web.recon.iview") === "prod" ? "prod" : "list"; } catch { return "list"; } }, set: (v: string) => { try { localStorage.setItem("kassa-web.recon.iview", v); } catch { /* нет хранилища */ } } };

function BzRecon({ d, F }: { d: Data; F: Filters }) {
  const [sel, setSel] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["bz", "checks", F.f, F.t], queryFn: () => loadChecks(F.f, F.t) });
  const ctl = <Controls F={F} points={POINTS} />;
  if (q.isLoading) return <>{ctl}<p className="glass rounded-3xl p-6 text-muted-foreground">Загружаю чеки Billz…</p></>;
  if (q.error) return <>{ctl}<p className="glass rounded-3xl p-6 text-minus">Не удалось загрузить данные Billz: {String((q.error as Error).message || q.error)}</p></>;
  const ch = (q.data || []).filter((c) => POINTS.includes(c.point) && (F.pt === "all" || c.point === F.pt));
  const ks = kassaRows(d, F.f, F.t).filter((s) => F.pt === "all" || s.point === F.pt);
  const days = dayTable(ch, ks), bad = days.filter((x) => !x.ok), list = F.only ? bad : days;
  const B = { n: ch.length, q: ch.reduce((a, c) => a + bzQty(c), 0), s: ch.reduce((a, c) => a + bzSum(c), 0) };
  const K = { q: ks.reduce((a, s) => a + (+(s.qty || 0)), 0), s: ks.reduce((a, s) => a + kSum(s), 0), nodet: ks.some((s) => s.cat === "Без детализации") };
  return (
    <>
      {ctl}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi i={0} label="Billz · продано" value={fmt(B.s) + " сум"} sub={`${B.n} ${pl(B.n, "чек", "чека", "чеков")} · ${fq(B.q)} шт`} />
        <Kpi i={1} label="Касса · записано" value={fmt(K.s) + " сум"} sub={`${fq(K.q)} шт${K.nodet ? " · есть дни без детализации" : ""}`} />
        <Kpi i={2} label="Разница" value={sgn(K.s - B.s) + " сум"} tone={Math.abs(K.s - B.s) < 1 ? "plus" : undefined} sub="Касса минус Billz" />
        <Kpi i={3} label="Дни с расхождением" value={String(bad.length)} tone={bad.length ? undefined : "plus"} sub={bad.length ? "отмечены цветом в таблице" : "всё сходится ✓"} />
      </div>
      <DaysTable list={list} ch={ch} ks={ks} sel={sel} setSel={setSel} only={F.only} reset={F.f + F.t + F.pt + F.only} />
      <Items ch={ch} reset={F.f + F.t + F.pt} />
    </>
  );
}

function DaysTable({ list, ch, ks, sel, setSel, only, reset }: { list: DayRow[]; ch: BzCheck[]; ks: KSale[]; sel: string | null; setSel: (s: string | null) => void; only: boolean; reset: string }) {
  const idx = list.findIndex((o) => o.d + "|" + o.p === sel), pg = usePaging(list.length, "recon-days", idx, reset);
  return (
    <Panel title="По дням и точкам" note="Красным — суммы не совпали, оранжевым — продажи есть только в одной системе. Нажмите строку, чтобы увидеть чеки Billz и записи Кассы за этот день. В Кассе продажи считаются вместе с отмеченными долгами, погашения долгов не входят. Линзы считаются парами.">
      <Tbl head={["День", "Точка", ["Billz чеков", "r"], ["Billz шт", "r"], ["Billz сумма", "r"], ["Касса шт", "r"], ["Касса сумма", "r"], ["Разница шт", "r"], ["Разница сумма", "r"], ""]}>
        {list.slice(pg.from, pg.to).map((o) => {
          const k = o.d + "|" + o.p, on = sel === k, kind = o.ok ? undefined : !o.bn || !o.kn ? "warn" : "bad";
          return [
            <Tr key={k} tap tone={kind} selected={on} onClick={() => setSel(on ? null : k)}>
              <Td h>{dS(o.d)} <span className="ml-1 text-[12px] font-normal text-muted-foreground">{wd(o.d)}</span></Td>
              <Td l="Точка">{o.p}{AUTO.has(o.p) && <span className="ml-1.5 rounded bg-primary/12 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary">авто</span>}</Td>
              <Td r l="Billz чеков">{o.bn || <Dash />}</Td><Td r l="Billz шт">{o.bn ? fq(o.bq) : <Dash />}</Td><Td r l="Billz сумма">{o.bn ? fmt(o.bs) : <Dash />}</Td>
              <Td r l="Касса шт">{o.kn ? (o.nodet ? <span title="есть строки без детализации"><Dash /></span> : fq(o.kq)) : <Dash />}</Td>
              <Td r l="Касса сумма">{o.kn ? <>{fmt(o.ks)}{o.debt ? <><br /><span className="text-[12px] text-muted-foreground">в т.ч. долг {fmt(o.debt)}</span></> : null}</> : <Dash />}</Td>
              <Td r l="Разница шт">{o.dq == null ? <Dash /> : Math.abs(o.dq) < 0.01 ? "0" : <b className="text-minus">{sgq(o.dq)}</b>}</Td>
              <Td r l="Разница сумма">{Math.abs(o.ds) < 1 ? "0" : <b className="text-minus">{sgn(o.ds)}</b>}</Td>
              <Td>{o.ok ? <span className="text-plus">✓</span> : !o.bn ? <Pill tone="warn">нет в Billz</Pill> : !o.kn ? <Pill tone="warn">нет в Кассе</Pill> : <Pill tone="bad">≠</Pill>}</Td></Tr>,
            on && <tr key={k + "-d"} className="max-md:block"><td colSpan={10} className="bg-muted/30 px-3 py-3 max-md:block"><Detail ch={ch.filter((c) => c.d === o.d && c.point === o.p)} ks={ks.filter((s) => s.date === o.d && s.point === o.p)} d={o.d} p={o.p} /></td></tr>,
          ];
        })}
        {!list.length && <Tr><Td colSpan={10} className="py-4 text-center text-muted-foreground">{only ? "Расхождений нет ✓" : "Продаж за период нет"}</Td></Tr>}
      </Tbl>
      {pg.bar}
    </Panel>
  );
}

function Detail({ ch, ks, d, p }: { ch: BzCheck[]; ks: KSale[]; d: string; p: string }) {
  const { G, B } = matchDay(ch, ks);
  const items = (c: BzCheck) => (c.items || []).filter((i) => !i.ret || isRet(c.type)).map((i, k) => {
    const q = isLens(i.c) ? ((+(i.q || 0)) || +(i.rq || 0)) / 2 : (+(i.q || 0)) || +(i.rq || 0);
    return <div key={k} className="text-left">{i.n} <span className="text-[12px] text-muted-foreground">{i.sku}</span> × {fq(q)}{isLens(i.c) ? " пар" : ""} — {fmt(i.sum || 0)}{i.disc ? <span className="text-[12px] text-muted-foreground"> (скидка {fmt(i.disc)})</span> : null}</div>;
  });
  return (
    <div className="flex flex-col gap-4">
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <div><h3 className="mb-1 text-[14.5px] font-semibold">Billz · {p} · {dL(d)}</h3>
          <Tbl head={["Время", "Чек", "Товары", ["Сумма", "r"], "Оплата", ""]}>
            {B.map((b, i) => <Tr key={i} tone={b.m ? undefined : "bad"}><Td h>{hm(b.c.t)}</Td><Td l="Чек"><span className="num">{String(b.c.num).slice(-3)}</span><br /><span className="text-[12px] text-muted-foreground">{b.c.type || ""}</span></Td><Td l="Товары">{items(b.c)}</Td>
              <Td r l="Сумма"><b>{fmt(b.sum)}</b>{+(b.c.debt || 0) ? <><br /><span className="text-minus">долг {fmt(b.c.debt || 0)}</span></> : null}</Td>
              <Td l="Оплата" className="text-[12.5px] text-muted-foreground">{(b.c.pays || []).map((x, k) => <div key={k}>{x.n} {fmt(x.s)}</div>)}</Td>
              <Td>{b.m ? <span className="text-plus">✓ есть в Кассе</span> : <Pill tone="bad">нет в Кассе</Pill>}</Td></Tr>)}
            {!B.length && <Tr><Td colSpan={6} className="text-muted-foreground">Чеков в Billz нет</Td></Tr>}
          </Tbl></div>
        <div><h3 className="mb-1 text-[14.5px] font-semibold">Касса · {p} · {dL(d)}</h3>
          <Tbl head={["Чек", "Записи", ["Сумма", "r"], ""]}>
            {G.map((g) => <Tr key={g.k} tone={g.m ? undefined : "bad"}><Td h><span className="num">{g.check || "—"}</span></Td>
              <Td l="Записи">{g.rows.map((s, i) => <div key={i} className="text-left">{s.product || s.cat} × {fq(s.qty)} — {fmt(kSum(s))}{+(s.debt || 0) ? <span className="text-minus"> (долг {fmt(s.debt || 0)})</span> : null}<span className="text-[12px] text-muted-foreground"> · {s.pay || ""}</span></div>)}</Td>
              <Td r l="Сумма"><b>{fmt(g.sum)}</b></Td><Td>{g.m ? <span className="text-plus">✓ есть в Billz</span> : <Pill tone="bad">нет в Billz</Pill>}</Td></Tr>)}
            {!G.length && <Tr><Td colSpan={4} className="text-muted-foreground">Записей в Кассе нет</Td></Tr>}
          </Tbl></div>
      </div>
      <p className="text-[12.5px] text-muted-foreground">Чеки сопоставляются по номеру из Billz (для автозагрузки), иначе по одинаковой сумме. Красным — то, чему не нашлась пара.</p>
    </div>
  );
}

function Items({ ch, reset }: { ch: BzCheck[]; reset: string }) {
  const [view, setV] = useState<"list" | "prod">(iv.get), [qy, setQ] = useState("");
  const all = flatItems(ch), s = qy.trim().toLowerCase(), L = all.filter((i) => !s || (i.n + " " + i.sku).toLowerCase().includes(s));
  const prod = (() => {
    const m = new Map<string, { n: string; sku: string; c?: string; q: number; s: number; pts: Record<string, number>; last: string }>();
    L.forEach((i) => { const k = i.sku || i.n; let o = m.get(k); if (!o) m.set(k, (o = { n: i.n, sku: i.sku, c: i.c, q: 0, s: 0, pts: {}, last: "" })); o.q += i.q; o.s += i.sum; o.pts[i.p] = (o.pts[i.p] || 0) + i.q; if (!o.last || i.t > o.last) o.last = i.t; });
    return [...m.values()].sort((a, b) => b.q - a.q || b.s - a.s);
  })();
  const flat = L.slice().sort((a, b) => String(b.t).localeCompare(String(a.t)));
  const total = view === "prod" ? prod.length : flat.length;
  const pg = usePaging(total, "recon-items-" + view, -1, reset + qy);
  return (
    <Panel title="Что продалось по Billz" note={view === "prod" ? `${prod.length} ${pl(prod.length, "товар", "товара", "товаров")}, ${fq(L.reduce((a, i) => a + i.q, 0))} шт (линзы — в штуках линз)` : `${flat.length} ${pl(flat.length, "строка", "строки", "строк")} из чеков Billz за период`}
      action={<div className="flex flex-wrap items-end justify-end gap-3"><Seg value={view} onChange={(v) => { setV(v); iv.set(v); }} label="Вид" options={[["list", "По чекам"], ["prod", "По товарам"]]} />
        <Field label="Поиск" className="w-44"><input className={FIELD} placeholder="Товар или артикул" value={qy} onChange={(e) => setQ(e.target.value)} /></Field></div>}>
      {view === "prod" ? (
        <Tbl head={["Товар", "Категория", ...POINTS.map((p) => [p, "r"] as [string, "r"]), ["Всего, шт", "r"], ["Сумма", "r"], ["Последняя продажа", "r"]]}>
          {prod.slice(pg.from, pg.to).map((o, i) => <Tr key={i}><Td h>{o.n}<br /><span className="text-[12px] font-normal text-muted-foreground">{o.sku}</span></Td><Td l="Категория" className="text-[12.5px] text-muted-foreground">{o.c}</Td>
            {POINTS.map((p) => <Td key={p} r l={p}>{o.pts[p] ? fq(o.pts[p]) : <Dash />}</Td>)}<Td r l="Всего, шт" className="font-semibold">{fq(o.q)}</Td><Td r l="Сумма">{fmt(o.s)}</Td><Td r l="Последняя продажа">{dtm(o.last)}</Td></Tr>)}
          {!prod.length && <Tr><Td colSpan={9} className="text-center text-muted-foreground">Нет продаж</Td></Tr>}
        </Tbl>) : (
        <Tbl head={["Когда", "Точка", "Чек", "Товар", ["Кол-во", "r"], ["Сумма", "r"], "Продавец"]}>
          {flat.slice(pg.from, pg.to).map((i, k) => <Tr key={k} tone={i.q < 0 ? "warn" : undefined}><Td h><span className="num">{dtm(i.t)}</span></Td><Td l="Точка">{i.p}</Td><Td l="Чек"><span className="num">{String(i.num).slice(-3)}</span>{isRet(i.type) && <span className="ml-1 text-minus">возврат</span>}</Td>
            <Td l="Товар">{i.n}<br /><span className="text-[12px] text-muted-foreground">{i.sku} · {i.c}</span></Td><Td r l="Кол-во">{fq(i.q)}</Td><Td r l="Сумма">{fmt(i.sum)}</Td><Td l="Продавец" className="text-[12.5px] text-muted-foreground">{i.seller || ""}</Td></Tr>)}
          {!flat.length && <Tr><Td colSpan={7} className="text-center text-muted-foreground">Нет продаж</Td></Tr>}
        </Tbl>)}
      {pg.bar}
    </Panel>
  );
}
